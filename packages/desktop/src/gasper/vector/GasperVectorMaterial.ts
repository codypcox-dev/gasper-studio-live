/**
 * GASPER-MAT-004 — deterministic material-space feature transport.
 *
 * This module is intentionally renderer-agnostic. It owns stable feature
 * identity and inertial transport; a production writer only commits the
 * returned vector records to SVG nodes.
 */

import materialFeatureManifest from "../assets/vector-material-manifest.json";

export type VectorMaterialMeshPoint = {
  readonly x: number;
  readonly y: number;
  readonly projectedDepth?: number;
};

/** Canonical material channels shared with the packaged FormMaster bridge. */
export type VectorMaterialResponse = Readonly<{
  readonly keyIntensity?: number;
  readonly keyDirection?: number;
  readonly rim?: number;
  readonly pearl?: number;
  readonly absorption?: number;
  readonly clearcoat?: number;
  readonly roughness?: number;
  readonly texture?: number;
  readonly normalStrength?: number;
  readonly curvatureResponse?: number;
  readonly pressureGain?: number;
  readonly reliefGain?: number;
}>;

export type VectorMaterialFrameOptions = {
  readonly dt: number;
  readonly time: number;
  readonly energy: number;
  readonly motion?: number;
  readonly yaw?: number;
  readonly material?: VectorMaterialResponse;
  /** @deprecated Use material.pressureGain from GASPER-VEC-401. */
  readonly coupling?: number;
  readonly tau?: number;
};

export type VectorMaterialFleck = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly opacity: number;
  readonly fill: "#efc8ff" | "#78fff0";
  readonly rotation: number;
  readonly depth: number;
};

export type VectorMaterialStreak = {
  readonly id: string;
  readonly d: string;
  readonly opacity: number;
  readonly strokeWidth: number;
  readonly depth: number;
};

export type VectorMaterialBand = {
  readonly id: string;
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly opacity: number;
  readonly depth: number;
};

export type VectorMaterialHighlight = {
  readonly id: "highlight-nub-left" | "highlight-nub-right" | "highlight-face-left";
  readonly x: number;
  readonly y: number;
  readonly opacity: number;
  readonly depth: number;
};

export type VectorMaterialFrame = {
  readonly packet: "GASPER-MAT-004";
  readonly revision: number;
  readonly flecks: readonly VectorMaterialFleck[];
  readonly streaks: readonly VectorMaterialStreak[];
  readonly subsurfaceBands: readonly VectorMaterialBand[];
  readonly highlights: readonly VectorMaterialHighlight[];
};

type MaterialPoint = {
  x: number;
  y: number;
  depth: number;
  nx: number;
  ny: number;
};

export type VectorMaterialState = {
  readonly seed: number;
  readonly previous: Map<string, MaterialPoint>;
  revision: number;
};

type FeatureAnchor = {
  readonly id: string;
  readonly u: number;
  readonly radial: number;
  readonly depth: number;
  readonly phase: number;
  readonly frequency: number;
};

const manifestAnchor = (anchor: FeatureAnchor): FeatureAnchor =>
  Object.freeze({ ...anchor });

const FLECK_ANCHORS: readonly FeatureAnchor[] = Object.freeze(
  materialFeatureManifest.cosmicFlecks.map(manifestAnchor),
);
const STREAK_ANCHORS: readonly FeatureAnchor[] = Object.freeze(
  materialFeatureManifest.cosmicStreaks.map(manifestAnchor),
);
const BAND_ANCHORS: readonly FeatureAnchor[] = Object.freeze(
  materialFeatureManifest.subsurfaceBands.map(manifestAnchor),
);
const HIGHLIGHT_ANCHORS: readonly FeatureAnchor[] = Object.freeze(
  materialFeatureManifest.hardHighlights.map(manifestAnchor),
);

export const VECTOR_MATERIAL_FEATURES = Object.freeze({
  cosmicFlecks: FLECK_ANCHORS,
  cosmicStreaks: STREAK_ANCHORS,
  subsurfaceBands: BAND_ANCHORS,
  hardHighlights: HIGHLIGHT_ANCHORS,
});

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

function finite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function hash01(seed: number, index: number): number {
  let value = (seed ^ Math.imul(index + 1, 0x45d9f3b)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  return (value ^ (value >>> 16)) / 0xffffffff;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function meshPoint(
  mesh: readonly VectorMaterialMeshPoint[],
  anchor: FeatureAnchor,
): MaterialPoint {
  if (!mesh.length) return { x: 120, y: 112, depth: anchor.depth, nx: 0, ny: -1 };
  const sectors = 24;
  const rings = Math.max(1, Math.floor(mesh.length / sectors));
  const ringPos = clamp(anchor.radial, 0, 1) * Math.max(0, rings - 1);
  const r0 = Math.floor(ringPos);
  const r1 = Math.min(rings - 1, r0 + 1);
  const rt = ringPos - r0;
  const sectorPos = ((anchor.u % 1) + 1) % 1 * sectors;
  const s0 = Math.floor(sectorPos) % sectors;
  const s1 = (s0 + 1) % sectors;
  const st = sectorPos - Math.floor(sectorPos);
  const at = (ring: number, sector: number): VectorMaterialMeshPoint =>
    mesh[Math.min(mesh.length - 1, ring * sectors + sector)] ?? mesh[0]!;
  const a = at(r0, s0);
  const b = at(r0, s1);
  const c = at(r1, s0);
  const d = at(r1, s1);
  const topX = lerp(a.x, b.x, st);
  const topY = lerp(a.y, b.y, st);
  const botX = lerp(c.x, d.x, st);
  const botY = lerp(c.y, d.y, st);
  const x = lerp(topX, botX, rt);
  const y = lerp(topY, botY, rt);
  const depth = lerp(
    lerp(finite(a.projectedDepth, 0), finite(b.projectedDepth, 0), st),
    lerp(finite(c.projectedDepth, 0), finite(d.projectedDepth, 0), st),
    rt,
  );
  const tangentX = d.x - c.x || b.x - a.x;
  const tangentY = d.y - c.y || b.y - a.y;
  const tangentLength = Math.hypot(tangentX, tangentY) || 1;
  let nx = -tangentY / tangentLength;
  let ny = tangentX / tangentLength;
  if (ny > 0) {
    nx *= -1;
    ny *= -1;
  }
  return { x, y, depth: depth + anchor.depth * 0.15, nx, ny };
}

function transportedPoint(
  state: VectorMaterialState,
  anchor: FeatureAnchor,
  target: MaterialPoint,
  dt: number,
  tau: number,
): MaterialPoint {
  const key = anchor.id;
  const previous = state.previous.get(key) ?? target;
  const alpha = 1 - Math.exp(-dt / tau);
  const next = {
    x: lerp(previous.x, target.x, alpha),
    y: lerp(previous.y, target.y, alpha),
    depth: lerp(previous.depth, target.depth, alpha),
    nx: lerp(previous.nx, target.nx, alpha),
    ny: lerp(previous.ny, target.ny, alpha),
  };
  const normalLength = Math.hypot(next.nx, next.ny) || 1;
  next.nx /= normalLength;
  next.ny /= normalLength;
  state.previous.set(key, next);
  return next;
}

function linePath(point: MaterialPoint, length: number): string {
  const half = length * 0.5;
  const tx = -point.ny;
  const ty = point.nx;
  return `M ${(point.x - tx * half).toFixed(2)} ${(point.y - ty * half).toFixed(2)} L ${(point.x + tx * half).toFixed(2)} ${(point.y + ty * half).toFixed(2)}`;
}

function intensity(
  point: MaterialPoint,
  phase: number,
  energy: number,
  motion: number,
  yaw: number,
  material: VectorMaterialResponse,
): number {
  const keyIntensity = clamp(finite(material.keyIntensity, 0.58), 0, 1.5);
  const keyDirection = clamp(finite(material.keyDirection, 0), -1, 1);
  const rim = clamp(finite(material.rim, 0.62), 0, 1.5);
  const pearl = clamp(finite(material.pearl, 0.72), 0, 1.5);
  const absorption = clamp(finite(material.absorption, 0.18), 0, 1);
  const clearcoat = clamp(finite(material.clearcoat, 0.42), 0, 1.5);
  const roughness = clamp(finite(material.roughness, 0.35), 0, 1);
  const texture = clamp(finite(material.texture, 0.56), 0, 1.5);
  const normalStrength = clamp(finite(material.normalStrength, 0.58), 0, 1.5);
  const curvatureResponse = clamp(finite(material.curvatureResponse, 0.48), 0, 1.5);
  const pressureGain = clamp(finite(material.pressureGain, 0), 0, 1);
  const reliefGain = clamp(finite(material.reliefGain, 0), 0, 1);
  const facing = clamp(
    point.nx * (-0.55 + 0.18 * keyDirection) +
      point.ny * (-0.65 + 0.24 * keyDirection) +
      0.22,
    0,
    1,
  );
  const depth = 0.55 + 0.45 * Math.tanh(point.depth * 1.2);
  const phaseTerm = 0.5 + 0.5 * Math.sin(phase);
  const yawBias = clamp(yaw / 45, -1, 1) * point.nx * 0.08;
  const keyGain = 0.82 + 0.30 * keyIntensity;
  const rimGain = 0.82 + 0.28 * rim;
  const pearlGain = 0.82 + 0.28 * pearl;
  const clearcoatGain = 0.78 + 0.34 * clearcoat;
  // Rougher material scatters the same canonical light instead of producing
  // the same sharp/specular response as a smooth surface. Keep this bounded
  // and analytic so the material packet remains vector-native.
  const roughnessGain = 1 - 0.18 * roughness;
  const absorptionGain = 1 - 0.32 * absorption;
  const textureGain = 0.82 + 0.28 * texture;
  const normalGain = 0.80 + 0.28 * normalStrength;
  const curvatureGain = 0.80 + 0.28 * curvatureResponse;
  const pressureGainResponse = 1 + pressureGain * 0.12;
  const reliefGainResponse = 1 + reliefGain * 0.08;
  return clamp(
    (facing * 0.72 + phaseTerm * 0.1 + 0.18) *
      depth *
      (0.86 + energy * 0.24) *
      (1 + motion * 0.12 + yawBias) *
      keyGain *
      rimGain *
      pearlGain *
      clearcoatGain *
      roughnessGain *
      absorptionGain *
      textureGain *
      normalGain *
      curvatureGain *
      pressureGainResponse *
      reliefGainResponse,
    0,
    1,
  );
}

export function createVectorMaterialState(seed = 37): VectorMaterialState {
  return { seed: seed | 0, previous: new Map(), revision: 0 };
}

export function evaluateVectorMaterialFrame(
  state: VectorMaterialState,
  mesh: readonly VectorMaterialMeshPoint[],
  options: VectorMaterialFrameOptions,
): VectorMaterialFrame {
  const dt = clamp(finite(options.dt, 1 / 60), 0, 0.25);
  const time = finite(options.time, 0);
  const energy = clamp(finite(options.energy, 0.6), 0, 1);
  const motion = clamp(finite(options.motion, 0.5), 0, 1);
  const yaw = finite(options.yaw, 0);
  const tau = clamp(finite(options.tau, 0.18), 0.03, 1.5);
  const material: VectorMaterialResponse = options.material ?? {
    pressureGain: clamp(finite(options.coupling, 0), 0, 1),
  };
  const project = (anchor: FeatureAnchor) => {
    const target = meshPoint(mesh, anchor);
    const phase = anchor.phase + time * anchor.frequency * Math.PI * 2;
    const drift = (hash01(state.seed, anchor.id.length) - 0.5) * 0.35 * motion;
    target.x += Math.cos(phase * 0.73 + drift) * 0.45;
    target.y += Math.sin(phase * 0.61 + drift) * 0.35;
    const point = transportedPoint(state, anchor, target, dt, tau);
    return { point, phase, light: intensity(point, phase, energy, motion, yaw, material) };
  };

  const flecks = FLECK_ANCHORS.map((anchor, index) => {
    const { point, phase, light } = project(anchor);
    const rx = 0.85 + 0.55 * light + (index % 3) * 0.12;
    return {
      id: anchor.id,
      x: point.x,
      y: point.y,
      rx,
      ry: rx * (0.72 + 0.18 * ((index % 5) / 5)),
      opacity: clamp(0.32 + 0.48 * light, 0.32, 0.85),
      fill: anchor.u > 0.15 && anchor.u < 0.55 ? "#78fff0" as const : "#efc8ff" as const,
      rotation: ((phase * 18) % 70) - 35,
      depth: point.depth,
    };
  });

  const streaks = STREAK_ANCHORS.map((anchor, index) => {
    const { point, light } = project(anchor);
    return {
      id: anchor.id,
      d: linePath(point, 10 + index * 2.4 + 4 * light),
      opacity: clamp(0.1 + 0.28 * light, 0.1, 0.55),
      strokeWidth: 2.2 + index * 0.65,
      depth: point.depth,
    };
  });

  const subsurfaceBands = BAND_ANCHORS.map((anchor, index) => {
    const { point, light } = project(anchor);
    const base = [0.05, 0.07, 0.09][index] ?? 0.06;
    const rx = 14 + index * 3.5 + 6 * point.depth;
    return {
      id: anchor.id,
      cx: point.x,
      cy: point.y,
      rx,
      ry: rx * (0.55 + 0.08 * index),
      opacity: clamp(base * (0.55 + 0.9 * light), 0.05, 0.18),
      depth: point.depth,
    };
  });

  const highlights = HIGHLIGHT_ANCHORS.map((anchor) => {
    const { point, light } = project(anchor);
    return {
      id: anchor.id as VectorMaterialHighlight["id"],
      x: point.x,
      y: point.y,
      opacity: clamp(0.42 + 0.42 * light, 0.42, 1),
      depth: point.depth,
    };
  });

  state.revision += 1;
  return Object.freeze({
    packet: "GASPER-MAT-004" as const,
    revision: state.revision,
    flecks: Object.freeze(flecks),
    streaks: Object.freeze(streaks),
    subsurfaceBands: Object.freeze(subsurfaceBands),
    highlights: Object.freeze(highlights),
  });
}
