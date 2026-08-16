import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { GrokContinuityPacket } from "../GrokSuccessorProtocol.js";
import { GrokSuccessorService } from "./GrokSuccessorService.js";

const roots: string[] = [];

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "gasper-successor-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const repo = {
  root: "C:/GasperStudio",
  branch: "feature/grok-successor-foundation",
  head: "a7b01d1ffab021b85e19742171e32322c6d55a5e",
  dirty: [],
} as const;

const planops = {
  bookId: "GASPER-GROK-SUCCESSOR-001",
  turn: "worker",
  phase: "dispatched",
  gate: "successor-implementation",
  workId: "W-GROK-SUCCESSOR-001",
} as const;

function healthyRunner() {
  return vi.fn(async (_executable: string, args: readonly string[]) => {
    if (args.join(" ") === "--version") return { exitCode: 0, stdout: "grok 1.0.3", stderr: "" };
    if (args.join(" ") === "models") {
      return { exitCode: 0, stdout: "Default model: grok-4.6\nAvailable models:\n * grok-4.6", stderr: "" };
    }
    if (args.join(" ") === "mcp doctor --json") {
      return {
        exitCode: 0,
        stdout: JSON.stringify({
          servers: [{
            name: "agentbridge-local",
            healthy: true,
            checks: [
              { label: "handshake OK", passed: true, detail: "protocol 2025-11-25" },
              { label: "393 tools discovered", passed: true, detail: "" },
            ],
          }],
          healthy_count: 1,
          failing_count: 0,
        }),
        stderr: "",
      };
    }
    throw new Error(`unexpected command: ${args.join(" ")}`);
  });
}

function packet(root: string): GrokContinuityPacket {
  return {
    schema: "gasper.grok-successor.continuity.v1",
    writtenAt: "2026-08-14T03:00:00.000Z",
    repo: { ...repo, root },
    planops,
    northstarRefs: ["docs/triforce/NORTHSTAR.md"],
    allowedPaths: ["packages/gasper-studio/src/training/"],
    completed: ["Response identity verified."],
    openRisks: ["AgentBridge has incompatible Grok tool names."],
    nextAction: "Open the successor panel in Gasper Studio.",
    proofRefs: ["research/proofs/grok-successor-001/status.json"],
    lastResponseIdentity: {
      verification: "response",
      canonicalModel: "grok-4.6",
      backendModel: "grok-4.6-build",
      requestId: "request-46",
      sessionId: "session-46",
      modelCalls: 1,
    },
  };
}

describe("Grok successor service", () => {
  it("reports Grok 4.6 and AgentBridge health without making a model call", async () => {
    const root = await temporaryRoot();
    const commandRunner = healthyRunner();
    const service = new GrokSuccessorService({
      root,
      commandRunner,
      hashExecutable: async () => "a".repeat(64),
      inspectRepo: async () => repo,
      inspectPlanOps: async () => planops,
      incompatibleTools: ["gasper__manifest"],
      now: () => new Date("2026-08-14T03:00:00.000Z"),
    });

    const status = await service.status();

    expect(status.identity).toMatchObject({
      environmentVerified: true,
      responseVerified: false,
      requestedModel: "grok-4.6",
      cliVersion: "grok 1.0.3",
      executableSha256: "a".repeat(64),
    });
    expect(status.bridge).toMatchObject({
      healthy: true,
      protocol: "2025-11-25",
      discoveredTools: 393,
      incompatibleTools: ["gasper__manifest"],
    });
    expect(status.bridge.legalAliases).toEqual(
      expect.arrayContaining([
        { incompatible: "gasper__inspect_tuning", legal: "gasper_inspect_tuning", operation: "inspect_tuning" },
      ]),
    );
    expect(commandRunner.mock.calls.map(([, args]) => args)).toEqual([
      ["--version"],
      ["models"],
      ["mcp", "doctor", "--json"],
    ]);
    expect(commandRunner.mock.calls.flatMap(([, args]) => args)).not.toContain("-p");
  });

  it("keeps a dead bridge red even when the Grok 4.6 environment is valid", async () => {
    const root = await temporaryRoot();
    const runner = healthyRunner();
    runner.mockImplementation(async (_executable, args) => {
      if (args.join(" ") === "mcp doctor --json") {
        return {
          exitCode: 1,
          stdout: JSON.stringify({ servers: [], healthy_count: 0, failing_count: 1 }),
          stderr: "connection refused",
        };
      }
      if (args.join(" ") === "--version") return { exitCode: 0, stdout: "grok 1.0.3", stderr: "" };
      return { exitCode: 0, stdout: "Default model: grok-4.6", stderr: "" };
    });
    const service = new GrokSuccessorService({
      root,
      commandRunner: runner,
      hashExecutable: async () => "b".repeat(64),
      inspectRepo: async () => repo,
      inspectPlanOps: async () => planops,
    });

    const status = await service.status();

    expect(status.identity.environmentVerified).toBe(true);
    expect(status.bridge.healthy).toBe(false);
    expect(status.bridge.discoveredTools).toBe(0);
  });

  it("writes continuity atomically and survives a new service instance", async () => {
    const root = await temporaryRoot();
    const continuityPath = join(root, ".gasper", "successor", "continuity.json");
    const first = new GrokSuccessorService({ root, continuityPath });

    await first.writeContinuity(packet(root));

    const names = await readdir(dirname(continuityPath));
    expect(names).toEqual(["continuity.json"]);
    expect(JSON.parse(await readFile(continuityPath, "utf8"))).toEqual(packet(root));
    const second = new GrokSuccessorService({
      root,
      continuityPath,
      commandRunner: healthyRunner(),
      hashExecutable: async () => "a".repeat(64),
      inspectRepo: async () => ({ ...repo, root }),
      inspectPlanOps: async () => planops,
      now: () => new Date("2026-08-14T03:00:00.000Z"),
    });
    await expect(second.readContinuity()).resolves.toEqual(packet(root));
    await expect(second.status()).resolves.toMatchObject({
      identity: {
        responseVerified: true,
        backendModel: "grok-4.6-build",
      },
    });
  });

  it("rejects malformed continuity already on disk", async () => {
    const root = await temporaryRoot();
    const continuityPath = join(root, ".gasper", "successor", "continuity.json");
    await mkdir(dirname(continuityPath), { recursive: true });
    await writeFile(continuityPath, JSON.stringify({ schema: "wrong" }), "utf8");

    await expect(new GrokSuccessorService({ root, continuityPath }).readContinuity())
      .rejects.toThrow(/continuity|schema|invalid/i);
  });
});
