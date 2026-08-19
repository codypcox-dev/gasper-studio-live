/**
 * One transport. After Effects / Rive / Cavalry: play, pause, loop, scrub.
 * The badge rail is not a studio.
 */
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { ScoreDopesheet } from "./ScoreDopesheet";
import { VersionStrip } from "./VersionStrip";
import {
  formatPlayhead,
  pauseStudio,
  readPlayhead,
  releaseScrub,
  scrubStudio,
  stopStudio,
  toggleStudioPlayback,
  type StudioPlayhead,
} from "./studioClock";

export type DeskMode = "stage" | "graph";

export function StudioTransport({
  mode,
  onMode,
  gridOn,
  onGrid,
  bonesOn,
  onBones,
  loopOn,
  onLoop,
  recOn,
  onRec,
  onHome,
  onTwenty,
}: {
  mode: DeskMode;
  onMode: (m: DeskMode) => void;
  gridOn: boolean;
  onGrid: () => void;
  bonesOn: boolean;
  onBones: () => void;
  loopOn: boolean;
  onLoop: () => void;
  recOn: boolean;
  onRec: () => void;
  onHome: () => void;
  onTwenty: () => void;
}): ReactElement {
  const [ph, setPh] = useState<StudioPlayhead>(() => readPlayhead());
  const [scoreGraph, setScoreGraph] = useState(false);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setPh(readPlayhead());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const playPause = useCallback(() => {
    toggleStudioPlayback();
    setPh(readPlayhead());
  }, []);

  const stop = useCallback(() => {
    stopStudio();
    onHome();
    setPh(readPlayhead());
  }, [onHome]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.code === "Space" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        playPause();
      }
      if ((e.key === "k" || e.key === "K") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        playPause();
      }
      if ((e.key === "l" || e.key === "L") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onLoop();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [playPause, onLoop]);

  const label = formatPlayhead(ph);
  const playing = ph.playing && !ph.paused;

  return (
    <div className="studio-transport" data-testid="studio-transport">
      <div className="studio-transport__bar" role="toolbar" aria-label="Studio transport">
        <div className="studio-transport__modes" role="tablist" aria-label="Workspace">
          <button type="button" data-active={mode === "stage" ? "1" : "0"} data-testid="desk-mode-stage" onClick={() => onMode("stage")}>
            Stage
          </button>
          <button type="button" data-active={mode === "graph" ? "1" : "0"} data-testid="desk-chapter-nodes" onClick={() => onMode("graph")}>
            Graph
          </button>
        </div>

        <div className="studio-transport__play" role="group" aria-label="Playback">
          <button type="button" data-testid="desk-home" title="Rest / stop" onClick={stop}>
            ■
          </button>
          <button
            type="button"
            data-testid="studio-transport-play"
            data-active={playing ? "1" : "0"}
            title={playing ? "Pause (Space)" : "Play (Space)"}
            onClick={playPause}
          >
            {playing ? "❚❚" : "▶"}
          </button>
          <button type="button" data-testid="lumen-play-twenty" title="Play the 20s take" onClick={onTwenty}>
            20s
          </button>
          <button type="button" data-testid="desk-loop" data-active={loopOn ? "1" : "0"} title="Loop (L)" onClick={onLoop}>
            ↺
          </button>
        </div>

        <div className="studio-transport__tl" data-testid="studio-timeline">
          <span data-testid="studio-timecode">{label.now}</span>
          <input
            type="range"
            min={0}
            max={ph.dur}
            step={ph.mode === "take" ? 16 : 0.01}
            value={ph.t}
            aria-label="Scrub animation"
            data-testid="studio-scrub"
            onPointerDown={() => pauseStudio()}
            onPointerUp={() => releaseScrub()}
            onChange={(e) => {
              const next = scrubStudio(Number(e.target.value));
              setPh(next);
            }}
          />
          <span>{label.end}</span>
          <button
            type="button"
            className="studio-transport__switch"
            data-testid="score-graph-toggle"
            data-active={scoreGraph ? "1" : "0"}
            role="switch"
            aria-checked={scoreGraph}
            title="Value graph of the selected score channel"
            onClick={() => setScoreGraph((on) => !on)}
          >
            Curves
          </button>
        </div>

        <div className="studio-transport__tools" role="group" aria-label="Stage tools">
          <button
            type="button"
            className="studio-transport__switch"
            data-testid="lumen-bones-toggle"
            data-active={bonesOn ? "1" : "0"}
            role="switch"
            aria-checked={bonesOn}
            onClick={onBones}
          >
            Bones
          </button>
          <button
            type="button"
            className="studio-transport__switch"
            data-testid="lumen-grid-toggle"
            data-active={gridOn ? "1" : "0"}
            role="switch"
            aria-checked={gridOn}
            onClick={onGrid}
          >
            Grid
          </button>
          <button type="button" data-testid="lumen-rec-take" data-active={recOn ? "1" : "0"} onClick={onRec}>
            {recOn ? "Rec ●" : "Rec"}
          </button>
        </div>
      </div>
      <VersionStrip />
      <ScoreDopesheet graphView={scoreGraph} playhead={ph} />
    </div>
  );
}
