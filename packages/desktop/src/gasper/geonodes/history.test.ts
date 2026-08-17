import { describe, expect, it } from "vitest";
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
});
