/**
 * VEC-801 — Parameter binding labels, groups, and ranges for the Dais registry.
 * Pure catalog; no mount/clock/projection side effects.
 */

import { DEFAULT_FORM } from "../GasperRenderMixer";
import { MORPHOLOGY_DOMAINS } from "../GasperMorphologyDomains";

export const FORM_KEYS = Object.keys(DEFAULT_FORM) as string[];

export const BINDING_LABELS: Record<string, string> = {
  overall_width: "Overall width",
  overall_height: "Overall height",
  crown_height: "Crown height",
  lower_body_fullness: "Lower-body fullness",
  ground_flattening: "Ground flattening",
  face_scale: "Face scale",
  eye_openness: "Eye openness",
  eye_spacing: "Eye spacing",
  gaze: "Gaze",
  mouth_openness: "Mouth openness",
  mouth_width: "Mouth width",
  corner_pull_l: "Left corner pull",
  corner_pull_r: "Right corner pull",
  relief_amplitude: "Relief amplitude",
  relief_motion_coupling: "Relief motion coupling",
  relief_energy_coupling: "Relief energy coupling",
  energy_level: "Energy level",
  energy_pulse: "Energy pulse",
  energy_lag: "Energy lag",
  energy_occlusion: "Energy occlusion",
  skin_tension: "Skin tension",
  skin_damping: "Skin damping",
  skin_coupling: "Skin coupling",
  texture_amount: "Texture amount",
  texture_scale: "Texture scale",
  normal_strength: "Normal strength",
  curvature_response: "Curvature response",
  key_intensity: "Key intensity",
  key_direction: "Key direction",
  rim: "Rim",
  pearl_intensity: "Pearl intensity",
  internal_glow: "Internal glow (optical)",
  face_emissive: "Face emissive",
  absorption: "Absorption",
  roughness: "Roughness",
  clearcoat: "Clearcoat",
  inertia: "Inertia",
  secondary_lag: "Secondary lag",
  rebound: "Rebound",
  settling: "Settling",
  // Singularity embodiment
  singularity_outer_radius: "Outer radius",
  singularity_vertical_compression: "Vertical compression",
  shell_thickness: "Shell thickness",
  center_void: "Center void",
  horizon_radius: "Horizon radius",
  horizon_vertical_position: "Horizon vertical position",
  lens_compression: "Lens compression",
  horizon_depth: "Horizon depth",
  gravity_well_depth: "Gravity-well depth",
  orbital_plane_scale: "Orbital-plane scale",
  orbital_tilt: "Orbital tilt",
  orbital_circulation: "Circulation",
  spectral_energy_envelope: "Spectral energy",
  center_of_mass_y: "Center of mass",
  singularity_damping: "Damping",
  singularity_wobble: "Wobble",
  horizon_pulse: "Horizon pulse",
};

export const BINDING_GROUPS: Record<string, string> = {};
for (const d of MORPHOLOGY_DOMAINS) {
  for (const id of d.bindingIds) BINDING_GROUPS[id] = d.id;
}
// legacy form keys
for (const id of [
  "overall_width",
  "overall_height",
  "crown_height",
  "lower_body_fullness",
  "ground_flattening",
]) {
  BINDING_GROUPS[id] = "macro_deformation_field";
}
BINDING_GROUPS.roughness = "skin_surface";
BINDING_GROUPS.clearcoat = "skin_surface";
BINDING_GROUPS.pearl_intensity = "world_space_optical_rig";
BINDING_GROUPS.internal_glow = "world_space_optical_rig";
// Singularity inspector groups (embodiment-aware; same registry)
for (const id of [
  "singularity_outer_radius",
  "singularity_vertical_compression",
  "shell_thickness",
  "center_void",
  "center_of_mass_y",
]) {
  BINDING_GROUPS[id] = "singularity_form";
}
for (const id of [
  "horizon_radius",
  "horizon_vertical_position",
  "lens_compression",
  "horizon_depth",
  "gravity_well_depth",
]) {
  BINDING_GROUPS[id] = "horizon";
}
for (const id of [
  "orbital_plane_scale",
  "orbital_tilt",
  "orbital_circulation",
  "spectral_energy_envelope",
]) {
  BINDING_GROUPS[id] = "orbital_field";
}
for (const id of [
  "singularity_damping",
  "singularity_wobble",
  "horizon_pulse",
]) {
  BINDING_GROUPS[id] = "singularity_dynamics";
}

export function rangeForBinding(id: string): { min: number; max: number } {
  if (
    id === "key_direction" ||
    id === "gaze" ||
    id === "eye_spacing" ||
    id.includes("pull") ||
    id === "horizon_vertical_position" ||
    id === "orbital_tilt" ||
    id === "center_of_mass_y"
  ) {
    return { min: -1, max: 1 };
  }
  if (
    id.includes("openness") ||
    id === "crown_height" ||
    id === "ground_flattening" ||
    id.startsWith("energy_") ||
    id.startsWith("relief_") ||
    id.startsWith("skin_") ||
    id.startsWith("texture_") ||
    id.includes("strength") ||
    id.includes("response") ||
    id === "rim" ||
    id === "key_intensity" ||
    id === "pearl_intensity" ||
    id === "internal_glow" ||
    id === "face_emissive" ||
    id === "absorption" ||
    id === "roughness" ||
    id === "clearcoat" ||
    id === "inertia" ||
    id === "secondary_lag" ||
    id === "rebound" ||
    id === "settling" ||
    id === "singularity_vertical_compression" ||
    id === "shell_thickness" ||
    id === "center_void" ||
    id === "horizon_radius" ||
    id === "lens_compression" ||
    id === "horizon_depth" ||
    id === "gravity_well_depth" ||
    id === "orbital_circulation" ||
    id === "spectral_energy_envelope" ||
    id === "singularity_damping" ||
    id === "singularity_wobble" ||
    id === "horizon_pulse"
  ) {
    return { min: 0, max: 1 };
  }
  return { min: 0.35, max: 1.65 };
}
