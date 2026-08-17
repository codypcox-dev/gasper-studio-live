/**
 * Goose — follicle lattice on the locked 25×40 cage.
 *
 * ThinkOps duals killed:
 *   ellipse-stipple = goosebumps
 *   quad-shader     = papule
 *   offset-UV-Euclidean = hex-lattice
 *
 * Law: the 1000 vertices ARE the skin. Cube arithmetic owns distance.
 * Coarse tile is cage-commensurate (fu | 20, fv | 24). Fine is the dual
 * (edge midpoints), not a second incommensurate lattice.
 *
 *   s[i] = A · dermis(v) · (w_c · ker(d_hex)² + w_f · ker(d_dual))
 *   P'   = P + n̂ · s · lift
 *   follicleShade(P', sites_coarse(s))  and  scaffoldRimFromRelief(s)
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
  hexDualDistance,
  hexKernel,
  hexSiteDistance,
  oddRToCube,
  uvToCube,
} from "./HexCube";

export const GOOSE_LAW = "follicle-lattice-on-1000" as const;
export const GOOSE_SHADE = "rounded-mound-at-hex-site" as const;
export const GOOSE_METRIC = "cube-hex" as const;
/** fu | 20 so odd-r sites land on 40-sector vertices. fv | 24. */
export const GOOSE_COARSE = Object.freeze({ fu: 10, fv: 4, weight: 0.72 });
export const GOOSE_FINE = Object.freeze({ kind: "dual" as const, weight: 0.38 });
export const GOOSE_SIGMA = 0.34;
export const GOOSE_AMPLITUDE = 1.35;
export const GOOSE_PAPULE_FLOOR = 0.16;

export function goosePivot(): Cube {
  // Face-left dermis. Not a lattice point — C6 about a site is invisible.
  return uvToCube(0.18, 0.38, GOOSE_COARSE.fu, GOOSE_COARSE.fv);
}

function queryUv(u: number, v: number, turns: number): { u: number; v: number } {
  const n = ((turns % 6) + 6) % 6;
  if (!n) return { u, v };
  return cubeToUv(
    cubeRotate60About(uvToCube(u, v, GOOSE_COARSE.fu, GOOSE_COARSE.fv), goosePivot(), -n),
    GOOSE_COARSE.fu,
    GOOSE_COARSE.fv,
  );
}

export type GoosePapule = {
  u: number;
  v: number;
  ring: number;
  sector: number;
  octave: "coarse" | "fine";
  height: number;
};

/** Fade crown and feet so papules live on the dermis, not poles. */
export function dermisMask(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0.18) return 0;
  if (v < 0.3) return (v - 0.18) / 0.12;
  if (v > 0.92) return 0;
  if (v > 0.84) return (0.92 - v) / 0.08;
  return 1;
}

/** Hex-metric papule. Distance is cube, not offset-UV Euclidean. */
export function hexPapule(u: number, v: number, fu: number, fv: number): number {
  return hexKernel(hexSiteDistance(u, v, fu, fv), GOOSE_SIGMA);
}

export function hexDualPapule(u: number, v: number, fu: number, fv: number): number {
  return hexKernel(hexDualDistance(u, v, fu, fv), GOOSE_SIGMA);
}

function cageIndex(u: number, v: number): { ring: number; sector: number } {
  const ring = Math.max(0, Math.min(SCAFFOLD_RINGS - 1, Math.round(v * (SCAFFOLD_RINGS - 1))));
  const sector =
    ((Math.round(u * SCAFFOLD_SECTORS) % SCAFFOLD_SECTORS) + SCAFFOLD_SECTORS) %
    SCAFFOLD_SECTORS;
  return { ring, sector };
}

export function evaluateGooseField(
  amplitude: number = GOOSE_AMPLITUDE,
  turns = 0,
): Float32Array {
  const out = new Float32Array(SCAFFOLD_VERTEX_COUNT);
  const amp = Number.isFinite(amplitude) ? amplitude : GOOSE_AMPLITUDE;
  const fu = GOOSE_COARSE.fu;
  const fv = GOOSE_COARSE.fv;
  for (let r = 0; r < SCAFFOLD_RINGS; r++) {
    const v = r / (SCAFFOLD_RINGS - 1);
    const mask = dermisMask(v);
    if (mask <= 0) continue;
    for (let s = 0; s < SCAFFOLD_SECTORS; s++) {
      const q = queryUv(s / SCAFFOLD_SECTORS, v, turns);
      const coarse = hexPapule(q.u, q.v, fu, fv);
      const fine = hexDualPapule(q.u, q.v, fu, fv);
      out[r * SCAFFOLD_SECTORS + s] =
        amp * mask * (GOOSE_COARSE.weight * coarse * coarse + GOOSE_FINE.weight * fine);
    }
  }
  return out;
}

/**
 * Coarse hex-lattice sites on the cage. Fine octave is dual grain only.
 */
export function collectGoosePapules(
  field: Float32Array,
  floor: number = GOOSE_PAPULE_FLOOR,
  turns = 0,
): GoosePapule[] {
  const out: GoosePapule[] = [];
  const fv = GOOSE_COARSE.fv;
  const fu = GOOSE_COARSE.fu;
  const n = ((turns % 6) + 6) % 6;
  const pivot = goosePivot();
  for (let row = 0; row <= fv; row++) {
    const v0 = row / fv;
    if (dermisMask(v0) <= 0 && n === 0) continue;
    for (let col = 0; col < fu; col++) {
      let u = (col + (row & 1) * 0.5) / fu;
      let v = v0;
      if (n) {
        const spun = cubeToUv(cubeRotate60About(oddRToCube(col, row), pivot, n), fu, fv);
        u = spun.u;
        v = spun.v;
      }
      if (dermisMask(v) <= 0) continue;
      const { ring, sector } = cageIndex(u, v);
      const height = field[ring * SCAFFOLD_SECTORS + sector] ?? 0;
      if (height < floor) continue;
      out.push({ u, v, ring, sector, octave: "coarse", height });
    }
  }
  return out;
}

export function gooseFieldEnergy(samples: Float32Array): { rms: number; peak: number; live: number } {
  let sum = 0;
  let peak = 0;
  let live = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i] ?? 0;
    sum += v * v;
    if (v > 0.04) live += 1;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  return { rms: Math.sqrt(sum / (samples.length || 1)), peak, live };
}
