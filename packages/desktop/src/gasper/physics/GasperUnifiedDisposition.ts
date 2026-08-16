/**
 * GASPER-UNIFIED-DISPOSITION-001 — the remembering field (LAW-10).
 *
 * The character has disposition, not history: a 3-state emotional residue
 * buffer, a 5-event habit buffer with a 60 s half-life, staggered decay taus,
 * and a mood axis. Pure, seeded, deterministic — the past changes parameters,
 * never the script.
 */

export const UNIFIED_EMOTION_IDS = [
  "joy",
  "sadness",
  "anger",
  "fear",
  "surprise",
  "curiosity",
  "contentment",
  "blocked",
] as const;

export type UnifiedEmotionId = (typeof UNIFIED_EMOTION_IDS)[number];

/** Constitution LAW-10 defaults (frames at 60 fps). */
export const EMOTION_DECAY_TAUS_FRAMES: Readonly<
  Record<UnifiedEmotionId, number>
> = Object.freeze({
  joy: 45,
  surprise: 30,
  anger: 60,
  fear: 50,
  curiosity: 90,
  contentment: 120,
  sadness: 180,
  blocked: 75,
});

/** Constitution LAW-9 beat ratios (gather : embody : settle). */
export const EMOTION_BEAT_RATIOS: Readonly<
  Record<UnifiedEmotionId, readonly [number, number, number]>
> = Object.freeze({
  joy: [2, 1, 4],
  sadness: [4, 1, 12],
  anger: [2, 2, 3],
  fear: [1, 1, 6],
  surprise: [0, 1, 5],
  curiosity: [2, 2, 5],
  contentment: [3, 2, 6],
  blocked: [3, 3, 4],
});

/** Valence per emotion — drives the mood axis (bounded by the constitution). */
export const EMOTION_VALENCE: Readonly<Record<UnifiedEmotionId, number>> =
  Object.freeze({
    joy: 1,
    surprise: 0.8,
    curiosity: 0.3,
    contentment: 0.5,
    sadness: -1,
    anger: -0.7,
    fear: -0.6,
    blocked: -0.5,
  });

export const RESIDUE_BUFFER_SIZE = 3;
export const HABIT_BUFFER_SIZE = 5;
export const HABIT_HALF_LIFE_SECONDS = 60;
export const MOOD_AMPLITUDE = 0.12;

export type DispositionEvent = Readonly<{
  emotion: UnifiedEmotionId;
  timeSeconds: number;
  intensity: number;
}>;

export type DispositionResidueEntry = Readonly<{
  emotion: UnifiedEmotionId;
  intensity: number;
  atSeconds: number;
}>;

export type DispositionHabitEntry = Readonly<{
  emotion: UnifiedEmotionId;
  weight: number;
  atSeconds: number;
}>;

export type DispositionState = Readonly<{
  seed: number;
  residue: readonly DispositionResidueEntry[];
  habits: readonly DispositionHabitEntry[];
  lastEventAtSeconds: number;
}>;

export type DispositionSample = Readonly<{
  residue: number;
  mood: number;
  habitSalience: number;
  dominantEmotion: UnifiedEmotionId | null;
  decayedResidue: number;
}>;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function decayTauSeconds(emotion: UnifiedEmotionId): number {
  return EMOTION_DECAY_TAUS_FRAMES[emotion] / 60;
}

export function createDisposition(seed = 1007): DispositionState {
  return Object.freeze({
    seed: seed >>> 0,
    residue: Object.freeze([]),
    habits: Object.freeze([]),
    lastEventAtSeconds: 0,
  });
}

/** Record one emotional event; residue decays with per-emotion taus. */
export function advanceDisposition(
  state: DispositionState,
  event: DispositionEvent,
): DispositionState {
  const t = Math.max(0, Number.isFinite(event.timeSeconds) ? event.timeSeconds : 0);
  const intensity = clamp(
    Number.isFinite(event.intensity) ? event.intensity : 0.5,
    0,
    1,
  );
  const dt = Math.max(0, t - state.lastEventAtSeconds);

  const residue = [
    Object.freeze({
      emotion: event.emotion,
      intensity,
      atSeconds: t,
    }) as DispositionResidueEntry,
    ...state.residue.map((entry) =>
      Object.freeze({
        emotion: entry.emotion,
        intensity: clamp(
          entry.intensity * Math.exp(-dt / Math.max(1e-3, decayTauSeconds(entry.emotion))),
          0,
          1,
        ),
        atSeconds: entry.atSeconds,
      }) as DispositionResidueEntry,
    ),
  ]
    .filter((entry) => entry.intensity > 0.001)
    .slice(0, RESIDUE_BUFFER_SIZE);

  const habitMap = new Map<UnifiedEmotionId, number>();
  for (const habit of state.habits) {
    habitMap.set(
      habit.emotion,
      habit.weight * Math.exp(-dt / HABIT_HALF_LIFE_SECONDS),
    );
  }
  habitMap.set(event.emotion, (habitMap.get(event.emotion) ?? 0) + intensity * 0.5);
  const habits = [...habitMap.entries()]
    .map(([emotion, weight]) =>
      Object.freeze({
        emotion,
        weight: clamp(weight, 0, 2),
        atSeconds: t,
      }) as DispositionHabitEntry,
    )
    .sort((a, b) => b.weight - a.weight)
    .slice(0, HABIT_BUFFER_SIZE);

  return Object.freeze({
    seed: state.seed,
    residue: Object.freeze(residue),
    habits: Object.freeze(habits),
    lastEventAtSeconds: t,
  });
}

/** Continuous decay + bounded mood/habit readouts at sample time. */
export function evaluateDispositionSample(
  state: DispositionState,
  timeSeconds: number,
): DispositionSample {
  const t = Math.max(0, Number.isFinite(timeSeconds) ? timeSeconds : 0);
  let residue = 0;
  let decayedResidue = 0;
  let valenceSum = 0;
  let dominant: UnifiedEmotionId | null = null;
  let dominantValue = -1;
  for (const entry of state.residue) {
    const age = Math.max(0, t - entry.atSeconds);
    const decayed = clamp(
      entry.intensity *
        Math.exp(-age / Math.max(1e-3, decayTauSeconds(entry.emotion))),
      0,
      1,
    );
    decayedResidue = Math.max(decayedResidue, decayed);
    residue = Math.max(residue, entry.intensity);
    valenceSum += EMOTION_VALENCE[entry.emotion] * decayed;
    if (decayed > dominantValue) {
      dominantValue = decayed;
      dominant = entry.emotion;
    }
  }
  const habitSalience =
    state.habits.length === 0
      ? 0
      : Math.max(...state.habits.map((habit) => habit.weight)) / 2;
  const mood = clamp(valenceSum * MOOD_AMPLITUDE, -MOOD_AMPLITUDE, MOOD_AMPLITUDE);
  return Object.freeze({
    residue,
    mood,
    habitSalience: clamp(habitSalience, 0, 1),
    dominantEmotion: dominant,
    decayedResidue,
  });
}
