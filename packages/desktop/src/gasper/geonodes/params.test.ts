import { describe, expect, it } from "vitest";
import { defaultGeoGraph } from "./defaultGraph";
import { applyGeoEvalToHost } from "./host";
import { fromSliderT, lockReason, sliderT } from "./params";

describe("dial wiring", () => {
  it("centers sliders on the canonical base", () => {
    const g = defaultGeoGraph();
    const orbit = g.nodes.find((n) => n.id === "orbit")!;
    const yaw = orbit.params.find((p) => p.id === "yaw")!;
    expect(yaw.base).toBe(8);
    expect(sliderT(yaw)).toBeCloseTo(0, 5);
    expect(fromSliderT(yaw, 1)).toBe(180);
    expect(fromSliderT(yaw, -1)).toBe(-180);
    const voigt = g.nodes.find((n) => n.id === "voigt")!.params.find((p) => p.id === "tau")!;
    expect(sliderT(voigt)).toBeCloseTo(0, 5);
  });

  it("refuses to mute identity or hull", () => {
    expect(lockReason("identity")).toMatch(/contour/i);
    expect(lockReason("hull")).toMatch(/silhouette/i);
  });

  it("publishes orbit yaw and gait hz onto the live host", () => {
    const g = defaultGeoGraph();
    const next = {
      ...g,
      nodes: g.nodes.map((n) =>
        n.id === "orbit"
          ? { ...n, params: n.params.map((p) => (p.id === "yaw" ? { ...p, value: 90 } : p)) }
          : n.id === "gait"
            ? { ...n, params: n.params.map((p) => (p.id === "hz" ? { ...p, value: 3.1 } : p)) }
            : n,
      ),
    };
    applyGeoEvalToHost(next);
    const host = globalThis as { __GASPER_ORBIT_YAW__?: number; __GASPER_GAIT_HZ__?: number };
    expect(host.__GASPER_ORBIT_YAW__).toBe(90);
    expect(host.__GASPER_GAIT_HZ__).toBe(3.1);
  });

  it("publishes support k and voigt rest", () => {
    const g = defaultGeoGraph();
    const next = {
      ...g,
      nodes: g.nodes.map((n) =>
        n.id === "support"
          ? { ...n, params: n.params.map((p) => (p.id === "k" ? { ...p, value: 8 } : p)) }
          : n.id === "voigt"
            ? { ...n, params: n.params.map((p) => (p.id === "rest" ? { ...p, value: 0.5 } : p)) }
            : n,
      ),
    };
    applyGeoEvalToHost(next);
    const host = globalThis as { __GASPER_SUPPORT_K__?: number; __GASPER_VISCO_TAU_REST__?: number };
    expect(host.__GASPER_SUPPORT_K__).toBe(8);
    expect(host.__GASPER_VISCO_TAU_REST__).toBe(0.5);
  });
});
