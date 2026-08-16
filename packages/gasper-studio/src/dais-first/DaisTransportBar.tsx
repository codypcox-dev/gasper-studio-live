/**
 * Bottom transport bar — play/pause/interrupt, frame step, playhead, A/B, status.
 * Wired to production adapter. No Cody acceptance claim.
 */
import { useCallback, useState, useSyncExternalStore } from "react";
import {
  compareAbBaseline,
  DEFAULT_FRAME_FPS,
  pinAbBaseline,
  resetExpressionViaAdapter,
  stepFrame,
  type DaisFirstAdapter,
} from "./daisFirstControls";
export type DaisTransportBarProps = {
  adapter: DaisFirstAdapter;
  fps?: number;
  /** When true, collapse non-essential transport chrome for character crop. */
  reviewMode?: boolean;
};

function formatMs(ms: number): string {
  const n = Math.max(0, Math.round(ms));
  const s = Math.floor(n / 1000);
  const f = n % 1000;
  return `${s}.${String(f).padStart(3, "0")}s`;
}

export function DaisTransportBar({
  adapter,
  fps = DEFAULT_FRAME_FPS,
  reviewMode = false,
}: DaisTransportBarProps): React.ReactElement {
  const snap = useSyncExternalStore(
    (onChange) => adapter.subscribe(onChange),
    () => adapter.getSnapshot(),
    () => adapter.getSnapshot(),
  );
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  const playing = snap.animation.playback === "playing";
  const playheadMs = snap.animation.playheadMs;
  const baselinePinned = !!snap.proofStatus?.baselinePinned;
  const lastCompare = snap.proofStatus?.lastCompare;

  const onPlayPause = useCallback(() => {
    if (playing) {
      adapter.pause();
      setLocalStatus("Paused");
    } else {
      adapter.play();
      setLocalStatus("Playing");
    }
  }, [adapter, playing]);

  const onInterrupt = useCallback(() => {
    adapter.interrupt();
    setLocalStatus("Interrupted");
  }, [adapter]);

  const onFrame = useCallback(
    (dir: 1 | -1) => {
      const r = stepFrame(adapter, dir, { fps });
      setLocalStatus(
        `Frame ${dir > 0 ? "+" : "−"}1 @ ${fps}fps → ${formatMs(r.toMs)}`,
      );
    },
    [adapter, fps],
  );

  const onReset = useCallback(() => {
    const r = resetExpressionViaAdapter(adapter);
    setLocalStatus(r.ok ? "Reset expression" : `Reset failed: ${r.error}`);
  }, [adapter]);

  const onPin = useCallback(() => {
    const r = pinAbBaseline(adapter);
    setLocalStatus(
      r.ok ? `A/B pin · ${r.keyCount} keys` : "A/B pin failed — no live pose",
    );
  }, [adapter]);

  const onCompare = useCallback(() => {
    const r = compareAbBaseline(adapter);
    if (!r.ok) {
      setLocalStatus(r.error === "no_baseline" ? "Pin A/B baseline first" : "A/B compare failed");
      return;
    }
    setLocalStatus(
      r.identical
        ? "A/B compare · identical"
        : `A/B · ${r.deltaCount ?? 0} deltas · max|Δ|=${(r.maxAbsDelta ?? 0).toFixed(4)}`,
    );
  }, [adapter]);

  const transitionSummary =
    snap.behaviorOverview?.transitionSummary ??
    snap.behaviorOverview?.behavioralState ??
    null;

  const statusText =
    localStatus ??
    snap.statusMessage ??
    (playing ? "Playing" : "Stopped");

  return (
    <div
      className="dais-transport-bar"
      data-testid="dais-transport-bar"
      data-primary-controls="1"
      data-review-mode={reviewMode ? "1" : "0"}
      role="toolbar"
      aria-label="Dais transport"
    >
      <div className="dais-transport-bar__group">
        <button
          type="button"
          data-testid="dais-transport-play"
          data-control-id="play-pause"
          data-active={playing ? "1" : "0"}
          aria-pressed={playing}
          onClick={onPlayPause}
          title={playing ? "Pause" : "Play"}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          data-testid="dais-transport-interrupt"
          data-control-id="interrupt"
          data-transition-control="transition-interrupt"
          data-control-id-alias="transition-interrupt"
          data-kind="danger"
          onClick={onInterrupt}
          title="Interrupt (Escape)"
        >
          Interrupt
        </button>
      </div>

      <div className="dais-transport-bar__group">
        <button
          type="button"
          data-testid="dais-transport-frame-back"
          data-control-id="frame-step-back"
          onClick={() => onFrame(-1)}
          title={`Step −1 frame @ ${fps}fps`}
        >
          −F
        </button>
        <span
          className="dais-transport-bar__playhead"
          data-testid="dais-transport-playhead"
          data-control-id="playhead-readout"
        >
          {formatMs(playheadMs)}
        </span>
        <button
          type="button"
          data-testid="dais-transport-frame-forward"
          data-control-id="frame-step-forward"
          onClick={() => onFrame(1)}
          title={`Step +1 frame @ ${fps}fps`}
        >
          +F
        </button>
      </div>

      {!reviewMode ? (
        <div className="dais-transport-bar__group">
          <button
            type="button"
            data-testid="dais-transport-reset"
            data-control-id="reset-expression"
            onClick={onReset}
            title="Reset expression (R)"
          >
            Reset
          </button>
          <button
            type="button"
            data-testid="dais-transport-ab-pin"
            data-control-id="ab-pin"
            data-active={baselinePinned ? "1" : "0"}
            data-kind="ok"
            onClick={onPin}
            title="Pin A/B proof baseline (B)"
          >
            A/B Pin
          </button>
          <button
            type="button"
            data-testid="dais-transport-ab-compare"
            data-control-id="ab-compare"
            onClick={onCompare}
            title="Compare to A/B baseline (C)"
          >
            A/B Cmp
            {lastCompare
              ? lastCompare.identical
                ? " · ="
                : ` · Δ${lastCompare.deltaCount}`
              : ""}
          </button>
        </div>
      ) : null}

      <div
        className="dais-transport-bar__status"
        data-testid="dais-transport-status"
        data-control-id="timeline-inspect"
        title={transitionSummary ?? statusText}
      >
        {reviewMode
          ? `Review · ${statusText}`
          : transitionSummary
            ? `${statusText} · ${transitionSummary}`
            : statusText}
      </div>
    </div>
  );
}

export default DaisTransportBar;
