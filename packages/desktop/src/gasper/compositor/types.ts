/**
 * VEC-501 canonical resolved-pose compositor contracts.
 *
 * All visible binding values flow through one ordered resolver. Compatibility
 * adapters may translate legacy layer names, but may not implement a second
 * final-value algorithm.
 */

export type SemanticBindingId = string;

export type BlendMode =
  | "absolute"
  | "additive"
  | "multiplicative"
  | "weighted_override"
  | "masked_override";

export type LayerOwnership =
  | "document_base"
  | "embodiment"
  | "expression"
  | "clip"
  | "runtime"
  | "living"
  | "preview"
  | "manual_preview"
  | "character_state";

export type CanonicalLayerOwnership = Exclude<LayerOwnership, "preview">;
export type FinalPoseOwner = CanonicalLayerOwnership | "constraints" | "held_pose" | null;
export type LayerPersistence = "durable" | "session" | "transient";
export type InterruptionBehavior = "hold_resolved" | "blend_out" | "discard";

export type PoseContribution = {
  bindingId: SemanticBindingId;
  value: number;
  weight?: number;
  mask?: number;
};

export type PoseLayer = {
  id: string;
  ownership: LayerOwnership;
  blendMode: BlendMode;
  weight: number;
  persistence: LayerPersistence;
  interruption: InterruptionBehavior;
  contributions: PoseContribution[];
  priority?: number;
  suppressOnScrub?: boolean;
};

export type PoseConstraint = {
  id: string;
  bindingId: SemanticBindingId;
  min: number;
  max: number;
  mode: "clamp" | "reject";
};

export type PoseConstraintResolver = {
  id: string;
  resolve(values: Readonly<Record<SemanticBindingId, number>>): Record<SemanticBindingId, number>;
};

export type ResolvedValue = {
  bindingId: SemanticBindingId;
  value: number;
};

export type PoseContributionTrace = {
  layerId: string;
  ownership: CanonicalLayerOwnership;
  blendMode: BlendMode;
  inputValue: number;
  weight: number;
  mask: number;
  before: number | null;
  after: number;
};

export type PoseConstraintTrace = {
  id: string;
  mode: "clamp" | "reject" | "resolver";
  min: number | null;
  max: number | null;
  before: number | null;
  after: number;
  changed: boolean;
};

export type InspectionTrace = {
  bindingId: SemanticBindingId;
  base: number | null;
  embodiment: number | null;
  expression: number | null;
  clip: number | null;
  runtime: number | null;
  living: number | null;
  preview: number | null;
  manualPreview: number | null;
  characterState: number | null;
  resolved: number;
  finalValue: number;
  owners: CanonicalLayerOwnership[];
  finalOwner: FinalPoseOwner;
  contributions: PoseContributionTrace[];
  constraints: PoseConstraintTrace[];
  svgTargets: string[];
};

export type CompositorInput = {
  layers: PoseLayer[];
  constraints?: PoseConstraint[];
  constraintResolvers?: PoseConstraintResolver[];
  scrubMode?: boolean;
  interrupted?: boolean;
  requiredBindings?: SemanticBindingId[];
  bindingTargets?: Record<SemanticBindingId, string[]>;
};

export type ResolvedPose = {
  values: Record<SemanticBindingId, number>;
  traces: InspectionTrace[];
  diagnostics: string[];
  held: boolean;
  hash: string;
};
