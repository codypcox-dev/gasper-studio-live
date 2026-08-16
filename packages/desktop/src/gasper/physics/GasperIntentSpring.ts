/**
 * GASPER-UNIFIED-INTENT-SPRING-001 — stateful (x, v) intent spring.
 *
 * LAW-10 / STRUCT-5: springs carry (x, v); retarget preserves velocity; the
 * past changes parameters, never the script. Pure step/retarget functions —
 * no clock, timer, DOM, or random source. The host authority owns the state.
 */

import { GASPER_UNIFIED_THEORY_CONSTANTS } from "./GasperUnifiedTheory";

export type IntentSpringState = Readonly<{
  x: number;
  v: number;
  target: number;
  zeta: number;
  omega0: number;
  periodSeconds: number;
}>;

export type IntentSpringBankState = Readonly<{
  x: IntentSpringState;
  y: IntentSpringState;
  theta: IntentSpringState;
}>;

const TAU = Math.PI * 2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createIntentSpring(opts: {
  x?: number;
  v?: number;
  target?: number;
  zeta?: number;
  periodSeconds?: number;
}): IntentSpringState {
  const periodSeconds = Math.max(
    0.2,
    Number.isFinite(opts.periodSeconds ?? 1)
      ? opts.periodSeconds ?? 1
      : 1,
  );
  const zeta = clamp(
    Number.isFinite(opts.zeta ?? 0.65) ? opts.zeta ?? 0.65 : 0.65,
    0.4,
    0.9,
  );
  return Object.freeze({
    x: Number.isFinite(opts.x ?? 0) ? opts.x ?? 0 : 0,
    v: Number.isFinite(opts.v ?? 0) ? opts.v ?? 0 : 0,
    target: Number.isFinite(opts.target ?? 0) ? opts.target ?? 0 : 0,
    zeta,
    omega0: TAU / periodSeconds,
    periodSeconds,
  });
}

/** Semi-implicit Euler step with quadratic drag (fast-then-slow settle). */
export function stepIntentSpring(
  state: IntentSpringState,
  dtSeconds: number,
  opts: { dragCoefficient?: number } = {},
): IntentSpringState {
  const dt = Math.max(1e-4, Math.min(0.25, Number.isFinite(dtSeconds) ? dtSeconds : 1 / 60));
  const drag = clamp(opts.dragCoefficient ?? 0.4, 0, 1);
  const acceleration =
    state.omega0 * state.omega0 * (state.target - state.x) -
    2 * state.zeta * state.omega0 * state.v -
    drag * Math.abs(state.v) * state.v;
  const v = state.v + acceleration * dt;
  const x = state.x + v * dt;
  return Object.freeze({
    x,
    v,
    target: state.target,
    zeta: state.zeta,
    omega0: state.omega0,
    periodSeconds: state.periodSeconds,
  });
}

/** Retarget preserving current velocity (never reset to (target, 0)). */
export function retargetIntentSpring(
  state: IntentSpringState,
  target: number,
  opts: { preserveVelocity?: boolean; velocityScale?: number } = {},
): IntentSpringState {
  const preserve = opts.preserveVelocity !== false;
  const scale = clamp(opts.velocityScale ?? 1, 0, 2);
  return Object.freeze({
    x: state.x,
    v: preserve ? state.v * scale : 0,
    target: Number.isFinite(target) ? target : state.target,
    zeta: state.zeta,
    omega0: state.omega0,
    periodSeconds: state.periodSeconds,
  });
}

export function validateIntentSpring(state: IntentSpringState): string[] {
  const issues: string[] = [];
  if (!Number.isFinite(state.x) || !Number.isFinite(state.v)) {
    issues.push("spring state non-finite");
  }
  if (!Number.isFinite(state.target)) issues.push("spring target non-finite");
  if (state.zeta < 0.5 || state.zeta > 0.8) {
    issues.push(`LAW-1 zeta ${state.zeta} outside [0.5, 0.8]`);
  }
  if (!Number.isFinite(state.omega0) || state.omega0 <= 0) {
    issues.push("LAW-1 omega0 invalid");
  }
  return issues;
}

/** Canonical x/y/theta intent spring bank (periods 1.7 / 2.3 / 3.1 s). */
export class GasperIntentSpringBank {
  private springs: { x: IntentSpringState; y: IntentSpringState; theta: IntentSpringState };

  constructor() {
    const c = GASPER_UNIFIED_THEORY_CONSTANTS;
    this.springs = {
      x: createIntentSpring({ periodSeconds: c.springPeriodsSeconds[0] }),
      y: createIntentSpring({ periodSeconds: c.springPeriodsSeconds[1] }),
      theta: createIntentSpring({ periodSeconds: c.springPeriodsSeconds[2] }),
    };
  }

  step(dtSeconds: number): void {
    this.springs = {
      x: stepIntentSpring(this.springs.x, dtSeconds),
      y: stepIntentSpring(this.springs.y, dtSeconds),
      theta: stepIntentSpring(this.springs.theta, dtSeconds),
    };
  }

  retarget(targets: { x: number; y: number; theta: number }): void {
    this.springs = {
      x: retargetIntentSpring(this.springs.x, targets.x),
      y: retargetIntentSpring(this.springs.y, targets.y),
      theta: retargetIntentSpring(this.springs.theta, targets.theta),
    };
  }

  snapshot(): IntentSpringBankState {
    return Object.freeze({
      x: this.springs.x,
      y: this.springs.y,
      theta: this.springs.theta,
    });
  }
}
