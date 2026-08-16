/**
 * validate_plan — pure structural validation for GasperPilotPlan.
 * Does not apply, does not touch GSAP, does not call MCP.
 */

import { hashPilotPlan } from "./hash.js";
import {
  GASPER_PILOT_SCHEMA,
  INTERRUPT_POLICIES,
  PILOT_FORBIDDEN_FRAME_AUTHORITIES,
  PILOT_INTENT_KINDS,
  RECOVERY_MODES,
  type GasperPilotPlan,
  type GasperPilotState,
  type PilotErrorCode,
  type PilotValidateOutcome,
  type PilotValidationIssue,
} from "./types.js";

function isFinite01(n: number): boolean {
  return Number.isFinite(n) && n >= -1 && n <= 2;
}

function issue(
  code: PilotErrorCode | string,
  message: string,
  path?: string,
  severity: PilotValidationIssue["severity"] = "error",
): PilotValidationIssue {
  return { code, message, path, severity };
}

export type ValidatePlanContext = {
  state: GasperPilotState;
  /** When true, kernel is closed and rejects all applies (validate still reports). */
  kernelOpen?: boolean;
  /**
   * When true, skip expectedRevision conflict checks.
   * apply_plan uses this so idempotent replay can short-circuit before revision.
   * Public validate_plan keeps revision checks (default false).
   */
  skipRevisionCheck?: boolean;
};

/**
 * Validate a pilot plan against current state and hard product boundaries.
 */
export function validatePlan(
  plan: unknown,
  ctx: ValidatePlanContext,
): PilotValidateOutcome {
  const issues: PilotValidationIssue[] = [];

  if (!plan || typeof plan !== "object") {
    return {
      ok: false,
      planContentHash: null,
      error: "INVALID_PLAN",
      detail: "Plan must be a non-null object",
      issues: [issue("INVALID_PLAN", "Plan must be a non-null object")],
    };
  }

  const p = plan as Partial<GasperPilotPlan>;

  if (p.schema !== GASPER_PILOT_SCHEMA) {
    issues.push(
      issue(
        "INVALID_PLAN",
        `schema must be ${GASPER_PILOT_SCHEMA}`,
        "schema",
      ),
    );
  }
  if (typeof p.planId !== "string" || p.planId.length < 1) {
    issues.push(issue("INVALID_PLAN", "planId required", "planId"));
  }
  if (typeof p.idempotencyKey !== "string" || p.idempotencyKey.length < 1) {
    issues.push(
      issue("INVALID_PLAN", "idempotencyKey required", "idempotencyKey"),
    );
  }
  if (!p.intent || typeof p.intent !== "object") {
    issues.push(issue("INVALID_PLAN", "intent required", "intent"));
  } else if (
    !PILOT_INTENT_KINDS.includes(p.intent.kind as (typeof PILOT_INTENT_KINDS)[number])
  ) {
    issues.push(
      issue(
        "UNKNOWN_INTENT",
        `unknown intent.kind: ${String((p.intent as { kind?: string }).kind)}`,
        "intent.kind",
      ),
    );
  }

  if (
    !p.interrupt ||
    !INTERRUPT_POLICIES.includes(p.interrupt as (typeof INTERRUPT_POLICIES)[number])
  ) {
    issues.push(
      issue(
        "INVALID_PLAN",
        `interrupt must be one of ${INTERRUPT_POLICIES.join("|")}`,
        "interrupt",
      ),
    );
  }

  if (p.animationHandoff !== "gsap-native") {
    issues.push(
      issue(
        "UNSAFE_FRAME_AUTHORITY",
        "animationHandoff must be gsap-native",
        "animationHandoff",
      ),
    );
  }

  if (p.frameAuthority !== "gsap-native" && p.frameAuthority !== "hold") {
    issues.push(
      issue(
        "UNSAFE_FRAME_AUTHORITY",
        "frameAuthority must be gsap-native or hold",
        "frameAuthority",
      ),
    );
  }

  // Explicit reject of forbidden frame authorities if smuggled as any string field.
  const rawAuthority = String(
    (p as { frameAuthority?: string }).frameAuthority ?? "",
  ).toLowerCase();
  if (
    (PILOT_FORBIDDEN_FRAME_AUTHORITIES as readonly string[]).includes(rawAuthority)
  ) {
    issues.push(
      issue(
        "MCP_FRAME_FORBIDDEN",
        `frameAuthority '${rawAuthority}' is forbidden (no MCP/CDP frame driving)`,
        "frameAuthority",
      ),
    );
  }

  if (p.intent && typeof p.intent === "object") {
    const intent = p.intent;
    if (intent.kind === "recover") {
      if (
        intent.recoveryMode &&
        !RECOVERY_MODES.includes(
          intent.recoveryMode as (typeof RECOVERY_MODES)[number],
        )
      ) {
        issues.push(
          issue(
            "INVALID_PLAN",
            `unknown recoveryMode: ${String(intent.recoveryMode)}`,
            "intent.recoveryMode",
          ),
        );
      }
    }
    if (intent.channelHints && typeof intent.channelHints === "object") {
      const protectedSet = new Set(p.constraints?.protectedChannels ?? []);
      for (const [ch, val] of Object.entries(intent.channelHints)) {
        if (typeof val !== "number" || !isFinite01(val)) {
          issues.push(
            issue(
              "CHANNEL_HINT_OUT_OF_RANGE",
              `channel hint ${ch}=${String(val)} not finite in [-1,2]`,
              `intent.channelHints.${ch}`,
            ),
          );
        }
        if (protectedSet.has(ch)) {
          issues.push(
            issue(
              "CONSTRAINT_VIOLATION",
              `channel ${ch} is protected`,
              `intent.channelHints.${ch}`,
            ),
          );
        }
      }
    }
  }

  // Topology lock: plan must not claim unlocked topology when state is locked.
  if (
    ctx.state.topology.locked &&
    p.constraints?.topologyLock === false
  ) {
    issues.push(
      issue(
        "TOPOLOGY_LOCK_VIOLATION",
        "cannot unlock topology while architecture lock is active",
        "constraints.topologyLock",
      ),
    );
  }

  // Constraints default: forbid MCP frames.
  if (p.constraints && p.constraints.forbidMcpFrames === false as unknown) {
    issues.push(
      issue(
        "MCP_FRAME_FORBIDDEN",
        "forbidMcpFrames cannot be disabled",
        "constraints.forbidMcpFrames",
      ),
    );
  }

  // Revision conflict is a validation failure for apply path when expectedRevision set.
  // apply_plan may skip this so matching idempotency keys can replay with a stale revision.
  if (
    !ctx.skipRevisionCheck &&
    typeof p.expectedRevision === "number" &&
    p.expectedRevision !== ctx.state.revision
  ) {
    issues.push(
      issue(
        "REVISION_CONFLICT",
        `expectedRevision ${p.expectedRevision} != current ${ctx.state.revision}`,
        "expectedRevision",
      ),
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  const firstError = errors[0];
  if (firstError) {
    const primary = (firstError.code as PilotErrorCode) || "INVALID_PLAN";
    return {
      ok: false,
      planContentHash:
        p.schema === GASPER_PILOT_SCHEMA &&
        typeof p.planId === "string" &&
        typeof p.idempotencyKey === "string" &&
        p.intent &&
        p.interrupt &&
        p.animationHandoff === "gsap-native" &&
        (p.frameAuthority === "gsap-native" || p.frameAuthority === "hold")
          ? hashPilotPlan(p as GasperPilotPlan)
          : null,
      error: primary,
      detail: firstError.message,
      issues,
    };
  }

  const typed = p as GasperPilotPlan;
  return {
    ok: true,
    planContentHash: hashPilotPlan(typed),
    issues,
  };
}
