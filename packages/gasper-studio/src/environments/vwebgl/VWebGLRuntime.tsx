import { useEffect, useRef, useState, type ReactNode } from "react";
import { DraggablePanel } from "../DraggablePanel";
import {
  readBaseline,
  readLive,
  writeBaseline,
  writeLive,
} from "./baseline";
import { createVWebGLEngine, type VWebGLEngine, type VWebGLParams } from "./createVWebGLEngine";

function Slider({
  label,
  min,
  max,
  step,
  value,
  testId,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  testId?: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="vwebgl-slider">
      <span>
        {label}
        <em>{value.toFixed(step < 1 ? 2 : 0)}</em>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        data-testid={testId}
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="vwebgl-section">
      <h3 className="vwebgl-section__title">{title}</h3>
      {children}
    </section>
  );
}

export function VWebGLRuntime({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<VWebGLEngine | null>(null);
  const [params, setParams] = useState<VWebGLParams>(() => readLive());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createVWebGLEngine(canvas, {
      initial: readLive(),
      onChange: (p) => {
        setParams(p);
        writeLive(p);
      },
    });
    engineRef.current = engine;
    engine.setActive(active);
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setActive(active);
  }, [active]);

  useEffect(() => {
    const onReset = () => {
      const base = readBaseline();
      setParams(base);
      writeLive(base);
      engineRef.current?.setParams(base);
    };
    window.addEventListener("gasper-reset-vwebgl", onReset);
    return () => window.removeEventListener("gasper-reset-vwebgl", onReset);
  }, []);

  const patch = (p: Partial<VWebGLParams>) => {
    const next = { ...params, ...p };
    setParams(next);
    writeLive(next);
    engineRef.current?.setParams(p);
  };

  const reset = () => {
    const base = readBaseline();
    setParams(base);
    writeLive(base);
    engineRef.current?.setParams(base);
  };

  const setBase = () => {
    writeBaseline(params);
  };

  return (
    <div
      className="vwebgl-runtime"
      data-testid="vwebgl-runtime"
      data-runtime="three-webgl"
      data-on={active ? "1" : "0"}
      aria-hidden={!active}
    >
      <canvas ref={canvasRef} className="vwebgl-canvas" data-testid="vwebgl-canvas" />
      {active ? (
        <DraggablePanel
          id="vwebgl-settings"
          title="vWebGL"
          defaultX={16}
          defaultY={56}
          testId="vwebgl-rail"
          headerExtra={
            <span className="gasper-float__actions">
              <button type="button" data-testid="vwebgl-reset" onClick={reset}>
                Reset
              </button>
              <button type="button" data-testid="vwebgl-set-baseline" onClick={setBase}>
                Set baseline
              </button>
            </span>
          }
        >
          <Section title="Transform">
            <label className="vwebgl-check">
              <input
                type="checkbox"
                checked={params.autoOrbit}
                onChange={(e) => patch({ autoOrbit: e.target.checked })}
                data-testid="vwebgl-auto-orbit"
              />
              Auto orbit
            </label>
            <Slider
              label="Yaw"
              min={0}
              max={360}
              step={1}
              value={params.yaw}
              testId="vwebgl-yaw"
              onChange={(yaw) => patch({ yaw, autoOrbit: false })}
            />
            <Slider
              label="Pitch"
              min={-50}
              max={50}
              step={1}
              value={params.pitch}
              testId="vwebgl-pitch"
              onChange={(pitch) => patch({ pitch })}
            />
          </Section>

          <Section title="Volume">
            <Slider
              label="Depth"
              min={0.25}
              max={1.2}
              step={0.02}
              value={params.depth}
              onChange={(depth) => patch({ depth })}
            />
          </Section>

          <Section title="Light">
            <Slider
              label="Key"
              min={0.1}
              max={2.6}
              step={0.05}
              value={params.key}
              onChange={(key) => patch({ key })}
            />
            <Slider
              label="Rim"
              min={0}
              max={1.6}
              step={0.05}
              value={params.rim}
              onChange={(rim) => patch({ rim })}
            />
            <Slider
              label="Fill"
              min={0}
              max={1.6}
              step={0.05}
              value={params.fill}
              onChange={(fill) => patch({ fill })}
            />
            <Slider
              label="Hemi"
              min={0}
              max={1.6}
              step={0.05}
              value={params.hemi}
              onChange={(hemi) => patch({ hemi })}
            />
          </Section>

          <Section title="Surface">
            <Slider
              label="Rough"
              min={0}
              max={1}
              step={0.02}
              value={params.roughness}
              onChange={(roughness) => patch({ roughness })}
            />
            <Slider
              label="Metal"
              min={0}
              max={1}
              step={0.02}
              value={params.metalness}
              onChange={(metalness) => patch({ metalness })}
            />
            <Slider
              label="Coat"
              min={0}
              max={1}
              step={0.02}
              value={params.clearcoat}
              onChange={(clearcoat) => patch({ clearcoat })}
            />
            <Slider
              label="Glass"
              min={0}
              max={0.6}
              step={0.02}
              value={params.transmission}
              onChange={(transmission) => patch({ transmission })}
            />
          </Section>
        </DraggablePanel>
      ) : null}
    </div>
  );
}
