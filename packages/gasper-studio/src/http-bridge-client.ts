/**
 * Outbound HTTP long-poll Studio bridge client (production path).
 * Connects only when AgentBridge is available.
 * Single-flight, exponential backoff with jitter, quiet expected-offline handling.
 *
 * F000 / ORBIT:
 * - one in-flight connection loop (generation + loopRunning)
 * - one heartbeat loop
 * - explicit unregister on clean close
 * - reconnect does not create duplicate loops
 * - authority identities on register; document metadata from session
 * - no stale command replay (live poll only)
 */

import {
  STUDIO_PROTOCOL_VERSION,
  STUDIO_APPLICATION_ID,
  type StudioHello,
  type AgentBridgeHello,
  type CommandRequest,
  type CommandResult,
} from "../../studio-protocol/src";
import { getLocalStudioBroker } from "../../studio-protocol/src";
import { getAnimationCommandSession } from "../../shared/src/gasper-animation";
import { mergeAnimationHost } from "../../desktop/src/gasper/GasperAnimationCommands";
import {
  assertBridgeRuntimeAligned,
  ensureAuthorityIdentities,
  getAuthorityIdentities,
  requireAuthorityIdentities,
} from "./operational";

/** Default control-plane ports (primary install + overflow when 19528 held). */
const BASE_CANDIDATES = ["http://127.0.0.1:19528", "http://127.0.0.1:19529"] as const;
const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000, 16000, 30000] as const;
const MAX_BACKOFF_MS = 30_000;
const HEARTBEAT_MS = 8_000;

// Projection sync policy lives in projectionAuthority (single owner).
export {
  commandRequiresEditorProjectionSync,
  PROJECTION_AFFECTING_COMMANDS,
} from "./projectionAuthority";
import {
  applyBridgeCommandProjectionSync,
  recordProjectionReceipt,
} from "./projectionAuthority";

/**
 * Document schema versions advertised to the bridge.
 * 1.1.0 is production today; 1.2.0 is prepared for FORGE integration (F000 readiness).
 */
export const STUDIO_SUPPORTED_DOCUMENT_VERSIONS = ["1.1.0", "1.2.0"] as const;

type DaisController = {
  registry?: { get: (id: string) => { commit?: (v: number) => void } | undefined };
  committed?: Record<string, number>;
  mixer?: {
    setForm: (p: Record<string, number>) => void;
    setFormValue?: (id: string, v: number) => void;
    flush?: () => void;
  };
  living?: { applyExternalPose?: (p: Record<string, number>) => void };
  tracks?: { applyValues?: (p: Record<string, number>) => void };
  emitFrame?: () => void;
  emit?: () => void;
  readLive?: () => Record<string, number>;
  mount?: { legacyFormMaster?: boolean };
  applyExternalPose?: (pose: Record<string, number>) => void;
};

function getDais(): DaisController | null {
  return (
    (globalThis as unknown as { __GASPER_DAIS__?: DaisController }).__GASPER_DAIS__ ??
    null
  );
}

function ensureDaisHostBound() {
  const c = getDais();
  if (!c) return;
  mergeAnimationHost({
    applyPose: (pose) => {
      if (typeof c.applyExternalPose === "function") {
        c.applyExternalPose(pose);
        return;
      }
      for (const [id, value] of Object.entries(pose)) {
        if (typeof value !== "number" || !Number.isFinite(value)) continue;
        if (c.committed) c.committed[id] = value;
        const b = c.registry?.get?.(id);
        if (b?.commit) b.commit(value);
        else if (!c.mount?.legacyFormMaster) c.mixer?.setFormValue?.(id, value);
      }
      const g = globalThis as unknown as {
        SidekickFormMasterRig?: {
          applySemanticPose?: (p: Record<string, number>) => void;
          requestOneFrame?: () => void;
          setPaused?: (v: boolean) => void;
        };
      };
      if (c.mount?.legacyFormMaster || g.SidekickFormMasterRig?.applySemanticPose) {
        g.SidekickFormMasterRig?.applySemanticPose?.(pose);
        g.SidekickFormMasterRig?.setPaused?.(false);
        g.SidekickFormMasterRig?.requestOneFrame?.();
        c.emitFrame?.();
        c.emit?.();
        return;
      }
      c.tracks?.applyValues?.(pose);
      c.mixer?.setForm(pose);
      c.mixer?.flush?.();
      c.living?.applyExternalPose?.(pose);
      c.emitFrame?.();
      c.emit?.();
    },
    getLivePose: () => c.readLive?.() ?? {},
  });
}

function extractPoseFromResult(result: CommandResult): Record<string, number> | null {
  const root = result.result as Record<string, unknown> | undefined;
  if (!root || typeof root !== "object") return null;
  const candidates = [
    root.pose,
    (root.data as Record<string, unknown> | undefined)?.pose,
    (
      (root.data as Record<string, unknown> | undefined)?.data as
        | Record<string, unknown>
        | undefined
    )?.pose,
    root,
  ];
  for (const c of candidates) {
    if (!c || typeof c !== "object") continue;
    const entries = Object.entries(c as Record<string, unknown>).filter(
      ([, v]) => typeof v === "number" && Number.isFinite(v as number),
    );
    if (
      entries.length >= 2 &&
      entries.some(([k]) =>
        /eye|mouth|crown|energy|overall|gaze|face|relief/i.test(k),
      )
    ) {
      return Object.fromEntries(entries) as Record<string, number>;
    }
  }
  return null;
}

function applyResultPoseToDais(command: string, result: CommandResult) {
  if (!/scrub|play|seed|keyframe|pose|expression|embodiment/i.test(command)) return;
  const pose = extractPoseFromResult(result);
  if (!pose) return;
  ensureDaisHostBound();
  const c = getDais();
  c?.applyExternalPose?.(pose);
}

function activeDocumentMeta() {
  try {
    const session = getAnimationCommandSession();
    const doc = session.getDocument();
    return {
      id: doc.id,
      revision: doc.revision,
      dirty: Boolean(doc.dirty),
      path: session.getPath(),
    };
  } catch {
    return { id: null, revision: 0, dirty: false, path: null };
  }
}

function runtimeStateMeta(): StudioHello["runtimeState"] {
  try {
    const session = getAnimationCommandSession();
    const playhead =
      typeof session.getPlayheadMs === "function" ? session.getPlayheadMs() : 0;
    return { playback: "idle", playheadMs: playhead };
  } catch {
    return { playback: "idle", playheadMs: 0 };
  }
}

function jitter(ms: number): number {
  const j = 0.2;
  const f = 1 + (Math.random() * 2 - 1) * j;
  return Math.max(200, Math.min(MAX_BACKOFF_MS, Math.round(ms * f)));
}

export type HttpBridgeHandlers = {
  onStatus?: (
    status: string,
    meta?: {
      endpoint?: string | null;
      offlineAttempts?: number;
      nextRetryMs?: number | null;
      lastAttemptAt?: string | null;
    },
  ) => void;
};

/**
 * Quiet probe: does not throw; treats 404/network as expected offline.
 * Avoids console.error stacks — only returns boolean.
 */
async function probeToken(base: string, signal: AbortSignal): Promise<boolean> {
  try {
    const r = await fetch(`${base}/v1/studio-bridge/token`, {
      method: "GET",
      signal,
    });
    return r.ok;
  } catch {
    return false;
  }
}

async function resolveBridgeBase(signal: AbortSignal): Promise<string | null> {
  for (const base of BASE_CANDIDATES) {
    if (await probeToken(base, signal)) return base;
  }
  return null;
}

export class StudioHttpBridgeClient {
  private stopped = false;
  private backoffIndex = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private handlers: HttpBridgeHandlers = {};
  private token: string | null = null;
  private base: string = BASE_CANDIDATES[0];
  /** Bound once from authority identities — never re-rolled mid-session. */
  private instanceId: string;
  private pollAbort: AbortController | null = null;
  private attemptAbort: AbortController | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private processId: number;
  private loopRunning = false;
  private offlineAttempts = 0;
  /** Monotonic generation: stop/reconnect bumps this to kill in-flight loops. */
  private generation = 0;
  private sessionId: string | null = null;
  private commandRoundTrips = 0;

  constructor() {
    const ids = ensureAuthorityIdentities();
    this.instanceId = ids.studio_bridge_instance_id;
    this.processId = ids.process_id;
  }

  get bridgeBase(): string {
    return this.base;
  }
  get bridgeToken(): string | null {
    return this.token;
  }
  get studioInstanceId(): string {
    return this.instanceId;
  }
  get bridgeSessionId(): string | null {
    return this.sessionId;
  }
  get isLoopRunning(): boolean {
    return this.loopRunning;
  }
  get connectionGeneration(): number {
    return this.generation;
  }

  start(handlers: HttpBridgeHandlers = {}) {
    this.handlers = handlers;
    this.stopped = false;
    // Re-bind instance from authority (boot may have set build/process).
    const ids = ensureAuthorityIdentities();
    this.instanceId = ids.studio_bridge_instance_id;
    this.processId = ids.process_id;
    void this.ensureLoop();
  }

  stop() {
    this.stopped = true;
    this.generation += 1;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    this.pollAbort?.abort();
    this.attemptAbort?.abort();
    this.loopRunning = false;
    const token = this.token;
    const instanceId = this.instanceId;
    const base = this.base;
    this.token = null;
    this.sessionId = null;
    if (token) {
      // Explicit unregister on clean close — best-effort, no silent swallow of status.
      void fetch(`${base}/v1/studio-bridge/unregister`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Studio-Bridge-Token": token,
        },
        body: JSON.stringify({ instanceId }),
      }).catch(() => undefined);
    }
  }

  /**
   * Manual reconnect: cancel backoff, reset delay, single immediate attempt.
   * Bumps generation so any previous loop exits — never stacks loops.
   */
  reconnectNow() {
    if (this.stopped) return;
    this.generation += 1;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.backoffIndex = 0;
    this.pollAbort?.abort();
    this.attemptAbort?.abort();
    this.loopRunning = false;
    this.setStatus("connecting (manual reconnect)", {
      endpoint: this.base,
      offlineAttempts: this.offlineAttempts,
      nextRetryMs: 0,
      lastAttemptAt: new Date().toISOString(),
    });
    void this.ensureLoop();
  }

  private startHeartbeat() {
    // One heartbeat loop only.
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      void this.sendHeartbeat();
    }, HEARTBEAT_MS);
    void this.sendHeartbeat();
  }

  private async sendHeartbeat() {
    if (!this.token || this.stopped) return;
    try {
      const ids = getAuthorityIdentities();
      const res = await fetch(`${this.base}/v1/studio-bridge/heartbeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Studio-Bridge-Token": this.token,
        },
        body: JSON.stringify({
          instanceId: this.instanceId,
          activeDocument: activeDocumentMeta(),
          runtimeState: runtimeStateMeta(),
          application_instance_id: ids?.application_instance_id,
          runtime_instance_id: ids?.runtime_instance_id,
          build_id: ids?.build_id,
        }),
      });
      if (res.status === 401 || res.status === 404) {
        // Session lost — force reconnect path without stacking loops.
        this.pollAbort?.abort();
      }
    } catch {
      /* expected if offline mid-session */
    }
  }

  private setStatus(
    s: string,
    meta?: {
      endpoint?: string | null;
      offlineAttempts?: number;
      nextRetryMs?: number | null;
      lastAttemptAt?: string | null;
    },
  ) {
    this.handlers.onStatus?.(s, meta);
  }

  private sleep(ms: number, gen: number) {
    return new Promise<void>((r) => {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.timer = null;
        if (gen === this.generation) r();
        else r();
      }, ms);
    });
  }

  private nextBackoffMs(): number {
    const step =
      BACKOFF_STEPS_MS[Math.min(this.backoffIndex, BACKOFF_STEPS_MS.length - 1)] ??
      MAX_BACKOFF_MS;
    this.backoffIndex = Math.min(this.backoffIndex + 1, BACKOFF_STEPS_MS.length - 1);
    return jitter(step);
  }

  private async ensureLoop() {
    // Single in-flight connection loop — reject concurrent ensureLoop.
    if (this.loopRunning || this.stopped) return;
    this.loopRunning = true;
    const gen = this.generation;
    try {
      await this.loop(gen);
    } finally {
      if (gen === this.generation) this.loopRunning = false;
    }
  }

  private buildHello(): StudioHello {
    const ids = requireAuthorityIdentities();
    // Fail closed: registration instance must match authority bridge id.
    assertBridgeRuntimeAligned(this.instanceId);
    return {
      type: "studio.hello",
      protocolVersion: STUDIO_PROTOCOL_VERSION,
      studioVersion: "0.1.0",
      instanceId: ids.studio_bridge_instance_id,
      processId: ids.process_id,
      applicationId: STUDIO_APPLICATION_ID,
      supportedCapabilities: getLocalStudioBroker().listCommands(),
      supportedDocumentVersions: [...STUDIO_SUPPORTED_DOCUMENT_VERSIONS],
      activeDocument: activeDocumentMeta(),
      runtimeState: runtimeStateMeta(),
      authToken: this.token || undefined,
    };
  }

  private async loop(gen: number) {
    while (!this.stopped && gen === this.generation) {
      this.attemptAbort = new AbortController();
      const signal = this.attemptAbort.signal;
      try {
        this.setStatus("connecting", {
          endpoint: this.base,
          offlineAttempts: this.offlineAttempts,
          lastAttemptAt: new Date().toISOString(),
        });
        const base = await resolveBridgeBase(signal);
        if (!base) throw new Error("bridge offline");
        this.base = base;

        const tokRes = await fetch(`${this.base}/v1/studio-bridge/token`, { signal });
        if (!tokRes.ok) throw new Error("token unavailable");
        const tok = (await tokRes.json()) as { token?: string };
        this.token = tok.token || null;
        if (!this.token) throw new Error("empty token");

        const hello = this.buildHello();
        const reg = await fetch(`${this.base}/v1/studio-bridge/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Studio-Bridge-Token": this.token,
          },
          body: JSON.stringify(hello),
          signal,
        });
        if (!reg.ok) throw new Error(`register ${reg.status}`);
        const bridgeHello = (await reg.json()) as AgentBridgeHello;
        this.sessionId = bridgeHello.sessionId || null;
        this.backoffIndex = 0;
        this.offlineAttempts = 0;
        this.setStatus(`connected session=${bridgeHello.sessionId} @ ${this.base}`, {
          endpoint: this.base,
          offlineAttempts: 0,
          nextRetryMs: null,
        });
        this.startHeartbeat();

        while (!this.stopped && gen === this.generation) {
          this.pollAbort = new AbortController();
          const poll = await fetch(
            `${this.base}/v1/studio-bridge/poll?instanceId=${encodeURIComponent(this.instanceId)}&waitMs=20000`,
            {
              headers: { "X-Studio-Bridge-Token": this.token },
              signal: this.pollAbort.signal,
            },
          );
          if (poll.status === 401 || poll.status === 404) throw new Error("session lost");
          if (!poll.ok) throw new Error(`poll ${poll.status}`);
          const msg = (await poll.json()) as {
            type?: string;
            command?: string;
            requestId?: string;
            [key: string]: unknown;
          };
          if (msg.type === "poll.timeout" || msg.type === "poll.closed") continue;
          // Live commands only — never replay a stored queue from a previous session.
          if (msg.type === "command.request" && msg.command && msg.requestId) {
            // Identity gate: refuse to execute if bridge/runtime drifted.
            assertBridgeRuntimeAligned(this.instanceId);
            ensureDaisHostBound();
            const result: CommandResult = await getLocalStudioBroker().handleRequest(
              msg as unknown as CommandRequest,
            );
            applyResultPoseToDais(msg.command, result);
            // Transport adapter: after broker accept, force derived editor projection
            // to match the sole canonical session owner. Record a receipt for audit.
            // Playback/scrub remain continuous-path and skip this gate.
            const projectionReceipt = applyBridgeCommandProjectionSync(
              msg.command,
              result,
            );
            if (projectionReceipt) {
              recordProjectionReceipt(projectionReceipt);
              // Surface projection sync failure on the command result without
              // inventing document state — bridge is not a second authority.
              if (
                result.success &&
                projectionReceipt.required &&
                !projectionReceipt.projectionSynced
              ) {
                (result as CommandResult & { projectionReceipt?: typeof projectionReceipt }).projectionReceipt =
                  projectionReceipt;
              } else if (projectionReceipt) {
                (result as CommandResult & { projectionReceipt?: typeof projectionReceipt }).projectionReceipt =
                  projectionReceipt;
              }
            }
            await fetch(`${this.base}/v1/studio-bridge/result`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Studio-Bridge-Token": this.token,
              },
              body: JSON.stringify({ ...result, instanceId: this.instanceId }),
            });
            this.commandRoundTrips += 1;
            void this.sendHeartbeat();
          }
        }
      } catch {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
        this.token = null;
        this.sessionId = null;
        if (this.stopped || gen !== this.generation) return;
        this.offlineAttempts += 1;
        const delay = this.nextBackoffMs();
        // Bounded status only — no console.error per attempt (expected offline).
        this.setStatus("disconnected backoff", {
          endpoint: this.base,
          offlineAttempts: this.offlineAttempts,
          nextRetryMs: delay,
          lastAttemptAt: new Date().toISOString(),
        });
        await this.sleep(delay, gen);
      }
    }
  }
}
