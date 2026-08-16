/**
 * GASPER-PHYSICS-001 · S10 — the BOO ghost-flight law (owner N42, second
 * half of the next demo; ghost-flight-reference-brief consonants).
 *
 * Boo floats and moves like a ghost: it NEVER stands (a perpetual soft
 * vertical bob rides every hold — rest is hover, and the hover breathes),
 * its jets are DREAMY (the thrust envelope is cut by the golden ratio —
 * a ghost drifts, it does not dart), and its drag is heavy (φ-scaled
 * golden split — it coasts through the air and takes its time stopping).
 * The hover EQUILIBRIUM is unchanged (h_G/φ⁴ — a ghost still reads at the
 * same altitude); the ζ = 1/φ settle is unchanged (the same one-overshoot
 * poise). Emotion already lives: C6 whole-body squash/stretch + S4 wind
 * trail-stretch (teardrop jets) are the ghost brief's emotion + jet reads.
 *
 * Every constant DERIVES from FlightLaw by the golden ratio (never
 * authored per-instance); the mode is a parameter-set swap inside the
 * kernel's flight organ — the walker floor and the rest class are
 * untouched.
 */
import { FLIGHT_LAW } from "./FlightLaw";
import { GAIT_LAW } from "./GaitLaw";
import { PHI } from "./PhiLaw";

const PHI3 = PHI * PHI * PHI;
/** N299/N304 — a stranger-visible hover at zoom-2. h_G/φ ≈ 95 content px. */
const BOO_HOVER_ALTITUDE_UNITS = GAIT_LAW.bodyHeightUnits / PHI;

export const BOO_FLIGHT_LAW = Object.freeze({
  /**
   * Dreamy jets: T_max·φ⁻¹ — the ghost drifts at ≈0.105·g instead of
   * ≈0.17·g. Cruise (terminal velocity at the jet) drops by the same cut.
   */
  thrustMaxUnitsPerS2: FLIGHT_LAW.thrustMaxUnitsPerS2 / PHI,
  /** Ghostly drag: the golden split scaled by φ — drifty, slow to stop. */
  dragLinearPerSec: FLIGHT_LAW.dragLinearPerSec * PHI,
  dragQuadPerUnit: FLIGHT_LAW.dragQuadPerUnit * PHI,
  /**
   * N299 — Boo must leave the floor. Presence hover stays h_G/φ⁴ (~22 px).
   * Boo hover is h_G/φ (~95 content px) so launch/altitude reads at zoom-2.
   */
  hoverAltitudeUnits: BOO_HOVER_ALTITUDE_UNITS,
  /** The ζ = 1/φ settle — the same one-overshoot poise (F-LAW 4). */
  settleZeta: FLIGHT_LAW.settleZeta,
  hoverOmegaPerSec: FLIGHT_LAW.hoverOmegaPerSec,
  /** Expression loading uses the same φ⁻² rhythm as the canonical load stroke. */
  expressionRampSeconds: 1 / (PHI * PHI),
  /**
   * Perpetual soft bob — the ghost NEVER stands: ±φ⁻³/2 of the hover
   * altitude (≈ ±2.6 px at the 8 u/px mapping — the ghost brief's ±2–3 px),
   * two incommensurate φ rotors (0.382 Hz / 0.236 Hz — aperiodic, 7.1-safe),
   * alive at REST (gated only by reduced motion: collapse there, breathe
   * everywhere else). At 0 from a non-boo load — byte-identical home.
   */
  /**
   * Keep the ghost breath near the old ±3 content-px so the launch altitude
   * is the read, not a huge hover oscillation.
   */
  bobAmpFrac: 24 / BOO_HOVER_ALTITUDE_UNITS,
  bobHz1: 1 / (PHI * PHI),
  bobHz2: 1 / PHI3,
});

/**
 * The perpetual bob carrier (world units, signed lift): two incommensurate
 * φ rotors, 60/40 weighted — soft, aperiodic, never metronomic.
 */
export function booBobUnits(tSeconds: number): number {
  const r1 = Math.sin(tSeconds * 2 * Math.PI * BOO_FLIGHT_LAW.bobHz1 + 1.3);
  const r2 = Math.sin(tSeconds * 2 * Math.PI * BOO_FLIGHT_LAW.bobHz2 + 0.7);
  return (
    BOO_FLIGHT_LAW.hoverAltitudeUnits *
    BOO_FLIGHT_LAW.bobAmpFrac *
    (0.6 * r1 + 0.4 * r2)
  );
}
