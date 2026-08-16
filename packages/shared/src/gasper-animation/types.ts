/**
 * Canonical animation types aligned with Rust gasper-document schema 1.1.0.
 * No per-frame transient values — authored clips only.
 */

export const GASPER_SCHEMA_VERSION = "1.1.0";
export const GASPER_FORMAT = "gasper.document";

export type LoopMode = "none" | "loop" | "ping_pong";
export type BlendMode = "replace" | "additive";

/** Allowed easing ids (simple set shared with GSAP). */
export const ANIMATION_EASINGS = [
  "linear",
  "power1.in",
  "power1.out",
  "power1.inOut",
  "power2.in",
  "power2.out",
  "power2.inOut",
  "back.out",
] as const;

export type AnimationEasing = (typeof ANIMATION_EASINGS)[number] | string;

export type AnimationKeyframe = {
  id: string;
  /** Canonical time in ms from clip start. */
  time_ms: number;
  values: Record<string, number>;
  easing: AnimationEasing;
  interpolation: string;
  label?: string;
  curve_meta?: unknown;
};

export type AnimationTrack = {
  id: string;
  label: string;
  domain_id: string;
  binding_ids: string[];
  blend_mode: BlendMode;
  muted: boolean;
  solo: boolean;
  locked: boolean;
  keyframes: AnimationKeyframe[];
};

export type AnimationMarker = {
  id: string;
  time_ms: number;
  label: string;
};

export type AnimationClip = {
  id: string;
  name: string;
  duration_ms: number;
  loop_mode: LoopMode;
  tracks: AnimationTrack[];
  markers: AnimationMarker[];
  /** Content-pack semantic family, preserved through native save/reopen. */
  family?: string;
  /** Content-pack authored hash, distinct from the document hash. */
  content_hash?: string;
  revision: number;
  created_at: string;
  modified_at: string;
};

export type AnimationLibrary = {
  active_clip_id: string | null;
  clips: AnimationClip[];
};

export type TopologyMeta = {
  contour_samples: number;
  structural_nodes: number;
  structural_triangles: number;
  relief_width: number;
  relief_height: number;
  relief_max_samples: number;
};

/**
 * Authored sequence/scene metadata carried by the .gasper document.
 * The content pack owns the vocabulary; the canonical document owns its
 * preservation and hashing so save/reopen cannot silently erase it.
 */
export type GasperContentMeta = Record<string, unknown>;

/** Rust-aligned document (serialized form of .gasper). */
export type GasperCanonicalDocument = {
  format: string;
  schema_version: string;
  id: string;
  created_at: string;
  modified_at: string;
  provenance: string;
  topology: TopologyMeta;
  base_bindings: Record<string, number | string | boolean | null>;
  embodiment_id: string;
  expression_fixture_id: string;
  behavior_policy_ref: string | null;
  animation: AnimationLibrary;
  revision: number;
  dirty: boolean;
  content_hash: string;
  content_meta?: GasperContentMeta;
  migration?: string | null;
};

export type AnimationChangeResult = {
  ok: boolean;
  op: string;
  dirty: boolean;
  revision: number;
  content_hash: string;
  active_clip_id: string | null;
  detail?: string;
  error?: string;
  /** Optional structured payload (clips list, pose, etc.). */
  data?: unknown;
};

export function defaultTopology(): TopologyMeta {
  return {
    contour_samples: 512,
    structural_nodes: 360,
    structural_triangles: 672,
    relief_width: 25,
    relief_height: 40,
    relief_max_samples: 1000,
  };
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function timeMsToNormalized(timeMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return clamp01(timeMs / durationMs);
}

export function normalizedToTimeMs(t: number, durationMs: number): number {
  return Math.round(clamp01(t) * Math.max(1, durationMs));
}

export function isValidEasing(e: string): boolean {
  return (ANIMATION_EASINGS as readonly string[]).includes(e) || /^power[1234]\.(in|out|inOut)$/.test(e);
}
