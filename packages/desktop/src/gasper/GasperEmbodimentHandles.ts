/**
 * Embodiment-specific semantic manipulators.
 * Positions are UV (0–1) within live manipulation bounds — not fixed screen coords.
 */

import type { StageTool } from "./GasperSelectionModel";

export type SemanticHandleDef = {
  id: string;
  bindingId: string;
  label: string;
  /** Position within live manipulation bounds (0–1). */
  u: number;
  v: number;
  axis: "x" | "y" | "both";
  tools: StageTool[];
  /** Embodiments that show this handle; omit = all. */
  embodiments?: string[];
  group?: string;
};

/**
 * Generic / Presence-oriented form handles (Source Form).
 * GASPER-007-G: UV inset toward mass so purple knobs sit on/near silhouette
 * (not detached outside shell). Still only painted in AUTHORING form/face/light/material.
 */
export const SOURCE_FORM_HANDLES: SemanticHandleDef[] = [
  {
    id: "h-width",
    bindingId: "overall_width",
    label: "Width",
    u: 0.84,
    v: 0.5,
    axis: "x",
    tools: ["form"],
    group: "source_form",
  },
  {
    id: "h-height",
    bindingId: "overall_height",
    label: "Height",
    u: 0.5,
    v: 0.12,
    axis: "y",
    tools: ["form"],
    group: "source_form",
  },
  {
    id: "h-crown",
    bindingId: "crown_height",
    label: "Crown",
    u: 0.5,
    v: 0.2,
    axis: "y",
    tools: ["form"],
    group: "source_form",
  },
  {
    id: "h-fullness",
    bindingId: "lower_body_fullness",
    label: "Fullness",
    u: 0.74,
    v: 0.76,
    axis: "x",
    tools: ["form"],
    group: "source_form",
  },
  {
    id: "h-flatten",
    bindingId: "ground_flattening",
    label: "Flatten",
    u: 0.5,
    v: 0.88,
    axis: "y",
    tools: ["form"],
    group: "source_form",
  },
];

export const FACE_HANDLES: SemanticHandleDef[] = [
  {
    id: "h-face-scale",
    bindingId: "face_scale",
    label: "Face scale",
    u: 0.5,
    v: 0.42,
    axis: "both",
    tools: ["face"],
  },
  {
    id: "h-eye-open",
    bindingId: "eye_openness",
    label: "Eye open",
    u: 0.38,
    v: 0.4,
    axis: "y",
    tools: ["face"],
  },
  {
    id: "h-eye-space",
    bindingId: "eye_spacing",
    label: "Eye space",
    u: 0.62,
    v: 0.4,
    axis: "x",
    tools: ["face"],
  },
  {
    id: "h-mouth-open",
    bindingId: "mouth_openness",
    label: "Mouth open",
    u: 0.5,
    v: 0.58,
    axis: "y",
    tools: ["face"],
  },
  {
    id: "h-mouth-w",
    bindingId: "mouth_width",
    label: "Mouth width",
    u: 0.62,
    v: 0.58,
    axis: "x",
    tools: ["face"],
  },
  {
    id: "h-corner-l",
    bindingId: "corner_pull_l",
    label: "Corner L",
    u: 0.4,
    v: 0.6,
    axis: "y",
    tools: ["face"],
  },
  {
    id: "h-corner-r",
    bindingId: "corner_pull_r",
    label: "Corner R",
    u: 0.6,
    v: 0.6,
    axis: "y",
    tools: ["face"],
  },
];

/** Singularity-specific semantic handles (live-bounds UV). */
export const SINGULARITY_HANDLES: SemanticHandleDef[] = [
  {
    id: "h-sing-outer-r",
    bindingId: "singularity_outer_radius",
    label: "Outer radius",
    u: 0.88,
    v: 0.5,
    axis: "x",
    tools: ["form"],
    embodiments: ["singularity"],
    group: "singularity_form",
  },
  {
    id: "h-sing-vcomp",
    bindingId: "singularity_vertical_compression",
    label: "Vertical compression",
    u: 0.5,
    v: 0.12,
    axis: "y",
    tools: ["form"],
    embodiments: ["singularity"],
    group: "singularity_form",
  },
  {
    id: "h-sing-horizon-r",
    bindingId: "horizon_radius",
    label: "Horizon radius",
    u: 0.78,
    v: 0.48,
    axis: "x",
    tools: ["form"],
    embodiments: ["singularity"],
    group: "horizon",
  },
  {
    id: "h-sing-horizon-y",
    bindingId: "horizon_vertical_position",
    label: "Horizon Y",
    u: 0.5,
    v: 0.52,
    axis: "y",
    tools: ["form"],
    embodiments: ["singularity"],
    group: "horizon",
  },
  {
    id: "h-sing-shell",
    bindingId: "shell_thickness",
    label: "Shell thickness",
    u: 0.7,
    v: 0.35,
    axis: "both",
    tools: ["form"],
    embodiments: ["singularity"],
    group: "singularity_form",
  },
  {
    id: "h-sing-orbit-scale",
    bindingId: "orbital_plane_scale",
    label: "Orbital plane",
    u: 0.85,
    v: 0.72,
    axis: "x",
    tools: ["form"],
    embodiments: ["singularity"],
    group: "orbital_field",
  },
  {
    id: "h-sing-orbit-tilt",
    bindingId: "orbital_tilt",
    label: "Orbital tilt",
    u: 0.22,
    v: 0.68,
    axis: "y",
    tools: ["form"],
    embodiments: ["singularity"],
    group: "orbital_field",
  },
  {
    id: "h-sing-gravity",
    bindingId: "gravity_well_depth",
    label: "Gravity well",
    u: 0.5,
    v: 0.58,
    axis: "y",
    tools: ["form"],
    embodiments: ["singularity"],
    group: "horizon",
  },
  {
    id: "h-sing-spectral",
    bindingId: "spectral_energy_envelope",
    label: "Spectral energy",
    u: 0.18,
    v: 0.42,
    axis: "both",
    tools: ["form", "light"],
    embodiments: ["singularity"],
    group: "orbital_field",
  },
  {
    id: "h-sing-com",
    bindingId: "center_of_mass_y",
    label: "Center of mass",
    u: 0.5,
    v: 0.5,
    axis: "y",
    tools: ["form"],
    embodiments: ["singularity"],
    group: "singularity_form",
  },
];

/** Comet-oriented handles (tail / head mass). */
export const COMET_HANDLES: SemanticHandleDef[] = [
  {
    id: "h-comet-head",
    bindingId: "overall_width",
    label: "Head mass",
    u: 0.42,
    v: 0.42,
    axis: "both",
    tools: ["form"],
    embodiments: ["comet"],
  },
  {
    id: "h-comet-tail",
    bindingId: "spectral_energy_envelope",
    label: "Tail energy",
    u: 0.8,
    v: 0.68,
    axis: "x",
    tools: ["form", "light"],
    embodiments: ["comet"],
  },
];

/**
 * Dormant Orbit authoring handles — orbit/gravity only (no free-floating
 * source-form width/height knobs that read as detached purple points).
 */
export const DORMANT_HANDLES: SemanticHandleDef[] = [
  {
    id: "h-dormant-orbit-scale",
    bindingId: "orbital_plane_scale",
    label: "Orbit scale",
    u: 0.78,
    v: 0.5,
    axis: "x",
    tools: ["form"],
    embodiments: ["dormant-orbit"],
    group: "dormant_orbit",
  },
  {
    id: "h-dormant-spectral",
    bindingId: "spectral_energy_envelope",
    label: "Spectral",
    u: 0.5,
    v: 0.28,
    axis: "y",
    tools: ["form", "light"],
    embodiments: ["dormant-orbit"],
    group: "dormant_orbit",
  },
  {
    id: "h-dormant-gravity",
    bindingId: "gravity_well_depth",
    label: "Gravity well",
    u: 0.5,
    v: 0.55,
    axis: "y",
    tools: ["form"],
    embodiments: ["dormant-orbit"],
    group: "dormant_orbit",
  },
  {
    id: "h-dormant-horizon",
    bindingId: "horizon_radius",
    label: "Horizon",
    u: 0.72,
    v: 0.42,
    axis: "x",
    tools: ["form"],
    embodiments: ["dormant-orbit"],
    group: "dormant_orbit",
  },
];

const LIGHT_HANDLES: SemanticHandleDef[] = [
  {
    id: "h-glow",
    bindingId: "internal_glow",
    label: "Glow",
    u: 0.5,
    v: 0.52,
    axis: "y",
    tools: ["light"],
  },
  {
    id: "h-key",
    bindingId: "key_intensity",
    label: "Key",
    u: 0.28,
    v: 0.28,
    axis: "both",
    tools: ["light", "material"],
  },
  {
    id: "h-rim",
    bindingId: "rim",
    label: "Rim",
    u: 0.85,
    v: 0.45,
    axis: "x",
    tools: ["light"],
  },
  {
    id: "h-pearl",
    bindingId: "pearl_intensity",
    label: "Pearl",
    u: 0.5,
    v: 0.55,
    axis: "y",
    tools: ["material"],
  },
];

/**
 * Handles visible for embodiment + tool.
 * Singularity: singularity set only for form (no generic floating form dots).
 * Source form handles available for presence-like embodiments.
 */
export function handlesForEmbodiment(
  embodimentId: string,
  tool: StageTool,
  opts?: { faceIsolation?: boolean; showSourceFormHandles?: boolean },
): SemanticHandleDef[] {
  const out: SemanticHandleDef[] = [];

  if (tool === "face" || opts?.faceIsolation) {
    out.push(...FACE_HANDLES.filter((h) => h.tools.includes("face")));
  }

  if (tool === "light" || tool === "material") {
    out.push(...LIGHT_HANDLES.filter((h) => h.tools.includes(tool)));
  }

  if (tool === "form" || tool === "select") {
    if (embodimentId === "singularity") {
      out.push(
        ...SINGULARITY_HANDLES.filter(
          (h) => !h.embodiments || h.embodiments.includes(embodimentId),
        ),
      );
      if (opts?.showSourceFormHandles) {
        out.push(...SOURCE_FORM_HANDLES);
      }
    } else if (embodimentId === "dormant-orbit") {
      // Dormant: orbit handles only — source-form knobs float off the disc.
      out.push(
        ...DORMANT_HANDLES.filter(
          (h) => !h.embodiments || h.embodiments.includes(embodimentId),
        ),
      );
      if (opts?.showSourceFormHandles) {
        out.push(...SOURCE_FORM_HANDLES);
      }
    } else if (embodimentId === "comet") {
      out.push(...COMET_HANDLES);
      out.push(...SOURCE_FORM_HANDLES);
    } else {
      out.push(...SOURCE_FORM_HANDLES);
    }
  }

  // Filter by embodiment if specified; dedupe by handle id / binding
  const seen = new Set<string>();
  return out.filter((h) => {
    if (h.embodiments && !h.embodiments.includes(embodimentId)) return false;
    const key = h.id || h.bindingId;
    if (seen.has(key) || seen.has(`b:${h.bindingId}`)) return false;
    seen.add(key);
    seen.add(`b:${h.bindingId}`);
    return true;
  });
}

/** Inspector lead groups for Singularity. */
export type InspectorGroupDef = {
  id: string;
  title: string;
  bindingIds: string[];
  collapsedDefault?: boolean;
};

export const SINGULARITY_INSPECTOR_GROUPS: InspectorGroupDef[] = [
  {
    id: "singularity_form",
    title: "Singularity Form",
    bindingIds: [
      "singularity_outer_radius",
      "singularity_vertical_compression",
      "shell_thickness",
      "center_void",
      "center_of_mass_y",
    ],
  },
  {
    id: "horizon",
    title: "Horizon",
    bindingIds: [
      "horizon_radius",
      "lens_compression",
      "horizon_depth",
      "absorption",
      "horizon_vertical_position",
      "gravity_well_depth",
    ],
  },
  {
    id: "orbital_field",
    title: "Orbital Field",
    bindingIds: [
      "orbital_plane_scale",
      "orbital_tilt",
      "orbital_circulation",
      "spectral_energy_envelope",
    ],
  },
  {
    id: "singularity_dynamics",
    title: "Dynamics",
    bindingIds: [
      "singularity_damping",
      "singularity_wobble",
      "energy_lag",
      "horizon_pulse",
    ],
  },
  {
    id: "source_form",
    title: "Source Form",
    bindingIds: [
      "overall_width",
      "overall_height",
      "crown_height",
      "lower_body_fullness",
      "ground_flattening",
    ],
    collapsedDefault: true,
  },
];

/** Presence / Comet / Low Orbit / etc. — MASS + Form controls for Legacy Authority. */
export const PRESENCE_FORM_INSPECTOR_GROUPS: InspectorGroupDef[] = [
  {
    id: "mass",
    title: "MASS",
    bindingIds: [
      "overall_width",
      "overall_height",
      "crown_height",
      "lower_body_fullness",
      "ground_flattening",
    ],
  },
  {
    id: "motion_form",
    title: "MOTION",
    bindingIds: ["deformation_damping", "secondary_wobble"],
  },
];

export function inspectorGroupsForEmbodiment(
  embodimentId: string,
): InspectorGroupDef[] | null {
  if (embodimentId === "singularity") return SINGULARITY_INSPECTOR_GROUPS;
  // All other embodiments (presence, comet, low-orbit, …) get MASS Form groups
  // so Form inspector inputs bind crown_height / lower_body_fullness with data-binding-id.
  if (
    !embodimentId ||
    embodimentId === "presence" ||
    embodimentId === "comet" ||
    embodimentId === "low-orbit" ||
    embodimentId === "dormant-orbit" ||
    embodimentId === "wispwalker" ||
    embodimentId === "halo" ||
    embodimentId === "lantern"
  ) {
    return PRESENCE_FORM_INSPECTOR_GROUPS;
  }
  // Default: still expose MASS so Form sliders always exist for the complete character
  return PRESENCE_FORM_INSPECTOR_GROUPS;
}

/** All singularity-specific binding defaults for registry. */
export const SINGULARITY_BINDING_DEFAULTS: Record<string, number> = {
  singularity_outer_radius: 1,
  singularity_vertical_compression: 0.35,
  shell_thickness: 0.45,
  center_void: 0.55,
  horizon_radius: 0.62,
  horizon_vertical_position: 0,
  lens_compression: 0.4,
  horizon_depth: 0.5,
  gravity_well_depth: 0.55,
  orbital_plane_scale: 1,
  orbital_tilt: 0,
  orbital_circulation: 0.4,
  spectral_energy_envelope: 0.5,
  center_of_mass_y: 0,
  singularity_damping: 0.45,
  singularity_wobble: 0.2,
  horizon_pulse: 0.25,
};
