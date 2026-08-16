import type { WorldClassStudioAdapter, WorldClassStudioSnapshot } from "../adapter/types";
import { normalizeWorkspaceId, workspaceIs } from "../adapter/jobOntology";
import { presentPlayback } from "../adapter/productTruth";

export function ContextToolbar({
  snap,
  adapter,
}: {
  snap: WorldClassStudioSnapshot;
  adapter: WorldClassStudioAdapter;
}) {
  const hasDoc = snap.document.lifecycle !== "none" && snap.document.lifecycle !== "invalid";
  const play = presentPlayback(snap.animation.playback, hasDoc);
  const job = normalizeWorkspaceId(snap.workspace);

  if (workspaceIs(snap.workspace, "operate") || job === "operate") {
    return (
      <div className="gwc-ctx-bar" data-testid="gwc-ctx-bar" data-context="operate" data-job="operate">
        <span className="gwc-ctx-label">Operate</span>
        <span className="gwc-ctx-label" style={{ textTransform: "none", letterSpacing: 0 }}>
          {snap.connection.label} · {snap.document.lifecycle}
        </span>
        <div className="gwc-ctx-spacer" />
        <span className="gwc-ctx-label">{snap.diagnostics.authorityRenderer ?? "Runtime"}</span>
      </div>
    );
  }

  if (workspaceIs(snap.workspace, "form")) {
    return (
      <div className="gwc-ctx-bar" data-testid="gwc-ctx-bar" data-context="form" data-job="form">
        <span className="gwc-ctx-label">Form domain</span>
        <div className="gwc-seg" role="group" aria-label="Form domains">
          {snap.designDomains.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={snap.activeDesignDomain === d.id}
              data-testid={`gwc-domain-${d.id}`}
              onClick={() => adapter.setDesignDomain(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="gwc-ctx-spacer" />
        <span className="gwc-ctx-label">{snap.character.selectionLabel ?? "No selection"}</span>
      </div>
    );
  }

  if (workspaceIs(snap.workspace, "motion")) {
    return (
      <div className="gwc-ctx-bar" data-testid="gwc-ctx-bar" data-context="motion" data-job="motion">
        <span className="gwc-ctx-label">Clip</span>
        <select
          data-testid="gwc-clip-select"
          value={snap.animation.activeClipId ?? ""}
          disabled={!hasDoc || snap.animation.clips.length === 0}
          onChange={(e) => {
            const id = e.target.value;
            if (adapter.selectClip) {
              adapter.selectClip(id);
              return;
            }
            const clip = snap.animation.clips.find((c) => c.id === id);
            if (clip) {
              adapter.setVisibleRange(0, clip.durationMs);
              adapter.setPlayhead(0);
            }
          }}
          aria-label="Active clip"
        >
          {snap.animation.clips.length === 0 ? (
            <option value="">No clips</option>
          ) : (
            snap.animation.clips.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))
          )}
        </select>
        {adapter.createClip ? (
          <button
            type="button"
            className="gwc-btn"
            data-testid="gwc-btn-create-clip"
            disabled={!hasDoc}
            onClick={() => adapter.createClip?.("new-clip", 2000)}
            title="Create clip"
          >
            Create clip
          </button>
        ) : null}
        <div className="gwc-ctx-spacer" />
        <span className="gwc-ctx-label" data-testid="gwc-playback-label" data-state={play.state}>
          {play.label}
        </span>
        {adapter.capturePose ? (
          <button
            type="button"
            className="gwc-btn"
            data-testid="gwc-btn-capture"
            disabled={!hasDoc}
            onClick={() => adapter.capturePose?.()}
          >
            Capture pose
          </button>
        ) : null}
      </div>
    );
  }

  if (workspaceIs(snap.workspace, "proof")) {
    const proofAvailable = snap.jobAvailability?.proof === true;
    return (
      <div
        className="gwc-ctx-bar"
        data-testid="gwc-ctx-bar"
        data-context="proof"
        data-job="proof"
        data-available={proofAvailable ? "true" : "false"}
        data-authoring={proofAvailable ? "true" : "false"}
      >
        <span className="gwc-ctx-label">
          {proofAvailable ? "Proof" : "Proof · Overview"}
        </span>
        <span className="gwc-ctx-label" style={{ textTransform: "none", letterSpacing: 0 }}>
          {proofAvailable
            ? snap.proofStatus?.lastBundleHash
              ? `Last export ${snap.proofStatus.lastBundleHash.slice(0, 10)}…`
              : "Export + pose baseline compare"
            : "Export/compare not productized — read-only identity only"}
        </span>
      </div>
    );
  }

  // Affect (legacy Behavior)
  const affectAvailable = snap.jobAvailability?.affect ?? snap.behaviorAvailable;
  return (
    <div
      className="gwc-ctx-bar"
      data-testid="gwc-ctx-bar"
      data-context="affect"
      data-job="affect"
      data-available={affectAvailable ? "true" : "false"}
      data-authoring={affectAvailable ? "true" : "false"}
    >
      <span className="gwc-ctx-label">
        {affectAvailable ? "Affect" : "Affect · Unavailable"}
      </span>
      <span className="gwc-ctx-label" style={{ textTransform: "none", letterSpacing: 0 }}>
        {affectAvailable
          ? snap.affectCompile?.ok && snap.affectCompile.irHash
            ? `IR ${snap.affectCompile.irHash.slice(0, 10)}…`
            : "Intent compile · provisional contracts"
          : "Affect compiler surfaces not available — read-only overview only"}
      </span>
    </div>
  );
}
