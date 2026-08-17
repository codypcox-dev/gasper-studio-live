/**
 * Rotate a 25×40 scalar field.
 *
 * Hex C6 about a cube pivot is the lattice algorithm. It is not a
 * symmetry of the polar cylinder — energy can walk off the poles.
 * Pole spin (sector shift) is the cylinder isometry: the glyph turns
 * around him and stays on the dermis.
 */
import {
  SCAFFOLD_RINGS,
  SCAFFOLD_SECTORS,
  SCAFFOLD_VERTEX_COUNT,
} from "./AdaptiveShellScaffold";
import {
  type Cube,
  cubeRotate60About,
  cubeToUv,
  uvToCube,
} from "./HexCube";

export const HEX_ROTATE_LAW = "C6-about-cube-pivot" as const;
export const POLE_SPIN_LAW = "sector-shift-cylinder" as const;

export function sampleFieldBilinear(
  field: ArrayLike<number>,
  u: number,
  v: number,
): number {
  const uu = wrap01(u) * SCAFFOLD_SECTORS;
  const vv = clamp01(v) * (SCAFFOLD_RINGS - 1);
  const s0 = Math.floor(uu);
  const r0 = Math.floor(vv);
  const s1 = (s0 + 1) % SCAFFOLD_SECTORS;
  const r1 = Math.min(SCAFFOLD_RINGS - 1, r0 + 1);
  const fu = uu - s0;
  const fv = vv - r0;
  const a = field[r0 * SCAFFOLD_SECTORS + s0] ?? 0;
  const b = field[r0 * SCAFFOLD_SECTORS + s1] ?? 0;
  const c = field[r1 * SCAFFOLD_SECTORS + s0] ?? 0;
  const d = field[r1 * SCAFFOLD_SECTORS + s1] ?? 0;
  return (a * (1 - fu) + b * fu) * (1 - fv) + (c * (1 - fu) + d * fu) * fv;
}

/** True hex C6. Inverse-map each dest vertex. v is not periodic. */
export function rotateScaffoldField(
  field: ArrayLike<number>,
  turns: number,
  center: Cube,
  fu = 10,
  fv = 4,
): Float32Array {
  const out = new Float32Array(SCAFFOLD_VERTEX_COUNT);
  const n = ((turns % 6) + 6) % 6;
  if (n === 0) {
    for (let i = 0; i < out.length; i++) out[i] = field[i] ?? 0;
    return out;
  }
  for (let ring = 0; ring < SCAFFOLD_RINGS; ring++) {
    const v = ring / (SCAFFOLD_RINGS - 1);
    for (let sector = 0; sector < SCAFFOLD_SECTORS; sector++) {
      const u = sector / SCAFFOLD_SECTORS;
      const src = cubeToUv(
        cubeRotate60About(uvToCube(u, v, fu, fv), center, -n),
        fu,
        fv,
      );
      out[ring * SCAFFOLD_SECTORS + sector] = sampleFieldBilinear(field, src.u, src.v);
    }
  }
  return out;
}

/** Cylinder isometry: dest sector s reads source s − k. 40 steps = identity. */
export function spinScaffoldField(field: ArrayLike<number>, sectors: number): Float32Array {
  const out = new Float32Array(SCAFFOLD_VERTEX_COUNT);
  const k = ((Math.round(sectors) % SCAFFOLD_SECTORS) + SCAFFOLD_SECTORS) % SCAFFOLD_SECTORS;
  if (k === 0) {
    for (let i = 0; i < out.length; i++) out[i] = field[i] ?? 0;
    return out;
  }
  for (let ring = 0; ring < SCAFFOLD_RINGS; ring++) {
    const row = ring * SCAFFOLD_SECTORS;
    for (let sector = 0; sector < SCAFFOLD_SECTORS; sector++) {
      const src = (sector - k + SCAFFOLD_SECTORS) % SCAFFOLD_SECTORS;
      out[row + sector] = field[row + src] ?? 0;
    }
  }
  return out;
}

function wrap01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const w = n - Math.floor(n);
  return w < 0 ? w + 1 : w;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n <= 0 ? 0 : n >= 1 ? 1 : n;
}
