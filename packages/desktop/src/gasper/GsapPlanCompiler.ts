/**
 * Book 004 AnimationPlan → GSAP timeline (pack v0.2 adapter).
 * Retarget-current: never snap to source anchor first.
 *
 * GASPER-007-G R4: per-channel duration scales + phase offsets for semantic timing.
 * Facial continuum document binding remains separate policy math: plan compiler
 * never steals face geometry authority — flush path may feed VisibleFacialBinding.
 *
 * R4 expression visibility: compileExpressionFacialPlan merges continuum
 * whole-face channels into rigTargets so compiled routes carry real facial
 * deformation (not empty/inert tracks).
 */

import gsap from "./gsap-shim";
import type { DomainScalarMap } from "./GasperDomainState";
import {
  energyChannelDurationScales,
  energyPhaseOffsets,
  resolveEnergyTarget,
  enforceAntiCollapseFloors,
  type AntiCollapseMode,
} from "./continuity/energyGrammar";
import { projectFacialTarget } from "./facial/FacialBodyContinuum";
import {
  WHOLE_FACE_CHANNELS,
  enforceExpressionVisibilityFloors,
} from "../../../shared/src/gasper/facial";

export type AnimationOperatorPlan = {
  id: string;
  weight: number;
  durationSeconds?: number;
  delaySeconds?: number;
  ease?: string;
  targets?: DomainScalarMap;
  /** Per-binding duration multipliers (R4). */
  channelDurationScale?: DomainScalarMap;
};

export type AnimationPlan = {
  id: string;
  sourceStateHash?: string;
  policyPackageHash?: string;
  embodimentId?: string;
  targetAnchorId?: string;
  durationSeconds: number;
  interruptionMode: "retarget-current";
  operators: AnimationOperatorPlan[];
  channelTargets?: DomainScalarMap;
  rigTargets: DomainScalarMap;
  constraints?: unknown[];
  warnings?: string[];
  /** Global ease bias for rigTargets. */
  ease?: string;
  /** Per-binding duration multipliers applied to rigTargets. */
  channelDurationScale?: DomainScalarMap;
  /** Per-binding delay (phase offset) seconds. */
  phaseOffsets?: DomainScalarMap;
};

export type RigProxyStore = {
  proxyFor(bindingId: string): { value: number };
  flush(values: DomainScalarMap): void;
  snapshot(): DomainScalarMap;
};

export class GsapPlanCompiler {
  private activeTimeline: { kill: () => void; progress?: (v?: number) => number } | null =
    null;

  constructor(private readonly proxies: RigProxyStore) {}

  compileAndPlay(plan: AnimationPlan) {
    this.activeTimeline?.kill();
    // Snapshot current values first — retarget-current law
    const from = this.proxies.snapshot();
    for (const bindingId of Object.keys(plan.rigTargets)) {
      // Ensure proxy exists at CURRENT value, never at plan anchor
      const cur = from[bindingId];
      if (cur !== undefined) {
        this.proxies.proxyFor(bindingId).value = cur;
      }
    }

    // Energy grammar: inject duration scales + phase offsets for energy channels
    // when plan targets an anchor with a known energy route.
    const routeHint = plan.targetAnchorId ?? plan.id;
    const energyScales = energyChannelDurationScales(routeHint);
    const energyPhases = energyPhaseOffsets(routeHint);
    const energyTarget = resolveEnergyTarget(routeHint);
    // Ensure energy targets present on rigTargets so level cannot stay flat.
    const rigTargets: DomainScalarMap = { ...plan.rigTargets };
    if (rigTargets.energy_level == null) {
      rigTargets.energy_level = energyTarget.level;
    }
    if (rigTargets.energy_pulse == null) {
      rigTargets.energy_pulse = energyTarget.pulse;
    }
    if (rigTargets.energy_lag == null) {
      rigTargets.energy_lag = energyTarget.lag;
    }
    // Anti-collapse floors on plan endpoints (no zero-scale expression).
    const floored = enforceAntiCollapseFloors(
      rigTargets,
      energyTarget.mode as AntiCollapseMode,
    );
    Object.assign(rigTargets, floored);

    const timeline = gsap.timeline({
      defaults: { overwrite: "auto" },
      onUpdate: () => {
        const snap = this.proxies.snapshot();
        // Continuous anti-collapse on every GSAP tick flush
        this.proxies.flush(
          enforceAntiCollapseFloors(snap, energyTarget.mode as AntiCollapseMode),
        );
      },
    });
    timeline.addLabel(`plan:${plan.id}`, 0);

    const ease = plan.ease ?? energyTarget.envelope.ease ?? "power2.out";
    const scales = {
      ...energyScales,
      ...(plan.channelDurationScale ?? {}),
    };
    const phases = {
      ...energyPhases,
      ...(plan.phaseOffsets ?? {}),
    };

    for (const [bindingId, target] of Object.entries(rigTargets)) {
      const dur = Math.max(
        0.05,
        plan.durationSeconds * (scales[bindingId] ?? 1),
      );
      const delay = phases[bindingId] ?? 0;
      timeline.to(
        this.proxies.proxyFor(bindingId),
        {
          value: target,
          duration: dur,
          ease,
          overwrite: "auto",
        },
        delay,
      );
    }
    for (const operator of plan.operators) {
      if (!operator.targets) continue;
      const opScales = operator.channelDurationScale ?? scales;
      for (const [bindingId, target] of Object.entries(operator.targets)) {
        const baseDur = operator.durationSeconds ?? plan.durationSeconds;
        const dur = Math.max(0.05, baseDur * (opScales[bindingId] ?? 1));
        timeline.to(
          this.proxies.proxyFor(bindingId),
          {
            value: target,
            duration: dur,
            delay: operator.delaySeconds ?? 0,
            ease: operator.ease ?? ease,
            overwrite: "auto",
          },
          0,
        );
      }
    }
    this.activeTimeline = timeline;
    return timeline;
  }

  interrupt(): void {
    this.activeTimeline?.kill();
    this.activeTimeline = null;
  }

  /** Progress of active plan timeline (0–1), if any. */
  progress(): number {
    try {
      return this.activeTimeline?.progress?.() ?? 0;
    } catch {
      return 0;
    }
  }
}

/**
 * Build an AnimationPlan whose rigTargets carry full multi-domain facial
 * deformation for a Presence expression route (not energy/scale-only).
 * Host still owns the GSAP tick; this only supplies compile inputs.
 */
export function compileExpressionFacialPlan(opts: {
  id: string;
  targetId: string;
  durationSeconds?: number;
  expressionGain?: number;
  embodiment?: string;
  ease?: string;
}): AnimationPlan {
  const projected = projectFacialTarget(opts.targetId, {
    embodiment: opts.embodiment ?? "presence",
    expressionGain: opts.expressionGain,
  });
  if (!projected.ok) {
    throw new Error(projected.error ?? `unknown expression target ${opts.targetId}`);
  }
  const floored = enforceExpressionVisibilityFloors(projected.channels, "presence");
  // Explicit whole-face keys first so plan never compiles as empty face track.
  const rigTargets: DomainScalarMap = {};
  for (const ch of WHOLE_FACE_CHANNELS) {
    const v = floored[ch];
    if (typeof v === "number" && Number.isFinite(v)) rigTargets[ch] = v;
  }
  for (const [k, v] of Object.entries(floored)) {
    if (typeof v === "number" && Number.isFinite(v)) rigTargets[k] = v;
  }
  // Anti-collapse on plan endpoints (expression mode).
  const antiCollapsed = enforceAntiCollapseFloors(rigTargets, "expression");
  Object.assign(rigTargets, antiCollapsed);

  return {
    id: opts.id,
    targetAnchorId: projected.id,
    durationSeconds: Math.max(0.08, opts.durationSeconds ?? 0.9),
    interruptionMode: "retarget-current",
    operators: [],
    rigTargets,
    ease: opts.ease ?? "power2.inOut",
    warnings: [],
  };
}

/**
 * Merge two expression facial plans as from→to compile inputs (continuous route).
 * Does not own the frame clock — returns channel endpoints for GSAP retarget.
 */
export function compileExpressionRoutePlan(opts: {
  id: string;
  fromId: string;
  toId: string;
  durationSeconds?: number;
}): {
  plan: AnimationPlan;
  fromChannels: DomainScalarMap;
  toChannels: DomainScalarMap;
  facialKeysPresent: string[];
} {
  const from = projectFacialTarget(opts.fromId);
  const to = projectFacialTarget(opts.toId);
  if (!from.ok) throw new Error(from.error);
  if (!to.ok) throw new Error(to.error);
  const plan = compileExpressionFacialPlan({
    id: opts.id,
    targetId: opts.toId,
    durationSeconds: opts.durationSeconds,
  });
  const facialKeysPresent = WHOLE_FACE_CHANNELS.filter(
    (k) =>
      typeof plan.rigTargets[k] === "number" &&
      Number.isFinite(plan.rigTargets[k]!),
  );
  return {
    plan,
    fromChannels: { ...from.channels },
    toChannels: { ...to.channels },
    facialKeysPresent: [...facialKeysPresent],
  };
}
