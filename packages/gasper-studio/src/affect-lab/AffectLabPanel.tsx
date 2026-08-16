/**
 * GASPER-006 D007 — Affect Lab surface (focused, provisional).
 * Uses the same compile path as MCP. Not a broad Studio redesign.
 */
import React, { useMemo, useState } from "react";
import { compilePerformance, type CompilerPerformanceIntent } from "../../../shared/src/index";

const DEFAULT_INTENT: CompilerPerformanceIntent = {
  schema: "gasper.performance.intent.v1",
  id: "affect-lab-draft",
  seed: 1,
  character: "gasper",
  identity_lock: true,
  phases: [
    {
      id: "hold",
      intent_tags: ["hold"],
      interrupt_class: "soft",
      affect_target: {
        valence: 0.3,
        arousal: 0.3,
        expression_gain: 0.35,
        attention: 0.35,
        certainty: 0.5,
      },
      embodiment_preference: "presence",
    },
  ],
  global_constraints: {
    topology_lock: true,
    legacy_authority_required: true,
    no_arbitrary_gsap: true,
    reduced_motion_policy: "scale_durations",
  },
};

export function AffectLabPanel(): React.ReactElement {
  const [seed, setSeed] = useState(1);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pinNote = useMemo(
    () =>
      "Calibration: synthetic_provisional (D003S). D003H deferred. Not human-validated.",
    [],
  );

  function onCompile() {
    const intent = { ...DEFAULT_INTENT, seed };
    const r = compilePerformance(intent);
    if (!r.ok) {
      setError((r.issues || []).join(", "));
      setLastHash(null);
      return;
    }
    setError(null);
    setLastHash(r.ir_hash);
  }

  return (
    <div className="affect-lab-panel" data-testid="affect-lab-panel">
      <header>
        <h2>Affect Lab</h2>
        <p className="muted">{pinNote}</p>
      </header>
      <section className="compile-bar">
        <label>
          Seed{" "}
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
          />
        </label>
        <button type="button" onClick={onCompile}>
          Compile
        </button>
      </section>
      {lastHash && (
        <p data-testid="ir-hash">
          IR hash: <code>{lastHash}</code>
        </p>
      )}
      {error && <p className="error">{error}</p>}
      <section>
        <h3>Panels (minimum scaffold)</h3>
        <ul>
          <li>Phase Strip — draft</li>
          <li>Affect Curves — draft</li>
          <li>Channel Inspector — draft</li>
          <li>Route Board — draft</li>
          <li>Compile Bar — active</li>
          <li>Compare — draft</li>
        </ul>
      </section>
    </div>
  );
}

export default AffectLabPanel;
