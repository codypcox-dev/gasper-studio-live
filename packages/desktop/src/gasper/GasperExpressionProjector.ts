/**
 * Wave R3 / GASPER-007-G — expression fixture projection + eight-state visual
 * endpoint profiles for the production rig.
 *
 * R3 ownership: state endpoint profile application API shape + per-state visual
 * parameter export. Consumable by R4 motion runtime via frozen channel targets.
 * Not a redesign: one Gasper identity, eight distinct state endpoints.
 */

import type { DomainScalarMap } from "./GasperDomainState";
import {
  getExpressionFixture,
  type GasperExpressionFixture,
} from "./GasperExpressionFixtures";
import { GASPER_TOPOLOGY } from "./GasperTopologyLock";

export type ExpressionProjectReport = {
  fixtureId: string;
  family: string;
  bindings: DomainScalarMap;
};

export function projectExpressionFixture(
  fixtureId: string,
): ExpressionProjectReport {
  const fix = getExpressionFixture(fixtureId);
  if (!fix) {
    throw new Error(`Unknown expression fixture: ${fixtureId}`);
  }
  return {
    fixtureId: fix.id,
    family: fix.family,
    bindings: { ...fix.bindings },
  };
}

export function blendExpressionFixtures(
  a: GasperExpressionFixture,
  b: GasperExpressionFixture,
  mix: number,
): DomainScalarMap {
  const t = Math.max(0, Math.min(1, mix));
  const keys = new Set([
    ...Object.keys(a.bindings),
    ...Object.keys(b.bindings),
  ]);
  const out: DomainScalarMap = {};
  for (const k of keys) {
    const av = a.bindings[k];
    const bv = b.bindings[k];
    if (typeof av === "number" && typeof bv === "number") {
      out[k] = av + (bv - av) * t;
    } else if (typeof bv === "number") {
      out[k] = bv;
    } else if (typeof av === "number") {
      out[k] = av;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Eight-state visual endpoints (R3 frozen interface)
// ---------------------------------------------------------------------------

export const EIGHT_STATE_IDS = [
  "presence-neutral-settled",
  "presence-listening-receive",
  "presence-thinking-knit",
  "presence-recognition-spark",
  "comet-executing-drive",
  "presence-blocked-strain",
  "presence-pleased-resolve",
  "dormant-orbit-maintain",
] as const;

export type EightStateId = (typeof EIGHT_STATE_IDS)[number];

export type FaceDoctrine = "full" | "reduced-dormant";

export type BlinkPolicy = {
  rate: number;
  amplitude: number;
  asymmetry: number;
  holdBias: number;
};

export type MicrovariationPolicy = {
  amplitude: number;
  frequency: number;
  spatialBias: number;
};

export type GasperVisualStateEndpointV1 = {
  schema: "gasper.visual-state-endpoint.v1";
  stateId: EightStateId;
  label: string;
  note: string;
  /** Production embodiment profile id (GasperRigDefinition). */
  embodimentId: string;
  /**
   * Historical expression fixture affinity (R2-owned fixture catalog).
   * Endpoint channel targets remain authoritative over partial fixtures.
   */
  expressionAffinity: string;
  faceVisible: boolean;
  faceDoctrine: FaceDoctrine;
  topology: {
    contourSamples: typeof GASPER_TOPOLOGY.contourSamples;
    structuralNodes: typeof GASPER_TOPOLOGY.structuralNodes;
    structuralTriangles: typeof GASPER_TOPOLOGY.structuralTriangles;
    reliefWidth: typeof GASPER_TOPOLOGY.adaptiveRelief.width;
    reliefHeight: typeof GASPER_TOPOLOGY.adaptiveRelief.height;
  };
  /** Full flattened domain channel targets for mixer / legacy semantic pose. */
  channels: DomainScalarMap;
  /** Reduced-motion projection of the same identity (no bounce/spark excess). */
  reducedMotionChannels: DomainScalarMap;
  policies: {
    blink: BlinkPolicy;
    microvariation: MicrovariationPolicy;
    motionAmplitude: number;
    energyFocus: "balanced" | "directional" | "inward" | "spark" | "drive" | "trapped" | "release" | "orbit";
  };
  identity: {
    darkPearlShell: true;
    cyanVioletEnergy: true;
    opticalVolume: true;
    sharedTopology: true;
    noProofOnlyFaceStamp: true;
  };
};

const TOPOLOGY_LOCK = Object.freeze({
  contourSamples: GASPER_TOPOLOGY.contourSamples,
  structuralNodes: GASPER_TOPOLOGY.structuralNodes,
  structuralTriangles: GASPER_TOPOLOGY.structuralTriangles,
  reliefWidth: GASPER_TOPOLOGY.adaptiveRelief.width,
  reliefHeight: GASPER_TOPOLOGY.adaptiveRelief.height,
});

const IDENTITY = Object.freeze({
  darkPearlShell: true as const,
  cyanVioletEnergy: true as const,
  opticalVolume: true as const,
  sharedTopology: true as const,
  noProofOnlyFaceStamp: true as const,
});

/** Round to fixed precision for deterministic export/hash. */
export function quantizeChannelMap(
  map: DomainScalarMap,
  decimals = 4,
): DomainScalarMap {
  const f = 10 ** decimals;
  const out: DomainScalarMap = {};
  for (const k of Object.keys(map).sort()) {
    const v = map[k];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    out[k] = Math.round(v * f) / f;
  }
  return out;
}

function reduceMotionFrom(channels: DomainScalarMap): DomainScalarMap {
  const base = quantizeChannelMap(channels);
  const damped: DomainScalarMap = { ...base };
  if (typeof damped.energy_pulse === "number") {
    damped.energy_pulse = Math.min(damped.energy_pulse, 0.12);
  }
  if (typeof damped.rebound === "number") {
    damped.rebound = Math.min(damped.rebound, 0.12);
  }
  if (typeof damped.motion === "number") {
    damped.motion = Math.min(damped.motion, 0.2);
  }
  if (typeof damped.relief_motion_coupling === "number") {
    damped.relief_motion_coupling = Math.min(
      damped.relief_motion_coupling,
      0.2,
    );
  }
  if (typeof damped.inertia === "number") {
    damped.inertia = Math.max(damped.inertia, 0.45);
  }
  if (typeof damped.settling === "number") {
    damped.settling = Math.max(damped.settling, 0.55);
  }
  // Recognition spark / drive: remove bounce peaks under reduced motion
  if (typeof damped.overall_height === "number" && damped.overall_height > 1.04) {
    damped.overall_height = 1.02;
  }
  if (typeof damped.crown_height === "number" && damped.crown_height > 0.1) {
    damped.crown_height = Math.min(damped.crown_height, 0.08);
  }
  return quantizeChannelMap(damped);
}

function endpoint(
  partial: Omit<
    GasperVisualStateEndpointV1,
    "schema" | "topology" | "identity" | "reducedMotionChannels"
  > & { channels: DomainScalarMap },
): GasperVisualStateEndpointV1 {
  const channels = quantizeChannelMap(partial.channels);
  return {
    schema: "gasper.visual-state-endpoint.v1",
    topology: { ...TOPOLOGY_LOCK },
    identity: { ...IDENTITY },
    ...partial,
    channels,
    reducedMotionChannels: reduceMotionFrom(channels),
  };
}

/**
 * Eight visually distinct endpoints on the existing production rig.
 * Distinctness laws: ≥4 channel-domain differences per pair; never color-only
 * or mouth-only; identity invariants held.
 */
export const EIGHT_STATE_VISUAL_ENDPOINTS: Record<
  EightStateId,
  GasperVisualStateEndpointV1
> = {
  "presence-neutral-settled": endpoint({
    stateId: "presence-neutral-settled",
    label: "Presence · Neutral Settled",
    note: "Relaxed almond eyes, calm awareness, slight L/R asymmetry, socially available mouth, balanced energy.",
    embodimentId: "presence",
    expressionAffinity: "neutral-settled",
    faceVisible: true,
    faceDoctrine: "full",
    policies: {
      blink: { rate: 0.22, amplitude: 0.85, asymmetry: 0.06, holdBias: 0.35 },
      microvariation: { amplitude: 0.08, frequency: 0.18, spatialBias: 0.04 },
      motionAmplitude: 0.12,
      energyFocus: "balanced",
    },
    channels: {
      overall_width: 1.0,
      overall_height: 1.015,
      crown_height: 0.04,
      lower_body_fullness: 1.0,
      ground_flattening: 0.0,
      face_scale: 1.0,
      eye_openness: 0.56,
      eye_spacing: 0.02,
      gaze: 0.04,
      mouth_openness: 0.32,
      mouth_width: 1.0,
      corner_pull_l: 0.03,
      corner_pull_r: -0.02,
      energy_level: 0.52,
      energy_pulse: 0.16,
      energy_lag: 0.35,
      energy_occlusion: 0.12,
      relief_amplitude: 0.42,
      relief_motion_coupling: 0.28,
      relief_energy_coupling: 0.36,
      skin_tension: 0.36,
      skin_damping: 0.52,
      skin_coupling: 0.42,
      texture_amount: 0.4,
      texture_scale: 1.0,
      normal_strength: 0.55,
      curvature_response: 0.44,
      key_intensity: 0.58,
      key_direction: 0.05,
      rim: 0.42,
      pearl_intensity: 0.55,
      internal_glow: 0.48,
      face_emissive: 0.32,
      absorption: 0.18,
      roughness: 0.34,
      clearcoat: 0.4,
      inertia: 0.32,
      secondary_lag: 0.38,
      rebound: 0.22,
      settling: 0.55,
      motion: 0.18,
    },
  }),

  "presence-listening-receive": endpoint({
    stateId: "presence-listening-receive",
    label: "Presence · Listening Receive",
    note: "Attention organized toward target; eyes available; energy concentrated toward listening direction.",
    embodimentId: "presence",
    expressionAffinity: "listening-orient",
    faceVisible: true,
    faceDoctrine: "full",
    policies: {
      blink: { rate: 0.14, amplitude: 0.72, asymmetry: 0.1, holdBias: 0.55 },
      microvariation: { amplitude: 0.05, frequency: 0.14, spatialBias: 0.12 },
      motionAmplitude: 0.16,
      energyFocus: "directional",
    },
    channels: {
      overall_width: 1.02,
      overall_height: 1.03,
      crown_height: 0.08,
      lower_body_fullness: 0.98,
      ground_flattening: 0.02,
      face_scale: 1.04,
      eye_openness: 0.66,
      eye_spacing: 0.05,
      gaze: 0.18,
      mouth_openness: 0.24,
      mouth_width: 0.98,
      corner_pull_l: 0.02,
      corner_pull_r: 0.01,
      energy_level: 0.64,
      energy_pulse: 0.22,
      energy_lag: 0.26,
      energy_occlusion: 0.1,
      relief_amplitude: 0.5,
      relief_motion_coupling: 0.34,
      relief_energy_coupling: 0.48,
      skin_tension: 0.42,
      skin_damping: 0.48,
      skin_coupling: 0.5,
      texture_amount: 0.42,
      texture_scale: 1.02,
      normal_strength: 0.58,
      curvature_response: 0.48,
      key_intensity: 0.64,
      key_direction: 0.18,
      rim: 0.46,
      pearl_intensity: 0.56,
      internal_glow: 0.58,
      face_emissive: 0.44,
      absorption: 0.16,
      roughness: 0.32,
      clearcoat: 0.44,
      inertia: 0.28,
      secondary_lag: 0.3,
      rebound: 0.26,
      settling: 0.42,
      motion: 0.28,
    },
  }),

  "presence-thinking-knit": endpoint({
    stateId: "presence-thinking-knit",
    label: "Presence · Thinking Knit",
    note: "Inward knit; deliberate asymmetric eyes; upper-shell tension; no generic look-up or sadness.",
    embodimentId: "presence",
    expressionAffinity: "thinking-knit",
    faceVisible: true,
    faceDoctrine: "full",
    policies: {
      blink: { rate: 0.18, amplitude: 0.78, asymmetry: 0.16, holdBias: 0.48 },
      microvariation: { amplitude: 0.07, frequency: 0.22, spatialBias: -0.08 },
      motionAmplitude: 0.14,
      energyFocus: "inward",
    },
    channels: {
      overall_width: 0.98,
      overall_height: 0.99,
      crown_height: 0.12,
      lower_body_fullness: 0.97,
      ground_flattening: 0.04,
      face_scale: 0.98,
      eye_openness: 0.48,
      eye_spacing: -0.06,
      gaze: -0.08,
      mouth_openness: 0.2,
      mouth_width: 0.94,
      corner_pull_l: -0.04,
      corner_pull_r: 0.02,
      energy_level: 0.58,
      energy_pulse: 0.35,
      energy_lag: 0.55,
      energy_occlusion: 0.22,
      relief_amplitude: 0.58,
      relief_motion_coupling: 0.4,
      relief_energy_coupling: 0.52,
      skin_tension: 0.54,
      skin_damping: 0.56,
      skin_coupling: 0.55,
      texture_amount: 0.46,
      texture_scale: 0.98,
      normal_strength: 0.62,
      curvature_response: 0.52,
      key_intensity: 0.52,
      key_direction: -0.06,
      rim: 0.4,
      pearl_intensity: 0.52,
      internal_glow: 0.5,
      face_emissive: 0.28,
      absorption: 0.24,
      roughness: 0.38,
      clearcoat: 0.36,
      inertia: 0.48,
      secondary_lag: 0.52,
      rebound: 0.18,
      settling: 0.48,
      motion: 0.22,
    },
  }),

  "presence-recognition-spark": endpoint({
    stateId: "presence-recognition-spark",
    label: "Presence · Recognition Spark",
    note: "Bounded aperture/lift; concentrated internal spark; quick asymmetrical peak; no celebration icon.",
    embodimentId: "presence",
    expressionAffinity: "recognition-spark",
    faceVisible: true,
    faceDoctrine: "full",
    policies: {
      blink: { rate: 0.1, amplitude: 0.55, asymmetry: 0.2, holdBias: 0.2 },
      microvariation: { amplitude: 0.12, frequency: 0.4, spatialBias: 0.1 },
      motionAmplitude: 0.32,
      energyFocus: "spark",
    },
    channels: {
      overall_width: 1.03,
      overall_height: 1.06,
      crown_height: 0.14,
      lower_body_fullness: 1.02,
      ground_flattening: 0.0,
      face_scale: 1.06,
      eye_openness: 0.72,
      eye_spacing: 0.04,
      gaze: 0.1,
      mouth_openness: 0.38,
      mouth_width: 1.06,
      corner_pull_l: 0.1,
      corner_pull_r: 0.06,
      energy_level: 0.78,
      energy_pulse: 0.48,
      energy_lag: 0.18,
      energy_occlusion: 0.08,
      relief_amplitude: 0.62,
      relief_motion_coupling: 0.52,
      relief_energy_coupling: 0.62,
      skin_tension: 0.46,
      skin_damping: 0.4,
      skin_coupling: 0.55,
      texture_amount: 0.48,
      texture_scale: 1.04,
      normal_strength: 0.66,
      curvature_response: 0.56,
      key_intensity: 0.72,
      key_direction: 0.08,
      rim: 0.55,
      pearl_intensity: 0.62,
      internal_glow: 0.72,
      face_emissive: 0.58,
      absorption: 0.12,
      roughness: 0.28,
      clearcoat: 0.52,
      inertia: 0.22,
      secondary_lag: 0.24,
      rebound: 0.42,
      settling: 0.32,
      motion: 0.45,
    },
  }),

  "comet-executing-drive": endpoint({
    stateId: "comet-executing-drive",
    label: "Comet · Executing Drive",
    note: "Directional reorganization; forward gaze/energy; face remains Gasper; no detached tail object.",
    embodimentId: "comet",
    expressionAffinity: "listening-orient",
    faceVisible: true,
    faceDoctrine: "full",
    policies: {
      blink: { rate: 0.12, amplitude: 0.65, asymmetry: 0.08, holdBias: 0.3 },
      microvariation: { amplitude: 0.04, frequency: 0.28, spatialBias: 0.22 },
      motionAmplitude: 0.4,
      energyFocus: "drive",
    },
    channels: {
      overall_width: 1.05,
      overall_height: 0.98,
      crown_height: 0.06,
      lower_body_fullness: 0.94,
      ground_flattening: 0.06,
      face_scale: 0.94,
      eye_openness: 0.64,
      eye_spacing: 0.02,
      gaze: 0.22,
      mouth_openness: 0.28,
      mouth_width: 0.96,
      corner_pull_l: 0.0,
      corner_pull_r: 0.02,
      energy_level: 0.74,
      energy_pulse: 0.38,
      energy_lag: 0.22,
      energy_occlusion: 0.14,
      relief_amplitude: 0.56,
      relief_motion_coupling: 0.58,
      relief_energy_coupling: 0.6,
      skin_tension: 0.5,
      skin_damping: 0.42,
      skin_coupling: 0.58,
      texture_amount: 0.44,
      texture_scale: 1.06,
      normal_strength: 0.64,
      curvature_response: 0.5,
      key_intensity: 0.68,
      key_direction: 0.28,
      rim: 0.5,
      pearl_intensity: 0.54,
      internal_glow: 0.66,
      face_emissive: 0.4,
      absorption: 0.15,
      roughness: 0.3,
      clearcoat: 0.46,
      inertia: 0.25,
      secondary_lag: 0.28,
      rebound: 0.3,
      settling: 0.28,
      motion: 0.58,
      // Comet / singularity-adjacent envelope for wake energy (not species swap)
      spectral_energy_envelope: 0.72,
      horizon_radius: 0.38,
      orbital_plane_scale: 0.92,
      center_of_mass_y: 0.04,
    },
  }),

  "presence-blocked-strain": endpoint({
    stateId: "presence-blocked-strain",
    label: "Presence · Blocked Strain",
    note: "Compressed shell; face tension; energy locally trapped; competent, not villain or fear.",
    embodimentId: "presence",
    expressionAffinity: "blocked-strain",
    faceVisible: true,
    faceDoctrine: "full",
    policies: {
      blink: { rate: 0.28, amplitude: 0.7, asymmetry: 0.12, holdBias: 0.42 },
      microvariation: { amplitude: 0.09, frequency: 0.32, spatialBias: -0.05 },
      motionAmplitude: 0.2,
      energyFocus: "trapped",
    },
    channels: {
      overall_width: 0.96,
      overall_height: 0.94,
      crown_height: 0.02,
      lower_body_fullness: 0.92,
      ground_flattening: 0.12,
      face_scale: 0.96,
      eye_openness: 0.42,
      eye_spacing: -0.1,
      gaze: 0.05,
      mouth_openness: 0.18,
      mouth_width: 0.88,
      corner_pull_l: -0.12,
      corner_pull_r: -0.1,
      energy_level: 0.38,
      energy_pulse: 0.14,
      energy_lag: 0.7,
      energy_occlusion: 0.32,
      relief_amplitude: 0.35,
      relief_motion_coupling: 0.22,
      relief_energy_coupling: 0.28,
      skin_tension: 0.72,
      skin_damping: 0.62,
      skin_coupling: 0.48,
      texture_amount: 0.5,
      texture_scale: 0.96,
      normal_strength: 0.7,
      curvature_response: 0.58,
      key_intensity: 0.48,
      key_direction: -0.04,
      rim: 0.36,
      pearl_intensity: 0.46,
      internal_glow: 0.32,
      face_emissive: 0.18,
      absorption: 0.3,
      roughness: 0.44,
      clearcoat: 0.3,
      inertia: 0.6,
      secondary_lag: 0.58,
      rebound: 0.12,
      settling: 0.25,
      motion: 0.24,
    },
  }),

  "presence-pleased-resolve": endpoint({
    stateId: "presence-pleased-resolve",
    label: "Presence · Pleased Resolve",
    note: "Contained satisfaction; controlled lift/release; slight asymmetric mouth/eye; no cartoon grin.",
    embodimentId: "presence",
    expressionAffinity: "pleased-soft",
    faceVisible: true,
    faceDoctrine: "full",
    policies: {
      blink: { rate: 0.2, amplitude: 0.8, asymmetry: 0.1, holdBias: 0.4 },
      microvariation: { amplitude: 0.06, frequency: 0.16, spatialBias: 0.05 },
      motionAmplitude: 0.15,
      energyFocus: "release",
    },
    channels: {
      overall_width: 1.01,
      overall_height: 1.03,
      crown_height: 0.07,
      lower_body_fullness: 1.02,
      ground_flattening: 0.01,
      face_scale: 1.02,
      eye_openness: 0.58,
      eye_spacing: 0.01,
      gaze: 0.06,
      mouth_openness: 0.38,
      mouth_width: 1.06,
      corner_pull_l: 0.1,
      corner_pull_r: 0.06,
      energy_level: 0.6,
      energy_pulse: 0.22,
      energy_lag: 0.32,
      energy_occlusion: 0.12,
      relief_amplitude: 0.48,
      relief_motion_coupling: 0.3,
      relief_energy_coupling: 0.42,
      skin_tension: 0.38,
      skin_damping: 0.5,
      skin_coupling: 0.46,
      texture_amount: 0.42,
      texture_scale: 1.0,
      normal_strength: 0.56,
      curvature_response: 0.46,
      key_intensity: 0.62,
      key_direction: 0.06,
      rim: 0.48,
      pearl_intensity: 0.6,
      internal_glow: 0.56,
      face_emissive: 0.48,
      absorption: 0.16,
      roughness: 0.3,
      clearcoat: 0.48,
      inertia: 0.3,
      secondary_lag: 0.34,
      rebound: 0.28,
      settling: 0.58,
      motion: 0.2,
    },
  }),

  "dormant-orbit-maintain": endpoint({
    stateId: "dormant-orbit-maintain",
    label: "Singularity Rest · Maintain",
    note: "Owner directive 2026-08-03: dormant is retired — rest collapses into singularity and performs its scene suite. Residual gravity well; face fades via compression/occlusion/emissive reduction.",
    embodimentId: "singularity",
    expressionAffinity: "neutral-settled",
    faceVisible: false,
    faceDoctrine: "reduced-dormant",
    policies: {
      blink: { rate: 0.0, amplitude: 0.0, asymmetry: 0.0, holdBias: 1 },
      microvariation: { amplitude: 0.1, frequency: 0.12, spatialBias: 0.0 },
      motionAmplitude: 0.08,
      energyFocus: "orbit",
    },
    channels: {
      overall_width: 0.96,
      overall_height: 0.92,
      crown_height: 0.0,
      lower_body_fullness: 0.9,
      ground_flattening: 0.08,
      face_scale: 0.42,
      eye_openness: 0.06,
      eye_spacing: 0.0,
      gaze: 0.0,
      mouth_openness: 0.04,
      mouth_width: 0.7,
      corner_pull_l: 0.0,
      corner_pull_r: 0.0,
      energy_level: 0.32,
      energy_pulse: 0.1,
      energy_lag: 0.62,
      energy_occlusion: 0.55,
      relief_amplitude: 0.28,
      relief_motion_coupling: 0.18,
      relief_energy_coupling: 0.35,
      skin_tension: 0.3,
      skin_damping: 0.58,
      skin_coupling: 0.32,
      texture_amount: 0.36,
      texture_scale: 1.08,
      normal_strength: 0.48,
      curvature_response: 0.4,
      key_intensity: 0.4,
      key_direction: 0.0,
      rim: 0.34,
      pearl_intensity: 0.48,
      internal_glow: 0.28,
      face_emissive: 0.04,
      absorption: 0.42,
      roughness: 0.4,
      clearcoat: 0.28,
      inertia: 0.55,
      secondary_lag: 0.6,
      rebound: 0.08,
      settling: 0.7,
      motion: 0.12,
      singularity_outer_radius: 0.95,
      singularity_vertical_compression: 0.55,
      spectral_energy_envelope: 0.58,
      horizon_radius: 0.55,
      orbital_plane_scale: 1.05,
      orbital_circulation: 0.72,
      center_void: 0.7,
      gravity_well_depth: 0.58,
      center_of_mass_y: 0.06,
    },
  }),
};

export function isEightStateId(id: string): id is EightStateId {
  return (EIGHT_STATE_IDS as readonly string[]).includes(id);
}

export function getVisualStateEndpoint(
  stateId: string,
): GasperVisualStateEndpointV1 | null {
  if (!isEightStateId(stateId)) return null;
  return EIGHT_STATE_VISUAL_ENDPOINTS[stateId];
}

export function listVisualStateEndpoints(): GasperVisualStateEndpointV1[] {
  return EIGHT_STATE_IDS.map((id) => EIGHT_STATE_VISUAL_ENDPOINTS[id]);
}

export type VisualStateProjectReport = {
  stateId: EightStateId;
  embodimentId: string;
  expressionAffinity: string;
  faceVisible: boolean;
  faceDoctrine: FaceDoctrine;
  bindings: DomainScalarMap;
  reducedMotionBindings: DomainScalarMap;
  policies: GasperVisualStateEndpointV1["policies"];
  topology: GasperVisualStateEndpointV1["topology"];
  identity: GasperVisualStateEndpointV1["identity"];
};

/** Project a state endpoint into mixer-consumable channel targets. */
export function projectVisualStateEndpoint(
  stateId: string,
  opts?: { reducedMotion?: boolean },
): VisualStateProjectReport {
  const ep = getVisualStateEndpoint(stateId);
  if (!ep) {
    throw new Error(`Unknown visual state endpoint: ${stateId}`);
  }
  // Endpoint channel targets are authoritative over partial expression fixtures.
  // expressionAffinity is selection/dataset soft truth only — never geometry sole writer.
  const bindings = opts?.reducedMotion
    ? { ...ep.reducedMotionChannels }
    : { ...ep.channels };
  return {
    stateId: ep.stateId,
    embodimentId: ep.embodimentId,
    expressionAffinity: ep.expressionAffinity,
    faceVisible: ep.faceVisible,
    faceDoctrine: ep.faceDoctrine,
    bindings,
    reducedMotionBindings: { ...ep.reducedMotionChannels },
    policies: { ...ep.policies, blink: { ...ep.policies.blink }, microvariation: { ...ep.policies.microvariation } },
    topology: { ...ep.topology },
    identity: { ...ep.identity },
  };
}

/**
 * Resolve native hold bindings: endpoint + optional fixture soft-fill,
 * with character/state-visual channels always winning contested keys.
 * Used by NativeGasperRenderer and structural authority probes.
 */
export function resolveNativeAuthorityBindings(
  stateId: string,
  opts?: {
    reducedMotion?: boolean;
    characterChannels?: DomainScalarMap;
    /** When true, drop fixture soft-fill entirely (default true for holds). */
    blockFixtureOverride?: boolean;
  },
): {
  stateId: EightStateId;
  embodimentId: string;
  expressionAffinity: string;
  bindings: DomainScalarMap;
  fixtureSoftFillApplied: boolean;
  characterWins: boolean;
} {
  const proj = projectVisualStateEndpoint(stateId, {
    reducedMotion: opts?.reducedMotion,
  });
  const blockFixture = opts?.blockFixtureOverride !== false;
  let bindings: DomainScalarMap = { ...proj.bindings };
  let fixtureSoftFillApplied = false;
  if (!blockFixture) {
    try {
      const fix = projectExpressionFixture(proj.expressionAffinity);
      // Soft-fill only missing keys; never overwrite endpoint/character.
      for (const [k, v] of Object.entries(fix.bindings)) {
        if (typeof v !== "number" || !Number.isFinite(v)) continue;
        if (bindings[k] === undefined) {
          bindings[k] = v;
          fixtureSoftFillApplied = true;
        }
      }
    } catch {
      /* soft */
    }
  }
  const character = opts?.characterChannels ?? {};
  let characterWins = false;
  for (const [k, v] of Object.entries(character)) {
    if (typeof v === "number" && Number.isFinite(v)) {
      // Contested: character overwrites a different endpoint/fixture value.
      if (bindings[k] !== undefined && bindings[k] !== v) characterWins = true;
      bindings[k] = v;
    }
  }
  // Also true when character supplies keys endpoint lacked (authority fill).
  if (!characterWins) {
    for (const [k, v] of Object.entries(character)) {
      if (typeof v === "number" && Number.isFinite(v) && proj.bindings[k] === undefined) {
        characterWins = true;
        break;
      }
    }
  }
  return {
    stateId: proj.stateId,
    embodimentId: proj.embodimentId,
    expressionAffinity: proj.expressionAffinity,
    bindings,
    fixtureSoftFillApplied,
    characterWins,
  };
}

/**
 * Deterministic per-state parameter export for R4 / evidence (no DOM).
 * Values quantized; key order sorted.
 */
export function exportVisualStateEndpointParameters(
  stateId: string,
  opts?: { reducedMotion?: boolean },
): Record<string, string | number | boolean> {
  const proj = projectVisualStateEndpoint(stateId, opts);
  const channels = quantizeChannelMap(
    opts?.reducedMotion ? proj.reducedMotionBindings : proj.bindings,
  );
  const out: Record<string, string | number | boolean> = {
    schema: "gasper.visual-state-endpoint-export.v1",
    stateId: proj.stateId,
    embodimentId: proj.embodimentId,
    expressionAffinity: proj.expressionAffinity,
    faceVisible: proj.faceVisible,
    faceDoctrine: proj.faceDoctrine,
    reducedMotion: !!opts?.reducedMotion,
    contourSamples: proj.topology.contourSamples,
    structuralNodes: proj.topology.structuralNodes,
    structuralTriangles: proj.topology.structuralTriangles,
    reliefWidth: proj.topology.reliefWidth,
    reliefHeight: proj.topology.reliefHeight,
    motionAmplitude: proj.policies.motionAmplitude,
    energyFocus: proj.policies.energyFocus,
    blink_rate: proj.policies.blink.rate,
    blink_amplitude: proj.policies.blink.amplitude,
    blink_asymmetry: proj.policies.blink.asymmetry,
    micro_amplitude: proj.policies.microvariation.amplitude,
    micro_frequency: proj.policies.microvariation.frequency,
    darkPearlShell: proj.identity.darkPearlShell,
    cyanVioletEnergy: proj.identity.cyanVioletEnergy,
    opticalVolume: proj.identity.opticalVolume,
    sharedTopology: proj.identity.sharedTopology,
    noProofOnlyFaceStamp: proj.identity.noProofOnlyFaceStamp,
  };
  for (const k of Object.keys(channels).sort()) {
    out[`ch.${k}`] = channels[k]!;
  }
  return out;
}

/** Stable FNV-1a 32-bit hex over canonical export JSON. */
export function hashVisualStateEndpoint(
  stateId: string,
  opts?: { reducedMotion?: boolean },
): string {
  const params = exportVisualStateEndpointParameters(stateId, opts);
  const keys = Object.keys(params).sort();
  const canonical = keys.map((k) => `${k}:${String(params[k])}`).join("|");
  return fnv1a32Hex(canonical);
}

export function exportAllVisualStateEndpointHashes(opts?: {
  reducedMotion?: boolean;
}): Record<EightStateId, string> {
  const out = {} as Record<EightStateId, string>;
  for (const id of EIGHT_STATE_IDS) {
    out[id] = hashVisualStateEndpoint(id, opts);
  }
  return out;
}

/** Channel-domain buckets for distinctness checks (R3 engineering gate). */
export const CHANNEL_DOMAIN_KEYS: Record<string, readonly string[]> = {
  macro: [
    "overall_width",
    "overall_height",
    "crown_height",
    "lower_body_fullness",
    "ground_flattening",
  ],
  face: [
    "face_scale",
    "eye_openness",
    "eye_spacing",
    "gaze",
    "mouth_openness",
    "mouth_width",
    "corner_pull_l",
    "corner_pull_r",
    "face_emissive",
  ],
  energy: [
    "energy_level",
    "energy_pulse",
    "energy_lag",
    "energy_occlusion",
    "internal_glow",
  ],
  relief: [
    "relief_amplitude",
    "relief_motion_coupling",
    "relief_energy_coupling",
  ],
  skin: ["skin_tension", "skin_damping", "skin_coupling"],
  material: ["roughness", "clearcoat", "pearl_intensity", "texture_amount"],
  optics: [
    "key_intensity",
    "key_direction",
    "rim",
    "absorption",
    "normal_strength",
  ],
  dynamics: ["inertia", "secondary_lag", "rebound", "settling", "motion"],
  embodiment: [
    "spectral_energy_envelope",
    "horizon_radius",
    "orbital_plane_scale",
    "center_of_mass_y",
    "singularity_outer_radius",
    "singularity_vertical_compression",
    "orbital_circulation",
    "center_void",
    "gravity_well_depth",
  ],
};

export type DistinctnessPairReport = {
  a: EightStateId;
  b: EightStateId;
  differingDomains: string[];
  domainCount: number;
  hasFormOrEmbodiment: boolean;
  hasMotion: boolean;
  hasFaceOrAttention: boolean;
  hasEnergyMaterialOptics: boolean;
  mouthOnly: boolean;
  ok: boolean;
};

function domainDiffers(
  a: DomainScalarMap,
  b: DomainScalarMap,
  keys: readonly string[],
  eps = 0.02,
): boolean {
  for (const k of keys) {
    const av = a[k];
    const bv = b[k];
    if (typeof av === "number" && typeof bv === "number") {
      if (Math.abs(av - bv) > eps) return true;
    } else if (typeof av === "number" || typeof bv === "number") {
      return true;
    }
  }
  return false;
}

export function evaluateEndpointPairDistinctness(
  aId: EightStateId,
  bId: EightStateId,
): DistinctnessPairReport {
  const a = EIGHT_STATE_VISUAL_ENDPOINTS[aId];
  const b = EIGHT_STATE_VISUAL_ENDPOINTS[bId];
  const differingDomains: string[] = [];
  for (const [domain, keys] of Object.entries(CHANNEL_DOMAIN_KEYS)) {
    if (domainDiffers(a.channels, b.channels, keys)) {
      differingDomains.push(domain);
    }
  }
  // Embodiment id difference counts as form/geometry domain
  if (a.embodimentId !== b.embodimentId && !differingDomains.includes("embodiment")) {
    differingDomains.push("embodiment");
  }
  if (a.policies.motionAmplitude !== b.policies.motionAmplitude) {
    if (!differingDomains.includes("dynamics")) differingDomains.push("dynamics");
  }

  const hasFormOrEmbodiment =
    differingDomains.includes("macro") ||
    differingDomains.includes("embodiment") ||
    a.embodimentId !== b.embodimentId;
  const hasMotion =
    differingDomains.includes("dynamics") ||
    Math.abs(a.policies.motionAmplitude - b.policies.motionAmplitude) > 0.02;
  const hasFaceOrAttention = differingDomains.includes("face");
  const hasEnergyMaterialOptics =
    differingDomains.includes("energy") ||
    differingDomains.includes("material") ||
    differingDomains.includes("optics") ||
    differingDomains.includes("relief") ||
    differingDomains.includes("skin");

  const mouthKeys = ["mouth_openness", "mouth_width", "corner_pull_l", "corner_pull_r"];
  const onlyMouth =
    domainDiffers(a.channels, b.channels, mouthKeys) &&
    !domainDiffers(
      a.channels,
      b.channels,
      Object.values(CHANNEL_DOMAIN_KEYS)
        .flat()
        .filter((k) => !mouthKeys.includes(k)),
    ) &&
    a.embodimentId === b.embodimentId;

  const ok =
    differingDomains.length >= 4 &&
    hasFormOrEmbodiment &&
    hasMotion &&
    hasFaceOrAttention &&
    hasEnergyMaterialOptics &&
    !onlyMouth;

  return {
    a: aId,
    b: bId,
    differingDomains,
    domainCount: differingDomains.length,
    hasFormOrEmbodiment,
    hasMotion,
    hasFaceOrAttention,
    hasEnergyMaterialOptics,
    mouthOnly: onlyMouth,
    ok,
  };
}

export function evaluateAllEndpointDistinctness(): DistinctnessPairReport[] {
  const reports: DistinctnessPairReport[] = [];
  for (let i = 0; i < EIGHT_STATE_IDS.length; i++) {
    for (let j = i + 1; j < EIGHT_STATE_IDS.length; j++) {
      reports.push(
        evaluateEndpointPairDistinctness(EIGHT_STATE_IDS[i]!, EIGHT_STATE_IDS[j]!),
      );
    }
  }
  return reports;
}

function fnv1a32Hex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
