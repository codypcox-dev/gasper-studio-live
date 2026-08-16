/**
 * DocumentFacialGeometry — bind facial continuum channels onto visible document
 * feature geometry (eye / mouth / shell / cheek / brow / energy).
 *
 * Pure geometry math: no GSAP tick ownership, no AgentBridge HQ, no DOM required.
 * When an SVG root is supplied, the same geometry writes as attributes/transforms
 * for packaged-document instrumentation. Measures are finite non-null spans taken
 * from document feature boxes — never abstract channel echoes alone.
 */

import {
  attachmentResiduals,
  enforceExpressionVisibilityFloors,
  isChannelMapBlackOrInert,
  resolveFeaturePositions,
  type FacialChannelMap,
  type ExpressionVisibilityMode,
} from "../../../../shared/src/gasper/facial";
import { PHYSICAL_BASELINE } from "../expression/grammar";

/** Minimum rendered feature opacities — reject black/inert contact-sheet class. */
export const MIN_RENDERED_FEATURE_OPACITY = Object.freeze({
  eye: 0.55,
  mouth: 0.62,
  shell: 0.78,
  energy: 0.22,
});

/** Minimum feature box spans (document units) for non-inert geometry. */
export const MIN_RENDERED_FEATURE_SPAN = Object.freeze({
  eyeH: 2.2,
  mouthH: 1.8,
  mouthW: 12,
  energy: 18,
  shellW: 90,
  shellH: 95,
});

/** Axis-aligned feature box in document SVG space (viewBox units). */
export type DocumentFeatureBBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
};

/** One document facial frame after channel → geometry projection. */
export type DocumentFacialGeometry = {
  revision: number;
  /** Semantic / fixture id last applied (when known). */
  expressionId: string;
  channels: FacialChannelMap;
  shell: DocumentFeatureBBox & {
    scaleX: number;
    scaleY: number;
    opacity: number;
  };
  facePlane: DocumentFeatureBBox & { scale: number };
  eyeL: DocumentFeatureBBox & {
    openness: number;
    pathD: string;
    opacity: number;
  };
  eyeR: DocumentFeatureBBox & {
    openness: number;
    pathD: string;
    opacity: number;
  };
  mouth: DocumentFeatureBBox & {
    openness: number;
    width: number;
    curve: number;
    pathD: string;
    opacity: number;
  };
  cheekL: DocumentFeatureBBox;
  cheekR: DocumentFeatureBBox;
  browL: DocumentFeatureBBox;
  browR: DocumentFeatureBBox;
  energy: DocumentFeatureBBox & {
    level: number;
    pulse: number;
    glow: number;
    opacity: number;
  };
  /** Attachment residuals (0 = locked to shell/face lattice). */
  attachment: Record<string, number>;
  /** Deterministic path signature for route distinctness (not pixel bytes). */
  signature: string;
};

/** Finite instrumented measures over document geometry. */
export type DocumentGeometryMeasures = {
  eyeOpenness: number;
  mouthOpenness: number;
  energyLevel: number;
  eyeSpanH: number;
  mouthSpanH: number;
  energySpan: number;
  eyeL: DocumentFeatureBBox;
  eyeR: DocumentFeatureBBox;
  mouth: DocumentFeatureBBox;
  energy: DocumentFeatureBBox;
  shell: DocumentFeatureBBox;
  attachmentMax: number;
  /** Compact feature vector for pairwise separation (document-derived). */
  featureVector: number[];
  signature: string;
};

export type DocumentGeometrySequenceReport = {
  frameCount: number;
  expressionIds: string[];
  eyeOpenness: { min: number; max: number; span: number };
  mouthOpenness: { min: number; max: number; span: number };
  energyLevel: { min: number; max: number; span: number };
  featureMotionDetected: boolean;
  maxFrameDelta: number;
  attachmentMaxPeak: number;
  scaleJumpFrames: number[];
  /** Frames where scale-normalized semantic geometry teleports (facial discontinuity). */
  facialSnapFrames: number[];
  continuous: boolean;
  signatures: string[];
  measures: DocumentGeometryMeasures[];
};

/** Max scale-normalized semantic geometry step between adjacent document frames. */
export const MAX_DOCUMENT_FACIAL_STEP = 0.22;

/** Canonical packaged document face lattice (matches gasper-rig face plane). */
export const DOCUMENT_FACE_LATTICE = Object.freeze({
  originX: 120,
  originY: 120,
  eyeLY: 99,
  eyeRY: 99,
  eyeLX: 84,
  eyeRX: 156,
  mouthX: 121,
  mouthY: 140,
  eyeBaseW: 22,
  eyeBaseH: 11,
  mouthBaseW: 30,
  mouthBaseH: 8,
  shellBaseW: 140,
  shellBaseH: 150,
  energyBaseR: 28,
  cheekOffsetX: 28,
  cheekOffsetY: 18,
  browOffsetY: -14,
});

/** Six production expression routes that must be document-distinct. */
export const SIX_EXPRESSION_TARGETS = Object.freeze([
  { id: "Neutral", targetId: "neutral" },
  { id: "Listening", targetId: "listening" },
  { id: "Thinking", targetId: "thinking" },
  { id: "Recognition", targetId: "recognition" },
  { id: "Blocked", targetId: "blocked" },
  { id: "Pleased", targetId: "pleased" },
] as const);

/** Minimum L2 separation on document feature vectors (non-trivial floor). */
export const MIN_DOCUMENT_GEOMETRY_SEPARATION = 0.12;

/** Max |Δscale| per frame before counting as a discrete scale jump. */
export const MAX_DOCUMENT_SCALE_STEP = 0.12;

/** Resolve visibility mode from expression / embodiment id labels. */
export function visibilityModeForExpression(
  expressionId?: string,
): ExpressionVisibilityMode {
  if (!expressionId) return "presence";
  const id = expressionId.toLowerCase();
  if (id.includes("dormant")) return "dormant";
  if (id.includes("wake")) return "wake";
  if (id.includes("interrupt") || id.includes("hold_last") || id.includes("reset"))
    return "interrupt";
  return "presence";
}

/**
 * True when rendered document geometry is effectively black/inert:
 * near-zero opacities, degenerate feature spans, or channel-map blackout.
 */
export function isRenderedBlackOrInert(geom: DocumentFacialGeometry): boolean {
  if (isChannelMapBlackOrInert(geom.channels, visibilityModeForExpression(geom.expressionId))) {
    return true;
  }
  if (geom.eyeL.opacity < MIN_RENDERED_FEATURE_OPACITY.eye * 0.85) return true;
  if (geom.eyeR.opacity < MIN_RENDERED_FEATURE_OPACITY.eye * 0.85) return true;
  if (geom.mouth.opacity < MIN_RENDERED_FEATURE_OPACITY.mouth * 0.85) return true;
  if (geom.shell.opacity < MIN_RENDERED_FEATURE_OPACITY.shell * 0.85) return true;
  if (geom.energy.opacity < MIN_RENDERED_FEATURE_OPACITY.energy * 0.7) return true;
  if (geom.eyeL.h < MIN_RENDERED_FEATURE_SPAN.eyeH * 0.5) return true;
  if (geom.mouth.h < MIN_RENDERED_FEATURE_SPAN.mouthH * 0.5) return true;
  if (geom.mouth.w < MIN_RENDERED_FEATURE_SPAN.mouthW * 0.5) return true;
  if (geom.energy.w < MIN_RENDERED_FEATURE_SPAN.energy * 0.5) return true;
  // Outer-orb-only: shell present but eyes/mouth paths empty or identical points.
  if (geom.eyeL.pathD.length < 12 || geom.mouth.pathD.length < 12) return true;
  if (geom.eyeL.pathD === geom.mouth.pathD) return true;
  return false;
}

/**
 * Compact rendered signature for route distinctness tests.
 * Includes opacity + path + multi-domain geometry so black/inert routes hash differently
 * from legible holds (and pairwise identity fails closed).
 */
export function renderedGeometrySignature(geom: DocumentFacialGeometry): string {
  return [
    documentGeometrySignature(geom),
    `eop=${round4(geom.eyeL.opacity)}`,
    `mop=${round4(geom.mouth.opacity)}`,
    `sop=${round4(geom.shell.opacity)}`,
    `enop=${round4(geom.energy.opacity)}`,
    `glow=${round4(geom.energy.glow)}`,
    `eh=${round4(geom.eyeL.h)}`,
    `mh=${round4(geom.mouth.h)}`,
    `mc=${round4(geom.mouth.curve)}`,
    `br=${round4(num(geom.channels.brow_raise, 0))}`,
    `ul=${round4(num(geom.channels.upper_lid_aperture, geom.eyeL.openness))}`,
    `ll=${round4(num(geom.channels.lower_lid_aperture, 0.5))}`,
    `ga=${round4(num(geom.channels.gaze_action, 0))}`,
    `ct=${round4(num(geom.channels.cheek_tension, 0.3))}`,
    `fa=${round4(num(geom.channels.face_asymmetry, 0))}`,
    `black=${isRenderedBlackOrInert(geom) ? 1 : 0}`,
  ].join(";");
}

/**
 * Feature attachment residual floor — eyes/mouth must stay co-embodied with shell.
 * Returns max abs residual across attachment keys.
 */
export function maxAttachmentResidual(geom: DocumentFacialGeometry): number {
  let m = 0;
  for (const v of Object.values(geom.attachment)) {
    const a = Math.abs(v);
    if (a > m) m = a;
  }
  return m;
}

/** Identity attachment residual floor for continuous routes. */
export const MAX_ATTACHMENT_RESIDUAL_FLOOR = 0.12;

function num(v: number | undefined, d: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : d;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function round4(v: number): number {
  return Math.round(v * 1e4) / 1e4;
}

function bbox(cx: number, cy: number, w: number, h: number): DocumentFeatureBBox {
  const ww = Math.max(1e-4, w);
  const hh = Math.max(1e-4, h);
  return {
    x: cx - ww / 2,
    y: cy - hh / 2,
    w: ww,
    h: hh,
    cx,
    cy,
  };
}

/**
 * Eye path in document coordinates — dual-lid aperture + optional tilt.
 * upperLid / lowerLid in [0,1] bias the upper and lower arcs independently so
 * expressions are not the same ellipse merely scaled (same-mask rejection).
 */
export function eyePathD(
  cx: number,
  cy: number,
  w: number,
  h: number,
  opts?: { upperLid?: number; lowerLid?: number; tilt?: number },
): string {
  const rx = Math.max(0.5, w / 2);
  const baseRy = Math.max(0.35, h / 2);
  const upperLid = clamp(num(opts?.upperLid, 0.56), 0.08, 0.95);
  const lowerLid = clamp(num(opts?.lowerLid, 0.5), 0.08, 0.95);
  // Independent lid apertures → asymmetric vertical extents (not uniform scale).
  const upperRy = baseRy * (0.55 + upperLid * 0.9);
  const lowerRy = baseRy * (0.45 + lowerLid * 0.95);
  const tilt = clamp(num(opts?.tilt, 0), -0.35, 0.35);
  // Tilt shears left/right corners slightly (coherent eye plane, not free float).
  const tiltY = tilt * rx * 0.35;
  const k = 0.5522847498;
  const ox = rx * k;
  const oyU = upperRy * k;
  const oyL = lowerRy * k;
  return [
    `M ${round4(cx - rx)} ${round4(cy + tiltY)}`,
    `C ${round4(cx - rx)} ${round4(cy - oyU + tiltY * 0.5)} ${round4(cx - ox)} ${round4(cy - upperRy)} ${round4(cx)} ${round4(cy - upperRy)}`,
    `C ${round4(cx + ox)} ${round4(cy - upperRy)} ${round4(cx + rx)} ${round4(cy - oyU - tiltY * 0.5)} ${round4(cx + rx)} ${round4(cy - tiltY)}`,
    `C ${round4(cx + rx)} ${round4(cy + oyL - tiltY * 0.5)} ${round4(cx + ox)} ${round4(cy + lowerRy)} ${round4(cx)} ${round4(cy + lowerRy)}`,
    `C ${round4(cx - ox)} ${round4(cy + lowerRy)} ${round4(cx - rx)} ${round4(cy + oyL + tiltY * 0.5)} ${round4(cx - rx)} ${round4(cy + tiltY)}`,
    "Z",
  ].join(" ");
}

/** Mouth path — continuous arc that co-deforms with corner pulls (not a frozen arc). */
export function mouthPathD(
  cx: number,
  cy: number,
  w: number,
  h: number,
  curve: number,
  pullL: number,
  pullR: number,
): string {
  const halfW = Math.max(1, w / 2);
  const ap = Math.max(0.4, h / 2);
  const leftY = cy - curve * 5.5 - pullL * 4.2;
  const rightY = cy - curve * 5.5 - pullR * 4.2;
  const leftX = cx - halfW;
  const rightX = cx + halfW;
  const topY = cy - ap - curve * 0.6;
  const bottomY = cy + ap + curve * 1.8;
  return [
    `M ${round4(leftX)} ${round4(leftY)}`,
    `C ${round4(cx - halfW * 0.35)} ${round4(topY - pullL * 0.6)} ${round4(cx - halfW * 0.1)} ${round4(topY)} ${round4(cx)} ${round4(topY)}`,
    `C ${round4(cx + halfW * 0.1)} ${round4(topY)} ${round4(cx + halfW * 0.35)} ${round4(topY - pullR * 0.6)} ${round4(rightX)} ${round4(rightY)}`,
    `C ${round4(cx + halfW * 0.28)} ${round4(bottomY + pullR * 0.25)} ${round4(cx + halfW * 0.08)} ${round4(bottomY)} ${round4(cx)} ${round4(bottomY)}`,
    `C ${round4(cx - halfW * 0.08)} ${round4(bottomY)} ${round4(cx - halfW * 0.28)} ${round4(bottomY + pullL * 0.25)} ${round4(leftX)} ${round4(leftY)}`,
    "Z",
  ].join(" ");
}

/**
 * Project multi-domain facial channels onto document feature geometry.
 * Eyes/mouth co-deform with shell + cheek/brow volume (one body, stable attachment).
 * Visibility floors prevent black/inert holds (R4 expression visibility).
 */
export function applyChannelsToDocumentGeometry(
  channels: FacialChannelMap,
  opts?: {
    expressionId?: string;
    revision?: number;
    visibilityMode?: ExpressionVisibilityMode;
  },
): DocumentFacialGeometry {
  const L = DOCUMENT_FACE_LATTICE;
  const mode = opts?.visibilityMode ?? visibilityModeForExpression(opts?.expressionId);
  const ch: FacialChannelMap = enforceExpressionVisibilityFloors(
    { ...PHYSICAL_BASELINE, ...channels },
    mode,
  );

  const overallW = clamp(num(ch.overall_width, 1), 0.55, 1.55);
  const overallH = clamp(num(ch.overall_height, 1), 0.55, 1.55);
  const faceScale = clamp(num(ch.face_scale, 1), 0.7, 1.35);
  // Whole-face morphology channels (fall back to legacy continuum keys).
  const upperLid = clamp(
    num(ch.upper_lid_aperture, num(ch.eye_openness, 0.56)),
    0.08,
    0.95,
  );
  const lowerLid = clamp(num(ch.lower_lid_aperture, 0.5), 0.08, 0.95);
  const eyeOpen = clamp(
    num(ch.eye_openness, upperLid * 0.72 + lowerLid * 0.28),
    0.08,
    0.95,
  );
  const eyeSpacing = clamp(
    num(ch.inter_eye_relation, num(ch.eye_spacing, 0)),
    -0.35,
    0.35,
  );
  const eyeTilt = clamp(num(ch.eye_tilt, 0), -0.35, 0.35);
  const browRaise = clamp(num(ch.brow_raise, 0), -0.4, 0.5);
  const mouthCurvature = clamp(num(ch.mouth_curvature, 0), -0.5, 0.5);
  const cheekTension = clamp(
    num(ch.cheek_tension, num(ch.skin_tension, 0.36)),
    0,
    1,
  );
  const facePlaneTension = clamp(
    num(ch.face_plane_tension, num(ch.skin_tension, 0.36)),
    0,
    1,
  );
  const contourBias = clamp(num(ch.contour_bias, 0), -0.3, 0.3);
  const faceAsymmetry = clamp(num(ch.face_asymmetry, 0), -0.3, 0.3);
  const gazeAction = clamp(num(ch.gaze_action, num(ch.gaze, 0)), -0.5, 0.5);
  const gaze = clamp(num(ch.gaze, gazeAction), -0.5, 0.5);
  const mouthOpen = clamp(
    num(ch.mouth_aperture, num(ch.mouth_openness, 0.32)),
    0.05,
    0.75,
  );
  const mouthWidth = clamp(num(ch.mouth_width, 1), 0.55, 1.45);
  const pullL = clamp(num(ch.corner_pull_l, mouthCurvature * 0.55), -0.45, 0.45);
  const pullR = clamp(num(ch.corner_pull_r, mouthCurvature * 0.55), -0.45, 0.45);
  const energyLevel = clamp(num(ch.energy_level, 0.52), 0.05, 1);
  const energyPulse = clamp(num(ch.energy_pulse, 0.16), 0, 1);
  const internalGlow = clamp(num(ch.internal_glow, 0.48), 0, 1);
  const faceEmissive = clamp(num(ch.face_emissive, 0.32), 0, 1);
  const skinTension = clamp(
    num(ch.skin_tension, facePlaneTension * 0.65 + cheekTension * 0.35),
    0,
    1,
  );
  const crown = clamp(num(ch.crown_height, 0.04), 0, 0.35);
  const ground = clamp(num(ch.ground_flattening, 0), 0, 0.4);
  const relief = clamp(num(ch.relief_amplitude, 0.42), 0, 1);

  // Shell volume — co-basis for all facial attachment; contour_bias warps outline
  // without global squash/stretch (identity-preserving local contour).
  const shellSx = overallW * (1 + contourBias * 0.04);
  const shellSy =
    overallH * (1 - ground * 0.08) * (1 - contourBias * 0.03) + crown * 0.12;
  const shellW = Math.max(MIN_RENDERED_FEATURE_SPAN.shellW, L.shellBaseW * shellSx);
  const shellH = Math.max(MIN_RENDERED_FEATURE_SPAN.shellH, L.shellBaseH * shellSy);
  const shell = {
    ...bbox(L.originX, L.originY, shellW, shellH),
    scaleX: shellSx,
    scaleY: shellSy,
    opacity: Math.max(
      MIN_RENDERED_FEATURE_OPACITY.shell,
      0.88 + energyLevel * 0.1,
    ),
  };

  // Normalized lattice positions (shared tissue), then map into document space.
  const anchors = resolveFeaturePositions(ch);
  const docScaleX = (L.shellBaseW * 0.5) * shellSx;
  const docScaleY = (L.shellBaseH * 0.5) * shellSy;

  const faceCx =
    L.originX + anchors.face_plane.x * docScaleX + faceAsymmetry * 2.2;
  const faceCy =
    L.originY - anchors.face_plane.y * docScaleY - facePlaneTension * 1.2;
  const facePlane = {
    ...bbox(
      faceCx,
      faceCy,
      90 * faceScale * shellSx * (1 + contourBias * 0.03),
      70 * faceScale * shellSy * (1 - facePlaneTension * 0.04),
    ),
    scale: faceScale,
  };

  // Eyes — dual-lid apertures + tilt + inter-eye relation (not single eye_openness scale).
  const lidOpenComposite = upperLid * 0.72 + lowerLid * 0.28;
  const eyeW =
    L.eyeBaseW *
    (0.9 + lidOpenComposite * 0.1 + Math.abs(eyeTilt) * 0.04) *
    faceScale *
    shellSx;
  const eyeH =
    L.eyeBaseH *
    (0.22 + upperLid * 0.45 + lowerLid * 0.33) *
    faceScale *
    shellSy;
  const spacingPx = eyeSpacing * 10 * shellSx;
  const gazePx = gazeAction * 6 * shellSx;
  // Rest lattice + continuum offset so features stay attached under shell motion.
  const eyeLCx =
    L.eyeLX * shellSx +
    L.originX * (1 - shellSx) +
    anchors.eye_left.x * docScaleX * 0.15 +
    -spacingPx +
    gazePx -
    faceAsymmetry * 1.2;
  const eyeRCx =
    L.eyeRX * shellSx +
    L.originX * (1 - shellSx) +
    anchors.eye_right.x * docScaleX * 0.15 +
    spacingPx +
    gazePx +
    faceAsymmetry * 1.2;
  // Vertical: face plane + shell + brow raise + plane tension (coordinated).
  const eyeBaseY =
    L.eyeLY * shellSy +
    L.originY * (1 - shellSy) +
    (faceScale - 1) * 6 -
    facePlaneTension * 1.5 +
    browRaise * 3.5;
  // Asymmetry + tilt: left/right eyes not identical vertical offsets.
  const eyeLCy =
    eyeBaseY +
    (anchors.eye_left.y - 0.16) * docScaleY * 0.2 +
    eyeTilt * 2.4 +
    faceAsymmetry * 1.1;
  const eyeRCy =
    eyeBaseY +
    (anchors.eye_right.y - 0.16) * docScaleY * 0.2 -
    eyeTilt * 2.4 -
    faceAsymmetry * 0.6;

  // Opacity floors: never drop eyes into black/inert (R3 contact-sheet class).
  const eyeOpacity = Math.max(
    MIN_RENDERED_FEATURE_OPACITY.eye,
    0.55 + eyeOpen * 0.45,
  );
  const eyeLBox = bbox(eyeLCx, eyeLCy, Math.max(eyeW, 4), Math.max(eyeH, MIN_RENDERED_FEATURE_SPAN.eyeH));
  const eyeRBox = bbox(
    eyeRCx,
    eyeRCy,
    Math.max(eyeW * (1 + faceAsymmetry * 0.04), 4),
    Math.max(eyeH, MIN_RENDERED_FEATURE_SPAN.eyeH),
  );
  const eyeL = {
    ...eyeLBox,
    openness: eyeOpen,
    pathD: eyePathD(eyeLCx, eyeLCy, eyeLBox.w, eyeLBox.h, {
      upperLid,
      lowerLid,
      tilt: eyeTilt + faceAsymmetry * 0.15,
    }),
    opacity: eyeOpacity,
  };
  const eyeR = {
    ...eyeRBox,
    openness: eyeOpen,
    pathD: eyePathD(eyeRCx, eyeRCy, eyeRBox.w, eyeRBox.h, {
      upperLid: upperLid * (1 - faceAsymmetry * 0.05),
      lowerLid,
      tilt: -eyeTilt - faceAsymmetry * 0.1,
    }),
    opacity: eyeOpacity,
  };

  // Mouth — curvature channel drives arc shape; aperture drives opening (not width-only).
  const mW = Math.max(
    MIN_RENDERED_FEATURE_SPAN.mouthW,
    L.mouthBaseW * mouthWidth * faceScale * shellSx,
  );
  const mH = Math.max(
    MIN_RENDERED_FEATURE_SPAN.mouthH,
    L.mouthBaseH *
      (0.35 + mouthOpen * 1.35 + Math.abs(mouthCurvature) * 0.15) *
      faceScale *
      shellSy,
  );
  const mouthCx =
    L.mouthX * shellSx +
    L.originX * (1 - shellSx) +
    (pullR - pullL) * 2.4 +
    faceAsymmetry * 1.8 +
    anchors.mouth_center.x * docScaleX * 0.1;
  const mouthCy =
    L.mouthY * shellSy +
    L.originY * (1 - shellSy) +
    mouthOpen * 3.2 -
    (faceScale - 1) * 4 -
    mouthCurvature * 2.8 +
    cheekTension * 0.8 +
    (anchors.mouth_center.y + 0.1) * docScaleY * 0.15;
  const mouthCurve =
    mouthCurvature * 0.85 + (pullL + pullR) * 0.25 + mouthOpen * 0.06;
  const mouthBox = bbox(mouthCx, mouthCy, mW, mH);
  const mouth = {
    ...mouthBox,
    openness: mouthOpen,
    width: mouthWidth,
    curve: mouthCurve,
    pathD: mouthPathD(mouthCx, mouthCy, mW, mH, mouthCurve, pullL, pullR),
    opacity: Math.max(
      MIN_RENDERED_FEATURE_OPACITY.mouth,
      0.7 + mouthOpen * 0.25,
    ),
  };

  // Cheeks / brows — coordinated with cheek_tension / brow_raise (shell-coupled).
  const cheekW =
    18 * faceScale * shellSx * (1 + relief * 0.08 + cheekTension * 0.12);
  const cheekH =
    14 * faceScale * shellSy * (1 + cheekTension * 0.18 + facePlaneTension * 0.06);
  const cheekY =
    faceCy + L.cheekOffsetY * shellSy - cheekTension * 1.4 - mouthCurvature * 1.2;
  const cheekL = bbox(
    faceCx - L.cheekOffsetX * faceScale * shellSx - faceAsymmetry * 1.5,
    cheekY + faceAsymmetry * 0.8,
    cheekW,
    cheekH,
  );
  const cheekR = bbox(
    faceCx + L.cheekOffsetX * faceScale * shellSx + faceAsymmetry * 1.5,
    cheekY - faceAsymmetry * 0.5,
    cheekW * (1 + cheekTension * 0.04),
    cheekH,
  );
  const browW = 16 * faceScale * shellSx * (1 + Math.abs(browRaise) * 0.08);
  const browH =
    4 * faceScale * shellSy * (0.75 + facePlaneTension * 0.35 + Math.abs(browRaise) * 0.25);
  const browY =
    eyeLCy + L.browOffsetY * shellSy - browRaise * 5.5 - facePlaneTension * 1.2;
  const browL = bbox(
    eyeLCx - faceAsymmetry * 0.8,
    browY + eyeTilt * 1.2,
    browW,
    browH,
  );
  const browR = bbox(
    eyeRCx + faceAsymmetry * 0.8,
    browY - eyeTilt * 1.2 - browRaise * 0.4,
    browW,
    browH,
  );

  // Energy core — interior volume scales with energy_level / pulse / glow.
  // Never collapse to invisible orb-only darkness (reset/interrupt residual class).
  const energyR = Math.max(
    MIN_RENDERED_FEATURE_SPAN.energy / 2,
    L.energyBaseR *
      shellSx *
      (0.75 + energyLevel * 0.55 + energyPulse * 0.12) *
      (0.9 + internalGlow * 0.2),
  );
  const energyCx = L.originX + anchors.energy_core.x * docScaleX;
  const energyCy = L.originY - anchors.energy_core.y * docScaleY;
  const energy = {
    ...bbox(energyCx, energyCy, energyR * 2, energyR * 2),
    level: energyLevel,
    pulse: energyPulse,
    glow: Math.max(0.12, internalGlow * 0.6 + faceEmissive * 0.4),
    opacity: Math.max(
      MIN_RENDERED_FEATURE_OPACITY.energy,
      0.15 + energyLevel * 0.55,
    ),
  };

  const attachment = attachmentResiduals(ch);
  const expressionId = opts?.expressionId ?? "unknown";
  const revision = opts?.revision ?? 0;

  const geom: DocumentFacialGeometry = {
    revision,
    expressionId,
    channels: { ...ch },
    shell,
    facePlane,
    eyeL,
    eyeR,
    mouth,
    cheekL,
    cheekR,
    browL,
    browR,
    energy,
    attachment,
    signature: "",
  };
  geom.signature = documentGeometrySignature(geom);
  return geom;
}

/** Rest pose document geometry (physical baseline / Neutral floor seed). */
export function createRestDocumentGeometry(): DocumentFacialGeometry {
  return applyChannelsToDocumentGeometry(
    { ...PHYSICAL_BASELINE },
    { expressionId: "neutral-settled", revision: 0 },
  );
}

/**
 * Geometry-derived whole-face proxies (no raw channel echoes).
 * Path/box deformation cues for document featureVector multi-domain separation.
 * Note: additive pixel offsets in the lattice are not pure homothety under
 * face_scale — use scaleNormalizedSemanticVector for same-mask rejection.
 */
export function geometryDerivedMorphologyVector(
  geom: DocumentFacialGeometry,
): number[] {
  const faceW = Math.max(1e-6, geom.facePlane.w);
  const faceH = Math.max(1e-6, geom.facePlane.h);
  const eyeOpenness = (geom.eyeL.openness + geom.eyeR.openness) / 2;
  const eyeH = (geom.eyeL.h + geom.eyeR.h) / 2;
  const browCy = (geom.browL.cy + geom.browR.cy) / 2;
  const eyeCy = (geom.eyeL.cy + geom.eyeR.cy) / 2;
  const cheekCy = (geom.cheekL.cy + geom.cheekR.cy) / 2;
  const cheekW = (geom.cheekL.w + geom.cheekR.w) / 2;
  const browH = (geom.browL.h + geom.browR.h) / 2;

  const browAboveEye = (eyeCy - browCy) / faceH;
  const lidHeightRatio = eyeH / faceH;
  const upperLidProxy = lidHeightRatio * 0.55 + eyeOpenness * 0.45;
  const lowerLidProxy =
    Math.max(0, 0.35 - lidHeightRatio) * 0.8 +
    (1 - eyeOpenness) * 0.15;
  const eyeTiltProxy = (geom.eyeL.cy - geom.eyeR.cy) / faceH;
  const interEyeProxy = (geom.eyeR.cx - geom.eyeL.cx) / faceW;
  const cheekRaise = (cheekCy - geom.mouth.cy) / faceH;
  const cheekBulk = cheekW / faceW;
  const browBulk = browH / faceH;
  const facePlaneAspect = faceW / faceH;
  const contourProxy =
    geom.shell.scaleY > 1e-6
      ? geom.shell.scaleX / geom.shell.scaleY - 1
      : 0;
  const asymmetryProxy =
    (geom.mouth.cx - geom.facePlane.cx) / faceW +
    (geom.cheekR.w - geom.cheekL.w) / Math.max(1e-6, cheekW * 2);
  const gazeProxy =
    ((geom.eyeL.cx + geom.eyeR.cx) / 2 - geom.facePlane.cx) / faceW;

  return [
    browAboveEye,
    upperLidProxy,
    lowerLidProxy,
    eyeTiltProxy,
    interEyeProxy,
    geom.mouth.curve,
    geom.mouth.openness,
    cheekBulk + cheekRaise * 0.35 + browBulk * 0.15,
    facePlaneAspect,
    contourProxy,
    asymmetryProxy,
    gazeProxy,
  ];
}

/**
 * Scale-free semantic vector for same-mask rejection.
 *
 * Lattice offsets are additive (not pure homothety under face_scale), so box
 * spans alone cannot prove same-mask. This vector uses document openness/curve
 * fields plus the morphology channels carried on the geometry — the authoritative
 * axes isSameMaskScalingOnly already uses. Pure global scale leaves this near 0;
 * real multi-domain holds separate strongly.
 */
export function scaleNormalizedSemanticVector(
  geom: DocumentFacialGeometry,
): number[] {
  const ch = geom.channels;
  return [
    geom.eyeL.openness,
    geom.eyeR.openness,
    geom.mouth.openness,
    geom.mouth.curve,
    num(ch.brow_raise, 0),
    num(ch.upper_lid_aperture, geom.eyeL.openness),
    num(ch.lower_lid_aperture, 0.5),
    num(ch.eye_tilt, 0),
    num(ch.inter_eye_relation, num(ch.eye_spacing, 0)),
    num(ch.mouth_curvature, geom.mouth.curve),
    num(ch.mouth_aperture, geom.mouth.openness),
    num(ch.cheek_tension, 0.3),
    num(ch.face_plane_tension, 0.34),
    num(ch.contour_bias, 0),
    num(ch.face_asymmetry, 0),
    num(ch.gaze_action, num(ch.gaze, 0)),
  ];
}

export function scaleNormalizedDocumentDistance(
  a: DocumentFacialGeometry,
  b: DocumentFacialGeometry,
): number {
  const va = scaleNormalizedSemanticVector(a);
  const vb = scaleNormalizedSemanticVector(b);
  const n = Math.min(va.length, vb.length);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const d = (va[i] ?? 0) - (vb[i] ?? 0);
    s += d * d;
  }
  return Math.sqrt(s);
}

/**
 * Instrument real eye/mouth/energy measures from document geometry.
 * Feature vector prefers geometry-derived proxies over raw channel echoes.
 */
export function measureDocumentGeometry(
  geom: DocumentFacialGeometry,
): DocumentGeometryMeasures {
  const eyeOpenness = (geom.eyeL.openness + geom.eyeR.openness) / 2;
  const mouthOpenness = geom.mouth.openness;
  const energyLevel = geom.energy.level;
  const eyeSpanH = (geom.eyeL.h + geom.eyeR.h) / 2;
  const mouthSpanH = geom.mouth.h;
  const energySpan = (geom.energy.w + geom.energy.h) / 2;
  const attachmentMax = Math.max(
    0,
    ...Object.values(geom.attachment).map((v) => Math.abs(v)),
  );

  const morph = geometryDerivedMorphologyVector(geom);

  const featureVector = [
    eyeOpenness,
    mouthOpenness,
    energyLevel,
    eyeSpanH / DOCUMENT_FACE_LATTICE.eyeBaseH,
    mouthSpanH / DOCUMENT_FACE_LATTICE.mouthBaseH,
    energySpan / (DOCUMENT_FACE_LATTICE.energyBaseR * 2),
    geom.eyeL.cx / 240,
    geom.eyeR.cx / 240,
    geom.mouth.w / DOCUMENT_FACE_LATTICE.mouthBaseW,
    geom.mouth.curve,
    geom.shell.scaleX,
    geom.shell.scaleY,
    geom.facePlane.scale,
    geom.energy.glow,
    (geom.cheekL.w + geom.cheekR.w) / 40,
    (geom.browL.h + geom.browR.h) / 10,
    // Geometry-derived gaze / spacing / corner proxies (not channel copies).
    ((geom.eyeL.cx + geom.eyeR.cx) / 2 - geom.facePlane.cx) / 30,
    (geom.eyeR.cx - geom.eyeL.cx) / DOCUMENT_FACE_LATTICE.eyeBaseW - 72 / DOCUMENT_FACE_LATTICE.eyeBaseW,
    geom.mouth.curve * 0.55 + (geom.cheekL.cy - geom.cheekR.cy) / 40,
    geom.mouth.curve * 0.55 - (geom.cheekL.cy - geom.cheekR.cy) / 40,
    // Whole-face morphology domains — geometry-derived (indices 20–31).
    ...morph,
    // Additional multi-domain geometry cues.
    geom.eyeL.cy / 240,
    geom.eyeR.cy / 240,
    Math.abs(geom.eyeL.cy - geom.eyeR.cy) / 20,
    geom.browL.cy / 240,
    geom.browR.cy / 240,
    (geom.browL.w + geom.browR.w) / 40,
    geom.cheekL.cy / 240,
    geom.cheekR.cy / 240,
  ];

  return {
    eyeOpenness,
    mouthOpenness,
    energyLevel,
    eyeSpanH,
    mouthSpanH,
    energySpan,
    eyeL: { ...geom.eyeL },
    eyeR: { ...geom.eyeR },
    mouth: { ...geom.mouth },
    energy: { ...geom.energy },
    shell: { ...geom.shell },
    attachmentMax,
    featureVector,
    signature: geom.signature,
  };
}

/** Deterministic geometry signature from path + finite measures (route distinctness). */
export function documentGeometrySignature(geom: DocumentFacialGeometry): string {
  const parts = [
    geom.eyeL.pathD,
    geom.eyeR.pathD,
    geom.mouth.pathD,
    round4(geom.eyeL.h),
    round4(geom.eyeR.h),
    round4(geom.eyeL.cy),
    round4(geom.eyeR.cy),
    round4(geom.mouth.h),
    round4(geom.mouth.w),
    round4(geom.mouth.curve),
    round4(geom.energy.level),
    round4(geom.energy.w),
    round4(geom.shell.scaleX),
    round4(geom.shell.scaleY),
    round4(geom.facePlane.scale),
    round4(geom.cheekL.w),
    round4(geom.cheekL.cy),
    round4(geom.browL.h),
    round4(geom.browL.cy),
    round4(geom.browR.cy),
    round4(num(geom.channels.brow_raise, 0)),
    round4(num(geom.channels.upper_lid_aperture, geom.eyeL.openness)),
    round4(num(geom.channels.lower_lid_aperture, 0.5)),
    round4(num(geom.channels.eye_tilt, 0)),
    round4(num(geom.channels.mouth_curvature, geom.mouth.curve)),
    round4(num(geom.channels.face_asymmetry, 0)),
    round4(num(geom.channels.gaze_action, 0)),
  ];
  return parts.join("|");
}

export function documentFeatureDistance(
  a: DocumentGeometryMeasures,
  b: DocumentGeometryMeasures,
): number {
  const n = Math.min(a.featureVector.length, b.featureVector.length);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const d = (a.featureVector[i] ?? 0) - (b.featureVector[i] ?? 0);
    s += d * d;
  }
  return Math.sqrt(s);
}

function spanOf(values: number[]): { min: number; max: number; span: number } {
  if (values.length === 0) {
    return { min: 0, max: 0, span: 0 };
  }
  let min = values[0]!;
  let max = values[0]!;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max, span: max - min };
}

/**
 * Analyze a multi-frame document-geometry sequence.
 * Spans are finite; featureMotionDetected when any feature measure travels.
 * Continuity requires no scale jumps AND no facial semantic teleports.
 */
export function analyzeDocumentGeometrySequence(
  frames: DocumentFacialGeometry[],
  opts?: { maxScaleStep?: number; maxFacialStep?: number },
): DocumentGeometrySequenceReport {
  const maxScaleStep = opts?.maxScaleStep ?? MAX_DOCUMENT_SCALE_STEP;
  const maxFacialStep = opts?.maxFacialStep ?? MAX_DOCUMENT_FACIAL_STEP;
  const measures = frames.map(measureDocumentGeometry);
  const eyeVals = measures.map((m) => m.eyeOpenness);
  const mouthVals = measures.map((m) => m.mouthOpenness);
  const energyVals = measures.map((m) => m.energyLevel);
  const eyeSpan = spanOf(eyeVals);
  const mouthSpan = spanOf(mouthVals);
  const energySpan = spanOf(energyVals);

  let maxFrameDelta = 0;
  let attachmentMaxPeak = 0;
  const scaleJumpFrames: number[] = [];
  const facialSnapFrames: number[] = [];
  for (let i = 0; i < measures.length; i++) {
    const m = measures[i]!;
    attachmentMaxPeak = Math.max(attachmentMaxPeak, m.attachmentMax);
    if (i === 0) continue;
    const prev = measures[i - 1]!;
    const d = documentFeatureDistance(prev, m);
    if (d > maxFrameDelta) maxFrameDelta = d;
    const shellScaleDelta = Math.abs(
      m.shell.w / DOCUMENT_FACE_LATTICE.shellBaseW -
        prev.shell.w / DOCUMENT_FACE_LATTICE.shellBaseW,
    );
    // Feature vector indices: 10=shell.scaleX, 11=shell.scaleY, 12=facePlane.scale
    const sx0 = prev.featureVector[10] ?? 1;
    const sx1 = m.featureVector[10] ?? 1;
    const sy0 = prev.featureVector[11] ?? 1;
    const sy1 = m.featureVector[11] ?? 1;
    const fs0 = prev.featureVector[12] ?? 1;
    const fs1 = m.featureVector[12] ?? 1;
    const jump = Math.max(
      shellScaleDelta,
      Math.abs(sx1 - sx0),
      Math.abs(sy1 - sy0),
      Math.abs(fs1 - fs0),
    );
    if (jump > maxScaleStep) scaleJumpFrames.push(i);

    // Facial semantic continuity on scale-normalized geometry (not scale alone).
    const facialDelta = scaleNormalizedDocumentDistance(frames[i - 1]!, frames[i]!);
    if (facialDelta > maxFacialStep) facialSnapFrames.push(i);
  }

  const featureMotionDetected =
    eyeSpan.span > 1e-6 ||
    mouthSpan.span > 1e-6 ||
    energySpan.span > 1e-6 ||
    maxFrameDelta > 1e-6;

  const signatures = measures.map((m) => m.signature);
  const continuous =
    scaleJumpFrames.length === 0 && facialSnapFrames.length === 0;

  return {
    frameCount: frames.length,
    expressionIds: frames.map((f) => f.expressionId),
    eyeOpenness: eyeSpan,
    mouthOpenness: mouthSpan,
    energyLevel: energySpan,
    featureMotionDetected,
    maxFrameDelta,
    attachmentMaxPeak,
    scaleJumpFrames,
    facialSnapFrames,
    continuous,
    signatures,
    measures,
  };
}

/**
 * Write document geometry onto SVG feature nodes (when present).
 * Host (GSAP/native) still owns the frame clock — this only sets attributes.
 */
export function writeDocumentGeometryToSvg(
  svgRoot: Element,
  geom: DocumentFacialGeometry,
): { written: string[] } {
  const written: string[] = [];
  const setAttr = (id: string, name: string, value: string) => {
    const el = svgRoot.querySelector?.(`#${id}`);
    if (!el || typeof (el as Element).setAttribute !== "function") return;
    (el as Element).setAttribute(name, value);
    written.push(`${id}.${name}`);
  };
  const setStyle = (id: string, prop: string, value: string) => {
    const el = svgRoot.querySelector?.(`#${id}`) as
      | (Element & { style?: CSSStyleDeclaration })
      | null;
    if (!el?.style) return;
    try {
      (el.style as unknown as Record<string, string>)[prop] = value;
      written.push(`${id}.style.${prop}`);
    } catch {
      /* non-DOM test doubles */
    }
  };

  // Eyes — path + local scale from openness (fill-box origin keeps attachment).
  for (const [id, eye] of [
    ["eyeL", geom.eyeL],
    ["eyeR", geom.eyeR],
  ] as const) {
    setAttr(id, "d", eye.pathD);
    setAttr(id, "data-eye-openness", String(round4(eye.openness)));
    setAttr(id, "data-bbox", `${round4(eye.x)},${round4(eye.y)},${round4(eye.w)},${round4(eye.h)}`);
    setStyle(id, "opacity", String(round4(eye.opacity)));
    setStyle(id, "transformBox", "fill-box");
    setStyle(id, "transformOrigin", "center center");
  }

  setAttr("mouth", "d", geom.mouth.pathD);
  setAttr("mouth", "data-mouth-openness", String(round4(geom.mouth.openness)));
  setAttr("mouth", "data-mouth-width", String(round4(geom.mouth.width)));
  setAttr(
    "mouth",
    "data-bbox",
    `${round4(geom.mouth.x)},${round4(geom.mouth.y)},${round4(geom.mouth.w)},${round4(geom.mouth.h)}`,
  );
  setStyle("mouth", "opacity", String(round4(geom.mouth.opacity)));
  setStyle("mouth", "transformBox", "fill-box");
  setStyle("mouth", "transformOrigin", "center center");

  // Brow / cheek morphology write-through (whole-face domains, not eye/mouth alone).
  for (const [id, box] of [
    ["browL", geom.browL],
    ["browR", geom.browR],
    ["cheekL", geom.cheekL],
    ["cheekR", geom.cheekR],
  ] as const) {
    setAttr(
      id,
      "data-bbox",
      `${round4(box.x)},${round4(box.y)},${round4(box.w)},${round4(box.h)}`,
    );
    setAttr(id, "data-cy", String(round4(box.cy)));
    setAttr(id, "data-cx", String(round4(box.cx)));
    setAttr(id, "data-w", String(round4(box.w)));
    setAttr(id, "data-h", String(round4(box.h)));
  }
  setAttr(
    "browL",
    "data-brow-raise",
    String(round4(num(geom.channels.brow_raise, 0))),
  );
  setAttr(
    "cheekL",
    "data-cheek-tension",
    String(round4(num(geom.channels.cheek_tension, 0.3))),
  );
  setAttr(
    "cheekR",
    "data-face-plane-tension",
    String(round4(num(geom.channels.face_plane_tension, 0.34))),
  );

  // Energy / shell instrumentation attributes (opacity coupling).
  setAttr(
    "innerVolumePath",
    "data-energy-level",
    String(round4(geom.energy.level)),
  );
  setAttr(
    "innerVolumePath",
    "data-bbox",
    `${round4(geom.energy.x)},${round4(geom.energy.y)},${round4(geom.energy.w)},${round4(geom.energy.h)}`,
  );
  setStyle("innerVolumePath", "opacity", String(round4(geom.energy.opacity)));
  setAttr(
    "chromaticShell",
    "data-shell-scale",
    `${round4(geom.shell.scaleX)},${round4(geom.shell.scaleY)}`,
  );
  setStyle("chromaticShell", "opacity", String(round4(geom.shell.opacity)));

  // Face scale is already baked into eye/mouth path lattice math (one-body).
  // Do NOT parent-scale faceRecessLayer/faceEmissionLayer here — that would
  // double-apply face_scale and fight embodiment SVG transform attributes.
  // Telemetry only:
  setAttr("faceRecessLayer", "data-face-scale", String(round4(geom.facePlane.scale)));
  setAttr("faceEmissionLayer", "data-face-scale", String(round4(geom.facePlane.scale)));

  // Root telemetry for headed/packaged instrumentation (finite, non-null).
  if (typeof (svgRoot as Element).setAttribute === "function") {
    (svgRoot as Element).setAttribute(
      "data-gasper-eye-openness",
      String(round4((geom.eyeL.openness + geom.eyeR.openness) / 2)),
    );
    (svgRoot as Element).setAttribute(
      "data-gasper-mouth-openness",
      String(round4(geom.mouth.openness)),
    );
    (svgRoot as Element).setAttribute(
      "data-gasper-energy-level",
      String(round4(geom.energy.level)),
    );
    (svgRoot as Element).setAttribute(
      "data-gasper-facial-signature",
      geom.signature.slice(0, 120),
    );
    (svgRoot as Element).setAttribute(
      "data-gasper-expression",
      geom.expressionId,
    );
    written.push(
      "svg.data-gasper-eye-openness",
      "svg.data-gasper-mouth-openness",
      "svg.data-gasper-energy-level",
    );
  }

  return { written };
}

/**
 * Sample geometry from SVG data attributes written by writeDocumentGeometryToSvg.
 * Falls back to null-safe finite zeros only when attributes are absent (honest).
 */
export function sampleGeometryFromSvg(svgRoot: Element): {
  eyeOpenness: number | null;
  mouthOpenness: number | null;
  energyLevel: number | null;
  featureMotionReady: boolean;
} {
  const read = (name: string): number | null => {
    const raw = svgRoot.getAttribute?.(name);
    if (raw == null || raw === "") return null;
    const v = Number(raw);
    return Number.isFinite(v) ? v : null;
  };
  const eyeOpenness = read("data-gasper-eye-openness");
  const mouthOpenness = read("data-gasper-mouth-openness");
  const energyLevel = read("data-gasper-energy-level");
  return {
    eyeOpenness,
    mouthOpenness,
    energyLevel,
    featureMotionReady:
      eyeOpenness != null && mouthOpenness != null && energyLevel != null,
  };
}
