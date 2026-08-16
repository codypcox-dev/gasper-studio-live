/**
 * VEC-801 — Organism clock integration for the desktop controller host.
 * One domain/projection tick subscriber; no independent perpetual RAF.
 */

import type {
  GasperGsapClockBridgeHandle,
  GasperOrganismClockPort,
  OrganismClockFrame,
} from "../clock";
import { attachGasperGsapClockBridge } from "../clock";

export const DOMAIN_TICK_SUBSCRIBER_ID = "gasper-rig-domain-tick" as const;
export const DOMAIN_TICK_PRIORITY = 40 as const;
export const DOMAIN_TICK_CADENCE_MS = 1000 / 30;

export type DomainTickHost = {
  mixerTick: (timeMs: number) => void;
  mixerFlushScheduled: () => void;
  setOperationalClockSec: (sec: number) => void;
};

export type DomainTickHandle = {
  unsubscribe: () => void;
  lastDomainTickMs: number;
};

/**
 * Subscribe the domain/projection tick to the sole organism clock.
 * Cadence ~30 Hz for relief/energy fields; every frame drains scheduled flushes.
 */
export function startDomainTickOnOrganismClock(
  clock: GasperOrganismClockPort,
  host: DomainTickHost,
): DomainTickHandle {
  let lastDomainTickMs = 0;
  const unsubscribe = clock.subscribe({
    id: DOMAIN_TICK_SUBSCRIBER_ID,
    priority: DOMAIN_TICK_PRIORITY,
    onFrame: (frame: OrganismClockFrame) => {
      if (
        !lastDomainTickMs ||
        frame.timeMs - lastDomainTickMs >= DOMAIN_TICK_CADENCE_MS
      ) {
        lastDomainTickMs = frame.timeMs;
        host.mixerTick(frame.timeMs);
        host.setOperationalClockSec(frame.elapsedMs / 1000);
      }
      host.mixerFlushScheduled();
    },
  });
  return {
    unsubscribe,
    get lastDomainTickMs() {
      return lastDomainTickMs;
    },
    set lastDomainTickMs(v: number) {
      lastDomainTickMs = v;
    },
  };
}

/** Attach the single GSAP root bridge for this mounted realm. */
export function attachControllerGsapClockBridge(
  clock: GasperOrganismClockPort,
  previous: GasperGsapClockBridgeHandle | null,
): GasperGsapClockBridgeHandle {
  previous?.dispose();
  return attachGasperGsapClockBridge(clock);
}

/** Stop the driver only when no mounted subscribers remain. */
export function stopOrganismClockIfIdle(clock: GasperOrganismClockPort): void {
  if (clock.inspect().subscriberCount === 0) {
    clock.stop();
  }
}
