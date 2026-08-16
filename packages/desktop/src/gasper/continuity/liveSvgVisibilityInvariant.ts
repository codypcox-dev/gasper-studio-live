export type LiveSvgStyleSnapshot = {
  opacity: string;
  filter: string;
};

type LiveSvgStyle = {
  opacity: string;
  filter: string;
};

/**
 * Root opacity zero is controller-owned only while a profile snapshot is visible.
 * It is never a restorable authored value for the live production SVG.
 */
export function normalizeRestorableLiveSvgOpacity(opacity: string): string {
  const trimmed = String(opacity ?? "").trim();
  if (!trimmed) return "1";
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && numeric <= 0.001) return "1";
  return opacity;
}

export function captureRestorableLiveSvgStyle(
  style: Pick<LiveSvgStyle, "opacity" | "filter">,
): LiveSvgStyleSnapshot {
  return {
    opacity: normalizeRestorableLiveSvgOpacity(style.opacity),
    filter: style.filter || "none",
  };
}

export function restoreLiveSvgStyle(
  style: LiveSvgStyle,
  snapshot: LiveSvgStyleSnapshot | null | undefined,
): void {
  style.opacity = normalizeRestorableLiveSvgOpacity(snapshot?.opacity ?? "1");
  style.filter = snapshot?.filter || "none";
}
