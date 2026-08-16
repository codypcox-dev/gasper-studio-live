/**
 * Wave R8 — Validate surface (product gates, not decorative UI).
 */

import { GASPER_TOPOLOGY } from "./GasperTopologyLock";
import type { GasperMultiDomainState } from "./GasperDomainState";
import type { DomainFlushReport } from "./GasperDomainState";
import { GASPER_EMBODIMENT_IDS } from "./GasperRigDefinition";

export type ValidationFinding = {
  id: string;
  severity: "error" | "warn" | "info";
  message: string;
};

export type ValidationReport = {
  ok: boolean;
  findings: ValidationFinding[];
  topology: {
    contourSamples: number;
    structuralNodes: number;
    structuralTriangles: number;
  };
  embodimentId: string;
  opticalMode?: string;
  dirtyDomainFlush?: boolean;
};

export function validateGasperRuntime(input: {
  embodimentId: string;
  topology: {
    contourSamples: number;
    structuralNodes: number;
    structuralTriangles: number;
  };
  domain: GasperMultiDomainState;
  lastFlush?: DomainFlushReport | null;
  iframeCount?: number;
  unexpectedHiddenStubCount?: number;
  formMasterOnNormalPath?: boolean;
  formMasterProductionPath?: boolean;
  typedCanonicalAuthoritiesBounded?: boolean;
}): ValidationReport {
  const findings: ValidationFinding[] = [];
  const t = input.topology;

  if (t.contourSamples !== GASPER_TOPOLOGY.contourSamples) {
    findings.push({
      id: "topo-contour",
      severity: "error",
      message: `contourSamples ${t.contourSamples} ≠ ${GASPER_TOPOLOGY.contourSamples}`,
    });
  }
  if (t.structuralNodes !== GASPER_TOPOLOGY.structuralNodes) {
    findings.push({
      id: "topo-nodes",
      severity: "error",
      message: `structuralNodes ${t.structuralNodes} ≠ ${GASPER_TOPOLOGY.structuralNodes}`,
    });
  }
  if (t.structuralTriangles !== GASPER_TOPOLOGY.structuralTriangles) {
    findings.push({
      id: "topo-tris",
      severity: "error",
      message: `structuralTriangles ${t.structuralTriangles} ≠ ${GASPER_TOPOLOGY.structuralTriangles}`,
    });
  }
  if (!GASPER_EMBODIMENT_IDS.includes(input.embodimentId)) {
    findings.push({
      id: "embodiment",
      severity: "error",
      message: `unknown embodiment ${input.embodimentId}`,
    });
  }
  if ((input.iframeCount ?? 0) > 0) {
    findings.push({
      id: "iframe",
      severity: "error",
      message: "iframe count must be 0",
    });
  }
  if ((input.unexpectedHiddenStubCount ?? 0) > 0) {
    findings.push({
      id: "stubs",
      severity: "error",
      message: "unexpected hidden stubs must be 0 on the production path",
    });
  }
  if (input.formMasterOnNormalPath) {
    const disclosedProductionExecutor =
      input.formMasterProductionPath === true &&
      input.typedCanonicalAuthoritiesBounded === true;
    findings.push(
      disclosedProductionExecutor
        ? {
            id: "formmaster-production",
            severity: "info",
            message:
              "legacy FormMaster production executor is disclosed and bounded by typed canonical authorities",
          }
        : {
            id: "formmaster-authority",
            severity: "error",
            message:
              "FormMaster may run only as the disclosed production executor bounded by typed canonical authorities",
          },
    );
  }
  if (input.lastFlush?.contourOnly) {
    findings.push({
      id: "flush-contour-only",
      severity: "warn",
      message: "last flush was contour-only — multi-domain may be idle",
    });
  }
  if (input.domain.relief.samples.length < 100) {
    findings.push({
      id: "relief-field",
      severity: "error",
      message: "relief field undersized",
    });
  }

  const errors = findings.filter((f) => f.severity === "error");
  return {
    ok: errors.length === 0,
    findings,
    topology: t,
    embodimentId: input.embodimentId,
    opticalMode: input.lastFlush?.opticalMode,
    dirtyDomainFlush: (input.lastFlush?.dirtyDomainsFlushed?.length ?? 0) > 0,
  };
}
