import { describe, expect, it } from "vitest";
import { writeLiveSculpt, readLiveSculpt } from "../revision/sculptHost";
import { defaultGeoGraph } from "./defaultGraph";
import { emptyHistory, pushPast, redoGraph, undoGraph } from "./history";
import { setNodeMuted } from "./host";

describe("graph history", () => {
  it("undoes and redoes a mute", () => {
    const a = defaultGeoGraph();
    const b = setNodeMuted(a, "voigt", true);
    let h = pushPast(emptyHistory(), a);
    const back = undoGraph(h, b);
    expect(back?.graph.nodes.find((n) => n.id === "voigt")?.muted).toBe(a.nodes.find((n) => n.id === "voigt")?.muted);
    h = back!.history;
    const fwd = redoGraph(h, back!.graph);
    expect(fwd?.graph.nodes.find((n) => n.id === "voigt")?.muted).toBe(true);
  });

  it("undoes a sculpt with the graph", () => {
    writeLiveSculpt(new Array(2000).fill(0));
    const g = defaultGeoGraph();
    const before = readLiveSculpt();
    let h = pushPast(emptyHistory(), g, before);
    const after = before.slice();
    after[10] = 4.2;
    writeLiveSculpt(after);
    const back = undoGraph(h, g);
    expect(readLiveSculpt()[10]).toBe(0);
    h = back!.history;
    redoGraph(h, back!.graph);
    expect(readLiveSculpt()[10]).toBeCloseTo(4.2);
  });
});
