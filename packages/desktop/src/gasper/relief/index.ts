export {
  GasperReliefFieldGenerator,
  createReliefGenerator,
} from "./GasperReliefFieldGenerator";
export {
  reliefFieldToAuthorityDrive,
  ellipsesToPathD,
} from "./ReliefAuthorityAdapter";
export type {
  ReliefGenerationInput,
  ReliefField,
  ReliefMetrics,
  ReliefAuthorityDrive,
} from "./types";
export {
  RELIEF_MAX_SAMPLES,
  RELIEF_DEFAULT_WIDTH,
  RELIEF_DEFAULT_HEIGHT,
} from "./types";
export {
  ANALYTIC_FEATURE_RELIEF,
  softRing,
  softDisk,
  softSegment,
  logoGHeight,
  glassesHeight,
  embodimentHeight,
  featureLogoGlassesHeight,
  faceAffineFromProjection,
  applyFaceAffine,
  sampleAnalyticFeatureHeight,
  deriveFeatureNormals,
  featureCoverageStats,
  smoothstep01,
  wrappedU,
} from "./analyticFeatureRelief";
export type {
  FaceAnchorUV,
  FaceProjectionPoints,
  FaceAffine,
  EmbodimentProfileId,
  AnalyticFeatureSampleInput,
} from "./analyticFeatureRelief";
