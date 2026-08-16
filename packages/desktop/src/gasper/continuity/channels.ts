/**
 * Continuity channel groups for eyes, mouth, contour, topology, and motion.
 * Consumes FACE/SILHOUETTE naming from eight-state-loop types without rewriting them.
 */

/** Primary motion / position channels used for derivative series. */
export const POSITION_CHANNELS = [
  "overall_height",
  "overall_width",
  "energy_level",
  "energy_pulse",
  "energy_lag",
  "gaze",
  "settling",
  "rebound",
  "secondary_lag",
  "skin_tension",
  "internal_glow",
  "face_emissive",
  "face_scale",
] as const;

export const EYE_CHANNELS = [
  "eye_openness",
  "eye_spacing",
  "gaze",
] as const;

export const MOUTH_CHANNELS = [
  "mouth_openness",
  "mouth_width",
  "corner_pull_l",
  "corner_pull_r",
] as const;

export const CONTOUR_CHANNELS = [
  "overall_height",
  "overall_width",
  "crown_height",
  "ground_flattening",
  "lower_body_fullness",
] as const;

/** Contested channels that require single-owner anti-flicker arbitration. */
export const CONTESTED_OWNERSHIP_CHANNELS = [
  "eye_openness",
  "gaze",
  "mouth_openness",
  "mouth_width",
] as const;

/** Canonical topology constants (must not rewrite mid-transition). Matches GASPER_TOPOLOGY. */
export const TOPOLOGY_LOCK = {
  contourSamples: 512,
  structuralNodes: 360,
  structuralTriangles: 672,
  topologyStable: true,
} as const;

export type EyeChannel = (typeof EYE_CHANNELS)[number];
export type MouthChannel = (typeof MOUTH_CHANNELS)[number];
export type ContourChannel = (typeof CONTOUR_CHANNELS)[number];
export type PositionChannel = (typeof POSITION_CHANNELS)[number];
