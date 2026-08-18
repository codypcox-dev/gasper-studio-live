/**
 * Stage look inspector — orbit, identity, authored τ field, cage wrap/spec.
 * Writes Cook params through setNodeParam. Not InstrumentTable.
 */
import { type ReactElement } from "react";
import { setNodeParam } from "../../../desktop/src/gasper/geonodes";
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

const DIALS: Dial[] = [
  { testid: "look-orbit-yaw", node: "orbit", param: "yaw", label: "Orbit", min: -180, max: 180, step: 1 },
  { testid: "look-foot", node: "identity", param: "footAmp", label: "Foot", min: 0, max: 8, step: 0.1 },
  { testid: "look-cleft", node: "identity", param: "cleftDepth", label: "Cleft", min: 0, max: 6.4, step: 0.1 },
  { testid: "look-tau-foot", node: "voigt", param: "foot", label: "τ foot", min: 0.02, max: 0.2, step: 0.005 },
  { testid: "look-tau-waist", node: "voigt", param: "waist", label: "τ waist", min: 0.02, max: 0.24, step: 0.005 },
  { testid: "look-tau-crown", node: "voigt", param: "crown", label: "τ crown", min: 0.04, max: 0.6, step: 0.01 },
  { testid: "look-spec", node: "cage-light", param: "spec", label: "Spec", min: -1, max: 1, step: 0.02 },
  { testid: "look-wrap", node: "cage-light", param: "wrap", label: "Wrap", min: -1, max: 1, step: 0.02 },
];

function readParam(graph: { nodes: { id: string; params: { id: string; value: number }[] }[] }, node: string, param: string, fallback: number): number {
  return graph.nodes.find((n) => n.id === node)?.params.find((p) => p.id === param)?.value ?? fallback;
}

export function StageLookInspector(): ReactElement {
  const { graph, commit } = useStudioSession();
  return (
    <aside className="stage-look" data-testid="stage-look-inspector">
      <header>
        <strong>Look</strong>
        <span>cage · τ · light</span>
      </header>
      <div className="stage-look__dials">
        {DIALS.map((d) => {
          const value = readParam(graph, d.node, d.param, d.min);
          return (
            <label key={d.testid}>
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
                  commit((g) => setNodeParam(g, d.node, d.param, next));
                }}
              />
            </label>
          );
        })}
      </div>
    </aside>
  );
}
