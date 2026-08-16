/**
 * VEC-601 / VEC-602 — single temporal authority for Gasper's living motion
 * and facial continuum.
 *
 * This module owns no RAF, timer, GSAP tween, DOM node, or SVG write. It is
 * evaluated synchronously from the one organism clock and returns numeric
 * channels for the canonical compositor / production projector.
 */

import type { DomainScalarMap } from "../GasperDomainState";
import type { OrganismClockFrame } from "../clock";
import {
  FACE_ONLY_CHANNELS,
  FacialBodyContinuum,
  type ContinuumSnapshot,
} from "../facial/FacialBodyContinuum";
import { policyFor } from "../eight-state-loop/schedulers";
import {
  EIGHT_STATE_TARGETS,
  projectReducedMotion,
} from "../eight-state-loop/state-targets";
import { SHORT_TO_CANONICAL } from "../eight-state-loop/ir-targets";
import type { EightStateId } from "../eight-state-loop/types";
import {
  decodeUnifiedAudioFrame,
  evaluateUnifiedAudioFrame,
  evaluateUnifiedFieldFrame,
  evaluateUnifiedLightProjection,
  validateUnifiedFieldFrame,
  advanceDisposition,
  createDisposition,
  evaluateDispositionSample,
  GasperIntentSpringBank,
  type GasperUnifiedAudioFrame,
  type GasperUnifiedFieldFrame,
  type DispositionSample,
  type UnifiedEmotionId,
  type UnifiedLightSample,
  type IntentSpringBankState,
} from "../physics";

export const FACIAL_TEMPORAL_BINDINGS = new Set<string>([
  ...FACE_ONLY_CHANNELS,
  // Legacy fixture aliases retained until VEC-701 projection convergence.
  "face_emissive",
  "brow_inner_l",
  "brow_inner_r",
  "brow_outer_l",
  "brow_outer_r",
  "brow_height",
  "upper_lid_tension",
  "lower_lid_tension",
  "cheek_raise",
  "nose_scrunch",
  "jaw_drop",
  "lip_press",
  "lip_pucker",
]);

export type LivingFacialOwner =
  | "facial_continuum"
  | "state_target"
  | "blink"
  | "saccade"
  | "living_authority";

export type LivingFacialAuthorityOptions = {
  seed?: number;
  reducedMotion?: boolean;
};

export type LivingFacialStateOptions = {
  durationSeconds?: number;
  interrupt?: boolean;
  timeMs?: number;
};

export type LivingFacialSnapshot = {
  authorityId: "gasper-living-facial-authority";
  packet: "VEC-602";
  running: boolean;
  stateId: EightStateId;
  timeMs: number;
  frameIndex: number;
  revision: number;
  reducedMotion: boolean;
  values: DomainScalarMap;
  ownership: Record<string, LivingFacialOwner>;
  breath: number;
  blinkPhase: number;
  blinkActive: boolean;
  gaze: number;
  saccadeActive: boolean;
  facial: ContinuumSnapshot;
  unified: GasperUnifiedFieldFrame;
  unifiedViolations: readonly string[];
  audio: GasperUnifiedAudioFrame;
  intentSprings: IntentSpringBankState;
  disposition: DispositionSample;
  light: UnifiedLightSample;
  hash: string;
};

type BlinkEvent = {
  startMs: number;
  closeMs: number;
  openMs: number;
};

type SaccadeEvent = {
  startMs: number;
  outboundMs: number;
  returnMs: number;
  from: number;
  target: number;
  center: number;
};

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function q(value: number, digits = 4): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function smoothstep01(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

function targetForState(stateId: EightStateId): string {
  const canonicalStateId = (SHORT_TO_CANONICAL[stateId] ?? stateId) as EightStateId;
  switch (canonicalStateId) {
    case "presence-listening-receive":
      return "listening";
    case "presence-thinking-knit":
      return "thinking";
    case "presence-recognition-spark":
    case "comet-executing-drive":
      return "recognition";
    case "presence-blocked-strain":
      return "blocked";
    case "presence-pleased-resolve":
      return "pleased";
    case "dormant-orbit-maintain":
      return "neutral-settled";
    case "wake":
      return "listening";
    case "presence-neutral-settled":
    default:
      return "neutral-settled";
  }
}

function emotionForState(stateId: EightStateId): UnifiedEmotionId {
  switch (stateId) {
    case "presence-listening-receive":
      return "curiosity";
    case "presence-thinking-knit":
      return "curiosity";
    case "presence-recognition-spark":
      return "surprise";
    case "comet-executing-drive":
      return "joy";
    case "presence-blocked-strain":
      return "blocked";
    case "presence-pleased-resolve":
      return "joy";
    case "dormant-orbit-maintain":
      return "contentment";
    case "wake":
      return "surprise";
    case "presence-neutral-settled":
    default:
      return "contentment";
  }
}

function policyForState(stateId: EightStateId) {
  return (
    policyFor(stateId) ??
    policyFor(SHORT_TO_CANONICAL[stateId] as EightStateId) ??
    policyFor("presence-neutral-settled")
  );
}

function fnvHash(values: DomainScalarMap, revision: number): string {
  let hash = 2166136261 >>> 0;
  const entries = Object.entries(values).sort(([a], [b]) => a.localeCompare(b));
  for (const [key, value] of entries) {
    for (let i = 0; i < key.length; i += 1) {
      hash = Math.imul(hash ^ key.charCodeAt(i), 16777619) >>> 0;
    }
    const quantized = Math.round(value * 1_000_000);
    hash = Math.imul(hash ^ (quantized & 0xff), 16777619) >>> 0;
    hash = Math.imul(hash ^ ((quantized >>> 8) & 0xff), 16777619) >>> 0;
  }
  hash = Math.imul(hash ^ (revision & 0xffff), 16777619) >>> 0;
  return hash.toString(16).padStart(8, "0");
}

export class GasperLivingFacialAuthority {
  readonly authorityId = "gasper-living-facial-authority" as const;
  readonly packet = "VEC-602" as const;

  private running = false;
  private stateId: EightStateId = "presence-neutral-settled";
  private reducedMotion = false;
  private seed = 1007;
  private rng = mulberry32(this.seed);
  private facial = new FacialBodyContinuum();
  private initializedFacial = false;
  private nextBlinkAtMs = Number.POSITIVE_INFINITY;
  private nextSaccadeAtMs = Number.POSITIVE_INFINITY;
  private blinkEvent: BlinkEvent | null = null;
  private saccadeEvent: SaccadeEvent | null = null;
  private lastTimeMs = 0;
  private revision = 0;
  private lastSnapshot: LivingFacialSnapshot | null = null;
  private readonly intentSprings = new GasperIntentSpringBank();
  private disposition = createDisposition(1007);

  configure(options: LivingFacialAuthorityOptions = {}): void {
    if (typeof options.seed === "number" && Number.isFinite(options.seed)) {
      this.seed = options.seed >>> 0;
      this.rng = mulberry32(this.seed);
    }
    this.reducedMotion = options.reducedMotion === true;
  }

  start(
    stateId: EightStateId = this.stateId,
    timeMs = this.lastTimeMs,
  ): void {
    this.running = true;
    this.lastTimeMs = Math.max(0, timeMs);
    this.stateId = stateId;
    this.blinkEvent = null;
    this.saccadeEvent = null;
    const facialTarget = targetForState(stateId);
    if (!this.initializedFacial) {
      this.facial = new FacialBodyContinuum();
      this.facial.setTarget({ targetId: facialTarget, totalFrames: 16 });
      for (let i = 0; i < 16; i += 1) this.facial.step(1 / 60);
      this.initializedFacial = true;
    } else {
      this.facial.setTarget({ targetId: facialTarget, totalFrames: 16 });
    }
    this.armBlink(this.lastTimeMs);
    this.armSaccade(this.lastTimeMs);
  }

  stop(): void {
    this.running = false;
    this.blinkEvent = null;
    this.saccadeEvent = null;
    this.nextBlinkAtMs = Number.POSITIVE_INFINITY;
    this.nextSaccadeAtMs = Number.POSITIVE_INFINITY;
  }

  reset(options: LivingFacialAuthorityOptions = {}): void {
    this.configure(options);
    this.running = false;
    this.stateId = "presence-neutral-settled";
    this.lastTimeMs = 0;
    this.revision = 0;
    this.lastSnapshot = null;
    this.initializedFacial = false;
    this.facial = new FacialBodyContinuum();
    this.blinkEvent = null;
    this.saccadeEvent = null;
    this.nextBlinkAtMs = Number.POSITIVE_INFINITY;
    this.nextSaccadeAtMs = Number.POSITIVE_INFINITY;
    this.intentSprings.retarget({ x: 0, y: 0, theta: 0 });
    this.disposition = createDisposition(this.seed);
  }

  setState(stateId: EightStateId, options: LivingFacialStateOptions = {}): void {
    const durationSeconds = Math.max(0.05, options.durationSeconds ?? 0.75);
    const target = targetForState(stateId);
    const totalFrames = Math.max(1, Math.round(durationSeconds * 60));
    const spec = { targetId: target, totalFrames };
    if (!this.initializedFacial) {
      this.facial = new FacialBodyContinuum();
      this.facial.setTarget(spec);
      this.initializedFacial = true;
    } else if (options.interrupt) {
      this.facial.interrupt(spec);
    } else {
      this.facial.setTarget(spec);
    }
    this.stateId = stateId;
    const now = Math.max(0, options.timeMs ?? this.lastTimeMs);
    // LAW-10: the past changes parameters. Record the emotional event and
    // retarget the intent springs from current (x, v) — never a reset.
    this.disposition = advanceDisposition(this.disposition, {
      emotion: emotionForState(stateId),
      timeSeconds: now / 1000,
      intensity: 0.5,
    });
    const targets = this.stateTargets();
    this.intentSprings.retarget({
      x: ((targets.overall_width ?? 1) - 1) * 0.5,
      y: ((targets.overall_height ?? 1) - 1) * 0.5,
      theta: ((targets.yaw ?? 0) / 45) * 0.12,
    });
    const policy = policyForState(stateId);
    if (!policy.allowBlink) {
      this.blinkEvent = null;
      this.nextBlinkAtMs = Number.POSITIVE_INFINITY;
    } else if (!Number.isFinite(this.nextBlinkAtMs)) {
      this.armBlink(now);
    }
    if (!policy.allowSaccade) {
      this.saccadeEvent = null;
      this.nextSaccadeAtMs = Number.POSITIVE_INFINITY;
    } else if (!Number.isFinite(this.nextSaccadeAtMs)) {
      this.armSaccade(now);
    }
  }

  interruptState(stateId: EightStateId, durationSeconds = 0.55): void {
    this.setState(stateId, {
      durationSeconds,
      interrupt: true,
      timeMs: this.lastTimeMs,
    });
  }

  triggerBlink(timeMs = this.lastTimeMs): boolean {
    const policy = policyForState(this.stateId);
    if (!this.running || this.reducedMotion || !policy.allowBlink) return false;
    const closeSec = mix(policy.blinkCloseDur[0], policy.blinkCloseDur[1], this.rng());
    const openSec = mix(policy.blinkOpenDur[0], policy.blinkOpenDur[1], this.rng());
    this.blinkEvent = {
      startMs: timeMs,
      closeMs: Math.max(220, closeSec * 1400),
      openMs: Math.max(320, openSec * 1400),
    };
    this.nextBlinkAtMs = Number.POSITIVE_INFINITY;
    return true;
  }

  triggerSaccade(timeMs = this.lastTimeMs): boolean {
    const policy = policyForState(this.stateId);
    if (!this.running || this.reducedMotion || !policy.allowSaccade) return false;
    const targetChannels = this.stateTargets();
    const center = clamp(
      targetChannels.gaze ?? policy.gazeCenterBias ?? 0,
      -0.35,
      0.35,
    );
    const from = this.lastSnapshot?.gaze ?? center;
    const target = clamp(center + (this.rng() * 2 - 1) * policy.saccadeAmp, -0.35, 0.35);
    this.saccadeEvent = {
      startMs: timeMs,
      outboundMs: 80 + this.rng() * 60,
      returnMs: 220 + this.rng() * 150,
      from,
      target,
      center,
    };
    this.nextSaccadeAtMs = Number.POSITIVE_INFINITY;
    return true;
  }

  evaluate(
    frame: Pick<OrganismClockFrame, "timeMs" | "deltaMs" | "frameIndex">,
    baseValues: DomainScalarMap = {},
  ): LivingFacialSnapshot {
    if (!this.running) this.start(this.stateId, frame.timeMs);
    if (frame.timeMs < this.lastTimeMs) {
      this.blinkEvent = null;
      this.saccadeEvent = null;
      this.armBlink(frame.timeMs);
      this.armSaccade(frame.timeMs);
    }
    this.lastTimeMs = frame.timeMs;
    this.advanceEvents(frame.timeMs, baseValues.energy_level ?? 0.5);

    const dtSeconds = Math.max(1 / 240, Math.min(0.25, frame.deltaMs / 1000 || 1 / 60));
    this.intentSprings.step(dtSeconds);
    const facialStep = this.facial.step(dtSeconds);
    const facial = facialStep.snapshot;
    const target = this.stateTargets();
    const values: DomainScalarMap = { ...baseValues };
    const ownership: Record<string, LivingFacialOwner> = {};

    for (const bindingId of FACIAL_TEMPORAL_BINDINGS) {
      const continuumValue = facial.channels[bindingId];
      const targetValue = target[bindingId];
      if (typeof continuumValue === "number" && Number.isFinite(continuumValue)) {
        values[bindingId] =
          typeof targetValue === "number" && Number.isFinite(targetValue)
            ? q(mix(continuumValue, targetValue, 0.28))
            : q(continuumValue);
        ownership[bindingId] = "facial_continuum";
      } else if (typeof targetValue === "number" && Number.isFinite(targetValue)) {
        values[bindingId] = q(targetValue);
        ownership[bindingId] = "state_target";
      }
    }

    const t = frame.timeMs / 1000;
    const energyBase = baseValues.energy_level ?? target.energy_level ?? 0.52;
    const springSnapshot = this.intentSprings.snapshot();
    const dispositionSample = evaluateDispositionSample(
      this.disposition,
      t,
    );
    const unified = evaluateUnifiedFieldFrame({
      timeSeconds: t,
      seed: this.seed,
      reducedMotion: this.reducedMotion,
      arousal: energyBase,
      intentSprings: {
        x: springSnapshot.x.x,
        y: springSnapshot.y.x,
        theta: springSnapshot.theta.x,
      },
      disposition: {
        residue: dispositionSample.residue,
        mood: dispositionSample.mood,
        habitSalience: dispositionSample.habitSalience,
      },
    });
    const unifiedViolations = validateUnifiedFieldFrame(
      unified,
      // Reserved for future frame-rate-sensitive law checks; the current
      // validator remains pure and same-frame safe.
    );
    const audio = evaluateUnifiedAudioFrame(unified, frame.timeMs, {
      authorityId: this.authorityId,
      clockPacket: "VEC-401",
      sourceFrameIndex: frame.frameIndex,
    });
    const light = evaluateUnifiedLightProjection({
      timeMs: frame.timeMs,
      seed: this.seed,
      arousal: energyBase,
      reducedMotion: this.reducedMotion,
    });

    // Carry the complete unified dynamics substrate through the canonical
    // production packet. FormMaster remains the SVG writer, but it must read
    // these values rather than create an independent idle oscillator.
    Object.assign(values, {
      unified_time_seconds: q(unified.timeSeconds),
      unified_breath: q(unified.breath),
      unified_breath_phase: q(unified.breathPhase),
      unified_wander: q(unified.wander),
      unified_spring_x: q(unified.springX),
      unified_spring_y: q(unified.springY),
      unified_spring_theta: q(unified.springTheta),
      unified_energy_pulse: q(unified.energyPulse),
      unified_relief_drift: q(unified.reliefDrift),
      unified_micro_tremor: q(unified.microTremorNormalized),
      unified_anticipation: q(unified.anticipation),
      unified_volume_scale_x: q(unified.volumeScaleX),
      unified_volume_scale_y: q(unified.volumeScaleY),
      unified_volume_product: q(unified.volumeProduct),
      unified_breath_rate_hz: q(unified.breathRateHz),
      unified_pulse_rate_hz: q(unified.pulseRateHz),
      unified_time_scale: q(unified.timeScale),
      unified_wander_pink: q(unified.wanderPink),
      unified_mood: q(unified.mood),
      unified_intent_spring_x: q(unified.intentSpringX),
      unified_intent_spring_y: q(unified.intentSpringY),
      unified_intent_spring_theta: q(unified.intentSpringTheta),
      unified_disposition_residue: q(unified.dispositionResidue),
      unified_disposition_mood: q(unified.dispositionMood),
      unified_habit_salience: q(unified.habitSalience),
      unified_light_intensity: q(light.intensity),
      unified_light_lag_ms: light.lightLagMs,
      unified_color_lag_ms: light.colorLagMs,
    });
    for (const id of [
      "unified_time_seconds",
      "unified_breath",
      "unified_breath_phase",
      "unified_wander",
      "unified_spring_x",
      "unified_spring_y",
      "unified_spring_theta",
      "unified_energy_pulse",
      "unified_relief_drift",
      "unified_micro_tremor",
      "unified_anticipation",
      "unified_volume_scale_x",
      "unified_volume_scale_y",
      "unified_volume_product",
      "unified_breath_rate_hz",
      "unified_pulse_rate_hz",
      "unified_time_scale",
      "unified_wander_pink",
      "unified_mood",
      "unified_intent_spring_x",
      "unified_intent_spring_y",
      "unified_intent_spring_theta",
      "unified_disposition_residue",
      "unified_disposition_mood",
      "unified_habit_salience",
      "unified_light_intensity",
      "unified_light_lag_ms",
      "unified_color_lag_ms",
    ]) ownership[id] = "living_authority";

    // These are the actual production posture scale factors. Profile mass
    // remains authored by the contour recipe; the live anisotropic deformation
    // comes from the Unified Theory pair, whose product is exactly conserved.
    values.overall_height = q(clamp(unified.volumeScaleY, 0.35, 1.65));
    values.overall_width = q(clamp(unified.volumeScaleX, 0.35, 1.65));
    // The renderer consumes these geometry-space projections directly. Their
    // amplitudes are bounded translations of the same spring/wander channels,
    // never a second oscillator or an independent random source.
    values.posture_x = q(unified.springX * 120);
    values.posture_y = q(unified.springY * 100);
    values.body_lean = q(unified.springTheta * 8);
    values.asym = q(unified.wander * 0.06);
    values.wide = q(unified.wander * 0.08);
    values.low = q(unified.reliefDrift * 2);
    ownership.overall_height = "living_authority";
    ownership.overall_width = "living_authority";
    for (const id of ["posture_x", "posture_y", "body_lean", "asym", "wide", "low"]) {
      ownership[id] = "living_authority";
    }

    const restEye = clamp(
      values.eye_openness ?? target.eye_openness ?? 0.56,
      0.05,
      1.15,
    );
    const blinkPhase = this.evaluateBlink(frame.timeMs, restEye);
    values.eye_openness = q(blinkPhase);
    ownership.eye_openness = this.blinkEvent ? "blink" : "facial_continuum";

    const restGaze = clamp(values.gaze ?? target.gaze ?? 0, -1, 1);
    const gaze = this.evaluateSaccade(frame.timeMs, restGaze);
    values.gaze = q(gaze);
    ownership.gaze = this.saccadeEvent ? "saccade" : "facial_continuum";

    const pulseBase = baseValues.energy_pulse ?? target.energy_pulse ?? 0.16;
    const lagBase = baseValues.energy_lag ?? target.energy_lag ?? 0.35;
    const reliefBase = baseValues.relief_amplitude ?? target.relief_amplitude ?? 0.42;
    const glowBase = baseValues.internal_glow ?? target.internal_glow ?? 0.48;
    const skinBase = baseValues.skin_tension ?? target.skin_tension ?? 0.36;
    values.energy_level = q(clamp(energyBase + unified.energyPulse * 0.5, 0.05, 1));
    values.energy_pulse = q(clamp(pulseBase + unified.energyPulse, 0, 1));
    values.energy_lag = q(clamp(lagBase, 0, 1));
    values.relief_amplitude = q(clamp(reliefBase + unified.reliefDrift, 0, 1));
    values.internal_glow = q(clamp(glowBase + unified.microTremorNormalized, 0, 1));
    values.skin_tension = q(clamp(skinBase + unified.microTremorNormalized * 0.5, 0, 1));
    for (const id of [
      "energy_level",
      "energy_pulse",
      "energy_lag",
      "relief_amplitude",
      "internal_glow",
      "skin_tension",
    ]) ownership[id] = "living_authority";

    const stateBias =
      this.stateId === "presence-listening-receive"
        ? 4
        : this.stateId === "presence-thinking-knit"
          ? 6
          : this.stateId === "presence-recognition-spark"
            ? 9
            : this.stateId === "comet-executing-drive"
              ? 5
              : 2;
    const idleTurn = this.reducedMotion ? 4 : 7 + unified.wander * 4;
    values.yaw = q(clamp(
      idleTurn + unified.springTheta * 12 + Math.abs(gaze) * 12 + stateBias,
      0,
      22.5,
    ));
    values.motion = q(clamp(
      (baseValues.motion ?? 0.55) * 0.35 +
        0.42 +
        values.energy_level * 0.22 +
        Math.abs(unified.breath) * 3 +
        Math.abs(unified.springX) * 0.5,
      0.48,
      0.88,
    ));
    ownership.yaw = "living_authority";
    ownership.motion = "living_authority";

    this.revision += 1;
    const snapshot: LivingFacialSnapshot = {
      authorityId: this.authorityId,
      packet: this.packet,
      running: this.running,
      stateId: this.stateId,
      timeMs: frame.timeMs,
      frameIndex: frame.frameIndex,
      revision: this.revision,
      reducedMotion: this.reducedMotion,
      values,
      ownership,
      breath: q(unified.breath),
      blinkPhase: values.eye_openness,
      blinkActive: this.blinkEvent != null,
      gaze: values.gaze,
      saccadeActive: this.saccadeEvent != null,
      facial,
      unified,
      unifiedViolations,
      audio,
      intentSprings: springSnapshot,
      disposition: dispositionSample,
      light,
      hash: fnvHash(values, this.revision),
    };
    this.lastSnapshot = snapshot;
    return snapshot;
  }

  inspect(): LivingFacialSnapshot | null {
    if (!this.lastSnapshot) return null;
    return {
      ...this.lastSnapshot,
      values: { ...this.lastSnapshot.values },
      ownership: { ...this.lastSnapshot.ownership },
      facial: {
        ...this.lastSnapshot.facial,
        channels: { ...this.lastSnapshot.facial.channels },
        ownership: { ...this.lastSnapshot.facial.ownership },
      },
      unified: {
        ...this.lastSnapshot.unified,
        wanderLayers: [...this.lastSnapshot.unified.wanderLayers],
        oscillatorPeriodsSeconds: [...this.lastSnapshot.unified.oscillatorPeriodsSeconds],
      },
      unifiedViolations: [...this.lastSnapshot.unifiedViolations],
      audio: {
        ...this.lastSnapshot.audio,
        derivedFrom: [...this.lastSnapshot.audio.derivedFrom] as [
          "breath",
          "energyPulse",
          "wander",
        ],
      },
      intentSprings: {
        x: { ...this.lastSnapshot.intentSprings.x },
        y: { ...this.lastSnapshot.intentSprings.y },
        theta: { ...this.lastSnapshot.intentSprings.theta },
      },
      disposition: { ...this.lastSnapshot.disposition },
      light: { ...this.lastSnapshot.light },
    };
  }

  private stateTargets(): DomainScalarMap {
    // The shipped runtime uses canonical scenario ids, but older bridge and
    // fixture callers may still pass the short FormMaster ids. Resolve both
    // forms here so a stale alias cannot turn the live facial target into
    // undefined during an asynchronous frame.
    const raw =
      EIGHT_STATE_TARGETS[this.stateId] ??
      EIGHT_STATE_TARGETS[SHORT_TO_CANONICAL[this.stateId] as EightStateId] ??
      EIGHT_STATE_TARGETS["presence-neutral-settled"];
    return this.reducedMotion ? projectReducedMotion(raw, 0.35) : raw;
  }

  private armBlink(nowMs: number, energy = 0.5): void {
    const policy = policyForState(this.stateId);
    if (this.reducedMotion || !policy.allowBlink) {
      this.nextBlinkAtMs = Number.POSITIVE_INFINITY;
      return;
    }
    const energyScale = 1.35 - 0.7 * clamp(energy, 0, 1);
    const gapSec = Math.max(10, mix(policy.blinkMinGapSec, policy.blinkMaxGapSec, this.rng()) * energyScale);
    this.nextBlinkAtMs = nowMs + gapSec * 1000;
  }

  private armSaccade(nowMs: number): void {
    const policy = policyForState(this.stateId);
    if (this.reducedMotion || !policy.allowSaccade) {
      this.nextSaccadeAtMs = Number.POSITIVE_INFINITY;
      return;
    }
    const gapSec = mix(policy.saccadeMinGapSec, policy.saccadeMaxGapSec, this.rng());
    this.nextSaccadeAtMs = nowMs + gapSec * 1000;
  }

  private advanceEvents(nowMs: number, energy: number): void {
    if (!this.blinkEvent && nowMs >= this.nextBlinkAtMs) this.triggerBlink(nowMs);
    if (!this.saccadeEvent && nowMs >= this.nextSaccadeAtMs) this.triggerSaccade(nowMs);
    if (this.blinkEvent) {
      const end = this.blinkEvent.startMs + this.blinkEvent.closeMs + this.blinkEvent.openMs;
      if (nowMs >= end) {
        this.blinkEvent = null;
        this.armBlink(nowMs, energy);
      }
    }
    if (this.saccadeEvent) {
      const end = this.saccadeEvent.startMs + this.saccadeEvent.outboundMs + this.saccadeEvent.returnMs;
      if (nowMs >= end) {
        this.saccadeEvent = null;
        this.armSaccade(nowMs);
      }
    }
  }

  private evaluateBlink(nowMs: number, restEye: number): number {
    const event = this.blinkEvent;
    if (!event) return restEye;
    const elapsed = nowMs - event.startMs;
    const floor = 0.06;
    if (elapsed <= event.closeMs) {
      return mix(restEye, floor, smoothstep01(elapsed / event.closeMs));
    }
    return mix(
      floor,
      restEye,
      smoothstep01((elapsed - event.closeMs) / event.openMs),
    );
  }

  private evaluateSaccade(nowMs: number, restGaze: number): number {
    const event = this.saccadeEvent;
    if (!event) return restGaze;
    const elapsed = nowMs - event.startMs;
    if (elapsed <= event.outboundMs) {
      return mix(event.from, event.target, smoothstep01(elapsed / event.outboundMs));
    }
    return mix(
      event.target,
      event.center,
      smoothstep01((elapsed - event.outboundMs) / event.returnMs),
    );
  }
}
