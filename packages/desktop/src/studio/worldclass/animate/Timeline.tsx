import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { WorldClassStudioAdapter, WorldClassStudioSnapshot } from "../adapter/types";
import { EmptyState } from "../controls/EmptyState";
import {
  buildRulerTicks,
  clampTime,
  pxToTime,
  timeToPx,
} from "./timelineMath";
import { PlaybackControls } from "./PlaybackControls";

type FlatKf = { trackId: string; trackLabel: string; id: string; timeMs: number };

export function Timeline({
  snap,
  adapter,
}: {
  snap: WorldClassStudioSnapshot;
  adapter: WorldClassStudioAdapter;
}) {
  const lanesRef = useRef<HTMLDivElement>(null);
  const [laneWidth, setLaneWidth] = useState(800);
  const range = snap.animation.visibleRangeMs;
  const duration = useMemo(() => {
    const clip = snap.animation.clips.find((c) => c.id === snap.animation.activeClipId);
    return clip?.durationMs ?? range.end ?? 4000;
  }, [snap.animation, range.end]);
  const activeClip = snap.animation.clips.find((clip) => clip.id === snap.animation.activeClipId);
  const markers = activeClip?.markers ?? [];

  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    lanesRef.current = el;
    const w = el.clientWidth;
    if (w > 0) setLaneWidth(w);
  }, []);

  const ticks = useMemo(() => buildRulerTicks(range, Math.max(6, Math.floor(laneWidth / 90))), [range, laneWidth]);

  const playheadPx = timeToPx(snap.animation.playheadMs, range, laneWidth);

  /** Flat ordered keyframe list for roving keyboard focus (DOPS-01A). */
  const flatKeyframes = useMemo(() => {
    const out: FlatKf[] = [];
    for (const track of snap.animation.tracks) {
      for (const kf of track.keyframes) {
        out.push({
          trackId: track.id,
          trackLabel: track.label,
          id: kf.id,
          timeMs: kf.timeMs,
        });
      }
    }
    out.sort((a, b) => a.timeMs - b.timeMs || a.trackLabel.localeCompare(b.trackLabel));
    return out;
  }, [snap.animation.tracks]);

  const selectedKfId = snap.animation.selectedKeyframeIds[0] ?? null;
  const focusKfId =
    selectedKfId && flatKeyframes.some((k) => k.id === selectedKfId)
      ? selectedKfId
      : flatKeyframes[0]?.id ?? null;

  // Scroll focused/selected keyframe into the lanes viewport.
  useEffect(() => {
    if (!focusKfId) return;
    const el = document.querySelector(
      `[data-testid="gwc-kf-${focusKfId}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [focusKfId]);

  const onKeyframeKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    trackId: string,
    kfId: string,
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      adapter.selectKeyframe(trackId, kfId, e.shiftKey || e.metaKey || e.ctrlKey);
      return;
    }
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "ArrowUp" && e.key !== "ArrowDown") {
      return;
    }
    e.preventDefault();
    if (flatKeyframes.length === 0) return;
    const idx = Math.max(
      0,
      flatKeyframes.findIndex((k) => k.id === kfId),
    );
    const delta = e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1;
    const next = flatKeyframes[(idx + delta + flatKeyframes.length) % flatKeyframes.length]!;
    adapter.selectKeyframe(next.trackId, next.id, false);
    // Move DOM focus to the newly selected keyframe on next paint.
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-testid="gwc-kf-${next.id}"]`,
      ) as HTMLButtonElement | null;
      el?.focus();
      el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    });
  };

  const onRulerPointer = (clientX: number, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const x = clientX - rect.left;
    const t = clampTime(pxToTime(x, range, rect.width), duration);
    adapter.scrub(t);
  };

  const onPlayheadDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const lanes = lanesRef.current;
    if (!lanes) return;
    const rect = lanes.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const x = ev.clientX - rect.left;
      const t = clampTime(pxToTime(x, range, rect.width), duration);
      adapter.scrub(t);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (snap.document.lifecycle === "none") {
    return (
      <div className="gwc-timeline-dock" data-testid="gwc-timeline" data-state="no-document">
        <EmptyState title="No document" body="Open a document to use the timeline." />
      </div>
    );
  }

  return (
    <div
      className="gwc-timeline-dock"
      data-testid="gwc-timeline"
      data-state={snap.animation.playback}
      tabIndex={0}
      role="region"
      aria-label="Animation timeline"
    >
      <PlaybackControls snap={snap} adapter={adapter} />

      <div
        className="gwc-tl-ruler"
        data-testid="gwc-tl-ruler"
        onPointerDown={(e) => onRulerPointer(e.clientX, e.currentTarget)}
      >
        {/* label gutter spacer via grid parent; ruler spans lane area only in body */}
        <div style={{ marginLeft: 160, position: "relative", height: "100%" }} ref={(el) => {
          if (el) setLaneWidth(el.clientWidth || 800);
        }}>
          {ticks.map((tick) => {
            const left = timeToPx(tick.timeMs, range, laneWidth);
            return (
              <span key={tick.timeMs}>
                <span className="gwc-tl-ruler-tick" style={{ left, height: tick.major ? "100%" : "40%" }} />
                {tick.major ? (
                  <span className="gwc-tl-ruler-label" style={{ left }}>
                    {tick.label}
                  </span>
                ) : null}
              </span>
            );
          })}
          <div className="gwc-playhead" style={{ left: playheadPx }} data-testid="gwc-playhead-ruler" />
        </div>
      </div>

      <div className="gwc-tl-marker-row" data-testid="gwc-tl-marker-row">
        <div className="gwc-tl-marker-label">Beats</div>
        <div className="gwc-tl-marker-lane" style={{ width: laneWidth }}>
          {markers.map((marker) => {
            const left = timeToPx(marker.timeMs, range, laneWidth);
            return (
              <button
                key={marker.id}
                type="button"
                className="gwc-tl-marker"
                data-testid={`gwc-marker-${marker.id}`}
                style={{ left }}
                title={`${marker.label} — ${marker.timeMs}ms (double-click to delete)`}
                onClick={(e) => {
                  e.stopPropagation();
                  adapter.setPlayhead(marker.timeMs);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  adapter.deleteMarker?.(marker.id);
                }}
              >
                {marker.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="gwc-tl-body">
        <div className="gwc-tl-labels" data-testid="gwc-tl-labels">
          {snap.animation.tracks.map((track) => (
            <div
              key={track.id}
              className="gwc-tl-track-label"
              data-testid={`gwc-track-label-${track.id}`}
              aria-selected={snap.animation.selectedTrackIds.includes(track.id)}
              onClick={() => adapter.selectTrack(track.id)}
            >
              <span>{track.label}</span>
              <span className="flags">
                <button
                  type="button"
                  className="gwc-flag"
                  data-on={track.muted ? "true" : "false"}
                  data-testid={`gwc-track-mute-${track.id}`}
                  title="Mute"
                  aria-label={`Mute ${track.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    adapter.toggleTrackMute?.(track.id);
                  }}
                >
                  M
                </button>
                <button
                  type="button"
                  className="gwc-flag"
                  data-on={track.solo ? "true" : "false"}
                  data-testid={`gwc-track-solo-${track.id}`}
                  title="Solo"
                  aria-label={`Solo ${track.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    adapter.toggleTrackSolo?.(track.id);
                  }}
                >
                  S
                </button>
                <button
                  type="button"
                  className="gwc-flag"
                  data-on={track.locked ? "true" : "false"}
                  data-testid={`gwc-track-lock-${track.id}`}
                  title="Lock"
                  aria-label={`Lock ${track.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    adapter.toggleTrackLock?.(track.id);
                  }}
                >
                  L
                </button>
              </span>
            </div>
          ))}
        </div>

        <div className="gwc-tl-lanes" data-testid="gwc-tl-lanes" ref={measure}>
          {snap.animation.tracks.map((track) => (
            <div
              key={track.id}
              className="gwc-tl-track-lane"
              data-testid={`gwc-track-lane-${track.id}`}
              data-muted={track.muted ? "true" : "false"}
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).dataset.kf === "1") return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const t = clampTime(pxToTime(x, range, rect.width), duration);
                adapter.scrub(t);
              }}
            >
              {track.keyframes.map((kf) => {
                const preview =
                  snap.animation.dragPreview?.keyframeId === kf.id
                    ? snap.animation.dragPreview.timeMs
                    : null;
                const t = preview ?? kf.timeMs;
                const left = timeToPx(t, range, laneWidth);
                const isSelected =
                  kf.selected || snap.animation.selectedKeyframeIds.includes(kf.id);
                // DOPS-01A roving tabindex: selected/current keyframe is the sole tab stop.
                const isTabStop = focusKfId === kf.id;
                const ariaName = `${track.label} keyframe at ${Math.round(t)} milliseconds`;
                return (
                  <button
                    key={kf.id}
                    type="button"
                    className="gwc-keyframe"
                    data-kf="1"
                    data-testid={`gwc-kf-${kf.id}`}
                    data-preview={preview != null ? "true" : "false"}
                    aria-selected={isSelected}
                    aria-label={ariaName}
                    tabIndex={isTabStop ? 0 : -1}
                    style={{ left }}
                    title={ariaName}
                    onKeyDown={(e) => onKeyframeKeyDown(e, track.id, kf.id)}
                    onFocus={() => {
                      if (!isSelected) adapter.selectKeyframe(track.id, kf.id, false);
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      adapter.selectKeyframe(track.id, kf.id, e.shiftKey || e.metaKey || e.ctrlKey);
                      if (track.locked) return;
                      adapter.beginKeyframeDrag(track.id, kf.id);
                      const lanes = lanesRef.current;
                      if (!lanes) return;
                      const rect = lanes.getBoundingClientRect();
                      const move = (ev: PointerEvent) => {
                        const x = ev.clientX - rect.left;
                        const nt = clampTime(pxToTime(x, range, rect.width), duration);
                        adapter.previewKeyframeDrag(nt);
                      };
                      const up = () => {
                        adapter.commitKeyframeDrag();
                        window.removeEventListener("pointermove", move);
                        window.removeEventListener("pointerup", up);
                      };
                      window.addEventListener("pointermove", move);
                      window.addEventListener("pointerup", up);
                    }}
                  />
                );
              })}
            </div>
          ))}

          <div
            className="gwc-playhead"
            style={{ left: playheadPx }}
            data-testid="gwc-playhead"
          />
          <div
            className="gwc-playhead-hit"
            style={{ left: playheadPx }}
            data-testid="gwc-playhead-hit"
            onPointerDown={onPlayheadDrag}
          />
        </div>
      </div>
    </div>
  );
}
