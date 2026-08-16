/**
 * Physically coherent bounded deformation limits for Gasper morphology.
 * A contour-only or host-scale-only transform is INVALID as complete morph.
 */

export const MORPHOLOGY_BOUND_VERSION = "1.0.0-expression-studio" as const;

export type ChannelBound = {
  id: string;
  min: number;
  max: number;
  /** Soft aesthetic comfort band (still clamped to min/max). */
  softMin?: number;
  softMax?: number;
  domain:
    | "macro"
    | "face"
    | "energy"
    | "relief"
    | "skin"
    | "optics"
    | "dynamics"
    | "texture";
};

/** Production channel bounds — physically coherent for the dark-pearl shell. */
export const CHANNEL_BOUNDS: readonly ChannelBound[] = Object.freeze([
  { id: "overall_width", min: 0.82, max: 1.22, softMin: 0.9, softMax: 1.12, domain: "macro" },
  { id: "overall_height", min: 0.82, max: 1.22, softMin: 0.9, softMax: 1.12, domain: "macro" },
  { id: "crown_height", min: 0, max: 0.35, softMin: 0, softMax: 0.22, domain: "macro" },
  { id: "lower_body_fullness", min: 0.7, max: 1.3, softMin: 0.85, softMax: 1.15, domain: "macro" },
  { id: "ground_flattening", min: 0, max: 0.4, softMin: 0, softMax: 0.22, domain: "macro" },
  { id: "face_scale", min: 0.88, max: 1.12, softMin: 0.94, softMax: 1.08, domain: "face" },
  { id: "eye_openness", min: 0.08, max: 0.95, softMin: 0.2, softMax: 0.85, domain: "face" },
  { id: "eye_spacing", min: -0.2, max: 0.2, softMin: -0.12, softMax: 0.12, domain: "face" },
  { id: "gaze", min: -0.5, max: 0.5, softMin: -0.35, softMax: 0.35, domain: "face" },
  { id: "mouth_openness", min: 0.05, max: 0.75, softMin: 0.12, softMax: 0.55, domain: "face" },
  { id: "mouth_width", min: 0.75, max: 1.25, softMin: 0.88, softMax: 1.15, domain: "face" },
  { id: "corner_pull_l", min: -0.35, max: 0.35, softMin: -0.22, softMax: 0.22, domain: "face" },
  { id: "corner_pull_r", min: -0.35, max: 0.35, softMin: -0.22, softMax: 0.22, domain: "face" },
  { id: "energy_level", min: 0.1, max: 1, softMin: 0.25, softMax: 0.9, domain: "energy" },
  { id: "energy_pulse", min: 0, max: 0.85, softMin: 0.05, softMax: 0.55, domain: "energy" },
  { id: "energy_lag", min: 0.05, max: 0.9, softMin: 0.15, softMax: 0.75, domain: "energy" },
  { id: "relief_amplitude", min: 0.1, max: 0.9, softMin: 0.25, softMax: 0.7, domain: "relief" },
  { id: "skin_tension", min: 0.1, max: 0.95, softMin: 0.25, softMax: 0.8, domain: "skin" },
  { id: "internal_glow", min: 0.1, max: 0.9, softMin: 0.25, softMax: 0.7, domain: "optics" },
  { id: "face_emissive", min: 0.05, max: 0.85, softMin: 0.15, softMax: 0.65, domain: "optics" },
  { id: "inertia", min: 0.1, max: 0.9, softMin: 0.2, softMax: 0.7, domain: "dynamics" },
  { id: "settling", min: 0.1, max: 0.9, softMin: 0.25, softMax: 0.75, domain: "dynamics" },
  { id: "rebound", min: 0, max: 0.7, softMin: 0, softMax: 0.45, domain: "dynamics" },
]);

const BOUND_BY_ID = new Map(CHANNEL_BOUNDS.map((b) => [b.id, b]));

export function getChannelBound(id: string): ChannelBound | null {
  return BOUND_BY_ID.get(id) ?? null;
}

export function clampChannel(id: string, value: number): number {
  if (!Number.isFinite(value)) {
    const b = BOUND_BY_ID.get(id);
    return b ? (b.min + b.max) / 2 : 0;
  }
  const b = BOUND_BY_ID.get(id);
  if (!b) return value;
  return Math.max(b.min, Math.min(b.max, value));
}

export function clampChannelMap(
  map: Record<string, number>,
  mode: "hard" | "soft" = "hard",
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(map)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const b = BOUND_BY_ID.get(id);
    if (!b) {
      out[id] = value;
      continue;
    }
    if (mode === "soft") {
      const lo = b.softMin ?? b.min;
      const hi = b.softMax ?? b.max;
      out[id] = Math.max(b.min, Math.min(b.max, Math.max(lo, Math.min(hi, value))));
    } else {
      out[id] = Math.max(b.min, Math.min(b.max, value));
    }
  }
  return out;
}

/**
 * Macro squash/stretch conservation: extreme width expansion should
 * softly reduce height (and vice versa) to keep volume plausible.
 */
export function applyVolumeConservation(
  map: Record<string, number>,
): Record<string, number> {
  const out = { ...map };
  const w = out.overall_width;
  const h = out.overall_height;
  if (typeof w === "number" && typeof h === "number") {
    const area = w * h;
    // Target area near 1.0 (identity); soft pull when far.
    if (area > 1.18) {
      const s = Math.sqrt(1.12 / area);
      out.overall_width = clampChannel("overall_width", w * s);
      out.overall_height = clampChannel("overall_height", h * s);
    } else if (area < 0.82) {
      const s = Math.sqrt(0.9 / Math.max(area, 1e-6));
      out.overall_width = clampChannel("overall_width", w * s);
      out.overall_height = clampChannel("overall_height", h * s);
    }
  }
  // Corner pull symmetry soft-link unless intentionally asymmetric
  const cl = out.corner_pull_l;
  const cr = out.corner_pull_r;
  if (typeof cl === "number" && typeof cr === "number") {
    const spread = Math.abs(cl - cr);
    if (spread > 0.28) {
      const mid = (cl + cr) / 2;
      out.corner_pull_l = clampChannel("corner_pull_l", mid + Math.sign(cl - mid) * 0.14);
      out.corner_pull_r = clampChannel("corner_pull_r", mid + Math.sign(cr - mid) * 0.14);
    }
  }
  return clampChannelMap(out, "hard");
}

export type MorphologyCompleteness = {
  ok: boolean;
  domainsTouched: string[];
  missingRequired: string[];
  contourOnly: boolean;
  hostScaleOnly: boolean;
};

const REQUIRED_DOMAIN_HINTS = [
  "macro",
  "face",
  "energy",
  "relief",
] as const;

/**
 * A complete morph must touch multi-domain channels — not contour-only
 * and not host-scale-only (Architecture Pack v0.2).
 */
export function assessMorphologyCompleteness(
  channels: Record<string, number>,
): MorphologyCompleteness {
  const domains = new Set<string>();
  let hasMacroScale = false;
  let hasNonScale = false;
  for (const id of Object.keys(channels)) {
    const b = BOUND_BY_ID.get(id);
    if (b) domains.add(b.domain);
    if (id === "overall_width" || id === "overall_height") hasMacroScale = true;
    else hasNonScale = true;
  }
  const missingRequired = REQUIRED_DOMAIN_HINTS.filter((d) => !domains.has(d));
  const hostScaleOnly = hasMacroScale && !hasNonScale;
  const contourOnly = domains.size <= 1 && !domains.has("face") && !domains.has("energy");
  return {
    ok: missingRequired.length === 0 && !hostScaleOnly && !contourOnly,
    domainsTouched: [...domains].sort(),
    missingRequired: [...missingRequired],
    contourOnly,
    hostScaleOnly,
  };
}
