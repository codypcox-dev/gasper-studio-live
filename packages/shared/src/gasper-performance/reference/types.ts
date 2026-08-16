/**
 * Additive contracts for reference-driven Gasper performance authoring.
 *
 * These artifacts describe evidence and goals. They never contain renderer
 * transforms, DOM instructions, or a second locomotion authority.
 */

export const EVIDENCE_CLASSES = [
  "measured",
  "derived",
  "inferred",
  "calibrated",
  "simulated",
  "accepted",
] as const;

export type EvidenceClass = (typeof EVIDENCE_CLASSES)[number];

export type EvidenceRef = Readonly<{
  kind: EvidenceClass;
  ref: string;
  confidence?: number;
}>;

export const MOTION_PRIMITIVE_IDS = [
  "plant",
  "release",
  "slide",
  "pivot",
  "support_exchange",
  "travel",
  "hold",
  "compress",
  "launch",
  "float",
  "recoil",
  "follow_through",
  "settle",
  "orient",
] as const;

export type MotionPrimitiveId = (typeof MOTION_PRIMITIVE_IDS)[number];

export type VideoSourceReceipt = Readonly<{
  schema: "gasper.video-source-receipt.v1";
  id: string;
  sourceKind: "local" | "direct_url" | "provider";
  /** Sanitized provenance reference. Secrets and signed query strings are forbidden. */
  sourceRef: string;
  contentHash: string;
  byteLength: number;
  media: Readonly<{
    durationMs: number;
    widthPx: number;
    heightPx: number;
    frameRateHz: number;
    container: string;
    videoCodec: string;
  }>;
  resolver: Readonly<{
    id: string;
    version: string;
  }>;
}>;

export type VideoAnalysisSelection = Readonly<{
  schema: "gasper.video-analysis-selection.v1";
  id: string;
  sourceContentHash: string;
  startMs: number;
  endMs: number;
  crop: Readonly<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  subjectId: string;
}>;

export type LandmarkObservation = Readonly<{
  index: number;
  x: number;
  y: number;
  z: number;
  visibility?: number;
  presence?: number;
}>;

export type PoseDetection = Readonly<{
  /** Stable within one analysis track; never inferred from array position. */
  subjectId: string;
  confidence: number;
  /** Canonical raw observation space used by mechanics inference. */
  imageLandmarks: readonly LandmarkObservation[];
  /** Optional model estimate. Camera-relative and never treated as metric truth. */
  worldLandmarks?: readonly LandmarkObservation[];
}>;

export type PoseObservationFrame = Readonly<{
  tMs: number;
  /** Empty means no subject was detected at this timestamp. */
  poses: readonly PoseDetection[];
}>;

export type PoseObservationTrack = Readonly<{
  schema: "gasper.pose-observation-track.v1";
  id: string;
  sourceContentHash: string;
  durationMs: number;
  sampleRateHz: number;
  landmarkModel: Readonly<{
    id: string;
    version: string;
    landmarkCount: number;
    semanticIndices: Readonly<{
      leftFoot: number;
      rightFoot: number;
      leftHip: number;
      rightHip: number;
    }>;
  }>;
  frames: readonly PoseObservationFrame[];
  provenance: Readonly<{
    analyzer: string;
    analyzerVersion: string;
  }>;
}>;

export type MotionQuality = Readonly<{
  weight: number;
  flow: number;
  energy: number;
  directness: number;
  /** Semantic qualities remain unknown until evidence or an accepted correction supplies them. */
  restraint: number | null;
  playfulness: number | null;
  urgency: number | null;
}>;

export type MotionTravelDirection =
  | "stationary"
  | "left"
  | "right"
  | "forward"
  | "backward"
  | "mixed"
  | "unknown";

export type MotionBeatRole =
  | "anticipation"
  | "commitment"
  | "release"
  | "follow_through"
  | "settle";

export type MotionAmbiguity = Readonly<{
  id: string;
  description: string;
  confidence: number;
  evidence: readonly EvidenceRef[];
}>;

export type MotionCorrection = Readonly<{
  id: string;
  description: string;
  evidence: readonly EvidenceRef[];
}>;

export type MotionScoreBeat = Readonly<{
  id: string;
  t0Ms: number;
  t1Ms: number;
  sourceFrameRange: Readonly<{ start: number; end: number }>;
  primitive: MotionPrimitiveId;
  purpose: string;
  travel: Readonly<{
    direction: MotionTravelDirection;
    normalizedDisplacement: Readonly<{ x: number; y: number }>;
    facing: Readonly<{ startDegrees: number | null; endDegrees: number | null }>;
    rootPath: readonly Readonly<{
      tMs: number;
      /** Lateral image-root displacement in initial subject heights. */
      x: number;
      /** Image-root descent in initial subject heights; positive is down. */
      y: number;
      confidence: number;
    }>[];
  }>;
  rhythm: Readonly<{
    cadenceHz: number | null;
    phase: "even" | "syncopated" | "sustained" | "unknown";
    accentTimesMs: readonly number[];
  }>;
  contact: Readonly<{
    requiredSupports: readonly string[];
    order: readonly string[];
  }>;
  motionQuality: MotionQuality;
  poseIntent: Readonly<{
    extremes: readonly string[];
    silhouette: string;
    lineOfAction: string;
  }>;
  roles: readonly MotionBeatRole[];
  recognitionCritical: readonly string[];
  confidence: number;
  evidence: readonly EvidenceRef[];
  ambiguities: readonly MotionAmbiguity[];
  corrections: readonly MotionCorrection[];
}>;

export type MotionScore = Readonly<{
  schema: "gasper.motion-score.v1";
  id: string;
  sourceObservationHash: string;
  durationMs: number;
  beats: readonly MotionScoreBeat[];
  provenance: Readonly<{
    compiler: string;
    compilerVersion: string;
    sourceRefs: readonly string[];
  }>;
}>;

export type QuantityAuthority = "environment" | "form" | "performance";
export type CalibrationStatus = "resolved" | "requires_calibration";
export type PhysicalQuantityApplication =
  | "environment_input"
  | "form_constant"
  | "performance_bound"
  | "safety_bound"
  | "calibration_gate";

export type PhysicalQuantity = Readonly<{
  label: string;
  meaning: string;
  affectedObservables: readonly string[];
  application: PhysicalQuantityApplication;
  /** True means the owning authority exposes a lawful bounded adjustment route. */
  tunable: boolean;
  status: CalibrationStatus;
  value?: number;
  unit: string;
  /** Unresolved, non-tunable quantities have no bounds until calibration. */
  safeMin?: number;
  safeMax?: number;
  authority: QuantityAuthority;
  provenance: readonly string[];
}>;

export type SupportCapability = Readonly<{
  id: string;
  kind: "structural_root" | "surface";
  modes: readonly ("plant" | "load" | "release" | "slide" | "pivot")[];
  maxLoadShare: number;
  provenance: readonly string[];
}>;

export type SemanticControlCapability = Readonly<{
  id: string;
  unit: string;
  safeMin: number;
  safeMax: number;
  authority: QuantityAuthority;
  provenance: readonly string[];
}>;

export type LocomotionMode = "grounded" | "slide" | "hop" | "float" | "flight";

export type FormCapabilityProfile = Readonly<{
  schema: "gasper.form-capability.v1";
  formId: string;
  version: string;
  locomotion: readonly LocomotionMode[];
  supports: readonly SupportCapability[];
  controls: readonly SemanticControlCapability[];
  physics: Readonly<Record<string, PhysicalQuantity>>;
  primitives: readonly MotionPrimitiveId[];
  forbiddenAnatomy: readonly string[];
  topologyRef: string;
}>;

export type PhysicsGoal = Readonly<{
  id: string;
  target: number;
  unit: string;
  safeMin: number;
  safeMax: number;
  authority: QuantityAuthority;
  evidence: readonly EvidenceRef[];
}>;

export type PhysicsIntentBeat = Readonly<{
  id: string;
  t0Ms: number;
  t1Ms: number;
  primitive: MotionPrimitiveId;
  supportGoals: readonly PhysicsGoal[];
  bodyGoals: readonly PhysicsGoal[];
  expressiveGoals: readonly PhysicsGoal[];
  constraints: readonly string[];
  sourceEvidence: readonly EvidenceRef[];
}>;

export type PhysicsIntentPlan = Readonly<{
  schema: "gasper.physics-intent-plan.v1";
  id: string;
  sourceMotionScoreHash: string;
  formProfileHash: string;
  environmentProfileHash: string;
  seed: number;
  durationMs: number;
  beats: readonly PhysicsIntentBeat[];
  compiler: Readonly<{
    id: string;
    version: string;
  }>;
}>;

export type ReferenceBehaviorArtifact = Readonly<{
  schema: "gasper.reference-behavior.v1";
  id: string;
  sourceReceiptHash: string;
  poseObservationHash: string;
  motionScoreHash: string;
  formProfileHash: string;
  physicsIntentPlanHash: string;
  status: "experiment" | "machine_valid" | "architect_reviewed" | "owner_accepted" | "rejected";
  acceptance: readonly ("machine_proven" | "live_observed" | "human_accepted" | "open")[];
  provenance: Readonly<{
    builder: string;
    builderVersion: string;
    parentArtifactHashes: readonly string[];
  }>;
}>;
