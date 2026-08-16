/**
 * VEC-801 / VEC-802 — Bounded controller decomposition surface.
 * GasperRigController remains the public facade/orchestrator.
 */

export {
  FORM_MASTER_FIXTURE_BY_LIVING_STATE,
  resolveFormMasterEmotionFixtureId,
  LEGACY_LIVING_SAFE_KEYS,
  LEGACY_ENDPOINT_SAFE_KEYS,
  LEGACY_FORMMASTER_MOUTH_PLANE_KEYS,
  filterLegacyEndpointValues,
  filterFormMasterSafeLivingValues,
} from "./legacyFormMasterPolicy";

export {
  FORM_KEYS,
  BINDING_LABELS,
  BINDING_GROUPS,
  rangeForBinding,
} from "./bindingCatalog";

export {
  resolveComposedPoseForController,
  type StateResolverHost,
  type ResolveComposedPoseInput,
} from "./stateResolver";

export {
  paintLegacyAuthorityFrame,
  applyPoseToLegacyAuthority,
  type LegacyAuthorityAdapterHost,
  type FormMasterRigSurface,
  type FormMasterGlobalSurface,
} from "./legacyAuthorityAdapter";

export {
  mainFormOverride,
  eightStateForwardId,
  eightStateLivingMotionGain,
  filterLivingFlushValues,
  ensureLiveSvgRootVisible,
  applyLivingEmbodimentVectorTransition,
  applyLivingEightStateTransition,
  prepareEightStateRestingBaseline,
  type LivingIntentHost,
  type LivingIntentRig,
} from "./livingIntent";

export {
  DOMAIN_TICK_SUBSCRIBER_ID,
  DOMAIN_TICK_PRIORITY,
  DOMAIN_TICK_CADENCE_MS,
  startDomainTickOnOrganismClock,
  attachControllerGsapClockBridge,
  stopOrganismClockIfIdle,
  type DomainTickHost,
  type DomainTickHandle,
} from "./organismClockIntegration";

export {
  installOperationalAnimatorBridge,
  syncEditorProjectionFromAnimationSession,
  type AnimationEditorAdapterHost,
} from "./animationEditorAdapter";

export {
  inspectControllerProjection,
  hasLiveProjectionRoot,
  type ProjectionInspectionHost,
} from "./projectionCoordination";

export {
  inspectDaisForController,
  topologyStatusForController,
  validateRuntimeForController,
  exportDocumentForController,
  inspectControlPathHygiene,
} from "./inspectionService";

export {
  EXTERNAL_AUTHORING_BRIDGE_PACKET,
  EXTERNAL_AUTHORING_BRIDGE_GLOBAL_KEY,
  EXTERNAL_AUTHORING_CONTROL_MESSAGE_TYPE,
  EXTERNAL_AUTHORING_READY_MESSAGE_TYPE,
  EXTERNAL_AUTHORING_ISOLATION_MARKERS,
  isExternalAuthoringBridgeEnabled,
  inspectExternalAuthoringBridge,
} from "./externalAuthoringBridge";

/** Module ownership map for structural proofs. */
export const CONTROLLER_DECOMPOSITION = {
  packet: "VEC-801/VEC-802",
  facade: "GasperRigController",
  modules: {
    rendererAdapter: "controller/legacyAuthorityAdapter.ts",
    organismClock: "controller/organismClockIntegration.ts",
    stateResolver: "controller/stateResolver.ts",
    livingIntent: "controller/livingIntent.ts",
    animationEditor: "controller/animationEditorAdapter.ts",
    vectorProjection: "controller/projectionCoordination.ts",
    inspection: "controller/inspectionService.ts",
    bindingCatalog: "controller/bindingCatalog.ts",
    legacyPolicy: "controller/legacyFormMasterPolicy.ts",
    externalAuthoringBridge: "controller/externalAuthoringBridge.ts",
  },
  singleAuthoritiesPreserved: [
    "one live SVG root",
    "one organism clock",
    "one canonical compositor",
    "one living/facial authority",
    "one vector projection transaction/writer",
  ],
} as const;
