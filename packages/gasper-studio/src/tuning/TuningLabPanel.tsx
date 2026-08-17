import { useCallback, useState, useSyncExternalStore } from "react";
import {
  TUNING_PARAMETER_SPECS,
  type TuningLabSession,
} from "./tuningRegistry";
import { ReferenceTrainingPanel } from "../training/ReferenceTrainingPanel";
import type { ReferenceTrainingSession } from "../training/ReferenceTrainingSession";
import { GrokSuccessorPanel } from "../training/GrokSuccessorPanel";
import { CanonOpsPanel } from "../canonops/CanonOpsPanel";
import { STUDIO_PILOT_ACTION_KINDS } from "../training/StudioPilotProtocol";
import type { StudioPilotSession, StudioPilotSessionSnapshot } from "../training/StudioPilotSession";

export type TuningLabPanelProps = {
  lab: TuningLabSession;
  referenceTraining?: ReferenceTrainingSession;
  studioPilot?: StudioPilotSession;
};

const ABSENT_PILOT_SNAPSHOT: StudioPilotSessionSnapshot = {
  status: "idle",
  model: "grok-4.6",
  sessionId: null,
  goal: "",
  turn: 0,
  maxTurns: 4,
  message: "",
  error: null,
  history: [],
  receipts: [],
  observation: null,
  rollbackAvailable: false,
};
const subscribeAbsentPilot = () => () => undefined;
const readAbsentPilot = () => ABSENT_PILOT_SNAPSHOT;

/** Compact, reviewable controls for the active Gasper Northstar. */
export function TuningLabPanel({ lab, referenceTraining, studioPilot }: TuningLabPanelProps): React.ReactElement {
  const snapshot = useSyncExternalStore(
    (onChange) => lab.subscribe(onChange),
    () => lab.snapshot(),
    () => lab.snapshot(),
  );
  const pilotSnapshot = useSyncExternalStore(
    studioPilot ? (onChange) => studioPilot.subscribe(onChange) : subscribeAbsentPilot,
    studioPilot ? () => studioPilot.snapshot() : readAbsentPilot,
    studioPilot ? () => studioPilot.snapshot() : readAbsentPilot,
  );
  const [intent, setIntent] = useState("");
  const [intentReceipt, setIntentReceipt] = useState<string | null>(null);
  const [captureReceipt, setCaptureReceipt] = useState<string | null>(null);
  const [compareReceipt, setCompareReceipt] = useState<string | null>(null);
  const derivedIntentReceipt = snapshot.lastIntentPlan
    ? `${snapshot.lastIntentPlan.label} · ${Object.keys(snapshot.lastIntentPlan.parameters).length} knobs${snapshot.lastIntentPlan.embodiment ? ` · ${snapshot.lastIntentPlan.embodiment}` : ""}`
    : null;
  const derivedCaptureReceipt = snapshot.lastCapture?.ok
    ? `Captured · ${snapshot.lastCapture.bundleHash ?? "bundle ready"}`
    : snapshot.lastCapture?.error ?? null;

  const setValue = useCallback(
    (id: (typeof TUNING_PARAMETER_SPECS)[number]["id"], value: number) => {
      lab.set(id, value);
    },
    [lab],
  );
  const applyInstruction = useCallback(() => {
    if (studioPilot) {
      void studioPilot.run(intent);
      return;
    }
    const result = lab.applyIntent(intent);
    setIntentReceipt(
      result.ok
        ? `${result.plan?.label ?? "Plan applied"} · ${Object.keys(result.plan?.parameters ?? {}).length} knobs${result.plan?.embodiment ? ` · ${result.plan.embodiment}` : ""}`
        : result.error ?? "Intent rejected",
    );
  }, [intent, lab, studioPilot]);

  return (
    <details
      className="dais-control-rail__section tuning-lab"
      data-testid="tuning-lab"
      data-northstar={studioPilot ? "N120 N160" : "N120"}
      open
    >
      <summary className="dais-control-rail__label tuning-lab__summary">
        Tuning Lab <span className="tuning-lab__state">{studioPilot ? "Grok pilot" : "N120"}</span>
      </summary>
      <p className="dais-control-rail__note tuning-lab__note">
        {studioPilot
          ? "Grok 4.6 · typed in-app authority · inspect → act → observe → revise"
          : "Bounded · physics-authoritative · reversible"}
      </p>
      {studioPilot ? <GrokSuccessorPanel /> : null}
      <CanonOpsPanel />
      {referenceTraining ? <ReferenceTrainingPanel session={referenceTraining} /> : null}
      <div className="tuning-lab__intent">
        <input
          type="text"
          value={intent}
          placeholder="Tell Gasper what to do…"
          aria-label="Motion intent"
          data-testid="tuning-lab-intent"
          onChange={(event) => setIntent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (pilotSnapshot.status === "running") return;
            applyInstruction();
          }}
        />
        <button
          type="button"
          data-testid="tuning-lab-apply-intent"
          disabled={studioPilot ? pilotSnapshot.status === "running" || !intent.trim() : false}
          onClick={applyInstruction}
        >
          {studioPilot ? (pilotSnapshot.status === "running" ? "Grok working…" : "Run Grok") : "Apply"}
        </button>
      </div>
      {studioPilot ? (
        <div className="tuning-lab__pilot" data-testid="studio-pilot" data-status={pilotSnapshot.status}>
          <div className="tuning-lab__pilot-badges">
            <span data-testid="studio-pilot-model">Grok 4.6</span>
            <span>{STUDIO_PILOT_ACTION_KINDS.length} typed controls</span>
            <span>{pilotSnapshot.turn}/{pilotSnapshot.maxTurns || 4} turns</span>
          </div>
          <p className="dais-control-rail__note tuning-lab__receipt" data-testid="tuning-lab-intent-receipt">
            {pilotSnapshot.message}
          </p>
          {pilotSnapshot.receipts.length ? (
            <details className="tuning-lab__pilot-receipts" data-testid="studio-pilot-receipts">
              <summary>{pilotSnapshot.receipts.length} action receipts</summary>
              {pilotSnapshot.receipts.slice(-6).map((receipt) => (
                <p key={`${receipt.actionId}-${receipt.status}`} data-status={receipt.status}>
                  <span>{receipt.status}</span> {receipt.kind} · {receipt.message}
                </p>
              ))}
            </details>
          ) : null}
          <div className="dais-control-rail__row tuning-lab__pilot-actions">
            {pilotSnapshot.status === "running" ? (
              <button type="button" data-testid="studio-pilot-cancel" onClick={() => studioPilot.cancel()}>
                Stop
              </button>
            ) : null}
            {pilotSnapshot.rollbackAvailable && pilotSnapshot.status !== "running" ? (
              <button type="button" data-testid="studio-pilot-rollback" onClick={() => void studioPilot.rollback()}>
                Roll back reversible controls
              </button>
            ) : null}
          </div>
        </div>
      ) : intentReceipt ?? derivedIntentReceipt ? (
        <p className="dais-control-rail__note tuning-lab__receipt" data-testid="tuning-lab-intent-receipt">
          {intentReceipt ?? derivedIntentReceipt}
        </p>
      ) : null}
      <details className="tuning-lab__expert" data-testid="tuning-lab-expert">
        <summary className="tuning-lab__expert-summary">
          Expert physics variables <span>{TUNING_PARAMETER_SPECS.length}</span>
        </summary>
        {TUNING_PARAMETER_SPECS.map((spec) => {
          const value = snapshot.state[spec.id];
          return (
            <div
              key={spec.id}
              className="dais-control-rail__param tuning-lab__param"
              data-control-id={`tuning-${spec.id}`}
              title={spec.description}
            >
              <span>{spec.label}</span>
              <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={value}
                data-testid={`tuning-lab-${spec.id}`}
                aria-label={spec.label}
                onChange={(event) => setValue(spec.id, Number(event.target.value))}
              />
              <span className="dais-control-rail__param-value">
                {value.toFixed(2)}{spec.unit}
              </span>
            </div>
          );
        })}
        <div className="dais-control-rail__row tuning-lab__actions">
        <button
          type="button"
          data-testid="tuning-lab-pin"
          onClick={() => {
            lab.pinBaseline();
            setCompareReceipt(null);
          }}
          data-active={snapshot.baselinePinned ? "1" : "0"}
        >
          {snapshot.baselinePinned ? "Baseline pinned" : "Pin baseline"}
        </button>
        <button
          type="button"
          data-testid="tuning-lab-reset"
          onClick={() => {
            const result = lab.reset();
            setIntent("");
            setCompareReceipt(null);
            setIntentReceipt(
              result.ok
                ? `Reset to authored baseline · ${lab.snapshot().embodiment}`
                : result.error ?? "Reset failed",
            );
          }}
        >
          Reset lab
        </button>
        <button
          type="button"
          data-testid="tuning-lab-compare"
          onClick={() => {
            const result = lab.compareBaseline();
            setCompareReceipt(
              result.identical
                ? "Baseline match"
                : result.changed.length
                  ? `Changed · ${result.changed.join(", ")}`
                  : "No baseline pinned",
            );
          }}
        >
          Compare baseline
        </button>
        <button
          type="button"
          data-testid="tuning-lab-capture"
          onClick={() => {
            const result = lab.captureProof();
            setCaptureReceipt(
              result.ok
                ? `Captured · ${result.bundleHash ?? "bundle ready"}`
                : result.error ?? "Capture unavailable",
            );
          }}
        >
          Capture proof
        </button>
        </div>
        {compareReceipt ? (
          <p className="dais-control-rail__note tuning-lab__receipt" data-testid="tuning-lab-compare-receipt">
            {compareReceipt}
          </p>
        ) : null}
        <p
          className="dais-control-rail__note tuning-lab__receipt"
          data-testid="tuning-lab-receipt"
        >
          {snapshot.baselinePinned
            ? snapshot.changedFromBaseline
              ? `Changed · rev ${snapshot.revision}`
              : `Baseline match · rev ${snapshot.revision}`
            : `No baseline · rev ${snapshot.revision}`}
        </p>
        {captureReceipt ?? derivedCaptureReceipt ? (
          <p className="dais-control-rail__note tuning-lab__receipt" data-testid="tuning-lab-capture-receipt">
            {captureReceipt ?? derivedCaptureReceipt}
          </p>
        ) : null}
      </details>
      <p className="dais-control-rail__note tuning-lab__telemetry" data-testid="tuning-lab-telemetry">
        {snapshot.telemetry.physicsMode ?? "idle"} · {Number(snapshot.telemetry.gaitStepHz ?? 0).toFixed(2)} Hz ·
        support {Number(snapshot.telemetry.supportExchange ?? 0).toFixed(1)} · {snapshot.telemetry.embodiment ?? "presence"} · rev {snapshot.revision}
      </p>
    </details>
  );
}

export default TuningLabPanel;
