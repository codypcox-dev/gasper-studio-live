import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { GrokSuccessorStatus } from "./GrokSuccessorProtocol.js";
import { GrokSuccessorPanel } from "./GrokSuccessorPanel.js";

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
    incompatibleTools: ["gasper__manifest", "gasper__set_tuning"],
    legalAliases: [
      { incompatible: "gasper__manifest", legal: "gasper_manifest", operation: "manifest" },
      { incompatible: "gasper__set_tuning", legal: "gasper_set_tuning", operation: "set_tuning" },
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
    nextAction: "Continue physics-first Wispwalker movement tuning.",
  },
};

describe("Grok successor panel", () => {
  it("shows verifiable takeover state without hiding tool incompatibility", () => {
    const html = renderToStaticMarkup(<GrokSuccessorPanel initialStatus={status} />);

    expect(html).toMatch(/GROK 4\.6 VERIFIED/);
    expect(html).toMatch(/RESPONSE VERIFIED/);
    expect(html).toMatch(/AGENTBRIDGE HEALTHY/);
    expect(html).toMatch(/393 TOOLS/);
    expect(html).toMatch(/worker.*W-GROK-SUCCESSOR-001/i);
    expect(html).toMatch(/Continue physics-first Wispwalker movement tuning/);
    expect(html).toMatch(/2 incompatible MCP names/i);
    expect(html).toContain("gasper__manifest");
    expect(html).toContain("gasper_manifest");
  });

  it("shows legal Grok aliases when the residual incompatible list is empty", () => {
    const html = renderToStaticMarkup(<GrokSuccessorPanel initialStatus={{
      ...status,
      bridge: {
        ...status.bridge,
        incompatibleTools: [],
        legalAliases: [
          { incompatible: "gasper__inspect_tuning", legal: "gasper_inspect_tuning", operation: "inspect_tuning" },
        ],
      },
    }} />);
    expect(html).toMatch(/MCP tool names compatible/i);
    expect(html).toContain("gasper_inspect_tuning");
  });
});
