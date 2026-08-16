/**
 * Wave R8 depth — multi-track keyframe authoring (native, not MCP Sidekick timeline).
 *
 * Tracks map to morphology GSAP domains. Keyframes store binding snapshots at t∈[0,1].
 * Mute / solo / lock are first-class; evaluation and play respect them.
 *
 * Does not claim full professional curve editor — piecewise linear segments via GSAP.
 * Facial document geometry remains continuum-owned: animate tracks supply domain
 * scalars consumed on the host tick without stealing GSAP frame authority.
 */

import { MORPHOLOGY_DOMAINS, type MorphologyDomainId } from "./GasperMorphologyDomains";
import type { DomainScalarMap } from "./GasperDomainState";
import type { GasperGsapTrackOrchestrator } from "./GasperGsapTrackOrchestrator";
import {
  analyzeDocumentGeometrySequence,
  applyChannelsToDocumentGeometry,
  isRenderedBlackOrInert,
  maxAttachmentResidual,
  measureDocumentGeometry,
  type DocumentGeometryMeasures,
} from "./facial/DocumentFacialGeometry";
import { projectFacialTarget } from "./facial/FacialBodyContinuum";
import { enforceAntiCollapseFloors } from "./continuity/energyGrammar";
import {
  WHOLE_FACE_CHANNELS,
  enforceExpressionVisibilityFloors,
} from "../../../shared/src/gasper/facial";

/**
 * Whole-face + legacy facial keys that must survive evaluateAt even when
 * morphology-domain bindingIds omit R4 vocabulary (face_plane registry residual).
 * Expression routes seed these keys; filtering them out caused floor-frozen mouths.
 */
const EXPRESSION_FACIAL_ALWAYS_ACTIVE = new Set<string>([
  ...WHOLE_FACE_CHANNELS,
  "eye_openness",
  "eye_spacing",
  "mouth_openness",
  "mouth_width",
  "gaze",
  "corner_pull_l",
  "corner_pull_r",
  "face_scale",
  "skin_tension",
  "energy_level",
  "energy_pulse",
  "energy_lag",
  "internal_glow",
  "face_emissive",
  "overall_width",
  "overall_height",
  "relief_amplitude",
  "crown_height",
  "ground_flattening",
]);

/** True when binding survives mute/solo filter OR is R4 expression facial vocabulary. */
function isExpressionActiveKey(id: string, active: Set<string>): boolean {
  if (active.size === 0) return true;
  if (active.has(id)) return true;
  return EXPRESSION_FACIAL_ALWAYS_ACTIVE.has(id);
}

export type AnimateTrackState = {
  id: string;
  label: string;
  gsapTrack: string;
  domainId: MorphologyDomainId;
  bindingIds: string[];
  muted: boolean;
  solo: boolean;
  locked: boolean;
  enabled: boolean;
};

export type AnimateKeyframe = {
  id: string;
  /** Normalized time 0–1 on the studio clip. */
  t: number;
  label?: string;
  /** Binding snapshot at this keyframe. */
  values: DomainScalarMap;
};

export type AnimateSessionSnapshot = {
  tracks: AnimateTrackState[];
  keyframes: AnimateKeyframe[];
  durationSeconds: number;
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Default tracks from morphology domains (one row per GSAP track). */
export function createDefaultAnimateTracks(): AnimateTrackState[] {
  return MORPHOLOGY_DOMAINS.map((d) => ({
    id: d.gsapTrack,
    label: d.gsapTrack.replace(/_/g, " "),
    gsapTrack: d.gsapTrack,
    domainId: d.id,
    bindingIds: [...d.bindingIds],
    muted: false,
    solo: false,
    locked: false,
    enabled: true,
  }));
}

/**
 * Session-owned multi-track keyframe graph for Animator Studio.
 * Hot path still flushes through GasperGsapTrackOrchestrator → mixer.
 */
export class GasperAnimateSession {
  private tracks: AnimateTrackState[] = createDefaultAnimateTracks();
  private keyframes: AnimateKeyframe[] = [];
  private durationSeconds = 1.4;
  private listeners = new Set<() => void>();
  private kfSeq = 0;

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  getSnapshot(): AnimateSessionSnapshot {
    return {
      tracks: this.tracks.map((t) => ({
        ...t,
        bindingIds: [...t.bindingIds],
      })),
      keyframes: this.keyframes.map((k) => ({
        ...k,
        values: { ...k.values },
      })),
      durationSeconds: this.durationSeconds,
    };
  }

  setDurationSeconds(s: number) {
    this.durationSeconds = Math.max(0.05, s);
    this.emit();
  }

  getTracks(): AnimateTrackState[] {
    return this.getSnapshot().tracks;
  }

  getKeyframes(): AnimateKeyframe[] {
    return this.getSnapshot().keyframes;
  }

  /** Bindings that should participate given mute/solo/lock/enabled. */
  activeBindingIds(): Set<string> {
    const anySolo = this.tracks.some((t) => t.solo && t.enabled);
    const out = new Set<string>();
    for (const t of this.tracks) {
      if (!t.enabled) continue;
      if (t.muted) continue;
      if (anySolo && !t.solo) continue;
      for (const id of t.bindingIds) out.add(id);
    }
    return out;
  }

  setTrackMuted(trackId: string, muted: boolean) {
    const t = this.tracks.find((x) => x.id === trackId);
    if (!t || t.locked) return;
    t.muted = muted;
    this.emit();
  }

  setTrackSolo(trackId: string, solo: boolean) {
    const t = this.tracks.find((x) => x.id === trackId);
    if (!t || t.locked) return;
    t.solo = solo;
    this.emit();
  }

  setTrackLocked(trackId: string, locked: boolean) {
    const t = this.tracks.find((x) => x.id === trackId);
    if (!t) return;
    t.locked = locked;
    this.emit();
  }

  setTrackEnabled(trackId: string, enabled: boolean) {
    const t = this.tracks.find((x) => x.id === trackId);
    if (!t || t.locked) return;
    t.enabled = enabled;
    this.emit();
  }

  toggleMute(trackId: string) {
    const t = this.tracks.find((x) => x.id === trackId);
    if (!t) return;
    this.setTrackMuted(trackId, !t.muted);
  }

  toggleSolo(trackId: string) {
    const t = this.tracks.find((x) => x.id === trackId);
    if (!t) return;
    this.setTrackSolo(trackId, !t.solo);
  }

  toggleLock(trackId: string) {
    const t = this.tracks.find((x) => x.id === trackId);
    if (!t) return;
    this.setTrackLocked(trackId, !t.locked);
  }

  /**
   * Capture a keyframe at t from live binding values.
   * Only active (non-muted) bindings are stored unless includeAll is true.
   */
  captureKeyframe(
    t: number,
    live: DomainScalarMap,
    opts?: { label?: string; includeAll?: boolean },
  ): AnimateKeyframe {
    const tt = clamp01(t);
    const active = opts?.includeAll
      ? new Set(Object.keys(live))
      : this.activeBindingIds();
    const values: DomainScalarMap = {};
    for (const [id, v] of Object.entries(live)) {
      if (typeof v !== "number") continue;
      if (active.size > 0 && !active.has(id) && !opts?.includeAll) continue;
      // If active is empty (all muted), still capture nothing useful — store all for authoring
      values[id] = v;
    }
    // If mute filtered everything, fall back to full live snapshot so KF is not empty
    if (Object.keys(values).length === 0) {
      for (const [id, v] of Object.entries(live)) {
        if (typeof v === "number") values[id] = v;
      }
    }
    // Replace any keyframe at same t (snap)
    this.keyframes = this.keyframes.filter((k) => Math.abs(k.t - tt) > 1e-4);
    const kf: AnimateKeyframe = {
      id: `kf-${++this.kfSeq}-${Math.round(tt * 1000)}`,
      t: tt,
      label: opts?.label ?? `KF ${(tt * 100).toFixed(0)}%`,
      values,
    };
    this.keyframes.push(kf);
    this.keyframes.sort((a, b) => a.t - b.t);
    this.emit();
    return kf;
  }

  removeKeyframe(id: string) {
    const next = this.keyframes.filter((k) => k.id !== id);
    if (next.length === this.keyframes.length) return;
    this.keyframes = next;
    this.emit();
  }

  clearKeyframes() {
    this.keyframes = [];
    this.emit();
  }

  /**
   * Evaluate piecewise-linear pose at t∈[0,1] using active bindings only.
   * Whole-face morphology keys always pass the filter when present on keyframes
   * so expression routes keep multi-domain facial deformation (R4).
   * With 0 keyframes returns {}; with 1 keyframe holds that pose.
   */
  evaluateAt(t: number): DomainScalarMap {
    const tt = clamp01(t);
    const kfs = this.keyframes;
    if (kfs.length === 0) return {};
    const active = this.activeBindingIds();

    const filterValues = (vals: DomainScalarMap): DomainScalarMap => {
      const out: DomainScalarMap = {};
      for (const [id, v] of Object.entries(vals)) {
        if (isExpressionActiveKey(id, active) && typeof v === "number") out[id] = v;
      }
      return out;
    };

    if (kfs.length === 1) return filterValues(kfs[0].values);

    if (tt <= kfs[0].t) return filterValues(kfs[0].values);
    if (tt >= kfs[kfs.length - 1].t) {
      return filterValues(kfs[kfs.length - 1].values);
    }

    let i = 0;
    while (i < kfs.length - 1 && kfs[i + 1].t < tt) i += 1;
    const a = kfs[i];
    const b = kfs[i + 1];
    const span = b.t - a.t || 1;
    const u = (tt - a.t) / span;
    const keys = new Set([
      ...Object.keys(a.values),
      ...Object.keys(b.values),
    ]);
    const out: DomainScalarMap = {};
    for (const id of keys) {
      if (!isExpressionActiveKey(id, active)) continue;
      const av = a.values[id];
      const bv = b.values[id];
      if (typeof av === "number" && typeof bv === "number") {
        // Continuous energy/face interpolation — never hard topology swap.
        out[id] = lerp(av, bv, u);
      } else if (typeof bv === "number") {
        out[id] = bv;
      } else if (typeof av === "number") {
        out[id] = av;
      }
    }
    // Anti-collapse floors: keyframe evaluation must not emit whole-head squeeze.
    return enforceAntiCollapseFloors(out, "expression");
  }

  /**
   * Evaluate animate tracks at t and project onto document facial geometry.
   * Host retains GSAP tick ownership — this only maps scalars → feature measures.
   * Applies expression visibility floors so track samples never go black/inert.
   */
  evaluateDocumentGeometryAt(t: number): DocumentGeometryMeasures {
    const channels = enforceExpressionVisibilityFloors(
      this.evaluateAt(t),
      "presence",
    );
    const geom = applyChannelsToDocumentGeometry(channels, {
      expressionId: `animate@${t.toFixed(3)}`,
    });
    return measureDocumentGeometry(geom);
  }

  /**
   * Seed keyframes from shipped six-expression continuum projections so
   * compiled animate routes carry real multi-domain facial deformation
   * (not empty or scale-only tracks). Host still owns the frame clock.
   */
  seedExpressionRouteKeyframes(
    fromId: string,
    toId: string,
  ): { ok: boolean; error?: string; facialKeys: string[] } {
    const from = projectFacialTarget(fromId);
    const to = projectFacialTarget(toId);
    if (!from.ok) return { ok: false, error: from.error, facialKeys: [] };
    if (!to.ok) return { ok: false, error: to.error, facialKeys: [] };
    const fromCh = enforceExpressionVisibilityFloors(from.channels, "presence");
    const toCh = enforceExpressionVisibilityFloors(to.channels, "presence");
    this.keyframes = [
      {
        id: `kf-expr-from-${fromId}`,
        t: 0,
        label: fromId,
        values: { ...fromCh },
      },
      {
        id: `kf-expr-to-${toId}`,
        t: 1,
        label: toId,
        values: { ...toCh },
      },
    ];
    this.kfSeq += 2;
    this.emit();
    const facialKeys = WHOLE_FACE_CHANNELS.filter(
      (k) =>
        typeof fromCh[k] === "number" &&
        typeof toCh[k] === "number",
    );
    return { ok: true, facialKeys: [...facialKeys] };
  }

  /**
   * Sample a dense document-geometry sequence along seeded expression keyframes.
   * Rejects black/inert mid-route samples and reports real geometry continuity
   * (scale jumps + facial snaps) for R4 frame-sequence gates.
   */
  sampleExpressionRouteSequence(sampleCount = 16): {
    measures: DocumentGeometryMeasures[];
    blackOrInertFrames: number[];
    continuous: boolean;
    geometryContinuous: boolean;
    facialKeysAtMid: string[];
    mouthOpennessSpan: number;
    eyeOpennessSpan: number;
    maxAttachment: number;
  } {
    const n = Math.max(2, sampleCount | 0);
    const measures: DocumentGeometryMeasures[] = [];
    const blackOrInertFrames: number[] = [];
    const geoms: ReturnType<typeof applyChannelsToDocumentGeometry>[] = [];
    let maxAttachment = 0;
    let facialKeysAtMid: string[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const evaluated = this.evaluateAt(t);
      const channels = enforceExpressionVisibilityFloors(evaluated, "presence");
      if (i === Math.floor(n / 2)) {
        facialKeysAtMid = WHOLE_FACE_CHANNELS.filter(
          (k) => typeof evaluated[k] === "number" && Number.isFinite(evaluated[k]),
        );
      }
      const geom = applyChannelsToDocumentGeometry(channels, {
        expressionId: `animate-route@${t.toFixed(3)}`,
      });
      if (isRenderedBlackOrInert(geom)) blackOrInertFrames.push(i);
      maxAttachment = Math.max(maxAttachment, maxAttachmentResidual(geom));
      geoms.push(geom);
      measures.push(measureDocumentGeometry(geom));
    }
    const report = analyzeDocumentGeometrySequence(geoms);
    const mouthVals = measures.map((m) => m.mouthOpenness);
    const eyeVals = measures.map((m) => m.eyeOpenness);
    const mouthOpennessSpan =
      Math.max(...mouthVals) - Math.min(...mouthVals);
    const eyeOpennessSpan = Math.max(...eyeVals) - Math.min(...eyeVals);
    return {
      measures,
      blackOrInertFrames,
      continuous:
        blackOrInertFrames.length === 0 &&
        report.continuous &&
        report.scaleJumpFrames.length === 0 &&
        report.facialSnapFrames.length === 0,
      geometryContinuous: report.continuous,
      facialKeysAtMid,
      mouthOpennessSpan,
      eyeOpennessSpan,
      maxAttachment,
    };
  }

  /**
   * Play keyframe sequence on the orchestrator (multi-segment coordinated tweens).
   * Returns false when fewer than 2 keyframes (caller uses default studio clip).
   */
  playOnOrchestrator(
    orchestrator: GasperGsapTrackOrchestrator,
    opts?: {
      durationSeconds?: number;
      ease?: string;
      onProgress?: (t: number) => void;
      seedLive?: DomainScalarMap;
    },
  ): boolean {
    const kfs = [...this.keyframes].sort((a, b) => a.t - b.t);
    if (kfs.length < 2) return false;

    const duration = opts?.durationSeconds ?? this.durationSeconds;
    const ease = opts?.ease ?? "power2.inOut";
    const active = this.activeBindingIds();
    const t0 = kfs[0].t;
    const t1 = kfs[kfs.length - 1].t;
    const totalSpan = Math.max(1e-6, t1 - t0);

    const seed = opts?.seedLive ?? kfs[0].values;
    for (const [k, v] of Object.entries(seed)) {
      if (typeof v === "number") orchestrator.ensureProxy(k, v).value = v;
    }

    let segmentIndex = 0;

    const playSegment = () => {
      if (segmentIndex >= kfs.length - 1) {
        opts?.onProgress?.(1);
        return;
      }
      const fromKf = kfs[segmentIndex];
      const toKf = kfs[segmentIndex + 1];
      const segWeight = (toKf.t - fromKf.t) / totalSpan;
      const segDur = Math.max(0.02, duration * segWeight);

      for (const [id, v] of Object.entries(fromKf.values)) {
        if (typeof v !== "number") continue;
        if (!isExpressionActiveKey(id, active)) continue;
        orchestrator.ensureProxy(id, v).value = v;
      }

      const targets: DomainScalarMap = {};
      for (const [id, v] of Object.entries(toKf.values)) {
        if (typeof v !== "number") continue;
        if (!isExpressionActiveKey(id, active)) continue;
        targets[id] = v;
      }
      for (const [id, v] of Object.entries(fromKf.values)) {
        if (typeof v !== "number") continue;
        if (!isExpressionActiveKey(id, active)) continue;
        if (targets[id] === undefined) targets[id] = v;
      }

      if (Object.keys(targets).length === 0) {
        segmentIndex += 1;
        playSegment();
        return;
      }

      const baseT = fromKf.t;
      const endT = toKf.t;
      orchestrator.playCoordinated(targets, {
        duration: segDur,
        ease,
        label: `animate-seg-${segmentIndex}`,
        onProgress: (local) => {
          const sessionT = baseT + (endT - baseT) * local;
          // Normalize to 0–1 over full keyframe envelope
          opts?.onProgress?.(clamp01((sessionT - t0) / totalSpan));
        },
        onComplete: () => {
          segmentIndex += 1;
          if (segmentIndex < kfs.length - 1) {
            playSegment();
          } else {
            opts?.onProgress?.(1);
          }
        },
      });
    };

    playSegment();
    return true;
  }

  /** Scrub multi-keyframe graph (or fall back to single-clip seek). */
  scrubOnOrchestrator(
    orchestrator: GasperGsapTrackOrchestrator,
    t: number,
  ): DomainScalarMap {
    const pose = this.evaluateAt(t);
    if (Object.keys(pose).length === 0) {
      orchestrator.seek(t);
      return orchestrator.snapshot();
    }
    orchestrator.applyValues(pose, t);
    return pose;
  }
}
