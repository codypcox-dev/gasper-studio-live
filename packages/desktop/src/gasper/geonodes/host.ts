import { defaultGeoGraph, isCookBlueprint, nodeFromBlueprint } from "./defaultGraph";

import { evaluateGraph, publishGeoEval } from "./evaluate";
import { LAYOUT_VERSION, arrangeGraph, resetLayout } from "./layout";
import { kahnOrder, sanitizeGraph, wouldCycleKahn, type WireResult } from "./topology";
import { lockReason, paramBase } from "./params";
import { NODE_BLUEPRINTS } from "./library";
import type { GeoGraph, GraphNode, NodeTypeId } from "./types";
import { GEONODES_SCHEMA, socketsCompatible } from "./types";
import { ensureCoupleLinks } from "./coupling";

const STORAGE_KEY = "gasper.geonodes.v5";

export function loadGeoGraph(): GeoGraph {
  if (typeof localStorage === "undefined") return defaultGeoGraph();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultGeoGraph();
    const parsed = JSON.parse(raw) as GeoGraph;
    if (parsed?.schema !== GEONODES_SCHEMA || !Array.isArray(parsed.nodes)) return defaultGeoGraph();
    return ensureCoupleLinks(ensureLayout(sanitizeGraph(hydrateMeta(mergeMissingOrgans(stripUiChrome(relayoutIfCollapsed(parsed)))))));

  } catch {
    return defaultGeoGraph();
  }
}

function ensureLayout(graph: GeoGraph): GeoGraph {
  if ((graph.layoutVersion ?? 0) < 17) return resetLayout(graph);
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

function stripUiChrome(graph: GeoGraph): GeoGraph {
  const nodes = graph.nodes.filter((n) => isCookBlueprint(n.organId || n.id, n.id));
  if (nodes.length === graph.nodes.length) return graph;
  return {
    ...graph,
    nodes,
    links: graph.links.filter((l) => nodes.some((n) => n.id === l.from) && nodes.some((n) => n.id === l.to)),
  };
}

function mergeMissingOrgans(graph: GeoGraph): GeoGraph {
  const have = new Set(graph.nodes.map((n) => n.organId || n.id));
  const extra: GraphNode[] = [];
  let col = 0;
  for (const bp of NODE_BLUEPRINTS) {
    if (!isCookBlueprint(bp.organId, bp.idPrefix)) continue;
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
      const params = bp.params.map((p) => {
        const cur = n.params.find((x) => x.id === p.id);
        const value = cur ? Math.max(p.min, Math.min(p.max, cur.value)) : p.value;
        return { ...p, value };
      });
      return {
        ...n,
        params,
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

export function setNodeMuted(graph: GeoGraph, id: string, muted: boolean, loose = false): GeoGraph {
  if (lockReason(id)) return graph;
  if (id === "identity" || id === "hull") return graph;
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === id ? { ...n, muted, loose: muted ? loose : false } : n,
    ),
  };
}

export function setNodeParam(graph: GeoGraph, id: string, paramId: string, value: number): GeoGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      if (n.id !== id) return n;
      const has = n.params.some((p) => p.id === paramId);
      return {
        ...n,
        params: has
          ? n.params.map((p) => (p.id === paramId ? { ...p, value } : p))
          : [...n.params, { id: paramId, label: paramId, min: 0, max: 1, step: 0.01, value }],
      };
    }),
  };
}

export function moveNode(graph: GeoGraph, id: string, x: number, y: number): GeoGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((n) => (n.id === id ? { ...n, x: Math.round(x), y: Math.round(y) } : n)),
  };
}

export function canBind(from: GraphNode, to: GraphNode): boolean {
  if (from.id === to.id) return false;
  return socketsCompatible(from.outType ?? "scalar", to.inType ?? "scalar");
}

export function wouldCycle(graph: GeoGraph, from: string, to: string): boolean {
  return wouldCycleKahn(graph, from, to);
}

export function tryConnect(graph: GeoGraph, from: string, to: string): WireResult {
  const a = graph.nodes.find((n) => n.id === from);
  const b = graph.nodes.find((n) => n.id === to);
  if (!a || !b) return { graph, ok: false, reason: "missing", detail: "Missing node" };
  if (from === to) return { graph, ok: false, reason: "self", detail: "A node cannot feed itself" };
  if (graph.links.some((l) => l.from === from && l.to === to)) {
    return { graph, ok: false, reason: "already", detail: "Already wired" };
  }
  if (!canBind(a, b)) {
    return { graph, ok: false, reason: "bind", detail: `${a.label} cannot bind to ${b.label}` };
  }
  if (wouldCycleKahn(graph, from, to)) {
    return { graph, ok: false, reason: "cycle", detail: `Cycle: ${a.label} cannot feed ${b.label}` };
  }
  const links = graph.links.filter((l) => !(l.to === to && !l.law));
  const next = { ...graph, links: [...links, { from, to }] };
  if (kahnOrder(next).cyclic) {
    return { graph, ok: false, reason: "cycle", detail: `Cycle: ${a.label} cannot feed ${b.label}` };
  }
  return { graph: next, ok: true, reason: "ok", detail: `${a.label} → ${b.label}` };
}

export function connectNodes(graph: GeoGraph, from: string, to: string): GeoGraph {
  return tryConnect(graph, from, to).graph;
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
    __GASPER_SHOW_SKELETON__?: boolean;
    __GASPER_ORBIT_YAW__?: number;
    __GASPER_ORBIT_PITCH__?: number;
    __GASPER_LIVE_COEFFS__?: {
      scaffold?: { scaffoldCoupling?: number };
      wispwalker?: { footAmp?: number; cleftDepth?: number };
      cageLight?: Record<string, number>;
      pearl?: Record<string, number>;
    };
    __GASPER_VISCO_TAU__?: number;
    __GASPER_FACING_YAW__?: number;
    __GASPER_GAIT_HZ__?: number;
    __GASPER_GAIT_DRIVE__?: number;
    __GASPER_HANDLE_LIFT__?: number;
    __GASPER_HANDLE_ADVANCE__?: number;
    __GASPER_HANDLE_STRETCH__?: number;
    __GASPER_GAIT_TEMPO__?: number;
    __GASPER_SUPPORT_K__?: number;
    __GASPER_VISCO_TAU_REST__?: number;
    __GASPER_NORTHSTAR_PLAY__?: number;
    __GASPER_MACHINE_GATE__?: number;
    __GASPER_TAU_FIELD__?: { foot: number; waist: number; crown: number };
    SidekickFormMasterRig?: {
      setOrbit?: (y: number, p: number) => void;
      setYaw?: (y: number) => void;
      setEnvelopeVec?: (v: { rScale?: number; collapsePlants?: number; torsoHook?: number }) => void;
    };
  };
  const byOrgan = (organId: string) => graph.nodes.find((n) => n.organId === organId || n.id === organId);
  const baseOf = (organId: string, paramId: string): number | undefined => {
    const p = byOrgan(organId)?.params.find((x) => x.id === paramId);
    return p ? paramBase(p) : undefined;
  };
  const liveOrBase = (muted: boolean, organId: string, paramId: string, live: number | undefined): number | undefined => {
    if (live === undefined) return undefined;
    return muted ? (baseOf(organId, paramId) ?? live) : live;
  };
  const cage = ev.params.cage || ev.params["relief-1000"] || {};
  const gridNode = byOrgan("paint-grid");
  const gridOn = (cage.grid ?? gridNode?.params.find((p) => p.id === "show")?.value ?? 0) > 0.5;
  if (cage.grid !== undefined || gridNode) host.__GASPER_SHOW_GRID__ = gridOn && !ev.mute.cage;
  if (!host.__GASPER_LIVE_COEFFS__) host.__GASPER_LIVE_COEFFS__ = {};
  if (cage.coupling !== undefined) {
    const coupling = liveOrBase(!!ev.mute.cage, "cage", "coupling", cage.coupling);
    host.__GASPER_LIVE_COEFFS__.scaffold = {
      ...(host.__GASPER_LIVE_COEFFS__.scaffold ?? {}),
      scaffoldCoupling: coupling,
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
    host.SidekickFormMasterRig?.setYaw?.(orbit.yaw);
  } else if (ev.mute.orbit) {
    const yaw = baseOf("orbit", "yaw");
    const pitch = baseOf("orbit", "pitch") ?? 0;
    if (yaw !== undefined) {
      host.__GASPER_ORBIT_YAW__ = yaw;
      host.__GASPER_ORBIT_PITCH__ = pitch;
      host.SidekickFormMasterRig?.setOrbit?.(yaw, pitch);
      host.SidekickFormMasterRig?.setYaw?.(yaw);
    }
  } else if (!ev.mute["radial-facing"] && ev.params["radial-facing"]?.yaw !== undefined) {
    host.SidekickFormMasterRig?.setYaw?.(ev.params["radial-facing"].yaw);
  }
  const voigt = ev.params.voigt || {};
  if (!ev.mute.voigt && voigt.tau !== undefined) {
    host.__GASPER_VISCO_TAU__ = voigt.tau;
    const t = Number(voigt.tau);
    if (Number.isFinite(t)) {
      const foot = Number(voigt.foot);
      const waist = Number(voigt.waist);
      const crown = Number(voigt.crown);
      host.__GASPER_TAU_FIELD__ = {
        foot: Number.isFinite(foot) ? Math.max(0.02, foot) : Math.max(0.02, t * 0.55),
        waist: Number.isFinite(waist) ? Math.max(0.02, waist) : t,
        crown: Number.isFinite(crown) ? Math.min(0.6, crown) : Math.min(0.6, t * 2.4),
      };
    }
  }
  if (!ev.mute.voigt && voigt.rest !== undefined) host.__GASPER_VISCO_TAU_REST__ = voigt.rest;
  const support = ev.params.support || {};
  if (!ev.mute.support && support.k !== undefined) host.__GASPER_SUPPORT_K__ = support.k;
  const machine = ev.params.machine || {};
  if (machine.gate !== undefined) {
    host.__GASPER_MACHINE_GATE__ = liveOrBase(!!ev.mute.machine, "machine", "gate", machine.gate);
  }
  const ns = ev.params["northstar-20"] || {};
  if (ns.play !== undefined) host.__GASPER_NORTHSTAR_PLAY__ = ev.mute["northstar-20"] ? 0 : ns.play;
  const gait = ev.params.gait || ev.params["gait-law"] || {};
  if (!ev.mute.gait && (gait.live === undefined || gait.live > 0.5) && gait.hz !== undefined) {
    host.__GASPER_GAIT_HZ__ = gait.hz;
  }
  if (!ev.mute.gait && gait.drive !== undefined) host.__GASPER_GAIT_DRIVE__ = gait.drive;
  const facing = ev.params["radial-facing"] || {};
  if (facing.yaw !== undefined && !byOrgan("radial-facing")?.muted) host.__GASPER_FACING_YAW__ = facing.yaw;
  const light = ev.params["cage-light"] || ev.params.pearl || {};
  if (!host.__GASPER_LIVE_COEFFS__.cageLight) host.__GASPER_LIVE_COEFFS__.cageLight = {};
  if (light.spec !== undefined) {
    host.__GASPER_LIVE_COEFFS__.cageLight.light_spec = liveOrBase(!!ev.mute["cage-light"], "cage-light", "spec", light.spec) ?? 0;
  }
  if (light.wrap !== undefined) {
    host.__GASPER_LIVE_COEFFS__.cageLight.light_wrap = liveOrBase(!!ev.mute["cage-light"], "cage-light", "wrap", light.wrap) ?? 0;
  }
  if (light.keyAz !== undefined) {
    host.__GASPER_LIVE_COEFFS__.cageLight.key_az = liveOrBase(!!ev.mute["cage-light"], "cage-light", "keyAz", light.keyAz) ?? 0;
  }
  if (light.keyEl !== undefined) {
    host.__GASPER_LIVE_COEFFS__.cageLight.key_el = liveOrBase(!!ev.mute["cage-light"], "cage-light", "keyEl", light.keyEl) ?? 0;
  }
  const pearl = ev.params.pearl || {};
  if (pearl.depth !== undefined) {
    const depth = liveOrBase(!!ev.mute.pearl, "pearl", "depth", pearl.depth);
    host.__GASPER_LIVE_COEFFS__.pearl = { ...(host.__GASPER_LIVE_COEFFS__.pearl ?? {}), depth };
  }
  const handles = ev.params.handles || ev.params.stance || {};
  if (handles.lift !== undefined) host.__GASPER_HANDLE_LIFT__ = liveOrBase(!!ev.mute.handles, "handles", "lift", handles.lift);
  if (handles.advance !== undefined) host.__GASPER_HANDLE_ADVANCE__ = liveOrBase(!!ev.mute.handles, "handles", "advance", handles.advance);
  if (handles.stretch !== undefined) host.__GASPER_HANDLE_STRETCH__ = liveOrBase(!!ev.mute.handles, "handles", "stretch", handles.stretch);
  const env = ev.params.envelope || {};
  if (!ev.mute.envelope) {
    const rScale = env.rScale;
    const collapse = env.collapse;
    const hook = env.hook;
    if (rScale !== undefined || collapse !== undefined || hook !== undefined) {
      host.SidekickFormMasterRig?.setEnvelopeVec?.({
        rScale: Number.isFinite(Number(rScale)) ? Number(rScale) : 1,
        collapsePlants: Number.isFinite(Number(collapse)) ? Number(collapse) : 0,
        torsoHook: Number.isFinite(Number(hook)) ? Number(hook) : 0,
      });
    }
    if (env.bones !== undefined) host.__GASPER_SHOW_SKELETON__ = Number(env.bones) > 0.5;
  } else {
    host.SidekickFormMasterRig?.setEnvelopeVec?.({ rScale: 1, collapsePlants: 0, torsoHook: 0 });
    host.__GASPER_SHOW_SKELETON__ = false;
  }
  const world = ev.params["world-driver"] || {};
  if (world.gate !== undefined) host.__GASPER_GAIT_TEMPO__ = liveOrBase(!!ev.mute["world-driver"], "world-driver", "gate", world.gate);
}
