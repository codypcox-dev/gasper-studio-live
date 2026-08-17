/**
 * Live displacement field — one 1000-float rest-radial buffer.
 * C = Γ(L) + Σs_i. Layers add. Zero is +0. Topology does not grow.
 */
import {
  SCAFFOLD_VERTEX_COUNT,
  composeScaffoldScalars,
  type ScaffoldSource,
  type ScaffoldSourceKind,
} from "./AdaptiveShellScaffold";

export const FIELD_LAYER_ORDER = Object.freeze([
  "pressure",
  "relief",
  "captured",
] as const satisfies readonly ScaffoldSourceKind[]);

export const FIELD_SPACE = "rest-radial-scalar" as const;
export const FIELD_ZERO = 0 as const;

export type NamedFieldLayers = {
  pressure?: Float32Array | null;
  relief?: Float32Array | null;
  captured?: Float32Array | null;
  pressureAmp?: number;
  reliefAmp?: number;
  capturedAmp?: number;
};

function layer(
  kind: ScaffoldSourceKind,
  samples: Float32Array | null | undefined,
  amplitude: number,
): ScaffoldSource | null {
  if (!samples || samples.length !== SCAFFOLD_VERTEX_COUNT) return null;
  const amp = Number.isFinite(amplitude) ? amplitude : 0;
  if (amp === 0) return null;
  return { kind, amplitude: amp, samples };
}

/** Compose named layers onto one 1000. Missing or amp 0 is +0. */
export function composeNamedField(layers: NamedFieldLayers = {}): Float32Array {
  const sources = [
    layer("pressure", layers.pressure, layers.pressureAmp ?? 1),
    layer("relief", layers.relief, layers.reliefAmp ?? 1),
    layer("captured", layers.captured, layers.capturedAmp ?? 1),
  ].filter((s): s is ScaffoldSource => s !== null);
  return composeScaffoldScalars(sources);
}

export function fieldEnergy(samples: Float32Array): { rms: number; peak: number } {
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i] ?? 0;
    sum += v * v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  const n = samples.length || 1;
  return { rms: Math.sqrt(sum / n), peak };
}

export function assertFieldIdentity(samples: Float32Array): boolean {
  if (samples.length !== SCAFFOLD_VERTEX_COUNT) return false;
  for (let i = 0; i < samples.length; i++) if (samples[i] !== 0) return false;
  return true;
}

export { composeScaffoldScalars, SCAFFOLD_VERTEX_COUNT };
