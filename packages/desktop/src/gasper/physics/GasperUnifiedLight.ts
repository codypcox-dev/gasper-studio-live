/**
 * GASPER-UNIFIED-LIGHT-001 — the light IS the emotion (LAW-7).
 *
 * A pure projection of the same unified field: intensity breathes with the
 * breath clock (+1% lightness), glow contracts with low arousal, and light
 * lags form by 600-1000 ms while color lags shape by ~200 ms (STYL-2D-030,
 * STYL-2D-067). Nothing is painted; every channel is derived from the field.
 */

import {
  evaluateUnifiedFieldFrame,
  GASPER_UNIFIED_THEORY_CONSTANTS,
} from "./GasperUnifiedTheory";

export const GASPER_UNIFIED_LIGHT_PACKET = "GASPER-UNIFIED-LIGHT-001" as const;

export type UnifiedLightSample = Readonly<{
  packet: typeof GASPER_UNIFIED_LIGHT_PACKET;
  lightLagMs: number;
  colorLagMs: number;
  intensity: number;
  laggedIntensity: number;
  breathLightLift: number;
  colorLagValue: number;
  glowContraction: number;
  roughness: number;
  volumeProduct: number;
  sourceBreath: number;
  sourceEnergyPulse: number;
}>;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function evaluateUnifiedLightProjection(input: {
  timeMs: number;
  seed: number;
  arousal?: number;
  reducedMotion?: boolean;
  lightLagMs?: number;
  colorLagMs?: number;
  voluntaryIntent?: boolean;
  intentProgress?: number;
  intentIntensity?: number;
  startle?: boolean;
}): UnifiedLightSample {
  const c = GASPER_UNIFIED_THEORY_CONSTANTS;
  const t = Math.max(0, Number.isFinite(input.timeMs) ? input.timeMs : 0);
  const lightLagMs = clamp(
    Number.isFinite(input.lightLagMs ?? 800) ? input.lightLagMs ?? 800 : 800,
    600,
    1000,
  );
  const colorLagMs = clamp(
    Number.isFinite(input.colorLagMs ?? 200) ? input.colorLagMs ?? 200 : 200,
    150,
    300,
  );
  const common = {
    seed: input.seed,
    reducedMotion: input.reducedMotion === true,
    arousal: input.arousal,
    voluntaryIntent: input.voluntaryIntent,
    intentProgress: input.intentProgress,
    intentIntensity: input.intentIntensity,
    startle: input.startle,
  };
  const now = evaluateUnifiedFieldFrame({
    timeSeconds: t / 1000,
    ...common,
  });
  const lightLag = evaluateUnifiedFieldFrame({
    timeSeconds: Math.max(0, t - lightLagMs) / 1000,
    ...common,
  });
  const colorLag = evaluateUnifiedFieldFrame({
    timeSeconds: Math.max(0, t - colorLagMs) / 1000,
    ...common,
  });

  const breathLightLift = 0.01 * now.breath;
  const intensity = clamp(
    0.5 +
      (now.arousal - 0.5) * 0.25 +
      breathLightLift +
      now.energyPulse * 0.04 +
      now.anticipation * 0.02 +
      now.startleGasp * 0.05,
    0.3,
    0.95,
  );
  const laggedIntensity = clamp(
    0.5 +
      (lightLag.arousal - 0.5) * 0.25 +
      0.01 * lightLag.breath +
      lightLag.energyPulse * 0.04,
    0.3,
    0.95,
  );
  const colorLagValue = clamp(colorLag.wander * 0.03 + colorLag.mood * 0.1, -0.2, 0.2);
  const glowContraction = clamp(0.22 - now.arousal * 0.18, 0, 0.3);
  const roughness = clamp(0.35 + (1 - now.arousal) * 0.08, 0.25, 0.45);
  return Object.freeze({
    packet: GASPER_UNIFIED_LIGHT_PACKET,
    lightLagMs,
    colorLagMs,
    intensity,
    laggedIntensity,
    breathLightLift,
    colorLagValue,
    glowContraction,
    roughness,
    volumeProduct: now.volumeProduct,
    sourceBreath: now.breath,
    sourceEnergyPulse: now.energyPulse,
  });
}
