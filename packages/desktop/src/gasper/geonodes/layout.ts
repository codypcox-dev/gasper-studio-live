import type { GeoGraph, GraphNode } from "./types";
import { type PillarId, seatOf } from "./pillars";

export { PILLARS, PILLAR_IDS, seatOf, belongsToPillar, ORGAN_PILLAR, type PillarId, type PillarDef, type PillarSeat } from "./pillars";

export const LAYOUT_VERSION = 18;
export const CARD_W = 156;
export const CARD_H = 88;
const HEADER = 44;
const FOOT = 16;
const GUTTER = 8;
const COL_W = 188;
const COL_GAP = 36;
const ORIGIN_X = 20;
const ORIGIN_Y = 36;

export const COMPILER_PILLARS: readonly PillarId[] = ["machine", "kernel", "cook", "painter", "score"];

export const FUNCTION_ORDER: Record<string, readonly string[]> = {
  machine: ["machine", "eight-state", "gsap", "compositor"],
  kernel: ["world-driver", "gait", "support", "walk-scaffold"],
  cook: ["identity", "cage", "handles", "voigt", "kappa", "couple", "field-api"],
  painter: ["orbit", "pearl", "hull", "radial-facing"],
  score: ["northstar-20", "path-take", "curve-track", "rig-controller"],
};

export const COMPILER_BUS: readonly { from: PillarId; to: PillarId; label: string; step: number }[] = [
  { from: "machine", to: "kernel", label: "may I", step: 1 },
  { from: "kernel", to: "cook", label: "mass", step: 2 },
  { from: "cook", to: "painter", label: "silhouette", step: 3 },
  { from: "painter", to: "score", label: "frame", step: 4 },
  { from: "score", to: "machine", label: "again", step: 5 },
];

export const ACTIVE_LINE = [
  "machine",
  "world-driver",
  "gait",
  "support",
  "identity",
  "cage",
  "handles",
  "voigt",
  "kappa",
  "couple",
  "orbit",
  "pearl",
  "cage-light",
  "hull",
  "northstar-20",
] as const;

export type BrowserCat = PillarId | "unhooked" | "dead";

export const BROWSER_CATS: { id: BrowserCat; label: string }[] = [
  ...COMPILER_PILLARS.map((id) => ({
    id,
    label: id[0]!.toUpperCase() + id.slice(1),
  })),
  { id: "unhooked", label: "Unhooked" },
  { id: "dead", label: "Dead" },
];

export function browserCat(n: Pick<GraphNode, "id" | "organId" | "status">): BrowserCat {
  if (n.status === "DEAD") return "dead";
  if (n.status === "UNHOOKED") return "unhooked";
  const p = seatOf(n.id, n.organId).pillar;
  return p === "phase" ? "kernel" : p;
}

export function isLiveNode(n: GraphNode): boolean {
  if (n.id === "identity" || n.id === "hull") return true;
  return !n.muted;
}

export function isStageNode(n: GraphNode): boolean {
  if (n.id === "identity" || n.id === "hull") return true;
  if (n.loose) return true;
  return !n.muted;
}

export function compilerOf(id: string, organId?: string): PillarId {
  const p = seatOf(id, organId).pillar;
  return p === "phase" ? "kernel" : p;
}

export type CompilerCol = { id: PillarId; x: number; y: number; w: number; h: number };

export function compilerColumns(graph?: GeoGraph): CompilerCol[] {
  const counts: Record<string, number> = {};
  if (graph) {
    for (const n of graph.nodes.filter(isLiveNode)) {
      const p = compilerOf(n.id, n.organId);
      counts[p] = (counts[p] ?? 0) + 1;
    }
  }
  return COMPILER_PILLARS.map((id, i) => {
    const n = Math.max(1, counts[id] ?? 0);
    const h = HEADER + n * CARD_H + Math.max(0, n - 1) * GUTTER + FOOT;
    return { id, x: ORIGIN_X + i * (COL_W + COL_GAP), y: ORIGIN_Y, w: COL_W, h };
  });
}

export function boxesForGraph(graph: GeoGraph): CompilerCol[] {
  return compilerColumns(graph);
}

export function occupiedPillars(graph: GeoGraph): PillarId[] {
  return compilerColumns(graph)
    .filter((c) => graph.nodes.some((n) => isLiveNode(n) && compilerOf(n.id, n.organId) === c.id))
    .map((c) => c.id);
}

function orderIndex(pillar: PillarId, id: string): number {
  const list = FUNCTION_ORDER[pillar] ?? [];
  const i = list.indexOf(id);
  return i < 0 ? 100 + id.charCodeAt(0) : i;
}

export function resetLayout(graph: GeoGraph): GeoGraph {
  const live = new Set<string>(ACTIVE_LINE);
  live.add("identity");
  live.add("hull");
  return arrangeGraph({
    ...graph,
    racks: {},
    nodes: graph.nodes.map((n) => ({
      ...n,
      muted: !live.has(n.id),
      loose: false,
    })),
  });
}

export function arrangeGraph(graph: GeoGraph): GeoGraph {
  const cols = new Map(compilerColumns(graph).map((c) => [c.id, c]));
  const buckets: Record<string, GraphNode[]> = {};
  for (const id of COMPILER_PILLARS) buckets[id] = [];
  for (const n of graph.nodes.filter(isLiveNode)) {
    const p = compilerOf(n.id, n.organId);
    if (!buckets[p]) buckets[p] = [];
    buckets[p].push(n);
  }
  const pos = new Map<string, { x: number; y: number }>();
  for (const id of COMPILER_PILLARS) {
    const col = cols.get(id);
    if (!col) continue;
    const list = (buckets[id] ?? []).sort((a, b) => orderIndex(id, a.id) - orderIndex(id, b.id));
    list.forEach((n, i) => {
      pos.set(n.id, {
        x: col.x + (col.w - CARD_W) / 2,
        y: col.y + HEADER + i * (CARD_H + GUTTER),
      });
    });
  }
  return {
    ...graph,
    layoutVersion: LAYOUT_VERSION,
    racks: {},
    nodes: graph.nodes.map((n) => {
      const p = pos.get(n.id);
      return p ? { ...n, x: p.x, y: p.y, loose: false } : n;
    }),
  };
}

export function setRack(graph: GeoGraph, _id: PillarId, _patch: Partial<CompilerCol>): GeoGraph {
  return graph;
}

export function columnAt(graph: GeoGraph, x: number, y: number): CompilerCol | null {
  return compilerColumns(graph).find((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) ?? null;
}

export function cookSpineXs(graph: GeoGraph): number[] {
  return ACTIVE_LINE.map((id) => graph.nodes.find((n) => n.id === id)?.x ?? -1);
}

export function graphBounds(graph?: GeoGraph): { minX: number; minY: number; maxX: number; maxY: number } {
  const cols = compilerColumns(graph);
  return {
    minX: 0,
    minY: 0,
    maxX: Math.max(...cols.map((c) => c.x + c.w)) + 24,
    maxY: Math.max(...cols.map((c) => c.y + c.h)) + 24,
  };
}

export function feedOf(graph: GeoGraph, id: string): { inFromNode: boolean; outToNode: boolean } {
  const live = new Set(graph.nodes.filter(isLiveNode).map((n) => n.id));
  return {
    inFromNode: graph.links.some((l) => l.to === id && live.has(l.from)),
    outToNode: graph.links.some((l) => l.from === id && live.has(l.to)),
  };
}

export function railOf(col: CompilerCol): { left: number; right: number; headY: number } {
  return { left: col.x + 10, right: col.x + col.w - 10, headY: col.y + 28 };
}

/** Kept so old imports compile. No grid snap. */
export const GRID = 1;
export function snap(n: number): number {
  return Math.round(n);
}
export function magnetizeCard(
  graph: GeoGraph,
  id: string,
  x: number,
  y: number,
): { x: number; y: number; seated: boolean } {
  const col = columnAt(graph, x + CARD_W / 2, y + CARD_H / 2);
  const n = graph.nodes.find((node) => node.id === id);
  const home = compilerOf(id, n?.organId);
  return { x: Math.round(x), y: Math.round(y), seated: !!col && col.id === home };
}
