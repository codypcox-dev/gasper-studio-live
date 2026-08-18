/**
 * Document session — graph, sculpt undo, eval, revision bridge.
 * Lives above Stage|Graph so Looks and Ctrl+Z survive when the museum is closed.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { dispatchField } from "../../../desktop/src/gasper/scaffold/GasperFieldApi";
import {
  applyRevisionSculpt,
  applyRevisionTake,
  captureRevision,
  emitRevisionChanged,
  registerRevisionBridge,
  SCULPT_COMMIT_EVENT,
  writeAutosave,
  type GasperRevision,
} from "../../../desktop/src/gasper/revision";
import {
  applyGeoEvalToHost,
  emptyHistory,
  loadGeoGraph,
  pushPast,
  redoGraph,
  resetLayout,
  saveGeoGraph,
  undoGraph,
  type GeoGraph,
  type GraphHistory,
} from "../../../desktop/src/gasper/geonodes";
import { playNorthstarTwentyFromRail } from "./daisFirstControls";
import { readPlayhead } from "./studioClock";

type Session = {
  graph: GeoGraph;
  commit: (next: GeoGraph | ((g: GeoGraph) => GeoGraph)) => void;
  replace: (next: GeoGraph | ((g: GeoGraph) => GeoGraph)) => void;
  stampPast: (past: GeoGraph) => void;
  undo: () => void;
  redo: () => void;
};

const SessionCtx = createContext<Session | null>(null);

let HIST = emptyHistory();

function showGridOf(g: GeoGraph): boolean {
  return (g.nodes.find((n) => n.id === "cage")?.params.find((p) => p.id === "grid")?.value ?? 0) > 0.5;
}

export function StudioSessionProvider({ children }: { children: ReactNode }): ReactElement {
  const [graph, setGraph] = useState<GeoGraph>(() => resetLayout(loadGeoGraph()));
  const hist = useRef<GraphHistory>(HIST);
  const graphRef = useRef(graph);
  graphRef.current = graph;
  const autosaveTimer = useRef(0);
  const playArmed = useRef(false);

  const scheduleAutosave = useCallback((g: GeoGraph) => {
    window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      const ph = readPlayhead();
      writeAutosave(
        captureRevision({
          name: "Autosave",
          kind: "autosave",
          graph: g,
          showGrid: showGridOf(g),
          takeId: ph.mode === "take" ? "northstar-20" : null,
          playheadMs: ph.t,
          paused: ph.paused,
        }),
      );
      emitRevisionChanged();
    }, 800);
  }, []);

  const commit = useCallback((next: GeoGraph | ((g: GeoGraph) => GeoGraph)) => {
    setGraph((g) => {
      HIST = hist.current = pushPast(hist.current, g);
      return typeof next === "function" ? next(g) : next;
    });
  }, []);

  const replace = useCallback((next: GeoGraph | ((g: GeoGraph) => GeoGraph)) => {
    setGraph((g) => (typeof next === "function" ? next(g) : next));
  }, []);

  const stampPast = useCallback((past: GeoGraph) => {
    HIST = hist.current = pushPast(hist.current, past);
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
    scheduleAutosave(graph);
  }, [graph, scheduleAutosave]);

  useEffect(() => {
    const onSculpt = (ev: Event) => {
      const before = (ev as CustomEvent<{ before?: number[] }>).detail?.before;
      HIST = hist.current = pushPast(hist.current, graphRef.current, before);
      scheduleAutosave(graphRef.current);
    };
    window.addEventListener(SCULPT_COMMIT_EVENT, onSculpt);
    return () => window.removeEventListener(SCULPT_COMMIT_EVENT, onSculpt);
  }, [scheduleAutosave]);

  useEffect(() => {
    return registerRevisionBridge({
      graph: () => graphRef.current,
      capture: (name, kind) => {
        const g = graphRef.current;
        const ph = readPlayhead();
        return captureRevision({
          name,
          kind,
          graph: g,
          showGrid: showGridOf(g),
          takeId: ph.mode === "take" ? "northstar-20" : null,
          playheadMs: ph.t,
          paused: ph.paused,
        });
      },
      hydrate: (rev: GasperRevision) => {
        setGraph((g) => {
          HIST = hist.current = pushPast(hist.current, g);
          applyRevisionSculpt(rev);
          applyRevisionTake(rev);
          dispatchField("showGrid", { on: rev.showGrid });
          return rev.graph;
        });
      },
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "TEXTAREA" || t.isContentEditable || (t.tagName === "INPUT" && (t as HTMLInputElement).type !== "range"))) {
        return;
      }
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
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [undo, redo]);

  return <SessionCtx.Provider value={{ graph, commit, replace, stampPast, undo, redo }}>{children}</SessionCtx.Provider>;
}

export function useStudioSession(): Session {
  const s = useContext(SessionCtx);
  if (!s) throw new Error("StudioSession missing");
  return s;
}
