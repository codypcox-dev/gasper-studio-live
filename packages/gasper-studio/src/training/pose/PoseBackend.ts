import { poseObservationTrackSchema } from "../../../../shared/src/gasper-performance/reference/schemas.js";
import type {
  PoseDetection,
  PoseObservationTrack,
} from "../../../../shared/src/gasper-performance/reference/types.js";

export type TimestampedPoseFrame<TFrame> = Readonly<{
  tMs: number;
  frame: TFrame;
}>;

export type PoseBackendProgress = Readonly<{
  completed: number;
  total: number;
  tMs: number;
}>;

export type PoseAnalysisDiagnostic = Readonly<{
  severity: "info" | "warning" | "error";
  code: "POSE_MISSING";
  message: string;
  tMs: number;
}>;

export interface PoseBackend<TFrame> {
  readonly id: string;
  readonly version: string;
  readonly landmarkModel: PoseObservationTrack["landmarkModel"];
  initialize(signal: AbortSignal): Promise<void>;
  observe(frame: TFrame, tMs: number, signal: AbortSignal): Promise<readonly PoseDetection[]>;
  close(): Promise<void>;
}

export type PoseAnalysisInput<TFrame> = Readonly<{
  id: string;
  sourceContentHash: string;
  durationMs: number;
  sampleRateHz: number;
  frames: readonly TimestampedPoseFrame<TFrame>[];
}>;

export type StreamingPoseAnalysisInput<TFrame> = Readonly<{
  id: string;
  sourceContentHash: string;
  durationMs: number;
  sampleRateHz: number;
  timestampsMs: readonly number[];
  readFrame(tMs: number, index: number, signal: AbortSignal): Promise<TFrame>;
  releaseFrame?(frame: TFrame): void | Promise<void>;
}>;

export type PoseAnalysisResult = Readonly<{
  track: PoseObservationTrack;
  diagnostics: readonly PoseAnalysisDiagnostic[];
}>;

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException("pose analysis aborted", "AbortError");
}

function validateAnalysisWindow(
  durationMs: number,
  sampleRateHz: number,
  timestampsMs: readonly number[],
): void {
  if (timestampsMs.length === 0) throw new Error("pose analysis requires timestamped frames");
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("pose analysis duration must be positive");
  }
  if (!Number.isFinite(sampleRateHz) || sampleRateHz <= 0) {
    throw new Error("pose analysis sample rate must be positive");
  }
  let previousTMs = -1;
  for (const tMs of timestampsMs) {
    if (!Number.isFinite(tMs) || tMs < 0 || tMs <= previousTMs) {
      throw new Error("pose frame timestamps must be finite and strictly monotonic");
    }
    if (tMs > durationMs) throw new Error("pose frame timestamp exceeds source duration");
    previousTMs = tMs;
  }
}

/**
 * Stream decoded frames through the observation backend one at a time. This
 * keeps long clips bounded and lets the browser transfer each ImageBitmap to a
 * Worker without retaining a second decoded copy on the UI thread.
 */
export async function analyzePoseFrameSource<TFrame>(
  input: StreamingPoseAnalysisInput<TFrame>,
  backend: PoseBackend<TFrame>,
  signal: AbortSignal,
  onProgress?: (progress: PoseBackendProgress) => void,
): Promise<PoseAnalysisResult> {
  validateAnalysisWindow(input.durationMs, input.sampleRateHz, input.timestampsMs);

  const frames: PoseObservationTrack["frames"][number][] = [];
  const diagnostics: PoseAnalysisDiagnostic[] = [];
  throwIfAborted(signal);
  try {
    await backend.initialize(signal);
    throwIfAborted(signal);
    for (let index = 0; index < input.timestampsMs.length; index += 1) {
      const tMs = input.timestampsMs[index]!;
      throwIfAborted(signal);
      const decoded = await input.readFrame(tMs, index, signal);
      let poses: readonly PoseDetection[];
      try {
        throwIfAborted(signal);
        poses = await backend.observe(decoded, tMs, signal);
        throwIfAborted(signal);
      } finally {
        await input.releaseFrame?.(decoded);
      }
      if (poses.length === 0) {
        diagnostics.push({
          severity: "warning",
          code: "POSE_MISSING",
          message: "the observation backend detected no subject at this timestamp",
          tMs,
        });
      }
      frames.push({ tMs, poses: [...poses] });
      onProgress?.({ completed: index + 1, total: input.timestampsMs.length, tMs });
    }

    const track = poseObservationTrackSchema.parse({
      schema: "gasper.pose-observation-track.v1",
      id: input.id,
      sourceContentHash: input.sourceContentHash,
      durationMs: input.durationMs,
      sampleRateHz: input.sampleRateHz,
      landmarkModel: backend.landmarkModel,
      frames,
      provenance: { analyzer: backend.id, analyzerVersion: backend.version },
    }) as PoseObservationTrack;
    return { track, diagnostics };
  } finally {
    await backend.close();
  }
}

/**
 * Run one replaceable observation backend against timestamped decoded frames.
 * This owns neither decoding nor UI state; a Worker can call it without any
 * React/runtime dependency. Missing detections remain explicit empty arrays.
 */
export async function analyzePoseFrames<TFrame>(
  input: PoseAnalysisInput<TFrame>,
  backend: PoseBackend<TFrame>,
  signal: AbortSignal,
  onProgress?: (progress: PoseBackendProgress) => void,
): Promise<PoseAnalysisResult> {
  return analyzePoseFrameSource(
    {
      id: input.id,
      sourceContentHash: input.sourceContentHash,
      durationMs: input.durationMs,
      sampleRateHz: input.sampleRateHz,
      timestampsMs: input.frames.map((sample) => sample.tMs),
      readFrame: async (_tMs, index) => input.frames[index]!.frame,
    },
    backend,
    signal,
    onProgress,
  );
}
