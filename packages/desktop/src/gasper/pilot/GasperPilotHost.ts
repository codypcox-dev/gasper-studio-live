/**
 * Thin Studio-side host adapter for the low-frequency piloting kernel.
 *
 * Lives in Gasper desktop/studio domain. Does not open MCP channels,
 * does not drive frames, and does not require AgentBridge for survival.
 * GSAP / living runtime remains animation authority after handoff signals.
 */

import {
  createGasperPilotKernel,
  type GasperPilotKernel,
  type GasperPilotPlan,
  type GasperPilotResult,
  type GasperPilotState,
  type PilotApplyOutcome,
  type PilotValidateOutcome,
  type RecoveryMode,
} from "../../../../shared/src/gasper-pilot";

export type PilotGsapHandoff = {
  planId: string;
  resultId: string;
  intent: GasperPilotPlan["intent"];
  interrupt: GasperPilotPlan["interrupt"];
  frameAuthority: "gsap-native" | "hold";
  reducedMotion: boolean;
};

export type GasperPilotHostOptions = {
  /** Optional listener when apply expects native GSAP retarget. */
  onGsapHandoff?: (handoff: PilotGsapHandoff) => void;
  kernel?: GasperPilotKernel;
};

/**
 * Host facade: get_state / validate_plan / apply_plan / get_result
 * plus bridge presence reporting that never gates survival.
 */
export class GasperPilotHost {
  readonly kernel: GasperPilotKernel;
  private onGsapHandoff?: (handoff: PilotGsapHandoff) => void;

  constructor(opts: GasperPilotHostOptions = {}) {
    this.kernel = opts.kernel ?? createGasperPilotKernel();
    this.onGsapHandoff = opts.onGsapHandoff;
  }

  get_state(): GasperPilotState {
    return this.kernel.get_state();
  }

  validate_plan(plan: unknown): PilotValidateOutcome {
    return this.kernel.validate_plan(plan);
  }

  apply_plan(plan: unknown): PilotApplyOutcome {
    const outcome = this.kernel.apply_plan(plan);
    if (
      outcome.ok &&
      outcome.result.gsapHandoffExpected &&
      this.onGsapHandoff &&
      plan &&
      typeof plan === "object"
    ) {
      const p = plan as GasperPilotPlan;
      this.onGsapHandoff({
        planId: p.planId,
        resultId: outcome.result.resultId,
        intent: p.intent,
        interrupt: p.interrupt,
        frameAuthority: p.frameAuthority,
        reducedMotion: !!p.intent.reducedMotion,
      });
    }
    return outcome;
  }

  get_result(resultIdOrPlanRef: string): GasperPilotResult | null {
    return this.kernel.get_result(resultIdOrPlanRef);
  }

  /** Presence only — never required for kernel life. */
  reportBridgeConnected(connected: boolean): void {
    this.kernel.setBridgeConnected(connected);
  }

  reportHqConnected(connected: boolean): void {
    this.kernel.setHqConnected(connected);
  }

  recoverStandalone(mode?: RecoveryMode): PilotApplyOutcome {
    const outcome = this.kernel.recoverStandalone(mode);
    // Recovery may request GSAP handoff (standalone_resume / return_to_settled).
    if (
      outcome.ok &&
      outcome.result.gsapHandoffExpected &&
      this.onGsapHandoff
    ) {
      this.onGsapHandoff({
        planId: outcome.result.planId,
        resultId: outcome.result.resultId,
        intent: outcome.result.appliedIntent ?? {
          kind: "recover",
          recoveryMode: outcome.result.recoveredVia,
        },
        interrupt: "retarget",
        frameAuthority: outcome.state.frameAuthority,
        reducedMotion: !!outcome.result.appliedIntent?.reducedMotion,
      });
    }
    return outcome;
  }

  /**
   * Living/GSAP transition settled — drain one queued pilot plan.
   * Re-fires onGsapHandoff for the drained apply so living receives the target
   * (kernel notify alone would skip the host handoff path).
   */
  notifyGsapSettled(): GasperPilotResult | null {
    const result = this.kernel.notifyTransitionSettled();
    if (
      result &&
      result.ok &&
      result.gsapHandoffExpected &&
      this.onGsapHandoff
    ) {
      this.onGsapHandoff({
        planId: result.planId,
        resultId: result.resultId,
        intent: result.appliedIntent ?? { kind: "transition_scenario" },
        // Queue drain forces blend retarget-from-current (kernel).
        interrupt: "blend",
        frameAuthority: "gsap-native",
        reducedMotion: !!result.appliedIntent?.reducedMotion,
      });
    }
    return result;
  }
}

export function createGasperPilotHost(
  opts?: GasperPilotHostOptions,
): GasperPilotHost {
  return new GasperPilotHost(opts);
}
