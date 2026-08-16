/**
 * Open Dais-first workspace presentation for packaged Gasper Studio.
 * EA-V007 correction: stage primary, Graph Editor neutralized, direct manip shell-owned.
 * Does not claim Cody visual acceptance.
 */

export {
  DAIS_FIRST_HIERARCHY,
  PRIMARY_CONTROL_IDS,
  REVIEW_ERGONOMICS,
  VISUAL_HIERARCHY_LAW,
  GRAPH_PLACEHOLDER_NEUTRALIZATION,
  DAIS_FIRST_HOST,
  DEFAULT_HIERARCHY_ORDER,
  DAIS_CHROME_DENSIFICATION,
  cssNeutralizesGraphPlaceholder,
  cssEnforcesCharacterDominantStage,
  noPlaceholderEditorDominance,
  presentationAvoidsGraphEditorDominance,
  stageIsPrimaryHierarchy,
  primaryControlsContractComplete,
  hostDeclaresDaisFirst,
  hierarchyIsStageRailTransport,
  cssDensifiesChromeForStagePrimary,
  chromeNotPrimaryMass,
  deadSpaceReducedForOwnerReview,
} from "./daisFirstLayout";
export type {
  DaisFirstHierarchyRole,
  PrimaryControlId,
} from "./daisFirstLayout";

export {
  EIGHT_HOLD_STATE_IDS,
  EIGHT_HOLD_STATE_LABELS,
  CORE_TRANSITION_CONTROL_IDS,
  FACIAL_REVIEW_MIN_HEIGHT_FRACTION,
  FACIAL_REVIEW_TARGET_HEIGHT_FRACTION,
  OWNER_REVIEW_FRAMING,
  REVIEW_MODE_HOST,
  REVIEW_MODE_SHELL_COLLAPSE,
  reviewModeChromeFlags,
  computeReviewCropLabelGeometry,
  labelsOutsideCharacterCrop,
  facialReviewScaleMeetsFloor,
  facialReviewScaleMeetsTarget,
  characterFitValidForStageSize,
  characterFitRequestsElevatedTarget,
  noClipAsSoleFraming,
  sourceDeclaresReviewMode,
  sourceExposesEightHoldStates,
  primaryReviewControlsComplete,
  toggleReviewMode,
  labelForHoldState,
} from "./daisReviewMode";
export type {
  EightHoldStateId,
  CoreTransitionControlId,
  ReviewModeChromeFlags,
  ReviewCropLabelGeometry,
  NormalizedRect,
  StageSize,
} from "./daisReviewMode";

export {
  DEFAULT_FRAME_FPS,
  frameDurationMs,
  stepFrame,
  DAIS_KEYBOARD_MAP,
  SHELL_SHARED_KEY_COMMANDS,
  WINDOW_ONLY_KEY_COMMANDS,
  resolveDaisKeyCommand,
  dispatchDaisKeyCommand,
  buildDaisKeyHandlers,
  enableDirectManipulation,
  selectExpression,
  selectEmbodiment,
  setExpressionGain,
  resetExpressionViaAdapter,
  commitDesignParam,
  previewDesignParam,
  pinAbBaseline,
  compareAbBaseline,
  RAIL_DESIGN_PARAMS,
  RAIL_DOMAIN_TOOLS,
  RAIL_EMBODIMENTS,
  keyboardMapCoversTraversal,
  selectEightHoldState,
  transitionWake,
  transitionInterrupt,
  readActiveEightState,
  resolvePackagedDais,
} from "./daisFirstControls";
export type {
  DaisFirstAdapter,
  FrameStepResult,
  DaisKeyboardCommand,
  DispatchHandlers,
  DaisEightStateSurface,
  SelectEightStateResult,
} from "./daisFirstControls";

export { DaisControlRail } from "./DaisControlRail";
export type { DaisControlRailProps } from "./DaisControlRail";

export { DaisTransportBar } from "./DaisTransportBar";
export type { DaisTransportBarProps } from "./DaisTransportBar";

export { DaisFirstStageHost } from "./DaisFirstStageHost";
export type { DaisFirstStageHostProps } from "./DaisFirstStageHost";
