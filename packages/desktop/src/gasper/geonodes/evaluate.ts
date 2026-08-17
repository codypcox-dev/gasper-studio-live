import type { GeoEval, GeoGraph } from "./types";
import { GEONODES_SCHEMA } from "./types";

export function topoOrder(graph: GeoGraph): string[] {
  const incoming = new Map<string, number>();
  const outs = new Map<string, string[]>();
  for (const n of graph.nodes) {
    incoming.set(n.id, 0);
    outs.set(n.id, []);
  }
  for (const l of graph.links) {
    incoming.set(l.to, (incoming.get(l.to) || 0) + 1);
    outs.get(l.from)?.push(l.to);
  }
  const q = graph.nodes.filter((n) => (incoming.get(n.id) || 0) === 0).map((n) => n.id);
  const order: string[] = [];
  while (q.length) {
    const id = q.shift()!;
    order.push(id);
    for (const nxt of outs.get(id) || []) {
      const c = (incoming.get(nxt) || 1) - 1;
      incoming.set(nxt, c);
      if (c === 0) q.push(nxt);
    }
  }
  return order;
}

export function evaluateGraph(graph: GeoGraph): GeoEval {
  const mute: Record<string, boolean> = {};
  const params: Record<string, Record<string, number>> = {};
  for (const n of graph.nodes) {
    mute[n.id] = !!n.muted;
    if (n.organId) mute[n.organId] = !!n.muted;
    params[n.id] = {};
    if (n.organId) params[n.organId] = params[n.id];
    for (const p of n.params) params[n.id][p.id] = p.value;
  }
  return {
    schema: GEONODES_SCHEMA,
    mute,
    params,
    order: topoOrder(graph),
    selected: graph.selected,
  };
}

export function publishGeoEval(evaled: GeoEval): GeoEval {
  const host = globalThis as {
    __GASPER_GEONODES_EVAL__?: GeoEval;
  };
  host.__GASPER_GEONODES_EVAL__ = evaled;
  return evaled;
}

export function readGeoEval(): GeoEval | null {
  const ev = (globalThis as { __GASPER_GEONODES_EVAL__?: GeoEval }).__GASPER_GEONODES_EVAL__;
  return ev?.schema === GEONODES_SCHEMA ? ev : null;
}
