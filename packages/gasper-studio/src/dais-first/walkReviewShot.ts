/**
 * Walk-review shot law (N336 / walk-plant-off-frame).
 *
 * Operate / Fit stay face-first. Walk review is a dedicated authored hold —
 * the isolated-proof cinematic frame — not shotBias (retired D-0107) and
 * not a moving camera during the stroll (Doctrine 1).
 *
 * Measured 2026-08-16 on a 1120×758 dais: zoom 2 + panY -40 keeps #body
 * and #ground above the stage fold with 243 px of plant margin.
 */
import {
  CINEMATIC_PAN_Y,
  CINEMATIC_ZOOM,
} from "../../../desktop/src/gasper/GasperViewportController";

export const WALK_REVIEW_SHOT = "walk-review" as const;
export const OPERATE_SHOT = "operate" as const;

export type StudioShotId = typeof WALK_REVIEW_SHOT | typeof OPERATE_SHOT;

export const WALK_REVIEW_FRAME = Object.freeze({
  zoom: CINEMATIC_ZOOM,
  panX: 0,
  panY: CINEMATIC_PAN_Y,
});

export type WalkReviewFrame = typeof WALK_REVIEW_FRAME;

/** Minimum dais height (px) the plant-margin gate is scored against. */
export const WALK_REVIEW_MIN_STAGE_HEIGHT = 700;

/** Plant must sit this many pixels above the stage fold. */
export const WALK_REVIEW_MIN_PLANT_MARGIN_PX = 80;

export type StageRect = Readonly<{ top: number; bottom: number; height: number }>;
export type BodyRect = Readonly<{ bottom: number }>;

export function isWalkReviewFrame(state: {
  zoom?: number;
  panX?: number;
  panY?: number;
  autoFit?: boolean;
  userWorldFrameHeld?: boolean;
}): boolean {
  return (
    Math.abs(Number(state.zoom) - WALK_REVIEW_FRAME.zoom) < 1e-6 &&
    Math.abs(Number(state.panX) - WALK_REVIEW_FRAME.panX) < 1e-6 &&
    Math.abs(Number(state.panY) - WALK_REVIEW_FRAME.panY) < 1e-6 &&
    state.autoFit === false &&
    state.userWorldFrameHeld === true
  );
}

/**
 * True when the body/ground contour is still on-stage with usable plant
 * margin. Does not claim a visual gait PASS — only that the plant is reviewable.
 */
export function walkReviewHoldsPlant(
  stage: StageRect,
  body: BodyRect,
  ground?: BodyRect,
): boolean {
  if (!(stage.height >= WALK_REVIEW_MIN_STAGE_HEIGHT)) return false;
  const lowest = Math.max(body.bottom, ground?.bottom ?? body.bottom);
  return stage.bottom - lowest >= WALK_REVIEW_MIN_PLANT_MARGIN_PX;
}

export function walkReviewModePolicy() {
  return {
    autoSequence: true,
    restrainedIdle: false,
    freezeSequence: true,
  };
}

export function operateRestModePolicy() {
  return {
    autoSequence: false,
    restrainedIdle: false,
    freezeSequence: true,
  };
}
