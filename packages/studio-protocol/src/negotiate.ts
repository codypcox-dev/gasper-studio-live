import {
  STUDIO_PROTOCOL_VERSION,
  type AgentBridgeHello,
  type StudioHello,
  type StudioProtocolError,
} from "./types.js";

/** Major.minor compatibility: same major, bridge minor >= studio minor optional. */
export function protocolsCompatible(
  studioVersion: string,
  bridgeVersion: string,
): boolean {
  const sp = studioVersion.split(".").map(Number);
  const bp = bridgeVersion.split(".").map(Number);
  if (sp.length < 1 || bp.length < 1) return false;
  if (sp[0] !== bp[0]) return false;
  return true;
}

export function negotiateHello(
  studio: StudioHello,
  bridgeVersion: string,
  sessionId: string,
  allowWrites: boolean,
): AgentBridgeHello | StudioProtocolError {
  if (!protocolsCompatible(studio.protocolVersion, STUDIO_PROTOCOL_VERSION)) {
    return {
      code: "VERSION_INCOMPATIBLE",
      message: `Studio protocol ${studio.protocolVersion} incompatible with bridge ${STUDIO_PROTOCOL_VERSION}`,
      details: { studio: studio.protocolVersion, bridge: STUDIO_PROTOCOL_VERSION },
    };
  }
  if (studio.applicationId !== "gasper-studio" && studio.applicationId !== "agentbridge-desktop-studio") {
    // allow transitional dual-id during extraction
  }
  return {
    type: "bridge.hello",
    protocolVersion: STUDIO_PROTOCOL_VERSION,
    bridgeVersion,
    sessionId,
    authentication: { ok: true, mode: "loopback" },
    grantedCapabilities: [...studio.supportedCapabilities],
    connectionPolicy: {
      requestTimeoutMs: 30_000,
      maxInFlight: 8,
      allowWrites,
    },
  };
}

export function studioUnavailable(requestId: string, durationMs = 0) {
  return {
    type: "command.result" as const,
    requestId,
    success: false,
    error: {
      code: "STUDIO_UNAVAILABLE" as const,
      message:
        "Gasper Studio is not connected. Launch Studio and connect to AgentBridge; AgentBridge will not auto-launch Studio.",
    },
    durationMs,
    timestamp: new Date().toISOString(),
  };
}
