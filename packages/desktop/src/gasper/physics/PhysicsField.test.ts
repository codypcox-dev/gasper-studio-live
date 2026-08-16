import { describe, expect, it } from "vitest";
import {
  PHYSICS_FIELD_PACKET,
  createPhysicsField,
  fieldAfterResize,
  fieldBoundsAt,
  fieldMatchesExtents,
  fieldWithOverrides,
  worldPhysicsParamsFromField,
  type PhysicsField,
} from "./PhysicsField";
import { PHI_LAW } from "./PhiLaw";
import { DEFAULT_WORLD_PHYSICS_PARAMS } from "./WorldPhysics";
import { worldBoundsAt } from "../space/WorldSpace";

/** The D-0098 home silhouette in the current studio window. */
const STUDIO = { viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 };

function studioField(): PhysicsField {
  const f = createPhysicsField(STUDIO);
  if (!f) throw new Error("studio field must build");
  return f;
}

describe("GASPER-PHYSICS-001 · D-0112 — the environment-owned field", () => {
  it("derives φ-scale real physics from the environment's report", () => {
    const f = studioField();
    expect(f.packet).toBe(PHYSICS_FIELD_PACKET);
    expect(f.epoch).toBe(0);
    // His body: invariant size, environment-derived mapping.
    expect(f.homeHeightUnits).toBe(153 * 8); // WorldSpace units
    expect(f.pxPerMeter).toBeCloseTo(945.6, 0);
    // 9.81 m/s² at toy scale in world units — the snappiness law.
    expect(f.gravityUnitsPerS2).toBeCloseTo(9.81 * 945.6 * 8, -2);
    // The φ defaults are the law.
    expect(f.restitution).toBeCloseTo(PHI_LAW.restitution, 12);
    expect(f.frictionMu).toBeCloseTo(PHI_LAW.frictionMu, 12);
    expect(f.settleZeta).toBeCloseTo(PHI_LAW.settleZeta, 12);
    // Bounds from the viewport at the home plane.
    expect(f.xHalfHomeUnits).toBe(640 * 8);
    expect(f.ceilingUnits).toBe(720 * 8);
    expect(f.zNearUnits).toBe(-320);
    expect(f.zFarUnits).toBe(3566);
  });

  it("resolution-dependent bounds, size-invariant body (desktop-roaming law)", () => {
    const small = studioField();
    const big = createPhysicsField({ ...STUDIO, viewportWidthPx: 2560, viewportHeightPx: 1440 });
    if (!big) throw new Error("big field must build");
    // Same homeHeightPx ⇒ same Gasper, same gravity — a bigger screen is a
    // bigger ROOM, not a bigger body.
    expect(big.gravityUnitsPerS2).toBeCloseTo(small.gravityUnitsPerS2, 9);
    expect(big.homeHeightUnits).toBe(small.homeHeightUnits);
    // …but the room's bounds scale with the resolution.
    expect(big.xHalfHomeUnits).toBe(small.xHalfHomeUnits * 2);
    expect(big.ceilingUnits).toBe(small.ceilingUnits * 2);
  });

  it("every world change bumps the epoch (resize, override)", () => {
    const f = studioField();
    const resized = fieldAfterResize(f, { ...STUDIO, viewportWidthPx: 1000 });
    expect(resized?.epoch).toBe(1);
    const resizedAgain = resized ? fieldAfterResize(resized, STUDIO) : null;
    expect(resizedAgain?.epoch).toBe(2);
    const overridden = fieldWithOverrides(f, STUDIO, { restitution: 0.5 });
    expect(overridden?.epoch).toBe(1);
    expect(overridden?.restitution).toBe(0.5);
  });

  it("environment overrides are honored; corrupt overrides fail closed to φ", () => {
    const f = fieldWithOverrides(studioField(), STUDIO, {
      gravityScale: 2,
      restitution: 0.4,
      frictionMu: 0.1,
      settleZeta: 0.9,
    });
    if (!f) throw new Error("override field must build");
    expect(f.restitution).toBe(0.4);
    expect(f.frictionMu).toBe(0.1);
    expect(f.settleZeta).toBe(0.9);
    expect(f.gravityUnitsPerS2).toBeCloseTo(studioField().gravityUnitsPerS2 * 2, 6);
    // Corrupt values fall back to the φ-law, never to garbage.
    const bad = fieldWithOverrides(studioField(), STUDIO, {
      restitution: Number.NaN,
      frictionMu: -3,
      settleZeta: 0,
      gravityScale: -1,
    });
    if (!bad) throw new Error("bad-override field must build");
    expect(bad.restitution).toBeCloseTo(PHI_LAW.restitution, 12);
    expect(bad.frictionMu).toBeCloseTo(PHI_LAW.frictionMu, 12);
    expect(bad.settleZeta).toBeCloseTo(PHI_LAW.settleZeta, 12);
    expect(bad.gravityUnitsPerS2).toBeCloseTo(studioField().gravityUnitsPerS2, 6);
  });

  it("fail-closed: a world that cannot be trusted builds no field", () => {
    expect(createPhysicsField({ ...STUDIO, viewportWidthPx: 0 })).toBeNull();
    expect(createPhysicsField({ ...STUDIO, viewportHeightPx: Number.NaN })).toBeNull();
    expect(createPhysicsField({ ...STUDIO, homeHeightPx: -153 })).toBeNull();
    expect(fieldAfterResize(studioField(), { ...STUDIO, homeHeightPx: 0 })).toBeNull();
  });

  it("the frustum walls widen with depth (Doctrine 2 carried on the field)", () => {
    const f = studioField();
    const D0 = 1920;
    // xHalf(z) = xHalfHome · (D0+z)/D0 — home is exact, depth widens,
    // near-glass narrows.
    expect(fieldBoundsAt(f, 0, D0).xHalfUnits).toBeCloseTo(f.xHalfHomeUnits, 9);
    expect(fieldBoundsAt(f, D0, D0).xHalfUnits).toBeCloseTo(f.xHalfHomeUnits * 2, 6);
    expect(fieldBoundsAt(f, -D0 / 2, D0).xHalfUnits).toBeCloseTo(f.xHalfHomeUnits * 0.5, 6);
    expect(fieldBoundsAt(f, D0, D0).ceilingUnits).toBeCloseTo(f.ceilingUnits * 2, 6);
  });

  it("worldPhysicsParamsFromField — the ONLY lawful bridge into the integrator", () => {
    const f = studioField();
    const p = worldPhysicsParamsFromField(f);
    // Every physical constant comes from the field — the authored defaults
    // (gravity 2600, restitution 0.9, maxSpeed 4200…) are superseded.
    expect(p.gravity).toBeCloseTo(f.gravityUnitsPerS2, 9);
    expect(p.gravityScale).toBe(1);
    expect(p.restitution).toBeCloseTo(f.restitution, 12);
    expect(p.maxSpeed).toBeCloseTo(Math.sqrt(2 * f.gravityUnitsPerS2 * f.ceilingUnits), 6);
    const restBounceUnits = PHI_LAW.restBounceFraction * f.homeHeightUnits;
    expect(p.restSpeed).toBeCloseTo(Math.sqrt(2 * f.gravityUnitsPerS2 * restBounceUnits), 6);
    expect(p.bounceFriction).toBeCloseTo(1 - f.frictionMu, 12);
    expect(p.frictionMu).toBeCloseTo(f.frictionMu, 12);
    // Rail-tunables carry over from the base.
    expect(p.intensity).toBe(DEFAULT_WORLD_PHYSICS_PARAMS.intensity);
    expect(p.launchPower).toBe(DEFAULT_WORLD_PHYSICS_PARAMS.launchPower);
  });

  it("the field is frozen (no runtime mutation of the environment's law)", () => {
    expect(Object.isFrozen(studioField())).toBe(true);
  });

  it("the canonical black-room report matches the WorldSpace fence EXACTLY", () => {
    // The studio room in content px (WorldSpace law: 8 units per content px):
    // 1920/8 × 1080/8, with the D-0098 silhouette anchor as his height.
    const room = createPhysicsField({
      viewportWidthPx: 240,
      viewportHeightPx: 135,
      homeHeightPx: 153,
    });
    if (!room) throw new Error("black-room field must build");
    const fence = worldBoundsAt(0);
    // The kernel's walls coincide with the renderer fence — he can never
    // believe a coordinate the eye would clamp.
    expect(room.xHalfHomeUnits).toBe(fence.xHalf);
    expect(room.ceilingUnits).toBe(fence.yMax);
    expect(room.zNearUnits).toBe(fence.zMin);
    expect(room.zFarUnits).toBe(fence.zMax);
    // And gravity is exactly 9.81 m/s² at his φ-scale size in world units.
    expect(room.gravityUnitsPerS2).toBeCloseTo(
      9.81 * (153 / PHI_LAW.canonicalHeightM) * 8,
      6,
    );
  });

  it("an idempotent report re-states the room without bumping the epoch", () => {
    const f = studioField();
    expect(fieldMatchesExtents(f, STUDIO)).toBe(true);
    // Omitted optionals default the same way the field was built.
    expect(
      fieldMatchesExtents(f, { ...STUDIO, unitsPerContentPx: undefined }),
    ).toBe(true);
    // Any real change is NOT a match (the epoch must bump).
    expect(fieldMatchesExtents(f, { ...STUDIO, viewportWidthPx: 1281 })).toBe(false);
    expect(fieldMatchesExtents(f, { ...STUDIO, viewportHeightPx: 719 })).toBe(false);
    expect(fieldMatchesExtents(f, { ...STUDIO, homeHeightPx: 154 })).toBe(false);
    expect(
      fieldMatchesExtents(f, { ...STUDIO, unitsPerContentPx: 4 }),
    ).toBe(false);
    expect(fieldMatchesExtents(f, { ...STUDIO, zNearUnits: -1000 })).toBe(false);
    expect(fieldMatchesExtents(f, { ...STUDIO, zFarUnits: 4000 })).toBe(false);
  });
});
