/**
 * State-isolated review mode contracts for packaged Dais owner review.
 * Pure, unit-testable — no Cody acceptance claim.
 *
 * Review mode hides irrelevant chrome so the full character is croppable at
 * high resolution with any labels outside the character area (EA2-V006).
 */

/** Eight hold states that must be immediately selectable for facial review. */
export const EIGHT_HOLD_STATE_IDS = [
  "presence-neutral-settled",
  "presence-listening-receive",
  "presence-thinking-knit",
  "presence-recognition-spark",
  "comet-executing-drive",
  "presence-blocked-strain",
  "presence-pleased-resolve",
  "dormant-orbit-maintain",
] as const;

export type EightHoldStateId = (typeof EIGHT_HOLD_STATE_IDS)[number];

/** Short owner-facing labels (fit outside character crop). */
export const EIGHT_HOLD_STATE_LABELS: Readonly<
  Record<EightHoldStateId, string>
> = {
  "presence-neutral-settled": "Neutral",
  "presence-listening-receive": "Listening",
  "presence-thinking-knit": "Thinking",
  "presence-recognition-spark": "Recognition",
  "comet-executing-drive": "Executing",
  "presence-blocked-strain": "Blocked",
  "presence-pleased-resolve": "Pleased",
  "dormant-orbit-maintain": "Dormant",
};

/** Core transition controls exposed with the eight-state set. */
export const CORE_TRANSITION_CONTROL_IDS = [
  "transition-wake",
  "transition-interrupt",
  "transition-reset",
  "play-pause",
  "frame-step-back",
  "frame-step-forward",
] as const;

export type CoreTransitionControlId =
  (typeof CORE_TRANSITION_CONTROL_IDS)[number];

/** Review-mode chrome isolation flags. */
export type ReviewModeChromeFlags = {
  reviewMode: boolean;
  hideShellNavigator: boolean;
  hideShellInspector: boolean;
  hideGraphPlaceholder: boolean;
  hideDiagnostics: boolean;
  hideControlRailTools: boolean;
  hideTransportChrome: boolean;
  hideSecondaryExpressionPanel: boolean;
  showStateLabelOutsideCharacter: boolean;
  characterCropPrimary: boolean;
  facialReviewScale: boolean;
};

/**
 * Build chrome flags for a presentation state.
 * When enabled, only character crop + external labels remain primary.
 */
export function reviewModeChromeFlags(
  enabled: boolean,
): ReviewModeChromeFlags {
  if (!enabled) {
    return {
      reviewMode: false,
      hideShellNavigator: false,
      hideShellInspector: true, // already collapsed in dais-first
      hideGraphPlaceholder: true,
      hideDiagnostics: false,
      hideControlRailTools: false,
      hideTransportChrome: false,
      hideSecondaryExpressionPanel: false,
      showStateLabelOutsideCharacter: false,
      characterCropPrimary: false,
      // Character mass always targets facial-review floor on packaged Dais.
      facialReviewScale: true,
    };
  }
  return {
    reviewMode: true,
    hideShellNavigator: true,
    hideShellInspector: true,
    hideGraphPlaceholder: true,
    hideDiagnostics: true,
    hideControlRailTools: true,
    hideTransportChrome: true,
    hideSecondaryExpressionPanel: true,
    showStateLabelOutsideCharacter: true,
    characterCropPrimary: true,
    facialReviewScale: true,
  };
}

/**
 * Extra shell chrome collapsed under review mode (CSS selectors / contract).
 * Complements ReviewModeChromeFlags for structural tests and presentation CSS.
 */
export const REVIEW_MODE_SHELL_COLLAPSE = {
  timelineDock: ".gwc-timeline-dock",
  stageChrome: ".gwc-stage-chrome",
  gasperHud: ".gasper-hud",
  statusBar: ".gwc-status",
  shellTimelineVar: "--gwc-timeline: 0px",
} as const;

/** Normalized rect in stage space (0–1). */
export type NormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ReviewCropLabelGeometry = {
  /** Region that should contain only the character for high-res crop. */
  characterCrop: NormalizedRect;
  /** Band reserved for labels — never overlaps characterCrop. */
  labelRegion: NormalizedRect;
  /** True when labelRegion and characterCrop do not intersect. */
  labelsOutsideCharacter: boolean;
  /** Target character mass as fraction of crop height (facial-review scale). */
  facialReviewHeightFraction: number;
};

export type StageSize = { width: number; height: number };

/**
 * Compute crop + label layout for review screenshots.
 * Labels sit in a top band outside the character crop (never over the face).
 */
export function computeReviewCropLabelGeometry(
  stage: StageSize,
  opts?: {
    /** Fraction of stage height reserved for the external label band (default 0.08). */
    labelBandFraction?: number;
    /** Character mass height target within crop (default 0.72 for facial review). */
    facialReviewHeightFraction?: number;
    /** Side margin as fraction of stage width (default 0.04). */
    sideMarginFraction?: number;
  },
): ReviewCropLabelGeometry {
  const labelBand = clamp01(opts?.labelBandFraction ?? 0.08);
  const facial = clamp01(opts?.facialReviewHeightFraction ?? 0.72);
  const side = clamp01(opts?.sideMarginFraction ?? 0.04);
  const w = Math.max(1, stage.width);
  const h = Math.max(1, stage.height);

  // Label band is the top strip of the stage (outside character).
  const labelRegion: NormalizedRect = {
    x: side,
    y: 0.01,
    width: Math.max(0, 1 - side * 2),
    height: labelBand,
  };

  // Character crop fills the remainder below the label band.
  const cropTop = labelBand + 0.02;
  const characterCrop: NormalizedRect = {
    x: side,
    y: cropTop,
    width: Math.max(0, 1 - side * 2),
    height: Math.max(0, 1 - cropTop - 0.02),
  };

  return {
    characterCrop,
    labelRegion,
    labelsOutsideCharacter: rectsDisjoint(labelRegion, characterCrop),
    facialReviewHeightFraction: facial,
  };
}

/**
 * Predicate: labels lie strictly outside the character crop region.
 */
export function labelsOutsideCharacterCrop(
  geometry: ReviewCropLabelGeometry,
): boolean {
  return (
    geometry.labelsOutsideCharacter &&
    rectsDisjoint(geometry.labelRegion, geometry.characterCrop)
  );
}

/**
 * Facial-review scale gate: character mass should dominate the crop.
 * Floor ≥ 0.62 of crop height; elevated target ~0.72 for owner review (R3-DAIS-FRAMING).
 */
export const FACIAL_REVIEW_MIN_HEIGHT_FRACTION = 0.62;
export const FACIAL_REVIEW_TARGET_HEIGHT_FRACTION = 0.72;

/**
 * Owner-review framing contract (R3-DAIS-FRAMING).
 * Framing is raised via fitCamera targetHeightFraction + layout densification —
 * not via clip-only CSS zoom that severs silhouette or breaks interaction.
 */
export const OWNER_REVIEW_FRAMING = {
  minHeightFraction: FACIAL_REVIEW_MIN_HEIGHT_FRACTION,
  targetHeightFraction: FACIAL_REVIEW_TARGET_HEIGHT_FRACTION,
  /** fitCameraFromSafeBounds clamps target into a sane authoring band (~0.7 max). */
  effectiveCameraCap: 0.7,
  clipOnlyZoomForbidden: true,
  fitCameraAuthoritative: true,
  completeSilhouetteRequired: true,
  hierarchyPrimary: "stage-canvas",
} as const;

export function facialReviewScaleMeetsFloor(
  characterHeightFraction: number,
  min: number = FACIAL_REVIEW_MIN_HEIGHT_FRACTION,
): boolean {
  return (
    Number.isFinite(characterHeightFraction) && characterHeightFraction >= min
  );
}

/**
 * Elevated target gate: character mass meets owner-review target (or camera cap).
 * Accepts either the declared 0.72 target or the effective camera-cap (~0.7)
 * so structural checks stay honest about fitCameraFromSafeBounds clamping.
 */
export function facialReviewScaleMeetsTarget(
  characterHeightFraction: number,
  target: number = FACIAL_REVIEW_TARGET_HEIGHT_FRACTION,
): boolean {
  if (!Number.isFinite(characterHeightFraction)) return false;
  const effectiveFloor = Math.min(
    target,
    OWNER_REVIEW_FRAMING.effectiveCameraCap,
  );
  return characterHeightFraction + 1e-9 >= effectiveFloor;
}

/**
 * Pure responsive-bounds check: representative stage sizes support elevated fit
 * without invalid camera geometry. Does not drive GSAP/native frames.
 */
export function characterFitValidForStageSize(
  stageW: number,
  stageH: number,
  targetFrac: number = FACIAL_REVIEW_TARGET_HEIGHT_FRACTION,
): { ok: boolean; reason?: string } {
  if (!Number.isFinite(stageW) || !Number.isFinite(stageH)) {
    return { ok: false, reason: "non-finite-stage" };
  }
  // Match fitCameraFromSafeBounds minimum usable stage.
  if (stageW < 80 || stageH < 80) {
    return { ok: false, reason: "stage-too-small" };
  }
  if (!Number.isFinite(targetFrac)) {
    return { ok: false, reason: "non-finite-target" };
  }
  if (targetFrac < FACIAL_REVIEW_MIN_HEIGHT_FRACTION) {
    return { ok: false, reason: "below-floor" };
  }
  // Occupy cap (~0.88) leaves silhouette room; overshoot implies clip risk.
  if (targetFrac > 0.88) {
    return { ok: false, reason: "exceeds-occupy-cap" };
  }
  return { ok: true };
}

/**
 * Structural: stage source prefers elevated facial fit target (≥ floor)
 * via fitCameraFromSafeBounds — not clip-only CSS zoom as the sole fix.
 */
export function characterFitRequestsElevatedTarget(stageSource: string): boolean {
  const hasFloor =
    /FACIAL_REVIEW_FIT_HEIGHT_FRACTION\s*=\s*0\.62/.test(stageSource);
  const hasTarget =
    /FACIAL_REVIEW_FIT_TARGET_HEIGHT_FRACTION\s*=\s*0\.72/.test(stageSource);
  const usesFit =
    stageSource.includes("fitCameraFromSafeBounds") &&
    stageSource.includes("targetHeightFraction");
  const usesTargetConst =
    stageSource.includes("FACIAL_REVIEW_FIT_TARGET_HEIGHT_FRACTION");
  return hasFloor && hasTarget && usesFit && usesTargetConst;
}

/**
 * Structural: framing must use fit height fraction / layout densify —
 * not only overflow:hidden + CSS scale as the sole facial-scale mechanism.
 * Both legs are required (AND, not soft OR):
 * 1. Fit path: fitCameraFromSafeBounds + targetHeightFraction + viewport.clipped=false
 * 2. Silhouette: content overflow:visible so crop is not severed by clip-only zoom
 */
export function noClipAsSoleFraming(sources: {
  stageSource: string;
  cssSources: readonly string[];
}): boolean {
  const stage = sources.stageSource;
  const usesFitPath =
    stage.includes("fitCameraFromSafeBounds") &&
    stage.includes("targetHeightFraction") &&
    /viewport\.clipped\s*=\s*false/.test(stage);
  if (!usesFitPath) return false;

  // Character content must keep overflow visible so silhouette is not severed.
  // Required in conjunction with fit path — fit alone does not pass this gate.
  const cssJoined = sources.cssSources.join("\n");
  const contentKeepsSilhouette =
    /overflow:\s*visible/.test(cssJoined) ||
    cssJoined.includes("overflow: visible");
  return usesFitPath && contentKeepsSilhouette;
}

/** Host data attributes for review mode. */
export const REVIEW_MODE_HOST = {
  attr: "data-review-mode",
  attrValue: "1",
  testId: "dais-review-mode-root",
  cropTestId: "dais-review-character-crop",
  labelTestId: "dais-review-state-label",
  toggleControlId: "review-mode-toggle",
  eightStateControlId: "eight-state-select",
  className: "dais-review-mode",
} as const;

/**
 * Structural: review mode presentation source declares required markers.
 */
export function sourceDeclaresReviewMode(source: string): boolean {
  return (
    source.includes(REVIEW_MODE_HOST.attr) &&
    (source.includes(REVIEW_MODE_HOST.testId) ||
      source.includes("reviewMode") ||
      source.includes("data-review-mode"))
  );
}

/**
 * Structural: eight hold states are all present in a control surface source.
 */
export function sourceExposesEightHoldStates(source: string): {
  ok: boolean;
  missing: string[];
} {
  const missing = EIGHT_HOLD_STATE_IDS.filter((id) => !source.includes(id));
  return { ok: missing.length === 0, missing: [...missing] };
}

/**
 * Core transition + eight-state primary set completeness for no-scroll surface.
 */
export function primaryReviewControlsComplete(
  presentIds: readonly string[],
): { ok: boolean; missing: string[] } {
  const required = [
    REVIEW_MODE_HOST.eightStateControlId,
    REVIEW_MODE_HOST.toggleControlId,
    ...CORE_TRANSITION_CONTROL_IDS,
  ];
  const set = new Set(presentIds);
  const missing = required.filter((id) => !set.has(id));
  return { ok: missing.length === 0, missing: [...missing] };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function rectsDisjoint(a: NormalizedRect, b: NormalizedRect): boolean {
  const aRight = a.x + a.width;
  const aBottom = a.y + a.height;
  const bRight = b.x + b.width;
  const bBottom = b.y + b.height;
  return a.x >= bRight || b.x >= aRight || a.y >= bBottom || b.y >= aBottom;
}

/**
 * Toggle helper — pure next state.
 */
export function toggleReviewMode(current: boolean): boolean {
  return !current;
}

/**
 * Map hold state id → short label for external review chrome.
 */
export function labelForHoldState(stateId: string): string {
  if ((EIGHT_HOLD_STATE_IDS as readonly string[]).includes(stateId)) {
    return EIGHT_HOLD_STATE_LABELS[stateId as EightHoldStateId];
  }
  return stateId;
}
