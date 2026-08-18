import type { GeoEval, GeoGraph } from "./types";
import { GEONODES_SCHEMA } from "./types";
import { kahnOrder } from "./topology";
import { applyCouplings } from "./coupling";

export function topoOrder(graph: GeoGraph): string[] {
  return kahnOrder(graph).order;
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
  const mix = mute.couple ? 0 : (params.couple?.mix ?? 1);
  const wired = new Set(graph.links.map((l) => l.law).filter((id): id is string => !!id));
  const coupled = applyCouplings(params, mute, mix, (law) => wired.has(law.id));
  return {
    schema: GEONODES_SCHEMA,
    mute,
    params: coupled.params,
    order: topoOrder(graph),
    selected: graph.selected,
    couple: coupled.traces,
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
