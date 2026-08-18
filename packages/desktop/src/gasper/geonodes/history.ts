import { readLiveSculpt, writeLiveSculpt } from "../revision/sculptHost";
import type { GeoGraph } from "./types";

const LIMIT = 80;

export function cloneGraph(graph: GeoGraph): GeoGraph {
  return JSON.parse(JSON.stringify(graph)) as GeoGraph;
}

export type SessionFrame = {
  graph: GeoGraph;
  sculpt: number[];
};

export type GraphHistory = { past: SessionFrame[]; future: SessionFrame[] };

function frameOf(graph: GeoGraph, sculpt?: readonly number[]): SessionFrame {
  return {
    graph: cloneGraph(graph),
    sculpt: sculpt ? sculpt.slice() : readLiveSculpt(),
  };
}

export function emptyHistory(): GraphHistory {
  return { past: [], future: [] };
}

export function pushPast(h: GraphHistory, present: GeoGraph, sculpt?: readonly number[]): GraphHistory {
  const past = [...h.past, frameOf(present, sculpt)];
  if (past.length > LIMIT) past.shift();
  return { past, future: [] };
}

export function undoGraph(h: GraphHistory, present: GeoGraph): { graph: GeoGraph; history: GraphHistory } | null {
  if (h.past.length === 0) return null;
  const past = h.past.slice();
  const prev = past.pop()!;
  const presentFrame = frameOf(present);
  writeLiveSculpt(prev.sculpt);
  return { graph: prev.graph, history: { past, future: [...h.future, presentFrame] } };
}

export function redoGraph(h: GraphHistory, present: GeoGraph): { graph: GeoGraph; history: GraphHistory } | null {
  if (h.future.length === 0) return null;
  const future = h.future.slice();
  const next = future.pop()!;
  const presentFrame = frameOf(present);
  writeLiveSculpt(next.sculpt);
  return { graph: next.graph, history: { past: [...h.past, presentFrame], future } };
}
