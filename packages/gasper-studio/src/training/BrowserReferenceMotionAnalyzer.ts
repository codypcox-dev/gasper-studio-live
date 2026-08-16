import {
  deriveMotionMechanics,
  type FloorCalibration,
  type MotionMechanicsSummary,
} from "../../../shared/src/gasper-performance/reference/mechanics.js";
import type {
  LandmarkObservation,
  PoseDetection,
  PoseObservationTrack,
} from "../../../shared/src/gasper-performance/reference/types.js";
import { analyzePoseFrameSource, type PoseBackend } from "./pose/PoseBackend.js";
import { WorkerPoseBackend, browserPoseWorkerSupported } from "./pose/WorkerPoseBackend.js";
import type {
  ReferenceAnalysisResult,
  ReferenceMotionAnalyzer,
} from "./ReferenceTrainingSession.js";
import type { SemanticEvidenceFrameRef } from "./SemanticMotionInterpreter.js";

const DEFAULT_MAX_ANALYSIS_DURATION_MS = 30_000;
const DEFAULT_MAX_SAMPLE_RATE_HZ = 60;
const DEFAULT_MAX_SAMPLES = 1_800;
const CALIBRATION_MIN_VISIBILITY = 0.5;

export interface ReferenceVideoFrameSampler<TFrame> {
  open(mediaUrl: string, signal: AbortSignal): Promise<void>;
  readFrame(tMs: number, signal: AbortSignal): Promise<TFrame>;
  close(): void | Promise<void>;
}

export type BrowserReferenceMotionAnalyzerOptions<TFrame> = Readonly<{
  createBackend?: () => PoseBackend<TFrame>;
  createSampler?: () => ReferenceVideoFrameSampler<TFrame>;
  targetSampleRateHz?: number;
  maxAnalysisDurationMs?: number;
  maxSamples?: number;
}>;

function abortError(): DOMException {
  return new DOMException("reference video analysis aborted", "AbortError");
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) throw new Error("percentile requires observations");
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p)));
  return sorted[index]!;
}

function reliable(
  point: LandmarkObservation | undefined,
  pose: PoseDetection,
  requirePresence: boolean,
): point is LandmarkObservation {
  return Boolean(
    point &&
    pose.confidence >= CALIBRATION_MIN_VISIBILITY &&
    (point.visibility ?? 0) >= CALIBRATION_MIN_VISIBILITY &&
    (!requirePresence || (point.presence ?? 0) >= CALIBRATION_MIN_VISIBILITY),
  );
}

function poseHeight(pose: PoseDetection, requirePresence: boolean): number | null {
  const ys = pose.imageLandmarks
    .filter((point) => reliable(point, pose, requirePresence))
    .map((point) => point.y);
  if (ys.length < 2) return null;
  const height = Math.max(...ys) - Math.min(...ys);
  return Number.isFinite(height) && height > 1e-6 ? height : null;
}

function selectedSubject(track: PoseObservationTrack): string | null {
  const stats = new Map<string, { count: number; confidence: number }>();
  for (const pose of track.frames.flatMap((frame) => frame.poses)) {
    const entry = stats.get(pose.subjectId) ?? { count: 0, confidence: 0 };
    entry.count += 1;
    entry.confidence += pose.confidence;
    stats.set(pose.subjectId, entry);
  }
  return [...stats.entries()]
    .sort((a, b) => b[1].count - a[1].count || b[1].confidence - a[1].confidence)[0]?.[0] ?? null;
}

/**
 * Calibrate only an image-space contact proxy. This never claims metric floor
 * height, mass, force, friction, camera scale, or depth.
 */
export function deriveImageFloorCalibration(track: PoseObservationTrack): FloorCalibration | null {
  const subjectId = selectedSubject(track);
  if (!subjectId) return null;
  const { leftFoot, rightFoot } = track.landmarkModel.semanticIndices;
  const footYs: number[] = [];
  const heights: number[] = [];
  const confidences: number[] = [];
  const speedSamples: Array<Readonly<{ speed: number; y: number; previousY: number }>> = [];
  const previous = new Map<number, Readonly<{ point: LandmarkObservation; tMs: number }>>();
  const requirePresence = track.frames.some((frame) =>
    frame.poses.some((pose) => pose.imageLandmarks.some((point) => point.presence !== undefined)),
  );
  let visibleFrames = 0;

  for (const frame of track.frames) {
    const pose = frame.poses.find((candidate) => candidate.subjectId === subjectId);
    if (!pose) continue;
    const height = poseHeight(pose, requirePresence);
    if (height) heights.push(height);
    let frameHasFoot = false;
    for (const index of [leftFoot, rightFoot]) {
      const point = pose.imageLandmarks[index];
      if (!reliable(point, pose, requirePresence)) {
        previous.delete(index);
        continue;
      }
      frameHasFoot = true;
      footYs.push(point.y);
      confidences.push(Math.min(
        pose.confidence,
        point.visibility ?? 0,
        ...(requirePresence ? [point.presence ?? 0] : []),
      ));
      const prior = previous.get(index);
      if (prior && frame.tMs > prior.tMs) {
        const dtSeconds = (frame.tMs - prior.tMs) / 1_000;
        speedSamples.push({
          speed: Math.hypot(point.x - prior.point.x, point.y - prior.point.y, point.z - prior.point.z) / dtSeconds,
          y: point.y,
          previousY: prior.point.y,
        });
      }
      previous.set(index, { point, tMs: frame.tMs });
    }
    if (frameHasFoot) visibleFrames += 1;
  }

  if (visibleFrames < 3 || footYs.length < 6 || heights.length < 3) return null;
  const floorY = percentile(footYs, 0.9);
  const subjectHeight = percentile(heights, 0.5);
  const tolerance = Math.max(0.015, subjectHeight * 0.06);
  const nearFloorSpeeds = speedSamples
    .filter((sample) =>
      Math.abs(sample.y - floorY) <= tolerance * 1.5 &&
      Math.abs(sample.previousY - floorY) <= tolerance * 1.5)
    .map((sample) => sample.speed);
  const lowMotionSpeed = nearFloorSpeeds.length > 0 ? percentile(nearFloorSpeeds, 0.35) : 0;
  const maxFootSpeedPerSecond = Math.max(subjectHeight * 0.12, lowMotionSpeed * 1.5, 1e-4);
  const coverage = visibleFrames / track.frames.length;
  const confidence = Math.max(
    0,
    Math.min(1, coverage * (confidences.reduce((sum, value) => sum + value, 0) / confidences.length)),
  );

  return {
    subjectId,
    floorY,
    tolerance,
    maxFootSpeedPerSecond,
    minVisibility: CALIBRATION_MIN_VISIBILITY,
    evidence: [{
      kind: "calibrated",
      ref: `calibration:${track.id}:${subjectId}:image-floor:v1`,
      confidence,
    }],
  };
}

function sampleTimestamps(durationMs: number, sampleRateHz: number, maxSamples: number): readonly number[] {
  const intervalMs = 1_000 / sampleRateHz;
  const count = Math.max(1, Math.min(maxSamples, Math.ceil(durationMs / intervalMs)));
  return Array.from({ length: count }, (_, index) => index * intervalMs)
    .filter((tMs) => tMs < durationMs);
}

function evidenceFrames(
  track: PoseObservationTrack,
  mechanics: MotionMechanicsSummary,
): readonly SemanticEvidenceFrameRef[] {
  const subjectId = mechanics.calibration?.subjectId ?? selectedSubject(track);
  if (!subjectId) return [];
  const desiredTimes = [
    ...mechanics.supportEvents.map((event) => event.tMs),
    ...Array.from({ length: 8 }, (_, index) => (track.durationMs * index) / 7),
  ];
  const selected = new Map<string, SemanticEvidenceFrameRef>();
  for (const desired of desiredTimes) {
    const frame = track.frames
      .filter((candidate) => candidate.poses.some((pose) => pose.subjectId === subjectId))
      .reduce<PoseObservationTrack["frames"][number] | null>((best, candidate) =>
        !best || Math.abs(candidate.tMs - desired) < Math.abs(best.tMs - desired) ? candidate : best,
      null);
    if (!frame) continue;
    const key = frame.tMs.toFixed(3);
    selected.set(key, {
      ref: `pose-frame:${track.id}:${subjectId}:${key}`,
      tMs: frame.tMs,
    });
    if (selected.size >= 16) break;
  }
  return [...selected.values()].sort((a, b) => a.tMs - b.tMs);
}

class BrowserVideoFrameSampler implements ReferenceVideoFrameSampler<ImageBitmap> {
  private video: HTMLVideoElement | null = null;

  async open(mediaUrl: string, signal: AbortSignal): Promise<void> {
    throwIfAborted(signal);
    if (typeof document === "undefined" || typeof createImageBitmap !== "function") {
      throw new Error("browser video decoding and ImageBitmap are required for pose analysis");
    }
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.style.display = "none";
    document.body.appendChild(video);
    this.video = video;
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        video.removeEventListener("loadeddata", loaded);
        video.removeEventListener("error", failed);
        signal.removeEventListener("abort", cancelled);
      };
      const loaded = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error("browser could not decode the measured reference video")); };
      const cancelled = () => { cleanup(); reject(abortError()); };
      video.addEventListener("loadeddata", loaded, { once: true });
      video.addEventListener("error", failed, { once: true });
      signal.addEventListener("abort", cancelled, { once: true });
      video.src = mediaUrl;
      video.load();
    });
    throwIfAborted(signal);
  }

  async readFrame(tMs: number, signal: AbortSignal): Promise<ImageBitmap> {
    throwIfAborted(signal);
    const video = this.video;
    if (!video) throw new Error("reference video sampler is not open");
    const targetSeconds = tMs / 1_000;
    if (Math.abs(video.currentTime - targetSeconds) > 0.0005 || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          video.removeEventListener("seeked", seeked);
          video.removeEventListener("error", failed);
          signal.removeEventListener("abort", cancelled);
        };
        const seeked = () => { cleanup(); resolve(); };
        const failed = () => { cleanup(); reject(new Error(`reference video seek failed at ${tMs.toFixed(3)}ms`)); };
        const cancelled = () => { cleanup(); reject(abortError()); };
        video.addEventListener("seeked", seeked, { once: true });
        video.addEventListener("error", failed, { once: true });
        signal.addEventListener("abort", cancelled, { once: true });
        video.currentTime = targetSeconds;
      });
    }
    throwIfAborted(signal);
    return createImageBitmap(video);
  }

  close(): void {
    const video = this.video;
    this.video = null;
    if (!video) return;
    video.pause();
    video.removeAttribute("src");
    video.load();
    video.remove();
  }
}

export function browserReferenceAnalysisSupported(): boolean {
  return typeof document !== "undefined" && browserPoseWorkerSupported();
}

export class BrowserReferenceMotionAnalyzer<TFrame = ImageBitmap> implements ReferenceMotionAnalyzer {
  readonly id = "browser-reference-motion-analyzer";
  readonly version = "1.0.0";
  private readonly createBackend: () => PoseBackend<TFrame>;
  private readonly createSampler: () => ReferenceVideoFrameSampler<TFrame>;
  private readonly targetSampleRateHz: number | undefined;
  private readonly maxAnalysisDurationMs: number;
  private readonly maxSamples: number;

  constructor(options: BrowserReferenceMotionAnalyzerOptions<TFrame> = {}) {
    this.createBackend = options.createBackend ?? (() => new WorkerPoseBackend() as unknown as PoseBackend<TFrame>);
    this.createSampler = options.createSampler ?? (() => new BrowserVideoFrameSampler() as unknown as ReferenceVideoFrameSampler<TFrame>);
    this.targetSampleRateHz = options.targetSampleRateHz;
    this.maxAnalysisDurationMs = options.maxAnalysisDurationMs ?? DEFAULT_MAX_ANALYSIS_DURATION_MS;
    this.maxSamples = options.maxSamples ?? DEFAULT_MAX_SAMPLES;
    if (!(this.maxAnalysisDurationMs > 0) || !(this.maxSamples > 0)) {
      throw new Error("reference analysis bounds must be positive");
    }
  }

  async analyze(
    input: Parameters<ReferenceMotionAnalyzer["analyze"]>[0],
    signal: AbortSignal,
    onProgress: Parameters<ReferenceMotionAnalyzer["analyze"]>[2],
  ): Promise<ReferenceAnalysisResult> {
    throwIfAborted(signal);
    const sourceRate = input.source.media.frameRateHz;
    const requestedRate = this.targetSampleRateHz ?? Math.min(sourceRate, DEFAULT_MAX_SAMPLE_RATE_HZ);
    const sampleRateHz = Math.max(1, Math.min(sourceRate, requestedRate, DEFAULT_MAX_SAMPLE_RATE_HZ));
    const boundedDurationMs = Math.min(input.source.media.durationMs, this.maxAnalysisDurationMs);
    const maxDurationForSamples = (this.maxSamples * 1_000) / sampleRateHz;
    const durationMs = Math.min(boundedDurationMs, maxDurationForSamples);
    const timestampsMs = sampleTimestamps(durationMs, sampleRateHz, this.maxSamples);
    const sampler = this.createSampler();
    await sampler.open(input.mediaUrl, signal);
    try {
      const pose = await analyzePoseFrameSource(
        {
          id: `pose-${input.sessionId}`,
          sourceContentHash: input.source.contentHash,
          durationMs,
          sampleRateHz,
          timestampsMs,
          readFrame: (tMs, _index, activeSignal) => sampler.readFrame(tMs, activeSignal),
        },
        this.createBackend(),
        signal,
        onProgress,
      );
      const calibration = deriveImageFloorCalibration(pose.track);
      const baseMechanics = deriveMotionMechanics(pose.track, calibration);
      const mechanics: MotionMechanicsSummary = {
        ...baseMechanics,
        diagnostics: [
          ...baseMechanics.diagnostics,
          ...pose.diagnostics.map((diagnostic) => ({ ...diagnostic })),
          ...(durationMs < input.source.media.durationMs
            ? [{
                severity: "warning" as const,
                code: "ANALYSIS_INTERVAL_BOUNDED",
                message: `initial analysis used the first ${(durationMs / 1_000).toFixed(2)}s of this short-performance window`,
              }]
            : []),
        ],
      };
      return {
        selection: {
          schema: "gasper.video-analysis-selection.v1",
          id: `selection-${input.sessionId}`,
          sourceContentHash: input.source.contentHash,
          startMs: 0,
          endMs: durationMs,
          crop: { x: 0, y: 0, width: 1, height: 1 },
          subjectId: calibration?.subjectId ?? selectedSubject(pose.track) ?? "subject-1",
        },
        poseTrack: pose.track,
        mechanics,
        evidenceFrames: evidenceFrames(pose.track, mechanics),
      };
    } finally {
      await sampler.close();
    }
  }
}
