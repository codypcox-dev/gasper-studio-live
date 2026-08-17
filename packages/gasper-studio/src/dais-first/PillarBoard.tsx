/**
 * Play board — one slider per authorable domain. Writes named hooks only.
 */
import { useEffect, useState, type ReactElement } from "react";
import { applySkinTake, type SkinTake } from "./LumenGlass";

type TauField = { foot: number; waist: number; crown: number };

function publishTau(field: TauField): void {
  (globalThis as { __GASPER_TAU_FIELD__?: TauField }).__GASPER_TAU_FIELD__ = field;
}

function publishTempo(tempo: number): void {
  (globalThis as { __GASPER_GAIT_TEMPO__?: number }).__GASPER_GAIT_TEMPO__ = tempo;
}

function publishOrbit(yaw: number, pitch: number): void {
  const host = globalThis as {
    __GASPER_ORBIT_YAW__?: number;
    __GASPER_ORBIT_PITCH__?: number;
    SidekickFormMasterRig?: { setOrbit?: (y: number, p: number) => void };
  };
  host.__GASPER_ORBIT_YAW__ = yaw;
  host.__GASPER_ORBIT_PITCH__ = pitch;
  host.SidekickFormMasterRig?.setOrbit?.(yaw, pitch);
}

function publishShape(footAmp: number, cleftDepth: number): void {
  const host = globalThis as {
    __GASPER_LIVE_COEFFS__?: { wispwalker?: { footAmp?: number; cleftDepth?: number } };
  };
  if (!host.__GASPER_LIVE_COEFFS__) host.__GASPER_LIVE_COEFFS__ = {};
  host.__GASPER_LIVE_COEFFS__.wispwalker = {
    ...(host.__GASPER_LIVE_COEFFS__.wispwalker ?? {}),
    footAmp,
    cleftDepth,
  };
}

function Dial({
  label,
  value,
  min,
  max,
  step,
  onChange,
  testid,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  testid: string;
}): ReactElement {
  return (
    <label className="pillar-board__dial">
      <span>
        {label}
        <em>{step >= 1 ? value.toFixed(0) : value.toFixed(2)}</em>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        data-testid={testid}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function PillarBoard({
  take,
  onTake,
}: {
  take: SkinTake;
  onTake: (id: SkinTake) => void;
}): ReactElement {
  const [tau, setTau] = useState<TauField>({ foot: 0.04, waist: 0.08, crown: 0.28 });
  const [tempo, setTempo] = useState(1);
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [footAmp, setFootAmp] = useState(4);
  const [cleft, setCleft] = useState(3.2);

  useEffect(() => {
    publishTau(tau);
  }, [tau]);
  useEffect(() => {
    publishTempo(tempo);
  }, [tempo]);
  useEffect(() => {
    publishOrbit(yaw, pitch);
  }, [yaw, pitch]);
  useEffect(() => {
    publishShape(footAmp, cleft);
  }, [footAmp, cleft]);

  return (
    <div className="pillar-board" data-testid="pillar-board">
      <section>
        <h3>Shape</h3>
        <div className="pillar-board__pills">
          {([
            ["neutral", "Rest"],
            ["puff", "Puff"],
            ["goose", "Goose"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-active={take === id ? "1" : "0"}
              onClick={() => {
                onTake(id);
                applySkinTake(id);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <Dial label="Foot nub" value={footAmp} min={0} max={10} step={0.1} testid="pillar-foot" onChange={setFootAmp} />
        <Dial label="Cleft" value={cleft} min={0} max={8} step={0.1} testid="pillar-cleft" onChange={setCleft} />
      </section>
      <section>
        <h3>Material · τ</h3>
        <p>Small = solid. Large = gel. Feet → crown.</p>
        <Dial label="Feet" value={tau.foot} min={0.02} max={0.5} step={0.01} testid="pillar-tau-foot" onChange={(foot) => setTau((t) => ({ ...t, foot }))} />
        <Dial label="Waist" value={tau.waist} min={0.02} max={0.5} step={0.01} testid="pillar-tau-waist" onChange={(waist) => setTau((t) => ({ ...t, waist }))} />
        <Dial label="Crown" value={tau.crown} min={0.02} max={0.6} step={0.01} testid="pillar-tau-crown" onChange={(crown) => setTau((t) => ({ ...t, crown }))} />
      </section>
      <section>
        <h3>Locomotion</h3>
        <p>Walk lives on the machine strip. This is tempo.</p>
        <Dial label="Tempo" value={tempo} min={0.75} max={1.25} step={0.01} testid="pillar-tempo" onChange={setTempo} />
      </section>
      <section>
        <h3>View</h3>
        <Dial label="Yaw" value={yaw} min={-180} max={180} step={1} testid="pillar-yaw" onChange={setYaw} />
        <Dial label="Pitch" value={pitch} min={-80} max={80} step={1} testid="pillar-pitch" onChange={setPitch} />
      </section>
    </div>
  );
}
