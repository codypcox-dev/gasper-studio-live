/**
 * GASPER-FINISH-01 Task 7 & 8 — Renderer Equivalence and Production Disposition.
 * Proves that FormMaster v655 remains the production authority, Native candidate
 * stays lab-only, and renderer equivalence gates are enforced fail-closed.
 */

import { describe, expect, it, beforeAll } from "vitest";

// Ensure globalThis.gsap UMD stub is populated before importing GSAP-dependent modules
if (typeof (globalThis as any).gsap === "undefined") {
  (globalThis as any).gsap = {
    quickTo: () => () => {},
    to: () => ({ kill: () => {} }),
    timeline: () => ({ to: () => {}, kill: () => {} }),
    ticker: { add: () => {}, remove: () => {} },
  };
}

describe("GASPER-FINISH-01 Task 7 & 8 — Renderer Equivalence & Production Authority", () => {
  let PRODUCTION_AUTHORITY_ID: string;
  let PRODUCTION_AUTHORITY_CLASS: string;
  let isProductionAuthority: (id: string) => boolean;
  let getProductionAuthorityInspection: () => any;
  let createLegacyAuthorityRenderer: () => any;
  let createNativeGasperRenderer: () => any;
  let computeEquivalenceMetrics: any;
  let evaluateEquivalenceGates: any;

  beforeAll(async () => {
    const prodAuth = await import("./productionAuthority");
    PRODUCTION_AUTHORITY_ID = prodAuth.PRODUCTION_AUTHORITY_ID;
    PRODUCTION_AUTHORITY_CLASS = prodAuth.PRODUCTION_AUTHORITY_CLASS;
    isProductionAuthority = prodAuth.isProductionAuthority;
    getProductionAuthorityInspection = prodAuth.getProductionAuthorityInspection;

    const legacy = await import("./LegacyAuthorityRenderer");
    createLegacyAuthorityRenderer = legacy.createLegacyAuthorityRenderer;

    const native = await import("./NativeGasperRenderer");
    createNativeGasperRenderer = native.createNativeGasperRenderer;

    const lab = await import("./RendererEquivalenceLab");
    computeEquivalenceMetrics = lab.computeEquivalenceMetrics;
    evaluateEquivalenceGates = lab.evaluateEquivalenceGates;
  });

  it("proves FormMaster v655 is the sole production authority and Native stays lab-only", () => {
    expect(PRODUCTION_AUTHORITY_ID).toBe("legacy-authority-formmaster-v655");
    expect(PRODUCTION_AUTHORITY_CLASS).toBe("legacy-authority");

    const inspection = getProductionAuthorityInspection();
    expect(inspection.authorityId).toBe("legacy-authority-formmaster-v655");
    expect(inspection.authorityClass).toBe("legacy-authority");
    expect(inspection.legacyAuthorityActive).toBe(true);
    expect(inspection.nativeCandidateIncomplete).toBe(true);
  });

  it("evaluates dual-renderer equivalence metrics and fails closed when native candidate lacks parity", () => {
    const legacyCapture = {
      rendererId: "legacy-authority-formmaster-v655",
      authorityClass: "legacy-authority",
      svgMarkupHash: "a1b2c3d4",
      pathStats: { total: 45, populated: 42, empty: 3, facePresent: true },
      layerManifest: { layers: [], totalCount: 12, populatedCount: 12 },
      inspection: { rendererId: "legacy", authorityClass: "legacy-authority", facePresent: true },
      frameTimeMs: 1.2,
      renderDurationMs: 2.5,
    };

    // Candidate lacking complete path population or face parity
    const unpromotableNativeCapture = {
      rendererId: "native-gasper-candidate",
      authorityClass: "native-candidate",
      svgMarkupHash: "e5f6g7h8",
      pathStats: { total: 20, populated: 15, empty: 5, facePresent: false },
      layerManifest: { layers: [], totalCount: 5, populatedCount: 5 },
      inspection: { rendererId: "native", authorityClass: "native-candidate", facePresent: false },
      frameTimeMs: 0.8,
      renderDurationMs: 1.5,
    };

    const metrics = computeEquivalenceMetrics(legacyCapture as any, unpromotableNativeCapture as any);
    expect(metrics.missingFace).toBe(true);
    expect(metrics.layerPopulationRatio).toBeLessThan(0.85);

    const gates = evaluateEquivalenceGates(metrics, legacyCapture as any, unpromotableNativeCapture as any);
    const nativeFaceGate = gates.find((g: any) => g.id === "native-face-present");
    const parityRatioGate = gates.find((g: any) => g.id === "layer-population-near-parity");

    expect(nativeFaceGate?.ok).toBe(false);
    expect(parityRatioGate?.ok).toBe(false);
  });

  it("verifies legacy authority renderer initializes with correct contract parameters", () => {
    const legacy = createLegacyAuthorityRenderer();
    expect(legacy.rendererId).toBe("legacy-authority-formmaster-v655");
    expect(legacy.authorityClass).toBe("legacy-authority");

    const native = createNativeGasperRenderer();
    expect(native.rendererId).toBe("native-gasper-candidate");
    expect(native.authorityClass).toBe("native-candidate");
  });
});
