/**
 * Continuous expression-to-expression interpolation laws:
 * anticipation, transition, settle, overshoot limits, chirality-preserving mix.
 * Pure — no frame clock ownership (GSAP/native remain frame authority).
 */

import {
  DEFAULT_FACIAL_POLICY,
  FACE_ONLY_CHANNELS,
  FACIAL_BODY_CHANNELS,
  type FacialChannelMap,
  type FacialContinuumPolicy,
  type FacialMotionPhase,
} from "./types";
import { clampTissue, eyeAsymmetryMetric } from "./tissueBounds";

const FACE_CHANNEL_SET = new Set<string>(FACE_ONLY_CHANNELS as readonly string[]);

export function quantize(n: number, places = 6): number {
  if (!Number.isFinite(n)) return 0;
  const p = 10 ** places;
  return Math.round(n * p) / p;
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Smoothstep easing for mature (non-theatrical) transitions.
 */
export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Phase plan for a continuum transition spanning totalFrames.
 * Anticipation → transition → settle; fractions fixed for determinism.
 */
export function planMotionPhases(
  totalFrames: number,
  policy: FacialContinuumPolicy = DEFAULT_FACIAL_POLICY,
): {
  anticipateEnd: number;
  transitionEnd: number;
  settleEnd: number;
} {
  const n = Math.max(8, totalFrames | 0);
  const ant = Math.min(policy.anticipationFrames, Math.floor(n * 0.12));
  const settle = Math.min(policy.settleFrames, Math.floor(n * 0.22));
  const transitionEnd = Math.max(ant + 1, n - settle);
  return {
    anticipateEnd: ant,
    transitionEnd,
    settleEnd: n,
  };
}

export function phaseAtFrame(
  frame: number,
  plan: ReturnType<typeof planMotionPhases>,
  interrupted = false,
): FacialMotionPhase {
  if (interrupted) return "interrupted";
  if (frame < plan.anticipateEnd) return "anticipate";
  if (frame < plan.transitionEnd) return "transition";
  if (frame < plan.settleEnd) return "settle";
  return "hold";
}

/**
 * Build an anticipated sample: brief opposite-direction pull before travel.
 * Keeps magnitude within policy.anticipationFraction of full delta.
 */
export function anticipateSample(
  from: FacialChannelMap,
  to: FacialChannelMap,
  localT: number,
  policy: FacialContinuumPolicy = DEFAULT_FACIAL_POLICY,
): FacialChannelMap {
  const u = smoothstep(localT);
  // Pull opposite early, then ease back to start (anticipation envelope).
  const pull = Math.sin(u * Math.PI) * policy.anticipationFraction;
  const out: FacialChannelMap = {};
  const keys = channelKeys(from, to);
  for (const k of keys) {
    const a = num(from[k], 0);
    const b = num(to[k], a);
    const delta = b - a;
    out[k] = quantize(a - delta * pull);
  }
  return clampTissue(out, from, policy).channels;
}

/**
 * Main transition sample with optional bounded overshoot near the end.
 */
export function transitionSample(
  from: FacialChannelMap,
  to: FacialChannelMap,
  localT: number,
  policy: FacialContinuumPolicy = DEFAULT_FACIAL_POLICY,
): FacialChannelMap {
  const u = smoothstep(localT);
  const out: FacialChannelMap = {};
  const keys = channelKeys(from, to);
  for (const k of keys) {
    const a = num(from[k], 0);
    const b = num(to[k], a);
    out[k] = quantize(a + (b - a) * u);
  }
  return clampTissue(out, from, policy).channels;
}

/**
 * Settle sample: approach target with decaying overshoot (never unbounded).
 */
export function settleSample(
  from: FacialChannelMap,
  to: FacialChannelMap,
  localT: number,
  policy: FacialContinuumPolicy = DEFAULT_FACIAL_POLICY,
): FacialChannelMap {
  const u = smoothstep(localT);
  // Overshoot envelope peaks mid-settle then decays to 0 at u=1.
  const over =
    Math.sin(u * Math.PI) *
    Math.min(policy.overshootFraction, policy.overshootMaxAbs);
  const out: FacialChannelMap = {};
  const keys = channelKeys(from, to);
  for (const k of keys) {
    const a = num(from[k], 0);
    const b = num(to[k], a);
    const delta = b - a;
    // From mid-transition end (near target) settle with tiny overshoot past target.
    const base = a + delta * (0.92 + 0.08 * u);
    const sample = base + delta * over * (1 - u);
    // Hard clamp overshoot magnitude relative to target.
    const maxO = policy.overshootMaxAbs;
    const clamped = Math.max(b - Math.abs(delta) - maxO, Math.min(b + Math.abs(delta) + maxO, sample));
    // Pull firmly onto target as u→1.
    out[k] = quantize(clamped + (b - clamped) * u * u);
  }
  return clampTissue(out, from, policy).channels;
}

/**
 * Continuous expression-to-expression sample at global frame index.
 * Replaces discrete pose swaps with bounded multi-domain deformation.
 */
export function interpolateExpressionContinuum(
  from: FacialChannelMap,
  to: FacialChannelMap,
  frame: number,
  totalFrames: number,
  policy: FacialContinuumPolicy = DEFAULT_FACIAL_POLICY,
): { channels: FacialChannelMap; phase: FacialMotionPhase; mix: number } {
  const plan = planMotionPhases(totalFrames, policy);
  const phase = phaseAtFrame(frame, plan);
  let channels: FacialChannelMap;
  let mix = 0;

  if (phase === "anticipate") {
    const span = Math.max(1, plan.anticipateEnd);
    const localT = frame / span;
    channels = anticipateSample(from, to, localT, policy);
    mix = -policy.anticipationFraction * Math.sin(clamp01(localT) * Math.PI);
  } else if (phase === "transition") {
    const span = Math.max(1, plan.transitionEnd - plan.anticipateEnd);
    const localT = (frame - plan.anticipateEnd) / span;
    channels = transitionSample(from, to, localT, policy);
    mix = smoothstep(localT);
  } else if (phase === "settle") {
    const span = Math.max(1, plan.settleEnd - plan.transitionEnd);
    const localT = (frame - plan.transitionEnd) / span;
    // Settle from last transition pose toward target.
    const near = transitionSample(from, to, 1, policy);
    channels = settleSample(near, to, localT, policy);
    mix = 0.92 + 0.08 * smoothstep(localT);
  } else {
    channels = clampTissue({ ...to }, from, policy).channels;
    mix = 1;
  }

  // Chirality-preserving eye symmetry soft constraint each sample.
  channels = enforceChiralitySymmetry(channels, policy);
  channels = clampTissue(channels, from, policy).channels;
  return { channels, phase, mix: quantize(mix, 4) };
}

/**
 * Linear multi-domain blend (no anticipation) still volume-clamped —
 * used for interrupt-safe mid-path mixes.
 */
export function blendFacialChannels(
  a: FacialChannelMap,
  b: FacialChannelMap,
  t: number,
  policy: FacialContinuumPolicy = DEFAULT_FACIAL_POLICY,
): FacialChannelMap {
  const mix = clamp01(t);
  const out: FacialChannelMap = {};
  for (const k of channelKeys(a, b)) {
    const av = num(a[k], 0);
    const bv = num(b[k], av);
    out[k] = quantize(av + (bv - av) * mix);
  }
  return clampTissue(enforceChiralitySymmetry(out, policy), a, policy).channels;
}

/**
 * Safety margin under policy.maxJerk so quantize(6dp) + finite-difference
 * recomputation cannot report ~0.024 over the ceiling (R4 multi-domain routes).
 */
const JERK_CLAMP_FRACTION = 0.997;

/**
 * Step from current toward proposed with velocity / accel / jerk / face-step bounds.
 * Stateful: pass prior velocity + acceleration maps.
 */
export function boundFacialStep(
  previous: FacialChannelMap,
  proposed: FacialChannelMap,
  priorVelocity: FacialChannelMap,
  priorAcceleration: FacialChannelMap,
  dt: number,
  policy: FacialContinuumPolicy = DEFAULT_FACIAL_POLICY,
): {
  values: FacialChannelMap;
  velocity: FacialChannelMap;
  acceleration: FacialChannelMap;
} {
  const safeDt = dt > 0 ? dt : policy.dtDefault;
  const values: FacialChannelMap = { ...previous };
  const velocity: FacialChannelMap = { ...priorVelocity };
  const acceleration: FacialChannelMap = { ...priorAcceleration };
  const keys = channelKeys(previous, proposed);
  const jerkCeil = policy.maxJerk * JERK_CLAMP_FRACTION;

  // Pre-clamp proposed so tissue limits do not fight post-integration.
  const tissueProposed = clampTissue(proposed, previous, policy).channels;

  for (const k of keys) {
    const prev = num(previous[k], 0);
    const prop = num(tissueProposed[k], prev);
    const vPrev = num(priorVelocity[k], 0);
    const aPrev = num(priorAcceleration[k], 0);

    let desiredV = (prop - prev) / safeDt;
    let a = (desiredV - vPrev) / safeDt;

    // Clamp jerk → accel → velocity consistently (same order as continuity boundStepMap).
    const j = (a - aPrev) / safeDt;
    if (Math.abs(j) > jerkCeil) {
      a = aPrev + Math.sign(j || 1) * jerkCeil * safeDt;
    }
    if (Math.abs(a) > policy.maxAcceleration) {
      a = Math.sign(a || 1) * policy.maxAcceleration;
    }
    desiredV = vPrev + a * safeDt;
    if (Math.abs(desiredV) > policy.maxVelocity) {
      desiredV = Math.sign(desiredV || 1) * policy.maxVelocity;
      a = (desiredV - vPrev) / safeDt;
      if (Math.abs(a) > policy.maxAcceleration) {
        a = Math.sign(a || 1) * policy.maxAcceleration;
        desiredV = vPrev + a * safeDt;
        if (Math.abs(desiredV) > policy.maxVelocity) {
          desiredV = Math.sign(desiredV || 1) * policy.maxVelocity;
          a = (desiredV - vPrev) / safeDt;
        }
      }
      // Re-clamp jerk after velocity projection.
      const j2 = (a - aPrev) / safeDt;
      if (Math.abs(j2) > jerkCeil) {
        a = aPrev + Math.sign(j2 || 1) * jerkCeil * safeDt;
        if (Math.abs(a) > policy.maxAcceleration) {
          a = Math.sign(a || 1) * policy.maxAcceleration;
        }
        desiredV = vPrev + a * safeDt;
        if (Math.abs(desiredV) > policy.maxVelocity) {
          desiredV = Math.sign(desiredV || 1) * policy.maxVelocity;
          a = (desiredV - vPrev) / safeDt;
        }
      }
    }

    let next = prev + desiredV * safeDt;
    // Unified re-clamp (j→a→v + face-step) so FD derivatives stay in policy.
    ({ a, desiredV, next } = reclampDerivatives(
      prev,
      next,
      vPrev,
      aPrev,
      safeDt,
      policy,
      isFaceChannel(k),
    ));

    values[k] = quantize(next);
    velocity[k] = quantize(desiredV);
    acceleration[k] = quantize(a);
  }

  // Final tissue pass; re-integrate under hard bounds after clamp.
  const tissue = clampTissue(values, previous, policy);
  const realized: FacialChannelMap = { ...tissue.channels };
  for (const k of keys) {
    const prev = num(previous[k], 0);
    let next = num(realized[k], prev);
    const vPrev = num(priorVelocity[k], 0);
    const aPrev = num(priorAcceleration[k], 0);
    const reclamped = reclampDerivatives(
      prev,
      next,
      vPrev,
      aPrev,
      safeDt,
      policy,
      isFaceChannel(k),
    );
    realized[k] = quantize(reclamped.next);
    velocity[k] = quantize(reclamped.desiredV);
    acceleration[k] = quantize(reclamped.a);
  }

  return {
    values: realized,
    velocity,
    acceleration,
  };
}

/**
 * Project a proposed next value onto the reachable derivative set.
 *
 * Authority order (never broken):
 * 1. maxJerk relative to aPrev
 * 2. maxAcceleration
 * 3. maxVelocity when achievable without violating 1–2
 * 4. face-step on the proposal only (not a post-cascade force-cap)
 *
 * When residual (vPrev, aPrev) already makes the (v,a,j) triangle impossible,
 * j and a stay legal and v may take multiple frames to re-enter maxVelocity.
 * Position is always next = prev + v*dt (consistent integration).
 */
function reclampDerivatives(
  prev: number,
  nextIn: number,
  vPrev: number,
  aPrev: number,
  safeDt: number,
  policy: FacialContinuumPolicy,
  face: boolean,
): { next: number; desiredV: number; a: number } {
  let prop = nextIn;
  if (face && Math.abs(prop - prev) > policy.maxFaceStep) {
    prop = prev + Math.sign(prop - prev || 1) * policy.maxFaceStep;
  }

  /** Pure j→a cascade; v is always vPrev + a*dt. Velocity ceiling is soft. */
  const applyCascade = (vTarget: number): { desiredV: number; a: number } => {
    const jerkCeil = policy.maxJerk * JERK_CLAMP_FRACTION;
    // Desired acceleration toward vTarget.
    let aa = (vTarget - vPrev) / safeDt;
    // Jerk clamp (highest authority) with quantize-safe margin.
    const j = (aa - aPrev) / safeDt;
    if (Math.abs(j) > jerkCeil) {
      aa = aPrev + Math.sign(j || 1) * jerkCeil * safeDt;
    }
    // Accel clamp.
    if (Math.abs(aa) > policy.maxAcceleration) {
      aa = Math.sign(aa || 1) * policy.maxAcceleration;
      // Re-check jerk after accel clamp.
      const j2 = (aa - aPrev) / safeDt;
      if (Math.abs(j2) > jerkCeil) {
        aa = aPrev + Math.sign(j2 || 1) * jerkCeil * safeDt;
        if (Math.abs(aa) > policy.maxAcceleration) {
          aa = Math.sign(aa || 1) * policy.maxAcceleration;
        }
      }
    }
    let vv = vPrev + aa * safeDt;
    // Soft velocity ceiling only when reachable under j/a already chosen.
    if (Math.abs(vv) > policy.maxVelocity) {
      const vCeil = Math.sign(vv || 1) * policy.maxVelocity;
      let aCeil = (vCeil - vPrev) / safeDt;
      const jAtCeil = (aCeil - aPrev) / safeDt;
      if (
        Math.abs(jAtCeil) <= jerkCeil + 1e-9 &&
        Math.abs(aCeil) <= policy.maxAcceleration + 1e-9
      ) {
        vv = vCeil;
        aa = aCeil;
      }
      // Else keep j/a-legal (vv, aa); v will re-enter band on later frames.
    }
    return { desiredV: vv, a: aa };
  };

  const vTarget = (prop - prev) / safeDt;
  let { desiredV, a } = applyCascade(vTarget);
  let next = prev + desiredV * safeDt;

  // Under residual velocity, prefer the legal cascade that minimizes |Δpos|.
  if (face && Math.abs(next - prev) > policy.maxFaceStep + 1e-12) {
    const vCap = (Math.sign(next - prev || 1) * policy.maxFaceStep) / safeDt;
    const candidates = [applyCascade(vTarget), applyCascade(vCap), applyCascade(0)].map(
      (c) => ({
        desiredV: c.desiredV,
        a: c.a,
        next: prev + c.desiredV * safeDt,
      }),
    );
    candidates.sort((x, y) => Math.abs(x.next - prev) - Math.abs(y.next - prev));
    desiredV = candidates[0]!.desiredV;
    a = candidates[0]!.a;
    next = candidates[0]!.next;
  }

  return { next, desiredV, a };
}

/** Soft-enforce eye asymmetry within policy without killing intentional chirality. */
export function enforceChiralitySymmetry(
  channels: FacialChannelMap,
  policy: FacialContinuumPolicy = DEFAULT_FACIAL_POLICY,
): FacialChannelMap {
  const out = { ...channels };
  const metric = eyeAsymmetryMetric(out);
  if (metric <= policy.maxEyeAsymmetry) return out;

  const cl = num(out.corner_pull_l, 0);
  const cr = num(out.corner_pull_r, 0);
  const mid = (cl + cr) / 2;
  const maxHalf = policy.maxEyeAsymmetry * 0.7;
  out.corner_pull_l = quantize(mid + Math.max(-maxHalf, Math.min(maxHalf, cl - mid)));
  out.corner_pull_r = quantize(mid + Math.max(-maxHalf, Math.min(maxHalf, cr - mid)));
  if (typeof out.eye_spacing === "number") {
    const s = out.eye_spacing;
    const maxS = policy.maxEyeAsymmetry * 0.9;
    out.eye_spacing = quantize(Math.max(-maxS, Math.min(maxS, s)));
  }
  return out;
}

/**
 * Face-step reclamping must cover the full FACE_ONLY_CHANNELS vocabulary
 * (legacy eye/mouth + R3 whole-face morphology keys). Prefix matching alone
 * misses brow_raise, dual lids, cheek/plane tension, contour, asymmetry, gaze_action.
 */
function isFaceChannel(k: string): boolean {
  if (FACE_CHANNEL_SET.has(k)) return true;
  return (
    k.startsWith("eye_") ||
    k.startsWith("mouth_") ||
    k.startsWith("corner_") ||
    k === "gaze" ||
    k === "face_scale"
  );
}

function channelKeys(a: FacialChannelMap, b: FacialChannelMap): string[] {
  const keys = new Set<string>([...FACIAL_BODY_CHANNELS]);
  for (const k of Object.keys(a)) keys.add(k);
  for (const k of Object.keys(b)) keys.add(k);
  return [...keys];
}

function num(v: number | undefined, d: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : d;
}
