import type { ReactNode } from "react";
import type { StageMode, WorldClassStudioAdapter, WorldClassStudioSnapshot } from "../adapter/types";
import { EmptyState } from "../controls/EmptyState";
import { presentDocument } from "../adapter/productTruth";

const STAGE_MODES: Array<{ id: StageMode; label: string }> = [
  { id: "author", label: "Author" },
  { id: "preview", label: "Preview" },
  { id: "runtime", label: "Runtime" },
];

export function StageFrame({
  snap,
  stageSlot,
  adapter,
}: {
  snap: WorldClassStudioSnapshot;
  stageSlot: ReactNode;
  adapter?: WorldClassStudioAdapter;
}) {
  const doc = presentDocument(snap.document);
  const mode = snap.stageMode ?? "author";

  return (
    <div
      className="gwc-stage-frame"
      data-testid="gwc-stage-frame"
      data-stage-mode={mode}
      data-safe-bounds={snap.showSafeBounds ? "true" : "false"}
    >
      <div className="gwc-stage-chrome" data-testid="gwc-stage-chrome">
        <span className="gwc-stage-badge">Dais</span>
        <div className="gwc-stage-modes" role="group" aria-label="Stage mode">
          {STAGE_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className="gwc-stage-mode-btn"
              aria-pressed={mode === m.id}
              data-testid={`gwc-stage-mode-${m.id}`}
              disabled={!adapter?.setStageMode}
              onClick={() => adapter?.setStageMode?.(m.id)}
              title={`${m.label} mode`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {adapter?.setShowSafeBounds ? (
          <button
            type="button"
            className="gwc-stage-mode-btn"
            aria-pressed={snap.showSafeBounds}
            data-testid="gwc-stage-safe-bounds"
            onClick={() => adapter.setShowSafeBounds?.(!snap.showSafeBounds)}
            title="Toggle safe bounds"
          >
            Bounds
          </button>
        ) : null}
      </div>

      {doc.invalid ? (
        <EmptyState
          title="Invalid document"
          body={snap.document.invalidReason ?? "The document cannot be displayed."}
          testId="gwc-stage-invalid"
        />
      ) : doc.loading ? (
        <EmptyState title="Loading…" body="Document is opening." testId="gwc-stage-loading" />
      ) : (
        <div className="gwc-stage-slot" data-testid="gwc-stage-slot" data-stage-mode={mode}>
          {/* Always mount stageSlot so Legacy Authority Dais can boot (first-run Presence). */}
          {stageSlot}
          {doc.empty ? (
            <div className="gwc-stage-empty-overlay" data-testid="gwc-stage-empty">
              <EmptyState
                title="No document"
                body="Create or open a .gasper document to begin — Dais remains live."
                testId="gwc-stage-empty-copy"
              />
            </div>
          ) : null}
          {snap.showSafeBounds ? (
            <div className="gwc-safe-bounds" data-testid="gwc-safe-bounds" aria-hidden />
          ) : null}
          <span className="gwc-stage-mode-tag" data-testid="gwc-stage-mode-tag">
            {mode === "author" ? "Authored" : mode === "preview" ? "Preview" : "Runtime"}
          </span>
        </div>
      )}
    </div>
  );
}
