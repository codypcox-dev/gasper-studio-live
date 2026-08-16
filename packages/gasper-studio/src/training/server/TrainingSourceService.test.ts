import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { ResolvedVideoSource } from "./VideoSourceResolver.js";
import { TrainingSourceService } from "./TrainingSourceService.js";

const roots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "gasper-source-service-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function resolved(artifactPath: string): ResolvedVideoSource {
  const hash = "d".repeat(64);
  return {
    artifactPath,
    receipt: {
      schema: "gasper.video-source-receipt.v1",
      id: `source-${hash}`,
      sourceKind: "direct_url",
      sourceRef: "https://video.example/step.mp4",
      contentHash: `sha256:${hash}`,
      byteLength: 4,
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

describe("training source service", () => {
  it("resolves linked bytes, persists the source stage, and returns a safe media route", async () => {
    const root = await tempRoot();
    const artifactPath = join(root, "sources", `${"d".repeat(64)}.mp4`);
    await mkdir(join(root, "sources"), { recursive: true });
    await writeFile(artifactPath, "test");
    const service = new TrainingSourceService(root, {
      createSessionId: () => "training-source-1",
      resolveSource: async () => resolved(artifactPath),
    });

    const result = await service.resolveLinked("https://video.example/step.mp4");
    const manifest = await service.store.read("training-source-1");

    expect(result.mediaUrl).toBe(`/__gasper/training/media/${"d".repeat(64)}`);
    expect(manifest.stages.source?.artifactHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(await service.findMediaPath("d".repeat(64))).toBe(artifactPath);
  });

  it("rejects malformed hashes and never resolves media outside the source store", async () => {
    const root = await tempRoot();
    const service = new TrainingSourceService(root, {
      resolveSource: async () => {
        throw new Error("unused");
      },
    });

    await expect(service.findMediaPath("../manifest")).rejects.toThrow(/hash/i);
    await expect(service.findMediaPath("e".repeat(64))).rejects.toThrow(/not found/i);
  });
});
