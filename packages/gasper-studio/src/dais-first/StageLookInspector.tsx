/**
 * Stage look inspector — form, orbit, skeleton, identity, authored τ field, cage wrap/spec/key.
 * Writes Cook params through setNodeParam. Not InstrumentTable.
 * Dual killed: hidden-form = canonical-embodiment; costume-dial = organism-dial; page-bag = selection-inspector.
 */
import { useEffect, useState, type ReactElement } from "react";
import { setNodeParam } from "../../../desktop/src/gasper/geonodes";
import { DraggablePanel } from "../environments/DraggablePanel";
import { useStudioSession } from "./StudioSession";

type Dial = {
  testid: string;
  node: string;
  param: string;
  label: string;
  min: number;
  max: number;
  step: number;
};

const FORMS: { id: string; label: string; idx: number }[] = [
  { id: "presence", label: "Presence", idx: 0 },
  { id: "singularity", label: "Singularity", idx: 1 },
  { id: "comet", label: "Comet", idx: 2 },
  { id: "dormant-orbit", label: "Dormant", idx: 3 },
  { id: "wispwalker", label: "Wispwalker", idx: 4 },
  { id: "halo", label: "Halo", idx: 5 },
  { id: "lantern", label: "Lantern", idx: 6 },
  { id: "low-orbit", label: "Low orbit", idx: 7 },
];

const PAGES: { id: string; label: string; dials: Dial[] }[] = [
  {
    id: "form",
    label: "Form",
    dials: [
      { testid: "look-foot", node: "identity", param: "footAmp", label: "Foot", min: 0, max: 8, step: 0.1 },
      { testid: "look-cleft", node: "identity", param: "cleftDepth", label: "Cleft", min: 0, max: 6.4, step: 0.1 },
      { testid: "look-crown", node: "identity", param: "crownAmp", label: "Crown", min: -10, max: 2, step: 0.1 },
      { testid: "look-lobe", node: "identity", param: "lobeAmp", label: "Lobe", min: 0, max: 8, step: 0.1 },
    ],
  },
  {
    id: "orbit",
    label: "Orbit",
    dials: [
      { testid: "look-orbit-yaw", node: "orbit", param: "yaw", label: "Orbit yaw", min: -180, max: 180, step: 1 },
      { testid: "look-orbit-pitch", node: "orbit", param: "pitch", label: "Orbit pitch", min: -80, max: 80, step: 1 },
      { testid: "look-puff", node: "envelope", param: "rScale", label: "Puff", min: 0.7, max: 1.07, step: 0.005 },
      { testid: "look-collapse", node: "envelope", param: "collapse", label: "Collapse", min: 0, max: 1, step: 0.01 },
      { testid: "look-hook", node: "envelope", param: "hook", label: "Hook", min: -24, max: 24, step: 0.5 },
    ],
  },
  {
    id: "flesh",
    label: "Flesh",
    dials: [
      { testid: "look-tau-foot", node: "voigt", param: "foot", label: "τ foot", min: 0.02, max: 0.2, step: 0.005 },
      { testid: "look-tau-waist", node: "voigt", param: "waist", label: "τ waist", min: 0.02, max: 0.24, step: 0.005 },
      { testid: "look-tau-crown", node: "voigt", param: "crown", label: "τ crown", min: 0.04, max: 0.6, step: 0.01 },
      { testid: "look-soft-radius", node: "cage", param: "soft", label: "Soft σ", min: 0, max: 6, step: 0.1 },
    ],
  },
  {
    id: "light",
    label: "Light",
    dials: [
      { testid: "look-spec", node: "cage-light", param: "spec", label: "Spec", min: -1, max: 1, step: 0.02 },
      { testid: "look-wrap", node: "cage-light", param: "wrap", label: "Wrap", min: -1, max: 1, step: 0.02 },
      { testid: "look-key-az", node: "cage-light", param: "keyAz", label: "Key az", min: -180, max: 180, step: 1 },
      { testid: "look-key-el", node: "cage-light", param: "keyEl", label: "Key el", min: -80, max: 80, step: 1 },
    ],
  },
  {
    id: "paint",
    label: "Paint",
    dials: [
      { testid: "look-paint-gain", node: "cage", param: "paintGain", label: "Brush", min: -1, max: 1, step: 0.02 },
      { testid: "look-heat-iters", node: "cage", param: "heatIters", label: "Heat", min: 0, max: 24, step: 1 },
    ],
  },
];

const BONES: { id: number; label: string; testid: string }[] = [
  { id: 0, label: "Crown", testid: "look-bone-crown" },
  { id: 1, label: "Torso", testid: "look-bone-torso" },
  { id: 2, label: "Crotch", testid: "look-bone-crotch" },
  { id: 3, label: "Plant L", testid: "look-bone-plantl" },
  { id: 4, label: "Plant R", testid: "look-bone-plantr" },
];

function readParam(graph: { nodes: { id: string; params: { id: string; value: number }[] }[] }, node: string, param: string, fallback: number): number {
  return graph.nodes.find((n) => n.id === node)?.params.find((p) => p.id === param)?.value ?? fallback;
}

export function StageLookInspector(): ReactElement {
  const { graph, commit } = useStudioSession();
  const [page, setPage] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [liveOrbit, setLiveOrbit] = useState({ yaw: 8, pitch: 0 });
  const [liveForm, setLiveForm] = useState("wispwalker");
  const bonesOn = readParam(graph, "envelope", "bones", 0) > 0.5;
  const gridOn = readParam(graph, "cage", "grid", 0) > 0.5;
  const isolateOn = readParam(graph, "cage", "isolate", 0) > 0.5 && readParam(graph, "cage", "soft", 0) <= 0.05;
  const softOn = readParam(graph, "cage", "soft", 0) > 0.05;
  const frontOn = readParam(graph, "cage", "front", 1) > 0.5;
  const xrayOn = readParam(graph, "cage", "xray", 0) > 0.5;
  const paintOn = readParam(graph, "cage", "paint", 0) > 0.5;
  const bone = Math.round(readParam(graph, "cage", "bone", 2));
  const flip = (node: string, param: string, next: boolean, flag: "__GASPER_SHOW_SKELETON__" | "__GASPER_SHOW_GRID__") => {
    (globalThis as Record<string, unknown>)[flag] = next;
    commit((g) => setNodeParam(g, node, param, next ? 1 : 0));
  };
  const setIsolate = () => {
    (globalThis as { __GASPER_ISOLATE__?: boolean; __GASPER_SOFT_RADIUS__?: number }).__GASPER_ISOLATE__ = true;
    (globalThis as { __GASPER_SOFT_RADIUS__?: number }).__GASPER_SOFT_RADIUS__ = 0;
    commit((g) => {
      let next = setNodeParam(g, "cage", "isolate", 1);
      return setNodeParam(next, "cage", "soft", 0);
    });
  };
  const setSoft = () => {
    const nextOn = !softOn;
    (globalThis as { __GASPER_ISOLATE__?: boolean; __GASPER_SOFT_RADIUS__?: number }).__GASPER_ISOLATE__ = !nextOn;
    (globalThis as { __GASPER_SOFT_RADIUS__?: number }).__GASPER_SOFT_RADIUS__ = nextOn ? 2.6 : 0;
    commit((g) => {
      let next = setNodeParam(g, "cage", "isolate", nextOn ? 0 : 1);
      return setNodeParam(next, "cage", "soft", nextOn ? 2.6 : 0);
    });
  };
  const armTurntable = (on: boolean, restore = true) => {
    type Rig = { setTurntable?: (on: boolean, restore?: boolean) => void };
    const host = globalThis as { __GASPER_TURNTABLE__?: boolean; SidekickFormMasterRig?: Rig };
    host.__GASPER_TURNTABLE__ = on;
    host.SidekickFormMasterRig?.setTurntable?.(on, restore);
    setSpinning(on);
  };
  useEffect(() => {
    const host = globalThis as {
      __GASPER_TURNTABLE__?: boolean;
      __GASPER_SHOW_SKELETON__?: boolean;
      __GASPER_SHOW_GRID__?: boolean;
      __GASPER_ISOLATE__?: boolean;
      SidekickFormMasterRig?: {
        setTurntable?: (on: boolean, restore?: boolean) => void;
        setProfile?: (id: string, s?: boolean | string) => void;
        setOrbit?: (yaw: number, pitch: number) => void;
      };
    };
    host.__GASPER_TURNTABLE__ = false;
    host.__GASPER_SHOW_SKELETON__ = false;
    host.__GASPER_SHOW_GRID__ = false;
    host.__GASPER_ISOLATE__ = false;
    host.SidekickFormMasterRig?.setTurntable?.(false, true);
    host.SidekickFormMasterRig?.setProfile?.("wispwalker", "settle");
    host.SidekickFormMasterRig?.setOrbit?.(8, 0);
    commit((g) => {
      let n = setNodeParam(g, "envelope", "bones", 0);
      n = setNodeParam(n, "cage", "grid", 0);
      n = setNodeParam(n, "cage", "xray", 0);
      return setNodeParam(n, "cage", "paint", 0);
    });
    const poll = window.setInterval(() => {
      const host = globalThis as { __GASPER_ORBIT_YAW__?: number; __GASPER_ORBIT_PITCH__?: number };
      setLiveOrbit({
        yaw: Number(host.__GASPER_ORBIT_YAW__ ?? 8),
        pitch: Number(host.__GASPER_ORBIT_PITCH__ ?? 0),
      });
      const snap = (globalThis as { SidekickFormMasterRig?: { getSnapshot?: () => { profile?: string } } }).SidekickFormMasterRig?.getSnapshot?.();
      const form = snap?.profile || (host as { __GASPER_EMBODIMENT__?: string }).__GASPER_EMBODIMENT__;
      if (form) setLiveForm(form);
    }, 80);
    return () => {
      window.clearInterval(poll);
    };
  }, []);
  useEffect(() => {
    if (paintOn) setPage(4);
  }, [paintOn]);
  useEffect(() => {
    if (spinning) setPage(1);
  }, [spinning]);
  const current = PAGES[page] ?? PAGES[0]!;
  return (
    <DraggablePanel
      id="look-inspector"
      title="Look"
      defaultX={(typeof window !== "undefined" ? window.innerWidth : 1280) - 340}
      defaultY={56}
      testId="stage-look-inspector"
      headerExtra={
        <button
          type="button"
          className="gasper-mode-reset"
          data-testid="look-reset"
          onClick={() => {
            const rig = (
              globalThis as {
                SidekickFormMasterRig?: {
                  setOrbit?: (y: number, p: number) => void;
                  setYaw?: (n: number) => void;
                  setTurntable?: (on: boolean, restore?: boolean) => void;
                  setProfile?: (id: string, s?: boolean | string) => void;
                };
              }
            ).SidekickFormMasterRig;
            rig?.setTurntable?.(false, true);
            rig?.setProfile?.("wispwalker", "settle");
            rig?.setOrbit?.(8, 0);
            rig?.setYaw?.(8);
            setLiveForm("wispwalker");
          }}
        >
          Reset
        </button>
      }
    >
    <div className="stage-look" data-page={current.id} data-select={current.id}>
      <header>
        <strong>Look</strong>
        <span>{spinning ? `spin ${liveOrbit.yaw.toFixed(0)}° · ${liveOrbit.pitch.toFixed(0)}°` : liveForm}</span>
      </header>
      <div className="stage-look__switches">
        <button type="button" className="stage-look__switch" data-testid="look-turntable" data-active={spinning ? "1" : "0"} role="switch" aria-checked={spinning} title="Spin the solid. Same orbit writers. Off restores home." onClick={() => armTurntable(!spinning, true)}>Turntable</button>
        <button type="button" className="stage-look__switch" data-testid="look-bones" data-active={bonesOn ? "1" : "0"} role="switch" aria-checked={bonesOn} onClick={() => flip("envelope", "bones", !bonesOn, "__GASPER_SHOW_SKELETON__")}>Bones</button>
        <button type="button" className="stage-look__switch" data-testid="look-grid" data-active={gridOn ? "1" : "0"} role="switch" aria-checked={gridOn} onClick={() => flip("cage", "grid", !gridOn, "__GASPER_SHOW_GRID__")}>Grid</button>
        <button type="button" className="stage-look__switch" data-testid="look-isolate" data-active={isolateOn ? "1" : "0"} role="switch" aria-checked={isolateOn} title="Pull one cage point. Neighbors stay." onClick={setIsolate}>Isolate</button>
        <button type="button" className="stage-look__switch" data-testid="look-soft" data-active={softOn ? "1" : "0"} role="switch" aria-checked={softOn} title="Gaussian smear. Off = isolate." onClick={setSoft}>Soft</button>
        <button type="button" className="stage-look__switch" data-testid="look-front" data-active={frontOn ? "1" : "0"} role="switch" aria-checked={frontOn} title="Hide cage behind the solid." onClick={() => { (globalThis as { __GASPER_FRONT_CAGE__?: boolean }).__GASPER_FRONT_CAGE__ = !frontOn; commit((g) => setNodeParam(g, "cage", "front", frontOn ? 0 : 1)); }}>Front</button>
        <button type="button" className="stage-look__switch" data-testid="look-xray" data-active={xrayOn ? "1" : "0"} role="switch" aria-checked={xrayOn} title="See and pick back verts." onClick={() => { (globalThis as { __GASPER_CAGE_XRAY__?: boolean }).__GASPER_CAGE_XRAY__ = !xrayOn; commit((g) => setNodeParam(g, "cage", "xray", xrayOn ? 0 : 1)); }}>X-ray</button>
        <button type="button" className="stage-look__switch" data-testid="look-weights" data-active={paintOn ? "1" : "0"} role="switch" aria-checked={paintOn} title="Paint bone heat on the cage. Drag up adds, down subtracts." onClick={() => {
          const next = !paintOn;
          (globalThis as { __GASPER_WEIGHT_PAINT__?: boolean }).__GASPER_WEIGHT_PAINT__ = next;
          commit((g) => setNodeParam(g, "cage", "paint", next ? 1 : 0));
          if (next) setPage(4);
        }}>Weights</button>
      </div>
      {current.id === "form" ? (
        <div className="stage-look__forms" data-testid="look-form-chips">
          {FORMS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="stage-look__form"
              data-testid={`look-form-${f.id}`}
              data-active={liveForm === f.id ? "1" : "0"}
              title={f.label}
              onClick={() => {
                (globalThis as { __GASPER_EMBODIMENT__?: string }).__GASPER_EMBODIMENT__ = f.id;
                const rig = (globalThis as { SidekickFormMasterRig?: { setProfile?: (id: string, s?: boolean | string) => void } }).SidekickFormMasterRig;
                rig?.setProfile?.(f.id, "settle");
                setLiveForm(f.id);
                commit((g) => setNodeParam(g, "identity", "form", f.idx));
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}
      {current.id === "paint" ? (
        <div className="stage-look__bones" data-testid="look-bone-chips">
          {BONES.map((b) => (
            <button
              key={b.id}
              type="button"
              className="stage-look__bone"
              data-testid={b.testid}
              data-active={bone === b.id ? "1" : "0"}
              onClick={() => {
                (globalThis as { __GASPER_WEIGHT_BONE__?: number }).__GASPER_WEIGHT_BONE__ = b.id;
                commit((g) => setNodeParam(g, "cage", "bone", b.id));
              }}
            >
              {b.label}
            </button>
          ))}
          <button
            type="button"
            className="stage-look__bone"
            data-testid="look-weight-reheat"
            onClick={() => {
              (globalThis as { __GASPER_WEIGHT_REHEAT__?: boolean }).__GASPER_WEIGHT_REHEAT__ = true;
            }}
          >
            Reheat
          </button>
          <button
            type="button"
            className="stage-look__bone"
            data-testid="look-weight-smooth"
            onClick={() => {
              (globalThis as { __GASPER_WEIGHT_SMOOTH__?: boolean }).__GASPER_WEIGHT_SMOOTH__ = true;
            }}
          >
            Smooth
          </button>
        </div>
      ) : null}
      <nav className="stage-look__pages" data-testid="look-pages">
        {PAGES.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className="stage-look__page"
            data-testid={`look-page-${p.id}`}
            data-active={i === page ? "1" : "0"}
            onClick={() => setPage(i)}
          >
            {p.label}
          </button>
        ))}
      </nav>
      <div className="stage-look__dials">
        {PAGES.flatMap((p) =>
          p.dials.map((d) => {
            const graphValue = readParam(graph, d.node, d.param, (d.min + d.max) / 2);
            const value =
              spinning && d.node === "orbit" && d.param === "yaw"
                ? liveOrbit.yaw
                : spinning && d.node === "orbit" && d.param === "pitch"
                  ? liveOrbit.pitch
                  : graphValue;
            const hidden = p.id !== current.id;
            return (
              <label key={d.testid} hidden={hidden} data-page={p.id}>
                <span>{d.label}</span>
                <b>{Number.isInteger(d.step) ? value.toFixed(0) : value.toFixed(d.step < 0.01 ? 3 : 2)}</b>
                <input
                  type="range"
                  data-testid={d.testid}
                  min={d.min}
                  max={d.max}
                  step={d.step}
                  value={value}
                  aria-label={d.label}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (d.node === "orbit" && spinning) armTurntable(false, false);
                    commit((g) => setNodeParam(g, d.node, d.param, next));
                  }}
                />
              </label>
            );
          }),
        )}
      </div>
    </div>
    </DraggablePanel>
  );
}
