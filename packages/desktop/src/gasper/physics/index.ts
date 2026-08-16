export {
  GASPER_UNIFIED_THEORY_CONSTANTS,
  GASPER_UNIFIED_THEORY_PACKET,
  evaluateUnifiedFieldFrame,
  quinticMinimumJerk,
  validateUnifiedFieldFrame,
} from "./GasperUnifiedTheory";
export type {
  GasperUnifiedFieldFrame,
  GasperUnifiedTheoryConstants,
  UnifiedFieldInput,
} from "./GasperUnifiedTheory";
export {
  evaluateUnifiedAudioFrame,
  decodeUnifiedAudioFrame,
  GasperUnifiedAudioOutput,
} from "./GasperUnifiedAudio";
export type {
  GasperUnifiedAudioFrame,
  GasperUnifiedAudioOutputStatus,
} from "./GasperUnifiedAudio";
export {
  createIntentSpring,
  stepIntentSpring,
  retargetIntentSpring,
  validateIntentSpring,
  GasperIntentSpringBank,
} from "./GasperIntentSpring";
export type {
  IntentSpringState,
  IntentSpringBankState,
} from "./GasperIntentSpring";
export {
  createDisposition,
  advanceDisposition,
  evaluateDispositionSample,
  EMOTION_DECAY_TAUS_FRAMES,
  EMOTION_BEAT_RATIOS,
  EMOTION_VALENCE,
  UNIFIED_EMOTION_IDS,
  RESIDUE_BUFFER_SIZE,
  HABIT_BUFFER_SIZE,
  HABIT_HALF_LIFE_SECONDS,
  MOOD_AMPLITUDE,
} from "./GasperUnifiedDisposition";
export type {
  UnifiedEmotionId,
  DispositionEvent,
  DispositionState,
  DispositionSample,
  DispositionResidueEntry,
  DispositionHabitEntry,
} from "./GasperUnifiedDisposition";
export {
  evaluateUnifiedLightProjection,
  GASPER_UNIFIED_LIGHT_PACKET,
} from "./GasperUnifiedLight";
export type { UnifiedLightSample } from "./GasperUnifiedLight";
