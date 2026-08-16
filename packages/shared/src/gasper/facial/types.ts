/**
 * Shared facial continuum types — continuous one-body facial deformation.
 * Pure data contracts; no DOM/GSAP/HQ dependency.
 */

/** Scalar channel map (binding id → value). */
export type FacialChannelMap = Record<string, number>;

/** Semantic faces re-authored for continuous deformation (six Presence holds). */
export type FacialSemanticId =
  | "neutral"
  | "listening"
  | "recognition"
  | "thinking"
  | "blocked"
  | "pleased";

/** Kernel fixture ids that back the six semantic faces. */
export type FacialSemanticKernelId =
  | "neutral-settled"
  | "listening-open"
  | "mischievous-spark"
  | "thinking-knit"
  | "blocked-strain"
  | "pleased-glow";

/** Stable feature anchors that features attach to (not free-floating overlays). */
export type FeatureAnchorId =
  | "shell_center"
  | "face_plane"
  | "eye_left"
  | "eye_right"
  | "mouth_center"
  | "energy_core";

export type FeatureAnchor = {
  id: FeatureAnchorId;
  /** Normalized local position in shell space (x right, y up). */
  x: number;
  y: number;
  /** Soft attachment radius (tissue coupling). */
  attachRadius: number;
  owner: "shell" | "face" | "energy";
};

/** Continuum motion phase for anticipation / transition / settle. */
export type FacialMotionPhase =
  | "hold"
  | "anticipate"
  | "transition"
  | "settle"
  | "interrupted";

/** Ownership roles for facial continuum (mirrors continuity priorities). */
export type FacialOwner =
  | "hold_last_good"
  | "interrupt_blend"
  | "state_target"
  | "settle"
  | "none";

/** One continuum frame for dense sequence analysis. */
export type FacialFrame = {
  index: number;
  t: number;
  phase: FacialMotionPhase;
  channels: FacialChannelMap;
  ownership: Record<string, FacialOwner>;
  /** Attachment residuals: feature position vs expected anchor (0 = locked). */
  attachmentError: Record<string, number>;
  interruptEdge: boolean;
};

/** Policy bounds for continuous deformation (unit-scale channels @ ~60fps). */
export type FacialContinuumPolicy = {
  dtDefault: number;
  maxVelocity: number;
  maxAcceleration: number;
  maxJerk: number;
  /** Max |Δ| per frame on any face channel (anti-snap). */
  maxFaceStep: number;
  /** Max |left−right| eye openness asymmetry (chirality noise floor). */
  maxEyeAsymmetry: number;
  /** Mouth openness may not invert through zero relative to width policy. */
  mouthOpennessMin: number;
  mouthOpennessMax: number;
  /** Face scale jump ceiling per frame. */
  maxFaceScaleStep: number;
  /** Anticipation pull fraction of (target−current) opposite direction. */
  anticipationFraction: number;
  anticipationFrames: number;
  /** Settle overshoot fraction (must decay; never unbounded). */
  overshootFraction: number;
  overshootMaxAbs: number;
  settleFrames: number;
  /** Soft volume area band for overall_width * overall_height. */
  areaMin: number;
  areaMax: number;
  /** Max attachment residual before treating feature as floating. */
  maxAttachmentError: number;
};

export const DEFAULT_FACIAL_POLICY: FacialContinuumPolicy = Object.freeze({
  dtDefault: 1 / 60,
  /** Tight but reachable under boundFacialStep at 60fps (still far below teleport). */
  maxVelocity: 12,
  maxAcceleration: 280,
  maxJerk: 8400,
  maxFaceStep: 0.16,
  maxEyeAsymmetry: 0.08,
  mouthOpennessMin: 0.05,
  mouthOpennessMax: 0.75,
  maxFaceScaleStep: 0.05,
  anticipationFraction: 0.05,
  anticipationFrames: 3,
  overshootFraction: 0.03,
  overshootMaxAbs: 0.04,
  settleFrames: 10,
  areaMin: 0.82,
  areaMax: 1.18,
  maxAttachmentError: 0.05,
});

/** Primary channels governed as one body (face + shell + energy + motion). */
export const FACIAL_BODY_CHANNELS = [
  "eye_openness",
  "eye_spacing",
  "gaze",
  "mouth_openness",
  "mouth_width",
  "corner_pull_l",
  "corner_pull_r",
  "face_scale",
  // Whole-face morphology vocabulary (coordinated multi-domain facial features).
  "brow_raise",
  "upper_lid_aperture",
  "lower_lid_aperture",
  "eye_tilt",
  "inter_eye_relation",
  "mouth_curvature",
  "mouth_aperture",
  "cheek_tension",
  "face_plane_tension",
  "contour_bias",
  "face_asymmetry",
  "gaze_action",
  "overall_width",
  "overall_height",
  "crown_height",
  "ground_flattening",
  "energy_level",
  "energy_pulse",
  "energy_lag",
  "relief_amplitude",
  "skin_tension",
  "internal_glow",
  "face_emissive",
  "inertia",
  "settling",
  "rebound",
] as const;

export type FacialBodyChannel = (typeof FACIAL_BODY_CHANNELS)[number];

export const FACE_ONLY_CHANNELS = [
  "eye_openness",
  "eye_spacing",
  "gaze",
  "mouth_openness",
  "mouth_width",
  "corner_pull_l",
  "corner_pull_r",
  "face_scale",
  "brow_raise",
  "upper_lid_aperture",
  "lower_lid_aperture",
  "eye_tilt",
  "inter_eye_relation",
  "mouth_curvature",
  "mouth_aperture",
  "cheek_tension",
  "face_plane_tension",
  "contour_bias",
  "face_asymmetry",
  "gaze_action",
] as const;

export const SHELL_CHANNELS = [
  "overall_width",
  "overall_height",
  "crown_height",
  "ground_flattening",
] as const;

export const ENERGY_CHANNELS = [
  "energy_level",
  "energy_pulse",
  "energy_lag",
  "internal_glow",
  "face_emissive",
] as const;
