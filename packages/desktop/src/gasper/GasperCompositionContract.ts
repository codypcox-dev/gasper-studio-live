/**
 * GASPER-COMPOSITION-001 · Wave 1.3A — final-frame observer contract.
 *
 * This module judges the FINAL screen-space organism after camera, world
 * projection, facing, tilt, momentum and renderer deformation. It is pure:
 * no camera movement, no pose clamp, no DOM. Enforcement is a later wave.
 */
export type ScreenRect = Readonly<{ x: number; y: number; width: number; height: number }>;

export type CompositionPolicy = Readonly<{
  safeMarginFraction: number;
  minWidthFraction: number;
  minHeightFraction: number;
  maxOccupyFraction: number;
  minAspectRatio: number;
  maxAspectRatio: number;
  minFaceOverlapFraction: number;
}>;

export const DEFAULT_COMPOSITION_POLICY: CompositionPolicy = Object.freeze({
  // A visible body must stay inside the monitor; 2% is a witness margin, not a crop target.
  safeMarginFraction: 0.02,
  // GASPER-NORTHSTAR-001: the depth-presence envelope (GasperCompositionWorldEnvelope)
  // fences the far plane at φ⁻¹ ≈ 0.618 of home presence, so a "deliberately
  // distant Gasper" reads at ≥ 0.62× its calibrated size — never the old 0.35×
  // far fade. These minimums are witness floors for that bounded far presence,
  // not an admission of the retired 0.35x far plane.
  minWidthFraction: 0.08,
  minHeightFraction: 0.14,
  // Reuse the established visual-bounds max occupancy law.
  maxOccupyFraction: 0.88,
  // Broad enough for authored embodiments; narrow enough to catch sliver/bottle collapse.
  minAspectRatio: 0.28,
  maxAspectRatio: 3.5,
  // Face geometry may fade on a back view, but it must never detach spatially from the body.
  minFaceOverlapFraction: 0.6,
});

export type CompositionViolation =
  | 'invalid-stage'
  | 'invalid-body'
  | 'frame-left'
  | 'frame-right'
  | 'frame-top'
  | 'frame-bottom'
  | 'too-small-width'
  | 'too-small-height'
  | 'too-large-width'
  | 'too-large-height'
  | 'aspect-collapse'
  | 'aspect-explosion'
  | 'face-detached';

export type CompositionReport = Readonly<{
  ok: boolean;
  violations: readonly CompositionViolation[];
  widthFraction: number;
  heightFraction: number;
  aspectRatio: number;
  leftFraction: number;
  rightFraction: number;
  topFraction: number;
  bottomFraction: number;
  faceOverlapFraction: number | null;
}>;

function finiteRect(r: ScreenRect | null | undefined): r is ScreenRect {
  return !!r && [r.x, r.y, r.width, r.height].every(Number.isFinite) && r.width > 0 && r.height > 0;
}

function intersectionArea(a: ScreenRect, b: ScreenRect): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return Math.max(0, right - left) * Math.max(0, bottom - top);
}

export function assessComposedOrganismFrame(
  stage: ScreenRect,
  body: ScreenRect | null,
  face: ScreenRect | null = null,
  policy: CompositionPolicy = DEFAULT_COMPOSITION_POLICY,
): CompositionReport {
  const violations: CompositionViolation[] = [];
  if (!finiteRect(stage)) {
    return Object.freeze({
      ok: false,
      violations: ['invalid-stage'] as const,
      widthFraction: 0,
      heightFraction: 0,
      aspectRatio: 0,
      leftFraction: 0,
      rightFraction: 0,
      topFraction: 0,
      bottomFraction: 0,
      faceOverlapFraction: null,
    });
  }
  if (!finiteRect(body)) {
    return Object.freeze({
      ok: false,
      violations: ['invalid-body'] as const,
      widthFraction: 0,
      heightFraction: 0,
      aspectRatio: 0,
      leftFraction: 0,
      rightFraction: 0,
      topFraction: 0,
      bottomFraction: 0,
      faceOverlapFraction: null,
    });
  }

  const widthFraction = body.width / stage.width;
  const heightFraction = body.height / stage.height;
  const aspectRatio = body.width / body.height;
  const leftFraction = (body.x - stage.x) / stage.width;
  const rightFraction = (body.x + body.width - stage.x) / stage.width;
  const topFraction = (body.y - stage.y) / stage.height;
  const bottomFraction = (body.y + body.height - stage.y) / stage.height;
  const m = policy.safeMarginFraction;

  if (leftFraction < m) violations.push('frame-left');
  if (rightFraction > 1 - m) violations.push('frame-right');
  if (topFraction < m) violations.push('frame-top');
  if (bottomFraction > 1 - m) violations.push('frame-bottom');
  if (widthFraction < policy.minWidthFraction) violations.push('too-small-width');
  if (heightFraction < policy.minHeightFraction) violations.push('too-small-height');
  if (widthFraction > policy.maxOccupyFraction) violations.push('too-large-width');
  if (heightFraction > policy.maxOccupyFraction) violations.push('too-large-height');
  if (aspectRatio < policy.minAspectRatio) violations.push('aspect-collapse');
  if (aspectRatio > policy.maxAspectRatio) violations.push('aspect-explosion');

  let faceOverlapFraction: number | null = null;
  if (finiteRect(face)) {
    const faceArea = face.width * face.height;
    faceOverlapFraction = faceArea > 0 ? intersectionArea(body, face) / faceArea : 0;
    if (faceOverlapFraction < policy.minFaceOverlapFraction) violations.push('face-detached');
  }

  return Object.freeze({
    ok: violations.length === 0,
    violations: Object.freeze(violations),
    widthFraction,
    heightFraction,
    aspectRatio,
    leftFraction,
    rightFraction,
    topFraction,
    bottomFraction,
    faceOverlapFraction,
  });
}
