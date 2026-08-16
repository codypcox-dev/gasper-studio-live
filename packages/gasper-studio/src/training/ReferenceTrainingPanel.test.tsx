import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ReferenceTrainingPanel } from "./ReferenceTrainingPanel.js";
import { ReferenceTrainingSession } from "./ReferenceTrainingSession.js";

describe("reference training panel", () => {
  it("shows a measured source and does not overclaim missing inference backends", async () => {
    const hash = "9".repeat(64);
    const session = new ReferenceTrainingSession({
      resolveLinkedSource: async () => ({
        sessionId: "training-panel-1",
        mediaUrl: `/__gasper/training/media/${hash}`,
        receipt: {
          schema: "gasper.video-source-receipt.v1",
          id: `source-${hash}`,
          sourceKind: "direct_url",
          sourceRef: "https://video.example/steps.mp4",
          contentHash: `sha256:${hash}`,
          byteLength: 4_096,
          media: {
            durationMs: 2_500,
            widthPx: 1_920,
            heightPx: 1_080,
            frameRateHz: 60,
            container: "mp4",
            videoCodec: "h264",
          },
          resolver: { id: "fixture", version: "1" },
        },
      }),
    });
    await session.linkVideo("https://video.example/steps.mp4");

    const html = renderToStaticMarkup(<ReferenceTrainingPanel session={session} />);

    expect(html).toMatch(/Reference video/i);
    expect(html).toMatch(/Measured source/i);
    expect(html).toMatch(/60\.00 fps/);
    expect(html).toMatch(/Pose backend.*absent/i);
    expect(html).toMatch(/Semantic model.*absent/i);
    expect(html).toContain(`/__gasper/training/media/${hash}`);
    expect(html).not.toMatch(/motion understood|behavior ready/i);
  });
});
