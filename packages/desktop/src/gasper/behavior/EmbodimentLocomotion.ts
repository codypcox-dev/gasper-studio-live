/**
 * GASPER-PHYSICS-001 · Pressure-Cooker Cycle 2 — the proprioceptive
 * embodiment class of the locomotion stack.
 *
 * CanonOps PHD memo `research/canon/anim-physics/embodied-locomotion-phd-memo.md`
 * (Cycle 2, 2026-08-04): the wall was disembodied locomotion — the resting
 * singularity torus filed the same wander legs as the walking body, and no
 * embodiment ever showed a legible walk. E1: the locomotion stack reads its
 * OWN body (proprioception, the D-0112 organ-reads-body idiom) and scales its
 * authority + expression by embodiment class:
 *
 *  - rest     {singularity, dormant-orbit} — a resting being does not stroll:
 *    wander authority closed, gait gain 0, displaced bodies drift home (E3);
 *  - walker   {wispwalker} — THE FEETED FORM (N30): the only body that walks;
 *    full step expression;
 *  - presence {presence, comet, halo, lantern, low-orbit} — the FOOTLESS
 *    bodies (N30/N31): they FLOAT. Wander authority stays open (travel is
 *    flight, S3 flight organ) but the step vocabulary collapses to zero —
 *    walking belongs to feet.
 *
 * The class table extends the organism's own corpus idiom (AS3:622
 * adaptFixtureToEmbodiment `motionGain·(1−.34·dormant)`; AS3:2284
 * EIGHT_STATE_MOMENTUM per-state signatures; D-0087 singularity = retired
 * rest; D-0109 rest substrate) from fixture motion to the locomotion
 * authority. Unknown id ⇒ rest (fail-closed: an unidentified body is at rest).
 */
import { GAIT_LAW } from "../physics/GaitLaw";
import { PHI_LAW } from "../physics/PhiLaw";

export type EmbodimentLocomotionClass = "rest" | "walker" | "presence";

const REST_CLASS: ReadonlySet<string> = new Set([
  "singularity",
  "dormant-orbit",
]);

const WALKER_CLASS: ReadonlySet<string> = new Set(["wispwalker"]);

const PRESENCE_CLASS: ReadonlySet<string> = new Set([
  "presence",
  "comet",
  "halo",
  "lantern",
  "low-orbit",
]);

/** E1 — which locomotion class is this body. Unknown ⇒ rest (fail-closed). */
export function embodimentLocomotionClass(
  id: string | null | undefined,
): EmbodimentLocomotionClass {
  if (id != null && WALKER_CLASS.has(id)) return "walker";
  if (id != null && PRESENCE_CLASS.has(id)) return "presence";
  return "rest";
}

/**
 * E1 — the wander (travel) authority is open for every non-rest body. The
 * footless bodies travel too — their translation is FLIGHT, not walking
 * (N30/N31); the flight organ (S3) bounds it.
 */
export function embodimentWanderOpen(id: string | null | undefined): boolean {
  return embodimentLocomotionClass(id) !== "rest";
}

/**
 * N30 — the gait expression gain (F-LAW 5, flight-physics-phd-memo): walking
 * belongs to feet. The step vocabulary expresses ONLY on the feeted form
 * (wispwalker, gain 1); every footless or resting body collapses it to zero
 * — they float, they do not step. Phase continuity is kept by the driver
 * (L8), so a body change never jumps a stride it no longer expresses.
 */
export function embodimentGaitGain(id: string | null | undefined): number {
  return embodimentLocomotionClass(id) === "walker" ? 1 : 0;
}

/**
 * E3 — the rest drift: a displaced rest-class body glides home at
 * base·φ⁻² (≈1 body-length/s), never at a walking cruise. DERIVED from the
 * φ ladder (owner meta-law) on the adopted base.
 */
export const REST_DRIFT_UNITS_PER_SEC =
  GAIT_LAW.cruiseBaseUnitsPerSec / (PHI_LAW.phi * PHI_LAW.phi);
