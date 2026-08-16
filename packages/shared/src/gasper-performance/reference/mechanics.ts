import { sha256OfCanonical } from "../hashing.js";
import { z } from "zod";
import {
  evidenceRefSchema,
  motionScoreSchema,
  poseObservationTrackSchema,
} from "./schemas.js";
import type {
  EvidenceRef,
  MotionScore,
  PoseDetection,
  PoseObservationTrack,
} from "./types.js";

export type SourceSupportId = "source_left" | "source_right";

export type FloorCalibration = Readonly<{
  /** Stable subject selected for mechanics inference. */
  subjectId: string;
  /** Image-space y coordinate of the observed floor. */
  floorY: number;
  /** Maximum normalized image-space foot-to-floor distance. */
  tolerance: number;
  /** Maximum normalized image-space foot speed for a planted contact. */
  maxFootSpeedPerSecond: number;
  minVisibility: number;
  evidence: readonly EvidenceRef[];
}>;

export type MechanicsDiagnostic = Readonly<{
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  tMs?: number;
}>;

export type SupportEvent = Readonly<{
  id: string;
  sourceFrameIndex: number;
  tMs: number;
  support: SourceSupportId;
  confidence: number;
  footHeightError: number;
  footSpeedPerSecond: number;
  rootSpeedPerSecond: number;
  evidence: readonly EvidenceRef[];
}>;

export type RootMotionSample = Readonly<{
  sourceFrameIndex: number;
  tMs: number;
  /** Subject root in normalized image space. */
  imageX: number;
  imageY: number;
  /** Lateral displacement normalized by the first observed subject height. */
  normalizedX: number;
  /** Always zero until a calibrated depth source exists. */
  normalizedDepth: 0;
  normalizedVelocityXPerSecond: number;
  confidence: number;
  evidence: readonly EvidenceRef[];
}>;

export type RootMotionSummary = Readonly<{
  normalization: "initial_subject_image_height";
  subjectId: string;
  scaleImageHeight: number;
  samples: readonly RootMotionSample[];
  netNormalizedDisplacement: Readonly<{ x: number; depth: 0 }>;
  direction: "stationary" | "left" | "right";
  confidence: number;
}>;

export type MotionMechanicsSummary = Readonly<{
  schema: "gasper.motion-mechanics.v1";
  sourceTrackId: string;
  sourceObservationHash: string;
  durationMs: number;
  sourceFrameCount: number;
  calibration: FloorCalibration | null;
  rootMotion: RootMotionSummary | null;
  supportEvents: readonly SupportEvent[];
  diagnostics: readonly MechanicsDiagnostic[];
  unavailable: readonly (
    | "floor_contact"
    | "absolute_force"
    | "absolute_mass"
    | "surface_friction"
    | "absolute_scale"
    | "depth_travel"
  )[];
}>;

const finite = z.number().finite();
const unitInterval = finite.min(0).max(1);
const floorCalibrationSchema = z
  .object({
    subjectId: z.string().trim().min(1),
    floorY: finite,
    tolerance: finite.positive(),
    maxFootSpeedPerSecond: finite.positive(),
    minVisibility: unitInterval,
    evidence: z.array(evidenceRefSchema).min(1),
  })
  .strict();
const supportEventSchema = z
  .object({
    id: z.string().trim().min(1),
    sourceFrameIndex: z.number().int().nonnegative(),
    tMs: finite.nonnegative(),
    support: z.enum(["source_left", "source_right"]),
    confidence: unitInterval,
    footHeightError: finite.nonnegative(),
    footSpeedPerSecond: finite.nonnegative(),
    rootSpeedPerSecond: finite.nonnegative(),
    evidence: z.array(evidenceRefSchema).min(1),
  })
  .strict();
const rootMotionSampleSchema = z
  .object({
    sourceFrameIndex: z.number().int().nonnegative(),
    tMs: finite.nonnegative(),
    imageX: finite,
    imageY: finite,
    normalizedX: finite,
    normalizedDepth: z.literal(0),
    normalizedVelocityXPerSecond: finite,
    confidence: unitInterval,
    evidence: z.array(evidenceRefSchema).min(1),
  })
  .strict();
const rootMotionSummarySchema = z
  .object({
    normalization: z.literal("initial_subject_image_height"),
    subjectId: z.string().trim().min(1),
    scaleImageHeight: finite.positive(),
    samples: z.array(rootMotionSampleSchema).min(1),
    netNormalizedDisplacement: z.object({ x: finite, depth: z.literal(0) }).strict(),
    direction: z.enum(["stationary", "left", "right"]),
    confidence: unitInterval,
  })
  .strict();

export const motionMechanicsSummarySchema = z
  .object({
    schema: z.literal("gasper.motion-mechanics.v1"),
    sourceTrackId: z.string().trim().min(1),
    sourceObservationHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
    durationMs: finite.positive(),
    sourceFrameCount: z.number().int().positive(),
    calibration: floorCalibrationSchema.nullable(),
    rootMotion: rootMotionSummarySchema.nullable(),
    supportEvents: z.array(supportEventSchema),
    diagnostics: z.array(z.object({
      severity: z.enum(["info", "warning", "error"]),
      code: z.string().trim().min(1),
      message: z.string().trim().min(1),
      tMs: finite.nonnegative().optional(),
    }).strict()),
    unavailable: z.array(z.enum([
      "floor_contact",
      "absolute_force",
      "absolute_mass",
      "surface_friction",
      "absolute_scale",
      "depth_travel",
    ])),
  })
  .strict()
  .superRefine((mechanics, ctx) => {
    let previous = -1;
    for (let index = 0; index < mechanics.supportEvents.length; index += 1) {
      const event = mechanics.supportEvents[index]!;
      if (event.tMs < previous || event.tMs > mechanics.durationMs) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["supportEvents", index, "tMs"], message: "support events must be ordered inside the source duration" });
      }
      previous = event.tMs;
    }
    previous = -1;
    for (let index = 0; index < (mechanics.rootMotion?.samples.length ?? 0); index += 1) {
      const sample = mechanics.rootMotion!.samples[index]!;
      if (sample.tMs <= previous || sample.tMs > mechanics.durationMs) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rootMotion", "samples", index, "tMs"], message: "root motion samples must be strictly ordered inside the source duration" });
      }
      previous = sample.tMs;
    }
  });

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function pointSpeed(
  current: Readonly<{ x: number; y: number; z: number }>,
  previous: Readonly<{ x: number; y: number; z: number }> | undefined,
  dtSeconds: number,
): number {
  if (!previous || !(dtSeconds > 0)) return 0;
  return Math.hypot(
    current.x - previous.x,
    current.y - previous.y,
    current.z - previous.z,
  ) / dtSeconds;
}

function rootPoint(
  pose: PoseDetection,
  indices: PoseObservationTrack["landmarkModel"]["semanticIndices"],
): Readonly<{
  x: number;
  y: number;
  z: number;
}> {
  const left = pose.imageLandmarks[indices.leftHip]!;
  const right = pose.imageLandmarks[indices.rightHip]!;
  return {
    x: (left.x + right.x) / 2,
    y: (left.y + right.y) / 2,
    z: (left.z + right.z) / 2,
  };
}

function poseImageHeight(pose: PoseDetection, requirePresence: boolean): number | null {
  const visible = pose.imageLandmarks.filter((point) =>
    (point.visibility ?? 0) > 0.25 && (!requirePresence || (point.presence ?? 0) > 0.25),
  );
  if (visible.length < 2) return null;
  const ys = visible.map((point) => point.y);
  const height = Math.max(...ys) - Math.min(...ys);
  return Number.isFinite(height) && height > 1e-6 ? height : null;
}

function deriveRootMotion(
  track: PoseObservationTrack,
  subjectId: string | undefined,
  requirePresence: boolean,
): RootMotionSummary | null {
  if (!subjectId) return null;
  const samples: RootMotionSample[] = [];
  let initialRoot: ReturnType<typeof rootPoint> | null = null;
  let scaleImageHeight: number | null = null;
  let previousNormalizedX: number | null = null;
  let previousTMs: number | null = null;
  const indices = track.landmarkModel.semanticIndices;
  for (let sourceFrameIndex = 0; sourceFrameIndex < track.frames.length; sourceFrameIndex += 1) {
    const frame = track.frames[sourceFrameIndex]!;
    const pose = frame.poses.find((candidate) => candidate.subjectId === subjectId);
    if (!pose) continue;
    const root = rootPoint(pose, indices);
    const height = poseImageHeight(pose, requirePresence);
    if (!initialRoot || !scaleImageHeight) {
      if (!height) continue;
      initialRoot = root;
      scaleImageHeight = height;
    }
    const normalizedX = (root.x - initialRoot.x) / scaleImageHeight;
    const dtSeconds = previousTMs === null ? 0 : (frame.tMs - previousTMs) / 1_000;
    const normalizedVelocityXPerSecond =
      previousNormalizedX === null || !(dtSeconds > 0)
        ? 0
        : (normalizedX - previousNormalizedX) / dtSeconds;
    const leftHip = pose.imageLandmarks[indices.leftHip]!;
    const rightHip = pose.imageLandmarks[indices.rightHip]!;
    const confidence = Math.min(
      pose.confidence,
      leftHip.visibility ?? 0,
      rightHip.visibility ?? 0,
      ...(requirePresence
        ? [leftHip.presence ?? 0, rightHip.presence ?? 0]
        : []),
    );
    samples.push({
      sourceFrameIndex,
      tMs: frame.tMs,
      imageX: root.x,
      imageY: root.y,
      normalizedX,
      normalizedDepth: 0,
      normalizedVelocityXPerSecond,
      confidence,
      evidence: [{
        kind: "derived",
        ref: `pose-frame:${track.id}:${subjectId}:${frame.tMs.toFixed(3)}:root`,
        confidence,
      }],
    });
    previousNormalizedX = normalizedX;
    previousTMs = frame.tMs;
  }
  if (!scaleImageHeight || samples.length === 0) return null;
  const displacement = samples.at(-1)!.normalizedX - samples[0]!.normalizedX;
  const direction = Math.abs(displacement) < 0.01
    ? "stationary" as const
    : displacement < 0
      ? "left" as const
      : "right" as const;
  return {
    normalization: "initial_subject_image_height",
    subjectId,
    scaleImageHeight,
    samples,
    netNormalizedDisplacement: { x: displacement, depth: 0 },
    direction,
    confidence: samples.reduce((sum, sample) => sum + sample.confidence, 0) / samples.length,
  };
}

/**
 * Derive mechanics from actual timestamps and explicit calibration.
 *
 * The result contains observations and proxies only. It never estimates
 * absolute force, mass, surface friction, or world-space scale from pixels.
 */
export function deriveMotionMechanics(
  input: PoseObservationTrack | unknown,
  calibration: FloorCalibration | null,
): MotionMechanicsSummary {
  const track = poseObservationTrackSchema.parse(input) as PoseObservationTrack;
  const sourceObservationHash = `sha256:${sha256OfCanonical(track)}`;
  const unavailable: MotionMechanicsSummary["unavailable"] = calibration
    ? ["absolute_force", "absolute_mass", "surface_friction", "absolute_scale", "depth_travel"]
    : ["floor_contact", "absolute_force", "absolute_mass", "surface_friction", "absolute_scale", "depth_travel"];
  const diagnostics: MechanicsDiagnostic[] = [];
  const supportEvents: SupportEvent[] = [];
  const requirePresence = track.frames.some((frame) =>
    frame.poses.some((pose) => pose.imageLandmarks.some((point) => point.presence !== undefined)),
  );
  const selectedSubjectId = calibration?.subjectId ?? track.frames.flatMap((frame) => frame.poses)[0]?.subjectId;
  const rootMotion = deriveRootMotion(track, selectedSubjectId, requirePresence);

  if (!calibration) {
    diagnostics.push({
      severity: "warning",
      code: "FLOOR_CALIBRATION_REQUIRED",
      message: "support contact is unavailable until the observed floor is calibrated",
    });
    return {
      schema: "gasper.motion-mechanics.v1",
      sourceTrackId: track.id,
      sourceObservationHash,
      durationMs: track.durationMs,
      sourceFrameCount: track.frames.length,
      calibration: null,
      rootMotion,
      supportEvents,
      diagnostics,
      unavailable,
    };
  }

  if (
    !calibration.subjectId.trim() ||
    !Number.isFinite(calibration.floorY) ||
    !Number.isFinite(calibration.tolerance) || calibration.tolerance <= 0 ||
    !Number.isFinite(calibration.maxFootSpeedPerSecond) || calibration.maxFootSpeedPerSecond <= 0 ||
    !Number.isFinite(calibration.minVisibility) ||
    calibration.minVisibility < 0 || calibration.minVisibility > 1 ||
    calibration.evidence.length === 0
  ) {
    throw new Error("invalid floor calibration");
  }

  let activeSupport: SourceSupportId | null = null;
  let previousPose: PoseDetection | undefined;
  let previousTMs: number | undefined;
  let inDetectionGap = false;
  const semanticIndices = track.landmarkModel.semanticIndices;
  for (let sourceFrameIndex = 0; sourceFrameIndex < track.frames.length; sourceFrameIndex += 1) {
    const frame = track.frames[sourceFrameIndex]!;
    const pose = frame.poses.find((candidate) => candidate.subjectId === calibration.subjectId);
    if (!pose) {
      if (!inDetectionGap) {
        diagnostics.push({
          severity: "warning",
          code: "DETECTION_GAP",
          message: `selected subject ${calibration.subjectId} was not detected`,
          tMs: frame.tMs,
        });
      }
      inDetectionGap = true;
      activeSupport = null;
      previousPose = undefined;
      previousTMs = undefined;
      continue;
    }
    inDetectionGap = false;
    const dtSeconds = previousTMs === undefined ? 0 : (frame.tMs - previousTMs) / 1_000;
    const rootSpeedPerSecond = pointSpeed(
      rootPoint(pose, semanticIndices),
      previousPose ? rootPoint(previousPose, semanticIndices) : undefined,
      dtSeconds,
    );
    const candidates = (["source_left", "source_right"] as const).map((support) => {
      const index = support === "source_left" ? semanticIndices.leftFoot : semanticIndices.rightFoot;
      const foot = pose.imageLandmarks[index]!;
      const previousFoot = previousPose?.imageLandmarks[index];
      const footSpeedPerSecond = pointSpeed(foot, previousFoot, dtSeconds);
      const footHeightError = Math.abs(foot.y - calibration.floorY);
      const visibility = Math.min(
        pose.confidence,
        foot.visibility ?? 0,
        ...(requirePresence ? [foot.presence ?? 0] : []),
      );
      const heightConfidence = clamp01(1 - footHeightError / calibration.tolerance);
      const speedConfidence = clamp01(1 - footSpeedPerSecond / calibration.maxFootSpeedPerSecond);
      const confidence = Math.min(visibility, heightConfidence, speedConfidence);
      const qualifies =
        visibility >= calibration.minVisibility &&
        footHeightError <= calibration.tolerance &&
        footSpeedPerSecond <= calibration.maxFootSpeedPerSecond;
      return {
        support,
        qualifies,
        confidence,
        footHeightError,
        footSpeedPerSecond,
        rootSpeedPerSecond,
      };
    });
    const qualified = candidates
      .filter((candidate) => candidate.qualifies)
      .sort((a, b) => b.confidence - a.confidence);
    const selected =
      qualified.find((candidate) => candidate.support === activeSupport) ?? qualified[0];
    if (selected && selected.support !== activeSupport) {
      supportEvents.push({
        id: `support-${supportEvents.length + 1}`,
        sourceFrameIndex,
        tMs: frame.tMs,
        support: selected.support,
        confidence: selected.confidence,
        footHeightError: selected.footHeightError,
        footSpeedPerSecond: selected.footSpeedPerSecond,
        rootSpeedPerSecond: selected.rootSpeedPerSecond,
        evidence: [
          ...calibration.evidence,
          {
            kind: "derived",
            ref: `pose-frame:${track.id}:${calibration.subjectId}:${frame.tMs.toFixed(3)}:${selected.support}`,
            confidence: selected.confidence,
          },
        ],
      });
      activeSupport = selected.support;
    }
    previousPose = pose;
    previousTMs = frame.tMs;
  }

  if (supportEvents.length === 0) {
    diagnostics.push({
      severity: "warning",
      code: "NO_SUPPORT_EVENTS",
      message: "no foot satisfied the calibrated height, speed, and visibility contact gate",
    });
  }

  return {
    schema: "gasper.motion-mechanics.v1",
    sourceTrackId: track.id,
    sourceObservationHash,
    durationMs: track.durationMs,
    sourceFrameCount: track.frames.length,
    calibration,
    rootMotion,
    supportEvents,
    diagnostics,
    unavailable,
  };
}

/**
 * Compile only measured/derived support events into a draft score. A semantic
 * interpreter may enrich purpose and labels later but cannot erase these
 * event boundaries without recording a conflict.
 */
export function compileMechanicsDraftScore(
  mechanicsInput: MotionMechanicsSummary | unknown,
  id: string,
): MotionScore {
  if (!id.trim()) throw new Error("draft Motion Score id is required");
  const mechanics = motionMechanicsSummarySchema.parse(mechanicsInput) as MotionMechanicsSummary;
  if (mechanics.supportEvents.length === 0) {
    throw new Error("cannot compile a mechanics draft without support events");
  }
  const maxFootSpeed = mechanics.calibration?.maxFootSpeedPerSecond ?? 1;
  const beats = mechanics.supportEvents.map((event, index) => {
    const previous = mechanics.supportEvents[index - 1];
    const next = mechanics.supportEvents[index + 1];
    const primitive = index === 0 ? "plant" as const : "support_exchange" as const;
    const order = previous ? [previous.support, event.support] : [event.support];
    const t1Ms = next?.tMs ?? mechanics.durationMs;
    const nextFrameIndex = next?.sourceFrameIndex ?? mechanics.sourceFrameCount;
    const cadenceHz = previous && event.tMs > previous.tMs
      ? 1_000 / (event.tMs - previous.tMs)
      : null;
    const rootSamples = (mechanics.rootMotion?.samples ?? []).filter(
      (sample) => sample.tMs >= event.tMs && sample.tMs <= t1Ms,
    );
    const firstRoot = rootSamples[0];
    const rootBaseline = mechanics.rootMotion?.samples[0];
    const rootScale = mechanics.rootMotion?.scaleImageHeight;
    const rootPath = firstRoot
      ? rootSamples.map((sample) => ({
          tMs: sample.tMs,
          x: sample.normalizedX - firstRoot.normalizedX,
          y: rootBaseline && rootScale
            ? Math.max(-2, Math.min(2, (sample.imageY - rootBaseline.imageY) / rootScale))
            : 0,
          confidence: sample.confidence,
        }))
      : [];
    const displacementX = rootPath.length > 1 ? rootPath.at(-1)!.x : 0;
    const rootEvidenceByRef = new Map<string, EvidenceRef>();
    for (const sample of rootSamples.length > 0
      ? [rootSamples[0]!, rootSamples.reduce(
          (current, candidate) => candidate.imageY > current.imageY ? candidate : current,
          rootSamples[0]!,
        ), rootSamples.at(-1)!]
      : []) {
      for (const entry of sample.evidence) rootEvidenceByRef.set(entry.ref, entry);
    }
    const beatEvidence = [...event.evidence];
    for (const entry of rootEvidenceByRef.values()) {
      if (!beatEvidence.some((candidate) => candidate.ref === entry.ref)) beatEvidence.push(entry);
    }
    const travelDirection = Math.abs(displacementX) < 0.01
      ? "stationary" as const
      : displacementX < 0
        ? "left" as const
        : "right" as const;
    return {
      id: `beat-${index + 1}`,
      t0Ms: event.tMs,
      t1Ms,
      sourceFrameRange: {
        start: event.sourceFrameIndex,
        end: Math.max(event.sourceFrameIndex, nextFrameIndex - 1),
      },
      primitive,
      purpose:
        primitive === "plant"
          ? `establish ${event.support} support`
          : `exchange support from ${previous!.support} to ${event.support}`,
      travel: {
        direction: mechanics.rootMotion ? travelDirection : "unknown" as const,
        normalizedDisplacement: { x: displacementX, y: 0 },
        facing: { startDegrees: null, endDegrees: null },
        rootPath,
      },
      rhythm: {
        cadenceHz,
        phase: "unknown" as const,
        accentTimesMs: [event.tMs],
      },
      contact: {
        requiredSupports: primitive === "plant" ? [event.support] : order,
        order,
      },
      motionQuality: {
        weight: event.confidence,
        flow: clamp01(1 - event.footSpeedPerSecond / maxFootSpeed),
        energy: clamp01(event.rootSpeedPerSecond / maxFootSpeed),
        directness: event.confidence,
        restraint: null,
        playfulness: null,
        urgency: null,
      },
      poseIntent: {
        extremes: [],
        silhouette: "unresolved from mechanics-only evidence",
        lineOfAction: "unresolved from mechanics-only evidence",
      },
      roles: primitive === "plant" ? ["commitment" as const] : ["release" as const, "commitment" as const],
      recognitionCritical: [
        primitive === "plant"
          ? `${event.support} establishes first support`
          : `${previous!.support}-to-${event.support} support order`,
      ],
      confidence: event.confidence,
      evidence: beatEvidence,
      ambiguities: [
        {
          id: `ambiguity-${index + 1}-mechanics-only`,
          description: "Mechanics draft establishes contact timing only; travel, facing, pose intent, and semantic qualities remain unresolved.",
          confidence: 1,
          evidence: event.evidence,
        },
      ],
      corrections: [],
    };
  });
  return motionScoreSchema.parse({
    schema: "gasper.motion-score.v1",
    id,
    sourceObservationHash: mechanics.sourceObservationHash,
    durationMs: mechanics.durationMs,
    beats,
    provenance: {
      compiler: "gasper-mechanics-draft",
      compilerVersion: beats.some((beat) =>
        beat.travel.rootPath.some((point) => Math.abs(point.y) > 1e-6),
      ) ? "1.1.0" : "1.0.0",
      sourceRefs: [mechanics.sourceObservationHash],
    },
  }) as MotionScore;
}
