/**
 * Outbound Studio bridge client (WebSocket path) — connects to AgentBridge loopback when available.
 * Never auto-launches AgentBridge. Bounded backoff. Does not replay stale writes.
 *
 * Production path prefers StudioHttpBridgeClient. This client shares authority identities
 * so dual-path experiments cannot mint a competing instance id.
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
import {
  assertBridgeRuntimeAligned,
  ensureAuthorityIdentities,
  requireAuthorityIdentities,
} from "./operational";
import { STUDIO_SUPPORTED_DOCUMENT_VERSIONS } from "./http-bridge-client";

const DEFAULT_WS = "ws://127.0.0.1:19528/v1/studio-bridge";
const MAX_BACKOFF_MS = 15_000;
const BASE_BACKOFF_MS = 500;

export type BridgeClientHandlers = {
  onStatus?: (status: string) => void;
};

export class StudioBridgeClient {
  private ws: WebSocket | null = null;
  private stopped = false;
  private backoff = BASE_BACKOFF_MS;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private handlers: BridgeClientHandlers = {};
  private token: string | null = null;
  private instanceId: string;
  private processId: number;
  private connectInFlight = false;
  private generation = 0;

  constructor() {
    const ids = ensureAuthorityIdentities();
    this.instanceId = ids.studio_bridge_instance_id;
    this.processId = ids.process_id;
  }

  get studioInstanceId(): string {
    return this.instanceId;
  }

  start(handlers: BridgeClientHandlers = {}) {
    this.handlers = handlers;
    this.stopped = false;
    const ids = ensureAuthorityIdentities();
    this.instanceId = ids.studio_bridge_instance_id;
    this.processId = ids.process_id;
    void this.connect();
  }

  stop() {
    this.stopped = true;
    this.generation += 1;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.connectInFlight = false;
    try {
      this.ws?.close();
    } catch {
      /* */
    }
    this.ws = null;
  }

  private setStatus(s: string) {
    this.handlers.onStatus?.(s);
  }

  private scheduleReconnect() {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    const wait = this.backoff;
    this.backoff = Math.min(MAX_BACKOFF_MS, Math.floor(this.backoff * 1.7));
    const gen = this.generation;
    this.timer = setTimeout(() => {
      if (gen !== this.generation || this.stopped) return;
      void this.connect();
    }, wait);
  }

  private async connect() {
    if (this.stopped) return;
    // One in-flight connect attempt.
    if (this.connectInFlight) return;
    this.connectInFlight = true;
    const gen = this.generation;
    try {
      const res = await fetch("http://127.0.0.1:19528/v1/studio-bridge/token", {
        method: "GET",
      });
      if (gen !== this.generation || this.stopped) return;
      if (!res.ok) {
        this.setStatus("disconnected (AgentBridge unavailable)");
        this.scheduleReconnect();
        return;
      }
      const j = (await res.json()) as { token?: string; wsUrl?: string };
      this.token = j.token || null;
      if (!this.token) {
        this.setStatus("disconnected (no bridge token)");
        this.scheduleReconnect();
        return;
      }
      const url = j.wsUrl || DEFAULT_WS;
      this.openWs(url);
    } catch {
      if (gen !== this.generation || this.stopped) return;
      this.setStatus("disconnected (AgentBridge unavailable)");
      this.scheduleReconnect();
    } finally {
      this.connectInFlight = false;
    }
  }

  private openWs(url: string) {
    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.backoff = BASE_BACKOFF_MS;
      const ids = requireAuthorityIdentities();
      assertBridgeRuntimeAligned(this.instanceId);
      const hello: StudioHello = {
        type: "studio.hello",
        protocolVersion: STUDIO_PROTOCOL_VERSION,
        studioVersion: "0.1.0",
        instanceId: ids.studio_bridge_instance_id,
        processId: ids.process_id,
        applicationId: STUDIO_APPLICATION_ID,
        supportedCapabilities: getLocalStudioBroker().listCommands(),
        supportedDocumentVersions: [...STUDIO_SUPPORTED_DOCUMENT_VERSIONS],
        activeDocument: { id: null, revision: 0, dirty: false, path: null },
        runtimeState: { playback: "idle", playheadMs: 0 },
        authToken: this.token || undefined,
      };
      this.ws?.send(JSON.stringify(hello));
      this.setStatus("negotiating…");
    };
    this.ws.onmessage = (ev) => {
      void this.onMessage(String(ev.data));
    };
    this.ws.onclose = () => {
      this.ws = null;
      this.setStatus("disconnected");
      this.scheduleReconnect();
    };
    this.ws.onerror = () => {
      try {
        this.ws?.close();
      } catch {
        /* */
      }
    };
  }

  private async onMessage(raw: string) {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    if (msg.type === "bridge.hello") {
      const hello = msg as unknown as AgentBridgeHello;
      this.setStatus(`connected session=${hello.sessionId}`);
      return;
    }
    if (msg.type === "bridge.error") {
      this.setStatus(`error: ${String((msg as { message?: string }).message || "unknown")}`);
      return;
    }
    if (msg.type === "command.request") {
      const req = msg as unknown as CommandRequest;
      // Never auto-replay: only execute live requests from the bridge
      assertBridgeRuntimeAligned(this.instanceId);
      const result: CommandResult = await getLocalStudioBroker().handleRequest(req);
      this.ws?.send(JSON.stringify(result));
    }
  }
}
