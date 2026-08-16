/**
 * GASPER-UNIFIED-THEORY-VISION — live unified-field readout.
 * Display-only telemetry from the single living authority; owns no clock,
 * no organism state, and no SVG writes.
 */
import { useEffect, useRef, useState } from "react";

type FieldStatus = {
  breath: number;
  oscillators: number;
  damping: number;
  volume: number;
  breathRateHz: number;
  pulseRateHz: number;
  timeScale: number;
  wanderPink: number;
  mood: number;
  light: number;
  dispositionMood: number;
  habitSalience: number;
  lifePhase?: string;
  embodimentId?: string;
};

function readStatus(): FieldStatus | null {
  const dais = (window as unknown as {
    __GASPER_DAIS__?: { livingStatus?: () => Record<string, unknown> };
  }).__GASPER_DAIS__;
  const s = dais?.livingStatus?.();
  if (!s) return null;
  return {
    breath: Number(s.breath ?? 0),
    oscillators: Number(s.unifiedOscillatorCount ?? 0),
    damping: Number(s.unifiedDampingRatio ?? 0),
    volume: Number(s.unifiedVolumeProduct ?? 1),
    breathRateHz: Number(s.unifiedBreathRateHz ?? 0),
    pulseRateHz: Number(s.unifiedPulseRateHz ?? 0),
    timeScale: Number(s.unifiedTimeScale ?? 1),
    wanderPink: Number(s.unifiedWanderPink ?? 0),
    mood: Number(s.unifiedMood ?? 0),
    light: Number(s.unifiedLightIntensity ?? 0),
    dispositionMood: Number(s.dispositionMood ?? 0),
    habitSalience: Number(s.habitSalience ?? 0),
    lifePhase: String(s.lifePhase ?? ""),
    embodimentId: String(s.embodimentId ?? ""),
  };
}

const fmt = (v: number, digits = 2) => v.toFixed(digits);

/**
 * CYCLE-7 FRAME BUDGET (frame-budget-phd-memo F3 — change-rate ≠ display-rate):
 * the unified field evolves on breath/wander time scales (≪ 10 Hz), yet the old
 * loop re-read and re-set it at display rate, rebuilding an unchanged readout
 * ~40–60×/s. Sample at ≤ 10 Hz and skip setState while the values hold — holds
 * are held, not simulated (`limited-animation-economics`). Display-only
 * semantics unchanged: no clock, no organism state, no SVG writes.
 */
const READOUT_SAMPLE_MS = 100;

function sameFieldStatus(
  a: FieldStatus | null,
  b: FieldStatus | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.breath === b.breath &&
    a.oscillators === b.oscillators &&
    a.damping === b.damping &&
    a.volume === b.volume &&
    a.breathRateHz === b.breathRateHz &&
    a.pulseRateHz === b.pulseRateHz &&
    a.timeScale === b.timeScale &&
    a.wanderPink === b.wanderPink &&
    a.mood === b.mood &&
    a.light === b.light &&
    a.dispositionMood === b.dispositionMood &&
    a.habitSalience === b.habitSalience &&
    a.lifePhase === b.lifePhase &&
    a.embodimentId === b.embodimentId
  );
}

export function UnifiedFieldReadout() {
  const [s, setS] = useState<FieldStatus | null>(null);
  const raf = useRef(0);
  useEffect(() => {
    let lastSampleAt = 0;
    let prev: FieldStatus | null = null;
    const tick = (now: number) => {
      raf.current = requestAnimationFrame(tick);
      if (now - lastSampleAt < READOUT_SAMPLE_MS) return;
      lastSampleAt = now;
      const next = readStatus();
      if (sameFieldStatus(next, prev)) return;
      prev = next;
      setS(next);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);
  if (!s) return null;
  return (
    <span
      data-testid="unified-field-readout"
      style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: 10,
        opacity: 0.85,
        whiteSpace: "nowrap",
        display: "inline-flex",
        gap: 8,
      }}
    >
      <span>breath {fmt(s.breath)}</span>
      <span>bpm {fmt(s.breathRateHz * 60, 1)}</span>
      <span>pulse {fmt(s.pulseRateHz, 2)}Hz</span>
      <span>t×{fmt(s.timeScale, 2)}</span>
      <span>wander {fmt(s.wanderPink)}</span>
      <span>mood {fmt(s.mood)}</span>
      <span>light {fmt(s.light)}</span>
      <span>ζ {fmt(s.damping)}</span>
      <span>V {fmt(s.volume, 4)}</span>
      <span>{s.embodimentId}</span>
    </span>
  );
}
