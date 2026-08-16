/**
 * Shared typed animation command layer (UI + model tools).
 * All mutations go through transactions on a canonical GasperCanonicalDocument.
 * No React state / DOM / SVG / MCP in this module.
 */

import {
  type AnimationChangeResult,
  type AnimationClip,
  type AnimationEasing,
  type AnimationKeyframe,
  type AnimationLibrary,
  type AnimationTrack,
  type GasperCanonicalDocument,
  ANIMATION_EASINGS,
  GASPER_FORMAT,
  GASPER_SCHEMA_VERSION,
  clamp01,
  defaultTopology,
  isValidEasing,
  normalizedToTimeMs,
  timeMsToNormalized,
} from "./types.js";
import { evaluateClipAt, type DomainScalarMap } from "./evaluate.js";

export type LivePoseProvider = () => DomainScalarMap;

export type AnimationCommandHost = {
  /** Apply pose to live Gasper (mixer / GSAP). Optional for pure unit tests. */
  applyPose?: (pose: DomainScalarMap) => void;
  /** Play clip via GSAP orchestrator. */
  playClip?: (
    clip: AnimationClip,
    opts: { onPlayhead?: (t: number) => void },
  ) => void;
  pause?: () => void;
  resume?: () => void;
  interrupt?: () => void;
  /** Current live pose for capture. */
  getLivePose?: LivePoseProvider;
  /** Optional disk/Tauri persist (desktop injects). */
  persistDocument?: (
    doc: GasperCanonicalDocument,
    path: string,
  ) => Promise<{ path: string; ok: boolean }>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Canonical payload for content hash (no wall-clock fields). */
export function contentHashPayload(doc: GasperCanonicalDocument): string {
  const animation = {
    active_clip_id: doc.animation.active_clip_id,
    clips: [...doc.animation.clips]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((c) => ({
        id: c.id,
        name: c.name,
        duration_ms: c.duration_ms,
        loop_mode: c.loop_mode,
        tracks: [...c.tracks]
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((tr) => ({
            ...tr,
            binding_ids: [...tr.binding_ids].sort(),
            keyframes: [...tr.keyframes].sort((a, b) => a.time_ms - b.time_ms),
          })),
        markers: [...c.markers].sort((a, b) => a.time_ms - b.time_ms),
        ...(c.family ? { family: c.family } : {}),
        ...(c.content_hash ? { content_hash: c.content_hash } : {}),
        revision: c.revision,
      })),
  };
  return JSON.stringify({
    id: doc.id,
    schema_version: doc.schema_version,
    topology: doc.topology,
    base_bindings: doc.base_bindings,
    embodiment_id: doc.embodiment_id,
    expression_fixture_id: doc.expression_fixture_id,
    behavior_policy_ref: doc.behavior_policy_ref,
    content_meta: doc.content_meta ?? null,
    animation,
    revision: doc.revision,
  });
}

/**
 * Synchronous stable content hash — settles on the same tick as revision bumps.
 * Closes PHASE1-HASH-LAG for UI/projection listeners (no dual emit).
 */
export function computeContentHashSync(doc: GasperCanonicalDocument): string {
  const payload = contentHashPayload(doc);
  // Expanded FNV-1a cascade → 64 hex (deterministic Node + browser, no subtle race).
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x9e3779b9;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x01000193) >>> 0;
  }
  const parts: string[] = [];
  let a = h1;
  let b = h2;
  for (let i = 0; i < 8; i++) {
    a = Math.imul(a ^ (b + i), 0x85ebca6b) >>> 0;
    b = Math.imul(b ^ (a + i * 17), 0xc2b2ae35) >>> 0;
    parts.push(a.toString(16).padStart(8, "0"));
  }
  return parts.join("").slice(0, 64);
}

/** Stable content hash (sync settle; async wrapper for call-site compatibility). */
export async function computeContentHash(doc: GasperCanonicalDocument): Promise<string> {
  return computeContentHashSync(doc);
}

export function createEmptyDocument(id = "gasper-untitled"): GasperCanonicalDocument {
  const t = nowIso();
  return {
    format: GASPER_FORMAT,
    schema_version: GASPER_SCHEMA_VERSION,
    id,
    created_at: t,
    modified_at: t,
    provenance: "native-studio",
    topology: defaultTopology(),
    base_bindings: {},
    embodiment_id: "presence",
    expression_fixture_id: "neutral-settled",
    behavior_policy_ref: null,
    animation: { active_clip_id: null, clips: [] },
    revision: 1,
    dirty: false,
    content_hash: "pending",
  };
}

export function defaultTracksForClip(): AnimationTrack[] {
  return [
    {
      id: "track-face-gaze",
      label: "Face / Gaze",
      domain_id: "face",
      binding_ids: ["eye_openness", "eye_spacing", "gaze", "mouth_openness", "face_scale"],
      blend_mode: "replace",
      muted: false,
      solo: false,
      locked: false,
      keyframes: [],
    },
    {
      id: "track-macro-form",
      label: "Macro / Form",
      domain_id: "macro",
      binding_ids: ["overall_width", "overall_height", "crown_height", "lower_body_fullness"],
      blend_mode: "replace",
      muted: false,
      solo: false,
      locked: false,
      keyframes: [],
    },
    {
      id: "track-energy-relief",
      label: "Energy / Relief / Dynamics",
      domain_id: "energy",
      binding_ids: [
        "energy_level",
        "energy_pulse",
        "relief_amplitude",
        "secondary_lag",
        "settling",
        "internal_glow",
      ],
      blend_mode: "replace",
      muted: false,
      solo: false,
      locked: false,
      keyframes: [],
    },
  ];
}

/** Deterministic Presence — Thinking Knit acceptance clip (mirrors Rust seed). */
export function buildThinkingKnitClip(): AnimationClip {
  const t = nowIso();
  const duration_ms = 4000;
  const defaults = defaultTracksForClip();
  const face = defaults[0]!;
  const macro = defaults[1]!;
  const energy = defaults[2]!;

  const mk = (
    track: AnimationTrack,
    id: string,
    time_ms: number,
    values: Record<string, number>,
    easing: AnimationEasing,
    label?: string,
  ) => {
    track.keyframes.push({
      id,
      time_ms,
      values,
      easing,
      interpolation: "bezier",
      label,
    });
  };

  mk(face, "kf-face-0", 0, { eye_openness: 0.85, gaze: 0, mouth_openness: 0.22, face_scale: 1 }, "power1.out", "neutral-settled");
  mk(face, "kf-face-45", 1800, { eye_openness: 0.42, gaze: 0.12, mouth_openness: 0.18, face_scale: 1.02 }, "power2.inOut", "thinking-knit");
  mk(face, "kf-face-75", 3000, { eye_openness: 0.32, gaze: 0.18, mouth_openness: 0.15, face_scale: 1.04 }, "power2.inOut", "cognitive-peak");
  mk(face, "kf-face-100", 4000, { eye_openness: 0.82, gaze: 0.02, mouth_openness: 0.22, face_scale: 1 }, "power1.inOut", "return-neutral");

  mk(macro, "kf-macro-0", 0, { overall_width: 0.92, overall_height: 0.94, crown_height: 0.08, lower_body_fullness: 0.95 }, "power1.out");
  mk(macro, "kf-macro-45", 1800, { overall_width: 0.94, overall_height: 0.98, crown_height: 0.28, lower_body_fullness: 0.92 }, "power2.inOut");
  mk(macro, "kf-macro-75", 3000, { overall_width: 0.95, overall_height: 1, crown_height: 0.38, lower_body_fullness: 0.9 }, "power2.inOut");
  mk(macro, "kf-macro-100", 4000, { overall_width: 0.92, overall_height: 0.94, crown_height: 0.1, lower_body_fullness: 0.95 }, "power1.inOut");

  mk(energy, "kf-energy-0", 0, { energy_level: 0.35, energy_pulse: 0.12, relief_amplitude: 0.28, secondary_lag: 0.25, settling: 0.45, internal_glow: 0.32 }, "power1.out");
  mk(energy, "kf-energy-45", 1800, { energy_level: 0.72, energy_pulse: 0.48, relief_amplitude: 0.55, secondary_lag: 0.42, settling: 0.35, internal_glow: 0.58 }, "power2.inOut");
  mk(energy, "kf-energy-75", 3000, { energy_level: 0.88, energy_pulse: 0.62, relief_amplitude: 0.68, secondary_lag: 0.52, settling: 0.28, internal_glow: 0.72 }, "power2.out");
  mk(energy, "kf-energy-100", 4000, { energy_level: 0.4, energy_pulse: 0.18, relief_amplitude: 0.32, secondary_lag: 0.28, settling: 0.5, internal_glow: 0.36 }, "power1.inOut");

  return {
    id: "clip-presence-thinking-knit",
    name: "Presence — Thinking Knit",
    duration_ms,
    loop_mode: "none",
    tracks: [face, macro, energy],
    markers: [
      { id: "mk-neutral", time_ms: 0, label: "neutral-settled" },
      { id: "mk-knit", time_ms: 1800, label: "thinking-knit" },
      { id: "mk-peak", time_ms: 3000, label: "cognitive-peak" },
      { id: "mk-return", time_ms: 4000, label: "return-neutral" },
    ],
    revision: 1,
    created_at: t,
    modified_at: t,
  };
}

/**
 * In-memory animation document session — single source for UI + tools.
 */
export class GasperAnimationCommandSession {
  private doc: GasperCanonicalDocument;
  private undo: GasperCanonicalDocument[] = [];
  private redo: GasperCanonicalDocument[] = [];
  private txn: GasperCanonicalDocument | null = null;
  private playheadMs = 0;
  private path: string | null = null;
  /** Revision of last successful persist. dirty ⇔ revision !== savedRevision. */
  private savedRevision: number;
  private host: AnimationCommandHost = {};
  private listeners = new Set<() => void>();

  constructor(doc?: GasperCanonicalDocument) {
    this.doc = doc ?? createEmptyDocument();
    // Fresh document is clean until the first mutation advances revision.
    this.savedRevision = this.doc.revision;
    this.doc.dirty = false;
  }

  setHost(host: AnimationCommandHost) {
    this.host = host;
  }

  /** Authoritative dirty: current revision differs from last successful save. */
  private recomputeDirty(): void {
    this.doc.dirty = this.doc.revision !== this.savedRevision;
  }

  getSavedRevision(): number {
    return this.savedRevision;
  }

  /** After successful disk write — dirty becomes false without changing revision. */
  markPersisted(path?: string | null): void {
    if (path) this.path = path;
    this.savedRevision = this.doc.revision;
    this.recomputeDirty();
    this.emit();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  getDocument(): GasperCanonicalDocument {
    return structuredClone(this.doc);
  }

  /**
   * Replace working projection with a full document object (showcase load / reopen).
   * Does not write disk — durable save still goes through persistDocument / Tauri.
   */
  loadFromObject(doc: GasperCanonicalDocument, path?: string | null): void {
    this.doc = structuredClone(doc);
    this.undo = [];
    this.redo = [];
    this.txn = null;
    this.playheadMs = 0;
    this.path = path ?? null;
    // Loaded/opened document is clean at its current revision.
    this.savedRevision = this.doc.revision;
    this.doc.dirty = false;
    this.emit();
  }

  getPath(): string | null {
    return this.path;
  }

  getPlayheadMs(): number {
    return this.playheadMs;
  }

  /**
   * Authoritative write of a design/base binding into the canonical document.
   * Live pose paint is separate (preview vs commit on the rig).
   */
  setBaseBindingSync(id: string, value: number): void {
    if (!id || typeof id !== "string") throw new Error("binding id required");
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`invalid binding value for ${id}`);
    }
    const prev = this.doc.base_bindings[id];
    if (typeof prev === "number" && prev === value) return;
    this.withTxnSync(() => {
      this.doc.base_bindings = { ...this.doc.base_bindings, [id]: value };
    });
  }

  getBaseBindings(): Record<string, number | string | boolean | null> {
    return { ...this.doc.base_bindings };
  }

  /**
   * Authoritative embodiment identity on the canonical document.
   * Rig apply is a separate step performed by the host after this write.
   */
  setEmbodimentSync(embodiment_id: string): void {
    if (!embodiment_id || typeof embodiment_id !== "string") {
      throw new Error("embodiment_id required");
    }
    if (this.doc.embodiment_id === embodiment_id) return;
    this.withTxnSync(() => {
      this.doc.embodiment_id = embodiment_id;
    });
  }

  /**
   * Authoritative expression fixture identity on the canonical document.
   * Rig apply is a separate step performed by the host after this write.
   */
  setExpressionSync(expression_fixture_id: string): void {
    if (!expression_fixture_id || typeof expression_fixture_id !== "string") {
      throw new Error("expression_fixture_id required");
    }
    if (this.doc.expression_fixture_id === expression_fixture_id) return;
    this.withTxnSync(() => {
      this.doc.expression_fixture_id = expression_fixture_id;
    });
  }

  /**
   * Sole writer for playhead time (document/runtime clock).
   * Editor presentation must mirror this value after UI scrub/set/play.
   */
  setPlayheadMs(time_ms: number, opts?: { emit?: boolean }): number {
    const clip = this.activeClip();
    const max = clip && clip.duration_ms > 0 ? clip.duration_ms : Math.max(0, time_ms);
    const next = Math.max(0, Math.min(max, time_ms));
    this.playheadMs = next;
    if (opts?.emit !== false) this.emit();
    return this.playheadMs;
  }

  getHistoryState(): { canUndo: boolean; canRedo: boolean } {
    return {
      canUndo: this.undo.length > 0,
      canRedo: this.redo.length > 0,
    };
  }

  getPlayheadNormalized(): number {
    const clip = this.activeClip();
    if (!clip) return 0;
    return timeMsToNormalized(this.playheadMs, clip.duration_ms);
  }

  activeClip(): AnimationClip | null {
    const id = this.doc.animation.active_clip_id;
    if (!id) return this.doc.animation.clips[0] ?? null;
    return this.doc.animation.clips.find((c) => c.id === id) ?? null;
  }

  private async result(
    op: string,
    ok: boolean,
    detail?: string,
    data?: unknown,
    error?: string,
  ): Promise<AnimationChangeResult> {
    this.doc.content_hash = await computeContentHash(this.doc);
    this.emit();
    return {
      ok,
      op,
      dirty: this.doc.dirty,
      revision: this.doc.revision,
      content_hash: this.doc.content_hash,
      active_clip_id: this.doc.animation.active_clip_id,
      detail,
      error,
      data,
    };
  }

  private requireClip(id?: string | null): AnimationClip {
    const clip =
      (id ? this.doc.animation.clips.find((c) => c.id === id) : null) ?? this.activeClip();
    if (!clip) throw new Error("no active animation clip");
    return clip;
  }

  private mutClip(id?: string | null): AnimationClip {
    const clip = this.requireClip(id);
    const idx = this.doc.animation.clips.findIndex((c) => c.id === clip.id);
    const found = this.doc.animation.clips[idx];
    if (!found) throw new Error("clip missing after lookup");
    return found;
  }

  // ─── Transactions ───────────────────────────────────────────────────────

  async begin_animation_transaction(): Promise<AnimationChangeResult> {
    this.txn = structuredClone(this.doc);
    return this.result("begin_animation_transaction", true);
  }

  async commit_animation_transaction(): Promise<AnimationChangeResult> {
    if (!this.txn) return this.result("commit_animation_transaction", false, undefined, undefined, "no transaction");
    this.undo.push(this.txn);
    if (this.undo.length > 64) this.undo.shift();
    this.redo = [];
    this.txn = null;
    this.doc.revision += 1;
    this.doc.modified_at = nowIso();
    this.recomputeDirty();
    return this.result("commit_animation_transaction", true);
  }

  async cancel_animation_transaction(): Promise<AnimationChangeResult> {
    if (!this.txn) return this.result("cancel_animation_transaction", false, undefined, undefined, "no transaction");
    this.doc = this.txn;
    this.txn = null;
    return this.result("cancel_animation_transaction", true);
  }

  private async withTxn<T>(
    op: string,
    fn: () => T | Promise<T>,
  ): Promise<AnimationChangeResult> {
    const auto = !this.txn;
    if (auto) await this.begin_animation_transaction();
    try {
      const data = await fn();
      if (auto) await this.commit_animation_transaction();
      else {
        this.doc.modified_at = nowIso();
        this.recomputeDirty();
      }
      return this.result(op, true, undefined, data);
    } catch (e) {
      if (auto && this.txn) await this.cancel_animation_transaction();
      return this.result(op, false, undefined, undefined, (e as Error).message);
    }
  }

  async undo_animation_edit(): Promise<AnimationChangeResult> {
    const prev = this.undo.pop();
    if (!prev) return this.result("undo_animation_edit", false, undefined, undefined, "nothing to undo");
    this.redo.push(structuredClone(this.doc));
    this.doc = prev;
    this.recomputeDirty();
    return this.result("undo_animation_edit", true);
  }

  async redo_animation_edit(): Promise<AnimationChangeResult> {
    const next = this.redo.pop();
    if (!next) return this.result("redo_animation_edit", false, undefined, undefined, "nothing to redo");
    this.undo.push(structuredClone(this.doc));
    this.doc = next;
    this.recomputeDirty();
    return this.result("redo_animation_edit", true);
  }

  // ─── Inspect ────────────────────────────────────────────────────────────

  async inspect_animation_document(): Promise<AnimationChangeResult> {
    return this.result("inspect_animation_document", true, undefined, {
      id: this.doc.id,
      revision: this.doc.revision,
      dirty: this.doc.dirty,
      content_hash: this.doc.content_hash,
      schema_version: this.doc.schema_version,
      topology: this.doc.topology,
      clip_count: this.doc.animation.clips.length,
      active_clip_id: this.doc.animation.active_clip_id,
      path: this.path,
      playhead_ms: this.playheadMs,
    });
  }

  async list_animation_clips(): Promise<AnimationChangeResult> {
    return this.result(
      "list_animation_clips",
      true,
      undefined,
      this.doc.animation.clips.map((c) => ({
        id: c.id,
        name: c.name,
        duration_ms: c.duration_ms,
        track_count: c.tracks.length,
        keyframe_count: c.tracks.reduce((n, t) => n + t.keyframes.length, 0),
        marker_count: c.markers.length,
      })),
    );
  }

  // ─── Clips ──────────────────────────────────────────────────────────────

  async create_animation_clip(input: {
    name?: string;
    duration_ms?: number;
    id?: string;
    with_default_tracks?: boolean;
  }): Promise<AnimationChangeResult> {
    return this.withTxn("create_animation_clip", () => {
      const clip: AnimationClip = {
        id: input.id ?? newId("clip"),
        name: input.name ?? "Untitled Clip",
        duration_ms: Math.max(1, input.duration_ms ?? 4000),
        loop_mode: "none",
        tracks: input.with_default_tracks === false ? [] : defaultTracksForClip(),
        markers: [],
        revision: 1,
        created_at: nowIso(),
        modified_at: nowIso(),
      };
      this.doc.animation.clips.push(clip);
      this.doc.animation.active_clip_id = clip.id;
      return { clip_id: clip.id, name: clip.name };
    });
  }

  async select_animation_clip(input: { clip_id: string }): Promise<AnimationChangeResult> {
    if (!this.doc.animation.clips.some((c) => c.id === input.clip_id)) {
      return this.result(
        "select_animation_clip",
        false,
        undefined,
        undefined,
        `clip not found: ${input.clip_id}`,
      );
    }
    if (this.doc.animation.active_clip_id === input.clip_id) {
      return this.result("select_animation_clip", true, "unchanged", {
        clip_id: input.clip_id,
        unchanged: true,
      });
    }
    return this.withTxn("select_animation_clip", () => {
      this.doc.animation.active_clip_id = input.clip_id;
      this.playheadMs = 0;
      return { clip_id: input.clip_id, unchanged: false };
    });
  }

  async rename_animation_clip(input: { clip_id?: string; name: string }): Promise<AnimationChangeResult> {
    return this.withTxn("rename_animation_clip", () => {
      const clip = this.mutClip(input.clip_id);
      clip.name = input.name;
      clip.modified_at = nowIso();
      clip.revision += 1;
      return { clip_id: clip.id, name: clip.name };
    });
  }

  async set_animation_duration(input: {
    clip_id?: string;
    duration_ms: number;
  }): Promise<AnimationChangeResult> {
    return this.withTxn("set_animation_duration", () => {
      const clip = this.mutClip(input.clip_id);
      clip.duration_ms = Math.max(1, input.duration_ms);
      clip.modified_at = nowIso();
      return { duration_ms: clip.duration_ms };
    });
  }

  async add_animation_marker(input: {
    clip_id?: string;
    marker_id?: string;
    time_ms: number;
    label: string;
  }): Promise<AnimationChangeResult> {
    return this.withTxn("add_animation_marker", () => {
      const clip = this.mutClip(input.clip_id);
      const label = input.label.trim();
      if (!label) throw new Error("marker label required");
      if (!Number.isFinite(input.time_ms)) throw new Error("marker time_ms must be finite");
      const marker = {
        id: input.marker_id ?? newId("marker"),
        time_ms: Math.max(0, Math.min(clip.duration_ms, input.time_ms)),
        label,
      };
      if (clip.markers.some((candidate) => candidate.id === marker.id)) {
        throw new Error(`marker already exists: ${marker.id}`);
      }
      clip.markers.push(marker);
      clip.markers.sort((a, b) => a.time_ms - b.time_ms);
      clip.modified_at = nowIso();
      clip.revision += 1;
      return { clip_id: clip.id, marker_id: marker.id, marker };
    });
  }

  async move_animation_marker(input: {
    clip_id?: string;
    marker_id: string;
    time_ms: number;
  }): Promise<AnimationChangeResult> {
    return this.withTxn("move_animation_marker", () => {
      const clip = this.mutClip(input.clip_id);
      const marker = clip.markers.find((candidate) => candidate.id === input.marker_id);
      if (!marker) throw new Error(`marker not found: ${input.marker_id}`);
      if (!Number.isFinite(input.time_ms)) throw new Error("marker time_ms must be finite");
      marker.time_ms = Math.max(0, Math.min(clip.duration_ms, input.time_ms));
      clip.markers.sort((a, b) => a.time_ms - b.time_ms);
      clip.modified_at = nowIso();
      clip.revision += 1;
      return { clip_id: clip.id, marker_id: marker.id, time_ms: marker.time_ms };
    });
  }

  async delete_animation_marker(input: {
    clip_id?: string;
    marker_id: string;
  }): Promise<AnimationChangeResult> {
    return this.withTxn("delete_animation_marker", () => {
      const clip = this.mutClip(input.clip_id);
      const before = clip.markers.length;
      clip.markers = clip.markers.filter((candidate) => candidate.id !== input.marker_id);
      if (clip.markers.length === before) throw new Error(`marker not found: ${input.marker_id}`);
      clip.modified_at = nowIso();
      clip.revision += 1;
      return { clip_id: clip.id, marker_id: input.marker_id };
    });
  }

  async seed_thinking_knit(): Promise<AnimationChangeResult> {
    return this.withTxn("seed_thinking_knit", () => {
      const clip = buildThinkingKnitClip();
      this.doc.animation.clips = this.doc.animation.clips.filter((c) => c.id !== clip.id);
      this.doc.animation.clips.push(clip);
      this.doc.animation.active_clip_id = clip.id;
      this.doc.embodiment_id = "presence";
      this.doc.expression_fixture_id = "neutral-settled";
      return { clip_id: clip.id, name: clip.name, tracks: clip.tracks.length };
    });
  }

  // ─── Tracks ─────────────────────────────────────────────────────────────

  async create_animation_track(input: {
    clip_id?: string;
    id?: string;
    label: string;
    domain_id: string;
    binding_ids: string[];
  }): Promise<AnimationChangeResult> {
    return this.withTxn("create_animation_track", () => {
      const clip = this.mutClip(input.clip_id);
      const tr: AnimationTrack = {
        id: input.id ?? newId("track"),
        label: input.label,
        domain_id: input.domain_id,
        binding_ids: [...input.binding_ids],
        blend_mode: "replace",
        muted: false,
        solo: false,
        locked: false,
        keyframes: [],
      };
      clip.tracks.push(tr);
      clip.modified_at = nowIso();
      return { track_id: tr.id };
    });
  }

  async set_animation_track_state(input: {
    clip_id?: string;
    track_id: string;
    muted?: boolean;
    solo?: boolean;
    locked?: boolean;
  }): Promise<AnimationChangeResult> {
    return this.withTxn("set_animation_track_state", () => {
      const clip = this.mutClip(input.clip_id);
      const tr = clip.tracks.find((t) => t.id === input.track_id);
      if (!tr) throw new Error(`track not found: ${input.track_id}`);
      if (tr.locked && (input.muted !== undefined || input.solo !== undefined) && input.locked !== false) {
        // allow unlock
        if (input.locked === undefined && (input.muted !== undefined || input.solo !== undefined)) {
          throw new Error("track is locked");
        }
      }
      if (typeof input.muted === "boolean") {
        if (tr.locked) throw new Error("track is locked");
        tr.muted = input.muted;
      }
      if (typeof input.solo === "boolean") {
        if (tr.locked) throw new Error("track is locked");
        tr.solo = input.solo;
      }
      if (typeof input.locked === "boolean") tr.locked = input.locked;
      return { track_id: tr.id, muted: tr.muted, solo: tr.solo, locked: tr.locked };
    });
  }

  // ─── Keyframes ──────────────────────────────────────────────────────────

  async capture_animation_keyframe(input: {
    clip_id?: string;
    track_id?: string;
    time_ms?: number;
    t?: number;
    label?: string;
  }): Promise<AnimationChangeResult> {
    return this.withTxn("capture_animation_keyframe", () => {
      const clip = this.mutClip(input.clip_id);
      const time_ms =
        typeof input.time_ms === "number"
          ? input.time_ms
          : typeof input.t === "number"
            ? normalizedToTimeMs(input.t, clip.duration_ms)
            : this.playheadMs;
      const live = this.host.getLivePose?.() ?? {};
      const tracks = input.track_id
        ? clip.tracks.filter((t) => t.id === input.track_id)
        : clip.tracks;
      const created: string[] = [];
      for (const tr of tracks) {
        if (tr.locked) continue;
        const values: Record<string, number> = {};
        for (const bid of tr.binding_ids) {
          if (typeof live[bid] === "number") values[bid] = live[bid];
        }
        if (Object.keys(values).length === 0) continue;
        tr.keyframes = tr.keyframes.filter((k) => Math.abs(k.time_ms - time_ms) > 1);
        const kf: AnimationKeyframe = {
          id: newId("kf"),
          time_ms,
          values,
          easing: "power2.inOut",
          interpolation: "bezier",
          label: input.label,
        };
        tr.keyframes.push(kf);
        tr.keyframes.sort((a, b) => a.time_ms - b.time_ms);
        created.push(kf.id);
      }
      this.playheadMs = time_ms;
      clip.modified_at = nowIso();
      return { time_ms, keyframe_ids: created };
    });
  }

  async add_animation_keyframe(input: {
    clip_id?: string;
    track_id: string;
    time_ms: number;
    values: Record<string, number>;
    easing?: AnimationEasing;
    label?: string;
    id?: string;
  }): Promise<AnimationChangeResult> {
    return this.withTxn("add_animation_keyframe", () => {
      const clip = this.mutClip(input.clip_id);
      const tr = clip.tracks.find((t) => t.id === input.track_id);
      if (!tr) throw new Error(`track not found: ${input.track_id}`);
      if (tr.locked) throw new Error("track is locked");
      if (input.time_ms > clip.duration_ms) throw new Error("time_ms exceeds duration");
      const easing = input.easing ?? "power2.inOut";
      if (!isValidEasing(easing)) throw new Error(`invalid easing: ${easing}`);
      const kf: AnimationKeyframe = {
        id: input.id ?? newId("kf"),
        time_ms: input.time_ms,
        values: { ...input.values },
        easing,
        interpolation: "bezier",
        label: input.label,
      };
      tr.keyframes.push(kf);
      tr.keyframes.sort((a, b) => a.time_ms - b.time_ms);
      clip.modified_at = nowIso();
      return { keyframe_id: kf.id, track_id: tr.id };
    });
  }

  async update_animation_keyframe(input: {
    clip_id?: string;
    track_id: string;
    keyframe_id: string;
    values?: Record<string, number>;
    label?: string;
  }): Promise<AnimationChangeResult> {
    return this.withTxn("update_animation_keyframe", () => {
      const { kf, clip } = this.findKf(input.clip_id, input.track_id, input.keyframe_id, true);
      if (input.values) kf.values = { ...kf.values, ...input.values };
      if (input.label !== undefined) kf.label = input.label;
      clip.modified_at = nowIso();
      return { keyframe_id: kf.id };
    });
  }

  async move_animation_keyframe(input: {
    clip_id?: string;
    track_id: string;
    keyframe_id: string;
    time_ms: number;
  }): Promise<AnimationChangeResult> {
    return this.withTxn("move_animation_keyframe", () => {
      const { kf, tr, clip } = this.findKf(input.clip_id, input.track_id, input.keyframe_id, true);
      if (input.time_ms > clip.duration_ms) throw new Error("time_ms exceeds duration");
      kf.time_ms = Math.max(0, input.time_ms);
      tr.keyframes.sort((a, b) => a.time_ms - b.time_ms);
      clip.modified_at = nowIso();
      return { keyframe_id: kf.id, time_ms: kf.time_ms };
    });
  }

  async duplicate_animation_keyframe(input: {
    clip_id?: string;
    track_id: string;
    keyframe_id: string;
    time_ms?: number;
  }): Promise<AnimationChangeResult> {
    return this.withTxn("duplicate_animation_keyframe", () => {
      const { kf, tr, clip } = this.findKf(input.clip_id, input.track_id, input.keyframe_id, true);
      const dup: AnimationKeyframe = {
        ...kf,
        id: newId("kf"),
        time_ms:
          typeof input.time_ms === "number"
            ? input.time_ms
            : Math.min(clip.duration_ms, kf.time_ms + 100),
        values: { ...kf.values },
        label: kf.label ? `${kf.label} copy` : undefined,
      };
      tr.keyframes.push(dup);
      tr.keyframes.sort((a, b) => a.time_ms - b.time_ms);
      clip.modified_at = nowIso();
      return { keyframe_id: dup.id, time_ms: dup.time_ms };
    });
  }

  async delete_animation_keyframe(input: {
    clip_id?: string;
    track_id: string;
    keyframe_id: string;
  }): Promise<AnimationChangeResult> {
    return this.withTxn("delete_animation_keyframe", () => {
      const clip = this.mutClip(input.clip_id);
      const tr = clip.tracks.find((t) => t.id === input.track_id);
      if (!tr) throw new Error(`track not found: ${input.track_id}`);
      if (tr.locked) throw new Error("track is locked");
      const before = tr.keyframes.length;
      tr.keyframes = tr.keyframes.filter((k) => k.id !== input.keyframe_id);
      if (tr.keyframes.length === before) throw new Error("keyframe not found");
      clip.modified_at = nowIso();
      return { deleted: input.keyframe_id };
    });
  }

  async set_keyframe_easing(input: {
    clip_id?: string;
    track_id: string;
    keyframe_id: string;
    easing: AnimationEasing;
  }): Promise<AnimationChangeResult> {
    return this.withTxn("set_keyframe_easing", () => {
      if (!isValidEasing(input.easing)) throw new Error(`invalid easing: ${input.easing}`);
      const { kf, clip } = this.findKf(input.clip_id, input.track_id, input.keyframe_id, true);
      kf.easing = input.easing;
      clip.modified_at = nowIso();
      return { keyframe_id: kf.id, easing: kf.easing };
    });
  }

  private findKf(
    clipId: string | undefined | null,
    trackId: string,
    keyframeId: string,
    requireUnlocked: boolean,
  ): { kf: AnimationKeyframe; tr: AnimationTrack; clip: AnimationClip } {
    const clip = this.mutClip(clipId);
    const tr = clip.tracks.find((t) => t.id === trackId);
    if (!tr) throw new Error(`track not found: ${trackId}`);
    if (requireUnlocked && tr.locked) throw new Error("track is locked");
    const kf = tr.keyframes.find((k) => k.id === keyframeId);
    if (!kf) throw new Error(`keyframe not found: ${keyframeId}`);
    return { kf, tr, clip };
  }

  // ─── Playback ───────────────────────────────────────────────────────────

  async inspect_animation_pose(input?: {
    t?: number;
    time_ms?: number;
  }): Promise<AnimationChangeResult> {
    const clip = this.activeClip();
    if (!clip) return this.result("inspect_animation_pose", false, undefined, undefined, "no clip");
    const pose = evaluateClipAt(clip, {
      t: input?.t,
      time_ms: input?.time_ms ?? this.playheadMs,
    });
    return this.result("inspect_animation_pose", true, undefined, {
      pose,
      playhead_ms: this.playheadMs,
      clip_id: clip.id,
    });
  }

  async scrub_animation(input: { t?: number; time_ms?: number }): Promise<AnimationChangeResult> {
    const clip = this.activeClip();
    if (!clip) return this.result("scrub_animation", false, undefined, undefined, "no clip");
    const time_ms =
      typeof input.time_ms === "number"
        ? input.time_ms
        : normalizedToTimeMs(input.t ?? 0, clip.duration_ms);
    this.setPlayheadMs(time_ms, { emit: false });
    const pose = evaluateClipAt(clip, { time_ms: this.playheadMs });
    this.host.applyPose?.(pose);
    return this.result("scrub_animation", true, undefined, {
      playhead_ms: this.playheadMs,
      t: timeMsToNormalized(this.playheadMs, clip.duration_ms),
      pose,
    });
  }

  async play_animation(input?: { clip_id?: string }): Promise<AnimationChangeResult> {
    if (input?.clip_id) {
      this.doc.animation.active_clip_id = input.clip_id;
    }
    const clip = this.activeClip();
    if (!clip) return this.result("play_animation", false, undefined, undefined, "no clip");
    if (this.host.playClip) {
      this.host.playClip(clip, {
        onPlayhead: (t) => {
          this.setPlayheadMs(normalizedToTimeMs(t, clip.duration_ms), { emit: true });
        },
      });
    } else {
      // Pure fallback: apply start pose
      const pose = evaluateClipAt(clip, { t: 0 });
      this.host.applyPose?.(pose);
    }
    return this.result("play_animation", true, undefined, { clip_id: clip.id });
  }

  async pause_animation(): Promise<AnimationChangeResult> {
    this.host.pause?.();
    return this.result("pause_animation", true);
  }

  async interrupt_animation(): Promise<AnimationChangeResult> {
    this.host.interrupt?.();
    return this.result("interrupt_animation", true, undefined, {
      playhead_ms: this.playheadMs,
    });
  }

  // ─── Persist ────────────────────────────────────────────────────────────

  async save_gasper_document(input?: { path?: string }): Promise<AnimationChangeResult> {
    this.doc.schema_version = GASPER_SCHEMA_VERSION;
    this.doc.format = GASPER_FORMAT;
    this.doc.modified_at = nowIso();
    this.doc.content_hash = await computeContentHash(this.doc);
    const path = input?.path ?? this.path;
    if (!path) {
      return this.result(
        "save_gasper_document",
        false,
        undefined,
        { document: this.doc },
        "no path — pass path for save (or save-as)",
      );
    }
    try {
      // Real persistence: Tauri invoke when available, else Node fs (tests / headless).
      let written: { path: string; ok: boolean };
      if (this.host.persistDocument) {
        written = await this.host.persistDocument(this.doc, path);
      } else {
        // Browser/WebView: must use host.persistDocument (Tauri). Node tests
        // register host.persistDocument via node-persist module — never import
        // node:fs here (Vite would externalize/break browser bundles).
        throw new Error(
          "save requires host.persistDocument (Tauri gasper_save_cmd) or Node test host",
        );
      }
      // Only after successful write: advance savedRevision → clean.
      this.path = written.path;
      this.savedRevision = this.doc.revision;
      this.recomputeDirty();
      this.doc.content_hash = await computeContentHash(this.doc);
      return this.result("save_gasper_document", true, undefined, {
        path: written.path,
        content_hash: this.doc.content_hash,
        revision: this.doc.revision,
        saved_revision: this.savedRevision,
        document: this.doc,
      });
    } catch (e) {
      // Failed save: do not advance savedRevision; dirty remains truthful.
      this.recomputeDirty();
      return this.result(
        "save_gasper_document",
        false,
        undefined,
        { document: this.doc, path },
        (e as Error).message,
      );
    }
  }

  /** Load document from JSON (Rust-compatible). */
  async loadDocument(doc: GasperCanonicalDocument, path?: string | null): Promise<AnimationChangeResult> {
    this.doc = structuredClone(doc);
    if (this.doc.schema_version === "1.0.0") {
      this.doc.schema_version = GASPER_SCHEMA_VERSION;
      this.doc.migration = "migrated_from_1.0.0_added_animation_library";
      this.doc.animation = this.doc.animation ?? { active_clip_id: null, clips: [] };
    }
    this.path = path ?? null;
    this.doc.content_hash = await computeContentHash(this.doc);
    this.undo = [];
    this.redo = [];
    this.playheadMs = 0;
    this.savedRevision = this.doc.revision;
    this.doc.dirty = false;
    return this.result("load_document", true, undefined, {
      clip_count: this.doc.animation.clips.length,
      content_hash: this.doc.content_hash,
    });
  }

  async new_document(id?: string): Promise<AnimationChangeResult> {
    this.doc = createEmptyDocument(id);
    this.path = null;
    this.undo = [];
    this.redo = [];
    this.playheadMs = 0;
    this.savedRevision = this.doc.revision;
    this.doc.dirty = false;
    this.doc.content_hash = await computeContentHash(this.doc);
    return this.result("new_document", true);
  }

  /**
   * Synchronous transaction helper for the editor bridge (UI is single-threaded).
   * Keeps TS working projection consistent without awaiting microtasks.
   */
  private withTxnSync<T>(fn: () => T): T {
    this.undo.push(structuredClone(this.doc));
    if (this.undo.length > 64) this.undo.shift();
    this.redo = [];
    try {
      const data = fn();
      this.doc.revision += 1;
      this.doc.modified_at = nowIso();
      this.recomputeDirty();
      // PHASE1-HASH-LAG closed: hash settles on the same tick as revision (one emit).
      this.doc.content_hash = computeContentHashSync(this.doc);
      this.emit();
      return data;
    } catch (e) {
      const prev = this.undo.pop();
      if (prev) this.doc = prev;
      this.recomputeDirty();
      throw e;
    }
  }

  /** Sync create clip for editor timeline (shared UI + MCP projection). */
  createClipSync(input: {
    name?: string;
    duration_ms?: number;
    id?: string;
    with_default_tracks?: boolean;
  }): { clip_id: string } {
    return this.withTxnSync(() => {
      const clip: AnimationClip = {
        id: input.id ?? newId("clip"),
        name: input.name ?? "Untitled Clip",
        duration_ms: Math.max(1, input.duration_ms ?? 4000),
        loop_mode: "none",
        tracks: input.with_default_tracks === false ? [] : defaultTracksForClip(),
        markers: [],
        revision: 1,
        created_at: nowIso(),
        modified_at: nowIso(),
      };
      this.doc.animation.clips.push(clip);
      this.doc.animation.active_clip_id = clip.id;
      return { clip_id: clip.id };
    });
  }

  createTrackSync(input: {
    label: string;
    domain_id?: string;
    binding_ids: string[];
    id?: string;
  }): { track_id: string } {
    return this.withTxnSync(() => {
      const clip = this.mutClip(null);
      const tr: AnimationTrack = {
        id: input.id ?? newId("track"),
        label: input.label,
        domain_id: input.domain_id ?? "face",
        binding_ids: [...input.binding_ids],
        blend_mode: "replace",
        muted: false,
        solo: false,
        locked: false,
        keyframes: [],
      };
      clip.tracks.push(tr);
      clip.modified_at = nowIso();
      return { track_id: tr.id };
    });
  }

  captureKeyframeSync(input: {
    time_ms?: number;
    t?: number;
    values?: Record<string, number>;
  }): { created: string[] } {
    return this.withTxnSync(() => {
      const clip = this.mutClip(null);
      const time_ms =
        typeof input.time_ms === "number"
          ? input.time_ms
          : typeof input.t === "number"
            ? normalizedToTimeMs(input.t, clip.duration_ms)
            : this.playheadMs;
      const live = input.values ?? this.host.getLivePose?.() ?? {};
      const created: string[] = [];
      for (const tr of clip.tracks) {
        if (tr.locked) continue;
        const values: Record<string, number> = {};
        for (const bid of tr.binding_ids) {
          if (typeof live[bid] === "number") values[bid] = live[bid]!;
        }
        if (Object.keys(values).length === 0) continue;
        tr.keyframes = tr.keyframes.filter((k) => Math.abs(k.time_ms - time_ms) > 1);
        const kf: AnimationKeyframe = {
          id: newId("kf"),
          time_ms,
          values,
          easing: "power2.inOut",
          interpolation: "bezier",
        };
        tr.keyframes.push(kf);
        tr.keyframes.sort((a, b) => a.time_ms - b.time_ms);
        created.push(kf.id);
      }
      this.playheadMs = time_ms;
      clip.modified_at = nowIso();
      return { created };
    });
  }

  addMarkerSync(input: {
    clip_id?: string;
    marker_id?: string;
    time_ms: number;
    label: string;
  }): { clip_id: string; marker_id: string } {
    return this.withTxnSync(() => {
      const clip = this.mutClip(input.clip_id);
      const label = input.label.trim();
      if (!label) throw new Error("marker label required");
      if (!Number.isFinite(input.time_ms)) throw new Error("marker time_ms must be finite");
      const marker = {
        id: input.marker_id ?? newId("marker"),
        time_ms: Math.max(0, Math.min(clip.duration_ms, input.time_ms)),
        label,
      };
      if (clip.markers.some((candidate) => candidate.id === marker.id)) {
        throw new Error(`marker already exists: ${marker.id}`);
      }
      clip.markers.push(marker);
      clip.markers.sort((a, b) => a.time_ms - b.time_ms);
      clip.modified_at = nowIso();
      clip.revision += 1;
      return { clip_id: clip.id, marker_id: marker.id };
    });
  }

  moveMarkerSync(input: { clip_id?: string; marker_id: string; time_ms: number }): void {
    this.withTxnSync(() => {
      const clip = this.mutClip(input.clip_id);
      const marker = clip.markers.find((candidate) => candidate.id === input.marker_id);
      if (!marker) throw new Error(`marker not found: ${input.marker_id}`);
      if (!Number.isFinite(input.time_ms)) throw new Error("marker time_ms must be finite");
      marker.time_ms = Math.max(0, Math.min(clip.duration_ms, input.time_ms));
      clip.markers.sort((a, b) => a.time_ms - b.time_ms);
      clip.modified_at = nowIso();
      clip.revision += 1;
    });
  }

  deleteMarkerSync(input: { clip_id?: string; marker_id: string }): void {
    this.withTxnSync(() => {
      const clip = this.mutClip(input.clip_id);
      const before = clip.markers.length;
      clip.markers = clip.markers.filter((candidate) => candidate.id !== input.marker_id);
      if (clip.markers.length === before) throw new Error(`marker not found: ${input.marker_id}`);
      clip.modified_at = nowIso();
      clip.revision += 1;
    });
  }

  moveKeyframeSync(input: {
    track_id: string;
    keyframe_id: string;
    time_ms: number;
  }): void {
    this.withTxnSync(() => {
      const { kf, tr, clip } = this.findKf(null, input.track_id, input.keyframe_id, true);
      if (input.time_ms > clip.duration_ms) throw new Error("time_ms exceeds duration");
      kf.time_ms = Math.max(0, input.time_ms);
      tr.keyframes.sort((a, b) => a.time_ms - b.time_ms);
      clip.modified_at = nowIso();
    });
  }

  deleteKeyframeSync(input: { track_id: string; keyframe_id: string }): void {
    this.withTxnSync(() => {
      const clip = this.mutClip(null);
      const tr = clip.tracks.find((t) => t.id === input.track_id);
      if (!tr) throw new Error(`track not found: ${input.track_id}`);
      const before = tr.keyframes.length;
      tr.keyframes = tr.keyframes.filter((k) => k.id !== input.keyframe_id);
      if (tr.keyframes.length === before) throw new Error(`keyframe not found: ${input.keyframe_id}`);
      clip.modified_at = nowIso();
    });
  }

  selectClipSync(clip_id: string): void {
    if (!this.doc.animation.clips.some((c) => c.id === clip_id)) {
      throw new Error(`clip not found: ${clip_id}`);
    }
    if (this.doc.animation.active_clip_id === clip_id) return;
    this.withTxnSync(() => {
      this.doc.animation.active_clip_id = clip_id;
      this.playheadMs = 0;
    });
  }

  undoSync(): boolean {
    const prev = this.undo.pop();
    if (!prev) return false;
    this.redo.push(structuredClone(this.doc));
    this.doc = prev;
    this.recomputeDirty();
    this.doc.content_hash = computeContentHashSync(this.doc);
    this.emit();
    return true;
  }

  redoSync(): boolean {
    const next = this.redo.pop();
    if (!next) return false;
    this.undo.push(structuredClone(this.doc));
    this.doc = next;
    this.recomputeDirty();
    this.doc.content_hash = computeContentHashSync(this.doc);
    this.emit();
    return true;
  }

  seedThinkingKnitSync(): void {
    this.withTxnSync(() => {
      const clip = buildThinkingKnitClip();
      this.doc.animation.clips = this.doc.animation.clips.filter((c) => c.id !== clip.id);
      this.doc.animation.clips.push(clip);
      this.doc.animation.active_clip_id = clip.id;
      this.doc.embodiment_id = "presence";
      this.doc.expression_fixture_id = "neutral-settled";
    });
  }

  /** Dispatch by name for model tools. */
  async dispatch(
    op: string,
    params: Record<string, unknown> = {},
  ): Promise<AnimationChangeResult> {
    const map: Record<string, (p: Record<string, unknown>) => Promise<AnimationChangeResult>> = {
      inspect_animation_document: () => this.inspect_animation_document(),
      list_animation_clips: () => this.list_animation_clips(),
      create_animation_clip: (p) => this.create_animation_clip(p as never),
      select_animation_clip: (p) => this.select_animation_clip(p as never),
      rename_animation_clip: (p) => this.rename_animation_clip(p as never),
      set_animation_duration: (p) => this.set_animation_duration(p as never),
      add_animation_marker: (p) => this.add_animation_marker(p as never),
      move_animation_marker: (p) => this.move_animation_marker(p as never),
      delete_animation_marker: (p) => this.delete_animation_marker(p as never),
      create_animation_track: (p) => this.create_animation_track(p as never),
      set_animation_track_state: (p) => this.set_animation_track_state(p as never),
      capture_animation_keyframe: (p) => this.capture_animation_keyframe(p as never),
      add_animation_keyframe: (p) => this.add_animation_keyframe(p as never),
      update_animation_keyframe: (p) => this.update_animation_keyframe(p as never),
      move_animation_keyframe: (p) => this.move_animation_keyframe(p as never),
      duplicate_animation_keyframe: (p) => this.duplicate_animation_keyframe(p as never),
      delete_animation_keyframe: (p) => this.delete_animation_keyframe(p as never),
      set_keyframe_easing: (p) => this.set_keyframe_easing(p as never),
      inspect_animation_pose: (p) => this.inspect_animation_pose(p as never),
      scrub_animation: (p) => this.scrub_animation(p as never),
      play_animation: (p) => this.play_animation(p as never),
      pause_animation: () => this.pause_animation(),
      interrupt_animation: () => this.interrupt_animation(),
      begin_animation_transaction: () => this.begin_animation_transaction(),
      commit_animation_transaction: () => this.commit_animation_transaction(),
      cancel_animation_transaction: () => this.cancel_animation_transaction(),
      undo_animation_edit: () => this.undo_animation_edit(),
      redo_animation_edit: () => this.redo_animation_edit(),
      save_gasper_document: (p) => this.save_gasper_document(p as never),
      seed_thinking_knit: () => this.seed_thinking_knit(),
    };
    const fn = map[op];
    if (!fn) {
      return this.result(op, false, undefined, undefined, `unknown op: ${op}`);
    }
    return fn(params);
  }
}

/** Singleton for Studio + tools. */
let globalSession: GasperAnimationCommandSession | null = null;
let nodeHostAttached = false;

function attachNodePersistIfNeeded(session: GasperAnimationCommandSession): void {
  if (nodeHostAttached) return;
  if (typeof process === "undefined" || !process.versions?.node) return;
  // Node/tests only. Vite browser builds do not execute this branch (no process.versions.node
  // in WebView). Static analysis may see the import string; gasper-studio vite marks /^node:/
  // external and Studio dist greps clean of node builtins.
  session.setHost({
    persistDocument: async (doc, path) => {
      const { nodePersistDocument } = await import(
        /* @vite-ignore */ "./node-persist.js"
      );
      return nodePersistDocument(doc, path);
    },
  });
  nodeHostAttached = true;
}

export function getAnimationCommandSession(): GasperAnimationCommandSession {
  if (!globalSession) {
    globalSession = new GasperAnimationCommandSession();
    attachNodePersistIfNeeded(globalSession);
  }
  return globalSession;
}

export function resetAnimationCommandSessionForTests(): GasperAnimationCommandSession {
  globalSession = new GasperAnimationCommandSession();
  nodeHostAttached = false;
  attachNodePersistIfNeeded(globalSession);
  return globalSession;
}

export { ANIMATION_EASINGS, evaluateClipAt };
