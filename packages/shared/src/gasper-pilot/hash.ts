/**
 * Deterministic content hashes for pilot plans and state.
 * Pure JS (no node:crypto) so Studio browser/Tauri bundles stay free of Node APIs.
 * Volatile fields (timestamps, result ids) are excluded from state content hash.
 */

import type { GasperPilotPlan, GasperPilotState } from "./types.js";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/**
 * FNV-1a 64-bit → 16-char hex. Sufficient for idempotency identity in-process.
 * Not a cryptographic hash; pilot plans are trusted local low-frequency intents.
 */
export function contentHashHex(input: string): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < input.length; i++) {
    h ^= BigInt(input.charCodeAt(i));
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}

/** @deprecated alias kept for call-site clarity */
export function sha256Hex(input: string): string {
  return contentHashHex(input);
}

/** Canonical plan content hash — identity for idempotency matching. */
export function hashPilotPlan(plan: GasperPilotPlan): string {
  const basis = {
    schema: plan.schema,
    planId: plan.planId,
    intent: plan.intent,
    interrupt: plan.interrupt,
    constraints: plan.constraints ?? null,
    animationHandoff: plan.animationHandoff,
    frameAuthority: plan.frameAuthority,
    provenance: plan.provenance
      ? { source: plan.provenance.source, frequency: plan.provenance.frequency }
      : null,
  };
  return contentHashHex(stableStringify(basis));
}

/** State content hash excluding volatile clocks and ids that churn. */
export function hashPilotState(
  state: Omit<GasperPilotState, "contentHash" | "updatedAtMs">,
): string {
  const basis = {
    schema: state.schema,
    kernelVersion: state.kernelVersion,
    revision: state.revision,
    operationalMode: state.operationalMode,
    bridgeRequiredForSurvival: state.bridgeRequiredForSurvival,
    bridgeConnected: state.bridgeConnected,
    hqConnected: state.hqConnected,
    embodiment: state.embodiment,
    cognitiveMode: state.cognitiveMode,
    scenarioId: state.scenarioId,
    expressionFixtureId: state.expressionFixtureId,
    playback: state.playback,
    activePlanId: state.activePlanId,
    lastPlanId: state.lastPlanId,
    interruptPolicy: state.interruptPolicy,
    topology: state.topology,
    eyeMouthCoherence: state.eyeMouthCoherence,
    reducedMotion: state.reducedMotion,
    frameAuthority: state.frameAuthority,
    gsapAuthority: state.gsapAuthority,
    mcpFrameDriving: state.mcpFrameDriving,
    queueDepth: state.queueDepth,
  };
  return contentHashHex(stableStringify(basis));
}
