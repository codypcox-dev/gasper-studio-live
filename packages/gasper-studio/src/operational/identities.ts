/**
 * Single-authority identity model for Gasper Studio operational launch (F000 / ORBIT).
 *
 * One packaged Studio window maps to:
 *   one application_instance_id
 *   one studio_bridge_instance_id (bridge registration)
 *   one runtime_instance_id (visible stage / command target)
 *   one document_session_id (active document session, or null before ready)
 *   one process_id (OS or shell-stable numeric id)
 *   one build_id (frontend/native build stamp)
 *
 * Stale browser/CDP hosts must never outrank packaged Studio.
 *
 * GASPER-007 DOPS-01A:
 * Packaged Tauri shell injects globalThis.__GASPER_PROCESS_ID__ and
 * globalThis.__GASPER_BUILD_ID__ before bridge registration.
 */

export type AuthorityIdentities = {
  application_instance_id: string;
  studio_bridge_instance_id: string;
  runtime_instance_id: string;
  document_session_id: string | null;
  process_id: number;
  build_id: string;
};

export type IdentitySource =
  | "cold-start"
  | "bridge-register"
  | "document-session"
  | "runtime-bind"
  | "manual-reset";

const BUILD_ID_FALLBACK_BROWSER = "gasper-browser-dev-fallback";
/** @deprecated never register packaged Studio with this value */
const BUILD_ID_UNKNOWN = "gasper-fe-unknown";

function newUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readMetaBuildId(): string | null {
  try {
    if (typeof document === "undefined") return null;
    const meta = document.querySelector('meta[name="gasper-frontend-build"]');
    const fromMeta = meta?.getAttribute("content")?.trim();
    if (fromMeta) return fromMeta;
    const fromAttr =
      document.documentElement?.getAttribute("data-frontend-build")?.trim() ||
      document.body?.getAttribute("data-frontend-build")?.trim();
    if (fromAttr) return fromAttr;
  } catch {
    /* */
  }
  return null;
}

function readEnvBuildId(): string | null {
  try {
    const env = (import.meta as unknown as { env?: { VITE_GASPER_FRONTEND_BUILD?: string } }).env
      ?.VITE_GASPER_FRONTEND_BUILD;
    if (typeof env === "string" && env.trim()) return env.trim();
  } catch {
    /* */
  }
  return null;
}

export function isPackagedShell(): boolean {
  const g = globalThis as unknown as {
    __GASPER_PACKAGED__?: boolean;
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };
  if (g.__GASPER_PACKAGED__ === true) return true;
  if (g.__TAURI__ || g.__TAURI_INTERNALS__) return true;
  return false;
}

/**
 * Optional AgentBridge is a packaged capability, not a browser-preview
 * dependency. Browser/CDP previews may opt in explicitly for bridge testing;
 * otherwise they remain genuinely standalone and do not generate failed
 * loopback-resource events while probing an absent bridge.
 */
export function shouldAutoStartAgentBridge(): boolean {
  const g = globalThis as unknown as {
    __GASPER_AGENT_BRIDGE_AUTOSTART__?: unknown;
  };
  if (typeof g.__GASPER_AGENT_BRIDGE_AUTOSTART__ === "boolean") {
    return g.__GASPER_AGENT_BRIDGE_AUTOSTART__;
  }
  return isPackagedShell();
}

/**
 * Numeric process id for protocol hello (StudioHello.processId: number).
 * Prefer real OS pid injected by the Tauri shell; never invent a free-form string.
 * Packaged mode must not use Date.now fallback.
 */
export function resolveNumericProcessId(): number {
  const g = globalThis as unknown as {
    __GASPER_PROCESS_ID__?: number | string;
    process?: { pid?: number };
  };
  const injected = g.__GASPER_PROCESS_ID__;
  if (typeof injected === "number" && Number.isFinite(injected) && injected > 0) {
    return Math.floor(injected);
  }
  if (typeof injected === "string" && /^\d+$/.test(injected)) {
    const n = Number(injected);
    if (n > 0) return n;
  }
  if (typeof g.process?.pid === "number" && g.process.pid > 0) {
    return g.process.pid;
  }
  if (isPackagedShell()) {
    // Fail loud in packaged mode — native injection is required (DOPS-01A).
    throw new Error(
      "identity_gate_failed: packaged shell missing globalThis.__GASPER_PROCESS_ID__ (real OS PID required)",
    );
  }
  // Explicit non-packaged / browser fallback — not an OS handle.
  // Labeled via build_id gasper-browser-dev-*; process_id is session-scoped only.
  return (Date.now() % 2_000_000_000) + 1;
}

export function resolveBuildId(): string {
  const g = globalThis as unknown as {
    __GASPER_BUILD_ID__?: string;
    __GASPER_BUILD_IDENTITY__?: { buildId?: string };
  };
  if (typeof g.__GASPER_BUILD_ID__ === "string" && g.__GASPER_BUILD_ID__.trim()) {
    const id = g.__GASPER_BUILD_ID__.trim();
    if (id !== BUILD_ID_UNKNOWN) return id;
  }
  if (g.__GASPER_BUILD_IDENTITY__?.buildId) {
    const id = String(g.__GASPER_BUILD_IDENTITY__.buildId).trim();
    if (id && id !== BUILD_ID_UNKNOWN) return id;
  }
  const meta = readMetaBuildId();
  if (meta && meta !== BUILD_ID_UNKNOWN) return meta;
  const envId = readEnvBuildId();
  if (envId && envId !== BUILD_ID_UNKNOWN) return envId;

  if (isPackagedShell()) {
    throw new Error(
      "identity_gate_failed: packaged shell missing globalThis.__GASPER_BUILD_ID__ (must not register as gasper-fe-unknown)",
    );
  }
  return BUILD_ID_FALLBACK_BROWSER;
}

/**
 * Populate globals from DOM/meta and optional Tauri invoke before bridge registration.
 * Safe to call multiple times; does not invent packaged PID/build.
 */
export async function bootstrapPackagedIdentity(): Promise<{
  process_id: number;
  build_id: string;
  packaged: boolean;
}> {
  // Lift meta/env into globals early so resolveBuildId sees them.
  const meta = readMetaBuildId() || readEnvBuildId();
  const g = globalThis as unknown as {
    __GASPER_BUILD_ID__?: string;
    __GASPER_PROCESS_ID__?: number;
    __GASPER_PACKAGED__?: boolean;
    __TAURI__?: { core?: { invoke?: (cmd: string) => Promise<unknown> } };
    __TAURI_INTERNALS__?: unknown;
  };
  if (meta && !g.__GASPER_BUILD_ID__) {
    g.__GASPER_BUILD_ID__ = meta;
  }

  // Prefer native command when Tauri is present (authoritative PID + embedded build).
  try {
    const invoke =
      g.__TAURI__?.core?.invoke ||
      (g as { __TAURI_INTERNALS__?: { invoke?: (c: string) => Promise<unknown> } })
        .__TAURI_INTERNALS__?.invoke;
    if (typeof invoke === "function") {
      const id = (await invoke("gasper_runtime_identity")) as {
        process_id?: number;
        build_id?: string;
        packaged?: boolean;
      };
      if (typeof id?.process_id === "number" && id.process_id > 0) {
        g.__GASPER_PROCESS_ID__ = Math.floor(id.process_id);
      }
      if (typeof id?.build_id === "string" && id.build_id.trim() && id.build_id !== BUILD_ID_UNKNOWN) {
        g.__GASPER_BUILD_ID__ = id.build_id.trim();
      }
      g.__GASPER_PACKAGED__ = true;
    }
  } catch {
    /* browser / non-tauri */
  }

  // Reset singleton so cold start re-reads injected values.
  identities = null;
  const resolved = ensureAuthorityIdentities();
  return {
    process_id: resolved.process_id,
    build_id: resolved.build_id,
    packaged: isPackagedShell(),
  };
}

let identities: AuthorityIdentities | null = null;

/**
 * Create or return the singleton authority identity set for this app process.
 * Cold start assigns all ids; document_session_id remains null until document ready.
 */
export function ensureAuthorityIdentities(
  partial?: Partial<AuthorityIdentities>,
): AuthorityIdentities {
  if (!identities) {
    const application = partial?.application_instance_id ?? newUuid();
    // Bridge and runtime share the application instance on cold packaged launch
    // so visible stage and command target cannot drift to another host.
    const bridge = partial?.studio_bridge_instance_id ?? application;
    const runtime = partial?.runtime_instance_id ?? application;
    const process_id = partial?.process_id ?? resolveNumericProcessId();
    const build_id = partial?.build_id ?? resolveBuildId();
    if (build_id === BUILD_ID_UNKNOWN) {
      throw new Error("identity_gate_failed: refusing to register with build_id gasper-fe-unknown");
    }
    identities = {
      application_instance_id: application,
      studio_bridge_instance_id: bridge,
      runtime_instance_id: runtime,
      document_session_id: partial?.document_session_id ?? null,
      process_id,
      build_id,
    };
    return { ...identities };
  }
  if (partial) {
    identities = {
      ...identities,
      ...partial,
      // Never allow empty application / bridge ids after first assignment.
      application_instance_id:
        partial.application_instance_id || identities.application_instance_id,
      studio_bridge_instance_id:
        partial.studio_bridge_instance_id || identities.studio_bridge_instance_id,
      runtime_instance_id:
        partial.runtime_instance_id || identities.runtime_instance_id,
      build_id:
        partial.build_id && partial.build_id !== BUILD_ID_UNKNOWN
          ? partial.build_id
          : identities.build_id,
      process_id: partial.process_id && partial.process_id > 0 ? partial.process_id : identities.process_id,
    };
  }
  return { ...identities };
}

export function getAuthorityIdentities(): AuthorityIdentities | null {
  return identities ? { ...identities } : null;
}

/**
 * Fail closed: callers that require runtime authority must not invent a silent fallback.
 */
export function requireAuthorityIdentities(): AuthorityIdentities {
  const id = getAuthorityIdentities();
  if (!id) {
    throw new Error(
      "runtime_unavailable: authority identities not initialized (fail closed)",
    );
  }
  if (!id.application_instance_id || !id.studio_bridge_instance_id) {
    throw new Error(
      "runtime_unavailable: application or studio bridge identity missing (fail closed)",
    );
  }
  if (!id.build_id || id.build_id === BUILD_ID_UNKNOWN) {
    throw new Error("runtime_unavailable: build_id missing or gasper-fe-unknown");
  }
  if (!id.process_id || id.process_id <= 0) {
    throw new Error("runtime_unavailable: process_id missing");
  }
  return id;
}

export function bindRuntimeInstance(runtimeInstanceId: string): AuthorityIdentities {
  if (!runtimeInstanceId) {
    throw new Error("identity_gate_failed: runtime_instance_id required");
  }
  return ensureAuthorityIdentities({ runtime_instance_id: runtimeInstanceId });
}

export function bindDocumentSession(documentSessionId: string | null): AuthorityIdentities {
  return ensureAuthorityIdentities({ document_session_id: documentSessionId });
}

/**
 * Assert that bridge registration target matches the visible runtime authority.
 * Prevents silent command dispatch to a wrong Studio instance.
 */
export function assertBridgeRuntimeAligned(bridgeInstanceId: string): void {
  const id = requireAuthorityIdentities();
  if (bridgeInstanceId !== id.studio_bridge_instance_id) {
    throw new Error(
      `identity_gate_failed: bridge instance ${bridgeInstanceId} != studio_bridge_instance_id ${id.studio_bridge_instance_id}`,
    );
  }
  if (id.runtime_instance_id !== id.studio_bridge_instance_id) {
    throw new Error(
      `identity_gate_failed: runtime_instance_id ${id.runtime_instance_id} != studio_bridge_instance_id ${id.studio_bridge_instance_id}`,
    );
  }
}

/** Test / cold relaunch helper — clears singleton. */
export function resetAuthorityIdentitiesForTests(): void {
  identities = null;
}

export function authorityIdentitiesSnapshot(): {
  identities: AuthorityIdentities | null;
  aligned: boolean;
  missing: string[];
} {
  const id = getAuthorityIdentities();
  if (!id) {
    return {
      identities: null,
      aligned: false,
      missing: [
        "application_instance_id",
        "studio_bridge_instance_id",
        "runtime_instance_id",
        "process_id",
        "build_id",
      ],
    };
  }
  const missing: string[] = [];
  if (!id.application_instance_id) missing.push("application_instance_id");
  if (!id.studio_bridge_instance_id) missing.push("studio_bridge_instance_id");
  if (!id.runtime_instance_id) missing.push("runtime_instance_id");
  if (!id.process_id) missing.push("process_id");
  if (!id.build_id || id.build_id === BUILD_ID_UNKNOWN) missing.push("build_id");
  const aligned =
    missing.length === 0 &&
    id.studio_bridge_instance_id === id.runtime_instance_id &&
    id.application_instance_id === id.studio_bridge_instance_id;
  return { identities: id, aligned, missing };
}
