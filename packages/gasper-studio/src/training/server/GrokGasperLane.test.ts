import { describe, expect, it } from "vitest";

import { dispatchGrokGasperLane } from "./GrokGasperLane.js";

describe("Grok Gasper lane", () => {
  it("reads, compiles, dispatches, and lists through legal names", async () => {
    const inspect = await dispatchGrokGasperLane({ name: "gasper_manifest" });
    expect(inspect).toMatchObject({ ok: true, operation: "manifest" });
    expect(JSON.stringify(inspect.result)).toContain("gasper_inspect_tuning");

    const compiled = await dispatchGrokGasperLane({
      name: "gasper_compile_intent",
      args: { intent: "reduce vertical squeeze by 15%" },
    });
    expect(compiled.ok).toBe(true);
    expect(compiled.result).toMatchObject({ ok: true, plan: { schema: "gasper.motion.intent-plan.v1" } });

    const dispatched = await dispatchGrokGasperLane({
      name: "gasper_dispatch_command",
      args: { op: "inspect_animation_document" },
    });
    expect(dispatched.ok).toBe(true);

    const clips = await dispatchGrokGasperLane({ name: "gasper_animation_clips" });
    expect(clips.ok).toBe(true);
    const keyframes = await dispatchGrokGasperLane({ name: "gasper_animation_keyframes" });
    expect(keyframes.ok).toBe(true);
  });

  it("proves live inspect/set through injected lane deps and reloads continuity", async () => {
    const state = { walkAmp: 1 };
    const inspect = await dispatchGrokGasperLane(
      { name: "gasper_inspect_tuning" },
      { inspectTuning: async () => ({ ...state, source: "live-lab" }) },
    );
    expect(inspect).toEqual({
      ok: true,
      name: "gasper_inspect_tuning",
      operation: "inspect_tuning",
      result: { walkAmp: 1, source: "live-lab" },
    });

    const written = await dispatchGrokGasperLane(
      { name: "gasper_set_tuning", args: { id: "walkAmp", value: 1.2 } },
      {
        setTuning: async (id, value) => {
          state[id as "walkAmp"] = value;
          return { id, value, applied: true };
        },
      },
    );
    expect(written.ok).toBe(true);
    expect(state.walkAmp).toBe(1.2);

    const continuity = await dispatchGrokGasperLane(
      { name: "gasper_reload_continuity" },
      { readContinuity: async () => ({ available: true, nextAction: "prove the Grok lane" }) },
    );
    expect(continuity).toMatchObject({ ok: true, operation: "reload_continuity" });
  });


  it("compiles approach through causal affect to physics goals", async () => {
    const compiled = await dispatchGrokGasperLane({
      name: "gasper_compile_intent",
      args: { intent: "approach the mark" },
    });
    expect(compiled.ok).toBe(true);
    expect(compiled.result).toMatchObject({
      ok: true,
      plan: {
        path: "causal-affect",
        schema: "gasper.causal-intent-plan.v1",
        parameters: {},
      },
    });
    const plan = compiled.result && typeof compiled.result === "object" && "plan" in compiled.result
      ? compiled.result.plan
      : null;
    expect(plan).toBeTruthy();
    expect(plan.physicsGoals.locomotion.cruise).toBeGreaterThan(0);
    expect(plan.capabilityGate.ok).toBe(true);
    expect(JSON.stringify(plan)).not.toMatch(/happy|sad|angry/);
  });
  it("fails closed on illegal names, unknown ops, bad args, unauthorized continuity, and rejected dispatch", async () => {
    await expect(dispatchGrokGasperLane({ name: "gasper__inspect_tuning" })).resolves.toMatchObject({
      ok: false,
      code: "ILLEGAL_GROK_NAME",
    });
    await expect(dispatchGrokGasperLane({ name: "gasper_not_a_real_op" })).resolves.toMatchObject({
      ok: false,
      code: "UNKNOWN_OPERATION",
    });
    await expect(dispatchGrokGasperLane({ name: "gasper_set_tuning", args: { id: "nope", value: 1 } })).resolves.toMatchObject({
      ok: false,
      code: "INVALID_ARGS",
    });
    await expect(dispatchGrokGasperLane({ name: "gasper_compile_intent", args: { intent: "" } })).resolves.toMatchObject({
      ok: false,
      code: "INVALID_ARGS",
    });
    await expect(dispatchGrokGasperLane({
      name: "gasper_dispatch_command",
      args: { op: "explode_the_rig" },
    })).resolves.toMatchObject({
      ok: false,
      code: "DISPATCH_REJECTED",
    });
    await expect(dispatchGrokGasperLane({ name: "gasper_reload_continuity" })).resolves.toMatchObject({
      ok: false,
      code: "UNAUTHORIZED",
    });
  });
});