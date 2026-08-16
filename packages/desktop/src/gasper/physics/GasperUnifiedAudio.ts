/**
 * GASPER-UNIFIED-AUDIO-001 — a pure audio projection of the same unified
 * state-vector frame. This packet deliberately does not autoplay or own an
 * AudioContext; Studio may bind it to an output device under explicit user
 * gesture without creating a second temporal authority.
 */

import {
  GASPER_UNIFIED_THEORY_CONSTANTS,
  type GasperUnifiedFieldFrame,
} from "./GasperUnifiedTheory";

export type GasperUnifiedAudioFrame = Readonly<{
  packet: "GASPER-UNIFIED-AUDIO-001";
  sourcePacket: "GASPER-UNIFIED-THEORY-001";
  authorityId: "gasper-living-facial-authority";
  clockPacket: "VEC-401";
  sourceFrameIndex: number;
  timeMs: number;
  breathFrequencyHz: number;
  breathRateHz: number;
  breathLevelDb: number;
  bindingWindowMs: number;
  visualAudioLagMs: number;
  amplitude: number;
  oscillatorHz: number;
  /** Invertible spring signature (LAW-7 / SOUND-PHYS-004). */
  springHz: number;
  springZeta: number;
  decayTauMs: number;
  derivedFrom: readonly ["breath", "energyPulse", "wander"];
}>;

const TAU = Math.PI * 2;

export type GasperUnifiedAudioOutputStatus = Readonly<{
  bound: boolean;
  running: boolean;
  lastSourceFrameIndex: number;
  sourcePacket: "GASPER-UNIFIED-THEORY-001";
  clockPacket: "VEC-401";
}>;

function dbToLinear(db: number): number {
  return 10 ** (db / 20);
}

/**
 * Explicit user-gesture audio sink for the unified packet.
 *
 * It never creates/resumes an AudioContext, never owns time, and never schedules
 * a frame. Studio must call bind(context) from an approved user gesture; after
 * that, consume() is driven by the same living frame that drives the SVG.
 */
export class GasperUnifiedAudioOutput {
  private context: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private lastSourceFrameIndex = -1;

  bind(context: AudioContext): void {
    this.dispose();
    this.context = context;
    this.oscillator = context.createOscillator();
    this.gain = context.createGain();
    this.oscillator.type = "sine";
    this.oscillator.frequency.value = 0;
    this.gain.gain.value = 0;
    this.oscillator.connect(this.gain);
    this.gain.connect(context.destination);
    // bind() is explicitly caller-owned; this does not resume a suspended context.
    this.oscillator.start();
  }

  consume(frame: GasperUnifiedAudioFrame): void {
    if (
      !this.context ||
      !this.oscillator ||
      !this.gain ||
      frame.sourceFrameIndex <= this.lastSourceFrameIndex
    ) {
      return;
    }
    const now = this.context.currentTime;
    const transitionSeconds = 0.02;
    this.oscillator.frequency.setTargetAtTime(
      Math.max(0, frame.oscillatorHz),
      now,
      transitionSeconds,
    );
    this.gain.gain.setTargetAtTime(
      dbToLinear(frame.breathLevelDb) * frame.amplitude,
      now,
      transitionSeconds,
    );
    this.lastSourceFrameIndex = frame.sourceFrameIndex;
  }

  dispose(): void {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
      } catch {
        // Already stopped or never started.
      }
      this.oscillator.disconnect();
    }
    this.gain?.disconnect();
    this.context = null;
    this.oscillator = null;
    this.gain = null;
    this.lastSourceFrameIndex = -1;
  }

  status(): GasperUnifiedAudioOutputStatus {
    return {
      bound: this.context != null,
      running: this.oscillator != null,
      lastSourceFrameIndex: this.lastSourceFrameIndex,
      sourcePacket: "GASPER-UNIFIED-THEORY-001",
      clockPacket: "VEC-401",
    };
  }
}

export function evaluateUnifiedAudioFrame(
  field: GasperUnifiedFieldFrame,
  timeMs: number,
  provenance: Readonly<{
    authorityId: "gasper-living-facial-authority";
    clockPacket: "VEC-401";
    sourceFrameIndex: number;
  }>,
): GasperUnifiedAudioFrame {
  const c = GASPER_UNIFIED_THEORY_CONSTANTS;
  const breathLevelDb = c.audioBreathLevelDb + Math.abs(field.breath) * 8;
  const springHz = 1 / c.springPeriodsSeconds[0]!;
  const omega0 = TAU * springHz;
  const decayTauMs = (2 / (c.dampingRatio * omega0)) * 1000;
  return Object.freeze({
    packet: "GASPER-UNIFIED-AUDIO-001",
    sourcePacket: "GASPER-UNIFIED-THEORY-001",
    authorityId: provenance.authorityId,
    clockPacket: provenance.clockPacket,
    sourceFrameIndex: Number.isInteger(provenance.sourceFrameIndex)
      ? provenance.sourceFrameIndex
      : 0,
    timeMs: Number.isFinite(timeMs) ? timeMs : field.timeSeconds * 1000,
    breathFrequencyHz: field.breathFrequencyHz,
    breathRateHz: field.breathFrequencyHz,
    breathLevelDb,
    bindingWindowMs: c.audioBindingWindowMs,
    visualAudioLagMs: 0,
    amplitude: Math.max(0, Math.min(1, 0.18 + Math.abs(field.energyPulse) * 0.5)),
    oscillatorHz: field.breathFrequencyHz,
    springHz,
    springZeta: c.dampingRatio,
    decayTauMs,
    derivedFrom: ["breath", "energyPulse", "wander"] as const,
  });
}

/**
 * Invert the audio projection back into physics (SOUND-PHYS-004): from the
 * decay envelope and the tone frequency we recover ζ = 2m/c in the damped
 * spring convention, matching the authored state within tolerance.
 */
export function decodeUnifiedAudioFrame(
  frame: GasperUnifiedAudioFrame,
): Readonly<{
  breathHz: number;
  springHz: number;
  zeta: number;
  decayTauMs: number;
  ok: boolean;
}> {
  const springHz = frame.springHz;
  const omega0 = TAU * springHz;
  const zeta = 2000 / (frame.decayTauMs * omega0);
  const ok =
    Number.isFinite(zeta) &&
    Math.abs(zeta - frame.springZeta) < 1e-6 &&
    springHz > 0 &&
    frame.decayTauMs > 0 &&
    frame.breathRateHz >= 0.2 &&
    frame.breathRateHz <= 0.5;
  return Object.freeze({
    breathHz: frame.breathRateHz,
    springHz,
    zeta,
    decayTauMs: frame.decayTauMs,
    ok,
  });
}
