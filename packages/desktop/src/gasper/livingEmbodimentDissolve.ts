/**
 * Hard single-authority living embodiment dissolve opacities.
 * Source must fully clear before target rises — no dual-silhouette mid-fade.
 *
 * P0-C residual corrective (CLEAR=0.12): early source collapse, then target.
 */

/** Progress at/after which source opacity is forced to 0. */
export const LIVING_EMBODIMENT_DISSOLVE_CLEAR = 0.12;

export type LivingDissolveOpacities = {
  sourceOpacity: number;
  targetOpacity: number;
};

/**
 * Compute snapshot opacities for a living embodiment dissolve frame.
 * @param progress 0..1 transition progress
 * @param clear hard-clear threshold (default shipped CLEAR)
 */
export function livingEmbodimentDissolveOpacities(
  progress: number,
  clear: number = LIVING_EMBODIMENT_DISSOLVE_CLEAR,
): LivingDissolveOpacities {
  const p = Math.max(0, Math.min(1, progress));
  const sourceOpacity =
    p < clear ? Math.cos((Math.PI * p) / (2 * clear)) ** 4 : 0;
  const targetOpacity =
    p < clear
      ? 0
      : Math.sin((Math.PI * Math.min(1, (p - clear) / (1 - clear))) / 2) ** 4;
  return { sourceOpacity, targetOpacity };
}

/**
 * True when both snapshots would be optically co-visible (dual residual risk).
 * Threshold matches residual review sensitivity (~2% opacity floor).
 */
export function livingDissolveHasDualResidual(
  progress: number,
  clear: number = LIVING_EMBODIMENT_DISSOLVE_CLEAR,
  floor = 0.02,
): boolean {
  const { sourceOpacity, targetOpacity } = livingEmbodimentDissolveOpacities(
    progress,
    clear,
  );
  return sourceOpacity > floor && targetOpacity > floor;
}
