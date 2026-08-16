/**
 * Expression chirality — semantic sign invariants (not anatomical mimicry).
 * Recovered from crates/expression-core/src/chirality.rs and
 * expression-policy/semantic-chirality.json.
 */

export const CHIRALITY_POLICY_ID = "chirality.rules.v0_1" as const;
export const CHIRALITY_ANCHOR_POLICY_ID = "chirality.anchor-assisted.v0_1" as const;
export const CHIRALITY_DEAD_ZONE = 0.05 as const;

export const CHIRALITY_AXES = [
  "approach_withdraw",
  "expand_contract",
  "orient_disengage",
  "assert_yield",
  "affiliate_guard",
  "stabilize_destabilize",
  "reveal_conceal",
  "accelerate_decelerate",
  "persist_release",
] as const;

export type ChiralityAxis = (typeof CHIRALITY_AXES)[number];
export type ChiralitySign = "positive" | "negative" | "neutral";

export type ChiralityReading = {
  axis: ChiralityAxis;
  value: number;
  sign: ChiralitySign;
};

export type ChiralityChannelHint = {
  motion: number;
  gaze: number;
  expand: number;
  energy_pulse: number;
};

export function chiralitySignFromValue(
  v: number,
  eps: number = CHIRALITY_DEAD_ZONE,
): ChiralitySign {
  if (v > eps) return "positive";
  if (v < -eps) return "negative";
  return "neutral";
}

export function flipChiralitySign(sign: ChiralitySign): ChiralitySign {
  if (sign === "positive") return "negative";
  if (sign === "negative") return "positive";
  return "neutral";
}

/** Map approach − withdraw into a chirality reading (expression-core parity). */
export function approachWithdrawSign(approach: number, withdraw: number): ChiralitySign {
  return chiralitySignFromValue(approach - withdraw, 1e-6);
}

/** Gasper channel realization: positive approach increases motion + gaze engagement. */
export function mapApproachToChannels(sign: ChiralitySign): { motion: number; gaze: number } {
  switch (sign) {
    case "positive":
      return { motion: 0.65, gaze: 0.7 };
    case "negative":
      return { motion: 0.25, gaze: 0.3 };
    default:
      return { motion: 0.45, gaze: 0.5 };
  }
}

/**
 * Derive a full chirality vector from affect (valence/arousal) + optional urgency.
 * Deterministic, pure — no RNG.
 */
export function deriveChiralityFromAffect(input: {
  valence: number;
  arousal: number;
  urgency?: number;
  attention?: number;
  certainty?: number;
  social_openness?: number;
}): Record<ChiralityAxis, number> {
  const v = clampSigned(input.valence);
  const a = clamp01(input.arousal);
  const u = clamp01(input.urgency ?? a * 0.6);
  const att = clamp01(input.attention ?? 0.5);
  const cert = clamp01(input.certainty ?? 0.5);
  const social = clamp01(input.social_openness ?? 0.5 + v * 0.25);

  return {
    approach_withdraw: clampSigned(v * 0.7 + (social - 0.5) * 0.6),
    expand_contract: clampSigned((a - 0.45) * 1.2 + v * 0.25),
    orient_disengage: clampSigned((att - 0.5) * 1.4),
    assert_yield: clampSigned(v * 0.35 + (a - 0.5) * 0.5),
    affiliate_guard: clampSigned((social - 0.5) * 1.6 - Math.max(0, -v) * 0.4),
    stabilize_destabilize: clampSigned((cert - 0.5) * 1.5 - u * 0.2),
    reveal_conceal: clampSigned(v * 0.4 + (social - 0.45) * 0.8),
    accelerate_decelerate: clampSigned(u * 0.7 + (a - 0.5) * 0.5),
    persist_release: clampSigned((cert - 0.4) * 0.9 - u * 0.35),
  };
}

export function readChiralityAxes(
  values: Record<ChiralityAxis, number>,
): ChiralityReading[] {
  return CHIRALITY_AXES.map((axis) => {
    const value = values[axis] ?? 0;
    return { axis, value, sign: chiralitySignFromValue(value) };
  });
}

/** Convert chirality vector into bounded channel hints for the mixer. */
export function chiralityToChannelHints(
  values: Record<ChiralityAxis, number>,
): ChiralityChannelHint {
  const approach = mapApproachToChannels(
    chiralitySignFromValue(values.approach_withdraw ?? 0),
  );
  const expand = values.expand_contract ?? 0;
  const accel = values.accelerate_decelerate ?? 0;
  return {
    motion: approach.motion,
    gaze: clampSigned(approach.gaze * 0.5 + (values.orient_disengage ?? 0) * 0.35),
    expand: clamp01(0.5 + expand * 0.35),
    energy_pulse: clamp01(0.2 + Math.max(0, accel) * 0.45 + Math.max(0, expand) * 0.15),
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function clampSigned(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(-1, Math.min(1, n));
}
