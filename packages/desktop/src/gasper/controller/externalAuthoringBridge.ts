/**
 * VEC-802 — Explicit external-authoring compatibility contract.
 *
 * FormMaster historically accepted iframe `postMessage` control
 * (`sidekick-form-control`) and emitted `sidekick-form-ready`. That path is not
 * the Gasper Studio production hot path. Production command/state/projection
 * authority remains:
 *   GasperRigController → compositor → FormMaster/native projection lease.
 *
 * The FormMaster bundle installs the message listener only when the script is
 * in standalone mode or when `__GASPER_EXTERNAL_AUTHORING_BRIDGE__ === true`.
 * Packaged desktop mounts (typed organism clock authority) keep it disabled so
 * no control path bypasses canonical command/state/projection authority.
 */

export const EXTERNAL_AUTHORING_BRIDGE_PACKET = "VEC-802" as const;

/** Global opt-in for the FormMaster iframe message bridge. */
export const EXTERNAL_AUTHORING_BRIDGE_GLOBAL_KEY =
  "__GASPER_EXTERNAL_AUTHORING_BRIDGE__" as const;

/** Inbound control message type (historical Sidekick embed). */
export const EXTERNAL_AUTHORING_CONTROL_MESSAGE_TYPE =
  "sidekick-form-control" as const;

/** Outbound ready message type (historical Sidekick embed). */
export const EXTERNAL_AUTHORING_READY_MESSAGE_TYPE =
  "sidekick-form-ready" as const;

/** Source markers used by structural isolation proofs. */
export const EXTERNAL_AUTHORING_ISOLATION_MARKERS = {
  packet: EXTERNAL_AUTHORING_BRIDGE_PACKET,
  gate: "formMasterStandalone||globalThis.__GASPER_EXTERNAL_AUTHORING_BRIDGE__===true",
  controlType: EXTERNAL_AUTHORING_CONTROL_MESSAGE_TYPE,
  readyType: EXTERNAL_AUTHORING_READY_MESSAGE_TYPE,
  productionHotPathForbidden: true,
  canonicalCommandPath:
    "GasperRigController.applyExternalPose → resolveComposedPose → projection lease",
} as const;

export type ExternalAuthoringBridgeInspection = Readonly<{
  packet: typeof EXTERNAL_AUTHORING_BRIDGE_PACKET;
  enabled: boolean;
  productionHotPath: false;
  isolationRequired: true;
}>;

/** Read whether the explicit external-authoring bridge is currently enabled. */
export function isExternalAuthoringBridgeEnabled(
  host: typeof globalThis = globalThis,
): boolean {
  const g = host as typeof globalThis & {
    [EXTERNAL_AUTHORING_BRIDGE_GLOBAL_KEY]?: unknown;
  };
  return g[EXTERNAL_AUTHORING_BRIDGE_GLOBAL_KEY] === true;
}

export function inspectExternalAuthoringBridge(
  host: typeof globalThis = globalThis,
): ExternalAuthoringBridgeInspection {
  return {
    packet: EXTERNAL_AUTHORING_BRIDGE_PACKET,
    enabled: isExternalAuthoringBridgeEnabled(host),
    productionHotPath: false,
    isolationRequired: true,
  };
}
