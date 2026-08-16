import { describe, expect, it, vi } from "vitest";
import {
  TUNING_PARAMETER_SPECS,
  TuningLabSession,
  createDefaultTuningLabState,
} from "./tuningRegistry";
import { compileMotionIntent } from "./intentToMotion";

describe("Tuning Lab registry", () => {
  it("keeps the Northstar controls typed, bounded, and reversible", () => {
    expect(TUNING_PARAMETER_SPECS.map((p) => p.id)).toEqual([
      "verticalDepthGain",
      "craftExaggeration",
      "gaitBobGain",
      "contactSquashGain",
      "supportExchangeGain",
      "footworkPrimitiveGain",
      "footRootGain",
      "walkAmp",
      "walkAccent",
      "stepDepth",
      "walkPeriod",
      "footworkTempo",
      "actingGain",
      "viscoTau",
    ]);
    expect(createDefaultTuningLabState()).toEqual({
      verticalDepthGain: 1,
      craftExaggeration: 1.25,
      gaitBobGain: 1,
      contactSquashGain: 1,
      supportExchangeGain: 1,
      footworkPrimitiveGain: 1,
      footRootGain: 1,
      walkAmp: 1.25,
      walkAccent: 0.6,
      stepDepth: 7.2,
      walkPeriod: 1.25,
      footworkTempo: 1,
      actingGain: 1,
      viscoTau: 0.25,
    });
  });

  it("clamps values and routes each change to its owning authority", () => {
    const surface = {
      commitBinding: vi.fn(),
      setPerformancePackParams: vi.fn(),
      setTuningLabParams: vi.fn(),
      setExpressionGain: vi.fn(),
    };
    const lab = new TuningLabSession(() => surface);

    expect(lab.set("verticalDepthGain", 0.2).value).toBe(0.8);
    expect(surface.commitBinding).not.toHaveBeenCalledWith("overall_height", 0.8);
    expect(surface.setTuningLabParams).toHaveBeenCalledWith({ verticalDepthGain: 0.8 });
    expect(lab.set("craftExaggeration", 9).value).toBe(2);
    expect(surface.setPerformancePackParams).toHaveBeenCalledWith({ exaggeration: 2 });
    lab.set("gaitBobGain", 0.4);
    lab.set("contactSquashGain", 1.4);
    expect(surface.setTuningLabParams).toHaveBeenLastCalledWith({
      gaitBobGain: 0.4,
      contactSquashGain: 1.4,
      supportExchangeGain: 1,
      footworkPrimitiveGain: 1,
      footworkTempo: 1,
    });
    lab.set("supportExchangeGain", 1.4);
    lab.set("footworkPrimitiveGain", 0.7);
    lab.set("footworkTempo", 1.2);
    expect(surface.setTuningLabParams).toHaveBeenLastCalledWith({
      gaitBobGain: 0.4,
      contactSquashGain: 1.4,
      supportExchangeGain: 1.4,
      footworkPrimitiveGain: 0.7,
      footworkTempo: 1.2,
    });
    lab.set("actingGain", 1.3);
    expect(surface.setExpressionGain).toHaveBeenCalledWith(1.3);
    expect(lab.set("viscoTau", 0.9).value).toBe(0.9);
    expect(surface.commitBinding).toHaveBeenLastCalledWith("visco_tau", 0.9);
  });

  it("routes visco tau through the adapter fallback-capable design path", () => {
    const surface = {
      setDesignParameter: vi.fn(),
      commitBinding: vi.fn(),
    };
    const lab = new TuningLabSession(() => surface);

    expect(lab.set("viscoTau", 0.34).ok).toBe(true);
    expect(surface.setDesignParameter).toHaveBeenCalledWith("form", "visco_tau", 0.34);
    expect(surface.commitBinding).not.toHaveBeenCalled();
  });

  it("routes authored Wispwalker footwork controls through the form design authority", () => {
    const surface = { setDesignParameter: vi.fn() };
    const lab = new TuningLabSession(() => surface);

    lab.set("walkAmp", 1.6);
    lab.set("walkAccent", 0.9);
    lab.set("stepDepth", 9.2);
    lab.set("walkPeriod", 1.05);

    expect(surface.setDesignParameter).toHaveBeenNthCalledWith(1, "form", "walk_amp", 1.6);
    expect(surface.setDesignParameter).toHaveBeenNthCalledWith(2, "form", "walk_accent", 0.9);
    expect(surface.setDesignParameter).toHaveBeenNthCalledWith(3, "form", "step_depth", 9.2);
    expect(surface.setDesignParameter).toHaveBeenNthCalledWith(4, "form", "walk_period", 1.05);
  });

  it("routes structural Wispwalker foot-root mass through the form authority", () => {
    const surface = { setDesignParameter: vi.fn() };
    const lab = new TuningLabSession(() => surface);

    expect(lab.set("footRootGain", 1.45).value).toBe(1.45);
    expect(surface.setDesignParameter).toHaveBeenCalledWith("form", "foot_amp", 1.45);
  });

  it("does not report an intent as applied when an owning route rejects a knob", () => {
    const surface = {
      commitBinding: vi.fn((id: string) => {
        if (id === "visco_tau") throw new Error("route rejected");
      }),
      setTuningLabParams: vi.fn(),
      setPerformancePackParams: vi.fn(),
      setExpressionGain: vi.fn(),
      setEmbodiment: vi.fn(),
    };
    const lab = new TuningLabSession(() => surface);

    const applied = lab.applyIntent("make Wispwalker do the crip walk");

    expect(applied.ok).toBe(false);
    expect(applied.error).toContain("route rejected");
    expect(lab.snapshot().embodiment).toBe("wispwalker");
  });

  it("rolls reset back when a default route rejects", () => {
    const surface = {
      commitBinding: vi.fn(),
      setTuningLabParams: vi.fn((params: { gaitBobGain?: number }) => {
        if (params.gaitBobGain === 1) throw new Error("reset route rejected");
      }),
      setPerformancePackParams: vi.fn(),
      setExpressionGain: vi.fn(),
    };
    const lab = new TuningLabSession(() => surface);
    lab.set("gaitBobGain", 0.55);

    const reset = lab.reset();

    expect(reset.ok).toBe(false);
    expect(reset.error).toContain("reset route rejected");
    expect(lab.snapshot().state.gaitBobGain).toBe(0.55);
  });

  it("rolls an intent back when embodiment handoff rejects", () => {
    const surface = {
      setTuningLabParams: vi.fn(),
      setPerformancePackParams: vi.fn(),
      setExpressionGain: vi.fn(),
      setEmbodiment: vi.fn((id: string) => {
        if (id === "wispwalker") throw new Error("embodiment route rejected");
      }),
    };
    const lab = new TuningLabSession(() => surface);

    const applied = lab.applyIntent("make Wispwalker do the crip walk");

    expect(applied.ok).toBe(false);
    expect(applied.error).toContain("embodiment route rejected");
    expect(lab.snapshot().embodiment).toBe("wispwalker");
    expect(lab.snapshot().state).toEqual(createDefaultTuningLabState());
  });

  it("supports baseline compare and reset without losing the live receipt", () => {
    const surface = { commitBinding: vi.fn(), setTuningLabParams: vi.fn() };
    const lab = new TuningLabSession(() => surface);
    lab.pinBaseline();
    lab.set("verticalDepthGain", 0.85);
    expect(lab.compareBaseline().identical).toBe(false);
    const reset = lab.reset();
    expect(reset.state).toEqual(createDefaultTuningLabState());
    expect(lab.compareBaseline().identical).toBe(true);
    expect(lab.snapshot().lastAction).toBe("reset");
  });

  it("treats embodiment as reversible experiment state", () => {
    const surface = {
      setEmbodiment: vi.fn(),
      setTuningLabParams: vi.fn(),
    };
    const lab = new TuningLabSession(() => surface);

    lab.pinBaseline();
    lab.applyIntent("make Wispwalker do the crip walk");

    expect(lab.snapshot().embodiment).toBe("wispwalker");
    expect(lab.snapshot().experiment?.beforeEmbodiment).toBe("wispwalker");
    expect(lab.snapshot().experiment?.afterEmbodiment).toBe("wispwalker");

    lab.reset();

    expect(surface.setEmbodiment).toHaveBeenLastCalledWith("wispwalker");
    expect(lab.snapshot().embodiment).toBe("wispwalker");
    expect(lab.compareBaseline().identical).toBe(true);
  });

  it("preserves an explicit embodiment across direct parameter writes", () => {
    const surface = {
      // Simulate a stale expression/runtime readback: the active intent must
      // remain authoritative until the reversible experiment is reset.
      readEmbodiment: vi.fn(() => "presence"),
      readTelemetry: vi.fn(() => ({ embodiment: "presence" })),
      setEmbodiment: vi.fn(),
      setExpressionGain: vi.fn(),
      setTuningLabParams: vi.fn(),
    };
    const lab = new TuningLabSession(() => surface);

    expect(lab.applyIntent("make Wispwalker do the crip walk").ok).toBe(true);
    lab.set("supportExchangeGain", 1.35);

    expect(surface.setExpressionGain).toHaveBeenCalledWith(1.16);
    expect(lab.snapshot().embodiment).toBe("wispwalker");
    expect(lab.snapshot().telemetry.embodiment).toBe("wispwalker");
  });

  it("re-applies the typed plan after the final embodiment projection", () => {
    const surface = {
      setDesignParameter: vi.fn(),
      setPerformancePackParams: vi.fn(),
      setTuningLabParams: vi.fn(),
      setExpressionGain: vi.fn(),
      setEmbodiment: vi.fn(),
    };
    const lab = new TuningLabSession(() => surface);

    expect(lab.applyIntent("make Wispwalker do the crip walk").ok).toBe(true);

    const footRootWrites = surface.setDesignParameter.mock.calls.filter(
      ([domain, id]) => domain === "form" && id === "foot_amp",
    );
    expect(footRootWrites).toHaveLength(3);
    expect(footRootWrites.at(-1)).toEqual(["form", "foot_amp", 1.75]);
    expect(surface.setExpressionGain).toHaveBeenLastCalledWith(1.16);
  });

  it("records before/after state, telemetry, and a capture receipt", () => {
    const surface = {
      readTelemetry: vi.fn(() => ({ gaitStepHz: 2.4, supportExchange: -12 })),
      captureProof: vi.fn(() => ({ ok: true, bundleHash: "b-123" })),
    };
    const lab = new TuningLabSession(() => surface);
    lab.pinBaseline();
    lab.set("supportExchangeGain", 1.2);
    const changed = lab.snapshot();
    expect(changed.experiment?.before.supportExchangeGain).toBe(1);
    expect(changed.experiment?.after.supportExchangeGain).toBe(1.2);
    expect(changed.telemetry).toEqual({ gaitStepHz: 2.4, supportExchange: -12 });
    expect(lab.captureProof()).toMatchObject({ ok: true, bundleHash: "b-123" });
    expect(lab.snapshot().lastCapture?.bundleHash).toBe("b-123");
  });

  it("compiles plain-language movement requests into bounded reviewable plans", () => {
    const height = compileMotionIntent("reduce his vertical squeeze by 15%");
    expect(height.ok).toBe(true);
    expect(height.plan?.parameters.verticalDepthGain).toBe(0.85);
    expect(height.plan?.constraints).toContain("physics-authoritative");

    const walk = compileMotionIntent("make Wispwalker do the crip walk");
    expect(walk.ok).toBe(true);
    expect(walk.plan?.label).toContain("Wispwalker");
    expect(walk.plan?.embodiment).toBe("wispwalker");
    expect(walk.plan?.parameters.footRootGain).toBe(1.75);
    expect(walk.plan?.parameters.gaitBobGain).toBeLessThan(1);

    const compound = compileMotionIntent(
      "reduce vertical squeeze by 15% and make Wispwalker do the crip walk",
    );
    expect(compound.ok).toBe(true);
    expect(compound.plan?.embodiment).toBe("wispwalker");
    expect(compound.plan?.parameters.verticalDepthGain).toBe(0.85);
    expect(compound.plan?.parameters.footRootGain).toBe(1.75);
    expect(compound.plan?.parameters.walkAmp).toBe(1.3);

    const surface = { commitBinding: vi.fn(), setTuningLabParams: vi.fn(), setEmbodiment: vi.fn() };
    const lab = new TuningLabSession(() => surface);
    const applied = lab.applyIntent("make Wispwalker do the crip walk");
    expect(applied.ok).toBe(true);
    expect(applied.plan?.label).toBe("Wispwalker footwork rehearsal");
    expect(surface.setEmbodiment).toHaveBeenCalledWith("wispwalker");
    expect(surface.setTuningLabParams).toHaveBeenCalled();
  });

  it("reports wispwalker when the painted form is the walker even if telemetry still says presence", () => {
    const surface = {
      readEmbodiment: vi.fn(() => "wispwalker"),
      readTelemetry: vi.fn(() => ({ embodiment: "presence" })),
    };
    const lab = new TuningLabSession(() => surface);
    expect(lab.snapshot().embodiment).toBe("wispwalker");
  });
});