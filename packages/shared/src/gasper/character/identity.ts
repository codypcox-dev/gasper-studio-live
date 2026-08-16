/**
 * Identity fingerprint + drift measurement.
 * Rejects silhouette/volume/CoM/palette/material divergence beyond thresholds.
 */

import { GASPER_CHARACTER_INVARIANTS } from "./invariants";
import type {
  CharacterChannelMap,
  CharacterStateProfile,
  IdentityDriftReport,
  IdentityFingerprint,
} from "./types";

function num(v: number | undefined, d: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : d;
}

function quantize(n: number, places = 6): number {
  if (!Number.isFinite(n)) return 0;
  const p = 10 ** places;
  return Math.round(n * p) / p;
}

/**
 * Measure identity fingerprint from a channel map.
 * Uses invariant homes when channels omit identity fields.
 */
export function measureIdentityFingerprint(
  channels: CharacterChannelMap,
  comX = 0,
): IdentityFingerprint {
  const inv = GASPER_CHARACTER_INVARIANTS;
  const w = num(channels.overall_width, inv.silhouette.widthHome);
  const h = num(channels.overall_height, inv.silhouette.heightHome);
  const comY = num(channels.center_of_mass_y, inv.centerOfMass.homeY);
  return {
    silhouette: {
      width: quantize(w),
      height: quantize(h),
      aspect: quantize(h > 1e-9 ? w / h : 1),
    },
    volume: quantize(w * h),
    centerOfMass: { x: quantize(comX), y: quantize(comY) },
    material: {
      pearl: quantize(num(channels.pearl_intensity, inv.material.pearlIntensityHome)),
      roughness: quantize(num(channels.roughness, inv.material.roughnessHome)),
      clearcoat: quantize(num(channels.clearcoat, inv.material.clearcoatHome)),
    },
    palette: {
      rim: quantize(num(channels.rim, inv.palette.rimHome)),
      glow: quantize(num(channels.internal_glow, inv.palette.internalGlowHome)),
      emissive: quantize(num(channels.face_emissive, inv.palette.faceEmissiveHome)),
    },
    attachment: {
      faceScale: quantize(num(channels.face_scale, 1)),
      residualBudget: inv.facialAttachment.maxAttachmentError,
    },
  };
}

/** Fingerprint from a full state profile (uses profile CoM). */
export function fingerprintFromProfile(
  profile: CharacterStateProfile,
): IdentityFingerprint {
  return measureIdentityFingerprint(profile.channels, profile.centerOfMass.x);
}

/** Home identity fingerprint from invariants (Neutral / identity rest). */
export function homeIdentityFingerprint(): IdentityFingerprint {
  const inv = GASPER_CHARACTER_INVARIANTS;
  return {
    silhouette: {
      width: inv.silhouette.widthHome,
      height: inv.silhouette.heightHome,
      aspect: 1,
    },
    volume: inv.silhouette.widthHome * inv.silhouette.heightHome,
    centerOfMass: {
      x: inv.centerOfMass.homeX,
      y: inv.centerOfMass.homeY,
    },
    material: {
      pearl: inv.material.pearlIntensityHome,
      roughness: inv.material.roughnessHome,
      clearcoat: inv.material.clearcoatHome,
    },
    palette: {
      rim: inv.palette.rimHome,
      glow: inv.palette.internalGlowHome,
      emissive: inv.palette.faceEmissiveHome,
    },
    attachment: {
      faceScale: 1,
      residualBudget: inv.facialAttachment.maxAttachmentError,
    },
  };
}

/**
 * Drift thresholds aligned with GASPER_CHARACTER_INVARIANTS.
 * Silhouette / CoM use invariant max deltas; volume uses area band half-span;
 * material uses pearl family span; palette allows pairwise state-signature travel
 * up to ~2× maxPaletteDelta (glow is a primary signature domain).
 */
export const IDENTITY_DRIFT_THRESHOLDS = Object.freeze({
  silhouette: Math.max(
    GASPER_CHARACTER_INVARIANTS.silhouette.maxWidthDelta,
    GASPER_CHARACTER_INVARIANTS.silhouette.maxHeightDelta,
  ) + 0.06, // 0.18 — small headroom for aspect contribution
  volume:
    (GASPER_CHARACTER_INVARIANTS.volume.areaMax -
      GASPER_CHARACTER_INVARIANTS.volume.areaMin) /
    1.6, // ~0.225
  com: GASPER_CHARACTER_INVARIANTS.centerOfMass.maxTravel + 0.02, // 0.12
  material:
    GASPER_CHARACTER_INVARIANTS.material.pearlIntensityMax -
    GASPER_CHARACTER_INVARIANTS.material.pearlIntensityMin +
    0.04, // ~0.32
  /**
   * Palette (glow/emissive/rim) is a primary state-signature domain.
   * Pairwise travel may exceed home maxPaletteDelta; stay under character-break.
   */
  palette: GASPER_CHARACTER_INVARIANTS.palette.maxPaletteDelta * 1.75, // 0.56
});

function l2pair(a: number, b: number): number {
  const d = a - b;
  return Math.abs(d);
}

/**
 * Measure identity drift between two fingerprints.
 * Rejects when any domain exceeds thresholds.
 */
export function measureIdentityDrift(
  from: IdentityFingerprint,
  to: IdentityFingerprint,
  fromLabel = "from",
  toLabel = "to",
  thresholds = IDENTITY_DRIFT_THRESHOLDS,
): IdentityDriftReport {
  const silhouetteDrift = Math.max(
    l2pair(from.silhouette.width, to.silhouette.width),
    l2pair(from.silhouette.height, to.silhouette.height),
    l2pair(from.silhouette.aspect, to.silhouette.aspect) * 0.5,
  );
  const volumeDrift = l2pair(from.volume, to.volume);
  const comDrift = Math.hypot(
    from.centerOfMass.x - to.centerOfMass.x,
    from.centerOfMass.y - to.centerOfMass.y,
  );
  const materialDrift = Math.max(
    l2pair(from.material.pearl, to.material.pearl),
    l2pair(from.material.roughness, to.material.roughness),
    l2pair(from.material.clearcoat, to.material.clearcoat),
  );
  const paletteDrift = Math.max(
    l2pair(from.palette.rim, to.palette.rim),
    l2pair(from.palette.glow, to.palette.glow),
    l2pair(from.palette.emissive, to.palette.emissive),
  );

  const violations: string[] = [];
  if (silhouetteDrift > thresholds.silhouette) {
    violations.push(
      `silhouette drift ${silhouetteDrift.toFixed(4)} > ${thresholds.silhouette}`,
    );
  }
  if (volumeDrift > thresholds.volume) {
    violations.push(
      `volume drift ${volumeDrift.toFixed(4)} > ${thresholds.volume}`,
    );
  }
  if (comDrift > thresholds.com) {
    violations.push(`com drift ${comDrift.toFixed(4)} > ${thresholds.com}`);
  }
  if (materialDrift > thresholds.material) {
    violations.push(
      `material drift ${materialDrift.toFixed(4)} > ${thresholds.material}`,
    );
  }
  if (paletteDrift > thresholds.palette) {
    violations.push(
      `palette drift ${paletteDrift.toFixed(4)} > ${thresholds.palette}`,
    );
  }

  return {
    ok: violations.length === 0,
    from: fromLabel,
    to: toLabel,
    silhouetteDrift: quantize(silhouetteDrift),
    volumeDrift: quantize(volumeDrift),
    comDrift: quantize(comDrift),
    materialDrift: quantize(materialDrift),
    paletteDrift: quantize(paletteDrift),
    maxAllowed: { ...thresholds },
    violations,
  };
}

/**
 * Assert profile stays within identity thresholds vs home fingerprint.
 */
export function assertNoIdentityDrift(
  profile: CharacterStateProfile,
  reference: IdentityFingerprint = homeIdentityFingerprint(),
): IdentityDriftReport {
  const fp = fingerprintFromProfile(profile);
  return measureIdentityDrift(
    reference,
    fp,
    "identity-home",
    profile.stateId,
  );
}

/**
 * Pairwise identity drift across all profiles (must all remain same character).
 */
export function pairwiseIdentityDrift(
  profiles: readonly CharacterStateProfile[],
): {
  ok: boolean;
  pairs: IdentityDriftReport[];
} {
  const pairs: IdentityDriftReport[] = [];
  let ok = true;
  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      const a = profiles[i]!;
      const b = profiles[j]!;
      const report = measureIdentityDrift(
        fingerprintFromProfile(a),
        fingerprintFromProfile(b),
        a.stateId,
        b.stateId,
      );
      pairs.push(report);
      if (!report.ok) ok = false;
    }
  }
  return { ok, pairs };
}

/**
 * Quality floor: dormant identity fields other states must not violate.
 * Other states may be more expressive, but must preserve silhouette family,
 * material family, and attachment lattice rules that dormant conserves.
 */
export function respectsQualityFloor(
  profile: CharacterStateProfile,
  floor: CharacterStateProfile,
): { ok: boolean; violations: string[] } {
  const inv = GASPER_CHARACTER_INVARIANTS;
  const violations: string[] = [];
  const w = num(profile.channels.overall_width, 1);
  const h = num(profile.channels.overall_height, 1);
  const area = w * h;

  if (area < inv.volume.areaMin || area > inv.volume.areaMax) {
    violations.push(`area ${area.toFixed(4)} outside identity band`);
  }
  if (
    Math.abs(w - inv.silhouette.widthHome) > inv.silhouette.maxWidthDelta
  ) {
    violations.push(`width delta exceeds silhouette max`);
  }
  if (
    Math.abs(h - inv.silhouette.heightHome) > inv.silhouette.maxHeightDelta
  ) {
    violations.push(`height delta exceeds silhouette max`);
  }
  // Material family: pearl intensity must stay in character band.
  const pearl = num(
    profile.channels.pearl_intensity,
    inv.material.pearlIntensityHome,
  );
  if (
    pearl < inv.material.pearlIntensityMin ||
    pearl > inv.material.pearlIntensityMax
  ) {
    violations.push(`pearl intensity ${pearl} outside material family`);
  }
  // Attachment must remain non-floating.
  if (!profile.facialAttachment.attached) {
    violations.push("facial attachment not attached");
  }
  if (profile.facialAttachment.latticeId !== floor.facialAttachment.latticeId) {
    violations.push("attachment lattice diverged from quality floor");
  }
  if (profile.qualityFloorRef !== "dormant-orbit-maintain") {
    violations.push("qualityFloorRef must be dormant-orbit-maintain");
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Enforce GASPER_CHARACTER_INVARIANTS fields directly on a profile.
 * Complements drift thresholds with hard silhouette/aspect/crown/ground/CoM/palette checks.
 */
export function enforceCharacterInvariants(
  profile: CharacterStateProfile,
): { ok: boolean; violations: string[] } {
  const inv = GASPER_CHARACTER_INVARIANTS;
  const violations: string[] = [];
  const w = num(profile.channels.overall_width, inv.silhouette.widthHome);
  const h = num(profile.channels.overall_height, inv.silhouette.heightHome);
  const aspect = h > 1e-9 ? w / h : 1;
  const crown = num(profile.channels.crown_height, 0);
  const ground = num(profile.channels.ground_flattening, 0);
  const comY = num(
    profile.channels.center_of_mass_y,
    profile.centerOfMass.y,
  );
  const comX = profile.centerOfMass.x;
  const area = w * h;

  if (Math.abs(w - inv.silhouette.widthHome) > inv.silhouette.maxWidthDelta) {
    violations.push(
      `width ${w} exceeds maxWidthDelta ${inv.silhouette.maxWidthDelta}`,
    );
  }
  if (Math.abs(h - inv.silhouette.heightHome) > inv.silhouette.maxHeightDelta) {
    violations.push(
      `height ${h} exceeds maxHeightDelta ${inv.silhouette.maxHeightDelta}`,
    );
  }
  if (aspect < inv.silhouette.aspectMin || aspect > inv.silhouette.aspectMax) {
    violations.push(
      `aspect ${aspect.toFixed(4)} outside [${inv.silhouette.aspectMin}, ${inv.silhouette.aspectMax}]`,
    );
  }
  if (crown > inv.silhouette.crownMax) {
    violations.push(`crown ${crown} > crownMax ${inv.silhouette.crownMax}`);
  }
  if (ground > inv.silhouette.groundFlattenMax) {
    violations.push(
      `ground ${ground} > groundFlattenMax ${inv.silhouette.groundFlattenMax}`,
    );
  }
  if (area < inv.volume.areaMin || area > inv.volume.areaMax) {
    violations.push(`area ${area.toFixed(4)} outside volume band`);
  }
  // Dormant quality floor uses tighter residual area band.
  if (profile.stateId === "dormant-orbit-maintain") {
    if (area < inv.volume.floorAreaMin || area > inv.volume.floorAreaMax) {
      violations.push(
        `dormant area ${area.toFixed(4)} outside floor band [${inv.volume.floorAreaMin}, ${inv.volume.floorAreaMax}]`,
      );
    }
  }
  const comTravel = Math.hypot(
    comX - inv.centerOfMass.homeX,
    comY - inv.centerOfMass.homeY,
  );
  if (comTravel > inv.centerOfMass.maxTravel) {
    violations.push(
      `com travel ${comTravel.toFixed(4)} > maxTravel ${inv.centerOfMass.maxTravel}`,
    );
  }
  // CoM x has no runtime channel — must stay at home (no phantom DOF).
  if (Math.abs(comX - inv.centerOfMass.homeX) > 1e-9) {
    violations.push(
      `centerOfMass.x ${comX} must be ${inv.centerOfMass.homeX} (no center_of_mass_x channel)`,
    );
  }

  const pearl = num(
    profile.channels.pearl_intensity,
    inv.material.pearlIntensityHome,
  );
  if (
    pearl < inv.material.pearlIntensityMin ||
    pearl > inv.material.pearlIntensityMax
  ) {
    violations.push(`pearl ${pearl} outside material family`);
  }

  // Palette vs home — maxPaletteDelta per channel.
  const paletteChecks: Array<[string, number, number]> = [
    ["rim", num(profile.channels.rim, inv.palette.rimHome), inv.palette.rimHome],
    [
      "internal_glow",
      num(profile.channels.internal_glow, inv.palette.internalGlowHome),
      inv.palette.internalGlowHome,
    ],
    [
      "face_emissive",
      num(profile.channels.face_emissive, inv.palette.faceEmissiveHome),
      inv.palette.faceEmissiveHome,
    ],
    [
      "key_intensity",
      num(profile.channels.key_intensity, inv.palette.keyIntensityHome),
      inv.palette.keyIntensityHome,
    ],
  ];
  for (const [name, val, home] of paletteChecks) {
    if (Math.abs(val - home) > inv.palette.maxPaletteDelta + 1e-9) {
      violations.push(
        `palette ${name} delta ${Math.abs(val - home).toFixed(4)} > maxPaletteDelta ${inv.palette.maxPaletteDelta}`,
      );
    }
  }

  return { ok: violations.length === 0, violations };
}

const SYNC_EPS = 1e-4;

/**
 * Cross-check structured profile fields match channel values within epsilon.
 */
export function assertStructuredFieldChannelSync(
  profile: CharacterStateProfile,
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const ch = profile.channels;
  const near = (a: number, b: number) => Math.abs(a - b) <= SYNC_EPS;

  if (!near(num(ch.face_scale, 1), profile.facialAttachment.faceScale)) {
    violations.push(
      `facialAttachment.faceScale ${profile.facialAttachment.faceScale} ≠ channels.face_scale ${ch.face_scale}`,
    );
  }
  if (!near(num(ch.eye_openness, 0), profile.facialAttachment.eyeOpenness)) {
    violations.push(
      `facialAttachment.eyeOpenness ${profile.facialAttachment.eyeOpenness} ≠ channels.eye_openness ${ch.eye_openness}`,
    );
  }
  if (
    !near(num(ch.mouth_openness, 0), profile.facialAttachment.mouthOpenness)
  ) {
    violations.push(
      `facialAttachment.mouthOpenness ${profile.facialAttachment.mouthOpenness} ≠ channels.mouth_openness ${ch.mouth_openness}`,
    );
  }
  if (
    !near(num(ch.pearl_intensity, 0), profile.materialMods.pearlIntensity)
  ) {
    violations.push(
      `materialMods.pearlIntensity ${profile.materialMods.pearlIntensity} ≠ channels.pearl_intensity ${ch.pearl_intensity}`,
    );
  }
  if (!near(num(ch.roughness, 0), profile.materialMods.roughness)) {
    violations.push(
      `materialMods.roughness desync from channels.roughness`,
    );
  }
  if (!near(num(ch.clearcoat, 0), profile.materialMods.clearcoat)) {
    violations.push(`materialMods.clearcoat desync from channels.clearcoat`);
  }
  if (!near(num(ch.absorption, 0), profile.materialMods.absorption)) {
    violations.push(`materialMods.absorption desync from channels.absorption`);
  }
  if (!near(num(ch.rim, 0), profile.paletteMods.rim)) {
    violations.push(`paletteMods.rim desync from channels.rim`);
  }
  if (!near(num(ch.key_intensity, 0), profile.paletteMods.keyIntensity)) {
    violations.push(
      `paletteMods.keyIntensity desync from channels.key_intensity`,
    );
  }
  if (!near(num(ch.internal_glow, 0), profile.paletteMods.internalGlow)) {
    violations.push(
      `paletteMods.internalGlow desync from channels.internal_glow`,
    );
  }
  if (!near(num(ch.face_emissive, 0), profile.paletteMods.faceEmissive)) {
    violations.push(
      `paletteMods.faceEmissive desync from channels.face_emissive`,
    );
  }
  if (!near(num(ch.center_of_mass_y, 0), profile.centerOfMass.y)) {
    violations.push(
      `centerOfMass.y ${profile.centerOfMass.y} ≠ channels.center_of_mass_y ${ch.center_of_mass_y}`,
    );
  }
  const area =
    num(ch.overall_width, 1) * num(ch.overall_height, 1);
  if (!near(area, profile.volumePolicy.areaTarget)) {
    violations.push(
      `volumePolicy.areaTarget ${profile.volumePolicy.areaTarget} ≠ w*h ${area.toFixed(4)}`,
    );
  }
  // Silhouette delta consistency with home
  const inv = GASPER_CHARACTER_INVARIANTS;
  if (
    !near(
      num(ch.overall_width, 1) - inv.silhouette.widthHome,
      profile.silhouetteDelta.width,
    )
  ) {
    violations.push(`silhouetteDelta.width desync from overall_width`);
  }
  if (
    !near(
      num(ch.overall_height, 1) - inv.silhouette.heightHome,
      profile.silhouetteDelta.height,
    )
  ) {
    violations.push(`silhouetteDelta.height desync from overall_height`);
  }

  return { ok: violations.length === 0, violations };
}
