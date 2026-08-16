/**
 * Pure layout / fit readiness gates for Gasper Dais.
 * Authoritative Fit must not run against zero, stale, or transient stage geometry.
 * A ZOOM_MIN (25%) clamp must not conceal a failed fit.
 */

export type RectLike = { width: number; height: number; x?: number; y?: number };

/** Minimum stage CSS px before Fit is authoritative (panel chrome still visible below this). */
export const MIN_STAGE_WIDTH_PX = 80;
export const MIN_STAGE_HEIGHT_PX = 80;

/** Minimum rendered character box for human-visible gate (CSS px). */
export const MIN_VISIBLE_SVG_WIDTH_PX = 240;
export const MIN_VISIBLE_SVG_HEIGHT_PX = 220;

/** Bounded rAF retries while waiting for nonzero layout (not a permanent poll). */
export const LAYOUT_READY_MAX_FRAMES = 90;

export function isUsableStageSize(w: number, h: number): boolean {
  return (
    Number.isFinite(w) &&
    Number.isFinite(h) &&
    w >= MIN_STAGE_WIDTH_PX &&
    h >= MIN_STAGE_HEIGHT_PX
  );
}

export function isUsableContentBounds(r: RectLike | null | undefined): boolean {
  if (!r) return false;
  return (
    Number.isFinite(r.width) &&
    Number.isFinite(r.height) &&
    r.width >= 1 &&
    r.height >= 1
  );
}

/**
 * True when Fit would only look "done" because zoom hit the floor against invalid geometry.
 * (e.g. stage height 0 ΓåÆ rawZoom 0 ΓåÆ clamp 0.25.)
 */
export function isInvalidMinZoomClamp(opts: {
  stageW: number;
  stageH: number;
  safeW: number;
  safeH: number;
  zoom: number;
  minZoom: number;
}): boolean {
  const { stageW, stageH, safeW, safeH, zoom, minZoom } = opts;
  if (!isUsableStageSize(stageW, stageH)) return true;
  if (!isUsableContentBounds({ width: safeW, height: safeH })) return true;
  const rawZoom = Math.min(stageW / Math.max(1, safeW), stageH / Math.max(1, safeH));
  // Hit floor because stage/content ratio demanded zoom below min ΓÇö and stage was usable?
  // Only conceal-failure when rawZoom is nonsense (non-finite / Γëñ0) or stage unusable.
  if (!Number.isFinite(rawZoom) || rawZoom <= 0) return true;
  if (Math.abs(zoom - minZoom) < 1e-9 && rawZoom < minZoom * 0.5) {
    // Extremely undersized stage relative to content still counts as bad fit for ready gate
    // when resulting on-screen character would be tiny.
    const projectedH = safeH * minZoom;
    if (projectedH < MIN_VISIBLE_SVG_HEIGHT_PX * 0.4) return true;
  }
  return false;
}

export type FitReadiness = {
  ok: boolean;
  reason?: string;
  stageW: number;
  stageH: number;
};

export function assessFitReadiness(
  stageW: number,
  stageH: number,
  content: RectLike | null | undefined,
): FitReadiness {
  if (!isUsableStageSize(stageW, stageH)) {
    return {
      ok: false,
      reason: `stage too small (${Math.round(stageW)}├ù${Math.round(stageH)})`,
      stageW,
      stageH,
    };
  }
  if (!isUsableContentBounds(content)) {
    return {
      ok: false,
      reason: "content bounds zero or missing",
      stageW,
      stageH,
    };
  }
  return { ok: true, stageW, stageH };
}

/**
 * Schedule bounded rAF retries until predicate true or max frames.
 * Returns cancel function.
 */
export function scheduleUntilReady(
  predicate: () => boolean,
  onReady: () => void,
  opts?: { maxFrames?: number; onGiveUp?: () => void },
): () => void {
  const max = opts?.maxFrames ?? LAYOUT_READY_MAX_FRAMES;
  let frames = 0;
  let cancelled = false;
  let raf = 0;

  const tick = () => {
    if (cancelled) return;
    if (predicate()) {
      onReady();
      return;
    }
    frames += 1;
    if (frames >= max) {
      opts?.onGiveUp?.();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => {
    cancelled = true;
    if (raf) cancelAnimationFrame(raf);
  };
}
