/**
 * Shared Gasper expression / morphology contracts for packaged Gasper Studio.
 * Pure TypeScript — no Headquarters or AgentBridge runtime dependency.
 */

export {
  ANCHOR_REGISTRY_VERSION,
  ANCHOR_VALIDATION_STATUS,
  HISTORICAL_ANCHOR_COUNT,
  EXPRESSION_18_ANCHORS,
  NATIVE_FIXTURE_ALIASES,
  listExpressionAnchorIds,
  getExpressionAnchor,
  resolveExpressionAnchorId,
  assertEighteenAnchors,
  anchorsByFamily,
} from "./anchors.js";
export type {
  AnchorRole,
  ExpressionFamily,
  EightScenarioId,
  ExpressionAnchor,
} from "./anchors.js";

export {
  CHIRALITY_POLICY_ID,
  CHIRALITY_ANCHOR_POLICY_ID,
  CHIRALITY_DEAD_ZONE,
  CHIRALITY_AXES,
  chiralitySignFromValue,
  flipChiralitySign,
  approachWithdrawSign,
  mapApproachToChannels,
  deriveChiralityFromAffect,
  readChiralityAxes,
  chiralityToChannelHints,
} from "./chirality.js";
export type {
  ChiralityAxis,
  ChiralitySign,
  ChiralityReading,
  ChiralityChannelHint,
} from "./chirality.js";

export {
  CONTROL_GAIN_POLICY,
  IDENTITY_PROTECTED_CHANNELS,
  FACE_GAIN_CHANNELS,
  clampExpressionGain,
  expressionGainScale,
  channelGainSensitivity,
  applyControlAsGain,
  blendWithControlGain,
} from "./controlAsGain.js";
export type { ChannelScalarMap } from "./controlAsGain.js";

export {
  TRANSITION_GRAMMAR_VERSION,
  ACCEPTED_EMBODIMENT_ROUTES,
  planTransition,
  expressionTransitionCost,
} from "./transitionGrammar.js";
export type {
  EmbodimentId,
  TransitionRoute,
  ExpressionTransition,
  PlannedTransition,
} from "./transitionGrammar.js";

export {
  MORPHOLOGY_BOUND_VERSION,
  CHANNEL_BOUNDS,
  getChannelBound,
  clampChannel,
  clampChannelMap,
  applyVolumeConservation,
  assessMorphologyCompleteness,
} from "./morphologyBounds.js";
export type { ChannelBound, MorphologyCompleteness } from "./morphologyBounds.js";
