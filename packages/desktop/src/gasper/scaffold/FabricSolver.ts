/**
 * Living fabric on the 1000. Target embedding + regional inflate/τ.
 * Live field is the skin. Silhouette reads the same scalars.
 * C = Γ(L) + Σs_i. Zero is rest. No remesh. No painted discs.
 */
import {
  SCAFFOLD_RINGS,
  SCAFFOLD_SECTORS,
  SCAFFOLD_VERTEX_COUNT,
} from "./AdaptiveShellScaffold";
import {
  FABRIC_REGION_IDS,
  type FabricRegionId,
  dermisMaskAt,
  regionWeights,
} from "./FabricRegions";
import { embeddingXYZ, restPearlXYZ } from "./Mesh3D";
import { projectAndSilhouette } from "./Silhouette2D";
import { projectFaceOnMesh } from "./FaceOnMesh";
import { shadeMesh, specCentroid, specLobes, sssExitance } from "./SurfaceShader";
import { CANON_GLOSS } from "./GasperPrincipled";
import { lodForMorph, restPolarMesh, topoAt, type MeshLod } from "./MeshLadder";
import { tickArap } from "./ArapSolver";

export const FABRIC_SCHEMA = "gasper.fabric.v1" as const;
export const FABRIC_MORPH_IDS = [
  "rest",
  "puff",
  "pinch",
  "remote",
  "spike",
  "wave",
  "paddle",
] as const;
export type FabricMorphId = (typeof FABRIC_MORPH_IDS)[number];

export type FabricRegionState = {
  inflate: number;
  tau: number;
  isolated: boolean;
};

export type FabricState = {
  schema: typeof FABRIC_SCHEMA;
  morph: FabricMorphId;
  live: Float32Array;
  target: Float32Array;
  regions: Record<FabricRegionId, FabricRegionState>;
  lod: MeshLod;
  rings: number;
  sectors: number;
  liveXY: Float32Array | null;
  restXY: Float32Array | null;
  targetXY: Float32Array | null;
  liveXYZ: Float32Array | null;
  restXYZ: Float32Array | null;
  targetXYZ: Float32Array | null;
};

const DEFAULT_TAU = 0.12;

function emptyRegions(): Record<FabricRegionId, FabricRegionState> {
  const regions = {} as Record<FabricRegionId, FabricRegionState>;
  for (const id of FABRIC_REGION_IDS) {
    regions[id] = { inflate: 0, tau: DEFAULT_TAU, isolated: false };
  }
  return regions;
}

export function createFabricState(): FabricState {
  return {
    schema: FABRIC_SCHEMA,
    morph: "rest",
    live: new Float32Array(SCAFFOLD_VERTEX_COUNT),
    target: new Float32Array(SCAFFOLD_VERTEX_COUNT),
    regions: emptyRegions(),
    lod: 1,
    rings: SCAFFOLD_RINGS,
    sectors: SCAFFOLD_SECTORS,
    liveXY: null,
    restXY: null,
    targetXY: null,
    liveXYZ: null,
    restXYZ: null,
    targetXYZ: null,
  };
}

export function morphEmbedding(id: FabricMorphId, amplitude = 1): Float32Array {
  if (id === "paddle") return paddleEmbedding(amplitude);
  const out = new Float32Array(SCAFFOLD_VERTEX_COUNT);
  const a = Math.max(-2.4, Math.min(2.4, amplitude));
  for (let r = 0; r < SCAFFOLD_RINGS; r++) {
    const v = r / (SCAFFOLD_RINGS - 1);
    for (let s = 0; s < SCAFFOLD_SECTORS; s++) {
      const i = r * SCAFFOLD_SECTORS + s;
      const u = s / SCAFFOLD_SECTORS;
      const skin = dermisMaskAt(i);
      if (!skin || v > 0.78) continue;
      let h = 0;
      if (id === "puff") h = 1.15 * skin;
      else if (id === "pinch") h = -0.85 * Math.exp(-Math.pow((v - 0.52) / 0.16, 2));
      else if (id === "remote") {
        const boxV = v > 0.18 && v < 0.82 ? 0.7 : -0.45;
        const side = Math.min(Math.abs(u - 0.12), Math.abs(u - 0.88), Math.abs(u - 0.0));
        const ear = Math.exp(-Math.pow(side / 0.1, 2)) * 0.9;
        h = boxV + ear;
      } else if (id === "spike") h = 1.6 * Math.exp(-Math.pow((v - 0.08) / 0.1, 2));
      else if (id === "wave") h = 0.7 * Math.sin(u * Math.PI * 6) * Math.sin(v * Math.PI);
      out[i] = h * a;
    }
  }
  return out;
}

function paddleEmbedding(amplitude = 1): Float32Array {
  const a = Math.max(0.2, Math.min(1.4, amplitude));
  const out = new Float32Array(SCAFFOLD_VERTEX_COUNT);
  out.fill(a);
  return out;
}

function bindMesh(state: FabricState, id: FabricMorphId): void {
  const lod = lodForMorph(id);
  const topo = topoAt(lod);
  state.lod = lod;
  state.rings = topo.rings;
  state.sectors = topo.sectors;
  if (id === "paddle") {
    const xyz = embeddingXYZ(id, topo.rings, topo.sectors);
    state.restXYZ = xyz;
    state.targetXYZ = xyz.slice();
    state.liveXYZ = xyz.slice();
    const { xy } = projectAndSilhouette(xyz, 0, topo.rings, topo.sectors);
    state.restXY = xy;
    state.targetXY = xy.slice();
    state.liveXY = xy.slice();
    return;
  }
  state.restXYZ = null;
  state.targetXYZ = null;
  state.liveXYZ = null;
  state.restXY = restPolarMesh(topo.rings, topo.sectors);
  state.targetXY = null;
  state.liveXY = null;
}

export function composeTarget(state: FabricState): Float32Array {
  const target = new Float32Array(state.target);
  const isolated = FABRIC_REGION_IDS.filter((id) => state.regions[id].isolated);
  if (isolated.length) {
    const allow = new Float32Array(SCAFFOLD_VERTEX_COUNT);
    for (const id of isolated) {
      const w = regionWeights(id);
      for (let i = 0; i < allow.length; i++) allow[i] = Math.max(allow[i] ?? 0, w[i] ?? 0);
    }
    for (let i = 0; i < target.length; i++) target[i] *= allow[i] ?? 0;
  }
  for (const id of FABRIC_REGION_IDS) {
    const inflate = state.regions[id].inflate;
    if (Math.abs(inflate) < 1e-4) continue;
    const w = regionWeights(id);
    for (let i = 0; i < target.length; i++) target[i] += (w[i] ?? 0) * inflate;
  }
  return target;
}

export function tickFabric(state: FabricState, dt: number): Float32Array {
  const step = Number.isFinite(dt) ? Math.max(0, Math.min(0.08, dt)) : 1 / 60;
  const goal = composeTarget(state);
  const host = globalThis as {
    __GASPER_PLANT_SIDE__?: number;
    __GASPER_GAIT_LIVE__?: number;
    __GASPER_VISCO_TAU__?: number;
    __GASPER_STANCE__?: { live?: number; side?: number; left?: { tau?: number }; right?: { tau?: number } };
  };
  const stance = host.__GASPER_STANCE__;
  const plantSide =
    stance && Number(stance.live) > 0.004
      ? Number(stance.side) || 0
      : Number(host.__GASPER_PLANT_SIDE__) || 0;
  const gaitLive =
    stance && Number.isFinite(Number(stance.live))
      ? Math.max(0, Math.min(1, Number(stance.live) || 0))
      : Number(host.__GASPER_GAIT_LIVE__) || 0;
  const swingTau = Math.max(0.04, Math.min(1, Number(host.__GASPER_VISCO_TAU__) || DEFAULT_TAU));
  const tauField = new Float32Array(SCAFFOLD_VERTEX_COUNT);
  tauField.fill(gaitLive > 0.004 ? swingTau : DEFAULT_TAU);
  for (const id of FABRIC_REGION_IDS) {
    const tau = Math.max(0.02, state.regions[id].tau);
    const w = regionWeights(id);
    for (let i = 0; i < tauField.length; i++) {
      const ww = w[i] ?? 0;
      if (ww > 0.05) tauField[i] = tauField[i] * (1 - ww) + tau * ww;
    }
  }
  if (gaitLive > 0.004 && plantSide !== 0) {
    const plantTau =
      plantSide > 0
        ? Math.max(0.02, Number(stance?.right?.tau) || 0.02)
        : Math.max(0.02, Number(stance?.left?.tau) || 0.02);
    const plantIds: FabricRegionId[] = plantSide > 0 ? ["rightLeg", "feet"] : ["leftLeg", "feet"];
    for (const id of plantIds) {
      const w = regionWeights(id);
      for (let i = 0; i < tauField.length; i++) {
        const ww = w[i] ?? 0;
        if (ww > 0.05) tauField[i] = tauField[i] * (1 - ww) + plantTau * ww;
      }
    }
  }
  for (let i = 0; i < state.live.length; i++) {
    const tau = tauField[i] ?? DEFAULT_TAU;
    const k = 1 - Math.exp(-step / tau);
    const cur = state.live[i] ?? 0;
    state.live[i] = cur + k * ((goal[i] ?? 0) - cur);
  }
  const tauAt = (vert: number): number => {
    if (state.rings === SCAFFOLD_RINGS && state.sectors === SCAFFOLD_SECTORS) {
      return tauField[vert] ?? DEFAULT_TAU;
    }
    const r = Math.floor(vert / state.sectors);
    const s = vert % state.sectors;
    const rr = Math.round((r / Math.max(1, state.rings - 1)) * (SCAFFOLD_RINGS - 1));
    const ss = Math.round((s / Math.max(1, state.sectors)) * SCAFFOLD_SECTORS) % SCAFFOLD_SECTORS;
    return tauField[rr * SCAFFOLD_SECTORS + ss] ?? DEFAULT_TAU;
  };
  if (state.liveXYZ && state.targetXYZ && state.restXYZ) {
    for (let i = 0; i < state.rings * state.sectors; i++) {
      const k = 1 - Math.exp(-step / tauAt(i));
      const o = i * 3;
      for (let c = 0; c < 3; c++) {
        const cur = state.liveXYZ[o + c] ?? 0;
        state.liveXYZ[o + c] = cur + k * ((state.targetXYZ[o + c] ?? 0) - cur);
      }
    }
    const yaw =
      Number((globalThis as { __GASPER_VIEW_YAW__?: number }).__GASPER_VIEW_YAW__) || 0;
    const view = projectAndSilhouette(state.liveXYZ, yaw, state.rings, state.sectors);
    state.liveXY = view.xy;
  } else if (state.liveXY && state.targetXY && state.restXY) {
    for (let i = 0; i < state.rings * state.sectors; i++) {
      const k = 1 - Math.exp(-step / tauAt(i));
      const o = i * 2;
      for (let c = 0; c < 2; c++) {
        const cur = state.liveXY[o + c] ?? 0;
        state.liveXY[o + c] = cur + k * ((state.targetXY[o + c] ?? 0) - cur);
      }
    }
    tickArap(state.liveXY, state.restXY, state.rings, state.sectors, {
      lockTo: state.targetXY,
      faceLock: true,
      iterations: 4,
    });
  }
  publishFabric(state);
  return state.live;
}

export function setMorph(state: FabricState, id: FabricMorphId, amplitude = 1): void {
  state.morph = id;
  state.target.set(morphEmbedding(id, amplitude));
  bindMesh(state, id);
  if (id === "rest") state.live.fill(0);
  if (id === "paddle") {
    state.live.set(state.target);
    if (state.liveXYZ && state.targetXYZ) state.liveXYZ.set(state.targetXYZ);
    if (state.liveXY && state.targetXY) state.liveXY.set(state.targetXY);
  }
}

export function setRegion(
  state: FabricState,
  id: FabricRegionId,
  patch: Partial<FabricRegionState>,
): void {
  state.regions[id] = { ...state.regions[id], ...patch };
}

export function fabricPeak(field: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < field.length; i++) {
    const a = Math.abs(field[i] ?? 0);
    if (a > peak) peak = a;
  }
  return peak;
}

export function publishFabric(state: FabricState): void {
  const g = globalThis as {
    __GASPER_FABRIC_LIVE__?: Float32Array;
    __GASPER_FABRIC_TARGET__?: Float32Array;
    __GASPER_FABRIC_ON__?: boolean;
    __GASPER_FABRIC_POS__?: Float32Array;
    __GASPER_FABRIC_OUTLINE__?: Float32Array;
    __GASPER_FABRIC_TOPO__?: { rings: number; sectors: number; lod: MeshLod; vertexCount: number };
    __GASPER_VIEW_YAW__?: number;
    __GASPER_FABRIC_XYZ__?: Float32Array;
    __GASPER_SURFACE_SHADE__?: Float32Array;
    __GASPER_SURFACE_SPEC__?: Float32Array;
    __GASPER_SURFACE_LAM__?: Float32Array;
    __GASPER_SPEC_CENTROID__?: { x: number; y: number; peak: number };
    __GASPER_SPEC_LOBES__?: { x: number; y: number; peak: number; role: string }[];
    __GASPER_SSS__?: Float32Array;
    __GASPER_FACE_ON_MESH__?: ReturnType<typeof projectFaceOnMesh>;
    __GASPER_FABRIC__?: { morph: FabricMorphId; peak: number; lod: MeshLod; verts: number; yaw: number };
  };
  const yaw = Number(g.__GASPER_VIEW_YAW__) || 0;
  g.__GASPER_FABRIC_LIVE__ = state.live;
  g.__GASPER_FABRIC_TARGET__ = state.target;
  g.__GASPER_FABRIC_ON__ = state.morph !== "rest";
  g.__GASPER_FABRIC__ = {
    morph: state.morph,
    peak: fabricPeak(state.live),
    lod: state.lod,
    verts: state.rings * state.sectors,
    yaw,
  };
  const xyz = state.liveXYZ ?? restPearlXYZ(state.rings, state.sectors);
  g.__GASPER_FABRIC_XYZ__ = xyz;
  const lit = shadeMesh(xyz, state.rings, state.sectors, yaw, CANON_GLOSS.roughness, CANON_GLOSS.clearcoat);
  g.__GASPER_SURFACE_SHADE__ = lit.intensity;
  g.__GASPER_SURFACE_SPEC__ = lit.spec;
  g.__GASPER_SURFACE_LAM__ = lit.lam;
  g.__GASPER_SPEC_CENTROID__ = specCentroid(xyz, lit.spec, state.rings, state.sectors, yaw);
  g.__GASPER_SPEC_LOBES__ = specLobes(xyz, lit.spec, state.rings, state.sectors, yaw);
  g.__GASPER_SSS__ = sssExitance(lit.lam, state.rings, state.sectors);
  g.__GASPER_FABRIC_TOPO__ = {
    rings: state.rings,
    sectors: state.sectors,
    lod: state.lod,
    vertexCount: state.rings * state.sectors,
  };
  const view = projectAndSilhouette(xyz, yaw, state.rings, state.sectors);
  g.__GASPER_FABRIC_POS__ = view.xy;
  g.__GASPER_FABRIC_OUTLINE__ = view.outline;
  if (state.morph !== "rest") {
    g.__GASPER_FACE_ON_MESH__ = projectFaceOnMesh(xyz, state.rings, state.sectors, yaw);
  } else {
    delete g.__GASPER_FACE_ON_MESH__;
  }
}
