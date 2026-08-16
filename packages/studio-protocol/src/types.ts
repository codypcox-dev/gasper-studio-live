/**
 * Versioned Studio Bridge Protocol (AgentBridge ↔ Gasper Studio).
 * React-free. No shell/DOM/SVG/filesystem/terminal commands.
 */

export const STUDIO_PROTOCOL_VERSION = "1.0.0" as const;
export const STUDIO_APPLICATION_ID = "gasper-studio" as const;

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "authenticating"
  | "registering"
  | "ready"
  | "degraded"
  | "failed"
  | "version_incompatible";

export type DangerClass = "none" | "write" | "destructive" | "restricted";
export type ReadWriteClass = "read" | "write";

export type StudioHello = {
  type: "studio.hello";
  protocolVersion: string;
  studioVersion: string;
  instanceId: string;
  processId: number;
  applicationId: typeof STUDIO_APPLICATION_ID | string;
  supportedCapabilities: string[];
  supportedDocumentVersions: string[];
  activeDocument: {
    id: string | null;
    revision: number;
    dirty: boolean;
    path: string | null;
  };
  runtimeState: {
    playback: "idle" | "playing" | "paused";
    playheadMs: number;
  };
  /** Loopback auth token issued by AgentBridge (never logged). */
  authToken?: string;
};

export type AgentBridgeHello = {
  type: "bridge.hello";
  protocolVersion: string;
  bridgeVersion: string;
  sessionId: string;
  authentication: { ok: boolean; mode: string; error?: string };
  grantedCapabilities: string[];
  connectionPolicy: {
    requestTimeoutMs: number;
    maxInFlight: number;
    allowWrites: boolean;
  };
};

export type CapabilityManifest = {
  capabilityId: string;
  command: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  readWrite: ReadWriteClass;
  transactionRequired: boolean;
  dangerClass: DangerClass;
  available: boolean;
  version: string;
};

export type CommandRequest = {
  type: "command.request";
  requestId: string;
  command: string;
  input: Record<string, unknown>;
  documentId?: string | null;
  transactionId?: string | null;
  expectedRevision?: number | null;
  caller: { identity: string; profile?: string };
  grantedScope: string[];
  timestamp: string;
};

export type CommandResult = {
  type: "command.result";
  requestId: string;
  success: boolean;
  result?: unknown;
  documentRevision?: number;
  changeSummary?: string;
  validation?: { ok: boolean; findings?: unknown[] };
  error?: StudioProtocolError;
  durationMs: number;
  timestamp: string;
};

export type StudioEventType =
  | "document.opened"
  | "document.closed"
  | "document.dirty"
  | "document.saved"
  | "selection.changed"
  | "clip.changed"
  | "playhead.changed"
  | "playback.started"
  | "playback.paused"
  | "playback.stopped"
  | "validation.changed"
  | "runtime.unavailable"
  | "capability.changed";

export type StudioEvent = {
  type: "studio.event";
  event: StudioEventType;
  documentId?: string | null;
  payload?: Record<string, unknown>;
  timestamp: string;
};

export type StudioProtocolErrorCode =
  | "VERSION_INCOMPATIBLE"
  | "UNAUTHORIZED"
  | "STUDIO_UNAVAILABLE"
  | "TIMEOUT"
  | "CANCELLED"
  | "VALIDATION_FAILED"
  | "UNKNOWN_COMMAND"
  | "REVISION_CONFLICT"
  | "INTERNAL";

export type StudioProtocolError = {
  code: StudioProtocolErrorCode;
  message: string;
  details?: unknown;
};

export type BridgeEnvelope =
  | StudioHello
  | AgentBridgeHello
  | CommandRequest
  | CommandResult
  | StudioEvent
  | { type: "bridge.ping"; timestamp: string }
  | { type: "bridge.pong"; timestamp: string };
