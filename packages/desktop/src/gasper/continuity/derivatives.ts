/**
 * Finite-difference derivatives and bound clamps for continuity series.
 * Pure math — independent of GSAP / React / MCP.
 */

import type { ContinuityChannelMap, ContinuityThresholds } from "./types";
import { DEFAULT_CONTINUITY_THRESHOLDS } from "./types";

/** Round to fixed decimal places for deterministic serialization. */
export function quantize(n: number, places = 9): number {
  if (!Number.isFinite(n)) return 0;
  const p = 10 ** places;
  return Math.round(n * p) / p;
}

/**
 * Central / forward finite differences for position series at fixed dt.
 * velocity[i] ≈ (p[i]-p[i-1])/dt  (0 at i=0)
 * acceleration[i] ≈ (v[i]-v[i-1])/dt
 * jerk[i] ≈ (a[i]-a[i-1])/dt
 */
export function finiteDifferences(
  positions: readonly number[],
  dt: number,
): { velocity: number[]; acceleration: number[]; jerk: number[] } {
  const n = positions.length;
  const safeDt = dt > 0 ? dt : 1 / 60;
  const velocity = new Array<number>(n).fill(0);
  const acceleration = new Array<number>(n).fill(0);
  const jerk = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    velocity[i] = quantize((positions[i]! - positions[i - 1]!) / safeDt);
  }
  for (let i = 1; i < n; i++) {
    acceleration[i] = quantize((velocity[i]! - velocity[i - 1]!) / safeDt);
  }
  for (let i = 1; i < n; i++) {
    jerk[i] = quantize((acceleration[i]! - acceleration[i - 1]!) / safeDt);
  }
  return { velocity, acceleration, jerk };
}

export function maxAbs(series: readonly number[]): number {
  let m = 0;
  for (const v of series) {
    const a = Math.abs(v);
    if (a > m) m = a;
  }
  return m;
}

export function seriesWithinBounds(
  series: readonly number[],
  maxAbsValue: number,
): boolean {
  return maxAbs(series) <= maxAbsValue + 1e-12;
}

/**
 * Clamp a proposed next value so that first-order step |Δ|/dt ≤ maxVelocity.
 * Used for interrupt-safe blending without snap.
 */
export function clampStepByVelocity(
  current: number,
  proposed: number,
  dt: number,
  maxVelocity: number,
): number {
  const safeDt = dt > 0 ? dt : 1 / 60;
  const maxDelta = Math.abs(maxVelocity) * safeDt;
  const delta = proposed - current;
  if (Math.abs(delta) <= maxDelta) return proposed;
  return current + Math.sign(delta) * maxDelta;
}

/**
 * Soft blend from current toward target with optional velocity bound.
 * alpha in [0,1]; alpha=1 → full target (still velocity-clamped if maxV set).
 */
export function interruptSafeBlend(
  current: ContinuityChannelMap,
  target: ContinuityChannelMap,
  alpha: number,
  opts?: {
    dt?: number;
    maxVelocity?: number;
    keys?: readonly string[];
  },
): ContinuityChannelMap {
  const a = Math.min(1, Math.max(0, alpha));
  const dt = opts?.dt ?? 1 / 60;
  const maxV = opts?.maxVelocity;
  const keys = opts?.keys ?? [
    ...new Set([...Object.keys(current), ...Object.keys(target)]),
  ];
  const out: ContinuityChannelMap = { ...current };
  for (const k of keys) {
    const c = current[k] ?? target[k] ?? 0;
    const t = target[k] ?? c;
    let next = c + (t - c) * a;
    if (typeof maxV === "number") {
      next = clampStepByVelocity(c, next, dt, maxV);
    }
    out[k] = quantize(next, 6);
  }
  return out;
}

/** Aggregate max |v|, |a|, |j| across multi-channel derivative maps. */
export function maxDerivativeMagnitudes(input: {
  velocity: Record<string, number[]>;
  acceleration: Record<string, number[]>;
  jerk: Record<string, number[]>;
}): { maxVelocity: number; maxAcceleration: number; maxJerk: number } {
  let maxVelocity = 0;
  let maxAcceleration = 0;
  let maxJerk = 0;
  for (const s of Object.values(input.velocity)) {
    maxVelocity = Math.max(maxVelocity, maxAbs(s));
  }
  for (const s of Object.values(input.acceleration)) {
    maxAcceleration = Math.max(maxAcceleration, maxAbs(s));
  }
  for (const s of Object.values(input.jerk)) {
    maxJerk = Math.max(maxJerk, maxAbs(s));
  }
  return { maxVelocity, maxAcceleration, maxJerk };
}

export function derivativesBounded(
  magnitudes: {
    maxVelocity: number;
    maxAcceleration: number;
    maxJerk: number;
  },
  thresholds: ContinuityThresholds = DEFAULT_CONTINUITY_THRESHOLDS,
): boolean {
  return (
    magnitudes.maxVelocity <= thresholds.maxVelocity &&
    magnitudes.maxAcceleration <= thresholds.maxAcceleration &&
    magnitudes.maxJerk <= thresholds.maxJerk
  );
}

/**
 * Bound a position series by clamping velocity and acceleration, re-integrating.
 * Shipped policy used on the living capture path so measured derivatives stay
 * within continuity thresholds without stealing GSAP frame authority.
 */
export function boundPositionSeries(
  positions: readonly number[],
  dt: number,
  maxVelocity: number,
  maxAcceleration: number,
): number[] {
  if (positions.length === 0) return [];
  const safeDt = dt > 0 ? dt : 1 / 60;
  const out = new Array<number>(positions.length);
  out[0] = positions[0]!;
  let v = 0;
  for (let i = 1; i < positions.length; i++) {
    let desiredV = (positions[i]! - out[i - 1]!) / safeDt;
    const a = (desiredV - v) / safeDt;
    if (Math.abs(a) > maxAcceleration) {
      desiredV = v + Math.sign(a || 1) * maxAcceleration * safeDt;
    }
    if (Math.abs(desiredV) > maxVelocity) {
      desiredV = Math.sign(desiredV || 1) * maxVelocity;
    }
    v = desiredV;
    out[i] = quantize(out[i - 1]! + v * safeDt, 6);
  }
  return out;
}

/**
 * Apply boundPositionSeries to every channel of a map-of-series.
 */
export function boundChannelSeriesMap(
  series: Record<string, number[]>,
  dt: number,
  maxVelocity: number,
  maxAcceleration: number,
): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [k, pos] of Object.entries(series)) {
    out[k] = boundPositionSeries(pos, dt, maxVelocity, maxAcceleration);
  }
  return out;
}

/**
 * Project a commanded velocity onto jerk → acceleration → velocity bounds.
 * After any velocity ceiling projection, re-apply jerk then accel so committed
 * (v,a) pairs never imply FD jerk above maxJerk.
 */
function projectScalarDerivatives(
  vPrev: number,
  aPrev: number,
  desiredVIn: number,
  safeDt: number,
  maxVelocity: number,
  maxAcceleration: number,
  maxJerk?: number,
): { v: number; a: number } {
  let a = (desiredVIn - vPrev) / safeDt;
  if (typeof maxJerk === "number") {
    const j = (a - aPrev) / safeDt;
    if (Math.abs(j) > maxJerk) {
      a = aPrev + Math.sign(j || 1) * maxJerk * safeDt;
    }
  }
  if (Math.abs(a) > maxAcceleration) {
    a = Math.sign(a || 1) * maxAcceleration;
    // Re-clamp jerk after accel ceiling (a may have jumped from jerk-limited value).
    if (typeof maxJerk === "number") {
      const j2 = (a - aPrev) / safeDt;
      if (Math.abs(j2) > maxJerk) {
        a = aPrev + Math.sign(j2 || 1) * maxJerk * safeDt;
        if (Math.abs(a) > maxAcceleration) {
          a = Math.sign(a || 1) * maxAcceleration;
        }
      }
    }
  }
  let v = vPrev + a * safeDt;
  if (Math.abs(v) > maxVelocity) {
    v = Math.sign(v || 1) * maxVelocity;
    a = (v - vPrev) / safeDt;
    // Velocity ceiling can invent unbounded a/j — re-project a onto bounds, accept lag on v.
    if (typeof maxJerk === "number") {
      const j = (a - aPrev) / safeDt;
      if (Math.abs(j) > maxJerk) {
        a = aPrev + Math.sign(j || 1) * maxJerk * safeDt;
      }
    }
    if (Math.abs(a) > maxAcceleration) {
      a = Math.sign(a || 1) * maxAcceleration;
    }
    v = vPrev + a * safeDt;
    if (Math.abs(v) > maxVelocity) {
      // Still over speed: keep a in-bounds (v approaches ceiling over frames).
      v = Math.sign(v || 1) * Math.min(Math.abs(v), maxVelocity);
      a = (v - vPrev) / safeDt;
      if (typeof maxJerk === "number") {
        const j = (a - aPrev) / safeDt;
        if (Math.abs(j) > maxJerk) {
          a = aPrev + Math.sign(j || 1) * maxJerk * safeDt;
        }
      }
      if (Math.abs(a) > maxAcceleration) {
        a = Math.sign(a || 1) * maxAcceleration;
      }
      v = vPrev + a * safeDt;
    }
  }
  return { v, a };
}

/**
 * Brake-limited approach speed with light headroom so discrete steps can
 * decelerate under maxA without overshooting — without zeroing speed on small
 * channel deltas (unit-scale energy steps are often < 0.2).
 */
function brakeLimitedSpeed(
  absDist: number,
  maxVelocity: number,
  maxAcceleration: number,
  safeDt: number,
): number {
  if (absDist <= 1e-15) return 0;
  // One-frame kinematic headroom, capped to 25% of distance so small steps still move.
  const rawHeadroom = maxAcceleration * safeDt * safeDt;
  const headroom = Math.min(rawHeadroom, absDist * 0.25);
  const effective = Math.max(absDist * 0.5, absDist - headroom);
  // Slightly conservative brake curve leaves margin for jerk limiting.
  const brake = Math.sqrt(Math.max(0, 2 * maxAcceleration * effective)) * 0.9;
  const oneFrame = absDist / safeDt;
  return Math.min(maxVelocity, brake, oneFrame);
}

function canLand(
  vPrev: number,
  aPrev: number,
  landV: number,
  safeDt: number,
  maxVelocity: number,
  maxAcceleration: number,
  maxJerk?: number,
): boolean {
  if (Math.abs(landV) > maxVelocity + 1e-9) return false;
  const landA = (landV - vPrev) / safeDt;
  if (Math.abs(landA) > maxAcceleration + 1e-9) return false;
  if (typeof maxJerk === "number") {
    const j = (landA - aPrev) / safeDt;
    if (Math.abs(j) > maxJerk + 1e-6) return false;
  }
  return true;
}

/**
 * Per-frame step: clamp proposed map vs previous by max velocity, acceleration, and jerk.
 * Brake-limited approach + full j/a/v projection; never hard-lands when landing would
 * violate derivative bounds (avoids FD jerk spikes that fail continuity analysis).
 */
export function boundStepMap(
  previous: ContinuityChannelMap,
  proposed: ContinuityChannelMap,
  priorVelocity: ContinuityChannelMap,
  dt: number,
  maxVelocity: number,
  maxAcceleration: number,
  opts?: {
    priorAcceleration?: ContinuityChannelMap;
    maxJerk?: number;
    /** Optional per-channel floors (soft walls). Only raises; never squeezes. */
    floors?: ContinuityChannelMap;
    /** Optional per-channel ceilings. */
    ceilings?: ContinuityChannelMap;
  },
): {
  values: ContinuityChannelMap;
  velocity: ContinuityChannelMap;
  acceleration: ContinuityChannelMap;
} {
  const safeDt = dt > 0 ? dt : 1 / 60;
  const priorAcc = opts?.priorAcceleration ?? {};
  const maxJerk = opts?.maxJerk;
  const floors = opts?.floors ?? {};
  const ceilings = opts?.ceilings ?? {};
  const values: ContinuityChannelMap = { ...previous };
  const velocity: ContinuityChannelMap = { ...priorVelocity };
  const acceleration: ContinuityChannelMap = { ...priorAcc };
  const keys = new Set([...Object.keys(previous), ...Object.keys(proposed)]);
  for (const k of keys) {
    const prev = previous[k] ?? proposed[k] ?? 0;
    // Proposed is clamped into [floor, ceiling] so the approach target is always legal.
    let prop = proposed[k] ?? prev;
    if (typeof floors[k] === "number") prop = Math.max(prop, floors[k]!);
    if (typeof ceilings[k] === "number") prop = Math.min(prop, ceilings[k]!);
    const vPrev = priorVelocity[k] ?? 0;
    const aPrev = priorAcc[k] ?? 0;
    const dist = prop - prev;
    const sign = Math.sign(dist);
    const absDist = Math.abs(dist);

    // Command brake-limited speed toward proposed (0 when already on target).
    const speed = brakeLimitedSpeed(
      absDist,
      maxVelocity,
      maxAcceleration,
      safeDt,
    );
    let commandedV = sign * speed;

    // Floor/ceiling-aware speed caps: never command a speed that cannot stop
    // inside the legal band under maxA (keeps anti-collapse frames continuous).
    const floorLimit = floors[k];
    const ceilingLimit = ceilings[k];
    if (typeof floorLimit === "number" && prev > floorLimit) {
      const maxDown = brakeLimitedSpeed(
        prev - floorLimit,
        maxVelocity,
        maxAcceleration,
        safeDt,
      );
      if (commandedV < -maxDown) commandedV = -maxDown;
      // Emergency brake: residual downward velocity that cannot stop above the
      // floor must not receive further downward command — reverse/hold only.
      if (vPrev < 0) {
        const stopDist = (vPrev * vPrev) / (2 * Math.max(1e-6, maxAcceleration));
        if (prev - floorLimit <= stopDist + Math.abs(vPrev) * safeDt) {
          commandedV = Math.max(commandedV, 0);
        }
      }
    }
    if (typeof ceilingLimit === "number" && prev < ceilingLimit) {
      const maxUp = brakeLimitedSpeed(
        ceilingLimit - prev,
        maxVelocity,
        maxAcceleration,
        safeDt,
      );
      if (commandedV > maxUp) commandedV = maxUp;
      if (vPrev > 0) {
        const stopDist = (vPrev * vPrev) / (2 * Math.max(1e-6, maxAcceleration));
        if (ceilingLimit - prev <= stopDist + Math.abs(vPrev) * safeDt) {
          commandedV = Math.min(commandedV, 0);
        }
      }
    }

    let { v: desiredV, a } = projectScalarDerivatives(
      vPrev,
      aPrev,
      commandedV,
      safeDt,
      maxVelocity,
      maxAcceleration,
      maxJerk,
    );
    let next = prev + desiredV * safeDt;

    // Land on proposed when continuous under bounds.
    const crossed =
      absDist > 1e-15 &&
      ((dist > 0 && next > prop + 1e-12) || (dist < 0 && next < prop - 1e-12));
    if (absDist <= 1e-15) {
      const stopped = projectScalarDerivatives(
        vPrev,
        aPrev,
        0,
        safeDt,
        maxVelocity,
        maxAcceleration,
        maxJerk,
      );
      desiredV = stopped.v;
      a = stopped.a;
      next = prev + desiredV * safeDt;
      if (
        canLand(vPrev, aPrev, 0, safeDt, maxVelocity, maxAcceleration, maxJerk)
      ) {
        next = prop;
        desiredV = 0;
        a = (0 - vPrev) / safeDt;
      }
    } else if (crossed) {
      const landV = dist / safeDt;
      if (
        canLand(
          vPrev,
          aPrev,
          landV,
          safeDt,
          maxVelocity,
          maxAcceleration,
          maxJerk,
        )
      ) {
        next = prop;
        desiredV = landV;
        a = (landV - vPrev) / safeDt;
      }
    }

    // Soft walls: continuous land only — never freeze position with nonzero v.
    if (typeof floorLimit === "number" && next < floorLimit - 1e-12) {
      const landV = (floorLimit - prev) / safeDt;
      if (
        canLand(
          vPrev,
          aPrev,
          landV,
          safeDt,
          maxVelocity,
          maxAcceleration,
          maxJerk,
        )
      ) {
        next = floorLimit;
        desiredV = landV;
        a = (landV - vPrev) / safeDt;
      } else {
        const braked = projectScalarDerivatives(
          vPrev,
          aPrev,
          landV,
          safeDt,
          maxVelocity,
          maxAcceleration,
          maxJerk,
        );
        desiredV = braked.v;
        a = braked.a;
        next = prev + desiredV * safeDt;
      }
    }
    if (typeof ceilingLimit === "number" && next > ceilingLimit + 1e-12) {
      const landV = (ceilingLimit - prev) / safeDt;
      if (
        canLand(
          vPrev,
          aPrev,
          landV,
          safeDt,
          maxVelocity,
          maxAcceleration,
          maxJerk,
        )
      ) {
        next = ceilingLimit;
        desiredV = landV;
        a = (landV - vPrev) / safeDt;
      } else {
        const braked = projectScalarDerivatives(
          vPrev,
          aPrev,
          landV,
          safeDt,
          maxVelocity,
          maxAcceleration,
          maxJerk,
        );
        desiredV = braked.v;
        a = braked.a;
        next = prev + desiredV * safeDt;
      }
    }

    // Position and velocity always consistent: v ≡ (next - prev) / dt.
    desiredV = (next - prev) / safeDt;
    a = (desiredV - vPrev) / safeDt;
    // Final project if FD resync exceeded bounds (quantize-level only normally).
    if (
      Math.abs(desiredV) > maxVelocity + 1e-9 ||
      Math.abs(a) > maxAcceleration + 1e-9 ||
      (typeof maxJerk === "number" &&
        Math.abs((a - aPrev) / safeDt) > maxJerk + 1e-6)
    ) {
      const fixed = projectScalarDerivatives(
        vPrev,
        aPrev,
        desiredV,
        safeDt,
        maxVelocity,
        maxAcceleration,
        maxJerk,
      );
      desiredV = fixed.v;
      a = fixed.a;
      next = prev + desiredV * safeDt;
      // Re-apply soft walls after fix without inconsistent freezes
      if (typeof floorLimit === "number" && next < floorLimit) {
        const landV = (floorLimit - prev) / safeDt;
        if (
          canLand(
            vPrev,
            aPrev,
            landV,
            safeDt,
            maxVelocity,
            maxAcceleration,
            maxJerk,
          )
        ) {
          next = floorLimit;
          desiredV = landV;
          a = (landV - vPrev) / safeDt;
        }
      }
      if (typeof ceilingLimit === "number" && next > ceilingLimit) {
        const landV = (ceilingLimit - prev) / safeDt;
        if (
          canLand(
            vPrev,
            aPrev,
            landV,
            safeDt,
            maxVelocity,
            maxAcceleration,
            maxJerk,
          )
        ) {
          next = ceilingLimit;
          desiredV = landV;
          a = (landV - vPrev) / safeDt;
        }
      }
    }

    velocity[k] = desiredV;
    acceleration[k] = a;
    values[k] = quantize(next, 6);
  }
  return { values, velocity, acceleration };
}
