import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type {
  VideoAnalysisSelection,
  VideoSourceReceipt,
} from "../../../../shared/src/gasper-performance/reference/types.js";
import { TrainingSessionStore } from "./TrainingSessionStore.js";

const roots: string[] = [];

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "gasper-training-store-"));
  roots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

function sourceReceipt(): VideoSourceReceipt {
  return {
    schema: "gasper.video-source-receipt.v1",
    id: `source-${"a".repeat(64)}`,
    sourceKind: "direct_url",
    sourceRef: "https://video.example/move.mp4",
    contentHash: `sha256:${"a".repeat(64)}`,
    byteLength: 1_024,
    media: {
      durationMs: 3_000,
      widthPx: 1_920,
      heightPx: 1_080,
      frameRateHz: 60,
      container: "mov,mp4",
      videoCodec: "h264",
    },
    resolver: { id: "fixture", version: "1" },
  };
}

function analysisSelection(): VideoAnalysisSelection {
  return {
    schema: "gasper.video-analysis-selection.v1",
    id: "selection-1",
    sourceContentHash: `sha256:${"a".repeat(64)}`,
    startMs: 500,
    endMs: 2_500,
    crop: { x: 0.1, y: 0.05, width: 0.8, height: 0.9 },
    subjectId: "subject-1",
  };
}

describe("training session store", () => {
  it("writes validated stages atomically and records their canonical hash", async () => {
    // Break caught: a UI stage could claim success while its receipt was torn,
    // invalid, or stored without a content identity.
    const root = await tempRoot();
    const store = new TrainingSessionStore(root, {
      now: () => "2026-08-13T12:00:00.000Z",
    });

    const written = await store.writeStage("session-1", "source", sourceReceipt());
    const manifest = await store.read("session-1");

    expect(written.artifactHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(manifest.stages.source).toEqual(written);
    expect(manifest.revision).toBe(1);
    const bytes = await readFile(join(root, "sessions", "session-1", written.file), "utf8");
    expect(JSON.parse(bytes)).toEqual(sourceReceipt());
  });

  it("rejects invalid artifacts without advancing the session", async () => {
    // Break caught: a failed stage write could leave a manifest pointing at
    // partial or schema-invalid training data.
    const root = await tempRoot();
    const store = new TrainingSessionStore(root);

    await expect(
      store.writeStage("session-2", "source", { ...sourceReceipt(), byteLength: -1 }),
    ).rejects.toThrow(/source|byte|positive|invalid/i);

    await expect(store.read("session-2")).rejects.toThrow(/not found/i);
  });

  it("persists the clip, crop, and subject selection as a first-class stage", async () => {
    // Break caught: analysis could silently use the full clip or wrong person
    // because the user's source selection was only transient browser state.
    const root = await tempRoot();
    const store = new TrainingSessionStore(root, {
      now: () => "2026-08-13T12:00:00.000Z",
    });

    await store.writeStage("session-selection", "source", sourceReceipt());
    const written = await store.writeStage("session-selection", "selection", analysisSelection());
    const manifest = await store.read("session-selection");

    expect(manifest.stages.selection).toEqual(written);
    expect(manifest.revision).toBe(2);
  });

  it("enforces the append-only acceptance ladder before canonical promotion", async () => {
    // Break caught: machine output or architect review could be mislabeled as
    // owner acceptance and enter the behavior library without consent.
    const root = await tempRoot();
    const store = new TrainingSessionStore(root, {
      now: () => "2026-08-13T12:00:00.000Z",
    });
    await store.writeStage("session-3", "source", sourceReceipt());

    await expect(store.promoteCanonical("session-3")).rejects.toThrow(/owner_accepted/i);
    await store.transition("session-3", "machine_valid", "machine gates passed");
    await store.transition("session-3", "architect_reviewed", "architecture reviewed");
    await store.transition("session-3", "owner_accepted", "owner accepted take");

    const promoted = await store.promoteCanonical("session-3");
    expect(promoted.state).toBe("owner_accepted");
    expect(promoted.promotedAt).toBe("2026-08-13T12:00:00.000Z");
    await expect(store.transition("session-3", "machine_valid", "rewind"))
      .rejects.toThrow(/transition|terminal/i);
  });
});
