/** Re-export canonical animation types from shared. */
export {
  ANIMATION_EASINGS,
  GASPER_SCHEMA_VERSION,
  GASPER_FORMAT,
  clamp01,
  defaultTopology,
  isValidEasing,
  timeMsToNormalized,
  normalizedToTimeMs,
} from "../../../shared/src/gasper-animation";
export type {
  AnimationClip,
  AnimationTrack,
  AnimationKeyframe,
  AnimationMarker,
  AnimationLibrary,
  GasperCanonicalDocument,
  AnimationChangeResult,
  AnimationEasing,
  LoopMode,
  BlendMode,
  TopologyMeta,
} from "../../../shared/src/gasper-animation";
