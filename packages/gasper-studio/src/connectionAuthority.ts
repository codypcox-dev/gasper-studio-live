/**
 * Single connection-state authority for Gasper Studio (F000 / ORBIT).
 * UI shell and MCP bridge both publish here; WorldClassStudioShell is the only consumer chrome.
 *
 * Extends product ConnectionState with operational lifecycle + authority identities.
 * Fail closed on missing runtime authority when Operational is claimed.
 */

import type { ConnectionState } from "../../desktop/src/studio/worldclass/adapter/types";
import {
  type AuthorityIdentities,
  type LifecycleState,
  applyDerivedLifecycle,
  authorityIdentitiesSnapshot,
  ensureAuthorityIdentities,
  getAuthorityIdentities,
  getLifecycle,
  setReadiness,
  transitionLifecycle,
} from "./operational";

export type StudioConnectionSnapshot = {
  state: ConnectionState;
  label: string;
  detail: string | null;
  endpointLabel: string | null;
  updatedAt: string;
  /** Bounded offline failure summary (not a console flood). */
  offlineAttempts?: number;
  lastAttemptAt?: string | null;
  nextRetryMs?: number | null;
  /** Application lifecycle (F000). */
  lifecycle?: LifecycleState;
  /** Authority identities when initialized. */
  identities?: AuthorityIdentities | null;
  /** True when bridge + runtime identities are aligned. */
  authorityAligned?: boolean;
};

type Listener = () => void;

const listeners = new Set<Listener>();

let snap: StudioConnectionSnapshot = {
  state: "standalone",
  label: "Standalone",
  detail: "AgentBridge optional — Studio renders offline",
  endpointLabel: null,
  updatedAt: new Date().toISOString(),
  offlineAttempts: 0,
  lastAttemptAt: null,
  nextRetryMs: null,
  lifecycle: "Cold",
  identities: null,
  authorityAligned: false,
};

/** Optional manual reconnect hook registered by the bridge client. */
let reconnectHandler: (() => void) | null = null;

function emit() {
  for (const l of listeners) l();
}

function attachIdentityFields(
  base: Omit<StudioConnectionSnapshot, "identities" | "authorityAligned" | "lifecycle"> &
    Partial<StudioConnectionSnapshot>,
): StudioConnectionSnapshot {
  const idSnap = authorityIdentitiesSnapshot();
  const life = getLifecycle();
  return {
    ...base,
    lifecycle: life.state,
    identities: idSnap.identities,
    authorityAligned: idSnap.aligned,
  };
}

export function getStudioConnection(): StudioConnectionSnapshot {
  return attachIdentityFields({ ...snap });
}

export function subscribeStudioConnection(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function registerReconnectHandler(fn: (() => void) | null): void {
  reconnectHandler = fn;
}

export function requestManualReconnect(): void {
  if (reconnectHandler) {
    reconnectHandler();
    return;
  }
  publishBridgeStatus("connecting (manual reconnect)", snap.endpointLabel);
}

export type BridgePublishMeta = {
  endpoint?: string | null;
  offlineAttempts?: number;
  nextRetryMs?: number | null;
  lastAttemptAt?: string | null;
};

/**
 * Initialize cold-start authority identities + Launching lifecycle.
 * Safe to call once from app boot (also called implicitly by bridge start).
 */
export function bootConnectionAuthority(opts?: {
  buildId?: string;
  processId?: number;
  stageReady?: boolean;
}): AuthorityIdentities {
  const ids = ensureAuthorityIdentities({
    build_id: opts?.buildId,
    process_id: opts?.processId,
  });
  const life = getLifecycle();
  if (life.state === "Cold") {
    try {
      transitionLifecycle("Launching", "boot");
    } catch {
      /* already past Cold */
    }
  }
  if (opts?.stageReady) {
    markStageReady();
  }
  snap = attachIdentityFields({
    ...snap,
    updatedAt: new Date().toISOString(),
  });
  emit();
  return ids;
}

/** Stage mount ready — advances Launching → StageReady when legal. */
export function markStageReady(): void {
  setReadiness({
    stageReady: true,
    runtimeContractReady: true,
  });
  const life = getLifecycle();
  if (life.state === "Cold") {
    try {
      transitionLifecycle("Launching", "boot");
    } catch {
      /* */
    }
  }
  const after = getLifecycle();
  if (after.state === "Launching" || after.state === "Cold") {
    try {
      transitionLifecycle("StageReady", "stage_ready");
    } catch {
      /* illegal — leave as-is */
    }
  }
  snap = attachIdentityFields({ ...snap, updatedAt: new Date().toISOString() });
  emit();
}

/** Document session bound — required for Operational. */
export function markDocumentSessionReady(documentSessionId: string | null): void {
  setReadiness({ documentSessionReady: true });
  if (documentSessionId) {
    ensureAuthorityIdentities({ document_session_id: documentSessionId });
  }
  snap = attachIdentityFields({ ...snap, updatedAt: new Date().toISOString() });
  emit();
}

/**
 * Publish bridge heartbeat / round-trip health into lifecycle readiness.
 * Fail closed: misaligned runtime cannot claim Operational.
 */
export function publishAuthorityHealth(health: {
  bridgeConnected: boolean;
  agentBridgePresent: boolean;
  singleActiveStudioRegistration: boolean;
  heartbeatHealthy: boolean;
  commandRoundTripHealthy: boolean;
  runtimeVisibleAligned: boolean;
}): void {
  const idSnap = authorityIdentitiesSnapshot();
  const aligned = health.runtimeVisibleAligned && idSnap.aligned;
  setReadiness({
    singleActiveStudioRegistration: health.singleActiveStudioRegistration,
    heartbeatHealthy: health.heartbeatHealthy,
    commandRoundTripHealthy: health.commandRoundTripHealthy,
    runtimeVisibleAligned: aligned,
    documentSessionReady:
      getLifecycle().readiness.documentSessionReady || Boolean(idSnap.identities?.document_session_id),
  });

  if (health.bridgeConnected && !aligned) {
    try {
      const life = getLifecycle();
      if (life.state === "Operational" || life.state === "BridgeConnected") {
        transitionLifecycle("Degraded", "runtime_misaligned");
      }
    } catch {
      /* */
    }
  } else {
    applyDerivedLifecycle(
      {
        agentBridgePresent: health.agentBridgePresent,
        bridgeConnected: health.bridgeConnected,
        errorDegraded: !aligned && health.bridgeConnected,
      },
      health.bridgeConnected ? "bridge_connected" : "bridge_probe",
    );
  }

  snap = attachIdentityFields({ ...snap, updatedAt: new Date().toISOString() });
  emit();
}

/** Map bridge client status strings → product connection states. */
export function publishBridgeStatus(
  status: string,
  endpointOrMeta?: string | null | BridgePublishMeta,
): void {
  // Ensure identities exist once any bridge activity is published.
  if (!getAuthorityIdentities()) {
    ensureAuthorityIdentities();
  }

  const meta: BridgePublishMeta =
    endpointOrMeta && typeof endpointOrMeta === "object"
      ? endpointOrMeta
      : { endpoint: (endpointOrMeta as string | null | undefined) ?? null };

  const s = (status || "").toLowerCase();
  let state: ConnectionState = "standalone";
  let label = "Standalone";
  let detail: string | null = status || null;

  if (s.includes("manual") && s.includes("reconnect")) {
    state = "connecting";
    label = "Reconnecting…";
    detail = "Manual reconnect — attempting immediately";
    applyDerivedLifecycle(
      { agentBridgePresent: true, bridgeConnected: false, recovering: true },
      "recover",
    );
  } else if (s.includes("backing") || s.includes("backoff") || s.includes("retry")) {
    state = "disconnected";
    label = "Retrying…";
    detail =
      meta.nextRetryMs != null
        ? `Offline — next attempt in ${Math.round(meta.nextRetryMs / 1000)}s`
        : "Offline — bounded retry scheduled";
    applyDerivedLifecycle(
      { agentBridgePresent: true, bridgeConnected: false },
      "bridge_probe",
    );
  } else if (s.includes("connect") && !s.includes("disconnect") && !s.includes("error")) {
    if (s.includes("ing")) {
      state = "connecting";
      label = "Connecting";
      applyDerivedLifecycle(
        { agentBridgePresent: true, bridgeConnected: false },
        "bridge_probe",
      );
    } else {
      state = "connected";
      label = "Connected";
      detail = "AgentBridge linked — MCP commands available";
      setReadiness({
        singleActiveStudioRegistration: true,
        heartbeatHealthy: true,
        runtimeVisibleAligned: authorityIdentitiesSnapshot().aligned,
      });
      applyDerivedLifecycle(
        { agentBridgePresent: true, bridgeConnected: true },
        "bridge_connected",
      );
    }
  } else if (s.includes("disconnect") || s.includes("offline") || s.includes("unavailable")) {
    state = "disconnected";
    label = "Disconnected";
    detail = "AgentBridge offline — pre-authored clips still play";
    setReadiness({
      singleActiveStudioRegistration: false,
      heartbeatHealthy: false,
      commandRoundTripHealthy: false,
    });
    // Offline AgentBridge is valid standalone when stage is ready.
    applyDerivedLifecycle(
      {
        agentBridgePresent: false,
        bridgeConnected: false,
      },
      "bridge_offline_optional",
    );
  } else if (s.includes("error") || s.includes("fail") || s.includes("non-retry")) {
    state = "error";
    label = "Error";
    applyDerivedLifecycle(
      { agentBridgePresent: true, bridgeConnected: false, errorDegraded: true },
      "error",
    );
  } else if (s.includes("degrad")) {
    state = "degraded";
    label = "Degraded";
    applyDerivedLifecycle(
      { agentBridgePresent: true, bridgeConnected: true, errorDegraded: true },
      "runtime_misaligned",
    );
  } else if (s.includes("standalone") || s.includes("optional")) {
    state = "standalone";
    label = "Standalone";
    detail = "AgentBridge optional — Studio renders offline";
    applyDerivedLifecycle(
      { agentBridgePresent: false, bridgeConnected: false },
      "bridge_offline_optional",
    );
  }

  // Collapse expected offline spam: only emit when state/label/detail meaningfully change
  // or when attempt count is provided (still one UI update, not console flood).
  const nextBase = {
    state,
    label,
    detail,
    endpointLabel: meta.endpoint ?? snap.endpointLabel,
    updatedAt: new Date().toISOString(),
    offlineAttempts: meta.offlineAttempts ?? snap.offlineAttempts,
    lastAttemptAt: meta.lastAttemptAt ?? snap.lastAttemptAt,
    nextRetryMs: meta.nextRetryMs ?? snap.nextRetryMs,
  };
  const next = attachIdentityFields(nextBase);

  const same =
    snap.state === next.state &&
    snap.label === next.label &&
    snap.detail === next.detail &&
    snap.endpointLabel === next.endpointLabel &&
    snap.offlineAttempts === next.offlineAttempts &&
    snap.nextRetryMs === next.nextRetryMs &&
    snap.lifecycle === next.lifecycle &&
    snap.authorityAligned === next.authorityAligned;
  if (same) return;

  snap = next;
  emit();
}

export function publishStandalone(): void {
  publishBridgeStatus("standalone");
}

/**
 * Clean close path: Closing → Closed. Caller still stops the bridge client.
 */
export function publishClosing(): void {
  try {
    const life = getLifecycle();
    if (life.state !== "Closed" && life.state !== "Closing") {
      transitionLifecycle("Closing", "close_request", { force: life.state === "Cold" });
    }
  } catch {
    try {
      transitionLifecycle("Closing", "close_request", { force: true });
    } catch {
      /* */
    }
  }
  try {
    transitionLifecycle("Closed", "closed", { force: getLifecycle().state !== "Closing" });
  } catch {
    try {
      transitionLifecycle("Closed", "closed", { force: true });
    } catch {
      /* */
    }
  }
  snap = attachIdentityFields({
    ...snap,
    state: "disconnected",
    label: "Closed",
    detail: "Studio closed — bridge unregistered",
    updatedAt: new Date().toISOString(),
  });
  emit();
}

/** Fail-closed probe for MCP / tools: refuse if claiming connected without identities. */
export function assertConnectionAuthorityReady(requireConnected = false): void {
  const id = getAuthorityIdentities();
  if (!id) {
    throw new Error("runtime_unavailable: connection authority identities missing");
  }
  if (requireConnected && snap.state !== "connected") {
    throw new Error(`studio_unavailable: connection state is ${snap.state}`);
  }
  const life = getLifecycle();
  if (life.state === "Operational" && !life.readiness.runtimeVisibleAligned) {
    throw new Error(
      "identity_gate_failed: Operational claimed without runtime/visible alignment",
    );
  }
}
