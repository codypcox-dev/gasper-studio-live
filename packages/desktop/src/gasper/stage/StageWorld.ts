/**
 * GASPER-PHYSICS-001 · D-0112 — the BLACK ROOM (owner law N5: "gasper doesnt
 * need anything else in the scene with him, just a black room that acts as
 * his environment"), pure module.
 *
 * Canon: `mccay-split-system-1914` (the floor answers — Gertie ground-sag),
 * `light-as-material` reading of `digital-lighting-and-rendering-2013`
 * (research/canon/anim-physics).
 *
 * The CRAFT-002 "place" dressing — horizon + floor gradients, depth lanes,
 * the light pool, horizon tint, vignette — is RETIRED: it was scenery, and
 * the room is black. What remains of the environment:
 *
 *  (a) NOTHING static — the room is the stage's pure-black background;
 *  (b) the floor itself reads ONLY from Gasper: the motivated floor glow +
 *      penumbra drop shadow live in the rig's ground-contact layer and ride
 *      with him (AS3 shadow law — untouched by D-0112).
 *
 * The authored impact ripple (pack channel `ground_impact`) is RETIRED by
 * owner order N40 (2026-08-06): "he produces an odd ring at some of his
 * jumps — get rid of that from the ground. his drop shadow should be
 * enough." The channel is sampled-but-never-drawn (camera_* retirement
 * idiom); new packs that author it are rejected at compile.
 *
 * The floor-plane law survives the retirement because the worldRig's
 * horizon lift is the SAME receding plane the feet stand on: screen y at
 * depth z is the S2 horizon lift (D-0100) — home anchor at floorAnchorY,
 * the far fade converging on the horizon line. The horizon line itself is
 * derived here for that law only; nothing is drawn at it (the room is black).
 */
import {
  WORLD_SPACE_CONSTANTS,
  depthScaleAt,
} from "../space/WorldSpace";

export const STAGE_WORLD_CONSTANTS = Object.freeze({
  /** Body home x, content px in the #avatar viewBox (240×220). */
  homeX: 120,
  /**
   * Home floor anchor y, content px — the worldRig's scale/rotate anchor
   * (AS3 worldRig transform: the feet pivot). The horizon line sits exactly
   * floorToHorizonPx above it (the S2 floor-plane law converges there).
   */
  floorAnchorY: 190,
});

/** N40 (2026-08-06): the impact-ripple ring is retired by owner order —
 * the drop shadow is the floor's answer. New authors are rejected at pack
 * compile (RETIRED_PACK_CHANNELS); the renderer intake is a no-op. */
export const GROUND_IMPACT_RETIRED =
  "ground_impact is retired (N40, owner 2026-08-06) — the impact-ripple ring is removed from the ground; the drop shadow is the floor's answer";

/** The horizon line, content px — derived, never authored separately. */
export const STAGE_WORLD_HORIZON_Y =
  STAGE_WORLD_CONSTANTS.floorAnchorY - WORLD_SPACE_CONSTANTS.floorToHorizonPx;

/**
 * The floor-plane law for any point on the ground: its screen y at depth z.
 * Exactly the S2 horizon lift — home anchor at floorAnchorY, the far fade
 * converging on the horizon line. The worldRig rides this plane; the
 * retired ripple was its only authored consumer.
 */
export function stageWorldFloorYAt(z: number): number {
  return STAGE_WORLD_HORIZON_Y +
    WORLD_SPACE_CONSTANTS.floorToHorizonPx * depthScaleAt(z);
}
