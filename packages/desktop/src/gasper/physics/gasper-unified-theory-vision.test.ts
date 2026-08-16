/**
 * GASPER-UNIFIED-THEORY-VISION — executable proofs for the ten laws and the
 * verification appendix of `Documents/triforce-engine/research/gasper-unified-theory.md`
 * plus the constitutional registry (`gasper-constitution.json`).
 *
 * Machine-proven claims only: no visual claims, no human acceptance.
 */

import { describe, expect, it } from "vitest";
import {
  GASPER_UNIFIED_THEORY_CONSTANTS,
  evaluateUnifiedFieldFrame,
  validateUnifiedFieldFrame,
} from "./GasperUnifiedTheory";
import {
  decodeUnifiedAudioFrame,
  evaluateUnifiedAudioFrame,
} from "./GasperUnifiedAudio";
import {
  createIntentSpring,
  retargetIntentSpring,
  stepIntentSpring,
  validateIntentSpring,
} from "./GasperIntentSpring";
import {
  advanceDisposition,
  createDisposition,
  EMOTION_BEAT_RATIOS,
  EMOTION_DECAY_TAUS_FRAMES,
  evaluateDispositionSample,
  HABIT_BUFFER_SIZE,
  HABIT_HALF_LIFE_SECONDS,
  MOOD_AMPLITUDE,
  RESIDUE_BUFFER_SIZE,
  UNIFIED_EMOTION_IDS,
} from "./GasperUnifiedDisposition";
import { evaluateUnifiedLightProjection } from "./GasperUnifiedLight";
import { THREE_BEAT_SEQUENCES } from "../eight-state-loop/beat-sequence";
import { GasperLivingFacialAuthority } from "../living/GasperLivingFacialAuthority";

const C = GASPER_UNIFIED_THEORY_CONSTANTS;

function fieldAt(timeSeconds: number, seed = 1007, extra: Record<string, unknown> = {}) {
  return evaluateUnifiedFieldFrame({
    timeSeconds,
    seed,
    arousal: 0.5,
    ...extra,
  });
}

describe("GASPER-UNIFIED-THEORY-VISION — the ten laws", () => {
  it("LAW-1 Living Band: ζ in [0.5,0.8]; the only >8 Hz signal is subliminal tremor", () => {
    expect(C.dampingRatio).toBeGreaterThanOrEqual(0.5);
    expect(C.dampingRatio).toBeLessThanOrEqual(0.8);
    expect(C.microTremorFrequencyHz).toBeGreaterThanOrEqual(8);
    expect(C.microTremorFrequencyHz).toBeLessThanOrEqual(15);
    expect(C.microTremorAmplitudePx).toBeGreaterThanOrEqual(0.25);
    expect(C.microTremorAmplitudePx).toBeLessThanOrEqual(0.75);

    const frame = fieldAt(10);
    const tremorPeriod = 1 / C.microTremorFrequencyHz;
    for (const period of frame.oscillatorPeriodsSeconds) {
      const hz = 1 / period;
      if (period === tremorPeriod) continue;
      expect(hz).toBeLessThan(8);
    }

    // Step response: ζ≈0.65 gives a visible overshoot then settles (appeal,
    // not servo, not gag).
    let spring = createIntentSpring({
      x: 0,
      v: 0,
      target: 0,
      zeta: C.dampingRatio,
      periodSeconds: C.springPeriodsSeconds[0],
    });
    spring = retargetIntentSpring(spring, 1);
    let maxX = 0;
    let velocitySignFlips = 0;
    let prevV = 0;
    for (let i = 0; i < 300; i++) {
      spring = stepIntentSpring(spring, 1 / 60);
      maxX = Math.max(maxX, spring.x);
      if (prevV !== 0 && Math.sign(spring.v) !== Math.sign(prevV)) {
        velocitySignFlips++;
      }
      prevV = spring.v;
    }
    expect(maxX).toBeGreaterThan(1.0);
    expect(velocitySignFlips).toBeGreaterThanOrEqual(2);
    expect(Math.abs(spring.x - 1)).toBeLessThan(0.05);
  });

  it("LAW-2 Separated Timescales: no two oscillator periods are within 10%", () => {
    const periods = [
      1 / C.breathFrequencyHz,
      ...C.springPeriodsSeconds,
      ...C.wanderPeriodsSeconds,
      C.moodPeriodSeconds,
    ];
    for (let i = 0; i < periods.length; i++) {
      for (let j = i + 1; j < periods.length; j++) {
        const a = periods[i]!;
        const b = periods[j]!;
        const diff = Math.abs(a - b) / Math.max(a, b);
        expect(diff, `periods ${a}s vs ${b}s`).toBeGreaterThan(0.1);
      }
    }
  });

  it("LAW-3 Incommensurability: no small-integer ratios, no exact repeat < 60 s, composite loop ≥ 60 s", () => {
    const periods = [
      1 / C.breathFrequencyHz,
      ...C.springPeriodsSeconds,
      ...C.wanderPeriodsSeconds,
      C.moodPeriodSeconds,
    ];
    const hasSmallRatio = (a: number, b: number): boolean => {
      const ratio = Math.max(a, b) / Math.min(a, b);
      for (let p = 1; p < 10; p++) {
        for (let q = 1; q < 10; q++) {
          if (Math.abs(ratio - p / q) < 0.002) return true;
        }
      }
      return false;
    };
    for (let i = 0; i < periods.length; i++) {
      for (let j = i + 1; j < periods.length; j++) {
        expect(
          hasSmallRatio(periods[i]!, periods[j]!),
          `ratio of ${periods[i]}s / ${periods[j]}s is a small integer ratio`,
        ).toBe(false);
      }
    }

    // No exact repeat over 120 s at 10 Hz for lags 1–60 s (perceptible loop).
    const dt = 0.1;
    const frames: Record<string, number>[] = [];
    for (let i = 0; i < 1200; i++) {
      const f = fieldAt(i * dt);
      frames.push({
        breath: f.breath,
        wander: f.wander,
        wanderPink: f.wanderPink,
        springX: f.springX,
        springY: f.springY,
        energyPulse: f.energyPulse,
        mood: f.mood,
      });
    }
    for (let lag = 10; lag <= 600; lag++) {
      let maxAbsDiff = 0;
      for (let i = 0; i + lag < frames.length; i++) {
        for (const key of Object.keys(frames[i]!)) {
          maxAbsDiff = Math.max(
            maxAbsDiff,
            Math.abs(frames[i]![key]! - frames[i + lag]![key]!),
          );
        }
      }
      expect(maxAbsDiff, `lag ${lag / 10}s`).toBeGreaterThan(1e-8);
    }
    expect(C.compositeLoopDurationSeconds).toBeGreaterThanOrEqual(60);
  });

  it("LAW-4 The Promise: voluntary pre-compresses, involuntary does not, startle gasps", () => {
    const voluntary = fieldAt(1, 1007, {
      voluntaryIntent: true,
      intentProgress: 0.1,
      intentIntensity: 1,
    });
    expect(voluntary.anticipation).toBeLessThan(0);
    expect(voluntary.anticipation).toBeGreaterThanOrEqual(-C.anticipationDepth);

    const idle = fieldAt(1);
    expect(idle.anticipation).toBe(0);
    expect(idle.startleGasp).toBe(0);

    const startle = fieldAt(1, 1007, {
      startle: true,
      intentProgress: 0.1,
      intentIntensity: 1,
    });
    expect(startle.anticipation).toBe(0);
    expect(startle.startleGasp).toBeGreaterThan(0);
    expect(startle.startleGasp).toBeLessThanOrEqual(C.anticipationDepth);
  });

  it("LAW-5 Conserved Substance: volume product = 1.0, no per-frame volume jumps", () => {
    let prevProduct = 1;
    for (let i = 0; i < 300; i++) {
      const f = fieldAt(i / 60);
      expect(Math.abs(f.volumeProduct - 1)).toBeLessThan(1e-9);
      expect(Math.abs(f.volumeProduct - prevProduct)).toBeLessThan(0.01);
      prevProduct = f.volumeProduct;
    }
  });

  it("LAW-6 Never-Still: ≥3 independent channels, no static hold > 1 s, breath never zero", () => {
    const dt = 1 / 60;
    const channels: Record<string, number[]> = {
      breath: [],
      wander: [],
      wanderPink: [],
      springX: [],
      energyPulse: [],
      reliefDrift: [],
    };
    for (let i = 0; i < 600; i++) {
      const f = fieldAt(i * dt);
      channels.breath!.push(f.breath);
      channels.wander!.push(f.wander);
      channels.wanderPink!.push(f.wanderPink);
      channels.springX!.push(f.springX);
      channels.energyPulse!.push(f.energyPulse);
      channels.reliefDrift!.push(f.reliefDrift);
    }
    let aliveChannels = 0;
    for (const [name, values] of Object.entries(channels)) {
      const maxAbs = Math.max(...values.map((v) => Math.abs(v)));
      if (maxAbs > 0.001) aliveChannels++;
      // Static-hold test: any 1 s window must have variance above epsilon.
      let minVariance = Number.POSITIVE_INFINITY;
      for (let i = 0; i + 60 <= values.length; i++) {
        const window = values.slice(i, i + 60);
        const mean = window.reduce((s, v) => s + v, 0) / window.length;
        const variance =
          window.reduce((s, v) => s + (v - mean) * (v - mean), 0) / window.length;
        minVariance = Math.min(minVariance, variance);
      }
      expect(minVariance, `${name} static hold`).toBeGreaterThan(1e-10);
    }
    expect(aliveChannels).toBeGreaterThanOrEqual(3);

    const reduced = fieldAt(30, 1007, { reducedMotion: true });
    expect(Math.abs(reduced.breath)).toBeGreaterThan(0.02);
    expect(reduced.activeOscillatorCount).toBeGreaterThanOrEqual(3);
  });

  it("LAW-7 Honest Body: audio is invertible, desync < 45 ms, light is field-derived with form/color lag", () => {
    const f = fieldAt(5);
    expect(validateUnifiedFieldFrame(f)).toEqual([]);
    const audio = evaluateUnifiedAudioFrame(f, 5000, {
      authorityId: "gasper-living-facial-authority",
      clockPacket: "VEC-401",
      sourceFrameIndex: 300,
    });
    expect(audio.bindingWindowMs).toBeLessThanOrEqual(45);
    expect(audio.visualAudioLagMs).toBeLessThanOrEqual(45);
    const decoded = decodeUnifiedAudioFrame(audio);
    expect(decoded.ok).toBe(true);
    expect(Math.abs(decoded.zeta - C.dampingRatio)).toBeLessThan(1e-6);
    expect(decoded.springHz).toBe(1 / C.springPeriodsSeconds[0]);

    const light = evaluateUnifiedLightProjection({
      timeMs: 5000,
      seed: 1007,
      arousal: 0.5,
    });
    expect(light.lightLagMs).toBeGreaterThanOrEqual(600);
    expect(light.lightLagMs).toBeLessThanOrEqual(1000);
    expect(light.colorLagMs).toBeGreaterThanOrEqual(150);
    expect(light.colorLagMs).toBeLessThanOrEqual(300);
    expect(Math.abs(light.breathLightLift - 0.01 * f.breath)).toBeLessThan(1e-9);
    expect(light.intensity).toBeGreaterThanOrEqual(0.3);
    expect(light.intensity).toBeLessThanOrEqual(0.95);
    expect(light.volumeProduct).toBe(1);
  });

  it("LAW-8 Bounded Soul: all field outputs stay inside constitution bounds; illegal intent is unrepresentable", () => {
    let maxWander = 0;
    let maxPink = 0;
    let maxMood = 0;
    let maxBreath = 0;
    let maxSpring = 0;
    let maxTremor = 0;
    for (let i = 0; i < 3600; i++) {
      const f = fieldAt(i / 60);
      maxWander = Math.max(maxWander, Math.abs(f.wander));
      maxPink = Math.max(maxPink, Math.abs(f.wanderPink));
      maxMood = Math.max(maxMood, Math.abs(f.mood));
      maxBreath = Math.max(maxBreath, Math.abs(f.breath));
      maxSpring = Math.max(maxSpring, Math.abs(f.springX), Math.abs(f.springY), Math.abs(f.springTheta));
      maxTremor = Math.max(maxTremor, Math.abs(f.microTremorNormalized));
    }
    expect(maxWander).toBeLessThanOrEqual(1 + 1e-6);
    expect(maxPink).toBeLessThanOrEqual(1 + 1e-6);
    expect(maxMood).toBeLessThanOrEqual(C.moodAmplitude + 1e-6);
    expect(maxBreath).toBeLessThanOrEqual(C.breathAmplitude + 1e-6);
    expect(maxSpring).toBeLessThanOrEqual(0.03);
    expect(maxTremor).toBeLessThanOrEqual(0.0075);
    expect(C.spectralDecay).toBeGreaterThanOrEqual(2);
    expect(C.spectralDecay).toBeLessThanOrEqual(3);
    expect(C.convexityFloor).toBeGreaterThanOrEqual(0.55);
    expect(C.curvatureFloor).toBeGreaterThanOrEqual(0.03);
    expect(C.curvatureFloor).toBeLessThanOrEqual(0.1);

    // Illegal intent values are clamped at the library level, not post-hoc.
    const clamped = fieldAt(1, 1007, {
      intentSprings: { x: 5, y: -5, theta: 99 },
    });
    expect(clamped.intentSpringX).toBe(C.intentSpringBound);
    expect(clamped.intentSpringY).toBe(-C.intentSpringBound);
    expect(clamped.intentSpringTheta).toBe(C.intentSpringBound);
    expect(validateUnifiedFieldFrame(clamped)).toEqual([]);

    const badSpring = createIntentSpring({ zeta: 0.35 });
    expect(validateIntentSpring(badSpring).length).toBeGreaterThan(0);
  });

  it("LAW-9 Three Beats: recovery is longest; emotion ratios match the constitution", () => {
    for (const emotion of UNIFIED_EMOTION_IDS) {
      const [gather, embody, settle] = EMOTION_BEAT_RATIOS[emotion];
      expect(settle).toBeGreaterThan(gather);
      expect(embody).toBeGreaterThan(0);
    }
    const constitutionRatios: Record<string, readonly [number, number, number]> = {
      joy: [2, 1, 4],
      sadness: [4, 1, 12],
      anger: [2, 2, 3],
      fear: [1, 1, 6],
      surprise: [0, 1, 5],
      curiosity: [2, 2, 5],
      contentment: [3, 2, 6],
      blocked: [3, 3, 4],
    };
    for (const emotion of UNIFIED_EMOTION_IDS) {
      expect(EMOTION_BEAT_RATIOS[emotion]).toEqual(constitutionRatios[emotion]);
    }
    for (const stateId of Object.keys(THREE_BEAT_SEQUENCES) as Array<
      keyof typeof THREE_BEAT_SEQUENCES
    >) {
      const seq = THREE_BEAT_SEQUENCES[stateId];
      expect(seq.phases[2].durationMs).toBeGreaterThanOrEqual(
        seq.phases[0].durationMs,
      );
    }
  });

  it("LAW-10 Remembering Field: staggered decay, bounded residue/habits/mood, velocity-preserving retarget", () => {
    expect(HABIT_HALF_LIFE_SECONDS).toBe(60);
    let state = createDisposition(1007);
    state = advanceDisposition(state, {
      emotion: "joy",
      timeSeconds: 0,
      intensity: 1,
    });
    state = advanceDisposition(state, {
      emotion: "sadness",
      timeSeconds: 3,
      intensity: 1,
    });
    expect(state.residue.length).toBeLessThanOrEqual(RESIDUE_BUFFER_SIZE);
    const after = evaluateDispositionSample(state, 6);
    expect(after.dominantEmotion).toBe("sadness");
    expect(after.residue).toBeGreaterThan(0);
    expect(Math.abs(after.mood)).toBeLessThanOrEqual(MOOD_AMPLITUDE);
    expect(after.habitSalience).toBeGreaterThanOrEqual(0);
    expect(after.habitSalience).toBeLessThanOrEqual(1);

    // Staggered taus: sadness (180 f) outlives joy (45 f).
    expect(EMOTION_DECAY_TAUS_FRAMES.sadness).toBeGreaterThan(
      EMOTION_DECAY_TAUS_FRAMES.joy,
    );
    expect(EMOTION_DECAY_TAUS_FRAMES.sadness).toBe(180);

    // Habit buffer is bounded at 5 entries.
    let habits = createDisposition(7);
    let t = 0;
    for (const emotion of [...UNIFIED_EMOTION_IDS, "joy", "sadness"]) {
      habits = advanceDisposition(habits, {
        emotion,
        timeSeconds: t,
        intensity: 1,
      });
      t += 2;
    }
    expect(habits.habits.length).toBeLessThanOrEqual(HABIT_BUFFER_SIZE);

    // STRUCT-5: retarget preserves spring velocity; never resets to (target, 0).
    const spring = createIntentSpring({ x: 0.2, v: 0.5, target: 0.2 });
    const retargeted = retargetIntentSpring(spring, 0.9);
    expect(retargeted.v).toBe(0.5);
    expect(retargeted.x).toBe(0.2);
    expect(retargeted.target).toBe(0.9);
    const reset = retargetIntentSpring(spring, 0.9, { preserveVelocity: false });
    expect(reset.v).toBe(0);
  });

  it("deterministic replay: same seed/commands → identical field, light, audio; different seed diverges", () => {
    const a: number[] = [];
    const b: number[] = [];
    const c: number[] = [];
    for (let i = 0; i < 300; i++) {
      const fa = fieldAt(i / 60, 1007);
      const fb = fieldAt(i / 60, 1007);
      const fc = fieldAt(i / 60, 2042);
      a.push(fa.breath, fa.wanderPink, fa.springX, fa.mood, fa.energyPulse);
      b.push(fb.breath, fb.wanderPink, fb.springX, fb.mood, fb.energyPulse);
      c.push(fc.breath, fc.wanderPink, fc.springX, fc.mood, fc.energyPulse);
    }
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);

    const la = evaluateUnifiedLightProjection({ timeMs: 12345, seed: 1007, arousal: 0.6 });
    const lb = evaluateUnifiedLightProjection({ timeMs: 12345, seed: 1007, arousal: 0.6 });
    expect(la).toEqual(lb);
  });

  it("living authority consumes the full field: disposition, intent springs, light, zero violations", () => {
    const run = () => {
      const authority = new GasperLivingFacialAuthority();
      authority.configure({ seed: 1007 });
      authority.start("presence-neutral-settled", 0);
      authority.setState("presence-blocked-strain", {
        durationSeconds: 0.5,
        timeMs: 1000,
      });
      authority.setState("presence-pleased-resolve", {
        durationSeconds: 0.5,
        timeMs: 2000,
      });
      let last = authority.evaluate(
        { timeMs: 2500, deltaMs: 1000 / 60, frameIndex: 150 },
        { energy_level: 0.55 },
      );
      for (let i = 0; i < 120; i++) {
        last = authority.evaluate(
          { timeMs: 2500 + i * (1000 / 60), deltaMs: 1000 / 60, frameIndex: 150 + i },
          { energy_level: 0.55 },
        );
      }
      return last;
    };
    const a = run();
    const b = run();
    expect(a.unifiedViolations).toEqual([]);
    expect(a.hash).toBe(b.hash);
    expect(a.light.intensity).toBeGreaterThanOrEqual(0.3);
    expect(a.light.intensity).toBeLessThanOrEqual(0.95);
    expect(Number.isFinite(a.intentSprings.x.x)).toBe(true);
    expect(a.disposition.dominantEmotion).toBe("joy");
    expect(a.values.unified_light_intensity).toBeCloseTo(a.light.intensity, 3);
    expect(a.values.unified_disposition_residue).toBeCloseTo(
      a.unified.dispositionResidue,
      3,
    );
  });
});
