/**
 * Lane C — pure classification helpers for layer activation audit.
 * No React, no RigController edits — diagnosis only.
 */

export type LayerClass =
  | "operational"
  | "operational-state-only"
  | "present-inactive"
  | "placeholder"
  | "broken"
  | "unsupported";

export type LayerAuditEntry = {
  systemId: string;
  elementIds: string[];
  geometryPopulated: boolean;
  visible: boolean;
  opacity: number | null;
  hasFilter: boolean;
  hasGradientOrFill: boolean;
  bounds: { w: number; h: number } | null;
  stateChangesAlter: boolean | null;
  embodimentSpecific: boolean;
  geometryKind: "static" | "procedural" | "inactive" | "unknown";
  classification: LayerClass;
  notes: string;
};

export type ReliefDiagnosis =
  | "intentionally_inactive_in_neutral"
  | "activates_in_other_fixture_or_mode"
  | "paths_empty_all_states"
  | "missing_sample_field_generation"
  | "visual_only_via_filters"
  | "currently_broken";

/** Element ID maps for authority SVG systems. */
export const LAYER_SYSTEM_MAP: Record<
  string,
  { elementIds: string[]; embodimentSpecific?: boolean }
> = {
  body: { elementIds: ["body", "bodyBase", "shellBaseLayer"] },
  shell_base: { elementIds: ["shellBaseLayer", "shellChromaticPath", "chromaticShell"] },
  inner_volume: { elementIds: ["innerVolumeLayer", "innerVolumePath", "pearlCorePath"] },
  violet_crown: { elementIds: ["violetCrownLayer", "crownBloomPath", "crownHotspotPath", "violetCorePath"] },
  cyan_reservoir: { elementIds: ["cyanReservoirLayer", "cyanReservoirPath", "cyanFieldNode"] },
  cosmic_texture: { elementIds: ["cosmicTextureLayer", "cosmicCloudPath", "cosmicCells"] },
  adaptive_relief: { elementIds: ["adaptiveReliefSoft", "reliefBlur", "reliefMicro"] },
  normals_curvature: { elementIds: ["opticalDepth", "opticalDepthGrad"] },
  key_reflection: { elementIds: ["keyGrad", "specularGlow"] },
  secondary_reflection: { elementIds: ["bounceGrad", "fillGrad"] },
  edge_rims: { elementIds: ["rimGrad", "rimVioletGrad"] },
  face_recess: { elementIds: ["faceRecessGrad", "eyeLRecess", "eyeRRecess", "mouthRecess"] },
  face_emission: { elementIds: ["faceGlow", "faceFill", "eyeL", "eyeR", "mouth"] },
  ground_contact: { elementIds: ["groundContactLayer", "ground", "contactShadow"] },
  energy_interior: { elementIds: ["pearlCorePath", "violetCorePath", "interiorEnergy"] },
  aura: { elementIds: ["blurSoft", "blurBroad", "groundGlow"] },
  event_horizon: { elementIds: ["accretionDiscBack", "accretionDiscGrad"] },
  accretion_planes: {
    elementIds: ["accretionDiscBackLayer", "accretionDiscBackGlow", "accretionDiscBack"],
    embodimentSpecific: true,
  },
  comet_wake: {
    elementIds: ["viewTailBackLayer", "viewTailBack", "viewTailGrad"],
    embodimentSpecific: true,
  },
  dormant_orbit_structures: {
    elementIds: ["accretionDiscBack", "viewTailBack"],
    embodimentSpecific: true,
  },
  low_orbit_structures: {
    elementIds: ["ground", "contactShadow", "groundContactLayer"],
    embodimentSpecific: true,
  },
};

export function classifyFromMetrics(m: {
  systemId: string;
  populatedIds: number;
  totalIds: number;
  visible: boolean;
  opacity: number | null;
  bounds: { w: number; h: number } | null;
  stateChangesAlter: boolean | null;
  hasFilter: boolean;
  hasGeometryPath: boolean;
}): LayerClass {
  if (m.totalIds === 0) return "unsupported";
  // Filter/ID presence alone is never "operational" without path geometry or state response
  if (!m.hasGeometryPath && m.populatedIds === 0) {
    if (m.hasFilter) return "placeholder";
    return "broken";
  }
  if (!m.hasGeometryPath && m.hasFilter) {
    // Filter-only / visual-only stack
    return m.stateChangesAlter ? "operational-state-only" : "placeholder";
  }
  if (!m.visible || (m.opacity !== null && m.opacity < 0.02)) {
    return m.stateChangesAlter ? "operational-state-only" : "present-inactive";
  }
  if (
    (!m.bounds || (m.bounds.w <= 0 && m.bounds.h <= 0)) &&
    !m.hasGeometryPath
  ) {
    return "placeholder";
  }
  if (m.hasGeometryPath && m.stateChangesAlter) return "operational";
  if (m.hasGeometryPath && m.stateChangesAlter === false) {
    // Static populated geometry (always on)
    return "operational";
  }
  if (m.hasGeometryPath) return "operational";
  return "present-inactive";
}

export function diagnoseRelief(input: {
  neutralPopulated: boolean;
  anyStatePopulated: boolean;
  pathEmptyAllStates: boolean;
  filterOnly: boolean;
  amplitudeSeriesAlters: boolean;
}): ReliefDiagnosis {
  if (input.pathEmptyAllStates && input.filterOnly) return "visual_only_via_filters";
  if (input.pathEmptyAllStates) return "paths_empty_all_states";
  if (!input.neutralPopulated && input.anyStatePopulated) {
    return "activates_in_other_fixture_or_mode";
  }
  if (!input.neutralPopulated && !input.amplitudeSeriesAlters) {
    return "intentionally_inactive_in_neutral";
  }
  if (input.neutralPopulated && !input.amplitudeSeriesAlters) {
    return "missing_sample_field_generation";
  }
  if (!input.anyStatePopulated) return "currently_broken";
  return "intentionally_inactive_in_neutral";
}
