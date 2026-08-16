/**
 * Shared Gasper facial continuum — pure continuous deformation laws.
 * Import path: packages/shared/src/gasper/facial (fence-local; not root gasper index).
 */

export {
  DEFAULT_FACIAL_POLICY,
  FACIAL_BODY_CHANNELS,
  FACE_ONLY_CHANNELS,
  SHELL_CHANNELS,
  ENERGY_CHANNELS,
} from "./types";
export type {
  FacialChannelMap,
  FacialSemanticId,
  FacialSemanticKernelId,
  FeatureAnchorId,
  FeatureAnchor,
  FacialMotionPhase,
  FacialOwner,
  FacialFrame,
  FacialContinuumPolicy,
  FacialBodyChannel,
} from "./types";

export {
  FEATURE_ANCHORS,
  getFeatureAnchor,
  listFeatureAnchorIds,
  resolveFeaturePositions,
  attachmentResiduals,
  featuresAttached,
  oneBodyCoMotion,
} from "./featureAnchors";

export {
  clampTissue,
  isMouthInverted,
  detectSnapFrames,
  eyeAsymmetryMetric,
  eyeAsymmetryWithinPolicy,
  shellArea,
} from "./tissueBounds";
export type { TissueClampResult } from "./tissueBounds";

export {
  quantize,
  clamp01,
  smoothstep,
  planMotionPhases,
  phaseAtFrame,
  anticipateSample,
  transitionSample,
  settleSample,
  interpolateExpressionContinuum,
  blendFacialChannels,
  boundFacialStep,
  enforceChiralitySymmetry,
} from "./continuumLaws";

export {
  FACIAL_SEMANTIC_TARGETS,
  SEMANTIC_ORDER,
  MIN_SEMANTIC_SEPARATION,
  getFacialSemantic,
  listFacialSemantics,
  resolveFacialSemantic,
  semanticFeatureVector,
  semanticDistance,
  allSemanticsDistinct,
} from "./semanticTargets";
export type { FacialSemanticTarget } from "./semanticTargets";

export {
  WHOLE_FACE_CHANNELS,
  WHOLE_FACE_DOMAINS,
  GLOBAL_SCALE_CHANNELS,
  COLOR_ONLY_CHANNELS,
  WHOLE_FACE_IDENTITY_BOUNDS,
  MIN_WHOLE_FACE_SEPARATION,
  MIN_DOMAINS_ABOVE_FLOOR,
  DOMAIN_SEPARATION_FLOOR,
  WHOLE_FACE_MORPHOLOGY_TARGETS,
  WHOLE_FACE_PRESENCE_ORDER,
  WHOLE_FACE_SEMANTIC_ORDER,
  getWholeFaceMorphology,
  listWholeFaceSemantics,
  resolveWholeFaceSemantic,
  wholeFaceFeatureVector,
  wholeFaceDistance,
  wholeFaceDomainVectors,
  multiDomainSeparation,
  isSameMaskScalingOnly,
  isGlobalOnlyDeformation,
  identityBoundsHeld,
  allWholeFacePresenceDistinct,
  sameMaskScaleVariant,
  globalOnlyDeformationVariant,
} from "./wholeFaceMorphology";
export type {
  WholeFacePresenceId,
  WholeFaceSemanticKey,
  WholeFaceChannel,
  WholeFaceDomain,
  WholeFaceMorphologyTarget,
  MultiDomainSeparation,
} from "./wholeFaceMorphology";

export {
  finiteDifferences,
  maxAbs,
  metricsForChannel,
  analyzeFacialSequence,
  countOscillations,
  injectSnap,
  injectMouthInversion,
  injectFloatingOverlay,
  attachmentErrorFromChannels,
} from "./metrics";
export type { ChannelSeriesMetrics, FacialSequenceReport } from "./metrics";

export {
  EXPRESSION_VISIBILITY_FLOORS,
  enforceExpressionVisibilityFloors,
  isChannelMapBlackOrInert,
  projectDormantLegibleChannels,
  blackInertChannelVariant,
} from "./expressionVisibility";
export type { ExpressionVisibilityMode } from "./expressionVisibility";
