/**
 * Narrow optional adapter: mount GasperPilotHost into packaged Studio bootstrap.
 *
 * Laws:
 * - Bridge is optional; survival never depends on it.
 * - GSAP / living runtime remains continuous frame authority.
 * - Missing living runtime → safe no-op handoff (no throw, no MCP, no rAF).
 * - Adapter never drives frames itself.
 * - GASPER-PILOT-002: measured handoff outcomes (interrupt timing, mid-blink,
 *   mouth retarget continuity, topology/survival metadata).
 */

import {
  createGasperPilotHost,
  type GasperPilotHost,
  type PilotGsapHandoff,
} from "./GasperPilotHost";
import type {
  InterruptPolicy,
  RecoveryMode,
  TopologyLockSnapshot,
} from "../../../../shared/src/gasper-pilot";
import {
  compactLivingStatus,
  evaluateMidBlink,
  evaluateMouthRetarget,
  evaluateTopologyStability,
  resolveInterruptTiming,
  type LivingStatusSnapshot,
  type MidBlinkEvaluation,
  type MouthRetargetEvaluation,
} from "./handoffPolicy";

/** Minimal living-runtime surface the pilot may invoke (optional). */
export type PilotLivingRuntimeTarget = {
  goEightState?: (id: string, opts?: { interrupt?: boolean; duration?: number }) => void;
  goMicrostate?: (id: string, opts?: { interrupt?: boolean; duration?: number }) => void;
  interruptEightTo?: (id: string) => unknown;
  getStatus?: () => LivingStatusSnapshot;
  setOnTransitionSettled?: (fn: (() => void) | null) => void;
  /** Test/proof helper — fire blink now. */
  debugBlink?: () => void;
  /** Optional snapshot for mouth continuity measurement. */
  snapshot?: () => Record<string, number>;
};

/** Minimal stage surface (Dais / rig) — all methods optional. */
export type PilotStageTarget = {
  living?: PilotLivingRuntimeTarget | null;
  setEmbodiment?: (id: string) => void;
  setExpression?: (id: string) => void;
};

export type StudioPilotHandoffMeasured = {
  atMs: number;
  interrupt: InterruptPolicy;
  durationSec: number | null;
  livingInterrupt: boolean;
  gsapOwnedTiming: true;
  livingBefore: LivingStatusSnapshot | null;
  livingAfter: LivingStatusSnapshot | null;
  midBlink: MidBlinkEvaluation;
  mouth: MouthRetargetEvaluation;
  /** Topology before apply when provided by caller/host. */
  topology?: TopologyLockSnapshot;
  topologyStable?: boolean;
  frameAuthority: "gsap-native" | "hold";
};

export type StudioPilotHandoffOutcome = {
  planId: string;
  resultId: string;
  applied: boolean;
  /** Why handoff was skipped or how it was applied. */
  reason:
    | "applied_eight_state"
    | "applied_microstate"
    | "applied_hold_skip"
    | "living_runtime_unavailable"
    | "no_scenario_target"
    | "living_call_failed";
  detail?: string;
  /** GASPER-PILOT-002 measured evidence fields. */
  measured?: StudioPilotHandoffMeasured;
};

export type StudioPilotAdapterOptions = {
  /** Resolve stage/living authority. Return null when unavailable. */
  resolveStage?: () => PilotStageTarget | null | undefined;
  /** Optional existing host (tests). */
  host?: GasperPilotHost;
  /** Optional observer for handoff outcomes (tests / diagnostics). */
  onHandoffOutcome?: (outcome: StudioPilotHandoffOutcome) => void;
  /** Clock for tests (ms). */
  nowMs?: () => number;
};

export type StudioPilotAdapter = {
  host: GasperPilotHost;
  /** Last handoff attempt (null until first apply that expected GSAP handoff). */
  lastHandoff: StudioPilotHandoffOutcome | null;
  /** Bounded handoff log for headed proof (most recent first capped). */
  handoffLog: readonly StudioPilotHandoffOutcome[];
  /** Report bridge presence only — never gates kernel survival. */
  reportBridgeConnected: (connected: boolean) => void;
  reportHqConnected: (connected: boolean) => void;
  recoverStandalone: (mode?: RecoveryMode) => ReturnType<GasperPilotHost["recoverStandalone"]>;
  notifyGsapSettled: () => ReturnType<GasperPilotHost["notifyGsapSettled"]>;
  dispose: () => void;
};

const EIGHT_STATE_IDS = new Set([
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

const MICROSTATE_IDS = new Set([
  "presence-neutral-settled",
  "presence-listening-receive",
  "presence-thinking-knit",
  "presence-blocked-strain",
  "recovering",
  "pleased-soft",
]);

const HANDOFF_LOG_CAP = 32;

function readLivingStatus(
  living: PilotLivingRuntimeTarget | null | undefined,
): LivingStatusSnapshot | null {
  if (!living || typeof living.getStatus !== "function") return null;
  try {
    const st = living.getStatus();
    let mouth: number | null | undefined = st.mouthOpenness;
    if (mouth == null && typeof living.snapshot === "function") {
      try {
        const snap = living.snapshot();
        if (typeof snap.mouth_openness === "number") mouth = snap.mouth_openness;
      } catch {
        /* */
      }
    }
    return compactLivingStatus({ ...st, mouthOpenness: mouth ?? st.mouthOpenness });
  } catch {
    return null;
  }
}

function buildMeasured(
  handoff: PilotGsapHandoff,
  living: PilotLivingRuntimeTarget | null | undefined,
  livingBefore: LivingStatusSnapshot | null,
  livingAfter: LivingStatusSnapshot | null,
  nowMs: number,
  topology?: TopologyLockSnapshot,
): StudioPilotHandoffMeasured {
  const timing = resolveInterruptTiming(handoff.interrupt);
  const midBlink = evaluateMidBlink(livingBefore ?? livingAfter);
  const mouth = evaluateMouthRetarget(livingBefore ?? livingAfter);
  let topologyStable: boolean | undefined;
  if (topology) {
    topologyStable = evaluateTopologyStability(topology, topology).stable;
  }
  return {
    atMs: nowMs,
    interrupt: handoff.interrupt,
    durationSec: timing.durationSec,
    livingInterrupt: timing.livingInterrupt,
    gsapOwnedTiming: true,
    livingBefore,
    livingAfter,
    midBlink,
    mouth,
    topology,
    topologyStable,
    frameAuthority: handoff.frameAuthority,
  };
}

/**
 * Apply a pilot GSAP handoff to living runtime when present.
 * Safe no-op when living is missing or scenario cannot be mapped.
 * Records interrupt timing / mid-blink / mouth continuity measurements.
 */
export function applyPilotHandoffToLiving(
  handoff: PilotGsapHandoff,
  stage: PilotStageTarget | null | undefined,
  opts?: {
    nowMs?: number;
    topology?: TopologyLockSnapshot;
  },
): StudioPilotHandoffOutcome {
  const nowMs = opts?.nowMs ?? Date.now();
  const base = {
    planId: handoff.planId,
    resultId: handoff.resultId,
  };

  if (handoff.frameAuthority === "hold") {
    return {
      ...base,
      applied: false,
      reason: "applied_hold_skip",
      measured: buildMeasured(handoff, stage?.living, null, null, nowMs, opts?.topology),
    };
  }

  const living = stage?.living;
  if (!living) {
    return {
      ...base,
      applied: false,
      reason: "living_runtime_unavailable",
      detail: "No living runtime on stage — pilot kernel state still applied",
      measured: buildMeasured(handoff, null, null, null, nowMs, opts?.topology),
    };
  }

  const scenarioId = handoff.intent.scenarioId;
  const embodiment = handoff.intent.embodiment;
  const expression = handoff.intent.expressionFixtureId;
  const livingBefore = readLivingStatus(living);
  const timing = resolveInterruptTiming(handoff.interrupt);

  try {
    if (embodiment && typeof stage?.setEmbodiment === "function") {
      stage.setEmbodiment(embodiment);
    }
    if (expression && typeof stage?.setExpression === "function") {
      stage.setExpression(expression);
    }

    if (!scenarioId) {
      return {
        ...base,
        applied: false,
        reason: "no_scenario_target",
        detail: "Handoff has no scenarioId; embodiment/expression may still apply",
        measured: buildMeasured(
          handoff,
          living,
          livingBefore,
          readLivingStatus(living),
          nowMs,
          opts?.topology,
        ),
      };
    }

    const callOpts: { interrupt?: boolean; duration?: number } = {};
    if (timing.livingInterrupt) callOpts.interrupt = true;
    if (typeof timing.durationSec === "number") {
      callOpts.duration = timing.durationSec;
    }

    if (EIGHT_STATE_IDS.has(scenarioId) && typeof living.goEightState === "function") {
      living.goEightState(scenarioId, callOpts);
      const livingAfter = readLivingStatus(living);
      return {
        ...base,
        applied: true,
        reason: "applied_eight_state",
        measured: buildMeasured(
          handoff,
          living,
          livingBefore,
          livingAfter,
          nowMs,
          opts?.topology,
        ),
      };
    }

    if (MICROSTATE_IDS.has(scenarioId) && typeof living.goMicrostate === "function") {
      living.goMicrostate(scenarioId, callOpts);
      const livingAfter = readLivingStatus(living);
      return {
        ...base,
        applied: true,
        reason: "applied_microstate",
        measured: buildMeasured(
          handoff,
          living,
          livingBefore,
          livingAfter,
          nowMs,
          opts?.topology,
        ),
      };
    }

    // Best-effort: try eight then micro even if id not in local set (forward-compat).
    if (typeof living.goEightState === "function") {
      living.goEightState(scenarioId, callOpts);
      return {
        ...base,
        applied: true,
        reason: "applied_eight_state",
        measured: buildMeasured(
          handoff,
          living,
          livingBefore,
          readLivingStatus(living),
          nowMs,
          opts?.topology,
        ),
      };
    }
    if (typeof living.goMicrostate === "function") {
      living.goMicrostate(scenarioId, callOpts);
      return {
        ...base,
        applied: true,
        reason: "applied_microstate",
        measured: buildMeasured(
          handoff,
          living,
          livingBefore,
          readLivingStatus(living),
          nowMs,
          opts?.topology,
        ),
      };
    }

    return {
      ...base,
      applied: false,
      reason: "living_runtime_unavailable",
      detail: "Living present but no goEightState/goMicrostate methods",
      measured: buildMeasured(
        handoff,
        living,
        livingBefore,
        livingBefore,
        nowMs,
        opts?.topology,
      ),
    };
  } catch (e) {
    return {
      ...base,
      applied: false,
      reason: "living_call_failed",
      detail: e instanceof Error ? e.message : String(e),
      measured: buildMeasured(
        handoff,
        living,
        livingBefore,
        readLivingStatus(living),
        nowMs,
        opts?.topology,
      ),
    };
  }
}

/**
 * Resolve the packaged Studio stage from the well-known Dais global when present.
 * Returns null in tests / pre-stage-ready bootstrap — never throws.
 */
export function resolveDefaultPackagedStage(
  globalObj: { __GASPER_DAIS__?: unknown } = typeof globalThis !== "undefined"
    ? (globalThis as { __GASPER_DAIS__?: unknown })
    : {},
): PilotStageTarget | null {
  const dais = globalObj.__GASPER_DAIS__ as
    | {
        living?: PilotLivingRuntimeTarget;
        setEmbodiment?: (id: string) => void;
        setExpression?: (id: string) => void;
      }
    | undefined;
  if (!dais) return null;
  return {
    living: dais.living ?? null,
    setEmbodiment:
      typeof dais.setEmbodiment === "function"
        ? (id) => dais.setEmbodiment!(id)
        : undefined,
    setExpression:
      typeof dais.setExpression === "function"
        ? (id) => dais.setExpression!(id)
        : undefined,
  };
}

/**
 * Wire living transition-settled → pilot queue drain once per living instance.
 * Safe when living lacks setOnTransitionSettled (no-op).
 */
export function wireLivingSettleToPilot(
  living: PilotLivingRuntimeTarget | null | undefined,
  host: GasperPilotHost,
  wired: WeakSet<object>,
): boolean {
  if (!living || typeof living !== "object") return false;
  if (wired.has(living as object)) return true;
  if (typeof living.setOnTransitionSettled !== "function") return false;
  living.setOnTransitionSettled(() => {
    try {
      host.notifyGsapSettled();
    } catch {
      /* never throw into living */
    }
  });
  wired.add(living as object);
  return true;
}

/**
 * Construct a single GasperPilotHost wired through the optional living adapter.
 * Call once from packaged Studio app bootstrap.
 */
export function mountStudioPilotAdapter(
  opts: StudioPilotAdapterOptions = {},
): StudioPilotAdapter {
  let lastHandoff: StudioPilotHandoffOutcome | null = null;
  const handoffLog: StudioPilotHandoffOutcome[] = [];
  let disposed = false;
  const settleWired = new WeakSet<object>();
  const nowMs = opts.nowMs ?? (() => Date.now());

  const resolveStage =
    opts.resolveStage ?? (() => resolveDefaultPackagedStage());

  const host =
    opts.host ??
    createGasperPilotHost({
      onGsapHandoff: (handoff) => {
        if (disposed) return;
        const stage = resolveStage();
        // Settle wire: living completion drains interrupt=queue plans.
        if (stage?.living) {
          wireLivingSettleToPilot(stage.living, host, settleWired);
        }
        const topology = host.get_state().topology;
        const outcome = applyPilotHandoffToLiving(handoff, stage, {
          nowMs: nowMs(),
          topology,
        });
        // Topology after apply — still locked (kernel never mutates counts).
        if (outcome.measured && topology) {
          const after = host.get_state().topology;
          const evalTopo = evaluateTopologyStability(topology, after);
          outcome.measured.topologyStable = evalTopo.stable;
          outcome.measured.topology = after;
        }
        lastHandoff = outcome;
        handoffLog.unshift(outcome);
        if (handoffLog.length > HANDOFF_LOG_CAP) handoffLog.length = HANDOFF_LOG_CAP;
        opts.onHandoffOutcome?.(outcome);
      },
    });

  return {
    host,
    get lastHandoff() {
      return lastHandoff;
    },
    get handoffLog() {
      return handoffLog;
    },
    reportBridgeConnected(connected: boolean) {
      if (disposed) return;
      host.reportBridgeConnected(connected);
    },
    reportHqConnected(connected: boolean) {
      if (disposed) return;
      host.reportHqConnected(connected);
    },
    recoverStandalone(mode?: RecoveryMode) {
      return host.recoverStandalone(mode);
    },
    notifyGsapSettled() {
      return host.notifyGsapSettled();
    },
    dispose() {
      disposed = true;
      lastHandoff = null;
      handoffLog.length = 0;
      // Clear settle handlers on known stages if possible
      try {
        const stage = resolveStage();
        stage?.living?.setOnTransitionSettled?.(null);
      } catch {
        /* */
      }
    },
  };
}
