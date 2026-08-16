/** Re-export pure evaluation from shared (single implementation). */
export {
  evaluateClipAt,
  collectMergedKeyframes,
  applyEasing,
  poseDistinctness,
  timeMsToNormalized,
} from "../../../shared/src/gasper-animation";
export type { DomainScalarMap } from "../../../shared/src/gasper-animation";
