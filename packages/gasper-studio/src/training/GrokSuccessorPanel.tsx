import { useCallback, useEffect, useMemo, useState } from "react";

import { HttpGrokSuccessorApi, type GrokSuccessorApi } from "./HttpGrokSuccessorApi.js";
import type { GrokSuccessorStatus } from "./GrokSuccessorProtocol.js";

export type GrokSuccessorPanelProps = Readonly<{
  api?: GrokSuccessorApi;
  initialStatus?: GrokSuccessorStatus;
}>;

export function GrokSuccessorPanel({
  api,
  initialStatus,
}: GrokSuccessorPanelProps): React.ReactElement {
  const successorApi = useMemo(() => api ?? new HttpGrokSuccessorApi(), [api]);
  const [status, setStatus] = useState<GrokSuccessorStatus | null>(initialStatus ?? null);
  const [loading, setLoading] = useState(!initialStatus);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await successorApi.getStatus(signal));
    } catch (cause) {
      if (signal?.aborted) return;
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [successorApi]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  return (
    <section className="grok-successor" data-testid="grok-successor" data-ready={status ? "1" : "0"}>
      <div className="grok-successor__header">
        <div>
          <span className="grok-successor__eyebrow">SUCCESSOR LINK</span>
          <strong>Gasper continuity</strong>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading}>
          {loading ? "Checking…" : "Refresh"}
        </button>
      </div>
      {status ? (
        <>
          <div className="grok-successor__badges">
            <span data-state={status.identity.environmentVerified ? "good" : "bad"}>
              {status.identity.environmentVerified ? "GROK 4.6 VERIFIED" : "GROK 4.6 UNVERIFIED"}
            </span>
            <span data-state={status.identity.responseVerified ? "good" : "warn"}>
              {status.identity.responseVerified ? "RESPONSE VERIFIED" : "RESPONSE PROOF PENDING"}
            </span>
            <span data-state={status.bridge.healthy ? "good" : "bad"}>
              {status.bridge.healthy ? "AGENTBRIDGE HEALTHY" : "AGENTBRIDGE OFFLINE"}
            </span>
            <span data-state="neutral">{status.bridge.discoveredTools} TOOLS</span>
          </div>
          <dl className="grok-successor__facts">
            <div>
              <dt>Backend</dt>
              <dd>{status.identity.backendModel ?? status.identity.requestedModel}</dd>
            </div>
            <div>
              <dt>PlanOps</dt>
              <dd>{status.planops.turn} · {status.planops.workId ?? "no active work"}</dd>
            </div>
            <div>
              <dt>Branch</dt>
              <dd>{status.repo.branch} · {status.repo.head.slice(0, 9)}</dd>
            </div>
          </dl>
          <p className="grok-successor__next">
            <span>NEXT</span>
            {status.continuity.nextAction ?? "Write the first durable continuity packet."}
          </p>
          {status.bridge.incompatibleTools.length ? (
            <details className="grok-successor__warning">
              <summary>{status.bridge.incompatibleTools.length} incompatible MCP names</summary>
              <p>{status.bridge.incompatibleTools.join(" · ")}</p>
            </details>
          ) : (
            <p className="grok-successor__compatible">MCP tool names compatible</p>
          )}
          {status.bridge.legalAliases.length ? (
            <details className="grok-successor__aliases">
              <summary>{status.bridge.legalAliases.length} legal Grok aliases</summary>
              <p>{status.bridge.legalAliases.map((alias) => alias.legal).join(" · ")}</p>
            </details>
          ) : null}
        </>
      ) : (
        <p className="grok-successor__empty">Checking the local Grok and AgentBridge runtime…</p>
      )}
      {error ? <p className="grok-successor__error">{error}</p> : null}
    </section>
  );
}

export default GrokSuccessorPanel;
