/**
 * GASPER-UNIFIED-LIFE-001 — embodiment-aware life grammar.
 *
 * State envelopes describe what Gasper is doing; this packet describes how
 * each embodiment breathes, settles, and maintains itself while doing it.
 * It is pure and clock-fed: no RAF, timer, GSAP tween, DOM write, or random
 * source is allowed here.
 */
import { GASPER_EMBODIMENT_IDS } from "../GasperRigDefinition";
import {
  evaluateThreeBeatProgress,
  threeBeatFor,
} from "./motion-grammar";
import type {
  EightStateId,
  ThreeBeatProgress,
  ThreeBeatSpec,
} from "./types";
import type { DomainScalarMap } from "../GasperDomainState";

export type GasperEmbodimentLifeId =
  | "presence"
  | "singularity"
  | "dormant-orbit"
  | "wispwalker"
  | "comet"
  | "halo"
  | "lantern"
  | "low-orbit";

export type EmbodimentLifeDescriptor = Readonly<{
  profileId: GasperEmbodimentLifeId;
  /** Multiplies the authored state envelope without changing its phase order. */
  tempoScale: number;
  /** Bounded additive life amplitude for material/dynamics channels. */
  lifeGain: number;
  /** Slow phase offset keeps profiles from breathing in lockstep. */
  phaseOffset: number;
  /** Profile-specific active-rest emphasis. */
  restGain: number;
  dominantChannels: readonly string[];
}>;

export type EmbodimentLifeSample = Readonly<{
  profileId: GasperEmbodimentLifeId;
  stateId: EightStateId;
  progress: ThreeBeatProgress;
  activeRest: boolean;
  lifeSignal: number;
  restSignal: number;
  modulation: Readonly<Record<string, number>>;
}>;

const DESCRIPTORS: Readonly<
  Record<GasperEmbodimentLifeId, EmbodimentLifeDescriptor>
> = Object.freeze({
  presence: Object.freeze({
    profileId: "presence",
    tempoScale: 1,
    lifeGain: 0.72,
    phaseOffset: 0,
    restGain: 0.58,
    dominantChannels: Object.freeze(["energy_level", "internal_glow", "gaze"]),
  }),
  singularity: Object.freeze({
    profileId: "singularity",
    tempoScale: 0.68,
    lifeGain: 0.46,
    phaseOffset: 1.2,
    restGain: 0.86,
    dominantChannels: Object.freeze(["energy_lag", "internal_glow", "secondary_lag"]),
  }),
  "dormant-orbit": Object.freeze({
    profileId: "dormant-orbit",
    tempoScale: 1.35,
    lifeGain: 0.54,
    phaseOffset: 2.1,
    restGain: 1,
    dominantChannels: Object.freeze(["energy_lag", "relief_amplitude", "secondary_lag"]),
  }),
  wispwalker: Object.freeze({
    profileId: "wispwalker",
    tempoScale: 1.12,
    lifeGain: 0.82,
    phaseOffset: 2.8,
    restGain: 0.68,
    dominantChannels: Object.freeze(["rebound", "relief_amplitude", "gaze"]),
  }),
  comet: Object.freeze({
    profileId: "comet",
    tempoScale: 0.82,
    lifeGain: 0.92,
    phaseOffset: 3.5,
    restGain: 0.42,
    dominantChannels: Object.freeze(["energy_pulse", "rebound", "secondary_lag"]),
  }),
  halo: Object.freeze({
    profileId: "halo",
    tempoScale: 0.94,
    lifeGain: 0.66,
    phaseOffset: 4.2,
    restGain: 0.62,
    dominantChannels: Object.freeze(["internal_glow", "energy_lag", "gaze"]),
  }),
  lantern: Object.freeze({
    profileId: "lantern",
    tempoScale: 1.18,
    lifeGain: 0.76,
    phaseOffset: 4.9,
    restGain: 0.7,
    dominantChannels: Object.freeze(["internal_glow", "gaze", "secondary_lag"]),
  }),
  "low-orbit": Object.freeze({
    profileId: "low-orbit",
    tempoScale: 1.3,
    lifeGain: 0.6,
    phaseOffset: 5.6,
    restGain: 0.8,
    dominantChannels: Object.freeze(["rebound", "relief_amplitude", "energy_lag"]),
  }),
});

const KNOWN_IDS = new Set<string>(GASPER_EMBODIMENT_IDS);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveLifeId(profileId: string): GasperEmbodimentLifeId {
  return KNOWN_IDS.has(profileId) && profileId in DESCRIPTORS
    ? (profileId as GasperEmbodimentLifeId)
    : "presence";
}

export function getEmbodimentLifeDescriptor(
  profileId: string,
): EmbodimentLifeDescriptor {
  return DESCRIPTORS[resolveLifeId(profileId)];
}

/** Scale the canonical state envelope while retaining gather → peak → settle → hold. */
export function embodimentThreeBeatFor(
  profileId: string,
  stateId: EightStateId,
): ThreeBeatSpec {
  const descriptor = getEmbodimentLifeDescriptor(profileId);
  const base = threeBeatFor(stateId);
  const scale = descriptor.tempoScale;
  const dominantChannels = Object.freeze(
    Array.from(new Set([...base.dominantChannels, ...descriptor.dominantChannels])),
  );
  return Object.freeze({
    gatherSeconds: base.gatherSeconds * scale,
    peakSeconds: base.peakSeconds * scale,
    settleSeconds: base.settleSeconds * scale,
    holdSeconds: base.holdSeconds * scale,
    dominantChannels,
    phaseOffset: base.phaseOffset + descriptor.phaseOffset,
  });
}

function seedPhase(seed: number): number {
  return ((seed >>> 0) % 100000) / 100000 * Math.PI * 2;
}

/** Evaluate one profile/state life sample from organism time. */
export function evaluateEmbodimentLife(
  profileId: string,
  stateId: EightStateId,
  elapsedSeconds: number,
  seed: number,
  threeBeatOverride?: ThreeBeatSpec,
): EmbodimentLifeSample {
  const descriptor = getEmbodimentLifeDescriptor(profileId);
  const progress = evaluateThreeBeatProgress(
    threeBeatOverride ?? embodimentThreeBeatFor(descriptor.profileId, stateId),
    elapsedSeconds,
    { stateId, seed },
  );
  const wave =
    0.5 +
    0.5 *
      Math.sin(
        elapsedSeconds * (0.72 / descriptor.tempoScale) +
          descriptor.phaseOffset +
          seedPhase(seed),
      );
  const lifeSignal = clamp(
    progress.envelope * descriptor.lifeGain * (0.78 + wave * 0.22),
    0,
    1,
  );
  const activeRest = progress.phase === "hold" || stateId === "dormant-orbit-maintain";
  const restSignal = activeRest
    ? clamp((0.58 + wave * 0.42) * descriptor.restGain, 0, 1)
    : 0;
  const modulation = Object.freeze({
    energy_pulse: lifeSignal * (0.05 + descriptor.restGain * 0.025),
    internal_glow: lifeSignal * 0.035,
    energy_lag: lifeSignal * 0.04,
    secondary_lag: lifeSignal * 0.045,
    rebound: (lifeSignal - 0.5) * 0.08,
    relief_amplitude: restSignal * 0.08,
  });
  return Object.freeze({
    profileId: descriptor.profileId,
    stateId,
    progress,
    activeRest,
    lifeSignal,
    restSignal,
    modulation,
  });
}

/** Apply only bounded additive life channels; absent channels remain untouched. */
export function applyEmbodimentLifeToChannels(
  values: DomainScalarMap,
  sample: EmbodimentLifeSample,
): DomainScalarMap {
  const next = { ...values };
  for (const [key, delta] of Object.entries(sample.modulation)) {
    if (typeof next[key] !== "number" || !Number.isFinite(next[key])) continue;
    const min = key === "rebound" ? -1 : 0;
    const max = key === "rebound" ? 1 : 1;
    next[key] = clamp(next[key] + delta, min, max);
  }
  return next;
}
