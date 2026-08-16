/**
 * Production Dais manipulation panel — open stage expression controls.
 * Live anchor selection, Control-as-gain, embodiment, reset, and inspection.
 * Does not claim Cody visual acceptance.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getExpressionStudioSession,
  type ExpressionSessionSnapshot,
} from "../../../desktop/src/gasper/expression";
import {
  applyExpressionToDais,
  inspectDaisExpression,
  listStudioExpressionIds,
  resetDaisExpression,
  setLiveExpressionGain,
} from "./daisManipulation";

const EMBODIMENTS = [
  "presence",
  "singularity",
  "comet",
  "dormant-orbit",
] as const;

export type ExpressionDaisPanelProps = {
  /**
   * When true, use a denser horizontal layout but still expose ALL production
   * controls (embodiment, chirality, channels, inspect output).
   */
  compact?: boolean;
};

export function ExpressionDaisPanel({
  compact = false,
}: ExpressionDaisPanelProps): React.ReactElement {
  const session = useMemo(() => getExpressionStudioSession(), []);
  const [snap, setSnap] = useState<ExpressionSessionSnapshot>(() =>
    session.getSnapshot(),
  );
  const [status, setStatus] = useState<string>("Ready");
  const [inspectJson, setInspectJson] = useState<string | null>(null);
  const fixtures = useMemo(() => listStudioExpressionIds(), []);

  useEffect(() => {
    return session.subscribe((s) => setSnap(s));
  }, [session]);

  const onExpression = useCallback((id: string) => {
    const r = applyExpressionToDais(id, {
      expressionGain: snap.expressionGain,
      embodiment: snap.embodiment,
    });
    setStatus(
      r.ok
        ? `Expression ${r.fixtureId}→${r.formMasterFixtureId} · ${r.channelCount} ch · doc=${r.documentBindingsWritten} · pose=${r.poseApplied ? 1 : 0} · livingStopped=${r.livingStopped ? 1 : 0}`
        : `Failed: ${r.error}`,
    );
    setInspectJson(null);
  }, [snap.embodiment, snap.expressionGain]);

  const onEmbodiment = useCallback(
    (id: string) => {
      session.setEmbodiment(id);
      const r = applyExpressionToDais(snap.fixtureId, {
        expressionGain: snap.expressionGain,
        embodiment: id,
      });
      setStatus(r.ok ? `Embodiment ${id}` : `Failed: ${r.error}`);
    },
    [session, snap.fixtureId, snap.expressionGain],
  );

  const onGain = useCallback((g: number) => {
    const r = setLiveExpressionGain(g);
    setStatus(
      r.ok
        ? `Control-as-gain ${g.toFixed(2)}`
        : `Gain failed: ${r.error}`,
    );
  }, []);

  const onReset = useCallback(() => {
    const r = resetDaisExpression();
    setStatus(r.ok ? "Reset → neutral-settled / presence" : `Reset failed: ${r.error}`);
    setInspectJson(null);
  }, []);

  const onInspect = useCallback(() => {
    const report = inspectDaisExpression();
    setInspectJson(JSON.stringify(report, null, 2));
    setStatus(
      `Inspect · ${report.expression.channelCount} channels · domains ${report.expression.domainsHint.join(",")}`,
    );
  }, []);

  const layoutStyle: React.CSSProperties = compact
    ? {
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontSize: 11,
        maxHeight: 280,
        overflow: "auto",
        padding: 6,
      }
    : {
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 12,
        fontSize: 12,
        maxHeight: "100%",
        overflow: "auto",
      };

  return (
    <div
      className={compact ? "expression-dais-panel compact" : "expression-dais-panel"}
      data-testid="expression-dais-panel"
      data-compact={compact ? "1" : "0"}
      data-expression-studio="1"
      style={layoutStyle}
    >
      <header>
        <h2 style={{ margin: 0, fontSize: compact ? 12 : 14 }}>Expression · Dais</h2>
        <p
          style={{ margin: "4px 0 0", opacity: 0.75 }}
          data-testid="expression-panel-note"
        >
          Deterministic 18-anchor kernel · Control-as-gain · chirality · bounded
          deformation. Not Cody visual acceptance.
        </p>
      </header>

      <section data-testid="expression-anchor-section">
        <label style={{ display: "block", marginBottom: 4 }}>Expression anchor</label>
        <select
          data-testid="expression-anchor-select"
          value={snap.fixtureId}
          onChange={(e) => onExpression(e.target.value)}
          style={{ width: "100%" }}
        >
          {fixtures.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <div data-testid="expression-family-readout" style={{ marginTop: 4, opacity: 0.8 }}>
          Family: {snap.family} · rev {snap.revision}
        </div>
      </section>

      <section data-testid="expression-embodiment-section">
        <label style={{ display: "block", marginBottom: 4 }}>Embodiment</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {EMBODIMENTS.map((id) => (
            <button
              key={id}
              type="button"
              data-testid={`embodiment-btn-${id}`}
              data-active={snap.embodiment === id ? "1" : "0"}
              className={snap.embodiment === id ? "active" : ""}
              onClick={() => onEmbodiment(id)}
            >
              {id}
            </button>
          ))}
        </div>
      </section>

      <section data-testid="expression-gain-section">
        <label style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Control-as-gain</span>
          <span data-testid="expression-gain-value">{snap.expressionGain.toFixed(2)}</span>
        </label>
        <input
          data-testid="expression-gain-slider"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={snap.expressionGain}
          onChange={(e) => onGain(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </section>

      <section data-testid="expression-chirality-section">
        <h3 style={{ margin: "0 0 4px", fontSize: 12 }}>Chirality</h3>
        <ul
          data-testid="expression-chirality-list"
          style={{ margin: 0, paddingLeft: 16, maxHeight: compact ? 72 : 120, overflow: "auto" }}
        >
          {snap.chiralitySummary.map((c) => (
            <li key={c.axis} data-axis={c.axis} data-sign={c.sign}>
              {c.axis}: {c.sign} ({c.value.toFixed(3)})
            </li>
          ))}
        </ul>
      </section>

      <section
        data-testid="expression-actions"
        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
      >
        <button type="button" data-testid="expression-reset" onClick={onReset}>
          Reset
        </button>
        <button type="button" data-testid="expression-inspect" onClick={onInspect}>
          Inspect
        </button>
        <button
          type="button"
          data-testid="expression-reapply"
          onClick={() => onExpression(snap.fixtureId)}
        >
          Re-apply
        </button>
      </section>

      <div data-testid="expression-status" style={{ opacity: 0.9 }}>
        {status}
      </div>
      {snap.transitionDecision ? (
        <div data-testid="expression-transition" style={{ opacity: 0.75 }}>
          Transition: {snap.transitionDecision}
        </div>
      ) : null}

      {inspectJson ? (
        <pre
          data-testid="expression-inspect-output"
          style={{
            fontSize: 10,
            maxHeight: compact ? 100 : 200,
            overflow: "auto",
            background: "rgba(0,0,0,0.25)",
            padding: 8,
            borderRadius: 4,
          }}
        >
          {inspectJson}
        </pre>
      ) : null}

      <section data-testid="expression-channel-inspector">
        <h3 style={{ margin: "0 0 4px", fontSize: 12 }}>
          Channels ({Object.keys(snap.channels).length})
        </h3>
        <ul
          style={{
            margin: 0,
            paddingLeft: 16,
            maxHeight: compact ? 80 : 160,
            overflow: "auto",
            fontFamily: "ui-monospace, monospace",
            fontSize: 10,
          }}
        >
          {Object.entries(snap.channels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => (
              <li key={k} data-channel={k}>
                {k}: {v.toFixed(4)}
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

export default ExpressionDaisPanel;
