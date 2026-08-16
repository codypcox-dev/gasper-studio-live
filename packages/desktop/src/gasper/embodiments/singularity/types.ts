/**
 * Singularity embodiment geometry state (Lane R2).
 * Pure typed outputs for integrator → LegacyAuthority hooks.
 */

export type SingularityTransitionFrom =
  | "presence"
  | "singularity"
  | "dormant-orbit"
  | "comet"
  | "low-orbit"
  | "other";

export type SingularityGenerationInput = {
  /** 0 = fully presence, 1 = fully singularity. */
  mix: number;
  timeSeconds: number;
  energy: number;
  motion: number;
  seed: number;
  /** Interrupted mid-transition — hold geometry at mix. */
  interrupted?: boolean;
  from?: SingularityTransitionFrom;
  to?: SingularityTransitionFrom;
};

export type AccretionPlaneGeometry = {
  /** Ellipse center in unit body space (−1..1). */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotationRad: number;
  opacity: number;
  pathD: string;
  attached: boolean;
};

export type SingularityGeometryState = {
  centerVoid: number;
  eventHorizon: {
    radius: number;
    pulse: number;
    opacity: number;
    pathD: string;
  };
  backAccretion: AccretionPlaneGeometry;
  frontAccretion: AccretionPlaneGeometry;
  accretionGlow: number;
  gravityWellDepth: number;
  shellCompression: number;
  verticalCompression: number;
  spectralEnergy: number;
  horizonRadius: number;
  horizonPulse: number;
  orbitalPlaneOrientation: number;
  lensingIntensity: number;
  faceSuppressed: boolean;
  layerFlashRisk: false;
  hash: string;
  mix: number;
};
