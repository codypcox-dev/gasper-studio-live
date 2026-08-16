import { describe, it, expect } from "vitest";
import {
  compilePerformance,
  dualCompileIdentical,
  legalRoute,
  contractPin,
  type PerformanceIntent,
} from "./index.js";

const goldenIntent = (): PerformanceIntent => ({
  schema: "gasper.performance.intent.v1",
  id: "significant-message",
  title: "Significant message golden",
  seed: 42,
  character: "gasper",
  identity_lock: true,
  phases: [
    {
      id: "notice",
      intent_tags: ["notice", "orient"],
      duration_hint_ms: { min: 400, target: 700, max: 1200 },
      affect_target: {
        valence: 0.15,
        arousal: 0.35,
        expression_gain: 0.4,
        attention: 0.55,
        certainty: 0.3,
      },
      embodiment_preference: "presence",
      interrupt_class: "soft",
    },
    {
      id: "narrow_attention",
      intent_tags: ["narrow_attention"],
      duration_hint_ms: { min: 300, target: 500, max: 900 },
      affect_target: {
        valence: 0.1,
        arousal: 0.4,
        expression_gain: 0.45,
        attention: 0.7,
        certainty: 0.35,
      },
      embodiment_preference: "presence",
    },
    {
      id: "thinking_knit",
      intent_tags: ["think", "knit"],
      duration_hint_ms: { min: 800, target: 1400, max: 2200 },
      affect_target: {
        valence: -0.05,
        arousal: 0.55,
        expression_gain: 0.5,
        attention: 0.8,
        certainty: 0.35,
      },
      embodiment_preference: "presence",
      expression_anchor: "thinking-knit",
    },
    {
      id: "realization",
      intent_tags: ["realize", "spark"],
      duration_hint_ms: { min: 400, target: 600, max: 1000 },
      affect_target: {
        valence: 0.25,
        arousal: 0.6,
        expression_gain: 0.55,
        attention: 0.75,
        certainty: 0.7,
      },
      embodiment_preference: "presence",
    },
    {
      id: "singularity_enter",
      intent_tags: ["compress"],
      duration_hint_ms: { min: 600, target: 1000, max: 1600 },
      affect_target: {
        valence: 0.1,
        arousal: 0.65,
        expression_gain: 0.5,
        attention: 0.7,
        certainty: 0.75,
      },
      embodiment_preference: "singularity",
      interrupt_class: "morph_safe",
    },
    {
      id: "excitement",
      intent_tags: ["excite"],
      duration_hint_ms: { min: 400, target: 700, max: 1100 },
      affect_target: {
        valence: 0.45,
        arousal: 0.8,
        expression_gain: 0.65,
        attention: 0.6,
        certainty: 0.7,
      },
      embodiment_preference: "singularity",
    },
    {
      id: "comet_enter",
      intent_tags: ["launch", "travel"],
      duration_hint_ms: { min: 700, target: 1200, max: 2000 },
      affect_target: {
        valence: 0.5,
        arousal: 0.85,
        expression_gain: 0.7,
        attention: 0.55,
        certainty: 0.65,
      },
      embodiment_preference: "comet",
      interrupt_class: "morph_safe",
    },
    {
      id: "settle",
      intent_tags: ["settle"],
      duration_hint_ms: { min: 500, target: 900, max: 1400 },
      affect_target: {
        valence: 0.2,
        arousal: 0.35,
        expression_gain: 0.4,
        attention: 0.4,
        certainty: 0.55,
      },
      embodiment_preference: "presence",
    },
    {
      id: "presence_settled",
      intent_tags: ["hold", "return"],
      duration_hint_ms: { min: 400, target: 800, max: 1200 },
      affect_target: {
        valence: 0.3,
        arousal: 0.3,
        expression_gain: 0.35,
        attention: 0.35,
        certainty: 0.55,
      },
      embodiment_preference: "presence",
      expression_anchor: "neutral-settled",
    },
  ],
  global_constraints: {
    topology_lock: true,
    legacy_authority_required: true,
    no_arbitrary_gsap: true,
  },
});

describe("gasper-006 behavioral compiler (provisional)", () => {
  it("pins contract hashes", () => {
    const pin = contractPin();
    expect(pin.affect_anchors_hash).toBeTruthy();
    expect(pin.projection_grammar_hash).toBeTruthy();
    expect(pin.compiler_version).toContain("synthetic-provisional");
  });

  it("rejects unknown intent tags", () => {
    const intent = goldenIntent();
    const phase0 = intent.phases[0];
    if (!phase0) throw new Error("missing phase");
    phase0.intent_tags = ["not_a_real_tag"];
    const r = compilePerformance(intent);
    expect(r.ok).toBe(false);
  });

  it("requires seed", () => {
    const intent = goldenIntent();
    // @ts-expect-error intentional
    delete intent.seed;
    const r = compilePerformance(intent as PerformanceIntent);
    expect(r.ok).toBe(false);
  });

  it("O02 mediates singularity to comet via presence", () => {
    const r = legalRoute("singularity", "comet");
    expect(r.hops).toEqual(["singularity", "presence", "comet-right"]);
  });

  it("dual compile identical hash", () => {
    expect(dualCompileIdentical(goldenIntent())).toBe(true);
  });

  it("compiles golden significant-message phase order", () => {
    const r = compilePerformance(goldenIntent());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ir.routes.length).toBe(9);
    const cometRoute = r.ir.routes.find((x: { phase_id?: string }) => x.phase_id === "comet_enter") as {
      hops?: string[];
    };
    expect(cometRoute.hops).toContain("presence");
    expect(r.ir_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
