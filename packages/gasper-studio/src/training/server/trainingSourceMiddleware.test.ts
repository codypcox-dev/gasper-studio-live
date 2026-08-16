import { createServer, type Server } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { ResolvedReferenceSource } from "../ReferenceTrainingSession.js";
import type { GrokContinuityPacket, GrokSuccessorStatus } from "../GrokSuccessorProtocol.js";
import type { StudioPilotTurnRequest } from "../StudioPilotProtocol.js";
import type { GrokResponseIdentity } from "./GrokResponseIdentity.js";
import { VideoSourceError } from "./VideoSourceResolver.js";
import { createTrainingSourceMiddleware } from "./trainingSourceMiddleware.js";

const servers: Server[] = [];
const roots: string[] = [];

async function listen(service: {
  resolveLinked(url: string, signal?: AbortSignal): Promise<ResolvedReferenceSource>;
  findMediaPath(hash: string): Promise<string>;
  writeStage?(sessionId: string, stage: string, artifact: unknown): Promise<{ artifactHash: string }>;
  interpretSemantic?(packet: unknown, signal?: AbortSignal): Promise<{ responseId: string; output: unknown }>;
  pilotTurn?(request: StudioPilotTurnRequest, signal?: AbortSignal): Promise<{
    responseId: string;
    model: "grok-4.6";
    identity: GrokResponseIdentity;
    batch: unknown;
  }>;
  successorStatus?(): Promise<GrokSuccessorStatus>;
  readSuccessorContinuity?(): Promise<GrokContinuityPacket | null>;
  writeSuccessorContinuity?(packet: GrokContinuityPacket): Promise<GrokContinuityPacket>;
}): Promise<string> {
  const middleware = createTrainingSourceMiddleware(service);
  const server = createServer((req, res) => {
    middleware(req, res, () => {
      res.statusCode = 404;
      res.end("not found");
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server address missing");
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function sourceResult(): ResolvedReferenceSource {
  const hash = "f".repeat(64);
  return {
    sessionId: "training-http-1",
    mediaUrl: `/__gasper/training/media/${hash}`,
    receipt: {
      schema: "gasper.video-source-receipt.v1",
      id: `source-${hash}`,
      sourceKind: "direct_url",
      sourceRef: "https://video.example/move.mp4",
      contentHash: `sha256:${hash}`,
      byteLength: 6,
      media: {
        durationMs: 1_000,
        widthPx: 320,
        heightPx: 240,
        frameRateHz: 30,
        container: "mp4",
        videoCodec: "h264",
      },
      resolver: { id: "fixture", version: "1" },
    },
  };
}

describe("training source middleware", () => {
  it("exposes bounded source resolution and byte-range media playback", async () => {
    const root = await mkdtemp(join(tmpdir(), "gasper-training-http-"));
    roots.push(root);
    const mediaPath = join(root, `${"f".repeat(64)}.mp4`);
    await writeFile(mediaPath, Buffer.from("abcdef"));
    const base = await listen({
      resolveLinked: async () => sourceResult(),
      findMediaPath: async () => mediaPath,
    });

    const source = await fetch(`${base}/__gasper/training/source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://video.example/move.mp4" }),
    });
    expect(source.status).toBe(200);
    expect(await source.json()).toEqual({ ok: true, ...sourceResult() });

    const media = await fetch(`${base}${sourceResult().mediaUrl}`, {
      headers: { Range: "bytes=1-3" },
    });
    expect(media.status).toBe(206);
    expect(media.headers.get("content-range")).toBe("bytes 1-3/6");
    expect(await media.text()).toBe("bcd");
  });

  it("returns typed provider errors before any fake success payload", async () => {
    const base = await listen({
      resolveLinked: async () => {
        throw new VideoSourceError("PROVIDER_REQUIRED", "explicit provider adapter required");
      },
      findMediaPath: async () => {
        throw new Error("unused");
      },
    });

    const response = await fetch(`${base}/__gasper/training/source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://youtu.be/example" }),
    });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      ok: false,
      code: "PROVIDER_REQUIRED",
      error: "explicit provider adapter required",
    });
  });

  it("persists derived stages and delegates semantic inference without exposing a shell surface", async () => {
    const written: Array<{ sessionId: string; stage: string; artifact: unknown }> = [];
    const base = await listen({
      resolveLinked: async () => sourceResult(),
      findMediaPath: async () => { throw new Error("unused"); },
      writeStage: async (sessionId, stage, artifact) => {
        written.push({ sessionId, stage, artifact });
        return { artifactHash: `sha256:${"a".repeat(64)}` };
      },
      interpretSemantic: async (packet) => ({
        responseId: "semantic-http-1",
        output: { echoedSchema: (packet as { schemaName?: string }).schemaName },
      }),
    });

    const stage = await fetch(`${base}/__gasper/training/stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "training-http-1", stage: "mechanics", artifact: { schema: "gasper.motion-mechanics.v1" } }),
    });
    expect(stage.status).toBe(200);
    expect(await stage.json()).toMatchObject({ ok: true, artifactHash: `sha256:${"a".repeat(64)}` });
    expect(written).toEqual([{ sessionId: "training-http-1", stage: "mechanics", artifact: { schema: "gasper.motion-mechanics.v1" } }]);

    const semantic = await fetch(`${base}/__gasper/training/semantic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packet: { schemaName: "gasper.semantic-motion-proposal.v1", system: "system", user: "user" } }),
    });
    expect(semantic.status).toBe(200);
    expect(await semantic.json()).toEqual({
      ok: true,
      responseId: "semantic-http-1",
      output: { echoedSchema: "gasper.semantic-motion-proposal.v1" },
    });
  });

  it("accepts only a typed Studio pilot turn and returns the provider-stamped batch", async () => {
    const seen: StudioPilotTurnRequest[] = [];
    const batch = {
      schema: "gasper.studio-pilot.action-batch.v1",
      disposition: "complete",
      summary: "Done.",
      message: "The requested state is active.",
      continueOnError: false,
      actions: [],
    } as const;
    const base = await listen({
      resolveLinked: async () => sourceResult(),
      findMediaPath: async () => { throw new Error("unused"); },
      pilotTurn: async (request) => {
        seen.push(request);
        return {
          responseId: "pilot-http-1",
          model: "grok-4.6",
          identity: {
            verification: "response",
            canonicalModel: "grok-4.6",
            backendModel: "grok-4.6-build",
            requestId: "pilot-http-1",
            sessionId: "pilot-session-1",
            modelCalls: 1,
          },
          batch,
        };
      },
    });
    const request: StudioPilotTurnRequest = {
      schema: "gasper.studio-pilot.turn-request.v1",
      sessionId: "pilot-http",
      turn: 1,
      maxTurns: 4,
      model: "grok-4.6",
      userGoal: "Show Wispwalker.",
      capabilities: [{ kind: "studio.set_embodiment", available: true, description: "Select form.", bounds: {} }],
      observation: {
        schema: "gasper.studio-pilot.observation.v1",
        capturedAtMs: 1,
        studio: {}, tuning: {}, physics: {}, autonomy: {}, reference: {},
      },
      history: [],
    };

    const response = await fetch(`${base}/__gasper/training/pilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      responseId: "pilot-http-1",
      model: "grok-4.6",
      identity: { backendModel: "grok-4.6-build", modelCalls: 1 },
      batch,
    });
    expect(seen).toEqual([request]);

    const invalid = await fetch(`${base}/__gasper/training/pilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: { ...request, model: "other" } }),
    });
    expect(invalid.status).toBe(400);
    expect(seen).toHaveLength(1);
  });

  it("serves strict successor status and reload-safe continuity on loopback only", async () => {
    const status: GrokSuccessorStatus = {
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
      continuity: { available: false },
    };
    const continuity: GrokContinuityPacket = {
      schema: "gasper.grok-successor.continuity.v1",
      writtenAt: "2026-08-14T03:00:00.000Z",
      repo: status.repo,
      planops: status.planops,
      northstarRefs: ["docs/triforce/NORTHSTAR.md"],
      allowedPaths: ["packages/gasper-studio/src/training/"],
      completed: ["Status service implemented."],
      openRisks: ["MCP tool names need repair."],
      nextAction: "Open the Studio status panel.",
      proofRefs: [],
    };
    let saved = continuity;
    const base = await listen({
      resolveLinked: async () => sourceResult(),
      findMediaPath: async () => { throw new Error("unused"); },
      successorStatus: async () => status,
      readSuccessorContinuity: async () => saved,
      writeSuccessorContinuity: async (packet) => {
        saved = packet;
        return packet;
      },
      dispatchGrokLane: async (request) => {
        if (request.name.includes("__")) {
          return { ok: false, name: request.name, code: "ILLEGAL_GROK_NAME", error: "illegal" };
        }
        return { ok: true, name: request.name, operation: "inspect_tuning", result: { live: true } };
      },
    });

    const statusResponse = await fetch(`${base}/__gasper/training/successor/status`);
    expect(statusResponse.status).toBe(200);
    expect(statusResponse.headers.get("cache-control")).toBe("no-store");
    expect(await statusResponse.json()).toEqual({ ok: true, status });

    const continuityResponse = await fetch(`${base}/__gasper/training/successor/continuity`);
    expect(await continuityResponse.json()).toEqual({ ok: true, continuity });

    const writeResponse = await fetch(`${base}/__gasper/training/successor/continuity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ continuity: { ...continuity, nextAction: "Reload and continue." } }),
    });
    expect(writeResponse.status).toBe(200);
    expect(saved.nextAction).toBe("Reload and continue.");

    const malformed = await fetch(`${base}/__gasper/training/successor/continuity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ continuity: { schema: "fake" } }),
    });
    expect(malformed.status).toBe(422);

    const oversized = await fetch(`${base}/__gasper/training/successor/continuity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ continuity, padding: "x".repeat(1024 * 1024) }),
    });
    expect(oversized.status).toBe(413);

    const lane = await fetch(`${base}/__gasper/training/successor/grok-lane`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "gasper_inspect_tuning" }),
    });
    expect(lane.status).toBe(200);
    expect(await lane.json()).toEqual({
      ok: true,
      result: { ok: true, name: "gasper_inspect_tuning", operation: "inspect_tuning", result: { live: true } },
    });

    const illegal = await fetch(`${base}/__gasper/training/successor/grok-lane`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "gasper__inspect_tuning" }),
    });
    expect(illegal.status).toBe(422);

    const crossOrigin = await fetch(`${base}/__gasper/training/successor/status`, {
      headers: { Origin: "https://example.invalid" },
    });
    expect(crossOrigin.status).toBe(403);
  });
});
