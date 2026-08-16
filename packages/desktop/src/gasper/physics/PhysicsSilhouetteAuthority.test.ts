import { describe, expect, it } from "vitest";
import {
  admitPhysicsSilhouetteDeltas,
  composeSilhouetteAdmissions,
  PHYSICS_CHANNEL_BOUNDS,
  PHYSICS_SILHOUETTE_CONSTANTS,
  PHYSICS_SILHOUETTE_IDENTITY_BASE,
  physicsSilhouetteAdmission,
  physicsSilhouetteDeltas,
  stepPhysicsSilhouetteEnvelope,
  ZERO_PHYSICS_ENVELOPE,
} from "./PhysicsSilhouetteAuthority";

const BASE = { overall_width: 1, overall_height: 1, ground_flattening: 0 };

describe("GASPER-SPACE-001 PHASE B physics silhouette authority", () => {
  it("zero envelope = identity: no deltas, fence stays closed", () => {
    expect(physicsSilhouetteDeltas(ZERO_PHYSICS_ENVELOPE, 1)).toEqual({});
    expect(physicsSilhouetteAdmission(BASE, ZERO_PHYSICS_ENVELOPE, 1)).toEqual({});
  });

  it("identity base is host-scale 1,1 -- a 0,0 fallback would collapse the body", () => {
    expect(PHYSICS_SILHOUETTE_IDENTITY_BASE.overall_width).toBe(1);
    expect(PHYSICS_SILHOUETTE_IDENTITY_BASE.overall_height).toBe(1);
    expect(PHYSICS_SILHOUETTE_IDENTITY_BASE.ground_flattening).toBe(0);
    const gather = physicsSilhouetteDeltas(
      { impact: 0, impactV: 0, stretch: 0, gather: 1, verticalGather: true },
      1,
    );
    const admitted = admitPhysicsSilhouetteDeltas(PHYSICS_SILHOUETTE_IDENTITY_BASE, gather);
    expect(admitted.overall_height).toBeGreaterThan(0.6);
    expect(admitted.overall_width ?? 1).toBeGreaterThan(0.9);
    const collapsed = admitPhysicsSilhouetteDeltas(
      { overall_width: 0, overall_height: 0, ground_flattening: 0 },
      gather,
    );
    expect(collapsed.overall_height ?? 0).toBeLessThan(0.2);
  });

  it("intensity 0 collapses the authority regardless of envelope", () => {
    const env = stepPhysicsSilhouetteEnvelope(
      ZERO_PHYSICS_ENVELOPE,
      { impactSpeed: 1400, airSpeed: 0, contact: true, gatherTarget: 0 },
      1 / 60,
    );
    expect(env.impact).toBeGreaterThan(0.9);
    expect(physicsSilhouetteDeltas(env, 0)).toEqual({});
  });

  it("impact charges the squash envelope and decays on the pop-back tau", () => {
    let env = stepPhysicsSilhouetteEnvelope(
      ZERO_PHYSICS_ENVELOPE,
      { impactSpeed: 1400, airSpeed: 0, contact: true, gatherTarget: 0 },
      1 / 60,
    );
    // charged to ~1 then decays on the same tick (tau 0.16s) => ~0.9 at 60Hz
    expect(env.impact).toBeGreaterThan(0.85);
    const d0 = physicsSilhouetteDeltas(env, 1);
    expect(d0.overall_height).toBeLessThan(-0.25); // squash = shorter
    expect(d0.overall_width).toBeGreaterThan(0.2); // squash = wider
    expect(d0.ground_flattening).toBeGreaterThan(0.4); // pancake on the floor
    for (let i = 0; i < 90; i++) {
      env = stepPhysicsSilhouetteEnvelope(env, { impactSpeed: 0, airSpeed: 0, contact: true, gatherTarget: 0 }, 1 / 60);
    }
    expect(env.impact).toBe(0); // popped back + snapped below the 0.001 floor
  });

  it("airborne speed stretches (taller + narrower); contact zeroes the target", () => {
    let env = ZERO_PHYSICS_ENVELOPE;
    for (let i = 0; i < 30; i++) {
      env = stepPhysicsSilhouetteEnvelope(env, { impactSpeed: 0, airSpeed: 1200, contact: false, gatherTarget: 0 }, 1 / 60);
    }
    expect(env.stretch).toBeGreaterThan(0.9);
    const d = physicsSilhouetteDeltas(env, 1);
    expect(d.overall_height).toBeGreaterThan(0.1);
    expect(d.overall_width).toBeLessThan(-0.08);
    for (let i = 0; i < 90; i++) {
      env = stepPhysicsSilhouetteEnvelope(env, { impactSpeed: 0, airSpeed: 0, contact: true, gatherTarget: 0 }, 1 / 60);
    }
    expect(env.stretch).toBe(0); // eased out + snapped below the 0.001 floor
  });

  it("collapses airborne stretch on the impact tick so contact squash is not canceled", () => {
    let env = ZERO_PHYSICS_ENVELOPE;
    for (let i = 0; i < 30; i++) {
      env = stepPhysicsSilhouetteEnvelope(env, { impactSpeed: 0, airSpeed: 1200, contact: false, gatherTarget: 0 }, 1 / 60);
    }
    expect(env.stretch).toBeGreaterThan(0.9);

    const impact = stepPhysicsSilhouetteEnvelope(
      env,
      { impactSpeed: 1400, airSpeed: 1200, contact: false, gatherTarget: 0 },
      1 / 240,
    );
    const deltas = physicsSilhouetteDeltas(impact, 0.7);

    expect(impact.stretch).toBe(0);
    expect(deltas.overall_height).toBeLessThan(-0.18);
    expect(deltas.overall_width).toBeGreaterThan(0.14);
  });

  it("gather eases off over a hold, not one beat", () => {
    let env = { ...ZERO_PHYSICS_ENVELOPE, gather: 0.618 };
    env = stepPhysicsSilhouetteEnvelope(
      env,
      { impactSpeed: 0, airSpeed: 0, contact: true, gatherTarget: 0 },
      1 / 120,
    );
    expect(env.gather).toBeGreaterThan(0.55);
    for (let i = 0; i < 36; i++) {
      env = stepPhysicsSilhouetteEnvelope(
        env,
        { impactSpeed: 0, airSpeed: 0, contact: true, gatherTarget: 0 },
        1 / 120,
      );
    }
    expect(env.gather).toBeGreaterThan(0.25);
    for (let i = 0; i < 180; i++) {
      env = stepPhysicsSilhouetteEnvelope(
        env,
        { impactSpeed: 0, airSpeed: 0, contact: true, gatherTarget: 0 },
        1 / 120,
      );
    }
    expect(env.gather).toBeLessThan(0.08);
  });

  it("gather eases toward the authored anticipation target", () => {
    let env = ZERO_PHYSICS_ENVELOPE;
    for (let i = 0; i < 40; i++) {
      env = stepPhysicsSilhouetteEnvelope(env, { impactSpeed: 0, airSpeed: 0, contact: true, gatherTarget: 1, gatherAxis: "vertical" }, 1 / 60);
    }
    expect(env.gather).toBeGreaterThan(0.9);
    expect(env.verticalGather).toBe(true);
    const d = physicsSilhouetteDeltas(env, 1);
    expect(d.overall_height).toBeLessThan(-0.22);
    expect(d.overall_height).toBeGreaterThan(-0.35);
    expect(d.ground_flattening).toBeUndefined();
    const expected = -PHYSICS_SILHOUETTE_CONSTANTS.launchScrunchCompression * env.gather;
    expect(Math.abs((d.overall_height ?? 0) - expected)).toBeLessThan(1e-6);
    expect((d.overall_width ?? 0)).toBeLessThan(-0.04);
  });

  it("vertical walk gather at typical charge is a small volume-conserving step", () => {
    const env = { impact: 0, impactV: 0, stretch: 0, gather: 0.6, verticalGather: true };
    const d = physicsSilhouetteDeltas(env, 0.7);
    expect(d.overall_height).toBeLessThan(-0.07);
    expect(d.overall_height).toBeGreaterThan(-0.15);
    expect(Math.abs(d.overall_width ?? 0)).toBeLessThan(0.02);
    expect(d.ground_flattening).toBeUndefined();
  });

  it("deltas never escape the physics fence bounds", () => {
    const hot = { impact: 5, stretch: 5, gather: 5 }; // absurd overcharge
    const d = physicsSilhouetteDeltas(hot, 1);
    for (const [ch, v] of Object.entries(d)) {
      const b = PHYSICS_CHANNEL_BOUNDS[ch as keyof typeof PHYSICS_CHANNEL_BOUNDS];
      expect(v).toBeGreaterThanOrEqual(b.min);
      expect(v).toBeLessThanOrEqual(b.max);
    }
  });

  it("admission emits absolute values = base + delta and skips missing bases", () => {
    const env = stepPhysicsSilhouetteEnvelope(
      ZERO_PHYSICS_ENVELOPE,
      { impactSpeed: 1400, airSpeed: 0, contact: true, gatherTarget: 0 },
      1 / 60,
    );
    const adm = physicsSilhouetteAdmission(BASE, env, 1);
    expect(adm.overall_height).toBeLessThan(0.75);
    expect(adm.overall_width).toBeGreaterThan(1.2);
    const partial = physicsSilhouetteAdmission({ overall_height: 1 }, env, 1);
    expect(Object.keys(partial)).toEqual(["overall_height"]);
  });

  it("composition law: physics wins per channel while armed; empty physics leaves scene untouched", () => {
    const scene = { overall_height: 1.05, overall_width: 0.96 };
    expect(composeSilhouetteAdmissions(scene, undefined)).toBe(scene);
    expect(composeSilhouetteAdmissions(scene, {})).toBe(scene);
    const physics = { overall_height: 0.7 };
    const composed = composeSilhouetteAdmissions(scene, physics);
    expect(composed?.overall_height).toBe(0.7); // physics wins
    expect(composed?.overall_width).toBe(0.96); // scene passes through
  });

  it("idle is painter-owned — deltas do not add a second height pulse", () => {
    const rest = physicsSilhouetteDeltas({ ...ZERO_PHYSICS_ENVELOPE, idle: 0 }, 0.7);
    const peak = physicsSilhouetteDeltas({ ...ZERO_PHYSICS_ENVELOPE, idle: 1 }, 0.7);
    const trough = physicsSilhouetteDeltas({ ...ZERO_PHYSICS_ENVELOPE, idle: -1 }, 0.7);
    expect(peak.overall_height ?? 0).toBe(0);
    expect(trough.overall_height ?? 0).toBe(0);
    expect(peak.overall_width ?? 0).toBe(0);
    expect(trough.overall_width ?? 0).toBe(0);
    expect(rest.overall_height ?? 0).toBe(0);
    const held = { impact: 0, impactV: 0, stretch: 0, gather: 0.6, take: 0.08, idle: 1, verticalGather: true };
    const heldPeak = physicsSilhouetteDeltas(held, 0.7);
    const heldTrough = physicsSilhouetteDeltas({ ...held, idle: -1 }, 0.7);
    const heldZero = physicsSilhouetteDeltas({ ...held, idle: 0 }, 0.7);
    expect(heldPeak.overall_height).toBeCloseTo(heldZero.overall_height ?? 0, 6);
    expect(heldTrough.overall_height).toBeCloseTo(heldZero.overall_height ?? 0, 6);
    expect(heldPeak.overall_width ?? 0).toBeCloseTo(heldTrough.overall_width ?? 0, 6);
  });

  it("non-finite dt leaves the envelope untouched", () => {
    const env = { impact: 0.5, stretch: 0.2, gather: 0.1 };
    expect(stepPhysicsSilhouetteEnvelope(env, { impactSpeed: 0, airSpeed: 0, contact: false, gatherTarget: 0 }, Number.NaN)).toBe(env);
  });

  it("D-0112: the squash release is an underdamped φ-settle (follow-through ≈ 8.4%)", () => {
    let env = stepPhysicsSilhouetteEnvelope(
      ZERO_PHYSICS_ENVELOPE,
      { impactSpeed: 1400, airSpeed: 0, contact: true, gatherTarget: 0 },
      1 / 240,
    );
    const charge = env.impact;
    expect(charge).toBeGreaterThan(0.9);
    let minImpact = 0;
    for (let i = 0; i < 240; i++) {
      env = stepPhysicsSilhouetteEnvelope(
        env,
        { impactSpeed: 0, airSpeed: 0, contact: true, gatherTarget: 0 },
        1 / 240,
      );
      minImpact = Math.min(minImpact, env.impact);
    }
    // The pop-back crosses round into a follow-through stretch: overshoot
    // e^(−ζπ/√(1−ζ²)) ≈ 8.46% of the charge at ζ = 1/φ (CanonOps memo §g).
    const ratio = -minImpact / charge;
    expect(ratio).toBeGreaterThan(0.07);
    expect(ratio).toBeLessThan(0.1);
    // …and the negative (stretch) side of the settle reads on the channels.
    const d = physicsSilhouetteDeltas({ ...env, impact: minImpact }, 1);
    expect(d.overall_height).toBeGreaterThan(0);
  });
});
