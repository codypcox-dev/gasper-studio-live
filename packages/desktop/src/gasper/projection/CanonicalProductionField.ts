/**
 * GASPER-UNIFIED-FIELD-001 — canonical controller → production-field packet.
 *
 * The FormMaster SVG remains the sole production writer. This packet is the
 * field contract that lets the renderer consume one resolved organism state
 * across geometry, face, energy, dynamics, relief, and material channels.
 * It is intentionally DOM-free and deterministic so the same resolved pose
 * produces the same packet and source hash.
 */

export const CANONICAL_PRODUCTION_FIELD_PACKET =
  "GASPER-UNIFIED-FIELD-001" as const;

export type CanonicalProductionFieldDomain =
  | "geometry"
  | "face"
  | "energy"
  | "dynamics"
  | "relief"
  | "material";

export type CanonicalProductionFieldPacket = {
  readonly version: "1";
  readonly packet: typeof CANONICAL_PRODUCTION_FIELD_PACKET;
  readonly revision: number;
  readonly sourceHash: string;
  readonly domains: Readonly<
    Record<CanonicalProductionFieldDomain, Readonly<Record<string, number>>>
  >;
};

const DOMAIN_KEYS: Readonly<
  Record<CanonicalProductionFieldDomain, readonly string[]>
> = Object.freeze({
  geometry: [
    "overall_width",
    "overall_height",
    "crown_height",
    "lower_body_fullness",
    "ground_flattening",
    "posture_x",
    "posture_y",
    "body_lean",
    "asym",
    "wide",
    "low",
  ],
  face: [
    "face_scale",
    "eye_openness",
    "eye_spacing",
    "gaze",
    "gaze_x",
    "gaze_y",
    "mouth_openness",
    "mouth_width",
    "mouth_corner_pull_l",
    "mouth_corner_pull_r",
    "corner_pull_l",
    "corner_pull_r",
    "brow_tension",
    "cheek_tension",
    "face_emission",
  ],
  energy: [
    "energy_level",
    "energy_target",
    "energy_pulse",
    "energy_lag",
    "energy_occlusion",
    "internal_glow",
  ],
  dynamics: [
    "motion",
    "yaw",
    "coupling",
    "inertia",
    "secondary_lag",
    "rebound",
    "settling",
    // GASPER-UNIFIED-THEORY-001 channels: the production SVG may consume
    // these signals, but it may not synthesize a competing idle oscillator.
    "unified_time_seconds",
    "unified_breath",
    "unified_breath_phase",
    "unified_wander",
    "unified_spring_x",
    "unified_spring_y",
    "unified_spring_theta",
    "unified_energy_pulse",
    "unified_relief_drift",
    "unified_micro_tremor",
    "unified_anticipation",
    "unified_volume_scale_x",
    "unified_volume_scale_y",
    "unified_volume_product",
    "unified_breath_rate_hz",
    "unified_pulse_rate_hz",
    "unified_time_scale",
    "unified_wander_pink",
    "unified_mood",
    "unified_intent_spring_x",
    "unified_intent_spring_y",
    "unified_intent_spring_theta",
    "unified_disposition_residue",
    "unified_disposition_mood",
    "unified_habit_salience",
    "unified_light_intensity",
    "unified_light_lag_ms",
    "unified_color_lag_ms",
  ],
  relief: ["relief_amplitude", "relief", "texture_scale", "relief_seed"],
  material: [
    "key_intensity",
    "key_direction",
    "rim",
    "pearl",
    "absorption",
    "clearcoat",
    "texture",
    "roughness",
    "normal_strength",
    "curvature_response",
  ],
});

/** Unified material research ids accepted at the canonical production boundary. */
export const CANONICAL_MATERIAL_ALIASES = Object.freeze({
  pearl_intensity: "pearl",
  texture_scale: "texture",
} as const);

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function finiteChannels(
  pose: Record<string, number>,
  keys: readonly string[],
): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const key of keys) {
    const value = pose[key];
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
  }
  return Object.freeze(out);
}

export function normalizeCanonicalMaterialChannels(
  pose: Record<string, number>,
): Readonly<Record<string, number>> {
  const out: Record<string, number> = {
    ...finiteChannels(pose, DOMAIN_KEYS.material),
  };
  for (const [alias, canonical] of Object.entries(CANONICAL_MATERIAL_ALIASES)) {
    if (out[canonical] !== undefined) continue;
    const value = pose[alias];
    if (typeof value === "number" && Number.isFinite(value)) {
      out[canonical] = value;
    }
  }
  return Object.freeze(out);
}

function orderedDomains(
  pose: Record<string, number>,
): Readonly<
  Record<CanonicalProductionFieldDomain, Readonly<Record<string, number>>>
> {
  return Object.freeze({
    geometry: finiteChannels(pose, DOMAIN_KEYS.geometry),
    face: finiteChannels(pose, DOMAIN_KEYS.face),
    energy: finiteChannels(pose, DOMAIN_KEYS.energy),
    dynamics: finiteChannels(pose, DOMAIN_KEYS.dynamics),
    relief: finiteChannels(pose, DOMAIN_KEYS.relief),
    material: normalizeCanonicalMaterialChannels(pose),
  });
}

/** Build one deterministic packet from the controller's final resolved pose. */
export function buildCanonicalProductionFieldPacket(
  pose: Record<string, number>,
  revision: number,
): CanonicalProductionFieldPacket {
  const safeRevision = Number.isInteger(revision) && revision >= 0 ? revision : 0;
  const domains = orderedDomains(pose);
  const canonical = JSON.stringify({ revision: safeRevision, domains });
  return Object.freeze({
    version: "1" as const,
    packet: CANONICAL_PRODUCTION_FIELD_PACKET,
    revision: safeRevision,
    sourceHash: fnv1a(canonical),
    domains,
  });
}

export function isCanonicalProductionFieldPacket(
  value: unknown,
): value is CanonicalProductionFieldPacket {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CanonicalProductionFieldPacket>;
  return (
    candidate.version === "1" &&
    candidate.packet === CANONICAL_PRODUCTION_FIELD_PACKET &&
    Number.isInteger(candidate.revision) &&
    candidate.revision! >= 0 &&
    typeof candidate.sourceHash === "string" &&
    Boolean(candidate.domains && typeof candidate.domains === "object")
  );
}
