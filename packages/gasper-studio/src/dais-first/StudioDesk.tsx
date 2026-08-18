/**
 * Theater desk — transport + workspace mode.
 * ThinkOps: badge-rail = transport. DesignOps: AE/Rive chrome, one playhead.
 */
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { dispatchField } from "../../../desktop/src/gasper/scaffold/GasperFieldApi";
import { mountPathTake } from "../../../desktop/src/gasper/takes/PathEmbeddingTake";
import { setNodeParam } from "../../../desktop/src/gasper/geonodes";
import {
  setWalkBooLoopFromRail,
  releaseWalkReviewShot,
  type DaisFirstAdapter,
} from "./daisFirstControls";
import { applySkinTake, type SkinTake } from "./LumenGlass";
import { NodeGraphPage } from "./NodeGraphPage";
import { applyMachineIntent } from "./machineApply";
import { StudioSessionProvider, useStudioSession } from "./StudioSession";
import { StageLookInspector } from "./StageLookInspector";
import { StudioTransport, type DeskMode } from "./StudioTransport";

export type DeskChapter = "play" | "shape" | "walk" | "light" | "nodes" | "mixer" | "stack";

export function StudioDesk({
  adapter: _adapter,
  take: _take,
  onTake: _onTake,
}: {
  adapter: DaisFirstAdapter;
  take: SkinTake;
  onTake: (id: SkinTake) => void;
}): ReactElement {
  return (
    <StudioSessionProvider>
      <StudioDeskInner />
    </StudioSessionProvider>
  );
}

function StudioDeskInner(): ReactElement {
  const { graph, commit } = useStudioSession();
  const [mode, setMode] = useState<DeskMode>("stage");
  const [loopOn, setLoopOn] = useState(true);
  const [recOn, setRecOn] = useState(false);
  const gridOn = (graph.nodes.find((n) => n.id === "cage")?.params.find((p) => p.id === "grid")?.value ?? 1) > 0.5;

  useEffect(() => {
    dispatchField("showGrid", { on: gridOn });
  }, [gridOn]);

  const playTwenty = useCallback(() => {
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
    commit((g) => setNodeParam(g, "cage", "grid", next ? 1 : 0));
    dispatchField("showGrid", { on: next });
  }, [commit, gridOn]);

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

  return (
    <>
      {mode === "graph" ? <NodeGraphPage /> : <StageLookInspector />}
      <div className="studio-desk" data-testid="studio-desk" data-chapter={mode === "graph" ? "nodes" : "play"} data-panel="0">
        <StudioTransport
          mode={mode}
          onMode={setMode}
          gridOn={gridOn}
          onGrid={toggleGrid}
          loopOn={loopOn}
          onLoop={toggleLoop}
          recOn={recOn}
          onRec={toggleRec}
          onHome={stand}
          onTwenty={playTwenty}
        />
      </div>
    </>
  );
}

export function ShapeStrip({
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
