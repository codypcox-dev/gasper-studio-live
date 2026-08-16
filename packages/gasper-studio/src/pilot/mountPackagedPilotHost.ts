/**
 * Packaged Gasper Studio bootstrap mount for GasperPilotHost.
 *
 * Single construction site for the low-frequency pilot kernel host.
 * Bridge connectivity is reported from connectionAuthority only.
 * Living / GSAP remains continuous frame authority via optional stage resolve.
 */

import {
  mountStudioPilotAdapter,
  type StudioPilotAdapter,
  type StudioPilotHandoffOutcome,
} from "../../../desktop/src/gasper/pilot";
import type { GasperPilotHost } from "../../../desktop/src/gasper/pilot";
import type { RecoveryMode } from "../../../shared/src/gasper-pilot";
import {
  getStudioConnection,
  subscribeStudioConnection,
} from "../connectionAuthority";

export type PackagedPilotMount = {
  host: GasperPilotHost;
  lastHandoff: StudioPilotHandoffOutcome | null;
  handoffLog: readonly StudioPilotHandoffOutcome[];
  reportBridgeConnected: (connected: boolean) => void;
  reportHqConnected: (connected: boolean) => void;
  recoverStandalone: (
    mode?: RecoveryMode,
  ) => ReturnType<GasperPilotHost["recoverStandalone"]>;
  notifyGsapSettled: () => ReturnType<GasperPilotHost["notifyGsapSettled"]>;
  /** Unsubscribe connection + dispose host adapter. */
  unmount: () => void;
};

/**
 * Mount pilot host once for packaged Studio.
 * Safe when stage/living is not yet ready: handoffs no-op until resolveStage succeeds.
 */
export function mountPackagedGasperPilotHost(): PackagedPilotMount {
  const adapter: StudioPilotAdapter = mountStudioPilotAdapter({
    // Default resolve uses globalThis.__GASPER_DAIS__ when IntegratedGasperStage is ready.
  });

  const syncBridge = () => {
    const snap = getStudioConnection();
    const connected =
      snap.state === "connected" ||
      snap.lifecycle === "Operational" ||
      snap.lifecycle === "BridgeConnected";
    adapter.reportBridgeConnected(connected);
    // HQ is not required for survival; only report true when fully operational bridged.
    adapter.reportHqConnected(snap.lifecycle === "Operational");
  };

  syncBridge();
  const unsub = subscribeStudioConnection(syncBridge);

  // Diagnostics surface (acceptance probes / tests) — not a second authority.
  try {
    (
      globalThis as unknown as { __GASPER_PILOT_HOST__?: GasperPilotHost }
    ).__GASPER_PILOT_HOST__ = adapter.host;
    (
      globalThis as unknown as { __GASPER_PILOT_ADAPTER__?: StudioPilotAdapter }
    ).__GASPER_PILOT_ADAPTER__ = adapter;
  } catch {
    /* non-DOM / restricted */
  }

  return {
    get host() {
      return adapter.host;
    },
    get lastHandoff() {
      return adapter.lastHandoff;
    },
    get handoffLog() {
      return adapter.handoffLog;
    },
    reportBridgeConnected: (c) => adapter.reportBridgeConnected(c),
    reportHqConnected: (c) => adapter.reportHqConnected(c),
    recoverStandalone: (mode) => adapter.recoverStandalone(mode),
    notifyGsapSettled: () => adapter.notifyGsapSettled(),
    unmount() {
      unsub();
      adapter.dispose();
      try {
        delete (globalThis as unknown as { __GASPER_PILOT_HOST__?: unknown })
          .__GASPER_PILOT_HOST__;
        delete (globalThis as unknown as { __GASPER_PILOT_ADAPTER__?: unknown })
          .__GASPER_PILOT_ADAPTER__;
      } catch {
        /* */
      }
    },
  };
}
