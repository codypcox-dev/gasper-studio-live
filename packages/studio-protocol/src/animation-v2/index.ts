/**
 * Studio-protocol re-export of animation command V2 (Lane A5).
 * Broker wiring is Integrator-owned (broker.ts hotspot).
 */

export {
  ANIMATION_V2_ERROR_CODES,
  VALID_EASINGS,
  validateAnimationV2Request,
  makeV2Response,
  studioUnavailableResponse,
  isAnimationV2ErrorCode,
} from "../../../shared/src/gasper-animation/v2";

export type {
  AnimationV2CommandName,
  AnimationV2ErrorCode,
  AnimationV2Request,
  AnimationV2Response,
} from "../../../shared/src/gasper-animation/v2";

/** Capability descriptors for MCP registration. */
export const ANIMATION_V2_CAPABILITIES = [
  "inspect_animation_document",
  "inspect_resolved_pose",
  "inspect_binding_contribution",
  "list_clips",
  "create_clip",
  "rename_clip",
  "duplicate_clip",
  "delete_clip",
  "select_clip",
  "create_track",
  "delete_track",
  "capture_keyframe",
  "update_keyframe",
  "move_keyframe",
  "delete_keyframe",
  "set_keyframe_easing",
  "add_marker",
  "move_marker",
  "delete_marker",
  "set_playhead",
  "scrub",
  "play",
  "pause",
  "interrupt",
  "set_loop_mode",
  "undo",
  "redo",
  "save",
  "validate",
] as const;
