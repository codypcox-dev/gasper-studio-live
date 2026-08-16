/**
 * Character validation — incomplete / disconnected / illegible / drift REJECT.
 */

import {
  assertNoIdentityDrift,
  assertStructuredFieldChannelSync,
  enforceCharacterInvariants,
  fingerprintFromProfile,
  measureIdentityDrift,
  pairwiseIdentityDrift,
  respectsQualityFloor,
} from "./identity";
import { GASPER_CHARACTER_INVARIANTS, THEATRICAL_OVERLAY_KEYS } from "./invariants";
import { assertLayerOwnership } from "./layerOwnership";
import {
  assertAllProfilesComplete,
  assertSemanticLegibility,
  isProfileComplete,
  MIN_STATE_SEPARATION,
  stateSignatureDistance,
} from "./distinctness";
import {
  EIGHT_STATE_VISUAL_ORDER,
  GASPER_STATE_PROFILES,
  getCharacterStateProfile,
  getDormantQualityFloor,
  getNeutralProfile,
  listCharacterStateProfiles,
} from "./stateProfiles";
import type {
  CharacterChannelMap,
  CharacterStateProfile,
  CharacterValidationFailure,
  CharacterValidationResult,
  EightStateVisualId,
} from "./types";

function result(failures: CharacterValidationFailure[]): CharacterValidationResult {
  return { ok: failures.length === 0, failures };
}

function cloneProfile(base: CharacterStateProfile): CharacterStateProfile {
  return {
    ...base,
    channels: { ...base.channels },
    personalityRead: { ...base.personalityRead },
    visualSignature: {
      ...base.visualSignature,
      domains: [...base.visualSignature.domains],
      signatureChannels: [...base.visualSignature.signatureChannels],
    },
    layerActivations: { ...base.layerActivations },
    silhouetteDelta: { ...base.silhouetteDelta },
    volumePolicy: { ...base.volumePolicy },
    centerOfMass: { ...base.centerOfMass },
    facialAttachment: { ...base.facialAttachment },
    materialMods: { ...base.materialMods },
    paletteMods: { ...base.paletteMods },
  };
}

/**
 * Validate a single character state profile.
 */
export function validateCharacterProfile(
  profile: CharacterStateProfile | null | undefined,
): CharacterValidationResult {
  const failures: CharacterValidationFailure[] = [];

  if (!profile) {
    return result([
      {
        code: "incomplete_profile",
        message: "profile is null or undefined",
      },
    ]);
  }

  const complete = isProfileComplete(profile);
  if (!complete.ok) {
    failures.push({
      code: "incomplete_profile",
      stateId: profile.stateId,
      message: `incomplete profile: missing ${complete.missing.join(", ")}`,
      details: { missing: complete.missing },
    });
  }

  // Layer ownership
  failures.push(...assertLayerOwnership(profile));

  // Theatrical overlays
  for (const k of Object.keys(profile.channels)) {
    const lower = k.toLowerCase();
    if (
      THEATRICAL_OVERLAY_KEYS.some(
        (t) => lower === t || lower.startsWith(`${t}_`) || lower.endsWith(`_${t}`),
      )
    ) {
      failures.push({
        code: "theatrical_overlay",
        stateId: profile.stateId,
        message: `theatrical overlay key: ${k}`,
      });
    }
  }

  // Attachment not floating
  if (!profile.facialAttachment?.attached) {
    failures.push({
      code: "floating_attachment",
      stateId: profile.stateId,
      message: "facial attachment must be attached (not floating)",
    });
  }
  if (
    profile.facialAttachment &&
    profile.facialAttachment.residualBudget >
      GASPER_CHARACTER_INVARIANTS.facialAttachment.maxAttachmentError + 1e-9
  ) {
    failures.push({
      code: "floating_attachment",
      stateId: profile.stateId,
      message: `residualBudget ${profile.facialAttachment.residualBudget} exceeds max attachment error`,
    });
  }

  // Identity drift vs home
  const drift = assertNoIdentityDrift(profile);
  if (!drift.ok) {
    failures.push({
      code: "identity_drift",
      stateId: profile.stateId,
      message: `identity drift: ${drift.violations.join("; ")}`,
      details: {
        silhouetteDrift: drift.silhouetteDrift,
        volumeDrift: drift.volumeDrift,
        comDrift: drift.comDrift,
        materialDrift: drift.materialDrift,
        paletteDrift: drift.paletteDrift,
      },
    });
  }

  // Direct invariant field enforcement
  const invCheck = enforceCharacterInvariants(profile);
  if (!invCheck.ok) {
    failures.push({
      code: "identity_drift",
      stateId: profile.stateId,
      message: `invariant violation: ${invCheck.violations.join("; ")}`,
      details: { violations: invCheck.violations },
    });
  }

  // Structured field ↔ channel sync
  const sync = assertStructuredFieldChannelSync(profile);
  if (!sync.ok) {
    failures.push({
      code: "incomplete_profile",
      stateId: profile.stateId,
      message: `field/channel desync: ${sync.violations.join("; ")}`,
      details: { violations: sync.violations },
    });
  }

  // Quality floor respect
  const floor = getDormantQualityFloor();
  const floorCheck = respectsQualityFloor(profile, floor);
  if (!floorCheck.ok) {
    failures.push({
      code: "quality_floor_violation",
      stateId: profile.stateId,
      message: `quality floor violation: ${floorCheck.violations.join("; ")}`,
      details: { violations: floorCheck.violations },
    });
  }

  return result(failures);
}

/**
 * Validate all authored state profiles (eight + wake).
 */
export function validateAllStateProfiles(): CharacterValidationResult {
  const failures: CharacterValidationFailure[] = [];

  failures.push(...assertAllProfilesComplete());
  failures.push(...assertSemanticLegibility(MIN_STATE_SEPARATION));

  for (const id of EIGHT_STATE_VISUAL_ORDER) {
    const p = GASPER_STATE_PROFILES[id];
    const r = validateCharacterProfile(p);
    for (const f of r.failures) {
      if (
        f.code === "incomplete_profile" &&
        failures.some(
          (x) => x.code === "incomplete_profile" && x.stateId === id,
        )
      ) {
        continue;
      }
      failures.push(f);
    }
  }

  // Pairwise identity: all states remain same character.
  const identityPairs = pairwiseIdentityDrift(listCharacterStateProfiles());
  for (const pair of identityPairs.pairs) {
    if (!pair.ok) {
      failures.push({
        code: "identity_drift",
        stateId: pair.to,
        message: `pairwise identity drift ${pair.from} → ${pair.to}: ${pair.violations.join("; ")}`,
        details: {
          from: pair.from,
          to: pair.to,
          silhouetteDrift: pair.silhouetteDrift,
          volumeDrift: pair.volumeDrift,
        },
      });
    }
  }

  // Neutral personality readable
  const neutral = getNeutralProfile();
  const pr = neutral.personalityRead;
  if (
    pr.friendly < 0.5 ||
    pr.intelligent < 0.5 ||
    pr.slightlyUpToSomething < 0.3
  ) {
    failures.push({
      code: "illegible_semantics",
      stateId: "presence-neutral-settled",
      message:
        "Neutral personality must encode friendly/intelligent/slightly-up-to-something",
      details: { personalityRead: pr },
    });
  }
  const summary = (pr.summary || "").toLowerCase();
  if (
    !summary.includes("friendly") ||
    !summary.includes("intelligent") ||
    !summary.includes("up-to-something")
  ) {
    failures.push({
      code: "illegible_semantics",
      stateId: "presence-neutral-settled",
      message:
        "Neutral summary must read friendly / intelligent / slightly-up-to-something",
    });
  }

  // Dormant is quality floor
  const dormant = getDormantQualityFloor();
  if (dormant.stateId !== "dormant-orbit-maintain") {
    failures.push({
      code: "quality_floor_violation",
      message: "quality floor must be dormant-orbit-maintain",
    });
  }
  if (dormant.qualityFloorRef !== "dormant-orbit-maintain") {
    failures.push({
      code: "quality_floor_violation",
      stateId: dormant.stateId,
      message: "dormant profile qualityFloorRef mismatch",
    });
  }

  return result(failures);
}

/** Assert no identity drift for a named state (or all). */
export function assertNoIdentityDriftFor(
  stateId?: string,
): CharacterValidationResult {
  if (stateId) {
    const p = getCharacterStateProfile(stateId);
    if (!p) {
      return result([
        {
          code: "unknown_state",
          stateId,
          message: `unknown state: ${stateId}`,
        },
      ]);
    }
    const drift = assertNoIdentityDrift(p);
    if (!drift.ok) {
      return result([
        {
          code: "identity_drift",
          stateId: p.stateId,
          message: drift.violations.join("; "),
          details: { ...drift },
        },
      ]);
    }
    return result([]);
  }

  const failures: CharacterValidationFailure[] = [];
  for (const id of EIGHT_STATE_VISUAL_ORDER) {
    const drift = assertNoIdentityDrift(GASPER_STATE_PROFILES[id]);
    if (!drift.ok) {
      failures.push({
        code: "identity_drift",
        stateId: id,
        message: drift.violations.join("; "),
      });
    }
  }
  return result(failures);
}

/** Re-export assertLayerOwnership as structured validation. */
export function assertLayerOwnershipValidation(
  profile: CharacterStateProfile,
): CharacterValidationResult {
  return result(assertLayerOwnership(profile));
}

/** Re-export semantic legibility as structured validation. */
export function assertSemanticLegibilityValidation(
  minDistance: number = MIN_STATE_SEPARATION,
): CharacterValidationResult {
  return result(assertSemanticLegibility(minDistance));
}

/**
 * Pairwise signature legibility for arbitrary channel maps (adversarial tests).
 * Returns illegible_semantics failure when distance < minDistance.
 */
export function assertPairSignatureLegible(
  a: CharacterChannelMap,
  b: CharacterChannelMap,
  aId = "a",
  bId = "b",
  minDistance: number = MIN_STATE_SEPARATION,
): CharacterValidationResult {
  const d = stateSignatureDistance(a, b);
  if (d < minDistance) {
    return result([
      {
        code: "illegible_semantics",
        stateId: aId,
        message: `pair ${aId} ↔ ${bId} not multi-domain distinct (d=${d.toFixed(4)} < ${minDistance})`,
        details: { a: aId, b: bId, distance: d, minDistance },
      },
    ]);
  }
  return result([]);
}

/**
 * Build an incomplete profile (for adversarial tests) by stripping required fields.
 */
export function makeIncompleteProfile(
  base: CharacterStateProfile = getNeutralProfile(),
): CharacterStateProfile {
  const clone = cloneProfile(base);
  delete clone.channels.overall_width;
  delete clone.channels.energy_level;
  delete clone.channels.eye_openness;
  delete clone.channels.motion;
  return clone;
}

/**
 * Build a disconnected-ownership channel claim bag for adversarial tests.
 */
export function makeDisconnectedOwnershipClaims(): Partial<
  Record<string, "shell" | "energy" | "face" | "motion">
> {
  return {
    overall_width: "energy", // energy claiming contour — forbidden
    energy_level: "shell", // shell claiming energy — forbidden
    eye_openness: "energy", // energy claiming face — floating overlay
    inertia: "shell", // shell claiming motion — forbidden
    face_scale: "shell", // shell claiming face — forbidden
  };
}

/**
 * Build an identity-drifted channel map (breaks silhouette/material).
 */
export function makeIdentityDriftChannels(
  base: CharacterStateProfile = getNeutralProfile(),
): CharacterStateProfile {
  const clone = cloneProfile(base);
  clone.channels = {
    ...clone.channels,
    overall_width: 1.5,
    overall_height: 0.5,
    pearl_intensity: 0.05,
    center_of_mass_y: 0.5,
  };
  clone.centerOfMass = { x: 0.4, y: 0.5 };
  clone.materialMods = { ...clone.materialMods, pearlIntensity: 0.05 };
  return clone;
}

/**
 * Near-duplicate signature of base — fails multi-domain distinctness vs base.
 * Used to prove illegible_semantics REJECT path (not theater).
 */
export function makeIllegibleDuplicateSignature(
  base: CharacterStateProfile = getNeutralProfile(),
): CharacterChannelMap {
  const ch = { ...base.channels };
  // Micro-noise only — distance stays far below MIN_STATE_SEPARATION.
  if (typeof ch.eye_openness === "number") ch.eye_openness += 0.002;
  if (typeof ch.energy_level === "number") ch.energy_level += 0.001;
  if (typeof ch.motion === "number") ch.motion += 0.001;
  return ch;
}

/**
 * Profile with theatrical overlay keys — fails theatrical_overlay.
 */
export function makeTheatricalOverlayProfile(
  base: CharacterStateProfile = getNeutralProfile(),
): CharacterStateProfile {
  const clone = cloneProfile(base);
  clone.channels = {
    ...clone.channels,
    icon: 1,
    badge_id: 1,
    emote_icon: 1,
  };
  return clone;
}

/**
 * Profile with floating attachment — fails floating_attachment.
 */
export function makeFloatingAttachmentProfile(
  base: CharacterStateProfile = getNeutralProfile(),
): CharacterStateProfile {
  const clone = cloneProfile(base);
  clone.facialAttachment = {
    ...clone.facialAttachment,
    attached: true as true,
    residualBudget: 0.5, // exceeds maxAttachmentError 0.05
  };
  // TypeScript requires attached:true; force floating via residual + cast for true float
  (clone.facialAttachment as { attached: boolean }).attached = false;
  return clone;
}

/**
 * Profile that violates quality floor (wrong ref / material family break).
 */
export function makeQualityFloorViolationProfile(
  base: CharacterStateProfile = getNeutralProfile(),
): CharacterStateProfile {
  const clone = cloneProfile(base);
  clone.qualityFloorRef = "dormant-orbit-maintain";
  clone.channels = {
    ...clone.channels,
    pearl_intensity: 0.05, // outside material family
    overall_width: 1.5,
  };
  clone.materialMods = { ...clone.materialMods, pearlIntensity: 0.05 };
  // Force wrong floor ref via mutation after type check
  (clone as { qualityFloorRef: string }).qualityFloorRef = "not-a-floor";
  return clone;
}

/**
 * Profile with shell activation below floor — disconnected_layer_ownership.
 */
export function makeLowShellActivationProfile(
  base: CharacterStateProfile = getNeutralProfile(),
): CharacterStateProfile {
  const clone = cloneProfile(base);
  clone.layerActivations = { ...clone.layerActivations, shell: 0.05 };
  return clone;
}

/**
 * Profile with structured field desync from channels.
 */
export function makeFieldChannelDesyncProfile(
  base: CharacterStateProfile = getNeutralProfile(),
): CharacterStateProfile {
  const clone = cloneProfile(base);
  clone.facialAttachment = {
    ...clone.facialAttachment,
    faceScale: 0.5, // channels still have face_scale ~1
  };
  clone.materialMods = {
    ...clone.materialMods,
    pearlIntensity: 0.11,
  };
  return clone;
}

/**
 * Identity stamp for a projected state — used by desktop runtime.
 */
export function identityStampFor(
  stateId: EightStateVisualId | string,
): {
  stateId: string;
  fingerprint: ReturnType<typeof fingerprintFromProfile> | null;
  ok: boolean;
} {
  const p = getCharacterStateProfile(stateId);
  if (!p) return { stateId, fingerprint: null, ok: false };
  return {
    stateId: p.stateId,
    fingerprint: fingerprintFromProfile(p),
    ok: true,
  };
}

/**
 * Quick health check: full catalog valid.
 */
export function characterCatalogHealthy(): boolean {
  return validateAllStateProfiles().ok;
}

/** Drift between two named states. */
export function driftBetweenStates(
  aId: string,
  bId: string,
): ReturnType<typeof measureIdentityDrift> | null {
  const a = getCharacterStateProfile(aId);
  const b = getCharacterStateProfile(bId);
  if (!a || !b) return null;
  return measureIdentityDrift(
    fingerprintFromProfile(a),
    fingerprintFromProfile(b),
    aId,
    bId,
  );
}
