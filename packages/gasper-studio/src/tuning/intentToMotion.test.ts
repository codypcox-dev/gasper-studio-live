import { describe, expect, it } from "vitest";

import { compileMotionIntent } from "./intentToMotion";

describe("compileMotionIntent — causal path is the success path for walk/approach/settle", () => {
  it("approach / walk toward / settle compile to physics goals, not N120 sliders", () => {
    const approach = compileMotionIntent("approach the mark");
    expect(approach.ok).toBe(true);
    if (!approach.ok) return;
    expect(approach.plan.path).toBe("causal-affect");
    expect(approach.plan.schema).toBe("gasper.causal-intent-plan.v1");
    expect(approach.plan.parameters).toEqual({});
    expect(approach.plan.physicsGoals?.locomotion.cruise).toBeGreaterThan(0);
    expect(approach.plan.physicsGoals?.locomotion.cruise ?? 0).toBeLessThan(2000);
    expect(approach.plan.motionScore?.schema).toBe("gasper.causal-motion-score.v1");
    expect(approach.plan.capabilityGate?.ok).toBe(true);

    const walk = compileMotionIntent("walk toward");
    expect(walk.ok).toBe(true);
    if (!walk.ok) return;
    expect(walk.plan.path).toBe("causal-affect");
    expect(walk.plan.parameters).toEqual({});
    expect(Object.keys(walk.plan.parameters)).not.toContain("walkAmp");

    const settle = compileMotionIntent("settle");
    expect(settle.ok).toBe(true);
    if (!settle.ok) return;
    expect(settle.plan.path).toBe("causal-affect");
    expect(settle.plan.physicsGoals?.locomotion.cruise).toBe(0);
    expect(settle.plan.physicsGoals?.gather).toBeGreaterThan(0);
  });

  it("named N120 recipes stay labeled n120-legacy and are not the walk/approach/settle path", () => {
    const height = compileMotionIntent("reduce his vertical squeeze by 15%");
    expect(height.ok).toBe(true);
    if (!height.ok) return;
    expect(height.plan.path).toBe("n120-legacy");
    expect(height.plan.schema).toBe("gasper.motion.intent-plan.v1");
    expect(height.plan.parameters.verticalDepthGain).toBe(0.85);
    expect(height.plan.constraints).toContain("n120-legacy");

    const crip = compileMotionIntent("make Wispwalker do the crip walk");
    expect(crip.ok).toBe(true);
    if (!crip.ok) return;
    expect(crip.plan.path).toBe("n120-legacy");
    expect(crip.plan.parameters.footRootGain).toBe(1.75);

    const heavy = compileMotionIntent("make him feel heavy");
    expect(heavy.ok).toBe(true);
    if (!heavy.ok) return;
    expect(heavy.plan.path).toBe("n120-legacy");
  });

  it("unknown text and emotion names fail closed without inventing a preset", () => {
    const unknown = compileMotionIntent("do a cartwheel");
    expect(unknown.ok).toBe(false);
    if (unknown.ok) return;
    expect(unknown.error).toMatch(/no causal tendency/);

    const happy = compileMotionIntent("look happy");
    expect(happy.ok).toBe(false);
    if (happy.ok) return;
    expect(happy.error).toMatch(/emotion-label-forbidden/);
  });
});
