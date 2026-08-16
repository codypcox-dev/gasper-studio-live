/**
 * VEC-801 — Vector projection coordination surface for the controller facade.
 * Does not implement a second projection writer; inspects the VEC-701 authority.
 */

import { getGasperVectorProjectionAuthority } from "../projection";

export type ProjectionInspectionHost = {
  svgRoot: unknown | null | undefined;
  mixerProjectionInspection: () => unknown;
  opticalMode: "authoring-neutral" | "runtime-beauty";
  lastFlush: unknown;
  counters: unknown;
  nodeCacheReady: boolean;
  legacyFormMaster: boolean;
};

/** Build the controller render-profile projection section. */
export function inspectControllerProjection(host: ProjectionInspectionHost) {
  return {
    opticalMode: host.opticalMode,
    lastFlush: host.lastFlush,
    counters: host.counters,
    nodeCacheReady: host.nodeCacheReady,
    projection: host.svgRoot
      ? getGasperVectorProjectionAuthority().inspect(host.svgRoot as never)
      : host.mixerProjectionInspection(),
    legacyFormMaster: host.legacyFormMaster,
  };
}

/** True when the mount has a live production or lab projection root. */
export function hasLiveProjectionRoot(
  svgRoot: unknown | null | undefined,
): boolean {
  return svgRoot != null;
}
