/**
 * Morphology domain helpers for production Gasper Studio Dais.
 * Includes volume-preserving bidirectional embodiment morphology law.
 */

export {
  applyBoundedDeformation,
  interpolateBounded,
  morphologyDomainCoverage,
  listMorphologyChannelBounds,
  describeBound,
} from "./boundedDeformation";
export type { BoundedDeformResult } from "./boundedDeformation";

export type {
  EmbodimentId,
  MorphologyLayer,
  MorphologyLayerOwner,
  FeaturePhase,
  IntermediateMorphologyState,
  MorphologyChannelMap,
  LayerOwnershipMap,
  FeatureLifecycle,
  EnergyTransfer,
  CenterOfMass,
  ChiralityMotion,
  MorphologyFrame,
  MorphologyRoute,
  MorphologyProfileId,
  MorphologyProfileCompatibilityMode,
  MorphologyProfileRoute,
  EvaluateMorphologyOptions,
  EmbodimentDefectClass,
  EmbodimentDefectFinding,
} from "./types";

export {
  getMorphologyRoute,
  invertRoute,
  intermediateAt,
  orderedIntermediateStates,
  REQUIRED_BIDIRECTIONAL_PAIRS,
  EMBODIMENT_IDS,
  MORPHOLOGY_PROFILE_IDS,
  MORPHOLOGY_PROFILE_COMPATIBILITY,
  profileMorphologyEmbodimentId,
  getProfileMorphologyRoute,
  listProfileMorphologyRoutes,
} from "./routes";

export {
  EMBODIMENT_REST,
  computeVolume,
  preserveVolume,
  computeCenterOfMass,
  computeEnergyTransfer,
  resolveLayerOwnership,
  evaluateFeatureLifecycle,
  evaluateMorphologyFrame,
  sampleMorphologySequence,
  inverseConsistencyError,
  featureOrderLegal,
  exclusiveContourOwnership,
} from "./embodimentMorphology";

export {
  toMorphologyEmbodimentId,
  resolveSpecialtyAuthor,
  computeFacialAttachment,
  evaluateVisibleGeometrySnapshot,
  evaluateBoundMorphologyGeometry,
  sampleBoundGeometrySequence,
  computeFeatureSpans,
  intermediateShapesDistinct,
  inverseGeometryConsistencyError,
  hasExclusiveTopologyAuthority,
  snapshotDefectsClean,
  volumeAndAttachmentContinuous,
  injectSnapshotDefectForTest,
  boundFeatureOrderLegal,
  domainBindingsFromSnapshot,
} from "./visibleTopologyBinding";
export type {
  FeaturePoint,
  SnapshotDefectResiduals,
  VisibleGeometrySnapshot,
  FeatureSpanReport,
  GeometryBindingOptions,
} from "./visibleTopologyBinding";
