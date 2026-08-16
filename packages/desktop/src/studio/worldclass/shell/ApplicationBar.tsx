import { useState } from "react";
import type { WorldClassStudioAdapter, WorldClassStudioSnapshot } from "../adapter/types";
import {
  JOB_WORKSPACE_LABELS,
  JOB_WORKSPACE_ORDER,
  defaultJobAvailability,
  normalizeWorkspaceId,
  type JobWorkspaceId,
} from "../adapter/jobOntology";
import { presentDocument } from "../adapter/productTruth";
import { ConnectionIndicator } from "./ConnectionIndicator";

export function ApplicationBar({
  snap,
  adapter,
}: {
  snap: WorldClassStudioSnapshot;
  adapter: WorldClassStudioAdapter;
}) {
  const doc = presentDocument(snap.document);
  const [recentOpen, setRecentOpen] = useState(false);
  const [recent, setRecent] = useState<Array<{ path: string; name: string }>>([]);
  const availability = snap.jobAvailability ?? defaultJobAvailability({
    affectAvailable: snap.behaviorAvailable,
  });
  const activeJob = normalizeWorkspaceId(snap.workspace);

  const loadRecent = () => {
    const list = adapter.listRecentDocuments?.() ?? [];
    setRecent(list);
    setRecentOpen((v) => !v);
  };

  const openRecent = (path: string) => {
    setRecentOpen(false);
    adapter.openRecentDocument?.(path);
  };

  const jobUnavailable = (id: JobWorkspaceId): boolean => availability[id] === false;

  return (
    <header className="gwc-app-bar" data-testid="gwc-app-bar" role="banner">
      <div className="gwc-brand">
        <span className="gwc-brand-mark">Gasper</span>
        <span className="gwc-brand-sub">Studio</span>
      </div>

      <div className="gwc-doc-title" data-testid="gwc-doc-title" data-dirty={doc.showsDirty ? "true" : "false"}>
        <strong title={snap.document.path ?? doc.title}>{doc.title}</strong>
        {doc.showsDirty ? (
          <span className="gwc-dirty" aria-label="Unsaved changes" title="Unsaved changes">
            {doc.dirtyMark}
          </span>
        ) : null}
      </div>

      <div className="gwc-ws-tabs" role="tablist" aria-label="Job workspace">
        {JOB_WORKSPACE_ORDER.map((id) => {
          const unavailable = jobUnavailable(id);
          const label = JOB_WORKSPACE_LABELS[id];
          return (
            <button
              key={id}
              type="button"
              role="tab"
              className="gwc-ws-tab"
              aria-selected={activeJob === id}
              aria-disabled={unavailable ? true : undefined}
              data-testid={`gwc-ws-${id}`}
              data-job={id}
              data-available={unavailable ? "false" : "true"}
              data-authoring={unavailable ? "false" : "true"}
              title={
                unavailable
                  ? `${label} authoring is not available in this build`
                  : undefined
              }
              onClick={() => adapter.setWorkspace(id)}
            >
              {unavailable ? `${label} · N/A` : label}
            </button>
          );
        })}
      </div>

      <div className="gwc-app-bar-spacer" />

      <div className="gwc-app-bar-actions">
        {adapter.newDocument ? (
          <button
            type="button"
            className="gwc-btn gwc-btn-ghost"
            data-testid="gwc-btn-new"
            onClick={() => adapter.newDocument?.()}
            title="New document"
          >
            New
          </button>
        ) : null}
        {adapter.openDocument ? (
          <button
            type="button"
            className="gwc-btn gwc-btn-ghost"
            data-testid="gwc-btn-open"
            onClick={() => adapter.openDocument?.()}
            title="Open document"
          >
            Open
          </button>
        ) : null}
        <button
          type="button"
          className="gwc-btn gwc-btn-ghost"
          data-testid="gwc-btn-undo"
          disabled={!snap.animation.canUndo}
          onClick={() => adapter.undo()}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          type="button"
          className="gwc-btn gwc-btn-ghost"
          data-testid="gwc-btn-redo"
          disabled={!snap.animation.canRedo}
          onClick={() => adapter.redo()}
          title="Redo (Ctrl+Shift+Z)"
        >
          Redo
        </button>
        {adapter.saveDocument ? (
          <button
            type="button"
            className="gwc-btn gwc-btn-primary"
            data-testid="gwc-btn-save"
            disabled={!doc.showsDirty || doc.empty || doc.invalid || doc.loading}
            onClick={() => adapter.saveDocument?.()}
            title="Save (Ctrl+S)"
          >
            Save
          </button>
        ) : null}
        {adapter.saveDocumentAs ? (
          <button
            type="button"
            className="gwc-btn gwc-btn-ghost"
            data-testid="gwc-btn-save-as"
            disabled={doc.empty || doc.invalid || doc.loading}
            onClick={() => adapter.saveDocumentAs?.()}
            title="Save as"
          >
            Save as
          </button>
        ) : null}
        {adapter.listRecentDocuments ? (
          <div className="gwc-recent-wrap" style={{ position: "relative" }}>
            <button
              type="button"
              className="gwc-btn gwc-btn-ghost"
              data-testid="gwc-btn-recent"
              onClick={() => loadRecent()}
              title="Recent documents"
            >
              Recent
            </button>
            {recentOpen ? (
              <div
                className="gwc-recent-menu"
                data-testid="gwc-recent-menu"
                role="menu"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  zIndex: 40,
                  minWidth: 220,
                  maxWidth: 360,
                  background: "var(--gwc-surface, #1a1b22)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 6,
                  padding: 4,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                {recent.length === 0 ? (
                  <div style={{ padding: "8px 10px", fontSize: 12, opacity: 0.7 }}>
                    No recent documents
                  </div>
                ) : (
                  recent.map((e) => (
                    <button
                      key={e.path}
                      type="button"
                      role="menuitem"
                      className="gwc-btn gwc-btn-ghost"
                      data-testid="gwc-recent-item"
                      data-path={e.path}
                      title={e.path}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        fontSize: 12,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      onClick={() => openRecent(e.path)}
                    >
                      {e.name}
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        ) : null}
        {adapter.reconnect ? (
          <button
            type="button"
            className="gwc-btn gwc-btn-ghost"
            data-testid="gwc-btn-reconnect"
            onClick={() => adapter.reconnect?.()}
            title="Reconnect to AgentBridge"
          >
            Reconnect
          </button>
        ) : null}
        <ConnectionIndicator connection={snap.connection} />
      </div>
    </header>
  );
}
