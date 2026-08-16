/**
 * Inspection report for the **actual React Studio Dais** (not legacy candidate HTML).
 * Exposed via controller.inspectDais() / window.__GASPER_DAIS__.inspectDais().
 */

import type { GasperRigController } from "./GasperRigController";
import type { GasperViewportController } from "./GasperViewportController";
import type { BoundsSnapshot } from "./GasperVisualBounds";
import {
  FORMMASTER_DEPENDENCY_REPORT,
  formMasterStillOwnsDeepRig,
  summarizeFormMasterAuthority,
} from "./GasperFormMasterDependencyReport";

export type DaisInspectionReport = {
  source: "react-studio-dais";
  notLegacyCandidate: true;
  timestamp: string;
  document: {
    id: string;
    formMasterDeepRig: boolean;
    formMasterSummary: string;
    formMasterOps: string[];
  };
  embodiment: string;
  expression: string;
  mode: string;
  tool: string;
  living: ReturnType<GasperRigController["livingStatus"]>;
  topology: ReturnType<GasperRigController["topologyStatus"]>;
  fieldStatus: {
    reliefWidth: number;
    reliefHeight: number;
    reliefMaxSamples: number;
    reliefRms: number;
    reliefAnimated: boolean;
    energyHasVolumeState: boolean;
    energyLevel: number;
    energyLagged: number;
    energyPulsePhase: number;
    energyVolume: import("./GasperDomainState").EnergyVolumeMetrics | null;
    contourOnly: boolean;
  };
  camera: {
    zoom: number;
    zoomPercent: number;
    panX: number;
    panY: number;
    autoFit: boolean;
    lastFitPercent: number | null;
    clipped: boolean;
    worldScale100: boolean;
  };
  bounds: BoundsSnapshot | null;
  console: string[];
  pageErrors: string[];
  networkFailures: string[];
  performance: Record<string, number> | null;
  /** Path or marker when a capture was taken; null if not captured this call. */
  screenshot: string | null;
  notes: string[];
};

export function buildDaisInspectionReport(input: {
  controller: GasperRigController;
  viewport?: GasperViewportController | null;
  bounds?: BoundsSnapshot | null;
  performance?: Record<string, number> | null;
  console?: string[];
  pageErrors?: string[];
  networkFailures?: string[];
  screenshot?: string | null;
}): DaisInspectionReport {
  const c = input.controller;
  const sel = c.selection.getState();
  const topo = c.topologyStatus();
  const domain = c.getDomainState();
  const live = c.readLive();
  const flush = topo.lastFlush;
  const vp = input.viewport?.getState();

  return {
    source: "react-studio-dais",
    notLegacyCandidate: true,
    timestamp: new Date().toISOString(),
    document: {
      id: sel.documentId,
      formMasterDeepRig: formMasterStillOwnsDeepRig(),
      formMasterSummary: summarizeFormMasterAuthority(),
      formMasterOps: FORMMASTER_DEPENDENCY_REPORT.filter(
        (r) => r.stillInvokesFormMaster,
      ).map((r) => r.operation),
    },
    embodiment: sel.embodiment,
    expression: sel.expression,
    mode: sel.stageMode,
    tool: sel.tool,
    living: c.livingStatus(),
    topology: topo,
    fieldStatus: {
      reliefWidth: domain.relief.width,
      reliefHeight: domain.relief.height,
      reliefMaxSamples: domain.relief.maxSamples,
      reliefRms: flush.reliefSampleRms,
      reliefAnimated: flush.reliefAnimated,
      energyHasVolumeState: flush.energyHasVolumeState,
      energyLevel: live.energy_level ?? domain.energy.level,
      energyLagged: domain.energy.laggedLevel,
      energyPulsePhase: domain.energy.pulsePhase,
      energyVolume: flush.energyVolume ?? null,
      contourOnly: flush.contourOnly,
    },
    camera: {
      zoom: vp?.zoom ?? 1,
      zoomPercent: input.viewport?.displayZoomPercent() ?? 100,
      panX: vp?.panX ?? 0,
      panY: vp?.panY ?? 0,
      autoFit: vp?.autoFit ?? false,
      lastFitPercent: vp?.lastFitPercent ?? null,
      clipped: vp?.clipped ?? false,
      worldScale100: input.viewport?.isWorldScale100() ?? false,
    },
    bounds: input.bounds ?? null,
    console: input.console ?? [],
    pageErrors: input.pageErrors ?? [],
    networkFailures: input.networkFailures ?? [],
    performance: input.performance ?? null,
    screenshot: input.screenshot ?? null,
    notes: [
      "Inspection target is React GasperDaisStage / GasperRigController, not sidekickex-gasper-v6.5.5-standalone.html.",
      summarizeFormMasterAuthority(),
    ],
  };
}
