/**
 * GASPER-UNIFIED-THEORY-001
 *
 * The constitutional physics field shared by motion, material response and
 * secondary projections. This is intentionally a pure evaluator: it owns no
 * clock, timer, DOM node, random source, or renderer write.
 *
 * The canonical source is the read-only Unified Theory and constitution at
 * Documents/triforce-engine/research/gasper-unified-theory.md and
 * Documents/triforce-engine/gasper-constitution.json. Keep this module's
 * constants in lockstep with that registry.
 */

export const GASPER_UNIFIED_THEORY_PACKET = "GASPER-UNIFIED-THEORY-001" as const;

export const GASPER_UNIFIED_THEORY_CONSTANTS = Object.freeze({
  dampingRatio: 0.65,
  breathFrequencyHz: 0.25,
  breathAmplitude: 0.03,
  breathAsymmetry: 0.4,
  breathRateMinHz: 0.2,
  breathRateMaxHz: 0.5,
  pulseRateMinHz: 0.4,
  pulseRateMaxHz: 2.5,
  timeScaleMin: 0.4,
  timeScaleMax: 2.5,
  microTremorFrequencyHz: 10,
  microTremorAmplitudePx: 0.5,
  springPeriodsSeconds: Object.freeze([1.7, 2.3, 3.1]),
  wanderPeriodsSeconds: Object.freeze([11, 29, 71]),
  wanderWeights: Object.freeze([0.6, 0.3, 0.1]),
  fbmLacunarity: 2,
  fbmGain: 0.5,
  moodPeriodSeconds: 179,
  moodAmplitude: 0.12,
  intentSpringBound: 0.25,
  anticipationDepth: 0.15,
  anticipationDurationFrames: 6,
  volumeConservation: 1,
  volumeRateOfChangePerFrame: 0.005,
  dragModel: "quadratic" as const,
  dragCrossover: 0.3,
  responseTimeMs: 100,
  spectralDecay: 2.5,
  convexityFloor: 0.7,
  curvatureFloor: 0.05,
  motionSignatureVariance: 0.1,
  audioBindingWindowMs: 16,
  audioBreathLevelDb: -35,
  compositeLoopDurationSeconds: 1001,
});

export type GasperUnifiedTheoryConstants = typeof GASPER_UNIFIED_THEORY_CONSTANTS;

export type UnifiedFieldInput = {
  timeSeconds: number;
  seed: number;
  reducedMotion?: boolean;
  arousal?: number;
  /** Voluntary intent is opt-in; idle maintenance has no anticipation impulse. */
  voluntaryIntent?: boolean;
  intentProgress?: number;
  intentIntensity?: number;
  /** Involuntary startle: zero anticipation + a positive gasp expansion. */
  startle?: boolean;
  /** Stateful intent springs (x, y, theta) — velocity is caller-owned. */
  intentSprings?: Readonly<{ x: number; y: number; theta: number }>;
  /** Remembering-field disposition sample (LAW-10). */
  disposition?: Readonly<{
    residue: number;
    mood: number;
    habitSalience: number;
  }>;
};

export type GasperUnifiedFieldFrame = Readonly<{
  packet: typeof GASPER_UNIFIED_THEORY_PACKET;
  timeSeconds: number;
  seed: number;
  reducedMotion: boolean;
  arousal: number;
  breath: number;
  breathPhase: number;
  breathFrequencyHz: number;
  breathRateHz: number;
  pulseRateHz: number;
  timeScale: number;
  breathAsymmetry: number;
  wander: number;
  wanderPink: number;
  wanderLayers: readonly number[];
  mood: number;
  startleGasp: number;
  springX: number;
  springY: number;
  springTheta: number;
  intentSpringX: number;
  intentSpringY: number;
  intentSpringTheta: number;
  dispositionResidue: number;
  dispositionMood: number;
  habitSalience: number;
  energyPulse: number;
  reliefDrift: number;
  microTremorPx: number;
  microTremorNormalized: number;
  volumeScaleX: number;
  volumeScaleY: number;
  volumeProduct: number;
  anticipation: number;
  anticipationFrames: number;
  dampingRatio: number;
  dragModel: "quadratic";
  dragCrossover: number;
  activeOscillatorCount: number;
  oscillatorPeriodsSeconds: readonly number[];
  spectralDecay: number;
  convexityFloor: number;
  curvatureFloor: number;
  motionSignatureVariance: number;
  responseTimeMs: number;
  audioBindingWindowMs: number;
  compositeLoopDurationSeconds: number;
}>;

const TAU = Math.PI * 2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function positiveModulo(value: number, divisor: number): number {
  const result = value % divisor;
  return result < 0 ? result + divisor : result;
}

function seedPhase(seed: number, salt: number): number {
  let h = ((seed >>> 0) ^ salt) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return ((h >>> 0) / 0x100000000) * TAU;
}

function hashUnit(seed: number, salt: number, cell: number): number {
  let h = ((seed >>> 0) ^ Math.imul(salt, 0x9e3779b9)) >>> 0;
  const bits = new Uint32Array(1);
  bits[0] = cell >>> 0;
  const bytes = new Uint8Array(bits.buffer);
  for (let i = 0; i < bytes.length; i++) {
    h = Math.imul(h ^ bytes[i]!, 0x01000193);
  }
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 0x100000000;
}

/**
 * C2 value noise on one period — the 1/f building block. Bounded [0,1),
 * deterministic, and time-scaleable without losing the period identity.
 */
function valueNoise(timeSeconds: number, periodSeconds: number, seed: number, salt: number): number {
  const p = Math.max(1e-3, periodSeconds);
  const t = Math.max(0, timeSeconds) / p;
  const cell = Math.floor(t);
  const f = t - cell;
  const a = hashUnit(seed, salt, cell);
  const b = hashUnit(seed, salt, cell + 1);
  const u = quinticMinimumJerk(f);
  return a + (b - a) * u;
}

/**
 * Seeded fBm (1/f in time): lacunarity 2.0, gain 0.5, three incommensurate
 * base periods — the same recipe the corpus found in motion, shape, and sound.
 * Zero-mean and bounded ±1 by construction (bounds are the constitution).
 */
function pinkWander(
  timeSeconds: number,
  periods: readonly number[],
  weights: readonly number[],
  seed: number,
): number {
  const c = GASPER_UNIFIED_THEORY_CONSTANTS;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < periods.length; i++) {
    const base = periods[i]!;
    const weight = weights[i]!;
    for (let octave = 0; octave < 3; octave++) {
      const period = base / Math.pow(c.fbmLacunarity, octave);
      const gain = Math.pow(c.fbmGain, octave);
      sum += (valueNoise(timeSeconds, period, seed, 0x5000 + i * 7 + octave) - 0.5) * 2 * weight * gain;
      norm += weight * gain;
    }
  }
  return norm > 0 ? clamp(sum / norm, -1, 1) : 0;
}

/** Quintic minimum-jerk easing; position, velocity and acceleration settle cleanly. */
export function quinticMinimumJerk(progress: number): number {
  const t = clamp(finite(progress), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function asymmetricBreath(timeSeconds: number): { value: number; phase: number } {
  const c = GASPER_UNIFIED_THEORY_CONSTANTS;
  const phase = positiveModulo(timeSeconds * c.breathFrequencyHz, 1);
  const raw =
    phase <= c.breathAsymmetry
      ? quinticMinimumJerk(phase / c.breathAsymmetry)
      : 1 - quinticMinimumJerk(
          (phase - c.breathAsymmetry) / (1 - c.breathAsymmetry),
        );
  // Center the physiological inhale/exhale excursion while retaining its
  // asymmetric 40/60 timing. The constitution's 3% amplitude is the ± range.
  return {
    value: (raw - 0.5) * 2 * c.breathAmplitude,
    phase,
  };
}

function dampedSpring(
  timeSeconds: number,
  periodSeconds: number,
  phase: number,
  amplitude: number,
): number {
  const c = GASPER_UNIFIED_THEORY_CONSTANTS;
  const decay = Math.exp(-c.dampingRatio * 0.045 * timeSeconds);
  return Math.sin((TAU * timeSeconds) / periodSeconds + phase) * amplitude * decay;
}

export function evaluateUnifiedFieldFrame(input: UnifiedFieldInput): GasperUnifiedFieldFrame {
  const c = GASPER_UNIFIED_THEORY_CONSTANTS;
  const timeSeconds = Math.max(0, finite(input.timeSeconds));
  const seed = input.seed >>> 0;
  const reducedMotion = input.reducedMotion === true;
  const arousal = clamp(finite(input.arousal ?? 0.5, 0.5), 0, 1);
  const breath = asymmetricBreath(timeSeconds);
  // Emotion is a frequency (LAW-1 / §3.1): arousal re-tunes the clock speeds
  // while the resting identity constants stay authored. Breath stays the
  // master clock and is never time-scaled; the other oscillators share the
  // same timeScale so incommensurability ratios are preserved.
  const breathRateHz = clamp(
    c.breathRateMinHz +
      (arousal - 0.5) *
        ((c.breathRateMaxHz - c.breathRateMinHz) / 0.5),
    c.breathRateMinHz,
    c.breathRateMaxHz,
  );
  const pulseRateHz = clamp(
    c.pulseRateMinHz +
      (arousal - 0.5) *
        ((c.pulseRateMaxHz - c.pulseRateMinHz) / 0.5),
    c.pulseRateMinHz,
    c.pulseRateMaxHz,
  );
  const timeScale = clamp(
    1 +
      (arousal - 0.5) *
        ((c.timeScaleMax - c.timeScaleMin) / 0.5),
    c.timeScaleMin,
    c.timeScaleMax,
  );
  const tScaled = timeSeconds * timeScale;

  const wanderLayers = c.wanderPeriodsSeconds.map((period, index) => {
    const phase = seedPhase(seed, 0x5eed + index * 0x9e37);
    const primary = Math.sin((TAU * tScaled) / period + phase);
    const incommensurate = Math.sin(
      (TAU * tScaled * (1 + (index + 1) * 0.071)) / period + phase * 0.37,
    );
    return (primary * 0.78 + incommensurate * 0.22) * c.wanderWeights[index]!;
  });
  const wander = wanderLayers.reduce((sum, value) => sum + value, 0);
  const wanderPink = pinkWander(
    tScaled,
    c.wanderPeriodsSeconds,
    c.wanderWeights,
    seed,
  );
  const mood = clamp(
    Math.sin(
      (TAU * timeSeconds) / c.moodPeriodSeconds + seedPhase(seed, 0x5001),
    ) *
      c.moodAmplitude *
      0.6 +
      pinkWander(tScaled, [c.moodPeriodSeconds], [1], seed ^ 0x51e) *
        c.moodAmplitude *
        0.4,
    -c.moodAmplitude,
    c.moodAmplitude,
  );

  const springX = dampedSpring(
    tScaled,
    c.springPeriodsSeconds[0]!,
    seedPhase(seed, 0x1001),
    reducedMotion ? 0.008 : 0.025,
  );
  const springY = dampedSpring(
    tScaled,
    c.springPeriodsSeconds[1]!,
    seedPhase(seed, 0x1002),
    reducedMotion ? 0.006 : 0.018,
  );
  const springTheta = dampedSpring(
    tScaled,
    c.springPeriodsSeconds[2]!,
    seedPhase(seed, 0x1003),
    reducedMotion ? 0.004 : 0.014,
  );

  const microTremorPx =
    Math.sin(TAU * timeSeconds * c.microTremorFrequencyHz + seedPhase(seed, 0x2001)) *
    c.microTremorAmplitudePx;
  const microTremorNormalized = microTremorPx / 100;
  const energyPulse =
    Math.sin(TAU * timeSeconds * pulseRateHz + seedPhase(seed, 0x3001)) *
    (reducedMotion ? 0.012 : 0.045) *
    (0.7 + arousal * 0.3);
  const reliefDrift =
    wanderPink * (reducedMotion ? 0.008 : 0.028) +
    Math.sin((TAU * tScaled) / 13.7 + seedPhase(seed, 0x3002)) *
      (reducedMotion ? 0.003 : 0.01);

  const emotionalAxis = clamp(breath.value + wander * 0.006, -0.08, 0.08);
  const volumeScaleY = 1 + emotionalAxis;
  const volumeScaleX = 1 / volumeScaleY;
  const voluntaryIntent = input.voluntaryIntent === true;
  const intentProgress = clamp(finite(input.intentProgress ?? 0, 0), 0, 1);
  const intentIntensity = clamp(finite(input.intentIntensity ?? arousal, arousal), 0, 1);
  const startle = input.startle === true;
  // LAW-4: voluntary motion pre-compresses; involuntary motion gets zero
  // anticipation; a startle inverts into a gasp (positive expansion).
  const anticipation =
    voluntaryIntent && !startle && intentProgress < 0.2
      ? -c.anticipationDepth * intentIntensity * (1 - intentProgress / 0.2)
      : 0;
  const startleGasp = startle
    ? c.anticipationDepth * intentIntensity
    : 0;
  const intentSpringX = clamp(
    finite(input.intentSprings?.x ?? 0),
    -c.intentSpringBound,
    c.intentSpringBound,
  );
  const intentSpringY = clamp(
    finite(input.intentSprings?.y ?? 0),
    -c.intentSpringBound,
    c.intentSpringBound,
  );
  const intentSpringTheta = clamp(
    finite(input.intentSprings?.theta ?? 0),
    -c.intentSpringBound,
    c.intentSpringBound,
  );
  const dispositionResidue = clamp(
    finite(input.disposition?.residue ?? 0),
    0,
    1,
  );
  const dispositionMood = clamp(
    finite(input.disposition?.mood ?? 0),
    -c.moodAmplitude,
    c.moodAmplitude,
  );
  const habitSalience = clamp(
    finite(input.disposition?.habitSalience ?? 0),
    0,
    1,
  );

  const oscillatorPeriodsSeconds = Object.freeze([
    c.breathFrequencyHz > 0 ? 1 / c.breathFrequencyHz : 0,
    ...c.springPeriodsSeconds,
    ...c.wanderPeriodsSeconds,
    1 / c.microTremorFrequencyHz,
  ]);
  return Object.freeze({
    packet: GASPER_UNIFIED_THEORY_PACKET,
    timeSeconds,
    seed,
    reducedMotion,
    arousal,
    breath: breath.value,
    breathPhase: breath.phase,
    breathFrequencyHz: c.breathFrequencyHz,
    breathRateHz,
    pulseRateHz,
    timeScale,
    breathAsymmetry: c.breathAsymmetry,
    wander,
    wanderPink,
    wanderLayers: Object.freeze(wanderLayers),
    mood,
    startleGasp,
    springX,
    springY,
    springTheta,
    intentSpringX,
    intentSpringY,
    intentSpringTheta,
    energyPulse,
    reliefDrift,
    dispositionResidue,
    dispositionMood,
    habitSalience,
    microTremorPx,
    microTremorNormalized,
    volumeScaleX,
    volumeScaleY,
    volumeProduct: volumeScaleX * volumeScaleY,
    anticipation,
    anticipationFrames: voluntaryIntent ? c.anticipationDurationFrames : 0,
    dampingRatio: c.dampingRatio,
    dragModel: c.dragModel,
    dragCrossover: c.dragCrossover,
    activeOscillatorCount: oscillatorPeriodsSeconds.length,
    oscillatorPeriodsSeconds,
    spectralDecay: c.spectralDecay,
    convexityFloor: c.convexityFloor,
    curvatureFloor: c.curvatureFloor,
    motionSignatureVariance: c.motionSignatureVariance,
    responseTimeMs: c.responseTimeMs,
    audioBindingWindowMs: c.audioBindingWindowMs,
    compositeLoopDurationSeconds: c.compositeLoopDurationSeconds,
  });
}

function hasSmallIntegerRatio(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return true;
  const ratio = Math.max(a, b) / Math.min(a, b);
  for (let numerator = 1; numerator < 10; numerator += 1) {
    for (let denominator = 1; denominator < 10; denominator += 1) {
      // The authored periods are intentionally close to, but not equal to,
      // simple ratios. Only an effectively locked ratio is a violation.
      if (Math.abs(ratio - numerator / denominator) < 0.002) return true;
    }
  }
  return false;
}

export function validateUnifiedFieldFrame(frame: GasperUnifiedFieldFrame): string[] {
  const c = GASPER_UNIFIED_THEORY_CONSTANTS;
  const violations: string[] = [];
  const finiteFields = [
    frame.timeSeconds,
    frame.seed,
    frame.arousal,
    frame.breath,
    frame.breathPhase,
    frame.breathRateHz,
    frame.pulseRateHz,
    frame.timeScale,
    frame.wander,
    frame.wanderPink,
    frame.mood,
    frame.startleGasp,
    frame.springX,
    frame.springY,
    frame.springTheta,
    frame.intentSpringX,
    frame.intentSpringY,
    frame.intentSpringTheta,
    frame.energyPulse,
    frame.reliefDrift,
    frame.dispositionResidue,
    frame.dispositionMood,
    frame.habitSalience,
    frame.microTremorPx,
    frame.microTremorNormalized,
    frame.volumeScaleX,
    frame.volumeScaleY,
    frame.volumeProduct,
    frame.anticipation,
    frame.anticipationFrames,
    frame.dampingRatio,
    frame.dragCrossover,
    frame.spectralDecay,
    frame.convexityFloor,
    frame.curvatureFloor,
    frame.motionSignatureVariance,
    frame.responseTimeMs,
    frame.audioBindingWindowMs,
    frame.compositeLoopDurationSeconds,
  ];
  if (
    frame.packet !== GASPER_UNIFIED_THEORY_PACKET ||
    finiteFields.some((value) => !Number.isFinite(value))
  ) {
    violations.push("FIELD finite/provenance");
  }
  if (frame.activeOscillatorCount < 3) violations.push("LAW-6 oscillator floor");
  if (frame.activeOscillatorCount !== frame.oscillatorPeriodsSeconds.length) {
    violations.push("LAW-6 oscillator count");
  }
  if (
    frame.oscillatorPeriodsSeconds.some(
      (period) => !Number.isFinite(period) || period <= 0,
    )
  ) {
    violations.push("LAW-6 oscillator periods");
  }
  let incommensurate = true;
  for (let i = 0; i < frame.oscillatorPeriodsSeconds.length && incommensurate; i += 1) {
    for (let j = i + 1; j < frame.oscillatorPeriodsSeconds.length; j += 1) {
      if (
        hasSmallIntegerRatio(
          frame.oscillatorPeriodsSeconds[i]!,
          frame.oscillatorPeriodsSeconds[j]!,
        )
      ) {
        incommensurate = false;
        break;
      }
    }
  }
  if (!incommensurate) {
    violations.push("LAW-2 separated timescales");
    violations.push("LAW-3 incommensurate periods");
  }
  if (Math.abs(frame.volumeProduct - c.volumeConservation) > 0.01) {
    violations.push("LAW-5 volume product");
  }
  if (frame.dampingRatio < 0.5 || frame.dampingRatio > 0.8) {
    violations.push("LAW-1 damping ratio");
  }
  if (frame.breathFrequencyHz < 0.2 || frame.breathFrequencyHz > 0.33) {
    violations.push("LAW-6 breath frequency");
  }
  if (frame.breathRateHz < 0.2 || frame.breathRateHz > 0.5) {
    violations.push("LAW-6 arousal breath-rate band");
  }
  if (frame.pulseRateHz < 0.4 || frame.pulseRateHz > 2.5) {
    violations.push("LAW-6 arousal pulse band");
  }
  if (frame.timeScale < 0.4 || frame.timeScale > 2.5) {
    violations.push("LAW-6 arousal time-scale band");
  }
  if (frame.breathAsymmetry < 0.35 || frame.breathAsymmetry > 0.45) {
    violations.push("LAW-6 breath asymmetry");
  }
  if (Math.abs(frame.breath) > c.breathAmplitude + 1e-6) {
    violations.push("LAW-6 breath amplitude");
  }
  if (Math.abs(frame.wanderPink) > 1 + 1e-6) {
    violations.push("LAW-8 pink wander bound");
  }
  if (Math.abs(frame.mood) > c.moodAmplitude + 1e-6) {
    violations.push("LAW-10 mood bound");
  }
  if (Math.abs(frame.startleGasp) > c.anticipationDepth + 1e-6) {
    violations.push("LAW-4 startle gasp bound");
  }
  if (
    Math.abs(frame.intentSpringX) > c.intentSpringBound + 1e-6 ||
    Math.abs(frame.intentSpringY) > c.intentSpringBound + 1e-6 ||
    Math.abs(frame.intentSpringTheta) > c.intentSpringBound + 1e-6
  ) {
    violations.push("LAW-10 intent spring bound");
  }
  if (frame.dispositionResidue < 0 || frame.dispositionResidue > 1) {
    violations.push("LAW-10 disposition residue");
  }
  if (Math.abs(frame.dispositionMood) > c.moodAmplitude + 1e-6) {
    violations.push("LAW-10 disposition mood");
  }
  if (frame.habitSalience < 0 || frame.habitSalience > 1) {
    violations.push("LAW-10 habit salience");
  }
  if (frame.microTremorPx < -0.75 || frame.microTremorPx > 0.75) {
    violations.push("LAW-1 micro tremor");
  }
  if (frame.dragModel !== "quadratic") violations.push("LAW-7 drag model");
  if (frame.dragCrossover < 0.25 || frame.dragCrossover > 0.35) {
    violations.push("LAW-7 drag crossover");
  }
  if (frame.responseTimeMs < 0 || frame.responseTimeMs > 200) {
    violations.push("LAW-7 response time");
  }
  if (frame.spectralDecay < 2 || frame.spectralDecay > 3) {
    violations.push("LAW-8 spectral decay");
  }
  if (frame.convexityFloor < 0.55 || frame.convexityFloor > 1) {
    violations.push("LAW-8 convexity floor");
  }
  if (frame.curvatureFloor < 0.03 || frame.curvatureFloor > 0.1) {
    violations.push("LAW-8 curvature floor");
  }
  if (frame.motionSignatureVariance < 0 || frame.motionSignatureVariance > 0.15) {
    violations.push("LAW-10 motion signature variance");
  }
  if (
    frame.anticipationFrames !== 0 &&
    (frame.anticipationFrames < 2 || frame.anticipationFrames > 15)
  ) {
    violations.push("LAW-4 anticipation duration");
  }
  if (Math.abs(frame.anticipation) > c.anticipationDepth + 1e-6) {
    violations.push("LAW-4 anticipation depth");
  }
  if (frame.audioBindingWindowMs < 0 || frame.audioBindingWindowMs > 45) {
    violations.push("LAW-7 audio binding window");
  }
  if (frame.compositeLoopDurationSeconds < 60) {
    violations.push("LAW-3 composite loop");
  }
  return violations;
}
