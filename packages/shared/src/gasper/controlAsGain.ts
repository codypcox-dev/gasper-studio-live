/**
 * Control-as-gain — expression_gain is a bounded multiplier over
 * affect-driven displacement from baseline, not an arbitrary free channel.
 *
 * Recovered from expression-policy/control-projection.json expression_gain_map
 * and GASPER-006 dispatch §18.5.
 */

export const CONTROL_GAIN_POLICY = {
  schema: "gasper.control-as-gain.v1",
  policy_id: "control.expression_gain_map.v0_1",
  min_gain: 0.25,
  max_gain: 1.15,
  neutral_channel: 0.5,
  description:
    "channel' = neutral + (channel - neutral) * (min + control * (max - min))",
  provenance: "provisional_authored",
} as const;

/** Channels that identity/topology protect — lower or zero gain sensitivity. */
export const IDENTITY_PROTECTED_CHANNELS = Object.freeze([
  "overall_width",
  "overall_height",
  "ground_flattening",
  "lower_body_fullness",
] as const);

export const FACE_GAIN_CHANNELS = Object.freeze([
  "eye_openness",
  "eye_spacing",
  "gaze",
  "mouth_openness",
  "mouth_width",
  "corner_pull_l",
  "corner_pull_r",
  "face_scale",
  "face_emissive",
] as const);

export type ChannelScalarMap = Record<string, number>;

export function clampExpressionGain(gain: number): number {
  if (!Number.isFinite(gain)) return CONTROL_GAIN_POLICY.min_gain;
  return Math.max(0, Math.min(1, gain));
}

/**
 * Lerp min→max by expression_gain in [0,1].
 * final_scale = min + gain * (max - min)
 */
export function expressionGainScale(expressionGain: number): number {
  const g = clampExpressionGain(expressionGain);
  return (
    CONTROL_GAIN_POLICY.min_gain +
    g * (CONTROL_GAIN_POLICY.max_gain - CONTROL_GAIN_POLICY.min_gain)
  );
}

/**
 * Per-channel gain sensitivity. Identity/topology channels use reduced scale.
 */
export function channelGainSensitivity(channelId: string): number {
  if ((IDENTITY_PROTECTED_CHANNELS as readonly string[]).includes(channelId)) {
    return 0.35;
  }
  if (channelId.startsWith("relief_") || channelId === "skin_tension") {
    return 0.85;
  }
  if ((FACE_GAIN_CHANNELS as readonly string[]).includes(channelId)) {
    return 1.0;
  }
  if (
    channelId.startsWith("energy_") ||
    channelId === "internal_glow" ||
    channelId === "face_emissive"
  ) {
    return 0.9;
  }
  return 0.75;
}

/**
 * Apply Control-as-gain to a baseline-relative delta map.
 *
 * final = baseline + delta * scale(gain) * sensitivity(channel)
 *
 * When baseline is omitted, treats values as absolute channels around neutral.
 */
export function applyControlAsGain(
  channels: ChannelScalarMap,
  expressionGain: number,
  options?: {
    baseline?: ChannelScalarMap;
    /** If true, `channels` are absolute targets (not deltas). */
    absoluteTargets?: boolean;
  },
): ChannelScalarMap {
  const scale = expressionGainScale(expressionGain);
  const baseline = options?.baseline ?? {};
  const absolute = options?.absoluteTargets !== false;
  const out: ChannelScalarMap = {};

  for (const [id, value] of Object.entries(channels)) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const sens = channelGainSensitivity(id);
    const effective = scale * sens;

    if (absolute) {
      const base =
        typeof baseline[id] === "number"
          ? baseline[id]!
          : CONTROL_GAIN_POLICY.neutral_channel;
      const delta = value - base;
      out[id] = base + delta * effective;
    } else {
      // channels are deltas from baseline
      const base = typeof baseline[id] === "number" ? baseline[id]! : 0;
      out[id] = base + value * effective;
    }
  }
  return out;
}

/**
 * Blend two absolute channel maps with gain-scaled displacement from A toward B.
 * mix in [0,1]; expression_gain scales how far we travel from A.
 */
export function blendWithControlGain(
  from: ChannelScalarMap,
  to: ChannelScalarMap,
  mix: number,
  expressionGain: number,
): ChannelScalarMap {
  const t = Math.max(0, Math.min(1, mix));
  const scale = expressionGainScale(expressionGain);
  const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
  const out: ChannelScalarMap = {};
  for (const id of keys) {
    const a = from[id];
    const b = to[id];
    if (typeof a !== "number" && typeof b !== "number") continue;
    const av = typeof a === "number" ? a : b!;
    const bv = typeof b === "number" ? b : a!;
    const sens = channelGainSensitivity(id);
    out[id] = av + (bv - av) * t * scale * sens;
  }
  return out;
}
