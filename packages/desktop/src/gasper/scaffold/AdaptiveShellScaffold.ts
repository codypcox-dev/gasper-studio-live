/**
 * R6 — Book 009 Adaptive Shell Scaffold contract (not a face painter).
 *
 * 25×40 = 1000 inspectable vertices; optional transient faces / normals / frames.
 * Coupled to the 360/672 Structural Lattice, never merged:
 *
 *   C = Γ(L) + ∑s_i
 *
 * Γ(L) bilinear-samples lattice L onto scaffold UV (wrapped-u, clamped-v).
 * s_i are pressure / relief / captured displacements along the rest normal.
 * Sources do not render. No pupils, lids, brows, cheeks. No fourth face system.
 * Does not replace FormMaster face fixtures. Does not dump frames.
 */
import { GASPER_TOPOLOGY } from "../GasperTopologyLock";
import type { CausalPhysicsGoals, SemanticExpressionIntent } from "../expression/CausalAffectStack";

export const SCAFFOLD_RINGS = 25 as const;
export const SCAFFOLD_SECTORS = 40 as const;
export const SCAFFOLD_VERTEX_COUNT = 1000 as const;
export const SCAFFOLD_FACE_COUNT = 1920 as const;

export const LATTICE_RINGS = 15 as const;
export const LATTICE_SECTORS = 24 as const;
export const LATTICE_NODE_COUNT = 360 as const;
export const LATTICE_TRIANGLE_COUNT = 672 as const;

export const SCAFFOLD_COUPLING_LAW = "C=Γ(L)+∑s_i" as const;

export const SCAFFOLD_SOURCE_KINDS = Object.freeze(["pressure", "relief", "captured"] as const);
export type ScaffoldSourceKind = (typeof SCAFFOLD_SOURCE_KINDS)[number];

export const SCAFFOLD_FORBIDDEN = Object.freeze([
  "face-author",
  "fourth-face-system",
  "pupils",
  "lids",
  "brows",
  "cheeks",
  "blendshape",
  "fixture-id",
  "silhouette-merge",
  "lattice-merge",
] as const);

export type Vec3 = readonly [number, number, number];

export type ScaffoldSource = Readonly<{
  kind: ScaffoldSourceKind;
  /** 0 ⇒ exact +0 contribution (byte-stable identity). */
  amplitude: number;
  /** 1000 signed rest-normal displacements. */
  samples: Float32Array;
}>;

export type LocalFrame = Readonly<{
  origin: Vec3;
  tangent: Vec3;
  bitangent: Vec3;
  normal: Vec3;
}>;

export type ScaffoldCoupling = Readonly<{
  law: typeof SCAFFOLD_COUPLING_LAW;
  latticeNodes: typeof LATTICE_NODE_COUNT;
  latticeTriangles: typeof LATTICE_TRIANGLE_COUNT;
  contourSamples: typeof GASPER_TOPOLOGY.contourSamples;
  merged: false;
  changesSilhouetteTopology: false;
  changesFaceTopology: false;
  paintsFace: false;
  faceAuthor: false;
}>;

export type AdaptiveShellFrame = Readonly<{
  schema: "gasper.adaptive-shell-scaffold.v1";
  rings: typeof SCAFFOLD_RINGS;
  sectors: typeof SCAFFOLD_SECTORS;
  vertexCount: typeof SCAFFOLD_VERTEX_COUNT;
  faceCount: typeof SCAFFOLD_FACE_COUNT;
  vertices: Float32Array;
  faces?: Uint16Array;
  normals?: Float32Array;
  frames?: readonly LocalFrame[];
  coupling: ScaffoldCoupling;
}>;

export const SCAFFOLD_COUPLING: ScaffoldCoupling = Object.freeze({
  law: SCAFFOLD_COUPLING_LAW,
  latticeNodes: LATTICE_NODE_COUNT,
  latticeTriangles: LATTICE_TRIANGLE_COUNT,
  contourSamples: GASPER_TOPOLOGY.contourSamples,
  merged: false,
  changesSilhouetteTopology: false,
  changesFaceTopology: false,
  paintsFace: false,
  faceAuthor: false,
});

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n <= 0 ? 0 : n >= 1 ? 1 : n;
}

function wrap01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const w = n - Math.floor(n);
  return w < 0 ? w + 1 : w;
}

function positiveZeroFill(out: Float32Array): Float32Array {
  for (let i = 0; i < out.length; i++) out[i] = 0;
  return out;
}

/** Rest pearl at UV (u wrapped, v clamped). Contract geometry — not a painted face. */
export function pearlPoint(u: number, v: number): Vec3 {
  const vv = clamp01(v);
  const uu = wrap01(u);
  const theta = vv * Math.PI;
  const phi = uu * Math.PI * 2;
  const s = Math.sin(theta);
  return [s * Math.cos(phi), Math.cos(theta), s * Math.sin(phi)];
}

export function scaffoldUV(index: number): { u: number; v: number; ring: number; sector: number } {
  const ring = Math.floor(index / SCAFFOLD_SECTORS);
  const sector = index - ring * SCAFFOLD_SECTORS;
  return {
    ring,
    sector,
    u: sector / SCAFFOLD_SECTORS,
    v: ring / (SCAFFOLD_RINGS - 1),
  };
}

export function restLatticeNodes(): Float32Array {
  const out = new Float32Array(LATTICE_NODE_COUNT * 3);
  for (let r = 0; r < LATTICE_RINGS; r++) {
    const v = r / (LATTICE_RINGS - 1);
    for (let s = 0; s < LATTICE_SECTORS; s++) {
      const i = (r * LATTICE_SECTORS + s) * 3;
      const p = pearlPoint(s / LATTICE_SECTORS, v);
      out[i] = p[0];
      out[i + 1] = p[1];
      out[i + 2] = p[2];
    }
  }
  return out;
}

function latticeIndex(ring: number, sector: number): number {
  return (ring * LATTICE_SECTORS + sector) * 3;
}

/**
 * Γ(L): bilinear sample of the 15×24 lattice onto scaffold UV.
 * u wraps (sectors); v clamps (rings). Topologies stay distinct.
 */
export function sampleLattice(lattice: Float32Array, u: number, v: number): Vec3 {
  const vv = clamp01(v) * (LATTICE_RINGS - 1);
  const r0 = Math.min(LATTICE_RINGS - 1, Math.max(0, Math.floor(vv)));
  const r1 = Math.min(LATTICE_RINGS - 1, r0 + 1);
  const tv = vv - r0;
  const uu = wrap01(u) * LATTICE_SECTORS;
  const s0 = Math.floor(uu) % LATTICE_SECTORS;
  const s1 = (s0 + 1) % LATTICE_SECTORS;
  const tu = uu - Math.floor(uu);
  const i00 = latticeIndex(r0, s0);
  const i10 = latticeIndex(r0, s1);
  const i01 = latticeIndex(r1, s0);
  const i11 = latticeIndex(r1, s1);
  const x =
    lattice[i00]! * (1 - tu) * (1 - tv) +
    lattice[i10]! * tu * (1 - tv) +
    lattice[i01]! * (1 - tu) * tv +
    lattice[i11]! * tu * tv;
  const y =
    lattice[i00 + 1]! * (1 - tu) * (1 - tv) +
    lattice[i10 + 1]! * tu * (1 - tv) +
    lattice[i01 + 1]! * (1 - tu) * tv +
    lattice[i11 + 1]! * tu * tv;
  const z =
    lattice[i00 + 2]! * (1 - tu) * (1 - tv) +
    lattice[i10 + 2]! * tu * (1 - tv) +
    lattice[i01 + 2]! * (1 - tu) * tv +
    lattice[i11 + 2]! * tu * tv;
  return [x, y, z];
}

/** Γ(L) evaluated at every scaffold vertex. Does not merge topologies. */
export function latticeCouplingGamma(lattice: Float32Array): Float32Array {
  const out = new Float32Array(SCAFFOLD_VERTEX_COUNT * 3);
  for (let i = 0; i < SCAFFOLD_VERTEX_COUNT; i++) {
    const { u, v } = scaffoldUV(i);
    const p = sampleLattice(lattice, u, v);
    const o = i * 3;
    out[o] = p[0];
    out[o + 1] = p[1];
    out[o + 2] = p[2];
  }
  return out;
}

export function restNormalAt(index: number): Vec3 {
  const { u, v } = scaffoldUV(index);
  return pearlPoint(u, v);
}

export function zeroSource(kind: ScaffoldSourceKind): ScaffoldSource {
  return {
    kind,
    amplitude: 0,
    samples: positiveZeroFill(new Float32Array(SCAFFOLD_VERTEX_COUNT)),
  };
}

export function sourceContribution(sources: readonly ScaffoldSource[], index: number): number {
  let sum = 0;
  for (const src of sources) {
    if (src.amplitude === 0) continue;
    const s = src.samples[index] ?? 0;
    sum += src.amplitude * s;
  }
  return sum;
}

/**
 * C = Γ(L) + ∑s_i
 * Source amplitude 0 copies Γ(L) exactly (no -0, no painter).
 */
export function composeScaffoldVertices(
  lattice: Float32Array,
  sources: readonly ScaffoldSource[] = [],
): Float32Array {
  const gamma = latticeCouplingGamma(lattice);
  const out = new Float32Array(gamma);
  for (let i = 0; i < SCAFFOLD_VERTEX_COUNT; i++) {
    const disp = sourceContribution(sources, i);
    if (disp === 0) continue;
    const n = restNormalAt(i);
    const o = i * 3;
    out[o] = gamma[o]! + n[0] * disp;
    out[o + 1] = gamma[o + 1]! + n[1] * disp;
    out[o + 2] = gamma[o + 2]! + n[2] * disp;
  }
  return out;
}

/** (rings-1)×sectors×2 = 1920 transient triangles. Optional inspectable topology. */
export function transientFaces(): Uint16Array {
  const faces = new Uint16Array(SCAFFOLD_FACE_COUNT * 3);
  let w = 0;
  for (let r = 0; r < SCAFFOLD_RINGS - 1; r++) {
    for (let s = 0; s < SCAFFOLD_SECTORS; s++) {
      const a = r * SCAFFOLD_SECTORS + s;
      const b = r * SCAFFOLD_SECTORS + ((s + 1) % SCAFFOLD_SECTORS);
      const c = (r + 1) * SCAFFOLD_SECTORS + s;
      const d = (r + 1) * SCAFFOLD_SECTORS + ((s + 1) % SCAFFOLD_SECTORS);
      faces[w++] = a;
      faces[w++] = c;
      faces[w++] = b;
      faces[w++] = b;
      faces[w++] = c;
      faces[w++] = d;
    }
  }
  return faces;
}

export function computeNormals(vertices: Float32Array): Float32Array {
  const n = new Float32Array(SCAFFOLD_VERTEX_COUNT * 3);
  for (let i = 0; i < SCAFFOLD_VERTEX_COUNT; i++) {
    const o = i * 3;
    const x = vertices[o]!;
    const y = vertices[o + 1]!;
    const z = vertices[o + 2]!;
    const len = Math.hypot(x, y, z) || 1;
    n[o] = x / len;
    n[o + 1] = y / len;
    n[o + 2] = z / len;
  }
  return n;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize3(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function computeLocalFrame(vertices: Float32Array, index: number): LocalFrame {
  const o = index * 3;
  const origin: Vec3 = [vertices[o]!, vertices[o + 1]!, vertices[o + 2]!];
  const { ring, sector } = scaffoldUV(index);
  const right = ring * SCAFFOLD_SECTORS + ((sector + 1) % SCAFFOLD_SECTORS);
  const upRing = Math.min(SCAFFOLD_RINGS - 1, ring + 1);
  const up = upRing * SCAFFOLD_SECTORS + sector;
  const ro = right * 3;
  const uo = up * 3;
  const tangent = normalize3([
    vertices[ro]! - origin[0],
    vertices[ro + 1]! - origin[1],
    vertices[ro + 2]! - origin[2],
  ]);
  const rawBitangent: Vec3 = [
    vertices[uo]! - origin[0],
    vertices[uo + 1]! - origin[1],
    vertices[uo + 2]! - origin[2],
  ];
  const normal = normalize3(cross(tangent, rawBitangent));
  const bitangent = normalize3(cross(normal, tangent));
  return { origin, tangent, bitangent, normal };
}

export type ComposeOptions = Readonly<{
  faces?: boolean;
  normals?: boolean;
  frames?: boolean;
}>;

export function composeAdaptiveShellScaffold(
  lattice: Float32Array = restLatticeNodes(),
  sources: readonly ScaffoldSource[] = [],
  options: ComposeOptions = {},
): AdaptiveShellFrame {
  const vertices = composeScaffoldVertices(lattice, sources);
  const frame: {
    schema: "gasper.adaptive-shell-scaffold.v1";
    rings: typeof SCAFFOLD_RINGS;
    sectors: typeof SCAFFOLD_SECTORS;
    vertexCount: typeof SCAFFOLD_VERTEX_COUNT;
    faceCount: typeof SCAFFOLD_FACE_COUNT;
    vertices: Float32Array;
    faces?: Uint16Array;
    normals?: Float32Array;
    frames?: LocalFrame[];
    coupling: ScaffoldCoupling;
  } = {
    schema: "gasper.adaptive-shell-scaffold.v1",
    rings: SCAFFOLD_RINGS,
    sectors: SCAFFOLD_SECTORS,
    vertexCount: SCAFFOLD_VERTEX_COUNT,
    faceCount: SCAFFOLD_FACE_COUNT,
    vertices,
    coupling: SCAFFOLD_COUPLING,
  };
  if (options.faces) frame.faces = transientFaces();
  if (options.normals) frame.normals = computeNormals(vertices);
  if (options.frames) {
    const frames: LocalFrame[] = new Array(SCAFFOLD_VERTEX_COUNT);
    for (let i = 0; i < SCAFFOLD_VERTEX_COUNT; i++) frames[i] = computeLocalFrame(vertices, i);
    frame.frames = frames;
  }
  return frame;
}

/**
 * Thin R4 read: tendency / physics goals become scaffold SOURCES.
 * expand_contract → pressure. gather → relief. Never blendshapes or fixtures.
 */
export function sourcesFromCausalGoals(
  intent: Pick<SemanticExpressionIntent, "expand_contract">,
  goals: Pick<CausalPhysicsGoals, "gather">,
): readonly ScaffoldSource[] {
  const expand = Number.isFinite(intent.expand_contract) ? intent.expand_contract : 0;
  const gather = Number.isFinite(goals.gather) ? Math.max(0, goals.gather) : 0;
  const pressureSamples = new Float32Array(SCAFFOLD_VERTEX_COUNT);
  const reliefSamples = new Float32Array(SCAFFOLD_VERTEX_COUNT);
  if (expand !== 0) pressureSamples.fill(1);
  if (gather !== 0) reliefSamples.fill(-1);
  return [
    { kind: "pressure", amplitude: expand, samples: pressureSamples },
    { kind: "relief", amplitude: gather, samples: reliefSamples },
  ];
}

export function assertScaffoldContract(frame: AdaptiveShellFrame): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (frame.rings * frame.sectors !== SCAFFOLD_VERTEX_COUNT) {
    errors.push(`rings×sectors ${frame.rings * frame.sectors} !== ${SCAFFOLD_VERTEX_COUNT}`);
  }
  if (frame.vertexCount !== SCAFFOLD_VERTEX_COUNT) {
    errors.push(`vertexCount ${frame.vertexCount} !== ${SCAFFOLD_VERTEX_COUNT}`);
  }
  if (frame.vertices.length !== SCAFFOLD_VERTEX_COUNT * 3) {
    errors.push(`vertices length ${frame.vertices.length} !== ${SCAFFOLD_VERTEX_COUNT * 3}`);
  }
  if (frame.faceCount !== SCAFFOLD_FACE_COUNT) {
    errors.push(`faceCount ${frame.faceCount} !== ${SCAFFOLD_FACE_COUNT}`);
  }
  if (frame.coupling.law !== SCAFFOLD_COUPLING_LAW) errors.push("coupling law drifted");
  if (frame.coupling.merged) errors.push("lattice must not merge into scaffold");
  if (frame.coupling.paintsFace || frame.coupling.faceAuthor) errors.push("scaffold must not author a face");
  if (frame.coupling.changesSilhouetteTopology || frame.coupling.changesFaceTopology) {
    errors.push("scaffold must not change silhouette or face topology");
  }
  if (frame.coupling.latticeNodes !== GASPER_TOPOLOGY.structuralNodes) {
    errors.push("lattice node lock drifted");
  }
  if (frame.coupling.latticeTriangles !== GASPER_TOPOLOGY.structuralTriangles) {
    errors.push("lattice triangle lock drifted");
  }
  if (frame.coupling.contourSamples !== GASPER_TOPOLOGY.contourSamples) {
    errors.push("contour lock drifted");
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
