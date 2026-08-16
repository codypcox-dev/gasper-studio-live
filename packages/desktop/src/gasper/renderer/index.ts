export type {
  GasperRenderer,
  GasperCanonicalState,
  GasperResolvedPose,
  RenderContext,
  RendererInspection,
  RendererLayerManifest,
  DeterministicRendererClock,
  RendererAuthorityClass,
} from "./GasperRendererContract";
export {
  measureSvgPathStats,
  boundsOf,
} from "./GasperRendererContract";

/** Lab-only legacy backend — never the packaged production default. */
export {
  LegacyAuthorityRenderer,
  createLegacyAuthorityRenderer,
  LEGACY_AUTHORITY_RENDERER_ID,
  LEGACY_AUTHORITY_RENDERER_VERSION,
} from "./LegacyAuthorityRenderer";

/** Native candidate backend for parity/equivalence lab use only. */
export {
  NativeGasperRenderer,
  createNativeGasperRenderer,
  isNativeGasperRenderer,
  NATIVE_CANDIDATE_RENDERER_ID,
  NATIVE_CANDIDATE_RENDERER_VERSION,
} from "./NativeGasperRenderer";
export type {
  NativeEightStateApplyReport,
  EightStateId as NativeEightStateId,
} from "./NativeGasperRenderer";

/** Single source of truth for production authority seal / inspection. */
export {
  PRODUCTION_AUTHORITY_ID,
  PRODUCTION_AUTHORITY_CLASS,
  PRODUCTION_AUTHORITY_SUMMARY,
  PRODUCTION_RENDERER_VERSION,
  PRODUCTION_LAYER_SUMMARY,
  PRODUCTION_AUTHORITY_FLAGS,
  PRODUCTION_MORPHOLOGY_TARGET_DESCRIPTOR,
  REJECTED_SUMMARY_PATTERNS,
  getProductionAuthorityInspection,
  applyProductionAuthorityToInspection,
  applyProductionAuthorityToLivingStatus,
  isProductionMorphologyActive,
  isProductionMount,
  isProductionRenderer,
  selectProductionAuthorityId,
  selectProductionAuthorityClass,
  assertProductionAuthoritySealed,
  quarantineLegacyProductionUse,
  summaryMatchesRejectedGeometry,
} from "./productionAuthority";
export type { ProductionAuthorityInspection } from "./productionAuthority";

/**
 * R4 optical legibility floors + ROI predicates + post-apply clamps.
 * Packaged native path enforces these after mixer flush.
 */
export {
  OPTICAL_LEGIBILITY_FLOORS,
  SVG_MATERIAL_BASELINE,
  applyOpticalLegibilityClamps,
  resolveOpticalStateClass,
  clampFaceEmissionOpacity,
  clampFeatureOpacity,
  clampMultiplyOpacity,
  mixerFaceEmissionOpacity,
  srgbToRelativeLuma,
  meanLumaRoi,
  localContrast,
  defaultCharacterRoiLayout,
  measureOpticalRoiMetrics,
  evaluateOpticalLegibility,
  synthesizeLegibleFrame,
  synthesizeBlackFrame,
  stateRelativeLuminosityScore,
  assertStateRelativeOrdering,
  predictCompositeFaceVisibility,
  proveHoldLastGoodUnderMixerOverwrite,
} from "./opticalLegibility";
export type {
  OpticalStateClass,
  OpticalLegibilityFloors,
  OpticalClampReport,
  OpticalRoiMetrics,
  OpticalLegibilityVerdict,
  CharacterRoiLayout,
  RectRoi,
} from "./opticalLegibility";

export {
  poseToLegacyControlMap,
  canonicalStateToLegacyControls,
  poseToNativeBindings,
  listMappedSemanticKeys,
  CANONICAL_MACRO_KEYS,
  CANONICAL_FACE_KEYS,
  CANONICAL_ENERGY_KEYS,
  CANONICAL_MATERIAL_KEYS,
  CANONICAL_DYNAMICS_KEYS,
} from "./CanonicalStateAdapter";
export type { LegacyControlMap } from "./CanonicalStateAdapter";
export {
  runEquivalenceComparison,
  computeEquivalenceMetrics,
  evaluateEquivalenceGates,
  comparisonToReportJson,
} from "./RendererEquivalenceLab";
export type {
  EquivalenceLabMode,
  EquivalenceCapture,
  EquivalenceComparison,
  EquivalenceMetrics,
  EquivalenceGateResult,
} from "./RendererEquivalenceLab";
