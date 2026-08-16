/**
 * R4 native optical legibility — deterministic ROI luminance / local-contrast
 * floors and post-apply material clamps for the packaged production path.
 *
 * GSAP/native remains frame authority. These floors never drive per-frame
 * animation via MCP; they only enforce visibility after native mixer flush so
 * ordinary routes cannot hide the face via zero opacity, near-black multiply
 * collapse, or energy-to-alpha disappearance.
 *
 * Dormant / Blocked may stay subdued relative to Neutral/Listening, but must
 * clear identity floors (feature attachment + readable shell/face anchor).
 * No flat global-brightness equalization — material depth layers stay distinct.
 *
 * Dual enforcement (both required; neither is product acceptance):
 * 1. SVG-embedded CSS !important floors in gasper-rig-v655.svg bind on every
 *    mount path including GasperRigController living ticks (mixer inline
 *    style.opacity cannot bury face emission or re-raise multiply caps).
 * 2. applyOpticalLegibilityClamps post-flush on NativeGasperRenderer for
 *    probe/structural authority + data-optical-state-class state-relative dims.
 *
 * Residual: GasperRenderMixer / EmbodimentProjector opacity writers remain
 * outside this write-path fence; CSS floors override their numeric opacity
 * on the mounted SVG. Geometry collapse (zero path / near-zero scale) is
 * out of this lane (facial grammar / energy continuity).
 *
 * Does NOT issue Cody acceptance, delegated visual PASS, or product PASS.
 */

export type OpticalStateClass =
  | "ordinary"
  | "dormant"
  | "blocked"
  | "wake"
  | "transition"
  | "expression"
  | "reset"
  | "interrupt";

/** Per-feature opacity / ROI floors. Multiply darkeners use *max* caps. */
export type OpticalLegibilityFloors = {
  /** Minimum faceEmissionLayer opacity after clamp. */
  faceEmissionOpacity: number;
  /** Minimum eye path opacity. */
  eyeOpacity: number;
  /** Minimum mouth path opacity. */
  mouthOpacity: number;
  /** Minimum shellBase / chromatic shell opacity. */
  shellOpacity: number;
  /** Maximum opticalDepth multiply opacity (cap buries emission). */
  opticalDepthOpacityMax: number;
  /** Maximum lobe shade multiply opacity. */
  lobeShadeOpacityMax: number;
  /** Maximum faceRecessLayer opacity (dark recess under features). */
  faceRecessOpacityMax: number;
  /** Character ROI mean relative luminance floor (0–1). */
  roiMeanLuma: number;
  /** Eye sub-ROI mean luminance floor. */
  eyeRoiLuma: number;
  /** Mouth sub-ROI mean luminance floor. */
  mouthRoiLuma: number;
  /** Facial plane ROI mean luminance floor. */
  facialPlaneLuma: number;
  /** |faceRoi − bgRoi| minimum contrast. */
  faceBackgroundContrast: number;
  /** Silhouette edge local contrast floor (ring vs interior/exterior). */
  silhouetteEdgeContrast: number;
  /** Frame mean luminance below this is a black/inert frame. */
  blackFrameMeanLuma: number;
  /** Face emission buried when faceRoi − shellRoi < this (and face low). */
  buriedEmissionDelta: number;
};

/**
 * State-relative floors. Dormant/blocked deliberately lower than ordinary,
 * but never zero — identity and feature attachment remain.
 */
export const OPTICAL_LEGIBILITY_FLOORS: Record<
  OpticalStateClass,
  OpticalLegibilityFloors
> = {
  ordinary: {
    faceEmissionOpacity: 0.78,
    eyeOpacity: 0.72,
    mouthOpacity: 0.68,
    shellOpacity: 0.9,
    opticalDepthOpacityMax: 0.48,
    lobeShadeOpacityMax: 0.55,
    faceRecessOpacityMax: 0.72,
    roiMeanLuma: 0.085,
    eyeRoiLuma: 0.16,
    mouthRoiLuma: 0.13,
    facialPlaneLuma: 0.07,
    faceBackgroundContrast: 0.06,
    silhouetteEdgeContrast: 0.045,
    blackFrameMeanLuma: 0.035,
    buriedEmissionDelta: 0.02,
  },
  expression: {
    faceEmissionOpacity: 0.78,
    eyeOpacity: 0.72,
    mouthOpacity: 0.68,
    shellOpacity: 0.9,
    opticalDepthOpacityMax: 0.48,
    lobeShadeOpacityMax: 0.55,
    faceRecessOpacityMax: 0.72,
    roiMeanLuma: 0.085,
    eyeRoiLuma: 0.16,
    mouthRoiLuma: 0.13,
    facialPlaneLuma: 0.07,
    faceBackgroundContrast: 0.06,
    silhouetteEdgeContrast: 0.045,
    blackFrameMeanLuma: 0.035,
    buriedEmissionDelta: 0.02,
  },
  wake: {
    faceEmissionOpacity: 0.74,
    eyeOpacity: 0.7,
    mouthOpacity: 0.64,
    shellOpacity: 0.9,
    opticalDepthOpacityMax: 0.5,
    lobeShadeOpacityMax: 0.58,
    faceRecessOpacityMax: 0.74,
    roiMeanLuma: 0.075,
    eyeRoiLuma: 0.15,
    mouthRoiLuma: 0.12,
    facialPlaneLuma: 0.065,
    faceBackgroundContrast: 0.055,
    silhouetteEdgeContrast: 0.04,
    blackFrameMeanLuma: 0.035,
    buriedEmissionDelta: 0.018,
  },
  transition: {
    faceEmissionOpacity: 0.7,
    eyeOpacity: 0.66,
    mouthOpacity: 0.6,
    shellOpacity: 0.88,
    opticalDepthOpacityMax: 0.5,
    lobeShadeOpacityMax: 0.58,
    faceRecessOpacityMax: 0.74,
    roiMeanLuma: 0.07,
    eyeRoiLuma: 0.14,
    mouthRoiLuma: 0.11,
    facialPlaneLuma: 0.06,
    faceBackgroundContrast: 0.05,
    silhouetteEdgeContrast: 0.038,
    blackFrameMeanLuma: 0.032,
    buriedEmissionDelta: 0.016,
  },
  reset: {
    faceEmissionOpacity: 0.74,
    eyeOpacity: 0.7,
    mouthOpacity: 0.64,
    shellOpacity: 0.9,
    opticalDepthOpacityMax: 0.48,
    lobeShadeOpacityMax: 0.55,
    faceRecessOpacityMax: 0.72,
    roiMeanLuma: 0.08,
    eyeRoiLuma: 0.15,
    mouthRoiLuma: 0.12,
    facialPlaneLuma: 0.065,
    faceBackgroundContrast: 0.055,
    silhouetteEdgeContrast: 0.04,
    blackFrameMeanLuma: 0.035,
    buriedEmissionDelta: 0.018,
  },
  interrupt: {
    faceEmissionOpacity: 0.7,
    eyeOpacity: 0.66,
    mouthOpacity: 0.6,
    shellOpacity: 0.88,
    opticalDepthOpacityMax: 0.5,
    lobeShadeOpacityMax: 0.58,
    faceRecessOpacityMax: 0.74,
    roiMeanLuma: 0.07,
    eyeRoiLuma: 0.14,
    mouthRoiLuma: 0.11,
    facialPlaneLuma: 0.06,
    faceBackgroundContrast: 0.05,
    silhouetteEdgeContrast: 0.038,
    blackFrameMeanLuma: 0.032,
    buriedEmissionDelta: 0.016,
  },
  blocked: {
    faceEmissionOpacity: 0.58,
    eyeOpacity: 0.55,
    mouthOpacity: 0.5,
    shellOpacity: 0.88,
    opticalDepthOpacityMax: 0.52,
    lobeShadeOpacityMax: 0.6,
    faceRecessOpacityMax: 0.78,
    roiMeanLuma: 0.055,
    eyeRoiLuma: 0.11,
    mouthRoiLuma: 0.09,
    facialPlaneLuma: 0.048,
    faceBackgroundContrast: 0.04,
    silhouetteEdgeContrast: 0.032,
    blackFrameMeanLuma: 0.028,
    buriedEmissionDelta: 0.012,
  },
  dormant: {
    faceEmissionOpacity: 0.52,
    eyeOpacity: 0.48,
    mouthOpacity: 0.44,
    shellOpacity: 0.86,
    opticalDepthOpacityMax: 0.55,
    lobeShadeOpacityMax: 0.62,
    faceRecessOpacityMax: 0.8,
    roiMeanLuma: 0.048,
    eyeRoiLuma: 0.1,
    mouthRoiLuma: 0.08,
    facialPlaneLuma: 0.042,
    faceBackgroundContrast: 0.035,
    silhouetteEdgeContrast: 0.028,
    blackFrameMeanLuma: 0.025,
    buriedEmissionDelta: 0.01,
  },
};

/** Mixer formula as shipped (GasperRenderMixer.renderOptics) — for floor proofs. */
export function mixerFaceEmissionOpacity(faceEmissive: number): number {
  const e = Number.isFinite(faceEmissive) ? Math.max(0, Math.min(1, faceEmissive)) : 0;
  return 0.15 + e * 0.6;
}

/**
 * Raise mixer-proposed face emission opacity to the state floor.
 * Does not equalize states — dormant floor is lower than ordinary.
 */
export function clampFaceEmissionOpacity(
  proposed: number,
  stateClass: OpticalStateClass = "ordinary",
): number {
  const floor = OPTICAL_LEGIBILITY_FLOORS[stateClass].faceEmissionOpacity;
  const p = Number.isFinite(proposed) ? proposed : 0;
  return Math.max(floor, Math.min(1, p));
}

export function clampFeatureOpacity(
  proposed: number,
  kind: "eye" | "mouth",
  stateClass: OpticalStateClass = "ordinary",
): number {
  const floors = OPTICAL_LEGIBILITY_FLOORS[stateClass];
  const floor = kind === "eye" ? floors.eyeOpacity : floors.mouthOpacity;
  const p = Number.isFinite(proposed) ? proposed : 0;
  return Math.max(floor, Math.min(1, p));
}

export function clampMultiplyOpacity(
  proposed: number,
  kind: "opticalDepth" | "lobeShade" | "faceRecess",
  stateClass: OpticalStateClass = "ordinary",
): number {
  const floors = OPTICAL_LEGIBILITY_FLOORS[stateClass];
  const cap =
    kind === "opticalDepth"
      ? floors.opticalDepthOpacityMax
      : kind === "lobeShade"
        ? floors.lobeShadeOpacityMax
        : floors.faceRecessOpacityMax;
  const p = Number.isFinite(proposed) ? proposed : cap;
  return Math.max(0, Math.min(cap, p));
}

/** Map eight-state / route tokens onto optical class. */
export function resolveOpticalStateClass(
  stateOrRoute: string | null | undefined,
): OpticalStateClass {
  if (!stateOrRoute) return "ordinary";
  const s = stateOrRoute.toLowerCase();
  // Order: specials before dormant (wake-from-dormant → wake, not dormant).
  if (s.includes("wake")) return "wake";
  if (s.includes("reset")) return "reset";
  if (s.includes("interrupt")) return "interrupt";
  if (
    s.includes("transition") ||
    s.includes("bidirectional") ||
    s.includes("morph-mix")
  ) {
    return "transition";
  }
  if (s.includes("dormant")) return "dormant";
  if (s.includes("blocked") || s.includes("strain")) return "blocked";
  // Explicit eight-state / presence holds → ordinary (full face floors).
  if (
    s.includes("presence-") ||
    s.includes("neutral") ||
    s.includes("listening") ||
    s.includes("thinking") ||
    s.includes("recognition") ||
    s.includes("executing") ||
    s.includes("comet") ||
    s.includes("pleased")
  ) {
    return "ordinary";
  }
  if (
    s.includes("expr") ||
    s.includes("expression") ||
    s.includes("bright") ||
    s.includes("soft") ||
    s.includes("social") ||
    s.includes("knit") ||
    s.includes("spark")
  ) {
    return "expression";
  }
  return "ordinary";
}

export type OpticalClampReport = {
  stateClass: OpticalStateClass;
  applied: string[];
  faceEmissionOpacity: number | null;
  eyeOpacity: number | null;
  mouthOpacity: number | null;
  opticalDepthOpacity: number | null;
  lobeShadeOpacity: number | null;
  faceRecessOpacity: number | null;
  shellOpacity: number | null;
  /** True when at least one critical face node was present and clamped. */
  faceNodesPresent: boolean;
  /** True when re-apply with same class does not drift (proven by pure max/min). */
  idempotent: boolean;
  /** True when clamps only raise emission / cap darkeners (safe under interrupt). */
  holdLastGoodSafe: boolean;
  /** Residual notes for write-path fence honesty (not product PASS). */
  residuals: string[];
};

type OpacityEl = {
  style?: { opacity?: string; getPropertyValue?: (p: string) => string };
  getAttribute?: (n: string) => string | null;
  setAttribute?: (n: string, v: string) => void;
};

function readOpacity(el: OpacityEl | null | undefined): number | null {
  if (!el) return null;
  const styleOp =
    el.style?.opacity ??
    (typeof el.style?.getPropertyValue === "function"
      ? el.style.getPropertyValue("opacity")
      : "");
  if (styleOp !== undefined && styleOp !== null && String(styleOp).trim() !== "") {
    const n = Number(styleOp);
    if (Number.isFinite(n)) return n;
  }
  const attr =
    typeof el.getAttribute === "function" ? el.getAttribute("opacity") : null;
  if (attr !== null && attr !== undefined && String(attr).trim() !== "") {
    const n = Number(attr);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function writeOpacity(el: OpacityEl, value: number): void {
  const v = String(Math.round(value * 1000) / 1000);
  if (el.style && typeof el.style === "object") {
    el.style.opacity = v;
  }
  if (typeof el.setAttribute === "function") {
    el.setAttribute("opacity", v);
    el.setAttribute("data-optical-legibility-opacity", v);
  }
}

/**
 * Post-apply clamps on the mounted SVG after native mixer flush.
 * Idempotent: re-running with the same stateClass does not drift values.
 * Safe under interruption: only raises emission floors / caps multiply darkeners.
 */
export function applyOpticalLegibilityClamps(
  svgRoot: {
    querySelector?: (sel: string) => OpacityEl | null;
    setAttribute?: (n: string, v: string) => void;
  } | null,
  stateClass: OpticalStateClass = "ordinary",
): OpticalClampReport {
  const floors = OPTICAL_LEGIBILITY_FLOORS[stateClass];
  const applied: string[] = [];
  const q = (id: string): OpacityEl | null => {
    if (!svgRoot || typeof svgRoot.querySelector !== "function") return null;
    return svgRoot.querySelector(`#${id}`) as OpacityEl | null;
  };

  let faceEmissionOpacity: number | null = null;
  let eyeOpacity: number | null = null;
  let mouthOpacity: number | null = null;
  let opticalDepthOpacity: number | null = null;
  let lobeShadeOpacity: number | null = null;
  let faceRecessOpacity: number | null = null;
  let shellOpacity: number | null = null;

  const faceEm = q("faceEmissionLayer");
  if (faceEm) {
    const cur = readOpacity(faceEm);
    const next = clampFaceEmissionOpacity(
      cur === null ? floors.faceEmissionOpacity : cur,
      stateClass,
    );
    writeOpacity(faceEm, next);
    faceEmissionOpacity = next;
    applied.push("faceEmissionLayer");
  }

  for (const id of ["eyeL", "eyeR"] as const) {
    const el = q(id);
    if (!el) continue;
    const cur = readOpacity(el);
    const next = clampFeatureOpacity(
      cur === null ? floors.eyeOpacity : cur,
      "eye",
      stateClass,
    );
    writeOpacity(el, next);
    eyeOpacity = next;
    applied.push(id);
  }

  const mouth = q("mouth");
  if (mouth) {
    const cur = readOpacity(mouth);
    const next = clampFeatureOpacity(
      cur === null ? floors.mouthOpacity : cur,
      "mouth",
      stateClass,
    );
    writeOpacity(mouth, next);
    mouthOpacity = next;
    applied.push("mouth");
  }

  const opticalDepth = q("opticalDepth");
  if (opticalDepth) {
    const cur = readOpacity(opticalDepth);
    const next = clampMultiplyOpacity(
      cur === null ? floors.opticalDepthOpacityMax : cur,
      "opticalDepth",
      stateClass,
    );
    writeOpacity(opticalDepth, next);
    opticalDepthOpacity = next;
    applied.push("opticalDepth");
  }

  for (const id of ["leftLobeShade", "rightLobeShade"] as const) {
    const el = q(id);
    if (!el) continue;
    const cur = readOpacity(el);
    const next = clampMultiplyOpacity(
      cur === null ? floors.lobeShadeOpacityMax : cur,
      "lobeShade",
      stateClass,
    );
    writeOpacity(el, next);
    lobeShadeOpacity = next;
    applied.push(id);
  }

  const faceRecess = q("faceRecessLayer");
  if (faceRecess) {
    const cur = readOpacity(faceRecess);
    // Recess may be full 1.0 at rest; cap only when explicitly darkened above max.
    // Default null → leave SVG child gradients as material depth (do not force high recess).
    if (cur !== null) {
      const next = clampMultiplyOpacity(cur, "faceRecess", stateClass);
      writeOpacity(faceRecess, next);
      faceRecessOpacity = next;
      applied.push("faceRecessLayer");
    } else {
      faceRecessOpacity = null;
    }
  }

  for (const id of ["shellBaseLayer", "chromaticShell"] as const) {
    const el = q(id);
    if (!el) continue;
    const cur = readOpacity(el);
    const next = Math.max(
      floors.shellOpacity,
      cur === null ? floors.shellOpacity : cur,
    );
    writeOpacity(el, Math.min(1, next));
    shellOpacity = Math.min(1, next);
    applied.push(id);
  }

  if (svgRoot && typeof svgRoot.setAttribute === "function") {
    svgRoot.setAttribute("data-optical-legibility", "r4");
    svgRoot.setAttribute("data-optical-state-class", stateClass);
    svgRoot.setAttribute(
      "data-optical-face-emission-floor",
      String(floors.faceEmissionOpacity),
    );
  }

  const faceNodesPresent =
    faceEmissionOpacity !== null ||
    eyeOpacity !== null ||
    mouthOpacity !== null;
  const residuals: string[] = [];
  if (!faceNodesPresent) {
    residuals.push(
      "no_face_nodes_found — clamps skipped; CSS SVG floors still apply if asset mounted",
    );
  }
  residuals.push(
    "living_rig_controller_path_relies_on_svg_css_important_floors — NativeGasperRenderer post-flush clamps are probe/structural authority",
  );

  return {
    stateClass,
    applied,
    faceEmissionOpacity,
    eyeOpacity,
    mouthOpacity,
    opticalDepthOpacity,
    lobeShadeOpacity,
    faceRecessOpacity,
    shellOpacity,
    faceNodesPresent,
    // Pure max/min ops: re-apply same class cannot drift below floor / above cap.
    idempotent: true,
    // Only raises emission floors and caps multiply darkeners — never zeros features.
    holdLastGoodSafe: true,
    residuals,
  };
}

// ─── Pixel / ROI predicates (pure; drive image fixtures + synthetic buffers) ─

export type RectRoi = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Relative luminance of sRGB channel 0–255 (Rec. 709). */
export function srgbToRelativeLuma(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const s = Math.max(0, Math.min(255, c)) / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Mean relative luminance over a ROI in RGBA buffer (row-major, 4 bytes/pixel).
 * Alpha-aware: composites over dark Dais-like backdrop (r=8,g=6,b=14) so
 * transparent pixels do not score as opaque near-black.
 */
export function meanLumaRoi(
  rgba: Uint8Array | Uint8ClampedArray | number[],
  width: number,
  height: number,
  roi: RectRoi,
): number {
  const x0 = Math.max(0, Math.floor(roi.x));
  const y0 = Math.max(0, Math.floor(roi.y));
  const x1 = Math.min(width, Math.ceil(roi.x + roi.w));
  const y1 = Math.min(height, Math.ceil(roi.y + roi.h));
  if (x1 <= x0 || y1 <= y0) return 0;
  // Dais-like backdrop for alpha composite
  const bgR = 8;
  const bgG = 6;
  const bgB = 14;
  let sum = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      const a = (rgba[i + 3] ?? 255) / 255;
      const r = rgba[i] * a + bgR * (1 - a);
      const g = rgba[i + 1] * a + bgG * (1 - a);
      const b = rgba[i + 2] * a + bgB * (1 - a);
      sum += srgbToRelativeLuma(r, g, b);
      n++;
    }
  }
  return n === 0 ? 0 : sum / n;
}

/** Local contrast = |meanA − meanB|. */
export function localContrast(
  rgba: Uint8Array | Uint8ClampedArray | number[],
  width: number,
  height: number,
  a: RectRoi,
  b: RectRoi,
): number {
  return Math.abs(meanLumaRoi(rgba, width, height, a) - meanLumaRoi(rgba, width, height, b));
}

export type CharacterRoiLayout = {
  character: RectRoi;
  eyes: RectRoi;
  mouth: RectRoi;
  facialPlane: RectRoi;
  silhouetteEdge: RectRoi;
  background: RectRoi;
  shellBody: RectRoi;
};

/** Default layout for a centered character crop (normalized to width/height). */
export function defaultCharacterRoiLayout(
  width: number,
  height: number,
): CharacterRoiLayout {
  const cx = width * 0.5;
  const cy = height * 0.48;
  const bodyW = width * 0.42;
  const bodyH = height * 0.55;
  return {
    character: {
      x: cx - bodyW / 2,
      y: cy - bodyH / 2,
      w: bodyW,
      h: bodyH,
    },
    eyes: {
      x: cx - bodyW * 0.32,
      y: cy - bodyH * 0.12,
      w: bodyW * 0.64,
      h: bodyH * 0.14,
    },
    mouth: {
      x: cx - bodyW * 0.16,
      y: cy + bodyH * 0.08,
      w: bodyW * 0.32,
      h: bodyH * 0.1,
    },
    facialPlane: {
      x: cx - bodyW * 0.28,
      y: cy - bodyH * 0.14,
      w: bodyW * 0.56,
      h: bodyH * 0.36,
    },
    silhouetteEdge: {
      x: cx - bodyW * 0.52,
      y: cy - bodyH * 0.48,
      w: bodyW * 0.12,
      h: bodyH * 0.9,
    },
    background: {
      x: width * 0.02,
      y: height * 0.02,
      w: width * 0.12,
      h: height * 0.12,
    },
    shellBody: {
      x: cx - bodyW * 0.4,
      y: cy - bodyH * 0.35,
      w: bodyW * 0.18,
      h: bodyH * 0.55,
    },
  };
}

export type OpticalRoiMetrics = {
  characterMean: number;
  eyeMean: number;
  mouthMean: number;
  facialPlaneMean: number;
  backgroundMean: number;
  shellMean: number;
  faceBackgroundContrast: number;
  silhouetteEdgeContrast: number;
  buriedEmissionDelta: number;
};

export function measureOpticalRoiMetrics(
  rgba: Uint8Array | Uint8ClampedArray | number[],
  width: number,
  height: number,
  layout?: CharacterRoiLayout,
): OpticalRoiMetrics {
  const L = layout ?? defaultCharacterRoiLayout(width, height);
  const characterMean = meanLumaRoi(rgba, width, height, L.character);
  const eyeMean = meanLumaRoi(rgba, width, height, L.eyes);
  const mouthMean = meanLumaRoi(rgba, width, height, L.mouth);
  const facialPlaneMean = meanLumaRoi(rgba, width, height, L.facialPlane);
  const backgroundMean = meanLumaRoi(rgba, width, height, L.background);
  const shellMean = meanLumaRoi(rgba, width, height, L.shellBody);
  const edgeMean = meanLumaRoi(rgba, width, height, L.silhouetteEdge);
  const faceBackgroundContrast = Math.abs(
    Math.max(eyeMean, mouthMean, facialPlaneMean) - backgroundMean,
  );
  const silhouetteEdgeContrast = Math.abs(edgeMean - backgroundMean);
  const buriedEmissionDelta = Math.max(eyeMean, mouthMean) - shellMean;
  return {
    characterMean,
    eyeMean,
    mouthMean,
    facialPlaneMean,
    backgroundMean,
    shellMean,
    faceBackgroundContrast,
    silhouetteEdgeContrast,
    buriedEmissionDelta,
  };
}

export type OpticalLegibilityVerdict = {
  ok: boolean;
  blackFrame: boolean;
  buriedEmission: boolean;
  lowFaceBackgroundContrast: boolean;
  lostSilhouette: boolean;
  lowEyeLuma: boolean;
  lowMouthLuma: boolean;
  lowFacialPlaneLuma: boolean;
  metrics: OpticalRoiMetrics;
  floors: OpticalLegibilityFloors;
  stateClass: OpticalStateClass;
  failures: string[];
};

/**
 * Fail-closed evaluation against state floors.
 * Black frames, buried facial emission, insufficient face/background contrast,
 * or silhouette loss each force ok=false.
 */
export function evaluateOpticalLegibility(
  rgba: Uint8Array | Uint8ClampedArray | number[],
  width: number,
  height: number,
  stateClass: OpticalStateClass = "ordinary",
  layout?: CharacterRoiLayout,
): OpticalLegibilityVerdict {
  const floors = OPTICAL_LEGIBILITY_FLOORS[stateClass];
  const metrics = measureOpticalRoiMetrics(rgba, width, height, layout);
  const failures: string[] = [];

  const blackFrame = metrics.characterMean < floors.blackFrameMeanLuma;
  if (blackFrame) failures.push("black_frame");

  const buriedEmission =
    metrics.buriedEmissionDelta < floors.buriedEmissionDelta &&
    Math.max(metrics.eyeMean, metrics.mouthMean) < floors.eyeRoiLuma;
  if (buriedEmission) failures.push("buried_facial_emission");

  const lowFaceBackgroundContrast =
    metrics.faceBackgroundContrast < floors.faceBackgroundContrast;
  if (lowFaceBackgroundContrast) failures.push("insufficient_face_background_contrast");

  const lostSilhouette =
    metrics.silhouetteEdgeContrast < floors.silhouetteEdgeContrast &&
    metrics.characterMean < floors.roiMeanLuma * 1.5;
  if (lostSilhouette) failures.push("silhouette_loss");

  const lowEyeLuma = metrics.eyeMean < floors.eyeRoiLuma;
  if (lowEyeLuma) failures.push("eye_roi_below_floor");

  const lowMouthLuma = metrics.mouthMean < floors.mouthRoiLuma;
  if (lowMouthLuma) failures.push("mouth_roi_below_floor");

  const lowFacialPlaneLuma = metrics.facialPlaneMean < floors.facialPlaneLuma;
  if (lowFacialPlaneLuma) failures.push("facial_plane_below_floor");

  return {
    ok: failures.length === 0,
    blackFrame,
    buriedEmission,
    lowFaceBackgroundContrast,
    lostSilhouette,
    lowEyeLuma,
    lowMouthLuma,
    lowFacialPlaneLuma,
    metrics,
    floors,
    stateClass,
    failures,
  };
}

/**
 * Synthetic legible frame — luminous face features on dark Dais-like bg.
 * Used as positive fixture; NOT a product acceptance claim.
 */
export function synthesizeLegibleFrame(
  width: number,
  height: number,
  opts?: { faceBoost?: number; shellBoost?: number },
): Uint8Array {
  const faceBoost = opts?.faceBoost ?? 1;
  const shellBoost = opts?.shellBoost ?? 1;
  const buf = new Uint8Array(width * height * 4);
  const L = defaultCharacterRoiLayout(width, height);
  // Background ~ Dais dark
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = 8;
    buf[i + 1] = 6;
    buf[i + 2] = 14;
    buf[i + 3] = 255;
  }
  const fillRoi = (roi: RectRoi, r: number, g: number, b: number) => {
    const x0 = Math.max(0, Math.floor(roi.x));
    const y0 = Math.max(0, Math.floor(roi.y));
    const x1 = Math.min(width, Math.ceil(roi.x + roi.w));
    const y1 = Math.min(height, Math.ceil(roi.y + roi.h));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * width + x) * 4;
        buf[i] = r;
        buf[i + 1] = g;
        buf[i + 2] = b;
        buf[i + 3] = 255;
      }
    }
  };
  // Shell body — violet orb
  fillRoi(
    L.character,
    Math.round(40 * shellBoost),
    Math.round(20 * shellBoost),
    Math.round(90 * shellBoost),
  );
  // Silhouette rim brighter
  fillRoi(
    L.silhouetteEdge,
    Math.round(90 * shellBoost),
    Math.round(50 * shellBoost),
    Math.round(160 * shellBoost),
  );
  // Eyes — cyan emission
  fillRoi(
    L.eyes,
    Math.round(160 * faceBoost),
    Math.round(230 * faceBoost),
    Math.round(255 * faceBoost),
  );
  // Mouth
  fillRoi(
    L.mouth,
    Math.round(140 * faceBoost),
    Math.round(210 * faceBoost),
    Math.round(250 * faceBoost),
  );
  return buf;
}

/** Synthetic black/inert frame — R3 blackout class stand-in. */
export function synthesizeBlackFrame(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(width * height * 4);
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = 4;
    buf[i + 1] = 3;
    buf[i + 2] = 6;
    buf[i + 3] = 255;
  }
  // Faint outer orb only — no facial emission
  const L = defaultCharacterRoiLayout(width, height);
  const x0 = Math.floor(L.character.x);
  const y0 = Math.floor(L.character.y);
  const x1 = Math.ceil(L.character.x + L.character.w);
  const y1 = Math.ceil(L.character.y + L.character.h);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const nx = (x - (x0 + x1) / 2) / ((x1 - x0) / 2);
      const ny = (y - (y0 + y1) / 2) / ((y1 - y0) / 2);
      const r = Math.sqrt(nx * nx + ny * ny);
      if (r > 0.85 && r < 1.05) {
        const i = (y * width + x) * 4;
        buf[i] = 18;
        buf[i + 1] = 12;
        buf[i + 2] = 28;
      }
    }
  }
  return buf;
}

/**
 * Relative luminosity score for state comparison (not absolute product QA).
 * Ordinary Neutral/Listening samples must score above Dormant/Blocked when
 * both clear floors — proves we did not flat-equalize all states.
 */
export function stateRelativeLuminosityScore(
  faceEmissionOpacity: number,
  eyeOpacity: number,
  energyLevel: number,
): number {
  return (
    faceEmissionOpacity * 0.45 +
    eyeOpacity * 0.35 +
    Math.max(0, Math.min(1, energyLevel)) * 0.2
  );
}

/**
 * Assert state-relative ordering without equalizing.
 * Returns true when dormant/blocked are dimmer than ordinary yet both clear floors.
 */
export function assertStateRelativeOrdering(samples: {
  ordinary: { faceEmission: number; eye: number; energy: number };
  dormant: { faceEmission: number; eye: number; energy: number };
  blocked: { faceEmission: number; eye: number; energy: number };
}): { ok: boolean; reasons: string[]; scores: Record<string, number> } {
  const reasons: string[] = [];
  const ordFloor = OPTICAL_LEGIBILITY_FLOORS.ordinary;
  const dormFloor = OPTICAL_LEGIBILITY_FLOORS.dormant;
  const blockFloor = OPTICAL_LEGIBILITY_FLOORS.blocked;

  if (samples.ordinary.faceEmission < ordFloor.faceEmissionOpacity) {
    reasons.push("ordinary_face_below_floor");
  }
  if (samples.dormant.faceEmission < dormFloor.faceEmissionOpacity) {
    reasons.push("dormant_face_below_floor");
  }
  if (samples.blocked.faceEmission < blockFloor.faceEmissionOpacity) {
    reasons.push("blocked_face_below_floor");
  }

  const scores = {
    ordinary: stateRelativeLuminosityScore(
      samples.ordinary.faceEmission,
      samples.ordinary.eye,
      samples.ordinary.energy,
    ),
    dormant: stateRelativeLuminosityScore(
      samples.dormant.faceEmission,
      samples.dormant.eye,
      samples.dormant.energy,
    ),
    blocked: stateRelativeLuminosityScore(
      samples.blocked.faceEmission,
      samples.blocked.eye,
      samples.blocked.energy,
    ),
  };

  if (!(scores.dormant < scores.ordinary)) {
    reasons.push("dormant_not_dimmer_than_ordinary");
  }
  if (!(scores.blocked < scores.ordinary)) {
    reasons.push("blocked_not_dimmer_than_ordinary");
  }
  // Dormant should not match ordinary (no flat global gain).
  if (Math.abs(scores.ordinary - scores.dormant) < 0.04) {
    reasons.push("states_equalized_global_brightness");
  }

  return { ok: reasons.length === 0, reasons, scores };
}

/**
 * Predict effective face visibility through multiply + emission stack (pure).
 * Models opticalDepth multiply then face emission alpha over dark recess.
 */
export function predictCompositeFaceVisibility(input: {
  faceEmissionOpacity: number;
  eyeOpacity: number;
  opticalDepthOpacity: number;
  faceRecessContribution?: number;
  baseShellLuma?: number;
  emissionLuma?: number;
}): number {
  const base = input.baseShellLuma ?? 0.08;
  const emission = input.emissionLuma ?? 0.72;
  const depth = Math.max(0, Math.min(1, input.opticalDepthOpacity));
  // Multiply darkens toward black: luma' = luma * (1 - depth * 0.85)
  const afterDepth = base * (1 - depth * 0.85);
  const recess = input.faceRecessContribution ?? 0.15;
  const afterRecess = afterDepth * (1 - recess * 0.5);
  const emOp = Math.max(0, Math.min(1, input.faceEmissionOpacity));
  const eyeOp = Math.max(0, Math.min(1, input.eyeOpacity));
  const faceAlpha = emOp * eyeOp;
  // Source-over emission
  return afterRecess * (1 - faceAlpha) + emission * faceAlpha;
}

/** SVG baseline constants expected after R4 material repair (attribute floors). */
export const SVG_MATERIAL_BASELINE = {
  opticalDepthOpacityMax: 0.48,
  lobeShadeOpacityMax: 0.55,
  /** opticalDepthGrad center stop-opacity must not exceed this. */
  opticalDepthCenterStopMax: 0.58,
  /** faceRecessGrad center stop-opacity max. */
  faceRecessCenterStopMax: 0.48,
  /** lobeShade edge stop-opacity max. */
  lobeShadeEdgeStopMax: 0.72,
  revisionToken: "r4-optical-legibility",
  /** Marker that CSS !important floors are embedded in the SVG asset. */
  cssFloorsStyleId: "r4OpticalLegibilityFloors",
  /** facePresentFraction telemetry is non-optical — never acceptance. */
  facePresentTelemetryIsNonOptical: true,
} as const;

/**
 * Prove clamp durability: mixer-proposed low emission raised, then a second
 * "mixer overwrite" still raised when re-clamped (hold-last-good under overwrite).
 */
export function proveHoldLastGoodUnderMixerOverwrite(
  stateClass: OpticalStateClass = "ordinary",
): {
  ok: boolean;
  afterMixer: number;
  afterClamp: number;
  afterOverwrite: number;
  afterReclamp: number;
} {
  const floor = OPTICAL_LEGIBILITY_FLOORS[stateClass].faceEmissionOpacity;
  const afterMixer = mixerFaceEmissionOpacity(0.1); // ~0.21
  const afterClamp = clampFaceEmissionOpacity(afterMixer, stateClass);
  // Simulate living tick rewriting low opacity again
  const afterOverwrite = mixerFaceEmissionOpacity(0.05);
  const afterReclamp = clampFaceEmissionOpacity(afterOverwrite, stateClass);
  const ok =
    afterMixer < floor &&
    afterClamp >= floor &&
    afterOverwrite < floor &&
    afterReclamp >= floor &&
    afterReclamp === floor;
  return { ok, afterMixer, afterClamp, afterOverwrite, afterReclamp };
}
