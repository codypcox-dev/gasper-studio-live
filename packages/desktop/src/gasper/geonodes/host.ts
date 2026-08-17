import { defaultGeoGraph, nodeFromBlueprint } from "./defaultGraph";
import { evaluateGraph, publishGeoEval } from "./evaluate";
import { LAYOUT_VERSION, arrangeGraph, compilerOf } from "./layout";
import { NODE_BLUEPRINTS } from "./library";
import type { GeoGraph, GraphNode, NodeTypeId } from "./types";
import { GEONODES_SCHEMA, socketsCompatible } from "./types";

const STORAGE_KEY = "gasper.geonodes.v1";

export function loadGeoGraph(): GeoGraph {
  if (typeof localStorage === "undefined") return defaultGeoGraph();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultGeoGraph();
    const parsed = JSON.parse(raw) as GeoGraph;
    if (parsed?.schema !== GEONODES_SCHEMA || !Array.isArray(parsed.nodes)) return defaultGeoGraph();
    return ensureLayout(mergeMissingOrgans(relayoutIfCollapsed(parsed)));
  } catch {
    return defaultGeoGraph();
  }
}

function ensureLayout(graph: GeoGraph): GeoGraph {
  if ((graph.layoutVersion ?? 0) >= LAYOUT_VERSION) return graph;
  return arrangeGraph(graph);
}

function relayoutIfCollapsed(graph: GeoGraph): GeoGraph {
  if (graph.nodes.length < 2) return graph;
  const ys = new Set(graph.nodes.map((n) => Math.round(n.y)));
  if (ys.size > 1) return graph;
  const fresh = defaultGeoGraph();
  const pos = new Map(fresh.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      const p = pos.get(n.id);
      return p ? { ...n, x: p.x, y: p.y } : n;
    }),
  };
}

function mergeMissingOrgans(graph: GeoGraph): GeoGraph {
  const have = new Set(graph.nodes.map((n) => n.organId || n.id));
  const extra: GraphNode[] = [];
  let col = 0;
  for (const bp of NODE_BLUEPRINTS) {
    if (have.has(bp.organId) || have.has(bp.idPrefix)) continue;
    const node = nodeFromBlueprint(bp.idPrefix, 28 + (col % 6) * 220, 980 + Math.floor(col / 6) * 210, bp);
    if (node) extra.push(node);
    col += 1;
  }
  if (extra.length === 0) return hydrateMeta(graph);
  return hydrateMeta({ ...graph, nodes: [...graph.nodes, ...extra], layoutVersion: 0 });
}

function hydrateMeta(graph: GeoGraph): GeoGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      const bp = NODE_BLUEPRINTS.find((b) => b.idPrefix === n.id || b.organId === n.organId);
      if (!bp) return n;
      return {
        ...n,
        element: n.element ?? bp.element,
        event: n.event ?? bp.event,
        inType: n.inType ?? bp.inType,
        outType: n.outType ?? bp.outType,
        status: n.status ?? bp.status,
      };
    }),
  };
}

export function saveGeoGraph(graph: GeoGraph): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
  } catch {
    /* ignore */
  }
}

export function setNodeMuted(graph: GeoGraph, id: string, muted: boolean): GeoGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => (n.id === id ? { ...n, muted } : n)),
  };
}

export function setNodeParam(graph: GeoGraph, id: string, paramId: string, value: number): GeoGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === id
        ? {
            ...n,
            params: n.params.map((p) => (p.id === paramId ? { ...p, value } : p)),
          }
        : n,
    ),
  };
}

export function moveNode(graph: GeoGraph, id: string, x: number, y: number): GeoGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => (n.id === id ? { ...n, x: Math.round(x), y: Math.round(y) } : n)),
  };
}

const COMPILER_FEED: Record<string, string[]> = {
  machine: ["kernel"],
  kernel: ["cook"],
  cook: ["painter"],
  painter: [],
  score: ["kernel", "painter", "machine"],
};

export function canBind(from: GraphNode, to: GraphNode): boolean {
  if (from.id === to.id) return false;
  if (socketsCompatible(from.outType ?? "scalar", to.inType ?? "scalar")) return true;
  const a = compilerOf(from.id, from.organId);
  const b = compilerOf(to.id, to.organId);
  if (a === b) return true;
  return (COMPILER_FEED[a] ?? []).includes(b);
}

export function wouldCycle(graph: GeoGraph, from: string, to: string): boolean {
  if (from === to) return true;
  const outs = new Map<string, string[]>();
  for (const n of graph.nodes) outs.set(n.id, []);
  for (const l of graph.links) outs.get(l.from)?.push(l.to);
  outs.get(from)?.push(to);
  const seen = new Set<string>();
  const stack = [to];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === from) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const nxt of outs.get(id) || []) stack.push(nxt);
  }
  return false;
}

export function connectNodes(graph: GeoGraph, from: string, to: string): GeoGraph {
  const a = graph.nodes.find((n) => n.id === from);
  const b = graph.nodes.find((n) => n.id === to);
  if (!a || !b) return graph;
  if (graph.links.some((l) => l.from === from && l.to === to)) return graph;
  if (wouldCycle(graph, from, to)) return graph;
  if (!canBind(a, b)) return graph;
  const links = graph.links.filter((l) => !(l.from === from && l.to === to) && l.to !== to);
  return { ...graph, links: [...links, { from, to }] };
}

export function disconnectNodes(graph: GeoGraph, from: string, to: string): GeoGraph {
  return { ...graph, links: graph.links.filter((l) => !(l.from === from && l.to === to)) };
}

export function spawnNode(graph: GeoGraph, typeId: NodeTypeId, x: number, y: number, organId?: string): GeoGraph {
  const bp =
    (organId ? NODE_BLUEPRINTS.find((b) => b.organId === organId) : undefined) ??
    NODE_BLUEPRINTS.find((b) => b.typeId === typeId);
  if (!bp) return graph;
  const id = `${bp.idPrefix}-${Math.random().toString(36).slice(2, 7)}`;
  const node: GraphNode = {
    id,
    typeId: bp.typeId,
    class: bp.class,
    label: bp.label,
    organId: bp.organId,
    muted: bp.status !== "LIVE",
    x: Math.round(x),
    y: Math.round(y),
    params: bp.params.map((p) => ({ ...p })),
    element: bp.element,
    event: bp.event,
    inType: bp.inType,
    outType: bp.outType,
    status: bp.status,
  };
  return { ...graph, nodes: [...graph.nodes, node], selected: id };
}

export function spawnOrgan(graph: GeoGraph, organId: string, x: number, y: number): GeoGraph {
  const bp = NODE_BLUEPRINTS.find((b) => b.organId === organId);
  if (!bp) return graph;
  return spawnNode(graph, bp.typeId, x, y, organId);
}

export function removeNode(graph: GeoGraph, id: string): GeoGraph {
  if (id === graph.output || id === "identity") return graph;
  return {
    ...graph,
    nodes: graph.nodes.filter((n) => n.id !== id),
    links: graph.links.filter((l) => l.from !== id && l.to !== id),
    selected: graph.selected === id ? graph.output : graph.selected,
  };
}

export function applyGeoEvalToHost(graph: GeoGraph): void {
  const ev = publishGeoEval(evaluateGraph(graph));
  const host = globalThis as {
    __GASPER_SHOW_GRID__?: boolean;
    __GASPER_ORBIT_YAW__?: number;
    __GASPER_ORBIT_PITCH__?: number;
    __GASPER_LIVE_COEFFS__?: {
      scaffold?: { scaffoldCoupling?: number };
      wispwalker?: { footAmp?: number; cleftDepth?: number };
      cageLight?: Record<string, number>;
    };
    SidekickFormMasterRig?: { setOrbit?: (y: number, p: number) => void };
    __GASPER_VISCO_TAU__?: number;
    __GASPER_FACING_YAW__?: number;
    __GASPER_TAU_FIELD__?: { foot: number; waist: number; crown: number };
  };
  const byOrgan = (organId: string) => graph.nodes.find((n) => n.organId === organId || n.id === organId);
  const cage = ev.params.cage || ev.params["relief-1000"] || {};
  const gridNode = byOrgan("paint-grid");
  const gridOn = (cage.grid ?? gridNode?.params.find((p) => p.id === "show")?.value ?? 0) > 0.5;
  if (cage.grid !== undefined || gridNode) host.__GASPER_SHOW_GRID__ = gridOn && !ev.mute.cage && !gridNode?.muted;
  if (!host.__GASPER_LIVE_COEFFS__) host.__GASPER_LIVE_COEFFS__ = {};
  if (cage.coupling !== undefined) {
    host.__GASPER_LIVE_COEFFS__.scaffold = {
      ...(host.__GASPER_LIVE_COEFFS__.scaffold ?? {}),
      scaffoldCoupling: ev.mute.cage ? 0 : cage.coupling,
    };
  }
  const ident = ev.params.identity || ev.params["contour-512"] || {};
  if (!ev.mute.identity) {
    host.__GASPER_LIVE_COEFFS__.wispwalker = {
      ...(host.__GASPER_LIVE_COEFFS__.wispwalker ?? {}),
      ...(ident.footAmp !== undefined ? { footAmp: ident.footAmp } : {}),
      ...(ident.cleftDepth !== undefined ? { cleftDepth: ident.cleftDepth } : {}),
    };
  }
  const orbit = ev.params.orbit || {};
  if (!ev.mute.orbit && orbit.yaw !== undefined) {
    host.__GASPER_ORBIT_YAW__ = orbit.yaw;
    host.__GASPER_ORBIT_PITCH__ = orbit.pitch ?? 0;
    host.SidekickFormMasterRig?.setOrbit?.(orbit.yaw, orbit.pitch ?? 0);
  }
  const voigt = ev.params.voigt || {};
  if (!ev.mute.voigt && voigt.tau !== undefined) {
    host.__GASPER_VISCO_TAU__ = voigt.tau;
    const t = Number(voigt.tau);
    if (Number.isFinite(t)) {
      host.__GASPER_TAU_FIELD__ = {
        foot: Math.max(0.02, t * 0.55),
        waist: t,
        crown: Math.min(0.6, t * 2.4),
      };
    }
  }
  const facing = ev.params["radial-facing"] || {};
  if (facing.yaw !== undefined && !byOrgan("radial-facing")?.muted) host.__GASPER_FACING_YAW__ = facing.yaw;
  const light = ev.params["cage-light"] || ev.params.pearl || {};
  if (light.spec !== undefined) {
    if (!host.__GASPER_LIVE_COEFFS__.cageLight) host.__GASPER_LIVE_COEFFS__.cageLight = {};
    host.__GASPER_LIVE_COEFFS__.cageLight.light_spec = light.spec;
  }
}
