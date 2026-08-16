import { describe, expect, it } from "vitest";

import { GAIT_LAW } from "../physics/GaitLaw";
import { PHI } from "../physics/PhiLaw";
import {
  affectLagTauSeconds,
  buildCausalState,
  compileCausalPhrase,
  compileIntent,
  compile_intent,
  emptyTendency,
  gatePhysicsGoals,
  goalsFromState,
  mergeTendency,
  motionScoreFromIntent,
  physicsGoalsFromSemanticIntent,
  semanticIntentFromTendency,
  serializeGoals,
  stepScalar,
  type ActionTendencyV2,
  type CoreAffectV2,
} from "./CausalAffectStack";

const AFFECT: CoreAffectV2 = {
  valence: 1 / PHI,
  arousal: 1 / PHI,
  expression_gain: 1 / PHI,
  source: "inherited",
};

function tendency(patch: Partial<ActionTendencyV2>): ActionTendencyV2 {
  return mergeTendency(emptyTendency(), patch);
}

describe("R4 causal affect stack — Book 004 chirality, never emotion names", () => {
  it("same appraisal+affect+tendency yields identical goal bytes", () => {
    const t = tendency({ approach: 1, persist: 1 / PHI });
    const a = buildCausalState(
      t,
      AFFECT,
      {
        novelty: 1 / PHI,
        goal_relevance: 1,
        goal_congruence: 1,
        certainty: 1 / PHI,
        urgency: 1 / PHI,
        temporal_stability: 1 / (PHI * PHI),
        basis_id: "appraisal.rules.v0_1",
      },
    );
    const b = buildCausalState(
      t,
      AFFECT,
      {
        novelty: 1 / PHI,
        goal_relevance: 1,
        goal_congruence: 1,
        certainty: 1 / PHI,
        urgency: 1 / PHI,
        temporal_stability: 1 / (PHI * PHI),
        basis_id: "appraisal.rules.v0_1",
      },
    );
    expect(serializeGoals(goalsFromState(a))).toBe(serializeGoals(goalsFromState(b)));
    expect(JSON.stringify(a.semanticIntent)).toBe(JSON.stringify(b.semanticIntent));
  });

  it("zeroing actionTendency.approach changes the cruise goal", () => {
    const withApproach = physicsGoalsFromSemanticIntent(
      semanticIntentFromTendency(tendency({ approach: 1, persist: 1 / PHI }), AFFECT),
      AFFECT,
    );
    const without = physicsGoalsFromSemanticIntent(
      semanticIntentFromTendency(tendency({ approach: 0, persist: 1 / PHI }), AFFECT),
      AFFECT,
    );
    expect(withApproach.locomotion.cruise).toBeGreaterThan(without.locomotion.cruise);
  });

  it("compiled state has no emotion-label field and no happy/sad/angry bytes", () => {
    const compiled = compileCausalPhrase("approach the mark");
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    const blob = JSON.stringify(compiled);
    expect(blob).not.toMatch(/happy|sad|angry|pleased|emotion/);
    expect(compiled.state).not.toHaveProperty("emotion");
    expect(compiled.state).not.toHaveProperty("label");
    expect(compiled.physicsGoals).not.toHaveProperty("fixture");
  });

  it("interrupt mid-step inherits value and velocity (no reset-through-neutral)", () => {
    const tau = affectLagTauSeconds();
    const dt = tau / PHI;
    let s = { value: 0, vel: 0 };
    s = stepScalar(s, 1, dt, tau);
    const mid = { ...s };
    expect(mid.value).toBeGreaterThan(0);
    expect(mid.value).toBeLessThan(1);
    expect(mid.vel).toBeGreaterThan(0);
    const continued = stepScalar(mid, 0.2, dt, tau);
    const reset = stepScalar({ value: 0, vel: 0 }, 0.2, dt, tau);
    expect(continued.value).not.toBeCloseTo(reset.value, 8);
    expect(continued.value).toBeGreaterThan(reset.value);
  });

  it("capability gate admits filed goals and rejects rest travel", () => {
    const compiled = compileCausalPhrase("walk toward");
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.capabilityGate.ok).toBe(true);
    expect(compiled.capabilityGate.admitted).toContain("locomotion-intent");
    const rest = gatePhysicsGoals(compiled.physicsGoals, compiled.motionScore, "singularity");
    expect(rest.ok).toBe(false);
    expect(rest.rejected).toContain("rest-embodiment-cannot-travel");
  });
});

describe("R4 phrase → physics goals (legal path)", () => {
  it("approach files forward cruise, anticipation gather, and a signed bank", () => {
    const compiled = compileCausalPhrase("approach the mark");
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.motionScore.schema).toBe("gasper.causal-motion-score.v1");
    expect(compiled.motionScore.primitive).toBe("travel");
    expect(compiled.physicsGoals.locomotion.x).toBe(GAIT_LAW.bodyHeightUnits);
    expect(compiled.physicsGoals.locomotion.cruise).toBeGreaterThan(0);
    expect(compiled.physicsGoals.locomotion.cruise).toBeLessThanOrEqual(GAIT_LAW.cruiseBaseUnitsPerSec);
    expect(compiled.physicsGoals.gather).toBeGreaterThan(0);
    expect(compiled.physicsGoals.bank).toBeGreaterThan(0);
    expect(compiled.state.semanticIntent.approach_withdraw).toBeGreaterThan(0);
  });

  it("withdraw lowers cruise, raises gather, and banks away", () => {
    const approach = compileCausalPhrase("approach");
    const withdraw = compileCausalPhrase("withdraw");
    expect(approach.ok && withdraw.ok).toBe(true);
    if (!approach.ok || !withdraw.ok) return;
    expect(withdraw.physicsGoals.locomotion.cruise).toBeLessThan(approach.physicsGoals.locomotion.cruise);
    expect(withdraw.physicsGoals.gather).toBeGreaterThan(approach.physicsGoals.gather);
    expect(withdraw.physicsGoals.bank).toBeLessThan(0);
    expect(withdraw.physicsGoals.locomotion.x).toBe(-GAIT_LAW.bodyHeightUnits);
    expect(withdraw.state.semanticIntent.approach_withdraw).toBeLessThan(0);
  });

  it("settle files zero cruise and a gather (hold, not a smile)", () => {
    const compiled = compileCausalPhrase("settle");
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.motionScore.primitive).toBe("settle");
    expect(compiled.physicsGoals.locomotion.cruise).toBe(0);
    expect(compiled.physicsGoals.locomotion.x).toBe(0);
    expect(compiled.physicsGoals.gather).toBeGreaterThan(0);
    expect(compiled.physicsGoals.bank).toBe(0);
  });

  it("walk toward is travel, not a Tuning Lab slider bag", () => {
    const compiled = compileCausalPhrase("walk toward");
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.physicsGoals.locomotion.cruise).toBeGreaterThan(0);
    expect(JSON.stringify(compiled)).not.toMatch(/verticalDepthGain|footRootGain|walkAmp/);
  });

  it("orient files attention strength without travel (R2 T1)", () => {
    const compiled = compileCausalPhrase("orient");
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.motionScore.primitive).toBe("orient");
    expect(compiled.physicsGoals.locomotion.cruise).toBe(0);
    expect(compiled.physicsGoals.attentionStrength).toBeGreaterThan(0);
  });

  it("unknown text and emotion names fail closed without inventing a preset", () => {
    expect(compileCausalPhrase("do a jig").ok).toBe(false);
    expect(compileCausalPhrase("happy").ok).toBe(false);
    expect(compileCausalPhrase("sad walk").ok).toBe(false);
    const happy = compileCausalPhrase("happy");
    expect(happy.ok).toBe(false);
    if (happy.ok) return;
    expect(happy.code).toBe("emotion-label-forbidden");
    const crip = compileCausalPhrase("make Wispwalker do the crip walk");
    expect(crip.ok).toBe(false);
    if (crip.ok) return;
    expect(crip.code).toBe("not-causal");
  });

  it("SemanticExpressionIntent exposes the nine signed axes only", () => {
    const compiled = compileCausalPhrase("approach");
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(Object.keys(compiled.state.semanticIntent)).toEqual([
      "approach_withdraw",
      "expand_contract",
      "orient_disengage",
      "assert_yield",
      "affiliate_guard",
      "stabilize_destabilize",
      "reveal_conceal",
      "accelerate_decelerate",
      "persist_release",
      "confidence",
      "policy_id",
    ]);
    expect(compiled.state.semanticIntent.confidence).toHaveLength(9);
  });
});

describe("R4 compile_intent — arousal/gain modulate cruise and gather", () => {
  it("compile_intent is compileCausalPhrase", () => {
    expect(compile_intent).toBe(compileCausalPhrase);
    expect(compileIntent).toBe(compileCausalPhrase);
  });

  it("approach + high arousal vs withdraw + low arousal: different cruise/gather/bank", () => {
    const go = compile_intent("approach with high arousal");
    const stay = compile_intent("withdraw with low arousal");
    expect(go.ok && stay.ok).toBe(true);
    if (!go.ok || !stay.ok) return;
    expect(go.physicsGoals.locomotion.cruise).toBeGreaterThan(stay.physicsGoals.locomotion.cruise);
    expect(stay.physicsGoals.gather).toBeGreaterThan(go.physicsGoals.gather);
    expect(go.physicsGoals.bank).toBeGreaterThan(0);
    expect(stay.physicsGoals.bank).toBeLessThan(0);
    expect(go.state.coreAffect.arousal).toBeGreaterThan(stay.state.coreAffect.arousal);
    expect(JSON.stringify(go)).not.toMatch(/happy|sad|angry/);
  });

  it("wants to go / rather not compile to opposite travel goals", () => {
    const go = compile_intent("he wants to go");
    const stay = compile_intent("he would rather not");
    expect(go.ok && stay.ok).toBe(true);
    if (!go.ok || !stay.ok) return;
    expect(go.physicsGoals.locomotion.cruise).toBeGreaterThan(stay.physicsGoals.locomotion.cruise);
    expect(go.state.semanticIntent.approach_withdraw).toBeGreaterThan(0);
    expect(stay.state.semanticIntent.approach_withdraw).toBeLessThan(0);
  });
});
