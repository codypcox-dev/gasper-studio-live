import { describe, expect, it } from "vitest";
import { applyCouplings, COUPLE_LAWS } from "./coupling";
import { defaultGeoGraph } from "./defaultGraph";
import { evaluateGraph } from "./evaluate";

describe("parameter coupling", () => {
  it("lists the four physics laws", () => {
    expect(COUPLE_LAWS.map((l) => l.id)).toEqual(["froude-tau", "tempo-lift", "yaw-pearl", "plant-k-tau"]);
  });

  it("drops tau when cadence rises (Froude)", () => {
    const { params, traces } = applyCouplings(
      { gait: { hz: 4.2 }, voigt: { tau: 0.05 } },
      {},
      1,
    );
    expect(params.voigt.tau).toBeLessThan(0.05);
    expect(traces.find((t) => t.id === "froude-tau")?.after).toBe(params.voigt.tau);
  });

  it("parks when the Couple card is muted", () => {
    const { params, traces } = applyCouplings(
      { gait: { hz: 4.2 }, voigt: { tau: 0.05 } },
      { couple: true },
      1,
    );
    expect(params.voigt.tau).toBe(0.05);
    expect(traces).toHaveLength(0);
  });

  it("evaluateGraph writes coupled tau onto the live eval", () => {
    const g = defaultGeoGraph();
    const faster = {
      ...g,
      nodes: g.nodes.map((n) =>
        n.id === "gait" ? { ...n, params: n.params.map((p) => (p.id === "hz" ? { ...p, value: 4.2 } : p)) } : n,
      ),
    };
    const ev = evaluateGraph(faster);
    expect(ev.params.voigt.tau).toBeLessThan(0.05);
    expect(ev.couple?.some((t) => t.id === "froude-tau")).toBe(true);
  });
});
