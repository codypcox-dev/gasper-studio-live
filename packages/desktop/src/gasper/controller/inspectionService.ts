/**
 * VEC-801 — Inspection service helpers for the Dais / controller facade.
 * Builds inspection payloads without owning organism state or projection writes.
 */

import { buildDaisInspectionReport } from "../GasperDaisInspection";
import type { GasperViewportController } from "../GasperViewportController";
import type { BoundsSnapshot } from "../GasperVisualBounds";
import { GASPER_TOPOLOGY } from "../GasperTopologyLock";
import { validateGasperRuntime } from "../GasperValidate";
import {
  createGasperDocument,
  defaultDomainStatusReport,
  type GasperDocumentV1,
} from "../GasperDocumentModel";
import type { GasperMultiDomainState } from "../GasperDomainState";
import { inspectExternalAuthoringBridge } from "./externalAuthoringBridge";

export type InspectionControllerPort = {
  livingStatus: () => unknown;
  topologyStatus: () => unknown;
  getMount: () => {
    legacyFormMaster?: boolean;
    topology?: {
      contourSamples: number;
      structuralNodes: number;
      structuralTriangles?: number;
    };
  } | null;
  getDomainState: () => GasperMultiDomainState;
  selection: { getState: () => { embodiment: string } };
  mixer: {
    getDomain: () => GasperMultiDomainState;
    getLastFlushReport: () => unknown;
  };
};

export function inspectDaisForController(
  controller: unknown,
  extra?: {
    viewport?: GasperViewportController | null;
    bounds?: BoundsSnapshot | null;
    performance?: Record<string, number> | null;
  },
) {
  return buildDaisInspectionReport({
    controller: controller as never,
    viewport: extra?.viewport ?? null,
    bounds: extra?.bounds ?? null,
    performance: extra?.performance ?? null,
  });
}

export function topologyStatusForController<TFlush>(input: {
  topologyErrors: string[];
  lastFlush: TFlush;
}): {
  lock: typeof GASPER_TOPOLOGY;
  errors: string[];
  lastFlush: TFlush;
} {
  return {
    lock: GASPER_TOPOLOGY,
    errors: input.topologyErrors,
    lastFlush: input.lastFlush,
  };
}

export function validateRuntimeForController(input: {
  embodimentId: string;
  topology: {
    contourSamples: number;
    structuralNodes: number;
    structuralTriangles?: number;
  };
  domain: GasperMultiDomainState;
  lastFlush: unknown;
  legacyFormMaster: boolean;
}) {
  const topology = {
    contourSamples: input.topology.contourSamples,
    structuralNodes: input.topology.structuralNodes,
    structuralTriangles:
      input.topology.structuralTriangles ?? GASPER_TOPOLOGY.structuralTriangles,
  };
  return validateGasperRuntime({
    embodimentId: input.embodimentId,
    topology,
    domain: input.domain,
    lastFlush: input.lastFlush as never,
    iframeCount: 0,
    unexpectedHiddenStubCount: 0,
    formMasterOnNormalPath: input.legacyFormMaster,
    formMasterProductionPath: input.legacyFormMaster,
    typedCanonicalAuthoritiesBounded: true,
  });
}

export function exportDocumentForController(
  domain: GasperMultiDomainState,
): GasperDocumentV1 {
  return createGasperDocument({
    domainState: domain,
    domainStatus: defaultDomainStatusReport(),
  });
}

/** Inspection extras proving external authoring bridge isolation. */
export function inspectControlPathHygiene() {
  return {
    externalAuthoringBridge: inspectExternalAuthoringBridge(),
    authoringHotPathForbidden: [
      "MCP",
      "REST",
      "CDP",
      "Playwright",
      "iframe",
      "postMessage",
      "React per-frame geometry rerender",
    ] as const,
    canonicalCommandPath:
      "GasperRigController.applyExternalPose → resolveComposedPose → projection lease",
  };
}
