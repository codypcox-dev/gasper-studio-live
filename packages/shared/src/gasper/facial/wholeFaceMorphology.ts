/**
 * Deterministic semantic whole-face morphology vocabulary.
 *
 * Replaces same-mask eye-line / mouth-scale variants with coordinated multi-domain
 * facial targets for the six Presence holds: Neutral, Listening, Thinking,
 * Recognition, Blocked, Pleased.
 *
 * Pure data + metrics — no DOM/GSAP/HQ. Projection consumers bind these channels
 * through the continuum and document-geometry path.
 */

import type { FacialChannelMap } from "./types";

/** Canonical six Presence states for whole-face morphology (product labels). */
export type WholeFacePresenceId =
  | "Neutral"
  | "Listening"
  | "Thinking"
  | "Recognition"
  | "Blocked"
  | "Pleased";

/** Semantic id keys used by facial continuum / fixtures. */
export type WholeFaceSemanticKey =
  | "neutral"
  | "listening"
  | "thinking"
  | "recognition"
  | "blocked"
  | "pleased";

/**
 * Whole-face morphology channels (coordinated facial domains).
 * These extend the facial continuum body; they are not independent overlays.
 */
export const WHOLE_FACE_CHANNELS = [
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

export type WholeFaceChannel = (typeof WHOLE_FACE_CHANNELS)[number];

/** Facial domains used for multi-domain pairwise separation. */
export const WHOLE_FACE_DOMAINS = [
  "eye_region",
  "mouth_region",
  "brow_cheek_plane",
  "contour_asymmetry",
  "gaze_action_tendency",
] as const;

export type WholeFaceDomain = (typeof WHOLE_FACE_DOMAINS)[number];

/** Channels that count as global shell/blob scale only (not semantic facial). */
export const GLOBAL_SCALE_CHANNELS = [
  "overall_width",
  "overall_height",
  "face_scale",
] as const;

/** Channels that count as color/energy-only (not geometric morphology). */
export const COLOR_ONLY_CHANNELS = [
  "internal_glow",
  "face_emissive",
  "energy_level",
  "energy_pulse",
] as const;

export type WholeFaceMorphologyTarget = {
  presenceId: WholeFacePresenceId;
  semanticKey: WholeFaceSemanticKey;
  kernelId: string;
  label: string;
  intent: string;
  /** Coordinated whole-face morphology channels (absolute targets). */
  morphology: Record<WholeFaceChannel, number>;
  /**
   * Full facial channel map including legacy continuum keys + whole-face keys.
   * Routes interpolate this map under continuum policy.
   */
  channels: FacialChannelMap;
  affect: { valence: number; arousal: number };
};

/**
 * Identity-preserving soft bounds for whole-face deformation.
 * Extremes outside these fail identity-loss checks.
 */
export const WHOLE_FACE_IDENTITY_BOUNDS = Object.freeze({
  overall_width: { min: 0.9, max: 1.12 },
  overall_height: { min: 0.9, max: 1.12 },
  face_scale: { min: 0.94, max: 1.08 },
  brow_raise: { min: -0.35, max: 0.45 },
  upper_lid_aperture: { min: 0.18, max: 0.88 },
  lower_lid_aperture: { min: 0.12, max: 0.85 },
  eye_tilt: { min: -0.28, max: 0.28 },
  inter_eye_relation: { min: -0.18, max: 0.18 },
  mouth_curvature: { min: -0.4, max: 0.45 },
  mouth_aperture: { min: 0.1, max: 0.55 },
  cheek_tension: { min: 0.15, max: 0.85 },
  face_plane_tension: { min: 0.15, max: 0.85 },
  contour_bias: { min: -0.2, max: 0.2 },
  face_asymmetry: { min: -0.22, max: 0.22 },
  gaze_action: { min: -0.45, max: 0.45 },
});

/** Minimum L2 distance on full whole-face feature vectors. */
export const MIN_WHOLE_FACE_SEPARATION = 0.22;

/**
 * Minimum multi-domain separation: at least this many domains must each
 * exceed DOMAIN_SEPARATION_FLOOR for a pair to count as multi-domain-distinct.
 */
export const MIN_DOMAINS_ABOVE_FLOOR = 2;
export const DOMAIN_SEPARATION_FLOOR = 0.06;

function morphChannels(
  m: Record<WholeFaceChannel, number>,
  rest: FacialChannelMap,
): FacialChannelMap {
  // Bridge dual-lid / aperture vocabulary onto legacy continuum keys so older
  // consumers still see coherent eye_openness / mouth_openness / eye_spacing.
  const upper = m.upper_lid_aperture;
  const lower = m.lower_lid_aperture;
  const eyeOpen = Math.max(
    0.12,
    Math.min(0.92, upper * 0.72 + lower * 0.28),
  );
  return {
    ...rest,
    brow_raise: m.brow_raise,
    upper_lid_aperture: m.upper_lid_aperture,
    lower_lid_aperture: m.lower_lid_aperture,
    eye_tilt: m.eye_tilt,
    inter_eye_relation: m.inter_eye_relation,
    mouth_curvature: m.mouth_curvature,
    mouth_aperture: m.mouth_aperture,
    cheek_tension: m.cheek_tension,
    face_plane_tension: m.face_plane_tension,
    contour_bias: m.contour_bias,
    face_asymmetry: m.face_asymmetry,
    gaze_action: m.gaze_action,
    // Legacy continuum coupling (deterministic from morphology).
    eye_openness: eyeOpen,
    eye_spacing: m.inter_eye_relation,
    mouth_openness: m.mouth_aperture,
    gaze: m.gaze_action * 0.85 + (rest.gaze ?? 0) * 0.15,
    corner_pull_l:
      m.mouth_curvature * 0.55 +
      m.face_asymmetry * 0.35 +
      (rest.corner_pull_l ?? 0) * 0.1,
    corner_pull_r:
      m.mouth_curvature * 0.55 -
      m.face_asymmetry * 0.35 +
      (rest.corner_pull_r ?? 0) * 0.1,
    skin_tension: m.face_plane_tension * 0.65 + m.cheek_tension * 0.35,
  };
}

type TargetDraft = {
  presenceId: WholeFacePresenceId;
  semanticKey: WholeFaceSemanticKey;
  kernelId: string;
  label: string;
  intent: string;
  affect: { valence: number; arousal: number };
  morphology: Record<WholeFaceChannel, number>;
  companion: FacialChannelMap;
};

const TARGET_DRAFTS: Record<WholeFaceSemanticKey, TargetDraft> = {
  neutral: {
    presenceId: "Neutral",
    semanticKey: "neutral",
    kernelId: "neutral-settled",
    label: "Neutral",
    intent: "Friendly resting presence — balanced lids, soft brow, slight readiness.",
    affect: { valence: 0.12, arousal: 0.28 },
    morphology: {
      brow_raise: 0.04,
      upper_lid_aperture: 0.56,
      lower_lid_aperture: 0.48,
      eye_tilt: 0,
      inter_eye_relation: 0,
      mouth_curvature: 0.04,
      mouth_aperture: 0.32,
      cheek_tension: 0.3,
      face_plane_tension: 0.34,
      contour_bias: 0,
      face_asymmetry: 0.01,
      gaze_action: 0.02,
    },
    companion: {
      energy_level: 0.52,
      energy_pulse: 0.16,
      energy_lag: 0.35,
      mouth_width: 1,
      face_scale: 1,
      relief_amplitude: 0.42,
      internal_glow: 0.48,
      face_emissive: 0.32,
      overall_height: 1,
      overall_width: 1,
      crown_height: 0.04,
      ground_flattening: 0,
      inertia: 0.35,
      settling: 0.42,
      rebound: 0.14,
    },
  },
  listening: {
    presenceId: "Listening",
    semanticKey: "listening",
    kernelId: "listening-open",
    label: "Listening",
    intent: "Receptive attention — raised brow, open upper lid, soft mouth, attend-gaze.",
    affect: { valence: 0.22, arousal: 0.48 },
    morphology: {
      // R4: amplified multi-domain deltas vs Neutral (lid/gaze/brow/cheek).
      brow_raise: 0.28,
      upper_lid_aperture: 0.74,
      lower_lid_aperture: 0.38,
      eye_tilt: 0.06,
      inter_eye_relation: 0.09,
      mouth_curvature: 0.0,
      mouth_aperture: 0.22,
      cheek_tension: 0.26,
      face_plane_tension: 0.4,
      contour_bias: 0.06,
      face_asymmetry: 0.05,
      gaze_action: 0.22,
    },
    companion: {
      energy_level: 0.64,
      energy_pulse: 0.22,
      energy_lag: 0.28,
      mouth_width: 1.02,
      face_scale: 1.02,
      relief_amplitude: 0.5,
      internal_glow: 0.56,
      face_emissive: 0.4,
      overall_height: 1.02,
      overall_width: 1.015,
      crown_height: 0.08,
      ground_flattening: 0,
      inertia: 0.32,
      settling: 0.4,
      rebound: 0.18,
    },
  },
  thinking: {
    presenceId: "Thinking",
    semanticKey: "thinking",
    kernelId: "thinking-knit",
    label: "Thinking",
    intent: "Inward knit — drawn brow, reduced upper lid, raised lower lid, compressed mouth.",
    affect: { valence: 0.05, arousal: 0.55 },
    morphology: {
      // R4: stronger knit — dual-lid inversion, brow drop, mouth compress, inward gaze.
      brow_raise: -0.2,
      upper_lid_aperture: 0.34,
      lower_lid_aperture: 0.68,
      eye_tilt: -0.12,
      inter_eye_relation: -0.11,
      mouth_curvature: -0.1,
      mouth_aperture: 0.16,
      cheek_tension: 0.54,
      face_plane_tension: 0.64,
      contour_bias: -0.07,
      face_asymmetry: -0.09,
      gaze_action: -0.16,
    },
    companion: {
      energy_level: 0.58,
      energy_pulse: 0.36,
      energy_lag: 0.55,
      mouth_width: 0.96,
      face_scale: 0.98,
      relief_amplitude: 0.58,
      internal_glow: 0.5,
      face_emissive: 0.34,
      overall_height: 0.99,
      overall_width: 0.975,
      crown_height: 0.12,
      ground_flattening: 0.02,
      inertia: 0.48,
      settling: 0.38,
      rebound: 0.12,
    },
  },
  recognition: {
    presenceId: "Recognition",
    semanticKey: "recognition",
    kernelId: "mischievous-spark",
    label: "Recognition",
    intent: "Bright spark — open lids, lifted brow, approach gaze, mouth curve up.",
    affect: { valence: 0.55, arousal: 0.72 },
    morphology: {
      // R4: bright open lids + up-curve mouth + approach gaze (≠ Listening/Pleased).
      brow_raise: 0.32,
      upper_lid_aperture: 0.8,
      lower_lid_aperture: 0.34,
      eye_tilt: 0.08,
      inter_eye_relation: 0.06,
      mouth_curvature: 0.22,
      mouth_aperture: 0.42,
      cheek_tension: 0.46,
      face_plane_tension: 0.34,
      contour_bias: 0.09,
      face_asymmetry: 0.07,
      gaze_action: 0.22,
    },
    companion: {
      energy_level: 0.76,
      energy_pulse: 0.46,
      energy_lag: 0.2,
      mouth_width: 1.08,
      face_scale: 1.035,
      relief_amplitude: 0.54,
      internal_glow: 0.66,
      face_emissive: 0.56,
      overall_height: 1.035,
      overall_width: 1.02,
      crown_height: 0.12,
      ground_flattening: 0,
      inertia: 0.28,
      settling: 0.32,
      rebound: 0.32,
    },
  },
  blocked: {
    presenceId: "Blocked",
    semanticKey: "blocked",
    kernelId: "blocked-strain",
    label: "Blocked",
    intent: "Guarded strain — compressed brow, low lids, tight down-curve mouth, high tension.",
    affect: { valence: -0.35, arousal: 0.42 },
    morphology: {
      // R4: guarded strain — high plane tension, down-curve mouth, compressed lids.
      brow_raise: -0.26,
      upper_lid_aperture: 0.3,
      lower_lid_aperture: 0.72,
      eye_tilt: -0.05,
      inter_eye_relation: -0.13,
      mouth_curvature: -0.26,
      mouth_aperture: 0.13,
      cheek_tension: 0.76,
      face_plane_tension: 0.8,
      contour_bias: -0.13,
      face_asymmetry: -0.05,
      gaze_action: 0.07,
    },
    companion: {
      energy_level: 0.36,
      energy_pulse: 0.12,
      energy_lag: 0.7,
      mouth_width: 0.88,
      face_scale: 0.96,
      relief_amplitude: 0.34,
      internal_glow: 0.3,
      face_emissive: 0.16,
      overall_height: 0.94,
      overall_width: 0.95,
      crown_height: 0.06,
      ground_flattening: 0.12,
      inertia: 0.6,
      settling: 0.24,
      rebound: 0.06,
    },
  },
  pleased: {
    presenceId: "Pleased",
    semanticKey: "pleased",
    kernelId: "pleased-glow",
    label: "Pleased",
    intent: "Warm satisfaction — soft brow lift, soft lids, strong mouth lift, cheek raise.",
    affect: { valence: 0.48, arousal: 0.45 },
    morphology: {
      // R4: strong mouth lift + cheek raise; soft lids (≠ Recognition open lids).
      brow_raise: 0.12,
      upper_lid_aperture: 0.56,
      lower_lid_aperture: 0.42,
      eye_tilt: 0.03,
      inter_eye_relation: 0.03,
      mouth_curvature: 0.32,
      mouth_aperture: 0.39,
      cheek_tension: 0.56,
      face_plane_tension: 0.28,
      contour_bias: 0.06,
      face_asymmetry: 0.03,
      gaze_action: 0.05,
    },
    companion: {
      energy_level: 0.66,
      energy_pulse: 0.28,
      energy_lag: 0.3,
      mouth_width: 1.09,
      face_scale: 1.025,
      relief_amplitude: 0.5,
      internal_glow: 0.64,
      face_emissive: 0.54,
      overall_height: 1.02,
      overall_width: 1.02,
      crown_height: 0.07,
      ground_flattening: 0,
      inertia: 0.3,
      settling: 0.48,
      rebound: 0.22,
    },
  },
};

function buildTarget(draft: TargetDraft): WholeFaceMorphologyTarget {
  return {
    presenceId: draft.presenceId,
    semanticKey: draft.semanticKey,
    kernelId: draft.kernelId,
    label: draft.label,
    intent: draft.intent,
    affect: draft.affect,
    morphology: { ...draft.morphology },
    channels: morphChannels(draft.morphology, draft.companion),
  };
}

/**
 * Six deterministic whole-face morphology targets.
 * Each coordinates brow / dual lids / tilt / inter-eye / mouth curve+aperture /
 * cheek+plane tension / contour / asymmetry / gaze-action under one identity.
 */
export const WHOLE_FACE_MORPHOLOGY_TARGETS: Record<
  WholeFaceSemanticKey,
  WholeFaceMorphologyTarget
> = Object.freeze({
  neutral: buildTarget(TARGET_DRAFTS.neutral),
  listening: buildTarget(TARGET_DRAFTS.listening),
  thinking: buildTarget(TARGET_DRAFTS.thinking),
  recognition: buildTarget(TARGET_DRAFTS.recognition),
  blocked: buildTarget(TARGET_DRAFTS.blocked),
  pleased: buildTarget(TARGET_DRAFTS.pleased),
}) as Record<WholeFaceSemanticKey, WholeFaceMorphologyTarget>;

export const WHOLE_FACE_PRESENCE_ORDER: readonly WholeFacePresenceId[] =
  Object.freeze([
    "Neutral",
    "Listening",
    "Thinking",
    "Recognition",
    "Blocked",
    "Pleased",
  ]);

export const WHOLE_FACE_SEMANTIC_ORDER: readonly WholeFaceSemanticKey[] =
  Object.freeze([
    "neutral",
    "listening",
    "thinking",
    "recognition",
    "blocked",
    "pleased",
  ]);

export function getWholeFaceMorphology(
  key: WholeFaceSemanticKey,
): WholeFaceMorphologyTarget {
  return WHOLE_FACE_MORPHOLOGY_TARGETS[key];
}

export function listWholeFaceSemantics(): WholeFaceSemanticKey[] {
  return [...WHOLE_FACE_SEMANTIC_ORDER];
}

export function resolveWholeFaceSemantic(
  id: string,
): WholeFaceSemanticKey | null {
  const map: Record<string, WholeFaceSemanticKey> = {
    Neutral: "neutral",
    neutral: "neutral",
    "neutral-settled": "neutral",
    "neutral-social": "neutral",
    "neutral-wry": "neutral",
    Listening: "listening",
    listening: "listening",
    "listening-open": "listening",
    "listening-orient": "listening",
    "listening-warm": "listening",
    "listening-focus": "listening",
    "listening-receive": "listening",
    Thinking: "thinking",
    thinking: "thinking",
    "thinking-knit": "thinking",
    "thinking-scan": "thinking",
    "thinking-resolve": "thinking",
    executing: "thinking",
    Recognition: "recognition",
    recognition: "recognition",
    "recognition-spark": "recognition",
    "mischievous-spark": "recognition",
    Blocked: "blocked",
    blocked: "blocked",
    "blocked-strain": "blocked",
    "blocked-stall": "blocked",
    "blocked-guard": "blocked",
    "blocked-retry": "blocked",
    Pleased: "pleased",
    pleased: "pleased",
    "pleased-glow": "pleased",
    "pleased-soft": "pleased",
    "pleased-warm": "pleased",
    "pleased-bright": "pleased",
    "pleased-contained": "pleased",
  };
  return map[id] ?? null;
}

/** Ordered full morphology signature vector (semantic + continuum facial keys). */
export function wholeFaceFeatureVector(channels: FacialChannelMap): number[] {
  const keys = [
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
    "eye_openness",
    "eye_spacing",
    "mouth_openness",
    "mouth_width",
    "corner_pull_l",
    "corner_pull_r",
    "gaze",
    "skin_tension",
    "face_scale",
    "overall_width",
    "overall_height",
  ];
  return keys.map((k) => {
    const v = channels[k];
    return typeof v === "number" && Number.isFinite(v) ? v : 0;
  });
}

export function wholeFaceDistance(
  a: FacialChannelMap,
  b: FacialChannelMap,
): number {
  const va = wholeFaceFeatureVector(a);
  const vb = wholeFaceFeatureVector(b);
  let s = 0;
  for (let i = 0; i < va.length; i++) {
    const d = va[i]! - vb[i]!;
    s += d * d;
  }
  return Math.sqrt(s);
}

/** Per-domain sub-vectors for multi-domain pairwise tests. */
export function wholeFaceDomainVectors(
  channels: FacialChannelMap,
): Record<WholeFaceDomain, number[]> {
  const n = (k: string, d = 0) =>
    typeof channels[k] === "number" && Number.isFinite(channels[k]!)
      ? channels[k]!
      : d;
  return {
    eye_region: [
      n("upper_lid_aperture", n("eye_openness", 0.56)),
      n("lower_lid_aperture", 0.5),
      n("eye_tilt"),
      n("inter_eye_relation", n("eye_spacing")),
      n("eye_openness", 0.56),
    ],
    mouth_region: [
      n("mouth_curvature"),
      n("mouth_aperture", n("mouth_openness", 0.32)),
      n("mouth_openness", 0.32),
      n("mouth_width", 1),
      n("corner_pull_l"),
      n("corner_pull_r"),
    ],
    brow_cheek_plane: [
      n("brow_raise"),
      n("cheek_tension"),
      n("face_plane_tension"),
      n("skin_tension", 0.36),
    ],
    contour_asymmetry: [
      n("contour_bias"),
      n("face_asymmetry"),
      n("overall_width", 1),
      n("overall_height", 1),
      n("face_scale", 1),
    ],
    gaze_action_tendency: [n("gaze_action"), n("gaze"), n("eye_tilt") * 0.5],
  };
}

function domainL2(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    s += d * d;
  }
  return Math.sqrt(s);
}

export type MultiDomainSeparation = {
  distance: number;
  domainDistances: Record<WholeFaceDomain, number>;
  domainsAboveFloor: WholeFaceDomain[];
  multiDomainDistinct: boolean;
};

export function multiDomainSeparation(
  a: FacialChannelMap,
  b: FacialChannelMap,
  domainFloor: number = DOMAIN_SEPARATION_FLOOR,
  minDomains: number = MIN_DOMAINS_ABOVE_FLOOR,
): MultiDomainSeparation {
  const da = wholeFaceDomainVectors(a);
  const db = wholeFaceDomainVectors(b);
  const domainDistances = {} as Record<WholeFaceDomain, number>;
  const domainsAboveFloor: WholeFaceDomain[] = [];
  for (const domain of WHOLE_FACE_DOMAINS) {
    const d = domainL2(da[domain], db[domain]);
    domainDistances[domain] = d;
    if (d >= domainFloor) domainsAboveFloor.push(domain);
  }
  return {
    distance: wholeFaceDistance(a, b),
    domainDistances,
    domainsAboveFloor,
    multiDomainDistinct: domainsAboveFloor.length >= minDomains,
  };
}

/**
 * True when A and B differ only by global scale factors (same facial morphology
 * mask resized) — the defect this vocabulary eliminates.
 */
export function isSameMaskScalingOnly(
  a: FacialChannelMap,
  b: FacialChannelMap,
  facialEps = 0.02,
): boolean {
  const facialKeys = [
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
    "eye_openness",
    "mouth_openness",
    "corner_pull_l",
    "corner_pull_r",
  ];
  let facialDiff = 0;
  for (const k of facialKeys) {
    const av = typeof a[k] === "number" ? a[k]! : 0;
    const bv = typeof b[k] === "number" ? b[k]! : 0;
    facialDiff += Math.abs(av - bv);
  }
  if (facialDiff > facialEps * facialKeys.length) return false;

  let scaleDiff = 0;
  for (const k of GLOBAL_SCALE_CHANNELS) {
    const av = typeof a[k] === "number" ? a[k]! : 1;
    const bv = typeof b[k] === "number" ? b[k]! : 1;
    scaleDiff += Math.abs(av - bv);
  }
  return scaleDiff > 0.03;
}

/**
 * True when deformation is only global shell/scale (or color) without semantic
 * facial domain motion — rejected by geometry-signature tests.
 */
export function isGlobalOnlyDeformation(
  a: FacialChannelMap,
  b: FacialChannelMap,
  facialEps = 0.025,
): boolean {
  const sep = multiDomainSeparation(a, b, facialEps, 1);
  const facialDomains: WholeFaceDomain[] = [
    "eye_region",
    "mouth_region",
    "brow_cheek_plane",
    "gaze_action_tendency",
  ];
  const facialMotion = facialDomains.some(
    (d) => (sep.domainDistances[d] ?? 0) >= facialEps,
  );
  if (facialMotion) return false;

  let globalMotion = 0;
  for (const k of GLOBAL_SCALE_CHANNELS) {
    const av = typeof a[k] === "number" ? a[k]! : 1;
    const bv = typeof b[k] === "number" ? b[k]! : 1;
    globalMotion += Math.abs(av - bv);
  }
  for (const k of COLOR_ONLY_CHANNELS) {
    const av = typeof a[k] === "number" ? a[k]! : 0;
    const bv = typeof b[k] === "number" ? b[k]! : 0;
    globalMotion += Math.abs(av - bv) * 0.5;
  }
  return globalMotion > 0.04;
}

/** Identity loss: deformation exceeds identity-preserving bounds. */
export function identityBoundsHeld(channels: FacialChannelMap): {
  ok: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  for (const [key, bound] of Object.entries(WHOLE_FACE_IDENTITY_BOUNDS)) {
    const v = channels[key];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    if (v < bound.min - 1e-9 || v > bound.max + 1e-9) {
      violations.push(`${key}=${v} outside [${bound.min},${bound.max}]`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export function allWholeFacePresenceDistinct(
  minDistance: number = MIN_WHOLE_FACE_SEPARATION,
): {
  ok: boolean;
  pairs: Array<{
    a: WholeFaceSemanticKey;
    b: WholeFaceSemanticKey;
    d: number;
    multiDomain: boolean;
    domains: WholeFaceDomain[];
  }>;
} {
  const ids = listWholeFaceSemantics();
  const pairs: Array<{
    a: WholeFaceSemanticKey;
    b: WholeFaceSemanticKey;
    d: number;
    multiDomain: boolean;
    domains: WholeFaceDomain[];
  }> = [];
  let ok = true;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]!;
      const b = ids[j]!;
      const ca = WHOLE_FACE_MORPHOLOGY_TARGETS[a].channels;
      const cb = WHOLE_FACE_MORPHOLOGY_TARGETS[b].channels;
      const sep = multiDomainSeparation(ca, cb);
      pairs.push({
        a,
        b,
        d: sep.distance,
        multiDomain: sep.multiDomainDistinct,
        domains: sep.domainsAboveFloor,
      });
      if (sep.distance < minDistance || !sep.multiDomainDistinct) ok = false;
    }
  }
  return { ok, pairs };
}

/**
 * Build a same-mask scale-only adversarial pair from a base target
 * (for negative tests — must be rejected as non-semantic distinctness).
 */
export function sameMaskScaleVariant(
  base: FacialChannelMap,
  scale = 1.08,
): FacialChannelMap {
  return {
    ...base,
    face_scale: (typeof base.face_scale === "number" ? base.face_scale : 1) * scale,
    overall_width:
      (typeof base.overall_width === "number" ? base.overall_width : 1) * scale,
    overall_height:
      (typeof base.overall_height === "number" ? base.overall_height : 1) * scale,
  };
}

/** Global-only squash/stretch adversarial (no facial domain change). */
export function globalOnlyDeformationVariant(
  base: FacialChannelMap,
): FacialChannelMap {
  return {
    ...base,
    overall_width: 0.9,
    overall_height: 1.1,
    face_scale: 0.95,
    internal_glow: Math.min(
      0.9,
      (typeof base.internal_glow === "number" ? base.internal_glow : 0.5) + 0.2,
    ),
  };
}
