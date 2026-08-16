import { describe, expect, it, vi } from "vitest";

import { HttpReferenceTrainingApi } from "./HttpReferenceTrainingApi.js";

const SOURCE_HASH = "c".repeat(64);
const receipt = {
  schema: "gasper.video-source-receipt.v1" as const,
  id: `source-${SOURCE_HASH}`,
  sourceKind: "direct_url" as const,
  sourceRef: "https://video.example/move.mp4",
  contentHash: `sha256:${SOURCE_HASH}`,
  byteLength: 1_000,
  media: {
    durationMs: 2_000,
    widthPx: 640,
    heightPx: 360,
    frameRateHz: 60,
    container: "mp4",
    videoCodec: "h264",
  },
  resolver: { id: "fixture", version: "1" },
};

describe("HTTP reference training API", () => {
  it("parses a strict measured source response and forwards cancellation", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(JSON.parse(String(init?.body))).toEqual({ url: "https://video.example/move.mp4" });
      return new Response(
        JSON.stringify({
          ok: true,
          sessionId: "training-session-1",
          receipt,
          mediaUrl: `/__gasper/training/media/${SOURCE_HASH}`,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });
    const api = new HttpReferenceTrainingApi({ fetchImpl });

    const result = await api.resolveLinkedSource(
      "https://video.example/move.mp4",
      new AbortController().signal,
    );

    expect(result.receipt).toEqual(receipt);
    expect(result.sessionId).toBe("training-session-1");
  });

  it("preserves typed provider and availability errors", async () => {
    const api = new HttpReferenceTrainingApi({
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            ok: false,
            code: "PROVIDER_REQUIRED",
            error: "explicit provider adapter required",
          }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        ),
    });

    await expect(
      api.resolveLinkedSource("https://youtu.be/example", new AbortController().signal),
    ).rejects.toMatchObject({ code: "PROVIDER_REQUIRED" });
  });

  it("rejects malformed success responses instead of fabricating a receipt", async () => {
    const api = new HttpReferenceTrainingApi({
      fetchImpl: async () =>
        new Response(JSON.stringify({ ok: true, sessionId: "s1", receipt: { schema: "fake" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    });

    await expect(
      api.resolveLinkedSource("https://video.example/move.mp4", new AbortController().signal),
    ).rejects.toMatchObject({ code: "SOURCE_API_UNAVAILABLE" });
  });
});
