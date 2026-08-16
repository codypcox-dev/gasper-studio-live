/**
 * Temporal continuity types for Gasper living motion frame-sequence analysis.
 * Pure data — no React/DOM/MCP. GSAP remains frame authority; this layer records,
 * measures, and applies policy without stealing tick ownership.
 */

/** Scalar channel map (binding id → value). */
export type ContinuityChannelMap = Record<string, number>;

/** Contested ownership roles that may write a channel in a single frame. */
export type ContinuityOwner =
  | "base_form"
  | "state_target"
  | "blink"
  | "saccade"
  | "breath"
  | "wobble"
  | "interrupt_blend"
  | "hold_last_good"
  | "none";

/** Topology observables that must remain stable across frames (no rewrite). */
export type TopologySnapshot = {
  contourSamples: number;
  structuralNodes: number;
  structuralTriangles: number;
  topologyStable: boolean;
};

/** Contour silhouette proxies derived from domain scalars. */
export type ContourSnapshot = {
  overall_height: number;
  overall_width: number;
  crown_height: number;
  ground_flattening: number;
  lower_body_fullness: number;
};

/** Single captured frame on the living continuity path. */
export type ContinuityFrame = {
  /** Frame index (0-based, ordered). */
  index: number;
  /** Absolute time seconds (fixed-dt when proofMode). */
  t: number;
  /** Domain scalar channels at this frame. */
  channels: ContinuityChannelMap;
  /** Per-channel ownership (anti-flicker). */
  ownership: Record<string, ContinuityOwner>;
  /** Topology lock snapshot. */
  topology: TopologySnapshot;
  /** Contour silhouette snapshot. */
  contour: ContourSnapshot;
  /** Transition metadata when mid-transition. */
  transition?: {
    from: string;
    to: string;
    progress: number;
    phase: "hold" | "transition" | "interrupted" | "idle";
  };
  /** True when this frame is immediately after an interrupt retarget. */
  interruptEdge?: boolean;
};

/** Finite-difference series for one channel. */
export type ChannelDerivativeSeries = {
  channel: string;
  position: number[];
  velocity: number[];
  acceleration: number[];
  jerk: number[];
};

/** Grouped multi-frame series used by structural + CLI analysis. */
export type FrameSequenceSeries = {
  seed: number;
  dt: number;
  frameCount: number;
  times: number[];
  /** Position series for primary motion channels. */
  position: Record<string, number[]>;
  velocity: Record<string, number[]>;
  acceleration: Record<string, number[]>;
  jerk: Record<string, number[]>;
  eyes: Record<string, number[]>;
  mouth: Record<string, number[]>;
  contour: Record<string, number[]>;
  topology: {
    contourSamples: number[];
    structuralNodes: number[];
    structuralTriangles: number[];
    topologyStable: boolean[];
  };
  ownership: Record<string, ContinuityOwner[]>;
  interruptEdges: boolean[];
};

/** Discontinuity flags for one channel group. */
export type DiscontinuityFlags = {
  eye: boolean;
  mouth: boolean;
  contour: boolean;
  topology: boolean;
  transition: boolean;
  ownershipFlicker: boolean;
  snapTeleport: boolean;
};

/** Thresholds for discontinuity scoring (slice defaults). */
export type ContinuityThresholds = {
  /** Max |Δposition| on any channel at interrupt edge (no teleport). */
  maxImmediateDelta: number;
  /** Max |velocity| after finite difference. */
  maxVelocity: number;
  /** Max |acceleration|. */
  maxAcceleration: number;
  /** Max |jerk|. */
  maxJerk: number;
  /** Max eye channel jump without blink ownership. */
  maxEyeDelta: number;
  /** Max mouth channel jump. */
  maxMouthDelta: number;
  /** Max contour (silhouette) channel jump. */
  maxContourDelta: number;
  /** Ownership may change at most this many times between non-interrupt frames. */
  maxOwnershipFlipsPerChannel: number;
  /** Numeric equality tolerance for deterministic rerun compare. */
  seriesEqualityEps: number;
};

export const DEFAULT_CONTINUITY_THRESHOLDS: ContinuityThresholds = {
  /** Single-frame teleport ceiling (unit-scale channels). */
  maxImmediateDelta: 0.55,
  /** Domain scalars ~[0,1] at 60fps; allow energetic but non-teleport motion. */
  maxVelocity: 28,
  maxAcceleration: 560,
  /** FD jerk at 60fps after v/a projection; boundStepMap clamps toward this. */
  maxJerk: 28000,
  /** Slightly above max single-frame boundStep (0.9*maxV/60) so measured steps stay clean. */
  maxEyeDelta: 0.45,
  maxMouthDelta: 0.45,
  maxContourDelta: 0.4,
  /** Max A→B→A oscillations per contested channel (true flicker), not total flips. */
  maxOwnershipFlipsPerChannel: 2,
  seriesEqualityEps: 1e-9,
};

/** Full analysis report for a captured sequence. */
export type FrameSequenceAnalysis = {
  schema: "gasper.temporal.frame-sequence-analysis.v1";
  seed: number;
  dt: number;
  frameCount: number;
  series: FrameSequenceSeries;
  discontinuities: DiscontinuityFlags;
  maxImmediateDelta: number;
  maxVelocity: number;
  maxAcceleration: number;
  maxJerk: number;
  boundedDerivatives: boolean;
  interruptSafe: boolean;
  antiFlickerOwnershipStable: boolean;
  deterministicScheduling: boolean;
  mcpFrameDriving: false;
  gsapFrameAuthority: true;
  thresholds: ContinuityThresholds;
  notes: string[];
};

/** Options for multi-frame capture on the living path. */
export type CaptureSequenceOptions = {
  seed: number;
  /** Fixed dt seconds (default 1/60). */
  dt?: number;
  /** Number of synthetic frames to sample. */
  frameCount?: number;
  /** When true, force interrupt mid-sequence. */
  forceInterrupt?: boolean;
  /** Proof mode (deterministic). */
  proofMode?: boolean;
};

/** Compare two analyses for deterministic equality within eps. */
export type SeriesEqualityResult = {
  equal: boolean;
  maxAbsDiff: number;
  firstMismatch: string | null;
};
