import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GASPER_ORGANS, LIVE_PIPELINE, COOK_ORGANS } from "./catalog";

import { defaultGeoGraph } from "./defaultGraph";
import { evaluateGraph, topoOrder } from "./evaluate";
import { NODE_BLUEPRINTS } from "./library";
import { arrangeGraph, compilerColumns, compilerOf, feedOf, isLiveNode, isStageNode, occupiedPillars, seatOf } from "./layout";
import {
  connectNodes,
  disconnectNodes,
  moveNode,
  removeNode,
  setNodeMuted,
  spawnNode,
  tryConnect,
  wouldCycle,
} from "./host";
import { socketsCompatible } from "./types";

const painter = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "all-script-3.js"),
  "utf8",
);

describe("GeoNodes", () => {
  it("default graph covers every organ and keeps the cook spine", () => {
    const g = defaultGeoGraph();
    expect(g.schema).toBe("gasper.geometry-nodes.v1");
    expect(NODE_BLUEPRINTS).toHaveLength(GASPER_ORGANS.length);
    expect(g.nodes.length).toBe(COOK_ORGANS.length);
    expect(g.nodes.some((n) => n.id === "studio-desk" || n.organId === "studio-desk")).toBe(false);

    const order = topoOrder(g);
    const spine = ["identity", "cage", "handles", "gait", "voigt", "kappa", "orbit", "pearl", "hull"];
    for (let i = 1; i < spine.length; i++) {
      expect(order.indexOf(spine[i])).toBeGreaterThan(order.indexOf(spine[i - 1]));
    }
    expect(g.output).toBe("hull");
    expect(arrangeGraph(g).layoutVersion).toBe(18);
    expect(occupiedPillars(g).includes("phase")).toBe(false);
    const cols = compilerColumns(g);
    expect(cols).toHaveLength(5);
    for (const n of g.nodes.filter((n) => !n.muted || n.id === "identity" || n.id === "hull")) {
      const col = cols.find((b) => b.id === compilerOf(n.id, n.organId));
      expect(col).toBeTruthy();
      expect(n.x).toBeGreaterThanOrEqual(col!.x);
      expect(n.x + 156).toBeLessThanOrEqual(col!.x + col!.w + 1);
      expect(n.y).toBeGreaterThanOrEqual(col!.y);
      expect(n.y + 88).toBeLessThanOrEqual(col!.y + col!.h + 1);
    }
    const ident = g.nodes.find((n) => n.id === "identity");
    const voigt = g.nodes.find((n) => n.id === "voigt");
    expect((voigt?.y ?? 0) > (ident?.y ?? 0)).toBe(true);
    expect(seatOf("identity").pillar).toBe("cook");
    expect(seatOf("hull").pillar).toBe("painter");
    expect(seatOf("gait").border).toBe("phase");
    expect(seatOf("voigt").border).toBe("kernel");
    expect(feedOf(g, "machine").outToNode).toBe(false);
    expect(feedOf(g, "identity").outToNode).toBe(true);
    const loose = { ...g.nodes.find((n) => n.id === "voigt")!, muted: true, loose: true };
    expect(isStageNode(loose)).toBe(true);
    expect(isLiveNode(loose)).toBe(false);
    expect((ident?.x ?? 0) !== (g.nodes.find((n) => n.id === "hull")?.x ?? 0)).toBe(true);
    expect(g.nodes.filter((n) => n.muted).length).toBeGreaterThan(10);
    expect(new Set(g.nodes.map((n) => n.event)).size).toBe(4);
  });

  it("refuses a cycle, a type clash, and accepts a legal rewire", () => {
    const g = defaultGeoGraph();
    expect(wouldCycle(g, "hull", "identity")).toBe(true);
    expect(socketsCompatible("scalar", "contour")).toBe(true);
    expect(socketsCompatible("shade", "contour")).toBe(false);
    expect(socketsCompatible("take", "contour")).toBe(false);
    expect(socketsCompatible("pose", "contour")).toBe(false);
    expect(socketsCompatible("contour", "contour")).toBe(true);
    expect(socketsCompatible("contour", "shade")).toBe(true);
    expect(connectNodes(g, "couple", "voigt").links.some((l) => l.from === "couple" && l.to === "voigt")).toBe(true);
    const clash = tryConnect(g, "pearl", "identity");
    expect(clash.ok).toBe(false);
    expect(clash.reason).toBe("bind");
    expect(clash.graph).toBe(g);
    expect(connectNodes(g, "pearl", "identity")).toBe(g);
    const cut = disconnectNodes(g, "pearl", "hull");
    const rewired = connectNodes(cut, "kappa", "hull");
    expect(rewired.links.some((l) => l.from === "kappa" && l.to === "hull")).toBe(true);
    expect(connectNodes(g, "hull", "identity")).toBe(g);
  });

  it("moves and spawns without losing the hull", () => {
    const g = moveNode(defaultGeoGraph(), "handles", 80, 90);
    expect(g.nodes.find((n) => n.id === "handles")?.x).toBe(80);
    const grown = spawnNode(g, "deform.kappa", 10, 10);
    expect(grown.nodes.length).toBe(g.nodes.length + 1);
    expect(removeNode(grown, "identity").nodes.some((n) => n.id === "identity")).toBe(true);
  });

  it("mute is recorded; identity stays reachable", () => {
    const g = setNodeMuted(defaultGeoGraph(), "handles", true);
    const ev = evaluateGraph(g);
    expect(ev.mute.handles).toBe(true);
    expect(ev.mute.voigt).toBe(false);
    expect(ev.order).toContain("hull");
  });

  it("muted Couple parks mix at 0 and leaves the authored tau", () => {
    const g = setNodeMuted(defaultGeoGraph(), "couple", true);
    const faster = {
      ...g,
      nodes: g.nodes.map((n) =>
        n.id === "gait" ? { ...n, params: n.params.map((p) => (p.id === "hz" ? { ...p, value: 4.2 } : p)) } : n,
      ),
    };
    const ev = evaluateGraph(faster);
    expect(ev.mute.couple).toBe(true);
    expect(ev.params.voigt.tau).toBe(0.05);
    expect(ev.couple ?? []).toHaveLength(0);
  });

  it("catalog names the live organs and does not pretend twins paint", () => {
    expect(GASPER_ORGANS.some((o) => o.id === "contour-512" && o.status === "LIVE")).toBe(true);
    expect(GASPER_ORGANS.some((o) => o.id === "arap" && o.status === "UNHOOKED")).toBe(true);
    expect(LIVE_PIPELINE).toEqual([
      "contour-512",
      "relief-1000",
      "stance",
      "gait-law",
      "voigt",
      "kappa",
      "orbit",
      "pearl",
      "closed-spline",
    ]);
    expect(NODE_BLUEPRINTS.every((b) => GASPER_ORGANS.some((o) => o.id === b.organId))).toBe(true);

    const deadUi = [
      "instrument",
      "lumen",
      "worldclass",
      "geonode-editor",
      "authoring-atlas",
      "dais-control-rail",
      "dais-transport-bar",
      "machine-strip",
    ];
    for (const id of deadUi) {
      expect(GASPER_ORGANS.some((o) => o.id === id && o.kind === "ui" && o.status === "DEAD")).toBe(true);
    }

    const liveUi = GASPER_ORGANS.filter((o) => o.kind === "ui" && o.status === "LIVE").map((o) => o.id).sort();
    expect(liveUi).toEqual(["node-graph-page", "studio-desk", "studio-transport"]);
    expect(GASPER_ORGANS.some((o) => o.id === "formmaster" && o.status === "LIVE")).toBe(true);
  });

  it("painter honors mute for handles, voigt, and kappa", () => {
    expect(painter).toContain("__GASPER_GEONODES_EVAL__");
    expect(painter).toContain("__GASPER_TAU_FIELD__");
    expect(painter).toContain("GN.mute&&GN.mute.handles");
    expect(painter).toContain("GN.mute&&GN.mute.kappa");
    expect(painter).toContain("GN.mute&&GN.mute.voigt");
    expect(painter).toContain("if(GN.mute&&GN.mute.voigt) return raw");
    expect(painter).not.toContain("GN.mute&&GN.mute.voigt?0.02");
  });
});
