import type { WorldClassStudioAdapter, WorldClassStudioSnapshot } from "../adapter/types";
import { formatTimecode, presentPlayback } from "../adapter/productTruth";
import { IconButton } from "../controls/IconButton";

const EASINGS = ["linear", "easeIn", "easeOut", "easeInOut", "hold"] as const;

export function PlaybackControls({
  snap,
  adapter,
}: {
  snap: WorldClassStudioSnapshot;
  adapter: WorldClassStudioAdapter;
}) {
  const hasDoc = snap.document.lifecycle !== "none" && snap.document.lifecycle !== "invalid";
  const play = presentPlayback(snap.animation.playback, hasDoc);
  const playing = snap.animation.playback === "playing";
  const clip = snap.animation.clips.find((c) => c.id === snap.animation.activeClipId);
  const durationMs = clip?.durationMs ?? snap.animation.visibleRangeMs.end ?? 0;

  const selectedKf = (() => {
    const id = snap.animation.selectedKeyframeIds[0];
    if (!id) return null;
    for (const t of snap.animation.tracks) {
      const k = t.keyframes.find((kf) => kf.id === id);
      if (k) return { trackId: t.id, keyframe: k };
    }
    return null;
  })();

  return (
    <div className="gwc-tl-toolbar" data-testid="gwc-playback-controls">
      <IconButton
        label={playing ? "Pause" : "Play"}
        tone="live"
        data-testid="gwc-btn-play"
        disabled={!hasDoc}
        onClick={() => (playing ? adapter.pause() : adapter.play())}
      >
        {playing ? "❚❚" : "▶"}
      </IconButton>
      <IconButton
        label="Interrupt (hold pose)"
        data-testid="gwc-btn-interrupt"
        disabled={!play.canInterrupt && snap.animation.playback !== "playing"}
        onClick={() => adapter.interrupt()}
      >
        ■
      </IconButton>
      <button
        type="button"
        className="gwc-btn gwc-btn-ghost"
        data-testid="gwc-btn-loop"
        aria-pressed={snap.animation.loop}
        disabled={!hasDoc}
        onClick={() => adapter.toggleLoop()}
        title="Toggle loop"
      >
        Loop {snap.animation.loop ? "On" : "Off"}
      </button>
      <button
        type="button"
        className="gwc-btn gwc-btn-ghost"
        data-testid="gwc-btn-add-marker"
        disabled={!hasDoc}
        onClick={() => adapter.addMarker?.("beat", snap.animation.playheadMs)}
        title="Add an authored semantic beat at the playhead"
      >
        + Beat
      </button>

      <span className="gwc-tc" data-testid="gwc-timecode" title="Current / duration">
        <span data-testid="gwc-timecode-current">{formatTimecode(snap.animation.playheadMs)}</span>
        <span className="gwc-tc-sep"> / </span>
        <span data-testid="gwc-timecode-duration">{formatTimecode(durationMs)}</span>
      </span>

      {adapter.setEasing ? (
        <label className="gwc-easing" data-testid="gwc-easing">
          <span className="gwc-ctx-label" style={{ margin: 0 }}>
            Easing
          </span>
          <select
            data-testid="gwc-easing-select"
            disabled={!hasDoc || !selectedKf}
            value={selectedKf?.keyframe.easing ?? "easeInOut"}
            onChange={(e) => {
              if (!selectedKf) return;
              adapter.setEasing?.(selectedKf.trackId, selectedKf.keyframe.id, e.target.value);
            }}
            aria-label="Keyframe easing"
            title={selectedKf ? "Easing for selected keyframe" : "Select a keyframe to set easing"}
          >
            {EASINGS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div style={{ flex: 1 }} />
      <button
        type="button"
        className="gwc-btn gwc-btn-ghost"
        data-testid="gwc-btn-zoom-out"
        disabled={!hasDoc}
        onClick={() => adapter.setZoom(Math.max(0.25, snap.animation.zoom / 1.25))}
      >
        −
      </button>
      <button
        type="button"
        className="gwc-btn gwc-btn-ghost"
        data-testid="gwc-btn-zoom-in"
        disabled={!hasDoc}
        onClick={() => adapter.setZoom(Math.min(8, snap.animation.zoom * 1.25))}
      >
        +
      </button>
    </div>
  );
}
