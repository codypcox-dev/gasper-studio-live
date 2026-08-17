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

export function shadeNormal(
  n: { nx: number; ny: number; nz: number },
  roughness = CANON_GLOSS.roughness,
  clearcoat = CANON_GLOSS.clearcoat,
): { lam: number; spec: number; I: number } {
  const a = Math.max(0.04, roughness * roughness);
  const ac = coatAlpha();
  let lam = 0;
  let spec = 0;
  let coat = 0;
  for (const L of CAGE_LIGHTS) {
    const ndl = Math.max(0, n.nx * L.x + n.ny * L.y + n.nz * L.z);
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
    const display = Math.pow(ndh, 28) * ndl;
    spec += L.I * (micro * 3 + display * 0.35);
    lam += L.I * ndl * (1 - F);
    const Dc = ggxD(ndh, ac);
    const Gc = smithG1(ndl, ac) * smithG1(ndv, ac);
    coat += L.I * ((Dc * Gc * schlickF(vdh)) / denom) * ndl * 2 + L.I * Math.pow(ndh, 48) * ndl * 0.35;
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
  const intensity = new Float32Array(rings * sectors);
  const spec = new Float32Array(rings * sectors);
  const lam = new Float32Array(rings * sectors);
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < sectors; s++) {
      const sh = shadeNormal(vertexNormal(rotated, rings, sectors, r, s), roughness, clearcoat);
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
