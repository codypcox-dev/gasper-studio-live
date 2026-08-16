/**
 * Eight-state route adapter over one clock-driven living/facial authority.
 * GSAP owns authored non-facial route transitions only; the temporal kernel owns life and face.
 *
 * Transition laws:
 * - start from actual current values
 * - no Neutral reset hop
 * - no teleport / face pop
 * - interruption retargets from interpolated state
 * - wake closes into Neutral without discontinuity
 * - living additive layers stay active on every hold
 */

import gsap from "../gsap-shim";
import type { DomainScalarMap } from "../GasperDomainState";
import {
  getGasperOrganismClock,
  type GasperOrganismClockPort,
  type OrganismClockFrame,
} from "../clock";
import { DEFAULT_LOOP_MANIFEST, computeCycleSeconds, stepForTransition } from "./loop-manifest";
import {
  easeForTransition,
  channelDurationScales,
  evaluateThreeBeatProgress,
  threeBeatSeed,
} from "./motion-grammar";
import {
  applyEmbodimentLifeToChannels,
  embodimentThreeBeatFor,
  evaluateEmbodimentLife,
  getEmbodimentLifeDescriptor,
  type GasperEmbodimentLifeId,
} from "./embodiment-life";
import {
  applySceneSuiteToChannels,
  evaluateSceneSuite,
  getSceneSuiteForEmbodiment,
  SCENE_SUITE_SILHOUETTE_CHANNELS,
  sceneSilhouetteAdmission,
  shouldKeySceneEntrance,
  type SceneSuiteSample,
} from "./scene-suites";
import {
  applyMicrovariationToChannels,
  evaluateMicrovariation,
} from "./microvariation";
import {
  applyLongRestMaintenance,
  evaluateLongRestMaintenance,
  LONG_REST_POLICY,
  type LongRestStatus,
} from "./long-rest";
import {
  EIGHT_STATE_TARGETS,
  projectReducedMotion,
  maxChannelDelta,
} from "./state-targets";
import { getEmbodimentStateTarget } from "./embodiment-state-matrix";
import type {
  EightStateId,
  EightStateLoopStatus,
  GasperLoopManifestV1,
  InterruptionSample,
  LoopStepV1,
  ThreeBeatProgress,
} from "./types";
import {
  ENERGY_CONTINUITY_KEYS,
  FACE_CONTINUITY_KEYS,
  SILHOUETTE_CONTINUITY_KEYS,
} from "./types";
import {
  FACIAL_TEMPORAL_BINDINGS,
  GasperLivingFacialAuthority,
  type LivingFacialSnapshot,
} from "../living";
import type { GasperUnifiedAudioFrame } from "../physics";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = gsap as any;

export type LoopTransitionFrame = {
  fromState: EightStateId;
  toState: EightStateId;
  progress: number;
  phase: "transition" | "hold";
};

export type LoopAttachApi = {
  flush: (values: DomainScalarMap) => void;
  proxyFor: (id: string, initial?: number) => { value: number };
  snapshot: () => DomainScalarMap;
  /** Product-renderer hook for smooth embodiment + expression projection. */
  onTransitionFrame?: (frame: LoopTransitionFrame) => void;
  /** Same-frame audio projection; never a second clock or scheduler. */
  onUnifiedAudioFrame?: (frame: GasperUnifiedAudioFrame) => void;
};

export type LoopControllerOptions = {
  seed?: number;
  reducedMotion?: boolean;
  autoLoop?: boolean;
  proofMode?: boolean;
  timingScale?: number;
  manifest?: GasperLoopManifestV1;
  /** When true, schedule forced interrupt cases for proof. */
  forceInterruptDemo?: boolean;
};

function q(n: number, digits = 4): number {
  const m = 10 ** digits;
  return Math.round(n * m) / m;
}

/**
 * Eight-state showcase loop with layered living holds.
 * Consumed by GasperLivingRuntime (or tests) via attach API.
 */
export class EightStateLoopController {
  private running = false;
  private stateId: EightStateId = "presence-neutral-settled";
  private routeIndex = 0;
  private phase: EightStateLoopStatus["phase"] = "idle";
  private cycleCount = 0;
  private reducedMotion = false;
  private proofMode = false;
  private seed: number | null = null;
  private autoLoop = false;
  private timingScale = 1;
  private manifest: GasperLoopManifestV1 = DEFAULT_LOOP_MANIFEST;
  private interruptCount = 0;
  private lastInterruptAt: number | null = null;
  private lastInterruptFrom: EightStateId | null = null;
  private lastInterruptTo: EightStateId | null = null;
  private cycleStartMs = 0;
  private forceInterruptDemo = false;
  private longRestActive = false;
  private longRestStartedOrganismMs: number | null = null;
  private autoLoopBeforeLongRest = false;

  private api: LoopAttachApi | null = null;
  private listeners = new Set<() => void>();

  /** Scenario transition timeline (primary layer). */
  private scenarioTl: { kill: () => void; progress: (v?: number) => number } | null = null;
  /** Route progression is clock due-time state, never a second timer authority. */
  private transportDueAtOrganismMs: number | null = null;
  private transportAction: (() => void) | null = null;

  /** VEC-601/602 single clock-driven temporal authority. */
  private readonly livingAuthority: GasperLivingFacialAuthority;
  private lastLivingSnapshot: LivingFacialSnapshot | null = null;
  private pushRaf: number | null = null;
  private livingClockUnsub: (() => void) | null = null;
  private readonly organismClock: GasperOrganismClockPort = getGasperOrganismClock();
  private cycleStartOrganismMs = 0;
  private lastClockFrame: Pick<OrganismClockFrame, "timeMs" | "deltaMs" | "frameIndex"> = {
    timeMs: 0,
    deltaMs: 0,
    frameIndex: 0,
  };
  /** GASPER-BEH-001: beat envelope anchor in organism clock ms (not wall clock / RAF). */
  private beatStateId: EightStateId = "presence-neutral-settled";
  private beatAnchorOrganismMs = 0;
  /** GASPER-UNIFIED-LIFE-001: authored profile grammar, not a second clock. */
  private embodimentId: GasperEmbodimentLifeId = "presence";
  /** Last production-consumed profile × state matrix entry. */
  private matrixTargetKey = "presence:presence-neutral-settled";
  /** GASPER-SCENE-001: last scene-suite sample (status/telemetry surface). */
  private lastSceneSample: SceneSuiteSample | null = null;
  /**
   * D-0088: scene-scoped silhouette admission — absolute values (base +
   * bound-clamped delta) for the fenced silhouette channels the active scene
   * sample authors. Empty when no silhouette beat is playing; the rig flush
   * admits ONLY these provenance-tagged values through the FormMaster fence.
   */
  private sceneSilhouette: Readonly<Record<string, number>> = Object.freeze({});
  /**
   * GASPER-SPACE-001 PHASE B (D-0090): the PRE-scene living base for the
   * fenced silhouette channels — the same base sceneSilhouetteAdmission uses,
   * so the physics authority composes absolute values against one shared
   * reference (base + physics delta) instead of drifting on its own.
   */
  private silhouetteBase: Readonly<Record<string, number>> | null = null;
  /** GASPER-SCENE-001: suite anchor — reset only when the embodiment changes,
   * so the macro-arc flows continuously across states within one embodiment. */
  private sceneAnchorOrganismMs = 0;

  /** Previous proxy snapshot for velocity estimation. */
  private prevSnap: DomainScalarMap = {};
  private prevSnapAt = 0;
  private velocity: DomainScalarMap = {};

  /** Interruption proof samples accumulated in-process. */
  readonly interruptionSamples: InterruptionSample[] = [];

  constructor(authority: GasperLivingFacialAuthority = new GasperLivingFacialAuthority()) {
    this.livingAuthority = authority;
  }

  attach(api: LoopAttachApi) {
    this.api = api;
  }

  /** Change the active embodiment grammar while preserving the current clock frame. */
  setEmbodiment(profileId: string): void {
    const next = getEmbodimentLifeDescriptor(profileId).profileId;
    if (next === this.embodimentId) return;
    this.embodimentId = next;
    // Preserve beatAnchorOrganismMs: changing the grammar must not restart a
    // visible life phase or create a timing discontinuity in the face/body.
    // GASPER-SCENE-001: the scene suite, by contrast, IS anchored to embodiment
    // arrival — a new embodiment begins a new performance (in → during → out).
    this.sceneAnchorOrganismMs = this.organismClock.nowMs();
    this.emit();
  }

  getEmbodiment(): GasperEmbodimentLifeId {
    return this.embodimentId;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  getStatus(): EightStateLoopStatus {
    const elapsed =
      this.running && this.cycleStartOrganismMs >= 0
        ? Math.max(0, (this.organismClock.nowMs() - this.cycleStartOrganismMs) / 1000)
        : 0;
    return {
      running: this.running,
      stateId: this.stateId,
      routeIndex: this.routeIndex,
      phase: this.phase,
      cycleCount: this.cycleCount,
      reducedMotion: this.reducedMotion,
      proofMode: this.proofMode,
      seed: this.seed,
      interruptCount: this.interruptCount,
      lastInterruptAt: this.lastInterruptAt,
      lastInterruptFrom: this.lastInterruptFrom,
      lastInterruptTo: this.lastInterruptTo,
      engine: "gsap",
      livingLayersActive: this.running && this.phase !== "idle",
      elapsedCycleSeconds: elapsed,
      targetCycleSeconds: computeCycleSeconds(this.manifest) * this.timingScale,
      embodimentId: this.embodimentId,
      matrixTargetKey: this.matrixTargetKey,
      breath: this.lastLivingSnapshot?.breath ?? 0,
      blinkPhase: this.lastLivingSnapshot?.blinkPhase ?? 0.56,
      gaze: this.lastLivingSnapshot?.gaze ?? 0,
      unifiedOscillatorCount: this.lastLivingSnapshot?.unified.activeOscillatorCount ?? 0,
      unifiedDampingRatio: this.lastLivingSnapshot?.unified.dampingRatio ?? 0,
      unifiedVolumeProduct: this.lastLivingSnapshot?.unified.volumeProduct ?? 0,
      unifiedBreathRateHz: this.lastLivingSnapshot?.unified.breathRateHz ?? 0,
      unifiedPulseRateHz: this.lastLivingSnapshot?.unified.pulseRateHz ?? 0,
      unifiedTimeScale: this.lastLivingSnapshot?.unified.timeScale ?? 1,
      unifiedWanderPink: this.lastLivingSnapshot?.unified.wanderPink ?? 0,
      unifiedMood: this.lastLivingSnapshot?.unified.mood ?? 0,
      unifiedLightIntensity: this.lastLivingSnapshot?.light?.intensity ?? 0,
      dispositionMood: this.lastLivingSnapshot?.disposition?.mood ?? 0,
      habitSalience: this.lastLivingSnapshot?.disposition?.habitSalience ?? 0,
      audioBindingWindowMs: this.lastLivingSnapshot?.audio.bindingWindowMs ?? 0,
      unifiedAudioSourceFrameIndex: this.lastClockFrame.frameIndex,
      lifePhase: this.getThreeBeatProgress().phase,
      activeRest: this.getThreeBeatProgress().phase === "hold",
      longRestActive: this.longRestActive,
      longRestElapsedSeconds: this.getLongRestStatus().elapsedSeconds,
      longRestBeatIndex: this.getLongRestStatus().beatIndex,
      autoLoop: this.autoLoop,
      sceneSuiteId: this.lastSceneSample?.suiteId ?? null,
      sceneMovementId: this.lastSceneSample?.movementId ?? null,
      sceneIntent: this.lastSceneSample?.intent ?? null,
    };
  }

  /** VEC-401-derived long-rest inspection; no scheduler or wall-clock state. */
  getLongRestStatus(): LongRestStatus {
    const nowMs = this.organismClock.nowMs();
    const startedAtMs = this.longRestStartedOrganismMs;
    const elapsedSeconds =
      startedAtMs == null ? 0 : Math.max(0, (nowMs - startedAtMs) / 1000);
    const maintenance = evaluateLongRestMaintenance(
      elapsedSeconds,
      this.seed ?? this.manifest.proofSeedDefault,
    );
    return Object.freeze({
      ...maintenance,
      active: this.longRestActive,
      startedAtMs,
    });
  }

  /**
   * GASPER-BEH-001: sample the active three-beat envelope from organism clock time.
   * Does not create a second RAF/timer authority — pure function of clock + anchor.
   */
  getThreeBeatProgress(opts?: {
    stateId?: EightStateId;
    timeMs?: number;
  }): ThreeBeatProgress {
    const stateId = opts?.stateId ?? this.beatStateId ?? this.stateId;
    const timeMs =
      opts?.timeMs ??
      this.lastClockFrame.timeMs ??
      this.organismClock.nowMs();
    const anchor = this.beatAnchorOrganismMs || timeMs;
    const elapsedSeconds = Math.max(0, (timeMs - anchor) / 1000);
    const baseSeed = this.seed ?? this.manifest.proofSeedDefault;
    const matrixTarget = getEmbodimentStateTarget(this.embodimentId, stateId);
    const threeBeat = matrixTarget?.life ?? embodimentThreeBeatFor(this.embodimentId, stateId);
    return evaluateThreeBeatProgress(threeBeat, elapsedSeconds, {
      stateId,
      seed: threeBeatSeed(stateId, baseSeed),
    });
  }

  private reanchorThreeBeat(stateId: EightStateId, timeMs?: number) {
    this.beatStateId = stateId;
    this.beatAnchorOrganismMs = timeMs ?? this.organismClock.nowMs();
  }

  /**
   * GASPER-SCENE-002 entrance keying: a scene begins when the eye expects —
   * at a state entry. If the suite is performing its exit ("out" movement),
   * the anchor resets so the next scene's "in" opens with the new state;
   * mid-arc the suite flows across states untouched (macro-law of holds).
   * Suites end their loop at zero deltas, so the re-anchor is jump-safe.
   */
  private keySceneSuiteToStateEntry(atOrganismMs: number) {
    const suite = getSceneSuiteForEmbodiment(this.embodimentId);
    const wrapped = atOrganismMs - this.sceneAnchorOrganismMs;
    if (shouldKeySceneEntrance(suite, wrapped)) {
      this.sceneAnchorOrganismMs = atOrganismMs;
    }
  }

  start(opts: LoopControllerOptions = {}) {
    if (!this.api) throw new Error("EightStateLoopController.attach() required before start()");
    this.stop();
    this.running = true;
    this.reducedMotion = !!opts.reducedMotion;
    this.proofMode = opts.proofMode === true || typeof opts.seed === "number";
    this.autoLoop = opts.autoLoop !== false;
    this.timingScale = opts.timingScale ?? 1;
    this.manifest = opts.manifest ?? DEFAULT_LOOP_MANIFEST;
    this.forceInterruptDemo = opts.forceInterruptDemo === true;
    this.cycleCount = 0;
    this.interruptCount = 0;
    this.lastInterruptAt = null;
    this.lastInterruptFrom = null;
    this.lastInterruptTo = null;
    this.routeIndex = 0;
    this.stateId = "presence-neutral-settled";
    this.phase = "hold";
    this.longRestActive = false;
    this.longRestStartedOrganismMs = null;
    this.autoLoopBeforeLongRest = false;
    // VEC-401: the host owns clock installation, lifecycle, mode, and seed.
    // This loop consumes frames and maintains only its local deterministic RNG.
    this.cycleStartOrganismMs = this.organismClock.nowMs();
    this.cycleStartMs = this.cycleStartOrganismMs; // legacy field: organism ms, not wall Date
    this.reanchorThreeBeat("presence-neutral-settled", this.cycleStartOrganismMs);
    this.sceneAnchorOrganismMs = this.cycleStartOrganismMs;
    this.interruptionSamples.length = 0;

    if (typeof opts.seed === "number") {
      this.seed = opts.seed;
    } else if (this.proofMode) {
      this.seed = this.manifest.proofSeedDefault;
    } else {
      this.seed = null;
    }
    this.livingAuthority.reset({
      seed: this.seed ?? this.manifest.proofSeedDefault,
      reducedMotion: this.reducedMotion,
    });

    const snap = this.api.snapshot();
    const allKeys = new Set<string>();
    for (const t of Object.values(EIGHT_STATE_TARGETS)) {
      for (const k of Object.keys(t)) allKeys.add(k);
    }
    for (const id of allKeys) {
      this.api.proxyFor(id, snap[id] ?? EIGHT_STATE_TARGETS["presence-neutral-settled"][id] ?? 0);
    }
    this.livingAuthority.start("presence-neutral-settled", this.organismClock.nowMs());
    this.prevSnap = this.api.snapshot();
    this.prevSnapAt = this.organismClock.nowMs();

    this.startLivingLayers();
    // Settle into neutral from current without teleport
    this.goState("presence-neutral-settled", { duration: 0.45 * this.timingScale, recordHold: true });
    if (this.autoLoop) {
      this.scheduleHoldThenAdvance(
        this.manifest.steps[this.manifest.steps.length - 1]!.holdSeconds * this.timingScale,
      );
    }
    this.emit();
  }

  stop() {
    this.running = false;
    this.phase = "idle";
    this.killScenario();
    if (this.pushRaf != null) {
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.pushRaf);
      else clearTimeout(this.pushRaf);
      this.pushRaf = null;
    }
    this.clearTransportSchedule();
    this.longRestActive = false;
    this.longRestStartedOrganismMs = null;
    this.autoLoopBeforeLongRest = false;
    this.killLivingLayers();
    this.emit();
  }

  /** Enter dormant maintenance without inventing a ninth character state. */
  enterLongRest(opts: { duration?: number } = {}) {
    if (!this.api || !this.running) return;
    this.autoLoopBeforeLongRest = this.autoLoop;
    this.autoLoop = false;
    this.clearTransportSchedule();
    this.longRestActive = true;
    this.longRestStartedOrganismMs = this.organismClock.nowMs();
    if (this.stateId !== LONG_REST_POLICY.stateId) {
      this.goState(LONG_REST_POLICY.stateId, {
        duration: opts.duration ?? 0.75 * this.timingScale,
        fromState: this.stateId,
      });
    } else {
      this.phase = "hold";
      this.reanchorThreeBeat(LONG_REST_POLICY.stateId, this.longRestStartedOrganismMs);
      this.keySceneSuiteToStateEntry(this.longRestStartedOrganismMs);
      this.livingAuthority.setState(LONG_REST_POLICY.stateId, {
        durationSeconds: 0.2,
        timeMs: this.longRestStartedOrganismMs,
      });
    }
    this.emit();
  }

  /** Wake from the current dormant frame; interruption owns continuity. */
  wakeFromLongRest(opts: { duration?: number } = {}): InterruptionSample {
    const shouldResumeAutoLoop = this.autoLoopBeforeLongRest;
    this.longRestActive = false;
    this.longRestStartedOrganismMs = null;
    const sample = this.interruptTo("wake", {
      duration: opts.duration ?? 0.55 * this.timingScale,
    });
    this.autoLoopBeforeLongRest = false;
    if (shouldResumeAutoLoop) this.setAutoLoop(true);
    return sample;
  }

  /** Toggle route auto-advance without restarting or resetting the current frame. */
  setAutoLoop(enabled: boolean) {
    this.autoLoop = enabled && !this.longRestActive;
    this.clearTransportSchedule();
    if (this.autoLoop && this.running) {
      const step = this.manifest.steps.find((s) => s.from === this.stateId);
      this.scheduleHoldThenAdvance(step ? this.scheduledStepSeconds(step) : 0.05);
    }
    this.emit();
  }

  setReducedMotion(on: boolean) {
    this.reducedMotion = on;
    if (this.running) {
      this.start({
        seed: this.seed ?? undefined,
        reducedMotion: on,
        autoLoop: this.autoLoop,
        proofMode: this.proofMode,
        timingScale: this.timingScale,
        manifest: this.manifest,
        forceInterruptDemo: this.forceInterruptDemo,
      });
    }
  }

  /**
   * Transition to state from actual current proxy values.
   * Never hops through Neutral unless Neutral is the target.
   */
  goState(
    id: EightStateId,
    opts?: {
      duration?: number;
      interrupt?: boolean;
      recordHold?: boolean;
      fromState?: EightStateId;
    },
  ) {
    if (!this.api) return;
    const fromState = opts?.fromState ?? this.stateId;
    const step = stepForTransition(fromState, id, this.manifest);
    const duration =
      opts?.duration ??
      (step?.transitionSeconds ?? 0.75) * this.timingScale * (this.reducedMotion ? 0.75 : 1);

    let targets = { ...EIGHT_STATE_TARGETS[id] };
    if (this.reducedMotion) {
      targets = projectReducedMotion(targets, 0.35);
    }
    // D-0073: keep the eye rest aperture above the "rapid-blink" threshold so state-driven
    // eye_openness deltas (e.g. neutral-social 0.25) do not read as blinks in the fast loop.
    targets.eye_openness = Math.max(0.5, targets.eye_openness ?? 0.5); // D-0077: raise the per-state eye rest floor 0.38 -> 0.5 so state-driven aperture deltas never read as blinks in the fast loop.

    // Capture pre-transition continuity snapshot
    const before = this.api.snapshot();
    this.updateVelocity(before);

    this.phase = opts?.interrupt ? "interrupted" : "transition";
    this.stateId = id;
    // GASPER-BEH-001: re-anchor three-beat envelope on ordinary transitions and interruptions.
    // Phase progression continues to sample OrganismClockFrame.timeMs — no second time base.
    this.reanchorThreeBeat(id, this.organismClock.nowMs());
    // GASPER-SCENE-002: key the scene entrance to the state entrance.
    this.keySceneSuiteToStateEntry(this.organismClock.nowMs());
    this.livingAuthority.setState(id, {
      durationSeconds: duration,
      interrupt: opts?.interrupt === true,
      timeMs: this.organismClock.nowMs(),
    });

    this.killScenario();
    const ease = step?.easeBias ?? easeForTransition(fromState, id);
    const scales = step?.channelDurationScale ?? channelDurationScales(id);
    const phaseOffsets = step?.phaseOffsets ?? {};

    this.api.onTransitionFrame?.({
      fromState,
      toState: id,
      progress: 0,
      phase: "transition",
    });

    // GSAP timeline surface is broader than the local shim type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tl: any = null;
    tl = g.timeline({
      defaults: { overwrite: "auto" },
      onUpdate: () => {
        this.api?.onTransitionFrame?.({
          fromState,
          toState: id,
          progress: tl?.progress?.() ?? 0,
          phase: "transition",
        });
        this.pushCombined();
      },
      onComplete: () => {
        this.phase = "hold";
        this.api?.onTransitionFrame?.({
          fromState,
          toState: id,
          progress: 1,
          phase: "hold",
        });
        this.pushCombined();
        this.emit();
      },
    });
    tl.addLabel(`eight:${id}`, 0);

    for (const [bindingId, target] of Object.entries(targets)) {
      // VEC-602: facial endpoints are targets for the shared continuum. They are
      // never independently tweened by the route adapter.
      if (FACIAL_TEMPORAL_BINDINGS.has(bindingId)) continue;
      const proxy = this.api.proxyFor(bindingId, before[bindingId] ?? 0);
      // Start from CURRENT proxy value — never from canonical anchor
      const d = Math.max(0.05, duration * (scales[bindingId] ?? 1));
      const delay = (phaseOffsets[bindingId] ?? 0) * this.timingScale;
      tl.to(
        proxy,
        {
          value: target,
          duration: d,
          ease,
          overwrite: "auto",
        },
        delay,
      );
    }

    this.scenarioTl = tl;
    if (opts?.interrupt) {
      this.interruptCount += 1;
      this.lastInterruptAt = this.organismClock.nowMs();
      this.lastInterruptFrom = fromState;
      this.lastInterruptTo = id;
    }
    this.pushCombined();
    this.emit();
  }

  /** Interrupt mid-transition: retarget from interpolated state. */
  interruptTo(id: EightStateId, opts?: { duration?: number }) {
    const from = this.stateId;
    const progress = this.scenarioTl?.progress?.() ?? 0;
    const before = this.api?.snapshot() ?? {};
    const velBefore = { ...this.velocity };

    this.goState(id, {
      duration: opts?.duration ?? 0.55 * this.timingScale,
      interrupt: true,
      fromState: from,
    });

    const after = this.api?.snapshot() ?? {};
    const sample = this.measureInterruption({
      caseId: `interrupt:${from}->${id}@${q(progress, 2)}`,
      from,
      toward: from,
      interruptWith: id,
      atProgress: progress,
      before,
      after,
      velBefore,
    });
    this.interruptionSamples.push(sample);
    return sample;
  }

  /**
   * Actual scheduler span for a GSAP transition. Per-channel duration scales
   * and phase offsets can extend the timeline beyond nominal transitionSeconds.
   * Advancing earlier kills onComplete and leaves the renderer on the old hold.
   */
  private scheduledStepSeconds(step: LoopStepV1): number {
    const reducedScale = this.reducedMotion ? 0.75 : 1;
    const baseDuration =
      step.transitionSeconds * this.timingScale * reducedScale;
    const scales = Object.values(step.channelDurationScale ?? {}).filter(
      (value): value is number => typeof value === "number",
    );
    const offsets = Object.values(step.phaseOffsets ?? {}).filter(
      (value): value is number => typeof value === "number",
    );
    const maxScale = Math.max(1, ...scales);
    const maxOffset = Math.max(0, ...offsets) * this.timingScale;
    const transitionSpan = baseDuration * maxScale + maxOffset;
    const holdSpan = step.holdSeconds * this.timingScale;
    return Math.max(0.05, transitionSpan + holdSpan);
  }

  /** Advance one step along the showcase route. */
  advance() {
    if (!this.running) return;
    const steps = this.manifest.steps;
    // Find step whose from matches current; if wake completed to neutral, wrap.
    let stepIdx = steps.findIndex((s) => s.from === this.stateId);
    if (this.stateId === "presence-neutral-settled" && this.routeIndex === 0 && this.cycleCount === 0) {
      stepIdx = 0;
    } else if (this.stateId === "presence-neutral-settled") {
      // end of cycle: restart
      stepIdx = 0;
      this.cycleCount += 1;
      this.cycleStartOrganismMs = this.organismClock.nowMs();
      this.cycleStartMs = this.cycleStartOrganismMs;
      this.routeIndex = 0;
    }
    if (stepIdx < 0) {
      // recover: go to next in route
      const route = this.manifest.route;
      const i = route.indexOf(this.stateId);
      const next = route[(i + 1) % route.length]!;
      const recoveryStep = stepForTransition(
        this.stateId,
        next,
        this.manifest,
      );
      this.goState(next, { fromState: this.stateId });
      this.scheduleHoldThenAdvance(
        recoveryStep
          ? this.scheduledStepSeconds(recoveryStep)
          : 2 * this.timingScale,
      );
      return;
    }

    const step = steps[stepIdx]!;
    this.routeIndex = stepIdx + 1;
    this.goState(step.to, {
      duration: step.transitionSeconds * this.timingScale,
      fromState: step.from,
    });

    // Wait for the actual longest GSAP channel plus the authored hold. This is
    // authoritative transport timing; nominal transitionSeconds alone is not.
    this.scheduleHoldThenAdvance(this.scheduledStepSeconds(step));
  }

  private scheduleHoldThenAdvance(delaySec: number) {
    if (!this.running || !this.autoLoop || this.longRestActive) return;
    this.scheduleTransport(Math.max(0.05, delaySec), () => {
      if (!this.running || !this.autoLoop) return;
      // Demo interrupt: Executing → Blocked mid-flight once per cycle
      if (
        this.forceInterruptDemo &&
        this.stateId === "presence-recognition-spark"
      ) {
        this.goState("comet-executing-drive", { duration: 0.85 * this.timingScale });
        this.scheduleTransport(0.3 * this.timingScale, () => {
          if (!this.running) return;
          this.interruptTo("presence-blocked-strain", { duration: 0.45 * this.timingScale });
          const step = stepForTransition("presence-blocked-strain", "presence-pleased-resolve", this.manifest);
          this.scheduleTransport(
            ((step?.transitionSeconds ?? 1.6) + (step?.holdSeconds ?? 2.3)) * this.timingScale,
            () => this.advanceFrom("presence-blocked-strain"),
          );
        });
        return;
      }
      this.advance();
    });
  }

  private scheduleTransport(delaySec: number, action: () => void) {
    this.clearTransportSchedule();
    if (!this.running || !this.autoLoop || this.longRestActive) return;
    this.transportDueAtOrganismMs =
      this.organismClock.nowMs() + Math.max(0.05, delaySec) * 1000;
    this.transportAction = action;
  }

  private clearTransportSchedule() {
    this.transportDueAtOrganismMs = null;
    this.transportAction = null;
  }

  private advanceTransport(timeMs: number) {
    const due = this.transportDueAtOrganismMs;
    if (due == null || timeMs < due) return;
    const action = this.transportAction;
    this.clearTransportSchedule();
    action?.();
  }

  private advanceFrom(state: EightStateId) {
    this.stateId = state;
    this.advance();
  }

  // ── Living layers ─────────────────────────────────────────────

  private startLivingLayers() {
    this.killLivingLayers();
    this.livingAuthority.configure({
      seed: this.seed ?? this.manifest.proofSeedDefault,
      reducedMotion: this.reducedMotion,
    });
    this.livingAuthority.start(this.stateId, this.organismClock.nowMs());
    this.startLivingClock();
  }

  private killLivingLayers() {
    this.killLivingClock();
    this.livingAuthority.stop();
    this.lastLivingSnapshot = null;
    this.sceneSilhouette = Object.freeze({});
    this.silhouetteBase = null;
  }

  /** D-0088: provenance-tagged silhouette values for the rig flush fence. */
  getSceneSilhouetteAdmission(): Readonly<Record<string, number>> {
    return this.sceneSilhouette;
  }

  /**
   * D-0090: the living base values for the fenced silhouette channels this
   * frame (null when the loop has not flushed yet) — physics silhouette
   * admission adds its bounded deltas to this exact reference.
   */
  getSilhouetteBaseValues(): Readonly<Record<string, number>> | null {
    return this.silhouetteBase;
  }

  private killScenario() {
    this.scenarioTl?.kill();
    this.scenarioTl = null;
  }

  private startLivingClock() {
    this.killLivingClock();
    this.livingClockUnsub = this.organismClock.subscribe({
      id: "eight-state-living",
      priority: 20,
      onFrame: (frame: OrganismClockFrame) => {
        if (!this.running) return;
        this.lastClockFrame = {
          timeMs: frame.timeMs,
          deltaMs: frame.deltaMs,
          frameIndex: frame.frameIndex,
        };
        this.advanceTransport(frame.timeMs);
        // Three-beat progress is derived on demand from frame.timeMs + beat anchor
        // (getThreeBeatProgress); no independent ticker advances the envelope.
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

  private pushCombined() {
    if (this.pushRaf != null) return;
    const schedule =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : ((cb: FrameRequestCallback) =>
            setTimeout(() => cb(this.organismClock.nowMs()), 0) as unknown as number);
    this.pushRaf = schedule(() => {
      this.pushRaf = null;
      const nowMs = this.organismClock.nowMs();
      this.pushCombinedNow({
        timeMs: nowMs,
        deltaMs: this.organismClock.getDeltaMs(),
        frameIndex: this.lastClockFrame.frameIndex,
      });
    });
  }

  private pushCombinedNow(
    frame: Pick<OrganismClockFrame, "timeMs" | "deltaMs" | "frameIndex"> = this.lastClockFrame,
  ) {
    if (!this.api) return;
    const values = { ...this.api.snapshot() };
    for (const id of Object.keys(values)) {
      values[id] = this.api.proxyFor(id, values[id]).value;
    }
    for (const key of Object.keys(EIGHT_STATE_TARGETS["presence-neutral-settled"])) {
      if (values[key] === undefined) {
        values[key] = this.api.proxyFor(
          key,
          EIGHT_STATE_TARGETS["presence-neutral-settled"][key] ?? 0,
        ).value;
      }
    }
    const matrixTarget = getEmbodimentStateTarget(this.embodimentId, this.stateId);
    if (matrixTarget) {
      this.matrixTargetKey = matrixTarget.key;
      // Preserve current continuity when a channel already has a live value;
      // the matrix supplies the profile/state authority only for missing
      // channels so it cannot teleport an active morph.
      for (const [key, value] of Object.entries(matrixTarget.profileBindings)) {
        if (values[key] === undefined && Number.isFinite(value)) {
          values[key] = this.api.proxyFor(key, value).value;
        }
      }
    }
    const resolved = this.livingAuthority.evaluate(frame, values);
    const restValues = this.longRestActive
      ? applyLongRestMaintenance(resolved.values, this.getLongRestStatus())
      : resolved.values;
    const lifeSample = evaluateEmbodimentLife(
      this.embodimentId,
      this.stateId,
      Math.max(0, (frame.timeMs - this.beatAnchorOrganismMs) / 1000),
      this.seed ?? this.manifest.proofSeedDefault,
      matrixTarget?.life,
    );
    const lifeValues = applyEmbodimentLifeToChannels(restValues, lifeSample);
    // GASPER-SCENE-001: long-form embodiment scene suite — the macro-law of
    // holds. Sampled from the same organism-clock anchor as the beat envelope;
    // bounded additive deltas; collapses under reduced motion.
    const sceneSample = evaluateSceneSuite(
      getSceneSuiteForEmbodiment(this.embodimentId),
      Math.max(0, (frame.timeMs - this.sceneAnchorOrganismMs) / 1000),
      { reducedMotion: this.reducedMotion },
    );
    this.lastSceneSample = sceneSample;
    // D-0088: capture the scene-scoped silhouette admission from the PRE-scene
    // base so the fence admits exactly base + bounded scene delta — nothing
    // else on the living path can drive the silhouette channels.
    this.sceneSilhouette = sceneSilhouetteAdmission(lifeValues, sceneSample.deltas);
    // D-0090: expose the same PRE-scene base to the physics silhouette
    // authority so its admission composes on one shared reference.
    {
      const base: Record<string, number> = {};
      for (const ch of SCENE_SUITE_SILHOUETTE_CHANNELS) {
        const v = lifeValues[ch];
        if (typeof v === "number" && Number.isFinite(v)) base[ch] = v;
      }
      this.silhouetteBase = Object.freeze(base);
    }
    const sceneValues = applySceneSuiteToChannels(lifeValues, sceneSample);
    // Task 5: seeded bounded microvariation (deterministic; additive only on
    // skin/glow/emissive; collapsed under reduced motion). Never changes
    // topology, feature identity, face ownership, or beat ordering.
    const micro = evaluateMicrovariation({
      seed: this.seed ?? this.manifest.proofSeedDefault,
      timeMs: frame.timeMs,
      reducedMotion: this.reducedMotion,
    });
    const finalValues = applyMicrovariationToChannels(sceneValues, micro);
    const finalSnapshot =
      finalValues === resolved.values
        ? resolved
        : { ...resolved, values: finalValues };
    this.lastLivingSnapshot = finalSnapshot;
    this.updateVelocity(finalSnapshot.values);
    this.api.onUnifiedAudioFrame?.(finalSnapshot.audio);
    this.api.flush(finalSnapshot.values);
  }

  private updateVelocity(values: DomainScalarMap) {
    const now = this.organismClock.nowMs();
    const dt = Math.max(1, now - this.prevSnapAt) / 1000;
    const vel: DomainScalarMap = {};
    for (const [k, v] of Object.entries(values)) {
      const prev = this.prevSnap[k] ?? v;
      vel[k] = (v - prev) / dt;
    }
    this.velocity = vel;
    this.prevSnap = { ...values };
    this.prevSnapAt = now;
  }

  private measureInterruption(input: {
    caseId: string;
    from: EightStateId;
    toward: EightStateId;
    interruptWith: EightStateId;
    atProgress: number;
    before: DomainScalarMap;
    after: DomainScalarMap;
    velBefore: DomainScalarMap;
  }): InterruptionSample {
    const immediateDeltaMax = maxChannelDelta(input.before, input.after);
    // Velocity discontinuity: compare pre-interrupt velocity to post first-step
    let velocityDiscontinuityMax = 0;
    for (const k of Object.keys(input.velBefore)) {
      const d = Math.abs((this.velocity[k] ?? 0) - (input.velBefore[k] ?? 0));
      if (d > velocityDiscontinuityMax) velocityDiscontinuityMax = d;
    }
    const faceContinuity = FACE_CONTINUITY_KEYS.every((k) => {
      const b = input.before[k];
      const a = input.after[k];
      if (b === undefined || a === undefined) return true;
      return Math.abs(a - b) < 0.55; // no face pop (large teleport)
    });
    const silhouetteContinuity = SILHOUETTE_CONTINUITY_KEYS.every((k) => {
      const b = input.before[k];
      const a = input.after[k];
      if (b === undefined || a === undefined) return true;
      return Math.abs(a - b) < 0.45;
    });
    const energyContinuity = ENERGY_CONTINUITY_KEYS.every((k) => {
      const b = input.before[k];
      const a = input.after[k];
      if (b === undefined || a === undefined) return true;
      return Math.abs(a - b) < 0.55;
    });
    // Snap detection: any single channel jumps > 0.5 instantly without transition
    const snapped = immediateDeltaMax > 0.85;

    return {
      caseId: input.caseId,
      from: input.from,
      toward: input.toward,
      interruptWith: input.interruptWith,
      atProgress: input.atProgress,
      immediateDeltaMax: q(immediateDeltaMax),
      velocityDiscontinuityMax: q(velocityDiscontinuityMax),
      faceContinuity,
      silhouetteContinuity,
      energyContinuity,
      snapped,
      notes: snapped
        ? "FAIL: channel teleport detected"
        : "retarget-current from interpolated proxies",
    };
  }

  /** Test: fire blink. */
  debugBlink() {
    this.livingAuthority.triggerBlink(this.organismClock.nowMs());
    this.pushCombined();
  }

  /** Test: fire saccade. */
  debugSaccade() {
    this.livingAuthority.triggerSaccade(this.organismClock.nowMs());
    this.pushCombined();
  }

  /** Test: advance route. */
  debugAdvance() {
    this.advance();
  }

  /** Read current velocity estimate (proof). */
  getVelocity(): DomainScalarMap {
    return { ...this.velocity };
  }

  /** Read current evaluated values via snapshot+layers. */
  sampleValues(): DomainScalarMap {
    this.pushCombinedNow();
    return this.api?.snapshot() ?? {};
  }
}
