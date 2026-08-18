/**
 * Graph topology — Kahn DAG cook.
 * VPL law (Blueprints / Houdini / node-graph architecture):
 * the cook is a DAG. A cycle never ends. Tell the user why a wire died.
 */
import type { GeoGraph, GraphNode } from "./types";

export type WireFail = "missing" | "self" | "already" | "cycle" | "bind" | "ok";

export type WireResult = {
  graph: GeoGraph;
  ok: boolean;
  reason: WireFail;
  detail: string;
};

export type GraphHealth = {
  cyclic: boolean;
  dangling: number;
  order: string[];
  unreachable: string[];
};

export function kahnOrder(graph: GeoGraph): { order: string[]; cyclic: boolean; wave: Record<string, number> } {
  const incoming = new Map<string, number>();
  const outs = new Map<string, string[]>();
  for (const n of graph.nodes) {
    incoming.set(n.id, 0);
    outs.set(n.id, []);
  }
  for (const l of graph.links) {
    if (l.law) continue;
    if (!incoming.has(l.from) || !incoming.has(l.to)) continue;
    incoming.set(l.to, (incoming.get(l.to) || 0) + 1);
    outs.get(l.from)?.push(l.to);
  }
  let q = graph.nodes.filter((n) => (incoming.get(n.id) || 0) === 0).map((n) => n.id);
  const order: string[] = [];
  const wave: Record<string, number> = {};
  let gen = 0;
  while (q.length) {
    const batch = q;
    q = [];
    for (const id of batch) {
      order.push(id);
      wave[id] = gen;
      for (const nxt of outs.get(id) || []) {
        const c = (incoming.get(nxt) || 1) - 1;
        incoming.set(nxt, c);
        if (c === 0) q.push(nxt);
      }
    }
    gen += 1;
  }
  return { order, cyclic: order.length !== graph.nodes.length, wave };
}

export type CookStep = { id: string; label: string; rank: number; wave: number };

export function cookTrace(graph: GeoGraph): { steps: CookStep[]; cyclic: boolean } {
  const { order, cyclic, wave } = kahnOrder(graph);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const live = order.filter((id) => {
    const n = byId.get(id);
    if (!n) return false;
    if (n.id === "identity" || n.id === "hull") return true;
    return !n.muted;
  });
  return {
    cyclic,
    steps: live.map((id, i) => ({
      id,
      label: byId.get(id)?.label ?? id,
      rank: i + 1,
      wave: wave[id] ?? 0,
    })),
  };
}

export function ancestorsOf(graph: GeoGraph, sink: string): Set<string> {
  const ins = new Map<string, string[]>();
  for (const n of graph.nodes) ins.set(n.id, []);
  for (const l of graph.links) {
    if (l.law) continue;
    ins.get(l.to)?.push(l.from);
  }
  const seen = new Set<string>();
  const stack = [sink];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const prev of ins.get(id) || []) stack.push(prev);
  }
  return seen;
}

export function sanitizeGraph(graph: GeoGraph): GeoGraph {
  const ids = new Set(graph.nodes.map((n) => n.id));
  const links = graph.links.filter((l) => ids.has(l.from) && ids.has(l.to) && l.from !== l.to);
  if (links.length === graph.links.length) return graph;
  return { ...graph, links };
}

export function inspectGraph(graph: GeoGraph): GraphHealth {
  const clean = sanitizeGraph(graph);
  const { order, cyclic } = kahnOrder(clean);
  const reach = ancestorsOf(clean, clean.output || "hull");
  const live = clean.nodes.filter((n) => !n.muted || n.id === "identity" || n.id === "hull");
  return {
    cyclic,
    dangling: graph.links.length - clean.links.length,
    order,
    unreachable: live.filter((n) => !reach.has(n.id)).map((n) => n.id),
  };
}

export function wouldCycleKahn(graph: GeoGraph, from: string, to: string): boolean {
  const trial: GeoGraph = {
    ...graph,
    links: [...graph.links.filter((l) => !(l.to === to && !l.law)), { from, to }],
  };
  return kahnOrder(trial).cyclic;
}

export function failWire(graph: GeoGraph, reason: WireFail, detail: string): WireResult {
  return { graph, ok: false, reason, detail };
}

export function describeBind(from: GraphNode, to: GraphNode, reason: WireFail): string {
  if (reason === "ok") return `${from.label} → ${to.label}`;
  if (reason === "cycle") return `Cycle: ${from.label} cannot feed ${to.label}`;
  if (reason === "bind") return `${from.label} cannot bind to ${to.label}`;
  if (reason === "already") return "Already wired";
  if (reason === "self") return "A node cannot feed itself";
  return "Missing node";
}
