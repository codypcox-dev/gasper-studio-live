/**
 * GASPER-FINISH-01 Task 5 — machine-readable three-beat contract.
 *
 * One authored `BeatSequence` (gather → peak → settle → moving hold) for every
 * eight-state route and every supported embodiment. This module is a pure
 * numeric evaluator: it owns no SVG writes, no timers, no RAF, and no GSAP
 * tweens. The production authorities (one clock, one compositor, one
 * living/facial authority, one projection writer) remain untouched by it.
 */

import type { DomainScalarMap } from "../GasperDomainState";
import type { EightStateId, BeatRestPolicy, ThreeBeatPhase } from "./types";
import { EIGHT_STATE_TARGETS } from "./state-targets";
import { threeBeatFor } from "./motion-grammar";
import { quinticMinimumJerk } from "../physics";
import { NO_BLACKOUT_FLOORS } from "../continuity/noBlackoutInvariant";
import {
  getEmbodimentLifeDescriptor,
  type GasperEmbodimentLifeId,
} from "./embodiment-life";
import { getEmbodimentProfile } from "../GasperRigDefinition";
import { evaluateMovingHold, type MovingHoldSample } from "./moving-hold";
import {
  evaluateMicrovariation,
  MICROVARIATION_KEYS,
} from "./microvariation";

/** Authored easing names only (power1/power2 family already in use). */
export const BEAT_EASINGS = [
  "power1.in",
  "power1.out",
  "power1.inOut",
  "power2.in",
  "power2.out",
  "power2.inOut",
  "power3.in",
  "power3.out",
  "power3.inOut",
  "back.out(1.2)",
  "quintic",
] as const;

export type BeatEasing = (typeof BEAT_EASINGS)[number];

export type BeatPhaseId = "gather" | "peak" | "settle";

export type FaceBeatResponse = Readonly<{
  floorFaceScale: number;
  floorEyeOpenness: number;
  floorFaceEmissive: number;
}>;

export type MaterialBeatResponse = Readonly<{
  floorEnergyLevel: number;
  floorInternalGlow: number;
  maxAmplitude: number;
}>;

export type MovingHoldPolicy = Readonly<{
  enabled: boolean;
  breathAmp: number;
  swayAmp: number;
  eyeLifeAmp: number;
  materialPhaseAmp: number;
  driftAmp: number;
  anchorRest: boolean;
}>;

export type BeatPhaseSpec = Readonly<{
  id: BeatPhaseId;
  durationMs: number;
  easing: BeatEasing;
  targets: Readonly<Record<string, number>>;
  face: FaceBeatResponse;
  material: MaterialBeatResponse;
  movingHold: MovingHoldPolicy;
}>;

export type InterruptionPolicy =
  | "velocity-retarget"
  | "smoothstep-crossfade"
  | "hard-cut";

export type BeatSequence = Readonly<{
  id: string;
  stateId: EightStateId;
  phases: readonly [BeatPhaseSpec, BeatPhaseSpec, BeatPhaseSpec];
  /** Post-settle moving-hold sustain in ms (0 = pure transition envelope). */
  holdMs: number;
  interruptionPolicy: InterruptionPolicy;
  restPolicy: BeatRestPolicy;
}>;

export type EmbodimentBeatDisposition =
  | BeatSequence
  | Readonly<{ supported: false; reason: string }>;

export type BeatPhaseSample = Readonly<{
  stateId: EightStateId;
  sequenceId: string;
  phase: ThreeBeatPhase;
  phaseProgress: number;
  envelope: number;
  elapsedMs: number;
  resolved: Readonly<Record<string, number>>;
  faceFloor: number;
  materialFloor: number;
  movingHold: MovingHoldSample;
}>;

const EPS = 1e-9;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** Phase easing authored per canonical state (Laban phrasing driven). */
export function beatPhaseEasing(
  stateId: EightStateId,
  phase: BeatPhaseId,
): BeatEasing {
  if (phase === "gather") {
    if (stateId === "presence-recognition-spark") return "power2.inOut";
    if (stateId === "presence-blocked-strain") return "power2.in";
    return "power1.in";
  }
  if (phase === "peak") {
    if (stateId === "presence-recognition-spark") return "back.out(1.2)";
    if (stateId === "presence-blocked-strain") return "power3.in";
    if (stateId === "presence-pleased-resolve") return "power1.out";
    return "power2.out";
  }
  if (stateId === "presence-recognition-spark") return "power1.inOut";
  if (stateId === "dormant-orbit-maintain") return "power2.inOut";
  return "power1.out";
}

/** Pure easing evaluation for the authored name set. */
export function easeBeat(easing: BeatEasing, progress: number): number {
  const t = clamp(progress, 0, 1);
  switch (easing) {
    case "power1.in":
      return t * t;
    case "power1.out":
      return 1 - (1 - t) * (1 - t);
    case "power1.inOut":
      return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
    case "power2.in":
      return t * t * t;
    case "power2.out":
      return 1 - (1 - t) * (1 - t) * (1 - t);
    case "power2.inOut":
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case "power3.in":
      return t * t * t * t;
    case "power3.out":
      return 1 - Math.pow(1 - t, 4);
    case "power3.inOut":
      return t < 0.5
        ? 8 * t * t * t * t
        : 1 - Math.pow(-2 * t + 2, 4) / 2;
    case "back.out(1.2)": {
      const c1 = 1.2;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    case "quintic":
      return quinticMinimumJerk(t);
  }
}

/**
 * Runtime validator. Rejects empty phases, non-finite targets, unknown easing
 * names, missing floors, and unenforced rest punctuation.
 */
export function validateBeatSequence(seq: BeatSequence): string[] {
  const issues: string[] = [];
  if (!seq || typeof seq.id !== "string" || seq.id.length === 0) {
    issues.push("sequence id missing");
  }
  if (!seq.stateId) issues.push("stateId missing");
  if (!Array.isArray(seq.phases) || seq.phases.length !== 3) {
    issues.push("phases must be [gather, peak, settle]");
    return issues;
  }
  const expected: BeatPhaseId[] = ["gather", "peak", "settle"];
  seq.phases.forEach((phase, i) => {
    if (!phase) {
      issues.push(`phase ${i} empty`);
      return;
    }
    if (phase.id !== expected[i]) {
      issues.push(`phase ${i} id ${phase.id} != ${expected[i]}`);
    }
    if (!Number.isFinite(phase.durationMs) || phase.durationMs <= 0) {
      issues.push(`phase ${i} durationMs invalid`);
    }
    if (!(BEAT_EASINGS as readonly string[]).includes(phase.easing)) {
      issues.push(`phase ${i} unknown easing ${phase.easing}`);
    }
    if (!phase.targets || Object.keys(phase.targets).length === 0) {
      issues.push(`phase ${i} empty targets`);
    } else {
      for (const [k, v] of Object.entries(phase.targets)) {
        if (typeof v !== "number" || !Number.isFinite(v)) {
          issues.push(`phase ${i} non-finite target ${k}`);
        }
      }
    }
    const faceOk =
      phase.face &&
      [phase.face.floorFaceScale, phase.face.floorEyeOpenness, phase.face.floorFaceEmissive]
        .every((v) => Number.isFinite(v) && v >= 0 && v <= 1);
    if (!faceOk) issues.push(`phase ${i} face floors invalid`);
    const materialOk =
      phase.material &&
      Number.isFinite(phase.material.floorEnergyLevel) &&
      Number.isFinite(phase.material.floorInternalGlow) &&
      Number.isFinite(phase.material.maxAmplitude) &&
      phase.material.floorEnergyLevel >= 0 &&
      phase.material.floorEnergyLevel <= 1 &&
      phase.material.floorInternalGlow >= 0 &&
      phase.material.floorInternalGlow <= 1 &&
      phase.material.maxAmplitude >= 0 &&
      phase.material.maxAmplitude <= 0.25;
    if (!materialOk) issues.push(`phase ${i} material floors invalid`);
    if (phase.movingHold) {
      for (const [k, v] of Object.entries(phase.movingHold)) {
        if (k === "enabled" || k === "anchorRest") continue;
        if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 0.25) {
          issues.push(`phase ${i} movingHold ${k} out of bounds`);
        }
      }
    }
  });
  if (!Number.isFinite(seq.holdMs) || seq.holdMs < 0) {
    issues.push("holdMs invalid");
  }
  if (
    seq.restPolicy &&
    seq.restPolicy.enforcePunctuation &&
    !(seq.restPolicy.postAccentRestMs > seq.restPolicy.preAccentGatherMs)
  ) {
    issues.push(
      "rest punctuation violated: postAccentRestMs must exceed preAccentGatherMs",
    );
  }
  return issues;
}

function beatModeFor(stateId: EightStateId): "ordinary" | "dormant" | "wake" {
  if (stateId === "wake") return "wake";
  if (stateId === "dormant-orbit-maintain") return "dormant";
  return "ordinary";
}

/** Channels that carry the readable accent and must settle with a visible dip. */
const ACCENT_DECAY_KEYS = new Set([
  "energy_level",
  "energy_pulse",
  "skin_tension",
  "internal_glow",
  "face_emissive",
  "rebound",
  "relief_amplitude",
]);

const GATHER_FACTOR = 0.6;
const SETTLE_HOLD_FACTOR = 0.88;
const SETTLE_ACCENT_FACTOR = 0.62;

/** Per-phase numeric targets derived from the canonical state endpoint. */
export function beatPhaseTargets(
  stateId: EightStateId,
  phase: BeatPhaseId,
): Readonly<Record<string, number>> {
  const full = EIGHT_STATE_TARGETS[stateId] ?? {};
  const neutral = EIGHT_STATE_TARGETS["presence-neutral-settled"] ?? {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(full)) {
    const base = neutral[k] ?? v;
    const factor =
      phase === "gather"
        ? GATHER_FACTOR
        : phase === "peak"
          ? 1
          : ACCENT_DECAY_KEYS.has(k)
            ? SETTLE_ACCENT_FACTOR
            : SETTLE_HOLD_FACTOR;
    out[k] = base + (v - base) * factor;
  }
  return Object.freeze(out);
}

const MOVING_HOLD_TUNING: Readonly<
  Record<EightStateId, Readonly<Omit<MovingHoldPolicy, "enabled" | "anchorRest">>>
> = Object.freeze({
  "presence-neutral-settled": Object.freeze({
    breathAmp: 0.014,
    swayAmp: 0.009,
    eyeLifeAmp: 0.011,
    materialPhaseAmp: 0.01,
    driftAmp: 0.006,
  }),
  "presence-listening-receive": Object.freeze({
    breathAmp: 0.012,
    swayAmp: 0.008,
    eyeLifeAmp: 0.012,
    materialPhaseAmp: 0.009,
    driftAmp: 0.005,
  }),
  "presence-thinking-knit": Object.freeze({
    breathAmp: 0.01,
    swayAmp: 0.007,
    eyeLifeAmp: 0.009,
    materialPhaseAmp: 0.011,
    driftAmp: 0.005,
  }),
  "presence-recognition-spark": Object.freeze({
    breathAmp: 0.02,
    swayAmp: 0.012,
    eyeLifeAmp: 0.016,
    materialPhaseAmp: 0.016,
    driftAmp: 0.009,
  }),
  "comet-executing-drive": Object.freeze({
    breathAmp: 0.016,
    swayAmp: 0.012,
    eyeLifeAmp: 0.01,
    materialPhaseAmp: 0.014,
    driftAmp: 0.008,
  }),
  "presence-blocked-strain": Object.freeze({
    breathAmp: 0.009,
    swayAmp: 0.006,
    eyeLifeAmp: 0.008,
    materialPhaseAmp: 0.008,
    driftAmp: 0.005,
  }),
  "presence-pleased-resolve": Object.freeze({
    breathAmp: 0.015,
    swayAmp: 0.011,
    eyeLifeAmp: 0.012,
    materialPhaseAmp: 0.012,
    driftAmp: 0.007,
  }),
  "dormant-orbit-maintain": Object.freeze({
    breathAmp: 0.008,
    swayAmp: 0.004,
    eyeLifeAmp: 0.004,
    materialPhaseAmp: 0.007,
    driftAmp: 0.004,
  }),
  wake: Object.freeze({
    breathAmp: 0.012,
    swayAmp: 0.009,
    eyeLifeAmp: 0.01,
    materialPhaseAmp: 0.012,
    driftAmp: 0.006,
  }),
});

function buildBeatSequence(stateId: EightStateId): BeatSequence {
  const spec = threeBeatFor(stateId);
  const mode = beatModeFor(stateId);
  const floors = NO_BLACKOUT_FLOORS[mode];
  const face: FaceBeatResponse = Object.freeze({
    floorFaceScale: floors.face_scale,
    floorEyeOpenness: floors.eye_openness,
    floorFaceEmissive: floors.face_emissive,
  });
  const material: MaterialBeatResponse = Object.freeze({
    floorEnergyLevel: floors.energy_level,
    floorInternalGlow: floors.internal_glow,
    maxAmplitude: 0.08,
  });
  const tuning = MOVING_HOLD_TUNING[stateId];
  const phases = (["gather", "peak", "settle"] as const).map((phaseId) => {
    const movingHold: MovingHoldPolicy =
      phaseId === "settle"
        ? Object.freeze({ enabled: true, anchorRest: true, ...tuning })
        : Object.freeze({
            enabled: false,
            anchorRest: true,
            breathAmp: 0,
            swayAmp: 0,
            eyeLifeAmp: 0,
            materialPhaseAmp: 0,
            driftAmp: 0,
          });
    return Object.freeze({
      id: phaseId,
      durationMs: Math.round(
        (phaseId === "gather"
          ? spec.gatherSeconds
          : phaseId === "peak"
            ? spec.peakSeconds
            : spec.settleSeconds) * 1000,
      ),
      easing: beatPhaseEasing(stateId, phaseId),
      targets: beatPhaseTargets(stateId, phaseId),
      face,
      material,
      movingHold,
    });
  }) as unknown as [BeatPhaseSpec, BeatPhaseSpec, BeatPhaseSpec];
  const holdMs = Math.round(spec.holdSeconds * 1000);
  const restPolicy: BeatRestPolicy = Object.freeze({
    preAccentGatherMs: phases[0].durationMs,
    postAccentRestMs: holdMs,
    enforcePunctuation: holdMs > 0,
    anchoredRest: true,
  });
  return Object.freeze({
    id: `beat:${stateId}`,
    stateId,
    phases,
    holdMs,
    interruptionPolicy: "velocity-retarget",
    restPolicy,
  });
}

/** Canonical three-beat sequences for every eight-state route + wake. */
export const THREE_BEAT_SEQUENCES: Readonly<
  Record<EightStateId, BeatSequence>
> = Object.freeze(
  Object.fromEntries(
    (Object.keys(EIGHT_STATE_TARGETS) as EightStateId[]).map((id) => [
      id,
      buildBeatSequence(id),
    ]),
  ) as Record<EightStateId, BeatSequence>,
);

export function beatSequenceFor(stateId: EightStateId): BeatSequence {
  return THREE_BEAT_SEQUENCES[stateId];
}

function applyBeatFloors(
  values: DomainScalarMap,
  face: FaceBeatResponse,
  material: MaterialBeatResponse,
): DomainScalarMap {
  const out: DomainScalarMap = { ...values };
  out.face_scale = clamp(
    Math.max(face.floorFaceScale, out.face_scale ?? 0),
    0,
    1.2,
  );
  out.eye_openness = clamp(
    Math.max(face.floorEyeOpenness, out.eye_openness ?? 0),
    0,
    1,
  );
  out.face_emissive = clamp(
    Math.max(face.floorFaceEmissive, out.face_emissive ?? 0),
    0,
    1,
  );
  out.energy_level = clamp(
    Math.max(material.floorEnergyLevel, out.energy_level ?? 0),
    0,
    1,
  );
  out.internal_glow = clamp(
    Math.max(material.floorInternalGlow, out.internal_glow ?? 0),
    0,
    1,
  );
  if (typeof out.overall_height === "number") {
    out.overall_height = clamp(out.overall_height, 0.9, 1.1);
  }
  if (typeof out.overall_width === "number") {
    out.overall_width = clamp(out.overall_width, 0.9, 1.1);
  }
  return out;
}

/**
 * Evaluate one beat sample from organism-clock elapsed ms. Pure: no writes,
 * no timers, no GSAP. Pass `initial` for a continuous trace; without it the
 * gather anchors to neutral.
 */
export function evaluateBeatSequence(
  seq: BeatSequence,
  elapsedMs: number,
  opts: {
    seed: number;
    reducedMotion?: boolean;
    microvariation?: boolean;
    initial?: Readonly<Record<string, number>>;
  },
): BeatPhaseSample {
  const t = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const g = seq.phases[0].durationMs;
  const p = seq.phases[1].durationMs;
  const s = seq.phases[2].durationMs;
  const hold = Math.max(0, seq.holdMs);
  let phase: ThreeBeatPhase;
  let phaseProgress: number;
  let envelope: number;
  if (t < g) {
    phase = "gather";
    phaseProgress = g > 0 ? Math.min(1, t / g) : 1;
    envelope = 0.5 * quinticMinimumJerk(phaseProgress);
  } else if (t < g + p) {
    phase = "peak";
    phaseProgress = p > 0 ? Math.min(1, (t - g) / p) : 1;
    envelope = 0.5 + 0.5 * quinticMinimumJerk(phaseProgress);
  } else if (t < g + p + s || hold <= 0) {
    phase = "settle";
    phaseProgress = s > 0 ? Math.min(1, (t - g - p) / s) : 1;
    envelope = 1 - 0.35 * quinticMinimumJerk(phaseProgress);
    if (hold <= 0 && t >= g + p + s) {
      phaseProgress = 1;
      envelope = 0.65;
    }
  } else {
    phase = "hold";
    phaseProgress = hold > 0 ? Math.min(1, (t - g - p - s) / hold) : 1;
    envelope = 0.65;
  }

  const phaseIndex = phase === "gather" ? 0 : phase === "peak" ? 1 : 2;
  const phaseSpec = seq.phases[phaseIndex]!;
  const eased = easeBeat(phaseSpec.easing, phaseProgress);
  const target = phaseSpec.targets;
  const anchor = opts.initial ?? EIGHT_STATE_TARGETS["presence-neutral-settled"];
  const resolvedRaw: DomainScalarMap = {};
  const keys = new Set([...Object.keys(anchor), ...Object.keys(target)]);
  for (const k of keys) {
    const a = anchor[k] ?? target[k] ?? 0;
    const v = target[k] ?? a;
    resolvedRaw[k] = a + (v - a) * eased;
  }

  const movingHold = evaluateMovingHold(seq, t, {
    seed: opts.seed,
    reducedMotion: opts.reducedMotion === true,
  });
  if (phase === "hold") {
    resolvedRaw.overall_height =
      (resolvedRaw.overall_height ?? 1) +
      movingHold.breath +
      movingHold.sway;
    resolvedRaw.overall_width =
      (resolvedRaw.overall_width ?? 1) -
      movingHold.breath * 0.6 +
      movingHold.sway * 0.7;
    resolvedRaw.eye_openness =
      (resolvedRaw.eye_openness ?? 0.5) + movingHold.eyeLife;
    resolvedRaw.internal_glow =
      (resolvedRaw.internal_glow ?? 0.5) + movingHold.materialPhase;
    resolvedRaw.relief_amplitude =
      (resolvedRaw.relief_amplitude ?? 0.5) + movingHold.drift;
    resolvedRaw.secondary_lag =
      (resolvedRaw.secondary_lag ?? 0.4) + movingHold.sway * 0.5;
  }

  if (opts.microvariation === true) {
    const micro = evaluateMicrovariation({
      seed: opts.seed,
      timeMs: t,
      reducedMotion: opts.reducedMotion === true,
    });
    for (const key of MICROVARIATION_KEYS) {
      const delta = micro[key] ?? 0;
      resolvedRaw[key] = (resolvedRaw[key] ?? 0.4) + delta;
    }
  }

  const resolved = applyBeatFloors(
    resolvedRaw,
    phaseSpec.face,
    phaseSpec.material,
  );
  return Object.freeze({
    stateId: seq.stateId,
    sequenceId: seq.id,
    phase,
    phaseProgress,
    envelope,
    elapsedMs: t,
    resolved: Object.freeze(resolved),
    faceFloor: phaseSpec.face.floorFaceScale,
    materialFloor: phaseSpec.material.floorEnergyLevel,
    movingHold,
  });
}

/** Deterministic trace of beat samples; `initial` carries continuity. */
export function evaluateBeatTrace(
  seq: BeatSequence,
  opts: {
    seed: number;
    dtMs?: number;
    durationMs?: number;
    sampleTimesMs?: readonly number[];
    reducedMotion?: boolean;
    microvariation?: boolean;
  },
): BeatPhaseSample[] {
  const dtMs = opts.dtMs ?? 1000 / 60;
  const total =
    opts.durationMs ??
    seq.phases.reduce((sum, ph) => sum + ph.durationMs, 0) + seq.holdMs;
  const times: number[] = [];
  if (opts.sampleTimesMs) {
    times.push(...opts.sampleTimesMs);
  } else {
    for (let t = 0; t <= total + EPS; t += dtMs) times.push(t);
  }
  let initial: Readonly<Record<string, number>> | undefined;
  const samples: BeatPhaseSample[] = [];
  for (const t of times) {
    const sample = evaluateBeatSequence(seq, t, {
      seed: opts.seed,
      reducedMotion: opts.reducedMotion === true,
      microvariation: opts.microvariation === true,
      initial,
    });
    samples.push(sample);
    initial = sample.resolved;
  }
  return samples;
}

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Deterministic trace hash (fixed rounding — byte-identical for same seed). */
export function beatTraceHash(trace: readonly BeatPhaseSample[]): string {
  const parts: string[] = [];
  for (const s of trace) {
    const keys = Object.keys(s.resolved).sort();
    const channels = keys
      .map((k) => `${k}=${Math.round((s.resolved[k] ?? 0) * 1e6)}`)
      .join(";");
    parts.push(
      `${s.phase}:${Math.round(s.phaseProgress * 1e6)}:${Math.round(
        s.envelope * 1e6,
      )}:${channels}:${Math.round(s.movingHold.drift * 1e9)}`,
    );
  }
  return fnv1a(parts.join("|"));
}

/**
 * Embodiment-aware beat sequence. Every supported profile gets the same
 * three-beat contract; unknown/endpoint-only profiles return an explicit
 * unsupported disposition — never a silent fallback.
 */
export function embodimentBeatSequenceFor(
  profileId: string,
  stateId: EightStateId,
): EmbodimentBeatDisposition {
  const profile = getEmbodimentProfile(profileId);
  if (!profile) {
    return Object.freeze({
      supported: false as const,
      reason: `unsupported-embodiment:${profileId}`,
    });
  }
  const base = THREE_BEAT_SEQUENCES[stateId];
  if (!base) {
    return Object.freeze({
      supported: false as const,
      reason: `unsupported-state:${stateId}`,
    });
  }
  const descriptor = getEmbodimentLifeDescriptor(profileId);
  const scale = descriptor.tempoScale;
  const gain = descriptor.lifeGain;
  const phases = base.phases.map((ph) => {
    const mh: MovingHoldPolicy = Object.freeze({
      ...ph.movingHold,
      breathAmp: round4(ph.movingHold.breathAmp * (0.75 + gain * 0.45)),
      swayAmp: round4(ph.movingHold.swayAmp * (0.75 + gain * 0.45)),
      eyeLifeAmp: round4(ph.movingHold.eyeLifeAmp * (0.75 + gain * 0.45)),
      materialPhaseAmp: round4(
        ph.movingHold.materialPhaseAmp * (0.75 + gain * 0.45),
      ),
      driftAmp: round4(ph.movingHold.driftAmp * (0.75 + gain * 0.45)),
    });
    return Object.freeze({
      ...ph,
      id: ph.id as BeatPhaseId,
      durationMs: Math.max(1, Math.round(ph.durationMs * scale)),
      movingHold: mh,
    });
  }) as unknown as [BeatPhaseSpec, BeatPhaseSpec, BeatPhaseSpec];
  return Object.freeze({
    ...base,
    id: `${profileId}:${stateId}`,
    phases,
    holdMs: Math.max(0, Math.round(base.holdMs * scale)),
  });
}

/** True when the profile is a supported embodiment in the canonical registry. */
export function isSupportedEmbodiment(profileId: string): boolean {
  return getEmbodimentProfile(profileId) !== null;
}

export type { GasperEmbodimentLifeId };
