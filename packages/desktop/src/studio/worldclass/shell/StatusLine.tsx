import type { ReactNode } from "react";
import type { WorldClassStudioSnapshot } from "../adapter/types";
import { formatTimecode, presentPlayback } from "../adapter/productTruth";

export function StatusLine({
  snap,
  diagnosticsSlot,
}: {
  snap: WorldClassStudioSnapshot;
  diagnosticsSlot?: ReactNode;
}) {
  const hasDoc = snap.document.lifecycle !== "none" && snap.document.lifecycle !== "invalid";
  const play = presentPlayback(snap.animation.playback, hasDoc);
  const hash = snap.document.contentHash ?? null;
  return (
    <footer className="gwc-status" data-testid="gwc-status" role="contentinfo">
      <span className="gwc-status-msg" data-testid="gwc-status-msg">
        {snap.statusMessage}
      </span>
      {diagnosticsSlot}
      <div className="gwc-status-meta">
        <span data-testid="gwc-status-playback">{play.label}</span>
        <span data-testid="gwc-status-timecode">{formatTimecode(snap.animation.playheadMs)}</span>
        <span
          data-testid="gwc-doc-revision"
          data-revision={snap.document.revision}
          title="Document revision"
        >
          rev {snap.document.revision}
        </span>
        <span data-testid="status-revision" className="gwc-sr-only" aria-hidden>
          {snap.document.revision}
        </span>
        <span
          data-testid="gwc-status-content-hash"
          data-content-hash={hash ?? ""}
          title="Document content hash"
        >
          {hash && hash !== "pending" ? `${hash.slice(0, 8)}…` : "hash —"}
        </span>
        <span data-testid="gwc-status-layout">{snap.diagnostics.layoutMode}</span>
        <span data-testid="gwc-status-workspace" data-workspace={snap.workspace}>
          {snap.workspace}
        </span>
        {snap.character.embodiment ? (
          <span data-testid="gwc-status-embodiment">{snap.character.embodiment}</span>
        ) : null}
        {snap.diagnostics.buildIdentity ? (
          <span
            data-testid="frontend-build-id"
            data-frontend-build={snap.diagnostics.buildIdentity}
            title="Frontend build identity"
          >
            {snap.diagnostics.buildIdentity}
          </span>
        ) : null}
      </div>
    </footer>
  );
}
