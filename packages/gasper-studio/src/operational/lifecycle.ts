/**
 * Gasper Studio application lifecycle state machine (F000 / ORBIT).
 *
 * Cold → Launching → StageReady → BridgeDiscovering → BridgeConnected
 *   → Operational | StandaloneOperational | Degraded
 *   → Recovering → Closing → Closed
 *
 * Transitions are explicit and testable. "Operational" is fail-closed:
 * stage ready, document session ready, single active bridge registration,
 * heartbeat healthy, command round-trip healthy, runtime/visible aligned.
 */

export type LifecycleState =
  | "Cold"
  | "Launching"
  | "StageReady"
  | "BridgeDiscovering"
  | "BridgeConnected"
  | "Operational"
  | "StandaloneOperational"
  | "Degraded"
  | "Recovering"
  | "Closing"
  | "Closed";

export type LifecycleTransitionReason =
  | "boot"
  | "stage_ready"
  | "bridge_probe"
  | "bridge_connected"
  | "bridge_offline_optional"
  | "heartbeat_ok"
  | "heartbeat_lost"
  | "command_roundtrip_ok"
  | "command_roundtrip_fail"
  | "runtime_misaligned"
  | "duplicate_registration"
  | "authority_missing"
  | "recover"
  | "close_request"
  | "closed"
  | "manual"
  | "error";

export type OperationalReadiness = {
  stageReady: boolean;
  runtimeContractReady: boolean;
  documentSessionReady: boolean;
  singleActiveStudioRegistration: boolean;
  heartbeatHealthy: boolean;
  commandRoundTripHealthy: boolean;
  runtimeVisibleAligned: boolean;
};

export type LifecycleSnapshot = {
  state: LifecycleState;
  previous: LifecycleState | null;
  updatedAt: string;
  reason: LifecycleTransitionReason | null;
  readiness: OperationalReadiness;
  history: Array<{
    from: LifecycleState;
    to: LifecycleState;
    reason: LifecycleTransitionReason;
    at: string;
  }>;
};

const ALLOWED: Record<LifecycleState, LifecycleState[]> = {
  Cold: ["Launching", "Closed"],
  Launching: ["StageReady", "Degraded", "Closing", "Closed"],
  StageReady: [
    "BridgeDiscovering",
    "StandaloneOperational",
    "Degraded",
    "Closing",
  ],
  BridgeDiscovering: [
    "BridgeConnected",
    "StandaloneOperational",
    "Degraded",
    "Recovering",
    "Closing",
  ],
  BridgeConnected: [
    "Operational",
    "Degraded",
    "Recovering",
    "BridgeDiscovering",
    "Closing",
  ],
  Operational: ["Degraded", "Recovering", "Closing", "BridgeConnected"],
  StandaloneOperational: [
    "BridgeDiscovering",
    "BridgeConnected",
    "Operational",
    "Degraded",
    "Closing",
  ],
  Degraded: [
    "Recovering",
    "BridgeDiscovering",
    "StandaloneOperational",
    "Operational",
    "Closing",
  ],
  Recovering: [
    "BridgeDiscovering",
    "BridgeConnected",
    "Operational",
    "StandaloneOperational",
    "Degraded",
    "Closing",
  ],
  Closing: ["Closed"],
  Closed: [],
};

const emptyReadiness = (): OperationalReadiness => ({
  stageReady: false,
  runtimeContractReady: false,
  documentSessionReady: false,
  singleActiveStudioRegistration: false,
  heartbeatHealthy: false,
  commandRoundTripHealthy: false,
  runtimeVisibleAligned: false,
});

type Listener = () => void;

let snap: LifecycleSnapshot = {
  state: "Cold",
  previous: null,
  updatedAt: new Date(0).toISOString(),
  reason: null,
  readiness: emptyReadiness(),
  history: [],
};

const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export function getLifecycle(): LifecycleSnapshot {
  return {
    ...snap,
    readiness: { ...snap.readiness },
    history: snap.history.map((h) => ({ ...h })),
  };
}

export function subscribeLifecycle(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function canTransition(from: LifecycleState, to: LifecycleState): boolean {
  return ALLOWED[from].includes(to);
}

export function isOperationalReady(r: OperationalReadiness): boolean {
  return (
    r.stageReady &&
    r.runtimeContractReady &&
    r.documentSessionReady &&
    r.singleActiveStudioRegistration &&
    r.heartbeatHealthy &&
    r.commandRoundTripHealthy &&
    r.runtimeVisibleAligned
  );
}

export function setReadiness(partial: Partial<OperationalReadiness>): OperationalReadiness {
  snap = {
    ...snap,
    readiness: { ...snap.readiness, ...partial },
    updatedAt: new Date().toISOString(),
  };
  emit();
  return { ...snap.readiness };
}

/**
 * Attempt an explicit transition. Illegal transitions throw (fail closed)
 * unless force is set for test recovery only.
 */
export function transitionLifecycle(
  to: LifecycleState,
  reason: LifecycleTransitionReason,
  opts?: { force?: boolean },
): LifecycleSnapshot {
  const from = snap.state;
  if (from === to) {
    snap = {
      ...snap,
      reason,
      updatedAt: new Date().toISOString(),
    };
    emit();
    return getLifecycle();
  }
  if (!opts?.force && !canTransition(from, to)) {
    throw new Error(
      `lifecycle_invalid_transition: ${from} → ${to} (reason=${reason})`,
    );
  }
  // Fail closed: cannot enter Operational without full readiness.
  if (to === "Operational" && !isOperationalReady(snap.readiness)) {
    throw new Error(
      "lifecycle_invalid_transition: Operational requires full readiness (fail closed)",
    );
  }
  const entry = {
    from,
    to,
    reason,
    at: new Date().toISOString(),
  };
  snap = {
    state: to,
    previous: from,
    updatedAt: entry.at,
    reason,
    readiness: { ...snap.readiness },
    history: [...snap.history, entry].slice(-64),
  };
  emit();
  return getLifecycle();
}

/**
 * Derive the best next lifecycle state from readiness + bridge presence.
 * Does not invent Operational without meeting all gates.
 */
export function deriveLifecycleTarget(input: {
  agentBridgePresent: boolean;
  bridgeConnected: boolean;
  closing?: boolean;
  closed?: boolean;
  recovering?: boolean;
  errorDegraded?: boolean;
}): LifecycleState {
  if (input.closed) return "Closed";
  if (input.closing) return "Closing";
  if (snap.state === "Cold") return "Launching";
  if (input.recovering) return "Recovering";
  if (input.errorDegraded) return "Degraded";

  const r = snap.readiness;
  if (!r.stageReady) {
    if (snap.state === "Launching") return "Launching";
    return snap.state === "Closed" ? "Closed" : "Launching";
  }

  if (!input.agentBridgePresent) {
    // Stage ready, AgentBridge intentionally absent → StandaloneOperational
    if (r.documentSessionReady || r.runtimeContractReady) {
      return "StandaloneOperational";
    }
    return "StageReady";
  }

  if (!input.bridgeConnected) return "BridgeDiscovering";
  if (isOperationalReady(r)) return "Operational";
  return "BridgeConnected";
}

/**
 * Apply derived target if transition is legal; otherwise stay put.
 * Returns whether a transition occurred.
 */
export function applyDerivedLifecycle(
  input: Parameters<typeof deriveLifecycleTarget>[0],
  reason: LifecycleTransitionReason,
): { changed: boolean; snapshot: LifecycleSnapshot } {
  const target = deriveLifecycleTarget(input);
  if (target === snap.state) {
    return { changed: false, snapshot: getLifecycle() };
  }
  if (!canTransition(snap.state, target)) {
    return { changed: false, snapshot: getLifecycle() };
  }
  try {
    transitionLifecycle(target, reason);
    return { changed: true, snapshot: getLifecycle() };
  } catch {
    return { changed: false, snapshot: getLifecycle() };
  }
}

export function resetLifecycleForTests(): void {
  snap = {
    state: "Cold",
    previous: null,
    updatedAt: new Date(0).toISOString(),
    reason: null,
    readiness: emptyReadiness(),
    history: [],
  };
}

export function lifecycleAllowedMap(): Record<LifecycleState, LifecycleState[]> {
  return Object.fromEntries(
    Object.entries(ALLOWED).map(([k, v]) => [k, [...v]]),
  ) as Record<LifecycleState, LifecycleState[]>;
}
