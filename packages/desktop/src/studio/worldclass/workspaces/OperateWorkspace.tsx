/**
 * Operate job — connection, document, runtime authority, living stage.
 * Surfaces existing Operate duties that previously lived only in the app bar.
 */
import type { ReactNode } from "react";
import type { WorldClassStudioAdapter, WorldClassStudioSnapshot } from "../adapter/types";
import { presentConnection, presentDocument } from "../adapter/productTruth";
import { StageFrame } from "../shell/StageFrame";

export function OperateWorkspace({
  snap,
  adapter,
  stageSlot,
}: {
  snap: WorldClassStudioSnapshot;
  adapter: WorldClassStudioAdapter;
  stageSlot: ReactNode;
}) {
  const conn = presentConnection(snap.connection);
  const doc = presentDocument(snap.document);
  const living = snap.behaviorOverview?.livingMotionAuthority ?? "Living authority not exposed";

  return (
    <div
      className="gwc-center"
      data-testid="gwc-workspace-operate"
      data-workspace="operate"
      data-job="operate"
    >
      <div className="gwc-behavior-layout" data-testid="gwc-operate-layout">
        <div className="gwc-behavior-shell" data-testid="gwc-operate-notice">
          <h2>Operate</h2>
          <p>
            Connection, document readiness, and the living stage — control plane without
            leaving the character in view.
          </p>
        </div>

        <div className="gwc-behavior-grid" data-testid="gwc-operate-overview">
          <OperateCard
            title="Connection"
            value={`${conn.label}${snap.connection.detail ? ` · ${snap.connection.detail}` : ""}`}
            testId="gwc-operate-connection"
          />
          <OperateCard
            title="Document"
            value={`${doc.title} · ${snap.document.lifecycle}${snap.document.dirty ? " · dirty" : ""}`}
            testId="gwc-operate-document"
          />
          <OperateCard
            title="Revision"
            value={String(snap.document.revision ?? "—")}
            testId="gwc-operate-revision"
          />
          <OperateCard
            title="Runtime authority"
            value={snap.diagnostics.authorityRenderer ?? "—"}
            testId="gwc-operate-authority"
          />
          <OperateCard
            title="Living motion"
            value={living}
            testId="gwc-operate-living"
          />
          <OperateCard
            title="Build"
            value={snap.diagnostics.buildIdentity ?? "—"}
            testId="gwc-operate-build"
          />
        </div>

        <div className="gwc-operate-actions" style={{ display: "flex", gap: 8, padding: "0 12px 8px" }}>
          {adapter.reconnect ? (
            <button
              type="button"
              className="gwc-btn gwc-btn-ghost"
              data-testid="gwc-operate-reconnect"
              onClick={() => adapter.reconnect?.()}
            >
              Reconnect
            </button>
          ) : null}
          {adapter.newDocument ? (
            <button
              type="button"
              className="gwc-btn gwc-btn-ghost"
              data-testid="gwc-operate-new"
              onClick={() => adapter.newDocument?.()}
            >
              New document
            </button>
          ) : null}
          {adapter.openDocument ? (
            <button
              type="button"
              className="gwc-btn gwc-btn-ghost"
              data-testid="gwc-operate-open"
              onClick={() => adapter.openDocument?.()}
            >
              Open
            </button>
          ) : null}
          {adapter.saveDocument ? (
            <button
              type="button"
              className="gwc-btn gwc-btn-primary"
              data-testid="gwc-operate-save"
              disabled={!doc.showsDirty || doc.empty || doc.invalid || doc.loading}
              onClick={() => adapter.saveDocument?.()}
            >
              Save
            </button>
          ) : null}
        </div>

        <div className="gwc-behavior-stage-mini" aria-hidden={false}>
          <StageFrame snap={snap} stageSlot={stageSlot} adapter={adapter} />
        </div>
      </div>
    </div>
  );
}

function OperateCard({
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
