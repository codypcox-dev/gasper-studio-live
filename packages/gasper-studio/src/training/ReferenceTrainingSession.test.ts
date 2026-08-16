import { describe, expect, it } from "vitest";

import type { VideoSourceReceipt } from "../../../shared/src/gasper-performance/reference/types.js";
import {
  ReferenceTrainingSession,
  ReferenceTrainingApiError,
  type ReferenceTrainingApi,
} from "./ReferenceTrainingSession.js";

function receipt(): VideoSourceReceipt {
  return {
    schema: "gasper.video-source-receipt.v1",
    id: `source-${"b".repeat(64)}`,
    sourceKind: "direct_url",
    sourceRef: "https://video.example/footwork.mp4",
    contentHash: `sha256:${"b".repeat(64)}`,
    byteLength: 2_048,
    media: {
      durationMs: 4_000,
      widthPx: 1_280,
      heightPx: 720,
      frameRateHz: 59.94,
      container: "mov,mp4",
      videoCodec: "h264",
    },
    resolver: { id: "fixture", version: "1" },
  };
}

describe("reference training session", () => {
  it("owns one revisioned source transaction and exposes honest backend availability", async () => {
    // Break caught: UI, MCP, and analysis could drift into separate sessions or
    // claim semantic/pose capability that is not actually installed.
    const api: ReferenceTrainingApi = {
      resolveLinkedSource: async () => ({
        sessionId: "session-video-1",
        receipt: receipt(),
        mediaUrl: `/__gasper/training/media/${"b".repeat(64)}`,
      }),
    };
    const session = new ReferenceTrainingSession(api, {
      poseBackend: "absent",
      semanticProvider: "absent",
    });

    const result = await session.linkVideo("https://video.example/footwork.mp4");
    const snapshot = session.snapshot();

    expect(result.ok).toBe(true);
    expect(snapshot.status).toBe("source_ready");
    expect(snapshot.sessionId).toBe("session-video-1");
    expect(snapshot.source?.contentHash).toBe(receipt().contentHash);
    expect(snapshot.availability).toEqual({
      poseBackend: "absent",
      semanticProvider: "absent",
      persistence: "absent",
      preview: "absent",
    });
    expect(snapshot.diagnostics.map((entry) => entry.code)).toEqual([
      "POSE_BACKEND_ABSENT",
      "SEMANTIC_PROVIDER_ABSENT",
      "PERSISTENCE_FAILED",
      "PREVIEW_UNAVAILABLE",
    ]);
    expect(snapshot.revision).toBe(2);
  });

  it("cancels in-flight resolution without publishing stale source state", async () => {
    // Break caught: choosing a second clip or pressing cancel could allow the
    // first network operation to overwrite the visible training transaction.
    let observedSignal: AbortSignal | undefined;
    const api: ReferenceTrainingApi = {
      resolveLinkedSource: (_url, signal) => {
        observedSignal = signal;
        return new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        });
      },
    };
    const session = new ReferenceTrainingSession(api);
    const pending = session.linkVideo("https://video.example/slow.mp4");

    expect(session.snapshot().status).toBe("resolving");
    session.cancel();
    const result = await pending;

    expect(observedSignal?.aborted).toBe(true);
    expect(result).toMatchObject({ ok: false, code: "ABORTED" });
    expect(session.snapshot().status).toBe("empty");
    expect(session.snapshot().source).toBeNull();
  });

  it("surfaces provider requirements and refuses analysis without a pose backend", async () => {
    // Break caught: a provider page or missing analyzer could silently fall
    // back to pretend motion understanding.
    const providerApi: ReferenceTrainingApi = {
      resolveLinkedSource: async () => {
        throw new ReferenceTrainingApiError(
          "PROVIDER_REQUIRED",
          "linked provider pages require an explicit adapter",
        );
      },
    };
    const providerSession = new ReferenceTrainingSession(providerApi);
    await expect(providerSession.linkVideo("https://youtu.be/example"))
      .resolves.toMatchObject({ ok: false, code: "PROVIDER_REQUIRED" });
    expect(providerSession.snapshot()).toMatchObject({ status: "blocked", errorCode: "PROVIDER_REQUIRED" });

    const sourceSession = new ReferenceTrainingSession({
      resolveLinkedSource: async () => ({
        sessionId: "session-video-2",
        receipt: receipt(),
        mediaUrl: "/media/video",
      }),
    });
    await sourceSession.linkVideo("https://video.example/footwork.mp4");
    await expect(sourceSession.analyze()).resolves.toMatchObject({ ok: false, code: "POSE_BACKEND_ABSENT" });
    expect(sourceSession.snapshot().status).toBe("blocked");
  });
});
