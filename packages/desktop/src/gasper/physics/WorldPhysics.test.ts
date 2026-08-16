import { describe, expect, it } from "vitest";
import {
  applyGroundedImpulse,
  applyImpulse,
  bodyIsSettled,
  bodySpeed,
  clampWorldPhysicsParams,
  createWorldBody,
  DEFAULT_WORLD_PHYSICS_PARAMS,
  stepWorldBody,
  travelTilt,
  WORLD_PHYSICS_CONSTANTS as C,
  type WorldBodyState,
} from "./WorldPhysics";

const NO_FORCE = {};

/** Run the integrator at 120Hz until pred or a bounded frame count. */
function run(
  state: WorldBodyState,
  frames: number,
  pred?: (s: WorldBodyState, ev: readonly { speed: number }[]) => boolean,
  params = DEFAULT_WORLD_PHYSICS_PARAMS,
): { state: WorldBodyState; impacts: number; lastImpactSpeed: number } {
  let s = state;
  let impacts = 0;
  let lastImpactSpeed = 0;
  for (let i = 0; i < frames; i++) {
    const r = stepWorldBody(s, NO_FORCE, params, 1 / 120);
    s = r.state;
    for (const e of r.events) {
      if (e.kind === "floor") {
        impacts++;
        lastImpactSpeed = e.speed;
      }
    }
    if (pred?.(s, r.events)) break;
  }
  return { state: s, impacts, lastImpactSpeed };
}

describe("GASPER-SPACE-001 PHASE B world physics core", () => {
  it("free fall hits the floor at sqrt(2gh) (energy-honest semi-implicit Euler)", () => {
    const h0 = 800;
    const body = { ...createWorldBody(0), y: h0, contact: false };
    const r = run(body, 400, (_s, ev) => ev.some((e) => e.kind === "floor"));
    expect(r.impacts).toBe(1);
    const expected = Math.sqrt(2 * C.gravity * h0);
    // semi-implicit Euler at 120Hz lands within 1.5% of the analytic speed
    expect(r.lastImpactSpeed).toBeGreaterThan(expected * 0.985);
    expect(r.lastImpactSpeed).toBeLessThan(expected * 1.015);
  });

  it("bounce apex decays by restitution squared", () => {
    const r0 = 0.62;
    const body = { ...createWorldBody(0), y: 500, contact: false };
    let s = body;
    let firstApex = -1;
    let secondApex = -1;
    let bounces = 0;
    for (let i = 0; i < 1200 && bounces < 3; i++) {
      const r = stepWorldBody(s, NO_FORCE, DEFAULT_WORLD_PHYSICS_PARAMS, 1 / 120);
      s = r.state;
      if (r.events.some((e) => e.kind === "floor")) {
        bounces++;
      } else if (bounces === 1 && s.vy <= 0 && firstApex < 0 && s.y > 1) {
        firstApex = s.y;
      } else if (bounces === 2 && s.vy <= 0 && secondApex < 0 && s.y > 1) {
        secondApex = s.y;
      }
    }
    expect(firstApex).toBeGreaterThan(0);
    expect(secondApex).toBeGreaterThan(0);
    const ratio = secondApex / firstApex;
    expect(ratio).toBeGreaterThan(r0 * r0 * 0.9);
    expect(ratio).toBeLessThan(r0 * r0 * 1.1);
  });

  it("a spent body settles: contact, zero vy, horizontal drift rolls out", () => {
    const body = applyImpulse({ ...createWorldBody(-400), contact: true }, 500, 900);
    const r = run(body, 2400, (s) => bodyIsSettled(s));
    expect(bodyIsSettled(r.state)).toBe(true);
    expect(r.state.y).toBe(0);
    expect(r.state.vy).toBe(0);
    expect(r.state.vx).toBe(0);
    expect(r.impacts).toBeGreaterThanOrEqual(2);
  });

  it("dead restitution (0) drops without a second bounce", () => {
    const params = clampWorldPhysicsParams({ restitution: 0 });
    const body = { ...createWorldBody(0), y: 300, contact: false };
    const r = run(body, 600, (s) => s.contact, params);
    expect(r.impacts).toBe(1);
    expect(r.state.contact).toBe(true);
  });

  it("walls clamp x to the desktop edges and halve the closing speed", () => {
    const body = applyImpulse(createWorldBody(900), 3000, 400);
    const r = run(body, 240, (s) => s.x >= 960);
    expect(r.state.x).toBe(960);
    expect(r.state.vx).toBeLessThan(0);
  });

  it("walls follow the frustum at the flight depth (D-0099 Doctrine 2)", () => {
    // A body far past the home fence, moving outward at depth.
    const body = { ...createWorldBody(0), x: 2700, y: 200, vx: 3000, vy: 0, contact: false };
    // Deep frustum (xHalf 2743, the far-fade width): still inside — no wall.
    const deep = stepWorldBody(body, NO_FORCE, DEFAULT_WORLD_PHYSICS_PARAMS, 1 / 120, {
      xHalf: 2743,
    });
    expect(deep.events.some((e) => e.kind === "wall")).toBe(false);
    expect(deep.state.x).toBeGreaterThan(2700);
    // Home fence (default xHalf 960): the same body is outside — wall clamps
    // and reports the impact.
    const home = stepWorldBody(body, NO_FORCE, DEFAULT_WORLD_PHYSICS_PARAMS, 1 / 120);
    expect(home.state.x).toBe(960);
    expect(home.events.some((e) => e.kind === "wall")).toBe(true);
    // Corrupt bounds fail closed to the home-plane fence.
    const corrupt = stepWorldBody(body, NO_FORCE, DEFAULT_WORLD_PHYSICS_PARAMS, 1 / 120, {
      xHalf: Number.NaN,
    });
    expect(corrupt.state.x).toBe(960);
  });

  it("honors asymmetric production x bounds and a shared altitude ceiling", () => {
    const body = applyImpulse(createWorldBody(0), 1200, 1500);
    const r = stepWorldBody(body, NO_FORCE, DEFAULT_WORLD_PHYSICS_PARAMS, 1 / 60, {
      xMin: -10,
      xMax: 10,
      yMax: 5,
    });

    expect(r.state.x).toBe(10);
    expect(r.state.vx).toBeLessThan(0);
    expect(r.state.y).toBe(5);
    expect(r.state.vy).toBeLessThan(0);
    expect(r.events.map((event) => event.kind)).toEqual(["ceiling", "wall"]);
  });

  it("applyImpulse adds velocity and breaks contact; non-finite impulse is ignored", () => {
    const rest = createWorldBody(0);
    const shot = applyImpulse(rest, 100, 200);
    expect(shot.vx).toBe(100);
    expect(shot.vy).toBe(200);
    expect(shot.contact).toBe(false);
    expect(applyImpulse(rest, Number.NaN, 5)).toBe(rest);
  });

  it("speed is capped at maxSpeed", () => {
    const shot = applyImpulse(createWorldBody(0), 9000, 9000);
    const r = stepWorldBody(shot, NO_FORCE, DEFAULT_WORLD_PHYSICS_PARAMS, 1 / 120);
    expect(bodySpeed(r.state)).toBeLessThanOrEqual(C.maxSpeed + 1);
  });

  it("non-finite or non-positive dt returns the state untouched", () => {
    const body = { ...createWorldBody(100), y: 100, contact: false };
    expect(stepWorldBody(body, NO_FORCE, DEFAULT_WORLD_PHYSICS_PARAMS, Number.NaN).state).toBe(body);
    expect(stepWorldBody(body, NO_FORCE, DEFAULT_WORLD_PHYSICS_PARAMS, 0).state).toBe(body);
    expect(stepWorldBody(body, NO_FORCE, DEFAULT_WORLD_PHYSICS_PARAMS, -1).state).toBe(body);
  });

  it("huge dt is clamped to maxDt (no tunneling through the floor)", () => {
    const body = { ...createWorldBody(0), y: 10, contact: false };
    const r = stepWorldBody(body, NO_FORCE, DEFAULT_WORLD_PHYSICS_PARAMS, 10);
    expect(r.state.y).toBeGreaterThanOrEqual(0);
  });

  it("params clamp fail-safe: non-finite fields fall back to defaults", () => {
    const p = clampWorldPhysicsParams({
      gravityScale: Number.NaN,
      restitution: 5,
      launchPower: -3,
      intensity: 0.4,
    });
    expect(p.gravityScale).toBe(1);
    expect(p.restitution).toBe(0.9);
    expect(p.launchPower).toBe(0.25);
    expect(p.intensity).toBe(0.4);
  });

  it("travel tilt leans into velocity and clamps", () => {
    expect(travelTilt({ ...createWorldBody(), vx: 800 })).toBeCloseTo(9.6, 5);
    expect(travelTilt({ ...createWorldBody(), vx: -800 })).toBeCloseTo(-9.6, 5);
    expect(travelTilt({ ...createWorldBody(), vx: 9000 })).toBe(C.maxTravelTilt);
  });

  it("deterministic: identical runs produce identical states", () => {
    const a = run(applyImpulse(createWorldBody(-200), 700, 1200), 600);
    const b = run(applyImpulse(createWorldBody(-200), 700, 1200), 600);
    expect(a.state).toEqual(b.state);
    expect(a.impacts).toBe(b.impacts);
  });
});

describe("D-0112 — Coulomb sliding is one vector law (CanonOps audit)", () => {
  const MU = 0.381966;
  const G = 74210;
  // Field-faithful params: with φ-scale gravity the sub-bounce settle speed
  // is the φ⁻⁶-floor impact speed (≈3181), so a resting body reads contact
  // and Coulomb applies. (The legacy restSpeed 40 predates the φ field.)
  const params = clampWorldPhysicsParams({
    gravity: G,
    frictionMu: MU,
    restitution: 0.618034,
    restSpeed: 3181,
    bounceFriction: 1 - MU,
  });
  const dt = 1 / 240;

  /** Slide a grounded body until rest; return the travelled distance. */
  function slideDistance(vx0: number, vz0: number): number {
    let s = { ...createWorldBody(0), contact: true, vx: vx0, vz: vz0 };
    let d = 0;
    for (let i = 0; i < 4000; i++) {
      const prev = s;
      const r = stepWorldBody(s, {}, params, dt);
      s = r.state;
      d += Math.hypot(s.x - prev.x, s.z - prev.z);
      if (s.vx === 0 && s.vz === 0) break;
    }
    return d;
  }

  it("stopping distance is v²/(2μg) on ANY heading — diagonal included", () => {
    const v = 3000;
    const expected = (v * v) / (2 * MU * G); // ≈ 158.8 units
    // Discrete band: position moves with the pre-shrink velocity, so the
    // discrete slide overshoots the analytic distance by v·h/2 ± (μg·h)·h/2
    // (same symplectic offset as the apex band in LaunchSequencer.test.ts).
    const h = dt;
    const center = expected + (v * h) / 2;
    const half = (MU * G * h * h) / 2 + 1e-9;
    const inBand = (d: number) => {
      expect(d).toBeGreaterThan(center - half);
      expect(d).toBeLessThan(center + half);
    };
    // Axis-aligned…
    inBand(slideDistance(v, 0));
    // …and a 45° diagonal stops at the SAME distance (pre-audit the
    // per-axis shrink over-decelerated diagonals by up to √2×).
    const k = v / Math.SQRT2;
    inBand(slideDistance(k, k));
    // Arbitrary heading too.
    inBand(slideDistance(v * 0.6, v * 0.8));
  });

  it("direction is preserved while sliding (no axis bias)", () => {
    let s = { ...createWorldBody(0), contact: true, vx: 2400, vz: 1800 };
    for (let i = 0; i < 10; i++) {
      s = stepWorldBody(s, {}, params, dt).state;
    }
    // vx/vz keeps the launch ratio exactly (the shrink is radial).
    expect(s.vx / s.vz).toBeCloseTo(2400 / 1800, 9);
  });
});

describe("D-0112 — traction + gait law: steering needs contact, walking is not skidding", () => {
  const MU = 0.381966;
  const G = 74210;
  const params = clampWorldPhysicsParams({
    gravity: G,
    frictionMu: MU,
    restitution: 0.618034,
    restSpeed: 3181,
    bounceFriction: 1 - MU,
  });
  const dt = 1 / 240;

  it("az steers depth while grounded (2.5D locomotion)", () => {
    const r = stepWorldBody(createWorldBody(0), { az: 10000 }, params, dt);
    expect(r.state.vz).toBeCloseTo(10000 * dt, 6);
    expect(r.state.z).toBeGreaterThan(0);
    expect(r.state.contact).toBe(true);
  });

  it("airborne steering is silently zero — you cannot push off a floor you are not touching", () => {
    const air = { ...createWorldBody(0), y: 500, contact: false };
    const r = stepWorldBody(air, { ax: 10000, az: 10000 }, params, dt);
    expect(r.state.vx).toBe(0);
    expect(r.state.vz).toBe(0);
    // …while authored vertical thrust still applies in the air.
    const thrust = stepWorldBody(air, { ay: 10000 }, params, dt);
    expect(thrust.state.vy).toBeCloseTo((10000 - G) * dt, 6);
  });

  it("a walking body accelerates at its steering input (no skid cancellation)", () => {
    // Pre-gait-law, kinetic friction ate the steering input μ·g-for-μ·g and a
    // body steered at full traction could not accelerate at all.
    let s = createWorldBody(0);
    for (let i = 0; i < 24; i++) {
      s = stepWorldBody(s, { ax: MU * G, az: MU * G }, params, dt).state;
    }
    // 0.1 s of full traction on both axes: each axis v = μ·g·t exactly
    // (no skid cancellation, no loss term while walking).
    const perAxis = MU * G * 24 * dt;
    expect(s.vx).toBeCloseTo(perAxis, 3);
    expect(s.vz).toBeCloseTo(perAxis, 3);
  });

  it("Cycle 6 fold-back — walking keys off steering presence: zero-force cruise holds, spent bodies still slide", () => {
    // A deadbeat at exact cruise commands ZERO tangential force. Pre-fold-back
    // the kernel read that as a spent body and skid-bled μg·h every silent
    // tick — the take-6 limit cycle {cruise, cruise−Δ₁} (2492 vs 2610). A
    // walking body at constant speed bleeds nothing: static friction is the
    // walk's drive, not its loss.
    const cruise = 2610;
    const body = { ...createWorldBody(0), contact: true, vx: cruise };
    const walked = stepWorldBody(body, { ax: 0, az: 0, steered: true }, params, dt);
    expect(walked.state.vx).toBe(cruise); // exact hold — zero force, zero loss
    expect(walked.state.x).toBeCloseTo(cruise * dt, 6);
    // …while the unsteered twin keeps the byte-identical Coulomb slide (D-0112).
    const spent = stepWorldBody(body, {}, params, dt);
    expect(spent.state.vx).toBeCloseTo(cruise - MU * G * dt, 6);
  });

  it("cutting the steer friction-brakes to the proven Coulomb band — arrival is physics, not easing", () => {
    let s = createWorldBody(0);
    for (let i = 0; i < 120; i++) s = stepWorldBody(s, { ax: MU * G }, params, dt).state;
    const v = s.vx;
    expect(v).toBeGreaterThan(0);
    let d = 0;
    for (let i = 0; i < 4000; i++) {
      const prev = s;
      s = stepWorldBody(s, {}, params, dt).state;
      d += Math.abs(s.x - prev.x);
      if (s.vx === 0) break;
    }
    const expected = (v * v) / (2 * MU * G);
    const center = expected + (v * dt) / 2;
    const half = (MU * G * dt * dt) / 2 + 1e-9;
    expect(d).toBeGreaterThan(center - half);
    expect(d).toBeLessThan(center + half);
  });

  it("bodySpeed reads depth travel as motion (wake/light honor 2.5D)", () => {
    expect(bodySpeed({ ...createWorldBody(0), vz: 300 })).toBeCloseTo(300, 9);
  });
});

describe("applyGroundedImpulse", () => {
  it("writes floor-plane delta-v without leaving the floor", () => {
    const body = createWorldBody(0);
    const next = applyGroundedImpulse(body, 120, 80);
    expect(next.contact).toBe(true);
    expect(next.y).toBe(0);
    expect(next.vy).toBe(0);
    expect(next.vx).toBe(120);
    expect(next.vz).toBe(80);
  });

  it("refuses to hop an airborne body", () => {
    const air = applyImpulse(createWorldBody(0), 0, 400);
    expect(air.contact).toBe(false);
    const next = applyGroundedImpulse(air, 50, 50);
    expect(next).toBe(air);
  });
});
