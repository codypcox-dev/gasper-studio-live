import { describe, expect, it } from "vitest";

import type { LandmarkObservation, PoseDetection } from "../../../shared/src/gasper-performance/reference/types.js";
import type { PoseBackend } from "./pose/PoseBackend.js";
import {
  BrowserReferenceMotionAnalyzer,
  deriveImageFloorCalibration,
  type ReferenceVideoFrameSampler,
} from "./BrowserReferenceMotionAnalyzer.js";

type FixtureFrame = Readonly<{ tMs: number }>;

function pose(leftY: number, rightY: number, rootX: number): PoseDetection {
  const imageLandmarks: LandmarkObservation[] = Array.from({ length: 33 }, (_, index) => ({
    index,
    x: index === 23 || index === 24 ? rootX : 0.5,
    y: index < 11 ? 0.1 : 0.5,
    z: 0,
    visibility: 0.98,
    presence: 0.98,
  }));
  imageLandmarks[31] = { ...imageLandmarks[31]!, x: 0.42, y: leftY };
  imageLandmarks[32] = { ...imageLandmarks[32]!, x: 0.58, y: rightY };
  return { subjectId: "subject-1", confidence: 0.98, imageLandmarks };
}

function backend(): PoseBackend<FixtureFrame> {
  return {
    id: "fixture-worker-pose",
    version: "1",
    landmarkModel: {
      id: "mediapipe-pose-landmarker",
      version: "fixture",
      landmarkCount: 33,
      semanticIndices: { leftFoot: 31, rightFoot: 32, leftHip: 23, rightHip: 24 },
    },
    initialize: async () => undefined,
    observe: async (frame) => {
      const phase = Math.floor(frame.tMs / 250) % 2;
      return phase === 0
        ? [pose(0.9, 0.78, 0.5 + frame.tMs / 10_000)]
        : [pose(0.78, 0.9, 0.5 + frame.tMs / 10_000)];
    },
    close: async () => undefined,
  };
}

function sampler(): ReferenceVideoFrameSampler<FixtureFrame> {
  return {
    open: async () => undefined,
    readFrame: async (tMs) => ({ tMs }),
    close: async () => undefined,
  };
}

describe("BrowserReferenceMotionAnalyzer", () => {
  it("preserves a short source interval, derives calibrated support, and emits bounded evidence refs", async () => {
    const analyzer = new BrowserReferenceMotionAnalyzer<FixtureFrame>({
      createBackend: backend,
      createSampler: sampler,
      targetSampleRateHz: 20,
      maxSamples: 80,
    });
    const progress: number[] = [];
    const result = await analyzer.analyze(
      {
        sessionId: "session-1",
        mediaUrl: "/api/reference-training/media/hash.mp4",
        source: {
          schema: "gasper.video-source-receipt.v1",
          id: "source-1",
          sourceKind: "direct_url",
          sourceRef: "https://example.test/step.mp4",
          contentHash: `sha256:${"a".repeat(64)}`,
          byteLength: 1_024,
          media: {
            durationMs: 1_000,
            widthPx: 1280,
            heightPx: 720,
            frameRateHz: 30,
            container: "mp4",
            videoCodec: "h264",
          },
          resolver: { id: "fixture", version: "1" },
        },
      },
      new AbortController().signal,
      (value) => progress.push(value.completed / value.total),
    );

    expect(result.selection).toMatchObject({ startMs: 0, endMs: 1_000, subjectId: "subject-1" });
    expect(result.poseTrack.frames[0]?.tMs).toBe(0);
    expect(result.poseTrack.frames.at(-1)?.tMs).toBeLessThan(1_000);
    expect(result.poseTrack.provenance.analyzer).toBe("fixture-worker-pose");
    expect(result.mechanics.calibration?.evidence[0]?.kind).toBe("calibrated");
    expect(result.mechanics.supportEvents.map((event) => event.support)).toEqual([
      "source_left",
      "source_right",
      "source_left",
      "source_right",
    ]);
    expect(result.evidenceFrames.length).toBeGreaterThanOrEqual(4);
    expect(new Set(result.evidenceFrames.map((entry) => entry.ref)).size).toBe(result.evidenceFrames.length);
    expect(progress.at(-1)).toBe(1);
  });

  it("does not claim floor contact when there is insufficient visible foot evidence", () => {
    const calibration = deriveImageFloorCalibration({
      schema: "gasper.pose-observation-track.v1",
      id: "track-empty",
      sourceContentHash: `sha256:${"b".repeat(64)}`,
      durationMs: 100,
      sampleRateHz: 30,
      landmarkModel: backend().landmarkModel,
      frames: [{ tMs: 0, poses: [] }],
      provenance: { analyzer: "fixture", analyzerVersion: "1" },
    });
    expect(calibration).toBeNull();
  });

  it("calibrates a visibility-only model when presence is absent across the track", () => {
    const visibilityOnly = (detection: PoseDetection): PoseDetection => ({
      ...detection,
      imageLandmarks: detection.imageLandmarks.map((point) => {
        const { presence: _presence, ...visible } = point;
        return visible;
      }),
    });
    const calibration = deriveImageFloorCalibration({
      schema: "gasper.pose-observation-track.v1",
      id: "track-visibility-only",
      sourceContentHash: `sha256:${"c".repeat(64)}`,
      durationMs: 100,
      sampleRateHz: 20,
      landmarkModel: backend().landmarkModel,
      frames: [
        { tMs: 0, poses: [visibilityOnly(pose(0.9, 0.78, 0.5))] },
        { tMs: 50, poses: [visibilityOnly(pose(0.9, 0.78, 0.5))] },
        { tMs: 100, poses: [visibilityOnly(pose(0.9, 0.78, 0.5))] },
      ],
      provenance: { analyzer: "mediapipe", analyzerVersion: "1.0.1" },
    });

    expect(calibration).toMatchObject({ subjectId: "subject-1", floorY: 0.9 });
  });
});
