/**
 * GASPER-008 / GASPER-009 — 1000-Point Adaptive Relief & Fascia Topology Field.
 * Pure deterministic evaluator for regional surface pressure, micro-tension,
 * brow knit, cheek dimple, and goosebump relief sampling without raster fallback.
 *
 * Topology spec: 512 contour / 360 structural nodes / 672 triangles / 1000 relief samples.
 */

export const RELIEF_TOPOLOGY_SPEC = {
  contourCount: 512,
  structuralNodeCount: 360,
  triangleCount: 672,
  reliefSampleCount: 1000,
} as const;

export type ReliefRegionId =
  | "brow_knit"
  | "eye_trough"
  | "cheek_dimple"
  | "mouth_strain"
  | "chin_jitter"
  | "shell_goosebumps";

export type ReliefSamplePoint = {
  index: number;
  u: number;
  v: number;
  region: ReliefRegionId;
  baseZ: number;
  normalDx: number;
  normalDy: number;
};

export type ReliefFieldSnapshot = {
  schema: "gasper.relief-field.v1";
  timestampMs: number;
  sampleCount: 1000;
  reliefScale: number;
  maxStrain: number;
  meanDisplacement: number;
  activeRegions: ReliefRegionId[];
  fieldHash: string;
};

export type ReliefEvaluationInput = {
  timeMs: number;
  seed: number;
  reliefScale: number; // 0.0 .. 1.0 (Dais slider, default 0.42)
  valence: number;     // -1.0 .. 1.0
  arousal: number;     // 0.0 .. 1.0
  strain: number;      // 0.0 .. 1.0 (blocked/strain)
  expressionId: string;
};

/** Pre-allocated 1000-sample topology grid (deterministic distribution). */
const SAMPLES: ReliefSamplePoint[] = (() => {
  const points: ReliefSamplePoint[] = [];
  const count = RELIEF_TOPOLOGY_SPEC.reliefSampleCount;
  for (let i = 0; i < count; i++) {
    // Golden ratio spiral distribution over normalized unit disk
    const theta = i * 2.399963229728653; // Golden angle in radians
    const r = Math.sqrt((i + 0.5) / count);
    const u = r * Math.cos(theta);
    const v = r * Math.sin(theta);

    let region: ReliefRegionId = "shell_goosebumps";
    if (v < -0.2 && Math.abs(u) < 0.35) {
      region = "brow_knit";
    } else if (v >= -0.2 && v < 0.05 && Math.abs(u) >= 0.25 && Math.abs(u) < 0.5) {
      region = "eye_trough";
    } else if (v >= 0.0 && v < 0.35 && Math.abs(u) >= 0.3 && Math.abs(u) < 0.6) {
      region = "cheek_dimple";
    } else if (v >= 0.15 && v < 0.45 && Math.abs(u) < 0.35) {
      region = "mouth_strain";
    } else if (v >= 0.45 && Math.abs(u) < 0.3) {
      region = "chin_jitter";
    }

    const dist = Math.sqrt(u * u + v * v);
    const baseZ = Math.max(0, 1 - dist * dist);
    const normalDx = dist > 1e-6 ? u / dist : 0;
    const normalDy = dist > 1e-6 ? v / dist : 0;

    points.push({
      index: i,
      u: Math.round(u * 1e6) / 1e6,
      v: Math.round(v * 1e6) / 1e6,
      region,
      baseZ: Math.round(baseZ * 1e6) / 1e6,
      normalDx: Math.round(normalDx * 1e6) / 1e6,
      normalDy: Math.round(normalDy * 1e6) / 1e6,
    });
  }
  return points;
})();

function simpleHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export class AdaptiveReliefInstrument {
  private samples = SAMPLES;

  /** Get total topology sample count (1000). */
  public get sampleCount(): number {
    return RELIEF_TOPOLOGY_SPEC.reliefSampleCount;
  }

  /** Read pre-allocated topology sample definition. */
  public getSample(index: number): ReliefSamplePoint | null {
    return this.samples[index] ?? null;
  }

  /**
   * Evaluate dynamic surface pressure & displacement for frame.
   * Returns per-sample z-displacement array of length 1000.
   */
  public evaluateDisplacements(input: ReliefEvaluationInput): Float64Array {
    const out = new Float64Array(1000);
    const scale = Math.max(0, Math.min(1, input.reliefScale));
    if (scale <= 1e-6) return out;

    const t = input.timeMs / 1000;
    const arousal = Math.max(0, Math.min(1, input.arousal));
    const strain = Math.max(0, Math.min(1, input.strain));
    const valence = Math.max(-1, Math.min(1, input.valence));
    const isBlocked = input.expressionId.includes("blocked");
    const isPleased = input.expressionId.includes("pleased");

    for (let i = 0; i < 1000; i++) {
      const pt = this.samples[i]!;
      let regionIntensity = 0;

      switch (pt.region) {
        case "brow_knit": {
          const negValence = Math.max(0, -valence);
          regionIntensity = (strain * 0.4 + negValence * 0.3) * (0.8 + 0.2 * Math.sin(t * 2 + pt.u));
          break;
        }
        case "eye_trough":
          regionIntensity = strain * 0.25 + arousal * 0.15;
          break;
        case "cheek_dimple":
          regionIntensity = isPleased ? 0.35 * Math.max(0, valence) : 0.05 * arousal;
          break;
        case "mouth_strain": {
          const negValence = Math.max(0, -valence);
          regionIntensity = isBlocked ? 0.45 * strain : 0.1 * negValence;
          break;
        }
        case "chin_jitter":
          regionIntensity = strain > 0.6 ? 0.25 * Math.sin(t * 12 + pt.index) : 0;
          break;
        case "shell_goosebumps":
          // Micro-texture ripples (goosebumps)
          regionIntensity = arousal * 0.08 * Math.sin(pt.u * 20 + pt.v * 20 + t * 3);
          break;
      }

      const disp = regionIntensity * scale * pt.baseZ;
      out[i] = Math.round(disp * 1e6) / 1e6;
    }

    return out;
  }

  /** Evaluate deterministic snapshot of the 1000-point relief field. */
  public evaluateSnapshot(input: ReliefEvaluationInput): ReliefFieldSnapshot {
    const disps = this.evaluateDisplacements(input);
    let maxStrain = 0;
    let sum = 0;
    const activeSet = new Set<ReliefRegionId>();

    for (let i = 0; i < 1000; i++) {
      const d = Math.abs(disps[i]!);
      sum += d;
      if (d > maxStrain) maxStrain = d;
      if (d > 0.02) {
        activeSet.add(this.samples[i]!.region);
      }
    }

    const meanDisplacement = Math.round((sum / 1000) * 1e6) / 1e6;
    const activeRegions = Array.from(activeSet).sort();

    const basis = `${input.timeMs}:${input.seed}:${input.reliefScale.toFixed(4)}:${maxStrain.toFixed(4)}:${meanDisplacement.toFixed(4)}:${activeRegions.join(",")}`;
    const fieldHash = simpleHash(basis);

    return {
      schema: "gasper.relief-field.v1",
      timestampMs: input.timeMs,
      sampleCount: 1000,
      reliefScale: input.reliefScale,
      maxStrain: Math.round(maxStrain * 1e6) / 1e6,
      meanDisplacement,
      activeRegions,
      fieldHash,
    };
  }
}
