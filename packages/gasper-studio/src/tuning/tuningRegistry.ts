import { compileMotionIntent, type MotionIntentPlan } from "./intentToMotion";

/**
 * Tuning Lab — the small, typed control plane for reversible Gasper experiments.
 *
 * The registry does not own physics. It names bounded knobs, routes each knob
 * to its existing authority, and keeps a reviewable state/baseline receipt.
 */

export const TUNING_PARAMETER_SPECS = [
  {
    id: "verticalDepthGain",
    label: "Vertical depth",
    description: "Projection / finite-thickness gain; 1.00 is the authored baseline. Not a height crush.",
    min: 0.8,
    max: 1.1,
    step: 0.01,
    defaultValue: 1,
    unit: "×",
  },
  {
    id: "craftExaggeration",
    label: "Craft exaggeration",
    description: "Performance-pack amplitude; the volume law remains downstream.",
    min: 0.5,
    max: 2,
    step: 0.05,
    defaultValue: 1.25,
    unit: "×",
  },
  {
    id: "gaitBobGain",
    label: "Gait bob",
    description: "Bounded vertical gait read applied after kernel derivation.",
    min: 0,
    max: 1.5,
    step: 0.05,
    defaultValue: 1,
    unit: "×",
  },
  {
    id: "contactSquashGain",
    label: "Contact squash",
    description: "Bounded contact impulse read; physics remains the authority.",
    min: 0,
    max: 1.5,
    step: 0.05,
    defaultValue: 1,
    unit: "×",
  },
  {
    id: "supportExchangeGain",
    label: "Support exchange",
    description: "Support-carrier/plant exchange visibility; the planted root law remains upstream.",
    min: 0,
    max: 1.5,
    step: 0.05,
    defaultValue: 1,
    unit: "×",
  },
  {
    id: "footworkPrimitiveGain",
    label: "Footwork primitive",
    description: "Bounded step-base and lateral footwork read over the derived gait.",
    min: 0,
    max: 1.5,
    step: 0.05,
    defaultValue: 1,
    unit: "×",
  },
  {
    id: "footRootGain",
    label: "Foot-root mass",
    description: "Structural Wispwalker root amplitude; the shell remains one continuous mass.",
    min: 0.5,
    max: 2.5,
    step: 0.05,
    defaultValue: 1,
    unit: "×",
  },
  {
    id: "walkAmp",
    label: "Walk mass shift",
    description: "Authored Wispwalker scaffold amplitude; physics still owns travel and support timing.",
    min: 0,
    max: 2,
    step: 0.05,
    defaultValue: 1.25,
    unit: "×",
  },
  {
    id: "walkAccent",
    label: "Walk accent",
    description: "Intentional footwork accent envelope over the physics-locked step phase.",
    min: 0,
    max: 1,
    step: 0.05,
    defaultValue: 0.6,
    unit: "×",
  },
  {
    id: "stepDepth",
    label: "Step depth",
    description: "Authored planted-root pressure depth; bounded and reversible.",
    min: 0,
    max: 10,
    step: 0.1,
    defaultValue: 7.2,
    unit: "u",
  },
  {
    id: "walkPeriod",
    label: "Walk period",
    description: "In-place walk cadence fallback; travel cadence remains physics-derived.",
    min: 0.5,
    max: 3,
    step: 0.05,
    defaultValue: 1.25,
    unit: "s",
  },
  {
    id: "footworkTempo",
    label: "Footwork tempo",
    description: "Gait cadence multiplier; travel and support phase remain physics-derived.",
    min: 0.75,
    max: 1.25,
    step: 0.01,
    defaultValue: 1,
    unit: "×",
  },
  {
    id: "actingGain",
    label: "Acting layers",
    description: "Canonical expression gain for the active acting layer.",
    min: 0.5,
    max: 1.5,
    step: 0.05,
    defaultValue: 1,
    unit: "×",
  },
  {
    id: "viscoTau",
    label: "Mass tau",
    description: "Contour inertia time constant; lower is quicker, higher is heavier.",
    min: 0.02,
    max: 1,
    step: 0.01,
    defaultValue: 0.25,
    unit: "s",
  },
] as const;

export type TuningParameterId = (typeof TUNING_PARAMETER_SPECS)[number]["id"];
export type TuningParameterSpec = (typeof TUNING_PARAMETER_SPECS)[number];
export type TuningLabState = Record<TuningParameterId, number>;

export type TuningLabSurface = {
  commitBinding?: (id: string, value: number) => void;
  setDesignParameter?: (domain: string, id: string, value: number) => void;
  setPerformancePackParams?: (params: { tempo?: number; exaggeration?: number }) => void;
  setTuningLabParams?: (params: {
    gaitBobGain?: number;
    contactSquashGain?: number;
    supportExchangeGain?: number;
    footworkPrimitiveGain?: number;
    footworkTempo?: number;
    verticalDepthGain?: number;
  }) => void;
  setExpressionGain?: (value: number, embodiment?: string) => void;
  setEmbodiment?: (id: string) => void;
  /** Canonical document identity; telemetry is only the compatibility fallback. */
  readEmbodiment?: () => string | null;
  readTelemetry?: () => Record<string, number | string | null>;
  captureProof?: () => { ok: boolean; json?: string; bundleHash?: string; error?: string };
  /** Tendency / causal physics goals. WorldPhysicsDriver remains the sole writer. */
  filePhysicsGoals?: (goals: {
    locomotion: { x: number; z: number; cruise: number };
    gather?: number;
  }) => void;
};

export type TuningLabAction = {
  ok: boolean;
  id?: TuningParameterId;
  value?: number;
  state: TuningLabState;
  action: "set" | "reset" | "pin-baseline" | "apply-intent";
  error?: string;
};

const DEFAULT_EMBODIMENT = "wispwalker";

export type TuningLabSnapshot = {
  state: TuningLabState;
  embodiment: string;
  baseline: TuningLabState | null;
  baselineEmbodiment: string | null;
  baselinePinned: boolean;
  lastAction: TuningLabAction["action"];
  revision: number;
  changedFromBaseline: boolean;
  experiment: {
    before: TuningLabState;
    after: TuningLabState;
    beforeEmbodiment: string;
    afterEmbodiment: string;
    action: TuningLabAction["action"];
    revision: number;
  } | null;
  lastIntentPlan: MotionIntentPlan | null;
  telemetry: Record<string, number | string | null>;
  lastCapture: { ok: boolean; bundleHash?: string; error?: string } | null;
};

export function createDefaultTuningLabState(): TuningLabState {
  return Object.fromEntries(
    TUNING_PARAMETER_SPECS.map((spec) => [spec.id, spec.defaultValue]),
  ) as TuningLabState;
}

function specFor(id: TuningParameterId): TuningParameterSpec {
  return TUNING_PARAMETER_SPECS.find((spec) => spec.id === id) as TuningParameterSpec;
}

function clampValue(spec: TuningParameterSpec, value: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return spec.defaultValue;
  return Math.max(spec.min, Math.min(spec.max, numeric));
}

function cloneState(state: TuningLabState): TuningLabState {
  return { ...state };
}

function equalState(a: TuningLabState | null, b: TuningLabState | null): boolean {
  if (!a || !b) return false;
  return TUNING_PARAMETER_SPECS.every((spec) => a[spec.id] === b[spec.id]);
}

/**
 * A tiny store rather than a second authority. The surface getter is late-bound
 * so the browser can construct the lab before the Dais controller mounts.
 */
export class TuningLabSession {
  private state: TuningLabState = createDefaultTuningLabState();
  private embodiment = DEFAULT_EMBODIMENT;
  private baseline: TuningLabState | null = null;
  private baselineEmbodiment: string | null = null;
  private lastAction: TuningLabAction["action"] = "reset";
  private revision = 0;
  private lastExperiment: TuningLabSnapshot["experiment"] = null;
  private lastIntentPlan: MotionIntentPlan | null = null;
  private lastCapture: TuningLabSnapshot["lastCapture"] = null;
  /** Explicit intent identity stays stable while its reversible experiment is live. */
  private activeIntentEmbodiment: string | null = null;
  private cachedSnapshot: TuningLabSnapshot | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly getSurface: () => TuningLabSurface | null = () => null) {}

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  snapshot(): TuningLabSnapshot {
    if (this.cachedSnapshot) return this.cachedSnapshot;
    const telemetry = { ...(this.getSurface()?.readTelemetry?.() ?? {}) };
    if (this.activeIntentEmbodiment) {
      // The direct runtime may briefly reproject a stale expression identity;
      // the active intent remains the lab's explicit, reviewable identity.
      this.embodiment = this.activeIntentEmbodiment;
      telemetry.embodiment = this.activeIntentEmbodiment;
    } else {
      const surfaceEmbodiment = this.getSurface()?.readEmbodiment?.() ?? telemetry.embodiment;
      if (typeof surfaceEmbodiment === "string" && surfaceEmbodiment.trim()) {
        this.embodiment = surfaceEmbodiment;
      }
    }
    this.cachedSnapshot = {
      state: cloneState(this.state),
      embodiment: this.embodiment,
      baseline: this.baseline ? cloneState(this.baseline) : null,
      baselineEmbodiment: this.baselineEmbodiment,
      baselinePinned: !!this.baseline && !!this.baselineEmbodiment,
      lastAction: this.lastAction,
      revision: this.revision,
      changedFromBaseline: this.baseline ? !equalState(this.state, this.baseline) : false,
      experiment: this.lastExperiment
        ? {
            before: cloneState(this.lastExperiment.before),
            after: cloneState(this.lastExperiment.after),
            beforeEmbodiment: this.lastExperiment.beforeEmbodiment,
            afterEmbodiment: this.lastExperiment.afterEmbodiment,
            action: this.lastExperiment.action,
            revision: this.lastExperiment.revision,
          }
        : null,
      lastIntentPlan: this.lastIntentPlan
        ? {
            ...this.lastIntentPlan,
            parameters: { ...this.lastIntentPlan.parameters },
            constraints: [...this.lastIntentPlan.constraints],
          }
        : null,
      telemetry: { ...telemetry },
      lastCapture: this.lastCapture ? { ...this.lastCapture } : null,
    };
    return this.cachedSnapshot;
  }

  set(id: TuningParameterId, rawValue: number): TuningLabAction {
    const spec = specFor(id);
    const value = clampValue(spec, rawValue);
    const surface = this.getSurface();
    this.syncEmbodimentFromSurface();
    const before = cloneState(this.state);
    const beforeEmbodiment = this.embodiment;
    try {
      if (id === "verticalDepthGain") {
        surface?.setTuningLabParams?.({ verticalDepthGain: value });
      }
      if (id === "viscoTau") {
        if (surface?.setDesignParameter) surface.setDesignParameter("form", "visco_tau", value);
        else surface?.commitBinding?.("visco_tau", value);
      }
      if (id === "craftExaggeration") {
        surface?.setPerformancePackParams?.({ exaggeration: value });
      }
      if (
        id === "gaitBobGain" ||
        id === "contactSquashGain" ||
        id === "supportExchangeGain" ||
        id === "footworkPrimitiveGain" ||
        id === "footworkTempo"
      ) {
        surface?.setTuningLabParams?.({
          gaitBobGain: id === "gaitBobGain" ? value : this.state.gaitBobGain,
          contactSquashGain:
            id === "contactSquashGain" ? value : this.state.contactSquashGain,
          supportExchangeGain:
            id === "supportExchangeGain" ? value : this.state.supportExchangeGain,
          footworkPrimitiveGain:
            id === "footworkPrimitiveGain" ? value : this.state.footworkPrimitiveGain,
          footworkTempo: id === "footworkTempo" ? value : this.state.footworkTempo,
        });
      }
      if (id === "footRootGain") {
        surface?.setDesignParameter?.("form", "foot_amp", value);
      }
      if (id === "walkAmp" || id === "walkAccent" || id === "stepDepth" || id === "walkPeriod") {
        const designId =
          id === "walkAmp"
            ? "walk_amp"
            : id === "walkAccent"
              ? "walk_accent"
              : id === "stepDepth"
                ? "step_depth"
                : "walk_period";
        surface?.setDesignParameter?.("form", designId, value);
      }
      if (id === "footworkTempo") surface?.setPerformancePackParams?.({ tempo: value });
      if (id === "actingGain") {
        if (this.embodiment === DEFAULT_EMBODIMENT) surface?.setExpressionGain?.(value);
        else surface?.setExpressionGain?.(value, this.embodiment);
        // Expression projection is allowed to repaint its own channels, but it
        // must not silently replace the lab's explicit main-form identity.
        if (this.embodiment !== DEFAULT_EMBODIMENT) {
          surface?.setEmbodiment?.(this.embodiment);
        }
      }
    } catch (error) {
      return {
        ok: false,
        id,
        value,
        state: cloneState(this.state),
        action: "set",
        error: error instanceof Error ? error.message : String(error),
      };
    }
    this.state = { ...this.state, [id]: value };
    this.lastAction = "set";
    this.revision += 1;
    this.lastExperiment = {
      before,
      after: cloneState(this.state),
      beforeEmbodiment,
      afterEmbodiment: this.embodiment,
      action: "set",
      revision: this.revision,
    };
    this.emit();
    return { ok: true, id, value, state: cloneState(this.state), action: "set" };
  }

  pinBaseline(): TuningLabAction {
    this.syncEmbodimentFromSurface();
    this.baseline = cloneState(this.state);
    this.baselineEmbodiment = this.embodiment;
    this.lastAction = "pin-baseline";
    this.revision += 1;
    this.lastExperiment = {
      before: cloneState(this.state),
      after: cloneState(this.state),
      beforeEmbodiment: this.embodiment,
      afterEmbodiment: this.embodiment,
      action: "pin-baseline",
      revision: this.revision,
    };
    this.emit();
    return { ok: true, state: cloneState(this.state), action: "pin-baseline" };
  }

  applyIntent(source: string): TuningLabAction & {
    plan?: MotionIntentPlan;
  } {
    const compiled = compileMotionIntent(source);
    if (!compiled.ok) {
      return {
        ok: false,
        state: cloneState(this.state),
        action: "apply-intent",
        error: `${compiled.error}; suggestions: ${compiled.suggestions.join(" | ")}`,
      };
    }
    this.syncEmbodimentFromSurface();
    const before = cloneState(this.state);
    const beforeEmbodiment = this.embodiment;
    const beforeActiveIntentEmbodiment = this.activeIntentEmbodiment;
    // Make an explicit intent embodiment available to every downstream route
    // before acting-gain reprojection runs. The final handoff below remains in
    // place as the commit point; rollback restores the prior identity if any
    // parameter route rejects.
    if (compiled.plan.embodiment) {
      this.activeIntentEmbodiment = compiled.plan.embodiment;
      try {
        this.getSurface()?.setEmbodiment?.(compiled.plan.embodiment);
        this.embodiment = compiled.plan.embodiment;
      } catch (error) {
        return this.rollbackTo(
          before,
          beforeEmbodiment,
          "apply-intent",
          error instanceof Error ? error.message : String(error),
          beforeActiveIntentEmbodiment,
        );
      }
    }
    for (const [id, value] of Object.entries(compiled.plan.parameters)) {
      const action = this.set(id as TuningParameterId, value as number);
      if (!action.ok) {
        // Intent application is transactional at the lab boundary: a plan that
        // cannot reach every owning authority must not leave a partial blend.
        return this.rollbackTo(
          before,
          beforeEmbodiment,
          "apply-intent",
          action.error || `parameter route rejected: ${id}`,
          beforeActiveIntentEmbodiment,
        );
      }
    }
    try {
      // Apply the embodiment after expression/acting routes: the canonical
      // expression session may reproject its previous embodiment while its
      // gain changes, so the intent's explicit target must be the final handoff.
      if (compiled.plan.embodiment) {
        this.getSurface()?.setEmbodiment?.(compiled.plan.embodiment);
        this.embodiment = compiled.plan.embodiment;
        // The document-first embodiment handoff rebuilds the contour from its
        // projected bindings. Re-apply the already-validated plan after that
        // commit so direct intent and explicit post-handoff patches have one
        // identical runtime surface.
        this.restoreSurfaceState(this.state, this.embodiment);
      }
    } catch (error) {
      return this.rollbackTo(
        before,
        beforeEmbodiment,
        "apply-intent",
        error instanceof Error ? error.message : String(error),
        beforeActiveIntentEmbodiment,
      );
    }
    if (compiled.plan.physicsGoals) {
      this.getSurface()?.filePhysicsGoals?.(compiled.plan.physicsGoals);
    }
    this.lastAction = "apply-intent";
    this.lastIntentPlan = {
      ...compiled.plan,
      parameters: { ...compiled.plan.parameters },
      constraints: [...compiled.plan.constraints],
    };
    this.revision += 1;
    this.lastExperiment = {
      before,
      after: cloneState(this.state),
      beforeEmbodiment,
      afterEmbodiment: this.embodiment,
      action: "apply-intent",
      revision: this.revision,
    };
    this.emit();
    return {
      ok: true,
      state: cloneState(this.state),
      action: "apply-intent",
      plan: compiled.plan,
    };
  }

  compareBaseline(): { identical: boolean; changed: string[] } {
    this.syncEmbodimentFromSurface();
    const changed: string[] = this.baseline
      ? TUNING_PARAMETER_SPECS.filter((spec) => this.state[spec.id] !== this.baseline?.[spec.id]).map(
          (spec) => spec.id,
        )
      : [];
    if (this.baseline && this.baselineEmbodiment !== this.embodiment) changed.push("embodiment");
    return {
      identical: !!this.baseline && !!this.baselineEmbodiment && changed.length === 0,
      changed,
    };
  }

  reset(): TuningLabAction {
    const defaults = createDefaultTuningLabState();
    this.syncEmbodimentFromSurface();
    const before = cloneState(this.state);
    const beforeEmbodiment = this.embodiment;
    const beforeActiveIntentEmbodiment = this.activeIntentEmbodiment;
    for (const spec of TUNING_PARAMETER_SPECS) {
      const action = this.set(spec.id, defaults[spec.id]);
      if (!action.ok) {
        return this.rollbackTo(
          before,
          beforeEmbodiment,
          "reset",
          action.error || `parameter route rejected: ${spec.id}`,
          beforeActiveIntentEmbodiment,
        );
      }
    }
    try {
      this.getSurface()?.setEmbodiment?.(DEFAULT_EMBODIMENT);
    } catch (error) {
      return this.rollbackTo(
        before,
        beforeEmbodiment,
        "reset",
        error instanceof Error ? error.message : String(error),
        beforeActiveIntentEmbodiment,
      );
    }
    this.embodiment = DEFAULT_EMBODIMENT;
    this.activeIntentEmbodiment = null;
    this.lastAction = "reset";
    this.lastIntentPlan = null;
    this.revision += 1;
    this.lastExperiment = {
      before,
      after: cloneState(this.state),
      beforeEmbodiment,
      afterEmbodiment: this.embodiment,
      action: "reset",
      revision: this.revision,
    };
    this.emit();
    return { ok: true, state: cloneState(this.state), action: "reset" };
  }

  captureProof(): { ok: boolean; bundleHash?: string; error?: string } {
    const result = this.getSurface()?.captureProof?.() ?? {
      ok: false,
      error: "capture_surface_unavailable",
    };
    this.lastCapture = {
      ok: result.ok,
      bundleHash: result.bundleHash,
      error: result.error,
    };
    this.emit();
    return result;
  }

  private emit(): void {
    this.cachedSnapshot = null;
    for (const listener of this.listeners) listener();
  }

  private syncEmbodimentFromSurface(): void {
    if (this.activeIntentEmbodiment) {
      this.embodiment = this.activeIntentEmbodiment;
      return;
    }
    const telemetry = this.getSurface()?.readTelemetry?.() ?? {};
    const surfaceEmbodiment = this.getSurface()?.readEmbodiment?.() ?? telemetry.embodiment;
    if (typeof surfaceEmbodiment === "string" && surfaceEmbodiment.trim()) {
      this.embodiment = surfaceEmbodiment;
    }
  }

  private restoreSurfaceState(state: TuningLabState, expressionEmbodiment = this.embodiment): void {
    const surface = this.getSurface();
    if (!surface) return;
    const restoreFormBindings = () => {
      for (const [id, value] of [
        ["foot_amp", state.footRootGain],
        ["walk_amp", state.walkAmp],
        ["walk_accent", state.walkAccent],
        ["step_depth", state.stepDepth],
        ["walk_period", state.walkPeriod],
      ] as const) {
        try {
          surface.setDesignParameter?.("form", id, value);
        } catch {
          /* */
        }
      }
    };
    try {
      surface.setTuningLabParams?.({ verticalDepthGain: state.verticalDepthGain });
    } catch {
      /* */
    }
    restoreFormBindings();
    try {
      if (surface.setDesignParameter) surface.setDesignParameter("form", "visco_tau", state.viscoTau);
      else surface.commitBinding?.("visco_tau", state.viscoTau);
    } catch {
      /* */
    }
    try {
      surface.setPerformancePackParams?.({
        tempo: state.footworkTempo,
        exaggeration: state.craftExaggeration,
      });
      surface.setTuningLabParams?.({
        gaitBobGain: state.gaitBobGain,
        contactSquashGain: state.contactSquashGain,
        supportExchangeGain: state.supportExchangeGain,
        footworkPrimitiveGain: state.footworkPrimitiveGain,
        footworkTempo: state.footworkTempo,
      });
      if (expressionEmbodiment !== DEFAULT_EMBODIMENT) {
        surface.setExpressionGain?.(state.actingGain, expressionEmbodiment);
      } else {
        surface.setExpressionGain?.(state.actingGain);
      }
      // Expression projection writes document channels and may repaint the
      // form from its snapshot. Reapply the typed form bindings after that
      // projection so intent values are the final live surface, not merely
      // the values reported by the lab state.
      restoreFormBindings();
    } catch {
      /* */
    }
  }

  private rollbackTo(
    state: TuningLabState,
    embodiment: string,
    action: "apply-intent" | "reset",
    error: string,
    activeIntentEmbodiment: string | null = this.activeIntentEmbodiment,
  ): TuningLabAction {
    this.restoreSurfaceState(state);
    try {
      this.getSurface()?.setEmbodiment?.(embodiment);
    } catch {
      // The receipt remains rejected even if the failing route also rejects its
      // rollback; never report a partial experiment as applied.
    }
    this.state = cloneState(state);
    this.embodiment = embodiment;
    this.activeIntentEmbodiment = activeIntentEmbodiment;
    this.lastAction = action;
    this.lastIntentPlan = null;
    this.lastExperiment = {
      before: cloneState(state),
      after: cloneState(state),
      beforeEmbodiment: embodiment,
      afterEmbodiment: embodiment,
      action,
      revision: this.revision,
    };
    this.emit();
    return {
      ok: false,
      state: cloneState(this.state),
      action,
      error,
    };
  }
}
