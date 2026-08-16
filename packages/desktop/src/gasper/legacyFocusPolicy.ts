/**
 * GASPER-007 P0-HIDDEN-LEGACY-FOCUS — product focus hazard policy.
 * Pure helpers (no DOM). Used by neutralize path + structural/unit tests.
 */

export type FocusableProbe = {
  /** HTML tag lowercased */
  tag: string;
  tabIndex: number;
  disabled?: boolean;
  ariaHidden?: boolean | string | null;
  /** CSS visibility */
  visibility?: string;
  opacity?: string;
  display?: string;
  /** Layout box */
  width?: number;
  height?: number;
  /** data-product-automation */
  productAutomation?: string | null;
  /** data-gasper-legacy-only | data-legacy-compat */
  legacyCompat?: boolean;
  /** ancestor or self has inert */
  inert?: boolean;
};

/**
 * True when an element would be counted as a *product* hidden-focus hazard
 * (mirrors live bootstrap gate, with explicit legacy-compat exclusion).
 */
export function isProductHiddenFocusHazard(p: FocusableProbe): boolean {
  // Explicit product-automation exclude (legacy FormMaster stubs)
  if (p.productAutomation === "exclude") return false;
  if (p.legacyCompat) return false;
  if (p.inert) return false;
  if (p.disabled) return false;
  // Not in tab order
  if (typeof p.tabIndex === "number" && p.tabIndex < 0) return false;

  const aria =
    p.ariaHidden === true ||
    p.ariaHidden === "true" ||
    p.ariaHidden === "";
  const boxHidden =
    (typeof p.width === "number" && p.width <= 0) ||
    (typeof p.height === "number" && p.height <= 0);
  const styleHidden =
    p.display === "none" ||
    p.visibility === "hidden" ||
    p.opacity === "0" ||
    p.opacity === "0.0";
  const hidden = aria || boxHidden || styleHidden;
  if (!hidden) return false;

  // Focusable-ish when tabIndex >= 0 (default 0 for button/input/select/a)
  return p.tabIndex >= 0;
}

/** Count hazards in a probe list (pure). */
export function countProductHiddenFocusHazards(probes: FocusableProbe[]): number {
  return probes.filter(isProductHiddenFocusHazard).length;
}

/**
 * Required attributes after neutralizeLegacyCompatSubtree for a control.
 * Unit tests assert neutralize writes this contract.
 */
export const LEGACY_NEUTRALIZE_CONTRACT = {
  tabIndex: -1,
  ariaHidden: "true",
  productAutomation: "exclude",
  pointerEvents: "none",
  inertOnRoot: true,
} as const;

/** Probe representing a fully neutralized legacy control (must not be a hazard). */
export function probeNeutralizedLegacyControl(
  tag = "button",
): FocusableProbe {
  return {
    tag,
    tabIndex: LEGACY_NEUTRALIZE_CONTRACT.tabIndex,
    disabled: tag === "button",
    ariaHidden: LEGACY_NEUTRALIZE_CONTRACT.ariaHidden,
    visibility: "hidden",
    opacity: "0",
    width: 1,
    height: 1,
    productAutomation: LEGACY_NEUTRALIZE_CONTRACT.productAutomation,
    legacyCompat: true,
    inert: true,
  };
}

/**
 * CYCLE-7 FRAME BUDGET (frame-budget-phd-memo F2 — observer-convergence law).
 * Probe of one interactive control's neutralize-relevant state. Pure mirror of
 * what neutralizeLegacyCompatSubtree reads off a DOM element.
 */
export type NeutralizeStateProbe = {
  /** tag name lowercased */
  tag: string;
  /** input[type] when tag === "input" */
  inputType?: string;
  /** data-legacy-compat === "1" */
  legacyCompat: boolean;
  productAutomation: string | null;
  ariaHidden: string | null;
  tabIndex: number;
  pointerEvents: string;
  disabled: boolean;
  /** anchors only */
  hasHref: boolean;
};

/**
 * True when a legacy control already holds the FULL neutralized target state —
 * the idempotent guard of the neutralize path (F1/F2). Re-neutralizing such an
 * element writes nothing: every skipped write is a mutation record the rest of
 * the document never has to process (G1: identical-value setAttribute still
 * queues records). The disabled/href clauses mirror
 * neutralizeLegacyCompatSubtree exactly: ranges stay value-writable for
 * FormMaster, anchors lose href, form controls are disabled.
 */
export function controlAlreadyNeutralized(p: NeutralizeStateProbe): boolean {
  if (!p.legacyCompat) return false;
  if (p.productAutomation !== "exclude") return false;
  if (p.ariaHidden !== "true") return false;
  if (p.tabIndex !== -1) return false;
  if (p.pointerEvents !== "none") return false;
  switch (p.tag) {
    case "button":
    case "select":
    case "textarea":
      return p.disabled;
    case "input":
      return p.inputType === "range" || p.inputType === "hidden" || p.disabled;
    case "a":
      return !p.hasHref;
    default:
      return true;
  }
}

/**
 * Pre-neutralize off-canvas FormMaster control (the old P0 pattern).
 * Matches bootstrap gate: style-hidden (opacity/visibility) but still tabIndex >= 0.
 */
export function probeRawOffCanvasLegacyControl(tag = "input"): FocusableProbe {
  return {
    tag,
    tabIndex: 0,
    disabled: false,
    ariaHidden: false,
    visibility: "hidden",
    opacity: "0",
    width: 1,
    height: 1,
    productAutomation: null,
    legacyCompat: false,
    inert: false,
  };
}
