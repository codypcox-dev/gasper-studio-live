/**
 * Gasper character invariants — one coherent body across all states.
 * Dormant Maintain is the minimum continuity/identity quality floor.
 */

import type { CharacterInvariant } from "./types";

/** Contour mass channels — shell exclusive. */
export const SHELL_CONTOUR_CHANNELS = [
  "overall_width",
  "overall_height",
  "crown_height",
  "lower_body_fullness",
  "ground_flattening",
] as const;

/** Internal energy channels — energy exclusive (never contour). */
export const ENERGY_INTERNAL_CHANNELS = [
  "energy_level",
  "energy_pulse",
  "energy_lag",
  "energy_occlusion",
  "internal_glow",
  "face_emissive",
  "spectral_energy_envelope",
] as const;

/** Face feature channels — face exclusive, shell-relative lattice. */
export const FACE_FEATURE_CHANNELS = [
  "eye_openness",
  "eye_spacing",
  "gaze",
  "mouth_openness",
  "mouth_width",
  "corner_pull_l",
  "corner_pull_r",
  "face_scale",
] as const;

/** Motion/dynamics channels — motion exclusive. */
export const MOTION_DYNAMIC_CHANNELS = [
  "inertia",
  "settling",
  "rebound",
  "secondary_lag",
  "motion",
  "relief_motion_coupling",
] as const;

/** Primary body channels co-defined as one character (multi-domain). */
export const CHARACTER_BODY_CHANNELS = [
  ...SHELL_CONTOUR_CHANNELS,
  ...FACE_FEATURE_CHANNELS,
  ...ENERGY_INTERNAL_CHANNELS,
  "relief_amplitude",
  "relief_energy_coupling",
  "skin_tension",
  "skin_damping",
  "skin_coupling",
  "pearl_intensity",
  "roughness",
  "clearcoat",
  "absorption",
  "key_intensity",
  "key_direction",
  "rim",
  "center_of_mass_y",
  ...MOTION_DYNAMIC_CHANNELS,
] as const;

/**
 * Canonical Gasper character invariants.
 * Silhouette = dark pearl shell; energy = cyan-violet internal; face attached.
 * Personality baseline: friendly / intelligent / slightly-up-to-something.
 */
export const GASPER_CHARACTER_INVARIANTS: CharacterInvariant = Object.freeze({
  id: "gasper-character-v1",
  silhouette: Object.freeze({
    widthHome: 1.0,
    heightHome: 1.0,
    maxWidthDelta: 0.12,
    maxHeightDelta: 0.12,
    aspectMin: 0.88,
    aspectMax: 1.14,
    crownMax: 0.18,
    groundFlattenMax: 0.16,
  }),
  volume: Object.freeze({
    areaMin: 0.82,
    areaMax: 1.18,
    floorAreaMin: 0.84,
    floorAreaMax: 1.0,
    allowSquashStretch: true,
  }),
  centerOfMass: Object.freeze({
    homeX: 0,
    homeY: 0.02,
    maxTravel: 0.1,
    channelY: "center_of_mass_y" as const,
  }),
  facialAttachment: Object.freeze({
    latticeId: "feature-anchors-v1" as const,
    maxAttachmentError: 0.05,
    requiredAnchors: Object.freeze([
      "shell_center",
      "face_plane",
      "eye_left",
      "eye_right",
      "mouth_center",
      "energy_core",
    ]),
    attachedNotFloating: true as const,
  }),
  shellEnergyHierarchy: Object.freeze({
    shellOwnsContour: true as const,
    energyOwnsInternalGlow: true as const,
    energyNeverOwnsContour: true as const,
    faceOwnsAttachedFeatures: true as const,
    motionOwnsDynamicsOnly: true as const,
    contourChannels: SHELL_CONTOUR_CHANNELS,
    energyChannels: ENERGY_INTERNAL_CHANNELS,
  }),
  material: Object.freeze({
    shell: "dark-pearl" as const,
    energy: "cyan-violet" as const,
    pearlIntensityHome: 0.55,
    pearlIntensityMin: 0.4,
    pearlIntensityMax: 0.68,
    roughnessHome: 0.34,
    clearcoatHome: 0.4,
    absorptionHome: 0.18,
  }),
  palette: Object.freeze({
    shellPrimary: "dark-pearl-neutral" as const,
    energyPrimary: "cyan" as const,
    energySecondary: "violet" as const,
    rimHome: 0.42,
    keyIntensityHome: 0.58,
    internalGlowHome: 0.48,
    faceEmissiveHome: 0.32,
    maxPaletteDelta: 0.32,
  }),
  personality: Object.freeze({
    friendly: 0.72,
    intelligent: 0.78,
    slightlyUpToSomething: 0.55,
    baselineRead:
      "Friendly, intelligent, slightly up-to-something resting presence.",
  }),
  qualityFloorStateId: "dormant-orbit-maintain",
});

/** Theatrical / icon overlay keys that must never appear in character profiles. */
export const THEATRICAL_OVERLAY_KEYS = Object.freeze([
  "icon",
  "icon_id",
  "badge",
  "badge_id",
  "emote",
  "emote_icon",
  "overlay_icon",
  "status_icon",
  "cartoon_symbol",
  "speech_bubble",
  "exclamation_mark",
  "thought_bubble",
  "sparkle_icon",
  "block_icon",
  "check_icon",
  "error_glyph",
  "theatrical_overlay",
]);
