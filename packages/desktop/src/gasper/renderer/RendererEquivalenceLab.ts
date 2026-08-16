/**
 * Deterministic dual-renderer equivalence lab (developer-only).
 * Renders the same canonical state through Legacy Authority + Native Candidate.
 * Not production UI — used for parity measurement and evidence capture.
 */

import {
  type GasperCanonicalState,
  type GasperRenderer,
  type DeterministicRendererClock,
  type RendererLayerManifest,
  type RendererInspection,
  measureSvgPathStats,
} from "./GasperRendererContract";
import { createLegacyAuthorityRenderer } from "./LegacyAuthorityRenderer";
import { createNativeGasperRenderer } from "./NativeGasperRenderer";

export type EquivalenceLabMode =
  | "side-by-side"
  | "overlay"
  | "wipe"
  | "flicker"
  | "difference-heatmap"
  | "isolated-layer"
  | "isolated-face"
  | "isolated-material"
  | "isolated-energy"
  | "isolated-embodiment";

export type EquivalenceCapture = {
  rendererId: string;
  authorityClass: string;
  screenshotDataUrl?: string;
  svgMarkupHash: string | null;
  pathStats: { total: number; populated: number; empty: number; facePresent: boolean };
  layerManifest: RendererLayerManifest;
  inspection: RendererInspection;
  frameTimeMs: number;
  renderDurationMs: number;
};

export type EquivalenceComparison = {
  clock: DeterministicRendererClock;
  state: GasperCanonicalState;
  mode: EquivalenceLabMode;
  legacy: EquivalenceCapture;
  native: EquivalenceCapture;
  metrics: EquivalenceMetrics;
  gates: EquivalenceGateResult[];
  verdict: "pass" | "fail" | "incomplete";
};

export type EquivalenceMetrics = {
  pathPopulationDelta: number;
  emptyPathDelta: number;
  facePresentLegacy: boolean;
  facePresentNative: boolean;
  missingFace: boolean;
  missingPathGeometry: boolean;
  layerPopulationRatio: number;
  silhouetteNote: string;
};

export type EquivalenceGateResult = {
  id: string;
  ok: boolean;
  detail: string;
};

export type EquivalenceLabOptions = {
  viewportWidth?: number;
  viewportHeight?: number;
  clock?: DeterministicRendererClock;
  livingSuspended?: boolean;
};

function simpleHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function makeHost(w: number, h: number): HTMLElement {
  const host = document.createElement("div");
  host.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h}px;overflow:hidden;`;
  host.setAttribute("data-equivalence-host", "1");
  document.body.appendChild(host);
  return host;
}

async function captureFrom(
  renderer: GasperRenderer,
  host: HTMLElement,
  state: GasperCanonicalState,
  clock: DeterministicRendererClock,
  livingSuspended: boolean,
): Promise<EquivalenceCapture> {
  const t0 = performance.now();
  await renderer.mount(host, { deterministic: true });
  renderer.setDeterministicClock(clock);
  if (livingSuspended) renderer.suspendLivingMotion();
  else renderer.resumeLivingMotion();
  renderer.applyCanonicalState(state, { clock, livingSuspended });
  // Allow one paint tick for procedural population
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  const t1 = performance.now();
  const svg = host.querySelector("svg");
  const markup = svg?.outerHTML ?? null;
  const pathStats = measureSvgPathStats(svg as SVGSVGElement | null);
  const layerManifest = renderer.captureLayerManifest();
  const inspection = renderer.inspect();
  const t2 = performance.now();
  return {
    rendererId: renderer.rendererId,
    authorityClass: renderer.authorityClass,
    svgMarkupHash: markup ? simpleHash(markup) : null,
    pathStats,
    layerManifest,
    inspection,
    frameTimeMs: t1 - t0,
    renderDurationMs: t2 - t0,
  };
}

export function computeEquivalenceMetrics(
  legacy: EquivalenceCapture,
  native: EquivalenceCapture,
): EquivalenceMetrics {
  const pathPopulationDelta =
    legacy.pathStats.populated - native.pathStats.populated;
  const emptyPathDelta = native.pathStats.empty - legacy.pathStats.empty;
  const facePresentLegacy = legacy.pathStats.facePresent || legacy.inspection.facePresent;
  const facePresentNative = native.pathStats.facePresent || native.inspection.facePresent;
  const ratio =
    legacy.pathStats.populated > 0
      ? native.pathStats.populated / legacy.pathStats.populated
      : 0;
  return {
    pathPopulationDelta,
    emptyPathDelta,
    facePresentLegacy,
    facePresentNative,
    missingFace: !facePresentLegacy || !facePresentNative,
    missingPathGeometry: native.pathStats.populated < 5,
    layerPopulationRatio: ratio,
    silhouetteNote:
      ratio < 0.5
        ? "native path population << legacy — incomplete extraction"
        : ratio < 0.9
          ? "native path population partial"
          : "path population near legacy",
  };
}

export function evaluateEquivalenceGates(
  metrics: EquivalenceMetrics,
  legacy: EquivalenceCapture,
  native: EquivalenceCapture,
): EquivalenceGateResult[] {
  return [
    {
      id: "legacy-face-present",
      ok: metrics.facePresentLegacy,
      detail: metrics.facePresentLegacy
        ? "Legacy Authority has face geometry"
        : "FAIL: Legacy missing face — authority mount broken",
    },
    {
      id: "legacy-populated-paths",
      ok: legacy.pathStats.populated >= 10,
      detail: `legacy populated paths=${legacy.pathStats.populated}`,
    },
    {
      id: "native-face-present",
      ok: metrics.facePresentNative,
      detail: metrics.facePresentNative
        ? "Native has face geometry"
        : "FAIL: Native missing face — no parity",
    },
    {
      id: "native-not-empty-shell",
      ok: !metrics.missingPathGeometry,
      detail: `native populated=${native.pathStats.populated}`,
    },
    {
      id: "layer-population-near-parity",
      ok: metrics.layerPopulationRatio >= 0.85,
      detail: metrics.silhouetteNote,
    },
    {
      id: "hashes-differ-or-equal-with-structure",
      ok: true,
      detail: `legacyHash=${legacy.svgMarkupHash} nativeHash=${native.svgMarkupHash}`,
    },
  ];
}

/**
 * Run one dual-backend comparison. Requires a real DOM (jsdom/happy-dom/browser).
 */
export async function runEquivalenceComparison(
  state: GasperCanonicalState,
  options: EquivalenceLabOptions = {},
): Promise<EquivalenceComparison> {
  const w = options.viewportWidth ?? 640;
  const h = options.viewportHeight ?? 640;
  const clock = options.clock ?? { timeMs: 0, seed: 1005 };
  const livingSuspended = options.livingSuspended !== false;
  const mode: EquivalenceLabMode = "side-by-side";

  const legacyRenderer = createLegacyAuthorityRenderer();
  const nativeRenderer = createNativeGasperRenderer();
  const legacyHost = makeHost(w, h);
  const nativeHost = makeHost(w, h);
  legacyHost.style.left = "0px";
  nativeHost.style.left = `${w + 16}px`;

  try {
    const legacy = await captureFrom(
      legacyRenderer,
      legacyHost,
      state,
      clock,
      livingSuspended,
    );
    const native = await captureFrom(
      nativeRenderer,
      nativeHost,
      state,
      clock,
      livingSuspended,
    );
    const metrics = computeEquivalenceMetrics(legacy, native);
    const gates = evaluateEquivalenceGates(metrics, legacy, native);
    // Production authority must pass face gates; full native parity is separate
    const legacyOk = gates
      .filter((g) => g.id.startsWith("legacy-"))
      .every((g) => g.ok);
    const nativeParity = gates
      .filter((g) => g.id.startsWith("native-") || g.id === "layer-population-near-parity")
      .every((g) => g.ok);
    const verdict: EquivalenceComparison["verdict"] = !legacyOk
      ? "fail"
      : nativeParity
        ? "pass"
        : "incomplete";
    return { clock, state, mode, legacy, native, metrics, gates, verdict };
  } finally {
    legacyRenderer.destroy();
    nativeRenderer.destroy();
    legacyHost.remove();
    nativeHost.remove();
  }
}

export function comparisonToReportJson(c: EquivalenceComparison): Record<string, unknown> {
  return {
    generatedAt: new Date().toISOString(),
    verdict: c.verdict,
    mode: c.mode,
    clock: c.clock,
    state: {
      embodimentId: c.state.embodimentId,
      expressionId: c.state.expressionId,
      revision: c.state.revision,
      poseKeys: Object.keys(c.state.pose || {}),
    },
    legacy: {
      rendererId: c.legacy.rendererId,
      pathStats: c.legacy.pathStats,
      svgMarkupHash: c.legacy.svgMarkupHash,
      faceBounds: c.legacy.layerManifest.faceBounds,
      bodyBounds: c.legacy.layerManifest.bodyBounds,
      filterCount: c.legacy.layerManifest.filterIds.length,
      gradientCount: c.legacy.layerManifest.gradientIds.length,
      renderDurationMs: c.legacy.renderDurationMs,
    },
    native: {
      rendererId: c.native.rendererId,
      pathStats: c.native.pathStats,
      svgMarkupHash: c.native.svgMarkupHash,
      faceBounds: c.native.layerManifest.faceBounds,
      bodyBounds: c.native.layerManifest.bodyBounds,
      renderDurationMs: c.native.renderDurationMs,
    },
    metrics: c.metrics,
    gates: c.gates,
  };
}
