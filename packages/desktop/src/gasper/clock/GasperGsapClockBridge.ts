/**
 * VEC-401 — Advance the GSAP root from the Gasper organism clock.
 *
 * The bridge removes GSAP's autonomous root update from its ticker, sleeps the
 * ticker, and subscribes one `gsap-root` frame consumer. A realm-level ref-count
 * prevents duplicate bridges when multiple controller surfaces attach.
 */

import gsap, { type GsapApi } from "../gsap-shim";
import {
  getGasperOrganismClock,
  type GasperOrganismClockPort,
  type OrganismClockFrame,
} from "./GasperOrganismClock";

export const GSAP_CLOCK_BRIDGE_GLOBAL_KEY = "__GASPER_GSAP_CLOCK_BRIDGE__" as const;
export const GSAP_CLOCK_SUBSCRIBER_ID = "gsap-root" as const;
export const GSAP_CLOCK_PRIORITY = 10 as const;

type RequiredGsapClockApi = GsapApi & {
  updateRoot: (timeSeconds?: number) => void;
  ticker: {
    add: (fn: (time?: number) => void) => void;
    remove: (fn: (time?: number) => void) => void;
    sleep?: () => void;
    wake?: () => void;
  };
};

type BridgeState = {
  clock: GasperOrganismClockPort;
  api: RequiredGsapClockApi;
  refCount: number;
  unsubscribe: () => void;
  lastFrameIndex: number;
  disposed: boolean;
};

type BridgeGlobal = typeof globalThis & {
  [GSAP_CLOCK_BRIDGE_GLOBAL_KEY]?: BridgeState;
};

export type GasperGsapClockBridgeInspection = Readonly<{
  active: boolean;
  refCount: number;
  subscriberId: typeof GSAP_CLOCK_SUBSCRIBER_ID;
  priority: typeof GSAP_CLOCK_PRIORITY;
  lastFrameIndex: number;
  clockAuthorityId: string;
}>;

export type GasperGsapClockBridgeHandle = {
  inspect(): GasperGsapClockBridgeInspection;
  dispose(): void;
};

function requireGsapClockApi(api: GsapApi): RequiredGsapClockApi {
  const candidate = api as RequiredGsapClockApi;
  if (
    typeof candidate.updateRoot !== "function" ||
    !candidate.ticker ||
    typeof candidate.ticker.add !== "function" ||
    typeof candidate.ticker.remove !== "function"
  ) {
    throw new Error(
      "VEC-401 requires gsap.updateRoot and gsap.ticker add/remove for organism-clock authority",
    );
  }
  return candidate;
}

export function attachGasperGsapClockBridge(
  clock: GasperOrganismClockPort = getGasperOrganismClock(),
  api: GsapApi = gsap,
): GasperGsapClockBridgeHandle {
  const host = globalThis as BridgeGlobal;
  const typedApi = requireGsapClockApi(api);
  const existing = host[GSAP_CLOCK_BRIDGE_GLOBAL_KEY];

  if (existing && !existing.disposed) {
    if (existing.clock !== clock || existing.api !== typedApi) {
      throw new Error("Gasper GSAP clock bridge split-brain refused");
    }
    existing.refCount += 1;
    return createHandle(existing, host);
  }

  typedApi.ticker.remove(typedApi.updateRoot);
  typedApi.ticker.sleep?.();

  const state: BridgeState = {
    clock,
    api: typedApi,
    refCount: 1,
    lastFrameIndex: 0,
    disposed: false,
    unsubscribe: () => undefined,
  };
  state.unsubscribe = clock.subscribe({
    id: GSAP_CLOCK_SUBSCRIBER_ID,
    priority: GSAP_CLOCK_PRIORITY,
    onFrame: (frame: OrganismClockFrame) => {
      if (state.disposed) return;
      state.lastFrameIndex = frame.frameIndex;
      typedApi.updateRoot(frame.timeMs / 1000);
    },
  });
  host[GSAP_CLOCK_BRIDGE_GLOBAL_KEY] = state;
  return createHandle(state, host);
}

function createHandle(
  state: BridgeState,
  host: BridgeGlobal,
): GasperGsapClockBridgeHandle {
  let released = false;
  return {
    inspect() {
      return Object.freeze({
        active: !state.disposed,
        refCount: state.refCount,
        subscriberId: GSAP_CLOCK_SUBSCRIBER_ID,
        priority: GSAP_CLOCK_PRIORITY,
        lastFrameIndex: state.lastFrameIndex,
        clockAuthorityId: state.clock.authorityId,
      });
    },
    dispose() {
      if (released) return;
      released = true;
      state.refCount = Math.max(0, state.refCount - 1);
      if (state.refCount > 0 || state.disposed) return;
      state.disposed = true;
      state.unsubscribe();
      state.api.ticker.add(state.api.updateRoot);
      state.api.ticker.wake?.();
      if (host[GSAP_CLOCK_BRIDGE_GLOBAL_KEY] === state) {
        delete host[GSAP_CLOCK_BRIDGE_GLOBAL_KEY];
      }
    },
  };
}

/** Test-only cleanup for realm-isolated bridge tests. */
export function resetGasperGsapClockBridgeForTests(): void {
  const host = globalThis as BridgeGlobal;
  const state = host[GSAP_CLOCK_BRIDGE_GLOBAL_KEY];
  if (!state) return;
  if (!state.disposed) {
    state.refCount = 1;
    createHandle(state, host).dispose();
  }
  delete host[GSAP_CLOCK_BRIDGE_GLOBAL_KEY];
}
