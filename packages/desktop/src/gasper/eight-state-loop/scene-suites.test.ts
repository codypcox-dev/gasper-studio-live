/**
 * GASPER-SCENE-001 — embodiment scene suite proofs.
 *
 * Proves: suite coverage and duration floors, in/during/out arc presence,
 * deterministic sampling, bounded deltas, reduced-motion collapse, and the
 * owner-directed dormant → singularity rest reroute.
 */
import { describe, expect, it } from "vitest";
import {
  applySceneSuiteToChannels,
  evaluateSceneSuite,
  FACE_BEARING_SUITE_EMBODIMENTS,
  getSceneSuiteForEmbodiment,
  listSceneSuites,
  sampleSceneCurve,
  sceneSilhouetteAdmission,
  sceneSuiteChannelAudit,
  sceneSuiteContinuityGate,
  sceneSuiteEyesOpenGate,
  shouldKeySceneEntrance,
  SUITE_CHANNEL_BOUNDS,
  SUITE_FORBIDDEN_CHANNELS,
} from "./scene-suites";
import { getVisualStateEndpoint } from "../GasperExpressionProjector";
import { computeCycleSeconds, SCENE_LOOP_MANIFEST } from "./loop-manifest";

describe("GASPER-SCENE-001 embodiment scene suites", () => {
  it("authors long-form suites: presence and singularity run >= 20s", () => {
    expect(getSceneSuiteForEmbodiment("presence").loopSeconds).toBeGreaterThanOrEqual(20);
    expect(getSceneSuiteForEmbodiment("singularity").loopSeconds).toBeGreaterThanOrEqual(20);
    expect(getSceneSuiteForEmbodiment("comet").loopSeconds).toBeGreaterThanOrEqual(12);
    expect(getSceneSuiteForEmbodiment("low-orbit").loopSeconds).toBeGreaterThanOrEqual(12);
  });

  it("every suite plays a full in → during → out arc with contiguous coverage", () => {
    for (const suite of listSceneSuites()) {
      const intents = new Set(suite.movements.map((m) => m.intent));
      expect(intents.has("in"), suite.id).toBe(true);
      expect(intents.has("during"), suite.id).toBe(true);
      expect(intents.has("out"), suite.id).toBe(true);
      // Contiguous, ordered coverage of the loop.
      let cursor = 0;
      for (const m of suite.movements) {
        expect(m.startSeconds, `${suite.id}:${m.id}`).toBeCloseTo(cursor, 6);
        expect(m.durationSeconds).toBeGreaterThan(0);
        cursor += m.durationSeconds;
      }
      expect(cursor, suite.id).toBeCloseTo(suite.loopSeconds, 6);
    }
  });

  it("sampling is deterministic and loops", () => {
    const suite = getSceneSuiteForEmbodiment("singularity");
    const a = evaluateSceneSuite(suite, 12.34);
    const b = evaluateSceneSuite(suite, 12.34);
    expect(a).toEqual(b);
    const wrapped = evaluateSceneSuite(suite, 12.34 + suite.loopSeconds);
    expect(wrapped.movementId).toBe(a.movementId);
    expect(wrapped.deltas).toEqual(a.deltas);
  });

  it("deltas are bounded per-channel at every point of every suite (SCENE-002 budget law)", () => {
    for (const suite of listSceneSuites()) {
      for (let t = 0; t < suite.loopSeconds; t += 0.1) {
        const s = evaluateSceneSuite(suite, t);
        for (const [key, delta] of Object.entries(s.deltas)) {
          expect(Number.isFinite(delta), `${suite.id}:${key}@${t}`).toBe(true);
          const bound = SUITE_CHANNEL_BOUNDS[key];
          expect(bound, `${suite.id}:${key} has no declared bound`).toBeTypeOf("number");
          expect(Math.abs(delta), `${suite.id}:${key}@${t}=${delta}`).toBeLessThanOrEqual(bound!);
        }
      }
    }
  });

  it("SCENE-002 channel audit: no forbidden or unbounded channels", () => {
    for (const suite of listSceneSuites()) {
      expect(sceneSuiteChannelAudit(suite), suite.id).toEqual([]);
    }
    // D-0088: the silhouette channels left the forbidden set (scene-scoped
    // admission); only the controller-clobbered `motion` channel remains.
    expect([...SUITE_FORBIDDEN_CHANNELS].sort()).toEqual(["motion"]);
  });

  it("D-0088 scene-scoped silhouette admission: provenance-tagged, bounded, empty when idle", () => {
    // No silhouette deltas → empty admission (the fence stays closed).
    expect(sceneSilhouetteAdmission({ overall_height: 1 }, { internal_glow: 0.2 })).toEqual({});
    // Tiny deltas below the 1e-4 floor → empty.
    expect(
      sceneSilhouetteAdmission({ overall_height: 1 }, { overall_height: 1e-5 }),
    ).toEqual({});
    // Missing base value → channel skipped (no fabrication).
    expect(sceneSilhouetteAdmission({}, { overall_height: 0.05 })).toEqual({});
    // Authored delta → absolute base + delta.
    expect(
      sceneSilhouetteAdmission(
        { overall_height: 1, overall_width: 1, ground_flattening: 0.1 },
        { overall_height: -0.07, overall_width: 0.05, ground_flattening: 0.24 },
      ),
    ).toEqual({
      overall_height: expect.closeTo(0.93, 9),
      overall_width: expect.closeTo(1.05, 9),
      ground_flattening: expect.closeTo(0.34, 9),
    });
    // Defense-in-depth: deltas are re-clamped to SUITE_CHANNEL_BOUNDS at the
    // fence boundary even if authoring exceeded them.
    expect(
      sceneSilhouetteAdmission({ overall_height: 1 }, { overall_height: -0.5 }),
    ).toEqual({ overall_height: expect.closeTo(1 - (SUITE_CHANNEL_BOUNDS.overall_height ?? 0), 9) });
  });

  it("D-0088 singularity rev4 authors squash & stretch within budget", () => {
    const suite = getSceneSuiteForEmbodiment("singularity");
    const fall = suite.movements.find((m) => m.id === "fall");
    const flare = suite.movements.find((m) => m.id === "lensing-flare");
    expect(fall?.channels.overall_height, "fall squash beat").toBeDefined();
    expect(fall?.channels.ground_flattening, "fall contact beat").toBeDefined();
    expect(flare?.channels.overall_height, "flare stretch beat").toBeDefined();
    // The squash dips negative and the stretch crests positive (the Pixar beat).
    const fallMin = Math.min(...(fall?.channels.overall_height ?? []).map(([, v]) => v));
    const flareMax = Math.max(...(flare?.channels.overall_height ?? []).map(([, v]) => v));
    expect(fallMin).toBeLessThan(-0.05);
    expect(flareMax).toBeGreaterThan(0.03);
  });

  it("SCENE-002 continuity law: no pops at movement boundaries, loops end at zero", () => {
    for (const suite of listSceneSuites()) {
      expect(sceneSuiteContinuityGate(suite), suite.id).toEqual([]);
    }
  });

  it("SCENE-002 eyes-open hard gate passes for face-bearing suites", () => {
    for (const emb of FACE_BEARING_SUITE_EMBODIMENTS) {
      const suite = getSceneSuiteForEmbodiment(emb);
      expect(sceneSuiteEyesOpenGate(suite), suite.id).toEqual([]);
    }
    // The gate rejects a suite that never opens the eyes.
    const closedSuite = {
      id: "suite-test-closed",
      embodimentId: "presence",
      loopSeconds: 12,
      movements: [
        {
          id: "m1",
          intent: "in" as const,
          startSeconds: 0,
          durationSeconds: 6,
          channels: { eye_openness: [[0, 0.01], [1, 0.02]] as const },
        },
        {
          id: "m2",
          intent: "out" as const,
          startSeconds: 6,
          durationSeconds: 6,
          channels: { eye_openness: [[0, 0.02], [1, 0]] as const },
        },
      ],
    };
    expect(sceneSuiteEyesOpenGate(closedSuite).map((i) => i.rule)).toContain("no-open-eye-beat");
    // ...and rejects suite-driven eye closing.
    const slammingSuite = {
      ...closedSuite,
      movements: [
        { ...closedSuite.movements[0]!, channels: { eye_openness: [[0, -0.1], [1, 0.12]] as const } },
        closedSuite.movements[1]!,
      ],
    };
    expect(sceneSuiteEyesOpenGate(slammingSuite).map((i) => i.rule)).toContain("eyes-driven-closed");
  });

  it("SCENE-002 entrance keying: re-anchor only inside the final out movement", () => {
    const suite = getSceneSuiteForEmbodiment("presence");
    const outStart = suite.movements[suite.movements.length - 1]!.startSeconds;
    expect(shouldKeySceneEntrance(suite, 0)).toBe(false);
    expect(shouldKeySceneEntrance(suite, outStart - 0.5)).toBe(false);
    expect(shouldKeySceneEntrance(suite, outStart)).toBe(true);
    expect(shouldKeySceneEntrance(suite, suite.loopSeconds - 0.1)).toBe(true);
    // Wraps with the loop.
    expect(shouldKeySceneEntrance(suite, suite.loopSeconds + outStart + 0.2)).toBe(true);
  });

  it("curve sampling interpolates smoothly and hits endpoints", () => {
    expect(sampleSceneCurve([[0, 0], [1, 0.2]], 0)).toBe(0);
    expect(sampleSceneCurve([[0, 0], [1, 0.2]], 1)).toBeCloseTo(0.2, 9);
    const mid = sampleSceneCurve([[0, 0], [1, 0.2]], 0.5);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(0.2);
  });

  it("reduced motion collapses all deltas to zero", () => {
    const suite = getSceneSuiteForEmbodiment("comet");
    for (let t = 0; t < suite.loopSeconds; t += 0.37) {
      const s = evaluateSceneSuite(suite, t, { reducedMotion: true });
      for (const delta of Object.values(s.deltas)) {
        expect(delta).toBe(0);
      }
    }
  });

  it("applies deltas additively with clamping", () => {
    const out = applySceneSuiteToChannels({ energy_level: 0.5 }, {
      suiteId: "t",
      movementId: "m",
      intent: "during",
      loopT: 0,
      movementT: 0,
      deltas: { energy_level: 0.2, gaze: -0.4 },
    });
    expect(out.energy_level).toBeCloseTo(0.7, 9);
    expect(out.gaze).toBeCloseTo(-0.4, 9);
    const clamped = applySceneSuiteToChannels({ energy_level: 0.5 }, {
      suiteId: "t",
      movementId: "m",
      intent: "during",
      loopT: 0,
      movementT: 0,
      deltas: { energy_level: 5 },
    });
    expect(clamped.energy_level).toBeLessThanOrEqual(1.6);
  });

  it("SCENE-002 fold: bipolar levers go negative, px translations keep headroom", () => {
    const out = applySceneSuiteToChannels({ crown_height: 0.06 }, {
      suiteId: "t",
      movementId: "m",
      intent: "in",
      loopT: 0,
      movementT: 0,
      deltas: { crown_height: -0.1, posture_x: -2.6, posture_y: 3.8 },
    });
    expect(out.crown_height).toBeCloseTo(-0.04, 9); // bipolar 0-centered lever (fixtures run crown -0.12..0.9)
    expect(out.posture_x).toBeCloseTo(-2.6, 9);
    expect(out.posture_y).toBeCloseTo(3.8, 9);
  });

  it("owner directive 2026-08-03: rest collapses into singularity, not dormant", () => {
    const rest = getVisualStateEndpoint("dormant-orbit-maintain");
    expect(rest?.embodimentId).toBe("singularity");
  });

  it("scene manifest stretches holds for full suite performances", () => {
    const holds = Object.fromEntries(
      SCENE_LOOP_MANIFEST.steps.map((s) => [s.to, s.holdSeconds]),
    );
    expect(holds["presence-neutral-settled"]).toBeGreaterThanOrEqual(20);
    expect(holds["dormant-orbit-maintain"]).toBeGreaterThanOrEqual(24);
    expect(holds["comet-executing-drive"]).toBeGreaterThanOrEqual(16);
    const cycle = computeCycleSeconds(SCENE_LOOP_MANIFEST);
    expect(cycle).toBeGreaterThanOrEqual(90);
    expect(cycle).toBeLessThanOrEqual(120);
  });
});
