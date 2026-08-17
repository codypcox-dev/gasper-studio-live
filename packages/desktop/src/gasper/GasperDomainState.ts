/**
 * Multi-domain authoring state (v0.2).
 * Energy, relief, skin, texture, normals, optics, dynamics are first-class —
 * not collapsed into a single material/glow layer.
 */

import { GASPER_TOPOLOGY } from "./GasperTopologyLock";
import type { MorphologyDomainId } from "./GasperMorphologyDomains";

export type DomainScalarMap = Record<string, number>;

export type AdaptiveReliefFieldState = {
  width: number;
  height: number;
  maxSamples: number;
  samples: Float32Array;
  amplitude: number;
  motionCoupling: number;
  energyCoupling: number;
  phase: number;
  animated: true;
  decorativeOnly: false;
  movementBearing: true;
};

export type InternalEnergyState = {
  level: number;
  target: number;
  pulse: number;
  lag: number;
  occlusion: number;
  laggedLevel: number;
  pulsePhase: number;
};

export type SkinSurfaceState = {
  tension: number;
  damping: number;
  coupling: number;
};

export type SurfaceTextureState = {
  amount: number;
  scale: number;
};

export type NormalCurvatureState = {
  normalStrength: number;
  curvatureResponse: number;
};

export type OpticalRigState = {
  keyIntensity: number;
  keyDirection: number;
  rim: number;
  pearl: number;
  faceEmissive: number;
  absorption: number;
  internalGlow: number;
};

export type SecondaryDynamicsState = {
  inertia: number;
  secondaryLag: number;
  rebound: number;
  settling: number;
  residual: number;
};

export type MacroDeformationState = {
  overall_width: number;
  overall_height: number;
  crown_height: number;
  lower_body_fullness: number;
  ground_flattening: number;
  // V2.4 / D-0016 §6d: weight-transfer body channels (the wispwalker walk's defining
  // lateral mass shift + lean + center drift). Optional so existing constructors stay
  // valid; the native solver reads them via macroStateFromDomain (?? 0 = no deformation).
  asym?: number;
  body_lean?: number;
  posture_x?: number;
  posture_y?: number;
};

export type FacePlaneState = {
  face_scale: number;
  eye_openness: number;
  eye_spacing: number;
  gaze: number;
  mouth_openness: number;
  mouth_width: number;
  corner_pull_l: number;
  corner_pull_r: number;
};

/** Singularity embodiment authoring (registry-backed). */
export type SingularityFormState = {
  singularity_outer_radius: number;
  singularity_vertical_compression: number;
  shell_thickness: number;
  center_void: number;
  horizon_radius: number;
  horizon_vertical_position: number;
  lens_compression: number;
  horizon_depth: number;
  gravity_well_depth: number;
  orbital_plane_scale: number;
  orbital_tilt: number;
  orbital_circulation: number;
  spectral_energy_envelope: number;
  center_of_mass_y: number;
  singularity_damping: number;
  singularity_wobble: number;
  horizon_pulse: number;
};

export type GasperMultiDomainState = {
  macro: MacroDeformationState;
  face: FacePlaneState;
  singularity: SingularityFormState;
  relief: AdaptiveReliefFieldState;
  energy: InternalEnergyState;
  skin: SkinSurfaceState;
  texture: SurfaceTextureState;
  normals: NormalCurvatureState;
  optics: OpticalRigState;
  dynamics: SecondaryDynamicsState;
  material: {
    roughness: number;
    clearcoat: number;
    pearl_intensity: number;
  };
};

function cloneState(state: GasperMultiDomainState): GasperMultiDomainState {
  return {
    macro: { ...state.macro },
    face: { ...state.face },
    singularity: { ...state.singularity },
    relief: {
      ...state.relief,
      samples: new Float32Array(state.relief.samples),
    },
    energy: { ...state.energy },
    skin: { ...state.skin },
    texture: { ...state.texture },
    normals: { ...state.normals },
    optics: { ...state.optics },
    dynamics: { ...state.dynamics },
    material: { ...state.material },
  };
}

export function createDefaultDomainState(): GasperMultiDomainState {
  const w = GASPER_TOPOLOGY.adaptiveRelief.width;
  const h = GASPER_TOPOLOGY.adaptiveRelief.height;
  const n = Math.min(w * h, GASPER_TOPOLOGY.adaptiveRelief.maxSamples);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    samples[i] = Math.sin(i * 0.17) * 0.08;
  }
  return {
    macro: {
      overall_width: 1,
      overall_height: 1,
      crown_height: 0,
      lower_body_fullness: 1,
      ground_flattening: 0,
      asym: 0, // V2.4 / D-0016 §6d
      body_lean: 0,
      posture_x: 0,
      posture_y: 0,
    },
    face: {
      face_scale: 1,
      eye_openness: 0.55,
      eye_spacing: 0,
      gaze: 0,
      mouth_openness: 0.35,
      mouth_width: 1,
      corner_pull_l: 0,
      corner_pull_r: 0,
    },
    singularity: {
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
    },
    relief: {
      width: w,
      height: h,
      maxSamples: GASPER_TOPOLOGY.adaptiveRelief.maxSamples,
      samples,
      amplitude: 0.45,
      motionCoupling: 0.55,
      energyCoupling: 0.4,
      phase: 0,
      animated: true,
      decorativeOnly: false,
      movementBearing: true,
    },
    energy: {
      level: 0.55,
      target: 0.55,
      pulse: 0.2,
      lag: 0.35,
      occlusion: 0.15,
      laggedLevel: 0.55,
      pulsePhase: 0,
    },
    skin: { tension: 0.4, damping: 0.5, coupling: 0.45 },
    texture: { amount: 0.4, scale: 1 },
    normals: { normalStrength: 0.55, curvatureResponse: 0.45 },
    optics: {
      keyIntensity: 0.6,
      keyDirection: 0,
      rim: 0.45,
      pearl: 0.55,
      faceEmissive: 0.35,
      absorption: 0.2,
      internalGlow: 0.5,
    },
    dynamics: {
      inertia: 0.35,
      secondaryLag: 0.4,
      rebound: 0.3,
      settling: 0.5,
      residual: 0,
    },
    material: {
      roughness: 0.14,
      clearcoat: 0.4,
      pearl_intensity: 0.55,
    },
  };
}

export function flattenDomainBindings(
  state: GasperMultiDomainState,
): DomainScalarMap {
  return {
    overall_width: state.macro.overall_width,
    overall_height: state.macro.overall_height,
    crown_height: state.macro.crown_height,
    lower_body_fullness: state.macro.lower_body_fullness,
    ground_flattening: state.macro.ground_flattening,
    asym: state.macro.asym ?? 0, // V2.4 / D-0016 §6d
    body_lean: state.macro.body_lean ?? 0,
    posture_x: state.macro.posture_x ?? 0,
    posture_y: state.macro.posture_y ?? 0,
    face_scale: state.face.face_scale,
    eye_openness: state.face.eye_openness,
    eye_spacing: state.face.eye_spacing,
    gaze: state.face.gaze,
    mouth_openness: state.face.mouth_openness,
    mouth_width: state.face.mouth_width,
    corner_pull_l: state.face.corner_pull_l,
    corner_pull_r: state.face.corner_pull_r,
    ...state.singularity,
    relief_amplitude: state.relief.amplitude,
    relief_motion_coupling: state.relief.motionCoupling,
    relief_energy_coupling: state.relief.energyCoupling,
    energy_level: state.energy.level,
    energy_pulse: state.energy.pulse,
    energy_lag: state.energy.lag,
    energy_occlusion: state.energy.occlusion,
    skin_tension: state.skin.tension,
    skin_damping: state.skin.damping,
    skin_coupling: state.skin.coupling,
    texture_amount: state.texture.amount,
    texture_scale: state.texture.scale,
    normal_strength: state.normals.normalStrength,
    curvature_response: state.normals.curvatureResponse,
    key_intensity: state.optics.keyIntensity,
    key_direction: state.optics.keyDirection,
    rim: state.optics.rim,
    pearl_intensity: state.material.pearl_intensity,
    internal_glow: state.optics.internalGlow,
    face_emissive: state.optics.faceEmissive,
    absorption: state.optics.absorption,
    roughness: state.material.roughness,
    clearcoat: state.material.clearcoat,
    inertia: state.dynamics.inertia,
    secondary_lag: state.dynamics.secondaryLag,
    rebound: state.dynamics.rebound,
    settling: state.dynamics.settling,
  };
}

export function applyBindingToDomains(
  state: GasperMultiDomainState,
  id: string,
  value: number,
): GasperMultiDomainState {
  const next = cloneState(state);

  if (id in next.macro) {
    (next.macro as Record<string, number>)[id] = value;
  }
  if (id in next.face) {
    (next.face as Record<string, number>)[id] = value;
  }
  if (id in next.singularity) {
    (next.singularity as Record<string, number>)[id] = value;
  }

  switch (id) {
    case "relief_amplitude":
      next.relief.amplitude = value;
      break;
    case "relief_motion_coupling":
      next.relief.motionCoupling = value;
      break;
    case "relief_energy_coupling":
      next.relief.energyCoupling = value;
      break;
    case "energy_level":
      next.energy.target = value;
      next.energy.level = value;
      break;
    case "energy_pulse":
      next.energy.pulse = value;
      break;
    case "energy_lag":
      next.energy.lag = value;
      break;
    case "energy_occlusion":
      next.energy.occlusion = value;
      break;
    case "skin_tension":
      next.skin.tension = value;
      break;
    case "skin_damping":
      next.skin.damping = value;
      break;
    case "skin_coupling":
      next.skin.coupling = value;
      break;
    case "texture_amount":
      next.texture.amount = value;
      break;
    case "texture_scale":
      next.texture.scale = value;
      break;
    case "normal_strength":
      next.normals.normalStrength = value;
      break;
    case "curvature_response":
      next.normals.curvatureResponse = value;
      break;
    case "key_intensity":
      next.optics.keyIntensity = value;
      break;
    case "key_direction":
      next.optics.keyDirection = value;
      break;
    case "rim":
      next.optics.rim = value;
      break;
    case "pearl_intensity":
      next.material.pearl_intensity = value;
      next.optics.pearl = value;
      break;
    case "internal_glow":
      next.optics.internalGlow = value;
      break;
    case "face_emissive":
      next.optics.faceEmissive = value;
      break;
    case "absorption":
      next.optics.absorption = value;
      break;
    case "roughness":
      next.material.roughness = value;
      break;
    case "clearcoat":
      next.material.clearcoat = value;
      break;
    case "inertia":
      next.dynamics.inertia = value;
      break;
    case "secondary_lag":
      next.dynamics.secondaryLag = value;
      break;
    case "rebound":
      next.dynamics.rebound = value;
      break;
    case "settling":
      next.dynamics.settling = value;
      break;
    default:
      break;
  }
  return next;
}

/** Wave R1 dirty-domain ids (scheduler + flush mask). */
export type DirtyDomainId =
  | "face"
  | "gaze"
  | "macro"
  | "singularity"
  | "relief"
  | "energy"
  | "skin"
  | "texture"
  | "normals"
  | "material"
  | "optics"
  | "dynamics"
  | "camera";

export const ALL_DIRTY_DOMAINS: readonly DirtyDomainId[] = [
  "face",
  "gaze",
  "macro",
  "singularity",
  "relief",
  "energy",
  "skin",
  "texture",
  "normals",
  "material",
  "optics",
  "dynamics",
  "camera",
] as const;

/** Map a binding id → dirty domains that must re-render. */
export function dirtyDomainsFromBinding(id: string): DirtyDomainId[] {
  if (
    id === "eye_openness" ||
    id === "eye_spacing" ||
    id === "mouth_openness" ||
    id === "mouth_width" ||
    id === "face_scale" ||
    id === "corner_pull_l" ||
    id === "corner_pull_r"
  ) {
    return ["face"];
  }
  if (id === "gaze") return ["gaze", "face"];
  if (
    id === "overall_width" ||
    id === "overall_height" ||
    id === "crown_height" ||
    id === "lower_body_fullness" ||
    id === "ground_flattening" ||
    id === "asym" || // V2.4 / D-0016 §6d
    id === "body_lean" ||
    id === "posture_x" ||
    id === "posture_y"
  ) {
    return ["macro"];
  }
  if (id.startsWith("relief_")) return ["relief"];
  if (id.startsWith("energy_")) return ["energy"];
  if (id.startsWith("skin_")) return ["skin"];
  if (id.startsWith("texture_")) return ["texture"];
  if (id === "normal_strength" || id === "curvature_response") {
    return ["normals"];
  }
  if (id === "roughness" || id === "clearcoat") return ["material", "normals"];
  if (
    id === "key_intensity" ||
    id === "key_direction" ||
    id === "rim" ||
    id === "internal_glow" ||
    id === "face_emissive" ||
    id === "absorption" ||
    id === "pearl_intensity"
  ) {
    return id === "pearl_intensity"
      ? ["material", "optics", "energy"]
      : ["optics"];
  }
  if (
    id === "inertia" ||
    id === "secondary_lag" ||
    id === "rebound" ||
    id === "settling"
  ) {
    return ["dynamics", "macro"];
  }
  if (
    id.startsWith("singularity_") ||
    id.startsWith("horizon_") ||
    id.startsWith("orbital_") ||
    id === "shell_thickness" ||
    id === "center_void" ||
    id === "lens_compression" ||
    id === "gravity_well_depth" ||
    id === "spectral_energy_envelope" ||
    id === "center_of_mass_y"
  ) {
    return ["singularity", "macro", "energy"];
  }
  return ["macro"];
}

export type TickDomainOptions = {
  updateRelief?: boolean;
  updateEnergy?: boolean;
  updateDynamics?: boolean;
  updateOptics?: boolean;
  inPlace?: boolean;
};

/**
 * Advance movement-bearing fields (relief samples + energy lag).
 * Does not rewrite silhouette topology.
 * Wave R1: selective sub-ticks via options (blink must not force full relief).
 */
export function tickDomainFields(
  state: GasperMultiDomainState,
  dtSec: number,
  motionStrength = 0.45,
  options: TickDomainOptions = {},
): GasperMultiDomainState {
  const updateEnergy = options.updateEnergy !== false;
  const updateDynamics = options.updateDynamics !== false;
  const updateRelief = options.updateRelief !== false;
  const updateOptics = options.updateOptics !== false;
  const next = options.inPlace ? state : cloneState(state);

  if (updateEnergy) {
    const lagK =
      1 - Math.exp(-dtSec / Math.max(0.05, next.energy.lag * 0.8 + 0.1));
    next.energy.laggedLevel +=
      (next.energy.target - next.energy.laggedLevel) * lagK;
    next.energy.pulsePhase += dtSec * (0.8 + next.energy.pulse * 2.5);
    const pulse = Math.sin(next.energy.pulsePhase) * next.energy.pulse * 0.12;
    next.energy.level = Math.min(
      1,
      Math.max(0, next.energy.laggedLevel + pulse),
    );
  }

  if (updateDynamics) {
    const settle = 1 - Math.exp(-dtSec * (0.5 + next.dynamics.settling));
    next.dynamics.residual *= 1 - settle * (0.35 + next.skin.damping * 0.4);
    next.dynamics.residual +=
      (next.macro.overall_width - 1) * next.dynamics.inertia * 0.02;
    next.dynamics.residual +=
      -next.dynamics.residual * next.dynamics.rebound * dtSec * 2;
  }

  if (updateRelief) {
    next.relief.phase +=
      dtSec * (1.2 + motionStrength * next.relief.motionCoupling);
    const amp =
      next.relief.amplitude *
      (0.55 + next.energy.level * next.relief.energyCoupling);
    const { width, height, samples } = next.relief;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (i >= samples.length) continue;
        const u = x / Math.max(1, width - 1);
        const v = y / Math.max(1, height - 1);
        const wave =
          Math.sin(u * 9.1 + next.relief.phase) *
            Math.cos(v * 7.3 - next.relief.phase * 0.7) +
          Math.sin((u + v) * 5.5 + next.energy.pulsePhase) * 0.35;
        samples[i] =
          wave * amp * 0.5 +
          next.dynamics.residual * 0.15 * Math.sin(u * 3 + v * 4);
      }
    }
  }

  if (updateOptics && updateEnergy) {
    next.optics.internalGlow =
      next.optics.internalGlow * 0.65 + next.energy.level * 0.35;
  }

  return next;
}

/**
 * Mutating binding apply for the render hot path (no per-key clone).
 */
export function applyBindingToDomainsInPlace(
  state: GasperMultiDomainState,
  id: string,
  value: number,
): GasperMultiDomainState {
  if (id in state.macro) {
    (state.macro as Record<string, number>)[id] = value;
    return state;
  }
  if (id in state.face) {
    (state.face as Record<string, number>)[id] = value;
    return state;
  }
  if (id in state.singularity) {
    (state.singularity as Record<string, number>)[id] = value;
    return state;
  }
  switch (id) {
    case "relief_amplitude":
      state.relief.amplitude = value;
      break;
    case "relief_motion_coupling":
      state.relief.motionCoupling = value;
      break;
    case "relief_energy_coupling":
      state.relief.energyCoupling = value;
      break;
    case "energy_level":
      state.energy.target = value;
      state.energy.level = value;
      break;
    case "energy_pulse":
      state.energy.pulse = value;
      break;
    case "energy_lag":
      state.energy.lag = value;
      break;
    case "energy_occlusion":
      state.energy.occlusion = value;
      break;
    case "skin_tension":
      state.skin.tension = value;
      break;
    case "skin_damping":
      state.skin.damping = value;
      break;
    case "skin_coupling":
      state.skin.coupling = value;
      break;
    case "texture_amount":
      state.texture.amount = value;
      break;
    case "texture_scale":
      state.texture.scale = value;
      break;
    case "normal_strength":
      state.normals.normalStrength = value;
      break;
    case "curvature_response":
      state.normals.curvatureResponse = value;
      break;
    case "key_intensity":
      state.optics.keyIntensity = value;
      break;
    case "key_direction":
      state.optics.keyDirection = value;
      break;
    case "rim":
      state.optics.rim = value;
      break;
    case "pearl_intensity":
      state.material.pearl_intensity = value;
      state.optics.pearl = value;
      break;
    case "internal_glow":
      state.optics.internalGlow = value;
      break;
    case "face_emissive":
      state.optics.faceEmissive = value;
      break;
    case "absorption":
      state.optics.absorption = value;
      break;
    case "roughness":
      state.material.roughness = value;
      break;
    case "clearcoat":
      state.material.clearcoat = value;
      break;
    case "inertia":
      state.dynamics.inertia = value;
      break;
    case "secondary_lag":
      state.dynamics.secondaryLag = value;
      break;
    case "rebound":
      state.dynamics.rebound = value;
      break;
    case "settling":
      state.dynamics.settling = value;
      break;
    default:
      break;
  }
  return state;
}

/** Spatial internal-energy volume metrics (not single opacity / typeof checks). */
export type EnergyVolumeMetrics = {
  /** Spatial scale applied to volume shells (host transform units). */
  spatialScale: number;
  /** Volume opacity from level × occlusion × void. */
  volumeOpacity: number;
  /** |target - laggedLevel| — visible lag residual. */
  lagDelta: number;
  laggedLevel: number;
  level: number;
  target: number;
  pulsePhase: number;
  /** Optical coupling from energy tick. */
  opticalGlow: number;
  /** True when volume was written to SVG layers this flush. */
  svgVolumeWritten: boolean;
};

export type DomainFlushReport = {
  domainsTouched: MorphologyDomainId[];
  contourOnly: boolean;
  reliefAnimated: boolean;
  energyHasVolumeState: boolean;
  reliefSampleRms: number;
  energyVolume: EnergyVolumeMetrics | null;
  dirtyDomainsFlushed?: DirtyDomainId[];
  opticalMode?: OpticalMode;
  usedNodeCache?: boolean;
  domainsSkipped?: DirtyDomainId[];
};

/** Authoring Neutral (low-cost) vs Runtime Beauty (full optics). */
export type OpticalMode = "authoring-neutral" | "runtime-beauty";
