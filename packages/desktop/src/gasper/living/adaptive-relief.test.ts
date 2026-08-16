/**
 * GASPER-008 / GASPER-009 — 1000-Point Adaptive Relief Topology Field Test.
 * Proves topology specs, region strain, determinism, and neutral quiet.
 */

import { describe, expect, it } from "vitest";
import {
  AdaptiveReliefInstrument,
  RELIEF_TOPOLOGY_SPEC,
  type ReliefEvaluationInput,
} from "./AdaptiveReliefInstrument";

describe("GASPER-008/009 — 1000-Point Adaptive Relief Topology Field", () => {
  it("enforces exact topology lock: 1000 relief sample points", () => {
    const instrument = new AdaptiveReliefInstrument();
    expect(instrument.sampleCount).toBe(1000);
    expect(RELIEF_TOPOLOGY_SPEC.reliefSampleCount).toBe(1000);
    expect(RELIEF_TOPOLOGY_SPEC.contourCount).toBe(512);
    expect(RELIEF_TOPOLOGY_SPEC.structuralNodeCount).toBe(360);
    expect(RELIEF_TOPOLOGY_SPEC.triangleCount).toBe(672);

    for (let i = 0; i < 1000; i++) {
      const sample = instrument.getSample(i);
      expect(sample).not.toBeNull();
      expect(sample?.index).toBe(i);
      expect(Number.isFinite(sample?.u)).toBe(true);
      expect(Number.isFinite(sample?.v)).toBe(true);
      expect(sample?.baseZ).toBeGreaterThanOrEqual(0);
    }
  });

  it("proves neutral quiet: zero displacement at neutral baseline", () => {
    const instrument = new AdaptiveReliefInstrument();
    const neutralInput: ReliefEvaluationInput = {
      timeMs: 1000,
      seed: 1007,
      reliefScale: 0.42,
      valence: 0.0,
      arousal: 0.0,
      strain: 0.0,
      expressionId: "presence-neutral-settled",
    };

    const disps = instrument.evaluateDisplacements(neutralInput);
    let totalDisp = 0;
    for (let i = 0; i < 1000; i++) {
      totalDisp += Math.abs(disps[i]!);
    }
    expect(totalDisp).toBeLessThanOrEqual(1e-6);

    const snapshot = instrument.evaluateSnapshot(neutralInput);
    expect(snapshot.maxStrain).toBe(0);
    expect(snapshot.meanDisplacement).toBe(0);
    expect(snapshot.activeRegions).toEqual([]);
  });

  it("evaluates regional pressure continuously under strain and emotion", () => {
    const instrument = new AdaptiveReliefInstrument();
    const strainInput: ReliefEvaluationInput = {
      timeMs: 1000,
      seed: 1007,
      reliefScale: 0.42,
      valence: -0.5,
      arousal: 0.8,
      strain: 0.7,
      expressionId: "presence-blocked-strain",
    };

    const disps = instrument.evaluateDisplacements(strainInput);
    expect(disps.length).toBe(1000);

    const snapshot = instrument.evaluateSnapshot(strainInput);
    expect(snapshot.maxStrain).toBeGreaterThan(0);
    expect(snapshot.meanDisplacement).toBeGreaterThan(0);
    expect(snapshot.activeRegions.length).toBeGreaterThan(0);
    expect(snapshot.activeRegions).toContain("brow_knit");
  });

  it("proves deterministic replay: identical inputs yield identical field hashes", () => {
    const instrument = new AdaptiveReliefInstrument();
    const input: ReliefEvaluationInput = {
      timeMs: 2500,
      seed: 42,
      reliefScale: 0.5,
      valence: 0.6,
      arousal: 0.4,
      strain: 0.2,
      expressionId: "presence-pleased-resolve",
    };

    const snap1 = instrument.evaluateSnapshot(input);
    const snap2 = instrument.evaluateSnapshot(input);
    expect(snap1.fieldHash).toBe(snap2.fieldHash);
    expect(snap1.maxStrain).toBe(snap2.maxStrain);
    expect(snap1.meanDisplacement).toBe(snap2.meanDisplacement);
  });
});
