/**
 * GASPER-PHYSICS-001 · Pressure-Cooker Cycle 1 — the gait observables law.
 *
 * CanonOps PHD memo `research/canon/anim-physics/gait-expression-phd-memo.md`
 * (Cycle 1, 2026-08-04): the wall was a sliding balloon — kernel locomotion
 * with no gait expression. This module is the organ that DERIVES the gait
 * conclusions (owner N18/N20 autonomy half): step frequency, travel-locked
 * phase, vertical COM bob, lean, lateral sway — every value a function of
 * live speed/acceleration and the environment field, never a clock, never
 * authored per instance.
 *
 * Provenance (memo §4): L1 DERIVED (COM at mid-height); L2 form CORPUS X-f2
 * Froude similarity, band endpoints AXIOM; L3 cadence band CORPUS
 * muybridge-locomotion (100–115 steps/min) scaled by √(H_ref/H_G) per X-f2,
 * cube-root modulation AXIOM-pending-retrieval; L4 kinematic identity;
 * L5 DERIVED inverted-pendulum vault (gait-cycle-biomechanics-1953);
 * L6 DERIVED Newtonian balance; L7 class CORPUS lateral-shift, amplitude
 * AXIOM-pending-retrieval; L8 travel-locked phase (owner autonomy law).
 *
 * Cycle 4 addendum (walk-weight-transfer-phd-memo, 2026-08-04): R3 contact
 * squash joins the observables — the body's side of the floor dialogue
 * (MSD squash ∝ impulse, expressed under the volume law by the renderer).
 * Its amplitude is derived here from the vault kinematics; the sway PHASE
 * correction (R1) and the vault roll (R2) are screen projections owned by
 * the physics driver's gaitScreen intake.
 *
 * Cycle 5 addendum (step-cycle-phd-memo, 2026-08-04): S1 — the planted-base
 * switch sharpness k = 2φ². The support point is a sample-and-hold of the
 * vault sway (S0, derived in the driver's gaitScreen); k sets its exchange
 * window at double support to 18.1 % of the step period — inside the
 * clinical double-support band (T1). No new amplitude constant: the step
 * reuses L7 swayUnits.
 *
 * Cycle 8 addendum (step-legibility-phd-memo, 2026-08-05): X1 — the cadence
 * law re-derives from STRIDE LENGTH, not Froude similarity: λ_norm = 0.75·h_G
 * (human normal stride ratio), f(v) = v/λ_norm capped so the S1 exchange
 * window (18.1 % of the step period) never falls below the temporal-summation
 * critical duration τ_c = 60 ms, floored at the 1 Hz stroll. At the band floor
 * the triple convergence holds: tan α = 0.75 ⇒ vault bob = exactly the 10 %
 * fence (unclipped arc), exchange 64 ms ≥ τ_c, stride the human ratio. The
 * Froude-scaled 5.83 Hz ran the perception laws (W1/W4, measured on human
 * cadence) 3× outside their regime — the wall was the time base, not the
 * renderer (proven 1:1). X2 — the sway amplitude re-derives from the Weber
 * displacement floor through the φ projection: stepDx = sway/φ ≥ 0.02·h_G ⇒
 * swayFrac = 0.02·φ (gain 1.245 over L7, inside the twelve-principles
 * exaggeration band k ∈ [1,2]).
 *
 * Cycle 11 addendum (step-shape-phd-memo, 2026-08-05): Z1/Z2 — the contact
 * flatten joins the observables — the SUPPORT read (static load ⇒ contact
 * patch) beside the Cycle-4 IMPULSE read (squash ∝ impact). The base
 * contour flattens over a patch on the planted side whose depth/half-width
 * grow with the S0 support share in Hertz monotonic form; d_phys is the
 * vault's complement l_eff·(1−cos α)² (exactly 2 % of h_G at the X1 triple
 * convergence), exaggerated by k = φ inside the sanctioned band, fenced
 * d ≤ 5 % h_G, a ≤ 25 % of the base half-width. The driver applies the Z3
 * first-order lag (τ_c·φ, the bank idiom) and the screen-x projection.
 */

import { PHI } from "./PhiLaw";

export const GAIT_LAW = Object.freeze({
  /** L1 — COM height of a soft near-uniform body: mid-height. */
  comHeightFrac: 0.5,
  /** D-0112 φ-synthesis — the invariant body (world units). */
  bodyHeightUnits: 1224,
  /** L2 — comfortable-walk Froude band (AXIOM endpoints; form CORPUS X-f2). */
  froudeComfortMin: 0.15,
  froudeComfortMax: 0.35,
  /** L2 — adopted cruise base on the φ-ladder idiom (world units/s). */
  cruiseBaseUnitsPerSec: 3200,
  /**
   * Walk-band cadence a person can feel (φ Hz class). 1.618 steps/s sits
   * inside the 1.6–2.0 Hz brief; 2 Hz = φ + φ⁻² is the band ceiling.
   */
  walkBandStepHz: PHI,
  /**
   * Walk-band cruise: X1 stride × φ Hz = 918·φ ≈ 1485 u/s.
   * Grounded Wispwalker travel files this rung. The 2610/3200 Froude
   * band is a screen-scale teleport — keep it for flight terminal-v only.
   */
  walkBandCruiseUnitsPerSec: 0.75 * 1224 * PHI,
  /**
   * Cycle 8 X1 — normal stride length as a fraction of body height (human
   * normal ratio; muybridge-anchored). λ_norm = 0.75·h_G = 918 u.
   */
  strideLenFracOfHeight: 0.75,
  /**
   * Cycle 8 X1 — temporal-summation critical duration (seconds), conservative
   * end of the textbook 60–100 ms band [NO-CANON-DATA-LIVE, labeled in
   * step-legibility-phd-memo]. The S1 exchange window must never fall below it.
   */
  exchangeCriticalDurationSec: 0.06,
  /** Cycle 8 X1 — cadence floor (steps/s): the stroll; exchange 181 ms. */
  stepHzFloor: 1,
  /** L5/L6 — below this speed (world units/s) the gait freezes (L8). */
  speedEpsilonUnitsPerSec: 4,
  /**
   * Cycle 8 X2 — lateral COM sway fraction of body height, re-derived from the
   * Weber displacement floor through the φ projection: stepDx = sway/φ ≥
   * 0.02·h_G ⇒ swayFrac = 0.02·φ (gain 1.245 over the Cycle-1 L7 value, inside
   * the twelve-principles exaggeration band k ∈ [1,2]).
   */
  swayFracOfHeight: 0.02 * PHI,
  /** L6 — grounded lean clamp (degrees); a hard accel never tips past this. */
  maxGroundedLeanDeg: 8,
  /**
   * Cycle 10 Y1 (bank-phd-memo) — centripetal bank clamp (degrees): the φ
   * extension of the L6 clamp (S1). The bank demand mined from take-15 walking
   * turns peaks at 12.35°; 8φ ≈ 12.944° covers it while staying inside the
   * friction cone atan(1/φ²) ≈ 20.89° (Y3).
   */
  bankMaxDeg: 8 * PHI,
  /** Cycle 10 Y3 (bank-phd-memo) — bank low-pass τ = τ_c·φ ≈ 97 ms (S1 timing). */
  bankSmoothTauSec: 0.06 * PHI,
  /**
   * Cycle 11 Z2 (step-shape-phd-memo) — contact-flatten depth fence (world
   * units): d ≤ 5 % of h_G (61.2 u). The φ-gain amplitude φ·d_phys reaches
   * the fence only at the top of the comfort band; the clamp keeps the
   * sanctioned exaggeration honest (never hidden — X3 idiom).
   */
  flattenMaxUnits: 0.05 * 1224,
  /**
   * Cycle 11 Z2 — contact-patch half-width fence (world units): a ≤ 25 % of
   * the home base half-width (the renderer's base radius ≈ 72 content px =
   * 576 u at 8 u/px ⇒ 144 u). The φ-gain amplitude (≤ 61.2 u) never binds it;
   * the fence guards the expression against any future amplitude growth.
   */
  flattenPatchMaxUnits: 0.25 * 576,
  /**
   * Cycle 5 S1 — planted-base switch sharpness k = 2φ². In the support
   * point baseX = swayUnits·tanh(k·cos(phase/2)) the exchange at double
   * support (phase π) spans the window |baseX| < 0.9·A; k = 2φ² makes that
   * window 18.1 % of the step period, inside the clinical double-support
   * band 10–20 % (step-cycle-phd-memo S1/T1).
   */
  stepPlacementSharpness: 2 * PHI * PHI,
});

/**
 * Cycle 12 W1 — gait expression entry/exit window: three temporal-summation
 * critical windows (180 ms). The body may accelerate immediately under the
 * traction law; the visible vault must arrive over a perceptual integration
 * window rather than appearing at full amplitude on the first sample.
 */
export const GAIT_EXPRESSION_RAMP_SECONDS = 3 * GAIT_LAW.exchangeCriticalDurationSec;

/**
 * Northstar acting law — a locomotion action above the perception floor earns
 * one exchange-critical anticipation beat before traction commits. The beat
 * reuses X1's τ_c (never a second clock); its visible counter-lean is the
 * φ⁻⁴ rung (14.6%), inside the canon 10–30% anticipation band and below the
 * product-scale foot-root legibility fence.
 */
export const GAIT_ANTICIPATION_DURATION_SECONDS = GAIT_LAW.exchangeCriticalDurationSec;
export const GAIT_ANTICIPATION_FRACTION = PHI ** -4;

/** The effective vault radius (L1): the inverted pendulum's leg. */
export const GAIT_LEG_UNITS = GAIT_LAW.comHeightFrac * GAIT_LAW.bodyHeightUnits;

/** Grounded walk-band cruise (world units/s) — stride × φ Hz. */
export const GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC = GAIT_LAW.walkBandCruiseUnitsPerSec;
/** Grounded walk-band step frequency (steps/s) — φ. */
export const GAIT_WALK_BAND_STEP_HZ = GAIT_LAW.walkBandStepHz;

/**
 * Speed-style curve: slow strut at the stroll wall ↔ diagonal hop at
 * walk-band cruise. C1 in log-speed so 200 u/s is firmly a strut and
 * the walk-band is firmly a hop.
 */
export const GAIT_SPEED_CURVE = Object.freeze({
  strutCruiseUnitsPerSec: 200,
  hopCruiseUnitsPerSec: GAIT_LAW.walkBandCruiseUnitsPerSec,
});

/** 0 = pure slow strut, 1 = pure diagonal hop. */
export function gaitStyleBlend(speed: number): number {
  if (!(speed > GAIT_LAW.speedEpsilonUnitsPerSec)) return 0;
  const lo = GAIT_SPEED_CURVE.strutCruiseUnitsPerSec;
  const hi = GAIT_SPEED_CURVE.hopCruiseUnitsPerSec;
  if (!(hi > lo)) return 0;
  const t = clamp(
    (Math.log(Math.max(speed, lo)) - Math.log(lo)) / (Math.log(hi) - Math.log(lo)),
    0,
    1,
  );
  return t * t * (3 - 2 * t);
}

/**
 * Cycle 8 X1 — the S1 exchange window as a fraction of the step period,
 * derived from the planted-base sharpness k: the window |baseX| < 0.9·A is
 * |cos(φ/2)| < atanh(0.9)/k ⇒ fraction (π − 2·acos(c0))/π ≈ 0.1815, inside
 * the clinical double-support band (step-cycle-phd-memo T1).
 */
export const GAIT_EXCHANGE_SWITCH_FRAC = (() => {
  const c0 = Math.atanh(0.9) / GAIT_LAW.stepPlacementSharpness;
  return (Math.PI - 2 * Math.acos(c0)) / Math.PI;
})();

/**
 * Cycle 8 X1 — cadence ceiling: the exchange window (switch fraction of the
 * step period) never falls below the critical duration τ_c. ≈ 3.02 steps/s.
 */
export const GAIT_STEP_HZ_MAX =
  GAIT_EXCHANGE_SWITCH_FRAC / GAIT_LAW.exchangeCriticalDurationSec;

/**
 * Walk-speed / cadence curve (2026-08-14). Continuous mix, no gait switch.
 * Slow end is the approved ~2s strut (1 Hz steps). Hop end is the diagonal
 * skip Cody named — longer flight, clearer plants. Heading toward 3/4 / profile
 * lifts a slow walk into hop without a quantized band.
 */
export const WALK_GAIT_CURVE = Object.freeze({
  strutStepHz: 1,
  hopStepHz: PHI,
  strutSpeedUnitsPerSec: 200,
  hopSpeedUnitsPerSec: 520,
  strutFlightFrac: 0.10,
  hopFlightFrac: 0.36,
});

function smooth01(u: number): number {
  const x = clamp(u, 0, 1);
  return x * x * (3 - 2 * x);
}

/** 0 = approved slow strut, 1 = diagonal hop. C1 in speed and heading. */
export function walkGaitMix(speed: number, headingDeg?: number): number {
  if (!Number.isFinite(speed) || speed <= GAIT_LAW.speedEpsilonUnitsPerSec) return 0;
  const u = (speed - WALK_GAIT_CURVE.strutSpeedUnitsPerSec) /
    Math.max(1e-6, WALK_GAIT_CURVE.hopSpeedUnitsPerSec - WALK_GAIT_CURVE.strutSpeedUnitsPerSec);
  const speedMix = smooth01(u);
  let headingMix = 0;
  if (Number.isFinite(headingDeg)) {
    const profile = Math.abs(Math.sin(((headingDeg as number) * Math.PI) / 180));
    headingMix = profile * profile;
  }
  return clamp(speedMix * 0.45 + headingMix * 0.70, 0, 1);
}

/** Live walk cadence on the curve. Floored at the 1 Hz strut, capped at GAIT_STEP_HZ_MAX. */
export function walkCadenceHz(speed: number, headingDeg?: number): number {
  if (!(speed > GAIT_LAW.speedEpsilonUnitsPerSec)) return 0;
  const mix = walkGaitMix(speed, headingDeg);
  const hz = WALK_GAIT_CURVE.strutStepHz +
    (WALK_GAIT_CURVE.hopStepHz - WALK_GAIT_CURVE.strutStepHz) * mix;
  return clamp(hz, GAIT_LAW.stepHzFloor, GAIT_STEP_HZ_MAX);
}

/** Flight fraction of the step (0 = always planted, hop end longer air). */
export function walkFlightFrac(speed: number, headingDeg?: number): number {
  const mix = walkGaitMix(speed, headingDeg);
  return WALK_GAIT_CURVE.strutFlightFrac +
    (WALK_GAIT_CURVE.hopFlightFrac - WALK_GAIT_CURVE.strutFlightFrac) * mix;
}

/**
 * N207 gait law — loaded-nub world plant (gait6).
 * Lock the planted Wispwalker nub (one lobe), not half the egg
 * (gait4 smear) and not a tiny floor patch (gait5 invisible).
 * Upper mass posed.x is unchanged. Never a whole-body
 * `_contactHoldX` / `_plantHoldX`.
 */
export const GAIT_BASE_PLANT = Object.freeze({
  lockStartFracOfHalfHeight: 0.50,
  fadeFracOfHalfHeight: 0.22,
  liveEpsilonUnits: 0.004,
  lobeSigma: 0.16,
  swingLiftPx: 68,
});

/**
 * N305–N310 / gait11 reject / perceptual-a reject:
 * 118 px · σ=0.52 tore the pearl into an arch. 42 px · σ=0.22 was a
 * notch Cody could not see at zoom-2. This cut lifts ONE existing lobe
 * (~68 px) with the cleft held down, and publishes whole-pearl COM /
 * lean in SCREEN space so a 200 u/s strut still reads.
 */
export const GAIT_LOBE = Object.freeze({
  swingLiftUnits: 68 * 8,
  swingAdvanceUnits: 44 * 8,
  loadedDropUnits: 24 * 8,
  comSettleUnits: 36 * 8,
  /** Load drop of the whole pearl (not the inverted-pendulum vault-up). */
  comBobUnits: 32 * 8,
  /** Minimum lateral COM shift on the screen so cruise lean is not 0 px. */
  comShiftMinUnits: 28 * 8,
  /** Stranger-visible torso lean toward the planted support (degrees). */
  torsoLeanDeg: 7.2,
  /** Multiply SupportExchange.angle onto the torso tilt channel. */
  torsoLeanGain: 2.4,
  exchangeHold: 0.35,
  swingLobeSigma: 0.20,
});

/** Nub fade: 0 until 0.50·ry, 1 at the foot nub (0.72·ry). Belly stays off. */
export function gaitBasePlantWeight(ny: number, ry: number): number {
  if (!(ry > 0) || !Number.isFinite(ny) || ny <= 0) return 0;
  const start = GAIT_BASE_PLANT.lockStartFracOfHalfHeight * ry;
  const span = GAIT_BASE_PLANT.fadeFracOfHalfHeight * ry;
  if (!(span > 0) || ny <= start) return 0;
  return Math.min(1, (ny - start) / span);
}

/**
 * Loaded Wispwalker lobe (th ≈ 1.27 right / 1.87 left). Swing lobe stays 0
 * so only the planted contact is world-locked.
 */
export function gaitLoadedLobeWeight(th: number, loadedSign: number): number {
  if (!Number.isFinite(th)) return 0;
  const half = 0.3;
  const thPlant = loadedSign >= 0 ? Math.PI / 2 - half : Math.PI / 2 + half;
  const d = Math.atan2(Math.sin(th - thPlant), Math.cos(th - thPlant));
  return Math.exp(-0.5 * (d / GAIT_BASE_PLANT.lobeSigma) * (d / GAIT_BASE_PLANT.lobeSigma));
}

/** Free Wispwalker lobe — the opposite of the loaded contact. */
export function gaitSwingLobeWeight(th: number, loadedSign: number): number {
  return gaitLoadedLobeWeight(th, -loadedSign);
}

/**
 * Visible swing clearance 0..1. Plateaus through single support while a
 * plant is live so the air gap holds a meaningful interval (N283). Zero at
 * rest and through the double-support window so landing can overlap.
 */
export function gaitSwingClearance(phase: number, planted: boolean): number {
  if (!planted || !Number.isFinite(phase)) return 0;
  const hold = Math.abs(Math.tanh(GAIT_LAW.stepPlacementSharpness * Math.cos(phase / 2)));
  if (hold < GAIT_LOBE.exchangeHold) return 0;
  return clamp((hold - GAIT_LOBE.exchangeHold) / (1 - GAIT_LOBE.exchangeHold), 0, 1);
}

/**
 * 0 at contact/push-off, 0.5 at mid-swing, approaching 1 at the next landing.
 */
export function gaitSwingTravel01(phase: number): number {
  if (!Number.isFinite(phase)) return 0;
  const wrapped = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return ((wrapped + Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
}

export type GaitLobePose = Readonly<{
  swingLiftUnits: number;
  swingAdvanceUnits: number;
  loadedDropUnits: number;
  comSettleUnits: number;
  swingClearance: number;
}>;

/** Derive the per-lobe screen pose from the live support conclusion. */
export function gaitLobePose(input: {
  phase: number;
  planted: boolean;
  plantedCompress: number;
  travelSign: number;
}): GaitLobePose {
  const clearance = gaitSwingClearance(input.phase, input.planted);
  const compress = input.planted
    ? clamp(Number.isFinite(input.plantedCompress) ? input.plantedCompress : 0, 0, 1)
    : 0;
  const travel = (gaitSwingTravel01(input.phase) - 0.5) * 2;
  const sign = input.travelSign === 0 ? 0 : input.travelSign > 0 ? 1 : -1;
  return {
    swingLiftUnits: GAIT_LOBE.swingLiftUnits * clearance,
    swingAdvanceUnits: GAIT_LOBE.swingAdvanceUnits * travel * clearance * sign,
    loadedDropUnits: GAIT_LOBE.loadedDropUnits * compress,
    comSettleUnits: GAIT_LOBE.comSettleUnits * compress,
    swingClearance: clearance,
  };
}

/**
 * Content-px offset that cancels worldRig (body + sway) so a live plant
 * stays at plantedWorld. Zero when the kernel has no plant.
 */
export function gaitBasePlantPx(
  plantedScreenXUnits: number,
  swayXUnits: number,
  unitsPerContentPx: number,
): number {
  if (
    !Number.isFinite(plantedScreenXUnits) ||
    !Number.isFinite(swayXUnits) ||
    !(unitsPerContentPx > 0) ||
    Math.abs(plantedScreenXUnits) <= GAIT_BASE_PLANT.liveEpsilonUnits
  ) {
    return 0;
  }
  return (plantedScreenXUnits - swayXUnits) / unitsPerContentPx;
}

/**
 * N332 — bounded support payment painted on idleRig, never on worldRig.
 * 224 u (comShiftMinUnits) is the N318 shear. This is the small readable
 * load-over-plant the eye can take without tearing the membrane.
 */
export const GAIT_SUPPORT_PAY = Object.freeze({
  lateralPx: 8,
  liftPaintPx: 42,
  advancePaintPx: 22,
  chinKeepSigma: 0.16,
});

function gaitGaussAngle(th: number, mu: number, sigma: number): number {
  const d = Math.atan2(Math.sin(th - mu), Math.cos(th - mu));
  return Math.exp(-0.5 * (d / sigma) * (d / sigma));
}

/** 1 at the chin/cleft, ~0 at the foot-root lobes. */
export function gaitChinKeepWeight(th: number): number {
  if (!Number.isFinite(th)) return 0;
  return gaitGaussAngle(th, Math.PI / 2, GAIT_SUPPORT_PAY.chinKeepSigma);
}

/**
 * Swing-lobe articulation weight. Zero at the chin so a lift cannot
 * Pac-Man the cleft. Lower-hemisphere only.
 */
export function gaitSwingArticulateWeight(th: number, loadedSign: number): number {
  const swing = gaitSwingLobeWeight(th, loadedSign);
  const keep = gaitChinKeepWeight(th);
  const lower = Math.max(0, Math.sin(th) - 0.2) / 0.8;
  return swing * (1 - keep) * Math.min(1, lower);
}

/** Planted-lobe articulation weight. Same chin keep. */
export function gaitPlantArticulateWeight(th: number, loadedSign: number): number {
  const plant = gaitLoadedLobeWeight(th, loadedSign);
  const keep = gaitChinKeepWeight(th);
  const lower = Math.max(0, Math.sin(th) - 0.2) / 0.8;
  return plant * (1 - keep) * Math.min(1, lower);
}

/** Paint gate. Kernel carriers already scale with speed. Seat eases leftover. */
export function gaitLiveGate(
  speedRatio: number,
  seated: boolean,
  leftoverSway: number,
): number {
  if (seated) return clamp(Number.isFinite(leftoverSway) ? leftoverSway : 0, 0, 1);
  return (Number.isFinite(speedRatio) ? speedRatio : 0) > 0.004 ? 1 : 0;
}

export type GaitInput = Readonly<{
  /** Floor-plane speed (world units/s). */
  speed: number;
  /** Tangential acceleration along the heading (world units/s²), signed. */
  accelTangent: number;
  /** Environment gravity (world units/s²). */
  gravity: number;
  /** Incoming step phase (radians); travel-locked, frozen at rest (L8). */
  phase: number;
  /** Tick duration (seconds). */
  dt: number;
  /** Optional bounded lab cadence multiplier; travel remains the speed authority. */
  tempoMultiplier?: number;
  /**
   * Optional form-safe cadence supplied by the reference-performance owner.
   * The physics kernel still derives every gait observable; this only selects
   * the cadence inside the existing perception bounds.
   */
  stepHzOverride?: number;
}>;

export type GaitObservables = Readonly<{
  /** Advanced step phase (radians) — COM peaks (high) at phase 0 (mid-stance). */
  phase: number;
  /** Live step frequency (steps/s). */
  stepHz: number;
  /** Peak-to-peak vertical COM bob (world units, L5). Zero at rest. */
  bobUnits: number;
  /** Grounded lean (degrees, signed into acceleration, L6). Zero at constant speed. */
  leanDeg: number;
  /** Lateral COM sway amplitude (world units, L7). Zero at rest. */
  swayUnits: number;
  /** speed / cruise base — the expression gain (0 at rest, 1 at comfortable). */
  speedRatio: number;
  /**
   * Cycle 4 R3 — contact squash coefficient c(t) (dimensionless, volume
   * law): q = v_v²/(g·h_G) with v_v the vertical COM speed at contact;
   * c = q·(1−cos phase)/2 peaks at contact (phase π, COM lowest) and is
   * zero at mid-stance and at rest. The renderer applies scaleY = 1−c,
   * scaleX = 1+c (fenced ≤ 5 %).
   */
  contactSquash: number;
  /**
   * Cycle 11 Z1 (step-shape-phd-memo) — contact-flatten depth (world units),
   * SIGNED by the planted side (+ = the cos(phase/2) > 0 half-stride's foot):
   * side·dMax·w^(2/3) with w the S0 support share (|tanh(k·cos(phase/2))|,
   * saturated through single support, splitting through the exchange). The
   * screen-x projection (the ⊥(heading) factor) is owned by the driver's
   * gaitScreen, exactly like swayX/stepBaseX. Distinct from contactSquash:
   * the squash is the IMPULSE read; the flatten is the SUPPORT read.
   */
  stepFlattenSignedUnits: number;
  /**
   * Cycle 11 Z1 — contact-patch half-width (world units, unsigned):
   * aMax·w^(1/3) (Hertz monotonic form). The renderer sets the patch's
   * angular extent from it and conserves the displaced volume with flank
   * bulges (Z2 solid-drawing fence).
   */
  stepFlattenWidthUnits: number;
  /**
   * 0 = slow strut, 1 = diagonal hop. C1 blend of the speed-style curve.
   * Zero at rest.
   */
  styleBlend: number;
}>;

export const GAIT_REST: GaitObservables = Object.freeze({
  phase: 0,
  stepHz: 0,
  bobUnits: 0,
  leanDeg: 0,
  swayUnits: 0,
  speedRatio: 0,
  contactSquash: 0,
  stepFlattenSignedUnits: 0,
  stepFlattenWidthUnits: 0,
  styleBlend: 0,
});

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Cycle 8 X1 (step-legibility-phd-memo) — live step frequency from the stride
 * length law: f(v) = v/λ_norm, λ_norm = 0.75·h_G, capped at GAIT_STEP_HZ_MAX
 * (exchange ≥ τ_c) and floored at the 1 Hz stroll. Pure function of speed.
 * Retires the Cycle-1 L3 Froude-scaled comfort cadence: the perception laws
 * the legibility stack rests on (W1/W4) were measured at human cadence, and
 * the 5.83 Hz toy scale ran them 3× outside their regime.
 */
export function gaitStepHz(speed: number): number {
  if (!(speed > GAIT_LAW.speedEpsilonUnitsPerSec)) return 0;
  const lambdaNorm = GAIT_LAW.strideLenFracOfHeight * GAIT_LAW.bodyHeightUnits;
  return clamp(speed / lambdaNorm, GAIT_LAW.stepHzFloor, GAIT_STEP_HZ_MAX);
}

/**
 * Pressure-Cooker Cycle 3 (locomotion-legibility-phd-memo M1): the stride
 * period T_stride(v) = 1/stepHz(v). Exposed so the wander organ DERIVES its
 * minimum-leg-time law from the gait observables themselves — composition
 * from the body's own conclusions, never a number authored per instance
 * (N18 autonomy half). A frozen gait (speed ≤ ε) has no stride period.
 */
export function gaitStridePeriodSeconds(speed: number): number {
  const hz = gaitStepHz(speed);
  return hz > 0 ? 1 / hz : Number.POSITIVE_INFINITY;
}

/**
 * Derive the gait observables for one tick (memo L3–L8).
 *
 *  - phase advances 2π·f·dt ONLY while moving (L8 — travel, never clock);
 *  - bob = l_eff·(1−cos α), tan α = λ/(2·l_eff), λ = v/f (L5 vault arc);
 *  - lean = atan(a_t/g) in degrees, clamped (L6);
 *  - sway amplitude rides the speed ratio (L7); its cycle is phase/2 (once
 *    per stride, peaking at each mid-stance — corpus lateral-shift law);
 *  - contact squash c(t) = q·(1−cos phase)/2, q = v_v²/(g·h_G) the vault's
 *    Froude impulse (Cycle 4 R3 — MSD squash ∝ impulse, volume law).
 */
export function deriveGait(input: GaitInput): GaitObservables {
  const { speed, accelTangent, gravity, phase, dt } = input;
  if (
    !Number.isFinite(speed) ||
    !Number.isFinite(accelTangent) ||
    !Number.isFinite(gravity) ||
    !Number.isFinite(phase) ||
    !Number.isFinite(dt) ||
    gravity <= 0
  ) {
    return { ...GAIT_REST, phase: Number.isFinite(phase) ? phase : 0 };
  }
  const moving = speed > GAIT_LAW.speedEpsilonUnitsPerSec;
  const tempoMultiplier = Number.isFinite(input.tempoMultiplier)
    ? Math.max(0.75, Math.min(1.25, input.tempoMultiplier as number))
    : 1;
  const stepHzOverride = Number.isFinite(input.stepHzOverride)
    ? clamp(input.stepHzOverride as number, GAIT_LAW.stepHzFloor, GAIT_STEP_HZ_MAX)
    : null;
  const stepHz = stepHzOverride ?? Math.min(GAIT_STEP_HZ_MAX, gaitStepHz(speed) * tempoMultiplier);
  const nextPhase = moving ? phase + 2 * Math.PI * stepHz * dt : phase;

  // L4/L5 — the vault arc over the effective leg.
  const lambda = stepHz > 0 ? speed / stepHz : 0;
  const alpha = Math.atan(lambda / (2 * GAIT_LEG_UNITS));
  const bobUnits = moving ? GAIT_LEG_UNITS * (1 - Math.cos(alpha)) : 0;

  // L6 — lean into acceleration; constant speed carries no lean.
  const leanDeg = clamp(
    (Math.atan(accelTangent / gravity) * 180) / Math.PI,
    -GAIT_LAW.maxGroundedLeanDeg,
    GAIT_LAW.maxGroundedLeanDeg,
  );

  // L7 — lateral sway amplitude, gated on travel.
  const speedRatio = moving ? clamp(speed / GAIT_LAW.cruiseBaseUnitsPerSec, 0, 1) : 0;
  // Speed-style curve: strut fills weight-transfer at stroll speeds so a
  // 200 u/s walk is not a 6% skate. Hop (blend=1) keeps the cruise-ratio law
  // byte-stable at the comfort band (X2 tests).
  const styleBlend = moving ? gaitStyleBlend(speed) : 0;
  const strut = 1 - styleBlend;
  const swayUnits = moving
    ? GAIT_LAW.swayFracOfHeight *
      GAIT_LAW.bodyHeightUnits *
      (speedRatio + strut * (1 - speedRatio) * (1 / PHI))
    : 0;

  // Cycle 4 R3 — contact squash, volume law. The vertical COM speed at
  // contact v_v = (bob/2)·2π·f becomes the dimensionless vault impulse
  // q = v_v²/(g·h_G) (the vault's Froude number); c(t) = q·(1−cos phase)/2
  // peaks at contact (phase π, COM lowest) and vanishes at mid-stance and
  // at rest. Span over the comfort band ≈ 0.6 %…2 % — fenced ≤ 5 % in the
  // renderer (walk-weight-transfer-phd-memo; MSD squash ∝ impulse).
  const vVert = (bobUnits / 2) * 2 * Math.PI * stepHz;
  const vaultImpulse = (vVert * vVert) / (gravity * GAIT_LAW.bodyHeightUnits);
  const contactSquash = moving ? (vaultImpulse * (1 - Math.cos(nextPhase))) / 2 : 0;

  // Cycle 11 Z1/Z2 (step-shape-phd-memo) — the contact flatten: the planted
  // side's base flattens over a contact patch that grows with the support
  // share w (Hertz monotonic form, Baraff–Witkin corpus: patch extent grows
  // with carried load — a ∝ w^(1/3), d ∝ w^(2/3); only the FORM is used, the
  // constants are derived here). w IS the S0 planted hold — the magnitude of
  // the sample-and-hold tanh(k·cos(φ/2)): saturated through single support
  // (a planted foot bears the load the whole hold), splitting through the
  // 18.1 % exchange window, so the patch peaks at mid-stance and hands off
  // side-to-side each half-stride — the exchange becomes a SHAPE event. The
  // planted side sign = sign(cos(φ/2)) matches stepBaseXUnits exactly (S0).
  // d_phys = l_eff·(1−cos α)² — the vault's complement on the planted side,
  // the same α as X1's triple convergence: at the band floor (1−cos α) = 0.2
  // exactly, so d_phys = exactly 2 % of h_G — the plant cue's own JND unit
  // (X2 stepDx). k = φ (twelve-principles exaggeration band [1,2], owner
  // golden-ratio law), fenced per Z2. a carries the same φ·d_phys amplitude
  // (dMax = aMax), fenced at the base half-width.
  const cosHalfPhase = Math.cos(nextPhase / 2);
  const supportShare = moving
    ? Math.abs(Math.tanh(GAIT_LAW.stepPlacementSharpness * cosHalfPhase))
    : 0;
  const oneMinusCosAlpha = 1 - Math.cos(alpha);
  const flattenAmpUnits = Math.min(
    GAIT_LAW.flattenMaxUnits,
    PHI * GAIT_LEG_UNITS * oneMinusCosAlpha * oneMinusCosAlpha,
  );
  const stepFlattenSignedUnits = moving
    ? Math.sign(cosHalfPhase) * flattenAmpUnits * Math.pow(supportShare, 2 / 3)
    : 0;
  const stepFlattenWidthUnits = moving
    ? Math.min(GAIT_LAW.flattenPatchMaxUnits, flattenAmpUnits) * Math.pow(supportShare, 1 / 3)
    : 0;

  return {
    phase: nextPhase,
    stepHz,
    bobUnits,
    leanDeg,
    swayUnits,
    speedRatio,
    contactSquash,
    stepFlattenSignedUnits,
    stepFlattenWidthUnits,
    styleBlend,
  };
}

/**
 * L2 — the similarity cruise band in world units/s for a gravity (u/s²):
 * v = √(Fr·g·l_eff) over the comfortable Froude band. The wander/life laws
 * rebase onto this; the adopted base sits inside it.
 */
export function comfortCruiseBand(gravity: number): Readonly<{ min: number; max: number }> {
  const lo = Math.sqrt(GAIT_LAW.froudeComfortMin * gravity * GAIT_LEG_UNITS);
  const hi = Math.sqrt(GAIT_LAW.froudeComfortMax * gravity * GAIT_LEG_UNITS);
  return { min: lo, max: hi };
}

/**
 * Pressure-Cooker Cycle 2 (embodied-locomotion-phd-memo E2): the φ speed
 * ladder keeps its φ SHAPE (owner meta-law) but is clamped into the comfort
 * band — the unclamped amble sat below the band (a slide) and the unclamped
 * brisk sat on the walk→run transition (a run, wrong class).
 */
export function clampToComfortBand(speed: number, gravity: number): number {
  if (!Number.isFinite(speed) || !Number.isFinite(gravity) || gravity <= 0) {
    return GAIT_LAW.cruiseBaseUnitsPerSec; // fail-closed: the adopted base
  }
  const band = comfortCruiseBand(gravity);
  return clamp(speed, band.min, band.max);
}
