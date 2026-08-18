/**
 * Score dopesheet + selected-channel value graph.
 * View of NORTHSTAR_TWENTY_TRACKS. One clock: playhead from StudioTransport.
 */
import { useMemo, useState, type ReactElement } from "react";
import { evalChannel } from "../../../desktop/src/gasper/curves/CurveTrack";
import {
  NORTHSTAR_TWENTY_TAKE,
  NORTHSTAR_TWENTY_TRACKS,
} from "../../../desktop/src/gasper/takes/NorthstarTwentyTake";
import { TAKE_DURATION_MS, type StudioPlayhead } from "./studioClock";

export const SCORE_CHANNEL_IDS = ["orbit.yaw", "pearl.depth", "gait.hz", "driveGain", "stretch"] as const;
export type ScoreChannelId = (typeof SCORE_CHANNEL_IDS)[number];

const SAMPLE_COUNT = 80;
const DURATION_SEC = NORTHSTAR_TWENTY_TAKE.durationSec || TAKE_DURATION_MS / 1000;
const TRACKS = NORTHSTAR_TWENTY_TAKE.tracks ?? NORTHSTAR_TWENTY_TRACKS;

function sampleTrack(id: ScoreChannelId): { t: number; v: number }[] {
  const track = TRACKS[id];
  if (!track) return [];
  const out: { t: number; v: number }[] = [];
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const t = (i / (SAMPLE_COUNT - 1)) * DURATION_SEC;
    out.push({ t, v: evalChannel(track, t).value });
  }
  return out;
}

function valueRange(id: ScoreChannelId, samples: readonly { t: number; v: number }[]): { lo: number; hi: number } {
  const track = TRACKS[id];
  let lo = Infinity;
  let hi = -Infinity;
  if (track) {
    for (const k of track.keys) {
      lo = Math.min(lo, k.v);
      hi = Math.max(hi, k.v);
    }
  }
  for (const s of samples) {
    lo = Math.min(lo, s.v);
    hi = Math.max(hi, s.v);
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { lo: 0, hi: 1 };
  if (hi - lo < 1e-6) {
    const pad = Math.max(0.1, Math.abs(lo) * 0.12);
    return { lo: lo - pad, hi: hi + pad };
  }
  const pad = (hi - lo) * 0.12;
  return { lo: lo - pad, hi: hi + pad };
}

export function ScoreDopesheet({
  graphView,
  playhead,
}: {
  graphView: boolean;
  playhead: StudioPlayhead;
}): ReactElement {
  const [selected, setSelected] = useState<ScoreChannelId>("orbit.yaw");
  const t = playhead.t;
  const frac =
    playhead.mode === "take" && playhead.dur > 0 ? Math.min(1, Math.max(0, t / playhead.dur)) : 0;
  const samples = useMemo(() => sampleTrack(selected), [selected]);
  const range = useMemo(() => valueRange(selected, samples), [selected, samples]);
  const track = TRACKS[selected];

  return (
    <div
      className="score-dopesheet"
      data-testid="score-dopesheet"
      data-view={graphView ? "graph" : "keys"}
      data-channel={selected}
    >
      {graphView ? (
        <ScoreValueGraph
          channel={selected}
          samples={samples}
          range={range}
          frac={frac}
          keys={track?.keys ?? []}
        />
      ) : (
        <div className="score-dopesheet__rows" role="listbox" aria-label="Score channels">
          <i className="score-dopesheet__playhead" style={{ left: `${frac * 100}%` }} aria-hidden="true" />
          {SCORE_CHANNEL_IDS.map((id) => {
            const ch = TRACKS[id];
            return (
              <button
                key={id}
                type="button"
                role="option"
                className="score-dopesheet__row"
                data-testid={`score-row-${id}`}
                data-channel={id}
                data-selected={selected === id ? "1" : "0"}
                aria-selected={selected === id}
                title={id}
                onClick={() => setSelected(id)}
              >
                <span className="score-dopesheet__name">{id}</span>
                <span className="score-dopesheet__lane">
                  {(ch?.keys ?? []).map((k, i) => (
                    <i
                      key={`${k.t}-${i}`}
                      className="score-dopesheet__key"
                      style={{ left: `${(k.t / DURATION_SEC) * 100}%` }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ScoreValueGraph({
  channel,
  samples,
  range,
  frac,
  keys,
}: {
  channel: ScoreChannelId;
  samples: readonly { t: number; v: number }[];
  range: { lo: number; hi: number };
  frac: number;
  keys: readonly { t: number; v: number }[];
}): ReactElement {
  const W = 100;
  const H = 40;
  const span = Math.max(range.hi - range.lo, 1e-6);
  const xOf = (t: number) => (t / DURATION_SEC) * W;
  const yOf = (v: number) => H - ((v - range.lo) / span) * H;
  const d = samples.map((s) => `${xOf(s.t).toFixed(2)},${yOf(s.v).toFixed(2)}`).join(" ");
  const playX = frac * W;

  return (
    <div className="score-value-graph" data-testid="score-value-graph" data-channel={channel}>
      <span className="score-value-graph__name">{channel}</span>
      <svg className="score-value-graph__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <polyline className="score-value-graph__curve" points={d} />
        <line className="score-value-graph__playhead" x1={playX} y1={0} x2={playX} y2={H} />
        {keys.map((k, i) => {
          const x = xOf(k.t);
          const y = yOf(k.v);
          return (
            <rect
              key={`${k.t}-${i}`}
              className="score-value-graph__handle"
              x={x - 0.9}
              y={y - 1.8}
              width={1.8}
              height={3.6}
              transform={`rotate(45 ${x} ${y})`}
            />
          );
        })}
      </svg>
    </div>
  );
}
