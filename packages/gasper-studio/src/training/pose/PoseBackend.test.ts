import { describe, expect, it } from "vitest";

import type { LandmarkObservation, PoseDetection } from "../../../../shared/src/gasper-performance/reference/types.js";
import {
  analyzePoseFrames,
  type PoseBackend,
  type TimestampedPoseFrame,
} from "./PoseBackend.js";

type FixtureFrame = Readonly<{ id: string }>;

function landmarks(): LandmarkObservation[] {
  return Array.from({ length: 33 }, (_, index) => ({
    index,
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.95,
    presence: 0.95,
  }));
}

function detection(): PoseDetection {
  return {
    subjectId: "subject-1",
    confidence: 0.95,
    imageLandmarks: landmarks(),
    worldLandmarks: landmarks().map((point) => ({ ...point, x: point.x - 0.5 })),
  };
}

function frames(): TimestampedPoseFrame<FixtureFrame>[] {
  return [
    { tMs: 0, frame: { id: "visible-1" } },
    { tMs: 16.667, frame: { id: "missing" } },
    { tMs: 33.333, frame: { id: "visible-2" } },
  ];
}

function fakeBackend(overrides: Partial<PoseBackend<FixtureFrame>> = {}): PoseBackend<FixtureFrame> {
  return {
    id: "fake-pose",
    version: "1",
    landmarkModel: {
      id: "mediapipe-pose-landmarker",
      version: "fixture",
      landmarkCount: 33,
      semanticIndices: { leftFoot: 31, rightFoot: 32, leftHip: 23, rightHip: 24 },
    },
    initialize: async () => undefined,
    observe: async (frame) => frame.id === "missing" ? [] : [detection()],
    close: async () => undefined,
    ...overrides,
  };
}

describe("pose backend contract", () => {
  it("preserves source timestamps and represents missing detections explicitly", async () => {
    // Break caught: frame-index timing or zero-filled landmarks could turn a
    // detector dropout into fabricated motion mechanics.
    const result = await analyzePoseFrames(
      {
        id: "pose-track-1",
        sourceContentHash: `sha256:${"e".repeat(64)}`,
        durationMs: 40,
        sampleRateHz: 60,
        frames: frames(),
      },
      fakeBackend(),
      new AbortController().signal,
    );

    expect(result.track.frames.map((frame) => frame.tMs)).toEqual([0, 16.667, 33.333]);
    expect(result.track.frames[1]?.poses).toEqual([]);
    expect(result.track.frames[0]?.poses[0]?.worldLandmarks).toHaveLength(33);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "POSE_MISSING", tMs: 16.667 }),
    );
  });

  it("reports progress and closes the backend after a successful analysis", async () => {
    let closed = 0;
    const progress: number[] = [];
    const result = await analyzePoseFrames(
      {
        id: "pose-track-2",
        sourceContentHash: `sha256:${"f".repeat(64)}`,
        durationMs: 40,
        sampleRateHz: 60,
        frames: frames(),
      },
      fakeBackend({ close: async () => { closed += 1; } }),
      new AbortController().signal,
      (value) => progress.push(value.completed / value.total),
    );

    expect(result.track.provenance).toEqual({ analyzer: "fake-pose", analyzerVersion: "1" });
    expect(progress.at(-1)).toBe(1);
    expect(closed).toBe(1);
  });

  it("propagates cancellation and still closes the backend", async () => {
    let closed = 0;
    const controller = new AbortController();
    const backend = fakeBackend({
      observe: async (_frame, tMs) => {
        if (tMs > 0) controller.abort();
        return [detection()];
      },
      close: async () => { closed += 1; },
    });

    await expect(
      analyzePoseFrames(
        {
          id: "pose-track-3",
          sourceContentHash: `sha256:${"1".repeat(64)}`,
          durationMs: 40,
          sampleRateHz: 60,
          frames: frames(),
        },
        backend,
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(closed).toBe(1);
  });
});
