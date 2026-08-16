/**
 * Gasper temporal continuity — frame-sequence analysis + runtime policy helpers.
 *
 * Policy layer only: does not replace GSAP or native frame authority.
 * Does not drive frames via MCP. Does not bind survival to HQ/AgentBridge.
 */

export * from "./types";
export * from "./channels";
export * from "./derivatives";
export {
  resolveOwnership,
  countOwnershipFlips,
  countOwnershipOscillations,
  ownershipAntiFlickerStable,
  livingFrameClaims,
} from "./ownership";
export type { OwnershipClaim } from "./ownership";
export * from "./scheduler";
export * from "./frameRecorder";
export * from "./discontinuity";
export * from "./analyzeSequence";
export {
  captureLivingFrameSequence,
  captureAndAnalyzeLivingSequence,
  captureFullEnergyMatrixSequence,
  captureAndAnalyzeFullEnergyMatrix,
  assertDeterministicRerun,
  captureNoBlackoutRouteSequence,
  captureAndAnalyzeNoBlackoutRoute,
  captureAndAnalyzeNoBlackoutRouteMatrix,
} from "./captureLivingSequence";
export type { NoBlackoutRouteId } from "./captureLivingSequence";

export {
  ENERGY_GRAMMAR,
  FULL_ENERGY_MATRIX_ROUTES,
  EIGHT_STATE_ENERGY_ROUTES,
  ANTI_COLLAPSE_FLOORS,
  ENERGY_RENDER_SCALE_FLOOR,
  FACE_RENDER_SCALE_FLOOR,
  MATERIAL_ENERGY_SPAN_FLOOR,
  resolveEnergyRouteId,
  resolveEnergyTarget,
  resolveTemporalEnvelope,
  envelopeWeight,
  sampleEnergyChannels,
  enforceAntiCollapseFloors,
  channelVolume,
  VOLUME_FLOOR,
  applyEnergyGrammar,
  antiCollapseIdentityConstraints,
  energyChannelDurationScales,
  energyPhaseOffsets,
  analyzeEnergySpan,
  fullMatrixSteadyLevels,
  isCollapseAsExpression,
  stepEnergyTowardTarget,
} from "./energyGrammar";
export type {
  EnergyRouteId,
  EnergyEnvelopePhase,
  TemporalEnvelope,
  EnergyTarget,
  AntiCollapseMode,
  EnergySpanReport,
} from "./energyGrammar";
export {
  analyzeHeadedLiveSamples,
  inferSampleDt,
  missingExercisePhases,
  HEADED_EXERCISE_PHASES,
} from "./headedLiveMetrics";
export type {
  HeadedLiveSample,
  HeadedLiveAnalysis,
  HeadedGeometrySample,
  HeadedTopologySample,
  HeadedChannelSeries,
  HeadedExercisePhase,
} from "./headedLiveMetrics";
export {
  detectEmbodimentDefects,
  detectEmbodimentDefectsFromContinuity,
  isEmbodimentSequenceClean,
  injectDefectForTest,
  DEFAULT_EMBODIMENT_DEFECT_THRESHOLDS,
} from "./embodimentDefects";
export type { EmbodimentDefectThresholds } from "./embodimentDefects";
export {
  NO_BLACKOUT_FLOORS,
  NO_BLACKOUT_TEMPORAL,
  PROJECTOR_FACE_VIS_FLOORS,
  noBlackoutModeFromAntiCollapse,
  resolveNoBlackoutMode,
  facePresenceScore,
  shellContinuityScore,
  facialAttachmentScore,
  energyHoldScore,
  topologyOwnershipOk,
  evaluateFrameReadability,
  enforceNoBlackoutFloors,
  sampleWakeReconstruction,
  sampleDormantMaintain,
  analyzeNoBlackoutSequence,
  resolveProjectorFaceVisibility,
} from "./noBlackoutInvariant";
export type {
  NoBlackoutMode,
  NoBlackoutFloors,
  FrameReadability,
  TemporalNoBlackoutReport,
} from "./noBlackoutInvariant";
