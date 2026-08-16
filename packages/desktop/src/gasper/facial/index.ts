/**
 * Desktop facial body continuum + visible document geometry binding.
 * Does not replace GSAP frame authority; supplies channel maps and document
 * feature geometry for the rig / packaged document path.
 */

export {
  FacialBodyContinuum,
  projectFacialTarget,
  listContinuumSemantics,
  continuumSemanticChannels,
  FACE_ONLY_CHANNELS,
} from "./FacialBodyContinuum";
export type {
  ContinuumTargetSpec,
  ContinuumSnapshot,
  StepResult,
} from "./FacialBodyContinuum";

export {
  DOCUMENT_FACE_LATTICE,
  SIX_EXPRESSION_TARGETS,
  MIN_DOCUMENT_GEOMETRY_SEPARATION,
  MAX_DOCUMENT_SCALE_STEP,
  MAX_DOCUMENT_FACIAL_STEP,
  MIN_RENDERED_FEATURE_OPACITY,
  MIN_RENDERED_FEATURE_SPAN,
  MAX_ATTACHMENT_RESIDUAL_FLOOR,
  applyChannelsToDocumentGeometry,
  createRestDocumentGeometry,
  measureDocumentGeometry,
  geometryDerivedMorphologyVector,
  scaleNormalizedSemanticVector,
  scaleNormalizedDocumentDistance,
  documentGeometrySignature,
  documentFeatureDistance,
  analyzeDocumentGeometrySequence,
  writeDocumentGeometryToSvg,
  sampleGeometryFromSvg,
  eyePathD,
  mouthPathD,
  visibilityModeForExpression,
  isRenderedBlackOrInert,
  renderedGeometrySignature,
  maxAttachmentResidual,
} from "./DocumentFacialGeometry";
export type {
  DocumentFeatureBBox,
  DocumentFacialGeometry,
  DocumentGeometryMeasures,
  DocumentGeometrySequenceReport,
} from "./DocumentFacialGeometry";

export {
  VisibleFacialBinding,
  resolveVisibleExpressionTarget,
  projectExpressionToDocumentGeometry,
} from "./VisibleFacialBinding";
export type {
  VisibleFacialBindingOptions,
  VisibleFacialFrame,
  ExpressionGeometrySignature,
} from "./VisibleFacialBinding";
