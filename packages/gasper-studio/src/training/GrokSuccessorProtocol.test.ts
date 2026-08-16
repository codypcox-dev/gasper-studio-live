import { describe, expect, it } from "vitest";

import {
  grokContinuityPacketSchema,
  grokSuccessorStatusSchema,
} from "./GrokSuccessorProtocol.js";

const continuity = {
  schema: "gasper.grok-successor.continuity.v1",
  writtenAt: "2026-08-14T03:00:00.000Z",
  repo: {
    root: "C:/Users/funny/Documents/GasperStudio-worktrees/grok-successor-foundation",
    branch: "feature/grok-successor-foundation",
    head: "a7b01d1ffab021b85e19742171e32322c6d55a5e",
    dirty: ["M packages/gasper-studio/src/training/GrokSuccessorProtocol.ts"],
  },
  planops: {
    bookId: "GASPER-GROK-SUCCESSOR-001",
    turn: "worker",
    phase: "dispatched",
    gate: "successor-implementation",
    workId: "W-GROK-SUCCESSOR-001",
  },
  northstarRefs: ["docs/triforce/NORTHSTAR.md"],
  allowedPaths: ["packages/gasper-studio/src/training/"],
  completed: ["Checkpointed the Grok pilot foundation."],
  openRisks: ["AgentBridge currently exposes MCP names Grok cannot register."],
  nextAction: "Finish the visible successor status panel.",
  proofRefs: ["research/proofs/grok-successor-001/status.json"],
  lastResponseIdentity: {
    verification: "response",
    canonicalModel: "grok-4.6",
    backendModel: "grok-4.6-build",
    requestId: "request-46",
    sessionId: "session-46",
    modelCalls: 1,
  },
} as const;

describe("Grok successor protocol", () => {
  it("accepts a strict, reload-safe continuity packet", () => {
    expect(grokContinuityPacketSchema.parse(continuity)).toEqual(continuity);
  });

  it("rejects unknown fields, invalid heads, empty next actions, and Grimoire scope", () => {
    expect(grokContinuityPacketSchema.safeParse({ ...continuity, surprise: true }).success).toBe(false);
    expect(grokContinuityPacketSchema.safeParse({
      ...continuity,
      repo: { ...continuity.repo, head: "a7b01d1" },
    }).success).toBe(false);
    expect(grokContinuityPacketSchema.safeParse({ ...continuity, nextAction: "" }).success).toBe(false);
    expect(grokContinuityPacketSchema.safeParse({
      ...continuity,
      allowedPaths: ["C:/Users/funny/Documents/Grimoire/"],
    }).success).toBe(false);
  });

  it("keeps environment health distinct from response attestation", () => {
    const parsed = grokSuccessorStatusSchema.parse({
      schema: "gasper.grok-successor.status.v1",
      capturedAt: "2026-08-14T03:00:00.000Z",
      identity: {
        environmentVerified: true,
        responseVerified: false,
        requestedModel: "grok-4.6",
        cliVersion: "grok 1.0.3",
        executableSha256: "a".repeat(64),
      },
      bridge: {
        healthy: true,
        protocol: "2025-11-25",
        discoveredTools: 393,
        incompatibleTools: ["gasper__manifest"],
        legalAliases: [
          { incompatible: "gasper__manifest", legal: "gasper_manifest", operation: "manifest" },
        ],
      },
      repo: continuity.repo,
      planops: continuity.planops,
      continuity: {
        available: true,
        writtenAt: continuity.writtenAt,
        nextAction: continuity.nextAction,
      },
    });

    expect(parsed.identity).toMatchObject({ environmentVerified: true, responseVerified: false });
    expect(parsed.identity).not.toHaveProperty("backendModel");
  });
});
