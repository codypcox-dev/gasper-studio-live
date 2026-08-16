/**
 * Visible embodiment topology binding.
 *
 * Binds Presence / Comet / Singularity / Dormant Maintain / Wake morphology
 * frames into exclusive packaged topology geometry snapshots — shape-level,
 * not channel-only theater. Specialty geometry is authored by at most one
 * embodiment (or a single transition_blend owner); contour never dual-owned.
 *
 * Pure evaluation: no GSAP ticks, no DOM, no MCP frame ownership.
 */

import { evaluateCometGeometry } from "../embodiments/comet";
import type { CometWakeGeometry } from "../embodiments/comet";
import { evaluateDormantOrbitGeometry } from "../embodiments/dormant";
import type { DormantOrbitGeometry } from "../embodiments/dormant";
import { evaluateSingularityGeometry } from "../embodiments/singularity";
import type { SingularityGeometryState } from "../embodiments/singularity";
import { GASPER_TOPOLOGY } from "../GasperTopologyLock";
import {
  evaluateMorphologyFrame,
  exclusiveContourOwnership,
  featureOrderLegal,
  sampleMorphologySequence,
} from "./embodimentMorphology";
import { profileMorphologyEmbodimentId } from "./routes";
import type {
  EmbodimentId,
  EvaluateMorphologyOptions,
  LayerOwnershipMap,
  MorphologyFrame,
  MorphologyLayerOwner,
} from "./types";

// ---------------------------------------------------------------------------
// Snapshot types (shape-level geometry for structural + derivative proofs)
// ---------------------------------------------------------------------------

export type FeaturePoint = {
  x: number;
  y: number;
  openness: number;
  scale: number;
};

export type SnapshotDefectResiduals = {
  /** Ghost / dual contour residual (must stay ~0). */
  ghostContour: number;
  /** Axial needle through face (must stay 0). */
  axialNeedle: number;
  /** Whole-face horizontal shear residual (must stay ~0). */
  wholeFaceShear: number;
  /** Stale dual silhouette residual (must stay ~0). */
  staleSilhouette: number;
  /** Snap reconstruction residual (must stay ~0 on living path). */
  snapReconstruction: number;
};

export type VisibleGeometrySnapshot = {
  progress: number;
  from: EmbodimentId;
  to: EmbodimentId;
  intermediateState: MorphologyFrame["intermediateState"];
  reverse: boolean;
  /** Packaged topology lock constants (exclusive shared topology). */
  topology: {
    contourSamples: number;
    structuralNodes: number;
    structuralTriangles: number;
    topologyStable: true;
  };
  /** Exclusive layer ownership from morphology law. */
  ownership: LayerOwnershipMap;
  /** Contour authority — never dual, never none. */
  topologyAuthority: MorphologyLayerOwner;
  /** True only when dual specialty peaks or contour is none (reject). */
  dualTopologyAuthority: boolean;
  shell: {
    width: number;
    height: number;
    fullness: number;
    volume: number;
    com: { x: number; y: number };
  };
  face: {
    scale: number;
    /** 0..1 attachment of face plane to shell COM/volume (must stay high). */
    attachment: number;
    eyeL: FeaturePoint;
    eyeR: FeaturePoint;
    mouth: FeaturePoint;
  };
  energy: {
    level: number;
    pulse: number;
    centroid: { x: number; y: number };
  };
  specialty: {
    singularity: SingularityGeometryState | null;
    comet: CometWakeGeometry | null;
    dormant: DormantOrbitGeometry | null;
    /** Exclusive specialty author for this frame. */
    activeAuthor: MorphologyLayerOwner | "none";
    mixes: {
      singularity: number;
      comet: number;
      dormant: number;
      wake: number;
    };
  };
  defects: SnapshotDefectResiduals;
  /** Deterministic shape fingerprint (same inputs → same hash). */
  shapeHash: string;
  /** Scalars used for non-null feature span proofs. */
  featureScalars: {
    eyeOpenness: number;
    mouthOpenness: number;
    energyLevel: number;
  };
  /** Morphology frame this snapshot was bound from. */
  morphology: MorphologyFrame;
};

export type FeatureSpanReport = {
  eyeOpenness: { min: number; max: number; span: number };
  mouthOpenness: { min: number; max: number; span: number };
  energyLevel: { min: number; max: number; span: number };
  featureMotionDetected: boolean;
  /** Null only when series is empty — never null on a non-empty route sample. */
  pairCount: number;
};

export type GeometryBindingOptions = {
  timeSeconds?: number;
  seed?: number;
  /** Previous snapshot for snap-reconstruction residual vs hold-last-good. */
  previous?: VisibleGeometrySnapshot | null;
  /** When true, mid-route interrupt hold-last-good reattach mode. */
  holdLastGood?: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function fnvShape(parts: Array<number | string>): string {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    if (typeof p === "string") {
      for (let i = 0; i < p.length; i++) {
        h = Math.imul(h ^ p.charCodeAt(i), 16777619) >>> 0;
      }
      continue;
    }
    const q = Math.round(p * 1e6);
    h = Math.imul(h ^ (q & 0xff), 16777619) >>> 0;
    h = Math.imul(h ^ ((q >>> 8) & 0xff), 16777619) >>> 0;
    h = Math.imul(h ^ ((q >>> 16) & 0xff), 16777619) >>> 0;
    h = Math.imul(h ^ ((q >>> 24) & 0xff), 16777619) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * Map morph-adapter / profile ids onto morphology EmbodimentId.
 * "dormant-orbit" (profile) → "dormant-maintain" (morphology).
 */
export function toMorphologyEmbodimentId(id: string): EmbodimentId | null {
  const n = id.trim().toLowerCase();
  if (n === "dormant-maintain" || n === "dormant-orbit" || n === "dormant") {
    return "dormant-maintain";
  }
  if (n === "wake") return "wake";
  return profileMorphologyEmbodimentId(n);
}

/**
 * Pick exclusive specialty author from mixes + ownership.
 * Only one specialty geometry may own contested specialty layers.
 */
export function resolveSpecialtyAuthor(
  ownership: LayerOwnershipMap,
  mixes: {
    singularity: number;
    comet: number;
    dormant: number;
    wake: number;
  },
): MorphologyLayerOwner | "none" {
  // Ownership wins when specialty layer is assigned
  if (ownership.accretion === "singularity_well") return "singularity_well";
  if (ownership.wake_tail === "comet_drive") return "comet_drive";
  if (ownership.orbit === "dormant_orbit") return "dormant_orbit";
  if (ownership.energy === "wake_restore") return "wake_restore";

  const entries: Array<[MorphologyLayerOwner, number]> = [
    ["singularity_well", mixes.singularity],
    ["comet_drive", mixes.comet],
    ["dormant_orbit", mixes.dormant],
    ["wake_restore", mixes.wake],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0]!;
  if (top[1] < 0.08) return "none";
  // Dual peak → transition_blend (single blend author, not dual geometry)
  if (entries[1] && entries[1][1] > 0.55 && top[1] > 0.55) {
    return "transition_blend";
  }
  return top[0];
}

/**
 * Facial attachment: eyes/mouth must track shell COM + face_scale.
 * Low attachment ⇒ floating graphic face (EA2-V003 class defect).
 */
export function computeFacialAttachment(
  face: VisibleGeometrySnapshot["face"],
  shell: VisibleGeometrySnapshot["shell"],
): number {
  // Expected face plane center near COM with small vertical offset
  const expectedY = shell.com.y - 0.02 * shell.height;
  const expectedX = shell.com.x;
  const midX = (face.eyeL.x + face.eyeR.x) * 0.5;
  const midY = (face.eyeL.y + face.eyeR.y + face.mouth.y) / 3;
  const drift = Math.hypot(midX - expectedX, midY - expectedY);
  // Width-normalized: attachment falls as face drifts off shell mass
  const norm = drift / Math.max(0.25, shell.width * 0.35);
  const attach = clamp01(1 - norm);
  // Scale coherence: face scale should track shell (not independent graphic)
  const scaleCoherence = clamp01(1 - Math.abs(face.scale - 1) * 0.35);
  return clamp01(attach * 0.75 + scaleCoherence * 0.25);
}

// ---------------------------------------------------------------------------
// Core: bind morphology frame → visible geometry snapshot
// ---------------------------------------------------------------------------

/**
 * Bind a morphology frame into an exclusive topology geometry snapshot.
 * Evaluates real specialty geometry modules under single-author ownership.
 */
export function evaluateVisibleGeometrySnapshot(
  frame: MorphologyFrame,
  opts: GeometryBindingOptions = {},
): VisibleGeometrySnapshot {
  const t = opts.timeSeconds ?? frame.progress;
  const seed = (opts.seed ?? 1007) | 0;
  const ch = frame.channels;
  const mixes = {
    singularity: frame.specialty.singularityMix,
    comet: frame.specialty.cometMix,
    dormant: frame.specialty.dormantMix,
    wake: frame.specialty.wakeMix,
  };
  const activeAuthor = resolveSpecialtyAuthor(frame.ownership, mixes);

  // Shell from morphology channels (volume-preserving path already applied)
  const shell = {
    width: ch.overall_width ?? 1,
    height: ch.overall_height ?? 1,
    fullness: ch.lower_body_fullness ?? 1,
    volume: frame.volume,
    com: { x: frame.com.x, y: frame.com.y },
  };

  // Face plane attached to shell COM — features co-deform with body
  const faceScale = ch.face_scale ?? 1;
  const eyeOpen = ch.eye_openness ?? 0.5;
  const mouthOpen = ch.mouth_openness ?? 0.25;
  const eyeSpacing = 0.12 + (ch.eye_spacing ?? 0) * 0.08;
  const gaze = ch.gaze ?? 0;
  // Attachment offset: features ride shell COM (no free float)
  const faceOriginX = shell.com.x + gaze * 0.04;
  const faceOriginY = shell.com.y - 0.04 * shell.height * faceScale;
  const eyeL: FeaturePoint = {
    x: faceOriginX - eyeSpacing * faceScale,
    y: faceOriginY - 0.02 * faceScale,
    openness: eyeOpen,
    scale: faceScale,
  };
  const eyeR: FeaturePoint = {
    x: faceOriginX + eyeSpacing * faceScale,
    y: faceOriginY - 0.02 * faceScale,
    openness: eyeOpen,
    scale: faceScale,
  };
  const mouth: FeaturePoint = {
    x: faceOriginX,
    y: faceOriginY + 0.08 * faceScale,
    openness: mouthOpen,
    scale: faceScale * (ch.mouth_width ?? 1),
  };

  // Energy centroid tracks shell interior (not a second floating blob)
  const energyLevel = ch.energy_level ?? 0.5;
  const energyPulse = ch.energy_pulse ?? 0;
  const energy = {
    level: energyLevel,
    pulse: energyPulse,
    centroid: {
      x: shell.com.x,
      y: shell.com.y + 0.01 * shell.height,
    },
  };

  // Exclusive specialty geometry — only the active author evaluates full geometry.
  // Others are null so there is no dual topology authority on specialty layers.
  let singularity: SingularityGeometryState | null = null;
  let comet: CometWakeGeometry | null = null;
  let dormant: DormantOrbitGeometry | null = null;

  const motion =
    Math.abs(frame.chirality.approachWithdraw) * 0.5 +
    Math.abs(frame.chirality.lateral) * 0.35 +
    mixes.comet * 0.4 +
    mixes.singularity * 0.2;

  if (
    activeAuthor === "singularity_well" ||
    (activeAuthor === "transition_blend" && mixes.singularity >= mixes.comet)
  ) {
    // Author singularity; suppress dual comet/dormant pathD authority
    singularity = evaluateSingularityGeometry({
      mix: mixes.singularity,
      timeSeconds: t,
      energy: energyLevel,
      motion: clamp01(motion),
      seed,
      interrupted: opts.holdLastGood === true,
      from: frame.from === "singularity" ? "singularity" : "presence",
      to: frame.to === "singularity" ? "singularity" : "presence",
    });
  } else if (
    activeAuthor === "comet_drive" ||
    (activeAuthor === "transition_blend" && mixes.comet > mixes.singularity)
  ) {
    comet = evaluateCometGeometry({
      mix: mixes.comet,
      timeSeconds: t,
      energy: energyLevel,
      motion: clamp01(motion + 0.2),
      seed: seed ^ 0x3c,
      interrupted: opts.holdLastGood === true,
    });
  } else if (
    activeAuthor === "dormant_orbit" ||
    activeAuthor === "wake_restore"
  ) {
    // Wake uses dormant orbit geometry with wakeRestoration driven by wake mix
    const collapse =
      activeAuthor === "wake_restore"
        ? clamp01(1 - mixes.wake)
        : mixes.dormant;
    dormant = evaluateDormantOrbitGeometry({
      mix: Math.max(mixes.dormant, mixes.wake * 0.85, 0.05),
      timeSeconds: t,
      energy: energyLevel,
      motion: clamp01(motion * 0.5),
      seed: seed ^ 0x5a,
      interrupted: opts.holdLastGood === true,
      collapseProgress: collapse,
    });
  }
  // Presence (activeAuthor none / presence_body): no specialty geometry — shell+face only.

  // Hard law: defect residuals stay zero on living binding path
  const defects: SnapshotDefectResiduals = {
    ghostContour: 0,
    axialNeedle: 0,
    wholeFaceShear: 0,
    staleSilhouette: frame.specialty.dualSilhouette,
    snapReconstruction: 0,
  };

  // Snap reconstruction residual: large face openness jump without migrate phase
  if (opts.previous) {
    const dEye = Math.abs(eyeOpen - opts.previous.featureScalars.eyeOpenness);
    const dMouth = Math.abs(
      mouthOpen - opts.previous.featureScalars.mouthOpenness,
    );
    const reconstitute =
      frame.features.eyes.reconstitute + frame.features.mouth.reconstitute;
    const dissolve =
      frame.features.eyes.dissolve + frame.features.mouth.dissolve;
    if ((dEye > 0.45 || dMouth > 0.45) && reconstitute < 0.15 && dissolve < 0.15) {
      defects.snapReconstruction = Math.max(dEye, dMouth);
    }
  }

  // Axial needle / ghost: force zero; surface residual only if specialty pierces face
  if (singularity && singularity.faceSuppressed === false) {
    // Deep well while face still open → would be axial needle; law caps mix earlier
    if (
      singularity.centerVoid > 0.55 &&
      eyeOpen > 0.4 &&
      singularity.mix > 0.7
    ) {
      // Living path forbids this; mark residual if it ever appears
      defects.axialNeedle = 0; // still hard-zero under law evaluation path
    }
  }
  defects.axialNeedle = frame.specialty.axialNeedle;
  defects.ghostContour = frame.specialty.ghostAnatomy;
  defects.wholeFaceShear = frame.specialty.horizontalShear;

  const topologyAuthority = frame.ownership.contour;
  const dualTopologyAuthority =
    topologyAuthority === "none" ||
    frame.specialty.dualSilhouette > 0.02 ||
    !exclusiveContourOwnership(frame.ownership);

  const faceDraft = {
    scale: faceScale,
    attachment: 1,
    eyeL,
    eyeR,
    mouth,
  };
  faceDraft.attachment = computeFacialAttachment(faceDraft, shell);

  const specialtyHash =
    singularity?.hash ??
    comet?.hash ??
    dormant?.hash ??
    "presence";
  const shapeHash = fnvShape([
    shell.width,
    shell.height,
    shell.fullness,
    shell.volume,
    shell.com.x,
    shell.com.y,
    faceScale,
    eyeOpen,
    mouthOpen,
    eyeL.x,
    eyeR.x,
    mouth.y,
    energyLevel,
    energyPulse,
    mixes.singularity,
    mixes.comet,
    mixes.dormant,
    mixes.wake,
    specialtyHash,
    frame.intermediateState,
    frame.progress,
    activeAuthor,
  ]);

  return {
    progress: frame.progress,
    from: frame.from,
    to: frame.to,
    intermediateState: frame.intermediateState,
    reverse: frame.reverse,
    topology: {
      contourSamples: GASPER_TOPOLOGY.contourSamples,
      structuralNodes: GASPER_TOPOLOGY.structuralNodes,
      structuralTriangles: GASPER_TOPOLOGY.structuralTriangles,
      topologyStable: true,
    },
    ownership: frame.ownership,
    topologyAuthority,
    dualTopologyAuthority,
    shell,
    face: faceDraft,
    energy,
    specialty: {
      singularity,
      comet,
      dormant,
      activeAuthor,
      mixes,
    },
    defects,
    shapeHash,
    featureScalars: {
      eyeOpenness: eyeOpen,
      mouthOpenness: mouthOpen,
      energyLevel,
    },
    morphology: frame,
  };
}

/**
 * Evaluate morphology then bind into a visible geometry snapshot (single entry).
 */
export function evaluateBoundMorphologyGeometry(
  opts: EvaluateMorphologyOptions & GeometryBindingOptions,
): VisibleGeometrySnapshot {
  const frame = evaluateMorphologyFrame(opts);
  return evaluateVisibleGeometrySnapshot(frame, {
    timeSeconds: opts.progress,
    seed: opts.chiralityBias != null ? Math.round(opts.chiralityBias * 1000) : 1007,
    previous: opts.previous
      ? evaluateVisibleGeometrySnapshot(opts.previous, {
          timeSeconds: opts.previous.progress,
        })
      : opts.previous === null
        ? null
        : undefined,
    holdLastGood: false,
  });
}

/**
 * Sample a dense bound geometry sequence along a morphology route.
 * Drives shipped morphology + specialty geometry under exclusive ownership.
 */
export function sampleBoundGeometrySequence(opts: {
  from: EmbodimentId;
  to: EmbodimentId;
  frameCount?: number;
  dt?: number;
  chiralityBias?: number;
  reverse?: boolean;
  interruptAt?: number;
  interruptTo?: EmbodimentId;
  seed?: number;
}): VisibleGeometrySnapshot[] {
  const morphology = sampleMorphologySequence({
    from: opts.from,
    to: opts.to,
    frameCount: opts.frameCount,
    dt: opts.dt,
    chiralityBias: opts.chiralityBias,
    reverse: opts.reverse,
    interruptAt: opts.interruptAt,
    interruptTo: opts.interruptTo,
  });
  const seed = (opts.seed ?? 1007) | 0;
  const dt = opts.dt ?? 1 / 60;
  const out: VisibleGeometrySnapshot[] = [];
  let prev: VisibleGeometrySnapshot | null = null;
  const interruptIdx =
    typeof opts.interruptAt === "number"
      ? Math.round(opts.interruptAt * (morphology.length - 1))
      : -1;

  for (let i = 0; i < morphology.length; i++) {
    const m = morphology[i]!;
    const snap = evaluateVisibleGeometrySnapshot(m, {
      timeSeconds: i * dt,
      seed: seed + i,
      previous: prev,
      holdLastGood: i === interruptIdx,
    });
    out.push(snap);
    prev = snap;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Derivative / proof helpers (used by structural suite)
// ---------------------------------------------------------------------------

/** Non-null feature spans across a bound sequence. */
export function computeFeatureSpans(
  snapshots: readonly VisibleGeometrySnapshot[],
): FeatureSpanReport {
  if (snapshots.length === 0) {
    return {
      eyeOpenness: { min: 0, max: 0, span: 0 },
      mouthOpenness: { min: 0, max: 0, span: 0 },
      energyLevel: { min: 0, max: 0, span: 0 },
      featureMotionDetected: false,
      pairCount: 0,
    };
  }
  let eyeMin = Infinity;
  let eyeMax = -Infinity;
  let mouthMin = Infinity;
  let mouthMax = -Infinity;
  let energyMin = Infinity;
  let energyMax = -Infinity;
  for (const s of snapshots) {
    const e = s.featureScalars.eyeOpenness;
    const m = s.featureScalars.mouthOpenness;
    const n = s.featureScalars.energyLevel;
    // Explicit non-null: reject undefined/NaN
    if (!Number.isFinite(e) || !Number.isFinite(m) || !Number.isFinite(n)) {
      continue;
    }
    eyeMin = Math.min(eyeMin, e);
    eyeMax = Math.max(eyeMax, e);
    mouthMin = Math.min(mouthMin, m);
    mouthMax = Math.max(mouthMax, m);
    energyMin = Math.min(energyMin, n);
    energyMax = Math.max(energyMax, n);
  }
  // If every sample was non-finite, surfaces as null-equivalent zeros with pairCount
  const valid = Number.isFinite(eyeMin) && eyeMin !== Infinity;
  if (!valid) {
    return {
      eyeOpenness: { min: NaN, max: NaN, span: NaN },
      mouthOpenness: { min: NaN, max: NaN, span: NaN },
      energyLevel: { min: NaN, max: NaN, span: NaN },
      featureMotionDetected: false,
      pairCount: 0,
    };
  }
  const eyeSpan = eyeMax - eyeMin;
  const mouthSpan = mouthMax - mouthMin;
  const energySpan = energyMax - energyMin;
  const motionThreshold = 0.02;
  return {
    eyeOpenness: { min: eyeMin, max: eyeMax, span: eyeSpan },
    mouthOpenness: { min: mouthMin, max: mouthMax, span: mouthSpan },
    energyLevel: { min: energyMin, max: energyMax, span: energySpan },
    featureMotionDetected:
      eyeSpan > motionThreshold ||
      mouthSpan > motionThreshold ||
      energySpan > motionThreshold,
    pairCount: snapshots.length,
  };
}

/** True when intermediate snapshots are pairwise distinct by shapeHash. */
export function intermediateShapesDistinct(
  snapshots: readonly VisibleGeometrySnapshot[],
  sampleProgresses: readonly number[] = [0.2, 0.4, 0.6, 0.8],
): { distinct: boolean; hashes: string[]; collisions: string[] } {
  const hashes: string[] = [];
  const collisions: string[] = [];
  for (const p of sampleProgresses) {
    // Nearest snapshot by progress
    let best = snapshots[0];
    let bestD = Infinity;
    for (const s of snapshots) {
      const d = Math.abs(s.progress - p);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    if (best) hashes.push(best.shapeHash);
  }
  const seen = new Set<string>();
  for (const h of hashes) {
    if (seen.has(h)) collisions.push(h);
    seen.add(h);
  }
  // Also require endpoints differ from mid when route is non-identity
  if (snapshots.length >= 3) {
    const a = snapshots[0]!.shapeHash;
    const mid = snapshots[Math.floor(snapshots.length / 2)]!.shapeHash;
    const b = snapshots[snapshots.length - 1]!.shapeHash;
    if (a === mid && mid === b && snapshots[0]!.from !== snapshots[0]!.to) {
      collisions.push(mid);
    }
  }
  return { distinct: collisions.length === 0 && hashes.length > 1, hashes, collisions };
}

/**
 * Inverse-consistent geometry restoration residual:
 * forward(p) shell/features ≈ reverse route (1-p) within tolerance.
 */
export function inverseGeometryConsistencyError(
  from: EmbodimentId,
  to: EmbodimentId,
  progress: number,
): number {
  const p = clamp01(progress);
  const fwd = evaluateBoundMorphologyGeometry({ from, to, progress: p });
  const rev = evaluateBoundMorphologyGeometry({
    from: to,
    to: from,
    progress: 1 - p,
  });
  let max = 0;
  max = Math.max(
    max,
    Math.abs(fwd.shell.width - rev.shell.width),
    Math.abs(fwd.shell.height - rev.shell.height),
    Math.abs(fwd.shell.volume - rev.shell.volume),
    Math.abs(fwd.featureScalars.eyeOpenness - rev.featureScalars.eyeOpenness),
    Math.abs(fwd.featureScalars.mouthOpenness - rev.featureScalars.mouthOpenness),
    Math.abs(fwd.featureScalars.energyLevel - rev.featureScalars.energyLevel),
    Math.abs(fwd.shell.com.x - rev.shell.com.x),
    Math.abs(fwd.shell.com.y - rev.shell.com.y),
  );
  return max;
}

/** Contour exclusive + no dual topology authority flag. */
export function hasExclusiveTopologyAuthority(
  snap: VisibleGeometrySnapshot,
): boolean {
  return (
    snap.topologyAuthority !== "none" &&
    !snap.dualTopologyAuthority &&
    exclusiveContourOwnership(snap.ownership)
  );
}

/** True when snapshot defect residuals stay under living-path floors. */
export function snapshotDefectsClean(
  snap: VisibleGeometrySnapshot,
  thresholds: {
    ghostContour?: number;
    axialNeedle?: number;
    wholeFaceShear?: number;
    staleSilhouette?: number;
    snapReconstruction?: number;
  } = {},
): boolean {
  const t = {
    ghostContour: thresholds.ghostContour ?? 0.02,
    axialNeedle: thresholds.axialNeedle ?? 0.02,
    wholeFaceShear: thresholds.wholeFaceShear ?? 0.05,
    staleSilhouette: thresholds.staleSilhouette ?? 0.02,
    snapReconstruction: thresholds.snapReconstruction ?? 0.35,
  };
  return (
    snap.defects.ghostContour <= t.ghostContour &&
    snap.defects.axialNeedle <= t.axialNeedle &&
    snap.defects.wholeFaceShear <= t.wholeFaceShear &&
    snap.defects.staleSilhouette <= t.staleSilhouette &&
    snap.defects.snapReconstruction <= t.snapReconstruction
  );
}

/** Volume + facial attachment continuity gate for a sequence. */
export function volumeAndAttachmentContinuous(
  snapshots: readonly VisibleGeometrySnapshot[],
  opts: { volumeFloor?: number; attachmentFloor?: number } = {},
): { ok: boolean; minVolume: number; minAttachment: number } {
  const volumeFloor = opts.volumeFloor ?? 0.78;
  const attachmentFloor = opts.attachmentFloor ?? 0.55;
  let minVolume = Infinity;
  let minAttachment = Infinity;
  for (const s of snapshots) {
    minVolume = Math.min(minVolume, s.shell.volume);
    minAttachment = Math.min(minAttachment, s.face.attachment);
  }
  if (!Number.isFinite(minVolume)) minVolume = 0;
  if (!Number.isFinite(minAttachment)) minAttachment = 0;
  return {
    ok: minVolume >= volumeFloor && minAttachment >= attachmentFloor,
    minVolume,
    minAttachment,
  };
}

/**
 * Inject snapshot-level defects for negative detector tests.
 * Returns a shallow-cloned snapshot with the defect applied.
 */
export function injectSnapshotDefectForTest(
  snap: VisibleGeometrySnapshot,
  defect:
    | "ghost_contour"
    | "axial_needle"
    | "whole_face_shear"
    | "stale_silhouette"
    | "snap_reconstruction"
    | "dual_topology"
    | "null_feature_span"
    | "detach_face",
): VisibleGeometrySnapshot {
  const clone: VisibleGeometrySnapshot = {
    ...snap,
    shell: { ...snap.shell, com: { ...snap.shell.com } },
    face: {
      ...snap.face,
      eyeL: { ...snap.face.eyeL },
      eyeR: { ...snap.face.eyeR },
      mouth: { ...snap.face.mouth },
    },
    energy: { ...snap.energy, centroid: { ...snap.energy.centroid } },
    specialty: {
      ...snap.specialty,
      mixes: { ...snap.specialty.mixes },
    },
    defects: { ...snap.defects },
    featureScalars: { ...snap.featureScalars },
    ownership: { ...snap.ownership },
    topology: { ...snap.topology },
  };
  switch (defect) {
    case "ghost_contour":
      clone.defects.ghostContour = 0.9;
      break;
    case "axial_needle":
      clone.defects.axialNeedle = 0.95;
      break;
    case "whole_face_shear":
      clone.defects.wholeFaceShear = 0.8;
      // Asymmetric horizontal shear: slide whole face plane off shell mass
      clone.face.eyeL.x += 0.55;
      clone.face.eyeR.x += 0.65;
      clone.face.mouth.x += 0.6;
      clone.face.attachment = computeFacialAttachment(clone.face, clone.shell);
      break;
    case "stale_silhouette":
      clone.defects.staleSilhouette = 1;
      break;
    case "snap_reconstruction":
      clone.defects.snapReconstruction = 0.9;
      clone.featureScalars.eyeOpenness = 0.95;
      break;
    case "dual_topology":
      clone.dualTopologyAuthority = true;
      clone.topologyAuthority = "none";
      clone.ownership = { ...clone.ownership, contour: "none" };
      break;
    case "null_feature_span":
      clone.featureScalars = {
        eyeOpenness: Number.NaN,
        mouthOpenness: Number.NaN,
        energyLevel: Number.NaN,
      };
      break;
    case "detach_face":
      clone.face.eyeL.x = 2;
      clone.face.eyeR.x = 2.2;
      clone.face.mouth.x = 2.1;
      clone.face.attachment = computeFacialAttachment(clone.face, clone.shell);
      break;
  }
  return clone;
}

/** Feature lifecycle legality passthrough for bound sequences. */
export function boundFeatureOrderLegal(
  snapshots: readonly VisibleGeometrySnapshot[],
): boolean {
  return snapshots.every((s) => featureOrderLegal(s.morphology.features));
}

/**
 * Domain bindings produced from a bound snapshot for morph adapter / mixer.
 * Single topology author — specialty mixes exclusive by activeAuthor.
 */
export function domainBindingsFromSnapshot(
  snap: VisibleGeometrySnapshot,
): Record<string, number> {
  const ch = snap.morphology.channels;
  const out: Record<string, number> = {
    overall_width: snap.shell.width,
    overall_height: snap.shell.height,
    lower_body_fullness: snap.shell.fullness,
    crown_height: ch.crown_height ?? 0.05,
    ground_flattening: ch.ground_flattening ?? 0.04,
    face_scale: snap.face.scale,
    eye_openness: snap.featureScalars.eyeOpenness,
    eye_spacing: ch.eye_spacing ?? 0,
    gaze: ch.gaze ?? 0,
    mouth_openness: snap.featureScalars.mouthOpenness,
    mouth_width: ch.mouth_width ?? 1,
    corner_pull_l: ch.corner_pull_l ?? 0,
    corner_pull_r: ch.corner_pull_r ?? 0,
    energy_level: snap.featureScalars.energyLevel,
    energy_pulse: snap.energy.pulse,
    energy_lag: ch.energy_lag ?? 0.4,
    relief_amplitude: ch.relief_amplitude ?? 0.4,
    skin_tension: ch.skin_tension ?? 0.4,
    internal_glow: ch.internal_glow ?? 0.4,
    face_emissive: ch.face_emissive ?? 0.3,
    settling: ch.settling ?? 0.5,
    rebound: ch.rebound ?? 0.2,
    secondary_lag: ch.secondary_lag ?? 0.3,
    com_x: snap.shell.com.x,
    com_y: snap.shell.com.y,
    singularity_mix: 0,
    comet_mix: 0,
    dormant_mix: 0,
    wake_mix: 0,
    axial_needle: 0,
    ghost_anatomy: 0,
    horizontal_shear: 0,
    dual_silhouette: 0,
  };
  // Exclusive specialty write — only active author may set non-zero mix
  switch (snap.specialty.activeAuthor) {
    case "singularity_well":
      out.singularity_mix = snap.specialty.mixes.singularity;
      break;
    case "comet_drive":
      out.comet_mix = snap.specialty.mixes.comet;
      break;
    case "dormant_orbit":
      out.dormant_mix = snap.specialty.mixes.dormant;
      break;
    case "wake_restore":
      out.wake_mix = snap.specialty.mixes.wake;
      out.dormant_mix = snap.specialty.mixes.dormant * 0.5;
      break;
    case "transition_blend":
      // Single blend author may carry soft mixes; still no dual pathD stamping
      out.singularity_mix = snap.specialty.mixes.singularity;
      out.comet_mix = snap.specialty.mixes.comet;
      out.dormant_mix = snap.specialty.mixes.dormant;
      out.wake_mix = snap.specialty.mixes.wake;
      break;
    default:
      break;
  }
  return out;
}
