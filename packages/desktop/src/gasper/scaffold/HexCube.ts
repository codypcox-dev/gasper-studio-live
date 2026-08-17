/**
 * Cube / axial hex arithmetic (Patel).
 *
 * Offset is layout. Axial is storage. Cube is arithmetic.
 *   q + r + s = 0
 *   d = max(|Δq|, |Δr|, |Δs|) = (|Δq| + |Δr| + |Δs|) / 2
 *
 * Cylinder wrap is + (period, 0, −period) on q. Polar v does not wrap.
 * Dual killed: offset-UV-Euclidean = hex-lattice.
 */
export type Cube = Readonly<{ q: number; r: number; s: number }>;
export type OddR = Readonly<{ col: number; row: number }>;

export const CUBE_LAW = "q+r+s=0" as const;

/** Six unit steps. Index 0..5, 60° each. */
export const CUBE_DIRS: readonly Cube[] = Object.freeze([
  Object.freeze({ q: 1, r: -1, s: 0 }),
  Object.freeze({ q: 1, r: 0, s: -1 }),
  Object.freeze({ q: 0, r: 1, s: -1 }),
  Object.freeze({ q: -1, r: 1, s: 0 }),
  Object.freeze({ q: -1, r: 0, s: 1 }),
  Object.freeze({ q: 0, r: -1, s: 1 }),
]);

export function cube(q: number, r: number, s: number = -q - r): Cube {
  return { q, r, s };
}

export function cubeValid(c: Cube, eps = 1e-9): boolean {
  return Number.isFinite(c.q) && Number.isFinite(c.r) && Number.isFinite(c.s)
    && Math.abs(c.q + c.r + c.s) <= eps;
}

export function cubeAdd(a: Cube, b: Cube): Cube {
  return { q: a.q + b.q, r: a.r + b.r, s: a.s + b.s };
}

export function cubeSub(a: Cube, b: Cube): Cube {
  return { q: a.q - b.q, r: a.r - b.r, s: a.s - b.s };
}

export function cubeScale(c: Cube, k: number): Cube {
  return { q: c.q * k, r: c.r * k, s: c.s * k };
}

export function cubeNeighbor(c: Cube, dir: number): Cube {
  const step = CUBE_DIRS[((dir % 6) + 6) % 6];
  return cubeAdd(c, step!);
}

/**
 * 60° CCW about the origin (Patel). Closed form — the six even
 * permutations of (q, r, s) with the sign pattern of C6.
 *   0 ( q,  r,  s)
 *   1 (−s, −q, −r)
 *   2 ( r,  s,  q)
 *   3 (−q, −r, −s)
 *   4 ( s,  q,  r)
 *   5 (−r, −s, −q)
 */
export function cubeRotate60(c: Cube, turns: number): Cube {
  const n = ((turns % 6) + 6) % 6;
  const { q, r, s } = c;
  if (n === 1) return { q: -s, r: -q, s: -r };
  if (n === 2) return { q: r, r: s, s: q };
  if (n === 3) return { q: -q, r: -r, s: -s };
  if (n === 4) return { q: s, r: q, s: r };
  if (n === 5) return { q: -r, r: -s, s: -q };
  return { q, r, s };
}

/** Translate → rotate → translate. Pivot stays fixed. */
export function cubeRotate60About(p: Cube, center: Cube, turns: number): Cube {
  if (!(((turns % 6) + 6) % 6)) return p;
  return cubeAdd(center, cubeRotate60(cubeSub(p, center), turns));
}

/**
 * Dihedral D6 reflection through an axis. Reflect twice is identity.
 * Axis q swaps (r, s); axis r swaps (s, q); axis s swaps (q, r).
 */
export function cubeReflect(c: Cube, axis: "q" | "r" | "s"): Cube {
  if (axis === "q") return { q: c.q, r: c.s, s: c.r };
  if (axis === "r") return { q: c.s, r: c.r, s: c.q };
  return { q: c.r, r: c.q, s: c.s };
}

export function cubeReflectAbout(p: Cube, center: Cube, axis: "q" | "r" | "s"): Cube {
  return cubeAdd(center, cubeReflect(cubeSub(p, center), axis));
}

export function uvRotate60(
  u: number,
  v: number,
  turns: number,
  fu: number,
  fv: number,
  center: Cube,
): { u: number; v: number } {
  return cubeToUv(cubeRotate60About(uvToCube(u, v, fu, fv), center, turns), fu, fv);
}

export function cubeDistance(a: Cube, b: Cube): number {
  return (
    (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2
  );
}

/** Xiangguo Li continuous hex Euclidean on axial. */
export function liDistance(a: Cube, b: Cube): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return Math.sqrt(dq * dq + dr * dr + dq * dr);
}

/** Nearest cube to a fractional cube (Patel cube_round). */
export function cubeRound(c: Cube): Cube {
  let q = Math.round(c.q);
  let r = Math.round(c.r);
  let s = Math.round(c.s);
  const dq = Math.abs(q - c.q);
  const dr = Math.abs(r - c.r);
  const ds = Math.abs(s - c.s);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  else s = -q - r;
  return { q, r, s };
}

/** Odd-r (pointy, odd rows shoved right) → cube. Integer or fractional row. */
export function oddRToCube(col: number, row: number): Cube {
  const row0 = Math.floor(row);
  const q = col - (row - (row0 & 1)) / 2;
  const r = row;
  return { q, r, s: -q - r };
}

export function cubeToOddR(c: Cube): OddR {
  const row = c.r;
  const row0 = Math.floor(row);
  const col = c.q + (row - (row0 & 1)) / 2;
  return { col, row };
}

/** Axial layout in unit cells: x = q + r/2 already carries the stagger. */
export function cubeToXy(c: Cube): { x: number; y: number } {
  return { x: c.q + c.r / 2, y: c.r };
}

export function cubePeriodQ(period: number): Cube {
  return { q: period, r: 0, s: -period };
}

export function cubeWrapQ(c: Cube, period: number): Cube {
  if (!(period > 0) || !Number.isFinite(period)) return c;
  let q = ((c.q % period) + period) % period;
  return { q, r: c.r, s: -q - c.r };
}

/**
 * Polar UV → fractional cube on an odd-r lattice of fu columns × fv rows.
 * x = u·fu, y = v·fv. Undo the odd-row shove, then odd-r → cube.
 */
export function uvToCube(u: number, v: number, fu: number, fv: number): Cube {
  const y = v * fv;
  const x = u * fu;
  const row0 = Math.floor(y);
  const col = x - 0.5 * (row0 & 1);
  return oddRToCube(col, y);
}

export function cubeToUv(c: Cube, fu: number, fv: number): { u: number; v: number } {
  const { x, y } = cubeToXy(c);
  const span = fu > 0 ? fu : 1;
  const u = (((x % span) + span) % span) / span;
  const v = fv > 0 ? y / fv : 0;
  return { u, v };
}

function wrapDist(p: Cube, site: Cube, period: Cube): number {
  return Math.min(
    cubeDistance(p, site),
    cubeDistance(p, cubeAdd(site, period)),
    cubeDistance(p, cubeSub(site, period)),
  );
}

/** Hex-metric distance from a UV sample to the nearest odd-r site. */
export function hexSiteDistance(u: number, v: number, fu: number, fv: number): number {
  const p = uvToCube(u, v, fu, fv);
  const site = cubeRound(p);
  return wrapDist(p, site, cubePeriodQ(fu));
}

/**
 * Distance to the nearest coarse-hex edge midpoint (the dual grain).
 * Three unique edges per site; six neighbors, mid = (site + n) / 2.
 */
export function hexDualDistance(u: number, v: number, fu: number, fv: number): number {
  const p = uvToCube(u, v, fu, fv);
  const site = cubeRound(p);
  const period = cubePeriodQ(fu);
  let best = Number.POSITIVE_INFINITY;
  for (let dir = 0; dir < 6; dir++) {
    const mid = cubeScale(cubeAdd(site, cubeNeighbor(site, dir)), 0.5);
    const d = wrapDist(p, mid, period);
    if (d < best) best = d;
  }
  return best;
}

export function hexKernel(distance: number, sigma: number): number {
  if (!(sigma > 0)) return distance === 0 ? 1 : 0;
  return Math.exp(-0.5 * (distance * distance) / (sigma * sigma));
}
