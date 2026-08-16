import { describe, expect, it } from "vitest";
import {
  LAUNCH_SEQUENCER_GROUNDED,
  cancelLaunch,
  gatherWidthForDip,
  loadProgress,
  requestLaunch,
  stepLaunch,
  type LaunchSequencerState,
} from "./LaunchSequencer";
import { createPhysicsField, worldPhysicsParamsFromField, type PhysicsField } from "./PhysicsField";
import { PHI_LAW, launchSpeedForApex, minLoadingStroke, visibleBounceCount } from "./PhiLaw";
import {
  applyImpulse,
  createWorldBody,
  stepWorldBody,
  type WorldBodyState,
} from "./WorldPhysics";

const STUDIO = { viewportWidthPx: 1280, viewportHeightPx: 720, homeHeightPx: 153 };

function field(): PhysicsField {
  const f = createPhysicsField(STUDIO);
  if (!f) throw new Error("studio field must build");
  return f;
}

/** Step a fired body through the field-driven integrator; report apex + impacts. */
function fly(
  f: PhysicsField,
  vx: number,
  vy: number,
  maxSeconds = 3,
): { apex: number; impactSpeeds: number[]; final: WorldBodyState } {
  const params = worldPhysicsParamsFromField(f);
  const dt = PHI_LAW.kernelStepSeconds;
  let s = applyImpulse({ ...createWorldBody(0) }, vx, vy);
  let apex = 0;
  const impactSpeeds: number[] = [];
  for (let i = 0; i < maxSeconds / dt; i++) {
    const r = stepWorldBody(s, {}, params, dt);
    s = r.state;
    for (const e of r.events) {
      if (e.kind === "floor") impactSpeeds.push(e.speed);
    }
    if (s.y > apex) apex = s.y;
    if (impactSpeeds.length >= 4) break;
    if (s.contact && Math.abs(s.vx) < 2 && s.y === 0 && impactSpeeds.length > 0) break;
  }
  return { apex, impactSpeeds, final: s };
}

describe("GASPER-PHYSICS-001 · D-0112 — the liftoff law", () => {
  it("NO LAUNCH WITHOUT CONTACT — an airborne request is mechanically refused", () => {
    const f = field();
    const loading = requestLaunch(LAUNCH_SEQUENCER_GROUNDED, f, { apexRung: 1 });
    expect(loading.accepted).toBe(true);
    // Mid-stroke (i.e. committed, not in simple contact) — refused.
    const second = requestLaunch(loading.state, f, { apexRung: 2 });
    expect(second.accepted).toBe(false);
    expect(second.reason).toBe("not-in-contact");
    expect(second.state).toBe(loading.state); // state untouched
  });

  it("the apex ladder: rung n is exactly φ⁻³⁺ⁿ × own height", () => {
    const f = field();
    const rungs = [0, 1, 2] as const;
    for (const rung of rungs) {
      const v = requestLaunch(LAUNCH_SEQUENCER_GROUNDED, f, { apexRung: rung });
      expect(v.accepted).toBe(true);
      expect(v.state.apexUnits).toBeCloseTo(
        PHI_LAW.apexLadder[rung] * f.homeHeightUnits,
        9,
      );
    }
    // Explicit apex supersedes the rung.
    const explicit = requestLaunch(LAUNCH_SEQUENCER_GROUNDED, f, {
      apexRung: 0,
      apexUnits: 500,
    });
    expect(explicit.state.apexUnits).toBe(500);
  });

  it("the environment ceiling is law — refused, never clipped", () => {
    const f = field();
    const over = requestLaunch(LAUNCH_SEQUENCER_GROUNDED, f, {
      apexUnits: f.ceilingUnits + 1,
    });
    expect(over.accepted).toBe(false);
    expect(over.reason).toBe("exceeds-ceiling");
    expect(over.state.phase).toBe("grounded");
    // Exactly at the ceiling: allowed.
    const at = requestLaunch(LAUNCH_SEQUENCER_GROUNDED, f, { apexUnits: f.ceilingUnits });
    expect(at.accepted).toBe(true);
  });

  it("a corrupt field refuses everything (bad-field)", () => {
    const broken = { ...field(), gravityUnitsPerS2: 0 };
    const v = requestLaunch(LAUNCH_SEQUENCER_GROUNDED, broken, { apexRung: 1 });
    expect(v.accepted).toBe(false);
    expect(v.reason).toBe("bad-field");
  });

  it("v₀ = √(2·g·apex) and the loading stroke is the peak-force minimum", () => {
    const f = field();
    for (const rung of [0, 1, 2] as const) {
      const v = requestLaunch(LAUNCH_SEQUENCER_GROUNDED, f, { apexRung: rung });
      const apex = v.state.apexUnits;
      expect(v.state.fireVY).toBeCloseTo(launchSpeedForApex(f.gravityUnitsPerS2, apex), 9);
      const stroke = minLoadingStroke(f.gravityUnitsPerS2, v.state.fireVY);
      expect(v.state.loadSeconds).toBeCloseTo(stroke.seconds, 12);
      expect(v.state.dipUnits).toBeCloseTo(stroke.depth, 9);
      // The athletic band: dips stay legible (5–25 % of body height).
      const dipFrac = v.state.dipUnits / f.homeHeightUnits;
      expect(dipFrac).toBeGreaterThan(0.05);
      expect(dipFrac).toBeLessThan(0.25);
    }
  });

  it("the gather law: area conservation, capped at 30 %", () => {
    const h = field().homeHeightUnits;
    // Uncapped region: (1 − dip/h) · width = 1 exactly.
    for (const dip of [0, h * 0.1, h * 0.29]) {
      const w = gatherWidthForDip(dip, h);
      expect((1 - dip / h) * w).toBeCloseTo(1, 9);
    }
    // Cap: a 50 % dip still reads as ≤ 30 % compression.
    expect(gatherWidthForDip(h * 0.5, h)).toBeCloseTo(1 / 0.7, 9);
    expect(gatherWidthForDip(Number.NaN, h)).toBe(1);
    expect(gatherWidthForDip(100, 0)).toBe(1);
  });

  it("the stroke is dip-then-hold: gather reaches full dip, HOLDS on the φ⁻² rhythm", () => {
    const f = field();
    for (const rung of [0, 1, 2] as const) {
      const v = requestLaunch(LAUNCH_SEQUENCER_GROUNDED, f, { apexRung: rung });
      // The hold is the canonized φ⁻² rhythm (≥ 0.35 s hold minimum).
      expect(v.state.holdSeconds).toBeCloseTo(PHI_LAW.loadRhythmSeconds, 12);
      expect(v.state.holdSeconds).toBeGreaterThanOrEqual(0.35);
      // Step to the hold: the dip completes, the gather is held.
      const atHold = stepLaunch(v.state, v.state.loadSeconds).state;
      expect(atHold.phase).toBe("holding");
      expect(loadProgress(atHold)).toBe(1);
      expect(atHold.dipUnits).toBe(v.state.dipUnits);
      expect(atHold.gatherWidthScale).toBe(v.state.gatherWidthScale);
      // Mid-hold: still gathered, still not fired.
      const midHold = stepLaunch(atHold, v.state.holdSeconds / 2);
      expect(midHold.fired).toBeUndefined();
      expect(midHold.state.phase).toBe("holding");
      expect(midHold.state.dipUnits).toBe(v.state.dipUnits);
      // A hold-phase request is also refused (not in simple contact).
      expect(requestLaunch(atHold, f, { apexRung: 0 }).accepted).toBe(false);
      // Cancel from the hold withdraws cleanly.
      expect(cancelLaunch(atHold)).toBe(LAUNCH_SEQUENCER_GROUNDED);
    }
  });

  it("fires EXACTLY when the stroke completes — not before, not after", () => {
    const f = field();
    const v = requestLaunch(LAUNCH_SEQUENCER_GROUNDED, f, {
      apexRung: 1,
      horizontalSpeedUnits: 900,
    });
    const dt = PHI_LAW.kernelStepSeconds;
    let st = v.state;
    let fired: { vx: number; vy: number } | undefined;
    let steps = 0;
    while (!fired && steps < 10000) {
      const r = stepLaunch(st, dt);
      st = r.state;
      fired = r.fired;
      steps++;
    }
    expect(fired).toBeDefined();
    expect(fired?.vx).toBe(900);
    expect(fired?.vy).toBeCloseTo(v.state.fireVY, 12);
    // The stroke lasted dip + hold (± one step).
    expect(steps * dt).toBeCloseTo(v.state.loadSeconds + v.state.holdSeconds, 2);
    // After firing the sequencer re-arms to grounded.
    expect(st.phase).toBe("grounded");
    // And no state fires on a non-positive dt.
    const idle = stepLaunch(v.state, 0);
    expect(idle.fired).toBeUndefined();
    expect(stepLaunch(LAUNCH_SEQUENCER_GROUNDED, dt).fired).toBeUndefined();
  });

  it("cancel mid-stroke withdraws the intent cleanly", () => {
    const f = field();
    const v = requestLaunch(LAUNCH_SEQUENCER_GROUNDED, f, { apexRung: 2 });
    const halfway = stepLaunch(v.state, v.state.loadSeconds / 2).state;
    expect(loadProgress(halfway)).toBeCloseTo(0.5, 1);
    const cancelled = cancelLaunch(halfway);
    expect(cancelled).toBe(LAUNCH_SEQUENCER_GROUNDED);
    expect(loadProgress(cancelled)).toBe(0);
  });

  it(
    "THE ROUND TRIP: fired through the field-driven integrator, apex and impact " +
      "speeds match the law inside the PROVABLE symplectic-Euler band",
    () => {
      const f = field();
      const g = f.gravityUnitsPerS2;
      const h = PHI_LAW.kernelStepSeconds;
      const e = PHI_LAW.restitution;
      for (const rung of [0, 1, 2] as const) {
        const v = requestLaunch(LAUNCH_SEQUENCER_GROUNDED, f, { apexRung: rung });
        const A = v.state.apexUnits;
        const v0 = v.state.fireVY;
        const { apex, impactSpeeds, final } = fly(f, v.state.fireVX, v0);

        // APEX — the discrete apex of semi-implicit Euler (velocity-first)
        // undershoots the analytic A = v0²/2g by D = g·h²·(k* + r²)/2 where
        // k* + r = v0/(g·h). Bounds: D ∈ [v0·h/2 − g·h²/2, v0·h/2 + g·h²/2].
        // We assert the derived band, not a tuned tolerance.
        const center = A - (v0 * h) / 2;
        const half = (g * h * h) / 2;
        expect(apex).toBeGreaterThan(center - half - 1e-9);
        expect(apex).toBeLessThan(center + half + 1e-9);

        // IMPACT SPEEDS — velocities live on the lattice v_L − k·g·h (gravity
        // subtracts exactly g·h per step). A flight launched at v_L lands at
        // g·h·(k*−r) if the phase residual r ≤ ½, else g·h·(k*+1−r) — so
        // |v_I − v_L| ≤ g·h EXACTLY (tight as r → ½). Restitution reflects
        // the actual impact speed exactly, so errors propagate
        // err_n ≤ e·err_{n−1} + g·h ⇒ err_n ≤ g·h·(1−eⁿ⁺¹)/(1−e).
        expect(impactSpeeds.length).toBeGreaterThanOrEqual(2);
        impactSpeeds.forEach((speed, n) => {
          const ideal = Math.pow(e, n) * v0;
          const tol = (g * h * (1 - Math.pow(e, n + 1))) / (1 - e);
          expect(Math.abs(speed - ideal)).toBeLessThanOrEqual(tol);
        });

        // The φ⁻⁶ floor swallows the tail: the body settles into contact.
        expect(final.contact).toBe(true);
        expect(final.y).toBe(0);
        // …and the bounce count respects the visibility floor (±1 for the
        // lattice jitter at the exact-floor boundary).
        const vbc = visibleBounceCount(A, f.homeHeightUnits);
        expect(impactSpeeds.length).toBeGreaterThanOrEqual(vbc);
        expect(impactSpeeds.length).toBeLessThanOrEqual(vbc + 2);
      }
    },
  );

  it("deterministic: twin launches integrate identically (same seed of one)", () => {
    const f = field();
    const v = requestLaunch(LAUNCH_SEQUENCER_GROUNDED, f, {
      apexRung: 2,
      horizontalSpeedUnits: 1200,
    });
    const a = fly(f, 1200, v.state.fireVY);
    const b = fly(f, 1200, v.state.fireVY);
    expect(a.apex).toBe(b.apex);
    expect(a.final.x).toBe(b.final.x);
    expect(a.impactSpeeds).toEqual(b.impactSpeeds);
  });
});
