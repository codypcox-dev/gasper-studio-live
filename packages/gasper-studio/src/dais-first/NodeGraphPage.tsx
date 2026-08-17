/**
 * Nodes canvas — colored boxes of what is cooking. Gasper is a draggable
 * picture-in-picture. Photoshop undo/redo on the graph.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactElement, type WheelEvent as ReactWheelEvent } from "react";
import { createPortal } from "react-dom";
import {
  BROWSER_CATS,
  PILLARS,
  COMPILER_BUS,
  canBind,
  compilerColumns,
  compilerOf,
  applyGeoEvalToHost,
  arrangeGraph,
  belongsToPillar,
  browserCat,
  cloneGraph,
  connectNodes,
  disconnectNodes,
  emptyHistory,
  graphBounds,
  isStageNode,
  loadGeoGraph,
  moveNode,
  pushPast,
  redoGraph,
  saveGeoGraph,
  seatOf,
  setNodeMuted,
  setNodeParam,
  undoGraph,
  type GeoGraph,
  type GraphHistory,
} from "../../../desktop/src/gasper/geonodes";

const CARD_W = 188;
const MONITOR_KEY = "gasper.monitor.v3";
const BAR = 28;

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
  }
  if (stage) {
    stage.style.position = "fixed";
    stage.style.left = `${mon.x}px`;
    stage.style.top = `${mon.y + BAR}px`;
    stage.style.right = "auto";
    stage.style.width = `${mon.w}px`;
    stage.style.height = `${mon.h - BAR}px`;
    stage.style.zIndex = "78";
    stage.style.maxWidth = `${mon.w}px`;
    stage.style.maxHeight = `${mon.h - BAR}px`;
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
  const hist = useRef<GraphHistory>(emptyHistory());
  const dragSnap = useRef<GeoGraph | null>(null);
  const [graph, setGraph] = useState<GeoGraph>(() => loadGeoGraph());
  const [drag, setDrag] = useState<Drag>(null);
  const [view, setView] = useState({ x: 20, y: 28, k: 0.72 });
  const [cat, setCat] = useState<(typeof BROWSER_CATS)[number]["id"] | "all">("all");
  const [mon, setMon] = useState<Monitor>(() => loadMonitor());

  const commit = useCallback((next: GeoGraph | ((g: GeoGraph) => GeoGraph)) => {
    setGraph((g) => {
      hist.current = pushPast(hist.current, g);
      return typeof next === "function" ? next(g) : next;
    });
  }, []);

  const undo = useCallback(() => {
    setGraph((g) => {
      const r = undoGraph(hist.current, g);
      if (!r) return g;
      hist.current = r.history;
      return r.graph;
    });
  }, []);

  const redo = useCallback(() => {
    setGraph((g) => {
      const r = redoGraph(hist.current, g);
      if (!r) return g;
      hist.current = r.history;
      return r.graph;
    });
  }, []);

  useEffect(() => {
    applyGeoEvalToHost(graph);
    saveGeoGraph(graph);
  }, [graph]);

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
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if (cmd && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (cmd && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
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
      if (cmd && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setGraph((g) => ({ ...g, selected: null }));
        return;
      }
      if ((e.key === "Backspace" || e.key === "Delete") && selected && selected.id !== "identity" && selected.id !== "hull") {
        e.preventDefault();
        commit((g) => arrangeGraph(setNodeMuted(g, selected.id, true)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, zoomAt, fitView, selected, commit]);

  const onCardDown = useCallback((e: ReactPointerEvent, id: string) => {
    if ((e.target as HTMLElement).closest("[data-port],[data-dial],button,input")) return;
    e.preventDefault();
    e.stopPropagation();
    const n = graph.nodes.find((x) => x.id === id);
    if (!n) return;
    dragSnap.current = cloneGraph(graph);
    const p = toBoard(e.clientX, e.clientY);
    setGraph((g) => ({ ...g, selected: id }));
    setDrag({ kind: "card", id, ox: p.x - n.x, oy: p.y - n.y });
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
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).hasAttribute("data-graph-bg")) return;
    setDrag({ kind: "pan", ox: e.clientX, oy: e.clientY, vx: view.x, vy: view.y });
    setGraph((g) => ({ ...g, selected: null }));
  }, [view.x, view.y]);

  const onMove = useCallback((e: ReactPointerEvent) => {
    if (!drag) return;
    if (drag.kind === "card") {
      const p = toBoard(e.clientX, e.clientY);
      setGraph((g) => moveNode(g, drag.id, p.x - drag.ox, p.y - drag.oy));
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
    }
  }, [drag, toBoard]);

  const onUp = useCallback((e: ReactPointerEvent) => {
    if (drag?.kind === "wire") {
      const hit = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      let to = hit?.closest("[data-port='in']")?.getAttribute("data-node") ?? null;
      if (!to) {
        let best = 36;
        for (const el of document.querySelectorAll<HTMLElement>("[data-port='in']")) {
          const id = el.getAttribute("data-node");
          if (!id || id === drag.from) continue;
          const r = el.getBoundingClientRect();
          const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
          if (d < best) {
            best = d;
            to = id;
          }
        }
      }
      if (to && to !== drag.from) commit((g) => connectNodes(g, drag.from, to!));
    }
    if (drag?.kind === "card" && dragSnap.current) {
      hist.current = pushPast(hist.current, dragSnap.current);
      dragSnap.current = null;
    }
    setDrag(null);
  }, [drag, commit]);

  const onWheel = useCallback((e: ReactWheelEvent) => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.08 : 1 / 1.08);
  }, [zoomAt]);

  const mute = useCallback((id: string) => {
    if (id === "identity" || id === "hull") return;
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
          <button type="button" onClick={() => zoomAt((boardRef.current?.getBoundingClientRect().left ?? 0) + 240, (boardRef.current?.getBoundingClientRect().top ?? 0) + 80, 1 / 1.12)} aria-label="Zoom out">−</button>
          <button type="button" onClick={fitView} data-testid="node-graph-fit">{Math.round(view.k * 100)}%</button>
          <button type="button" onClick={() => zoomAt((boardRef.current?.getBoundingClientRect().left ?? 0) + 240, (boardRef.current?.getBoundingClientRect().top ?? 0) + 80, 1.12)} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => commit((g) => arrangeGraph(g))} data-testid="node-graph-arrange">Compile</button>
          <button type="button" data-testid="node-graph-undo" onClick={undo}>Undo</button>
          <button type="button" data-testid="node-graph-redo" onClick={redo}>Redo</button>
        </div>
        <div className="node-graph-page__world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, transformOrigin: "0 0" }}>
          <div className="node-graph-page__boxes" aria-hidden="true">
            {compilerColumns(graph).map((col) => {
              const p = PILLARS.find((x) => x.id === col.id);
              if (!p) return null;
              return (
                <div
                  key={p.id}
                  className="compiler-col"
                  data-pillar={p.id}
                  data-testid={`pillar-box-${p.id}`}
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
                  <small>{p.allow}</small>
                </div>
              );
            })}
          </div>
          <svg className="node-graph-page__wires" data-testid="node-graph-wires">
            {COMPILER_BUS.map((bus) => {
              const cols = compilerColumns(graph);
              const a = cols.find((c) => c.id === bus.from);
              const b = cols.find((c) => c.id === bus.to);
              if (!a || !b) return null;
              const x1 = a.x + a.w;
              const y1 = a.y + a.h / 2;
              const x2 = b.x;
              const y2 = b.y + 48;
              return (
                <g key={`${bus.from}-${bus.to}`} className="compiler-bus">
                  <path d={wirePath(x1, y1, x2, y2)} className="node-graph-page__wire" data-bus="1" />
                </g>
              );
            })}
            {graph.links.map((l) => {
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
              data-testid={`node-card-${n.id}`}
              data-pillar={compilerOf(n.id, n.organId)}
              data-wire-ok={drag?.kind === "wire" && drag.from !== n.id && (() => {
                const a = graph.nodes.find((x) => x.id === drag.from);
                return a && canBind(a, n) ? "1" : "0";
              })()}
              style={{ left: n.x, top: n.y, width: CARD_W, ["--box-tint" as string]: tintOf(n.id, n.organId) }}
              onPointerDown={(e) => onCardDown(e, n.id)}
            >
              <button type="button" className="node-card__port node-card__port--in" data-port="in" data-node={n.id} data-socket={n.inType ?? "scalar"} aria-label={`${n.label} in`} onPointerDown={(e) => onPortDown(e, n.id, "in")} />
              <button type="button" className="node-card__port node-card__port--out" data-port="out" data-node={n.id} data-socket={n.outType ?? "scalar"} aria-label={`${n.label} out`} onPointerDown={(e) => onPortDown(e, n.id, "out")} />
              <header className="node-card__head">
                <div>
                  <strong>{n.label}</strong>
                  <small>{(() => { const s = seatOf(n.id, n.organId); return s.border ? `${s.pillar} · ${s.border}` : s.pillar; })()}</small>
                </div>
                {n.id !== "identity" && n.id !== "hull" ? (
                  <button type="button" className="node-card__mute" onClick={() => mute(n.id)}>Park</button>
                ) : null}
              </header>
              <div className="node-card__body" data-dial="1">
                {n.params.length === 0 ? (
                  <p>closedSpline · only d</p>
                ) : (
                  n.params.slice(0, 2).map((p) => (
                    <label key={p.id}>
                      <span>
                        {p.label}
                        <em>{p.step >= 1 ? p.value : p.value.toFixed(2)}</em>
                      </span>
                      <input type="range" min={p.min} max={p.max} step={p.step} value={p.value} onChange={(e) => param(n.id, p.id, Number(e.target.value))} />
                    </label>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="node-browser" data-testid="node-browser">
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
              data-testid={`browser-chip-${n.id}`}
              style={{ ["--box-tint" as string]: tintOf(n.id, n.organId) }}
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
          style={{ left: mon.x, top: mon.y, width: mon.w, height: mon.h }}
          onPointerMove={onMove}
          onPointerUp={onUp}
        >
          <button
            type="button"
            className="gasper-monitor__bar"
            data-testid="gasper-monitor-drag"
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              setDrag({ kind: "monitor", ox: e.clientX, oy: e.clientY, mx: mon.x, my: mon.y });
            }}
          >
            Gasper · drag
          </button>
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
