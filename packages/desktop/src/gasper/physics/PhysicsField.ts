/**
 * GASPER-PHYSICS-001 · D-0112 — the environment-owned physics FIELD.
 *
 * Ownership law (the environment verdict, owner N5): the ENVIRONMENT owns
 * the field — gravity, floor, bounds, restitution, friction, epoch. Gasper's
 * body kernel consumes it every step and can move ONLY through it; the field
 * never consumes him. Today the environment is the black-room stage; the
 * SAME contract later serves the desktop (any size, any resolution — bounds
 * and scale are environment-dependent, his body invariant).
 *
 * Defaults are the φ-law (PhiLaw.ts); the environment may override any
 * constant (N5: "the environment controls the physics of the environment").
 * Every change (resize, monitor change, override) bumps `epoch` — the body
 * kernel treats an epoch bump as "the world changed": re-locate, re-plan,
 * and (at the behavior layer) notice.
 *
 * Pure + frozen + deterministic. No clock, no DOM, no randomness.
 */

import {
  PHI_LAW,
  gravityPxPerS2,
  pxPerMeter,
} from "./PhiLaw";
import {
  DEFAULT_WORLD_PHYSICS_PARAMS,
  type WorldPhysicsParams,
} from "./WorldPhysics";

export const PHYSICS_FIELD_PACKET = "GASPER-PHYSICS-FIELD-001" as const;

/** Environment-reported extents (px of the host surface, any desktop). */
export type EnvironmentExtents = Readonly<{
  viewportWidthPx: number;
  viewportHeightPx: number;
  /** His rendered height at the home plane in THIS environment (px). */
  homeHeightPx: number;
  /** Content px → world units at the home plane (WorldSpace law: 8). */
  unitsPerContentPx?: number;
  /** Frustum depth fence (world units; WorldSpace defaults). */
  zNearUnits?: number;
  zFarUnits?: number;
}>;

/** Environment overrides of the φ defaults (owner law N5). */
export type FieldOverrides = Readonly<{
  gravityScale?: number;
  restitution?: number;
  frictionMu?: number;
  settleZeta?: number;
}>;

export type PhysicsField = Readonly<{
  packet: typeof PHYSICS_FIELD_PACKET;
  /** Bumped on ANY environment change — resize, override, re-home. */
  epoch: number;
  viewportWidthPx: number;
  viewportHeightPx: number;
  homeHeightPx: number;
  unitsPerContentPx: number;
  /** His body in world units — invariant physical size, derived mapping. */
  homeHeightUnits: number;
  pxPerMeter: number;
  /** Gravity, world units/s² — φ-scale real gravity at his size. */
  gravityUnitsPerS2: number;
  restitution: number;
  frictionMu: number;
  settleZeta: number;
  /** Horizontal half-extent at the home plane (world units). */
  xHalfHomeUnits: number;
  /** Ceiling altitude at the home plane (world units). */
  ceilingUnits: number;
  zNearUnits: number;
  zFarUnits: number;
}>;

const DEFAULT_UNITS_PER_CONTENT_PX = 8; // WorldSpace law
const DEFAULT_Z_NEAR = -320; // the monitor glass (WorldSpace; N35 owner cap — 1.2× home max)
const DEFAULT_Z_FAR = 3566; // the far fade (WorldSpace)

const num = (v: number | undefined, fb: number): number =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : fb;

/**
 * Build the field an environment reports. Fail-closed: non-finite extents
 * produce no field (null) — a body cannot move in a world it cannot trust.
 */
export function createPhysicsField(
  env: EnvironmentExtents,
  overrides?: FieldOverrides,
  epoch = 0,
): PhysicsField | null {
  const vw = env.viewportWidthPx;
  const vh = env.viewportHeightPx;
  const hh = env.homeHeightPx;
  if (![vw, vh, hh].every((v) => Number.isFinite(v) && v > 0)) return null;

  const upcp = num(env.unitsPerContentPx, DEFAULT_UNITS_PER_CONTENT_PX);
  const o = overrides ?? {};
  const gravityPx = gravityPxPerS2(hh);
  const restitution =
    typeof o.restitution === "number" && Number.isFinite(o.restitution) && o.restitution >= 0 && o.restitution <= 1
      ? o.restitution
      : PHI_LAW.restitution;
  const frictionMu =
    typeof o.frictionMu === "number" && Number.isFinite(o.frictionMu) && o.frictionMu >= 0
      ? o.frictionMu
      : PHI_LAW.frictionMu;
  const settleZeta =
    typeof o.settleZeta === "number" && Number.isFinite(o.settleZeta) && o.settleZeta > 0
      ? o.settleZeta
      : PHI_LAW.settleZeta;
  const gravityScale =
    typeof o.gravityScale === "number" && Number.isFinite(o.gravityScale) && o.gravityScale > 0
      ? o.gravityScale
      : 1;

  return Object.freeze({
    packet: PHYSICS_FIELD_PACKET,
    epoch,
    viewportWidthPx: vw,
    viewportHeightPx: vh,
    homeHeightPx: hh,
    unitsPerContentPx: upcp,
    homeHeightUnits: hh * upcp,
    pxPerMeter: pxPerMeter(hh),
    gravityUnitsPerS2: gravityPx * upcp * gravityScale,
    restitution,
    frictionMu,
    settleZeta,
    xHalfHomeUnits: (vw / 2) * upcp,
    ceilingUnits: vh * upcp,
    zNearUnits: env.zNearUnits ?? DEFAULT_Z_NEAR,
    zFarUnits: env.zFarUnits ?? DEFAULT_Z_FAR,
  });
}

/**
 * Idempotent-report guard: true when the reported extents already describe
 * the field in force. An environment may re-assert its size (a no-op resize
 * event, a re-attach) — that is NOT a change, and the epoch must not bump:
 * epoch means "the world changed," never "the world was re-stated."
 */
export function fieldMatchesExtents(
  field: PhysicsField,
  env: EnvironmentExtents,
): boolean {
  return (
    field.viewportWidthPx === env.viewportWidthPx &&
    field.viewportHeightPx === env.viewportHeightPx &&
    field.homeHeightPx === env.homeHeightPx &&
    num(env.unitsPerContentPx, DEFAULT_UNITS_PER_CONTENT_PX) ===
      field.unitsPerContentPx &&
    (env.zNearUnits ?? DEFAULT_Z_NEAR) === field.zNearUnits &&
    (env.zFarUnits ?? DEFAULT_Z_FAR) === field.zFarUnits
  );
}

/**
 * The world changed (resize / resolution change): same environment, new
 * geometry — the epoch bumps and the body kernel must re-locate. His
 * physical size is invariant: homeHeightPx decides the mapping, not the
 * viewport (a bigger screen is a bigger room, not a bigger Gasper).
 */
export function fieldAfterResize(
  field: PhysicsField,
  env: EnvironmentExtents,
  overrides?: FieldOverrides,
): PhysicsField | null {
  return createPhysicsField(env, overrides, field.epoch + 1);
}

/** Environment overrides applied mid-life — the epoch bumps. */
export function fieldWithOverrides(
  field: PhysicsField,
  env: EnvironmentExtents,
  overrides: FieldOverrides,
): PhysicsField | null {
  return createPhysicsField(env, overrides, field.epoch + 1);
}

/**
 * Frustum walls at depth (Doctrine 2, D-0099): the horizontal half-extent
 * WIDENS with depth — xHalf(z) = xHalfHome · (D0+z)/D0 — the same law as
 * WorldSpace.worldBoundsAt, carried on the field so the environment stays
 * the single owner of bounds.
 */
export function fieldBoundsAt(
  field: PhysicsField,
  z: number,
  homeViewDistanceUnits: number,
): Readonly<{ xHalfUnits: number; ceilingUnits: number }> {
  const D0 = homeViewDistanceUnits > 0 ? homeViewDistanceUnits : 1920;
  const s = D0 / (D0 + z);
  return Object.freeze({
    xHalfUnits: field.xHalfHomeUnits / s,
    ceilingUnits: field.ceilingUnits / s,
  });
}

/**
 * The field expressed as integrator parameters — the ONLY lawful bridge
 * from environment to body. Rail-tunables (intensity, launchPower) carry
 * over from `base`; every physical constant comes from the field:
 *
 *  - gravity: φ-scale real gravity at his size (the snappiness law);
 *  - maxSpeed: a ceiling-height fall — the fastest the room allows;
 *  - restSpeed: bounces below the φ⁻⁶ visibility floor read as contact;
 *  - bounceFriction: tangential retention 1−μ per floor impact;
 *  - frictionMu: Coulomb sliding while grounded (stopping distance v²/2μg).
 */
export function worldPhysicsParamsFromField(
  field: PhysicsField,
  base: WorldPhysicsParams = DEFAULT_WORLD_PHYSICS_PARAMS,
): WorldPhysicsParams {
  const restBounceUnits = PHI_LAW.restBounceFraction * field.homeHeightUnits;
  return Object.freeze({
    ...base,
    gravityScale: 1,
    restitution: field.restitution,
    gravity: field.gravityUnitsPerS2,
    maxSpeed: Math.sqrt(2 * field.gravityUnitsPerS2 * field.ceilingUnits),
    restSpeed: Math.sqrt(2 * field.gravityUnitsPerS2 * restBounceUnits),
    bounceFriction: Math.max(0, 1 - field.frictionMu),
    frictionMu: field.frictionMu,
  });
}
