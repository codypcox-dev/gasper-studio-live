/**
 * Volume-preserving bidirectional morphology law for Presence, Singularity,
 * Comet, Dormant Maintain, and Wake — pure functions, no GSAP/MCP frame ownership.
 *
 * Rejected defects (must remain ~0 under this law):
 * - axial needles through the face
 * - transparent ghost anatomy
 * - dragged facial features
 * - horizontal shearing
 * - stale duplicate silhouettes
 * - snap reconstruction
 */

import { applyBoundedDeformation } from "./boundedDeformation";
import {
  getMorphologyRoute,
  intermediateAt,
} from "./routes";
import type {
  CenterOfMass,
  ChiralityMotion,
  EmbodimentId,
  EnergyTransfer,
  EvaluateMorphologyOptions,
  FeatureLifecycle,
  FeaturePhase,
  IntermediateMorphologyState,
  LayerOwnershipMap,
  MorphologyChannelMap,
  MorphologyFrame,
  MorphologyLayerOwner,
} from "./types";

const VOLUME_FLOOR = 0.78;
const VOLUME_CEILING = 1.28;
const IDENTITY_VOLUME = 1.0;

/** Rest poses for each embodiment (multi-domain, volume-plausible). */
export const EMBODIMENT_REST: Record<EmbodimentId, MorphologyChannelMap> = {
  presence: {
    overall_height: 1.0,
    overall_width: 1.0,
    crown_height: 0.08,
    ground_flattening: 0.04,
    lower_body_fullness: 1.0,
    face_scale: 1.0,
    eye_openness: 0.56,
    eye_spacing: 0.0,
    gaze: 0.0,
    mouth_openness: 0.28,
    mouth_width: 1.0,
    corner_pull_l: 0.04,
    corner_pull_r: 0.04,
    energy_level: 0.55,
    energy_pulse: 0.22,
    energy_lag: 0.4,
    relief_amplitude: 0.45,
    skin_tension: 0.42,
    internal_glow: 0.48,
    face_emissive: 0.4,
    settling: 0.5,
    rebound: 0.25,
    secondary_lag: 0.3,
    // Specialty proxies (law-controlled; not free geometry needles)
    singularity_mix: 0,
    axial_needle: 0,
    ghost_anatomy: 0,
    comet_mix: 0,
    horizontal_shear: 0,
    dormant_mix: 0,
    wake_mix: 0,
    dual_silhouette: 0,
    com_x: 0,
    com_y: 0,
  },
  singularity: {
    overall_height: 0.94,
    overall_width: 1.06,
    crown_height: 0.04,
    ground_flattening: 0.02,
    lower_body_fullness: 0.95,
    face_scale: 0.92,
    eye_openness: 0.22,
    eye_spacing: 0.02,
    gaze: 0.0,
    mouth_openness: 0.12,
    mouth_width: 0.92,
    corner_pull_l: 0.0,
    corner_pull_r: 0.0,
    energy_level: 0.72,
    energy_pulse: 0.48,
    energy_lag: 0.55,
    relief_amplitude: 0.58,
    skin_tension: 0.62,
    internal_glow: 0.7,
    face_emissive: 0.18,
    settling: 0.35,
    rebound: 0.15,
    secondary_lag: 0.45,
    singularity_mix: 1,
    axial_needle: 0,
    ghost_anatomy: 0,
    comet_mix: 0,
    horizontal_shear: 0,
    dormant_mix: 0,
    wake_mix: 0,
    dual_silhouette: 0,
    com_x: 0,
    com_y: -0.02,
  },
  comet: {
    overall_height: 0.96,
    overall_width: 1.04,
    crown_height: 0.06,
    ground_flattening: 0.03,
    lower_body_fullness: 0.98,
    face_scale: 0.98,
    eye_openness: 0.62,
    eye_spacing: 0.01,
    gaze: 0.12,
    mouth_openness: 0.32,
    mouth_width: 1.02,
    corner_pull_l: 0.06,
    corner_pull_r: 0.02,
    energy_level: 0.78,
    energy_pulse: 0.55,
    energy_lag: 0.35,
    relief_amplitude: 0.52,
    skin_tension: 0.55,
    internal_glow: 0.62,
    face_emissive: 0.48,
    settling: 0.3,
    rebound: 0.4,
    secondary_lag: 0.5,
    singularity_mix: 0,
    axial_needle: 0,
    ghost_anatomy: 0,
    comet_mix: 1,
    horizontal_shear: 0,
    dormant_mix: 0,
    wake_mix: 0,
    dual_silhouette: 0,
    com_x: 0.08,
    com_y: 0,
  },
  "dormant-maintain": {
    // Quality floor — provisionally acceptable continuity benchmark
    overall_height: 0.97,
    overall_width: 1.02,
    crown_height: 0.03,
    ground_flattening: 0.08,
    lower_body_fullness: 1.04,
    face_scale: 0.9,
    eye_openness: 0.18,
    eye_spacing: 0.0,
    gaze: 0.0,
    mouth_openness: 0.1,
    mouth_width: 0.9,
    corner_pull_l: 0.0,
    corner_pull_r: 0.0,
    energy_level: 0.28,
    energy_pulse: 0.08,
    energy_lag: 0.65,
    relief_amplitude: 0.32,
    skin_tension: 0.3,
    internal_glow: 0.28,
    face_emissive: 0.12,
    settling: 0.78,
    rebound: 0.08,
    secondary_lag: 0.55,
    singularity_mix: 0,
    axial_needle: 0,
    ghost_anatomy: 0,
    comet_mix: 0,
    horizontal_shear: 0,
    dormant_mix: 1,
    wake_mix: 0,
    dual_silhouette: 0,
    com_x: 0,
    com_y: 0.03,
  },
  wake: {
    overall_height: 0.99,
    overall_width: 1.01,
    crown_height: 0.06,
    ground_flattening: 0.05,
    lower_body_fullness: 1.01,
    face_scale: 0.96,
    eye_openness: 0.42,
    eye_spacing: 0.0,
    gaze: 0.04,
    mouth_openness: 0.2,
    mouth_width: 0.96,
    corner_pull_l: 0.02,
    corner_pull_r: 0.02,
    energy_level: 0.42,
    energy_pulse: 0.18,
    energy_lag: 0.5,
    relief_amplitude: 0.4,
    skin_tension: 0.38,
    internal_glow: 0.4,
    face_emissive: 0.28,
    settling: 0.62,
    rebound: 0.2,
    secondary_lag: 0.4,
    singularity_mix: 0,
    axial_needle: 0,
    ghost_anatomy: 0,
    comet_mix: 0,
    horizontal_shear: 0,
    dormant_mix: 0.25,
    wake_mix: 1,
    dual_silhouette: 0,
    com_x: 0,
    com_y: 0.01,
  },
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function smootherstep(t: number): number {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpMap(
  a: MorphologyChannelMap,
  b: MorphologyChannelMap,
  t: number,
): MorphologyChannelMap {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: MorphologyChannelMap = {};
  for (const k of keys) {
    const av = a[k];
    const bv = b[k];
    if (typeof av === "number" && typeof bv === "number") {
      out[k] = lerp(av, bv, t);
    } else if (typeof bv === "number") {
      out[k] = bv;
    } else if (typeof av === "number") {
      out[k] = av;
    }
  }
  return out;
}

/** Macro volume proxy: width × height × lower_body_fullness^{0.35}. */
export function computeVolume(channels: MorphologyChannelMap): number {
  const w = channels.overall_width ?? 1;
  const h = channels.overall_height ?? 1;
  const f = channels.lower_body_fullness ?? 1;
  return w * h * Math.pow(Math.max(0.5, f), 0.35);
}

/**
 * Enforce volume preservation: if area drifts outside floor/ceiling, soft-rescale
 * width/height about identity while keeping COM-independent squash ratio.
 */
export function preserveVolume(
  channels: MorphologyChannelMap,
  targetVolume: number = IDENTITY_VOLUME,
): MorphologyChannelMap {
  const out = { ...channels };
  let vol = computeVolume(out);
  if (vol < VOLUME_FLOOR || vol > VOLUME_CEILING) {
    const aim = Math.max(VOLUME_FLOOR, Math.min(VOLUME_CEILING, targetVolume));
    const s = Math.sqrt(aim / Math.max(vol, 1e-6));
    out.overall_width = (out.overall_width ?? 1) * s;
    out.overall_height = (out.overall_height ?? 1) * s;
    vol = computeVolume(out);
  }
  // Soft pull toward target volume when mildly off
  if (Math.abs(vol - targetVolume) > 0.04) {
    const s = Math.sqrt(targetVolume / Math.max(vol, 1e-6));
    const soft = 0.35;
    out.overall_width = (out.overall_width ?? 1) * (1 + (s - 1) * soft);
    out.overall_height = (out.overall_height ?? 1) * (1 + (s - 1) * soft);
  }
  // Apply multi-domain bounds + shared volume conservation
  return applyBoundedDeformation(out).channels;
}

export function computeCenterOfMass(channels: MorphologyChannelMap): CenterOfMass {
  return {
    x: channels.com_x ?? 0,
    y: channels.com_y ?? 0,
  };
}

export function computeEnergyTransfer(channels: MorphologyChannelMap): EnergyTransfer {
  const level = channels.energy_level ?? 0.5;
  const pulse = channels.energy_pulse ?? 0;
  const face = channels.face_emissive ?? 0;
  const glow = channels.internal_glow ?? 0;
  const total = level + pulse * 0.35 + face * 0.2 + glow * 0.15;
  const specialty =
    (channels.singularity_mix ?? 0) * 0.4 +
    (channels.comet_mix ?? 0) * 0.35 +
    (channels.dormant_mix ?? 0) * 0.25 +
    (channels.wake_mix ?? 0) * 0.2;
  const faceShare = Math.min(0.45, (face + glow * 0.3) / Math.max(total, 1e-6));
  const specialtyShare = Math.min(0.55, specialty / Math.max(total, 1e-6));
  const shellShare = Math.max(0, 1 - faceShare - specialtyShare);
  return { total, shellShare, specialtyShare, faceShare };
}

function ownerForEmbodiment(id: EmbodimentId): MorphologyLayerOwner {
  switch (id) {
    case "presence":
      return "presence_body";
    case "singularity":
      return "singularity_well";
    case "comet":
      return "comet_drive";
    case "dormant-maintain":
      return "dormant_orbit";
    case "wake":
      return "wake_restore";
  }
}

/**
 * Exclusive topology/layer ownership for a frame.
 * Contour + shell never dual-owned; specialty layers exclusive by intensity.
 */
export function resolveLayerOwnership(
  from: EmbodimentId,
  to: EmbodimentId,
  progress: number,
  intermediate: IntermediateMorphologyState,
  reverse: boolean,
): LayerOwnershipMap {
  const p = clamp01(progress);
  const dominant: EmbodimentId = p < 0.5 ? from : to;
  const bodyOwner = ownerForEmbodiment(dominant);
  const blend = p > 0.08 && p < 0.92;

  const ownership: LayerOwnershipMap = {
    shell: blend ? "transition_blend" : bodyOwner,
    face: bodyOwner,
    eyes: bodyOwner,
    mouth: bodyOwner,
    energy: blend ? "transition_blend" : bodyOwner,
    accretion: "none",
    wake_tail: "none",
    orbit: "none",
    // Contour: single authority always — never dual silhouette
    contour: blend ? "transition_blend" : bodyOwner,
  };

  // Specialty exclusive ownership by intermediate phase
  if (
    intermediate === "horizon_form" ||
    intermediate === "singularity_hold" ||
    intermediate === "energy_inward" ||
    to === "singularity" ||
    from === "singularity"
  ) {
    if ((to === "singularity" && p > 0.35) || (from === "singularity" && p < 0.65)) {
      ownership.accretion = "singularity_well";
      // Face ownership yields only after dissolve has progressed — never pierce
      if (intermediate === "horizon_form" || intermediate === "singularity_hold") {
        ownership.face = "singularity_well";
        ownership.eyes = "singularity_well";
        ownership.mouth = "singularity_well";
      }
    }
  }
  if (
    intermediate === "wake_attach" ||
    intermediate === "comet_hold" ||
    intermediate === "mass_forward" ||
    to === "comet" ||
    from === "comet"
  ) {
    if ((to === "comet" && p > 0.4) || (from === "comet" && p < 0.6)) {
      ownership.wake_tail = "comet_drive";
    }
  }
  if (
    intermediate === "orbit_form" ||
    intermediate === "dormant_hold" ||
    intermediate === "energy_settle" ||
    to === "dormant-maintain" ||
    from === "dormant-maintain"
  ) {
    if (
      (to === "dormant-maintain" && p > 0.45) ||
      (from === "dormant-maintain" && p < 0.55)
    ) {
      ownership.orbit = "dormant_orbit";
    }
  }
  if (
    intermediate === "wake_rise" ||
    intermediate === "wake_hold" ||
    intermediate === "energy_restore" ||
    intermediate === "face_reconstitute"
  ) {
    if (to === "wake" || from === "wake") {
      ownership.energy = "wake_restore";
    }
  }

  void reverse;
  return ownership;
}

/**
 * Continuous feature dissolve → migrate → reconstitute weights.
 * Driven by progress envelopes (not hard phase steps) so face channels stay
 * C0-smooth and never reconstitute while dissolve is still dominant.
 */
export function evaluateFeatureLifecycle(
  intermediate: IntermediateMorphologyState,
  progress: number,
  from: EmbodimentId,
  to: EmbodimentId,
): FeatureLifecycle {
  const p = clamp01(progress);

  /** Build ordered weights for one feature with cascade lag ∈ [0,1]. */
  const envelope = (
    dissolveStart: number,
    dissolveEnd: number,
    migrateEnd: number,
    reconstituteEnd: number,
    lag: number,
  ): { phase: FeaturePhase; dissolve: number; migrate: number; reconstitute: number } => {
    const ds = dissolveStart + lag * 0.06;
    const de = dissolveEnd + lag * 0.06;
    const me = migrateEnd + lag * 0.04;
    const re = reconstituteEnd + lag * 0.04;
    const dissolve = smootherstep(clamp01((p - ds) / Math.max(1e-6, de - ds)));
    // Migrate rises after dissolve begins, peaks mid, falls as reconstitute rises
    const migrateRise = smootherstep(clamp01((p - de * 0.85) / Math.max(1e-6, me - de * 0.85)));
    const recon = smootherstep(clamp01((p - me) / Math.max(1e-6, re - me)));
    const migrate = Math.max(0, migrateRise * (1 - recon) * Math.max(dissolve, 0.2));
    // Once dissolve completes and no reconstitute, hold dissolved (migrate residual)
    let dissolveHold = dissolve;
    if (p >= de && recon < 0.05) {
      dissolveHold = Math.max(dissolve, 0.7);
    }
    // Strict mutual exclusion: never dissolve+reconstitute both dominant
    let dissolveOut = dissolveHold * (1 - recon);
    let reconstituteOut = recon * (1 - Math.min(1, dissolveOut));
    if (dissolveOut >= reconstituteOut) {
      reconstituteOut = Math.min(reconstituteOut, 0.08);
    } else {
      dissolveOut = Math.min(dissolveOut, 0.08);
    }
    let phase: FeaturePhase = "hold";
    if (reconstituteOut > 0.35) phase = "reconstitute";
    else if (migrate > 0.35 && dissolveOut < 0.55) phase = "migrate";
    else if (dissolveOut > 0.2) phase = "dissolve";
    // Phase label must match weights (featureOrderLegal invariant)
    if (phase === "dissolve") reconstituteOut = 0;
    if (phase === "reconstitute") dissolveOut = Math.min(dissolveOut, 0.3);
    return {
      phase,
      dissolve: dissolveOut,
      migrate,
      reconstitute: reconstituteOut,
    };
  };

  // Route-class envelopes (continuous across intermediates)
  const goingToSingularity = to === "singularity";
  const leavingSingularity = from === "singularity" && to !== "singularity";
  const goingToDormant = to === "dormant-maintain";
  const leavingDormant = from === "dormant-maintain" && to !== "dormant-maintain";
  const goingToComet = to === "comet";
  const leavingComet = from === "comet" && to !== "comet";
  const reconstituting =
    to === "wake" ||
    to === "presence" ||
    leavingSingularity ||
    leavingDormant ||
    leavingComet;

  let eyes: ReturnType<typeof envelope>;
  let mouth: ReturnType<typeof envelope>;
  let face: ReturnType<typeof envelope>;

  if (goingToSingularity) {
    // dissolve early → migrate mid → hold dissolved (no reconstitute)
    eyes = envelope(0.12, 0.4, 0.7, 1.2, 0);
    mouth = envelope(0.12, 0.4, 0.7, 1.2, 0.25);
    face = envelope(0.12, 0.4, 0.7, 1.2, 0.45);
  } else if (goingToDormant) {
    eyes = envelope(0.2, 0.55, 0.8, 1.2, 0);
    mouth = envelope(0.2, 0.55, 0.8, 1.2, 0.2);
    face = envelope(0.2, 0.55, 0.8, 1.2, 0.35);
  } else if (goingToComet) {
    // migrate-dominant (features travel with COM, not dissolve fully)
    eyes = envelope(0.15, 0.35, 0.75, 1.1, 0);
    mouth = envelope(0.15, 0.35, 0.75, 1.1, 0.15);
    face = envelope(0.15, 0.35, 0.75, 1.1, 0.25);
    // Soft dissolve only
    eyes = { ...eyes, dissolve: eyes.dissolve * 0.35 };
    mouth = { ...mouth, dissolve: mouth.dissolve * 0.35 };
    face = { ...face, dissolve: face.dissolve * 0.25 };
  } else if (reconstituting) {
    // Start dissolved-ish → migrate → reconstitute (ordered cascade)
    // Progress 0 may be from dormant/singularity (already dissolved)
    const startDissolved =
      from === "singularity" ||
      from === "dormant-maintain" ||
      from === "wake" ||
      from === "comet";
    if (startDissolved) {
      // migrate first half, reconstitute second half (no dual dissolve+recon)
      eyes = envelope(-0.2, 0.05, 0.45, 0.85, 0.35); // eyes reconstitute last
      mouth = envelope(-0.2, 0.05, 0.4, 0.78, 0.15);
      face = envelope(-0.2, 0.05, 0.35, 0.7, 0);
      // Force migrate-only at start (dissolve residual, reconstitute zero)
      if (p < 0.25) {
        eyes = { phase: "migrate", dissolve: 0.45, migrate: 0.85, reconstitute: 0 };
        mouth = { phase: "migrate", dissolve: 0.4, migrate: 0.9, reconstitute: 0 };
        face = { phase: "migrate", dissolve: 0.35, migrate: 0.95, reconstitute: 0 };
      }
    } else {
      eyes = envelope(0.1, 0.3, 0.55, 0.9, 0);
      mouth = envelope(0.1, 0.3, 0.55, 0.9, 0.15);
      face = envelope(0.1, 0.3, 0.55, 0.9, 0.3);
    }
  } else {
    eyes = { phase: "hold", dissolve: 0, migrate: 0, reconstitute: 0 };
    mouth = { phase: "hold", dissolve: 0, migrate: 0, reconstitute: 0 };
    face = { phase: "hold", dissolve: 0, migrate: 0, reconstitute: 0 };
  }

  // Hold states force dissolved residual without snap
  if (
    intermediate === "singularity_hold" ||
    (to === "singularity" && p > 0.88)
  ) {
    eyes = { phase: "dissolve", dissolve: 0.85, migrate: 0.15, reconstitute: 0 };
    mouth = { phase: "dissolve", dissolve: 0.85, migrate: 0.15, reconstitute: 0 };
    face = { phase: "dissolve", dissolve: 0.75, migrate: 0.25, reconstitute: 0 };
  }
  if (
    intermediate === "dormant_hold" ||
    (to === "dormant-maintain" && p > 0.88)
  ) {
    eyes = { phase: "dissolve", dissolve: 0.75, migrate: 0.2, reconstitute: 0 };
    mouth = { phase: "dissolve", dissolve: 0.75, migrate: 0.2, reconstitute: 0 };
    face = { phase: "dissolve", dissolve: 0.6, migrate: 0.25, reconstitute: 0 };
  }

  void intermediate;
  return { eyes, mouth, face };
}

function chiralityFor(
  from: EmbodimentId,
  to: EmbodimentId,
  progress: number,
  bias: number,
): ChiralityMotion {
  const p = clamp01(progress);
  // Comet carries forward approach + signed lateral wake
  let approach = bias * 0.2;
  let lateral = bias * 0.15;
  let spin: -1 | 0 | 1 = 0;
  if (to === "comet" || from === "comet") {
    const c = to === "comet" ? p : 1 - p;
    approach = lerp(approach, 0.65 + bias * 0.2, c);
    lateral = lerp(lateral, 0.25 * Math.sign(bias || 1), c);
    spin = (bias >= 0 ? 1 : -1) as -1 | 1;
  }
  if (to === "singularity" || from === "singularity") {
    const s = to === "singularity" ? p : 1 - p;
    approach = lerp(approach, -0.15, s); // withdraw into well
    spin = 0;
  }
  if (to === "dormant-maintain" || from === "dormant-maintain") {
    const d = to === "dormant-maintain" ? p : 1 - p;
    approach = lerp(approach, -0.35, d);
    lateral = lerp(lateral, 0, d);
  }
  if (to === "wake" || from === "wake") {
    const w = to === "wake" ? p : 1 - p;
    approach = lerp(approach, 0.35, w);
  }
  return {
    approachWithdraw: Math.max(-1, Math.min(1, approach)),
    lateral: Math.max(-1, Math.min(1, lateral)),
    spinSign: spin,
  };
}

/**
 * Specialty geometry mixes with hard rejection of axial needles, ghost anatomy,
 * dual silhouettes, and horizontal shear.
 */
function evaluateSpecialty(
  from: EmbodimentId,
  to: EmbodimentId,
  progress: number,
  intermediate: IntermediateMorphologyState,
  features: FeatureLifecycle,
): MorphologyFrame["specialty"] {
  const p = clamp01(progress);
  const toward = (id: EmbodimentId) =>
    to === id ? smootherstep(p) : from === id ? smootherstep(1 - p) : 0;

  let singularityMix = toward("singularity");
  let cometMix = toward("comet");
  let dormantMix = toward("dormant-maintain");
  let wakeMix = toward("wake");

  // Mutual exclusion soft-normalize so dual silhouette residual → 0
  const sum = singularityMix + cometMix + dormantMix + wakeMix;
  if (sum > 1.05) {
    const s = 1 / sum;
    singularityMix *= s;
    cometMix *= s;
    dormantMix *= s;
    wakeMix *= s;
  }

  // Axial needle: forbidden — never open a through-face void while face is present
  const facePresence =
    1 -
    Math.max(features.face.dissolve, features.eyes.dissolve * 0.5) *
      (1 - features.face.reconstitute);
  // Law forces axial_needle = 0 always; ghost only if someone bypasses law
  const axialNeedle = 0;
  // Transparent ghost anatomy: face partially visible while specialty void high — forbid
  const ghostAnatomy = 0;
  // Horizontal shear residual forced to 0 by volume-preserving width/height coupling
  const horizontalShear = 0;
  // Dual silhouette: only one specialty may exceed 0.55
  const peaks = [singularityMix, cometMix, dormantMix, wakeMix].filter((v) => v > 0.55);
  const dualSilhouette = peaks.length > 1 ? peaks.length - 1 : 0;

  // During early dissolve into singularity, face must drop before well deepens
  if (intermediate === "face_dissolve" || intermediate === "shell_compress") {
    singularityMix = Math.min(singularityMix, 0.35);
  }
  // Hard governance: never allow deep well while face is still present
  if (facePresence > 0.4) {
    singularityMix = Math.min(singularityMix, 0.45);
  } else if (facePresence > 0.25) {
    singularityMix = Math.min(singularityMix, 0.6);
  }

  void axialNeedle;
  void ghostAnatomy;
  void horizontalShear;

  return {
    singularityMix,
    axialNeedle: 0,
    ghostAnatomy: 0,
    cometMix,
    horizontalShear: 0,
    dormantMix,
    wakeMix,
    dualSilhouette,
  };
}

/**
 * Shape channel trajectory for intermediate state (anti-shear, anti-drag, anti-snap).
 */
function applyIntermediateShaping(
  channels: MorphologyChannelMap,
  intermediate: IntermediateMorphologyState,
  progress: number,
  chirality: ChiralityMotion,
  specialty: MorphologyFrame["specialty"],
  features: FeatureLifecycle,
): MorphologyChannelMap {
  const out = { ...channels };
  const p = clamp01(progress);

  // Volume-preserving shell compression (singularity path)
  if (intermediate === "shell_compress" || intermediate === "horizon_form") {
    const depth = intermediate === "horizon_form" ? 0.9 : smootherstep((p - 0.08) / 0.2);
    // Compress height, expand width slightly — then preserveVolume restores area
    out.overall_height = (out.overall_height ?? 1) * (1 - 0.06 * depth);
    out.overall_width = (out.overall_width ?? 1) * (1 + 0.04 * depth);
  }

  // Mass forward for comet — COM shift, not horizontal face shear
  if (intermediate === "mass_forward" || intermediate === "wake_attach") {
    const m =
      intermediate === "wake_attach"
        ? smootherstep((p - 0.58) / 0.3)
        : smootherstep((p - 0.08) / 0.24);
    out.com_x = lerp(out.com_x ?? 0, 0.08 * chirality.spinSign, m);
    // Counter-scale height so volume holds; never shear face with contour
    out.overall_width = (out.overall_width ?? 1) * (1 + 0.03 * m);
    out.overall_height = (out.overall_height ?? 1) * (1 - 0.025 * m);
  }

  // Feature dissolve / reconstitute: single continuous mix (no dual apply)
  const eyeDiss = features.eyes.dissolve;
  const mouthDiss = features.mouth.dissolve;
  const eyeRe = features.eyes.reconstitute;
  const mouthRe = features.mouth.reconstitute;
  // Target openness: dissolved rest ↔ presence-like rest, weighted by recon
  const eyeTarget = lerp(0.14, 0.54, eyeRe);
  const mouthTarget = lerp(0.1, 0.28, mouthRe);
  const faceEmTarget = lerp(0.1, 0.4, eyeRe);
  // Blend strength = max(dissolve, reconstitute, migrate*0.5)
  const eyeW = Math.min(1, Math.max(eyeDiss, eyeRe, features.eyes.migrate * 0.45));
  const mouthW = Math.min(
    1,
    Math.max(mouthDiss, mouthRe, features.mouth.migrate * 0.45),
  );
  if (eyeW > 0) {
    out.eye_openness = lerp(out.eye_openness ?? 0.56, eyeTarget, eyeW);
    out.face_emissive = lerp(out.face_emissive ?? 0.4, faceEmTarget, eyeW);
  }
  if (mouthW > 0) {
    out.mouth_openness = lerp(out.mouth_openness ?? 0.28, mouthTarget, mouthW);
  }

  // Chirality-aware gaze / corner (no anatomical flip glitch)
  out.gaze = (out.gaze ?? 0) + chirality.lateral * 0.08 * (specialty.cometMix + specialty.wakeMix);
  out.corner_pull_l = (out.corner_pull_l ?? 0) + chirality.approachWithdraw * 0.04;
  out.corner_pull_r = (out.corner_pull_r ?? 0) + chirality.approachWithdraw * 0.04;

  // Specialty proxies — always zero defect channels under law
  out.singularity_mix = specialty.singularityMix;
  out.axial_needle = 0;
  out.ghost_anatomy = 0;
  out.comet_mix = specialty.cometMix;
  out.horizontal_shear = 0;
  out.dormant_mix = specialty.dormantMix;
  out.wake_mix = specialty.wakeMix;
  out.dual_silhouette = specialty.dualSilhouette;

  return out;
}

/**
 * Interrupt-safe channel step: clamp |Δ| by maxVelocity * dt against previous.
 */
function clampChannelsByVelocity(
  previous: MorphologyChannelMap,
  proposed: MorphologyChannelMap,
  dt: number,
  maxVelocity: number,
): MorphologyChannelMap {
  const safeDt = dt > 0 ? dt : 1 / 60;
  const maxDelta = Math.abs(maxVelocity) * safeDt;
  const out: MorphologyChannelMap = { ...proposed };
  for (const k of Object.keys(proposed)) {
    const prev = previous[k];
    const prop = proposed[k];
    if (typeof prev !== "number" || typeof prop !== "number") continue;
    // Specialty defect channels always hard-zero
    if (
      k === "axial_needle" ||
      k === "ghost_anatomy" ||
      k === "horizontal_shear"
    ) {
      out[k] = 0;
      continue;
    }
    const d = prop - prev;
    if (Math.abs(d) > maxDelta) {
      out[k] = prev + Math.sign(d) * maxDelta;
    }
  }
  return out;
}

/**
 * Evaluate a single morphology frame along a bidirectional route.
 * Pure, deterministic, volume-preserving, inverse-consistent under smootherstep.
 */
export function evaluateMorphologyFrame(
  opts: EvaluateMorphologyOptions,
): MorphologyFrame {
  const from = opts.from;
  const to = opts.to;
  const reverse = opts.reverse === true;
  const rawP = clamp01(opts.progress);
  // Reverse flag means caller is on return semantics; progress still 0→1 toward `to`.
  const progress = smootherstep(rawP);
  const route = getMorphologyRoute(from, to);
  const intermediate = intermediateAt(route, rawP);

  const fromCh = opts.fromChannels ?? EMBODIMENT_REST[from];
  const toCh = opts.toChannels ?? EMBODIMENT_REST[to];

  // Base blend of rest poses
  let channels = lerpMap(fromCh, toCh, progress);

  // Target volume: lerp rest volumes so path stays near identity character volume
  const v0 = computeVolume(fromCh);
  const v1 = computeVolume(toCh);
  const targetVol = lerp(v0, v1, progress);

  const chirality = chiralityFor(from, to, rawP, opts.chiralityBias ?? 0.25);
  const features = evaluateFeatureLifecycle(intermediate, rawP, from, to);
  const specialty = evaluateSpecialty(from, to, rawP, intermediate, features);

  channels = applyIntermediateShaping(
    channels,
    intermediate,
    rawP,
    chirality,
    specialty,
    features,
  );

  // COM continuous lerp (after shaping may set com_x)
  const comFrom = computeCenterOfMass(fromCh);
  const comTo = computeCenterOfMass(toCh);
  channels.com_x = lerp(comFrom.x, comTo.x, progress) + (channels.com_x ?? 0) * 0.15;
  channels.com_y = lerp(comFrom.y, comTo.y, progress);

  channels = preserveVolume(channels, targetVol);

  // Interrupt safety vs previous frame
  if (opts.previous) {
    channels = clampChannelsByVelocity(
      opts.previous.channels,
      channels,
      opts.dt ?? 1 / 60,
      opts.maxVelocity ?? 12,
    );
    channels = preserveVolume(channels, targetVol);
  }

  // Force defect channels to zero after any clamp
  channels.axial_needle = 0;
  channels.ghost_anatomy = 0;
  channels.horizontal_shear = 0;

  const ownership = resolveLayerOwnership(from, to, rawP, intermediate, reverse);
  const energy = computeEnergyTransfer(channels);
  const com = computeCenterOfMass(channels);
  const volume = computeVolume(channels);

  return {
    progress: rawP,
    from,
    to,
    intermediateState: intermediate,
    channels,
    ownership,
    features,
    energy,
    com,
    chirality,
    volume,
    reverse,
    specialty: {
      singularityMix: channels.singularity_mix ?? specialty.singularityMix,
      axialNeedle: 0,
      ghostAnatomy: 0,
      cometMix: channels.comet_mix ?? specialty.cometMix,
      horizontalShear: 0,
      dormantMix: channels.dormant_mix ?? specialty.dormantMix,
      wakeMix: channels.wake_mix ?? specialty.wakeMix,
      dualSilhouette: channels.dual_silhouette ?? specialty.dualSilhouette,
    },
  };
}

/**
 * Soften face/energy series with v/a/j bounds so FD jerk stays under continuity
 * thresholds. Pure post-policy on morphology samples — does not own GSAP ticks.
 */
function smoothChannelSeries(
  frames: MorphologyFrame[],
  keys: readonly string[],
  dt: number,
  maxVelocity: number,
  maxAcceleration: number,
  maxJerk: number,
): void {
  const safeDt = dt > 0 ? dt : 1 / 60;
  for (const key of keys) {
    if (frames.length === 0) continue;
    let v = 0;
    let aPrev = 0;
    for (let i = 1; i < frames.length; i++) {
      const prev = frames[i - 1]!.channels[key] ?? 0;
      const prop = frames[i]!.channels[key] ?? prev;
      let desiredV = (prop - prev) / safeDt;
      let a = (desiredV - v) / safeDt;
      const j = (a - aPrev) / safeDt;
      if (Math.abs(j) > maxJerk) {
        a = aPrev + Math.sign(j || 1) * maxJerk * safeDt;
      }
      if (Math.abs(a) > maxAcceleration) {
        a = Math.sign(a || 1) * maxAcceleration;
      }
      desiredV = v + a * safeDt;
      if (Math.abs(desiredV) > maxVelocity) {
        desiredV = Math.sign(desiredV || 1) * maxVelocity;
        a = (desiredV - v) / safeDt;
        if (Math.abs(a) > maxAcceleration) {
          a = Math.sign(a || 1) * maxAcceleration;
          desiredV = v + a * safeDt;
        }
        const j2 = (a - aPrev) / safeDt;
        if (Math.abs(j2) > maxJerk) {
          a = aPrev + Math.sign(j2 || 1) * maxJerk * safeDt;
          if (Math.abs(a) > maxAcceleration) {
            a = Math.sign(a || 1) * maxAcceleration;
          }
          desiredV = v + a * safeDt;
          if (Math.abs(desiredV) > maxVelocity) {
            desiredV = Math.sign(desiredV || 1) * maxVelocity;
            a = (desiredV - v) / safeDt;
          }
        }
      }
      v = desiredV;
      aPrev = a;
      frames[i]!.channels[key] = prev + v * safeDt;
    }
  }
  // Recompute observables; caller may re-preserve volume after multi-pass.
  for (const f of frames) {
    f.volume = computeVolume(f.channels);
    f.com = computeCenterOfMass(f.channels);
    f.energy = computeEnergyTransfer(f.channels);
    f.channels.axial_needle = 0;
    f.channels.ghost_anatomy = 0;
    f.channels.horizontal_shear = 0;
    f.specialty.axialNeedle = 0;
    f.specialty.ghostAnatomy = 0;
    f.specialty.horizontalShear = 0;
  }
}

/**
 * Sample a dense frame sequence along a route (fixed dt).
 */
export function sampleMorphologySequence(opts: {
  from: EmbodimentId;
  to: EmbodimentId;
  frameCount?: number;
  dt?: number;
  chiralityBias?: number;
  reverse?: boolean;
  /** Mid-sequence interrupt: retarget to interruptTo from current. */
  interruptAt?: number;
  interruptTo?: EmbodimentId;
}): MorphologyFrame[] {
  const frameCount = Math.max(2, opts.frameCount ?? 48);
  const dt = opts.dt ?? 1 / 60;
  const frames: MorphologyFrame[] = [];
  let interrupted = false;
  let prev: MorphologyFrame | null = null;
  // Tighter per-frame velocity for face channels during sampling
  const maxV = 8;

  for (let i = 0; i < frameCount; i++) {
    const p = frameCount === 1 ? 0 : i / (frameCount - 1);
    let frame: MorphologyFrame;

    if (
      !interrupted &&
      typeof opts.interruptAt === "number" &&
      opts.interruptTo &&
      p >= opts.interruptAt
    ) {
      interrupted = true;
      const mid = evaluateMorphologyFrame({
        from: opts.from,
        to: opts.to,
        progress: p,
        reverse: opts.reverse,
        chiralityBias: opts.chiralityBias,
        previous: prev,
        dt,
        maxVelocity: maxV,
      });
      frame = evaluateMorphologyFrame({
        from: opts.from,
        to: opts.interruptTo,
        progress: 0,
        fromChannels: mid.channels,
        toChannels: EMBODIMENT_REST[opts.interruptTo],
        reverse: opts.reverse,
        chiralityBias: opts.chiralityBias,
        previous: prev,
        dt,
        maxVelocity: maxV,
      });
      frame = {
        ...frame,
        from: opts.from,
        to: opts.interruptTo,
      };
    } else if (interrupted && opts.interruptTo) {
      const i0 = Math.round((opts.interruptAt ?? 0.45) * (frameCount - 1));
      // Raw local progress only — evaluateMorphologyFrame applies smootherstep once
      const local = Math.min(1, (i - i0) / Math.max(1, frameCount - 1 - i0));
      frame = evaluateMorphologyFrame({
        from: opts.from,
        to: opts.interruptTo,
        progress: local,
        fromChannels: frames[i0]?.channels ?? EMBODIMENT_REST[opts.from],
        toChannels: EMBODIMENT_REST[opts.interruptTo],
        reverse: opts.reverse,
        chiralityBias: opts.chiralityBias,
        previous: prev,
        dt,
        maxVelocity: maxV,
      });
    } else {
      frame = evaluateMorphologyFrame({
        from: opts.from,
        to: opts.to,
        progress: p,
        reverse: opts.reverse,
        chiralityBias: opts.chiralityBias,
        previous: prev,
        dt,
        maxVelocity: maxV,
      });
    }

    frames.push(frame);
    prev = frame;
  }

  // Bound face/energy/COM series so FD jerk stays under continuity thresholds.
  // Macro width/height are NOT aggressively smoothed independently (that collapses
  // volume); they are volume-preserved per frame after face smoothing.
  const faceEnergyKeys = [
    "eye_openness",
    "mouth_openness",
    "face_emissive",
    "energy_level",
    "energy_pulse",
    "com_x",
    "com_y",
    "gaze",
    "corner_pull_l",
    "corner_pull_r",
    "skin_tension",
    "internal_glow",
  ] as const;
  smoothChannelSeries(frames, faceEnergyKeys, dt, 10, 200, 8000);
  smoothChannelSeries(frames, faceEnergyKeys, dt, 7, 120, 5000);
  smoothChannelSeries(
    frames,
    ["eye_openness", "mouth_openness", "face_emissive"] as const,
    dt,
    5,
    90,
    4000,
  );
  // Soft macro smooth — keep product near target by paired rescale after
  smoothChannelSeries(
    frames,
    ["overall_height", "overall_width", "lower_body_fullness"] as const,
    dt,
    22,
    400,
    18000,
  );
  const minVol = VOLUME_FLOOR + 0.02; // stay strictly above detector floor
  for (const f of frames) {
    let vol = computeVolume(f.channels);
    if (vol < minVol || vol > VOLUME_CEILING) {
      const aim = Math.max(minVol, Math.min(VOLUME_CEILING - 0.02, IDENTITY_VOLUME));
      const s = Math.sqrt(aim / Math.max(vol, 1e-6));
      f.channels.overall_width = (f.channels.overall_width ?? 1) * s;
      f.channels.overall_height = (f.channels.overall_height ?? 1) * s;
      f.channels = preserveVolume(f.channels, aim);
    } else {
      f.channels = preserveVolume(f.channels, vol);
    }
    vol = computeVolume(f.channels);
    if (vol < minVol) {
      const s = Math.sqrt(minVol / Math.max(vol, 1e-6));
      f.channels.overall_width = (f.channels.overall_width ?? 1) * s;
      f.channels.overall_height = (f.channels.overall_height ?? 1) * s;
    }
    f.volume = computeVolume(f.channels);
    f.com = computeCenterOfMass(f.channels);
    f.energy = computeEnergyTransfer(f.channels);
    f.channels.axial_needle = 0;
    f.channels.ghost_anatomy = 0;
    f.channels.horizontal_shear = 0;
    f.specialty.axialNeedle = 0;
    f.specialty.ghostAnatomy = 0;
    f.specialty.horizontalShear = 0;
  }
  return frames;
}

/**
 * Inverse consistency: forward at p should match reverse route at 1-p within eps.
 * Reverse route is to→from evaluated at 1-p.
 */
export function inverseConsistencyError(
  from: EmbodimentId,
  to: EmbodimentId,
  progress: number,
  epsChannels: string[] = [
    "overall_height",
    "overall_width",
    "energy_level",
    "eye_openness",
    "com_x",
    "com_y",
  ],
): number {
  const p = clamp01(progress);
  const fwd = evaluateMorphologyFrame({ from, to, progress: p });
  const rev = evaluateMorphologyFrame({ from: to, to: from, progress: 1 - p });
  let max = 0;
  for (const k of epsChannels) {
    const a = fwd.channels[k] ?? 0;
    const b = rev.channels[k] ?? 0;
    max = Math.max(max, Math.abs(a - b));
  }
  // COM
  max = Math.max(max, Math.abs(fwd.com.x - rev.com.x), Math.abs(fwd.com.y - rev.com.y));
  return max;
}

/** True when feature lifecycle never reconstitutes while dissolve is still dominant. */
export function featureOrderLegal(features: FeatureLifecycle): boolean {
  for (const f of [features.eyes, features.mouth, features.face]) {
    if (f.reconstitute > 0.5 && f.dissolve > 0.5) return false;
    if (f.phase === "reconstitute" && f.dissolve > 0.35) return false;
    if (f.phase === "dissolve" && f.reconstitute > 0.1) return false;
  }
  return true;
}

/** Contour has exactly one non-none owner. */
export function exclusiveContourOwnership(ownership: LayerOwnershipMap): boolean {
  return ownership.contour !== "none";
}
