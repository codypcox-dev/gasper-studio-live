import type { NodeParam } from "./types";

export const LOCKED_CARDS: Record<string, string> = {
  identity: "Identity is the contour. Mute it and there is no Gasper.",
  hull: "Hull writes the silhouette. Mute it and the renderer goes blank.",
};

export function lockReason(id: string): string | null {
  return LOCKED_CARDS[id] ?? null;
}

export function isBinaryParam(p: NodeParam): boolean {
  return p.step >= 1 && p.max - p.min <= 1;
}

export function paramBase(p: NodeParam): number {
  return p.base ?? p.value;
}

export function paramSpan(p: NodeParam): number {
  const b = paramBase(p);
  return Math.max(Math.abs(p.max - b), Math.abs(b - p.min), 1e-6);
}

/** Slider thumb in [-1, 1], 0 = canonical baseline. */
export function sliderT(p: NodeParam): number {
  if (isBinaryParam(p)) return p.value;
  return Math.max(-1, Math.min(1, (p.value - paramBase(p)) / paramSpan(p)));
}

export function fromSliderT(p: NodeParam, t: number): number {
  if (isBinaryParam(p)) return t >= 0.5 ? p.max : p.min;
  const v = paramBase(p) + t * paramSpan(p);
  return Math.max(p.min, Math.min(p.max, v));
}
