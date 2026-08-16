/**
 * GASPER-CRAFT-001 · C1/C2/C4/C5 — the craft layer's curve + camera + craft
 * authority (barrel).
 */
export {
  CURVE_TANGENT_SET,
  curveAutoTangents,
  curveTrackDuration,
  evaluateCurveTrack,
  evaluateCurveTrackDerivative,
  normalizeCurveTrack,
  validateTangentType,
} from "./CurveTrack";
export type {
  CurveKey,
  CurveTangentType,
  CurveTrack,
} from "./CurveTrack";
export {
  PACK_CHANNEL_SET,
  PACK_SHOT_SCALE_SET,
  PACK_UNIT_CHANNELS,
  RETIRED_PACK_CHANNELS,
  beatAt,
  checkSquashVolume,
  compilePerformancePack,
  fnv1aHex,
  hashPackContent,
  packAmplitude,
  packChannelSpan,
  packChannelValueAt,
  packDuration,
  segmentAt,
  validateArcPhase,
  volumeLawWidthScale,
} from "./PerformancePack";
export type {
  ArcPhaseReport,
  PackBeat,
  PackChannelId,
  PackCompileResult,
  PackSegment,
  PackSegmentMode,
  PackShotScale,
  PerformancePack,
} from "./PerformancePack";
export {
  DEFAULT_PERFORMANCE_PACK_PARAMS,
  PERFORMANCE_PACK_PARAM_BOUNDS,
  PerformancePackDriver,
  clampPerformancePackParams,
} from "./PerformancePackDriver";
export type {
  PackProvenance,
  PerformancePackDriverOutput,
  PerformancePackParams,
} from "./PerformancePackDriver";
export {
  DEFAULT_PERFORMANCE_SCALES,
  SHOT_SCALE_DEPTH_BANDS,
  beatAuthoredDepth,
  shotScaleDepthBand,
  validateCameraFixity,
  validateDepthLegibility,
  validatePerformanceShotScales,
} from "./ShotDirector";
export type {
  CameraFixityReport,
  CameraFixitySample,
  DepthLegibilityReport,
  ShotScaleDepthBand,
  ShotScaleReport,
} from "./ShotDirector";
export {
  CRAFT_RAIL_BOUNDS,
  CRAFT_SHOT_BIAS_POSITIONS,
  CRAFT_SHOT_BIAS_SET,
  DEFAULT_CRAFT_RAIL_PARAMS,
  PERFORMANCE_SCALE_AXIS,
  applyShotBias,
  clampCraftRailPatch,
} from "./CraftRail";
export type {
  CraftRailParams,
  CraftShotBias,
  CraftShotBiasPosition,
} from "./CraftRail";
export {
  FACE_ACTION_UNITS,
  FACE_ACTION_UNIT_SET,
  FACE_ENERGY_SHAPE,
  FACE_ONSET_BUDGET,
  compileFaceBeats,
  faceBeatEnergyAt,
  faceBeatPeak,
  faceBeatsEnergyAt,
} from "./FaceBeats";
export type { FaceActionUnitId, FaceBeat, FaceBeatCompileResult } from "./FaceBeats";
export {
  CRAFT_AUTHORING_BODY_HEIGHT_PX,
  compileCraftPack,
  craftBeatSheetCoverage,
  craftEndsHome,
  craftSegmentCoverage,
  craftSilhouetteHeadroom,
  craftWorldBounds,
  getCraftPack,
  getCraftPackErrors,
  listCraftPacks,
} from "./CraftPacks";
export type { CraftBaseResolver, CraftPackCompileResult, CraftPackIntent } from "./CraftPacks";
