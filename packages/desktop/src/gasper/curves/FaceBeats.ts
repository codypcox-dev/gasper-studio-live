/**
 * GASPER-CRAFT-001 · C4 — FaceBeats: AU-named secondary action (pure module).
 *
 * Canon: `facs-expression-budget` — facial beats use Action Units (AU6
 * orbicularis oculi + AU12 zygomatic major = genuine smile; AU4 brow lowerer
 * = focus); micro-expression onsets are sub-second, macro 0.5–4 s; genuine
 * positive affect includes AU6; expression tracks map to NAMED AUs, not
 * ad-hoc shapes. `twelve-principles-1981` — secondary action supports the
 * main action without competing with it.
 *
 * A face beat is an AU recipe with an envelope: rise (onset) → peak hold →
 * release (decay). `compileFaceBeats` validates against the canon budget and
 * lowers the beats onto the pack's scalar `face` channel (expression energy
 * 0..1) — additive trapezoids sampled EXACTLY at their breakpoints with
 * linear tangents, so the compiled track reproduces the envelope bit-for-bit
 * and stays deterministic. The renderer intake (all-script-3.js
 * `setFaceEnergy`) maps the energy scalar onto the AU6+AU12 smile shape —
 * the FACE_ENERGY_SHAPE table below is its canonical mirror.
 *
 * GASPER-CRAFT-002 S5 — Doctrine 5: emotion is the RESULT of pursuing an
 * objective. Every face beat therefore names the pack beat whose objective
 * it serves (`beatId`, required — fail closed); the craft gate resolves the
 * reference against the beat sheet (CraftPacks.craftFaceBeatObjectives).
 */
import { normalizeCurveTrack, type CurveTrack } from "./CurveTrack";

export const FACE_ACTION_UNITS = Object.freeze({
  AU4: Object.freeze({
    id: "AU4",
    name: "brow lowerer",
    affect: "focus",
    energyWeight: 0.55,
  }),
  AU6: Object.freeze({
    id: "AU6",
    name: "orbicularis oculi",
    affect: "positive",
    energyWeight: 1,
  }),
  AU12: Object.freeze({
    id: "AU12",
    name: "zygomatic major",
    affect: "positive",
    energyWeight: 1,
  }),
  AU26: Object.freeze({
    id: "AU26",
    name: "jaw drop",
    affect: "surprise",
    energyWeight: 0.6,
  }),
});

export type FaceActionUnitId = keyof typeof FACE_ACTION_UNITS;

export const FACE_ACTION_UNIT_SET: ReadonlySet<string> = new Set(
  Object.keys(FACE_ACTION_UNITS),
);

/** Onset budgets (`facs-expression-budget`): micro < 1 s, macro 0.5–4 s. */
export const FACE_ONSET_BUDGET = Object.freeze({
  microMaxSeconds: 1,
  macroMinSeconds: 0.5,
  macroMaxSeconds: 4,
});

/**
 * The canonical AU6+AU12 smile shape the renderer intake applies per unit of
 * face energy — fixture-channel deltas at energy = 1 (MIRRORED in
 * all-script-3.js composeFixtureMotion; verify the mirror before proof
 * deposits). eyeOpen is the AU6 cheek-raise squint (negative = narrower).
 */
export const FACE_ENERGY_SHAPE = Object.freeze({
  mouthCurve: 0.3,
  mouthOpen: 0.06,
  mouthWidth: 0.06,
  pullL: 0.12,
  pullR: 0.12,
  cheekL: 0.18,
  cheekR: 0.18,
  eyeOpen: -0.04,
});

export type FaceBeat = Readonly<{
  id: string;
  /** Onset start (pack time, s). */
  t0: number;
  /** Peak-hold end / release start (pack time, s). */
  t1: number;
  aus: readonly FaceActionUnitId[];
  /** Peak energy weight, (0, 1]. */
  intensity: number;
  /** Rise t0 → peak. Budget: 0 < onset ≤ 4 s (micro < 1 s, macro 0.5–4 s). */
  onsetSeconds: number;
  /** Fall t1 → rest. ≥ 0, ≤ 4 s, must end inside the pack. */
  decaySeconds: number;
  /**
   * Doctrine 5 (S5): the beat whose OBJECTIVE this expression serves.
   * Emotion is the result of pursuing an objective — a face beat without a
   * beat is an expression with no cause (fail-closed here; the reference
   * itself resolves against the pack's beat sheet in the craft gate).
   */
  beatId: string;
}>;

export type FaceBeatCompileResult = Readonly<{
  track: CurveTrack | null;
  beats: readonly FaceBeat[];
  errors: readonly string[];
}>;

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** The beat's peak energy: intensity × Σ AU energy weights, clamped 0..1. */
export function faceBeatPeak(beat: FaceBeat): number {
  let w = 0;
  for (const au of beat.aus) w += FACE_ACTION_UNITS[au].energyWeight;
  return Math.max(0, Math.min(1, beat.intensity * w));
}

/**
 * One beat's trapezoid envelope at pack time t (0..peak). Fail-closed:
 * non-finite t reads 0.
 */
export function faceBeatEnergyAt(beat: FaceBeat, t: number): number {
  if (!Number.isFinite(t)) return 0;
  const peak = faceBeatPeak(beat);
  const riseEnd = beat.t0 + beat.onsetSeconds;
  if (t < beat.t0) return 0;
  if (t < riseEnd) {
    const span = Math.max(1e-6, beat.onsetSeconds);
    return peak * ((t - beat.t0) / span);
  }
  if (t < beat.t1) return peak;
  const fallEnd = beat.t1 + beat.decaySeconds;
  if (t < fallEnd) {
    const span = Math.max(1e-6, beat.decaySeconds);
    return peak * (1 - (t - beat.t1) / span);
  }
  return 0;
}

/** Summed envelope of a beat list at t, clamped 0..1. */
export function faceBeatsEnergyAt(
  beats: readonly FaceBeat[],
  t: number,
): number {
  let e = 0;
  for (const b of beats) e += faceBeatEnergyAt(b, t);
  return Math.max(0, Math.min(1, e));
}

/**
 * Compile raw face beats into a `face`-channel track — fail closed. Any
 * canon violation rejects the whole list (a bad beat never reaches the
 * carrier). An empty list compiles to a flat-zero track (no face beats is
 * legal — the carrier simply rests).
 */
export function compileFaceBeats(
  raw: unknown,
  durationSeconds: number,
): FaceBeatCompileResult {
  const errors: string[] = [];
  const duration = finiteOr(durationSeconds, NaN);
  if (!Number.isFinite(duration) || duration <= 0) {
    return { track: null, beats: [], errors: ["face beats need a positive finite pack duration"] };
  }
  if (!Array.isArray(raw)) {
    return { track: null, beats: [], errors: ["face beats must be an array"] };
  }

  const beats: FaceBeat[] = [];
  for (let i = 0; i < raw.length; i++) {
    const rb = (raw[i] && typeof raw[i] === "object" ? raw[i] : {}) as Record<
      string,
      unknown
    >;
    const id =
      typeof rb.id === "string" && rb.id.length > 0
        ? rb.id
        : `face-beat-${i + 1}`;
    const t0 = finiteOr(rb.t0, NaN);
    const t1 = finiteOr(rb.t1, NaN);
    if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) {
      errors.push(`face beat ${id}: invalid t0/t1`);
      continue;
    }
    if (t0 < -1e-6 || t1 > duration + 1e-6) {
      errors.push(`face beat ${id}: outside pack duration`);
      continue;
    }

    // Named AUs only — expression tracks map to Action Units, not ad-hoc
    // shapes (facs-expression-budget).
    const aus: FaceActionUnitId[] = [];
    const rawAus = Array.isArray(rb.aus) ? rb.aus : [];
    if (rawAus.length === 0) {
      errors.push(`face beat ${id}: no action units`);
      continue;
    }
    let ausOk = true;
    for (const au of rawAus) {
      if (typeof au === "string" && FACE_ACTION_UNIT_SET.has(au)) {
        aus.push(au as FaceActionUnitId);
      } else {
        errors.push(
          `face beat ${id}: ad-hoc shape "${String(au)}" — expression tracks map to named AUs (facs-expression-budget)`,
        );
        ausOk = false;
      }
    }
    if (!ausOk) continue;

    // Genuine-smile law: AU12 (zygomatic major) reads genuine only with AU6
    // (orbicularis oculi) — a smile without cheek lift plays as posed.
    if (aus.includes("AU12") && !aus.includes("AU6")) {
      errors.push(
        `face beat ${id}: AU12 without AU6 — genuine positive affect includes orbicularis oculi (facs-expression-budget)`,
      );
      continue;
    }

    const intensity = finiteOr(rb.intensity, NaN);
    if (!Number.isFinite(intensity) || intensity <= 0) {
      errors.push(`face beat ${id}: intensity must be a positive number`);
      continue;
    }

    // Onset budget: micro < 1 s, macro 0.5–4 s — union law (0, 4] s.
    const onset = finiteOr(rb.onsetSeconds, NaN);
    if (!Number.isFinite(onset) || onset <= 0 || onset > FACE_ONSET_BUDGET.macroMaxSeconds) {
      errors.push(
        `face beat ${id}: onset ${Number.isFinite(onset) ? onset.toFixed(2) : "?"}s outside the facs budget (micro <1s, macro 0.5–4s)`,
      );
      continue;
    }
    const decay = finiteOr(rb.decaySeconds, NaN);
    if (!Number.isFinite(decay) || decay < 0 || decay > FACE_ONSET_BUDGET.macroMaxSeconds) {
      errors.push(`face beat ${id}: decay must be 0..4s`);
      continue;
    }
    if (t1 + decay > duration + 1e-6) {
      errors.push(`face beat ${id}: decays past pack duration`);
      continue;
    }

    // Doctrine 5 (S5): emotion is the RESULT of pursuing an objective —
    // every face beat names the beat it serves (reference resolution is a
    // craft-gate rule; the field itself is required here, fail-closed).
    const beatId = typeof rb.beatId === "string" ? rb.beatId.trim() : "";
    if (!beatId) {
      errors.push(`face beat ${id}: missing beatId — an expression must serve a beat's objective (Doctrine 5)`);
      continue;
    }

    beats.push(
      Object.freeze({
        id,
        t0,
        t1,
        aus: Object.freeze([...aus]),
        intensity: Math.min(1, intensity),
        onsetSeconds: onset,
        decaySeconds: decay,
        beatId,
      }),
    );
  }

  if (errors.length) return { track: null, beats: [], errors };

  // Lower onto the scalar carrier: the summed envelope is piecewise linear,
  // so sampling at every breakpoint reproduces it exactly (linear tangents).
  const points = new Set<number>([0, duration]);
  for (const b of beats) {
    for (const t of [b.t0, b.t0 + b.onsetSeconds, b.t1, b.t1 + b.decaySeconds]) {
      points.add(Math.max(0, Math.min(duration, t)));
    }
  }
  const times = [...points].sort((a, b) => a - b);
  const keys = times.map((t) => ({
    t,
    v: faceBeatsEnergyAt(beats, t),
    out: "linear" as const,
    weight: 1,
  }));
  return {
    track: normalizeCurveTrack(keys),
    beats: Object.freeze(beats),
    errors: [],
  };
}
