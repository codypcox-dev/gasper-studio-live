/**
 * GasperPilotKernel — first bounded low-frequency piloting kernel.
 *
 * Contracts: get_state, validate_plan, apply_plan, get_result.
 * Revision + idempotency, safe interrupt policies, standalone recovery.
 *
 * Non-goals (enforced):
 * - No per-frame driving
 * - No external automation frame authority
 * - No coupling of runtime survival to HQ or AgentBridge
 * - No GSAP timeline mutation inside this module (handoff only)
 */

import { hashPilotPlan, hashPilotState } from "./hash.js";
import { validatePlan } from "./validate.js";
import {
  GASPER_PILOT_KERNEL_VERSION,
  GASPER_PILOT_RESULT_SCHEMA,
  GASPER_PILOT_STATE_SCHEMA,
  PILOT_DEFAULT_EYE_MOUTH,
  PILOT_DEFAULT_TOPOLOGY,
  type GasperPilotPlan,
  type GasperPilotResult,
  type GasperPilotState,
  type InterruptPolicy,
  type PilotApplyOutcome,
  type PilotKernelConfig,
  type PilotValidateOutcome,
  type RecoveryMode,
} from "./types.js";

type IdempotencyRecord = {
  planContentHash: string;
  result: GasperPilotResult;
};

type QueuedPlan = {
  plan: GasperPilotPlan;
  planContentHash: string;
  enqueuedAtMs: number;
};

function defaultNow(): number {
  return Date.now();
}

function makeResultId(planId: string, revision: number, nowMs: number): string {
  return `pr_${planId}_${revision}_${nowMs}`;
}

function cloneState(s: GasperPilotState): GasperPilotState {
  return {
    ...s,
    topology: { ...s.topology },
    eyeMouthCoherence: { ...s.eyeMouthCoherence },
  };
}

export class GasperPilotKernel {
  private revision = 0;
  private open = true;
  private bridgeConnected = false;
  private hqConnected = false;
  private embodiment: string;
  private cognitiveMode: string;
  private scenarioId: string | null;
  private expressionFixtureId: string | null;
  private playback: GasperPilotState["playback"] = "idle";
  private activePlanId: string | null = null;
  private lastPlanId: string | null = null;
  private lastResultId: string | null = null;
  private interruptPolicy: InterruptPolicy = "blend";
  private topology: GasperPilotState["topology"];
  private eyeMouth = { ...PILOT_DEFAULT_EYE_MOUTH };
  private reducedMotion = false;
  private frameAuthority: "gsap-native" | "hold" = "gsap-native";
  private results = new Map<string, GasperPilotResult>();
  private resultsByPlanId = new Map<string, string>();
  private idempotency = new Map<string, IdempotencyRecord>();
  private queue: QueuedPlan[] = [];
  private maxQueueDepth: number;
  private nowMs: () => number;
  private lastGood: {
    embodiment: string;
    cognitiveMode: string;
    scenarioId: string | null;
    expressionFixtureId: string | null;
    plan: GasperPilotPlan | null;
  };

  constructor(config: PilotKernelConfig = {}) {
    this.topology = {
      ...PILOT_DEFAULT_TOPOLOGY,
      ...config.topology,
      locked: config.topology?.locked ?? PILOT_DEFAULT_TOPOLOGY.locked,
    };
    this.embodiment = config.embodiment ?? "presence";
    this.cognitiveMode = config.cognitiveMode ?? "idle";
    this.scenarioId = config.scenarioId ?? "presence-neutral-settled";
    this.expressionFixtureId = config.expressionFixtureId ?? "neutral-settled";
    this.maxQueueDepth = config.maxQueueDepth ?? 4;
    this.nowMs = config.nowMs ?? defaultNow;
    this.lastGood = {
      embodiment: this.embodiment,
      cognitiveMode: this.cognitiveMode,
      scenarioId: this.scenarioId,
      expressionFixtureId: this.expressionFixtureId,
      plan: null,
    };
  }

  /** Explicit close — reject further applies (tests / shutdown). */
  close(): void {
    this.open = false;
    this.playback = "holding";
    this.frameAuthority = "hold";
  }

  isOpen(): boolean {
    return this.open;
  }

  /**
   * Report bridge presence. Never required for survival —
   * operational mode may be "standalone" with bridgeConnected=false.
   */
  setBridgeConnected(connected: boolean): void {
    this.bridgeConnected = connected;
  }

  setHqConnected(connected: boolean): void {
    this.hqConnected = connected;
  }

  /** get_state */
  get_state(): GasperPilotState {
    return this.snapshot();
  }

  /** validate_plan */
  validate_plan(plan: unknown): PilotValidateOutcome {
    return validatePlan(plan, { state: this.snapshot(), kernelOpen: this.open });
  }

  /** get_result — by resultId, or last result for planId when prefix `plan:`. */
  get_result(resultIdOrPlanRef: string): GasperPilotResult | null {
    if (resultIdOrPlanRef.startsWith("plan:")) {
      const planId = resultIdOrPlanRef.slice("plan:".length);
      const rid = this.resultsByPlanId.get(planId);
      return rid ? this.results.get(rid) ?? null : null;
    }
    if (resultIdOrPlanRef === "last" && this.lastResultId) {
      return this.results.get(this.lastResultId) ?? null;
    }
    return this.results.get(resultIdOrPlanRef) ?? null;
  }

  /** apply_plan — revision + idempotency + interrupt + standalone recovery. */
  apply_plan(plan: unknown): PilotApplyOutcome {
    const now = this.nowMs();
    const stateBefore = this.snapshot();

    if (!this.open) {
      const rejected = this.makeRejected(
        plan,
        stateBefore,
        "KERNEL_CLOSED",
        "Pilot kernel is closed",
        now,
      );
      return { ok: false, result: rejected, state: this.snapshot() };
    }

    // Structural validate first; skip revision so idempotent replay can win
    // even when the client resubmits the original expectedRevision (stale).
    const validated = validatePlan(plan, {
      state: stateBefore,
      kernelOpen: this.open,
      skipRevisionCheck: true,
    });
    if (!validated.ok) {
      const rejected = this.makeRejected(
        plan,
        stateBefore,
        validated.error,
        validated.detail,
        now,
        validated.issues,
      );
      return { ok: false, result: rejected, state: this.snapshot() };
    }

    const typed = plan as GasperPilotPlan;
    const planHash = validated.planContentHash;

    // Idempotency: same key + same hash → replay prior result (no revision bump).
    // Must run before expectedRevision so retries are not rejected as REVISION_CONFLICT.
    const prior = this.idempotency.get(typed.idempotencyKey);
    if (prior) {
      if (prior.planContentHash !== planHash) {
        const rejected = this.makeRejected(
          typed,
          stateBefore,
          "IDEMPOTENCY_MISMATCH",
          `idempotencyKey ${typed.idempotencyKey} already bound to a different plan hash`,
          now,
        );
        return { ok: false, result: rejected, state: this.snapshot() };
      }
      const replay: GasperPilotResult = {
        ...prior.result,
        status: "idempotent_replay",
        ok: true,
        revisionBefore: stateBefore.revision,
        revisionAfter: stateBefore.revision,
        createdAtMs: now,
      };
      // Do not re-store as new; return replay view.
      return { ok: true, result: replay, state: this.snapshot() };
    }

    // New apply only: optimistic concurrency when expectedRevision is provided.
    if (
      typeof typed.expectedRevision === "number" &&
      typed.expectedRevision !== stateBefore.revision
    ) {
      const rejected = this.makeRejected(
        typed,
        stateBefore,
        "REVISION_CONFLICT",
        `expectedRevision ${typed.expectedRevision} != current ${stateBefore.revision}`,
        now,
        [
          {
            code: "REVISION_CONFLICT",
            message: `expectedRevision ${typed.expectedRevision} != current ${stateBefore.revision}`,
            path: "expectedRevision",
            severity: "error",
          },
        ],
      );
      return { ok: false, result: rejected, state: this.snapshot() };
    }

    // Safe interrupt: queue policy
    if (typed.interrupt === "queue" && this.playback === "transitioning") {
      if (this.queue.length >= this.maxQueueDepth) {
        const rejected = this.makeRejected(
          typed,
          stateBefore,
          "QUEUE_FULL",
          `queue depth ${this.queue.length} >= max ${this.maxQueueDepth}`,
          now,
        );
        return { ok: false, result: rejected, state: this.snapshot() };
      }
      this.queue.push({
        plan: typed,
        planContentHash: planHash,
        enqueuedAtMs: now,
      });
      const queued = this.commitResult({
        plan: typed,
        planHash,
        status: "queued",
        ok: true,
        revisionBefore: stateBefore.revision,
        revisionAfter: stateBefore.revision,
        gsapHandoffExpected: false,
        now,
        appliedIntent: typed.intent,
      });
      return { ok: true, result: queued, state: this.snapshot() };
    }

    // Recover must route before hold-interrupt short-circuit: hold_last_good
    // uses interrupt="hold" + frameAuthority="hold" and needs recoveredVia metadata.
    if (typed.intent.kind === "recover") {
      return this.applyRecover(typed, planHash, stateBefore, now);
    }

    // Interrupt policies that cancel/hold current transition
    if (
      typed.intent.kind === "interrupt" ||
      typed.interrupt === "hold" ||
      typed.intent.kind === "hold"
    ) {
      return this.applyHoldOrInterrupt(typed, planHash, stateBefore, now);
    }

    // Default apply: set_operational_state | transition_scenario
    return this.applyIntent(typed, planHash, stateBefore, now);
  }

  /**
   * Signal that the native GSAP transition settled.
   * Drains one queued plan if present (queue interrupt policy).
   */
  notifyTransitionSettled(): GasperPilotResult | null {
    if (!this.open) return null;
    this.playback = "settled";
    this.activePlanId = null;
    this.frameAuthority =
      this.frameAuthority === "hold" ? "hold" : "gsap-native";
    if (this.queue.length === 0) {
      return null;
    }
    const next = this.queue.shift()!;
    // Release queue-time idempotency bind so the drained plan can apply once.
    this.idempotency.delete(next.plan.idempotencyKey);
    // Force blend apply from current values; pin expectedRevision to live head.
    const plan: GasperPilotPlan = {
      ...next.plan,
      interrupt: "blend",
      expectedRevision: this.revision,
    };
    const outcome = this.apply_plan(plan);
    return outcome.result;
  }

  /**
   * Standalone recovery without bridge/HQ.
   * Invokable when bridge is down — survival path.
   */
  recoverStandalone(mode: RecoveryMode = "standalone_resume"): PilotApplyOutcome {
    const plan: GasperPilotPlan = {
      schema: "gasper.pilot.plan.v1",
      planId: `recover_${mode}_${this.revision}`,
      idempotencyKey: `recover:${mode}:${this.revision}`,
      intent: { kind: "recover", recoveryMode: mode },
      interrupt: mode === "hold_last_good" ? "hold" : "retarget",
      animationHandoff: "gsap-native",
      frameAuthority: mode === "hold_last_good" ? "hold" : "gsap-native",
      constraints: { topologyLock: true, forbidMcpFrames: true },
      provenance: {
        source: "gasper-pilot-kernel.standalone",
        frequency: "low",
        notes: "Bridge/HQ not required",
      },
    };
    // Clear bridge requirement path — always standalone-capable
    this.bridgeConnected = this.bridgeConnected; // no-op clarity
    return this.apply_plan(plan);
  }

  // ── internals ──────────────────────────────────────────────

  private applyHoldOrInterrupt(
    plan: GasperPilotPlan,
    planHash: string,
    stateBefore: GasperPilotState,
    now: number,
  ): PilotApplyOutcome {
    const holding = plan.interrupt === "hold" || plan.intent.kind === "hold";
    this.playback = holding ? "holding" : "interrupted";
    this.frameAuthority = holding ? "hold" : "gsap-native";
    this.interruptPolicy = plan.interrupt;
    this.activePlanId = null;
    this.queue = []; // safe interrupt drops queue
    this.revision += 1;
    this.lastPlanId = plan.planId;
    this.rememberLastGood(plan);

    const result = this.commitResult({
      plan,
      planHash,
      status: holding ? "holding" : "interrupted",
      ok: true,
      revisionBefore: stateBefore.revision,
      revisionAfter: this.revision,
      gsapHandoffExpected: !holding,
      now,
      appliedIntent: plan.intent,
    });
    return { ok: true, result, state: this.snapshot() };
  }

  private applyRecover(
    plan: GasperPilotPlan,
    planHash: string,
    stateBefore: GasperPilotState,
    now: number,
  ): PilotApplyOutcome {
    const mode: RecoveryMode = plan.intent.recoveryMode ?? "standalone_resume";
    this.playback = "recovering";

    switch (mode) {
      case "hold_last_good":
        this.embodiment = this.lastGood.embodiment;
        this.cognitiveMode = this.lastGood.cognitiveMode;
        this.scenarioId = this.lastGood.scenarioId;
        this.expressionFixtureId = this.lastGood.expressionFixtureId;
        this.frameAuthority = "hold";
        this.playback = "holding";
        break;
      case "return_to_settled":
        this.embodiment = "presence";
        this.cognitiveMode = "idle";
        this.scenarioId = "presence-neutral-settled";
        this.expressionFixtureId = "neutral-settled";
        this.frameAuthority = "gsap-native";
        this.playback = "settled";
        this.eyeMouth = {
          ...PILOT_DEFAULT_EYE_MOUTH,
          temporalPolicy: plan.intent.reducedMotion
            ? "reduced-motion"
            : "eight-state-gaze-blink",
        };
        break;
      case "standalone_resume":
      default:
        this.embodiment = this.lastGood.embodiment;
        this.cognitiveMode = this.lastGood.cognitiveMode;
        this.scenarioId = this.lastGood.scenarioId;
        this.expressionFixtureId = this.lastGood.expressionFixtureId;
        this.frameAuthority = "gsap-native";
        this.playback = "settled";
        break;
    }

    this.reducedMotion = plan.intent.reducedMotion ?? this.reducedMotion;
    this.interruptPolicy = plan.interrupt;
    this.activePlanId = null;
    this.queue = [];
    this.revision += 1;
    this.lastPlanId = plan.planId;

    const result = this.commitResult({
      plan,
      planHash,
      status: "recovered",
      ok: true,
      revisionBefore: stateBefore.revision,
      revisionAfter: this.revision,
      gsapHandoffExpected: this.frameAuthority === "gsap-native",
      now,
      appliedIntent: plan.intent,
      recoveredVia: mode,
    });
    return { ok: true, result, state: this.snapshot() };
  }

  private applyIntent(
    plan: GasperPilotPlan,
    planHash: string,
    stateBefore: GasperPilotState,
    now: number,
  ): PilotApplyOutcome {
    // Interrupt retarget/blend from current — mark transitioning for GSAP handoff
    if (
      this.playback === "transitioning" &&
      (plan.interrupt === "blend" || plan.interrupt === "retarget")
    ) {
      // Safe interrupt: drop queue, retarget from current (GSAP owns continuous)
      this.queue = [];
      this.playback = "interrupted";
    }

    if (plan.intent.embodiment) this.embodiment = plan.intent.embodiment;
    if (plan.intent.cognitiveMode) this.cognitiveMode = plan.intent.cognitiveMode;
    if (plan.intent.scenarioId !== undefined) {
      this.scenarioId = plan.intent.scenarioId;
    }
    if (plan.intent.expressionFixtureId !== undefined) {
      this.expressionFixtureId = plan.intent.expressionFixtureId;
    }
    if (plan.intent.reducedMotion !== undefined) {
      this.reducedMotion = plan.intent.reducedMotion;
      if (plan.intent.reducedMotion) {
        this.eyeMouth = {
          ...this.eyeMouth,
          temporalPolicy: "reduced-motion",
        };
      } else {
        this.eyeMouth = {
          ...this.eyeMouth,
          temporalPolicy: "eight-state-gaze-blink",
        };
      }
    }

    this.interruptPolicy = plan.interrupt;
    this.frameAuthority = plan.frameAuthority;
    this.activePlanId = plan.planId;
    this.lastPlanId = plan.planId;
    this.playback =
      plan.frameAuthority === "hold" ? "holding" : "transitioning";
    this.revision += 1;
    this.rememberLastGood(plan);

    const result = this.commitResult({
      plan,
      planHash,
      status: "applied",
      ok: true,
      revisionBefore: stateBefore.revision,
      revisionAfter: this.revision,
      gsapHandoffExpected: plan.frameAuthority === "gsap-native",
      now,
      appliedIntent: plan.intent,
    });
    return { ok: true, result, state: this.snapshot() };
  }

  private rememberLastGood(plan: GasperPilotPlan): void {
    this.lastGood = {
      embodiment: this.embodiment,
      cognitiveMode: this.cognitiveMode,
      scenarioId: this.scenarioId,
      expressionFixtureId: this.expressionFixtureId,
      plan,
    };
  }

  private operationalMode(): GasperPilotState["operationalMode"] {
    if (this.playback === "recovering") return "recovering";
    if (this.playback === "interrupted" && !this.bridgeConnected) return "degraded";
    if (this.bridgeConnected) return "bridged";
    return "standalone";
  }

  private snapshot(): GasperPilotState {
    const base = {
      schema: GASPER_PILOT_STATE_SCHEMA,
      kernelVersion: GASPER_PILOT_KERNEL_VERSION,
      revision: this.revision,
      operationalMode: this.operationalMode(),
      bridgeRequiredForSurvival: false as const,
      bridgeConnected: this.bridgeConnected,
      hqConnected: this.hqConnected,
      embodiment: this.embodiment,
      cognitiveMode: this.cognitiveMode,
      scenarioId: this.scenarioId,
      expressionFixtureId: this.expressionFixtureId,
      playback: this.playback,
      activePlanId: this.activePlanId,
      lastPlanId: this.lastPlanId,
      lastResultId: this.lastResultId,
      interruptPolicy: this.interruptPolicy,
      topology: { ...this.topology },
      eyeMouthCoherence: { ...this.eyeMouth },
      reducedMotion: this.reducedMotion,
      frameAuthority: this.frameAuthority,
      gsapAuthority: true as const,
      mcpFrameDriving: false as const,
      queueDepth: this.queue.length,
    };
    const contentHash = hashPilotState(base);
    return cloneState({
      ...base,
      contentHash,
      updatedAtMs: this.nowMs(),
    });
  }

  private commitResult(args: {
    plan: GasperPilotPlan;
    planHash: string;
    status: GasperPilotResult["status"];
    ok: boolean;
    revisionBefore: number;
    revisionAfter: number;
    gsapHandoffExpected: boolean;
    now: number;
    appliedIntent?: GasperPilotPlan["intent"];
    recoveredVia?: RecoveryMode;
    error?: GasperPilotResult["error"];
    detail?: string;
    issues?: GasperPilotResult["issues"];
  }): GasperPilotResult {
    const resultId = makeResultId(args.plan.planId, args.revisionAfter, args.now);
    const result: GasperPilotResult = {
      schema: GASPER_PILOT_RESULT_SCHEMA,
      resultId,
      planId: args.plan.planId,
      idempotencyKey: args.plan.idempotencyKey,
      planContentHash: args.planHash,
      status: args.status,
      ok: args.ok,
      revisionBefore: args.revisionBefore,
      revisionAfter: args.revisionAfter,
      gsapHandoffExpected: args.gsapHandoffExpected,
      isFrame: false,
      mcpFrameDriving: false,
      error: args.error,
      detail: args.detail,
      issues: args.issues,
      appliedIntent: args.appliedIntent,
      recoveredVia: args.recoveredVia,
      createdAtMs: args.now,
    };
    this.results.set(resultId, result);
    this.resultsByPlanId.set(args.plan.planId, resultId);
    this.lastResultId = resultId;
    if (args.ok && args.status !== "queued") {
      this.idempotency.set(args.plan.idempotencyKey, {
        planContentHash: args.planHash,
        result,
      });
    }
    // Queued plans also bind idempotency so re-submit doesn't double-queue
    if (args.ok && args.status === "queued") {
      this.idempotency.set(args.plan.idempotencyKey, {
        planContentHash: args.planHash,
        result,
      });
    }
    return result;
  }

  private makeRejected(
    plan: unknown,
    stateBefore: GasperPilotState,
    error: NonNullable<GasperPilotResult["error"]>,
    detail: string,
    now: number,
    issues?: GasperPilotResult["issues"],
  ): GasperPilotResult {
    const p = plan && typeof plan === "object" ? (plan as Partial<GasperPilotPlan>) : {};
    const planId = typeof p.planId === "string" ? p.planId : "unknown";
    const idem =
      typeof p.idempotencyKey === "string" ? p.idempotencyKey : "unknown";
    let planHash = "";
    try {
      if (
        p.schema === "gasper.pilot.plan.v1" &&
        typeof p.planId === "string" &&
        p.intent &&
        p.interrupt &&
        p.animationHandoff === "gsap-native"
      ) {
        planHash = hashPilotPlan(p as GasperPilotPlan);
      }
    } catch {
      planHash = "";
    }
    const resultId = makeResultId(planId, stateBefore.revision, now);
    const result: GasperPilotResult = {
      schema: GASPER_PILOT_RESULT_SCHEMA,
      resultId,
      planId,
      idempotencyKey: idem,
      planContentHash: planHash,
      status: "rejected",
      ok: false,
      revisionBefore: stateBefore.revision,
      revisionAfter: stateBefore.revision,
      gsapHandoffExpected: false,
      isFrame: false,
      mcpFrameDriving: false,
      error,
      detail,
      issues,
      createdAtMs: now,
    };
    this.results.set(resultId, result);
    this.lastResultId = resultId;
    return result;
  }
}

/** Factory helper. */
export function createGasperPilotKernel(
  config?: PilotKernelConfig,
): GasperPilotKernel {
  return new GasperPilotKernel(config);
}
