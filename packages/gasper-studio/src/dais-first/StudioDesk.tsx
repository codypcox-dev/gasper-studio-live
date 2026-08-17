/**
 * Theater desk — one instrument under the stage.
 * ThinkOps: three overlays is a dual. DesignOps: session + picker, recede never hide.
 */
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { dispatchField } from "../../../desktop/src/gasper/scaffold/GasperFieldApi";
import { mountPathTake } from "../../../desktop/src/gasper/takes/PathEmbeddingTake";
import {
  setWalkBooLoopFromRail,
  releaseWalkReviewShot,
  type DaisFirstAdapter,
} from "./daisFirstControls";
import { applySkinTake, type SkinTake } from "./LumenGlass";
import { InstrumentTable } from "./InstrumentTable";
import { GeoNodeEditor } from "./GeoNodeEditor";
import { NodeGraphPage } from "./NodeGraphPage";
import { MachineStrip } from "./MachineStrip";
import { PillarBoard } from "./PillarBoard";
import { applyMachineIntent } from "./machineApply";

export type DeskChapter = "play" | "shape" | "walk" | "light" | "nodes" | "mixer" | "stack";

const CHAPTERS: { id: DeskChapter; label: string }[] = [
  { id: "play", label: "Play" },
  { id: "shape", label: "Shape" },
  { id: "walk", label: "Walk" },
  { id: "light", label: "Light" },
  { id: "nodes", label: "Nodes" },
  { id: "mixer", label: "Mixer" },
  { id: "stack", label: "Stack" },
];

export function StudioDesk({
  adapter,
  take,
  onTake,
}: {
  adapter: DaisFirstAdapter;
  take: SkinTake;
  onTake: (id: SkinTake) => void;
}): ReactElement {
  const [chapter, setChapter] = useState<DeskChapter>("play");
  const [loopOn, setLoopOn] = useState(true);
  const [gridOn, setGridOn] = useState(false);
  const [recOn, setRecOn] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const el = document.querySelector("#avatar, [data-gasper-stage]") as HTMLElement | null;
    if (!el) return;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const host = globalThis as {
        __GASPER_ORBIT_YAW__?: number;
        __GASPER_ORBIT_PITCH__?: number;
        SidekickFormMasterRig?: { setOrbit?: (y: number, p: number) => void };
      };
      const yaw = ((host.__GASPER_ORBIT_YAW__ ?? 0) + dx * 0.45 + 180) % 360 - 180;
      const pitch = Math.max(-80, Math.min(80, (host.__GASPER_ORBIT_PITCH__ ?? 0) - dy * 0.35));
      host.__GASPER_ORBIT_YAW__ = yaw;
      host.__GASPER_ORBIT_PITCH__ = pitch;
      host.SidekickFormMasterRig?.setOrbit?.(yaw, pitch);
    };
    const up = () => {
      dragging = false;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const playTwenty = useCallback(() => {
    dispatchField("showGrid", { on: false });
    setGridOn(false);
    applyMachineIntent({ type: "play20" });
    setLoopOn(true);
  }, []);

  const stand = useCallback(() => {
    applyMachineIntent({ type: "rest" });
    releaseWalkReviewShot();
  }, []);

  const toggleLoop = useCallback(() => {
    const next = !loopOn;
    setWalkBooLoopFromRail(next);
    setLoopOn(next);
  }, [loopOn]);

  const toggleGrid = useCallback(() => {
    const next = !gridOn;
    setGridOn(next);
    dispatchField("showGrid", { on: next });
  }, [gridOn]);

  const toggleRec = useCallback(() => {
    const api =
      (globalThis as { GasperPathTake?: ReturnType<typeof mountPathTake> }).GasperPathTake ??
      mountPathTake();
    if (api.recording()) {
      api.stop();
      setRecOn(false);
    } else {
      api.record("live");
      setRecOn(true);
    }
  }, []);

  const playLast = useCallback(() => {
    const api =
      (globalThis as { GasperPathTake?: ReturnType<typeof mountPathTake> }).GasperPathTake ??
      mountPathTake();
    if (api.recording()) api.stop();
    setRecOn(false);
    api.play();
  }, []);

  const goQuery = useCallback(() => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    if (q.includes("node") || q.includes("kappa") || q.includes("tau") || q.includes("voigt")) {
      setChapter("nodes");
    } else if (q.includes("walk") || q.includes("gait") || q.includes("20")) {
      setChapter("walk");
    } else if (q.includes("light") || q.includes("orbit") || q.includes("pearl")) {
      setChapter("light");
    } else if (q.includes("stack") || q.includes("organ")) {
      setChapter("stack");
    } else if (q.includes("mix") || q.includes("slider")) {
      setChapter("mixer");
    } else {
      setChapter("shape");
    }
  }, [query]);

  const panel = chapter !== "nodes";

  return (
    <>
      {chapter === "nodes" ? <NodeGraphPage /> : null}
    <div className="studio-desk" data-testid="studio-desk" data-chapter={chapter} data-panel={panel ? "1" : "0"}>
      <MachineStrip />
      <div className="studio-desk__bar">
        <div className="studio-desk__brand">
          <em>Gasper</em>
          <span>desk</span>
        </div>
        <div className="studio-desk__session" role="group" aria-label="Session">
          <button type="button" data-testid="desk-home" onClick={stand}>
            Home
          </button>
          <button type="button" data-testid="lumen-play-twenty" onClick={playTwenty}>
            20s
          </button>
          <button type="button" data-testid="desk-loop" data-active={loopOn ? "1" : "0"} onClick={toggleLoop}>
            Loop
          </button>
          <button type="button" data-testid="lumen-rec-take" data-active={recOn ? "1" : "0"} onClick={toggleRec}>
            {recOn ? "Stop" : "Rec"}
          </button>
          <button type="button" data-testid="lumen-play-take" onClick={playLast}>
            Take
          </button>
          <button
            type="button"
            className="studio-desk__switch"
            data-testid="lumen-grid-toggle"
            data-active={gridOn ? "1" : "0"}
            role="switch"
            aria-checked={gridOn}
            onClick={toggleGrid}
          >
            Grid
          </button>
        </div>
        <nav className="studio-desk__chapters" aria-label="Chapters">
          {CHAPTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              data-active={chapter === c.id ? "1" : "0"}
              data-testid={`desk-chapter-${c.id}`}
              onClick={() => setChapter(c.id)}
            >
              {c.label}
            </button>
          ))}
        </nav>
        <form
          className="studio-desk__find"
          onSubmit={(e) => {
            e.preventDefault();
            goQuery();
          }}
        >
          <input
            data-testid="desk-find"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a node or organ"
            aria-label="Find"
          />
        </form>
      </div>
      {panel ? (
        <div className="studio-desk__panel" data-testid="studio-desk-panel">
          {chapter === "play" ? <PillarBoard take={take} onTake={onTake} /> : null}
          {chapter === "shape" ? (
            <ShapeStrip take={take} onTake={onTake} />
          ) : null}
          {chapter === "walk" ? (
            <p className="studio-desk__hint">Session owns the walk. 20s plays from now. Mute Handles on Nodes to freeze the W.</p>
          ) : null}
          {chapter === "light" ? (
            <p className="studio-desk__hint">Drag the body to orbit. Mixer has glint and wrap if you need the extra dials.</p>
          ) : null}
          {chapter === "stack" ? <GeoNodeEditor embedded tab="stack" /> : null}
          {chapter === "mixer" ? (
            <div className="studio-desk__mixer">
              <InstrumentTable adapter={adapter} take={take} onTake={onTake} embedded />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
    </>
  );
}

function ShapeStrip({
  take,
  onTake,
}: {
  take: SkinTake;
  onTake: (id: SkinTake) => void;
}): ReactElement {
  const morphs: { id: SkinTake; label: string }[] = [
    { id: "neutral", label: "Rest" },
    { id: "puff", label: "Puff" },
    { id: "goose", label: "Goose" },
  ];
  return (
    <div className="studio-desk__shape" data-testid="desk-shape">
      {morphs.map((m) => (
        <button
          key={m.id}
          type="button"
          data-active={take === m.id ? "1" : "0"}
          onClick={() => {
            onTake(m.id);
            applySkinTake(m.id);
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
