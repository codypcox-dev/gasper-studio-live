import { useCallback, useState } from "react";
import {
  CANONOPS_MODES,
  DEFAULT_CANONOPS_RESIDUAL,
  buildCanonOpsRequest,
  modeVerb,
  type CanonOpsMode,
  type CanonOpsPhdPacket,
} from "./CanonOpsProtocol.js";
import { HttpCanonOpsApi } from "./HttpCanonOpsApi.js";

const LABELS: Record<CanonOpsMode, string> = {
  explore: "Explore",
  summarize: "Summarize",
  investigate: "Investigate",
};

export function CanonOpsPanel(): React.ReactElement {
  const api = new HttpCanonOpsApi();
  const [busy, setBusy] = useState<CanonOpsMode | null>(null);
  const [packet, setPacket] = useState<CanonOpsPhdPacket | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (mode: CanonOpsMode) => {
    setBusy(mode);
    setError(null);
    try {
      setPacket(await api.run(buildCanonOpsRequest(mode)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  }, [api]);

  return (
    <section className="canonops-panel" data-testid="canonops-panel" data-residual={DEFAULT_CANONOPS_RESIDUAL.id}>
      <p className="dais-control-rail__label">CanonOps PHD</p>
      <p className="dais-control-rail__note">Tri-Force first · earn · return</p>
      <div className="dais-control-rail__row" role="group" aria-label="CanonOps modes">
        {CANONOPS_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            data-testid={`canonops-${mode}`}
            data-active={busy === mode ? "1" : "0"}
            disabled={busy !== null}
            title={modeVerb(mode)}
            onClick={() => void run(mode)}
          >
            {busy === mode ? "Earning…" : LABELS[mode]}
          </button>
        ))}
      </div>
      {packet ? (
        <p className="dais-control-rail__note" data-testid="canonops-receipt">
          {packet.mode} · {packet.triforce.engineVersion} · {packet.triforce.returned ? "returned" : "queued"}
        </p>
      ) : null}
      {error ? (
        <p className="dais-control-rail__note" data-testid="canonops-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
