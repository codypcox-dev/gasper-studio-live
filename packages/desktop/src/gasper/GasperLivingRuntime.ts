/**
 * Compatibility and continuity facade over one organism-clock living/facial authority.
 * Eight-state and legacy routes share the same temporal kernel; GSAP remains only
 * for authored non-facial route channels. No React, REST, MCP, CDP, or iframe hot path.
 *
 * GASPER-007-G R4: continuous layered eight-state loop is first-class.
 * Legacy MICROSTATE_TARGETS remain as fallback demo clip for Book 005 paths.
 */

import gsap from "./gsap-shim";
import type { DomainScalarMap } from "./GasperDomainState";
import {
  getGasperOrganismClock,
  type GasperOrganismClockPort,
  type OrganismClockFrame,
} from "./clock";
import {
  SCENE_LOOP_MANIFEST,
  EightStateLoopController,
  EIGHT_STATE_TARGETS,
  type EightStateId,
  type EightStateLoopStatus,
  type LoopTransitionFrame,
} from "./eight-state-loop";
import {
  FACIAL_TEMPORAL_BINDINGS,
  GasperLivingFacialAuthority,
  type LivingFacialSnapshot,
} from "./living";
import type { GasperUnifiedAudioFrame } from "./physics";
import {
  FrameSequenceRecorder,
  analyzeFrameSequence,
  boundStepMap,
  captureAndAnalyzeLivingSequence,
  captureAndAnalyzeFullEnergyMatrix,
  captureFullEnergyMatrixSequence,
  captureLivingFrameSequence,
  interruptSafeBlend,
  livingFrameClaims,
  resolveOwnership,
  detectEmbodimentDefects,
  detectEmbodimentDefectsFromContinuity,
  isEmbodimentSequenceClean,
  stepEnergyTowardTarget,
  enforceAntiCollapseFloors,
  enforceNoBlackoutFloors,
  resolveNoBlackoutMode,
  analyzeNoBlackoutSequence,
  captureAndAnalyzeNoBlackoutRouteMatrix,
  ANTI_COLLAPSE_FLOORS,
  resolveEnergyRouteId,
  resolveEnergyTarget,
  CONTESTED_OWNERSHIP_CHANNELS,
  DEFAULT_CONTINUITY_THRESHOLDS,
  TOPOLOGY_LOCK,
  type CaptureSequenceOptions,
  type ContinuityChannelMap,
  type ContinuityFrame,
  type ContinuityOwner,
  type FrameSequenceAnalysis,
  type EnergySpanReport,
  type AntiCollapseMode,
  type TemporalNoBlackoutReport,
  type NoBlackoutRouteId,
} from "./continuity";
import {
  evaluateMorphologyFrame,
  sampleMorphologySequence,
  sampleBoundGeometrySequence,
  evaluateVisibleGeometrySnapshot,
  computeFeatureSpans,
  intermediateShapesDistinct,
  hasExclusiveTopologyAuthority,
  snapshotDefectsClean,
  volumeAndAttachmentContinuous,
  EMBODIMENT_REST,
  type EmbodimentId,
  type MorphologyFrame,
  type EmbodimentDefectFinding,
  type VisibleGeometrySnapshot,
  type FeatureSpanReport,
} from "./morphology";
import {
  buildExclusiveTopologyAuthority,
  type ExclusiveTopologyAuthority,
} from "./GasperTopologyLock";

/** GSAP 3 full surface (vendor); shim types only expose subset used by quickTo. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = gsap as any;

/** Legacy Book 005 microstate ids (fallback demo). */
export type MicrostateId =
  | "presence-neutral-settled"
  | "presence-listening-receive"
  | "presence-thinking-knit"
  | "presence-blocked-strain"
  | "recovering"
  | "pleased-soft";

/** Full eight-state + wake ids for showcase loop. */
export type LivingStateId = MicrostateId | EightStateId;

export const BEHAVIORAL_SEQUENCE: readonly MicrostateId[] = [
  "presence-neutral-settled",
  "presence-listening-receive",
  "presence-thinking-knit",
  "presence-blocked-strain",
  "recovering",
  "pleased-soft",
  "presence-neutral-settled",
] as const;

/**
 * TEMPORARY motion-resurrection fallback / demo clip targets. This is not the completed Book 004
 * authoring package; it remains a compatibility adapter.
 * Prefer eight-state loop (start with eightStateLoop: true) or AnimationPlan.
 */
export const MICROSTATE_TARGETS_IS_FALLBACK_DEMO = true as const;

/** Short aliases accepted by the plan adapter for legacy callers. */
const MICROSTATE_ALIASES: Record<string, MicrostateId> = {
  "neutral-settled": "presence-neutral-settled",
  "listening-receive": "presence-listening-receive",
  "thinking-knit": "presence-thinking-knit",
  "blocked-strain": "presence-blocked-strain",
};

function resolveMicrostateId(id: string): MicrostateId {
  return MICROSTATE_ALIASES[id] ?? (id as MicrostateId);
}

/** Binding targets for demo microstates (retarget-current via GSAP). FALLBACK ONLY. */
export const MICROSTATE_TARGETS: Record<MicrostateId, DomainScalarMap> = {
  "presence-neutral-settled": { ...EIGHT_STATE_TARGETS["presence-neutral-settled"] },
  "presence-listening-receive": { ...EIGHT_STATE_TARGETS["presence-listening-receive"] },
  "presence-thinking-knit": { ...EIGHT_STATE_TARGETS["presence-thinking-knit"] },
  "presence-blocked-strain": { ...EIGHT_STATE_TARGETS["presence-blocked-strain"] },
  recovering: {
    energy_level: 0.48,
    energy_pulse: 0.2,
    energy_lag: 0.45,
    eye_openness: 0.52,
    eye_spacing: 0,
    mouth_openness: 0.3,
    face_scale: 1,
    gaze: 0.02,
    corner_pull_l: 0.02,
    corner_pull_r: 0.02,
    relief_amplitude: 0.45,
    skin_tension: 0.4,
    internal_glow: 0.45,
    overall_height: 0.98,
    overall_width: 0.99,
    ground_flattening: 0.04,
    settling: 0.7,
    rebound: 0.4,
    secondary_lag: 0.4,
  },
  "pleased-soft": { ...EIGHT_STATE_TARGETS["presence-pleased-resolve"] },
};

export type LivingRuntimeOptions = {
  /** Deterministic PRNG seed (optional). */
  seed?: number;
  /** Reduce motion amplitudes / skip blinks. */
  reducedMotion?: boolean;
  /**
   * Auto-run demo microstate sequence (FALLBACK clip).
   * Default false — Authoring must not auto-sequence.
   */
  autoSequence?: boolean;
  /** Restrained idle (breath/blink/gaze only) — default true for Authoring. */
  restrainedIdle?: boolean;
  /** Seconds between microstate steps in the legacy loop. */
  stepSeconds?: number;
  /** Schedule one mid-flight interrupt during first sequence cycle (demo only). */
  forceInterrupt?: boolean;
  /**
   * GASPER-007-G: run the continuous eight-state showcase loop
   * (Neutral→…→Dormant→Wake→Neutral). Overrides legacy microstate sequence.
   */
  eightStateLoop?: boolean;
  /** Deterministic proof mode (seeded timings / RNG). */
  proofMode?: boolean;
  /** Scale all eight-state timings (default 1). */
  timingScale?: number;
};

export type LivingRuntimeStatus = {
  running: boolean;
  microstate: MicrostateId;
  /** Active eight-state id when eight-state loop is engaged. */
  eightState: EightStateId | null;
  sequenceIndex: number;
  breath: number;
  blinkPhase: number;
  gaze: number;
  unifiedOscillatorCount?: number;
  unifiedDampingRatio?: number;
  unifiedVolumeProduct?: number;
  audioBindingWindowMs?: number;
  unifiedAudioPacket: "GASPER-UNIFIED-AUDIO-001";
  unifiedAudioSourcePacket: "GASPER-UNIFIED-THEORY-001";
  unifiedAudioAuthorityId: "gasper-living-facial-authority";
  unifiedAudioClockPacket: "VEC-401";
  unifiedAudioSourceFrameIndex: number;
  unifiedLawViolations: readonly string[];
  reducedMotion: boolean;
  seed: number | null;
  interruptCount: number;
  lastInterruptAt: number | null;
  engine: "gsap";
  autoSequence: boolean;
  restrainedIdle: boolean;
  /** Current legacy microstate step interval; exposed so review leases restore exactly. */
  stepSeconds: number;
  /** Whether the current living policy permits the demo interrupt. */
  forceInterrupt: boolean;
  eightStateLoop: boolean;
  proofMode: boolean;
  /** Current eight-state timing multiplier; exposed so review leases restore exactly. */
  timingScale: number;
  livingLayersActive: boolean;
  loopPhase: EightStateLoopStatus["phase"] | "legacy";
  /** Always true until Book 004 plan fully owns RUNTIME transitions. */
  microstateTargetsAreFallbackDemo: true;
  /** Continuity policy layer active (does not steal GSAP frame authority). */
  continuityPolicyActive: boolean;
  /** Anti-flicker ownership map for contested channels. */
  channelOwnership: Record<string, ContinuityOwner>;
  /** MCP never drives frames on the living path. */
  mcpFrameDriving: false;
  /** Hold-last-good buffer present (standalone recovery aid). */
  holdLastGoodPresent: boolean;
};

type FlushFn = (values: DomainScalarMap) => void;
type ProxyFn = (id: string, initial?: number) => { value: number };
type SnapshotFn = () => DomainScalarMap;

function isMicrostateId(id: string): id is MicrostateId {
  return id in MICROSTATE_TARGETS;
}

/**
 * Continuous living animation authority for the native Dais.
 * Additive GSAP tracks + microstate / eight-state retarget from current values.
 */
export class GasperLivingRuntime {
  private running = false;
  private microstate: MicrostateId = "presence-neutral-settled";
  private sequenceIndex = 0;
  private reducedMotion = false;
  private seed: number | null = null;
  private autoSequence = false;
  private stepSeconds = 2.4;
  private forceInterrupt = false;
  private restrainedIdle = true;
  private eightStateLoop = false;
  private proofMode = false;
  private timingScale = 1;
  private interruptCount = 0;
  private lastInterruptAt: number | null = null;
  private interruptedThisCycle = false;

  /** VEC-601/602 shared temporal authority (legacy and eight-state paths). */
  readonly livingAuthority = new GasperLivingFacialAuthority();
  private lastLivingSnapshot: LivingFacialSnapshot | null = null;
  private lastClockFrame: Pick<OrganismClockFrame, "timeMs" | "deltaMs" | "frameIndex"> = {
    timeMs: 0,
    deltaMs: 0,
    frameIndex: 0,
  };

  /** Legacy route progression due-time; VEC-401 owns the actual dispatch. */
  private sequenceDueAtOrganismMs: number | null = null;
  private sequenceAction: (() => void) | null = null;
  private microstateTl: { kill: () => void } | null = null;

  private flush: FlushFn | null = null;
  private proxyFor: ProxyFn | null = null;
  private snapshot: SnapshotFn | null = null;
  private listeners = new Set<() => void>();
  private pushRaf: number | null = null;
  /** VEC-401: sole organism clock for living continuous advancement. */
  private readonly organismClock: GasperOrganismClockPort = getGasperOrganismClock();
  private livingClockUnsub: (() => void) | null = null;
  /**
   * Optional settle notifier for low-frequency pilot queue drain.
   * GSAP owns continuous timing; this only fires after a transition completes.
   */
  private transitionSettledHandler: (() => void) | null = null;

  /**
   * Continuity policy layer (GASPER temporal-continuity slice).
   * Records frames, resolves anti-flicker ownership, holds last-good sample.
   * Does not replace GSAP; does not drive MCP frames.
   */
  private continuityPolicyActive = false;
  private midBlink = false;
  private midSaccade = false;
  private channelOwnership: Record<string, ContinuityOwner> = {
    eye_openness: "state_target",
    gaze: "state_target",
    mouth_openness: "state_target",
    mouth_width: "state_target",
  };
  private holdLastGood: DomainScalarMap | null = null;
  private frameRecorder: FrameSequenceRecorder | null = null;
  private lastInterruptBlend = false;
  /** Remaining synthetic frames to hold interrupt_blend ownership after interrupt. */
  private interruptBlendFramesRemaining = 0;
  private lastFlushed: ContinuityChannelMap = {};
  private priorFlushVelocity: ContinuityChannelMap = {};
  private priorFlushAcceleration: ContinuityChannelMap = {};
  private rawFlush: FlushFn | null = null;
  private unifiedAudioFrameHandler: ((frame: GasperUnifiedAudioFrame) => void) | null = null;
  private lastTransitionPhase: LoopTransitionFrame["phase"] | "interrupted" | "idle" =
    "idle";

  /** Eight-state showcase controller (GASPER-007-G). */
  readonly eightLoop = new EightStateLoopController(this.livingAuthority);

  attach(api: {
    flush: FlushFn;
    proxyFor: ProxyFn;
    snapshot: SnapshotFn;
    onTransitionFrame?: (frame: LoopTransitionFrame) => void;
    onUnifiedAudioFrame?: (frame: GasperUnifiedAudioFrame) => void;
  }) {
    // Preserve raw flush; wrap so eight-state AND legacy paths hit continuity policy.
    this.rawFlush = api.flush;
    this.flush = (values) => {
      const policed = this.applyContinuityFlushPolicy(values);
      this.rawFlush?.(policed);
    };
    this.proxyFor = api.proxyFor;
    this.snapshot = api.snapshot;
    this.unifiedAudioFrameHandler = api.onUnifiedAudioFrame ?? null;
    this.eightLoop.attach({
      flush: this.flush,
      proxyFor: api.proxyFor,
      snapshot: api.snapshot,
      onUnifiedAudioFrame: (frame) => this.unifiedAudioFrameHandler?.(frame),
      onTransitionFrame: (frame) => {
        this.lastTransitionPhase = frame.phase;
        // While eight-loop is mid-transition after interrupt, keep interrupt ownership.
        if (frame.phase === "transition" && this.interruptBlendFramesRemaining > 0) {
          this.lastInterruptBlend = true;
          this.resolveChannelOwnership();
        }
        if (frame.phase === "hold" && (frame.progress ?? 0) >= 1) {
          this.interruptBlendFramesRemaining = 0;
          this.lastInterruptBlend = false;
          this.resolveChannelOwnership();
          this.fireTransitionSettled();
        }
        api.onTransitionFrame?.(frame);
      },
    });
  }

  /**
   * Continuity policy applied on every flush (eight-state + legacy).
   * - anti-flicker ownership for contested channels
   * - bounded velocity/acceleration/jerk steps
   * - hold-last-good update
   * - optional proof-mode frame recording
   * GSAP remains the producer of candidate values; this layer polices continuity.
   */
  private applyContinuityFlushPolicy(values: DomainScalarMap): DomainScalarMap {
    if (!this.continuityPolicyActive) {
      return values;
    }
    // Detect mid-blink from eye dip relative to last good / base rest.
    const eye = values.eye_openness;
    const restEye =
      this.holdLastGood?.eye_openness ??
      this.lastLivingSnapshot?.facial.channels.eye_openness ??
      0.56;
    if (typeof eye === "number" && restEye > 0.2 && eye < restEye * 0.45) {
      this.midBlink = true;
    } else if (typeof eye === "number" && eye >= restEye * 0.85) {
      this.midBlink = false;
    }
    const gaze = values.gaze;
    const restGaze = this.holdLastGood?.gaze ?? 0;
    if (
      typeof gaze === "number" &&
      Math.abs(gaze - restGaze) > 0.04 &&
      this.lastTransitionPhase !== "transition"
    ) {
      this.midSaccade = true;
    } else if (typeof gaze === "number" && Math.abs(gaze - restGaze) < 0.015) {
      this.midSaccade = false;
    }

    if (this.interruptBlendFramesRemaining > 0) {
      this.lastInterruptBlend = true;
      this.interruptBlendFramesRemaining -= 1;
      if (this.interruptBlendFramesRemaining <= 0) {
        this.lastInterruptBlend = false;
      }
    }
    this.resolveChannelOwnership();

    // Ownership: when state_target owns eye, prefer non-blink value if available.
    let next: ContinuityChannelMap = { ...values };
    if (
      this.channelOwnership.eye_openness === "state_target" &&
      !this.midBlink &&
      this.holdLastGood?.eye_openness != null &&
      typeof next.eye_openness === "number"
    ) {
      // Soft pull toward hold rest rather than hard blink teleport when not mid-blink.
      // (eight-loop may still write blink.v; we avoid snap by boundStep below.)
    }

    // Energy grammar: soft-chase deterministic state/route energy so inspection
    // never stays flat at a demo constant (R3-ENERGY-FLAT). GSAP still owns the
    // continuous tick; this is a continuity policy pull, not a second frame owner.
    const routeId = this.resolveActiveEnergyRoute();
    const energyPhase =
      this.lastInterruptBlend
        ? "interrupt"
        : this.lastTransitionPhase === "transition"
          ? "sustain"
          : "hold";
    next = stepEnergyTowardTarget(next, routeId, {
      phase: energyPhase,
      progress: energyPhase === "hold" ? 1 : 0.5,
      alpha: energyPhase === "hold" ? 0.28 : 0.18,
    });
    // Anti-collapse: never whole-head squeeze / zero-scale as ordinary expression.
    const antiMode = this.resolveAntiCollapseMode(routeId);
    next = enforceAntiCollapseFloors(next, antiMode);
    // R4 no-blackout: face presence / shell / attachment / energy never wipe.
    const nbMode = resolveNoBlackoutMode(routeId);
    next = enforceNoBlackoutFloors(next, nbMode);
    // Seed missing keys at no-blackout-safe neutrals (not 0 — zero seed ramps
    // face_emissive/eye through multi-frame blackout before soft walls land).
    const seedFallback: ContinuityChannelMap = {
      face_scale: 1,
      overall_height: 1,
      overall_width: 1,
      lower_body_fullness: 0.96,
      energy_level: 0.4,
      eye_openness: 0.4,
      mouth_openness: 0.12,
      face_emissive: 0.28,
      internal_glow: 0.3,
      energy_pulse: 0.16,
      energy_lag: 0.35,
    };
    for (const k of Object.keys(next)) {
      if (this.lastFlushed[k] === undefined && Object.keys(this.lastFlushed).length > 0) {
        this.lastFlushed[k] = seedFallback[k] ?? next[k] ?? 0.3;
      }
    }

    // Bounded derivatives vs last flush (shipped policy on live write path).
    // Floors on the proposed map + soft-wall floors inside boundStep (same as
    // capture path) so residual velocity cannot overshoot past anti-collapse.
    // Do not hard-snap after boundStep (that invents FD jerk/accel spikes).
    if (Object.keys(this.lastFlushed).length > 0) {
      const table = ANTI_COLLAPSE_FLOORS[antiMode] ?? ANTI_COLLAPSE_FLOORS.ordinary;
      const floors: ContinuityChannelMap = {
        face_scale: table.face_scale,
        overall_height: table.overall_height,
        overall_width: table.overall_width,
        lower_body_fullness: table.lower_body_fullness,
        energy_level: table.energy_level,
        eye_openness: table.eye_openness,
        mouth_openness: table.mouth_openness,
        face_emissive: table.face_emissive ?? 0.12,
        internal_glow: table.internal_glow ?? 0.14,
      };
      const bounded = boundStepMap(
        this.lastFlushed,
        next,
        this.priorFlushVelocity,
        1 / 60,
        DEFAULT_CONTINUITY_THRESHOLDS.maxVelocity * 0.55,
        DEFAULT_CONTINUITY_THRESHOLDS.maxAcceleration * 0.75,
        {
          priorAcceleration: this.priorFlushAcceleration,
          maxJerk: DEFAULT_CONTINUITY_THRESHOLDS.maxJerk * 0.6,
          floors,
          ceilings: {
            energy_level: 1,
            face_scale: 1.65,
            eye_openness: 1.2,
          },
        },
      );
      next = bounded.values;
      this.priorFlushVelocity = bounded.velocity;
      this.priorFlushAcceleration = bounded.acceleration;
    }
    // Do not hard post-step floor (FD jerk/accel spikes). Pre-step
    // enforceNoBlackoutFloors + boundStep soft-wall floors are the authority.

    this.lastFlushed = { ...next };
    // Hold-last-good only advances on continuous (non-interrupt-edge) samples.
    if (!this.lastInterruptBlend) {
      this.holdLastGood = { ...next };
    }
    if (this.frameRecorder?.isRecording) {
      this.frameRecorder.push({
        channels: { ...next },
        ownership: { ...this.channelOwnership },
        topology: this.getTopologyLock(),
        interruptEdge: this.lastInterruptBlend,
        transition: {
          from: this.microstate,
          to: this.microstate,
          progress: this.lastInterruptBlend ? 0.5 : 1,
          phase: this.lastInterruptBlend
            ? "interrupted"
            : this.lastTransitionPhase === "transition"
              ? "transition"
              : "hold",
        },
      });
    }
    return next;
  }

  /**
   * Register a settle callback for low-frequency pilot handoff queue drain.
   * Does not schedule frames; called after GSAP transition completion only.
   */
  setOnTransitionSettled(fn: (() => void) | null): void {
    this.transitionSettledHandler = fn;
  }

  private fireTransitionSettled(): void {
    try {
      this.transitionSettledHandler?.();
    } catch {
      /* settle handlers must never crash living */
    }
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    const unEight = this.eightLoop.subscribe(fn);
    return () => {
      this.listeners.delete(fn);
      unEight();
    };
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  getStatus(): LivingRuntimeStatus {
    const eight = this.eightStateLoop ? this.eightLoop.getStatus() : null;
    return {
      running: this.running || !!eight?.running,
      microstate: this.microstate,
      eightState: eight?.stateId ?? null,
      sequenceIndex: eight?.routeIndex ?? this.sequenceIndex,
      breath: eight?.breath ?? this.lastLivingSnapshot?.breath ?? 0,
      blinkPhase: eight?.blinkPhase ?? this.lastLivingSnapshot?.blinkPhase ?? 0.56,
      gaze: eight?.gaze ?? this.lastLivingSnapshot?.gaze ?? 0,
      unifiedOscillatorCount:
        eight?.unifiedOscillatorCount ??
        this.lastLivingSnapshot?.unified.activeOscillatorCount ??
        0,
      unifiedDampingRatio:
        eight?.unifiedDampingRatio ?? this.lastLivingSnapshot?.unified.dampingRatio ?? 0,
      unifiedVolumeProduct:
        eight?.unifiedVolumeProduct ?? this.lastLivingSnapshot?.unified.volumeProduct ?? 0,
      audioBindingWindowMs:
        eight?.audioBindingWindowMs ?? this.lastLivingSnapshot?.audio.bindingWindowMs ?? 0,
      unifiedAudioPacket:
        this.lastLivingSnapshot?.audio.packet ?? "GASPER-UNIFIED-AUDIO-001",
      unifiedAudioSourcePacket:
        this.lastLivingSnapshot?.audio.sourcePacket ?? "GASPER-UNIFIED-THEORY-001",
      unifiedAudioAuthorityId:
        this.lastLivingSnapshot?.audio.authorityId ?? "gasper-living-facial-authority",
      unifiedAudioClockPacket:
        this.lastLivingSnapshot?.audio.clockPacket ?? "VEC-401",
      unifiedAudioSourceFrameIndex:
        eight?.unifiedAudioSourceFrameIndex ??
        this.lastLivingSnapshot?.audio.sourceFrameIndex ??
        this.lastClockFrame.frameIndex,
      unifiedLawViolations: [
        ...(this.lastLivingSnapshot?.unifiedViolations ?? []),
      ],
      reducedMotion: this.reducedMotion,
      seed: eight?.seed ?? this.seed,
      interruptCount:
        (eight?.interruptCount ?? 0) + this.interruptCount,
      lastInterruptAt: eight?.lastInterruptAt ?? this.lastInterruptAt,
      engine: "gsap",
      autoSequence: this.autoSequence,
      restrainedIdle: this.restrainedIdle,
      stepSeconds: this.stepSeconds,
      forceInterrupt: this.forceInterrupt,
      eightStateLoop: this.eightStateLoop,
      proofMode: this.proofMode || !!eight?.proofMode,
      timingScale: this.timingScale,
      livingLayersActive:
        eight?.livingLayersActive ??
        (this.running && !this.restrainedIdle ? true : this.running),
      loopPhase: eight?.phase ?? "legacy",
      microstateTargetsAreFallbackDemo: MICROSTATE_TARGETS_IS_FALLBACK_DEMO,
      continuityPolicyActive: this.continuityPolicyActive,
      channelOwnership: { ...this.channelOwnership },
      mcpFrameDriving: false,
      holdLastGoodPresent: this.holdLastGood != null,
    };
  }

  start(opts: LivingRuntimeOptions = {}) {
    if (!this.flush || !this.proxyFor) {
      throw new Error("GasperLivingRuntime.attach() required before start()");
    }
    this.stop();
    this.running = true;
    this.reducedMotion = !!opts.reducedMotion;
    this.restrainedIdle = opts.restrainedIdle !== false;
    this.stepSeconds = opts.stepSeconds ?? 2.4;
    this.proofMode = opts.proofMode === true || typeof opts.seed === "number";
    this.timingScale = opts.timingScale ?? 1;
    this.eightStateLoop = opts.eightStateLoop === true;
    this.autoSequence =
      opts.autoSequence === true ||
      (this.eightStateLoop && opts.autoSequence !== false);
    this.forceInterrupt =
      opts.forceInterrupt === true &&
      (opts.autoSequence === true || this.autoSequence || this.eightStateLoop);

    // VEC-401: consumers never install, start, pause, seed, or retime the clock.
    // The facial authority owns seeded event randomness; this facade only passes
    // the seed through and never creates an ambient Math.random source.
    if (typeof opts.seed === "number") {
      this.seed = opts.seed;
    } else {
      this.seed = null;
    }

    // Continuity policy: always active on living path; deterministic when seeded/proofMode.
    this.continuityPolicyActive = true;
    this.lastInterruptBlend = false;
    this.midBlink = false;
    this.midSaccade = false;
    this.resolveChannelOwnership();
    this.holdLastGood = this.snapshot ? { ...this.snapshot() } : null;
    if (this.proofMode && this.seed != null) {
      this.frameRecorder = new FrameSequenceRecorder({
        seed: this.seed,
        dt: 1 / 60,
      });
      this.frameRecorder.start();
    } else {
      this.frameRecorder = null;
    }

    if (this.eightStateLoop) {
      // SCENE LOOP (Cody directive 2026-08-03, supersedes 2026-07-24 fluid and
      // 2026-07-28 parade modes for the live auto loop): long-form embodiment
      // scene suites with full in/during/out arcs. Reduced motion / restrained /
      // manual paths keep the authored DEFAULT_LOOP_MANIFEST timing/proofs.
      const continuous =
        !this.reducedMotion && this.autoSequence && !this.restrainedIdle;
      this.eightLoop.start({
        seed: this.seed ?? undefined,
        reducedMotion: this.reducedMotion,
        autoLoop: this.autoSequence && !this.restrainedIdle,
        proofMode: this.proofMode,
        timingScale: this.timingScale,
        forceInterruptDemo: this.forceInterrupt,
        manifest: continuous ? SCENE_LOOP_MANIFEST : undefined,
      });
      this.microstate = "presence-neutral-settled";
      this.emit();
      return;
    }

    // ── Legacy microstate / restrained idle path ──
    const snap = this.snapshot?.() ?? {};
    const allKeys = new Set<string>();
    for (const t of Object.values(MICROSTATE_TARGETS)) {
      for (const k of Object.keys(t)) allKeys.add(k);
    }
    for (const id of allKeys) {
      this.proxyFor!(id, snap[id] ?? 0);
    }
    this.livingAuthority.reset({
      seed: this.seed ?? 1007,
      reducedMotion: this.reducedMotion,
    });
    this.livingAuthority.start(
      mapMicroToEight("presence-neutral-settled"),
      this.organismClock.nowMs(),
    );
    this.startLivingClock();
    this.goMicrostate("presence-neutral-settled", { duration: 0.45 });
    if (this.autoSequence && !this.restrainedIdle) {
      this.sequenceIndex = 0;
      this.interruptedThisCycle = false;
      this.scheduleNextStep(this.stepSeconds);
    }
    this.emit();
  }

  /**
   * VEC-401: legacy microstate living continuous push rides organism clock.
   * Eight-state path is advanced by EightStateLoopController's clock subscription.
   */
  private startLivingClock() {
    this.killLivingClock();
    if (this.pushRaf != null) {
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.pushRaf);
      else clearTimeout(this.pushRaf);
      this.pushRaf = null;
    }
    this.livingClockUnsub = this.organismClock.subscribe({
      id: "gasper-living-runtime",
      priority: 30,
      onFrame: (frame: OrganismClockFrame) => {
        if (!this.running || this.eightStateLoop) return;
        this.lastClockFrame = {
          timeMs: frame.timeMs,
          deltaMs: frame.deltaMs,
          frameIndex: frame.frameIndex,
        };
        this.advanceLegacyTransport(frame.timeMs);
        // Synchronous flush guarantees state is resolved before priority-90 projection.
        this.pushCombinedNow(this.lastClockFrame);
      },
    });
  }

  private killLivingClock() {
    if (this.livingClockUnsub) {
      this.livingClockUnsub();
      this.livingClockUnsub = null;
    }
  }

  /** Apply mode policy without tearing down breath/blink tracks when possible. */
  applyModePolicy(policy: {
    autoSequence: boolean;
    restrainedIdle: boolean;
    freezeSequence: boolean;
  }) {
    this.restrainedIdle = policy.restrainedIdle;
    this.autoSequence = policy.autoSequence && !policy.restrainedIdle;
    this.forceInterrupt = this.autoSequence && this.forceInterrupt;
    if (this.eightStateLoop) {
      // Preserve the current interpolated frame; mode changes only alter
      // clock-owned transport scheduling and never restart through Neutral.
      this.eightLoop.setAutoLoop(
        this.running && !policy.freezeSequence && this.autoSequence,
      );
      this.emit();
      return;
    }
    if (policy.freezeSequence || !this.autoSequence) {
      this.clearLegacyTransport();
    } else if (this.running && this.autoSequence) {
      this.scheduleNextStep(this.stepSeconds);
    }
    this.emit();
  }

  stop() {
    this.running = false;
    this.killLivingClock();
    if (this.pushRaf != null) {
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.pushRaf);
      else clearTimeout(this.pushRaf);
      this.pushRaf = null;
    }
    this.eightLoop.stop();
    this.livingAuthority.stop();
    this.lastLivingSnapshot = null;
    this.clearLegacyTransport();
    this.microstateTl?.kill();
    this.microstateTl = null;
    this.midBlink = false;
    this.midSaccade = false;
    this.lastInterruptBlend = false;
    this.frameRecorder = null;
    this.emit();
  }

  /**
   * Deterministic multi-frame capture entry.
   * When attached + continuity active, samples through the living flush policy
   * (same ownership + boundStep path as runtime). Falls back to pure continuity
   * capture when not attached.
   */
  captureFrameSequence(opts: CaptureSequenceOptions): ContinuityFrame[] {
    const seed = opts.seed ?? this.seed ?? 1007;
    if (this.rawFlush && this.snapshot && this.continuityPolicyActive) {
      return this.captureAttachedLivingSequence({
        ...opts,
        seed,
        proofMode: opts.proofMode !== false,
      });
    }
    return captureLivingFrameSequence({
      ...opts,
      proofMode: opts.proofMode !== false,
      seed,
    });
  }

  /**
   * Capture + analyze position/velocity/acceleration/jerk + eye/mouth/contour/topology.
   */
  analyzeFrameSequence(opts: CaptureSequenceOptions): FrameSequenceAnalysis {
    const frames = this.captureFrameSequence(opts);
    return analyzeFrameSequence(frames, {
      seed: opts.seed ?? this.seed ?? 1007,
      dt: opts.dt ?? 1 / 60,
      deterministicScheduling: true,
    });
  }

  /**
   * R4 no-blackout route matrix (Wake / Dormant Maintain / bi-di / interrupt / reset).
   * Drives shipped capture + temporal predicates; GSAP remains frame authority.
   */
  captureNoBlackoutRouteMatrix(opts?: {
    seed?: number;
    dt?: number;
    frameCount?: number;
  }): {
    routes: Record<
      NoBlackoutRouteId,
      {
        frames: ContinuityFrame[];
        analysis: FrameSequenceAnalysis;
        noBlackout: TemporalNoBlackoutReport;
      }
    >;
    allReadable: boolean;
  } {
    const seed = (opts?.seed ?? this.seed ?? 1007) >>> 0;
    const dt = opts?.dt ?? 1 / 60;
    const result = captureAndAnalyzeNoBlackoutRouteMatrix({
      seed,
      dt,
      frameCount: opts?.frameCount ?? 24,
    });
    // When attached, re-flush through continuity policy and re-analyze the
    // post-policy frames so allReadable reflects the living path (not pure
    // capture alone). Mirror captureAndAnalyzeNoBlackoutRoute mode/wakeRoute/
    // forwardFrames wiring so inverse + progressive predicates are not dropped.
    if (this.rawFlush && this.continuityPolicyActive) {
      const routeOrder: NoBlackoutRouteId[] = [
        "wake-reconstruct",
        "dormant-maintain",
        "bidirectional-forward",
        "bidirectional-reverse",
        "wake-dormant-forward",
        "wake-dormant-reverse",
        "interruption",
        "reset",
      ];
      let biDiForward: ContinuityFrame[] | undefined;
      let wakeDormantForward: ContinuityFrame[] | undefined;
      for (const routeId of routeOrder) {
        const route = result.routes[routeId];
        if (!route) continue;
        this.lastFlushed = {};
        this.priorFlushVelocity = {};
        this.priorFlushAcceleration = {};
        const policedFrames: ContinuityFrame[] = [];
        for (const frame of route.frames) {
          this.lastInterruptBlend = frame.interruptEdge === true;
          const policed = this.applyContinuityFlushPolicy(frame.channels);
          this.rawFlush(policed);
          policedFrames.push({
            ...frame,
            channels: { ...policed },
            ownership: { ...this.channelOwnership },
            topology: this.getTopologyLock(),
          });
        }
        const analysis = analyzeFrameSequence(policedFrames, {
          seed,
          dt,
          deterministicScheduling: true,
        });
        const mode =
          routeId === "wake-reconstruct" || routeId === "wake-dormant-forward"
            ? ("wake" as const)
            : routeId === "dormant-maintain" ||
                routeId === "wake-dormant-reverse"
              ? ("dormant" as const)
              : routeId === "interruption"
                ? ("interrupt" as const)
                : routeId === "reset"
                  ? ("reset" as const)
                  : ("ordinary" as const);
        const forwardFrames =
          routeId === "bidirectional-reverse"
            ? biDiForward
            : routeId === "wake-dormant-reverse"
              ? wakeDormantForward
              : undefined;
        const noBlackout = analyzeNoBlackoutSequence(policedFrames, {
          mode,
          wakeRoute:
            routeId === "wake-reconstruct" ||
            routeId === "wake-dormant-forward",
          forwardFrames,
        });
        if (routeId === "bidirectional-forward") biDiForward = policedFrames;
        if (routeId === "wake-dormant-forward") {
          wakeDormantForward = policedFrames;
        }
        result.routes[routeId] = {
          frames: policedFrames,
          analysis,
          noBlackout,
        };
      }
      result.allReadable = Object.values(result.routes).every(
        (r) => r.noBlackout.readable && r.analysis.boundedDerivatives,
      );
      this.lastInterruptBlend = false;
    }
    return result;
  }

  /**
   * Full-matrix energy + transition continuity capture (shipped entry).
   * Covers Neutral/Listening/Thinking/Recognition/Comet/Blocked/Pleased/
   * Dormant/Wake/interruption/reset/expression routes. Energy span material.
   */
  captureEnergyTransitionMatrix(opts?: {
    seed?: number;
    dt?: number;
    framesPerRoute?: number;
    forceInterrupt?: boolean;
  }): {
    frames: ContinuityFrame[];
    energy: EnergySpanReport;
    routeHoldLevels: Record<string, number>;
    analysis: FrameSequenceAnalysis;
  } {
    const seed = (opts?.seed ?? this.seed ?? 1007) >>> 0;
    const result = captureAndAnalyzeFullEnergyMatrix({
      seed,
      dt: opts?.dt ?? 1 / 60,
      framesPerRoute: opts?.framesPerRoute ?? 8,
      forceInterrupt: opts?.forceInterrupt !== false,
    });
    // When attached, re-flush through continuity policy so host sees real energy.
    if (this.rawFlush && this.continuityPolicyActive) {
      this.lastFlushed = {};
      this.priorFlushVelocity = {};
      this.priorFlushAcceleration = {};
      for (const frame of result.frames) {
        this.lastInterruptBlend = frame.interruptEdge === true;
        const policed = this.applyContinuityFlushPolicy(frame.channels);
        this.rawFlush(policed);
      }
      this.lastInterruptBlend = false;
    }
    return {
      frames: result.frames,
      energy: result.energy,
      routeHoldLevels: result.routeHoldLevels,
      analysis: result.analysis,
    };
  }

  /** Active energy route id for grammar resolution (eight-state preferred). */
  private resolveActiveEnergyRoute(): string {
    if (this.eightStateLoop) {
      const st = this.eightLoop.getStatus();
      if (st?.stateId) return st.stateId;
    }
    if (this.lastInterruptBlend) return "interruption";
    return this.microstate;
  }

  private resolveAntiCollapseMode(routeId: string): AntiCollapseMode {
    const mode = resolveEnergyTarget(routeId).mode;
    return mode;
  }

  /**
   * Drive a fixed-dt proof sequence through the attached living flush policy.
   * Uses continuity helpers (smootherstep schedule + interrupt blend + ownership)
   * and records post-policy frames — not a parallel reimplementation of analysis.
   */
  private captureAttachedLivingSequence(
    opts: CaptureSequenceOptions,
  ): ContinuityFrame[] {
    // Reuse shipped pure capture for channel trajectories, then re-flush each
    // frame through applyContinuityFlushPolicy so ownership/bounds match live path.
    const synthetic = captureLivingFrameSequence({
      ...opts,
      proofMode: opts.proofMode !== false,
    });
    const recorder = new FrameSequenceRecorder({
      seed: opts.seed >>> 0,
      dt: opts.dt ?? 1 / 60,
    });
    recorder.start();
    // Reset derivative state for deterministic attached capture.
    this.lastFlushed = {};
    this.priorFlushVelocity = {};
    this.priorFlushAcceleration = {};
    this.continuityPolicyActive = true;
    for (const frame of synthetic) {
      this.lastInterruptBlend = frame.interruptEdge === true;
      if (frame.interruptEdge) {
        this.interruptBlendFramesRemaining = Math.max(
          this.interruptBlendFramesRemaining,
          14,
        );
      }
      // Infer blink/saccade ownership hints from synthetic ownership.
      this.midBlink = frame.ownership.eye_openness === "blink";
      this.midSaccade = frame.ownership.gaze === "saccade";
      this.resolveChannelOwnership();
      const policed = this.applyContinuityFlushPolicy(frame.channels);
      // Also emit to raw flush so host mirrors proof sequence.
      this.rawFlush?.(policed);
      recorder.push({
        channels: policed,
        ownership: { ...this.channelOwnership },
        topology: this.getTopologyLock(),
        transition: frame.transition,
        interruptEdge: frame.interruptEdge,
        t: frame.t,
      });
    }
    this.lastInterruptBlend = false;
    this.interruptBlendFramesRemaining = 0;
    this.midBlink = false;
    this.midSaccade = false;
    this.resolveChannelOwnership();
    return recorder.snapshot();
  }

  /** Expose raw analysis helper for already-captured frames (tests). */
  static analyzeCapturedFrames(
    frames: ContinuityFrame[],
    opts: { seed: number; dt: number },
  ): FrameSequenceAnalysis {
    return analyzeFrameSequence(frames, {
      seed: opts.seed,
      dt: opts.dt,
      deterministicScheduling: true,
    });
  }

  /**
   * Interrupt-safe blend helper for retarget-from-current without snap.
   * Bounded by max velocity so derivatives stay continuous.
   */
  blendInterruptSafe(
    current: DomainScalarMap,
    target: DomainScalarMap,
    alpha = 1,
  ): DomainScalarMap {
    return interruptSafeBlend(current, target, alpha, {
      dt: 1 / 60,
      maxVelocity: 8,
    });
  }

  /** Re-resolve anti-flicker ownership for contested channels. */
  private resolveChannelOwnership(): void {
    const claims = livingFrameClaims({
      midBlink: this.midBlink,
      midSaccade: this.midSaccade,
      interrupted: this.lastInterruptBlend,
      holdLastGood: false,
    });
    this.channelOwnership = resolveOwnership(claims, [
      ...CONTESTED_OWNERSHIP_CHANNELS,
    ]);
  }

  /** Snapshot topology lock constants (never rewritten mid-transition). */
  getTopologyLock() {
    return {
      contourSamples: TOPOLOGY_LOCK.contourSamples,
      structuralNodes: TOPOLOGY_LOCK.structuralNodes,
      structuralTriangles: TOPOLOGY_LOCK.structuralTriangles,
      topologyStable: TOPOLOGY_LOCK.topologyStable as boolean,
    };
  }

  /**
   * Restore hold-last-good channels (standalone recovery; no HQ/bridge required).
   * Uses interrupt-safe blend + continuity flush policy — never hard-snaps.
   */
  recoverHoldLastGood(): DomainScalarMap | null {
    if (!this.holdLastGood || !this.flush) return this.holdLastGood;
    const current = this.snapshot?.() ?? this.lastFlushed;
    const blended = interruptSafeBlend(current, this.holdLastGood, 1, {
      dt: 1 / 60,
      maxVelocity: DEFAULT_CONTINUITY_THRESHOLDS.maxVelocity * 0.5,
    });
    this.lastInterruptBlend = true;
    this.interruptBlendFramesRemaining = 4;
    this.resolveChannelOwnership();
    this.flush(blended);
    this.lastInterruptBlend = false;
    this.resolveChannelOwnership();
    return { ...this.holdLastGood };
  }

  setReducedMotion(on: boolean) {
    this.reducedMotion = on;
    if (this.running) {
      this.start({
        seed: this.seed ?? undefined,
        reducedMotion: on,
        autoSequence: this.autoSequence,
        restrainedIdle: this.restrainedIdle,
        stepSeconds: this.stepSeconds,
        forceInterrupt: this.forceInterrupt,
        eightStateLoop: this.eightStateLoop,
        proofMode: this.proofMode,
        timingScale: this.timingScale,
      });
    }
  }

  /** Convert fallback microstate id → AnimationPlan (same visible targets, plan adapter path). */
  static microstateToAnimationPlan(
    id: MicrostateId | keyof typeof MICROSTATE_ALIASES,
    opts?: { durationSeconds?: number; planId?: string },
  ): import("./GsapPlanCompiler").AnimationPlan {
    const canonicalId = resolveMicrostateId(id);
    const targets = { ...MICROSTATE_TARGETS[canonicalId] };
    return {
      id: opts?.planId ?? `fallback-demo:${canonicalId}`,
      targetAnchorId: canonicalId,
      durationSeconds: opts?.durationSeconds ?? 0.75,
      interruptionMode: "retarget-current",
      operators: [
        {
          id: `op-${canonicalId}`,
          weight: 1,
          durationSeconds: opts?.durationSeconds ?? 0.75,
          targets,
        },
      ],
      rigTargets: targets,
      warnings: [
        "Built from MICROSTATE_TARGETS fallback demo — not authored Book 004 policy package.",
      ],
    };
  }

  /** Eight-state → AnimationPlan with per-channel scale support. */
  static eightStateToAnimationPlan(
    id: EightStateId,
    opts?: { durationSeconds?: number; planId?: string },
  ): import("./GsapPlanCompiler").AnimationPlan {
    const targets = { ...EIGHT_STATE_TARGETS[id] };
    return {
      id: opts?.planId ?? `eight-state:${id}`,
      targetAnchorId: id,
      durationSeconds: opts?.durationSeconds ?? 0.75,
      interruptionMode: "retarget-current",
      operators: [
        {
          id: `op-eight-${id}`,
          weight: 1,
          durationSeconds: opts?.durationSeconds ?? 0.75,
          targets,
        },
      ],
      rigTargets: targets,
      warnings: [],
    };
  }

  /**
   * Retarget microstate from current interpolated values (no snap to canonical).
   */
  goMicrostate(
    id: MicrostateId,
    opts?: { duration?: number; interrupt?: boolean },
  ) {
    if (this.eightStateLoop) {
      // Map legacy ids into eight-state space
      const mapped = mapMicroToEight(id);
      this.eightLoop.goState(mapped, {
        duration: opts?.duration,
        interrupt: opts?.interrupt,
      });
      if (isMicrostateId(mapped) || id) this.microstate = id;
      if (opts?.interrupt) {
        this.interruptCount += 1;
        this.lastInterruptAt = this.organismClock.nowMs();
      }
      this.emit();
      return;
    }
    if (!this.proxyFor || !this.flush) return;
    const duration =
      opts?.duration ??
      (this.reducedMotion ? 0.35 : id === "presence-blocked-strain" ? 0.9 : 0.75);
    const targets = { ...MICROSTATE_TARGETS[id] };
    if (this.reducedMotion) {
      for (const k of Object.keys(targets)) {
        const def = MICROSTATE_TARGETS["presence-neutral-settled"][k] ?? targets[k];
        targets[k] = def + (targets[k]! - def) * 0.35;
      }
    }

    this.microstate = id;
    this.livingAuthority.setState(mapMicroToEight(id), {
      durationSeconds: duration,
      interrupt: opts?.interrupt === true,
      timeMs: this.organismClock.nowMs(),
    });

    this.microstateTl?.kill();
    const tl = g.timeline({
      defaults: { overwrite: "auto" },
      onUpdate: () => this.pushCombined(),
      onComplete: () => {
        this.pushCombined();
        this.fireTransitionSettled();
      },
    });
    tl.addLabel(`micro:${id}`, 0);

    for (const [bindingId, target] of Object.entries(targets)) {
      // VEC-602: the shared facial continuum owns eyes, gaze, mouth, and face.
      if (FACIAL_TEMPORAL_BINDINGS.has(bindingId)) continue;
      const proxy = this.proxyFor(bindingId, this.snapshot?.()[bindingId] ?? 0);
      tl.to(
        proxy,
        {
          value: target,
          duration,
          ease:
            id === "recovering"
              ? "power1.out"
              : id === "presence-blocked-strain"
                ? "power2.inOut"
                : "power2.out",
          overwrite: "auto",
        },
        0,
      );
    }

    this.microstateTl = tl;
    if (opts?.interrupt) {
      this.interruptCount += 1;
      this.lastInterruptAt = this.organismClock.nowMs();
    }
    this.pushCombined();
    this.emit();
  }

  /** Go to an eight-state endpoint from current values. */
  goEightState(id: EightStateId, opts?: { duration?: number; interrupt?: boolean }) {
    if (this.eightStateLoop) {
      this.eightLoop.goState(id, {
        duration: opts?.duration,
        interrupt: opts?.interrupt,
      });
      const micro = mapEightToMicro(id);
      if (micro) this.microstate = micro;
      this.emit();
      return;
    }
    // Ad-hoc: use microstate path with eight targets via temporary plan
    if (!this.proxyFor || !this.flush) return;
    const duration = opts?.duration ?? 0.75;
    const targets = { ...EIGHT_STATE_TARGETS[id] };
    this.livingAuthority.setState(id, {
      durationSeconds: duration,
      interrupt: opts?.interrupt === true,
      timeMs: this.organismClock.nowMs(),
    });
    this.microstateTl?.kill();
    const tl = g.timeline({
      defaults: { overwrite: "auto" },
      onUpdate: () => this.pushCombined(),
      onComplete: () => {
        this.pushCombined();
        this.fireTransitionSettled();
      },
    });
    for (const [bindingId, target] of Object.entries(targets)) {
      if (FACIAL_TEMPORAL_BINDINGS.has(bindingId)) continue;
      const proxy = this.proxyFor(bindingId, this.snapshot?.()[bindingId] ?? 0);
      tl.to(proxy, { value: target, duration, ease: "power2.out", overwrite: "auto" }, 0);
    }
    this.microstateTl = tl;
    if (opts?.interrupt) {
      this.interruptCount += 1;
      this.lastInterruptAt = this.organismClock.nowMs();
    }
    this.pushCombined();
    this.emit();
  }

  /** Force interrupt mid-transition into a new microstate from current values. */
  interruptTo(id: MicrostateId) {
    // Capture current as hold-last-good before retarget (standalone recovery).
    if (this.snapshot) {
      this.holdLastGood = { ...this.snapshot() };
    }
    // Hold interrupt_blend ownership across retarget window (~0.55s @ 60fps ≈ 33 frames;
    // use 20 as a conservative span for proof + live policy).
    this.lastInterruptBlend = true;
    this.interruptBlendFramesRemaining = 20;
    this.resolveChannelOwnership();
    if (this.eightStateLoop) {
      this.eightLoop.interruptTo(mapMicroToEight(id), { duration: 0.55 });
      this.microstate = id;
      this.interruptCount += 1;
      this.lastInterruptAt = this.organismClock.nowMs();
      this.emit();
      return;
    }
    this.goMicrostate(id, { duration: 0.55, interrupt: true });
  }

  /** Interrupt eight-state loop to a new state from interpolated values. */
  interruptEightTo(id: EightStateId) {
    if (this.snapshot) {
      this.holdLastGood = { ...this.snapshot() };
    }
    this.lastInterruptBlend = true;
    this.interruptBlendFramesRemaining = 20;
    this.resolveChannelOwnership();
    if (this.eightStateLoop) {
      const sample = this.eightLoop.interruptTo(id);
      this.interruptCount += 1;
      this.lastInterruptAt = this.organismClock.nowMs();
      this.emit();
      return sample;
    }
    this.goEightState(id, { duration: 0.55, interrupt: true });
    return null;
  }

  private scheduleNextStep(delaySec: number) {
    this.scheduleLegacyTransport(delaySec, () => {
      if (!this.running) return;
      this.advanceSequence();
    });
  }

  private advanceSequence() {
    if (
      this.forceInterrupt &&
      !this.interruptedThisCycle &&
      this.microstate === "presence-thinking-knit"
    ) {
      this.goMicrostate("presence-blocked-strain", { duration: 1.1 });
      this.scheduleLegacyTransport(0.35, () => {
        if (!this.running) return;
        this.interruptedThisCycle = true;
        this.interruptTo("recovering");
        this.sequenceIndex = BEHAVIORAL_SEQUENCE.indexOf("recovering");
        this.scheduleNextStep(this.stepSeconds);
      });
      return;
    }

    this.sequenceIndex =
      (this.sequenceIndex + 1) % BEHAVIORAL_SEQUENCE.length;
    if (this.sequenceIndex === 0) {
      this.interruptedThisCycle = false;
    }
    const next = BEHAVIORAL_SEQUENCE[this.sequenceIndex]!;
    this.goMicrostate(next);
    this.scheduleNextStep(this.stepSeconds);
  }

  private scheduleLegacyTransport(delaySec: number, action: () => void) {
    this.clearLegacyTransport();
    if (!this.running || !this.autoSequence) return;
    this.sequenceDueAtOrganismMs =
      this.organismClock.nowMs() + Math.max(0.05, delaySec) * 1000;
    this.sequenceAction = action;
  }

  private clearLegacyTransport() {
    this.sequenceDueAtOrganismMs = null;
    this.sequenceAction = null;
  }

  private advanceLegacyTransport(timeMs: number) {
    const due = this.sequenceDueAtOrganismMs;
    if (due == null || timeMs < due) return;
    const action = this.sequenceAction;
    this.clearLegacyTransport();
    action?.();
  }

  private pushCombined() {
    if (this.pushRaf != null) return;
    const schedule =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : ((cb: FrameRequestCallback) =>
            setTimeout(() => cb(this.organismClock.nowMs()), 0) as unknown as number);
    this.pushRaf = schedule(() => {
      this.pushRaf = null;
      this.pushCombinedNow({
        timeMs: this.organismClock.nowMs(),
        deltaMs: this.organismClock.getDeltaMs(),
        frameIndex: this.lastClockFrame.frameIndex,
      });
    });
  }

  private pushCombinedNow(
    frame: Pick<OrganismClockFrame, "timeMs" | "deltaMs" | "frameIndex"> = this.lastClockFrame,
  ) {
    if (!this.flush || !this.proxyFor || !this.snapshot) return;
    const values = { ...this.snapshot() };
    for (const id of Object.keys(values)) {
      values[id] = this.proxyFor(id, values[id]).value;
    }
    const resolved = this.livingAuthority.evaluate(frame, values);
    this.lastLivingSnapshot = resolved;
    this.unifiedAudioFrameHandler?.(resolved.audio);
    this.midBlink = resolved.blinkActive;
    this.midSaccade = resolved.saccadeActive;
    this.resolveChannelOwnership();
    // Flush goes through the existing continuity policy and canonical compositor.
    this.flush(resolved.values);
  }

  /** Test helper: run one sequence step immediately. */
  debugAdvance() {
    if (this.eightStateLoop) {
      this.eightLoop.debugAdvance();
      return;
    }
    this.advanceSequence();
  }

  /** Test helper: fire one blink now. */
  debugBlink() {
    if (this.eightStateLoop) {
      this.eightLoop.debugBlink();
      return;
    }
    this.livingAuthority.triggerBlink(this.organismClock.nowMs());
    this.pushCombined();
  }

  /** Test helper: fire one saccade now. */
  debugSaccade() {
    if (this.eightStateLoop) {
      this.eightLoop.debugSaccade();
      return;
    }
    this.livingAuthority.triggerSaccade(this.organismClock.nowMs());
    this.pushCombined();
  }

  // ---------------------------------------------------------------------------
  // Embodiment morphology (volume-preserving bidirectional law)
  // GSAP remains frame authority; morphology is pure policy + capture helpers.
  // ---------------------------------------------------------------------------

  /**
   * Sample a dense morphology sequence for an embodiment pair.
   * Does not steal GSAP ticks — pure law evaluation with optional interrupt.
   */
  sampleEmbodimentMorphology(opts: {
    from: EmbodimentId;
    to: EmbodimentId;
    frameCount?: number;
    dt?: number;
    chiralityBias?: number;
    reverse?: boolean;
    interruptAt?: number;
    interruptTo?: EmbodimentId;
  }): MorphologyFrame[] {
    return sampleMorphologySequence(opts);
  }

  /**
   * Drive morphology frames through the living continuity flush policy
   * (ownership, boundStep, hold-last-good, topology lock). Standalone-safe.
   * Also binds exclusive visible geometry snapshots for the five embodiments.
   */
  captureEmbodimentTransition(opts: {
    from: EmbodimentId;
    to: EmbodimentId;
    frameCount?: number;
    dt?: number;
    chiralityBias?: number;
    reverse?: boolean;
    interruptAt?: number;
    interruptTo?: EmbodimentId;
    seed?: number;
  }): {
    morphology: MorphologyFrame[];
    continuity: ContinuityFrame[];
    geometry: VisibleGeometrySnapshot[];
    featureSpans: FeatureSpanReport;
    topologyAuthorities: ExclusiveTopologyAuthority[];
    defects: EmbodimentDefectFinding[];
    clean: boolean;
    exclusiveTopology: boolean;
  } {
    const morphology = sampleMorphologySequence({
      from: opts.from,
      to: opts.to,
      frameCount: opts.frameCount ?? 48,
      dt: opts.dt ?? 1 / 60,
      chiralityBias: opts.chiralityBias,
      reverse: opts.reverse,
      interruptAt: opts.interruptAt,
      interruptTo: opts.interruptTo,
    });

    const seed = (opts.seed ?? this.seed ?? 1007) >>> 0;
    const dt = opts.dt ?? 1 / 60;
    const recorder = new FrameSequenceRecorder({ seed, dt });
    recorder.start();

    // Reset derivative state for deterministic capture through continuity policy.
    const wasActive = this.continuityPolicyActive;
    this.continuityPolicyActive = true;
    this.lastFlushed = {};
    this.priorFlushVelocity = {};
    this.priorFlushAcceleration = {};

    const continuity: ContinuityFrame[] = [];
    const geometry: VisibleGeometrySnapshot[] = [];
    const topologyAuthorities: ExclusiveTopologyAuthority[] = [];
    let prevSnap: VisibleGeometrySnapshot | null = null;

    for (let i = 0; i < morphology.length; i++) {
      const m = morphology[i]!;
      const interruptEdge =
        typeof opts.interruptAt === "number" &&
        i === Math.round(opts.interruptAt * (morphology.length - 1));
      if (interruptEdge) {
        this.lastInterruptBlend = true;
        this.interruptBlendFramesRemaining = Math.max(
          this.interruptBlendFramesRemaining,
          14,
        );
        // Hold-last-good snapshot at interrupt (standalone recovery aid)
        this.holdLastGood = { ...m.channels };
      }
      this.resolveChannelOwnership();
      const policed = this.applyContinuityFlushPolicy({
        ...m.channels,
        // Preserve defect-proxy channels after continuity bounds
        axial_needle: 0,
        ghost_anatomy: 0,
        horizontal_shear: 0,
        dual_silhouette: m.specialty.dualSilhouette,
        singularity_mix: m.specialty.singularityMix,
        comet_mix: m.specialty.cometMix,
        dormant_mix: m.specialty.dormantMix,
        wake_mix: m.specialty.wakeMix,
      });
      // Re-force zero defect channels after bound step (policy must not reintroduce needles)
      policed.axial_needle = 0;
      policed.ghost_anatomy = 0;
      policed.horizontal_shear = 0;

      if (this.rawFlush) {
        this.rawFlush(policed);
      }

      const frame: ContinuityFrame = {
        index: i,
        t: i * dt,
        channels: policed,
        ownership: { ...this.channelOwnership },
        topology: this.getTopologyLock(),
        contour: {
          overall_height: policed.overall_height ?? 1,
          overall_width: policed.overall_width ?? 1,
          crown_height: policed.crown_height ?? 0,
          ground_flattening: policed.ground_flattening ?? 0,
          lower_body_fullness: policed.lower_body_fullness ?? 1,
        },
        transition: {
          from: opts.from,
          to: opts.interruptTo && interruptEdge ? opts.interruptTo : opts.to,
          progress: m.progress,
          phase: interruptEdge
            ? "interrupted"
            : m.progress <= 0.02 || m.progress >= 0.98
              ? "hold"
              : "transition",
        },
        interruptEdge,
      };
      continuity.push(frame);
      recorder.push(frame);

      // Exclusive visible geometry binding (single specialty topology author)
      const snap = evaluateVisibleGeometrySnapshot(m, {
        timeSeconds: i * dt,
        seed: seed + i,
        previous: prevSnap,
        holdLastGood: interruptEdge,
      });
      geometry.push(snap);
      topologyAuthorities.push(
        buildExclusiveTopologyAuthority({
          contourAuthority: snap.topologyAuthority,
          specialtyAuthority: snap.specialty.activeAuthor,
          dualSilhouetteResidual: snap.defects.staleSilhouette,
        }),
      );
      prevSnap = snap;
    }

    this.lastInterruptBlend = false;
    this.interruptBlendFramesRemaining = 0;
    this.continuityPolicyActive = wasActive;
    this.resolveChannelOwnership();

    const morphDefects = detectEmbodimentDefects(morphology);
    const contDefects = detectEmbodimentDefectsFromContinuity(continuity);
    const defects = [...morphDefects, ...contDefects];
    const exclusiveTopology =
      geometry.every((g) => hasExclusiveTopologyAuthority(g)) &&
      topologyAuthorities.every((a) => a.exclusive);
    return {
      morphology,
      continuity,
      geometry,
      featureSpans: computeFeatureSpans(geometry),
      topologyAuthorities,
      defects,
      clean: isEmbodimentSequenceClean(defects) && exclusiveTopology,
      exclusiveTopology,
    };
  }

  /**
   * Sample bound geometry sequence only (no continuity flush) for pure
   * topology-binding proofs. GSAP remains frame authority elsewhere.
   */
  sampleBoundEmbodimentGeometry(opts: {
    from: EmbodimentId;
    to: EmbodimentId;
    frameCount?: number;
    dt?: number;
    chiralityBias?: number;
    reverse?: boolean;
    interruptAt?: number;
    interruptTo?: EmbodimentId;
    seed?: number;
  }): {
    geometry: VisibleGeometrySnapshot[];
    featureSpans: FeatureSpanReport;
    distinctIntermediates: ReturnType<typeof intermediateShapesDistinct>;
    volumeAttachment: ReturnType<typeof volumeAndAttachmentContinuous>;
    exclusiveTopology: boolean;
    defectsClean: boolean;
  } {
    const geometry = sampleBoundGeometrySequence(opts);
    const exclusiveTopology = geometry.every((g) =>
      hasExclusiveTopologyAuthority(g),
    );
    const defectsClean = geometry.every((g) => snapshotDefectsClean(g));
    return {
      geometry,
      featureSpans: computeFeatureSpans(geometry),
      distinctIntermediates: intermediateShapesDistinct(geometry),
      volumeAttachment: volumeAndAttachmentContinuous(geometry),
      exclusiveTopology,
      defectsClean,
    };
  }

  /**
   * Reverse-route capture: to→from over the same frame budget.
   * Inverse-consistent with forward within morphology law.
   */
  captureEmbodimentReverse(opts: {
    from: EmbodimentId;
    to: EmbodimentId;
    frameCount?: number;
    dt?: number;
    seed?: number;
  }) {
    return this.captureEmbodimentTransition({
      from: opts.to,
      to: opts.from,
      frameCount: opts.frameCount,
      dt: opts.dt,
      reverse: true,
      seed: opts.seed,
    });
  }

  /**
   * Mid-transition interrupt: retarget toward interruptTo without teleport,
   * preserving hold-last-good and exclusive contour ownership.
   */
  interruptEmbodimentTransition(opts: {
    from: EmbodimentId;
    to: EmbodimentId;
    interruptTo: EmbodimentId;
    interruptAt?: number;
    frameCount?: number;
    seed?: number;
  }) {
    return this.captureEmbodimentTransition({
      from: opts.from,
      to: opts.to,
      interruptAt: opts.interruptAt ?? 0.45,
      interruptTo: opts.interruptTo,
      frameCount: opts.frameCount ?? 48,
      seed: opts.seed,
    });
  }

  /** Rest channels for a named embodiment (morphology law floor poses). */
  static embodimentRest(id: EmbodimentId): DomainScalarMap {
    return { ...EMBODIMENT_REST[id] };
  }

  /** Single morphology frame evaluation (pure). */
  static evaluateEmbodimentMorphology(opts: {
    from: EmbodimentId;
    to: EmbodimentId;
    progress: number;
    reverse?: boolean;
    chiralityBias?: number;
  }): MorphologyFrame {
    return evaluateMorphologyFrame(opts);
  }
}

function mapMicroToEight(id: MicrostateId): EightStateId {
  if (id === "pleased-soft") return "presence-pleased-resolve";
  if (id === "recovering") return "presence-pleased-resolve";
  return id as EightStateId;
}

function mapEightToMicro(id: EightStateId): MicrostateId | null {
  if (id === "presence-pleased-resolve") return "pleased-soft";
  if (id === "presence-recognition-spark") return "presence-thinking-knit";
  if (id === "comet-executing-drive") return "presence-listening-receive";
  if (id === "dormant-orbit-maintain") return "presence-blocked-strain";
  if (id === "wake") return "recovering";
  if (isMicrostateId(id)) return id;
  return null;
}

export const gasperLiving = new GasperLivingRuntime();
