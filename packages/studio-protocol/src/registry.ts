/**
 * Connected Studio instance registry (AgentBridge-side).
 * Process-agnostic: transport layer registers sockets and this routes commands.
 */

import { StudioCommandBroker } from "./broker.js";
import type {
  CommandRequest,
  CommandResult,
  StudioHello,
  CapabilityManifest,
} from "./types.js";

export type StudioInstance = {
  instanceId: string;
  processId: number;
  studioVersion: string;
  protocolVersion: string;
  applicationId: string;
  capabilities: string[];
  documentVersions: string[];
  activeDocument: StudioHello["activeDocument"];
  connectedAt: string;
  lastSeenAt: string;
  sessionId: string;
  /** Send a command request to this Studio and await result. */
  dispatch: (req: CommandRequest) => Promise<CommandResult>;
  close: () => void;
};

export class StudioInstanceRegistry {
  private instances = new Map<string, StudioInstance>();
  private primaryId: string | null = null;

  list(): StudioInstance[] {
    return [...this.instances.values()];
  }

  get(instanceId: string): StudioInstance | undefined {
    return this.instances.get(instanceId);
  }

  primary(): StudioInstance | null {
    if (this.primaryId && this.instances.has(this.primaryId)) {
      return this.instances.get(this.primaryId)!;
    }
    const first = this.instances.values().next().value as StudioInstance | undefined;
    return first ?? null;
  }

  register(inst: StudioInstance): void {
    this.instances.set(inst.instanceId, inst);
    this.primaryId = inst.instanceId;
  }

  touch(instanceId: string): void {
    const i = this.instances.get(instanceId);
    if (i) i.lastSeenAt = new Date().toISOString();
  }

  unregister(instanceId: string): void {
    const i = this.instances.get(instanceId);
    if (i) {
      try {
        i.close();
      } catch {
        /* */
      }
      this.instances.delete(instanceId);
    }
    if (this.primaryId === instanceId) {
      this.primaryId = this.instances.keys().next().value ?? null;
    }
  }

  isAnyConnected(): boolean {
    return this.instances.size > 0;
  }

  /**
   * Remove instances whose lastSeenAt is older than staleMs.
   * Transport should prefer its own live-map reap; this is a registry safety net.
   */
  reapStale(staleMs: number, nowMs = Date.now()): string[] {
    const removed: string[] = [];
    for (const [id, inst] of this.instances) {
      const seen = Date.parse(inst.lastSeenAt);
      if (!Number.isFinite(seen) || nowMs - seen > staleMs) {
        try {
          inst.close = () => undefined;
          this.unregister(id);
        } catch {
          this.instances.delete(id);
        }
        removed.push(id);
      }
    }
    if (this.primaryId && !this.instances.has(this.primaryId)) {
      this.primaryId = this.instances.keys().next().value ?? null;
    }
    return removed;
  }

  capabilityManifest(): CapabilityManifest[] {
    const p = this.primary();
    if (!p) return [];
    return p.capabilities.map((command) => ({
      capabilityId: command,
      command,
      description: `Studio command ${command}`,
      inputSchema: { type: "object" },
      outputSchema: { type: "object" },
      readWrite: command.startsWith("inspect") || command.startsWith("list") ? "read" : "write",
      transactionRequired: false,
      dangerClass: command.includes("delete") || command.includes("save") ? "write" : "none",
      available: true,
      version: p.studioVersion,
    }));
  }

  async dispatch(
    command: string,
    input: Record<string, unknown> = {},
    requestId = `req-${Date.now()}`,
  ): Promise<CommandResult> {
    const inst = this.primary();
    if (!inst) {
      return {
        type: "command.result",
        requestId,
        success: false,
        error: {
          code: "STUDIO_UNAVAILABLE",
          message:
            "Gasper Studio is not connected. Launch Studio manually; AgentBridge will not auto-launch it.",
        },
        durationMs: 0,
        timestamp: new Date().toISOString(),
      };
    }
    const req: CommandRequest = {
      type: "command.request",
      requestId,
      command,
      input,
      caller: { identity: "agentbridge-mcp" },
      grantedScope: inst.capabilities,
      timestamp: new Date().toISOString(),
    };
    return inst.dispatch(req);
  }
}

let registry: StudioInstanceRegistry | null = null;

export function getStudioRegistry(): StudioInstanceRegistry {
  if (!registry) registry = new StudioInstanceRegistry();
  return registry;
}

/** Reset registry (tests only). */
export function resetStudioRegistryForTests(): void {
  registry = new StudioInstanceRegistry();
}

/**
 * Bridge broker that routes through the registry (cross-process) instead of
 * process-local animation session.
 */
export function createRegistryBackedBroker(): StudioCommandBroker {
  const broker = new StudioCommandBroker({ studioConnected: false });
  // Wrap isStudioConnected via polling registry — callers use registry dispatch in gateway.
  const orig = broker.isStudioConnected.bind(broker);
  broker.isStudioConnected = () => getStudioRegistry().isAnyConnected() || orig();
  return broker;
}
