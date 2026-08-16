export type EditorMode = "idle" | "scrub" | "play" | "drag" | "capture";

export type EditorKeyframeRef = {
  trackId: string;
  keyframeId: string;
  timeMs: number;
};

export type EditorTrackRow = {
  trackId: string;
  label: string;
  bindingIds: string[];
  keyframes: Array<{ id: string; timeMs: number; selected: boolean }>;
  muted: boolean;
  locked: boolean;
};

export type EditorMarker = {
  id: string;
  timeMs: number;
  label: string;
};

export type EditorClipProjection = {
  id: string;
  name: string;
  durationMs: number;
  /** Authored semantic beats; optional for compatibility with older projections. */
  markers?: EditorMarker[];
};

export type EditorDocumentProjection = {
  documentId: string;
  revision: number;
  dirty: boolean;
  contentHash: string;
  clips: EditorClipProjection[];
  activeClipId: string | null;
};

export type AnimationEditorState = {
  document: EditorDocumentProjection | null;
  activeClipId: string | null;
  selectedTrackIds: string[];
  selectedKeyframes: EditorKeyframeRef[];
  playheadMs: number;
  visibleRangeMs: { start: number; end: number };
  snapMode: boolean;
  editorMode: EditorMode;
  rangeSelection: { startMs: number; endMs: number } | null;
  transactionOpen: boolean;
  clipboard: EditorKeyframeRef[] | null;
  trackRows: EditorTrackRow[];
  diagnostics: string[];
  canUndo: boolean;
  canRedo: boolean;
  loop: boolean;
};

export type EditorCommand =
  | { type: "select_clip"; clipId: string }
  | { type: "select_track"; trackId: string; multi?: boolean }
  | { type: "select_keyframe"; trackId: string; keyframeId: string; multi?: boolean }
  | { type: "set_playhead"; timeMs: number }
  | { type: "scrub"; timeMs: number }
  | { type: "capture_current_pose"; bindingIds?: string[] }
  | { type: "move_keyframe"; trackId: string; keyframeId: string; timeMs: number }
  | { type: "delete_keyframe"; trackId: string; keyframeId: string }
  | { type: "set_easing"; trackId: string; keyframeId: string; easing: string }
  | { type: "begin_drag"; trackId: string; keyframeId: string }
  | { type: "preview_drag"; timeMs: number }
  | { type: "commit_drag" }
  | { type: "cancel_drag" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "interrupt" }
  | { type: "toggle_loop" }
  | { type: "create_track"; label: string; bindingIds: string[] }
  | { type: "create_clip"; name: string; durationMs: number }
  | { type: "add_marker"; label: string; timeMs: number; markerId?: string }
  | { type: "move_marker"; markerId: string; timeMs: number }
  | { type: "delete_marker"; markerId: string }
  | {
      type: "set_document";
      projection: EditorDocumentProjection;
      trackRows: EditorTrackRow[];
      playheadMs?: number;
      /** Session-owned history flags (document authority). */
      canUndo?: boolean;
      canRedo?: boolean;
    }
  /** Mark current editor revision as successfully persisted (dirty=false). */
  | { type: "mark_saved" }
  /** Presentation window for timeline ruler/lanes (ms). */
  | { type: "set_visible_range"; start: number; end: number };

export type EditorCommandResult = {
  ok: boolean;
  state: AnimationEditorState;
  error?: string;
  visiblePoseUpdateExpected: boolean;
  revision?: number;
};
