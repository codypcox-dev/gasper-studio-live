/**
 * Honest FormMaster authority report (renderer recovery megagoal).
 *
 * Production visual authority is currently the Legacy Authority Renderer
 * (FormMaster scripts + full SVG stack). Native modules remain extraction
 * targets for the dual-renderer lab — they are NOT production identity authority.
 */

export type FormMasterOperation = {
  operation: string;
  callSite: string;
  stillInvokesFormMaster: boolean;
  notes: string;
};

export const FORMMASTER_DEPENDENCY_REPORT: FormMasterOperation[] = [
  {
    operation: "mountGasperDocument (production default)",
    callSite:
      "GasperDocument.ts → mountGasperDocumentLegacyFormMaster (Legacy Authority)",
    stillInvokesFormMaster: true,
    notes:
      "Renderer recovery: production default is complete FormMaster character. Native candidate is mountGasperDocumentNativeCandidate only.",
  },
  {
    operation: "setEmbodiment / setProfile (legacy path)",
    callSite: "LegacyAuthorityRenderer / FormMaster setProfile",
    stillInvokesFormMaster: true,
    notes: "Production path routes through SidekickFormMasterRig when legacyFormMaster.",
  },
  {
    operation: "setExpression / setFixture (legacy path)",
    callSite: "LegacyAuthorityRenderer / FormMaster setFixture",
    stillInvokesFormMaster: true,
    notes: "Complete expression geometry lives in FormMaster face-plane scripts.",
  },
  {
    operation: "material / relief / energy (legacy path)",
    callSite: "all-script-0..3 procedural stack",
    stillInvokesFormMaster: true,
    notes: "Native extraction incomplete; material/relief/energy remain FormMaster-owned.",
  },
  {
    operation: "native candidate mount (lab only)",
    callSite: "mountGasperDocumentNativeCandidate → NativeGasperRigInstance",
    stillInvokesFormMaster: false,
    notes: "Parity lab / dual-renderer backend — not production authority.",
  },
  {
    operation: "native contour solver (candidate)",
    callSite: "GasperContourSolver.solveContour → GasperRenderMixer",
    stillInvokesFormMaster: false,
    notes: "Partial native body contour; does not equal complete character identity.",
  },
  {
    operation: "additive living / GSAP (product)",
    callSite: "GasperLivingRuntime — always started; FormMaster filters LEGACY_LIVING_SAFE_KEYS",
    stillInvokesFormMaster: true,
    notes:
      "Additive living is product authority on Legacy path: safe semantic keys only (energy/gaze/blink), never mass/contour rewrites.",
  },
  {
    operation: "visual bounds / camera Fit",
    callSite: "GasperVisualBounds + GasperViewportController",
    stillInvokesFormMaster: false,
    notes: "Content-space bounds + stage camera (shared infrastructure).",
  },
  {
    operation: "binding registry / document model",
    callSite: "GasperRigController.registry + animation document",
    stillInvokesFormMaster: false,
    notes: "Canonical state infrastructure shared; visual output authority is Legacy until parity.",
  },
];

export function formMasterStillOwnsDeepRig(): boolean {
  // Honest: production default still owns deep rig via FormMaster
  return FORMMASTER_DEPENDENCY_REPORT.some(
    (r) =>
      r.stillInvokesFormMaster &&
      r.operation.includes("mountGasperDocument"),
  );
}

export function formMasterOperationsStillActive(): string[] {
  return FORMMASTER_DEPENDENCY_REPORT.filter((r) => r.stillInvokesFormMaster).map(
    (r) => r.operation,
  );
}

/** Production uses local FormMaster scripts — not remote Sidekick HTML candidates. */
export function normalRuntimeUsesCandidateScripts(): boolean {
  return false;
}

export function normalRuntimeHiddenStubCount(): number {
  // Legacy path uses off-screen stub controls for FormMaster globals (not UI terminal).
  return 1;
}

/** Deep identity authority is NOT native until dual-renderer parity. */
export function deepRigAuthorityIsNative(): boolean {
  return !formMasterStillOwnsDeepRig();
}

export function summarizeFormMasterAuthority(): string {
  return [
    "Production visual authority: Legacy Authority Renderer (FormMaster all-script-0..3 + gasper-rig-v655).",
    "Native candidate: mountGasperDocumentNativeCandidate — incomplete extraction; lab only.",
    "No iframe / no Sidekick HTML discovery / no AgentBridge requirement for character mount.",
    "Additive living runtime active on legacyFormMaster via LEGACY_LIVING_SAFE_KEYS (identity topology preserved).",
    "Active FormMaster production ops: " +
      (formMasterOperationsStillActive().join(", ") || "none"),
  ].join(" ");
}
