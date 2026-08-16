/**
 * Eight-state (+wake) visual language registry bound to character profiles.
 * projectStateVisual(stateId) → channels + ownership + identity stamp.
 */

import {
  EIGHT_STATE_HOLD_ORDER,
  EIGHT_STATE_VISUAL_ORDER,
  GASPER_STATE_PROFILES,
  getCharacterStateProfile,
  isEightStateVisualId,
  type CharacterChannelMap,
  type EightStateVisualId,
} from "../../../../shared/src/gasper/character";
import {
  enforceCharacterBodyAuthority,
  type AuthorityProjection,
} from "./characterBodyAuthority";
import type { CharacterPoseProjection } from "./types";

/** Stable FNV-1a style hash for channel maps (idempotency). */
export function hashChannels(channels: CharacterChannelMap): string {
  const keys = Object.keys(channels).sort();
  let h = 2166136261;
  for (const k of keys) {
    const v = channels[k];
    const s = `${k}:${typeof v === "number" ? v.toFixed(6) : String(v)}`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Project a character state visual into a full pose projection.
 */
export function projectStateVisual(
  stateId: string,
): CharacterPoseProjection | null {
  if (!isEightStateVisualId(stateId)) return null;
  const profile = getCharacterStateProfile(stateId);
  if (!profile) return null;

  const auth = enforceCharacterBodyAuthority(profile);
  return poseFromAuthority(auth);
}

function poseFromAuthority(auth: AuthorityProjection): CharacterPoseProjection {
  const { profile, channels, ownership, identityStamp } = auth;
  return {
    stateId: profile.stateId,
    label: profile.label,
    embodimentId: profile.embodimentId,
    expressionAffinity: profile.expressionAffinity,
    channels: { ...channels },
    ownership: { ...ownership },
    identityStamp: { ...identityStamp },
    layerActivations: { ...profile.layerActivations },
    visualSignature: {
      ...profile.visualSignature,
      domains: [...profile.visualSignature.domains],
      signatureChannels: [...profile.visualSignature.signatureChannels],
    },
    personalityRead: { ...profile.personalityRead },
    qualityFloorRef: "dormant-orbit-maintain",
    transitional: profile.transitional === true,
    channelHash: hashChannels(channels),
  };
}

/** Registry of all authored state visuals. */
export function listStateVisuals(): CharacterPoseProjection[] {
  return EIGHT_STATE_VISUAL_ORDER.map((id) => projectStateVisual(id)!).filter(
    Boolean,
  );
}

export function listHoldStateVisuals(): CharacterPoseProjection[] {
  return EIGHT_STATE_HOLD_ORDER.map((id) => projectStateVisual(id)!).filter(
    Boolean,
  );
}

/** Idempotent: same state twice yields identical channel hash. */
export function isProjectionIdempotent(stateId: string): boolean {
  const a = projectStateVisual(stateId);
  const b = projectStateVisual(stateId);
  if (!a || !b) return false;
  return a.channelHash === b.channelHash;
}

export function getStateVisualRegistry(): Record<
  EightStateVisualId,
  CharacterPoseProjection
> {
  const out = {} as Record<EightStateVisualId, CharacterPoseProjection>;
  for (const id of EIGHT_STATE_VISUAL_ORDER) {
    const p = projectStateVisual(id);
    if (p) out[id] = p;
  }
  return out;
}

/** True when state is in the character visual language. */
export function hasStateVisual(stateId: string): boolean {
  return isEightStateVisualId(stateId) && stateId in GASPER_STATE_PROFILES;
}

export { EIGHT_STATE_VISUAL_ORDER, EIGHT_STATE_HOLD_ORDER, isEightStateVisualId };
