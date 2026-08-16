import type { ConnectionSnapshot } from "../adapter/types";
import { presentConnection } from "../adapter/productTruth";

export function ConnectionIndicator({ connection }: { connection: ConnectionSnapshot }) {
  const p = presentConnection(connection);
  return (
    <span
      className="gwc-conn"
      data-tone={p.tone}
      data-state={p.state}
      data-connected={p.isConnected ? "true" : "false"}
      data-testid="gwc-connection"
      title={connection.detail ?? p.label}
    >
      <span className="gwc-conn-dot" aria-hidden />
      <span>{p.label}</span>
    </span>
  );
}
