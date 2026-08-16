import { PoseLandmarker } from "@mediapipe/tasks-vision";
import visionWasmModuleLoaderUrl from "@mediapipe/tasks-vision/vision_wasm_module_internal.js?url";
import visionWasmModuleBinaryUrl from "@mediapipe/tasks-vision/vision_wasm_module_internal.wasm?url";

import type {
  LandmarkObservation,
  PoseDetection,
} from "../../../../shared/src/gasper-performance/reference/types.js";
import type { PoseBackend } from "./PoseBackend.js";

export const MEDIAPIPE_POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

export function moduleWorkerWasmFileset(): Readonly<{
  wasmLoaderPath: string;
  wasmBinaryPath: string;
}> {
  return {
    wasmLoaderPath: visionWasmModuleLoaderUrl,
    wasmBinaryPath: visionWasmModuleBinaryUrl,
  };
}

type MediaPipeLandmark = Readonly<{
  x: number;
  y: number;
  z: number;
  visibility?: number;
  presence?: number;
}>;

export type MediaPipePoseResult = Readonly<{
  landmarks: readonly (readonly MediaPipeLandmark[])[];
  worldLandmarks: readonly (readonly MediaPipeLandmark[])[];
}>;

export interface MediaPipeLandmarkerPort<TFrame> {
  detectForVideo(frame: TFrame, tMs: number): MediaPipePoseResult;
  close(): void;
}

export type MediaPipePoseBackendOptions<TFrame> = Readonly<{
  createLandmarker?: (signal: AbortSignal) => Promise<MediaPipeLandmarkerPort<TFrame>>;
  modelAssetPath?: string;
}>;

function abortError(): DOMException {
  return new DOMException("MediaPipe pose analysis aborted", "AbortError");
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

function finiteUnit(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : undefined;
}

function mapLandmarks(points: readonly MediaPipeLandmark[], label: string): LandmarkObservation[] {
  if (points.length !== 33) {
    throw new Error(`MediaPipe ${label} result must contain exactly 33 landmarks`);
  }
  return points.map((point, index) => {
    if (![point.x, point.y, point.z].every(Number.isFinite)) {
      throw new Error(`MediaPipe ${label} landmark ${index} contains a non-finite coordinate`);
    }
    const visibility = finiteUnit(point.visibility);
    const presence = finiteUnit(point.presence);
    return {
      index,
      x: point.x,
      y: point.y,
      z: point.z,
      ...(visibility === undefined ? {} : { visibility }),
      ...(presence === undefined ? {} : { presence }),
    };
  });
}

function semanticConfidence(points: readonly LandmarkObservation[]): number {
  const values = [23, 24, 31, 32].flatMap((index) => {
    const point = points[index];
    return point ? [point.visibility, point.presence].filter((value): value is number => value !== undefined) : [];
  });
  return values.length > 0 ? Math.min(...values) : 0;
}

async function createDefaultLandmarker<TFrame>(
  modelAssetPath: string,
  signal: AbortSignal,
): Promise<MediaPipeLandmarkerPort<TFrame>> {
  throwIfAborted(signal);
  const landmarker = await PoseLandmarker.createFromOptions(
    moduleWorkerWasmFileset(),
    {
      baseOptions: { modelAssetPath, delegate: "CPU" },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    },
  );
  if (signal.aborted) {
    landmarker.close();
    throw abortError();
  }
  return landmarker as unknown as MediaPipeLandmarkerPort<TFrame>;
}

/**
 * Strict adapter around MediaPipe's synchronous VIDEO-mode observer. This file
 * is imported by pose.worker.ts only in production, keeping inference out of
 * React and the organism render clock.
 */
export class MediaPipePoseBackend<TFrame> implements PoseBackend<TFrame> {
  readonly id = "mediapipe-pose-landmarker-full";
  readonly version = "tasks-vision-1.0.1+full-float16-v1";
  readonly landmarkModel = Object.freeze({
    id: "mediapipe-pose-landmarker",
    version: "full-float16-v1",
    landmarkCount: 33,
    semanticIndices: Object.freeze({ leftFoot: 31, rightFoot: 32, leftHip: 23, rightHip: 24 }),
  });

  private landmarker: MediaPipeLandmarkerPort<TFrame> | null = null;
  private lastTimestampMs = -1;
  private readonly createLandmarker: (signal: AbortSignal) => Promise<MediaPipeLandmarkerPort<TFrame>>;

  constructor(options: MediaPipePoseBackendOptions<TFrame> = {}) {
    const modelAssetPath = options.modelAssetPath ?? MEDIAPIPE_POSE_MODEL_URL;
    this.createLandmarker = options.createLandmarker ?? ((signal) =>
      createDefaultLandmarker<TFrame>(modelAssetPath, signal));
  }

  async initialize(signal: AbortSignal): Promise<void> {
    throwIfAborted(signal);
    if (this.landmarker) return;
    this.landmarker = await this.createLandmarker(signal);
    this.lastTimestampMs = -1;
    throwIfAborted(signal);
  }

  async observe(frame: TFrame, tMs: number, signal: AbortSignal): Promise<readonly PoseDetection[]> {
    throwIfAborted(signal);
    if (!this.landmarker) throw new Error("MediaPipe pose backend is not initialized");
    if (!Number.isFinite(tMs) || tMs < 0 || tMs <= this.lastTimestampMs) {
      throw new Error("MediaPipe VIDEO timestamps must be finite, non-negative, and strictly increasing");
    }
    const result = this.landmarker.detectForVideo(frame, tMs);
    this.lastTimestampMs = tMs;
    throwIfAborted(signal);
    if (result.landmarks.length === 0) return [];
    return result.landmarks.map((imagePoints, index) => {
      const imageLandmarks = mapLandmarks(imagePoints, "image");
      const worldPoints = result.worldLandmarks[index];
      const worldLandmarks = worldPoints?.length
        ? mapLandmarks(worldPoints, "world")
        : undefined;
      return {
        subjectId: `subject-${index + 1}`,
        confidence: semanticConfidence(imageLandmarks),
        imageLandmarks,
        ...(worldLandmarks ? { worldLandmarks } : {}),
      };
    });
  }

  async close(): Promise<void> {
    const landmarker = this.landmarker;
    this.landmarker = null;
    this.lastTimestampMs = -1;
    landmarker?.close();
  }
}
