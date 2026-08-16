/**
 * GASPER-PHYSICS-001 · S3 — the flight law of the footless body
 * (flight-physics-phd-memo F-LAWs 1/3/4; NORTHSTAR N30/N31).
 *
 * Walking belongs to feet (N30); every footless body FLOATS, and its flight
 * is bounded by real physics (N31): buoyancy cancels weight, lateral motion
 * obeys thrust/drag  dv/dt = T − (c1·v + c2·v²),  and rest is a hover
 * equilibrium — not a parked pose. Every constant below DERIVES from the
 * organism's field + φ (PhiLaw / GaitLaw); nothing is authored per-instance.
 *
 * F-LAW 1 — thrust/drag: the wander cruise is REINTERPRETED as terminal
 * velocity — thrust setpoint = drag at the target speed. Snappy intent (N1):
 * the initial jet acceleration is T_max = v_c/τ_a with τ_a = τ·φ² — a buoyant
 * body jets at ≈0.17 of the field g: quick, never teleporty. The drag budget
 * splits by the golden ratio — quadratic (the jet regime) carries 1/φ,
 * linear (creep) 1/φ²; by the φ identity φ⁻¹ + φ⁻² = 1 the drag at v_c
 * equals T_max EXACTLY, so cruise is the terminal velocity at max thrust.
 *
 * F-LAW 3 — hover equilibrium: footless rest = altitude h_G/φ⁴ (≈22.3
 * content px): a legible hover the floor answers to through the carried
 * cycle-13 shadow law (wFade ≈ 0.755 — present, never shouting).
 *
 * F-LAW 4 — settle: the hover servo carries ζ = 1/φ (PHI_LAW.settleZeta) —
 * ONE deliberate overshoot ≈ 8.4 % of the approach amplitude, then held.
 *
 * F-LAW 2 — the wind-resistance surface (owner N31): a body moving through
 * air is NOT rigid — the airflow reads across the form. Dynamic pressure
 * p(v) = (v/v_c)², lagged by the bank idiom (first-order τ_c·φ — the
 * surface ANSWERS the airflow, it does not anticipate it). The form answers
 * with trail-stretch (the trailing edge extends along −travel, ε_max =
 * φ⁻²/4 of the body half-extent at v_c — SLIGHT, the owner's word),
 * lead-compress (the leading edge compresses ε/φ), and jet-lean (the
 * silhouette leans into its horizontal acceleration through the bank
 * channel — the bank organ IS the flight-lean organ, Y1 clamp 8φ° binds).
 * At rest p = 0 ⇒ every channel 0 ⇒ byte-identical (D-0088 idiom).
 */
import { GAIT_LAW } from "./GaitLaw";
import { PHI, PHI_LAW } from "./PhiLaw";

const PHI2 = PHI * PHI;

/** F-LAW 1 — the thrust response constant τ_a = τ·φ² (τ = τ_c·φ, the response idiom). */
const THRUST_TAU_SEC = GAIT_LAW.bankSmoothTauSec * PHI2;

export const FLIGHT_LAW = Object.freeze({
  /** F-LAW 3 — hover equilibrium altitude h_G/φ⁴ (≈178.6 u ≈ 22.3 px). */
  hoverAltitudeUnits: GAIT_LAW.bodyHeightUnits / (PHI2 * PHI2),
  /**
   * F-LAW 3 — the breath bob a hovering body couples (±φ⁻³ of the hover
   * altitude ≈ ±4.1 %): the idle breath organ's share, surfaced with the
   * whole-body expression pass (S5).
   */
  hoverBreathBobFrac: 1 / (PHI * PHI2),
  /** F-LAW 1 — thrust response constant τ_a = τ·φ² ≈ 0.254 s. */
  thrustTauSec: THRUST_TAU_SEC,
  /**
   * F-LAW 1 — max thrust T_max = v_c/τ_a ≈ 12598 u/s² (≈0.17·g at 74210):
   * the jet envelope. Cruise is terminal velocity AT this thrust.
   */
  thrustMaxUnitsPerS2: GAIT_LAW.cruiseBaseUnitsPerSec / THRUST_TAU_SEC,
  /**
   * F-LAW 1 — the golden drag split: linear (creep) carries 1/φ² ≈ 38.2 % of
   * the cruise drag budget: c1 = φ⁻²·T_max/v_c = φ⁻²/τ_a.
   */
  dragLinearPerSec: 1 / PHI2 / THRUST_TAU_SEC,
  /**
   * F-LAW 1 — the golden drag split: quadratic (the jet regime) carries
   * 1/φ ≈ 61.8 % of the cruise drag budget: c2 = φ⁻¹·T_max/v_c².
   */
  dragQuadPerUnit: 1 / PHI / (THRUST_TAU_SEC * GAIT_LAW.cruiseBaseUnitsPerSec),
  /** F-LAW 4 — settle damping ratio ζ = 1/φ (the corpus settle idiom). */
  settleZeta: PHI_LAW.settleZeta,
  /**
   * F-LAW 3 — hover servo natural frequency ω = 1/τ (the canonical response
   * time, the bank idiom's τ): altitude arrives inside ≈0.6 s with the one
   * ζ-overshoot — a liftoff, not a teleport; a landing, not a snap.
   */
  hoverOmegaPerSec: 1 / GAIT_LAW.bankSmoothTauSec,
  /**
   * F-LAW 2 — the wind read follows the airflow with the bank idiom's
   * first-order lag τ_c·φ (one timing law for the lean and the surface).
   */
  windLagTauSec: GAIT_LAW.bankSmoothTauSec,
  /**
   * F-LAW 2 — trail-stretch ceiling: ε_max = φ⁻²/4 of the body half-extent
   * at v_c ≈ 9.55 % — SLIGHT, per the owner's word (N31).
   */
  windStretchMaxFrac: 1 / (PHI2 * 4),
  /** F-LAW 2 — lead-compress: the leading edge answers at ε/φ = φ⁻³/4. */
  windLeadCompressFrac: 1 / (PHI2 * PHI * 4),
});

/**
 * F-LAW 2 — the dynamic-pressure read p(v) = (v/v_c)², bounded at 1: the
 * cruise base IS the reference speed (cruise = terminal velocity at T_max,
 * so p = 1 exactly at cruise and never needs more than the whole).
 * Fail-closed: garbage reads as still air.
 */
export function windPressureForSpeed(speed: number): number {
  const s = Math.abs(Number.isFinite(speed) ? speed : 0);
  const r = s / GAIT_LAW.cruiseBaseUnitsPerSec;
  return Math.min(1, r * r);
}

/** F-LAW 1 — the drag owed at speed v: c1·v + c2·v² (u/s²), v ≥ 0. */
export function flightDragUnitsPerS2(speed: number): number {
  const s = Math.max(0, Math.abs(Number.isFinite(speed) ? speed : 0));
  return FLIGHT_LAW.dragLinearPerSec * s + FLIGHT_LAW.dragQuadPerUnit * s * s;
}

/**
 * F-LAW 1 — the flight brake curve (the kernel brake, carried): reverse
 * thrust inside the envelope sheds speed at T_max, so the safe approach
 * speed at distance d is v = √(2·T_max·d) — the Coulomb curve v = √(2μg·d)
 * with the THRUST ENVELOPE standing in for the friction cone. One steering
 * idiom, two budgets.
 */
export function flightBrakeSpeedUnitsPerSec(distance: number): number {
  const d = Math.max(0, Number.isFinite(distance) ? distance : 0);
  return Math.sqrt(2 * FLIGHT_LAW.thrustMaxUnitsPerS2 * d);
}

/**
 * F-LAW 4 — first overshoot of a ζ-settle: e^(−ζπ/√(1−ζ²)). At ζ = 1/φ
 * ≈ 8.4 % of the approach amplitude — one, deliberate, corpus-gated.
 */
export function settleFirstOvershoot(zeta: number): number {
  if (!Number.isFinite(zeta) || zeta <= 0 || zeta >= 1) return 0;
  return Math.exp((-zeta * Math.PI) / Math.sqrt(1 - zeta * zeta));
}

/** Authored 72 px base half-extent the renderer uses for ε_max (F-LAW 2). */
export const WIND_BASE_HALF_EXTENT_PX = 72;

const WIND_SNAP = 0.004;

/**
 * F-LAW 2 — trail-stretch amplitude in content px: ε = ε_max · p · |dirX|.
 * Same snap as the renderer (still air / depth-only travel → 0).
 */
export function windStretchAmplitudePx(pressure: number, dirX: number): number {
  const p = Number.isFinite(pressure) ? Math.max(0, Math.min(1, pressure)) : 0;
  const d = Number.isFinite(dirX) ? Math.max(-1, Math.min(1, dirX)) : 0;
  if (p < WIND_SNAP || Math.abs(d) < WIND_SNAP) return 0;
  return FLIGHT_LAW.windStretchMaxFrac * WIND_BASE_HALF_EXTENT_PX * p * Math.abs(d);
}

/**
 * F-LAW 2 — signed left−right contour asymmetry in content px.
 * +dirX trail-stretches the left / lead-compresses the right → positive.
 * −dirX flips the sides → negative. Matches capture horizontalExtent.asymmetryPx.
 */
export function windContourAsymmetryPx(pressure: number, dirX: number): number {
  const amp = windStretchAmplitudePx(pressure, dirX);
  if (amp === 0) return 0;
  // trail +ε, lead −ε/φ ⇒ |left−right| = ε(1 + 1/φ) = ε·φ
  return Math.sign(dirX) * amp * PHI;
}
