/**
 * GASPER-PHYSICS-001 · D-0112 — the liftoff law (owner N3).
 *
 * "If he's lifting off of the ground, his mass should collect toward the
 * center and downward, like it would in real physical reality."
 *
 * The sequencer makes anticipation a CONSEQUENCE OF LAW, not a style key:
 *
 *  - NO LAUNCH WITHOUT CONTACT. An impulse against the ground requires the
 *    ground; a request made airborne is refused (mechanical, not aesthetic).
 *  - The launch is chosen by APEX, never by velocity: the φ-ladder rungs
 *    {φ⁻³, φ⁻², φ⁻¹} × own height (small / medium / big), or an explicit
 *    apex clamped by the environment ceiling (the bounds are law).
 *  - v₀ = √(2·g·apex) — the only lawful speed for a height.
 *  - The LOADING STROKE is computed from the leg's peak force φ³·mg:
 *      t_load = v₀ / ((φ³−1)·g),   δ = v₀² / (2·(φ³−1)·g)
 *    The center of mass dips by δ and the form GATHERS (mass collects
 *    center-and-down). Peak-force strokes put the dip at ~7–19 % of body
 *    height across the ladder — the athletic band, derived not authored.
 *  - The stroke is TWO PHASES (CanonOps audit 2026-08-04, memo §g-6): the
 *    mechanical dip takes t_load (27–44 ms — the work-energy floor), then a
 *    GATHER HOLD at full δ fills the φ⁻² rhythm (0.382 s ≥ the 0.35 s hold
 *    minimum). The dip alone is sub-frame at 24 fps and cannot read; the
 *    held gather is what the audience sees — anticipation as law, AND as a
 *    compositional event (`limited-animation-economics`, `the-anime-machine`).
 *    The impulse fires when the hold completes. Never a linear ramp longer
 *    than t_load — a full-rhythm ramp would demand a 1.3–1.65× body-height
 *    dip (physically impossible; memo §g-6 warning).
 *
 * Pure state machine: no clock, no DOM, no randomness; the caller steps it
 * with organism-clock dt. The fired impulse is delivered as an EVENT — the
 * body kernel (the only writer of pose) applies it.
 */

import {
  PHI_LAW,
  launchSpeedForApex,
  minLoadingStroke,
} from "./PhiLaw";
import type { PhysicsField } from "./PhysicsField";

export type LaunchPhase = "grounded" | "loading" | "holding";

export type LaunchSequencerState = Readonly<{
  phase: LaunchPhase;
  loadElapsedSeconds: number;
  /** Mechanical dip duration (s) at peak force — the work-energy floor. */
  loadSeconds: number;
  holdElapsedSeconds: number;
  /** Gather-hold duration (s) at full dip — the φ⁻² rhythm. */
  holdSeconds: number;
  /** Center-of-mass dip during the load (world units) — mass collects down. */
  dipUnits: number;
  /**
   * The gather read for the silhouette (mass collects toward the center):
   * width scale from area conservation over the dip, capped.
   */
  gatherWidthScale: number;
  /** Impulse to fire when the stroke completes (world units/s). */
  fireVX: number;
  fireVY: number;
  /** The requested apex (world units) — for telemetry/witness. */
  apexUnits: number;
}>;

export type LaunchRequest = Readonly<{
  /** φ-ladder rung: 0 small (φ⁻³·h), 1 medium (φ⁻²·h), 2 big (φ⁻¹·h). */
  apexRung?: 0 | 1 | 2;
  /** Explicit apex (world units) — supersedes the rung, ceiling-clamped. */
  apexUnits?: number;
  /** Signed horizontal launch speed (world units/s). */
  horizontalSpeedUnits?: number;
}>;

export type LaunchVerdict = Readonly<{
  state: LaunchSequencerState;
  accepted: boolean;
  reason?: "not-in-contact" | "no-apex" | "exceeds-ceiling" | "bad-field";
}>;

export type LaunchStepResult = Readonly<{
  state: LaunchSequencerState;
  /** Present exactly when the stroke completes this step. */
  fired?: Readonly<{ vx: number; vy: number }>;
}>;

export const LAUNCH_SEQUENCER_GROUNDED: LaunchSequencerState = Object.freeze({
  phase: "grounded",
  loadElapsedSeconds: 0,
  loadSeconds: 0,
  holdElapsedSeconds: 0,
  holdSeconds: 0,
  dipUnits: 0,
  gatherWidthScale: 1,
  fireVX: 0,
  fireVY: 0,
  apexUnits: 0,
});

const fin = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * The gather law: the dip shortens the body by dipFraction; area conservation
 * widens it by 1/(1−dipFraction) — mass collecting toward the center.
 * Capped at 30 % so no request can deform him past legibility.
 */
export function gatherWidthForDip(dipUnits: number, homeHeightUnits: number): number {
  if (!fin(dipUnits) || !fin(homeHeightUnits) || homeHeightUnits <= 0) return 1;
  const f = Math.max(0, Math.min(0.3, dipUnits / homeHeightUnits));
  return 1 / (1 - f);
}

/**
 * Request a launch. The mechanical gate: ONLY from contact. The apex gate:
 * the environment ceiling is law — a request above it is refused, never
 * clipped into a different act.
 */
export function requestLaunch(
  state: LaunchSequencerState,
  field: PhysicsField,
  request: LaunchRequest = {},
): LaunchVerdict {
  if (state.phase !== "grounded") {
    return { state, accepted: false, reason: "not-in-contact" };
  }
  if (!fin(field.gravityUnitsPerS2) || field.gravityUnitsPerS2 <= 0) {
    return { state, accepted: false, reason: "bad-field" };
  }
  const rung = request.apexRung ?? 1;
  const ladderApex = PHI_LAW.apexLadder[Math.max(0, Math.min(2, rung))] * field.homeHeightUnits;
  const apex = fin(request.apexUnits) && request.apexUnits > 0 ? request.apexUnits : ladderApex;
  if (apex <= 0) return { state, accepted: false, reason: "no-apex" };
  if (apex > field.ceilingUnits) {
    return { state, accepted: false, reason: "exceeds-ceiling" };
  }
  const v0y = launchSpeedForApex(field.gravityUnitsPerS2, apex);
  if (v0y <= 0) return { state, accepted: false, reason: "no-apex" };
  const stroke = minLoadingStroke(field.gravityUnitsPerS2, v0y);
  const vx = fin(request.horizontalSpeedUnits) ? request.horizontalSpeedUnits : 0;
  return {
    accepted: true,
    state: Object.freeze({
      phase: "loading",
      loadElapsedSeconds: 0,
      loadSeconds: stroke.seconds,
      holdElapsedSeconds: 0,
      // The gather hold is a compositional event on the φ⁻² ladder (memo §g-6).
      holdSeconds: PHI_LAW.loadRhythmSeconds,
      dipUnits: stroke.depth,
      gatherWidthScale: gatherWidthForDip(stroke.depth, field.homeHeightUnits),
      fireVX: vx,
      fireVY: v0y,
      apexUnits: apex,
    }),
  };
}

/**
 * Advance the stroke: mechanical dip (loadSeconds) → gather hold at full dip
 * (holdSeconds, the φ⁻² rhythm) → fire. The impulse fires EXACTLY when the
 * hold completes — the dip has stored the intent, the hold has shown it;
 * the ground answers.
 */
export function stepLaunch(state: LaunchSequencerState, dt: number): LaunchStepResult {
  if (!fin(dt) || dt <= 0) return { state };
  if (state.phase === "loading") {
    const elapsed = state.loadElapsedSeconds + dt;
    if (elapsed < state.loadSeconds) {
      return { state: Object.freeze({ ...state, loadElapsedSeconds: elapsed }) };
    }
    // Dip complete — enter the gather hold at full dip (overflow carries in).
    const carry = elapsed - state.loadSeconds;
    if (carry >= state.holdSeconds) {
      return {
        state: LAUNCH_SEQUENCER_GROUNDED,
        fired: { vx: state.fireVX, vy: state.fireVY },
      };
    }
    return {
      state: Object.freeze({
        ...state,
        phase: "holding" as LaunchPhase,
        loadElapsedSeconds: state.loadSeconds,
        holdElapsedSeconds: carry,
      }),
    };
  }
  if (state.phase === "holding") {
    const elapsed = state.holdElapsedSeconds + dt;
    if (elapsed < state.holdSeconds) {
      return { state: Object.freeze({ ...state, holdElapsedSeconds: elapsed }) };
    }
    // Stroke complete: fire, return to grounded (the body kernel is now
    // airborne by impulse; the sequencer re-arms when contact resumes).
    return {
      state: LAUNCH_SEQUENCER_GROUNDED,
      fired: { vx: state.fireVX, vy: state.fireVY },
    };
  }
  return { state };
}

/** Ease-off: the intent is withdrawn mid-stroke; the gather releases. */
export function cancelLaunch(state: LaunchSequencerState): LaunchSequencerState {
  return LAUNCH_SEQUENCER_GROUNDED;
}

/**
 * Gather progress for the silhouette (0 → 1): the dip eases in across the
 * mechanical load and HOLDS at 1 for the gather hold, never snapping.
 */
export function loadProgress(state: LaunchSequencerState): number {
  if (state.phase === "holding") return 1;
  if (state.phase !== "loading" || state.loadSeconds <= 0) return 0;
  return Math.max(0, Math.min(1, state.loadElapsedSeconds / state.loadSeconds));
}
