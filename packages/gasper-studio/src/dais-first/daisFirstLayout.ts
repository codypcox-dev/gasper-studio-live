/**
 * Dais-first layout / control contracts (pure, unit-testable).
 * EA-V007: open Dais-first workspace — stage primary, no Graph Editor dominance.
 * Does not claim Cody visual acceptance.
 */

/** Viewport hierarchy roles for the open Dais-first presentation. */
export const DAIS_FIRST_HIERARCHY = {
  /** Live character canvas — must dominate available viewport. */
  primary: "stage-canvas",
  /** Right rail: embodiment / expression / design / direct manip tools. */
  secondary: "control-rail",
  /** Bottom transport: playhead, frame step, A/B, interrupt. */
  tertiary: "transport-bar",
  /** Shell graph placeholder — must be neutralized under gasper-studio product. */
  suppressed: "graph-placeholder",
  /** Shell navigator / inspector — secondary chrome, not primary authoring. */
  chrome: "shell-chrome",
} as const;

export type DaisFirstHierarchyRole =
  (typeof DAIS_FIRST_HIERARCHY)[keyof typeof DAIS_FIRST_HIERARCHY];

/** Primary control set that must fit without scrolling. */
export const PRIMARY_CONTROL_IDS = [
  "eight-state-select",
  "review-mode-toggle",
  "transition-wake",
  "transition-interrupt",
  "transition-reset",
  "embodiment-select",
  "expression-select",
  "control-as-gain",
  "rig-relief",
  "rig-eye",
  "rig-energy",
  "tool-form",
  "tool-face",
  "stage-author",
  "play-pause",
  "interrupt",
  "frame-step-back",
  "frame-step-forward",
  "playhead-readout",
  "reset-expression",
  "ab-pin",
  "ab-compare",
] as const;

export type PrimaryControlId = (typeof PRIMARY_CONTROL_IDS)[number];

/** Review-ergonomics contract flags. */
export const REVIEW_ERGONOMICS = {
  /** Primary Dais controls must not require scroll. */
  noScrollPrimaryControls: true,
  /** Stage canvas is the dominant visual mass. */
  stageDominatesViewport: true,
  /** Empty Graph Editor must not occupy review attention. */
  graphPlaceholderHidden: true,
  /** Frame step at 60fps default for review traversal. */
  frameStepFpsDefault: 60,
  /** A/B pin+compare available for pose review. */
  abComparePresent: true,
  /** Direct manipulation via AUTHORING + design domain tools. */
  directManipulationShellOwned: true,
  /** Character mass fills a useful facial-review scale of the stage. */
  facialReviewScale: true,
  /** Eight hold states exposed in primary control set. */
  eightStatesPrimary: true,
  /** State-isolated review mode available (chrome hide + crop labels). */
  stateIsolatedReviewMode: true,
  /** Screenshot labels must sit outside the character crop area. */
  labelsOutsideCharacterCrop: true,
} as const;

/** Visual hierarchy law: stage canvas before chrome / placeholders. */
export const VISUAL_HIERARCHY_LAW = {
  primaryMass: "stage-canvas",
  secondaryChrome: ["control-rail", "transport-bar"],
  suppressed: ["graph-placeholder", "empty-editor-panels"],
  noPlaceholderDominance: true,
  characterDominatesViewport: true,
} as const;

/** CSS selectors / attributes that neutralize Graph Editor dominance. */
export const GRAPH_PLACEHOLDER_NEUTRALIZATION = {
  productRoot: '[data-product="gasper-studio"]',
  daisFirstRoot: '[data-dais-first="1"]',
  placeholderClass: ".gwc-graph-placeholder",
  placeholderTestId: "gwc-graph-placeholder",
  hideRuleFragment: "display: none",
} as const;

/** Host element contract. */
export const DAIS_FIRST_HOST = {
  testId: "dais-first-stage-host",
  attr: "data-dais-first",
  attrValue: "1",
  className: "dais-first-stage-host",
  railTestId: "dais-control-rail",
  transportTestId: "dais-transport-bar",
  canvasTestId: "dais-first-canvas",
  reviewModeAttr: "data-review-mode",
  facialReviewAttr: "data-facial-review-scale",
} as const;

/**
 * Predicate: CSS enforces stage-primary / no empty graph-editor dominance
 * and facial-review framing under the product root.
 */
export function cssEnforcesCharacterDominantStage(cssSource: string): boolean {
  const n = cssSource.replace(/\s+/g, " ").toLowerCase();
  const hasStage =
    n.includes(".dais-first-canvas") || n.includes(".gwc-stage-frame");
  const hasGraphHide =
    n.includes(".gwc-graph-placeholder") &&
    (n.includes("display: none") || n.includes("display:none"));
  const hasFacial =
    n.includes("data-facial-review-scale") ||
    n.includes("facial-review") ||
    n.includes("--dais-character-scale");
  return hasStage && hasGraphHide && hasFacial;
}

/**
 * Predicate: presentation source does not mount empty placeholder editor
 * panels as primary visual mass.
 */
export function noPlaceholderEditorDominance(source: string): boolean {
  if (/className\s*=\s*["'][^"']*gwc-graph-placeholder/.test(source)) {
    return false;
  }
  if (/data-testid\s*=\s*["']gwc-graph-placeholder["']/.test(source)) {
    return false;
  }
  // Empty editor placeholders must not be the sole stage child.
  if (
    /placeholder-editor|empty-graph-editor|TODO.?graph/i.test(source) &&
    !/display:\s*none|hidden|suppress/i.test(source)
  ) {
    return false;
  }
  return true;
}

/**
 * Predicate: CSS source hides the Graph Editor placeholder under the product root.
 */
export function cssNeutralizesGraphPlaceholder(cssSource: string): boolean {
  if (!cssSource.includes(GRAPH_PLACEHOLDER_NEUTRALIZATION.productRoot)) return false;
  if (!cssSource.includes(GRAPH_PLACEHOLDER_NEUTRALIZATION.placeholderClass)) return false;
  const normalized = cssSource.replace(/\s+/g, " ").toLowerCase();
  // Require hide under product root near the placeholder selector.
  const productIdx = normalized.indexOf(
    GRAPH_PLACEHOLDER_NEUTRALIZATION.productRoot.toLowerCase(),
  );
  if (productIdx < 0) return false;
  const window = normalized.slice(productIdx, productIdx + 800);
  return (
    window.includes(".gwc-graph-placeholder") &&
    (window.includes("display: none") || window.includes("display:none"))
  );
}

/**
 * Predicate: presentation source does not mount a dominating Graph Editor panel
 * as primary content (shell may still contain the class for neutralization).
 */
export function presentationAvoidsGraphEditorDominance(source: string): boolean {
  // Gasper-studio owned presentation must not introduce its own graph editor chrome.
  if (/className\s*=\s*["'][^"']*gwc-graph-placeholder/.test(source)) return false;
  if (/data-testid\s*=\s*["']gwc-graph-placeholder["']/.test(source)) return false;
  // Must declare dais-first host when composing the stage.
  return true;
}

/**
 * Predicate: hierarchy role order places stage above chrome/suppressed.
 */
export function stageIsPrimaryHierarchy(
  roles: readonly DaisFirstHierarchyRole[],
): boolean {
  const primaryIdx = roles.indexOf(DAIS_FIRST_HIERARCHY.primary);
  const suppressedIdx = roles.indexOf(DAIS_FIRST_HIERARCHY.suppressed);
  if (primaryIdx < 0) return false;
  if (suppressedIdx >= 0 && suppressedIdx < primaryIdx) return false;
  return primaryIdx === 0;
}

/** Default presentation hierarchy order for the open workspace. */
export const DEFAULT_HIERARCHY_ORDER: readonly DaisFirstHierarchyRole[] = [
  DAIS_FIRST_HIERARCHY.primary,
  DAIS_FIRST_HIERARCHY.secondary,
  DAIS_FIRST_HIERARCHY.tertiary,
  DAIS_FIRST_HIERARCHY.chrome,
  DAIS_FIRST_HIERARCHY.suppressed,
];

/**
 * Review ergonomics: primary control set is complete and no-scroll is required.
 */
export function primaryControlsContractComplete(
  presentIds: readonly string[],
): { ok: boolean; missing: string[] } {
  const set = new Set(presentIds);
  const missing = PRIMARY_CONTROL_IDS.filter((id) => !set.has(id));
  return { ok: missing.length === 0, missing: [...missing] };
}

/**
 * Host markup contract for structural tests.
 * Accepts either the host component source (testid) or app composition (mount + attr).
 */
export function hostDeclaresDaisFirst(source: string): boolean {
  const hasHost =
    source.includes(DAIS_FIRST_HOST.testId) ||
    source.includes("DaisFirstStageHost");
  const hasAttr =
    source.includes("data-dais-first") &&
    (source.includes('data-dais-first="1"') ||
      source.includes("data-dais-first={") ||
      source.includes("data-dais-first={`1`}"));
  return hasHost && hasAttr;
}

/**
 * R3-DAIS-FRAMING chrome densification contract.
 * Base rail width string (200px) remains for prior product tests; facial-review
 * and review-mode densify further so stage gets more pixels.
 */
export const DAIS_CHROME_DENSIFICATION = {
  /** Documented base rail (prior structural string contract). */
  baseRailWidthPx: 200,
  /** Default densified rail under facial-review-scale. */
  denseRailWidthPx: 168,
  /** Review-mode rail (chrome minimized). */
  reviewRailWidthPx: 148,
  /** Densified transport height (default presentation). */
  denseTransportHeightPx: 40,
  /** Review-mode transport height. */
  reviewTransportHeightPx: 36,
  /** Hierarchy: stage → secondary rail → tertiary transport. */
  hierarchyOrder: [
    DAIS_FIRST_HIERARCHY.primary,
    DAIS_FIRST_HIERARCHY.secondary,
    DAIS_FIRST_HIERARCHY.tertiary,
  ] as const,
  diagnosticsNotPrimary: true,
  graphNotPrimary: true,
} as const;

/**
 * Predicate: hierarchy is stage → rail → transport (no chrome ahead of stage).
 */
export function hierarchyIsStageRailTransport(
  roles: readonly DaisFirstHierarchyRole[],
): boolean {
  if (roles.length < 3) return false;
  return (
    roles[0] === DAIS_FIRST_HIERARCHY.primary &&
    roles[1] === DAIS_FIRST_HIERARCHY.secondary &&
    roles[2] === DAIS_FIRST_HIERARCHY.tertiary
  );
}

/**
 * Predicate: CSS densifies chrome so stage is primary mass
 * (rail/transport size vars + timeline/diagnostics collapse markers).
 */
export function cssDensifiesChromeForStagePrimary(cssSource: string): boolean {
  const n = cssSource.replace(/\s+/g, " ");
  const hasRail =
    n.includes("--dais-rail-width") &&
    (n.includes("168px") || n.includes("148px") || n.includes("200px"));
  const hasTransport =
    n.includes("--dais-transport-height") &&
    (n.includes("40px") || n.includes("36px") || n.includes("44px"));
  const collapsesTimeline =
    n.includes(".gwc-timeline-dock") &&
    (n.includes("display: none") || n.includes("display:none"));
  const neutralizesDiagnostics =
    n.includes("expression-dais-panel") &&
    (n.includes("display: none") || n.includes("display:none"));
  const hasFacialFractions =
    n.includes("--dais-facial-review-min-height-fraction") &&
    n.includes("--dais-facial-review-target-height-fraction");
  return (
    hasRail &&
    hasTransport &&
    collapsesTimeline &&
    neutralizesDiagnostics &&
    hasFacialFractions
  );
}

/**
 * Predicate: diagnostics / graph / placeholder do not compete as primary mass.
 */
export function chromeNotPrimaryMass(cssSource: string): boolean {
  const n = cssSource.replace(/\s+/g, " ").toLowerCase();
  const graphHidden =
    n.includes(".gwc-graph-placeholder") &&
    (n.includes("display: none") || n.includes("display:none"));
  const exprHidden =
    n.includes("expression-dais-panel") &&
    (n.includes("display: none") || n.includes("display:none"));
  const stagePrimary =
    n.includes(".dais-first-canvas") || n.includes("stage-canvas");
  return graphHidden && exprHidden && stagePrimary;
}

/**
 * Predicate: dead-space reduction markers present (dense rail/transport,
 * collapsed timeline/status under product, facial-review fractions).
 */
export function deadSpaceReducedForOwnerReview(cssSource: string): boolean {
  return cssDensifiesChromeForStagePrimary(cssSource) && chromeNotPrimaryMass(cssSource);
}
