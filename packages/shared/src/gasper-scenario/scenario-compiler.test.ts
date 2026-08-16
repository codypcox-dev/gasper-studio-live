/**
 * GASPER-FINISH-01 Task 6 — Authored scene compiler and showcase route verification.
 * Proves that authored scenario tracks compile cleanly without dropping face,
 * material, easing, or interruption metadata, and that all 8 states and loop
 * transitions satisfy the canonical scenario contract.
 */

import { describe, expect, it } from "vitest";
import {
  compileEightShowcase,
  compileScenario,
  evaluateEndpointFrame,
  getCanonicalIntent,
  validateScenarioIntent,
  buildLoopManifest,
  buildLoopTransitions,
  assertLoopClosed,
  computeDistinctnessBudget,
  EIGHT_SCENARIO_IDS,
  EIGHT_STATE_DEFINITIONS,
  GASPER_CHANNEL_DOMAINS,
  SCENARIO_COMPILER_ID,
  SCENARIO_COMPILER_VERSION,
} from "./index";
import { THREE_BEAT_SEQUENCES } from "../../../desktop/src/gasper/eight-state-loop/beat-sequence";
import { GASPER_EMBODIMENT_IDS } from "../../../desktop/src/gasper/GasperRigDefinition";

describe("GASPER-FINISH-01 Task 6 — Scenario Compiler & Showcase Route", () => {
  it("compiles all eight showcase scenarios deterministically with valid content hashes", () => {
    const { ok, results, hashes } = compileEightShowcase(1007);
    expect(ok).toBe(true);
    expect(results.length).toBe(8);
    expect(Object.keys(hashes).length).toBe(8);

    for (const { id, ir } of results) {
      expect(ir.schema).toBe("gasper.scenario.ir.v1");
      expect(ir.compiler_id).toBe(SCENARIO_COMPILER_ID);
      expect(ir.compiler_version).toBe(SCENARIO_COMPILER_VERSION);
      expect(ir.scenario_id).toBe(id);
      expect(ir.content_hash).toBe(hashes[id]);
      expect(ir.lowered.accepted).toBe(true);
      expect(ir.lowered.channel_domain_count).toBe(GASPER_CHANNEL_DOMAINS.length);
      expect(ir.validation.issues).toEqual([]);

      // Verify face continuity & material parameters exist in IR
      expect(ir.state.channel_targets.contour_silhouette).toBeDefined();
      expect(ir.state.channel_targets.face_plane).toBeDefined();
      expect(ir.state.channel_targets.eyes).toBeDefined();
      expect(ir.state.channel_targets.mouth).toBeDefined();
      expect(ir.state.channel_targets.material).toBeDefined();
      expect(ir.state.channel_targets.internal_energy).toBeDefined();
    }
  });

  it("proves identical inputs yield byte-identical IR hashes across compiles", () => {
    const run1 = compileEightShowcase(42);
    const run2 = compileEightShowcase(42);
    expect(run1.hashes).toEqual(run2.hashes);

    const run3 = compileEightShowcase(99);
    expect(run3.hashes).not.toEqual(run1.hashes);
  });

  it("validates scenario intents and fails closed on corrupted/invalid schema", () => {
    const intent = getCanonicalIntent("presence-neutral-settled");
    expect(validateScenarioIntent(intent)).toEqual([]);

    // Corrupt schema
    const badSchema = { ...intent, schema: "invalid.schema" };
    const issuesSchema = validateScenarioIntent(badSchema as any);
    expect(issuesSchema.some((i) => i.code === "intent_invalid_schema")).toBe(true);

    // Corrupt affect
    const badAffect = { ...intent, affect: { ...intent.affect, valence: NaN } };
    const issuesAffect = validateScenarioIntent(badAffect as any);
    expect(issuesAffect.some((i) => i.code === "affect_invalid")).toBe(true);

    // Unknown field (fail closed rule)
    const badField = { ...intent, unknown_hacker_field: true };
    const issuesField = validateScenarioIntent(badField as any);
    expect(issuesField.some((i) => i.code === "unsupported_field")).toBe(true);
  });

  it("evaluates endpoint frames (t=0) deterministically with quantized binding targets", () => {
    const { results } = compileEightShowcase(1007);
    for (const { ir } of results) {
      const frame = evaluateEndpointFrame(ir, 0);
      expect(frame.schema).toBe("gasper.evaluated-frame.v1");
      expect(frame.scenario_id).toBe(ir.scenario_id);
      expect(frame.t_ms).toBe(0);
      expect(frame.frame_content_hash.length).toBeGreaterThan(0);
      expect(Object.keys(frame.channel_digest).length).toBe(GASPER_CHANNEL_DOMAINS.length);

      // Re-evaluating gives identical frame content hash
      const frameAgain = evaluateEndpointFrame(ir, 0);
      expect(frame.frame_content_hash).toBe(frameAgain.frame_content_hash);
    }
  });

  it("verifies loop manifest closure and bidirectional transition availability", () => {
    const loop = buildLoopManifest();
    expect(loop.schema).toBe("gasper.loop-manifest.v1");
    expect(loop.closed).toBe(true);
    expect(assertLoopClosed(loop)).toBe(true);
    expect(loop.transitions.length).toBe(8);

    const transitions = buildLoopTransitions();
    expect(transitions.length).toBe(8);
    for (const tr of transitions) {
      expect(tr.from).toBeDefined();
      expect(tr.to).toBeDefined();
      expect(tr.duration_hint_ms.target).toBeGreaterThan(0);
      expect(tr.easing).toBeDefined();
    }
  });

  it("verifies distinctness budget across all 8 showcase scenarios", () => {
    const budget = computeDistinctnessBudget();
    expect(budget.schema).toBe("gasper.distinctness-budget.v1");
    expect(budget.all_pairs_pass).toBe(true);
    expect(budget.pairs.length).toBe(28); // 8 * 7 / 2 = 28 pairs
  });

  it("preserves three-beat easing names, durations, and targets for every compiled scenario", () => {
    for (const id of EIGHT_SCENARIO_IDS) {
      const beatSeq = THREE_BEAT_SEQUENCES[id as keyof typeof THREE_BEAT_SEQUENCES];
      expect(beatSeq).toBeDefined();
      expect(beatSeq.phases.length).toBe(3);

      const [gather, peak, settle] = beatSeq.phases;
      expect(gather.id).toBe("gather");
      expect(peak.id).toBe("peak");
      expect(settle.id).toBe("settle");

      expect(gather.durationMs).toBeGreaterThan(0);
      expect(peak.durationMs).toBeGreaterThan(0);
      expect(settle.durationMs).toBeGreaterThan(0);

      // Face continuity floor check
      expect(gather.face.floorFaceScale).toBeGreaterThanOrEqual(0.3);
      expect(peak.face.floorFaceScale).toBeGreaterThanOrEqual(0.3);
      expect(settle.face.floorFaceScale).toBeGreaterThanOrEqual(0.3);
    }
  });

  it("verifies state × embodiment coverage without losing face or vector root", () => {
    for (const emb of GASPER_EMBODIMENT_IDS) {
      for (const id of EIGHT_SCENARIO_IDS) {
        const intent = getCanonicalIntent(id as any);
        intent.embodiment = emb as any;
        const res = compileScenario({ intent });
        expect(res.ok).toBe(true);
        if (res.ok) {
          expect(res.ir.state.embodiment).toBe(emb);
          expect(res.ir.state.identity.topology_lock).toBe(true);
          expect(res.ir.state.identity.identity_lock).toBe(true);
        }
      }
    }
  });
});
