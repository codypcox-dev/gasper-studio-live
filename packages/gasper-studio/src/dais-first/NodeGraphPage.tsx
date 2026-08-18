/**
 * Nodes canvas — colored boxes of what is cooking. Gasper is a draggable
 * picture-in-picture. Photoshop undo/redo on the graph.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactElement, type WheelEvent as ReactWheelEvent } from "react";
import { createPortal } from "react-dom";
import { dispatchField } from "../../../desktop/src/gasper/scaffold/GasperFieldApi";
import { playNorthstarTwentyFromRail } from "./daisFirstControls";
import {
  BROWSER_CATS,
  PILLARS,
  COMPILER_BUS,
  COMPILER_PILLARS,
  isStageNode,
  isLiveNode,
  canBind,
  cookTrace,
  compilerColumns,
  compilerOf,
  columnAt,
  feedOf,
  railOf,
  setRack,
  snap,
  magnetizeCard,
  applyGeoEvalToHost,
  arrangeGraph,
  resetLayout,
  belongsToPillar,
  browserCat,
  cloneGraph,
  connectNodes,
  disconnectNodes,
  emptyHistory,
  graphBounds,
  loadGeoGraph,
  moveNode,
  pushPast,
  redoGraph,
  saveGeoGraph,
  seatOf,
  setNodeMuted,
  setNodeParam,
  undoGraph,
  tryConnect,
  lockReason,
  sliderT,
  fromSliderT,
  isBinaryParam,
  evaluateGraph,
  lawsFor,
  tipForNode,
  tipForParam,
  tipForPillar,
  tipForUi,
  type GeoGraph,
  type GraphHistory,
  type PillarId,
} from "../../../desktop/src/gasper/geonodes";

const CARD_W = 156;
let HIST = emptyHistory();
const MONITOR_KEY = "gasper.monitor.v3";
const BAR = 28;
const TLINE = 36;

type Monitor = { x: number; y: number; w: number; h: number };

function loadMonitor(): Monitor {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  const fallback = { x: Math.max(24, vw - 340), y: 16, w: 300, h: 380 };
  try {
    const raw = localStorage.getItem(MONITOR_KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Monitor;
    if (p.w < 180 || p.h < 200 || p.w > vw * 0.48 || p.h > vh * 0.72) return fallback;
    return { x: Math.max(8, p.x), y: Math.max(8, p.y), w: p.w, h: p.h };
  } catch {
    return fallback;
  }
}

function dockStage(mon: Monitor): void {
  const host = document.querySelector('[data-testid="dais-first-stage-host"]') as HTMLElement | null;
  const product = document.querySelector('[data-product="gasper-studio"]') as HTMLElement | null;
  const stage = document.querySelector('[data-testid="integrated-gasper-stage"]') as HTMLElement | null;
  host?.setAttribute("data-graph-page", "1");
  product?.setAttribute("data-graph-page", "1");
  if (host) {
    host.style.setProperty("--monitor-x", `${mon.x}px`);
    host.style.setProperty("--monitor-y", `${mon.y}px`);
    host.style.setProperty("--monitor-w", `${mon.w}px`);
    host.style.setProperty("--monitor-h", `${mon.h}px`);
    host.style.setProperty("--monitor-tl", `${TLINE}px`);
  }
  if (stage) {
    stage.style.position = "fixed";
    stage.style.left = `${mon.x}px`;
    stage.style.top = `${mon.y + BAR}px`;
    stage.style.right = "auto";
    stage.style.width = `${mon.w}px`;
    stage.style.height = `${mon.h - BAR - TLINE}px`;
    stage.style.zIndex = "78";
    stage.style.maxWidth = `${mon.w}px`;
    stage.style.maxHeight = `${mon.h - BAR - TLINE}px`;
  }
}

function releaseStage(): void {
  const stage = document.querySelector('[data-testid="integrated-gasper-stage"]') as HTMLElement | null;
  if (stage) {
    for (const k of ["position", "left", "top", "right", "width", "height", "z-index", "max-width", "max-height"]) {
      stage.style.removeProperty(k);
    }
  }
  document.querySelectorAll("[data-graph-page]").forEach((el) => el.setAttribute("data-graph-page", "0"));
}

type Drag =
  | { kind: "card"; id: string; ox: number; oy: number }
  | { kind: "wire"; from: string; x: number; y: number }
  | { kind: "pan"; ox: number; oy: number; vx: number; vy: number }
  | { kind: "monitor"; ox: number; oy: number; mx: number; my: number }
  | { kind: "resize"; ox: number; oy: number; mw: number; mh: number }
  | { kind: "rack"; id: PillarId; ox: number; oy: number; mx: number; my: number }
  | { kind: "rack-resize"; id: PillarId; ox: number; oy: number; mw: number; mh: number }
  | { kind: "chip"; id: string }
  | null;

function tintOf(id: string, organId?: string): string {
  const p = PILLARS.find((x) => x.id === compilerOf(id, organId));
  return p?.tint ?? "#8a8680";
}

function wirePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.max(40, Math.abs(x2 - x1) * 0.45);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export function NodeGraphPage(): ReactElement {
  const boardRef = useRef<HTMLDivElement>(null);
  const hist = useRef<GraphHistory>(HIST);
  const dragSnap = useRef<GeoGraph | null>(null);
  const [graph, setGraph] = useState<GeoGraph>(() => resetLayout(loadGeoGraph()));
  const [drag, setDrag] = useState<Drag>(null);
  const dragRef = useRef<Drag>(null);
  dragRef.current = drag;
  const [view, setView] = useState({ x: 20, y: 28, k: 0.72 });
  const [cat, setCat] = useState<(typeof BROWSER_CATS)[number]["id"] | "all">("all");
  const [mon, setMon] = useState<Monitor>(() => loadMonitor());
  const [wireNote, setWireNote] = useState("Empty-drag pans · click a card · Esc clears");
  const [alert, setAlert] = useState<string | null>(null);
  const [hoverCol, setHoverCol] = useState<string | null>(null);
  const [gridOn, setGridOn] = useState(true);
  const [clock, setClock] = useState({ t: 0, dur: 1, mode: "gait" as "gait" | "take" });
  const playArmed = useRef(false);

  const commit = useCallback((next: GeoGraph | ((g: GeoGraph) => GeoGraph)) => {
    setGraph((g) => {
      HIST = hist.current = pushPast(hist.current, g);
      return typeof next === "function" ? next(g) : next;
    });
  }, []);

  const undo = useCallback(() => {
    setGraph((g) => {
      const r = undoGraph(hist.current, g);
      if (!r) return g;
      HIST = hist.current = r.history;
      return r.graph;
    });
  }, []);

  const redo = useCallback(() => {
    setGraph((g) => {
      const r = redoGraph(hist.current, g);
      if (!r) return g;
      HIST = hist.current = r.history;
      return r.graph;
    });
  }, []);

  useEffect(() => {
    if ((graph.layoutVersion ?? 0) < 18) {
      setGraph(resetLayout(graph));
      return;
    }
    applyGeoEvalToHost(graph);
    saveGeoGraph(graph);
    const ns = graph.nodes.find((n) => n.id === "northstar-20");
    const play = !!ns && !ns.muted && (ns.params.find((p) => p.id === "play")?.value ?? 0) > 0.5;
    if (play && !playArmed.current) {
      playArmed.current = true;
      playNorthstarTwentyFromRail();
    }
    if (!play) playArmed.current = false;
    const cage = graph.nodes.find((n) => n.id === "cage");
    const g = (cage?.params.find((p) => p.id === "grid")?.value ?? 0) > 0.5;
    setGridOn(g);
  }, [graph]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const host = globalThis as { __GASPER_TAKE_T0__?: number };
      const av = document.querySelector("#avatar") as HTMLElement | null;
      const t0 = Number(host.__GASPER_TAKE_T0__);
      if (Number.isFinite(t0) && t0 > 0) {
        const dur = 20000;
        const t = ((performance.now() - t0) % dur + dur) % dur;
        setClock({ t, dur, mode: "take" });
      } else {
        const phase = Number(av?.dataset.gaitPhase ?? 0);
        setClock({ t: ((phase % 1) + 1) % 1, dur: 1, mode: "gait" });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    dockStage(mon);
    try {
      localStorage.setItem(MONITOR_KEY, JSON.stringify(mon));
    } catch {
      /* ignore */
    }
  }, [mon]);

  useEffect(() => {
    dockStage(mon);
    return () => releaseStage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(() => graph.nodes.find((n) => n.id === graph.selected) ?? null, [graph]);
  const stage = useMemo(() => graph.nodes.filter(isStageNode), [graph]);
  const unused = useMemo(() => graph.nodes.filter((n) => !isStageNode(n)), [graph]);
  const unusedShown = useMemo(
    () => unused.filter((n) => cat === "all" || browserCat(n) === cat),
    [unused, cat],
  );
  const cook = useMemo(() => cookTrace(graph), [graph]);
  const rankOf = useMemo(() => new Map(cook.steps.map((s) => [s.id, s])), [cook]);
  const [cookAt, setCookAt] = useState<string | null>(null);
  const cookTimer = useRef<number | null>(null);

  const playCook = useCallback(() => {
    const steps = cookTrace(graph).steps;
    if (cookTimer.current) window.clearInterval(cookTimer.current);
    if (steps.length === 0) return;
    let i = 0;
    setCookAt(steps[0]!.id);
    setWireNote(cook.cyclic ? "Cycle — cook incomplete" : `1. ${steps[0]!.label}`);
    cookTimer.current = window.setInterval(() => {
      i += 1;
      if (i >= steps.length) {
        if (cookTimer.current) window.clearInterval(cookTimer.current);
        cookTimer.current = null;
        setCookAt(null);
        setWireNote(`Cooked ${steps.length} · Kahn DAG`);
        return;
      }
      const s = steps[i]!;
      setCookAt(s.id);
      setWireNote(`${s.rank}. ${s.label} · wave ${s.wave}`);
    }, 150);
  }, [graph, cook.cyclic]);

  useEffect(() => () => {
    if (cookTimer.current) window.clearInterval(cookTimer.current);
  }, []);

  const toBoard = useCallback((clientX: number, clientY: number) => {
    const r = boardRef.current?.getBoundingClientRect();
    return {
      x: (clientX - (r?.left ?? 0) - view.x) / view.k,
      y: (clientY - (r?.top ?? 0) - view.y) / view.k,
    };
  }, [view]);

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const r = boardRef.current?.getBoundingClientRect();
    const lx = clientX - (r?.left ?? 0);
    const ly = clientY - (r?.top ?? 0);
    const wx = (lx - view.x) / view.k;
    const wy = (ly - view.y) / view.k;
    const k = Math.min(2.4, Math.max(0.28, view.k * factor));
    setView({ k, x: lx - wx * k, y: ly - wy * k });
  }, [view]);

  const fitView = useCallback(() => {
    const r = boardRef.current?.getBoundingClientRect();
    const b = graphBounds(graph);
    const bw = Math.max(160, (r?.width ?? 900) - 48);
    const bh = Math.max(120, (r?.height ?? 280) - 36);
    const gw = Math.max(1, b.maxX - b.minX);
    const gh = Math.max(1, b.maxY - b.minY);
    const k = Math.min(1.05, bw / gw, bh / gh);
    setView({
      k,
      x: 24 + (bw - gw * k) / 2 - b.minX * k,
      y: 20 + (bh - gh * k) / 2 - b.minY * k,
    });
  }, [graph]);

  useEffect(() => {
    const t = window.setTimeout(fitView, 60);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (e.key === "Undo" || (cmd && (e.key.toLowerCase() === "z" || e.code === "KeyZ") && !e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        undo();
        return;
      }
      if (e.key === "Redo" || (cmd && (e.key.toLowerCase() === "z" || e.code === "KeyZ") && e.shiftKey) || (cmd && (e.key.toLowerCase() === "y" || e.code === "KeyY"))) {
        e.preventDefault();
        e.stopPropagation();
        redo();
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.isContentEditable || (t.tagName === "INPUT" && (t as HTMLInputElement).type !== "range"))) return;
      if (cmd && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        const r = boardRef.current?.getBoundingClientRect();
        zoomAt((r?.left ?? 0) + (r?.width ?? 0) / 2, (r?.top ?? 0) + (r?.height ?? 0) / 2, 1.12);
        return;
      }
      if (cmd && e.key === "-") {
        e.preventDefault();
        const r = boardRef.current?.getBoundingClientRect();
        zoomAt((r?.left ?? 0) + (r?.width ?? 0) / 2, (r?.top ?? 0) + (r?.height ?? 0) / 2, 1 / 1.12);
        return;
      }
      if (cmd && e.key === "0") {
        e.preventDefault();
        fitView();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setGraph((g) => ({ ...g, selected: null }));
        setWireNote("Cleared");
        return;
      }
      if (!cmd && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        fitView();
        setWireNote("Fit");
        return;
      }
      if (!cmd && e.key >= "1" && e.key <= "5") {
        const id = COMPILER_PILLARS[Number(e.key) - 1];
        const first = graph.nodes.find((n) => isLiveNode(n) && compilerOf(n.id, n.organId) === id);
        if (first) {
          e.preventDefault();
          setGraph((g) => ({ ...g, selected: first.id }));
          setWireNote(`${first.label} · ${id}`);
        }
        return;
      }
      if ((e.key === "Backspace" || e.key === "Delete") && selected && selected.id !== "identity" && selected.id !== "hull") {
        e.preventDefault();
        commit((g) => arrangeGraph(setNodeMuted(g, selected.id, true)));
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [undo, redo, zoomAt, fitView, selected, commit, graph.nodes]);

  const onCardDown = useCallback((e: ReactPointerEvent, id: string) => {
    if ((e.target as HTMLElement).closest("[data-port],[data-dial],button,input")) return;
    e.preventDefault();
    e.stopPropagation();
    const n = graph.nodes.find((x) => x.id === id);
    if (!n) return;
    dragSnap.current = cloneGraph(graph);
    const p = toBoard(e.clientX, e.clientY);
    const next: Drag = { kind: "card", id, ox: p.x - n.x, oy: p.y - n.y };
    dragRef.current = next;
    setGraph((g) => ({ ...g, selected: id }));
    setDrag(next);
  }, [graph, toBoard]);

  const onPortDown = useCallback((e: ReactPointerEvent, id: string, side: "in" | "out") => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = toBoard(e.clientX, e.clientY);
    if (side === "out") setDrag({ kind: "wire", from: id, x: p.x, y: p.y });
    else {
      const incoming = graph.links.find((l) => l.to === id);
      if (incoming) {
        commit((g) => disconnectNodes(g, incoming.from, incoming.to));
        setDrag({ kind: "wire", from: incoming.from, x: p.x, y: p.y });
      }
    }
  }, [graph.links, toBoard, commit]);

  const onBoardDown = useCallback((e: ReactPointerEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest(".node-card, .compiler-col__drag, .compiler-col__resize, .node-graph-page__zoom, .cook-strip, .node-graph-alert, button, input, [data-port], [data-dial]")) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const next: Drag = { kind: "pan", ox: e.clientX, oy: e.clientY, vx: view.x, vy: view.y };
    dragRef.current = next;
    setDrag(next);
    setGraph((g) => ({ ...g, selected: null }));
  }, [view.x, view.y]);

  const onMove = useCallback((e: ReactPointerEvent) => {
    if (!drag) return;
    if (drag.kind === "card") {
      const p = toBoard(e.clientX, e.clientY);
      setGraph((g) => moveNode(g, drag.id, p.x - drag.ox, p.y - drag.oy));
      const col = columnAt(graph, p.x, p.y);
      setHoverCol(col?.id ?? null);
    } else if (drag.kind === "wire") {
      const p = toBoard(e.clientX, e.clientY);
      setDrag({ ...drag, x: p.x, y: p.y });
    } else if (drag.kind === "pan") {
      setView((v) => ({ ...v, x: drag.vx + (e.clientX - drag.ox), y: drag.vy + (e.clientY - drag.oy) }));
    } else if (drag.kind === "monitor") {
      setMon((m) => ({
        ...m,
        x: Math.max(8, drag.mx + (e.clientX - drag.ox)),
        y: Math.max(8, drag.my + (e.clientY - drag.oy)),
      }));
    } else if (drag.kind === "resize") {
      setMon((m) => ({
        ...m,
        w: Math.max(200, Math.min(560, drag.mw + (e.clientX - drag.ox))),
        h: Math.max(240, Math.min(640, drag.mh + (e.clientY - drag.oy))),
      }));
    } else if (drag.kind === "rack") {
      const p = toBoard(e.clientX, e.clientY);
      setGraph((g) => setRack(g, drag.id, { x: Math.round(p.x - drag.ox), y: Math.round(p.y - drag.oy) }));
    } else if (drag.kind === "rack-resize") {
      const p = toBoard(e.clientX, e.clientY);
      setGraph((g) => setRack(g, drag.id, {
        w: Math.round(drag.mw + (p.x - drag.ox)),
        h: Math.round(drag.mh + (p.y - drag.oy)),
      }));
    }
  }, [drag, toBoard]);

  const onUp = useCallback((e: ReactPointerEvent) => {
    const dragNow = dragRef.current;
    dragRef.current = null;
    setHoverCol(null);
    if (!dragNow) {
      setDrag(null);
      return;
    }
    if (dragNow.kind === "wire") {
      const hit = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      let to = hit?.closest("[data-port='in']")?.getAttribute("data-node") ?? null;
      if (!to) {
        let best = 36;
        for (const el of document.querySelectorAll<HTMLElement>("[data-port='in']")) {
          const id = el.getAttribute("data-node");
          if (!id || id === dragNow.from) continue;
          const r = el.getBoundingClientRect();
          const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
          if (d < best) {
            best = d;
            to = id;
          }
        }
      }
      if (to && to !== dragNow.from) {
        setGraph((g) => {
          const r = tryConnect(g, dragNow.from, to!);
          setWireNote(r.detail);
          if (!r.ok) return g;
          HIST = hist.current = pushPast(hist.current, g);
          return r.graph;
        });
      } else {
        setWireNote("No port");
      }
    }
    if (dragNow.kind === "card") {
      const n = graph.nodes.find((x) => x.id === dragNow.id);
      if (n && n.id !== "identity" && n.id !== "hull") {
        const mag = magnetizeCard(graph, n.id, n.x, n.y);
        if (!mag.seated) {
          commit((g) => ({
            ...g,
            nodes: g.nodes.map((node) =>
              node.id === n.id ? { ...node, muted: true, loose: true, x: Math.round(n.x), y: Math.round(n.y) } : node,
            ),
          }));
          setWireNote(`${n.label} off`);
          dragSnap.current = null;
          setDrag(null);
          return;
        }
        commit((g) => arrangeGraph(setNodeMuted({
          ...g,
          nodes: g.nodes.map((node) => (node.id === n.id ? { ...node, x: mag.x, y: mag.y } : node)),
        }, n.id, false)));
        setWireNote(`${n.label} on`);
      } else if (n) {
        commit((g) => arrangeGraph(g));
      }
      if (dragSnap.current) {
        HIST = hist.current = pushPast(hist.current, dragSnap.current);
        dragSnap.current = null;
      }
    }
    if (dragNow.kind === "chip") {
      const p = toBoard(e.clientX, e.clientY);
      const col = columnAt(graph, p.x, p.y);
      const n = graph.nodes.find((x) => x.id === dragNow.id);
      if (col && n && compilerOf(n.id, n.organId) === col.id) {
        commit((g) => arrangeGraph({ ...setNodeMuted(g, n.id, false), selected: n.id }));
        setWireNote(`${n.label} on`);
      }
    }
    setDrag(null);
  }, [commit, graph, toBoard]);

  const onWheel = useCallback((e: ReactWheelEvent) => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.08 : 1 / 1.08);
  }, [zoomAt]);

  const mute = useCallback((id: string) => {
    const why = lockReason(id);
    if (why) {
      setAlert(why);
      setWireNote(why);
      return;
    }
    commit((g) => arrangeGraph(setNodeMuted(g, id, true)));
  }, [commit]);

  const activate = useCallback((id: string) => {
    const n = graph.nodes.find((x) => x.id === id);
    if (!n) return;
    if (cat !== "all" && cat !== "unhooked" && cat !== "dead" && !belongsToPillar(seatOf(n.id, n.organId), cat)) return;
    commit((g) => arrangeGraph({ ...setNodeMuted(g, id, false), selected: id }));
  }, [cat, graph.nodes, commit]);

  const param = useCallback((id: string, pid: string, value: number) => {
    setGraph((g) => setNodeParam(g, id, pid, value));
  }, []);

  return (
    <div className="node-graph-page node-graph-page--stage" data-testid="node-graph-page" onPointerMove={onMove} onPointerUp={onUp}>
      <div
        ref={boardRef}
        className="node-graph-page__board"
        data-testid="node-graph-board"
        onPointerDown={onBoardDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onWheel={onWheel}
      >
        <div className="node-graph-page__dots" data-graph-bg="1" />
        <div className="node-graph-page__zoom" data-testid="node-graph-zoom">
          <button type="button" onClick={() => zoomAt((boardRef.current?.getBoundingClientRect().left ?? 0) + 240, (boardRef.current?.getBoundingClientRect().top ?? 0) + 80, 1 / 1.12)} aria-label="Zoom out" title={tipForUi("zoomOut")}>−</button>
          <button type="button" onClick={fitView} data-testid="node-graph-fit" title={tipForUi("fit")}>{Math.round(view.k * 100)}%</button>
          <button type="button" onClick={() => zoomAt((boardRef.current?.getBoundingClientRect().left ?? 0) + 240, (boardRef.current?.getBoundingClientRect().top ?? 0) + 80, 1.12)} aria-label="Zoom in" title={tipForUi("zoomIn")}>+</button>
          <button type="button" onClick={() => { commit((g) => resetLayout(g)); playCook(); }} data-testid="node-graph-arrange" title={tipForUi("compile")}>Reset</button>
          <button type="button" data-testid="node-graph-cook" onClick={playCook} title={tipForUi("cook")}>Cook</button>
          <button type="button" data-testid="node-graph-undo" onClick={undo} title={tipForUi("undo")}>Undo</button>
          <button type="button" data-testid="node-graph-redo" onClick={redo} title={tipForUi("redo")}>Redo</button>
          <span className="node-graph-page__note" data-testid="node-graph-wire-note">{wireNote}</span>
        </div>
        {alert ? (
          <div className="node-graph-alert" data-testid="node-graph-alert" role="alert">
            {alert}
            <button type="button" onClick={() => setAlert(null)}>ok</button>
          </div>
        ) : null}
        <div className="node-graph-page__world" data-graph-bg="1" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: "0 0" }}>
          <div className="node-graph-page__boxes" aria-hidden="true">
            {compilerColumns(graph).map((col, i) => {
              const p = PILLARS.find((x) => x.id === col.id);
              if (!p) return null;
              const live = stage.some((n) => compilerOf(n.id, n.organId) === col.id);
              return (
                <div
                  key={p.id}
                  className="compiler-col"
                  data-pillar={p.id}
                  data-live={live ? "1" : "0"}
                  data-drop={hoverCol === p.id ? "1" : "0"}
                  data-testid={`pillar-box-${p.id}`}
                  title={tipForPillar(p.id)}
                  data-tip={tipForPillar(p.id)}
                  style={{
                    left: col.x,
                    top: col.y,
                    width: col.w,
                    height: col.h,
                    ["--box-tint" as string]: p.tint,
                  }}
                >
                  <strong>{p.label}</strong>
                  <em>{p.law}</em>
                </div>
              );
            })}
          </div>
          <svg className="node-graph-page__wires" data-testid="node-graph-wires">
            <defs>
              <marker id="bus-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#d8c9a4" />
              </marker>
            </defs>
            {compilerColumns(graph).map((col) => {
              const rail = railOf(col);
              return (
                <g key={`rail-${col.id}`} className="compiler-rail" data-pillar={col.id}>
                  <circle cx={rail.left} cy={rail.headY} r={7} className="compiler-rail__master" data-port="col-in" />
                  <circle cx={rail.right} cy={rail.headY} r={7} className="compiler-rail__master" data-port="col-out" />
                </g>
              );
            })}
            {COMPILER_BUS.filter((bus) => bus.from !== "score").map((bus) => {
              const cols = compilerColumns(graph);
              const a = cols.find((c) => c.id === bus.from);
              const b = cols.find((c) => c.id === bus.to);
              if (!a || !b) return null;
              const ra = railOf(a);
              const rb = railOf(b);
              const reverse = rb.left < ra.right;
              const y1 = ra.headY;
              const y2 = reverse ? rb.headY - 26 : rb.headY;
              const lift = reverse ? Math.min(110, Math.abs(rb.left - ra.right) * 0.2) : 16;
              const d = reverse
                ? `M ${ra.right} ${y1} C ${ra.right} ${y1 - lift}, ${rb.left} ${y2 - lift}, ${rb.left} ${y2}`
                : wirePath(ra.right, y1, rb.left, y2);
              const midX = (ra.right + rb.left) / 2;
              const midY = reverse ? y1 - lift * 0.55 : y1 - 16;
              return (
                <g key={`${bus.from}-${bus.to}`} className="compiler-bus" data-testid={`compiler-bus-${bus.from}-${bus.to}`}>
                  <title>{tipForUi(bus.from === "machine" ? "busMayI" : bus.from === "kernel" ? "busMass" : bus.from === "cook" ? "busSil" : bus.from === "painter" ? "busFrame" : "busAgain")}</title>
                  <path d={d} className="compiler-bus__glow" />
                  <path d={d} className="node-graph-page__wire compiler-bus__wire" data-bus="1" markerEnd="url(#bus-arrow)" />
                  <rect x={midX - 40} y={midY - 9} width={80} height={18} rx={9} className="compiler-bus__pill" />
                  <text x={midX} y={midY + 4} className="compiler-bus__label">{bus.step} · {bus.label}</text>
                </g>
              );
            })}
            {graph.links.filter((l) => graph.selected === l.from || graph.selected === l.to).map((l) => {
              const a = stage.find((n) => n.id === l.from);
              const b = stage.find((n) => n.id === l.to);
              if (!a || !b) return null;
              return (
                <g key={`${l.from}-${l.to}`}>
                  <path d={wirePath(a.x + CARD_W, a.y + 26, b.x, b.y + 26)} className="node-graph-page__hit" onPointerDown={(e) => {
                    e.stopPropagation();
                    commit((g) => disconnectNodes(g, l.from, l.to));
                  }} />
                  <path d={wirePath(a.x + CARD_W, a.y + 26, b.x, b.y + 26)} className="node-graph-page__wire" data-socket={a.outType ?? "scalar"} />
                </g>
              );
            })}
            {drag?.kind === "wire" ? (() => {
              const a = stage.find((n) => n.id === drag.from);
              if (!a) return null;
              return <path d={wirePath(a.x + CARD_W, a.y + 26, drag.x, drag.y)} className="node-graph-page__wire" data-ghost="1" />;
            })() : null}
          </svg>
          {stage.slice().sort((a, b) => a.x - b.x).map((n) => (
            <article
              key={n.id}
              className="node-card node-card--line"
              title={tipForNode(n)}
              data-tip={tipForNode(n)}
              data-selected={graph.selected === n.id ? "1" : "0"}
              data-testid={`node-card-${n.id}`}
              data-cook={cookAt === n.id ? "hot" : rankOf.has(n.id) ? "live" : "off"}
              data-feed={n.muted ? "off" : feedOf(graph, n.id).outToNode || feedOf(graph, n.id).inFromNode ? "node" : "column"}
              data-loose={n.loose ? "1" : "0"}
              data-pillar={compilerOf(n.id, n.organId)}
              data-wire-ok={drag?.kind === "wire" && drag.from !== n.id && (() => {
                const a = graph.nodes.find((x) => x.id === drag.from);
                return a && canBind(a, n) ? "1" : "0";
              })()}
              style={{ left: n.x, top: n.y, width: CARD_W, height: 88, ["--box-tint" as string]: tintOf(n.id, n.organId) }}
              onPointerDown={(e) => onCardDown(e, n.id)}
            >
              <i className="node-card__band" aria-hidden="true" />
              <button type="button" className="node-card__port node-card__port--in" data-port="in" data-node={n.id} data-socket={n.inType ?? "scalar"} aria-label={`${n.label} in`} title={tipForUi("portIn")} onPointerDown={(e) => onPortDown(e, n.id, "in")} />
              <button type="button" className="node-card__port node-card__port--out" data-port="out" data-node={n.id} data-socket={n.outType ?? "scalar"} aria-label={`${n.label} out`} title={tipForUi("portOut")} onPointerDown={(e) => onPortDown(e, n.id, "out")} />
              <header className="node-card__head">
                <div>
                  <strong>{n.label}</strong>
                </div>
                {n.params[0] ? (
                  <b className="node-card__readout" title={n.params.map((p) => `${p.label} ${p.value}`).join(" · ")}>
                    {n.params[0].step >= 1 ? n.params[0].value : n.params[0].value.toFixed(2)}
                    {n.params.length > 1 ? <i>+{n.params.length - 1}</i> : null}
                  </b>
                ) : null}
                {n.id !== "identity" && n.id !== "hull" ? (
                  <button type="button" className="node-card__mute" onClick={() => mute(n.id)} aria-label={`Park ${n.label}`} title={tipForUi("mute")}>×</button>
                ) : (
                  <span className="node-card__lock" title={tipForUi("lock")}>●</span>
                )}
              </header>
              <div className="node-card__body" data-dial="1">
                {n.params.length === 0 ? (
                  <p>closedSpline · only d</p>
                ) : (
                  n.params.slice(0, 1).map((p) => {
                    const bin = isBinaryParam(p);
                    return (
                    <label key={p.id}>
                      <input
                        type="range"
                        min={bin ? p.min : -1}
                        max={bin ? p.max : 1}
                        step={bin ? p.step : 0.01}
                        value={bin ? p.value : sliderT(p)}
                        onChange={(e) => param(n.id, p.id, bin ? Number(e.target.value) : fromSliderT(p, Number(e.target.value)))}
                        aria-label={p.label}
                        title={tipForParam(p.id)}
                      />
                    </label>
                    );
                  })
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      {selected ? (
        <div className="node-inspector" data-testid="node-inspector" data-pillar={compilerOf(selected.id, selected.organId)}>
          <header>
            <strong>{selected.label}</strong>
            <span>{selected.muted ? "parked" : "live"} · {selected.params.length} dial{selected.params.length === 1 ? "" : "s"}</span>
          </header>
          {(() => {
            const ev = evaluateGraph(graph);
            const traces = (ev.couple ?? []).filter((t) => t.from.node === selected.id || t.to.node === selected.id);
            const laws = lawsFor(selected.id);
            if (!laws.length && !traces.length) return null;
            return (
              <ul className="node-inspector__couple" data-testid="node-couple">
                {laws.map((law) => {
                  const tr = traces.find((t) => t.id === law.id);
                  const role = law.from.node === selected.id ? "drives" : "driven by";
                  const other = law.from.node === selected.id ? law.to.node : law.from.node;
                  return (
                    <li key={law.id} title={law.why}>
                      <em>{law.label}</em>
                      <span>{role} {other}{tr ? ` · ${tr.before.toFixed(2)} → ${tr.after.toFixed(2)}` : ""}</span>
                    </li>
                  );
                })}
              </ul>
            );
          })()}
          {selected.params.length === 0 ? (
            <p className="node-inspector__empty">No dials — this card only writes the hull.</p>
          ) : (
            <div className="node-inspector__dials">
              {selected.params.map((p) => {
                const bin = isBinaryParam(p);
                return (
                  <label key={p.id} title={tipForParam(p.id)}>
                    <span>{p.label}</span>
                    <b>{bin ? p.value : p.value.toFixed(p.step < 0.1 ? 2 : 1)}</b>
                    <input
                      type="range"
                      min={bin ? p.min : -1}
                      max={bin ? p.max : 1}
                      step={bin ? p.step : 0.01}
                      value={bin ? p.value : sliderT(p)}
                      onChange={(e) => param(selected.id, p.id, bin ? Number(e.target.value) : fromSliderT(p, Number(e.target.value)))}
                      aria-label={p.label}
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <aside className="node-browser" data-testid="node-browser" title={tipForUi("browser")}>
        <header>
          <strong>Browser</strong>
          <span>{unused.length} parked · Ctrl+Z undo · Ctrl+Shift+Z redo</span>
        </header>
        <div className="node-browser__cats" role="tablist">
          <button type="button" data-active={cat === "all" ? "1" : "0"} onClick={() => setCat("all")}>All</button>
          {BROWSER_CATS.map((c) => (
            <button key={c.id} type="button" data-active={cat === c.id ? "1" : "0"} onClick={() => setCat(c.id)}>{c.label}</button>
          ))}
        </div>
        <div className="node-browser__list">
          {unusedShown.map((n) => (
            <button
              key={n.id}
              type="button"
              className="node-browser__chip"
              data-pillar={compilerOf(n.id, n.organId)}
              data-status={n.status?.toLowerCase()}
              title={tipForNode(n)}
              data-testid={`browser-chip-${n.id}`}
              style={{ ["--box-tint" as string]: tintOf(n.id, n.organId) }}
              onPointerDown={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                setDrag({ kind: "chip", id: n.id });
              }}
              onClick={() => activate(n.id)}
            >
              <em>{n.label}</em>
              <small>{n.status} · {browserCat(n)}</small>
            </button>
          ))}
        </div>
      </aside>

      {createPortal(
        <div
          className="gasper-monitor"
          data-testid="gasper-monitor"
          title={tipForUi("monitor")}
          style={{ left: mon.x, top: mon.y, width: mon.w, height: mon.h }}
          onPointerMove={onMove}
          onPointerUp={onUp}
        >
          <div className="gasper-monitor__bar" data-testid="gasper-monitor-drag">
            <button
              type="button"
              className="gasper-monitor__drag"
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                setDrag({ kind: "monitor", ox: e.clientX, oy: e.clientY, mx: mon.x, my: mon.y });
              }}
            >
              Gasper
            </button>
            <button
              type="button"
              className="gasper-monitor__grid"
              data-testid="monitor-grid-toggle"
              data-active={gridOn ? "1" : "0"}
              role="switch"
              aria-checked={gridOn}
              title="Paint the 25×40 meridians on his skin — same field as nubs and walk"
              onClick={(e) => {
                e.stopPropagation();
                const next = !gridOn;
                setGridOn(next);
                dispatchField("showGrid", { on: next });
                setGraph((g) => setNodeParam(g, "cage", "grid", next ? 1 : 0));
              }}
            >
              Grid
            </button>
            <small className="gasper-monitor__topo" data-testid="monitor-topology">512 · 360 · 1000</small>
          </div>
          <div className="gasper-monitor__tl" data-testid="monitor-timeline">
            <span>{clock.mode === "take" ? `${(clock.t / 1000).toFixed(1)}s` : `φ ${clock.t.toFixed(2)}`}</span>
            <input
              type="range"
              min={0}
              max={clock.dur}
              step={clock.mode === "take" ? 20 : 0.01}
              value={clock.t}
              aria-label="Scrub animation"
              onPointerDown={() => {
                (globalThis as { __GASPER_SCRUB_HOLD__?: number }).__GASPER_SCRUB_HOLD__ = 1;
              }}
              onPointerUp={() => {
                (globalThis as { __GASPER_SCRUB_HOLD__?: number }).__GASPER_SCRUB_HOLD__ = 0;
              }}
              onChange={(e) => {
                const t = Number(e.target.value);
                const host = globalThis as {
                  __GASPER_TAKE_T0__?: number;
                  __GASPER_SCRUB_MS__?: number;
                  __GASPER_SCRUB_PHASE__?: number;
                  __GASPER_SCRUB_HOLD__?: number;
                };
                host.__GASPER_SCRUB_HOLD__ = 1;
                if (clock.mode === "take") {
                  host.__GASPER_TAKE_T0__ = performance.now() - t;
                  host.__GASPER_SCRUB_MS__ = t;
                } else {
                  host.__GASPER_SCRUB_PHASE__ = t;
                }
                setClock((c) => ({ ...c, t }));
              }}
            />
            <span>{clock.mode === "take" ? "20s" : "step"}</span>
          </div>
          <button
            type="button"
            className="gasper-monitor__resize"
            data-testid="gasper-monitor-resize"
            aria-label="Resize monitor"
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setDrag({ kind: "resize", ox: e.clientX, oy: e.clientY, mw: mon.w, mh: mon.h });
            }}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
