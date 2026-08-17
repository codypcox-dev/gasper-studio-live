import type { GeoGraph } from "./types";

const LIMIT = 80;

export function cloneGraph(graph: GeoGraph): GeoGraph {
  return JSON.parse(JSON.stringify(graph)) as GeoGraph;
}

export type GraphHistory = { past: GeoGraph[]; future: GeoGraph[] };

export function emptyHistory(): GraphHistory {
  return { past: [], future: [] };
}

export function pushPast(h: GraphHistory, present: GeoGraph): GraphHistory {
  const past = [...h.past, cloneGraph(present)];
  if (past.length > LIMIT) past.shift();
  return { past, future: [] };
}

export function undoGraph(h: GraphHistory, present: GeoGraph): { graph: GeoGraph; history: GraphHistory } | null {
  if (h.past.length === 0) return null;
  const past = h.past.slice();
  const prev = past.pop()!;
  return { graph: prev, history: { past, future: [...h.future, cloneGraph(present)] } };
}

export function redoGraph(h: GraphHistory, present: GeoGraph): { graph: GeoGraph; history: GraphHistory } | null {
  if (h.future.length === 0) return null;
  const future = h.future.slice();
  const next = future.pop()!;
  return { graph: next, history: { past: [...h.past, cloneGraph(present)], future } };
}
