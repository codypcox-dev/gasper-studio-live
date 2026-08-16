import { useState, useSyncExternalStore } from "react";

import type { ReferenceTrainingSession } from "./ReferenceTrainingSession.js";
import "./referenceTraining.css";

export type ReferenceTrainingPanelProps = Readonly<{
  session: ReferenceTrainingSession;
}>;

const STATUS_LABELS = {
  empty: "Waiting for source",
  resolving: "Resolving source",
  source_ready: "Measured source",
  analyzing: "Analyzing observations",
  interpreting: "Interpreting mechanics",
  needs_review: "Needs review",
  compiled: "Compiled",
  previewing: "Live preview",
  blocked: "Blocked",
} as const;

function seconds(milliseconds: number): string {
  return `${(milliseconds / 1_000).toFixed(2)}s`;
}

export function ReferenceTrainingPanel({ session }: ReferenceTrainingPanelProps): React.ReactElement {
  const snapshot = useSyncExternalStore(
    (onChange) => session.subscribe(onChange),
    () => session.snapshot(),
    () => session.snapshot(),
  );
  const [url, setUrl] = useState("");
  const [intent, setIntent] = useState("");

  const importSource = () => {
    void session.linkVideo(url);
  };

  return (
    <section
      className="reference-training"
      data-testid="reference-training-panel"
      data-status={snapshot.status}
      aria-busy={snapshot.status === "resolving"}
    >
      <div className="reference-training__heading">
        <span>Reference video</span>
        <span className="reference-training__status" data-status={snapshot.status}>
          {STATUS_LABELS[snapshot.status]}
        </span>
      </div>
      <p className="dais-control-rail__note reference-training__law">
        Video → measured mechanics → model meaning → physics
      </p>
      <div className="reference-training__pipeline" aria-label="Training pipeline">
        <span data-ready={snapshot.source ? "1" : "0"}>Source</span>
        <span data-ready={snapshot.mechanics ? "1" : "0"}>Mechanics</span>
        <span data-ready={snapshot.semanticProposal ? "1" : "0"}>Meaning</span>
        <span data-ready={snapshot.physicsPlan ? "1" : "0"}>Behavior</span>
      </div>
      <div className="reference-training__source-row">
        <input
          type="url"
          value={url}
          aria-label="Reference video URL"
          placeholder="Paste direct video link…"
          data-testid="reference-training-url"
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && snapshot.status !== "resolving") importSource();
          }}
        />
        {snapshot.status === "resolving" ? (
          <button type="button" onClick={() => session.cancel()} data-testid="reference-training-cancel">
            Cancel
          </button>
        ) : (
          <button type="button" onClick={importSource} data-testid="reference-training-import">
            Link
          </button>
        )}
      </div>

      {snapshot.source && snapshot.mediaUrl ? (
        <div className="reference-training__source" data-testid="reference-training-source">
          <video
            src={snapshot.mediaUrl}
            controls
            playsInline
            preload="metadata"
            aria-label="Measured reference video"
          />
          <div className="reference-training__metrics">
            <span>{seconds(snapshot.source.media.durationMs)}</span>
            <span>{snapshot.source.media.frameRateHz.toFixed(2)} fps</span>
            <span>{snapshot.source.media.widthPx}×{snapshot.source.media.heightPx}</span>
          </div>
          <p title={snapshot.source.contentHash}>
            {snapshot.source.sourceRef} · {snapshot.source.contentHash.slice(7, 19)}…
          </p>
        </div>
      ) : null}

      <div className="reference-training__availability" aria-label="Inference availability">
        <span>Pose backend</span>
        <span data-available={snapshot.availability.poseBackend === "available" ? "1" : "0"}>
          {snapshot.availability.poseBackend}
        </span>
        <span>Semantic model</span>
        <span data-available={snapshot.availability.semanticProvider === "available" ? "1" : "0"}>
          {snapshot.availability.semanticProvider}
        </span>
        <span>Artifact store</span>
        <span data-available={snapshot.availability.persistence === "available" ? "1" : "0"}>
          {snapshot.availability.persistence}
        </span>
        <span>Live preview</span>
        <span data-available={snapshot.availability.preview === "available" ? "1" : "0"}>
          {snapshot.availability.preview}
        </span>
      </div>

      {snapshot.progress ? (
        <div className="reference-training__progress" data-testid="reference-training-progress">
          <span>{snapshot.progress.stage}</span>
          <progress value={snapshot.progress.completed} max={Math.max(1, snapshot.progress.total)} />
          <span>{snapshot.progress.completed}/{snapshot.progress.total}</span>
        </div>
      ) : null}

      {snapshot.diagnostics.length > 0 ? (
        <div className="reference-training__diagnostics" data-testid="reference-training-diagnostics">
          {snapshot.diagnostics.map((diagnostic) => (
            <p key={`${diagnostic.code}:${diagnostic.message}`} data-severity={diagnostic.severity}>
              {diagnostic.code.replaceAll("_", " ")} · {diagnostic.message}
            </p>
          ))}
        </div>
      ) : null}

      {snapshot.source ? (
        <>
          <textarea
            className="reference-training__intent"
            value={intent}
            rows={2}
            aria-label="Reference movement intent"
            placeholder="What must Gasper preserve from this movement?"
            onChange={(event) => setIntent(event.target.value)}
          />
          <div className="reference-training__actions">
            <button
              type="button"
              className="reference-training__analyze"
              disabled={snapshot.availability.poseBackend !== "available" || snapshot.status === "analyzing" || snapshot.status === "interpreting"}
              onClick={() => void session.analyze(intent)}
              title={
                snapshot.availability.poseBackend === "available"
                  ? "Analyze timestamped pose observations and compile a physics-safe behavior"
                  : "Install the real pose backend before analysis"
              }
              data-testid="reference-training-analyze"
            >
              {snapshot.physicsPlan ? "Re-analyze" : "Analyze movement"}
            </button>
            {snapshot.physicsPlan ? (
              snapshot.status === "previewing" ? (
                <button type="button" onClick={() => session.stopPreview()} data-testid="reference-training-stop-preview">
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  disabled={snapshot.availability.preview !== "available"}
                  onClick={() => session.preview()}
                  data-testid="reference-training-preview"
                >
                  Preview
                </button>
              )
            ) : null}
          </div>
        </>
      ) : null}

      {snapshot.motionScore && snapshot.formProfile && snapshot.physicsPlan ? (
        <div className="reference-training__compiled" data-testid="reference-training-compiled">
          <div className="reference-training__compiled-heading">
            <strong>{snapshot.semanticProposal?.movementName ?? "Measured movement"}</strong>
            <span>{snapshot.motionScore.beats.length} beats · {snapshot.formProfile.formId}</span>
          </div>
          <p>
            {snapshot.dispositions.filter((entry) => entry.disposition === "exact").length} exact · {snapshot.dispositions.filter((entry) => entry.disposition === "stylized").length} stylized
          </p>
          {snapshot.mechanics?.unavailable.length ? (
            <p data-testid="reference-training-unavailable">
              Unavailable from pixels · {snapshot.mechanics.unavailable.join(" · ")}
            </p>
          ) : null}
          <details className="reference-training__physics" data-testid="reference-training-physics">
            <summary>Physics envelope · {Object.keys(snapshot.formProfile.physics).length} quantities</summary>
            <div>
              {Object.entries(snapshot.formProfile.physics).map(([id, quantity]) => (
                <p key={id} title={quantity.meaning}>
                  <span>{quantity.label}</span>
                  <span>{quantity.status === "resolved" ? `${quantity.value} ${quantity.unit}` : "calibration required"}</span>
                  <span>{quantity.application.replaceAll("_", " ")}</span>
                </p>
              ))}
            </div>
          </details>
        </div>
      ) : null}
    </section>
  );
}

export default ReferenceTrainingPanel;
