/**
 * Bridge accepted expression-core 18-anchor kernel IDs ↔ FormMaster face catalog.
 * Kernel remains affect/grammar authority; FormMaster owns face-plane fixture geometry
 * on the packaged Legacy Authority path.
 */

/** Kernel (expression-core / historical-mapping) → FormMaster EMOTION_FIXTURES id. */
export const KERNEL_TO_FORM_MASTER: Readonly<Record<string, string>> = Object.freeze({
  "neutral-settled": "neutral-settled",
  "neutral-social": "neutral-social",
  "neutral-wry": "neutral-wry",
  "listening-open": "listening-orient",
  "listening-focus": "listening-hold",
  "listening-warm": "listening-receive",
  "thinking-knit": "thinking-knit",
  "thinking-scan": "thinking-scan",
  "thinking-resolve": "thinking-resolve",
  "recognition-spark": "mischievous-spark",
  "mischievous-spark": "mischievous-spark",
  "mischievous-side": "mischievous-left",
  "mischievous-hold": "mischievous-right",
  "pleased-glow": "pleased-warm",
  "pleased-soft": "pleased-contained",
  "pleased-bright": "pleased-bright",
  "blocked-stall": "blocked-uncertain",
  "blocked-guard": "blocked-compressed",
  "blocked-strain": "blocked-retry",
});

/** FormMaster / native aliases → kernel id. */
export const FORM_MASTER_TO_KERNEL: Readonly<Record<string, string>> = Object.freeze({
  "listening-orient": "listening-open",
  "listening-hold": "listening-focus",
  "listening-receive": "listening-warm",
  "mischievous-left": "mischievous-side",
  "mischievous-right": "mischievous-hold",
  "pleased-warm": "pleased-glow",
  "pleased-contained": "pleased-soft",
  "blocked-uncertain": "blocked-stall",
  "blocked-compressed": "blocked-guard",
  "blocked-retry": "blocked-strain",
});

/**
 * Keys safe to paint as additive multi-domain life on Legacy Authority
 * AFTER fixture selection. Never includes mass/host scale (overall_width/height)
 * or raw face-shape keys that use incompatible FormMaster units.
 */
export const LEGACY_POST_FIXTURE_SAFE_KEYS = Object.freeze([
  "energy_level",
  "energy_pulse",
  "energy_lag",
  "relief_amplitude",
  "relief_motion_coupling",
  "skin_tension",
  "internal_glow",
  "face_emissive",
  "inertia",
  "settling",
  "rebound",
  "secondary_lag",
  "motion",
] as const);

/** FormMaster-native corner pull keys (applySemanticPose tournament accepts these). */
export const CORNER_PULL_TO_FORM_MASTER = Object.freeze({
  corner_pull_l: "pullL",
  corner_pull_r: "pullR",
} as const);

export function toFormMasterFixtureId(kernelOrAlias: string): string {
  if (KERNEL_TO_FORM_MASTER[kernelOrAlias]) {
    return KERNEL_TO_FORM_MASTER[kernelOrAlias]!;
  }
  if (FORM_MASTER_TO_KERNEL[kernelOrAlias]) {
    // already a FormMaster id
    return kernelOrAlias;
  }
  // pass-through for shared ids (thinking-*, neutral-*)
  return kernelOrAlias;
}

export function toKernelFixtureId(id: string): string {
  if (FORM_MASTER_TO_KERNEL[id]) return FORM_MASTER_TO_KERNEL[id]!;
  if (KERNEL_TO_FORM_MASTER[id]) return id;
  return id;
}

/**
 * Build a Legacy Authority pose: fixture owns face geometry; only additive
 * multi-domain life channels + optional pullL/pullR from grammar deltas.
 */
export function buildLegacySafePose(
  channels: Record<string, number>,
  options?: { includeCornerPull?: boolean },
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of LEGACY_POST_FIXTURE_SAFE_KEYS) {
    const v = channels[k];
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  // Never host mass
  delete out.overall_width;
  delete out.overall_height;

  if (options?.includeCornerPull !== false) {
    const cl = channels.corner_pull_l;
    const cr = channels.corner_pull_r;
    // Domain corner_pull is ~[-0.35,0.35]; FormMaster pull* is similar signed range.
    if (typeof cl === "number" && Number.isFinite(cl)) {
      out.pullL = Math.max(-0.6, Math.min(0.6, cl));
    }
    if (typeof cr === "number" && Number.isFinite(cr)) {
      out.pullR = Math.max(-0.6, Math.min(0.6, cr));
    }
  }
  return out;
}

/** Native (non-legacy) path: full multi-domain, still strip nothing critical. */
export function buildNativePose(channels: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(channels)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

export function isLegacyAuthorityDais(dais: {
  mount?: { legacyFormMaster?: boolean } | null;
} | null | undefined): boolean {
  return !!dais?.mount?.legacyFormMaster;
}
