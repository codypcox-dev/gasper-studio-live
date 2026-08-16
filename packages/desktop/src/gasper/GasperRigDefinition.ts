/**
 * Wave R3 — native embodiment profile registry.
 * Extracted from FormMaster FORM_PROFILES (identity labels + geometry traits).
 * Contour polar body path is owned by GasperContourSolver (R3 continued);
 * projector applies shared-topology traits without SidekickFormMasterRig.
 */

export type GasperGeometryModel =
  | "radial-shared-topology"
  | "dormant-family"
  | "forward-mass-attached-wake"
  | "ground-tangent-puddle";

export type GasperEmbodimentProfile = {
  id: string;
  label: string;
  note: string;
  /** Silhouette scale X (FormMaster sx). */
  sx: number;
  /** Silhouette scale Y (FormMaster sy). */
  sy: number;
  cx: number;
  cy: number;
  face: boolean;
  faceX?: number;
  faceY: number;
  faceScaleX: number;
  faceScaleY: number;
  eyeWidthScale?: number;
  eyeOpenScale?: number;
  mouthYShift?: number;
  mouthScale?: number;
  mouthOpenScale?: number;
  horizon: number;
  disc: number;
  lensed?: number;
  geometryModel: GasperGeometryModel;
  dormantCollapse?: number;
  dormantSpin?: number;
  frontAppendage?: string;
  tailPolicy?: string;
};

/** Canonical 8 embodiments — identity-preserving extract from FormMaster FORM_PROFILES. */
export const GASPER_EMBODIMENT_PROFILES: Record<string, GasperEmbodimentProfile> =
  {
    presence: {
      id: "presence",
      label: "Gasper Presence",
      note: "Protected home embodiment: knowing warmth, mature competence, restrained mischief",
      sx: 1.0,
      sy: 1.015,
      cx: 0,
      cy: 0,
      face: true,
      faceY: 0,
      faceScaleX: 1,
      faceScaleY: 1,
      horizon: 0.12,
      disc: 0,
      geometryModel: "radial-shared-topology",
    },
    singularity: {
      id: "singularity",
      label: "Dormant Singularity: Gravitational Seed",
      note: "Gasper compresses mass, light, face and attention into a family-native absorptive horizon",
      sx: 1,
      sy: 1,
      cx: 0,
      cy: 1,
      face: false,
      faceY: 0,
      faceScaleX: 1,
      faceScaleY: 1,
      horizon: 1.0,
      disc: 0.72,
      lensed: 0,
      geometryModel: "dormant-family",
      dormantCollapse: 1,
      dormantSpin: 0.18,
    },
    "dormant-orbit": {
      id: "dormant-orbit",
      label: "Dormant Orbit: Quiet Gyre",
      note: "Stable low-energy self-maintenance: residual gravity well, traveling spectral energy",
      sx: 1,
      sy: 1,
      cx: 0,
      cy: 1,
      face: false,
      faceY: 0,
      faceScaleX: 1,
      faceScaleY: 1,
      horizon: 0.34,
      disc: 0,
      lensed: 0,
      geometryModel: "dormant-family",
      dormantCollapse: 0.1,
      dormantSpin: 1,
    },
    wispwalker: {
      id: "wispwalker",
      label: "Wispwalker",
      note: "Load-bearing foot roots emerge continuously from redistributed lower-shell mass",
      sx: 0.93,
      sy: 1.16,
      cx: 0,
      cy: 2,
      face: true,
      faceY: -1,
      faceScaleX: 0.97,
      faceScaleY: 0.97,
      horizon: 0.22,
      disc: 0,
      frontAppendage: "rooted-feet",
      tailPolicy: "none",
      geometryModel: "radial-shared-topology",
    },
    comet: {
      id: "comet",
      label: "Comet Familiar",
      note: "Protected forward cranial dome flowing through a continuous shoulder into a tapered wake",
      sx: 1,
      sy: 1,
      cx: 0,
      cy: 0,
      face: true,
      faceX: 18,
      faceY: -1,
      faceScaleX: 0.92,
      faceScaleY: 0.94,
      eyeWidthScale: 1.08,
      eyeOpenScale: 1.08,
      horizon: 0.42,
      disc: 0,
      geometryModel: "forward-mass-attached-wake",
    },
    halo: {
      id: "halo",
      label: "Halo Crown",
      note: "Orbital intellect and event-horizon emphasis",
      sx: 1.045,
      sy: 0.955,
      cx: 0,
      cy: 1,
      face: true,
      faceY: 1,
      faceScaleX: 1.01,
      faceScaleY: 0.96,
      horizon: 0.92,
      disc: 0,
      geometryModel: "radial-shared-topology",
    },
    lantern: {
      id: "lantern",
      label: "Lantern Geist",
      note: "Tall, curious, and magically buoyant",
      sx: 0.9,
      sy: 1.105,
      cx: 0,
      cy: -1,
      face: true,
      faceY: -5,
      faceScaleX: 0.92,
      faceScaleY: 0.98,
      horizon: 0.3,
      disc: 0,
      geometryModel: "radial-shared-topology",
    },
    "low-orbit": {
      id: "low-orbit",
      label: "Low Orbit",
      note: "Ground-settled viscoelastic puddle with smooth side continuity and an intimate social face plane",
      sx: 1,
      sy: 1,
      cx: 0,
      cy: 0,
      face: true,
      faceY: 11.5,
      faceScaleX: 0.88,
      faceScaleY: 0.74,
      eyeWidthScale: 1.1,
      eyeOpenScale: 1.2,
      mouthYShift: -6.5,
      mouthScale: 1.14,
      mouthOpenScale: 1.28,
      horizon: 0.34,
      disc: 0,
      frontAppendage: "none",
      tailPolicy: "none",
      geometryModel: "ground-tangent-puddle",
    },
  };

export const GASPER_EMBODIMENT_IDS = Object.keys(
  GASPER_EMBODIMENT_PROFILES,
) as string[];

export function getEmbodimentProfile(
  id: string,
): GasperEmbodimentProfile | null {
  return GASPER_EMBODIMENT_PROFILES[id] ?? null;
}

export function listEmbodimentProfiles(): GasperEmbodimentProfile[] {
  return GASPER_EMBODIMENT_IDS.map((id) => GASPER_EMBODIMENT_PROFILES[id]!);
}

/** Domain binding defaults driven by embodiment profile (mixer / living). */
export function profileToDomainBindings(
  profile: GasperEmbodimentProfile,
): Record<string, number> {
  const faceScale = (profile.faceScaleX + profile.faceScaleY) / 2;
  const dormant = profile.geometryModel === "dormant-family";
  return {
    overall_width: profile.sx,
    overall_height: profile.sy,
    face_scale: profile.face ? faceScale : 0.35,
    // Singularity / horizon coupling
    singularity_vertical_compression: profile.face ? 0.35 : 0.72,
    singularity_outer_radius: 0.85 + profile.disc * 0.25,
    spectral_energy_envelope: 0.35 + profile.horizon * 0.55,
    horizon_radius: 0.4 + profile.horizon * 0.45,
    center_void: dormant ? 0.72 : 0.45,
    orbital_plane_scale: 0.85 + profile.disc * 0.3,
    // Face energy — dormant doctrine: emissive + aperture reduction, not delete
    face_emissive: profile.face ? 0.35 : 0.04,
    eye_openness: profile.face
      ? 0.55 * (profile.eyeOpenScale ?? 1)
      : 0.06,
    mouth_openness: profile.face ? 0.32 * (profile.mouthOpenScale ?? 1) : 0.04,
    energy_level: dormant ? 0.32 : 0.55,
    energy_occlusion: dormant ? 0.55 : 0.15,
    internal_glow: dormant ? 0.28 : 0.5,
  };
}
