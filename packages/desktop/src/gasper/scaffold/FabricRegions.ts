/**
 * Named soft regions on the locked 25×40 fabric.
 * A vertex can belong to more than one region. Weights are not a partition.
 * Isolate uses these weights so a morph in one region does not leak.
 */
import { SCAFFOLD_RINGS, SCAFFOLD_SECTORS, SCAFFOLD_VERTEX_COUNT } from "./AdaptiveShellScaffold";

export const FABRIC_REGION_IDS = [
  "crown",
  "face",
  "torso",
  "leftLobe",
  "rightLobe",
  "crotch",
  "leftLeg",
  "rightLeg",
  "feet",
] as const;

export type FabricRegionId = (typeof FABRIC_REGION_IDS)[number];

export type RegionGate = {
  v0: number;
  v1: number;
  u0?: number;
  u1?: number;
  wrap?: boolean;
};

/** Soft boxes in polar UV. u wraps. v clamps. */
export const FABRIC_REGION_GATES: Record<FabricRegionId, RegionGate> = {
  crown: { v0: 0.0, v1: 0.22 },
  face: { v0: 0.28, v1: 0.58 },
  torso: { v0: 0.36, v1: 0.72 },
  leftLobe: { v0: 0.38, v1: 0.7, u0: 0.72, u1: 0.98, wrap: false },
  rightLobe: { v0: 0.38, v1: 0.7, u0: 0.02, u1: 0.28, wrap: false },
  crotch: { v0: 0.62, v1: 0.8, u0: 0.38, u1: 0.62 },
  leftLeg: { v0: 0.7, v1: 0.94, u0: 0.52, u1: 0.88 },
  rightLeg: { v0: 0.7, v1: 0.94, u0: 0.12, u1: 0.48 },
  feet: { v0: 0.86, v1: 1.0 },
};

const WEIGHTS: Record<FabricRegionId, Float32Array> = {} as Record<FabricRegionId, Float32Array>;

function wrapDist(u: number, a: number, b: number): number {
  if (u >= a && u <= b) return 0;
  const left = Math.min(Math.abs(u - a), Math.abs(u - 1 - a), Math.abs(u + 1 - a));
  const right = Math.min(Math.abs(u - b), Math.abs(u - 1 - b), Math.abs(u + 1 - b));
  return Math.min(left, right);
}

function gateWeight(u: number, v: number, gate: RegionGate): number {
  const vm = (gate.v0 + gate.v1) / 2;
  const vh = Math.max(0.04, (gate.v1 - gate.v0) / 2);
  const dv = Math.abs(v - vm) / vh;
  if (dv >= 1.25) return 0;
  const wv = dv <= 1 ? 1 : 1 - (dv - 1) / 0.25;
  if (gate.u0 == null || gate.u1 == null) return wv * wv;
  const um = (gate.u0 + gate.u1) / 2;
  const uh = Math.max(0.04, (gate.u1 - gate.u0) / 2);
  let du: number;
  if (gate.wrap) {
    let d = Math.abs(u - um);
    if (d > 0.5) d = 1 - d;
    du = d / uh;
  } else {
    du = wrapDist(u, gate.u0, gate.u1) === 0 ? Math.abs(u - um) / uh : 1.2;
    if (u >= gate.u0 && u <= gate.u1) du = Math.abs(u - um) / uh;
    else du = 1.2;
  }
  if (du >= 1.25) return 0;
  const wu = du <= 1 ? 1 : 1 - (du - 1) / 0.25;
  return wv * wv * wu * wu;
}

function buildWeights(id: FabricRegionId): Float32Array {
  const out = new Float32Array(SCAFFOLD_VERTEX_COUNT);
  const gate = FABRIC_REGION_GATES[id];
  for (let r = 0; r < SCAFFOLD_RINGS; r++) {
    const v = r / (SCAFFOLD_RINGS - 1);
    for (let s = 0; s < SCAFFOLD_SECTORS; s++) {
      const u = s / SCAFFOLD_SECTORS;
      out[r * SCAFFOLD_SECTORS + s] = gateWeight(u, v, gate);
    }
  }
  return out;
}

export function regionWeights(id: FabricRegionId): Float32Array {
  if (!WEIGHTS[id]) WEIGHTS[id] = buildWeights(id);
  return WEIGHTS[id];
}

export function regionIndex(id: FabricRegionId, threshold = 0.35): number[] {
  const w = regionWeights(id);
  const out: number[] = [];
  for (let i = 0; i < w.length; i++) if ((w[i] ?? 0) >= threshold) out.push(i);
  return out;
}

export function dermisMaskAt(index: number): number {
  const r = Math.floor(index / SCAFFOLD_SECTORS);
  const v = r / (SCAFFOLD_RINGS - 1);
  if (v < 0.08 || v > 0.97) return 0;
  return 1;
}
