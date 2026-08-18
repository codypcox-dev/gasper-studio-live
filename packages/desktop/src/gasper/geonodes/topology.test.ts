import { describe, expect, it } from "vitest";
import { defaultGeoGraph } from "./defaultGraph";
import { tryConnect } from "./host";
import { cookTrace, inspectGraph, kahnOrder, sanitizeGraph } from "./topology";

describe("graph topology", () => {
  it("Kahn order is a DAG and hull is reachable", () => {
    const g = defaultGeoGraph();
    const { order, cyclic } = kahnOrder(g);
    expect(cyclic).toBe(false);
    expect(order.indexOf("identity")).toBeLessThan(order.indexOf("hull"));
    const health = inspectGraph(g);
    expect(health.cyclic).toBe(false);
    expect(health.unreachable.includes("hull")).toBe(false);
    const cook = cookTrace(g);
    expect(cook.steps[0]?.id).toBeDefined();
    expect(cook.steps[cook.steps.length - 1]?.id).toBe("hull");
    expect(cook.steps.find((s) => s.id === "identity")!.rank).toBeLessThan(
      cook.steps.find((s) => s.id === "hull")!.rank,
    );
  });

  it("refuses a cycle with a reason and keeps the graph", () => {
    const g = defaultGeoGraph();
    const r = tryConnect(g, "hull", "identity");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("cycle");
    expect(r.graph).toBe(g);
  });

  it("strips dangling links", () => {
    const g = defaultGeoGraph();
    const dirty = { ...g, links: [...g.links, { from: "ghost", to: "hull" }] };
    expect(sanitizeGraph(dirty).links.some((l) => l.from === "ghost")).toBe(false);
  });
});
