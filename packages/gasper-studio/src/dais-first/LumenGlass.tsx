/**
 * Stage dock. ThinkOps: grid is visibility. Morph is shape. They do not share a switch.
 */
import { useCallback, useState, type ReactElement } from "react";
import { setReliefPresetFromRail, playNorthstarTwentyFromRail, setWalkBooLoopFromRail } from "./daisFirstControls";
import {
  dispatchField,
  listLooks,
  type SavedLook,
} from "../../../desktop/src/gasper/scaffold/GasperFieldApi";
import { publishScaffoldAuthority } from "../../../desktop/src/gasper/scaffold/ScaffoldFieldAuthority";
import type { FabricMorphId } from "../../../desktop/src/gasper/scaffold/FabricSolver";

export type SkinTake = "neutral" | "puff" | "goose" | "grid" | "sculpt";

function publishAuthority(partial: Record<string, number>) {
  publishScaffoldAuthority(partial);
}

const MORPHS: { id: FabricMorphId; label: string; take: SkinTake; testId: string }[] = [
  { id: "rest", label: "Rest", take: "neutral", testId: "lumen-take-neutral" },
  { id: "puff", label: "Puff", take: "puff", testId: "lumen-take-puff" },
  { id: "pinch", label: "Pinch", take: "goose", testId: "lumen-morph-pinch" },
  { id: "remote", label: "Remote", take: "goose", testId: "lumen-morph-remote" },
  { id: "spike", label: "Spike", take: "goose", testId: "lumen-morph-spike" },
  { id: "wave", label: "Wave", take: "goose", testId: "lumen-morph-wave" },
  { id: "paddle", label: "Paddle", take: "goose", testId: "lumen-morph-paddle" },
];

export function applySkinTake(id: SkinTake): void {
  dispatchField("showGrid", { on: false });
  dispatchField("setSculpt", { on: false });
  if (id === "neutral") {
    dispatchField("morph", { id: "rest", amplitude: 0 });
    publishAuthority({ pressure: 0, coupling: 0, relief: 0 });
  } else if (id === "puff") {
    dispatchField("morph", { id: "puff", amplitude: 1 });
    publishAuthority({ pressure: 0, coupling: 0.85, relief: 0 });
  } else if (id === "grid") {
    dispatchField("showGrid", { on: true });
    publishAuthority({ pressure: 0, coupling: 0, relief: 0 });
  } else if (id === "sculpt") {
    dispatchField("setSculpt", { on: true });
    publishAuthority({ pressure: 0, coupling: 0.55, relief: 0 });
  } else {
    publishAuthority({ pressure: 0, coupling: 1, relief: 0 });
  }
  setReliefPresetFromRail("none");
}

export function LumenGlass({
  take,
  onTake,
}: {
  take: SkinTake;
  onTake: (id: SkinTake) => void;
}): ReactElement {
  const [looks, setLooks] = useState<SavedLook[]>(() => listLooks());
  const [activeLook, setActiveLook] = useState<string | null>(null);
  const [gridOn, setGridOn] = useState(false);
  const [morph, setMorph] = useState<FabricMorphId>("rest");

  const toggleGrid = useCallback(() => {
    const next = !gridOn;
    setGridOn(next);
    dispatchField("showGrid", { on: next });
  }, [gridOn]);

  const playMorph = useCallback(
    (id: FabricMorphId, takeId: SkinTake) => {
      dispatchField("showGrid", { on: false });
      setGridOn(false);
      dispatchField("morph", { id, amplitude: id === "rest" ? 0 : 1 });
      setMorph(id);
      onTake(takeId);
    },
    [onTake],
  );

  const onLoad = useCallback(
    (id: string) => {
      dispatchField("showGrid", { on: false });
      setGridOn(false);
      dispatchField("loadLook", { id });
      setActiveLook(id);
      onTake("sculpt");
    },
    [onTake],
  );

  const playOrbit = useCallback(() => {
    dispatchField("showGrid", { on: true });
    setGridOn(true);
    const host = globalThis as {
      __GASPER_ORBIT_YAW__?: number;
      __GASPER_ORBIT_PITCH__?: number;
      SidekickFormMasterRig?: { setOrbit?: (y: number, p: number) => void };
    };
    const t0 = performance.now();
    const run = (now: number) => {
      const u = Math.min(1, (now - t0) / 6400);
      const yaw = u * 360 - 180;
      host.__GASPER_ORBIT_YAW__ = yaw;
      host.SidekickFormMasterRig?.setOrbit?.(yaw, host.__GASPER_ORBIT_PITCH__ ?? 0);
      if (u < 1) requestAnimationFrame(run);
      else {
        host.__GASPER_ORBIT_YAW__ = 0;
        host.SidekickFormMasterRig?.setOrbit?.(0, host.__GASPER_ORBIT_PITCH__ ?? 0);
      }
    };
    requestAnimationFrame(run);
  }, []);

  const playTwenty = useCallback(() => {
    dispatchField("showGrid", { on: false });
    setGridOn(false);
    setWalkBooLoopFromRail(true);
    playNorthstarTwentyFromRail();
  }, []);

  const refreshLooks = useCallback(() => {
    setLooks(listLooks());
  }, []);

  return (
    <div className="lumen-glass" data-testid="lumen-glass" data-take={take} data-grid={gridOn ? "1" : "0"}>
      <button
        type="button"
        className="lumen-switch"
        data-testid="lumen-grid-toggle"
        data-active={gridOn ? "1" : "0"}
        role="switch"
        aria-checked={gridOn}
        aria-label="Grid visibility"
        onClick={toggleGrid}
      >
        <span className="lumen-switch__label">Grid</span>
        <span className="lumen-switch__track" aria-hidden="true">
          <span className="lumen-switch__thumb" />
        </span>
      </button>
      <button
        type="button"
        className="lumen-switch"
        data-testid="lumen-play-twenty"
        onClick={playTwenty}
      >
        <span className="lumen-switch__label">Play 20s</span>
      </button>
      <button
        type="button"
        className="lumen-switch"
        data-testid="lumen-orbit-360"
        onClick={playOrbit}
      >
        <span className="lumen-switch__label">Orbit 360</span>
      </button>
      <div className="lumen-glass__takes" role="group" aria-label="Morph">
        {MORPHS.map((t) => (
          <button
            key={t.id}
            type="button"
            data-testid={t.testId}
            data-active={morph === t.id ? "1" : "0"}
            onClick={() => playMorph(t.id, t.take)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {looks.length > 0 ? (
        <div className="lumen-glass__looks" data-testid="lumen-looks" role="list">
          {looks.map((look) => (
            <button
              key={look.id}
              type="button"
              role="listitem"
              data-testid={`lumen-look-${look.id}`}
              data-active={activeLook === look.id ? "1" : "0"}
              onClick={() => onLoad(look.id)}
            >
              {look.label}
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        className="lumen-glass__mixer"
        data-testid="lumen-refresh-looks"
        hidden
        onClick={refreshLooks}
      >
        Looks
      </button>
    </div>
  );
}
