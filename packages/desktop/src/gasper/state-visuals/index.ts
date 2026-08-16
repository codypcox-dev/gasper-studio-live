/**
 * Desktop Gasper state-visual language — character-governed eight-state projection.
 */

export type {
  CharacterPoseProjection,
  StateVisualApplyReport,
} from "./types";

export {
  enforceCharacterBodyAuthority,
  mergeCharacterWithEndpoint,
  CHARACTER_AUTHORITY_KEYS,
  REDUCED_MOTION_DAMPED_KEYS,
  reduceMotionChannels,
  resolveAuthorityForState,
} from "./characterBodyAuthority";
export type {
  AuthorityProjection,
  MergeCharacterOpts,
} from "./characterBodyAuthority";

export {
  projectStateVisual,
  listStateVisuals,
  listHoldStateVisuals,
  isProjectionIdempotent,
  getStateVisualRegistry,
  hasStateVisual,
  hashChannels,
  EIGHT_STATE_VISUAL_ORDER,
  EIGHT_STATE_HOLD_ORDER,
  isEightStateVisualId,
} from "./eightStateVisualLanguage";

export {
  applyCharacterStateVisual,
  projectAndMergeCharacterState,
  getLastCharacterApplyReport,
  resetCharacterApplySession,
  createCharacterApplySession,
  projectCharacterStateVisual,
  validateActiveCharacterIdentity,
} from "./applyCharacterState";
export type {
  ApplyCharacterStateOpts,
  CharacterApplySession,
} from "./applyCharacterState";
