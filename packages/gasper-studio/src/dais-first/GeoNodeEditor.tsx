/**
 * Geometry Nodes — visible live pipeline. Mute and tune. Stage stays primary.
 */
import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import {
  GASPER_ORGANS,
  applyGeoEvalToHost,
  loadGeoGraph,
  saveGeoGraph,
  setNodeMuted,
  setNodeParam,
  type GeoGraph,
  type OrganStatus,
} from "../../../desktop/src/gasper/geonodes";

const STATUS_TONE: Record<OrganStatus, string> = {
  LIVE: "live",
  TWIN: "twin",
  UNHOOKED: "unhooked",
  DEAD: "dead",
};

export function GeoNodeEditor({
  embedded = false,
  tab: tabProp,
}: {
  embedded?: boolean;
  tab?: "graph" | "stack";
} = {}): ReactElement {
  const [open, setOpen] = useState(embedded);
  const [tab, setTab] = useState<"graph" | "stack">(tabProp ?? "graph");
  const [graph, setGraph] = useState<GeoGraph>(() => loadGeoGraph());

  useEffect(() => {
    if (tabProp) setTab(tabProp);
  }, [tabProp]);

  useEffect(() => {
    applyGeoEvalToHost(graph);
    saveGeoGraph(graph);
  }, [graph]);

  const selected = useMemo(
    () => graph.nodes.find((n) => n.id === graph.selected) ?? graph.nodes[0],
    [graph],
  );

  const select = useCallback((id: string) => {
    setGraph((g) => ({ ...g, selected: id }));
  }, []);

  const mute = useCallback((id: string) => {
    setGraph((g) => {
      const n = g.nodes.find((x) => x.id === id);
      return setNodeMuted(g, id, !n?.muted);
    });
  }, []);

  const param = useCallback((id: string, pid: string, value: number) => {
    setGraph((g) => setNodeParam(g, id, pid, value));
  }, []);

  const body = (
    <>
      {!embedded && !tabProp ? (
        <div className="geo-nodes__head">
          <strong>Geometry Nodes</strong>
          <span>Live pipeline · mute is passthrough</span>
          <div className="geo-nodes__cats">
            <button type="button" data-active={tab === "graph" ? "1" : "0"} onClick={() => setTab("graph")}>
              Graph
            </button>
            <button type="button" data-active={tab === "stack" ? "1" : "0"} onClick={() => setTab("stack")}>
              Stack
            </button>
          </div>
        </div>
      ) : null}
      {tab === "graph" ? (
        <>
          <div className="geo-nodes__strip" data-testid="geo-nodes-strip">
            {graph.nodes.map((n, i) => (
              <div key={n.id} className="geo-nodes__cell">
                {i > 0 ? <span className="geo-nodes__wire" /> : null}
                <button
                  type="button"
                  className="geo-nodes__node"
                  data-muted={n.muted ? "1" : "0"}
                  data-active={selected?.id === n.id ? "1" : "0"}
                  data-class={n.class}
                  onClick={() => select(n.id)}
                >
                  <em>{n.label}</em>
                  <small>{n.class}</small>
                </button>
                <button type="button" className="geo-nodes__mute" onClick={() => mute(n.id)}>
                  {n.muted ? "Muted" : "Mute"}
                </button>
              </div>
            ))}
          </div>
          {selected ? (
            <div className="geo-nodes__inspect" data-testid="geo-nodes-inspect">
              <header>
                <strong>{selected.label}</strong>
                <span>{selected.organId}</span>
              </header>
              {selected.params.length === 0 ? (
                <p>Output. closedSpline is the only d writer.</p>
              ) : (
                selected.params.map((p) => (
                  <label key={p.id} className="geo-nodes__slider">
                    <span>
                      {p.label}
                      <em>{p.value}</em>
                    </span>
                    <input
                      type="range"
                      min={p.min}
                      max={p.max}
                      step={p.step}
                      value={p.value}
                      disabled={selected.muted}
                      onChange={(e) => param(selected.id, p.id, Number(e.target.value))}
                    />
                  </label>
                ))
              )}
            </div>
          ) : null}
        </>
      ) : (
        <div className="geo-nodes__stack" data-testid="geo-nodes-stack">
          {GASPER_ORGANS.map((o) => (
            <div key={o.id} className="geo-nodes__organ" data-status={STATUS_TONE[o.status]}>
              <span className="geo-nodes__badge">{o.status}</span>
              <strong>{o.label}</strong>
              <small>{o.kind}</small>
              <p>{o.note}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="geo-nodes geo-nodes--embedded" data-open="1" data-testid="geo-nodes">
        {body}
      </div>
    );
  }

  return (
    <div className="geo-nodes" data-open={open ? "1" : "0"} data-testid="geo-nodes">
      <button type="button" className="geo-nodes__tab" onClick={() => setOpen((v) => !v)}>
        Nodes
      </button>
      {open ? <div className="geo-nodes__sheet">{body}</div> : null}
    </div>
  );
}
