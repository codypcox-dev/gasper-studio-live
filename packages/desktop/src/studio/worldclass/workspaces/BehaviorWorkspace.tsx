/**
 * Affect job workspace — compiler loop (Lane E) + overview cards.
 */
import { useState, type ReactNode } from "react";
import type { WorldClassStudioAdapter, WorldClassStudioSnapshot } from "../adapter/types";
import { StageFrame } from "../shell/StageFrame";

export function BehaviorWorkspace({
  snap,
  stageSlot,
  adapter,
}: {
  snap: WorldClassStudioSnapshot;
  stageSlot: ReactNode;
  adapter?: WorldClassStudioAdapter;
}) {
  const o = snap.behaviorOverview;
  const available = snap.jobAvailability?.affect ?? snap.behaviorAvailable;
  const compile = snap.affectCompile;
  const [seed, setSeed] = useState(compile?.seed ?? 1);
  const [preset, setPreset] = useState(compile?.presetId ?? "hold");

  const onCompile = () => {
    adapter?.compileAffectPreset?.(preset, seed);
  };

  return (
    <div
      className="gwc-center"
      data-testid="gwc-workspace-affect"
      data-workspace="affect"
      data-job="affect"
      data-legacy-workspace="behavior"
      data-available={available ? "true" : "false"}
      data-authoring={available ? "true" : "false"}
    >
      <div className="gwc-behavior-layout" data-testid="gwc-behavior-layout">
        <div className="gwc-behavior-shell" data-testid="gwc-behavior-notice">
          <h2>Affect</h2>
          <p>
            {snap.behaviorNote ||
              "Compile PerformanceIntent through the Studio Affect compiler (provisional contracts)."}
          </p>
          <span className="gwc-pill" data-testid="gwc-affect-availability">
            {available ? "Compiler active" : "Unavailable"}
          </span>
        </div>

        {available && adapter?.compileAffectPreset ? (
          <div
            className="gwc-affect-compile"
            data-testid="gwc-affect-compile"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              padding: "8px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <label style={{ fontSize: 12, textTransform: "none" }}>
              Preset{" "}
              <select
                data-testid="gwc-affect-preset"
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
              >
                <option value="hold">Presence hold</option>
                <option value="notice-hold">Notice → hold</option>
                <option value="thinking-knit">Thinking knit</option>
              </select>
            </label>
            <label style={{ fontSize: 12, textTransform: "none" }}>
              Seed{" "}
              <input
                data-testid="gwc-affect-seed"
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                style={{ width: 72 }}
              />
            </label>
            <button
              type="button"
              className="gwc-btn gwc-btn-primary"
              data-testid="gwc-affect-compile-btn"
              onClick={onCompile}
            >
              Compile
            </button>
            {adapter.applyAffectCompileHints ? (
              <button
                type="button"
                className="gwc-btn gwc-btn-ghost"
                data-testid="gwc-affect-apply-btn"
                disabled={!compile?.ok}
                onClick={() => adapter.applyAffectCompileHints?.()}
              >
                Apply embodiment/expression
              </button>
            ) : null}
            {compile?.ok && compile.irHash ? (
              <span data-testid="gwc-affect-ir-hash" style={{ fontSize: 12, opacity: 0.85 }}>
                IR <code>{compile.irHash.slice(0, 16)}…</code>
              </span>
            ) : null}
            {compile && !compile.ok ? (
              <span data-testid="gwc-affect-error" style={{ fontSize: 12, color: "#f88" }}>
                {(compile.issues || []).join(", ")}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="gwc-behavior-grid" data-testid="gwc-behavior-overview">
          <BehaviorCard
            title="Expression fixture"
            value={o.expressionFixture ?? "—"}
            testId="gwc-behavior-expression"
          />
          <BehaviorCard
            title="Affect / compile state"
            value={o.behavioralState ?? "—"}
            testId="gwc-behavior-state"
          />
          <BehaviorCard
            title="Phases"
            value={
              compile?.ok && compile.phaseIds.length
                ? compile.phaseIds.join(" → ")
                : o.transitionSummary ?? "No compile yet"
            }
            testId="gwc-behavior-transitions"
          />
          <BehaviorCard
            title="Living motion"
            value={o.livingMotionAuthority ?? "Runtime authority not exposed"}
            testId="gwc-behavior-living"
          />
          <BehaviorCard
            title="Authored vs runtime"
            value={o.authoredVsRuntime ?? "Layer summary unavailable"}
            testId="gwc-behavior-layers"
          />
          <BehaviorCard
            title="Calibration"
            value={
              compile?.calibrationNote ??
              "Calibration: synthetic_provisional — not human-validated"
            }
            testId="gwc-affect-calibration"
          />
        </div>

        <div className="gwc-behavior-stage-mini" aria-hidden={false}>
          <StageFrame snap={snap} stageSlot={stageSlot} adapter={adapter} />
        </div>
      </div>
    </div>
  );
}

function BehaviorCard({
  title,
  value,
  testId,
}: {
  title: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="gwc-behavior-card" data-testid={testId}>
      <strong>{title}</strong>
      <span>{value}</span>
    </div>
  );
}
