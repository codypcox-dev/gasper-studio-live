/**
 * GASPER-SPACE-001 · PHASE A — 2.5D world stage coordinates (pure module).
 * GASPER-CRAFT-002 · S2 (D-0099 Monitor Doctrine) — the DEPTH LAW.
 *
 * The owner's "next branch": Gasper expands outward into a desktop-sized
 * virtual space. This module is the coordinate authority for that space —
 * pure functions only (no clock, DOM, timer, or random source), so every
 * consumer (renderer intake, physics authority, sequencer, capture drives)
 * agrees on one deterministic mapping.
 *
 * Doctrine 1 — the camera IS the monitor. The viewport never moves; all
 * shot scale comes from Gasper moving through depth. So depth is a real
 * pinhole projection, not a lane blend:
 *
 *   scale(z) = D0 / (D0 + z)
 *
 * D0 = homeViewDistance (camera → home plane, world units), z = signed
 * distance from the home plane (+ = away from the viewer toward the far
 * bound, − = toward the monitor glass). Near bound = the glass itself
 * (zNear, body reads at the owner-capped max size 1.2× home — N35, the
 * 2026-08-06 owner law: "let him move forward, but only so much as to
 * allow a 20% increase in size"); far bound = unreadably small (zFar,
 * 0.35× home). The SAME projection drives the
 * floor plane: a floor point's screen offset from the horizon scales by
 * scale(z), so the horizon lift of the floor anchor is exactly
 * floorToHorizonPx · (1 − scale(z)) — feet stay planted on the receding
 * ground at every depth (near = low + big, far = high + small).
 *
 * Doctrine 2 — bounds are real and known. `worldBoundsAt(z)` exposes the
 * frustum at a depth: the visible half-width GROWS with depth
 * (xHalf(z) = xHalfHome / scale(z)), the ceiling rises the same way, and
 * z is fenced to [zNear, zFar]. Consumed by the pack compiler gate (every
 * authored point inside bounds at its own depth), by autonomous behavior
 * (awareness Layer 2 — never leave the space unknowingly), and by the
 * physics walls (Layer 1).
 *
 * World frame:
 * - x: lateral, world units. 0 = Gasper's authored home; + = stage right.
 *   Bounded to the frustum half-width at the pose's own depth.
 * - y: altitude above the floor plane, world units (>= 0). The floor is the
 *   authored ground line; the renderer keeps the shadow pinned to it.
 * - z: distance from the home plane, world units. zNear (−320, the monitor
 *   glass — N35 owner cap: 1920/(1920−320) = 1.2× home max) … zFar (+3566,
 *   the far fade). 0 = home.
 * - tilt: whole-body roll in degrees (+ = leaning stage right). Flight
 *   authority (balloon vent, comet shot) drives this; the face CONFIGURATION
 *   is untouched — the being tips together (momentum-rig face-safety idiom).
 *
 * Content mapping: WORLD_SPACE_CONSTANTS.unitsPerContentPx world units per
 * SVG content px at the HOME plane (8 by default => the home frustum half
 * width 960 units = 120 content px = half the 240 px content viewBox;
 * Gasper's ~60 content-px body ≈ 480 world units ≈ 1/4 desktop width — a
 * creature on a desk, not a dot in a stadium).
 *
 * Provenance fence (D-0088 idiom): a world pose only moves Gasper when it
 * carries a recognized authority tag. Unprovenanced commands fail closed to
 * home — nothing monkey-patches the character across space.
 */

export type WorldProvenance =
  | "none"
  | "scene-authority"
  | "physics-authority"
  | "capture-drive"
  // GASPER-CRAFT-001 · C1: authored curve performances (PerformancePacks).
  | "curve-authority"
  // GASPER-CRAFT-002 · D-0106: the golden-angle idle wander (GoldenWanderDriver).
  | "wander-authority"
  // GASPER-ALIVE-001 · D-0108: the life director's approach legs (curiosity
  // walks toward a point of interest; yields to pack/physics/capture/freeze).
  | "life-authority";

export type WorldPose = Readonly<{
  /** Lateral offset from the view axis, world units (+ = stage right). */
  x: number;
  /** Altitude above the floor plane, world units (>= 0). */
  y: number;
  /** Distance from the home plane, world units (− = toward the glass). */
  z: number;
  /** Whole-body roll, degrees (+ = lean stage right). */
  tilt: number;
}>;

export type WorldPoseCommand = Readonly<{
  pose: WorldPose;
  provenance: WorldProvenance;
}>;

export const WORLD_SPACE_CONSTANTS = Object.freeze({
  /** Home frustum extent — a desktop (owner: "a space as large as a desktop"). */
  extentWidth: 1920,
  extentHeight: 1080,
  /** World units per SVG content px at the home plane. */
  unitsPerContentPx: 8,
  /** Tilt fence (degrees). Flight authority stays inside this. */
  maxTiltDeg: 45,
  /**
   * D0 — camera-to-home-plane distance, world units (one desktop width).
   * The authoring dial for perspective strength: scale(z) = D0/(D0+z).
   */
  homeViewDistance: 1920,
  /**
   * The MONITOR GLASS — the near bound (Doctrine 2 Layer 1). The closest
   * Gasper may come to the user. N35 (owner 2026-08-06): "let him move
   * forward, but only so much as to allow a 20% increase in size" ⇒
   * scale = 1920/(1920−320) = 1.2× home exactly (the previous 2.4× glass
   * read as TOO CLOSE to the owner). At the D-0098 contour anchor (153px)
   * that reads ~184px — an intimate but not looming presence.
   */
  zNear: -320,
  /**
   * The FAR FADE — the far bound: scale = 1920/5486 ≈ 0.35× home. At the
   * 153px anchor that reads ~54px — the smallest size that still reads as
   * Gasper rather than a speck. Past this the space is unreadable.
   */
  zFar: 3566,
  /**
   * Content px from the home floor anchor to the horizon line. The
   * projection law lifts the floor anchor by floorToHorizonPx·(1−scale) —
   * as z→∞ the feet converge exactly onto the horizon. 78 px puts the
   * horizon above the home body's crown (anchor y=190, horizon y=112).
   */
  floorToHorizonPx: 78,
  /**
   * The ONLY smoothing left in the renderer (D-0099 Doctrine 3a): the
   * home-return policy transition after an authority releases. Authored
   * poses draw EXACTLY (keys are truth — phi-beta-motion-perception).
   */
  releaseTauSeconds: 0.25,
});

export const WORLD_HOME_POSE: WorldPose = Object.freeze({
  x: 0,
  y: 0,
  z: 0,
  tilt: 0,
});

export const WORLD_PROVENANCE_SET: ReadonlySet<WorldProvenance> = new Set([
  "none",
  "scene-authority",
  "physics-authority",
  "capture-drive",
  "curve-authority",
  "wander-authority",
  "life-authority",
]);

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Validate a provenance tag against the closed set (fail closed to none). */
export function validateWorldProvenance(value: unknown): WorldProvenance {
  return typeof value === "string" &&
    WORLD_PROVENANCE_SET.has(value as WorldProvenance)
    ? (value as WorldProvenance)
    : "none";
}

/**
 * The projection law — depth scale at a distance from the home plane.
 * scale(0) = 1 (home); zNear → 1.2 (the N35 glass); zFar → ≈0.35 (the fade).
 * z is fenced to [zNear, zFar] first — a corrupt depth never divides by ≤0.
 */
export function depthScaleAt(z: number): number {
  const c = WORLD_SPACE_CONSTANTS;
  const zc = clamp(finiteOr(z, 0), c.zNear, c.zFar);
  return c.homeViewDistance / (c.homeViewDistance + zc);
}

/**
 * The floor-plane law — how far the floor anchor lifts toward the horizon
 * at depth z (content px, apply upward). Exactly floorToHorizonPx·(1−scale):
 * home = 0, the far fade converges on the horizon line itself.
 */
export function horizonLiftPxAt(z: number): number {
  const c = WORLD_SPACE_CONSTANTS;
  return c.floorToHorizonPx * (1 - depthScaleAt(z));
}

/** Frustum bounds at a depth — the real, knowable edges of the space. */
export type WorldBounds = Readonly<{
  /** Visible lateral half-extent at this depth (world units). */
  xHalf: number;
  /** Ceiling altitude at this depth (world units); floor is y=0. */
  yMax: number;
  /** Depth fences (world units from the home plane). */
  zMin: number;
  zMax: number;
}>;

/**
 * Doctrine 2 Layer 1 — bounds as physics. The frustum widens with depth
 * (xHalfHome / scale): the world is wider in the distance, narrower at the
 * glass. Consumed by the pack compiler gate, autonomous behavior awareness,
 * and the physics walls.
 */
export function worldBoundsAt(z: number): WorldBounds {
  const c = WORLD_SPACE_CONSTANTS;
  const s = depthScaleAt(z);
  return Object.freeze({
    xHalf: c.extentWidth / 2 / s,
    yMax: c.extentHeight / s,
    zMin: c.zNear,
    zMax: c.zFar,
  });
}

/**
 * Is the RAW pose inside the real bounds at its own depth? A gate, not a
 * clamp: it judges authored values as given (compiler + capture probe) and
 * fails CLOSED — non-finite components, out-of-fence depth, or any box
 * violation returns false.
 */
export function worldPoseInsideBounds(raw: unknown): boolean {
  const c = WORLD_SPACE_CONSTANTS;
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const x = finiteOr(r.x, Number.NaN);
  const y = finiteOr(r.y, Number.NaN);
  const z = finiteOr(r.z, Number.NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return false;
  }
  if (z < c.zNear || z > c.zFar) return false;
  const b = worldBoundsAt(z);
  return Math.abs(x) <= b.xHalf && y >= 0 && y <= b.yMax;
}

/**
 * Clamp an arbitrary raw payload into the world fence. Non-finite components
 * fall back to home — a malformed command never teleports the character.
 * x/y clamp against the frustum at the payload's OWN depth (Doctrine 2).
 */
export function clampWorldPose(raw: unknown): WorldPose {
  const c = WORLD_SPACE_CONSTANTS;
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const z = clamp(finiteOr(r.z, 0), c.zNear, c.zFar);
  const b = worldBoundsAt(z);
  return Object.freeze({
    x: clamp(finiteOr(r.x, 0), -b.xHalf, b.xHalf),
    y: clamp(finiteOr(r.y, 0), 0, b.yMax),
    z,
    tilt: clamp(finiteOr(r.tilt, 0), -c.maxTiltDeg, c.maxTiltDeg),
  });
}

/** Normalize a raw command (pose + provenance) — fail closed on both. */
export function clampWorldPoseCommand(raw: unknown): WorldPoseCommand {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const provenance = validateWorldProvenance(r.provenance);
  // Fence: an unprovenanced command is a home command.
  return Object.freeze({
    pose: provenance === "none" ? WORLD_HOME_POSE : clampWorldPose(r),
    provenance,
  });
}

export type WorldContentOffset = Readonly<{
  /**
   * Screen-lateral content-px offset (+ = stage right), ALREADY projected:
   * (x / unitsPerContentPx) · scale. The renderer applies it outside the
   * depth scale — this is what the eye sees.
   */
  dx: number;
  /**
   * Altitude in content px at the home plane (y / unitsPerContentPx) —
   * UNPROJECTED: the renderer applies it inside the depth-scaled frame, so
   * the rig scale projects it. Screen altitude = dy · depthScale.
   */
  dy: number;
  /** The screen altitude the eye sees (dy · depthScale), content px. */
  screenAltitudePx: number;
  /** Depth scale about the floor anchor (1 at z=0). */
  depthScale: number;
  /** Floor-anchor lift toward the horizon, content px (apply upward). */
  horizonShiftPx: number;
}>;

/** Map a world pose to renderer content-space offsets (deterministic). */
export function worldPoseToContentOffset(pose: WorldPose): WorldContentOffset {
  const c = WORLD_SPACE_CONSTANTS;
  const p = clampWorldPose(pose);
  const s = depthScaleAt(p.z);
  const dy = p.y / c.unitsPerContentPx;
  return Object.freeze({
    dx: (p.x / c.unitsPerContentPx) * s,
    dy,
    screenAltitudePx: dy * s,
    depthScale: s,
    horizonShiftPx: horizonLiftPxAt(p.z),
  });
}

/**
 * Reduced-motion collapse (constitution 7.1): scale a pose toward home by the
 * living motion strength. strength 0 => home exactly; strength 1 => the pose.
 */
export function collapseWorldPose(
  pose: WorldPose,
  strength: number,
): WorldPose {
  const s = clamp(finiteOr(strength, 0), 0, 1);
  const p = clampWorldPose(pose);
  return Object.freeze({
    x: p.x * s,
    y: p.y * s,
    z: p.z * s,
    tilt: p.tilt * s,
  });
}

export function worldPoseIsHome(pose: WorldPose, epsilon = 1e-3): boolean {
  const p = clampWorldPose(pose);
  return (
    Math.abs(p.x) <= epsilon &&
    Math.abs(p.y) <= epsilon &&
    Math.abs(p.z) <= epsilon &&
    Math.abs(p.tilt) <= epsilon
  );
}

export function worldPoseEquals(
  a: WorldPose,
  b: WorldPose,
  epsilon = 1e-6,
): boolean {
  const pa = clampWorldPose(a);
  const pb = clampWorldPose(b);
  return (
    Math.abs(pa.x - pb.x) <= epsilon &&
    Math.abs(pa.y - pb.y) <= epsilon &&
    Math.abs(pa.z - pb.z) <= epsilon &&
    Math.abs(pa.tilt - pb.tilt) <= epsilon
  );
}
