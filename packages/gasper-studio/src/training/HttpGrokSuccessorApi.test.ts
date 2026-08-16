import { describe, expect, it, vi } from "vitest";

import type { GrokContinuityPacket, GrokSuccessorStatus } from "./GrokSuccessorProtocol.js";
import { HttpGrokSuccessorApi } from "./HttpGrokSuccessorApi.js";

const status: GrokSuccessorStatus = {
  schema: "gasper.grok-successor.status.v1",
  capturedAt: "2026-08-14T03:00:00.000Z",
  identity: {
    environmentVerified: true,
    responseVerified: true,
    requestedModel: "grok-4.6",
    backendModel: "grok-4.6-build",
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
  repo: {
    root: "C:/GasperStudio",
    branch: "feature/grok-successor-foundation",
    head: "a7b01d1ffab021b85e19742171e32322c6d55a5e",
    dirty: [],
  },
  planops: {
    bookId: "GASPER-GROK-SUCCESSOR-001",
    turn: "worker",
    phase: "dispatched",
    gate: "successor-implementation",
    workId: "W-GROK-SUCCESSOR-001",
  },
  continuity: {
    available: true,
    writtenAt: "2026-08-14T03:00:00.000Z",
    nextAction: "Continue movement tuning.",
  },
};

const continuity: GrokContinuityPacket = {
  schema: "gasper.grok-successor.continuity.v1",
  writtenAt: "2026-08-14T03:00:00.000Z",
  repo: status.repo,
  planops: status.planops,
  northstarRefs: ["docs/triforce/NORTHSTAR.md"],
  allowedPaths: ["packages/gasper-studio/src/training/"],
  completed: ["Successor status is visible."],
  openRisks: ["Some MCP tool names are incompatible."],
  nextAction: "Continue movement tuning.",
  proofRefs: ["research/proofs/grok-successor-001/status.json"],
};

describe("HTTP Grok successor API", () => {
  it("strictly reads status and continuity", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => new Response(
      JSON.stringify(String(input).endsWith("/status")
        ? { ok: true, status }
        : { ok: true, continuity }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    const api = new HttpGrokSuccessorApi({ fetchImpl });

    await expect(api.getStatus()).resolves.toEqual(status);
    await expect(api.getContinuity()).resolves.toEqual(continuity);
  });

  it("writes a strict continuity packet and refuses malformed success", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({ continuity });
      return new Response(JSON.stringify({ ok: true, continuity }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    await expect(new HttpGrokSuccessorApi({ fetchImpl }).writeContinuity(continuity))
      .resolves.toEqual(continuity);

    const malformed = new HttpGrokSuccessorApi({
      fetchImpl: async () => new Response(JSON.stringify({ ok: true, status: { schema: "fake" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    });
    await expect(malformed.getStatus()).rejects.toThrow(/invalid|status/i);
  });
});
