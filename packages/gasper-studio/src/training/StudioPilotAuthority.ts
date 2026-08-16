import type { DaisFirstAdapter } from "../dais-first/daisFirstControls.js";
import { TUNING_PARAMETER_SPECS, type TuningLabSession, type TuningParameterId } from "../tuning/tuningRegistry.js";
import type { ReferenceTrainingSession } from "./ReferenceTrainingSession.js";
import {
  STUDIO_PILOT_ACTION_KINDS,
  type StudioPilotAction,
  type StudioPilotActionBatch,
  type StudioPilotActionReceipt,
  type StudioPilotCapability,
  type StudioPilotObservation,
} from "./StudioPilotProtocol.js";

type ActionResult = Readonly<{ ok: boolean; error?: string; code?: string; revision?: number; [key: string]: unknown }>;

export type StudioPilotDaisSurface = {
  living?: { goEightState?: (id: string, options?: { duration?: number; interrupt?: boolean }) => void };
  livingStatus?: () => Record<string, unknown>;
  ownerReviewStatus?: () => Record<string, unknown>;
  setMicrostate?: (id: string, options?: { duration?: number }) => void;
  getWorldPhysicsParams?: () => Record<string, number>;
  getWorldBodyState?: () => unknown;
  inspectReferencePerformance?: () => unknown;
  setWorldPhysicsParams?: (params: Record<string, number>) => void;
  launchWorldBounce?: () => void;
  launchWorldComet?: () => void;
  disarmWorldBody?: () => void;
  setPerformancePackParams?: (params: { tempo?: number; exaggeration?: number }) => void;
  setCraftShotBias?: (bias: string) => void;
  runCraftPack?: (packId: string) => boolean;
  stopCraftPack?: () => void;
  setWanderEnabled?: (enabled: boolean) => void;
  setLifeEnabled?: (enabled: boolean) => void;
  enableBoo?: (enabled: boolean) => void;
  startLiving?: (options?: Record<string, unknown>) => void;
  stopLiving?: () => void;
  getWanderState?: () => unknown;
  getLifeState?: () => unknown;
};

export type StudioPilotAuthorityDependencies = Readonly<{
  adapter: DaisFirstAdapter;
  tuningLab: Pick<TuningLabSession, "snapshot" | "set" | "reset" | "pinBaseline" | "compareBaseline" | "captureProof">;
  referenceTraining: Pick<ReferenceTrainingSession, "snapshot" | "linkVideo" | "analyze" | "cancel" | "preview" | "stopPreview">;
  getDais: () => StudioPilotDaisSurface | null;
  now?: () => number;
}>;

const DESCRIPTIONS: Readonly<Record<(typeof STUDIO_PILOT_ACTION_KINDS)[number], string>> = Object.freeze({
  "tuning.set": "Set one bounded Tuning Lab parameter through its owning authority.",
  "tuning.reset": "Restore the Tuning Lab authored defaults.",
  "tuning.pin_baseline": "Pin the current Tuning Lab baseline.",
  "tuning.compare_baseline": "Compare current tuning state with the pinned baseline.",
  "tuning.capture_proof": "Capture a reviewable proof bundle through the Studio adapter.",
  "studio.set_embodiment": "Select one authored Gasper embodiment through the document-first adapter.",
  "studio.set_expression": "Select an authored expression fixture through the Studio adapter.",
  "studio.set_eight_state": "Hold one authored eight-state pose through the living authority.",
  "studio.set_expression_gain": "Set the bounded acting layer gain through Tuning Lab.",
  "studio.transport": "Operate the existing animation transport and playhead.",
  "physics.set_params": "Set bounded world-physics parameters through the rig controller.",
  "physics.launch_bounce": "Launch the authored S2 bounce performance.",
  "physics.launch_comet": "Launch the authored S4 comet performance.",
  "physics.disarm": "Release the authored world-physics performance.",
  "craft.set_params": "Set bounded craft pack amplitude, tempo, or shot framing.",
  "craft.run_pack": "Run one shipped craft pack.",
  "craft.stop_pack": "Stop the active craft pack.",
  "autonomy.set": "Enable or disable one existing living, wander, life, or Boo authority.",
  "reference.link_video": "Link a measured direct video source through Reference Training.",
  "reference.analyze": "Analyze the linked source through mechanics, semantics, and retargeting.",
  "reference.preview": "Preview the admitted reference behavior through the physics authority.",
  "reference.stop": "Cancel analysis and stop the active reference preview.",
});

function available(kind: StudioPilotAction["kind"], dependencies: StudioPilotAuthorityDependencies): boolean {
  const dais = dependencies.getDais();
  if (kind.startsWith("tuning.")) return true;
  if (kind === "studio.set_embodiment") return typeof dependencies.adapter.setEmbodiment === "function";
  if (kind === "studio.set_expression") return typeof dependencies.adapter.setExpression === "function";
  if (kind === "studio.set_eight_state") return Boolean(dais?.living?.goEightState || dais?.setMicrostate);
  if (kind === "studio.set_expression_gain") return true;
  if (kind === "studio.transport") return true;
  if (kind === "physics.set_params") return typeof dais?.setWorldPhysicsParams === "function";
  if (kind === "physics.launch_bounce") return typeof dais?.launchWorldBounce === "function";
  if (kind === "physics.launch_comet") return typeof dais?.launchWorldComet === "function";
  if (kind === "physics.disarm") return typeof dais?.disarmWorldBody === "function";
  if (kind === "craft.set_params") return Boolean(dais?.setPerformancePackParams || dais?.setCraftShotBias);
  if (kind === "craft.run_pack") return typeof dais?.runCraftPack === "function";
  if (kind === "craft.stop_pack") return typeof dais?.stopCraftPack === "function";
  if (kind === "autonomy.set") return Boolean(dais?.startLiving || dais?.setWanderEnabled || dais?.setLifeEnabled || dais?.enableBoo);
  return true;
}

function bounds(kind: StudioPilotAction["kind"]): Record<string, unknown> {
  if (kind === "tuning.set") {
    return Object.fromEntries(TUNING_PARAMETER_SPECS.map((spec) => [spec.id, {
      min: spec.min,
      max: spec.max,
      step: spec.step,
      unit: spec.unit,
    }]));
  }
  if (kind === "physics.set_params") return {
    gravityScale: { min: 0.25, max: 2 }, restitution: { min: 0, max: 0.9 },
    launchPower: { min: 0.25, max: 2 }, intensity: { min: 0, max: 1 },
  };
  if (kind === "craft.set_params") return {
    exaggeration: { min: 0.5, max: 2 }, tempo: { min: 0.75, max: 1.25 },
    shotBias: ["authored", "medium", "wide"],
  };
  if (kind === "studio.set_expression_gain") return { gain: { min: 0.5, max: 1.5 } };
  if (kind === "studio.transport") return { positionMs: { min: 0, max: 3_600_000 } };
  return {};
}

export function createStudioPilotCapabilityCatalog(
  dependencies: StudioPilotAuthorityDependencies,
): StudioPilotCapability[] {
  return STUDIO_PILOT_ACTION_KINDS.map((kind) => ({
    kind,
    available: available(kind, dependencies),
    description: DESCRIPTIONS[kind],
    bounds: bounds(kind),
  }));
}

function safe<T>(read: () => T, fallback: T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

export function captureStudioPilotObservation(
  dependencies: StudioPilotAuthorityDependencies,
): StudioPilotObservation {
  const studio = safe(() => dependencies.adapter.getSnapshot(), null);
  const tuning = safe(() => dependencies.tuningLab.snapshot(), null);
  const reference = safe(() => dependencies.referenceTraining.snapshot(), null);
  const dais = dependencies.getDais();
  const living = safe(() => dais?.livingStatus?.() ?? {}, {});
  const owner = safe(() => dais?.ownerReviewStatus?.() ?? {}, {});
  return {
    schema: "gasper.studio-pilot.observation.v1",
    capturedAtMs: dependencies.now?.() ?? Date.now(),
    studio: studio ? {
      embodiment: studio.character.embodiment,
      expression: studio.character.expression,
      playback: studio.animation.playback,
      playheadMs: studio.animation.playheadMs,
      activeClipId: studio.animation.activeClipId,
      durationMs: studio.animation.clips.find((clip) => clip.id === studio.animation.activeClipId)?.durationMs ?? studio.animation.visibleRangeMs.end,
    } : {},
    tuning: tuning ? {
      revision: tuning.revision,
      embodiment: tuning.embodiment,
      baselinePinned: tuning.baselinePinned,
      changedFromBaseline: tuning.changedFromBaseline,
      state: { ...tuning.state },
      telemetry: { ...tuning.telemetry },
    } : {},
    physics: {
      params: record(safe(() => dais?.getWorldPhysicsParams?.() ?? {}, {})),
      body: record(safe(() => dais?.getWorldBodyState?.() ?? {}, {})),
      referencePerformance: record(safe(() => dais?.inspectReferencePerformance?.() ?? {}, {})),
    },
    autonomy: {
      living: record(living),
      ownerReview: record(owner),
      wander: record(safe(() => dais?.getWanderState?.() ?? {}, {})),
      life: record(safe(() => dais?.getLifeState?.() ?? {}, {})),
    },
    reference: reference ? {
      status: reference.status,
      revision: reference.revision,
      sessionId: reference.sessionId,
      hasSource: Boolean(reference.source),
      hasPlan: Boolean(reference.physicsPlan),
      errorCode: reference.errorCode,
    } : {},
  };
}

export type StudioPilotRollbackSnapshot = Readonly<{
  tuning: Record<string, number>;
  embodiment: string | null;
  expression: string | null;
  playback: string;
  playheadMs: number;
  physics: Record<string, number>;
  autonomy: Readonly<{ living: boolean; wander: boolean; life: boolean; boo: boolean }>;
}>;

function result(value: unknown): ActionResult {
  if (value && typeof value === "object" && "ok" in value) return value as ActionResult;
  return { ok: true };
}

function required<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw new Error(message);
  return value;
}

const ROLLBACK_COVERED_ACTIONS: ReadonlySet<StudioPilotAction["kind"]> = new Set([
  "tuning.set",
  "tuning.reset",
  "studio.set_embodiment",
  "studio.set_expression",
  "studio.set_expression_gain",
  "studio.transport",
  "physics.set_params",
  "autonomy.set",
]);

export class StudioPilotExecutor {
  constructor(private readonly dependencies: StudioPilotAuthorityDependencies) {}

  captureRollbackSnapshot(): StudioPilotRollbackSnapshot {
    const studio = this.dependencies.adapter.getSnapshot();
    const tuning = this.dependencies.tuningLab.snapshot();
    const dais = this.dependencies.getDais();
    const owner = safe(() => dais?.ownerReviewStatus?.() ?? {}, {});
    const living = safe(() => dais?.livingStatus?.() ?? {}, {});
    return {
      tuning: { ...tuning.state },
      embodiment: studio.character.embodiment ?? tuning.embodiment,
      expression: studio.character.expression,
      playback: studio.animation.playback,
      playheadMs: studio.animation.playheadMs,
      physics: { ...(safe(() => dais?.getWorldPhysicsParams?.() ?? {}, {})) },
      autonomy: {
        living: living.running === true,
        wander: owner.wanderEnabled === true,
        life: owner.lifeEnabled === true,
        boo: owner.boo === true,
      },
    };
  }

  async rollback(snapshot: StudioPilotRollbackSnapshot): Promise<void> {
    const dais = this.dependencies.getDais();
    this.dependencies.referenceTraining.cancel();
    this.dependencies.referenceTraining.stopPreview();
    dais?.stopCraftPack?.();
    dais?.disarmWorldBody?.();
    for (const [id, value] of Object.entries(snapshot.tuning)) {
      this.dependencies.tuningLab.set(id as TuningParameterId, value);
    }
    if (snapshot.embodiment) this.dependencies.adapter.setEmbodiment?.(snapshot.embodiment);
    if (snapshot.expression) this.dependencies.adapter.setExpression?.(snapshot.expression);
    if (Object.keys(snapshot.physics).length) dais?.setWorldPhysicsParams?.(snapshot.physics);
    dais?.setWanderEnabled?.(snapshot.autonomy.wander);
    dais?.setLifeEnabled?.(snapshot.autonomy.life);
    dais?.enableBoo?.(snapshot.autonomy.boo);
    if (snapshot.autonomy.living) dais?.startLiving?.();
    else dais?.stopLiving?.();
    this.dependencies.adapter.setPlayhead(snapshot.playheadMs);
    if (snapshot.playback === "playing") this.dependencies.adapter.play();
    else this.dependencies.adapter.pause();
  }

  async executeBatch(batch: StudioPilotActionBatch, signal: AbortSignal): Promise<StudioPilotActionReceipt[]> {
    const receipts: StudioPilotActionReceipt[] = [];
    let blocked = false;
    for (const action of batch.actions) {
      if (blocked) {
        receipts.push(this.receipt(action, "skipped", "Skipped after an earlier authority rejection."));
        continue;
      }
      if (signal.aborted) {
        receipts.push(this.receipt(action, "cancelled", "Pilot session cancelled before this action."));
        blocked = true;
        continue;
      }
      const beforeRevision = this.dependencies.tuningLab.snapshot().revision;
      try {
        const actionResult = await this.execute(action);
        if (!actionResult.ok) throw new Error(actionResult.error || actionResult.code || "authority rejected action");
        receipts.push(this.receipt(action, "applied", `${action.kind} applied.`, actionResult, beforeRevision));
      } catch (error) {
        receipts.push(this.receipt(
          action,
          signal.aborted ? "cancelled" : "failed",
          error instanceof Error ? error.message : String(error),
          undefined,
          beforeRevision,
        ));
        if (!batch.continueOnError) blocked = true;
      }
    }
    return receipts;
  }

  private receipt(
    action: StudioPilotAction,
    status: StudioPilotActionReceipt["status"],
    message: string,
    detail?: Record<string, unknown>,
    beforeRevision?: number,
  ): StudioPilotActionReceipt {
    return {
      schema: "gasper.studio-pilot.action-receipt.v1",
      actionId: action.id,
      kind: action.kind,
      status,
      message,
      reversible: ROLLBACK_COVERED_ACTIONS.has(action.kind),
      beforeRevision,
      afterRevision: this.dependencies.tuningLab.snapshot().revision,
      detail,
    };
  }

  private async execute(action: StudioPilotAction): Promise<ActionResult> {
    const { adapter, tuningLab, referenceTraining } = this.dependencies;
    const dais = this.dependencies.getDais();
    switch (action.kind) {
      case "tuning.set": return result(tuningLab.set(action.parameter, action.value));
      case "tuning.reset": return result(tuningLab.reset());
      case "tuning.pin_baseline": return result(tuningLab.pinBaseline());
      case "tuning.compare_baseline": return { ok: true, ...tuningLab.compareBaseline() };
      case "tuning.capture_proof": return result(tuningLab.captureProof());
      case "studio.set_embodiment":
        required(adapter.setEmbodiment, "Studio embodiment authority unavailable").call(adapter, action.embodiment);
        return { ok: true };
      case "studio.set_expression":
        required(adapter.setExpression, "Studio expression authority unavailable").call(adapter, action.expression);
        return { ok: true };
      case "studio.set_eight_state":
        if (dais?.living?.goEightState) dais.living.goEightState(action.state, { duration: 0.55 });
        else required(dais?.setMicrostate, "Studio eight-state authority unavailable").call(dais, action.state, { duration: 0.55 });
        return { ok: true };
      case "studio.set_expression_gain": return result(tuningLab.set("actingGain", action.gain));
      case "studio.transport": return this.executeTransport(action);
      case "physics.set_params":
        required(dais?.setWorldPhysicsParams, "World physics authority unavailable").call(dais, action.params);
        return { ok: true };
      case "physics.launch_bounce":
        required(dais?.launchWorldBounce, "Bounce authority unavailable").call(dais);
        return { ok: true };
      case "physics.launch_comet":
        required(dais?.launchWorldComet, "Comet authority unavailable").call(dais);
        return { ok: true };
      case "physics.disarm":
        required(dais?.disarmWorldBody, "World physics authority unavailable").call(dais);
        return { ok: true };
      case "craft.set_params":
        if (action.params.exaggeration !== undefined || action.params.tempo !== undefined) {
          required(dais?.setPerformancePackParams, "Craft parameter authority unavailable").call(dais, {
            exaggeration: action.params.exaggeration,
            tempo: action.params.tempo,
          });
        }
        if (action.params.shotBias !== undefined) {
          required(dais?.setCraftShotBias, "Craft shot authority unavailable").call(dais, action.params.shotBias);
        }
        return { ok: true };
      case "craft.run_pack":
        if (!required(dais?.runCraftPack, "Craft pack authority unavailable").call(dais, action.packId)) {
          return { ok: false, error: `craft pack rejected: ${action.packId}` };
        }
        return { ok: true };
      case "craft.stop_pack":
        required(dais?.stopCraftPack, "Craft pack authority unavailable").call(dais);
        return { ok: true };
      case "autonomy.set": return this.executeAutonomy(action);
      case "reference.link_video": return result(await referenceTraining.linkVideo(action.url));
      case "reference.analyze": return result(await referenceTraining.analyze(action.intent));
      case "reference.preview": return result(referenceTraining.preview());
      case "reference.stop":
        referenceTraining.cancel();
        return result(referenceTraining.stopPreview());
    }
  }

  private executeTransport(action: Extract<StudioPilotAction, { kind: "studio.transport" }>): ActionResult {
    const adapter = this.dependencies.adapter;
    const snapshot = adapter.getSnapshot();
    const active = snapshot.animation.clips.find((clip) => clip.id === snapshot.animation.activeClipId);
    const duration = active?.durationMs ?? snapshot.animation.visibleRangeMs.end ?? 0;
    if (action.command === "play") adapter.play();
    else if (action.command === "pause") adapter.pause();
    else if (action.command === "interrupt") adapter.interrupt();
    else if (action.command === "home") adapter.setPlayhead(0);
    else if (action.command === "end") adapter.setPlayhead(duration);
    else if (action.command === "step_forward") adapter.setPlayhead(Math.min(duration, snapshot.animation.playheadMs + 1000 / 60));
    else if (action.command === "step_back") adapter.setPlayhead(Math.max(0, snapshot.animation.playheadMs - 1000 / 60));
    else adapter.setPlayhead(action.positionMs!);
    return { ok: true };
  }

  private executeAutonomy(action: Extract<StudioPilotAction, { kind: "autonomy.set" }>): ActionResult {
    const dais = required(this.dependencies.getDais(), "Autonomy authority unavailable");
    if (action.authority === "living") {
      if (action.enabled) required(dais.startLiving, "Living authority unavailable").call(dais);
      else required(dais.stopLiving, "Living authority unavailable").call(dais);
    } else if (action.authority === "wander") {
      required(dais.setWanderEnabled, "Wander authority unavailable").call(dais, action.enabled);
    } else if (action.authority === "life") {
      required(dais.setLifeEnabled, "Life authority unavailable").call(dais, action.enabled);
    } else {
      required(dais.enableBoo, "Boo authority unavailable").call(dais, action.enabled);
    }
    return { ok: true };
  }
}
