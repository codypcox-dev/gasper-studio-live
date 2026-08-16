/**
 * GASPER-FINISH-01 Task 5 — wake as three events.
 *
 * Wake is never an instant state swap: inhale/activation → stretch/re-entry →
 * normal living hold. Pure evaluator over the canonical wake beat envelope.
 */

import type { BeatSequence } from "./beat-sequence";
import { THREE_BEAT_SEQUENCES } from "./beat-sequence";

export const WAKE_EVENT_IDS = [
  "inhale-activation",
  "stretch-re-entry",
  "living-hold",
] as const;

export type WakeEventId = (typeof WAKE_EVENT_IDS)[number];

export type WakeSample = Readonly<{
  event: WakeEventId;
  eventIndex: number;
  progress: number;
  elapsedMs: number;
}>;

export function evaluateWakeSequence(
  elapsedMs: number,
  seq: BeatSequence = THREE_BEAT_SEQUENCES.wake,
): WakeSample {
  const t = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const g = seq.phases[0].durationMs;
  const p = seq.phases[1].durationMs;
  const s = seq.phases[2].durationMs;
  const hold = Math.max(1, seq.holdMs);
  if (t < g) {
    return Object.freeze({
      event: "inhale-activation",
      eventIndex: 0,
      progress: g > 0 ? Math.min(1, t / g) : 1,
      elapsedMs: t,
    });
  }
  if (t < g + p) {
    return Object.freeze({
      event: "stretch-re-entry",
      eventIndex: 1,
      progress: p > 0 ? Math.min(1, (t - g) / p) : 1,
      elapsedMs: t,
    });
  }
  return Object.freeze({
    event: "living-hold",
    eventIndex: 2,
    progress: Math.min(1, (t - g - p) / (s + hold)),
    elapsedMs: t,
  });
}

/** Ordered event trace across the full wake envelope. */
export function evaluateWakeEventTrace(
  seq: BeatSequence = THREE_BEAT_SEQUENCES.wake,
  dtMs = 1000 / 60,
): WakeSample[] {
  const total =
    seq.phases.reduce((sum, ph) => sum + ph.durationMs, 0) + seq.holdMs;
  const samples: WakeSample[] = [];
  for (let t = 0; t <= total; t += dtMs) {
    samples.push(evaluateWakeSequence(t, seq));
  }
  return samples;
}
