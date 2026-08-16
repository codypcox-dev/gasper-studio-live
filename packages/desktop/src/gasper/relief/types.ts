/**
 * Adaptive relief field types (Lane R1).
 * Pure data — no React, no DOM, no document ownership.
 */

export type ReliefGenerationInput = {
  width: number;
  height: number;
  amplitude: number;
  scale: number;
  seed: number;
  timeSeconds: number;
  motion: number;
  energy: number;
  tension: number;
  damping: number;
  coupling: number;
};

export type ReliefField = {
  width: number;
  height: number;
  samples: Float32Array;
  min: number;
  max: number;
  mean: number;
  hash: string;
};

export type ReliefMetrics = {
  sampleCount: number;
  nonzeroCount: number;
  rms: number;
  min: number;
  max: number;
  mean: number;
  hash: string;
  amplitude: number;
  updateCostMs: number;
};

export type ReliefAuthorityDrive = {
  /** 0–1 amplitude for legacy preset intensity. */
  amplitude: number;
  /** Deterministic seed forwarded to SidekickReliefFields. */
  seed: number;
  /** Highlight path samples (x,y,rx,ry,opacity) — max 1000. */
  highlightEllipses: Float32Array;
  shadowEllipses: Float32Array;
  activeSampleCount: number;
  layerOpacity: number;
  geometryPopulated: boolean;
  fieldHash: string;
};

export const RELIEF_MAX_SAMPLES = 1000;
export const RELIEF_DEFAULT_WIDTH = 25;
export const RELIEF_DEFAULT_HEIGHT = 40;
