export * from "./pilot";
export * from "./clock";
export * from "./performance/PerformancePrimitiveDriver";
export * from "./performance/WispwalkerCapabilityProfile";
export * from "./performance/WispwalkerStudioEnvironmentProfile";
export { GasperDaisStage, createGasperController } from "./GasperDaisStage";
export type { GasperDaisInteractionMode, GasperDaisStageProps } from "./GasperDaisStage";
export { GasperRigController } from "./GasperRigController";
export type { TuningLabParams } from "./GasperRigController";
export * from "./controller";
export { GasperSelectionModel, gasperSelection } from "./GasperSelectionModel";
export * from "./relief";
export * from "./compositor";
export * from "./optics";
export * from "./animation-editor";
export * from "./embodiments/singularity";
export * from "./embodiments/comet";
export * from "./embodiments/dormant";
export type { StageMode, StageTool, GasperSelectionState } from "./GasperSelectionModel";
export { GasperParameterRegistry } from "./GasperParameterRegistry";
export type { GasperRigBinding } from "./GasperParameterRegistry";
export {
  mountGasperDocument,
  mountGasperDocumentLegacyFormMaster,
  mountGasperDocumentNativeCandidate,
  NativeGasperRigInstance,
  HIDDEN_STUB_COUNT_NORMAL_RUNTIME,
  neutralizeLegacyCompatSubtree,
  countProductHiddenFocusHazardsInDom,
} from "./GasperDocument";
export type { FormMasterRig, GasperDocumentMount } from "./GasperDocument";
export {
  isProductHiddenFocusHazard,
  countProductHiddenFocusHazards,
  probeNeutralizedLegacyControl,
  probeRawOffCanvasLegacyControl,
  LEGACY_NEUTRALIZE_CONTRACT,
} from "./legacyFocusPolicy";
export type { FocusableProbe } from "./legacyFocusPolicy";
export * from "./renderer";
export {
  GasperViewportController,
  WORLD_SCALE_100,
  ZOOM_MIN,
  ZOOM_MAX,
} from "./GasperViewportController";
export { DEFAULT_FORM, GasperRenderMixer } from "./GasperRenderMixer";
export {
  GasperVisualBoundsService,
  computeBoundsSnapshot,
  fitCameraFromSafeBounds,
  visualFullyVisible,
  CONTENT_VIEWBOX,
  SAFE_MARGIN_MIN,
  SAFE_MARGIN_MAX,
  SAFE_MARGIN_DEFAULT,
} from "./GasperVisualBounds";
export type { BoundsSnapshot, BoundsInput, Rect } from "./GasperVisualBounds";
export {
  handlesForEmbodiment,
  inspectorGroupsForEmbodiment,
  SINGULARITY_HANDLES,
  SINGULARITY_INSPECTOR_GROUPS,
  SINGULARITY_BINDING_DEFAULTS,
  SOURCE_FORM_HANDLES,
  FACE_HANDLES,
  COMET_HANDLES,
  DORMANT_HANDLES,
} from "./GasperEmbodimentHandles";
export {
  computeCompareReport,
  computeCompareSilhouettes,
  boundsInputFromBindings,
  rectToEllipsePath,
  buildCompareSurfaceState,
} from "./GasperCompare";
export type {
  CompareReport,
  CompareRenderMode,
  CompareDelta,
  CompareSilhouettes,
  CompareSurfaceState,
} from "./GasperCompare";
export {
  computeHostTransform,
  applyHostTransformToRect,
} from "./GasperHostTransform";
export {
  GasperLivingRuntime,
  gasperLiving,
  BEHAVIORAL_SEQUENCE,
  MICROSTATE_TARGETS,
  MICROSTATE_TARGETS_IS_FALLBACK_DEMO,
} from "./GasperLivingRuntime";
export type {
  MicrostateId,
  LivingStateId,
  LivingRuntimeOptions,
  LivingRuntimeStatus,
} from "./GasperLivingRuntime";
export * from "./eight-state-loop";
export {
  livingPolicyForStageMode,
  liveBoundsInputSignature,
  boundsGeometrySignature,
  boundsSignatureChanged,
  shouldSampleHud,
  HUD_SAMPLE_MS,
} from "./GasperStageHotPath";
export { buildDaisInspectionReport } from "./GasperDaisInspection";
export {
  FORMMASTER_DEPENDENCY_REPORT,
  formMasterStillOwnsDeepRig,
  summarizeFormMasterAuthority,
  normalRuntimeUsesCandidateScripts,
  normalRuntimeHiddenStubCount,
} from "./GasperFormMasterDependencyReport";
export {
  defaultReliefProbePoints,
  snapshotReliefField,
  reliefFieldActuallyMoved,
} from "./GasperReliefFieldProbe";
export { GASPER_TOPOLOGY, assertTopologyLock, expectedStructuralTriangles } from "./GasperTopologyLock";
export {
  MORPHOLOGY_DOMAINS,
  REQUIRED_GSAP_TRACKS,
  domainIds,
  domainForBinding,
} from "./GasperMorphologyDomains";
export type { MorphologyDomainId, DomainStatus } from "./GasperMorphologyDomains";
export {
  createDefaultDomainState,
  flattenDomainBindings,
  tickDomainFields,
  dirtyDomainsFromBinding,
  ALL_DIRTY_DOMAINS,
  applyBindingToDomainsInPlace,
} from "./GasperDomainState";
export type {
  GasperMultiDomainState,
  DirtyDomainId,
  OpticalMode,
  TickDomainOptions,
} from "./GasperDomainState";
export { GasperLayerMixer } from "./GasperLayerMixer";
export { GasperGsapTrackOrchestrator } from "./GasperGsapTrackOrchestrator";
export { GsapPlanCompiler } from "./GsapPlanCompiler";
export type { AnimationPlan } from "./GsapPlanCompiler";
export {
  createGasperDocument,
  defaultDomainStatusReport,
} from "./GasperDocumentModel";
export type { GasperDocumentV1, DomainStatusReport } from "./GasperDocumentModel";
export {
  GASPER_EMBODIMENT_PROFILES,
  GASPER_EMBODIMENT_IDS,
  getEmbodimentProfile,
  listEmbodimentProfiles,
  profileToDomainBindings,
} from "./GasperRigDefinition";
export type { GasperEmbodimentProfile } from "./GasperRigDefinition";
export {
  GASPER_EXPRESSION_FIXTURES,
  getExpressionFixture,
  listExpressionFamilies,
} from "./GasperExpressionFixtures";
export { projectEmbodimentOntoSvg } from "./GasperEmbodimentProjector";
export { applyMorphFrame, clearMorphFrame, listMorphRoute } from "./GasperMorphAdapter";
export {
  projectExpressionFixture,
  blendExpressionFixtures,
  EIGHT_STATE_IDS,
  EIGHT_STATE_VISUAL_ENDPOINTS,
  CHANNEL_DOMAIN_KEYS,
  getVisualStateEndpoint,
  listVisualStateEndpoints,
  projectVisualStateEndpoint,
  exportVisualStateEndpointParameters,
  hashVisualStateEndpoint,
  exportAllVisualStateEndpointHashes,
  evaluateEndpointPairDistinctness,
  evaluateAllEndpointDistinctness,
  isEightStateId,
  quantizeChannelMap,
} from "./GasperExpressionProjector";
export type {
  EightStateId,
  GasperVisualStateEndpointV1,
  VisualStateProjectReport,
  DistinctnessPairReport,
  FaceDoctrine,
  BlinkPolicy,
  MicrovariationPolicy,
  ExpressionProjectReport,
} from "./GasperExpressionProjector";
export { deepRigAuthorityIsNative } from "./GasperFormMasterDependencyReport";
export {
  applyContourToSvg,
  getContourForProfile,
  contourLibraryIsComplete,
  listContourProfileIds,
} from "./GasperContourSolver";
export type { ContourEntry, ContourApplyReport } from "./GasperContourSolver";
export {
  solveContour,
  closedSpline,
  createPolarTopology,
  getLockedPolarTopology,
  formRadiusAtFor,
  baseRadiusV63,
  macroStateFromDomain,
  createBaseContour,
} from "./GasperContourSolver";
export {
  GasperAnimateSession,
  createDefaultAnimateTracks,
} from "./GasperAnimateTracks";
export type {
  AnimateTrackState,
  AnimateKeyframe,
  AnimateSessionSnapshot,
} from "./GasperAnimateTracks";
export {
  GasperAnimationCommandSession,
  getAnimationCommandSession,
  resetAnimationCommandSessionForTests,
  createEmptyDocument,
  buildThinkingKnitClip,
  computeContentHash,
  defaultTracksForClip,
  mergeAnimationHost,
} from "./GasperAnimationCommands";
export {
  evaluateClipAt,
  collectMergedKeyframes,
  applyEasing,
  poseDistinctness,
} from "./GasperAnimationEvaluate";
export type {
  AnimationClip,
  AnimationTrack,
  AnimationKeyframe,
  GasperCanonicalDocument,
  AnimationChangeResult,
} from "./GasperAnimationTypes";
export { ANIMATION_EASINGS, GASPER_SCHEMA_VERSION } from "./GasperAnimationTypes";
export type {
  ContourSolveResult,
  ContourPoint,
  ContourMacroState,
  PolarTopology,
} from "./GasperContourSolver";
export {
  rectForFitIntent,
  characterHeightFraction,
} from "./GasperVisualBounds";
export type { FitIntent } from "./GasperVisualBounds";
export {
  uiAuthorityForDais,
  inspectorFamilyForTool,
  isDuplicateGasperParamGroup,
  editSegmentForTool,
  defaultWorkspaceForMode,
  stageModeForWorkspace,
  documentIdentityLabel,
  buildAuthorityGrammar,
  formatAuthorityBreadcrumb,
  workspaceLabel,
  modeLabel,
  toolLabel,
  STUDIO_WORKSPACES,
} from "./GasperUiAuthority";
export type {
  UiAuthoritySnapshot,
  StudioWorkspace,
  AuthorityGrammar,
  InspectorFamily,
  LegacyEditSegment,
} from "./GasperUiAuthority";
export {
  gasperRustBridgeAvailable,
  gasperNew,
  gasperOpen,
  gasperSave,
  gasperDocumentSummary,
  gasperHashes,
  gasperValidate,
  gasperBeginTransaction,
  gasperCommitTransaction,
  gasperCancelTransaction,
  gasperUndo,
  gasperRedo,
} from "./GasperDocumentBridge";
export type { GasperDocSummary } from "./GasperDocumentBridge";
export { validateGasperRuntime } from "./GasperValidate";
export type { ValidationReport, ValidationFinding } from "./GasperValidate";

export * from "./GasperDaisLayoutReady";


export * from "./living";

export * from "./projection";
export * from "./vector/GasperVectorMaterial";
