/**
 * PBR on the cage. GGX + Smith + Schlick. Canonical gloss defaults.
 */
import { CAGE_LIGHTS } from "./CageLight";
import { CANON_GLOSS, coatAlpha } from "./GasperPrincipled";
import { rotateYawXYZ } from "./Mesh3D";

export const SURFACE_AMBIENT = 0.08;
export const DIELECTRIC_F0 = CANON_GLOSS.f0;

export function vertexNormal(
  xyz: Float32Array,
  rings: number,
  sectors: number,
  r: number,
  s: number,
): { nx: number; ny: number; nz: number } {
  const at = (rr: number, ss: number) => {
    const i = rr * sectors + ((ss % sectors) + sectors) % sectors;
    return { x: xyz[i * 3] ?? 0, y: xyz[i * 3 + 1] ?? 0, z: xyz[i * 3 + 2] ?? 0 };
  };
  const p = at(r, s);
  const pu = at(r, s + 1);
  const pv = at(Math.min(rings - 1, r + 1), s);
  const ux = pu.x - p.x;
  const uy = pu.y - p.y;
  const uz = pu.z - p.z;
  const vx = pv.x - p.x;
  const vy = pv.y - p.y;
  const vz = pv.z - p.z;
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  if (nz < 0) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }
  const n = Math.hypot(nx, ny, nz) || 1;
  return { nx: nx / n, ny: ny / n, nz: nz / n };
}

function ggxD(ndh: number, a: number): number {
  const a2 = a * a;
  const d = ndh * ndh * (a2 - 1) + 1;
  return a2 / (Math.PI * d * d);
}

function smithG1(ndk: number, a: number): number {
  const a2 = a * a;
  return (2 * ndk) / (ndk + Math.sqrt(a2 + (1 - a2) * ndk * ndk));
}

function schlickF(vdh: number, f0 = DIELECTRIC_F0): number {
  const m = 1 - Math.max(0, vdh);
  return f0 + (1 - f0) * m * m * m * m * m;
}

export function rotateLightYaw(
  light: { x: number; y: number; z: number; I: number; role: string },
  yawDeg: number,
): { x: number; y: number; z: number; I: number; role: string } {
  const a = (-yawDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: light.x * c + light.z * s, y: light.y, z: -light.x * s + light.z * c, I: light.I, role: light.role };
}

export function loftXYZFromHull(
  xy: Float32Array,
  rings: number,
  sectors: number,
  cx = 120,
  cy = 110,
  thickness = 56,
): Float32Array {
  const xyz = new Float32Array(rings * sectors * 3);
  for (let r = 0; r < rings; r++) {
    const v = r / Math.max(1, rings - 1);
    const z = thickness * Math.sqrt(Math.max(0, 1 - v * v));
    for (let s = 0; s < sectors; s++) {
      const i = r * sectors + s;
      xyz[i * 3] = (xy[i * 2] ?? cx) - cx;
      xyz[i * 3 + 1] = (xy[i * 2 + 1] ?? cy) - cy;
      xyz[i * 3 + 2] = z;
    }
  }
  return xyz;
}

export function shadeNormal(
  n: { nx: number; ny: number; nz: number },
  roughness = CANON_GLOSS.roughness,
  clearcoat = CANON_GLOSS.clearcoat,
  lights: readonly { x: number; y: number; z: number; I: number }[] = CAGE_LIGHTS,
): { lam: number; spec: number; I: number } {
  const live =
    ((globalThis as { __GASPER_LIVE_COEFFS__?: { cageLight?: Record<string, number> } }).__GASPER_LIVE_COEFFS__
      ?.cageLight) || {};
  const wrap = Math.max(0.04, Math.min(0.55, 0.22 + 0.2 * (Number(live.light_wrap) || 0)));
  const specGain = Math.max(0.35, Math.min(2.2, 1 + 0.85 * (Number(live.light_spec) || 0)));
  const soft = Math.max(-0.7, Math.min(0.7, Number(live.light_soft) || 0));
  const a = Math.max(0.035, roughness * roughness * (1 + 0.55 * soft));
  const ac = coatAlpha();
  const displayPow = Math.max(24, 56 - 22 * soft);
  const coatPow = Math.max(32, 72 - 24 * soft);
  let lam = 0;
  let spec = 0;
  let coat = 0;
  for (const L of lights) {
    const ndlRaw = n.nx * L.x + n.ny * L.y + n.nz * L.z;
    const ndl = Math.max(0, (ndlRaw + wrap) / (1 + wrap));
    const ndv = Math.max(1e-4, n.nz);
    const hx = L.x;
    const hy = L.y;
    const hz = L.z + 1;
    const hl = Math.hypot(hx, hy, hz) || 1;
    const Hx = hx / hl;
    const Hy = hy / hl;
    const Hz = hz / hl;
    const ndh = Math.max(0, n.nx * Hx + n.ny * Hy + n.nz * Hz);
    const vdh = Math.max(0, Hz);
    const F = schlickF(vdh);
    const D = ggxD(ndh, a);
    const G = smithG1(ndl, a) * smithG1(ndv, a);
    const denom = Math.max(1e-4, 4 * ndl * ndv);
    const micro = ((D * G * F) / denom) * ndl;
    const display = Math.pow(ndh, displayPow) * Math.max(0, ndlRaw);
    spec += L.I * (micro * 2.2 + display * 0.85) * specGain;
    lam += L.I * Math.max(0, ndlRaw) * (1 - F);
    const Dc = ggxD(ndh, ac);
    const Gc = smithG1(ndl, ac) * smithG1(ndv, ac);
    coat += L.I * ((Dc * Gc * schlickF(vdh)) / denom) * ndl * 1.6 + L.I * Math.pow(ndh, coatPow) * Math.max(0, ndlRaw) * 0.55;
  }
  const specOut = Math.min(1.2, spec + clearcoat * coat);
  const I = Math.max(0, Math.min(1.6, SURFACE_AMBIENT + 0.42 * lam + specOut));
  return { lam, spec: specOut, I };
}

export function shadeMesh(
  xyz: Float32Array,
  rings: number,
  sectors: number,
  yawDeg: number,
  roughness = CANON_GLOSS.roughness,
  clearcoat = CANON_GLOSS.clearcoat,
): { intensity: Float32Array; spec: Float32Array; lam: Float32Array } {
  const rotated = rotateYawXYZ(xyz, yawDeg);
  const lights = CAGE_LIGHTS.map((L) => rotateLightYaw(L, yawDeg));
  const intensity = new Float32Array(rings * sectors);
  const spec = new Float32Array(rings * sectors);
  const lam = new Float32Array(rings * sectors);
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < sectors; s++) {
      const sh = shadeNormal(vertexNormal(rotated, rings, sectors, r, s), roughness, clearcoat, lights);
      const i = r * sectors + s;
      intensity[i] = sh.I;
      spec[i] = sh.spec;
      lam[i] = sh.lam;
    }
  }
  return { intensity, spec, lam };
}

export type SpecLobe = { x: number; y: number; peak: number; role: string };

export function specLobes(
  xyz: Float32Array,
  spec: Float32Array,
  rings: number,
  sectors: number,
  yawDeg: number,
): SpecLobe[] {
  const rotated = rotateYawXYZ(xyz, yawDeg);
  const out: SpecLobe[] = [];
  for (const L of CAGE_LIGHTS) {
    let sx = 0;
    let sy = 0;
    let w = 0;
    let peak = 0;
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < sectors; s++) {
        const i = r * sectors + s;
        const n = vertexNormal(rotated, rings, sectors, r, s);
        const ndl = Math.max(0, n.nx * L.x + n.ny * L.y + n.nz * L.z);
        const py = rotated[i * 3 + 1] ?? 0;
        const crown = L.role === "key" ? Math.max(0, 1 - Math.max(0, py + 6) / 36) : 1;
        const wt = (spec[i] ?? 0) * ndl * ndl * L.I * crown;
        if ((spec[i] ?? 0) * ndl > peak) peak = (spec[i] ?? 0) * ndl;
        if (wt < 1e-8) continue;
        sx += (rotated[i * 3] ?? 0) * wt;
        sy += (rotated[i * 3 + 1] ?? 0) * wt;
        w += wt;
      }
    }
    if (w < 1e-8) continue;
    out.push({ x: sx / w, y: sy / w, peak, role: L.role });
  }
  return out;
}

export function specCentroid(
  xyz: Float32Array,
  spec: Float32Array,
  rings: number,
  sectors: number,
  yawDeg: number,
): { x: number; y: number; peak: number } {
  const lobes = specLobes(xyz, spec, rings, sectors, yawDeg);
  const key = lobes.find((l) => l.role === "key") ?? lobes[0];
  if (!key) return { x: -16, y: -24, peak: 0 };
  return { x: key.x, y: key.y, peak: key.peak };
}

/** Jimenez-style 1-ring blur of irradiance. Short channel for depth. */
export function sssExitance(lam: Float32Array, rings: number, sectors: number): Float32Array {
  const out = new Float32Array(lam.length);
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < sectors; s++) {
      const i = r * sectors + s;
      const sl = (s + sectors - 1) % sectors;
      const sr = (s + 1) % sectors;
      const ru = Math.max(0, r - 1);
      const rd = Math.min(rings - 1, r + 1);
      const self = lam[i] ?? 0;
      const ring =
        (lam[r * sectors + sl] ?? 0) +
        (lam[r * sectors + sr] ?? 0) +
        (lam[ru * sectors + s] ?? 0) +
        (lam[rd * sectors + s] ?? 0);
      out[i] = self * 0.45 + ring * 0.1375;
    }
  }
  return out;
}
