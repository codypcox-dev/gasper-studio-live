/**
 * VEC-201 — Analytic feature bas-relief (logo / glasses / embodiment).
 * Pure numeric fields only: no Canvas, ImageData, getImageData, or pixel sampling.
 * FormMaster (`all-script-3.js`) inlines the same primitives for the live SVG path.
 */

export const ANALYTIC_FEATURE_RELIEF = Object.freeze({
  enabled: true,
  logoEnabled: true,
  embodimentEnabled: true,
  featureAmp: 1.3,
  heightScale: 6.0,
  slopeFloor: 0.035,
  expand: 0.55,
  radialInner: 0.0,
  radialOuter: 0.98,
  /** Soft edge width in UV units (≈ 1.7px / 160 raster width of the retired path). */
  featureSigma: 0.0106,
  faceAnchorUV: Object.freeze({
    leftEye: Object.freeze([0.32, 0.46] as const),
    rightEye: Object.freeze([0.68, 0.46] as const),
    mouth: Object.freeze([0.5, 0.8] as const),
  }),
  lensR: 0.115,
  logoCenter: Object.freeze([0.5, 0.165] as const),
  logoR: 0.09,
  /** Hard clamp on composed feature height before amplitude scale. */
  heightBound: 2.5,
  provenance: "analytic-vector-primitives" as const,
  primitives: Object.freeze([
    "gaussian-ring",
    "soft-disk-sdf",
    "segment-distance-ridge",
    "parametric-g-glyph",
    "embodiment-analytic-field",
    "face-anchor-affine",
  ] as const),
});

export type FaceAnchorUV = {
  leftEye: readonly [number, number];
  rightEye: readonly [number, number];
  mouth: readonly [number, number];
};

export type FaceProjectionPoints = {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  mouth: { x: number; y: number };
};

export type FaceAffine = {
  m00: number;
  m01: number;
  m10: number;
  m11: number;
  t0: number;
  t1: number;
};

export type EmbodimentProfileId =
  | "comet"
  | "dormant-orbit"
  | "low-orbit"
  | "singularity"
  | string;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function smoothstep01(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

export function wrappedU(u: number, c: number): number {
  const d = Math.abs(u - c);
  return Math.min(d, 1 - d);
}

/** Soft Gaussian ridge along a circle (lens frames, glyph annulus). */
export function softRing(
  u: number,
  v: number,
  cx: number,
  cy: number,
  r: number,
  sigma: number,
): number {
  const d = Math.hypot(u - cx, v - cy);
  const s = sigma > 0 ? sigma : 1e-6;
  const t = (d - r) / s;
  return Math.exp(-0.5 * t * t);
}

/** Soft disk via logistic of signed distance (lens wells, glyph bowl). */
export function softDisk(
  u: number,
  v: number,
  cx: number,
  cy: number,
  r: number,
  sigma: number,
): number {
  const d = Math.hypot(u - cx, v - cy) - r;
  const s = sigma > 0 ? sigma * 0.6 : 1e-6;
  return 1 / (1 + Math.exp(d / s));
}

/** Soft Gaussian ridge along a line segment (bridge, temples, G spur). */
export function softSegment(
  u: number,
  v: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  sigma: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((u - ax) * dx + (v - ay) * dy) / len2;
  t = clamp(t, 0, 1);
  const d = Math.hypot(u - (ax + dx * t), v - (ay + dy * t));
  const s = sigma > 0 ? sigma : 1e-6;
  return Math.exp(-0.5 * (d / s) * (d / s));
}

/**
 * Parametric "G" glyph as open annulus + horizontal spur + recessed bowl.
 * UV-local; matches the retired canvas strokeText('G') intent without raster text.
 */
export function logoGHeight(
  u: number,
  v: number,
  opts: {
    cx?: number;
    cy?: number;
    r?: number;
    sigma?: number;
  } = {},
): number {
  const cx = opts.cx ?? ANALYTIC_FEATURE_RELIEF.logoCenter[0];
  const cy = opts.cy ?? ANALYTIC_FEATURE_RELIEF.logoCenter[1];
  const R = opts.r ?? ANALYTIC_FEATURE_RELIEF.logoR;
  const sigma = opts.sigma ?? ANALYTIC_FEATURE_RELIEF.featureSigma;
  const d = Math.hypot(u - cx, v - cy);
  const ring = Math.exp(-0.5 * Math.pow((d - R) / sigma, 2));
  const ang = Math.atan2(v - cy, u - cx);
  // Open the right-hand gap of the G.
  const gapWidth = 0.55;
  const gap =
    Math.abs(ang) < gapWidth
      ? Math.pow(Math.cos((ang / gapWidth) * (Math.PI / 2)), 2)
      : 0;
  const openRing = ring * (1 - gap * 0.95);
  const bar = softSegment(u, v, cx, cy, cx + R * 0.95, cy, sigma * 0.9);
  const bowl = softDisk(u, v, cx, cy, R * 0.55, sigma) * 0.25;
  return openRing * 0.95 + bar * 0.85 - bowl;
}

/** Glasses: recessed lens wells + raised frames, bridge, and temples. */
export function glassesHeight(
  u: number,
  v: number,
  anchors: FaceAnchorUV = ANALYTIC_FEATURE_RELIEF.faceAnchorUV,
  opts: { lensR?: number; sigma?: number } = {},
): number {
  const le = anchors.leftEye;
  const re = anchors.rightEye;
  const r = opts.lensR ?? ANALYTIC_FEATURE_RELIEF.lensR;
  const sigma = opts.sigma ?? ANALYTIC_FEATURE_RELIEF.featureSigma;
  const wellL = softDisk(u, v, le[0], le[1], r * 0.92, sigma * 1.2);
  const wellR = softDisk(u, v, re[0], re[1], r * 0.92, sigma * 1.2);
  const frameL = softRing(u, v, le[0], le[1], r, sigma * 0.85);
  const frameR = softRing(u, v, re[0], re[1], r, sigma * 0.85);
  const bridge = softSegment(
    u,
    v,
    le[0] + 0.115,
    le[1],
    re[0] - 0.115,
    re[1],
    sigma * 0.9,
  );
  const templeL = softSegment(
    u,
    v,
    le[0] - 0.115,
    le[1],
    le[0] - 0.18,
    le[1] - 0.02,
    sigma * 0.9,
  );
  const templeR = softSegment(
    u,
    v,
    re[0] + 0.115,
    re[1],
    re[0] + 0.18,
    re[1] - 0.02,
    sigma * 0.9,
  );
  return (
    (frameL + frameR) * 0.9 +
    bridge * 0.85 +
    templeL * 0.75 +
    templeR * 0.75 -
    (wellL + wellR) * 0.45
  );
}

/** Embodiment-specific analytic height fields (unchanged math from FormMaster). */
export function embodimentHeight(
  u: number,
  v: number,
  profileId: EmbodimentProfileId,
): number {
  if (profileId === "comet") {
    return (
      0.55 *
      Math.sin(u * 10 + v * 6) *
      Math.exp(-Math.pow(v - 0.35, 2) / (2 * 0.22 * 0.22))
    );
  }
  if (profileId === "dormant-orbit") {
    return (
      -0.9 *
      Math.exp(
        -(Math.pow(wrappedU(u, 0.5), 2) + Math.pow(v - 0.5, 2)) /
          (2 * 0.16 * 0.16),
      )
    );
  }
  if (profileId === "low-orbit") {
    return -0.7 * smoothstep01((v - 0.62) / 0.18);
  }
  if (profileId === "singularity") {
    return 0.9 * Math.exp(-Math.pow(v - 0.6, 2) / (2 * 0.045 * 0.045));
  }
  return 0;
}

/** Logo + glasses feature field in UV. */
export function featureLogoGlassesHeight(
  u: number,
  v: number,
  amp: number = ANALYTIC_FEATURE_RELIEF.featureAmp,
): number {
  const raw = logoGHeight(u, v) + glassesHeight(u, v);
  return clamp(raw, -ANALYTIC_FEATURE_RELIEF.heightBound, ANALYTIC_FEATURE_RELIEF.heightBound) * amp;
}

export function faceAffineFromProjection(
  fp: FaceProjectionPoints | null | undefined,
  anchors: FaceAnchorUV = ANALYTIC_FEATURE_RELIEF.faceAnchorUV,
): FaceAffine | null {
  if (!fp?.leftEye || !fp?.rightEye || !fp?.mouth) return null;
  const P0x = fp.leftEye.x;
  const P0y = fp.leftEye.y;
  const P1x = fp.rightEye.x;
  const P1y = fp.rightEye.y;
  const P2x = fp.mouth.x;
  const P2y = fp.mouth.y;
  const Q0 = anchors.leftEye;
  const Q1 = anchors.rightEye;
  const Q2 = anchors.mouth;
  const ax = P1x - P0x;
  const ay = P1y - P0y;
  const bx = P2x - P0x;
  const by = P2y - P0y;
  const det = ax * by - ay * bx;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-6) return null;
  const inv00 = by / det;
  const inv01 = -bx / det;
  const inv10 = -ay / det;
  const inv11 = ax / det;
  const qax = Q1[0] - Q0[0];
  const qay = Q1[1] - Q0[1];
  const qbx = Q2[0] - Q0[0];
  const qby = Q2[1] - Q0[1];
  const m00 = qax * inv00 + qbx * inv10;
  const m01 = qax * inv01 + qbx * inv11;
  const m10 = qay * inv00 + qby * inv10;
  const m11 = qay * inv01 + qby * inv11;
  return {
    m00,
    m01,
    m10,
    m11,
    t0: Q0[0] - m00 * P0x - m01 * P0y,
    t1: Q0[1] - m10 * P0x - m11 * P0y,
  };
}

export function applyFaceAffine(
  aff: FaceAffine,
  x: number,
  y: number,
): { u: number; v: number } {
  return {
    u: aff.m00 * x + aff.m01 * y + aff.t0,
    v: aff.m10 * x + aff.m11 * y + aff.t1,
  };
}

export type AnalyticFeatureSampleInput = {
  u: number;
  v: number;
  /** Screen x when logo/glasses face-affine is active. */
  screenX?: number;
  screenY?: number;
  morphId: EmbodimentProfileId;
  facePresent: boolean;
  logoEnabled?: boolean;
  embodimentEnabled?: boolean;
  featureAmp?: number;
  affine?: FaceAffine | null;
};

/**
 * Compose per-vertex analytic feature height.
 * Deterministic for fixed inputs; zero when both logo and embodiment inactive.
 */
export function sampleAnalyticFeatureHeight(
  input: AnalyticFeatureSampleInput,
): number {
  const logoOn = input.logoEnabled ?? ANALYTIC_FEATURE_RELIEF.logoEnabled;
  const embOn =
    input.embodimentEnabled ?? ANALYTIC_FEATURE_RELIEF.embodimentEnabled;
  const embActive =
    embOn &&
    (input.morphId === "comet" ||
      input.morphId === "dormant-orbit" ||
      input.morphId === "low-orbit" ||
      input.morphId === "singularity");
  const logoActive = logoOn && input.facePresent;
  if (!embActive && !logoActive) return 0;

  let h = embActive ? embodimentHeight(input.u, input.v, input.morphId) : 0;
  if (logoActive && input.affine && input.screenX != null && input.screenY != null) {
    const uv = applyFaceAffine(input.affine, input.screenX, input.screenY);
    if (uv.u >= 0 && uv.u <= 1 && uv.v >= 0 && uv.v <= 1) {
      h += featureLogoGlassesHeight(
        uv.u,
        uv.v,
        input.featureAmp ?? ANALYTIC_FEATURE_RELIEF.featureAmp,
      );
    }
  }
  return clamp(
    h,
    -ANALYTIC_FEATURE_RELIEF.heightBound * 2,
    ANALYTIC_FEATURE_RELIEF.heightBound * 2,
  );
}

/** Finite-difference normals from a regular height grid (rings × sectors). */
export function deriveFeatureNormals(
  heights: ArrayLike<number>,
  rings: number,
  sectors: number,
): Array<{ x: number; y: number; z: number }> {
  if (heights.length !== rings * sectors) {
    throw new TypeError("heights length must equal rings * sectors");
  }
  const at = (ring: number, sector: number) => {
    const r = Math.max(0, Math.min(rings - 1, ring));
    const s = ((sector % sectors) + sectors) % sectors;
    return heights[r * sectors + s]!;
  };
  const out: Array<{ x: number; y: number; z: number }> = [];
  for (let ring = 0; ring < rings; ring++) {
    for (let sector = 0; sector < sectors; sector++) {
      const du = (at(ring, sector + 1) - at(ring, sector - 1)) * 0.5;
      const dv = (at(ring + 1, sector) - at(ring - 1, sector)) * 0.5;
      const x = -du;
      const y = -dv;
      const z = 1;
      const len = Math.hypot(x, y, z) || 1;
      out.push({ x: x / len, y: y / len, z: z / len });
    }
  }
  return out;
}

export function featureCoverageStats(
  samples: ArrayLike<number>,
  epsilon = 1e-6,
): { count: number; nonzero: number; min: number; max: number; mean: number } {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let nonzero = 0;
  const n = samples.length;
  for (let i = 0; i < n; i++) {
    const h = samples[i]!;
    if (h < min) min = h;
    if (h > max) max = h;
    sum += h;
    if (Math.abs(h) > epsilon) nonzero++;
  }
  if (n === 0) return { count: 0, nonzero: 0, min: 0, max: 0, mean: 0 };
  return { count: n, nonzero, min, max, mean: sum / n };
}
