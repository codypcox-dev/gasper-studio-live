/**
 * κ-box — G¹ lock on the lower rim, blended with Voigt.
 *
 * Order is law: handles → κ-box (legal target) → τ (_lp) → κ-box (assert).
 * Tau chases a legal W. It does not fight a post-hoc flatten.
 *
 * Region is the lower hemisphere (sin θ > 0.12), both legs + valley,
 * not a y>140 clip that drops a lifted foot.
 *
 * Canon: docs/triforce/canon/runs/2026-08-17T14-30-00-000Z-explore-c2-continuity
 */
export const KAPPA_TH_CAP = 0.9;
export const KAPPA_LOWER_SIN = 0.12;
export const KAPPA_ITERS = 8;
export const KAPPA_PULL = 0.55;
export const TH_LEFT = 1.83;
export const TH_RIGHT = 1.31;
export const TH_CROTCH = Math.PI / 2;

export type KappaPoint = { x: number; y: number; th?: number; theta?: number };

function wrap(i: number, n: number): number {
  return ((i % n) + n) % n;
}

export function thetaOf(p: KappaPoint): number {
  return p.th ?? p.theta ?? 0;
}

export function isLowerRim(p: KappaPoint): boolean {
  return Math.sin(thetaOf(p)) > KAPPA_LOWER_SIN;
}

export function turningAt(
  pts: ReadonlyArray<KappaPoint>,
  i: number,
): number {
  const n = pts.length;
  const a = pts[wrap(i - 1, n)];
  const b = pts[i];
  const c = pts[wrap(i + 1, n)];
  return Math.atan2(
    (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x),
    (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y),
  );
}

export function maxLowerTurning(pts: ReadonlyArray<KappaPoint>): number {
  let max = 0;
  for (let i = 0; i < pts.length; i++) {
    if (!isLowerRim(pts[i])) continue;
    const t = Math.abs(turningAt(pts, i));
    if (t > max) max = t;
  }
  return max;
}

function gaussAngle(th: number, mu: number, sig: number): number {
  let d = th - mu;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.exp(-0.5 * (d / sig) * (d / sig));
}

export function footPeakIndices(pts: ReadonlyArray<KappaPoint>): {
  iL: number;
  iR: number;
  iC: number;
} {
  let iL = 0;
  let iR = 0;
  let iC = 0;
  let mL = -1;
  let mR = -1;
  let mC = -1;
  for (let i = 0; i < pts.length; i++) {
    const th = thetaOf(pts[i]);
    const wL = gaussAngle(th, TH_LEFT, 0.11);
    const wR = gaussAngle(th, TH_RIGHT, 0.11);
    const wC = gaussAngle(th, TH_CROTCH, 0.09);
    if (wL > mL) {
      mL = wL;
      iL = i;
    }
    if (wR > mR) {
      mR = wR;
      iR = i;
    }
    if (wC > mC) {
      mC = wC;
      iC = i;
    }
  }
  return { iL, iR, iC };
}

/** Project lower samples so |θ| ≤ KAPPA_TH_CAP. Feet + cleft stay. Identity if live is off. */
export function kappaBoxLower<T extends KappaPoint>(
  pts: T[],
  live = 1,
): T[] {
  if (!pts || pts.length < 8 || !(live > 0.004)) return pts;
  const n = pts.length;
  const { iL, iR, iC } = footPeakIndices(pts);
  for (let iter = 0; iter < KAPPA_ITERS; iter++) {
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      xs[i] = pts[i].x;
      ys[i] = pts[i].y;
    }
    for (let i = 0; i < n; i++) {
      if (i === iL || i === iR || i === iC) continue;
      if (!isLowerRim(pts[i])) continue;
      const a = wrap(i - 1, n);
      const c = wrap(i + 1, n);
      const turn = Math.atan2(
        (xs[i] - xs[a]) * (ys[c] - ys[i]) - (ys[i] - ys[a]) * (xs[c] - xs[i]),
        (xs[i] - xs[a]) * (xs[c] - xs[i]) + (ys[i] - ys[a]) * (ys[c] - ys[i]),
      );
      const over = Math.abs(turn) - KAPPA_TH_CAP;
      if (over <= 0) continue;
      const s = Math.min(0.85, KAPPA_PULL + 0.25 * (over / KAPPA_TH_CAP));
      pts[i].x = xs[i] * (1 - s) + 0.5 * s * (xs[a] + xs[c]);
      pts[i].y = ys[i] * (1 - s) + 0.5 * s * (ys[a] + ys[c]);
    }
  }
  return pts;
}
