import {
  ANIMATION_V2_ERROR_CODES,
  VALID_EASINGS,
  type AnimationV2CommandName,
  type AnimationV2ErrorCode,
  type AnimationV2Request,
  type AnimationV2Response,
} from "./types.js";

const WRITE_COMMANDS = new Set<AnimationV2CommandName>([
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
]);

const VISIBLE_POSE_COMMANDS = new Set<AnimationV2CommandName>([
  "select_clip",
  "capture_keyframe",
  "update_keyframe",
  "move_keyframe",
  "delete_keyframe",
  "set_playhead",
  "scrub",
  "play",
  "pause",
  "interrupt",
  "undo",
  "redo",
]);

export function isAnimationV2ErrorCode(code: string): code is AnimationV2ErrorCode {
  return (ANIMATION_V2_ERROR_CODES as readonly string[]).includes(code);
}

export function validateAnimationV2Request(
  req: AnimationV2Request,
  ctx: {
    documentOpen: boolean;
    studioAvailable: boolean;
    currentRevision: number;
    clipIds: string[];
    trackIds: string[];
    keyframeIds: string[];
    bindingIds: string[];
  },
): { ok: true } | { ok: false; error: AnimationV2ErrorCode; detail: string } {
  if (!ctx.studioAvailable) {
    return { ok: false, error: "STUDIO_UNAVAILABLE", detail: "Studio not connected" };
  }
  if (!ctx.documentOpen && req.command !== "inspect_animation_document") {
    return { ok: false, error: "DOCUMENT_NOT_OPEN", detail: "No open document" };
  }
  if (
    WRITE_COMMANDS.has(req.command) &&
    req.expectedRevision !== undefined &&
    req.expectedRevision !== ctx.currentRevision
  ) {
    return {
      ok: false,
      error: "REVISION_CONFLICT",
      detail: `expected ${req.expectedRevision} got ${ctx.currentRevision}`,
    };
  }
  const p = req.params ?? {};
  if ("clipId" in p && typeof p.clipId === "string" && !ctx.clipIds.includes(p.clipId)) {
    if (
      [
        "rename_clip",
        "duplicate_clip",
        "delete_clip",
        "select_clip",
        "create_track",
        "delete_track",
        "capture_keyframe",
      ].includes(req.command)
    ) {
      return { ok: false, error: "CLIP_NOT_FOUND", detail: p.clipId };
    }
  }
  if ("trackId" in p && typeof p.trackId === "string" && !ctx.trackIds.includes(p.trackId)) {
    return { ok: false, error: "TRACK_NOT_FOUND", detail: p.trackId };
  }
  if (
    "keyframeId" in p &&
    typeof p.keyframeId === "string" &&
    !ctx.keyframeIds.includes(p.keyframeId)
  ) {
    return { ok: false, error: "KEYFRAME_NOT_FOUND", detail: p.keyframeId };
  }
  if ("bindingId" in p && typeof p.bindingId === "string" && !ctx.bindingIds.includes(p.bindingId)) {
    return { ok: false, error: "BINDING_NOT_FOUND", detail: p.bindingId };
  }
  if ("timeMs" in p) {
    const t = Number(p.timeMs);
    if (!Number.isFinite(t) || t < 0) {
      return { ok: false, error: "INVALID_TIME", detail: String(p.timeMs) };
    }
  }
  if ("easing" in p && typeof p.easing === "string") {
    if (!(VALID_EASINGS as readonly string[]).includes(p.easing)) {
      return { ok: false, error: "INVALID_EASING", detail: p.easing };
    }
  }
  return { ok: true };
}

export function makeV2Response(
  req: AnimationV2Request,
  partial: Omit<AnimationV2Response, "command" | "visiblePoseUpdateExpected"> & {
    visiblePoseUpdateExpected?: boolean;
  },
): AnimationV2Response {
  return {
    command: req.command,
    visiblePoseUpdateExpected:
      partial.visiblePoseUpdateExpected ?? VISIBLE_POSE_COMMANDS.has(req.command),
    ok: partial.ok,
    revision: partial.revision,
    dirty: partial.dirty,
    contentHash: partial.contentHash,
    transactionId: partial.transactionId,
    result: partial.result,
    error: partial.error,
    detail: partial.detail,
  };
}

export function studioUnavailableResponse(
  command: AnimationV2CommandName,
): AnimationV2Response {
  return {
    ok: false,
    command,
    revision: 0,
    dirty: false,
    contentHash: "",
    visiblePoseUpdateExpected: false,
    error: "STUDIO_UNAVAILABLE",
    detail: "Studio unresponsive. Launch Studio manually; AgentBridge will not auto-launch it.",
  };
}
