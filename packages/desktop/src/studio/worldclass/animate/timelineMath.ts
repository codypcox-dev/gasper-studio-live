/**
 * Pure timeline geometry — testable without React/DOM.
 */

export type VisibleRange = { start: number; end: number };

export function rangeDuration(range: VisibleRange): number {
  return Math.max(1, range.end - range.start);
}

/** Map time (ms) → fraction 0..1 within visible range. */
export function timeToFraction(timeMs: number, range: VisibleRange): number {
  const d = rangeDuration(range);
  return (timeMs - range.start) / d;
}

/** Map fraction 0..1 → time ms. */
export function fractionToTime(fraction: number, range: VisibleRange): number {
  const d = rangeDuration(range);
  return range.start + fraction * d;
}

/** Pixel position within a lane width. */
export function timeToPx(timeMs: number, range: VisibleRange, widthPx: number): number {
  return timeToFraction(timeMs, range) * Math.max(1, widthPx);
}

export function pxToTime(px: number, range: VisibleRange, widthPx: number): number {
  const f = px / Math.max(1, widthPx);
  return fractionToTime(f, range);
}

export function clampTime(timeMs: number, durationMs: number): number {
  if (!Number.isFinite(timeMs)) return 0;
  if (durationMs <= 0) return 0;
  return Math.max(0, Math.min(durationMs, Math.round(timeMs)));
}

/** Snap to frame grid (ms per frame). */
export function snapTime(timeMs: number, snapMs: number, enabled: boolean): number {
  if (!enabled || snapMs <= 0) return Math.round(timeMs);
  return Math.round(timeMs / snapMs) * snapMs;
}

export type RulerTick = { timeMs: number; major: boolean; label: string };

/** Generate ruler ticks for a visible range. */
export function buildRulerTicks(range: VisibleRange, targetCount = 8): RulerTick[] {
  const d = rangeDuration(range);
  const rawStep = d / Math.max(2, targetCount);
  const nice = niceStep(rawStep);
  const start = Math.ceil(range.start / nice) * nice;
  const ticks: RulerTick[] = [];
  for (let t = start; t <= range.end + 0.5; t += nice) {
    const major = Math.abs(t % (nice * 5)) < 0.5 || Math.abs((t % (nice * 5)) - nice * 5) < 0.5;
    ticks.push({
      timeMs: t,
      major: major || t === start,
      label: formatShort(t),
    });
  }
  if (ticks.length === 0) {
    ticks.push({ timeMs: range.start, major: true, label: formatShort(range.start) });
  }
  return ticks;
}

function niceStep(raw: number): number {
  const candidates = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 15000, 30000, 60000];
  for (const c of candidates) {
    if (c >= raw) return c;
  }
  return 60000;
}

function formatShort(ms: number): string {
  const s = ms / 1000;
  if (s < 60) return `${s % 1 === 0 ? s.toFixed(0) : s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(Math.floor(r)).padStart(2, "0")}`;
}

/** Hit-test keyframes near a pixel X. */
export function hitTestKeyframes(
  px: number,
  widthPx: number,
  range: VisibleRange,
  keyframes: Array<{ id: string; timeMs: number }>,
  thresholdPx = 8,
): string | null {
  let best: string | null = null;
  let bestDist = thresholdPx;
  for (const kf of keyframes) {
    const x = timeToPx(kf.timeMs, range, widthPx);
    const dist = Math.abs(x - px);
    if (dist <= bestDist) {
      bestDist = dist;
      best = kf.id;
    }
  }
  return best;
}
