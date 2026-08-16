/**
 * Character body authority — enforce shell/energy/face/motion hierarchy.
 * Strip theatrical overlay keys; attach face via character facial attachment;
 * hold identity stamp. Character authority keys win on merge; reduced-motion
 * damping is preserved when requested.
 */

import {
  GASPER_CHARACTER_INVARIANTS,
  assertNoIdentityDrift,
  fingerprintFromProfile,
  getCharacterStateProfile,
  ownershipForChannels,
  stripTheatricalOverlayKeys,
  type CharacterChannelMap,
  type CharacterStateProfile,
  type IdentityFingerprint,
  type LayerOwner,
} from "../../../../shared/src/gasper/character";
import {
  attachmentResiduals,
  featuresAttached,
} from "../../../../shared/src/gasper/facial";

export type AuthorityProjection = {
  channels: CharacterChannelMap;
  ownership: Record<string, LayerOwner>;
  identityStamp: IdentityFingerprint;
  strippedKeys: string[];
  attachmentOk: boolean;
  identityOk: boolean;
  profile: CharacterStateProfile;
};

/**
 * Identity + body keys character authority always owns (invariants win).
 * Used explicitly by mergeCharacterWithEndpoint.
 */
export const CHARACTER_AUTHORITY_KEYS = [
  "overall_width",
  "overall_height",
  "crown_height",
  "lower_body_fullness",
  "ground_flattening",
  "center_of_mass_y",
  "face_scale",
  "eye_openness",
  "eye_spacing",
  "gaze",
  "mouth_openness",
  "mouth_width",
  "corner_pull_l",
  "corner_pull_r",
  "energy_level",
  "energy_pulse",
  "energy_lag",
  "energy_occlusion",
  "internal_glow",
  "face_emissive",
  "pearl_intensity",
  "skin_tension",
  "skin_damping",
  "skin_coupling",
  "relief_amplitude",
  "relief_motion_coupling",
  "relief_energy_coupling",
  "inertia",
  "settling",
  "rebound",
  "secondary_lag",
  "motion",
  "rim",
  "key_intensity",
  "key_direction",
  "roughness",
  "clearcoat",
  "absorption",
] as const;

/**
 * Keys damped under reduced-motion (mirrors GasperExpressionProjector.reduceMotionFrom).
 * When reducedMotion is set, endpoint (already damped) wins these keys after character merge.
 */
export const REDUCED_MOTION_DAMPED_KEYS = [
  "energy_pulse",
  "rebound",
  "motion",
  "relief_motion_coupling",
  "inertia",
  "settling",
  "overall_height",
  "crown_height",
] as const;

/**
 * Apply reduced-motion damping caps to a channel map (same law as endpoint reduceMotionFrom).
 */
export function reduceMotionChannels(
  channels: CharacterChannelMap,
): CharacterChannelMap {
  const damped: CharacterChannelMap = { ...channels };
  if (typeof damped.energy_pulse === "number") {
    damped.energy_pulse = Math.min(damped.energy_pulse, 0.12);
  }
  if (typeof damped.rebound === "number") {
    damped.rebound = Math.min(damped.rebound, 0.12);
  }
  if (typeof damped.motion === "number") {
    damped.motion = Math.min(damped.motion, 0.2);
  }
  if (typeof damped.relief_motion_coupling === "number") {
    damped.relief_motion_coupling = Math.min(
      damped.relief_motion_coupling,
      0.2,
    );
  }
  if (typeof damped.inertia === "number") {
    damped.inertia = Math.max(damped.inertia, 0.45);
  }
  if (typeof damped.settling === "number") {
    damped.settling = Math.max(damped.settling, 0.55);
  }
  if (typeof damped.overall_height === "number" && damped.overall_height > 1.04) {
    damped.overall_height = 1.02;
  }
  if (typeof damped.crown_height === "number" && damped.crown_height > 0.1) {
    damped.crown_height = Math.min(damped.crown_height, 0.08);
  }
  return damped;
}

/**
 * Enforce character hierarchy on a profile's channels.
 */
export function enforceCharacterBodyAuthority(
  profile: CharacterStateProfile,
): AuthorityProjection {
  const beforeKeys = Object.keys(profile.channels);
  const stripped = stripTheatricalOverlayKeys(profile.channels);
  const strippedKeys = beforeKeys.filter((k) => !(k in stripped));

  if (typeof stripped.center_of_mass_y !== "number") {
    stripped.center_of_mass_y = profile.centerOfMass.y;
  }

  const residuals = attachmentResiduals(stripped);
  const attachmentOk = featuresAttached(
    stripped,
    undefined,
    GASPER_CHARACTER_INVARIANTS.facialAttachment.maxAttachmentError,
    residuals,
  );

  if (typeof stripped.face_scale !== "number") {
    stripped.face_scale = profile.facialAttachment.faceScale;
  }

  const ownership = ownershipForChannels(stripped);
  const identityStamp = fingerprintFromProfile({
    ...profile,
    channels: stripped,
  });
  const identityOk = assertNoIdentityDrift({
    ...profile,
    channels: stripped,
  }).ok;

  return {
    channels: stripped,
    ownership,
    identityStamp,
    strippedKeys,
    attachmentOk,
    identityOk,
    profile,
  };
}

export type MergeCharacterOpts = {
  /**
   * When true: after character authority merge, re-apply reduced-motion damping
   * and prefer damped endpoint values on REDUCED_MOTION_DAMPED_KEYS so character
   * full-state channels cannot defeat reduced-motion caps.
   */
  reducedMotion?: boolean;
};

/**
 * Merge character-governed channels with endpoint channels.
 *
 * 1. Endpoint base (theatrical stripped)
 * 2. Character wins explicitly on CHARACTER_AUTHORITY_KEYS
 * 3. If reducedMotion: damped endpoint wins on REDUCED_MOTION_DAMPED_KEYS,
 *    then reduceMotionChannels ensures caps hold even if endpoint omitted a key
 */
export function mergeCharacterWithEndpoint(
  characterChannels: CharacterChannelMap,
  endpointChannels: CharacterChannelMap,
  opts?: MergeCharacterOpts,
): CharacterChannelMap {
  const ep = stripTheatricalOverlayKeys(endpointChannels);
  const ch = stripTheatricalOverlayKeys(characterChannels);

  // Endpoint non-authority keys + character authority keys (explicit list).
  const merged: CharacterChannelMap = { ...ep };
  for (const k of CHARACTER_AUTHORITY_KEYS) {
    if (typeof ch[k] === "number" && Number.isFinite(ch[k])) {
      merged[k] = ch[k]!;
    }
  }
  // Also take any extra character keys not in authority list (e.g. spectral_energy).
  for (const [k, v] of Object.entries(ch)) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    if ((CHARACTER_AUTHORITY_KEYS as readonly string[]).includes(k)) continue;
    // Don't overwrite pure endpoint passthrough unless character authored it.
    merged[k] = v;
  }

  if (opts?.reducedMotion) {
    // Prefer endpoint's already-damped values on damped key set.
    for (const k of REDUCED_MOTION_DAMPED_KEYS) {
      if (typeof ep[k] === "number" && Number.isFinite(ep[k])) {
        merged[k] = ep[k]!;
      }
    }
    // Hard-cap so character cannot reintroduce bounce peaks.
    return reduceMotionChannels(merged);
  }

  return stripTheatricalOverlayKeys(merged);
}

/**
 * Resolve profile + enforce authority for a state id.
 */
export function resolveAuthorityForState(
  stateId: string,
): AuthorityProjection | null {
  const profile = getCharacterStateProfile(stateId);
  if (!profile) return null;
  return enforceCharacterBodyAuthority(profile);
}
