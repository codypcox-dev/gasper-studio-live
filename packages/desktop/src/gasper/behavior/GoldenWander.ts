/**
 * GASPER-CRAFT-002 · D-0106 — the golden-angle wander law (pure module).
 *
 * Owner directive 2026-08-03: "in as much animation behavioral patterns as
 * you can" use the golden ratio. D-0105 rule 5 declared the instrument: the
 * golden angle. This module is the law itself — pure functions only (no
 * clock, DOM, timer, or random source), so the wander authority and its
 * tests agree on one deterministic sequence.
 *
 * The problem: an idle being that picks targets from a periodic list loops
 * like a GIF (vfxops-engine/3danim-state-idle: "never looks like a looping
 * GIF… never metronomic"); one that picks at random is noise, not character.
 * Phyllotaxis solved this: the sunflower places its seeds at bearing
 * k·(360°/φ²) — the GOLDEN ANGLE — because φ is the most irrational number
 * (continued fraction [1;1,1,…]): its rotations never repeat and never lock
 * onto a rational lane, so successive points fill the disc without gaps,
 * overlaps, or a visible rail (Vogel 1979; canon `golden-section-timing`).
 * Gasper's wander targets are exactly those seeds, mapped onto the desk.
 *
 * The correlation trap (Weyl): the golden-angle bearing IS frac(−kφ) — the
 * Kronecker sequence of φ itself (1/φ² = 2−φ). A second channel drawn from
 * Q(φ) (φ⁻¹, φ², √5 = 2φ−1…) lies on the same torus line and turns the
 * seeds into a patrol rail. The reach channel therefore uses √2 — an
 * irrational OUTSIDE the φ field — so (bearing, reach) equidistributes on
 * the disc (Weyl's theorem: 1, 1/φ², √2 are linearly independent over Q).
 * The visible rhythm — the bearing, the timing ladder, the speeds — stays
 * golden; √2 is documented here, honestly, as the one non-φ channel.
 *
 * Doctrine 2 (bounds awareness, Layer 2): every target is chosen INSIDE the
 * frustum at its own depth with a standing margin — Gasper knows the edges
 * before contact; `worldBoundsAt` is the law he walks by. The pack compiler
 * gate and the physics walls keep their roles; this is the autonomous
 * consumer the WorldSpace docstring reserved.
 */
import { worldBoundsAt, type WorldBounds } from "../space/WorldSpace";
import {
  clampToComfortBand,
  comfortCruiseBand,
  GAIT_LAW,
  GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC,
  gaitStridePeriodSeconds,
} from "../physics/GaitLaw";
import { PHI_LAW } from "../physics/PhiLaw";
import { KERNEL_STEER_GAIN_PER_SECOND } from "../physics/WorldPhysicsDriver";

export const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;
/** The golden angle — 360°/φ² ≈ 137.50776°. The bearing step of the seeds. */
export const GOLDEN_ANGLE_DEG = 360 / (GOLDEN_RATIO * GOLDEN_RATIO);

// Pressure-Cooker Cycle 2 (embodied-locomotion-phd-memo E2/E5): the φ speed
// ladder keeps its φ SHAPE (owner meta-law) but lives inside the Froude
// comfort band — the unclamped amble (base·φ⁻¹ = 1978, Fr ≈ 0.09) sat below
// the band (a slide) and the unclamped brisk (base·φ = 5178, Fr ≈ 0.59) sat
// ON the walk→run transition (a run, wrong class). The leg floor is the
// Coulomb reach distance for the band floor (v²/(μ·g), μ = 1/φ²) with a φ
// margin: a shorter leg can never reach the band, so it can never express
// the walk (E4/E5).
const D0112_FIELD_GRAVITY = 74210; // world units/s² — the D-0112 field (GaitLaw.test idiom)
const COMFORT_BAND = comfortCruiseBand(D0112_FIELD_GRAVITY);
const MIN_LEG_UNITS = Math.ceil(
  ((COMFORT_BAND.min * COMFORT_BAND.min) /
    (D0112_FIELD_GRAVITY / (GOLDEN_RATIO * GOLDEN_RATIO))) *
    GOLDEN_RATIO,
);
/** The Weyl partner of the bearing channel — an irrational outside Q(φ). */
const REACH_IRRATIONAL = Math.SQRT2;

// ---------------------------------------------------------------------------
// Pressure-Cooker Cycle 3 (locomotion-legibility-phd-memo M1) — the far edge
// of the legible band is DERIVED, not tuned.
//
// M1b re-derivation (RE-VERIFY evidence, Cycle-3 take 1): anchoring the far
// edge at the BARE minimum — the depth where the room's diagonal hosts the
// M1 window at the band floor exactly — makes the set of M1 chords
// measure-zero (a ~1-unit hair around the exact diagonal), and the live
// trace proved it dead: 12/12 legs room-limited, steady ≤ 0.71 s. The far
// edge is therefore derived so the diagonal hosts the M1 window at the
// walk's ADOPTED BASE cruise (GaitLaw φ⁰ rung, 3200 u/s): the cone of
// M1 chords gains real measure (landing arcs ~10³ units on the far wall),
// while the far scale ≈ 0.46 keeps the legibility reserve above the zFar
// fade (0.35). Any shallower leaves M1 a dead letter; any deeper spends the
// reserve the band exists to protect.
const WANDER_MU_G = PHI_LAW.frictionMu * D0112_FIELD_GRAVITY;
/** M1 minimum steady window: max(2 strides at the recall cruise, 0.9 s). */
const M1_MIN_STEADY_SECONDS = Math.max(
  2 * gaitStridePeriodSeconds(COMFORT_BAND.max),
  0.9,
);
/** Arrival allowance — the kernel's arrival radius (units). */
const ARRIVE_ALLOWANCE_UNITS = 8;
/**
 * How far inside a known bound the filed target must sit so the body can
 * actually enter the arrival band. 120fps wispwalker-walk samples pinned
 * ~14 units short of the wander fence (z = depthBandMax, scale 1/φ) with
 * residual speed 39.4 — just under the 40 u/s arrive gate — because the
 * composer placed the target ON the fence. φ² · allowance keeps the inset
 * in the same ladder as the rest of the wander law.
 */
export const WANDER_ARRIVE_EPS_UNITS = ARRIVE_ALLOWANCE_UNITS;
export const WANDER_ARRIVE_SPEED_UNITS = 40;
export const WANDER_ARRIVE_INSET_UNITS =
  ARRIVE_ALLOWANCE_UNITS * GOLDEN_RATIO * GOLDEN_RATIO;
/** Stall window: one φ⁻¹ hold of no XZ progress ends the leg. */
export const WANDER_STALL_SECONDS = 1 / GOLDEN_RATIO;
/**
 * Leg overhead at cruise v (units): traction-limited ramp v²/(2μg) + the
 * kernel's gain-tracking tail (φ margin over one time constant, corpus
 * φ-margin idiom) + the Coulomb brake v²/(2μg) + the arrival allowance.
 */
const legOverheadUnitsAt = (v: number): number =>
  (v * v) / WANDER_MU_G +
  (GOLDEN_RATIO * v) / KERNEL_STEER_GAIN_PER_SECOND +
  ARRIVE_ALLOWANCE_UNITS;
/**
 * M1b — the far-edge anchor chord: the M1 window hosted at the walk's
 * ADOPTED BASE cruise (GaitLaw φ⁰ rung), not the band floor. Take-1 proved
 * the bare-minimum edge makes M1-hosting chords measure-zero; anchoring one
 * lawful φ rung higher gives the feasible cone real measure, and the deepest
 * crossing then walks at EXACTLY the base rung (self-consistent — the
 * margin IS the ladder, not a tuned constant).
 */
const M1_FAR_EDGE_CHORD_UNITS =
  GAIT_LAW.cruiseBaseUnitsPerSec *
    (M1_MIN_STEADY_SECONDS + GOLDEN_RATIO / KERNEL_STEER_GAIN_PER_SECOND) +
  (GAIT_LAW.cruiseBaseUnitsPerSec * GAIT_LAW.cruiseBaseUnitsPerSec) /
    WANDER_MU_G +
  ARRIVE_ALLOWANCE_UNITS;

/** The frustum's linear half-width law, sampled from WorldSpace (single source). */
const XB_AT_0 = worldBoundsAt(0).xHalf;
const XB_SLOPE = (worldBoundsAt(2).xHalf - XB_AT_0) / 2; // per unit depth

/**
 * Solve (m·xHalf(z) + m·xHalf(zMin))² + (z − zMin)² = L² for z — the far
 * corner whose diagonal from the near-opposite corner reaches L. Monotone in
 * z; closed-form quadratic, positive root.
 */
function farDepthForChordUnits(chordUnits: number, depthBandMin: number): number {
  const m = 0.86; // boundsMargin (below) — the Layer-2 awareness gap
  const A = m * XB_SLOPE;
  const nearX = m * (XB_AT_0 + XB_SLOPE * depthBandMin);
  const C = m * XB_AT_0 + nearX;
  const a = A * A + 1;
  const b = 2 * (A * C - depthBandMin);
  const c = C * C + depthBandMin * depthBandMin - chordUnits * chordUnits;
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

const DEPTH_BAND_MIN = -320; // N35 (2026-08-06): the owner's glass law — wander may approach only until +20% size (scale 1.2 = the new zNear exactly); the old -480 (1.33x) read too close
const DEPTH_BAND_MAX = Math.ceil(
  farDepthForChordUnits(M1_FAR_EDGE_CHORD_UNITS, DEPTH_BAND_MIN),
);

export const WANDER_LAW = Object.freeze({
  phi: GOLDEN_RATIO,
  goldenAngleDeg: GOLDEN_ANGLE_DEG,
  /**
   * The legible depth band for idle life (world units from the home plane).
   * −320 → scale = 1.2 (the N35 owner cap — approachable, never looming);
   * the far edge is the Cycle-3 M1b derivation above (the depth at which
   * the room's longest chord hosts the steady window at the adopted BASE
   * cruise — scale ≈ 0.46, legibility reserve kept above the zFar fade
   * 0.35). The far fade stays reserved for authored performances.
   */
  depthBandMin: DEPTH_BAND_MIN,
  depthBandMax: DEPTH_BAND_MAX,
  /** Standing margin from the frustum edges — the Layer-2 awareness gap. */
  boundsMargin: 0.86,
  /** The closest a target may sit to the view axis (fraction of reach). */
  minReachFrac: 0.35,
  /**
   * Stroll speed at φ⁰ (world units/s); the ladder is v·φ⁻¹, v, v·φ —
   * CLAMPED into the comfort band (Cycle 2 E2): [2612, 3200, 3990].
   * Pressure-Cooker Cycle 1 (gait-expression-phd-memo L2): re-based from the
   * 260 u/s crawl (Fr ≈ 2.4e-4 — a slide, not a walk) onto the dynamic-
   * similarity comfortable band √(Fr·g·l_eff) ∈ [2612, 3990] at the D-0112
   * field; a 16 cm body strolls at ~2.6 body-lengths/s (X-f2/X-f3).
   */
  baseSpeedUnitsPerSec: GAIT_LAW.cruiseBaseUnitsPerSec,
  /**
   * Cycle 2 E5 — a travel leg shorter than this can never reach the comfort
   * band (Coulomb reach ×φ), so the wanderer turns the golden angle onward.
   */
  minLegUnits: MIN_LEG_UNITS,
  /**
   * The dwell ladder (seconds): φ⁻¹, 1, φ, 2φ. Every hold is an event with
   * room to breathe — the 0.35s hold-law floor is honored by construction.
   */
  dwellLadderSeconds: Object.freeze([
    1 / GOLDEN_RATIO,
    1,
    GOLDEN_RATIO,
    2 * GOLDEN_RATIO,
  ]),
  /** A travel leg never snaps — the shortest stroll still reads. */
  minTravelSeconds: 0.4,
  /**
   * Gradual resume after suppression (alive-015: "instant resume reads as
   * state reset"): φ² seconds of stillness before the first step.
   */
  resumeCooldownSeconds: GOLDEN_RATIO * GOLDEN_RATIO,
  /**
   * The walk home when called — brisk at the comfort band's top (Cycle 2 E2:
   * was base·φ = 5178, Fr ≈ 0.59 — the walk→run transition; a run home is the
   * wrong class for a walk home).
   */
  recallSpeedUnitsPerSec: COMFORT_BAND.max,
});

function frac(x: number): number {
  return x - Math.floor(x);
}

export type GoldenWanderPlan = Readonly<{
  /** Seed index — the wanderer's place in the sunflower. */
  step: number;
  /** Bearing about home, degrees (0 = stage right, turning golden). */
  bearingDeg: number;
  /** Target lateral offset, world units (inside the margin at its depth). */
  x: number;
  /** Target depth, world units (inside the legible band). */
  z: number;
  /** Stroll speed for this leg (world units/s) — the φ speed ladder. */
  speedUnitsPerSec: number;
  /** The hold at arrival (seconds) — the φ dwell ladder. */
  dwellSeconds: number;
}>;

/**
 * The k-th seed of the wander sunflower, mapped onto the desk.
 *
 *  - bearing  θ_k = k·(360°/φ²) mod 360 — the golden angle (Vogel);
 *  - reach    ρ_k = ρ_min + (1−ρ_min)·frac(k·√2) — the Weyl partner;
 *  - depth    z_k rides the bearing's sine across the legible band (the
 *             ellipse about home), so depth turns golden too;
 *  - lateral  x_k = ρ_k·margin·xHalf(z_k)·cos θ_k — the frustum at the
 *             target's OWN depth sets the reach (Doctrine 2: the space is
 *             wider in the distance, and he knows it).
 *
 * Deterministic, aperiodic, bounds-aware. No random source anywhere.
 */
export function goldenWanderPlan(k: number): GoldenWanderPlan {
  const L = WANDER_LAW;
  const step = Math.max(0, Math.floor(Number.isFinite(k) ? k : 0));

  const bearingDeg = (step * L.goldenAngleDeg) % 360;
  const theta = (bearingDeg * Math.PI) / 180;

  const u = frac(step * L.phi); // the φ rung channel (ladder selection)
  const reach = frac(step * REACH_IRRATIONAL); // the Weyl partner

  const zC = (L.depthBandMin + L.depthBandMax) / 2;
  const zR = (L.depthBandMax - L.depthBandMin) / 2;
  const z = zC + zR * Math.sin(theta);

  const bounds: WorldBounds = worldBoundsAt(z);
  const rho = L.minReachFrac + (1 - L.minReachFrac) * reach;
  const x = rho * L.boundsMargin * bounds.xHalf * Math.cos(theta);

  // The φ speed ladder: v·φ⁻¹ (amble), v (stroll), v·φ (brisk) — clamped into
  // the comfort band (Cycle 2 E2): the walk never slides below the band and
  // never crosses the walk→run transition.
  const speedRung = Math.min(2, Math.floor(3 * u)) - 1;
  const speedUnitsPerSec = clampToComfortBand(
    L.baseSpeedUnitsPerSec * Math.pow(L.phi, speedRung),
    D0112_FIELD_GRAVITY,
  );

  // The φ dwell ladder rung — uniform over the seeds.
  const dwellRung = Math.min(3, Math.floor(4 * u));
  const dwellSeconds = L.dwellLadderSeconds[dwellRung];

  return Object.freeze({
    step,
    bearingDeg,
    x,
    z,
    speedUnitsPerSec,
    dwellSeconds,
  });
}

/**
 * The wanderer's ground truth: every plan inside the REAL bounds at its own
 * depth, with the standing margin — the Layer-2 awareness claim, checkable.
 */
export function goldenWanderPlanInsideBounds(
  plan: GoldenWanderPlan,
): boolean {
  if (!Number.isFinite(plan.x) || !Number.isFinite(plan.z)) return false;
  const L = WANDER_LAW;
  if (plan.z < L.depthBandMin || plan.z > L.depthBandMax) return false;
  const b = worldBoundsAt(plan.z);
  return Math.abs(plan.x) <= b.xHalf * L.boundsMargin;
}

// ---------------------------------------------------------------------------
// Pressure-Cooker Cycle 3 (locomotion-legibility-phd-memo M1/M2) — leg
// COMPOSITION.
//
// The wall: the walk was physically derived and raster-expressed, yet the eye
// read a bouncing orb — every leg completed in <0.5 s, so no gait cycle ever
// had time to be recognized (Johansson; Cutting: identity stabilizes after
// 2–3 full strides). The fix is derived, never authored per instance (N18):
//
//  M1 — a leg must grant the gait a steady window of at least
//       max(2·T_stride at the recall cruise, 0.9 s) BEFORE the dwell. The
//       sunflower still owns the BEARING; the room's edge catches him when
//       the seed chord is too short to host the window (Doctrine 2, Layer 2:
//       the bounds are known before contact — now they also set the leg's
//       length). If the extended chord is still short, the cruise is DERIVED
//       from the chord (root of the window equation) when the root stays
//       inside the E2 comfort band.
//
//  M1b — if the root falls BELOW the band floor, the golden bearing cannot
//       host M1: the composer then prefers the longest lawful chord by
//       deflecting the bearing by the SMALLEST angle onto the room's edge
//       (the circle of the required chord ∩ the boundary he knows). Only
//       when no boundary point reaches the required chord does the leg take
//       the honest room-limited clamp — the band is the harder law (a slower
//       walk is a slide, a faster walk a run).
//
//  The composition reads the kernel's live traction context (μ, g) through
//  the port — field-driven, never assumed. Pure + frozen + deterministic.
// ---------------------------------------------------------------------------

/** The kernel's live Coulomb budget (WorldPhysicsDriver.traction()). */
export type WanderTraction = Readonly<{ mu: number; gravity: number }>;

/** How the composer resolved a leg — census-observable, honest. */
export type WanderLegMode =
  | "seed" // the seed chord hosts the M1 window at the seed cruise
  | "extended" // extended to the room's edge along the seed bearing
  | "speed-derived" // cruise solved from the chord so the window fills M1
  | "deflected" // M1b: smallest turn onto a boundary chord that hosts M1
  | "room-limited"; // chord cannot host M1 anywhere — honest clamp

export type WanderLegComposition = Readonly<{
  to: Readonly<{ x: number; z: number }>;
  cruiseUnitsPerSec: number;
  chordUnits: number;
  /** The steady window the composed leg ACTUALLY grants at its cruise. */
  steadySeconds: number;
  mode: WanderLegMode;
  /** The comfort band floor at the leg's traction (0 = traction unknown). */
  bandMinUnitsPerSec: number;
}>;

/** M1 — the minimum steady window, derived from the gait observables. */
export function legMinSteadySeconds(): number {
  return M1_MIN_STEADY_SECONDS;
}

/**
 * The steady window a chord grants at a cruise under a traction budget:
 * traversal minus the kernel's ramp and brake overheads.
 */
export function legSteadySeconds(
  chordUnits: number,
  cruiseUnitsPerSec: number,
  muG: number,
): number {
  if (!(chordUnits > 0) || !(cruiseUnitsPerSec > 0) || !(muG > 0)) return 0;
  const overhead =
    (cruiseUnitsPerSec * cruiseUnitsPerSec) / muG +
    (GOLDEN_RATIO * cruiseUnitsPerSec) / KERNEL_STEER_GAIN_PER_SECOND +
    ARRIVE_ALLOWANCE_UNITS;
  return Math.max(0, (chordUnits - overhead) / cruiseUnitsPerSec);
}

/**
 * The Coulomb braking distance the kernel's steering law applies at a speed:
 * vDes = √(2μg·d) — arrival begins inside this envelope (+ the arrival
 * allowance). M2 phasing reads it live, never a timer.
 */
export function coulombBrakeDistanceUnits(
  speedUnitsPerSec: number,
  muG: number,
): number {
  if (!(speedUnitsPerSec > 0) || !(muG > 0)) return ARRIVE_ALLOWANCE_UNITS;
  return (
    (speedUnitsPerSec * speedUnitsPerSec) / (2 * muG) + ARRIVE_ALLOWANCE_UNITS
  );
}

/**
 * Solve legSteadySeconds(chord, v) = windowSeconds for v — closed form:
 * v²/μg + v·(T + φ/K) + (allowance − chord) = 0, positive root.
 */
function cruiseForSteadyWindow(
  chordUnits: number,
  windowSeconds: number,
  muG: number,
): number {
  const B = windowSeconds + GOLDEN_RATIO / KERNEL_STEER_GAIN_PER_SECOND;
  return (
    (muG / 2) *
    (-B + Math.sqrt(B * B + (4 * (chordUnits - ARRIVE_ALLOWANCE_UNITS)) / muG))
  );
}

/**
 * The distance from a point to the wander region's edge along a unit
 * direction — closed-form ray exit against the convex region
 * z ∈ [depthBandMin, depthBandMax], |x| ≤ margin·xHalf(z) (linear frustum).
 * Assumes `from` is inside (the wanderer always is); 0 = fail-closed.
 */
export function maxChordUnitsAlong(
  from: Readonly<{ x: number; z: number }>,
  dirX: number,
  dirZ: number,
): number {
  if (!Number.isFinite(dirX) || !Number.isFinite(dirZ)) return 0;
  const len = Math.hypot(dirX, dirZ);
  if (!(len > 1e-9)) return 0;
  const dx = dirX / len;
  const dz = dirZ / len;
  const L = WANDER_LAW;
  const m = L.boundsMargin;
  let t = Number.POSITIVE_INFINITY;
  // Depth fences.
  if (dz > 0) t = Math.min(t, (L.depthBandMax - from.z) / dz);
  else if (dz < 0) t = Math.min(t, (L.depthBandMin - from.z) / dz);
  // Lateral frustum walls: |x(t)| ≤ m·(XB_AT_0 + XB_SLOPE·z(t)).
  const wallC = m * XB_AT_0 + m * XB_SLOPE * from.z;
  const hiCoef = dx - m * XB_SLOPE * dz;
  if (hiCoef > 0) t = Math.min(t, (wallC - from.x) / hiCoef);
  const loCoef = -dx - m * XB_SLOPE * dz;
  if (loCoef > 0) t = Math.min(t, (wallC + from.x) / loCoef);
  return Number.isFinite(t) && t > 0 ? t : 0;
}

/**
 * M1b — the chord that hosts the M1 window at a cruise under traction μg:
 * v·(T + φ/K) + v²/μg + allowance. At the band floor this is the binding
 * case: any chord at least this long can carry a lawful M1 leg (the cruise
 * root lands inside the E2 band). Live in the traction, never a constant.
 */
export function m1RequiredChordUnits(
  cruiseUnitsPerSec: number,
  muG: number,
): number {
  if (!(cruiseUnitsPerSec > 0) || !(muG > 0)) return Number.POSITIVE_INFINITY;
  return (
    cruiseUnitsPerSec *
      (M1_MIN_STEADY_SECONDS + GOLDEN_RATIO / KERNEL_STEER_GAIN_PER_SECOND) +
    (cruiseUnitsPerSec * cruiseUnitsPerSec) / muG +
    ARRIVE_ALLOWANCE_UNITS
  );
}

/**
 * The wander region's boundary as four margin-scaled line segments (the
 * frustum trapezoid he knows — Doctrine 2, Layer 2), ordered far fence,
 * near fence, right wall, left wall. Pure; single-sourced from WANDER_LAW
 * and WorldSpace.
 */
export function wanderRegionSides(): ReadonlyArray<
  Readonly<{ ax: number; az: number; bx: number; bz: number }>
> {
  const L = WANDER_LAW;
  const m = L.boundsMargin;
  const xMin = m * worldBoundsAt(L.depthBandMin).xHalf;
  const xMax = m * worldBoundsAt(L.depthBandMax).xHalf;
  const zMin = L.depthBandMin;
  const zMax = L.depthBandMax;
  return Object.freeze([
    Object.freeze({ ax: -xMax, az: zMax, bx: xMax, bz: zMax }),
    Object.freeze({ ax: -xMin, az: zMin, bx: xMin, bz: zMin }),
    Object.freeze({ ax: xMin, az: zMin, bx: xMax, bz: zMax }),
    Object.freeze({ ax: -xMax, az: zMax, bx: -xMin, bz: zMin }),
  ]);
}

/**
 * M1b — the minimal-deflection target. When the golden chord cannot host
 * the M1 window, turn the bearing by the SMALLEST angle that can: the
 * angularly nearest point where the circle of radius chordRequiredUnits
 * about the body meets the wander region's boundary (closed-form
 * circle∩segment per side; corners arrive as endpoint roots). The sunflower
 * keeps the bearing whenever it can; the room bends it only by the angle it
 * demands — so successive legs fan out aperiodically and never lock onto a
 * patrol rail. Null when no boundary point reaches the required chord (the
 * room honestly cannot grant M1 from here). Pure + frozen + deterministic.
 */
export function m1DeflectionTarget(
  from: Readonly<{ x: number; z: number }>,
  dirX: number,
  dirZ: number,
  chordRequiredUnits: number,
): Readonly<{
  x: number;
  z: number;
  chordUnits: number;
  deflectionRad: number;
}> | null {
  if (
    !Number.isFinite(from.x) ||
    !Number.isFinite(from.z) ||
    !Number.isFinite(dirX) ||
    !Number.isFinite(dirZ) ||
    !(chordRequiredUnits > 0)
  ) {
    return null;
  }
  const len = Math.hypot(dirX, dirZ);
  if (!(len > 1e-9)) return null;
  const ux = dirX / len;
  const uz = dirZ / len;

  // The golden bearing itself hosts the chord: no turn at all — the ray-exit
  // point along it IS the minimal-deflection target (deflection 0).
  const tExit = maxChordUnitsAlong(from, ux, uz);
  if (tExit >= chordRequiredUnits) {
    return Object.freeze({
      x: from.x + ux * tExit,
      z: from.z + uz * tExit,
      chordUnits: tExit,
      deflectionRad: 0,
    });
  }

  let best: { x: number; z: number; chord: number; angle: number } | null =
    null;
  for (const side of wanderRegionSides()) {
    const ex = side.bx - side.ax;
    const ez = side.bz - side.az;
    const fx = side.ax - from.x;
    const fz = side.az - from.z;
    const qa = ex * ex + ez * ez;
    if (!(qa > 1e-12)) continue;
    const qb = 2 * (fx * ex + fz * ez);
    const qc = fx * fx + fz * fz - chordRequiredUnits * chordRequiredUnits;
    const disc = qb * qb - 4 * qa * qc;
    if (!(disc >= 0)) continue;
    const sq = Math.sqrt(disc);
    for (const t of [(-qb - sq) / (2 * qa), (-qb + sq) / (2 * qa)]) {
      if (t < -1e-9 || t > 1 + 1e-9) continue;
      const tc = Math.min(1, Math.max(0, t));
      const x = side.ax + tc * ex;
      const z = side.az + tc * ez;
      const chord = Math.hypot(x - from.x, z - from.z);
      if (!(chord > 1e-9)) continue;
      const vx = (x - from.x) / chord;
      const vz = (z - from.z) / chord;
      const angle = Math.abs(Math.atan2(ux * vz - uz * vx, ux * vx + uz * vz));
      if (
        best === null ||
        angle < best.angle - 1e-12 ||
        (Math.abs(angle - best.angle) <= 1e-12 && chord > best.chord)
      ) {
        best = { x, z, chord, angle };
      }
    }
  }
  if (best === null) return null;
  return Object.freeze({
    x: best.x,
    z: best.z,
    chordUnits: best.chord,
    deflectionRad: best.angle,
  });
}

/**
 * Compose the next wander leg from the body's floor pose, the golden seed,
 * and the kernel's live traction (M1/M2). Deterministic; fail-closed to the
 * bare seed when the traction context is absent or degenerate.
 */
export function composeWanderLeg(
  from: Readonly<{ x: number; z: number }>,
  plan: GoldenWanderPlan,
  traction: WanderTraction | null,
): WanderLegComposition {
  const seed = Object.freeze({ x: plan.x, z: plan.z });
  const chordSeed = Math.hypot(seed.x - from.x, seed.z - from.z);
  const failClosed = (mode: WanderLegMode): WanderLegComposition =>
    Object.freeze({
      to: seed,
      cruiseUnitsPerSec: plan.speedUnitsPerSec,
      chordUnits: chordSeed,
      steadySeconds: 0,
      mode,
      bandMinUnitsPerSec: 0,
    });

  const mu = traction?.mu ?? NaN;
  const g = traction?.gravity ?? NaN;
  if (!(mu > 0) || !(g > 0) || !Number.isFinite(mu) || !Number.isFinite(g)) {
    return failClosed("seed");
  }
  const muG = mu * g;
  const band = comfortCruiseBand(g);
  const T = legMinSteadySeconds();

  if (chordSeed < 1e-6) return failClosed("seed");

  // 1 — the seed chord hosts the window at the seed cruise: walk the seed.
  if (legSteadySeconds(chordSeed, plan.speedUnitsPerSec, muG) >= T) {
    return Object.freeze({
      to: seed,
      cruiseUnitsPerSec: plan.speedUnitsPerSec,
      chordUnits: chordSeed,
      steadySeconds: legSteadySeconds(chordSeed, plan.speedUnitsPerSec, muG),
      mode: "seed",
      bandMinUnitsPerSec: band.min,
    });
  }

  // 2 — extend along the seed bearing to the room's edge.
  const dirX = (seed.x - from.x) / chordSeed;
  const dirZ = (seed.z - from.z) / chordSeed;
  const tExit = maxChordUnitsAlong(from, dirX, dirZ);
  const chord = Math.max(chordSeed, tExit);
  const to =
    chord > chordSeed
      ? Object.freeze({ x: from.x + dirX * chord, z: from.z + dirZ * chord })
      : seed;

  if (legSteadySeconds(chord, plan.speedUnitsPerSec, muG) >= T) {
    return Object.freeze({
      to,
      cruiseUnitsPerSec: plan.speedUnitsPerSec,
      chordUnits: chord,
      steadySeconds: legSteadySeconds(chord, plan.speedUnitsPerSec, muG),
      mode: "extended",
      bandMinUnitsPerSec: band.min,
    });
  }

  // 3 — derive the cruise from the chord; the E2 band is the harder law.
  const vRoot = cruiseForSteadyWindow(chord, T, muG);
  if (vRoot >= band.min) {
    const cruise = Math.min(band.max, vRoot);
    return Object.freeze({
      to,
      cruiseUnitsPerSec: cruise,
      chordUnits: chord,
      steadySeconds: legSteadySeconds(chord, cruise, muG),
      mode: "speed-derived",
      bandMinUnitsPerSec: band.min,
    });
  }

  // 4 — M1b: the golden chord cannot host the window. Turn as LITTLE as the
  // room demands — the smallest deflection onto a boundary chord that hosts
  // M1 (the prefer clause: the longest lawful chord along the bearing is
  // kept, and the bearing bends only by the angle the room requires).
  const lReq = m1RequiredChordUnits(band.min, muG);
  const deflected = m1DeflectionTarget(from, dirX, dirZ, lReq);
  if (deflected !== null) {
    const dCruise = Math.min(
      band.max,
      Math.max(band.min, cruiseForSteadyWindow(deflected.chordUnits, T, muG)),
    );
    return Object.freeze({
      to: Object.freeze({ x: deflected.x, z: deflected.z }),
      cruiseUnitsPerSec: dCruise,
      chordUnits: deflected.chordUnits,
      steadySeconds: legSteadySeconds(deflected.chordUnits, dCruise, muG),
      mode: "deflected",
      bandMinUnitsPerSec: band.min,
    });
  }

  // 5 — no chord anywhere can host the window: the honest clamp. The band
  // floor stays the slowest lawful walk — a slower leg is a slide.
  return Object.freeze({
    to,
    cruiseUnitsPerSec: band.min,
    chordUnits: chord,
    steadySeconds: legSteadySeconds(chord, band.min, muG),
    mode: "room-limited",
    bandMinUnitsPerSec: band.min,
  });
}


/**
 * Painted-demo / isolated-beat first target. Seed 0 from home is composed
 * by M1 onto the far fence (z~1186) -- a depth teleport that reads as a
 * speck. The first walk stays inside the readable depth cone
 * (scale(z)=D0/(D0+z) much greater than 1/phi) AND long enough to express
 * gait: chord >= minLegUnits so Coulomb reach can plant, not a dart.
 */
export const PAINTED_WANDER_READABLE_Z_MAX = 160;
/** Cinematic half-width at 200% / 1280: keep later seeds on stage. */
export const PAINTED_WANDER_READABLE_X_MAX = 2000;
/**
 * First painted stroll: 2.2 X1 strides at walk-band (not Coulomb-min).
 * 3200 over minLeg was a one-plant dash; this is plant, pass, exchange.
 */
const PAINTED_STRIDE_UNITS =
  GAIT_LAW.strideLenFracOfHeight * GAIT_LAW.bodyHeightUnits;
const PAINTED_FIRST_CHORD = Math.ceil(2.2 * PAINTED_STRIDE_UNITS);
const PAINTED_FIRST_Z = 80;
export const PAINTED_DEMO_FIRST_TARGET = Object.freeze({
  x: Math.ceil(
    Math.sqrt(
      PAINTED_FIRST_CHORD * PAINTED_FIRST_CHORD - PAINTED_FIRST_Z * PAINTED_FIRST_Z,
    ),
  ),
  z: PAINTED_FIRST_Z,
});

/**
 * The painted-demo / isolated-beat composer: first seed from home walks
 * the readable target; later seeds keep the golden bearing but cannot
 * file a depth teleport past the readable cap. WorldPhysicsDriver remains
 * the sole travel writer -- this only names the intent.
 */
export function composePaintedWanderLeg(
  from: Readonly<{ x: number; z: number }>,
  plan: GoldenWanderPlan,
  traction: WanderTraction | null,
): WanderLegComposition {
  const nearHome = Math.hypot(from.x, from.z) < WANDER_LAW.minLegUnits;
  if (plan.step === 0 && nearHome) {
    const to = PAINTED_DEMO_FIRST_TARGET;
    const chord = Math.hypot(to.x - from.x, to.z - from.z);
    const g = traction?.gravity;
    const mu = traction?.mu;
    const band =
      typeof g === "number" && Number.isFinite(g) && g > 0
        ? comfortCruiseBand(g)
        : { min: 0, max: 0 };
    const muG =
      typeof mu === "number" &&
      typeof g === "number" &&
      Number.isFinite(mu) &&
      Number.isFinite(g) &&
      mu > 0 &&
      g > 0
        ? mu * g
        : 0;
    const cruise = GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC;
    return Object.freeze({
      to,
      cruiseUnitsPerSec: cruise,
      chordUnits: chord,
      steadySeconds: muG > 0 ? legSteadySeconds(chord, cruise, muG) : 0,
      mode: "seed",
      bandMinUnitsPerSec: band.min,
    });
  }
  const raw = composeWanderLeg(from, plan, traction);
  const z = Math.min(
    PAINTED_WANDER_READABLE_Z_MAX,
    Math.max(WANDER_LAW.depthBandMin, raw.to.z),
  );
  const xMax = Math.min(
    PAINTED_WANDER_READABLE_X_MAX,
    WANDER_LAW.boundsMargin * worldBoundsAt(z).xHalf,
  );
  const x = Math.max(-xMax, Math.min(xMax, raw.to.x));
  if (Math.abs(z - raw.to.z) <= 1e-9 && Math.abs(x - raw.to.x) <= 1e-9) return raw;
  const to = Object.freeze({ x, z });
  return Object.freeze({
    ...raw,
    to,
    chordUnits: Math.hypot(to.x - from.x, to.z - from.z),
  });
}

/**
 * Pull a composed target inward along the incoming chord so the arrival
 * band is reachable. The composer may still name the fence (M1 chord
 * math); the filed intent must not.
 */
export function insetWanderArrivalTarget(
  from: Readonly<{ x: number; z: number }>,
  to: Readonly<{ x: number; z: number }>,
): Readonly<{ x: number; z: number }> {
  if (
    !Number.isFinite(from.x) ||
    !Number.isFinite(from.z) ||
    !Number.isFinite(to.x) ||
    !Number.isFinite(to.z)
  ) {
    return Object.freeze({ x: to.x, z: to.z });
  }
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const chord = Math.hypot(dx, dz);
  if (!(chord > WANDER_ARRIVE_INSET_UNITS + 1e-6)) {
    return Object.freeze({ x: to.x, z: to.z });
  }
  const ux = dx / chord;
  const uz = dz / chord;
  return Object.freeze({
    x: to.x - ux * WANDER_ARRIVE_INSET_UNITS,
    z: to.z - uz * WANDER_ARRIVE_INSET_UNITS,
  });
}

/** True when the body is inside the arrival band and slow enough to stand. */
export function wanderArrived(
  pos: Readonly<{ x: number; z: number }>,
  target: Readonly<{ x: number; z: number }>,
  speed: number,
): boolean {
  if (!Number.isFinite(speed)) return false;
  return (
    Math.hypot(pos.x - target.x, pos.z - target.z) < WANDER_ARRIVE_EPS_UNITS &&
    speed < WANDER_ARRIVE_SPEED_UNITS
  );
}

/**
 * True when the body has gone past the filed target along the origin→target
 * chord. The 120fps captures overshot seed (442, 1018) and kept the same
 * plan; an overshot target must complete the leg.
 */
export function wanderTargetOvershot(
  origin: Readonly<{ x: number; z: number }>,
  target: Readonly<{ x: number; z: number }>,
  pos: Readonly<{ x: number; z: number }>,
): boolean {
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const len = Math.hypot(dx, dz);
  if (!(len > 1e-9)) return false;
  const past = (pos.x - target.x) * dx + (pos.z - target.z) * dz;
  const dist = Math.hypot(pos.x - target.x, pos.z - target.z);
  return past > 0 && dist >= WANDER_ARRIVE_EPS_UNITS;
}
