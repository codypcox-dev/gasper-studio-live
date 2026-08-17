/**
 * Cage light — every 1000 vertex is a sample of a living surface.
 *
 * Duals killed:
 *   overlay-ellipse = lighting
 *   quad-tile       = papule
 *
 * Law: the cage is the skin. Displace rest-radial, rebuild n̂ from
 * the 4-neighbor stencil, Lambert + Blinn against view-fixed lights
 * (same dirs as LightRig). Body tilt counter-rotates L so highlights
 * crawl when he leans — the room does not spin with him.
 *
 *   n̂_i = normalize( ∂P/∂u × ∂P/∂v )
 *   I   = Σ L_k · (wrap Lambert + spec)
 *   P'  = P + r̂ · s_i
 */
import {
  SCAFFOLD_RINGS,
  SCAFFOLD_SECTORS,
  SCAFFOLD_VERTEX_COUNT,
} from "./AdaptiveShellScaffold";

export const CAGE_LIGHT_LAW = "n-dot-L-on-1000" as const;
export const CAGE_LIGHTS = Object.freeze([
  Object.freeze({ x: -0.55, y: -0.65, z: 0.52, I: 1.0, role: "key" as const }),
  Object.freeze({ x: 0.6, y: 0.35, z: 0.55, I: 0.35, role: "fill" as const }),
  Object.freeze({ x: 0.1, y: -0.75, z: -0.6, I: 0.45, role: "rim" as const }),
]);

export type CageNormal = { nx: number; ny: number; nz: number; lam: number; spec: number };

export function rotateLightXY(
  light: { x: number; y: number; z: number; I: number },
  tiltDeg: number,
): { x: number; y: number; z: number; I: number } {
  const th = (-tiltDeg * Math.PI) / 180;
  const c = Math.cos(th);
  const s = Math.sin(th);
  return { x: light.x * c - light.y * s, y: light.x * s + light.y * c, z: light.z, I: light.I };
}

export function cageNormalAt(
  px: ArrayLike<number>,
  py: ArrayLike<number>,
  heights: ArrayLike<number>,
  ring: number,
  sector: number,
  heightPx: number,
): CageNormal {
  const R = SCAFFOLD_RINGS;
  const S = SCAFFOLD_SECTORS;
  const s1 = (sector + 1) % S;
  const r1 = Math.min(R - 1, ring + 1);
  const i = ring * S + sector;
  const iu = ring * S + s1;
  const iv = r1 * S + sector;
  const ux = (px[iu] ?? 0) - (px[i] ?? 0);
  const uy = (py[iu] ?? 0) - (py[i] ?? 0);
  const uz = ((heights[iu] ?? 0) - (heights[i] ?? 0)) * heightPx;
  const vx = (px[iv] ?? 0) - (px[i] ?? 0);
  const vy = (py[iv] ?? 0) - (py[i] ?? 0);
  const vz = ((heights[iv] ?? 0) - (heights[i] ?? 0)) * heightPx;
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  if (nz < 0) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }
  const nl = Math.hypot(nx, ny, nz) || 1;
  nx /= nl;
  ny /= nl;
  nz /= nl;
  return { nx, ny, nz, lam: 0, spec: 0 };
}

export function lightCageVertex(
  n: CageNormal,
  lights: readonly { x: number; y: number; z: number; I: number }[],
): CageNormal {
  let lam = 0;
  let spec = 0;
  for (const L of lights) {
    const ndl = n.nx * L.x + n.ny * L.y + n.nz * L.z;
    lam += L.I * Math.max(0, ndl);
    const hx = L.x;
    const hy = L.y;
    const hz = L.z + 1;
    const hl = Math.hypot(hx, hy, hz) || 1;
    spec += L.I * Math.pow(Math.max(0, n.nx * hx / hl + n.ny * hy / hl + n.nz * hz / hl), 14);
  }
  return { ...n, lam, spec };
}

export function fieldHasEnergy(samples: ArrayLike<number>, floor = 0.04): boolean {
  if (!samples || samples.length !== SCAFFOLD_VERTEX_COUNT) return false;
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i] ?? 0) > floor) return true;
  }
  return false;
}
