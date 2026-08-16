/**
 * GASPER-TASK-005A — explicit embodiment × canonical state contract.
 *
 * This is the pure matrix seam between the eight authored profile registry and
 * the R4 eight-state behavior contract. It gives every pair a finite channel
 * target, canonical three-beat envelope, and material-space projection record.
 * Morphology route execution remains owned by the morphology/runtime packets.
 */
import {
  GASPER_EMBODIMENT_IDS,
  getEmbodimentProfile,
  profileToDomainBindings,
  type GasperEmbodimentProfile,
} from "../GasperRigDefinition";
import { channelTargetFor } from "./state-targets";
import { embodimentThreeBeatFor } from "./embodiment-life";
import type { EightStateId, GasperChannelTargetV1, ThreeBeatSpec } from "./types";

export const EMBODIMENT_STATE_MATRIX_STATE_IDS: readonly EightStateId[] = Object.freeze([
  "presence-neutral-settled",
  "presence-listening-receive",
  "presence-thinking-knit",
  "presence-recognition-spark",
  "comet-executing-drive",
  "presence-blocked-strain",
  "presence-pleased-resolve",
  "dormant-orbit-maintain",
  "wake",
]);

export type EmbodimentStateCompatibilityMode =
  | "native"
  | "dormant-adapted"
  | "ground-adapted"
  | "wake-recovery";

export type EmbodimentStateTarget = Readonly<{
  key: string;
  profileId: string;
  stateId: EightStateId;
  profile: GasperEmbodimentProfile;
  profileBindings: Readonly<Record<string, number>>;
  target: GasperChannelTargetV1;
  /** Profile-aware life grammar; target.threeBeat remains the state compatibility alias. */
  life: ThreeBeatSpec;
  compatibility: Readonly<{
    mode: EmbodimentStateCompatibilityMode;
    explicit: true;
  }>;
  projection: Readonly<{
    coordinateSpace: "material";
    clock: "VEC-401";
    geometryModel: GasperEmbodimentProfile["geometryModel"];
    sx: number;
    sy: number;
    cx: number;
    cy: number;
    face: boolean;
  }>;
}>;

/** Explicit profile-family compatibility policy for the matrix packet. */
const PROFILE_COMPATIBILITY: Readonly<
  Record<string, Exclude<EmbodimentStateCompatibilityMode, "wake-recovery">>
> = Object.freeze({
  presence: "native",
  singularity: "dormant-adapted",
  "dormant-orbit": "dormant-adapted",
  wispwalker: "native",
  comet: "native",
  halo: "native",
  lantern: "native",
  "low-orbit": "ground-adapted",
});

function compatibilityMode(
  profileId: string,
  stateId: EightStateId,
): EmbodimentStateCompatibilityMode {
  if (stateId === "wake") return "wake-recovery";
  return PROFILE_COMPATIBILITY[profileId] ?? "native";
}

function buildEmbodimentStateTarget(
  profileId: string,
  stateId: EightStateId,
): EmbodimentStateTarget | null {
  const profile = getEmbodimentProfile(profileId);
  if (!profile) return null;

  const target = channelTargetFor(stateId);
  const profileBindings = Object.freeze({ ...profileToDomainBindings(profile) });
  const compatibility = Object.freeze({
    mode: compatibilityMode(profileId, stateId),
    explicit: true as const,
  });
  const projection = Object.freeze({
    coordinateSpace: "material" as const,
    clock: "VEC-401" as const,
    geometryModel: profile.geometryModel,
    sx: profile.sx,
    sy: profile.sy,
    cx: profile.cx,
    cy: profile.cy,
    face: profile.face,
  });

  return Object.freeze({
    key: `${profileId}:${stateId}`,
    profileId,
    stateId,
    profile,
    profileBindings,
    target,
    life: embodimentThreeBeatFor(profileId, stateId),
    compatibility,
    projection,
  });
}

const EMBODIMENT_STATE_TARGETS: readonly EmbodimentStateTarget[] = Object.freeze(
  GASPER_EMBODIMENT_IDS.flatMap((profileId) =>
    EMBODIMENT_STATE_MATRIX_STATE_IDS.flatMap((stateId) => {
      const entry = buildEmbodimentStateTarget(profileId, stateId);
      return entry ? [entry] : [];
    }),
  ),
);

const EMBODIMENT_STATE_TARGETS_BY_KEY: Readonly<
  Record<string, EmbodimentStateTarget>
> = Object.freeze(
  Object.fromEntries(EMBODIMENT_STATE_TARGETS.map((entry) => [entry.key, entry])),
);

export function listEmbodimentStateTargets(): readonly EmbodimentStateTarget[] {
  return EMBODIMENT_STATE_TARGETS;
}

export function getEmbodimentStateTarget(
  profileId: string,
  stateId: EightStateId,
): EmbodimentStateTarget | null {
  return EMBODIMENT_STATE_TARGETS_BY_KEY[`${profileId}:${stateId}`] ?? null;
}
