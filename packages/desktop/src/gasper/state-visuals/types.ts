/**
 * Desktop state-visual types — character pose projection reports.
 */

import type {
  CharacterChannelMap,
  CharacterStateProfile,
  EightStateVisualId,
  IdentityFingerprint,
  LayerOwner,
} from "../../../../shared/src/gasper/character";

/** Projected character pose ready for mixer / endpoint merge. */
export type CharacterPoseProjection = {
  stateId: EightStateVisualId;
  label: string;
  embodimentId: string;
  expressionAffinity: string;
  channels: CharacterChannelMap;
  ownership: Record<string, LayerOwner>;
  identityStamp: IdentityFingerprint;
  layerActivations: CharacterStateProfile["layerActivations"];
  visualSignature: CharacterStateProfile["visualSignature"];
  personalityRead: CharacterStateProfile["personalityRead"];
  qualityFloorRef: "dormant-orbit-maintain";
  transitional: boolean;
  /** Deterministic content hash of channels for idempotency. */
  channelHash: string;
};

/** Report from applying a character state visual. */
export type StateVisualApplyReport = {
  ok: boolean;
  stateId: string;
  projection: CharacterPoseProjection | null;
  /** Channels after character authority merge. */
  mergedChannels: CharacterChannelMap;
  /** Keys stripped as disconnected overlays. */
  strippedKeys: string[];
  identityOk: boolean;
  idempotent: boolean;
  error?: string;
  revision: number;
};
