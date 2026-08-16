/**
 * UI-independent animation editor session (Lane A3).
 * No JSX, no renderer DOM, no MCP.
 */

import type {
  AnimationEditorState,
  EditorCommand,
  EditorCommandResult,
  EditorDocumentProjection,
  EditorKeyframeRef,
  EditorTrackRow,
} from "./types";

function emptyState(): AnimationEditorState {
  return {
    document: null,
    activeClipId: null,
    selectedTrackIds: [],
    selectedKeyframes: [],
    playheadMs: 0,
    visibleRangeMs: { start: 0, end: 4000 },
    snapMode: true,
    editorMode: "idle",
    rangeSelection: null,
    transactionOpen: false,
    clipboard: null,
    trackRows: [],
    diagnostics: [],
    canUndo: false,
    canRedo: false,
    loop: false,
  };
}

type Snap = {
  state: AnimationEditorState;
  drag?: { trackId: string; keyframeId: string; originMs: number };
};

export class AnimationEditorSession {
  private state: AnimationEditorState = emptyState();
  private undoStack: AnimationEditorState[] = [];
  private redoStack: AnimationEditorState[] = [];
  private drag: Snap["drag"] | undefined;
  /** Live pose provider for capture — injected by integrator. */
  private getLivePose: (() => Record<string, number>) | null = null;
  /**
   * Playhead apply path — integrator evaluates active clip + compositor and paints Dais.
   * Must not be a no-op: scrub with empty pose is a product bug.
   */
  private onPlayheadApply:
    | ((
        timeMs: number,
        mode: "scrub" | "set" | "play" | "interrupt" | "pause",
      ) => number | void)
    | null = null;
  /** @deprecated Prefer setPlayheadApplier; kept for tests that inject direct pose. */
  private onPoseApply: ((pose: Record<string, number>, scrub: boolean) => void) | null =
    null;
  private listeners = new Set<() => void>();
  private mutateDoc:
    | ((cmd: EditorCommand, state: AnimationEditorState) => {
        trackRows?: EditorTrackRow[];
        clips?: EditorDocumentProjection["clips"];
        revision?: number;
        dirty?: boolean;
        contentHash?: string;
        canUndo?: boolean;
        canRedo?: boolean;
        error?: string;
      })
    | null = null;

  setLivePoseProvider(fn: () => Record<string, number>): void {
    this.getLivePose = fn;
  }

  setPlayheadApplier(
    fn: (
      timeMs: number,
      mode: "scrub" | "set" | "play" | "interrupt" | "pause",
    ) => number | void,
  ): void {
    this.onPlayheadApply = fn;
  }

  setPoseApplier(fn: (pose: Record<string, number>, scrub: boolean) => void): void {
    this.onPoseApply = fn;
  }

  /** Integrator injects document mutation bridge (Rust or TS projection). */
  setDocumentMutator(
    fn: (
      cmd: EditorCommand,
      state: AnimationEditorState,
    ) => {
      trackRows?: EditorTrackRow[];
      clips?: EditorDocumentProjection["clips"];
      revision?: number;
      dirty?: boolean;
      contentHash?: string;
      canUndo?: boolean;
      canRedo?: boolean;
      error?: string;
    },
  ): void {
    this.mutateDoc = fn;
  }

  /** Diagnostic: true only when Integrator has injected all live paths. */
  isFullyInjected(): boolean {
    return !!(this.getLivePose && this.onPlayheadApply && this.mutateDoc);
  }

  getInjectionStatus(): {
    livePose: boolean;
    playheadApply: boolean;
    documentMutator: boolean;
  } {
    return {
      livePose: !!this.getLivePose,
      playheadApply: !!this.onPlayheadApply,
      documentMutator: !!this.mutateDoc,
    };
  }

  getState(): AnimationEditorState {
    return structuredClone(this.state);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  updateRuntimePlayback(timeMs: number, completed = false): void {
    this.state.playheadMs = Math.max(0, timeMs);
    if (completed && !this.state.loop) this.state.editorMode = "idle";
    this.emit();
  }

  dispatch(cmd: EditorCommand): EditorCommandResult {
    try {
      return this.dispatchInner(cmd);
    } catch (e) {
      return {
        ok: false,
        state: this.getState(),
        error: e instanceof Error ? e.message : String(e),
        visiblePoseUpdateExpected: false,
      };
    }
  }

  private pushUndo(): void {
    this.undoStack.push(structuredClone(this.state));
    if (this.undoStack.length > 64) this.undoStack.shift();
    this.redoStack = [];
    this.state.canUndo = true;
    this.state.canRedo = false;
  }

  private dispatchInner(cmd: EditorCommand): EditorCommandResult {
    let visiblePoseUpdateExpected = false;

    switch (cmd.type) {
      case "set_document": {
        this.state.document = cmd.projection;
        this.state.trackRows = cmd.trackRows;
        this.state.activeClipId = cmd.projection.activeClipId;
        const activeClip = cmd.projection.clips.find(
          (clip) => clip.id === cmd.projection.activeClipId,
        );
        const durationMs = Math.max(1, activeClip?.durationMs ?? 4000);
        this.state.playheadMs = Math.max(
          0,
          Math.min(durationMs, cmd.playheadMs ?? 0),
        );
        this.state.visibleRangeMs = { start: 0, end: durationMs };
        this.state.selectedTrackIds = [];
        this.state.selectedKeyframes = [];
        this.state.editorMode = "idle";
        this.state.diagnostics = [];
        // Document history is owned by GasperAnimationCommandSession.
        // Clear local stacks so presentation undo cannot diverge from document.
        this.undoStack = [];
        this.redoStack = [];
        if (typeof cmd.canUndo === "boolean") this.state.canUndo = cmd.canUndo;
        else this.state.canUndo = false;
        if (typeof cmd.canRedo === "boolean") this.state.canRedo = cmd.canRedo;
        else this.state.canRedo = false;
        break;
      }
      case "mark_saved": {
        if (this.state.document) {
          this.state.document = {
            ...this.state.document,
            dirty: false,
          };
        }
        break;
      }
      case "set_visible_range": {
        const start = Math.min(cmd.start, cmd.end);
        const end = Math.max(cmd.start, cmd.end, start + 1);
        this.state.visibleRangeMs = { start, end };
        break;
      }
      case "select_clip": {
        // Presentation-only no-op: already-active clip must not open a document txn.
        if (this.state.activeClipId === cmd.clipId) {
          return {
            ok: true,
            state: this.getState(),
            visiblePoseUpdateExpected: false,
            revision: this.state.document?.revision,
          };
        }
        this.state.activeClipId = cmd.clipId;
        this.state.selectedTrackIds = [];
        this.state.selectedKeyframes = [];
        if (this.state.document) {
          this.state.document = {
            ...this.state.document,
            activeClipId: cmd.clipId,
          };
        }
        const mut = this.mutateDoc?.(cmd, this.state);
        if (mut?.error) {
          return {
            ok: false,
            state: this.getState(),
            error: mut.error,
            visiblePoseUpdateExpected: false,
          };
        }
        if (mut?.trackRows) this.state.trackRows = mut.trackRows;
        if (this.state.document && mut) {
          this.state.document = {
            ...this.state.document,
            revision: mut.revision ?? this.state.document.revision,
            dirty: mut.dirty ?? this.state.document.dirty,
            contentHash: mut.contentHash ?? this.state.document.contentHash,
          };
        }
        break;
      }
      case "select_track": {
        if (cmd.multi) {
          if (!this.state.selectedTrackIds.includes(cmd.trackId)) {
            this.state.selectedTrackIds = [...this.state.selectedTrackIds, cmd.trackId];
          }
        } else {
          this.state.selectedTrackIds = [cmd.trackId];
        }
        break;
      }
      case "select_keyframe": {
        const ref: EditorKeyframeRef = {
          trackId: cmd.trackId,
          keyframeId: cmd.keyframeId,
          timeMs:
            this.state.trackRows
              .find((t) => t.trackId === cmd.trackId)
              ?.keyframes.find((k) => k.id === cmd.keyframeId)?.timeMs ?? 0,
        };
        if (cmd.multi) {
          this.state.selectedKeyframes = [...this.state.selectedKeyframes, ref];
        } else {
          this.state.selectedKeyframes = [ref];
        }
        this.state.trackRows = this.state.trackRows.map((row) => ({
          ...row,
          keyframes: row.keyframes.map((k) => ({
            ...k,
            selected: this.state.selectedKeyframes.some(
              (s) => s.keyframeId === k.id && s.trackId === row.trackId,
            ),
          })),
        }));
        break;
      }
      case "set_playhead":
      case "scrub": {
        // Local field is a mirror only; playhead applier writes GasperAnimationCommandSession.
        this.state.playheadMs = Math.max(0, cmd.timeMs);
        this.state.editorMode = cmd.type === "scrub" ? "scrub" : this.state.editorMode;
        visiblePoseUpdateExpected = true;
        const mode = cmd.type === "scrub" ? "scrub" : "set";
        if (this.onPlayheadApply) {
          const applied = this.onPlayheadApply(this.state.playheadMs, mode);
          // Mirror clamped session clock into editor presentation.
          if (typeof applied === "number" && Number.isFinite(applied)) {
            this.state.playheadMs = applied;
          }
        } else if (this.onPoseApply) {
          // Legacy inject path: still fail closed if empty pose with no playhead bridge
          this.onPoseApply({}, mode === "scrub");
          this.state.diagnostics = [
            ...this.state.diagnostics.filter((d) => d !== "playhead_applier_missing"),
            "playhead_applier_missing",
          ];
        } else {
          this.state.diagnostics = [
            ...this.state.diagnostics.filter((d) => d !== "playhead_applier_missing"),
            "playhead_applier_missing",
          ];
          return {
            ok: false,
            state: this.getState(),
            error: "PLAYHEAD_APPLIER_NOT_INJECTED",
            visiblePoseUpdateExpected: false,
          };
        }
        break;
      }
      case "capture_current_pose": {
        // Document history lives on the command session when mutator is injected.
        if (!this.mutateDoc) this.pushUndo();
        const pose = this.getLivePose?.() ?? {};
        const mut = this.mutateDoc?.(cmd, this.state);
        if (mut?.error) {
          return {
            ok: false,
            state: this.getState(),
            error: mut.error,
            visiblePoseUpdateExpected: false,
          };
        }
        if (mut?.trackRows) this.state.trackRows = mut.trackRows;
        if (this.state.document && mut) {
          this.state.document = {
            ...this.state.document,
            revision: mut.revision ?? this.state.document.revision + 1,
            dirty: mut.dirty ?? true,
            contentHash: mut.contentHash ?? this.state.document.contentHash,
          };
        }
        if (typeof mut?.canUndo === "boolean") this.state.canUndo = mut.canUndo;
        if (typeof mut?.canRedo === "boolean") this.state.canRedo = mut.canRedo;
        this.state.editorMode = "capture";
        this.state.diagnostics = Object.keys(pose).length
          ? []
          : ["capture_without_live_pose_provider"];
        break;
      }
      case "move_keyframe":
      case "delete_keyframe":
      case "set_easing":
      case "create_track":
      case "create_clip":
      case "add_marker":
      case "move_marker":
      case "delete_marker": {
        // When mutateDoc is bound, GasperAnimationCommandSession owns undo.
        if (!this.mutateDoc) this.pushUndo();
        const mut = this.mutateDoc?.(cmd, this.state);
        if (mut?.error) {
          if (!this.mutateDoc) this.undoStack.pop();
          return {
            ok: false,
            state: this.getState(),
            error: mut.error,
            visiblePoseUpdateExpected: false,
          };
        }
        if (mut?.trackRows) this.state.trackRows = mut.trackRows;
        if (mut?.clips && this.state.document) {
          this.state.document = { ...this.state.document, clips: mut.clips };
          this.state.activeClipId = this.state.document.activeClipId;
        }
        if (mut && this.state.document) {
          this.state.document = {
            ...this.state.document,
            revision: mut.revision ?? this.state.document.revision,
            dirty: mut.dirty ?? this.state.document.dirty,
            contentHash: mut.contentHash ?? this.state.document.contentHash,
          };
        }
        if (typeof mut?.canUndo === "boolean") this.state.canUndo = mut.canUndo;
        if (typeof mut?.canRedo === "boolean") this.state.canRedo = mut.canRedo;
        if (cmd.type === "move_keyframe") {
          this.state.trackRows = this.state.trackRows.map((row) => {
            if (row.trackId !== cmd.trackId) return row;
            return {
              ...row,
              keyframes: row.keyframes.map((k) =>
                k.id === cmd.keyframeId ? { ...k, timeMs: cmd.timeMs } : k,
              ),
            };
          });
          visiblePoseUpdateExpected = true;
        }
        if (cmd.type === "delete_keyframe") {
          this.state.trackRows = this.state.trackRows.map((row) => {
            if (row.trackId !== cmd.trackId) return row;
            return {
              ...row,
              keyframes: row.keyframes.filter((k) => k.id !== cmd.keyframeId),
            };
          });
          this.state.selectedKeyframes = this.state.selectedKeyframes.filter(
            (k) => k.keyframeId !== cmd.keyframeId,
          );
        }
        if (cmd.type === "create_track" && !mut?.trackRows) {
          this.state.trackRows = [
            ...this.state.trackRows,
            {
              trackId: `track-${Date.now().toString(36)}`,
              label: cmd.label,
              bindingIds: cmd.bindingIds,
              keyframes: [],
              muted: false,
              locked: false,
            },
          ];
        }
        if (cmd.type === "create_clip" && this.state.document && !mut?.clips) {
          const id = `clip-${Date.now().toString(36)}`;
          this.state.document = {
            ...this.state.document,
            clips: [
              ...this.state.document.clips,
              { id, name: cmd.name, durationMs: cmd.durationMs },
            ],
            activeClipId: id,
            revision: (mut?.revision ?? this.state.document.revision) + 1,
            dirty: true,
          };
          this.state.activeClipId = id;
        }
        if (
          (cmd.type === "add_marker" ||
            cmd.type === "move_marker" ||
            cmd.type === "delete_marker") &&
          this.state.document &&
          !mut?.clips
        ) {
          const activeId = this.state.document.activeClipId;
          this.state.document = {
            ...this.state.document,
            clips: this.state.document.clips.map((clip) => {
              if (clip.id !== activeId) return clip;
              const markers = [...(clip.markers ?? [])];
              if (cmd.type === "add_marker") {
                markers.push({
                  id: cmd.markerId ?? `marker-${Date.now().toString(36)}`,
                  timeMs: Math.max(0, Math.min(clip.durationMs, cmd.timeMs)),
                  label: cmd.label,
                });
              } else if (cmd.type === "move_marker") {
                for (const marker of markers) {
                  if (marker.id === cmd.markerId) {
                    marker.timeMs = Math.max(0, Math.min(clip.durationMs, cmd.timeMs));
                  }
                }
              } else {
                return {
                  ...clip,
                  markers: markers.filter((marker) => marker.id !== cmd.markerId),
                };
              }
              markers.sort((a, b) => a.timeMs - b.timeMs);
              return { ...clip, markers };
            }),
          };
        }
        if (this.state.document && mut) {
          this.state.document = {
            ...this.state.document,
            revision: mut.revision ?? this.state.document.revision + 1,
            dirty: mut.dirty ?? true,
            contentHash: mut.contentHash ?? this.state.document.contentHash,
          };
        }
        break;
      }
      case "begin_drag": {
        const row = this.state.trackRows.find((t) => t.trackId === cmd.trackId);
        const kf = row?.keyframes.find((k) => k.id === cmd.keyframeId);
        this.drag = {
          trackId: cmd.trackId,
          keyframeId: cmd.keyframeId,
          originMs: kf?.timeMs ?? 0,
        };
        this.state.editorMode = "drag";
        this.state.transactionOpen = true;
        break;
      }
      case "preview_drag": {
        if (!this.drag) {
          return {
            ok: false,
            state: this.getState(),
            error: "NO_DRAG",
            visiblePoseUpdateExpected: false,
          };
        }
        this.state.trackRows = this.state.trackRows.map((row) => {
          if (row.trackId !== this.drag!.trackId) return row;
          return {
            ...row,
            keyframes: row.keyframes.map((k) =>
              k.id === this.drag!.keyframeId ? { ...k, timeMs: Math.max(0, cmd.timeMs) } : k,
            ),
          };
        });
        visiblePoseUpdateExpected = true;
        break;
      }
      case "commit_drag": {
        if (!this.drag) {
          return {
            ok: false,
            state: this.getState(),
            error: "NO_DRAG",
            visiblePoseUpdateExpected: false,
          };
        }
        this.pushUndo();
        this.drag = undefined;
        this.state.editorMode = "idle";
        this.state.transactionOpen = false;
        break;
      }
      case "cancel_drag": {
        if (this.drag) {
          const d = this.drag;
          this.state.trackRows = this.state.trackRows.map((row) => {
            if (row.trackId !== d.trackId) return row;
            return {
              ...row,
              keyframes: row.keyframes.map((k) =>
                k.id === d.keyframeId ? { ...k, timeMs: d.originMs } : k,
              ),
            };
          });
        }
        this.drag = undefined;
        this.state.editorMode = "idle";
        this.state.transactionOpen = false;
        break;
      }
      case "undo": {
        // Prefer document authority (session) when mutator is injected.
        if (this.mutateDoc) {
          const mut = this.mutateDoc(cmd, this.state);
          if (mut?.error) {
            return {
              ok: false,
              state: this.getState(),
              error: mut.error,
              visiblePoseUpdateExpected: false,
            };
          }
          // Presentation is rebuilt by syncEditorProjectionFromAnimationSession
          // after adapter/controller undo. Local stacks stay empty.
          this.undoStack = [];
          this.redoStack = [];
          if (mut.trackRows) this.state.trackRows = mut.trackRows;
          if (this.state.document) {
            this.state.document = {
              ...this.state.document,
              revision: mut.revision ?? this.state.document.revision,
              dirty: mut.dirty ?? this.state.document.dirty,
              contentHash: mut.contentHash ?? this.state.document.contentHash,
            };
          }
          if (typeof mut.canUndo === "boolean") this.state.canUndo = mut.canUndo;
          if (typeof mut.canRedo === "boolean") this.state.canRedo = mut.canRedo;
          visiblePoseUpdateExpected = true;
          break;
        }
        const prev = this.undoStack.pop();
        if (!prev) {
          return {
            ok: false,
            state: this.getState(),
            error: "NOTHING_TO_UNDO",
            visiblePoseUpdateExpected: false,
          };
        }
        this.redoStack.push(structuredClone(this.state));
        this.state = prev;
        this.state.canUndo = this.undoStack.length > 0;
        this.state.canRedo = true;
        visiblePoseUpdateExpected = true;
        break;
      }
      case "redo": {
        if (this.mutateDoc) {
          const mut = this.mutateDoc(cmd, this.state);
          if (mut?.error) {
            return {
              ok: false,
              state: this.getState(),
              error: mut.error,
              visiblePoseUpdateExpected: false,
            };
          }
          this.undoStack = [];
          this.redoStack = [];
          if (mut.trackRows) this.state.trackRows = mut.trackRows;
          if (this.state.document) {
            this.state.document = {
              ...this.state.document,
              revision: mut.revision ?? this.state.document.revision,
              dirty: mut.dirty ?? this.state.document.dirty,
              contentHash: mut.contentHash ?? this.state.document.contentHash,
            };
          }
          if (typeof mut.canUndo === "boolean") this.state.canUndo = mut.canUndo;
          if (typeof mut.canRedo === "boolean") this.state.canRedo = mut.canRedo;
          visiblePoseUpdateExpected = true;
          break;
        }
        const next = this.redoStack.pop();
        if (!next) {
          return {
            ok: false,
            state: this.getState(),
            error: "NOTHING_TO_REDO",
            visiblePoseUpdateExpected: false,
          };
        }
        this.undoStack.push(structuredClone(this.state));
        this.state = next;
        this.state.canUndo = true;
        this.state.canRedo = this.redoStack.length > 0;
        visiblePoseUpdateExpected = true;
        break;
      }
      case "play":
        this.state.editorMode = "play";
        visiblePoseUpdateExpected = true;
        this.onPlayheadApply?.(this.state.playheadMs, "play");
        break;
      case "pause":
        this.state.editorMode = "idle";
        this.onPlayheadApply?.(this.state.playheadMs, "pause");
        break;
      case "interrupt":
        this.state.editorMode = "idle";
        visiblePoseUpdateExpected = true;
        this.onPlayheadApply?.(this.state.playheadMs, "interrupt");
        break;
      case "toggle_loop":
        this.state.loop = !this.state.loop;
        break;
      default:
        return {
          ok: false,
          state: this.getState(),
          error: "UNKNOWN_COMMAND",
          visiblePoseUpdateExpected: false,
        };
    }

    return {
      ok: true,
      state: this.getState(),
      visiblePoseUpdateExpected,
      revision: this.state.document?.revision,
    };
  }
}

export function createAnimationEditorSession(): AnimationEditorSession {
  return new AnimationEditorSession();
}
