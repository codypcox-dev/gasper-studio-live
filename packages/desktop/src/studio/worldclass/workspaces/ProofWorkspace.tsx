/**
 * Proof job — identity surfaces + export/compare without mutating document.
 */
import type { ReactNode } from "react";
import type { WorldClassStudioAdapter, WorldClassStudioSnapshot } from "../adapter/types";
import { StageFrame } from "../shell/StageFrame";

export function ProofWorkspace({
  snap,
  adapter,
  stageSlot,
}: {
  snap: WorldClassStudioSnapshot;
  adapter?: WorldClassStudioAdapter;
  stageSlot: ReactNode;
}) {
  const proofAvailable = snap.jobAvailability?.proof === true;
  const status = snap.proofStatus;
  const note =
    snap.proofNote ||
    "Export proof bundles and compare pose baselines without mutating the authoring document.";

  return (
    <div
      className="gwc-center"
      data-testid="gwc-workspace-proof"
      data-workspace="proof"
      data-job="proof"
      data-available={proofAvailable ? "true" : "false"}
      data-authoring={proofAvailable ? "true" : "false"}
    >
      <div className="gwc-behavior-layout" data-testid="gwc-proof-layout">
        <div className="gwc-behavior-shell" data-testid="gwc-proof-notice">
          <h2>Proof</h2>
          <p>{note}</p>
          <span className="gwc-pill" data-testid="gwc-proof-availability">
            {proofAvailable ? "Export + compare active" : "Overview only"}
          </span>
        </div>

        {proofAvailable ? (
          <div
            className="gwc-proof-actions"
            data-testid="gwc-proof-actions"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              padding: "8px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {adapter?.exportProofBundle ? (
              <button
                type="button"
                className="gwc-btn gwc-btn-primary"
                data-testid="gwc-proof-export-btn"
                onClick={() => adapter.exportProofBundle?.()}
              >
                Export proof JSON
              </button>
            ) : null}
            {adapter?.pinProofBaseline ? (
              <button
                type="button"
                className="gwc-btn gwc-btn-ghost"
                data-testid="gwc-proof-pin-btn"
                onClick={() => adapter.pinProofBaseline?.()}
              >
                Pin pose baseline
              </button>
            ) : null}
            {adapter?.compareProofBaseline ? (
              <button
                type="button"
                className="gwc-btn gwc-btn-ghost"
                data-testid="gwc-proof-compare-btn"
                disabled={!status?.baselinePinned}
                onClick={() => adapter.compareProofBaseline?.()}
              >
                Compare to baseline
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="gwc-behavior-grid" data-testid="gwc-proof-overview">
          <ProofCard
            title="Build identity"
            value={snap.diagnostics.buildIdentity ?? "—"}
            testId="gwc-proof-build"
          />
          <ProofCard
            title="Document revision"
            value={String(snap.document.revision ?? "—")}
            testId="gwc-proof-revision"
          />
          <ProofCard
            title="Document lifecycle"
            value={snap.document.lifecycle}
            testId="gwc-proof-lifecycle"
          />
          <ProofCard
            title="Renderer authority"
            value={snap.diagnostics.authorityRenderer ?? "—"}
            testId="gwc-proof-renderer"
          />
          <ProofCard
            title="Last export hash"
            value={status?.lastBundleHash ? `${status.lastBundleHash.slice(0, 16)}…` : "—"}
            testId="gwc-proof-export-hash"
          />
          <ProofCard
            title="Baseline"
            value={
              status?.baselinePinned
                ? `Pinned · ${status.baselineKeyCount} keys`
                : "Not pinned"
            }
            testId="gwc-proof-baseline"
          />
          <ProofCard
            title="Last compare"
            value={
              status?.lastCompare
                ? status.lastCompare.identical
                  ? "Identical"
                  : `${status.lastCompare.deltaCount} deltas · max|Δ|=${status.lastCompare.maxAbsDelta.toFixed(4)}`
                : "—"
            }
            testId="gwc-proof-compare"
          />
          <ProofCard
            title="Health"
            value={snap.diagnostics.health ?? "—"}
            testId="gwc-proof-health"
          />
        </div>

        <div className="gwc-behavior-stage-mini" aria-hidden={false}>
          <StageFrame snap={snap} stageSlot={stageSlot} adapter={adapter} />
        </div>
      </div>
    </div>
  );
}

function ProofCard({
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
