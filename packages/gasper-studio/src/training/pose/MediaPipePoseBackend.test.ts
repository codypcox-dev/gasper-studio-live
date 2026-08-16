import { describe, expect, it } from "vitest";

import type { LandmarkObservation } from "../../../../shared/src/gasper-performance/reference/types.js";
import {
  MediaPipePoseBackend,
  moduleWorkerWasmFileset,
  type MediaPipeLandmarkerPort,
} from "./MediaPipePoseBackend.js";

type FixtureFrame = Readonly<{ id: string }>;

function points(overrides: Partial<LandmarkObservation> = {}): LandmarkObservation[] {
  return Array.from({ length: 33 }, (_, index) => ({
    index,
    x: index / 100,
    y: 0.2 + index / 100,
    z: -index / 1_000,
    visibility: 0.97,
    presence: 0.96,
    ...overrides,
  }));
}

function landmarker(overrides: Partial<MediaPipeLandmarkerPort<FixtureFrame>> = {}) {
  const calls: number[] = [];
  let closes = 0;
  const port: MediaPipeLandmarkerPort<FixtureFrame> = {
    detectForVideo: (_frame, tMs) => {
      calls.push(tMs);
      return {
        landmarks: [points().map(({ index: _index, ...point }) => point)],
        worldLandmarks: [points({ x: 0.1 }).map(({ index: _index, ...point }) => point)],
      };
    },
    close: () => { closes += 1; },
    ...overrides,
  };
  return { port, calls, closes: () => closes };
}

describe("MediaPipePoseBackend", () => {
  it("uses MediaPipe's module-worker loader so ModuleFactory reaches globalThis", () => {
    const fileset = moduleWorkerWasmFileset();
    expect(fileset.wasmLoaderPath).toContain("vision_wasm_module_internal");
    expect(fileset.wasmBinaryPath).toContain("vision_wasm_module_internal");
  });

  it("maps all 33 image and world landmarks without changing the source timestamp", async () => {
    const fake = landmarker();
    const backend = new MediaPipePoseBackend<FixtureFrame>({
      createLandmarker: async () => fake.port,
    });
    const signal = new AbortController().signal;

    await backend.initialize(signal);
    const poses = await backend.observe({ id: "frame-1" }, 83.333, signal);
    await backend.close();

    expect(fake.calls).toEqual([83.333]);
    expect(poses).toHaveLength(1);
    expect(poses[0]?.subjectId).toBe("subject-1");
    expect(poses[0]?.imageLandmarks).toHaveLength(33);
    expect(poses[0]?.imageLandmarks[31]).toMatchObject({ index: 31, x: 0.31, y: 0.51 });
    expect(poses[0]?.worldLandmarks?.[24]).toMatchObject({ index: 24, x: 0.1 });
    expect(poses[0]?.confidence).toBeCloseTo(0.96);
    expect(fake.closes()).toBe(1);
  });

  it("returns an explicit empty detection list instead of fabricating a pose", async () => {
    const fake = landmarker({
      detectForVideo: () => ({ landmarks: [], worldLandmarks: [] }),
    });
    const backend = new MediaPipePoseBackend<FixtureFrame>({
      createLandmarker: async () => fake.port,
    });
    const signal = new AbortController().signal;

    await backend.initialize(signal);
    await expect(backend.observe({ id: "missing" }, 0, signal)).resolves.toEqual([]);
    await backend.close();
  });

  it("rejects malformed landmark counts and non-monotonic video timestamps", async () => {
    const malformed = landmarker({
      detectForVideo: () => ({
        landmarks: [points().slice(0, 32).map(({ index: _index, ...point }) => point)],
        worldLandmarks: [],
      }),
    });
    const malformedBackend = new MediaPipePoseBackend<FixtureFrame>({
      createLandmarker: async () => malformed.port,
    });
    const signal = new AbortController().signal;
    await malformedBackend.initialize(signal);
    await expect(malformedBackend.observe({ id: "bad" }, 0, signal)).rejects.toThrow(/33 landmarks/);
    await malformedBackend.close();

    const valid = landmarker();
    const backend = new MediaPipePoseBackend<FixtureFrame>({
      createLandmarker: async () => valid.port,
    });
    await backend.initialize(signal);
    await backend.observe({ id: "first" }, 16, signal);
    await expect(backend.observe({ id: "duplicate" }, 16, signal)).rejects.toThrow(/strictly increasing/);
    await backend.close();
  });

  it("fails cancellation before model creation", async () => {
    let creates = 0;
    const controller = new AbortController();
    controller.abort();
    const backend = new MediaPipePoseBackend<FixtureFrame>({
      createLandmarker: async () => {
        creates += 1;
        return landmarker().port;
      },
    });

    await expect(backend.initialize(controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(creates).toBe(0);
  });
});
