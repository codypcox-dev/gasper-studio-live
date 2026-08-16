/**
 * Volume-preserving bidirectional embodiment morphology types.
 * Pure data contracts — no GSAP/DOM/MCP ownership.
 *
 * Five named embodiments form one character under continuous transforms:
 * Presence, Singularity, Comet, Dormant Maintain, Wake.
 */

/** Canonical embodiment ids for morphology law (not eight-state micro-ids). */
export type EmbodimentId =
  | "presence"
  | "singularity"
  | "comet"
  | "dormant-maintain"
  | "wake";

/**
 * Authored profile ids projected through the five-body morphology law.
 * Profile projection owns the authored silhouette; morphology owns continuity
 * and exclusive topology authority.
 */
export type MorphologyProfileId =
  | "presence"
  | "singularity"
  | "dormant-orbit"
  | "low-orbit"
  | "comet"
  | "wispwalker"
  | "halo"
  | "lantern";

export type MorphologyProfileCompatibilityMode =
  | "native"
  | "dormant-adapted"
  | "ground-adapted";

/** Exclusive topology / layer roles — exactly one owner per contested layer per frame. */
export type MorphologyLayer =
  | "shell"
  | "face"
  | "eyes"
  | "mouth"
  | "energy"
  | "accretion"
  | "wake_tail"
  | "orbit"
  | "contour";

/** Who may author a layer this frame. */
export type MorphologyLayerOwner =
  | "presence_body"
  | "singularity_well"
  | "comet_drive"
  | "dormant_orbit"
  | "wake_restore"
  | "transition_blend"
  | "hold_last_good"
  | "none";

/**
 * Ordered feature lifecycle during embodiment transition.
 * dissolve → migrate → reconstitute is the only legal order.
 */
export type FeaturePhase = "hold" | "dissolve" | "migrate" | "reconstitute";

/** Named intermediate morphology states along a route. */
export type IntermediateMorphologyState =
  | "presence_hold"
  | "shell_compress"
  | "face_dissolve"
  | "energy_inward"
  | "horizon_form"
  | "singularity_hold"
  | "mass_forward"
  | "face_migrate"
  | "wake_attach"
  | "comet_hold"
  | "energy_settle"
  | "face_reduce"
  | "orbit_form"
  | "dormant_hold"
  | "energy_restore"
  | "face_reconstitute"
  | "wake_rise"
  | "wake_hold"
  | "blend_passthrough";

/** Scalar channel map used by morphology evaluation. */
export type MorphologyChannelMap = Record<string, number>;

/** Per-layer exclusive ownership snapshot. */
export type LayerOwnershipMap = Record<MorphologyLayer, MorphologyLayerOwner>;

/** Feature dissolve / migrate / reconstitute weights (sum ≤ 1 per feature). */
export type FeatureLifecycle = {
  eyes: { phase: FeaturePhase; dissolve: number; migrate: number; reconstitute: number };
  mouth: { phase: FeaturePhase; dissolve: number; migrate: number; reconstitute: number };
  face: { phase: FeaturePhase; dissolve: number; migrate: number; reconstitute: number };
};

/** Energy transfer state between embodiments. */
export type EnergyTransfer = {
  /** Conserved total energy budget (level + pulse contribution). */
  total: number;
  /** Fraction of energy residing in shell/body. */
  shellShare: number;
  /** Fraction in well / accretion / orbit specialty. */
  specialtyShare: number;
  /** Fraction in facial emissive. */
  faceShare: number;
};

/** Center-of-mass in body-local unit space. */
export type CenterOfMass = {
  x: number;
  y: number;
};

/** Chirality-aware motion bias (left/right semantic, not anatomical mimicry). */
export type ChiralityMotion = {
  /** −1 withdraw … +1 approach. */
  approachWithdraw: number;
  /** Signed lateral bias (−1 left … +1 right). */
  lateral: number;
  /** Handedness of comet wake / orbit spin: -1 | 0 | 1. */
  spinSign: -1 | 0 | 1;
};

/**
 * Single evaluated morphology frame — volume-preserving, single-authority.
 * This is the pure law output consumed by continuity + LivingRuntime.
 */
export type MorphologyFrame = {
  /** Route progress after easing, clamped [0,1]. */
  progress: number;
  /** Source embodiment. */
  from: EmbodimentId;
  /** Target embodiment. */
  to: EmbodimentId;
  /** Active named intermediate state. */
  intermediateState: IntermediateMorphologyState;
  /** Domain scalar channels after volume conservation. */
  channels: MorphologyChannelMap;
  /** Exclusive layer ownership (no dual-authority contour/face). */
  ownership: LayerOwnershipMap;
  /** Feature lifecycle phases. */
  features: FeatureLifecycle;
  /** Energy transfer bookkeeping. */
  energy: EnergyTransfer;
  /** Center of mass (must be continuous along route). */
  com: CenterOfMass;
  /** Chirality-aware motion. */
  chirality: ChiralityMotion;
  /** Macro silhouette volume proxy (width × height × fullness). */
  volume: number;
  /** True when frame is on the reverse (return) route evaluation. */
  reverse: boolean;
  /**
   * Specialty geometry mix without face-piercing needles:
   * singularity well, comet wake, dormant orbit — mutually exclusive intensity.
   */
  specialty: {
    singularityMix: number;
    /** Axial needle risk metric (must stay ~0 under law). */
    axialNeedle: number;
    /** Transparent ghost anatomy metric (must stay ~0). */
    ghostAnatomy: number;
    cometMix: number;
    /** Horizontal shear residual (must stay low). */
    horizontalShear: number;
    dormantMix: number;
    wakeMix: number;
    /** Dual silhouette authority residual (must stay ~0). */
    dualSilhouette: number;
  };
};

/** Route definition: ordered named intermediate states with progress gates. */
export type MorphologyRoute = {
  from: EmbodimentId;
  to: EmbodimentId;
  intermediates: readonly {
    state: IntermediateMorphologyState;
    /** Inclusive start of progress window [0,1]. */
    start: number;
    /** Exclusive end (last may use 1.0 inclusive). */
    end: number;
  }[];
};

/** Explicit profile-to-law route; never an implicit profile-only fallback. */
export type MorphologyProfileRoute = {
  profileFrom: MorphologyProfileId;
  profileTo: MorphologyProfileId;
  morphologyFrom: EmbodimentId;
  morphologyTo: EmbodimentId;
  compatibility: MorphologyProfileCompatibilityMode;
  route: MorphologyRoute;
};

/** Options for evaluating a morphology frame along a route. */
export type EvaluateMorphologyOptions = {
  from: EmbodimentId;
  to: EmbodimentId;
  /** Raw progress in [0,1]. */
  progress: number;
  /** Optional base channels (defaults to embodiment rest poses). */
  fromChannels?: MorphologyChannelMap;
  toChannels?: MorphologyChannelMap;
  /** When true, evaluate as return route (progress still 0→1 toward `to`). */
  reverse?: boolean;
  /** Chirality seed bias (−1..1). */
  chiralityBias?: number;
  /** Interrupt mid-route: clamp velocity vs previous frame. */
  previous?: MorphologyFrame | null;
  /** Fixed dt for interrupt-safe step (default 1/60). */
  dt?: number;
  /** Max channel velocity for interrupt safety. */
  maxVelocity?: number;
};

/** Defect class names rejected by frame-dense embodiment tests. */
export type EmbodimentDefectClass =
  | "duplicate_contour_authority"
  | "topology_ghosting"
  | "volume_collapse"
  | "feature_piercing"
  | "teleporting"
  | "derivative_spike"
  | "horizontal_shearing"
  | "stale_duplicate_silhouette"
  | "snap_reconstruction"
  | "dragged_facial_features"
  | "transparent_ghost_anatomy"
  | "axial_needle";

export type EmbodimentDefectFinding = {
  defect: EmbodimentDefectClass;
  frameIndex: number;
  severity: "P0" | "P1";
  detail: string;
  value?: number;
  threshold?: number;
};
