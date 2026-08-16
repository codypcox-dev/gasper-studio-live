/**
 * Shared Gasper character contract — coherent one-body identity across states.
 * Pure data contracts; no DOM/GSAP/HQ dependency.
 * Fence-local: packages/shared/src/gasper/character (not root gasper index).
 */

/** Scalar channel map (binding id → value). */
export type CharacterChannelMap = Record<string, number>;

/**
 * Canonical eight-state visual ids (+ wake transitional).
 * Prefer production EightStateId values already shipped in the repo.
 */
export type EightStateVisualId =
  | "presence-neutral-settled"
  | "presence-listening-receive"
  | "presence-thinking-knit"
  | "presence-recognition-spark"
  | "comet-executing-drive"
  | "presence-blocked-strain"
  | "presence-pleased-resolve"
  | "dormant-orbit-maintain"
  | "wake";

/** Hold states (wake is transitional only). */
export type EightStateHoldVisualId = Exclude<EightStateVisualId, "wake">;

/** Character layers with exclusive ownership roles. */
export type CharacterLayer = "shell" | "energy" | "face" | "motion";

/** Who owns a channel under the character body model. */
export type LayerOwner = CharacterLayer;

/** Silhouette proportions for the dark-pearl shell. */
export type SilhouetteSpec = {
  /** Nominal overall_width at rest identity. */
  widthHome: number;
  /** Nominal overall_height at rest identity. */
  heightHome: number;
  /** Max |Δ| from home width across any state. */
  maxWidthDelta: number;
  /** Max |Δ| from home height across any state. */
  maxHeightDelta: number;
  /** Soft aspect ratio (width/height) band. */
  aspectMin: number;
  aspectMax: number;
  /** Crown height soft ceiling (identity proportion). */
  crownMax: number;
  /** Ground flattening soft ceiling. */
  groundFlattenMax: number;
};

/** Volume conservation rules for the shell. */
export type VolumeSpec = {
  /** Soft area band (width * height). */
  areaMin: number;
  areaMax: number;
  /** Quality-floor area band preserved by dormant (tighter). */
  floorAreaMin: number;
  floorAreaMax: number;
  /** Whether squash/stretch is allowed (bounded). */
  allowSquashStretch: boolean;
};

/** Center of mass home and travel bounds. */
export type CenterOfMassSpec = {
  /** Home CoM in normalized shell space (x right, y up). */
  homeX: number;
  homeY: number;
  /** Max radial travel from home across states. */
  maxTravel: number;
  /** Channel id that maps to vertical CoM when present. */
  channelY: "center_of_mass_y";
};

/** Facial attachment lattice — features lock to shell-relative anchors. */
export type FacialAttachmentSpec = {
  /** Anchor lattice source (facial package FEATURE_ANCHORS). */
  latticeId: "feature-anchors-v1";
  /** Max attachment residual before treating feature as floating. */
  maxAttachmentError: number;
  /** Eyes/mouth/energy must remain attached (never free overlay). */
  requiredAnchors: readonly string[];
  /** Face is shell-relative; never independent transform. */
  attachedNotFloating: true;
};

/** Shell > energy hierarchy: energy never owns contour mass. */
export type ShellEnergyHierarchy = {
  shellOwnsContour: true;
  energyOwnsInternalGlow: true;
  energyNeverOwnsContour: true;
  faceOwnsAttachedFeatures: true;
  motionOwnsDynamicsOnly: true;
  /** Contour channels shell exclusively owns. */
  contourChannels: readonly string[];
  /** Internal energy channels energy exclusively owns. */
  energyChannels: readonly string[];
};

/** Material identity for pearl shell + cyan-violet energy. */
export type MaterialSpec = {
  shell: "dark-pearl";
  energy: "cyan-violet";
  pearlIntensityHome: number;
  pearlIntensityMin: number;
  pearlIntensityMax: number;
  roughnessHome: number;
  clearcoatHome: number;
  absorptionHome: number;
};

/** Palette identity (bounded mods only). */
export type PaletteSpec = {
  shellPrimary: "dark-pearl-neutral";
  energyPrimary: "cyan";
  energySecondary: "violet";
  rimHome: number;
  keyIntensityHome: number;
  internalGlowHome: number;
  faceEmissiveHome: number;
  /** Max |Δ| palette channels may travel from home. */
  maxPaletteDelta: number;
};

/** Personality baseline — Neutral encodes this explicitly. */
export type PersonalitySpec = {
  friendly: number;
  intelligent: number;
  slightlyUpToSomething: number;
  /** Human-readable summary for Neutral. */
  baselineRead: string;
};

/** Full character invariant bundle. */
export type CharacterInvariant = {
  id: "gasper-character-v1";
  silhouette: SilhouetteSpec;
  volume: VolumeSpec;
  centerOfMass: CenterOfMassSpec;
  facialAttachment: FacialAttachmentSpec;
  shellEnergyHierarchy: ShellEnergyHierarchy;
  material: MaterialSpec;
  palette: PaletteSpec;
  personality: PersonalitySpec;
  /** Dormant Maintain is the minimum quality floor. */
  qualityFloorStateId: "dormant-orbit-maintain";
};

/** Unique multi-domain visual signature channels for a state. */
export type VisualSignature = {
  /** Compact feature vector labels for legibility. */
  domains: readonly ("face" | "shell" | "energy" | "motion")[];
  /** Primary readable intent cue (not an icon). */
  primaryCue: string;
  /** Secondary co-modulation cue. */
  secondaryCue: string;
  /** Signature channel keys used for pairwise distinctness. */
  signatureChannels: readonly string[];
};

/** Layer activation strengths (0–1) per character layer. */
export type LayerActivations = {
  shell: number;
  energy: number;
  face: number;
  motion: number;
};

/** Bounded silhouette delta from identity home. */
export type SilhouetteDelta = {
  width: number;
  height: number;
  crown: number;
  ground: number;
};

/** Volume policy for a state relative to identity. */
export type VolumePolicy = {
  conserve: boolean;
  areaTarget: number;
  squashStretch: number;
};

/** Center of mass for a state (bounded travel). */
export type StateCenterOfMass = {
  x: number;
  y: number;
};

/** Facial attachment state — always lattice-attached. */
export type StateFacialAttachment = {
  attached: true;
  latticeId: "feature-anchors-v1";
  faceScale: number;
  eyeOpenness: number;
  mouthOpenness: number;
  residualBudget: number;
};

/** Bounded material mods from identity home. */
export type MaterialMods = {
  pearlIntensity: number;
  roughness: number;
  clearcoat: number;
  absorption: number;
};

/** Bounded palette mods from identity home. */
export type PaletteMods = {
  rim: number;
  keyIntensity: number;
  internalGlow: number;
  faceEmissive: number;
};

/** Personality read for a state (Neutral must encode baseline). */
export type PersonalityRead = {
  friendly: number;
  intelligent: number;
  slightlyUpToSomething: number;
  valence: number;
  arousal: number;
  summary: string;
};

/**
 * Complete character state profile.
 * Incomplete profiles REJECT at validation.
 */
export type CharacterStateProfile = {
  stateId: EightStateVisualId;
  label: string;
  semanticIntent: string;
  personalityRead: PersonalityRead;
  visualSignature: VisualSignature;
  /** Full multi-domain channel map — face + shell + energy + motion. */
  channels: CharacterChannelMap;
  layerActivations: LayerActivations;
  silhouetteDelta: SilhouetteDelta;
  volumePolicy: VolumePolicy;
  centerOfMass: StateCenterOfMass;
  facialAttachment: StateFacialAttachment;
  materialMods: MaterialMods;
  paletteMods: PaletteMods;
  /** Quality floor benchmark — always dormant-orbit-maintain. */
  qualityFloorRef: "dormant-orbit-maintain";
  /** Embodiment affinity (presence / comet / dormant-orbit). */
  embodimentId: string;
  /** Expression affinity kernel id (soft; channels authoritative). */
  expressionAffinity: string;
  /** Transitional hold flag (wake only). */
  transitional?: boolean;
};

/** Structured validation failure. */
export type CharacterValidationFailure = {
  code:
    | "incomplete_profile"
    | "disconnected_layer_ownership"
    | "illegible_semantics"
    | "identity_drift"
    | "theatrical_overlay"
    | "floating_attachment"
    | "quality_floor_violation"
    | "unknown_state";
  stateId?: EightStateVisualId | string;
  message: string;
  details?: Record<string, unknown>;
};

export type CharacterValidationResult = {
  ok: boolean;
  failures: CharacterValidationFailure[];
};

/** Identity fingerprint for drift measurement. */
export type IdentityFingerprint = {
  silhouette: { width: number; height: number; aspect: number };
  volume: number;
  centerOfMass: { x: number; y: number };
  material: { pearl: number; roughness: number; clearcoat: number };
  palette: { rim: number; glow: number; emissive: number };
  attachment: { faceScale: number; residualBudget: number };
};

/** Identity drift report between two states / vs invariants. */
export type IdentityDriftReport = {
  ok: boolean;
  from: string;
  to: string;
  silhouetteDrift: number;
  volumeDrift: number;
  comDrift: number;
  materialDrift: number;
  paletteDrift: number;
  maxAllowed: {
    silhouette: number;
    volume: number;
    com: number;
    material: number;
    palette: number;
  };
  violations: string[];
};
