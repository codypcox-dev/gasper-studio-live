/**
 * Output adapter: ReliefField → authority-renderer drive payload.
 * Integrator wires this into LegacyAuthorityRenderer / FormMaster hooks.
 * No DOM queries here — pure conversion.
 */

import type { ReliefAuthorityDrive, ReliefField } from "./types";

export type ReliefAdapterOptions = {
  amplitude: number;
  seed: number;
  /** Max ellipses emitted (authority path budget). */
  maxEllipses?: number;
};

/**
 * Convert a relief sample field into ellipse descriptors the authority
 * renderer can apply via integrator-owned hooks (reliefHighlight / reliefShadow).
 */
export function reliefFieldToAuthorityDrive(
  field: ReliefField,
  opts: ReliefAdapterOptions,
): ReliefAuthorityDrive {
  const maxEllipses = Math.min(200, opts.maxEllipses ?? 120);
  const amp = Math.max(0, Math.min(1, opts.amplitude));
  const w = field.width;
  const h = field.height;
  const n = field.samples.length;

  // Pack as [cx, cy, rx, ry, opacity] * count
  const highlight: number[] = [];
  const shadow: number[] = [];

  if (amp <= 1e-9 || n === 0) {
    return {
      amplitude: 0,
      seed: opts.seed | 0,
      highlightEllipses: new Float32Array(0),
      shadowEllipses: new Float32Array(0),
      activeSampleCount: 0,
      layerOpacity: 0,
      geometryPopulated: false,
      fieldHash: field.hash,
    };
  }

  // Amplitude scales active budget so 0.5 vs 1.0 remain visibly distinct
  const budget = Math.max(8, Math.floor(maxEllipses * (0.25 + 0.75 * amp)));
  const stride = Math.max(1, Math.floor(n / budget));
  let count = 0;
  const range = Math.max(1e-6, field.max - field.min);
  // Lower amplitude → higher magnitude threshold (fewer, subtler ellipses)
  const magFloor = Math.max(0.008, 0.04 * (1.15 - amp));

  for (let i = 0; i < n && count < budget; i += stride) {
    const v = field.samples[i]!;
    const mag = Math.abs(v);
    if (mag < range * 0.08 && mag < magFloor) continue;
    const x = i % w;
    const y = Math.floor(i / w);
    // Map grid → SVG-ish face body coords (normalized 0–100 viewBox later by integrator)
    const cx = (x / Math.max(1, w - 1)) * 100;
    const cy = (y / Math.max(1, h - 1)) * 100;
    const size = 0.6 + mag * 4.5 * amp;
    const opacity = Math.min(0.55, 0.12 + mag * 0.8 * amp);
    if (v >= 0) {
      highlight.push(cx, cy, size * 1.1, size * 0.85, opacity);
    } else {
      shadow.push(cx, cy, size, size * 0.9, opacity * 0.9);
    }
    count++;
  }

  return {
    amplitude: amp,
    seed: opts.seed | 0,
    highlightEllipses: Float32Array.from(highlight),
    shadowEllipses: Float32Array.from(shadow),
    activeSampleCount: count,
    layerOpacity: amp <= 0 ? 0 : 0.35 + amp * 0.45,
    geometryPopulated: count > 0,
    fieldHash: field.hash,
  };
}

/** Build SVG path `d` segments from packed ellipses (integrator applies to path attrs). */
export function ellipsesToPathD(ellipses: Float32Array): string {
  const parts: string[] = [];
  for (let i = 0; i + 4 < ellipses.length; i += 5) {
    const cx = ellipses[i]!;
    const cy = ellipses[i + 1]!;
    const rx = ellipses[i + 2]!;
    const ry = ellipses[i + 3]!;
    // Approximate ellipse with path arc pair
    parts.push(
      `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0`,
    );
  }
  return parts.join(" ");
}
