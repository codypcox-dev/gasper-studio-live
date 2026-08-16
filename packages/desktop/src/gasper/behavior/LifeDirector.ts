/**
 * GASPER-ALIVE-001 · D-0108 — the life director LAW (pure, deterministic).
 *
 * Owner directive 2026-08-04: "Gasper needs to come alive… large stretches of
 * time where he seems alive and autonomous… emergent areas that haven't been
 * engineered yet." The audit of the owner's own capture showed the living
 * layer running SUB-JND — states turning with no visible act. The life
 * director is the missing layer above the wander organ: a long-horizon
 * composer of self-initiated acts (alive-015), attention (points of
 * interest), mood-weighted action choice with habituation feedback, and
 * dormant arcs — so the organism VISIBLE acts for minutes at a time.
 *
 * Emergence, not scripting: three incommensurate rotors (11/29/71 s — the
 * LAW-3 coprime idiom) drive attention, mood and energy; a golden-ratio
 * sample picks among mood-weighted, habituation-damped actions; the φ
 * ladders time the gaps. No authored sequence exists anywhere — the
 * observed life is the interaction of these laws (D-0057 idiom: dense on
 * the torus, never closing). Zero random sources — the rotors ARE the seed
 * (codebase law: ambient Math.random forbidden).
 *
 * Corpus grounding (all local): gameops alive-015 (self-initiated actions;
 * gradual resume), alive-008 ("a character that DEMANDS is alive"), alive-063
 * (universal baseline), vfxops 3danim-state-idle (never a looping GIF),
 * modelops oot-idle-animation-variety (always alive between inputs),
 * gasper-unified-theory LAW-2/3/6/9/10, psychological-foundations §1.3/§1.4
 * (anti-habituation), D-0105 φ ladders, D-0106 golden angle.
 */

import { GAIT_LAW, clampToComfortBand } from "../physics/GaitLaw";

export const PHI = (1 + Math.sqrt(5)) / 2;
const SQRT2 = Math.SQRT2;

// Cycle 2 E2 (embodied-locomotion-phd-memo): the approach amble is the φ
// ladder's φ⁻¹ rung CLAMPED into the Froude comfort band — unclamped it sat
// below the band (a slide toward the glass, not a stroll).
const D0112_FIELD_GRAVITY = 74210; // world units/s² — the D-0112 field (GaitLaw.test idiom)

export const LIFE_LAW = Object.freeze({
  /** Attention rotor period (s) — coprime with mood and energy (LAW-3). */
  attentionPeriodSeconds: 11,
  /** Mood rotor period (s). */
  moodPeriodSeconds: 29,
  /** Energy rotor period (s). */
  energyPeriodSeconds: 71,
  /** Golden angle — the attention bearing never repeats a lane (D-0106). */
  goldenAngleDeg: 360 / (PHI * PHI),
  /** φ ladder for the gaps between self-initiated acts (D-0105 idiom). */
  eventGapLadderSeconds: Object.freeze([1 / PHI, 1, PHI, 2 * PHI]),
  /** φ ladder for attention holds. */
  attentionHoldLadderSeconds: Object.freeze([1 / PHI, 1, PHI]),
  /**
   * Approach stroll speed — the wander φ ladder's amble rung (base·φ⁻¹),
   * clamped into the comfort band (Cycle 2 E2).
   * Cycle 1 L2 (gait-expression-phd-memo): re-based with the similarity
   * cruise so the approach to the glass is a gentle slow-stroll, not a crawl.
   */
  approachSpeedUnitsPerSec: clampToComfortBand(3200 / PHI, D0112_FIELD_GRAVITY),
  /** Gradual resume after suppression (alive-015) — φ². */
  resumeCooldownSeconds: PHI * PHI,
  /**
   * The gift hold at the monitor glass — the smile held on the viewer.
   * φ² again: the same constant that times the gradual resume times the
   * initiated contact (one law, two readings — never a reused interval).
   */
  giftHoldSeconds: PHI * PHI,
  /** Long-rest window (s); the rotor picks inside it. */
  longRestMinSeconds: 8,
  longRestMaxSeconds: 13,
  /** State-accent gains (event-scoped; 1 = identity at rest). Bounded: the
   *  form-variant pinch fence is 2.0 on measured per-vertex delta and the
   *  mouth deltas are small by construction (D-0059/D-0066 telemetry). */
  accentMouthGain: 1.6,
  accentFormGain: 1.4,
  /**
   * N41 (2026-08-06) — mood signature gains: the personality contrast
   * (owner: "he needs to express more varied personality"). The base accent
   * gains multiply these — playful accents LOUDER + snappier, tired quieter,
   * curious neutral-alive, content warm-and-calm. Bounded: the playful peak
   * (1.6·1.15 = 1.84 mouth / 1.4·1.1 = 1.54 form) stays under the 2.0
   * form-variant pinch fence; mouth deltas remain small by construction.
   */
  moodSignature: Object.freeze({
    playful: Object.freeze({ accentMouthGain: 1.15, accentFormGain: 1.1 }),
    curious: Object.freeze({ accentMouthGain: 1.0, accentFormGain: 1.0 }),
    content: Object.freeze({ accentMouthGain: 0.9, accentFormGain: 0.95 }),
    tired: Object.freeze({ accentMouthGain: 0.75, accentFormGain: 0.8 }),
  }),
  /** Aperiodic wobble amplitude on the gap ladder (never metronomic). */
  gapWobble: 0.236,
});

export type LifeMood = "content" | "curious" | "playful" | "tired";

/**
 * N41 — composed accent gains for a mood (base × mood signature). The
 * driver accents with THESE; the personality contrast is the mood's, the
 * fences are the renderer's (pinch 2.0 / mouth deltas small). Fail-closed
 * to the content signature on an unknown mood.
 */
export function lifeAccentGains(
  mood: LifeMood,
): Readonly<{ mouth: number; form: number }> {
  const s =
    LIFE_LAW.moodSignature[mood] ?? LIFE_LAW.moodSignature.content;
  return Object.freeze({
    mouth: LIFE_LAW.accentMouthGain * s.accentMouthGain,
    form: LIFE_LAW.accentFormGain * s.accentFormGain,
  });
}

export type LifeActionId =
  | "notice"
  | "look-around"
  | "delight-hop"
  | "stretch"
  | "gift-look"
  | "long-rest"
  | "settle";

export const LIFE_ACTION_IDS: readonly LifeActionId[] = Object.freeze([
  "notice",
  "look-around",
  "delight-hop",
  "stretch",
  "gift-look",
  "long-rest",
  "settle",
]);

export type LifeAttentionTarget = Readonly<{
  /** Normalized look direction, −1..1 per axis (renderer face units). */
  nx: number;
  ny: number;
  holdSeconds: number;
  /** Rotor place in the attention flower (for telemetry). */
  step: number;
}>;

function frac(x: number): number {
  return x - Math.floor(x);
}

/**
 * Mood = the slow rotor partitioned by golden-ratio widths (φ⁻² content,
 * φ⁻³ curious, φ⁻⁴ playful, remainder tired). The widths sum to 1 because
 * φ⁻²+φ⁻³+φ⁻⁴ = 0.764; tired takes 0.236 = φ⁻³ — the partition itself is φ.
 */
export function lifeMoodAt(seed: number, tSeconds: number): LifeMood {
  const r = frac(seed * 0.6180339887498949 + tSeconds / LIFE_LAW.moodPeriodSeconds);
  if (r < 0.38196601125010515) return "content";
  if (r < 0.6180339887498949) return "curious";
  if (r < 0.7639320225002103) return "playful";
  return "tired";
}

/**
 * Attention target k: bearing turns by the golden angle, reach rides the
 * √2 partner (the Weyl idiom from D-0106 — a second φ-field channel would
 * patrol; √2 keeps (bearing, reach) equidistributed), hold on the φ ladder.
 */
export function lifeAttentionTarget(seed: number, k: number): LifeAttentionTarget {
  const bearing = ((seed + k) * LIFE_LAW.goldenAngleDeg * Math.PI) / 180;
  const reach = 0.3 + 0.6 * frac((seed + k) * SQRT2);
  const hold =
    LIFE_LAW.attentionHoldLadderSeconds[
      Math.abs(k) % LIFE_LAW.attentionHoldLadderSeconds.length
    ];
  return Object.freeze({
    nx: Math.cos(bearing) * reach,
    ny: Math.sin(bearing) * reach * 0.6,
    holdSeconds: hold,
    step: k,
  });
}

/**
 * S5 · A-LAW (expression-attention-phd-memo) — attention is not eyes-only:
 * the body turns to address (the Boo address idiom, brief consonant C7).
 *
 * A-LAW 1: the yaw setpoint is the GOLDEN CUT of the authored turntable
 * range — the dial owns the whole 45°; autonomous attention owns the cut.
 * A-LAW 2: first-order pursuit at the ACTION time constant τ_c·φ³ (the
 * same expression as the flight thrust τ) — with the renderer's eye pursuit
 * at 0.16 s the ordering is DERIVED: eyes lead, the silhouette answers
 * later. A-LAW 3 (override + fence) is enforced at the seams: the yaw dial
 * stays final authority, and composition is fenced to the symmetric ±45°.
 */
export const ATTENTION_LAW = Object.freeze({
  /** Autonomous yaw amplitude: 45°/φ ≈ 27.79° (the golden cut of the range). */
  yawMaxDeg: 45 / PHI,
  /** Symmetric fence on the composed yaw — the turntable range, sign-extended. */
  yawFenceDeg: 45,
  /** Body-yaw pursuit τ = τ_c·φ³ — the action constant (== flight thrust τ). */
  yawTauSec: GAIT_LAW.bankSmoothTauSec * PHI * PHI,
  /** External-gaze pursuit τ (D-0108 renderer constant) — the ordering reference. */
  externalGazeTauSec: 0.16,
});

/**
 * A-LAW 1 — the lateral attention component → body-yaw setpoint (degrees).
 * Linear, odd, clamped to the normalized cone; corrupt input fails closed
 * to frontal. One dominant target by construction (the staging rule — the
 * director holds a single attention).
 */
export function attentionYawDegreesFor(nx: number): number {
  const n = Math.max(-1, Math.min(1, Number.isFinite(nx) ? nx : 0));
  return ATTENTION_LAW.yawMaxDeg * n;
}

/**
 * Gap until the next self-initiated act: φ ladder × mood tempo × an
 * aperiodic wobble (frac(k·φ)) — randomized-feeling intervals read as
 * volition (alive-063: fixed intervals read as clockwork).
 */
export function lifeEventGapSeconds(k: number, mood: LifeMood): number {
  const ladder = LIFE_LAW.eventGapLadderSeconds;
  const base = ladder[Math.abs(k) % ladder.length];
  const tempo =
    mood === "playful" ? 0.8 : mood === "curious" ? 0.9 : mood === "tired" ? 1.6 : 1.2;
  return base * tempo * (1 + LIFE_LAW.gapWobble * frac((k + 1) * PHI));
}

/** Mood-shaped preference tables — the personality seed. */
const ACTION_PREFERENCES: Readonly<Record<LifeMood, ReadonlyArray<readonly [LifeActionId, number]>>> = {
  curious: Object.freeze([
    ["notice", 3], ["look-around", 2], ["gift-look", 1.2], ["delight-hop", 0.6],
    ["stretch", 0.4], ["settle", 0.4], ["long-rest", 0.1],
  ] as const),
  playful: Object.freeze([
    ["delight-hop", 3], ["gift-look", 1.6], ["look-around", 1], ["notice", 0.8],
    ["stretch", 0.4], ["settle", 0.4], ["long-rest", 0.1],
  ] as const),
  content: Object.freeze([
    ["settle", 2], ["look-around", 1.6], ["notice", 1], ["stretch", 1],
    ["gift-look", 0.8], ["delight-hop", 0.5], ["long-rest", 0.3],
  ] as const),
  tired: Object.freeze([
    ["stretch", 2.4], ["long-rest", 2], ["settle", 1.4], ["look-around", 0.5],
    ["notice", 0.3], ["gift-look", 0.2], ["delight-hop", 0.1],
  ] as const),
};

/**
 * Action choice: mood preference damped by habituation (recent counts —
 * LAW-10 remembering field as disposition, not history), picked by a
 * golden-ratio threshold over the damped weights. Deterministic; the same
 * (mood, k, recent) always yields the same act; the wobble in the counts
 * comes from the rotor, never from chance.
 */
export function lifeActionFor(
  mood: LifeMood,
  k: number,
  recent: Readonly<Partial<Record<LifeActionId, number>>>,
): LifeActionId {
  const table = ACTION_PREFERENCES[mood];
  const damped = table.map(([id, w]) => {
    const count = recent[id] ?? 0;
    return [id, w / (1 + 0.7 * count)] as const;
  });
  const total = damped.reduce((s, [, w]) => s + w, 0);
  const threshold = frac((k + 1) * PHI * PHI) * total;
  let acc = 0;
  for (const [id, w] of damped) {
    acc += w;
    if (threshold < acc) return id;
  }
  return damped[damped.length - 1][0];
}

/** Long-rest duration: the energy rotor inside the window (never fixed). */
export function lifeLongRestSeconds(seed: number, tSeconds: number): number {
  const r = frac(seed * 0.3180339887498949 + tSeconds / LIFE_LAW.energyPeriodSeconds);
  return (
    LIFE_LAW.longRestMinSeconds +
    r * (LIFE_LAW.longRestMaxSeconds - LIFE_LAW.longRestMinSeconds)
  );
}

/** World anchor for a curiosity approach (the gift-look walk to the glass). */
export function lifeApproachTarget(k: number): Readonly<{ x: number; z: number }> {
  const side = frac((k + 2) * PHI) < 0.5 ? -1 : 1;
  // N35 (2026-08-06): approach anchor moved -650 (1.51x) -> -320 — the owner's
  // glass law: forward only until +20% size (1.2x exactly); the intake fence
  // (zNear -320) now binds identically at the source.
  return Object.freeze({ x: side * (60 + 90 * frac((k + 3) * SQRT2)), z: -320 });
}
