/**
 * Canonical facial rig. These numbers are the source of truth.
 * The body silhouette must clear this disk — the face does not shrink to the body.
 */
export const PHI = 1.618033988749895;

export const FACE_CANON = Object.freeze({
  center: Object.freeze([120, 112] as const),
  leftEye: Object.freeze([84, 99] as const),
  rightEye: Object.freeze([156, 99] as const),
  mouth: Object.freeze([121, 140] as const),
  eyeWidth: 38,
});

export const FACE_CONTENT = Object.freeze({
  center: Object.freeze({ x: 0, y: 2 }),
  leftEye: Object.freeze({ x: -36, y: -11 }),
  rightEye: Object.freeze({ x: 36, y: -11 }),
  mouth: Object.freeze({ x: 1, y: 30 }),
  eyeWidth: 38,
});

export function faceClearanceRadius(): number {
  const c = FACE_CONTENT.center;
  const marks = [FACE_CONTENT.leftEye, FACE_CONTENT.rightEye, FACE_CONTENT.mouth];
  let r = 0;
  for (const m of marks) r = Math.max(r, Math.hypot(m.x - c.x, m.y - c.y));
  return r + FACE_CONTENT.eyeWidth * 0.5;
}

function distPointSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const d = vx * vx + vy * vy;
  const t = d < 1e-8 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / d));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

export function availableRadius(
  center: { x: number; y: number },
  outline: Float32Array | Array<{ x: number; y: number }>,
): number {
  let best = Number.POSITIVE_INFINITY;
  const n = Array.isArray(outline) ? outline.length : outline.length / 2;
  if (n < 2) return 0;
  const at = (i: number) => {
    if (Array.isArray(outline)) return outline[i] ?? center;
    return { x: outline[i * 2] ?? 0, y: outline[i * 2 + 1] ?? 0 };
  };
  for (let i = 0; i < n; i++) {
    const a = at(i);
    const b = at((i + 1) % n);
    const d = distPointSeg(center.x, center.y, a.x, a.y, b.x, b.y);
    if (d < best) best = d;
  }
  return Number.isFinite(best) ? best : 0;
}

export function clearanceScale(
  outline: Float32Array | Array<{ x: number; y: number }>,
  center = FACE_CONTENT.center,
): number {
  const have = availableRadius(center, outline);
  const need = faceClearanceRadius();
  if (have < 1e-3) return 1;
  return have >= need ? 1 : need / have;
}
