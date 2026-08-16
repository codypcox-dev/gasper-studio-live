/**
 * GASPER-COMPOSITION-001 · Wave 1.3B — renderable world-space envelope.
 *
 * WorldSpace describes the conceptual desktop room for a POINT. Gasper is not
 * a point. This law subtracts the current embodiment's safe-fit envelope from
 * the fixed product monitor before a world pose is admitted.
 *
 * It never moves the camera and never changes conceptual WorldSpace constants.
 *
 * GASPER-NORTHSTAR-001 (post-N44): the FAR plane is now a PRESENCE fence, not a
 * bare readability floor. The organism may recede to φ⁻¹ (≈ 0.618) of its
 * calibrated home presence at the far plane — the φ-symmetric counterpart of
 * the owner's near-glass cap (1.2). The N44 takes let a lawful walker travel to
 * dScale 0.45 (z ≈ 2356) so the singularity rest could hold far from home and
 * then walk back — a 2.2× apparent-scale collapse/rebuild inside the fixed
 * monitor. The presence floor keeps 2.5D depth travel while guaranteeing the
 * composed organism never reads below 61.8 % of the presence it was calibrated
 * for, without moving the camera and without per-state scale constants.
 */
import type { Rect } from './GasperVisualBounds';
import {
  WORLD_SPACE_CONSTANTS,
  type WorldPose,
} from './space/WorldSpace';
import { PHI, PHI_LAW } from './physics/PhiLaw';

const CONTENT_ORIGIN_X = 120; // viewBox 0..240
const CONTENT_ORIGIN_Y = 110; // viewBox 0..220
const WORLD_SCALE_PIVOT_X = 120;
const WORLD_SCALE_PIVOT_Y = 190; // production floor anchor in all-script-3.js

export type CompositionWorldEnvelope = Readonly<{
  stageWidth: number;
  stageHeight: number;
  cameraZoom: number;
  cameraPanX: number;
  cameraPanY: number;
  safeFit: Readonly<Rect>;
  geometry: Readonly<Rect>;
  safeMarginFraction: number;
  minReadableHeightFraction: number;
  /**
   * GASPER-NORTHSTAR-001 — the far-presence floor: the organism may never
   * recede below this fraction of its calibrated HOME presence (dScale at the
   * far plane ≥ minPresenceFraction). Default φ⁻¹ ≈ 0.618.
   */
  minPresenceFraction: number;
}>;

export type RenderableWorldBounds = Readonly<{
  zMin: number;
  zMax: number;
  z: number;
  depthScale: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}>;

export type CompositionClampResult = Readonly<{
  requestedPose: WorldPose;
  pose: WorldPose;
  constrained: boolean;
  axes: readonly ('x' | 'y' | 'z')[];
  bounds: RenderableWorldBounds;
}>;

export const DEFAULT_COMPOSITION_SAFE_MARGIN_FRACTION = 0.02;
export const DEFAULT_MIN_READABLE_HEIGHT_FRACTION = 0.14;
/**
 * GASPER-NORTHSTAR-001 — the far-presence floor. The organism may recede to
 * 1/φ (≈ 0.618) of its calibrated home presence at the far plane — the
 * φ-symmetric counterpart of the owner's near-glass cap (1.2). This replaces
 * the bare 0.14 readability far plane as the BINDING depth fence: the N44
 * takes let a lawful walker travel to dScale 0.45 (z ≈ 2356) so the singularity
 * rest could hold far from home — a 2.2× apparent-scale collapse/rebuild in
 * the fixed monitor. The presence floor keeps 2.5D depth travel while
 * guaranteeing the composed organism never reads below 61.8 % presence.
 */
export const DEFAULT_MIN_PRESENCE_FRACTION = 1 / PHI;

function finitePositive(v: number): boolean {
  return Number.isFinite(v) && v > 0;
}

function finiteRect(r: Rect): boolean {
  return (
    Number.isFinite(r.x) &&
    Number.isFinite(r.y) &&
    finitePositive(r.width) &&
    finitePositive(r.height)
  );
}

export function createCompositionWorldEnvelope(input: {
  stageWidth: number;
  stageHeight: number;
  cameraZoom: number;
  cameraPanX: number;
  cameraPanY: number;
  safeFit: Rect;
  geometry: Rect;
  safeMarginFraction?: number;
  minReadableHeightFraction?: number;
  minPresenceFraction?: number;
}): CompositionWorldEnvelope | null {
  const safeMarginFraction = Number.isFinite(input.safeMarginFraction)
    ? Math.min(0.2, Math.max(0, Number(input.safeMarginFraction)))
    : DEFAULT_COMPOSITION_SAFE_MARGIN_FRACTION;
  const minReadableHeightFraction = Number.isFinite(input.minReadableHeightFraction)
    ? Math.min(0.5, Math.max(0.02, Number(input.minReadableHeightFraction)))
    : DEFAULT_MIN_READABLE_HEIGHT_FRACTION;
  // GASPER-NORTHSTAR-001 — far-presence floor, fenced to a sane band. Values
  // ≥ 1 would forbid any recession (far plane = home); the band keeps the
  // φ-default and permits deliberate per-surface tuning without a degenerate room.
  const minPresenceFraction = Number.isFinite(input.minPresenceFraction)
    ? Math.min(0.95, Math.max(0.25, Number(input.minPresenceFraction)))
    : DEFAULT_MIN_PRESENCE_FRACTION;

  if (
    !finitePositive(input.stageWidth) ||
    !finitePositive(input.stageHeight) ||
    !finitePositive(input.cameraZoom) ||
    !Number.isFinite(input.cameraPanX) ||
    !Number.isFinite(input.cameraPanY) ||
    !finiteRect(input.safeFit) ||
    !finiteRect(input.geometry)
  ) {
    return null;
  }

  return Object.freeze({
    stageWidth: input.stageWidth,
    stageHeight: input.stageHeight,
    cameraZoom: input.cameraZoom,
    cameraPanX: input.cameraPanX,
    cameraPanY: input.cameraPanY,
    safeFit: Object.freeze({ ...input.safeFit }),
    geometry: Object.freeze({ ...input.geometry }),
    safeMarginFraction,
    minReadableHeightFraction,
    minPresenceFraction,
  });
}

function depthScaleAt(z: number): number {
  const d = WORLD_SPACE_CONSTANTS.homeViewDistance;
  return d / (d + z);
}

/**
 * Far plane. Near plane remains the owner's +20% law (zNear = −320 ⇒ dScale
 * ≤ 1.2). GASPER-NORTHSTAR-001: the far plane is the PRESENCE fence — the
 * binding floor is the φ⁻¹ presence band, with the readability floor retained
 * as a witness for degenerate calibration (a stage/form that cannot even meet
 * 0.14 height fraction at the near plane still fails closed to home).
 */
export function renderableZMax(env: CompositionWorldEnvelope): number {
  const c = WORLD_SPACE_CONSTANTS;
  const requiredScale =
    (env.minReadableHeightFraction * env.stageHeight) /
    (env.geometry.height * env.cameraZoom);
  let readabilityZMax: number;
  if (!Number.isFinite(requiredScale) || requiredScale <= 0) {
    readabilityZMax = c.zFar;
  } else {
    // If the current camera/form cannot meet readability even at the near plane,
    // fail closed to the home plane rather than manufacture an impossible room.
    const maxNearScale = c.homeViewDistance / (c.homeViewDistance + c.zNear);
    if (requiredScale >= maxNearScale) {
      readabilityZMax = 0;
    } else {
      const zForReadability = c.homeViewDistance * (1 / requiredScale - 1);
      readabilityZMax = Math.min(c.zFar, Math.max(0, zForReadability));
    }
  }

  // The far-presence floor: z where depthScaleAt(z) = minPresenceFraction
  //  ⇒  z = homeViewDistance·(1/p − 1). Clamped to [0, zFar] (fail-closed to
  // home if p ≥ 1 would invert the room). The presence floor is always nearer
  // than readability for real calibrations, so it binds; the min keeps a
  // degenerate readability fail-closed (0) authoritative.
  const presenceZMax = Math.min(
    c.zFar,
    Math.max(0, c.homeViewDistance * (1 / env.minPresenceFraction - 1)),
  );
  return Math.min(readabilityZMax, presenceZMax);
}

/**
 * Final-frame bounds for Gasper's WORLD ORIGIN at a requested depth.
 *
 * X is solved from the safeFit left/right edges after depth scale and camera.
 * Y uses the production floor-anchor depth transform + horizon lift + altitude.
 */
export function renderableWorldBoundsAt(
  rawZ: number,
  env: CompositionWorldEnvelope,
): RenderableWorldBounds {
  const c = WORLD_SPACE_CONSTANTS;
  const zMin = c.zNear;
  const zMax = renderableZMax(env);
  const z = Math.min(zMax, Math.max(zMin, Number.isFinite(rawZ) ? rawZ : 0));
  const s = depthScaleAt(z);
  const zoom = env.cameraZoom;
  const u = c.unitsPerContentPx;

  const leftScreen = env.stageWidth * env.safeMarginFraction;
  const rightScreen = env.stageWidth * (1 - env.safeMarginFraction);
  const stageCenterX = env.stageWidth / 2 + env.cameraPanX;

  const xMinByFrame =
    u *
    ((leftScreen - stageCenterX) / (s * zoom) -
      (env.safeFit.x - WORLD_SCALE_PIVOT_X));
  const xMaxByFrame =
    u *
    ((rightScreen - stageCenterX) / (s * zoom) -
      (env.safeFit.x + env.safeFit.width - WORLD_SCALE_PIVOT_X));

  const conceptualXHalf = c.extentWidth / 2 / s;
  const xMin = Math.max(-conceptualXHalf, xMinByFrame);
  const xMax = Math.min(conceptualXHalf, xMaxByFrame);

  const horizon = c.floorToHorizonPx * (1 - s);
  const stageCenterY = env.stageHeight / 2 + env.cameraPanY;
  const topScreen = env.stageHeight * env.safeMarginFraction;
  const bottomScreen = env.stageHeight * (1 - env.safeMarginFraction);

  const baseTopContent =
    WORLD_SCALE_PIVOT_Y +
    s * (env.safeFit.y - WORLD_SCALE_PIVOT_Y) -
    horizon;
  const baseBottomContent =
    WORLD_SCALE_PIVOT_Y +
    s *
      (env.safeFit.y + env.safeFit.height - WORLD_SCALE_PIVOT_Y) -
    horizon;

  // ScreenY = stageCenterY + (contentY - CONTENT_ORIGIN_Y) * zoom.
  // World altitude translates the child by -(y/u) before the world depth scale,
  // therefore the screen displacement is -(y/u) * s * zoom.
  const yMaxByTop =
    (u / s) *
    (baseTopContent -
      CONTENT_ORIGIN_Y -
      (topScreen - stageCenterY) / zoom);
  const yMinByBottom =
    (u / s) *
    (baseBottomContent -
      CONTENT_ORIGIN_Y -
      (bottomScreen - stageCenterY) / zoom);

  const conceptualYMax = c.extentHeight / s;
  // The static safe-fit edge describes where the resting silhouette may sit;
  // it is not enough room for a living body to perform its canonical medium
  // hop. Reserve one φ⁻² body-height apex in the SAME production frame so the
  // physics kernel never gets forced into a 2 px ceiling while the camera
  // remains fixed. Geometry is measured in content px, then mapped into world
  // units and depth-projected exactly once (D-0099 / D-0112).
  const physicsApexHeadroom =
    (env.geometry.height * u * PHI_LAW.apexLadder[1]) / s;
  const yMin = Math.max(0, yMinByBottom);
  const yMax = Math.min(
    conceptualYMax,
    Math.max(yMin, yMaxByTop + physicsApexHeadroom),
  );

  return Object.freeze({
    zMin,
    zMax,
    z,
    depthScale: s,
    xMin: Math.min(xMin, xMax),
    xMax: Math.max(xMin, xMax),
    yMin,
    yMax,
  });
}

export function clampWorldPoseToCompositionEnvelope(
  pose: WorldPose,
  env: CompositionWorldEnvelope,
): CompositionClampResult {
  const zMax = renderableZMax(env);
  const z = Math.min(zMax, Math.max(WORLD_SPACE_CONSTANTS.zNear, pose.z));
  const bounds = renderableWorldBoundsAt(z, env);
  const x = Math.min(bounds.xMax, Math.max(bounds.xMin, pose.x));
  const y = Math.min(bounds.yMax, Math.max(bounds.yMin, pose.y));
  const axes: ('x' | 'y' | 'z')[] = [];
  if (x !== pose.x) axes.push('x');
  if (y !== pose.y) axes.push('y');
  if (z !== pose.z) axes.push('z');
  return Object.freeze({
    requestedPose: Object.freeze({ ...pose }),
    pose: Object.freeze({ x, y, z, tilt: pose.tilt }),
    constrained: axes.length > 0,
    axes: Object.freeze(axes),
    bounds,
  });
}
