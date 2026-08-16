/**
 * VEC-801 — Animation/editor adapter.
 * Wires editorSession ↔ animation command session through the controller's
 * canonical play/scrub/compositor path (not a parallel control plane).
 */

import {
  getAnimationCommandSession,
} from "../GasperAnimationCommands";
import type { AnimationClip } from "../GasperAnimationTypes";
import type { AnimationEditorSession } from "../animation-editor";

export type AnimationEditorAdapterHost = {
  editorSession: AnimationEditorSession;
  readLive: () => Record<string, number>;
  playCanonicalClip: (
    clip: AnimationClip,
    opts?: { onPlayhead?: (t: number) => void },
  ) => void;
  pauseStudioAnimate: () => void;
  interruptStudioAnimate: () => void;
  scrubStudioAnimate: (t: number) => void;
  emit: () => void;
  setScrubModeActive: (active: boolean) => void;
};

/** Push animation command session document into editor projection (TS working set). */
export function syncEditorProjectionFromAnimationSession(
  host: Pick<AnimationEditorAdapterHost, "editorSession" | "emit">,
): void {
  const session = getAnimationCommandSession();
  const doc = session.getDocument();
  const history = session.getHistoryState();
  const clip =
    doc.animation.clips.find(
      (c: { id: string }) => c.id === doc.animation.active_clip_id,
    ) ??
    doc.animation.clips[0] ??
    null;
  host.editorSession.dispatch({
    type: "set_document",
    projection: {
      documentId: doc.id,
      revision: doc.revision,
      dirty: doc.dirty,
      contentHash: doc.content_hash,
      clips: doc.animation.clips.map(
        (c: {
          id: string;
          name: string;
          duration_ms: number;
          markers?: Array<{ id: string; time_ms: number; label: string }>;
        }) => ({
          id: c.id,
          name: c.name,
          durationMs: c.duration_ms,
          markers: (c.markers ?? []).map((marker) => ({
            id: marker.id,
            timeMs: marker.time_ms,
            label: marker.label,
          })),
        }),
      ),
      activeClipId: doc.animation.active_clip_id,
    },
    trackRows:
      clip?.tracks.map(
        (tr: {
          id: string;
          label: string;
          binding_ids: string[];
          keyframes: Array<{ id: string; time_ms: number }>;
          muted: boolean;
          locked: boolean;
        }) => ({
          trackId: tr.id,
          label: tr.label,
          bindingIds: [...tr.binding_ids],
          keyframes: tr.keyframes.map(
            (k: { id: string; time_ms: number }) => ({
              id: k.id,
              timeMs: k.time_ms,
              selected: false,
            }),
          ),
          muted: tr.muted,
          locked: tr.locked,
        }),
      ) ?? [],
    playheadMs: session.getPlayheadMs(),
    canUndo: history.canUndo,
    canRedo: history.canRedo,
  });
  host.emit();
}

/**
 * Wire editorSession → animation command session (durable projection) +
 * playhead evaluation through compositor onto Legacy Authority / mixer.
 */
export function installOperationalAnimatorBridge(
  host: AnimationEditorAdapterHost,
): void {
  host.editorSession.setLivePoseProvider(() => host.readLive());
  host.editorSession.setPlayheadApplier((timeMs, mode) => {
    const session = getAnimationCommandSession();
    if (mode === "play") {
      const clip = session.activeClip();
      if (clip) {
        const effectiveClip: AnimationClip = host.editorSession.getState().loop
          ? { ...clip, loop_mode: "loop" }
          : clip;
        host.playCanonicalClip(effectiveClip, {
          onPlayhead: (t) => {
            const ms = Math.round(t * (effectiveClip.duration_ms || 1));
            // Session is the sole playhead clock; editor mirrors for presentation.
            const clock = session.setPlayheadMs(ms, { emit: false });
            host.editorSession.updateRuntimePlayback(
              clock,
              effectiveClip.loop_mode === "none" && t >= 1,
            );
            host.emit();
          },
        });
      }
      return session.getPlayheadMs();
    }
    if (mode === "pause") {
      host.pauseStudioAnimate();
      host.setScrubModeActive(false);
      return session.getPlayheadMs();
    }
    if (mode === "interrupt") {
      host.interruptStudioAnimate();
      return session.getPlayheadMs();
    }
    // scrub | set — session clock first, then evaluate clip and paint via compositor
    const clamped = session.setPlayheadMs(timeMs, { emit: false });
    const clip = session.activeClip();
    const duration = clip?.duration_ms ?? 4000;
    const t = duration > 0 ? Math.max(0, Math.min(1, clamped / duration)) : 0;
    host.scrubStudioAnimate(t);
    return clamped;
  });
  host.editorSession.setDocumentMutator((cmd, _state) => {
    const session = getAnimationCommandSession();
    try {
      // Sync projection mutations — same session UI + MCP use (durable save → Rust).
      if (cmd.type === "create_clip") {
        session.createClipSync({
          name: cmd.name,
          duration_ms: cmd.durationMs,
          with_default_tracks: true,
        });
      } else if (cmd.type === "create_track") {
        session.createTrackSync({
          label: cmd.label,
          domain_id: "face",
          binding_ids: cmd.bindingIds,
        });
      } else if (cmd.type === "capture_current_pose") {
        const pose = host.readLive();
        const clip = session.activeClip();
        if (!clip) return { error: "CLIP_NOT_FOUND" };
        session.captureKeyframeSync({
          // Capture at session clock (sole playhead authority), not stale editor mirror.
          time_ms: session.getPlayheadMs(),
          values: pose,
        });
      } else if (cmd.type === "move_keyframe") {
        session.moveKeyframeSync({
          track_id: cmd.trackId,
          keyframe_id: cmd.keyframeId,
          time_ms: cmd.timeMs,
        });
      } else if (cmd.type === "delete_keyframe") {
        session.deleteKeyframeSync({
          track_id: cmd.trackId,
          keyframe_id: cmd.keyframeId,
        });
      } else if (cmd.type === "add_marker") {
        session.addMarkerSync({
          marker_id: cmd.markerId,
          label: cmd.label,
          time_ms: cmd.timeMs,
        });
      } else if (cmd.type === "move_marker") {
        session.moveMarkerSync({ marker_id: cmd.markerId, time_ms: cmd.timeMs });
      } else if (cmd.type === "delete_marker") {
        session.deleteMarkerSync({ marker_id: cmd.markerId });
      } else if (cmd.type === "select_clip") {
        session.selectClipSync(cmd.clipId);
      } else if (cmd.type === "undo") {
        if (!session.undoSync()) return { error: "NOTHING_TO_UNDO" };
      } else if (cmd.type === "redo") {
        if (!session.redoSync()) return { error: "NOTHING_TO_REDO" };
      }
      const doc = session.getDocument();
      const clip =
        doc.animation.clips.find(
          (c: { id: string }) => c.id === doc.animation.active_clip_id,
        ) ??
        doc.animation.clips[0] ??
        null;
      const trackRows =
        clip?.tracks.map(
          (tr: {
            id: string;
            label: string;
            binding_ids: string[];
            keyframes: Array<{ id: string; time_ms: number }>;
            muted: boolean;
            locked: boolean;
          }) => ({
            trackId: tr.id,
            label: tr.label,
            bindingIds: [...tr.binding_ids],
            keyframes: tr.keyframes.map(
              (k: { id: string; time_ms: number }) => ({
                id: k.id,
                timeMs: k.time_ms,
                selected: false,
              }),
            ),
            muted: tr.muted,
            locked: tr.locked,
          }),
        ) ?? [];
      const clips = doc.animation.clips.map((c) => ({
        id: c.id,
        name: c.name,
        durationMs: c.duration_ms,
        markers: (c.markers ?? []).map((marker) => ({
          id: marker.id,
          timeMs: marker.time_ms,
          label: marker.label,
        })),
      }));
      const history = session.getHistoryState();
      return {
        trackRows,
        clips,
        revision: doc.revision,
        dirty: doc.dirty,
        contentHash: doc.content_hash,
        canUndo: history.canUndo,
        canRedo: history.canRedo,
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });
  syncEditorProjectionFromAnimationSession(host);
}
