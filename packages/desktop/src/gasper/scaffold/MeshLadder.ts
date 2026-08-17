/**
 * Polar density ladder. Identity is 25×40.
 * Refine by even meridians + inserted rings (2R−1, 2S). Never remesh.
 */
export const MESH_IDENTITY_RINGS = 25 as const;
export const MESH_IDENTITY_SECTORS = 40 as const;

export type MeshLod = 1 | 2;

export type MeshTopo = {
  lod: MeshLod;
  rings: number;
  sectors: number;
  vertexCount: number;
};

export const MESH_LODS: Record<MeshLod, MeshTopo> = {
  1: { lod: 1, rings: 25, sectors: 40, vertexCount: 1000 },
  2: { lod: 2, rings: 49, sectors: 80, vertexCount: 3920 },
};

export function topoAt(lod: MeshLod): MeshTopo {
  return MESH_LODS[lod];
}

export function lodForMorph(morph: string): MeshLod {
  return morph === "paddle" || morph === "remote" ? 2 : 1;
}

export function restPolarMesh(rings: number, sectors: number, radius = 72): Float32Array {
  const xy = new Float32Array(rings * sectors * 2);
  for (let r = 0; r < rings; r++) {
    const v = r / Math.max(1, rings - 1);
    for (let s = 0; s < sectors; s++) {
      const th = (s / sectors) * Math.PI * 2 - Math.PI / 2;
      const i = r * sectors + s;
      xy[i * 2] = radius * v * Math.cos(th);
      xy[i * 2 + 1] = radius * v * Math.sin(th);
    }
  }
  return xy;
}

export function sampleMesh(
  src: Float32Array,
  srcR: number,
  srcS: number,
  u: number,
  v: number,
): { x: number; y: number } {
  const rf = Math.max(0, Math.min(srcR - 1, v * (srcR - 1)));
  const r0 = Math.floor(rf);
  const r1 = Math.min(srcR - 1, r0 + 1);
  const fr = rf - r0;
  const sf = ((u % 1) + 1) % 1 * srcS;
  const s0 = Math.floor(sf) % srcS;
  const s1 = (s0 + 1) % srcS;
  const fs = sf - Math.floor(sf);
  const p = (r: number, s: number) => {
    const i = r * srcS + s;
    return { x: src[i * 2] ?? 0, y: src[i * 2 + 1] ?? 0 };
  };
  const a = p(r0, s0);
  const b = p(r0, s1);
  const c = p(r1, s0);
  const d = p(r1, s1);
  return {
    x: (a.x * (1 - fs) + b.x * fs) * (1 - fr) + (c.x * (1 - fs) + d.x * fs) * fr,
    y: (a.y * (1 - fs) + b.y * fs) * (1 - fr) + (c.y * (1 - fs) + d.y * fs) * fr,
  };
}

export function resampleMesh(
  src: Float32Array,
  srcR: number,
  srcS: number,
  dstR: number,
  dstS: number,
): Float32Array {
  const out = new Float32Array(dstR * dstS * 2);
  for (let r = 0; r < dstR; r++) {
    const v = r / Math.max(1, dstR - 1);
    for (let s = 0; s < dstS; s++) {
      const p = sampleMesh(src, srcR, srcS, s / dstS, v);
      const i = r * dstS + s;
      out[i * 2] = p.x;
      out[i * 2 + 1] = p.y;
    }
  }
  return out;
}

export function maxEdgeStrain(xy: Float32Array, rest: Float32Array, rings: number, sectors: number): number {
  let peak = 0;
  const n = rings * sectors;
  const edge = (i: number, j: number) => {
    const live = Math.hypot((xy[i * 2] ?? 0) - (xy[j * 2] ?? 0), (xy[i * 2 + 1] ?? 0) - (xy[j * 2 + 1] ?? 0));
    const r0 = Math.hypot((rest[i * 2] ?? 0) - (rest[j * 2] ?? 0), (rest[i * 2 + 1] ?? 0) - (rest[j * 2 + 1] ?? 0));
    if (r0 < 1e-4) return;
    peak = Math.max(peak, live / r0);
  };
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < sectors; s++) {
      const i = r * sectors + s;
      edge(i, r * sectors + ((s + 1) % sectors));
      if (r + 1 < rings) edge(i, (r + 1) * sectors + s);
    }
  }
  return peak || (n ? 1 : 0);
}
