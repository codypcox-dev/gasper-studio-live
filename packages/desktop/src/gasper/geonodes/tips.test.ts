import { describe, expect, it } from "vitest";
import { defaultGeoGraph } from "./defaultGraph";
import { tipForNode, tipForParam, tipForPillar } from "./tips";

describe("tooltips", () => {
  it("names τ math on Voigt and yaw range on Orbit", () => {
    const g = defaultGeoGraph();
    const voigt = g.nodes.find((n) => n.id === "voigt")!;
    expect(tipForNode(voigt)).toMatch(/Kelvin–Voigt|τ/);
    expect(tipForParam("tau")).toMatch(/σ = Eε/);
    expect(tipForParam("yaw")).toMatch(/180/);
    expect(tipForPillar("cook")).toMatch(/silhouette/i);
  });
});
