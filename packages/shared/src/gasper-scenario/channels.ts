/**
 * Channel domain registry for eight-state scenario system.
 * Every state must specify coordinated targets for all domains.
 */

export const GASPER_CHANNEL_DOMAINS = [
  "contour_silhouette",
  "structural_lattice",
  "macro_deformation",
  "face_plane",
  "eyes",
  "mouth",
  "gaze_attention",
  "adaptive_relief",
  "internal_energy",
  "skin_texture",
  "material",
  "world_lighting_optics",
  "center_of_mass",
  "secondary_dynamics",
  "blink_scheduler_policy",
  "microvariation",
  "reduced_motion_behavior",
] as const;

export type GasperChannelDomainId = (typeof GASPER_CHANNEL_DOMAINS)[number];

/** Super-groups used by distinctness budget gates. */
export const CHANNEL_SUPER_GROUPS = {
  form: [
    "contour_silhouette",
    "structural_lattice",
    "macro_deformation",
    "center_of_mass",
  ],
  motion: [
    "secondary_dynamics",
    "microvariation",
    "blink_scheduler_policy",
    "reduced_motion_behavior",
  ],
  attention_face: ["face_plane", "eyes", "mouth", "gaze_attention"],
  energy_material: [
    "adaptive_relief",
    "internal_energy",
    "skin_texture",
    "material",
    "world_lighting_optics",
  ],
} as const;

export type ChannelSuperGroupId = keyof typeof CHANNEL_SUPER_GROUPS;

export type ChannelScalarMap = Record<string, number>;

/**
 * Semantic parameters inside a channel domain (normalized 0..1 or signed -1..1).
 * Values are engineering targets for R3/R4 consumption, not measured science.
 */
export type GasperChannelTargetV1 = {
  schema: "gasper.channel-target.v1";
  domain: GasperChannelDomainId;
  /** Normalized semantic vector for this domain. */
  params: ChannelScalarMap;
  /** Optional legacy binding projection keys (domain scalar map). */
  binding_hints?: ChannelScalarMap;
  /** Policy string for non-scalar domains (blink, reduced-motion). */
  policy?: string;
  notes?: string;
};

export function isChannelDomain(id: string): id is GasperChannelDomainId {
  return (GASPER_CHANNEL_DOMAINS as readonly string[]).includes(id);
}

export function emptyChannelTargets(): Record<
  GasperChannelDomainId,
  GasperChannelTargetV1
> {
  const out = {} as Record<GasperChannelDomainId, GasperChannelTargetV1>;
  for (const domain of GASPER_CHANNEL_DOMAINS) {
    out[domain] = {
      schema: "gasper.channel-target.v1",
      domain,
      params: {},
    };
  }
  return out;
}

/** Flatten all domain params into one vector for distance math. */
export function flattenChannelVector(
  targets: Record<GasperChannelDomainId, GasperChannelTargetV1>,
): Record<string, number> {
  const flat: Record<string, number> = {};
  for (const domain of GASPER_CHANNEL_DOMAINS) {
    const t = targets[domain];
    if (!t) continue;
    for (const [k, v] of Object.entries(t.params || {})) {
      if (typeof v === "number" && Number.isFinite(v)) {
        flat[`${domain}.${k}`] = v;
      }
    }
  }
  return flat;
}

/** Domains that differ beyond epsilon on any param. */
export function differingDomains(
  a: Record<GasperChannelDomainId, GasperChannelTargetV1>,
  b: Record<GasperChannelDomainId, GasperChannelTargetV1>,
  epsilon = 0.04,
): GasperChannelDomainId[] {
  const out: GasperChannelDomainId[] = [];
  for (const domain of GASPER_CHANNEL_DOMAINS) {
    const pa = a[domain]?.params || {};
    const pb = b[domain]?.params || {};
    const keys = new Set([...Object.keys(pa), ...Object.keys(pb)]);
    let differs = false;
    for (const k of keys) {
      const va = pa[k] ?? 0;
      const vb = pb[k] ?? 0;
      if (Math.abs(va - vb) > epsilon) {
        differs = true;
        break;
      }
    }
    // policy difference counts
    if (!differs && (a[domain]?.policy || "") !== (b[domain]?.policy || "")) {
      differs = true;
    }
    if (differs) out.push(domain);
  }
  return out;
}
