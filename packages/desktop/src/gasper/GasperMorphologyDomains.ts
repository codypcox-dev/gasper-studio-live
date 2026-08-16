/**
 * Morphology domains per Architecture Pack v0.2.
 * A contour-only or host-scale-only transform is INVALID as complete morph.
 */

export type MorphologyDomainId =
  | "canonical_contour"
  | "structural_lattice"
  | "macro_deformation_field"
  | "adaptive_relief_field"
  | "face_plane"
  | "internal_volume_energy"
  | "skin_surface"
  | "surface_texture_relief"
  | "normal_curvature_field"
  | "world_space_optical_rig"
  | "secondary_dynamics";

export type DomainStatus =
  | "COMPLETE"
  | "PARTIAL"
  | "MISSING"
  | "CONFLICTING"
  | "NOT_EXTRACTED";

export type MorphologyDomainSpec = {
  id: MorphologyDomainId;
  role: string;
  gsapTrack: string;
  /** Parameters owned by this domain (bindings). */
  bindingIds: string[];
  /** SVG layer ids affected (when mounted). */
  svgLayerIds: string[];
};

/** Required domain set — must never shrink without migration. */
export const MORPHOLOGY_DOMAINS: readonly MorphologyDomainSpec[] = Object.freeze([
  {
    id: "canonical_contour",
    role: "Protected silhouette boundary (512 samples)",
    gsapTrack: "contour",
    bindingIds: [],
    svgLayerIds: ["body", "clipBody", "rim"],
  },
  {
    id: "structural_lattice",
    role: "360 nodes / 672 triangles mass distribution",
    gsapTrack: "body_mass",
    bindingIds: [],
    svgLayerIds: ["idleRig", "body"],
  },
  {
    id: "macro_deformation_field",
    role: "Embodiment squash/stretch, crown, fullness, grounding",
    gsapTrack: "macro",
    bindingIds: [
      "overall_width",
      "overall_height",
      "crown_height",
      "lower_body_fullness",
      "ground_flattening",
    ],
    svgLayerIds: ["idleRig", "violetCrownLayer", "contactShadow", "ground"],
  },
  {
    id: "adaptive_relief_field",
    role: "25×40 / ≤1000 animated relief samples (movement-bearing)",
    gsapTrack: "relief",
    bindingIds: [
      "relief_amplitude",
      "relief_motion_coupling",
      "relief_energy_coupling",
    ],
    svgLayerIds: ["reliefLayer", "reliefHighlight", "reliefShadow"],
  },
  {
    id: "face_plane",
    role: "Integrated eyes/mouth co-equal deformation",
    gsapTrack: "face",
    bindingIds: [
      "face_scale",
      "eye_openness",
      "eye_spacing",
      "gaze",
      "mouth_openness",
      "mouth_width",
      "corner_pull_l",
      "corner_pull_r",
    ],
    svgLayerIds: ["faceRecessLayer", "eyeL", "eyeR", "mouth", "expressionShellLayer"],
  },
  {
    id: "internal_volume_energy",
    role: "Interior energy volume with lag/pulses (not glow-only)",
    gsapTrack: "energy",
    bindingIds: [
      "energy_level",
      "energy_pulse",
      "energy_lag",
      "energy_occlusion",
    ],
    svgLayerIds: [
      "innerVolumePath",
      "pearlCorePath",
      "violetCorePath",
      "innerVolumeLayer",
    ],
  },
  {
    id: "skin_surface",
    role: "Living skin tension/damping/shell coupling",
    gsapTrack: "skin",
    bindingIds: ["skin_tension", "skin_damping", "skin_coupling"],
    svgLayerIds: ["chromaticShell", "shellBaseLayer", "containedLobeMaterial"],
  },
  {
    id: "surface_texture_relief",
    role: "Texture/relief spatial variation (distinct from material color)",
    gsapTrack: "texture",
    bindingIds: ["texture_amount", "texture_scale"],
    svgLayerIds: ["cosmicTextureLayer", "cosmicCloudPath", "cosmicCells"],
  },
  {
    id: "normal_curvature_field",
    role: "Derived normals/curvature for material/lighting",
    gsapTrack: "normals",
    bindingIds: ["curvature_response", "normal_strength"],
    svgLayerIds: ["keyReflectionLayer"],
  },
  {
    id: "world_space_optical_rig",
    role: "Key/rim/ambient/contact/face emission/absorption channels",
    gsapTrack: "optics",
    bindingIds: [
      "key_intensity",
      "key_direction",
      "rim",
      "pearl_intensity",
      "internal_glow",
      "face_emissive",
      "absorption",
    ],
    svgLayerIds: [
      "keyHalo",
      "keyBand",
      "keyCore",
      "rim",
      "rightRim",
      "faceEmissionLayer",
      "groundGlow",
    ],
  },
  {
    id: "secondary_dynamics",
    role: "Inertia, lag, rebound, settling",
    gsapTrack: "dynamics",
    bindingIds: [
      "inertia",
      "secondary_lag",
      "rebound",
      "settling",
    ],
    svgLayerIds: ["idleRig", "cometFlowLayer", "viewTailFrontLayer"],
  },
]);

export const REQUIRED_GSAP_TRACKS = Object.freeze(
  MORPHOLOGY_DOMAINS.map((d) => d.gsapTrack),
);

export function domainIds(): MorphologyDomainId[] {
  return MORPHOLOGY_DOMAINS.map((d) => d.id);
}

/** Binding id → domain ownership (first match). */
export function domainForBinding(bindingId: string): MorphologyDomainId | null {
  for (const d of MORPHOLOGY_DOMAINS) {
    if (d.bindingIds.includes(bindingId)) return d.id;
  }
  // legacy form keys map to macro
  if (
    [
      "overall_width",
      "overall_height",
      "crown_height",
      "lower_body_fullness",
      "ground_flattening",
    ].includes(bindingId)
  ) {
    return "macro_deformation_field";
  }
  if (bindingId === "roughness" || bindingId === "clearcoat") {
    return "skin_surface";
  }
  // Specialty mix bindings — exclusive topology authors write these
  if (
    bindingId === "singularity_mix" ||
    bindingId === "axial_needle" ||
    bindingId === "ghost_anatomy"
  ) {
    return "internal_volume_energy";
  }
  if (bindingId === "comet_mix" || bindingId === "horizontal_shear") {
    return "secondary_dynamics";
  }
  if (
    bindingId === "dormant_mix" ||
    bindingId === "wake_mix" ||
    bindingId === "dual_silhouette"
  ) {
    return "secondary_dynamics";
  }
  if (bindingId === "com_x" || bindingId === "com_y") {
    return "macro_deformation_field";
  }
  return null;
}

/**
 * Specialty topology domain authors for exclusive embodiment binding.
 * Only one specialty author may own contested specialty layers per frame.
 */
export const SPECIALTY_TOPOLOGY_AUTHORS = Object.freeze({
  presence: "presence_body",
  singularity: "singularity_well",
  comet: "comet_drive",
  "dormant-maintain": "dormant_orbit",
  wake: "wake_restore",
} as const);

/** Binding ids that specialty geometry may write (exclusive ownership). */
export const SPECIALTY_BINDING_IDS = Object.freeze([
  "singularity_mix",
  "comet_mix",
  "dormant_mix",
  "wake_mix",
  "axial_needle",
  "ghost_anatomy",
  "horizontal_shear",
  "dual_silhouette",
] as const);
