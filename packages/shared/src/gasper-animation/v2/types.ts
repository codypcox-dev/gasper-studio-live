/**
 * Animation semantic command V2 — shared UI + MCP vocabulary (Lane A5).
 */

export const ANIMATION_V2_ERROR_CODES = [
  "DOCUMENT_NOT_OPEN",
  "CLIP_NOT_FOUND",
  "TRACK_NOT_FOUND",
  "KEYFRAME_NOT_FOUND",
  "BINDING_NOT_FOUND",
  "REVISION_CONFLICT",
  "INVALID_TIME",
  "INVALID_EASING",
  "TRANSACTION_FAILED",
  "STUDIO_UNAVAILABLE",
  "VALIDATION_FAILED",
  "UNKNOWN_COMMAND",
] as const;

export type AnimationV2ErrorCode = (typeof ANIMATION_V2_ERROR_CODES)[number];

export type AnimationV2CommandName =
  | "inspect_animation_document"
  | "inspect_resolved_pose"
  | "inspect_binding_contribution"
  | "list_clips"
  | "create_clip"
  | "rename_clip"
  | "duplicate_clip"
  | "delete_clip"
  | "select_clip"
  | "create_track"
  | "delete_track"
  | "capture_keyframe"
  | "update_keyframe"
  | "move_keyframe"
  | "delete_keyframe"
  | "set_keyframe_easing"
  | "add_marker"
  | "move_marker"
  | "delete_marker"
  | "set_playhead"
  | "scrub"
  | "play"
  | "pause"
  | "interrupt"
  | "set_loop_mode"
  | "undo"
  | "redo"
  | "save"
  | "validate";

export type AnimationV2Request = {
  command: AnimationV2CommandName;
  /** Expected document revision for write ops (optimistic concurrency). */
  expectedRevision?: number;
  transactionId?: string;
  params?: Record<string, unknown>;
};

export type AnimationV2Response = {
  ok: boolean;
  command: AnimationV2CommandName;
  revision: number;
  dirty: boolean;
  contentHash: string;
  transactionId?: string | null;
  /** Whether the visible pose on the Dais is expected to change. */
  visiblePoseUpdateExpected: boolean;
  result?: unknown;
  error?: AnimationV2ErrorCode;
  detail?: string;
};

export const VALID_EASINGS = [
  "linear",
  "power1.in",
  "power1.out",
  "power1.inOut",
  "power2.in",
  "power2.out",
  "power2.inOut",
  "power3.inOut",
  "sine.inOut",
] as const;
