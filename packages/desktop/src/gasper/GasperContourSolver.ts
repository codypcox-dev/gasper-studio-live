/**
 * Wave R3 remainder ΓÇö GasperContourSolver
 *
 * Native extraction of FormMaster polar contour generation (512 samples) and
 * closed-spline body path `d`. Topology lock: 512 contour / 15├ù24 polar mesh
 * (360 nodes / 672 triangles). Does not invoke SidekickFormMasterRig.
 *
 * Scope (this slice):
 * - radius-at-angle profiles for all 8 embodiments
 * - macro deformation (width / crown / lower fullness)
 * - geometry-model mappers (radial, dormant-family, comet, low-orbit puddle)
 * - closed cubic spline path for #body / #clipBody
 *
 * Not yet extracted: mesh warp handles, relief field ellipses, view-key authoring.
 */

import { GASPER_TOPOLOGY } from "./GasperTopologyLock";
import {
  getEmbodimentProfile,
  type GasperEmbodimentProfile,
  type GasperGeometryModel,
} from "./GasperRigDefinition";
// Optional identity bake (FormMaster one-shot capture) for regression compare.
import bakedContourLibrary from "./assets/contour-library.json";

export type ContourPoint = {
  index: number;
  theta: number;
  radius: number;
  x: number;
  y: number;
  geometryModel: GasperGeometryModel | string;
};

export type ContourWeights = {
  crown: number;
  lower: number;
  sideRight: number;
  sideLeft: number;
  mouthCenter: number;
  mouthRight: number;
  mouthLeft: number;
  cheekRight: number;
  cheekLeft: number;
};

export type ContourVertexTemplate = {
  index: number;
  th: number;
  baseRadius: number;
  weights: ContourWeights;
};

export type PolarVertex = {
  index: number;
  ring: number;
  sector: number;
  radial: number;
  theta: number;
  u: number;
  v: number;
};

export type PolarTopology = {
  rings: number;
  sectors: number;
  vertices: readonly PolarVertex[];
  triangles: readonly (readonly [number, number, number])[];
};

export type ContourMacroState = {
  /** overall_width ΓÇö spreads sides/lower */
  wide?: number;
  /** crown_height ΓÇö lifts crown lobe */
  crown?: number;
  /** lower_body_fullness offset from 1 */
  low?: number;
  /** residual asymmetry (optional living) */
  asym?: number;
  postureScaleX?: number;
  postureScaleY?: number;
  postureX?: number;
  postureY?: number;
  bodyLean?: number;
};

export type ContourSolveInput = {
  profileId: string;
  macro?: ContourMacroState;
  /** When true, rebuild uses locked sample count only. */
  samples?: number;
};

export type ContourSolveResult = {
  profileId: string;
  sampleCount: number;
  points: ContourPoint[];
  pathD: string;
  topology: {
    contourSamples: number;
    structuralNodes: number;
    structuralTriangles: number;
    rings: number;
    sectors: number;
  };
  geometryModel: GasperGeometryModel | string;
};

const CX0 = 120;
const CY0 = 110;
const CONTOUR_SAMPLES = GASPER_TOPOLOGY.contourSamples;
const RINGS = GASPER_TOPOLOGY.structuralRings;
const SECTORS = GASPER_TOPOLOGY.structuralSectors;

/** Static embodiment identity shared by the typed contour authority and pinned against FormMaster. */
export const WISPWALKER_CANONICAL_CONTOUR = Object.freeze({
  crownAmp: -5,
  crownTheta: -Math.PI / 2,
  crownSigma: 0.52,
  lowerBowlTrimAmp: 1.4,
  lowerBowlTrimTheta: Math.PI / 2,
  lowerBowlTrimSigma: 0.62,
  chinAmp: -5,
  chinTheta: Math.PI / 2,
  chinSigma: 0.4,
  lobeAmp: 3.2,
  leftLobeTheta: 1.31,
  rightLobeTheta: 1.83,
  lobeSigma: 0.15,
  rootAmp: 2.2,
  leftRootTheta: 1.19,
  rightRootTheta: 1.95,
  rootSigma: 0.26,
  cleftDepth: 3.2,
  cleftTheta: Math.PI / 2,
  cleftSigma: 0.14,
});

// --- pure math (FormMaster extract) -----------------------------------------

export function gaussAngle(theta: number, mu: number, sigma: number): number {
  let d = theta - mu;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.exp(-0.5 * Math.pow(d / sigma, 2));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function signedPow(v: number, exp: number): number {
  const s = v < 0 ? -1 : 1;
  return s * Math.pow(Math.abs(v), exp);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1)));
  return t * t * (3 - 2 * t);
}

/** Protected Presence base radius (v6.3 extract). */
export function baseRadiusV63(th: number): number {
  let baseRadius = 72.0;
  baseRadius += 5.1 * gaussAngle(th, -Math.PI / 2, 0.82);
  baseRadius += 1.7 * gaussAngle(th, Math.PI / 2, 0.76);
  baseRadius += 1.4 * (gaussAngle(th, 0.72, 0.38) + gaussAngle(th, 2.42, 0.38));
  for (const mu of [0, Math.PI]) {
    baseRadius +=
      6.5 *
      (gaussAngle(th, mu - 0.09, 0.15) +
        gaussAngle(th, mu + 0.09, 0.15));
    baseRadius -= 3.8 * gaussAngle(th, mu - 0.31, 0.11);
    baseRadius -= 3.8 * gaussAngle(th, mu + 0.31, 0.11);
  }
  baseRadius -= 0.45 * gaussAngle(th, Math.PI / 2, 0.18);
  baseRadius += 0.52 * gaussAngle(th, -0.34, 0.48) - 0.28 * gaussAngle(th, Math.PI + 0.3, 0.48);
  return baseRadius;
}

/** Profile-specific radius lobes (FormMaster formRadiusAtFor). */
export function formRadiusAtFor(profileId: string, th: number): number {
  let radius = baseRadiusV63(th);
  if (profileId === "singularity") {
    radius -= 1.1;
    radius += 1.8 * (gaussAngle(th, 0, 0.18) + gaussAngle(th, Math.PI, 0.18));
    return radius;
  }
  if (profileId === "dormant-orbit") {
    radius -= 0.55;
    radius += 2.8 * (gaussAngle(th, 0, 0.17) + gaussAngle(th, Math.PI, 0.17));
    return radius;
  }
  if (profileId === "wispwalker") {
    // WISPWALKER STANCE (D-0016, reference 10_wispwalker_held.png): silhouette stays the
    // upright social PEARL (same crown/face/mid side-lobes, a touch sharper). The only
    // authored delta vs presence is the base: round bowl -> soft teardrop chin with a
    // center cleft = the two load-bearing foot-root lobes. No neck/torso/waist (the prior
    // humanoid carve read as a hard body squeezed into shape). Animated nub feet/arms +
    // walk-in-place layer on top as the new-system upgrade. Mirrors all-script-3.js.
    const w = WISPWALKER_CANONICAL_CONTOUR;
    radius += w.crownAmp * gaussAngle(th, w.crownTheta, w.crownSigma);
    radius -= w.lowerBowlTrimAmp * gaussAngle(th, w.lowerBowlTrimTheta, w.lowerBowlTrimSigma);
    radius += w.chinAmp * gaussAngle(th, w.chinTheta, w.chinSigma);
    radius +=
      w.lobeAmp *
      (gaussAngle(th, w.leftLobeTheta, w.lobeSigma) +
        gaussAngle(th, w.rightLobeTheta, w.lobeSigma));
    radius +=
      w.rootAmp *
      (gaussAngle(th, w.leftRootTheta, w.rootSigma) +
        gaussAngle(th, w.rightRootTheta, w.rootSigma));
    radius -= w.cleftDepth * gaussAngle(th, w.cleftTheta, w.cleftSigma);
  } else if (profileId === "comet") {
    radius -= 2.4;
    radius += 3.8 * gaussAngle(th, 0, 0.52) - 1.2 * gaussAngle(th, Math.PI, 0.62);
    radius -= 0.8 * gaussAngle(th, Math.PI / 2, 0.28);
  } else if (profileId === "halo") {
    radius -= 1.4;
    radius += 4.2 * (gaussAngle(th, 0, 0.38) + gaussAngle(th, Math.PI, 0.38));
    radius -= 2.5 * (gaussAngle(th, 0.58, 0.2) + gaussAngle(th, 2.56, 0.2));
  } else if (profileId === "lantern") {
    radius -= 2.2;
    radius += 4.2 * gaussAngle(th, -Math.PI / 2, 0.62);
    radius += 8.7 * gaussAngle(th, Math.PI / 2, 0.22);
    radius -= 3.4 * (gaussAngle(th, 0.66, 0.3) + gaussAngle(th, 2.48, 0.3));
  } else if (profileId === "low-orbit") {
    radius -= 3.6;
    radius += 2.6 * gaussAngle(th, Math.PI / 2, 0.82);
    radius += 1.5 * (gaussAngle(th, 1.02, 0.42) + gaussAngle(th, 2.12, 0.42));
  }
  return radius;
}

function mapDormantFamily(th: number, radiusScale = 1, collapse = 0) {
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const c = Math.max(0, Math.min(1, collapse));
  const stableScale = 1 + (radiusScale - 1) * lerp(0.48, 0.36, c);
  // N78 COMPACT-SEED SILHOUETTE: keep the singularity endpoint one
  // continuous living shell. The former 105 x 47.5/42.5 endpoint widened
  // the contour into a capsule before optics were applied, so the internal
  // gyre read as a replacement torus. The orbit endpoint remains unchanged;
  // only the singularity interpolation tightens toward a rounded seed.
  const width = lerp(79.5, 82.0, c) * stableScale;
  const upperHeight = lerp(74.0, 69.0, c) * stableScale;
  const lowerHeight = lerp(72.0, 65.0, c) * stableScale;
  const xExponent = lerp(0.96, 0.94, c);
  const yExponent = lerp(0.98, 0.94, c);
  const xNorm = signedPow(cos, xExponent);
  const yNorm = signedPow(sin, yExponent);
  const sideIdentity =
    (gaussAngle(th, 0, 0.16) + gaussAngle(th, Math.PI, 0.16)) * lerp(4.15, 3.15, c);
  const equatorEnvelope = Math.exp(-0.5 * Math.pow(sin / 0.31, 2));
  const crownAsym =
    c * 1.95 * gaussAngle(th, -Math.PI / 2, 0.72) -
    c * 0.72 * gaussAngle(th, Math.PI / 2, 0.72) +
    (1 - c) * 0.9 * gaussAngle(th, Math.PI / 2, 0.85);
  const x =
    120 + width * xNorm + Math.sign(cos || 1) * sideIdentity * (0.55 + 0.45 * equatorEnvelope);
  const y = 111.5 + (sin < 0 ? upperHeight : lowerHeight) * yNorm - crownAsym;
  return { x, y, geometryModel: "dormant-family" as const };
}

function mapCometDirectionalBody(th: number, radiusScale = 1) {
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const stableScale = 1 + (radiusScale - 1) * 0.48;
  const frontEase = smoothstep(-0.14, 0.8, cos);
  const rearEase = 1 - smoothstep(-0.98, -0.1, cos);
  const halfLength = 80.5 * stableScale;
  const x = 127.5 + halfLength * cos + 13.5 * frontEase - 18.5 * rearEase;
  const headToWake = smoothstep(-0.94, 0.24, cos);
  const wakeTaper = 0.34 + 0.66 * headToWake;
  const headRound = 1 + 0.085 * frontEase;
  const verticalRadius = 58.5 * stableScale * wakeTaper * headRound;
  const cranialDome =
    frontEase * (sin < 0 ? 2.15 * Math.pow(-sin, 2.2) : 0.55 * Math.pow(sin, 2));
  const shoulderEase =
    1.15 * Math.sin(Math.PI * headToWake) * Math.pow(Math.abs(sin), 1.45);
  const y = 108.2 + sin * verticalRadius - cranialDome + shoulderEase * Math.sign(sin || 1);
  return { x, y, geometryModel: "forward-mass-attached-wake" as const };
}

function mapLowOrbitPuddle(th: number, radiusScale = 1) {
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const stableScale = 1 + (radiusScale - 1) * 0.34;
  const width = 107.5 * stableScale;
  const topHeight = 41.5 * stableScale;
  const bottomHeight = 12.4 * stableScale;
  const xNorm = signedPow(cos, 0.78);
  const lowerBlend = smoothstep(-0.24, 0.24, sin);
  const verticalExponent = lerp(0.77, 0.47, lowerBlend);
  const verticalHeight = lerp(topHeight, bottomHeight, lowerBlend);
  const yNorm = signedPow(sin, verticalExponent);
  const centerEnvelope = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(xNorm), 1.65)), 2.2);
  const crownLift =
    sin < 0 ? 2.65 * centerEnvelope * Math.pow(Math.max(0, -sin), 0.55) : 0;
  const settledFloor =
    sin > 0 ? 0.62 * centerEnvelope * Math.pow(sin, 5) : 0;
  const x = 120 + width * xNorm;
  const y = 136.4 + verticalHeight * yNorm - crownLift + settledFloor;
  return { x, y, geometryModel: "ground-tangent-puddle" as const };
}

export function mapFormPoint(
  th: number,
  radius: number,
  profile: GasperEmbodimentProfile,
  profileId: string,
): { x: number; y: number; geometryModel: string } {
  const base = formRadiusAtFor(profileId, th);
  const scale = radius / Math.max(0.001, base);
  if (profile.geometryModel === "ground-tangent-puddle") {
    return mapLowOrbitPuddle(th, scale);
  }
  if (profile.geometryModel === "forward-mass-attached-wake") {
    return mapCometDirectionalBody(th, scale);
  }
  if (profile.geometryModel === "dormant-family") {
    return mapDormantFamily(th, scale, profile.dormantCollapse ?? 0);
  }
  return {
    x: CX0 + profile.cx + Math.cos(th) * radius * profile.sx,
    y: CY0 + profile.cy + Math.sin(th) * radius * profile.sy,
    geometryModel: profile.geometryModel || "radial-shared-topology",
  };
}

// --- topology ---------------------------------------------------------------

export function createPolarTopology(
  rings = RINGS,
  sectors = SECTORS,
): PolarTopology {
  if (!Number.isInteger(rings) || rings < 2) {
    throw new TypeError("rings must be an integer >= 2");
  }
  if (!Number.isInteger(sectors) || sectors < 3) {
    throw new TypeError("sectors must be an integer >= 3");
  }
  const vertices: PolarVertex[] = [];
  for (let ring = 0; ring < rings; ring += 1) {
    const radial = (ring + 0.72) / rings;
    const stagger = (ring % 2) * (Math.PI / sectors);
    for (let sector = 0; sector < sectors; sector += 1) {
      vertices.push({
        index: ring * sectors + sector,
        ring,
        sector,
        radial,
        theta: -Math.PI / 2 + (sector * 2 * Math.PI) / sectors + stagger,
        u: sector / sectors,
        v: radial,
      });
    }
  }
  const triangles: Array<[number, number, number]> = [];
  for (let ring = 0; ring < rings - 1; ring += 1) {
    for (let sector = 0; sector < sectors; sector += 1) {
      const next = (sector + 1) % sectors;
      const a = ring * sectors + sector;
      const b = ring * sectors + next;
      const c = (ring + 1) * sectors + sector;
      const d = (ring + 1) * sectors + next;
      if (ring % 2 === 0) {
        triangles.push([a, c, d], [a, d, b]);
      } else {
        triangles.push([a, c, b], [b, c, d]);
      }
    }
  }
  return {
    rings,
    sectors,
    vertices: Object.freeze(vertices),
    triangles: Object.freeze(triangles),
  };
}

let cachedBaseContour: ContourVertexTemplate[] | null = null;

export function createBaseContour(
  samples = CONTOUR_SAMPLES,
): ContourVertexTemplate[] {
  if (samples === CONTOUR_SAMPLES && cachedBaseContour) return cachedBaseContour;
  const out: ContourVertexTemplate[] = Array.from({ length: samples }, (_, index) => {
    const th = -Math.PI / 2 + (index * 2 * Math.PI) / samples;
    const baseRadius = formRadiusAtFor("presence", th);
    return {
      index,
      th,
      baseRadius,
      weights: {
        crown: gaussAngle(th, -Math.PI / 2, 0.78),
        lower: gaussAngle(th, Math.PI / 2, 0.85),
        sideRight: gaussAngle(th, 0, 0.42),
        sideLeft: gaussAngle(th, Math.PI, 0.42),
        mouthCenter: gaussAngle(th, Math.PI / 2, 0.18),
        mouthRight: gaussAngle(th, 1.23, 0.13),
        mouthLeft: gaussAngle(th, 1.91, 0.13),
        cheekRight: gaussAngle(th, 0.72, 0.18),
        cheekLeft: gaussAngle(th, 2.42, 0.18),
      },
    };
  });
  if (samples === CONTOUR_SAMPLES) cachedBaseContour = out;
  return out;
}

/** Closed cubic spline path (FormMaster closedSpline). */
export function closedSpline(pts: Array<{ x: number; y: number }>): string {
  if (!pts.length) return "";
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d + " Z";
}

/**
 * Solve 512-sample body contour for an embodiment + macro state.
 * Path is suitable for SVG #body / #clipBody.
 */
export function solveContour(input: ContourSolveInput): ContourSolveResult {
  const samples = input.samples ?? CONTOUR_SAMPLES;
  if (samples !== CONTOUR_SAMPLES) {
    throw new TypeError(
      `contour samples ${samples} violate topology lock ${CONTOUR_SAMPLES}`,
    );
  }
  const profileId = input.profileId || "presence";
  const profile =
    getEmbodimentProfile(profileId) ?? getEmbodimentProfile("presence")!;
  const macro = input.macro ?? {};
  const wide = (macro.wide ?? 1) - 1; // 0 at neutral
  const crown = macro.crown ?? 0;
  const low = (macro.low ?? 1) - 1;
  const asym = macro.asym ?? 0;
  const volumeX = macro.postureScaleX ?? 1;
  const volumeY = macro.postureScaleY ?? 1;
  const base = createBaseContour(samples);
  const frame = formProjectionFrame(profile);

  const points: ContourPoint[] = [];
  for (const vertex of base) {
    const { index, th, weights } = vertex;
    let r = formRadiusAtFor(profileId, th);
    r += wide * (1.8 * weights.lower + 1.0 * (weights.sideRight + weights.sideLeft));
    r += crown * 1.6 * weights.crown;
    r += low * (1.05 * weights.lower - 0.4 * weights.crown);
    r +=
      asym *
      (1.6 * weights.sideRight -
        1.4 * weights.sideLeft +
        0.55 * gaussAngle(th, -0.12, 0.42) -
        0.42 * gaussAngle(th, Math.PI + 0.12, 0.42));

    const mapped = mapFormPoint(th, r, profile, profileId);
    const nx = mapped.x - frame.cx;
    const ny = mapped.y - frame.cy;
    const lean =
      (macro.bodyLean || 0) * (1 - Math.min(1, Math.abs(ny) / (frame.ry || 80)));
    const x = frame.cx + nx * volumeX + (macro.postureX || 0) + lean;
    const y = frame.cy + ny * volumeY + (macro.postureY || 0);
    points.push({
      index,
      theta: th,
      radius: r,
      x,
      y,
      geometryModel: mapped.geometryModel,
    });
  }

  const polar = getLockedPolarTopology();
  return {
    profileId,
    sampleCount: points.length,
    points,
    pathD: closedSpline(points),
    topology: {
      contourSamples: CONTOUR_SAMPLES,
      structuralNodes: polar.vertices.length,
      structuralTriangles: polar.triangles.length,
      rings: polar.rings,
      sectors: polar.sectors,
    },
    geometryModel: profile.geometryModel,
  };
}

function formProjectionFrame(profile: GasperEmbodimentProfile): {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
} {
  if (profile.geometryModel === "ground-tangent-puddle") {
    return { cx: 120, cy: 136, rx: 105, ry: 42 };
  }
  if (profile.geometryModel === "forward-mass-attached-wake") {
    return { cx: 132, cy: 108, rx: 118, ry: 66 };
  }
  if (profile.geometryModel === "dormant-family") {
    const collapse = Math.max(0, Math.min(1, profile.dormantCollapse || 0));
    return {
      cx: 120,
      cy: 111.5,
      rx: lerp(80, 82, collapse),
      ry: lerp(76, 68, collapse),
    };
  }
  return {
    cx: CX0 + profile.cx,
    cy: CY0 + profile.cy,
    rx: 82 * profile.sx,
    ry: 84 * profile.sy,
  };
}

let lockedPolar: PolarTopology | null = null;

export function getLockedPolarTopology(): PolarTopology {
  if (!lockedPolar) {
    lockedPolar = createPolarTopology(RINGS, SECTORS);
  }
  return lockedPolar;
}

/** Map domain macro fields ΓåÆ contour macro state. */
export function macroStateFromDomain(macro: {
  overall_width?: number;
  overall_height?: number;
  crown_height?: number;
  lower_body_fullness?: number;
  ground_flattening?: number;
  asym?: number; // V2.4 / D-0016 §6d: weight-transfer channels (solver math at solveContour already consumes them)
  body_lean?: number;
  posture_x?: number;
  posture_y?: number;
}): ContourMacroState {
  return {
    wide: macro.overall_width ?? 1,
    crown: macro.crown_height ?? 0,
    low: macro.lower_body_fullness ?? 1,
    postureScaleX: macro.overall_width ?? 1,
    postureScaleY:
      (macro.overall_height ?? 1) *
      (1 - (macro.ground_flattening ?? 0) * 0.08),
    asym: macro.asym ?? 0, // V2.4 / D-0016 §6d: closes the dead-input gap so the native path honors lateral weight transfer
    bodyLean: macro.body_lean ?? 0,
    postureX: macro.posture_x ?? 0,
    postureY: macro.posture_y ?? 0,
  };
}

// ΓöÇΓöÇΓöÇ Baked library + SVG apply helpers (capture + projector path) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type ContourEntry = {
  bodyD: string;
  clipBodyD: string;
  length: number;
  error?: string;
};

export type ContourApplyReport = {
  profileId: string;
  applied: boolean;
  bodyLength: number;
  layers: string[];
  source: "solver" | "library" | "none";
};

/** Optional identity bake (FormMaster one-shot capture) for regression compare. */
const bakedLibrary = bakedContourLibrary as {
  version?: string;
  contours?: Record<string, ContourEntry>;
} | null;

export function getContourForProfile(profileId: string): ContourEntry | null {
  // Prefer live solver so macro edits affect silhouette
  try {
    const solved = solveContour({ profileId });
    return {
      bodyD: solved.pathD,
      clipBodyD: solved.pathD,
      length: solved.pathD.length,
    };
  } catch {
    const e = bakedLibrary?.contours?.[profileId];
    if (e && e.bodyD && e.bodyD.length >= 20) return e;
    return null;
  }
}

export function listContourProfileIds(): string[] {
  if (bakedLibrary?.contours) return Object.keys(bakedLibrary.contours);
  return [
    "presence",
    "singularity",
    "dormant-orbit",
    "wispwalker",
    "comet",
    "halo",
    "lantern",
    "low-orbit",
  ];
}

export function contourLibraryIsComplete(
  requiredIds: string[] = listContourProfileIds(),
): boolean {
  return requiredIds.every((id) => {
    try {
      const s = solveContour({ profileId: id });
      return s.pathD.length >= 20 && s.sampleCount === CONTOUR_SAMPLES;
    } catch {
      const e = bakedLibrary?.contours?.[id];
      return !!e && e.bodyD.length >= 20;
    }
  });
}

/**
 * Apply solved (or baked) body path onto SVG #body / #clipBody.
 * Morph mid-mix uses nearer profile (hard switch at 0.5) until polar morph extracted.
 */
export function applyContourToSvg(
  svg: SVGSVGElement,
  profileId: string,
  opts?: { fromId?: string; mix?: number; macro?: ContourMacroState },
): ContourApplyReport {
  const m = opts?.mix;
  const fromId = opts?.fromId;
  const id =
    fromId != null && m != null && m < 0.5 ? fromId : profileId || "presence";

  let pathD = "";
  let source: ContourApplyReport["source"] = "none";
  try {
    const solved = solveContour({ profileId: id, macro: opts?.macro });
    pathD = solved.pathD;
    source = "solver";
  } catch {
    const baked = bakedLibrary?.contours?.[id];
    if (baked?.bodyD) {
      pathD = baked.bodyD;
      source = "library";
    }
  }

  const layers: string[] = [];
  if (!pathD) {
    return { profileId: id, applied: false, bodyLength: 0, layers, source };
  }

  const body = svg.querySelector("#body") as SVGPathElement | null;
  const clip = svg.querySelector("#clipBody") as SVGPathElement | null;
  if (body) {
    body.setAttribute("d", pathD);
    layers.push("body");
  }
  if (clip) {
    clip.setAttribute("d", pathD);
    layers.push("clipBody");
  }
  if (svg.dataset) {
    svg.dataset.gasperContour = id;
    svg.dataset.gasperContourLen = String(pathD.length);
    svg.dataset.gasperContourSource = source;
  }

  return {
    profileId: id,
    applied: layers.length > 0,
    bodyLength: pathD.length,
    layers,
    source,
  };
}
