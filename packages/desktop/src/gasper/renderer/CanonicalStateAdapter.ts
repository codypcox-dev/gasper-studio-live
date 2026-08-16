/**
 * Map GasperCanonicalState / semantic domain pose → legacy FormMaster controls
 * and native candidate bindings. Single document model; dual render backends.
 */

import type {
  GasperCanonicalState,
  GasperResolvedPose,
} from "./GasperRendererContract";

/** Semantic keys accepted by modern Studio / MCP / document model. */
export const CANONICAL_MACRO_KEYS = [
  "overall_width",
  "overall_height",
  "crown_height",
  "lower_body_fullness",
  "ground_flattening",
] as const;

export const CANONICAL_FACE_KEYS = [
  "face_scale",
  "eye_openness",
  "eye_spacing",
  "gaze_x",
  "gaze_y",
  "mouth_openness",
  "mouth_width",
  "mouth_corner_pull_l",
  "mouth_corner_pull_r",
  "brow_tension",
  "cheek_tension",
  "face_emission",
] as const;

export const CANONICAL_ENERGY_KEYS = [
  "energy_level",
  "energy_target",
  "energy_pulse",
  "energy_lag",
  "energy_occlusion",
  "internal_glow",
] as const;

export const CANONICAL_MATERIAL_KEYS = [
  "key_intensity",
  "key_direction",
  "rim",
  "pearl",
  "absorption",
  "clearcoat",
  "texture",
  "relief",
  "normal_strength",
  "curvature_response",
] as const;

export const CANONICAL_DYNAMICS_KEYS = [
  "inertia",
  "secondary_lag",
  "rebound",
  "settling",
] as const;

/** Legacy procedural control aliases (FormMaster / all-script bindings). */
export type LegacyControlMap = {
  /** Direct scalar bindings FormMaster understands when applyBindings exists */
  bindings: Record<string, number>;
  /** High-level FormMaster API calls */
  profile?: string;
  fixture?: string;
  motion?: number;
  yaw?: number;
  coupling?: number;
  interiorEnergy?: number;
};

/**
 * Best-effort rename map from modern semantic ids → legacy control ids.
 * Unmapped keys pass through unchanged for applyBindings fallthrough.
 */
const SEMANTIC_TO_LEGACY: Record<string, string> = {
  overall_width: "overallWidth",
  overall_height: "overallHeight",
  crown_height: "crownHeight",
  lower_body_fullness: "lowerBodyFullness",
  ground_flattening: "groundFlattening",
  face_scale: "faceScale",
  eye_openness: "eyeOpen",
  eye_spacing: "eyeSpacing",
  gaze_x: "gazeX",
  gaze_y: "gazeY",
  mouth_openness: "mouthOpen",
  mouth_width: "mouthWidth",
  mouth_corner_pull_l: "mouthCornerL",
  mouth_corner_pull_r: "mouthCornerR",
  brow_tension: "browTension",
  cheek_tension: "cheekTension",
  face_emission: "faceEmission",
  energy_level: "energyLevel",
  energy_target: "energyTarget",
  energy_pulse: "energyPulse",
  energy_lag: "energyLag",
  energy_occlusion: "energyOcclusion",
  internal_glow: "internalGlow",
  key_intensity: "keyIntensity",
  key_direction: "keyDirection",
  rim: "rim",
  pearl: "pearl",
  absorption: "absorption",
  clearcoat: "clearcoat",
  texture: "texture",
  relief: "relief",
  normal_strength: "normalStrength",
  curvature_response: "curvatureResponse",
  inertia: "inertia",
  secondary_lag: "secondaryLag",
  rebound: "rebound",
  settling: "settling",
  // Common Studio aliases
  motion: "motion",
  yaw: "yaw",
};

export function poseToLegacyControlMap(
  pose: GasperResolvedPose,
  opts?: { embodimentId?: string; expressionId?: string },
): LegacyControlMap {
  const bindings: Record<string, number> = {};
  let motion: number | undefined;
  let yaw: number | undefined;
  let coupling: number | undefined;
  let interiorEnergy: number | undefined;

  for (const [k, v] of Object.entries(pose)) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    if (k === "motion") {
      motion = v;
      bindings.motion = v;
      continue;
    }
    if (k === "yaw") {
      yaw = v;
      bindings.yaw = v;
      continue;
    }
    if (k === "coupling") {
      coupling = v;
      bindings.coupling = v;
      continue;
    }
    if (k === "energy_level" || k === "interiorEnergy" || k === "interior_energy") {
      interiorEnergy = v;
      bindings.interiorEnergy = v;
      bindings.energyLevel = v;
      continue;
    }
    const legacyKey = SEMANTIC_TO_LEGACY[k] || k;
    bindings[legacyKey] = v;
    // Also keep modern key so dual applyBindings paths work
    if (legacyKey !== k) bindings[k] = v;
  }

  return {
    bindings,
    profile: opts?.embodimentId,
    fixture: opts?.expressionId,
    motion,
    yaw,
    coupling,
    interiorEnergy,
  };
}

export function canonicalStateToLegacyControls(
  state: GasperCanonicalState,
): LegacyControlMap {
  return poseToLegacyControlMap(state.pose || {}, {
    embodimentId: state.embodimentId,
    expressionId: state.expressionId,
  });
}

/** Native candidate: pass through modern keys; no rename required. */
export function poseToNativeBindings(pose: GasperResolvedPose): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(pose)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

export function listMappedSemanticKeys(): string[] {
  return Object.keys(SEMANTIC_TO_LEGACY).sort();
}
