/**
 * Shared Gasper character contract — coherent one-body identity across states.
 * Import path: packages/shared/src/gasper/character (fence-local; not root gasper index).
 */

export type {
  CharacterChannelMap,
  EightStateVisualId,
  EightStateHoldVisualId,
  CharacterLayer,
  LayerOwner,
  SilhouetteSpec,
  VolumeSpec,
  CenterOfMassSpec,
  FacialAttachmentSpec,
  ShellEnergyHierarchy,
  MaterialSpec,
  PaletteSpec,
  PersonalitySpec,
  CharacterInvariant,
  VisualSignature,
  LayerActivations,
  SilhouetteDelta,
  VolumePolicy,
  StateCenterOfMass,
  StateFacialAttachment,
  MaterialMods,
  PaletteMods,
  PersonalityRead,
  CharacterStateProfile,
  CharacterValidationFailure,
  CharacterValidationResult,
  IdentityFingerprint,
  IdentityDriftReport,
} from "./types";

export {
  GASPER_CHARACTER_INVARIANTS,
  SHELL_CONTOUR_CHANNELS,
  ENERGY_INTERNAL_CHANNELS,
  FACE_FEATURE_CHANNELS,
  MOTION_DYNAMIC_CHANNELS,
  CHARACTER_BODY_CHANNELS,
  THEATRICAL_OVERLAY_KEYS,
} from "./invariants";

export {
  measureIdentityFingerprint,
  fingerprintFromProfile,
  homeIdentityFingerprint,
  IDENTITY_DRIFT_THRESHOLDS,
  measureIdentityDrift,
  assertNoIdentityDrift,
  pairwiseIdentityDrift,
  respectsQualityFloor,
  enforceCharacterInvariants,
  assertStructuredFieldChannelSync,
} from "./identity";

export {
  LAYER_OWNERSHIP_MAP,
  ownerForChannel,
  channelsOwnedBy,
  detectDisconnectedOwnership,
  ownershipForChannels,
  assertLayerOwnership,
  stripTheatricalOverlayKeys,
  stripDisconnectedOverlayKeys,
} from "./layerOwnership";

export {
  GASPER_STATE_PROFILES,
  EIGHT_STATE_VISUAL_ORDER,
  EIGHT_STATE_HOLD_ORDER,
  REQUIRED_PROFILE_CHANNEL_KEYS,
  getCharacterStateProfile,
  listCharacterStateProfiles,
  listHoldStateProfiles,
  isEightStateVisualId,
  getDormantQualityFloor,
  getNeutralProfile,
  channelsForState,
} from "./stateProfiles";

export {
  MIN_STATE_SEPARATION,
  REQUIRED_DISTINCT_DOMAINS,
  stateSignatureVector,
  stateSignatureDistance,
  pairwiseStateDistinctness,
  isProfileComplete,
  assertSemanticLegibility,
  assertAllProfilesComplete,
  allHoldStatesDistinct,
} from "./distinctness";
export type { PairDistinctness } from "./distinctness";

export {
  validateCharacterProfile,
  validateAllStateProfiles,
  assertNoIdentityDriftFor,
  assertLayerOwnershipValidation,
  assertSemanticLegibilityValidation,
  assertPairSignatureLegible,
  makeIncompleteProfile,
  makeDisconnectedOwnershipClaims,
  makeIdentityDriftChannels,
  makeIllegibleDuplicateSignature,
  makeTheatricalOverlayProfile,
  makeFloatingAttachmentProfile,
  makeQualityFloorViolationProfile,
  makeLowShellActivationProfile,
  makeFieldChannelDesyncProfile,
  identityStampFor,
  characterCatalogHealthy,
  driftBetweenStates,
} from "./validate";
