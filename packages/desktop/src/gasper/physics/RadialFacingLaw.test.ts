/**
 * S8 — radial-facing law tests (radial-facing-phd-memo, N38/N39):
 * bearing → 12-slice setpoint, clock ids (12 = away), rest gate,
 * fail-closed, front-cone constant.
 */
import { describe, expect, it } from "vitest";
import { GAIT_LAW } from "./GaitLaw";
import { PHI } from "./PhiLaw";
import {
  RADIAL_FACING_LAW,
  TURNTABLE_SIDE_THICKNESS,
  facingBearingDeg,
  facingProjectionYawDeg,
  facingSliceCenterDeg,
  facingSliceId,
  facingPaintYawDeg,
  facingReadableLocomotionYawDeg,
  facingPaintOrbitYawDeg,
  READABLE_THREE_QUARTER_DEG,
  facingFarFeatureScale,
  facingNearFeatureScale,
  facingFarArmVisibility,
  facingFootTrackScale,
  facingFaceSlideAmount,
  facingHullFaceOffset,
  facingFootOverlap,
  ATLAS_SEAT,
  facingCompressFromYaw,
  facingCompress,
  facingLobeScalesFromYaw,
  facingLobeAssignFromYaw,
  FACING_FAR_LOBE_GAIN,
  facingFarEyeScale,
  facingArmOcclusion,
  faceTurnFadeFromYaw,
  backPresenceFromYaw,
  faceShiftScaleFromYaw,
  faceTurnFade,
  backPresence,
  faceShift,
  facingVerticalScale,
  shellViewYawDeg,
  facingCompressWithDepthGain,
  worldDepthScaleWithGain,
  pursueFacingDeg,
} from "./RadialFacingLaw";

describe("S8 radial facing — the clock frame (N39)", () => {
  it("bearing maps travel to the clock: toward = 0, right = +90, away = ±180", () => {
    expect(facingBearingDeg(0, -100)).toBeCloseTo(0, 9); // toward the user
    expect(facingBearingDeg(100, 0)).toBeCloseTo(90, 9); // stage right
    expect(facingBearingDeg(0, 100)).toBeCloseTo(180, 9); // away (12 o'clock)
    expect(facingBearingDeg(-100, 0)).toBeCloseTo(-90, 9); // stage left
    expect(facingBearingDeg(70.71, -70.71)).toBeCloseTo(45, 6); // 4:30
    expect(facingBearingDeg(-70.71, -70.71)).toBeCloseTo(-45, 6); // 7:30
  });

  it("below the rest-speed gate the bearing is NULL — facing holds its slice", () => {
    expect(facingBearingDeg(0, 0)).toBeNull();
    expect(facingBearingDeg(1, 1)).toBeNull(); // √2 < 40
    expect(facingBearingDeg(Number.NaN, 100)).toBeNull();
    expect(facingBearingDeg(100, Number.POSITIVE_INFINITY)).toBeNull();
    expect(facingBearingDeg(40, 0)).not.toBeNull(); // exactly at the gate
  });

  it("quantizes to the nearest 30° slice center, wrapped to ±180", () => {
    expect(facingSliceCenterDeg(0)).toBe(0);
    expect(facingSliceCenterDeg(37)).toBe(30);
    expect(facingSliceCenterDeg(44)).toBe(30); // 45° = the cone edge
    expect(facingSliceCenterDeg(46)).toBe(60); // past the shoulder
    expect(facingSliceCenterDeg(179)).toBe(180); // 12 o'clock, exact
    expect(facingSliceCenterDeg(-181)).toBe(180); // wrapped away pole
    expect(facingSliceCenterDeg(-10)).toBe(0);
    expect(facingSliceCenterDeg(Number.NaN)).toBe(0); // fail-closed frontal
  });

  it("legacy fold still exists as a named function but is NOT the paint path", () => {
    expect(facingProjectionYawDeg(90)).toBe(45);
    expect(facingProjectionYawDeg(180)).toBe(45);
    expect(facingPaintYawDeg(90)).toBe(90);
    expect(facingPaintYawDeg(180)).toBe(180);
    expect(facingPaintYawDeg(-90)).toBe(-90);
    expect(facingPaintYawDeg(37)).toBe(37);
    expect(facingPaintYawDeg(Number.NaN)).toBe(0);
  });

  it("+x stroll heading stays a readable profile; 360 law is not folded", () => {
    expect(facingPaintYawDeg(90)).toBe(90);
    expect(facingPaintYawDeg(180)).toBe(180);
    expect(facingReadableLocomotionYawDeg(facingPaintYawDeg(90))).toBe(READABLE_THREE_QUARTER_DEG);
    expect(facingReadableLocomotionYawDeg(facingPaintYawDeg(-90))).toBe(-READABLE_THREE_QUARTER_DEG);
    expect(
      facingPaintOrbitYawDeg(facingReadableLocomotionYawDeg(facingPaintYawDeg(90))),
    ).toBe(-READABLE_THREE_QUARTER_DEG);
    expect(
      facingPaintOrbitYawDeg(facingReadableLocomotionYawDeg(facingPaintYawDeg(-90))),
    ).toBe(READABLE_THREE_QUARTER_DEG);
    expect(facingPaintOrbitYawDeg(0)).toBe(0);
    expect(facingPaintOrbitYawDeg(180)).toBe(180);
    expect(READABLE_THREE_QUARTER_DEG).toBe(22);
    expect(facingReadableLocomotionYawDeg(facingPaintYawDeg(0))).toBe(0);
    expect(facingReadableLocomotionYawDeg(facingPaintYawDeg(180))).toBe(READABLE_THREE_QUARTER_DEG);
    expect(facingReadableLocomotionYawDeg(facingPaintYawDeg(37))).toBe(READABLE_THREE_QUARTER_DEG);
    expect(facingReadableLocomotionYawDeg(facingPaintYawDeg(135))).toBe(READABLE_THREE_QUARTER_DEG);
    expect(facingReadableLocomotionYawDeg(Number.NaN)).toBe(0);
  });

  it("clock ids: 6 = toward, 3 = right, 9 = left, 12 = away (the owner's pie)", () => {
    const ids: Array<[number, number]> = [
      [0, 6], [30, 7], [60, 8], [90, 9], [120, 10], [150, 11],
      [180, 12], [-150, 1], [-120, 2], [-90, 3], [-60, 4], [-30, 5],
    ];
    for (const [deg, id] of ids) {
      expect(facingSliceId(deg), `deg ${deg}`).toBe(id);
    }
    expect(facingSliceId(180)).toBe(12); // away pole
    expect(facingSliceId(-180)).toBe(12); // the other way around
    expect(facingSliceId(Number.NaN)).toBe(6); // fail-closed frontal read
  });

  it("slice boundaries round to the nearer slice (the pie has no dead zones)", () => {
    expect(facingSliceId(14)).toBe(6);
    expect(facingSliceId(16)).toBe(7);
    expect(facingSliceId(164)).toBe(11);
    expect(facingSliceId(166)).toBe(12);
  });

  it("the law's constants are φ-derived: τ = τ·φ² (the thrust constant), cone = the 2.5D range", () => {
    expect(RADIAL_FACING_LAW.pursuitTauSec).toBeCloseTo(
      GAIT_LAW.bankSmoothTauSec * PHI * PHI,
      12,
    );
    expect(RADIAL_FACING_LAW.pursuitTauSec).toBeGreaterThan(0.25);
    expect(RADIAL_FACING_LAW.pursuitTauSec).toBeLessThan(0.26);
    expect(RADIAL_FACING_LAW.frontConeDeg).toBe(45);
    expect(RADIAL_FACING_LAW.sliceCount).toBe(12);
    expect(RADIAL_FACING_LAW.sliceDeg).toBe(30);
  });
});

describe("R2 T1 — look is not a body turn", () => {
  it("telegraph attention does not rotate the shell while travel is dead", () => {
    expect(shellViewYawDeg(0, 0, 27.8, false)).toBe(0);
    expect(shellViewYawDeg(0, 0, -20, false)).toBe(0);
    expect(shellViewYawDeg(12, 0, 27.8, false)).toBe(12);
  });

  it("after motion exists, heading leads and attention may compose", () => {
    expect(shellViewYawDeg(0, 30, 10, true)).toBe(40);
    expect(shellViewYawDeg(0, 45, 0, true)).toBe(45);
  });

  it("corrupt attention fails closed and never authors a spin", () => {
    expect(shellViewYawDeg(0, 0, Number.NaN, true)).toBe(0);
    expect(shellViewYawDeg(Number.NaN, Number.NaN, 20, false)).toBe(0);
  });
});

describe("R2 T2 — depth gain is projection, not height crush", () => {
  it("frontal / home plane stay identity at any legal gain", () => {
    expect(facingCompressWithDepthGain(1, 0.85)).toBe(1);
    expect(facingCompressWithDepthGain(1, 1.1)).toBe(1);
    expect(worldDepthScaleWithGain(1, 0.85)).toBe(1);
    expect(worldDepthScaleWithGain(1, 1.1)).toBe(1);
  });

  it("gain moves thickness / foreshortening without a reciprocal height", () => {
    const mid = facingCompressWithDepthGain(0.92, 1);
    const soft = facingCompressWithDepthGain(0.92, 0.85);
    const hard = facingCompressWithDepthGain(0.92, 1.1);
    expect(mid).toBeCloseTo(0.92, 12);
    expect(soft).toBeGreaterThan(mid);
    expect(hard).toBeLessThan(mid);
    expect(worldDepthScaleWithGain(0.8, 1.1)).toBeCloseTo(0.78, 12);
    expect(worldDepthScaleWithGain(0.8, 0.85)).toBeCloseTo(0.83, 12);
  });
});

describe("R2 facing pursuit — shortest arc, no reset-through-neutral", () => {
  it("crosses the away pole the short way", () => {
    const next = pursueFacingDeg(170, -170, 0.05);
    expect(next).toBeGreaterThan(170);
    expect(next).toBeLessThanOrEqual(180);
  });

  it("holds on null-equivalent target and zero dt", () => {
    expect(pursueFacingDeg(30, Number.NaN, 0.05)).toBe(30);
    expect(pursueFacingDeg(30, 45, 0)).toBe(30);
  });
});

describe("Illustrator turntable — painted width is C0/C1 on S1", () => {
  const GATES = [45, 75, 90, 105, 135, 180];

  it("facingCompress(0) is exactly 1 — frontal home byte-identity", () => {
    expect(facingCompressFromYaw(0)).toBe(1);
    expect(facingCompressFromYaw(Number.NaN)).toBe(1);
  });

  it("90 and 180 are distinct painted states (no cone fold)", () => {
    const side = facingCompressFromYaw(90);
    const back = facingCompressFromYaw(180);
    expect(side).toBeCloseTo(TURNTABLE_SIDE_THICKNESS, 12);
    expect(back).toBeCloseTo(1, 12);
    expect(Math.abs(side - back)).toBeGreaterThan(0.05);
    expect(facingPaintYawDeg(90)).not.toBe(facingPaintYawDeg(180));
    expect(facingLobeScalesFromYaw(90).near).not.toBeCloseTo(
      facingLobeScalesFromYaw(180).near,
      3,
    );
  });

  it("facingCompress is continuous across the old snap gates", () => {
    const eps = 0.25;
    const tol = 0.002;
    for (const sign of [1, -1]) {
      for (const gate of GATES) {
        const deg = sign * gate;
        const a = facingCompressFromYaw(deg - eps);
        const b = facingCompressFromYaw(deg);
        const c = facingCompressFromYaw(deg + (gate === 180 ? -eps : eps));
        expect(Math.abs(b - a), `C0 at ${deg}-`).toBeLessThan(tol);
        expect(Math.abs(c - b), `C0 at ${deg}+`).toBeLessThan(tol);
      }
    }
  });

  it("facingCompress first difference is bounded (C1-ish) across the same gates", () => {
    const h = 0.5;
    let maxSecond = 0;
    for (const sign of [1, -1]) {
      for (const gate of GATES) {
        if (gate === 180) continue;
        const deg = sign * gate;
        const d1 = (facingCompressFromYaw(deg) - facingCompressFromYaw(deg - h)) / h;
        const d2 = (facingCompressFromYaw(deg + h) - facingCompressFromYaw(deg)) / h;
        maxSecond = Math.max(maxSecond, Math.abs(d2 - d1));
      }
    }
    expect(maxSecond).toBeLessThan(0.02);
  });

  it("lobe scales are abs |sin θ|; assignment is by yaw sign, not a 90 role-swap", () => {
    const left = facingLobeScalesFromYaw(-90);
    const right = facingLobeScalesFromYaw(90);
    const front = facingLobeScalesFromYaw(0);
    const back = facingLobeScalesFromYaw(180);
    expect(front.near).toBeCloseTo(1, 12);
    expect(front.far).toBeCloseTo(1, 12);
    expect(back.near).toBeCloseTo(1, 12);
    expect(back.far).toBeCloseTo(1, 12);
    expect(right.near).toBeCloseTo(1.05, 12);
    expect(right.far).toBeCloseTo(1 - FACING_FAR_LOBE_GAIN, 12);
    expect(left.near).toBeCloseTo(right.near, 12);
    expect(left.far).toBeCloseTo(right.far, 12);
    const walkRight = facingLobeAssignFromYaw(-65);
    const turntable = facingLobeAssignFromYaw(65);
    expect(walkRight.left).toBeGreaterThan(walkRight.right);
    expect(walkRight.right).toBeGreaterThan(0.80);
    expect(walkRight.right).toBeLessThan(walkRight.left);
    expect(turntable.right).toBeGreaterThan(turntable.left);
    const a = facingLobeScalesFromYaw(89.5).near;
    const b = facingLobeScalesFromYaw(90.5).near;
    expect(Math.abs(b - a)).toBeLessThan(0.002);
  });

  it("face fade is C1 through the shoulder and never a 1-frame vanish", () => {
    expect(faceTurnFadeFromYaw(0)).toBe(0);
    expect(faceTurnFadeFromYaw(45)).toBe(0);
    expect(faceTurnFadeFromYaw(75)).toBe(0);
    expect(faceTurnFadeFromYaw(90)).toBe(0);
    expect(faceTurnFadeFromYaw(110)).toBe(0);
    expect(faceTurnFadeFromYaw(132)).toBeGreaterThan(0);
    expect(faceTurnFadeFromYaw(132)).toBeLessThan(1);
    expect(faceTurnFadeFromYaw(155)).toBe(1);
    expect(Math.abs(faceTurnFadeFromYaw(131.5) - faceTurnFadeFromYaw(132.5))).toBeLessThan(0.08);
    expect(faceShiftScaleFromYaw(0)).toBe(1);
    expect(faceShiftScaleFromYaw(180)).toBe(0);
  });

  it("backPresence is C1 and silent in the front cone", () => {
    expect(backPresenceFromYaw(0)).toBe(0);
    expect(backPresenceFromYaw(45)).toBe(0);
    expect(backPresenceFromYaw(100)).toBe(0);
    expect(backPresenceFromYaw(140)).toBe(1);
    expect(Math.abs(backPresenceFromYaw(119.5) - backPresenceFromYaw(120.5))).toBeLessThan(0.08);
  });



  it("facingCompress 1 deg neighbors stay continuous across old snap gates", () => {
    // Analytic max |dw/dtheta| ~= 1.75e-3 per degree at 45/135; 1e-3 is under the C-inf slope.
    // A cone-fold snap is ~0.08. Bar is 2e-3/deg so we still fail any discrete jump.
    const tol = 2e-3;
    for (const sign of [1, -1]) {
      for (const gate of GATES) {
        const deg = sign * gate;
        const a = facingCompress(deg - 1);
        const b = facingCompress(deg);
        const c = facingCompress(deg + 1);
        expect(Math.abs(b - a), `1deg at ${deg}-`).toBeLessThan(tol);
        expect(Math.abs(c - b), `1deg at ${deg}+`).toBeLessThan(tol);
      }
    }
  });

  it("short-name aliases and facingVerticalScale=1 are the paint contract", () => {
    expect(facingVerticalScale).toBe(1);
    expect(faceTurnFade(90)).toBe(faceTurnFadeFromYaw(90));
    expect(backPresence(120)).toBe(backPresenceFromYaw(120));
    expect(faceShift(0)).toBe(1);
    expect(faceShift(180)).toBe(0);
  });
  it("pursueFacingDeg still shortest-arc — no unwind through the lens", () => {
    const next = pursueFacingDeg(170, -170, 0.05);
    expect(next).toBeGreaterThan(170);
    expect(next).toBeLessThanOrEqual(180);
    const back = pursueFacingDeg(-170, 170, 0.05);
    expect(back).toBeLessThan(-170);
    expect(back).toBeGreaterThanOrEqual(-180);
  });
});

describe("true 3/4 — far diminish, arm occlusion, foot overlap", () => {
  it("far-side features diminish with yaw and never enlarge", () => {
    expect(facingFarFeatureScale(0)).toBeCloseTo(1, 9);
    expect(facingFarFeatureScale(45)).toBeLessThan(facingFarFeatureScale(0));
    expect(facingFarFeatureScale(65)).toBeLessThan(facingFarFeatureScale(45));
    expect(facingFarFeatureScale(90)).toBeLessThan(facingFarFeatureScale(65));
    expect(facingFarFeatureScale(65)).toBeLessThan(1);
    expect(facingFarFeatureScale(-65)).toBeCloseTo(facingFarFeatureScale(65), 9);
    expect(facingNearFeatureScale(65)).toBe(1);
    expect(facingNearFeatureScale(90)).toBe(1);
  });

  it("at ~3/4 the far arm tucks in perspective, continuously", () => {
    expect(facingFarArmVisibility(0)).toBeCloseTo(1, 5);
    expect(facingFarArmVisibility(20)).toBeCloseTo(1, 5);
    expect(facingFarArmVisibility(65)).toBeGreaterThan(0.85);
    expect(facingFarArmVisibility(90)).toBeGreaterThan(0.3);
    expect(facingFarArmVisibility(90)).toBeLessThan(facingFarArmVisibility(65));
    expect(facingFarArmVisibility(125)).toBeCloseTo(0, 2);
  });

  it("feet overlap on the path in 3/4 (track narrows, no width snap)", () => {
    expect(facingFootTrackScale(0)).toBeCloseTo(1, 9);
    expect(facingFootTrackScale(45)).toBeGreaterThan(facingFootTrackScale(65));
    expect(facingFootTrackScale(65)).toBeLessThan(0.45);
    expect(facingFootTrackScale(90)).toBeCloseTo(0, 9);
    const a = facingFootTrackScale(40);
    const b = facingFootTrackScale(41);
    expect(Math.abs(a - b)).toBeLessThan(0.03);
  });
});

describe("true 3/4 cues — no yaw width snap", () => {
  it("front is identity; far eye shrinks continuously with |sin(yaw)|", () => {
    const front = facingFarEyeScale(0);
    expect(front.left).toBe(1);
    expect(front.right).toBe(1);
    const q = facingFarEyeScale(45);
    expect(q.left).toBeGreaterThan(0.90);
    expect(q.left).toBeLessThan(0.94);
    expect(q.right).toBe(1);
    expect(facingFarEyeScale(-45).right).toBeCloseTo(q.left, 9);
    expect(Math.abs(facingFarEyeScale(44).left - facingFarEyeScale(46).left)).toBeLessThan(0.02);
  });
  it("far arm occludes through the 3/4 cone, near stays 1", () => {
    expect(facingArmOcclusion(0).far).toBe(1);
    expect(facingArmOcclusion(45).far).toBe(1);
    expect(facingArmOcclusion(45).near).toBe(1);
    expect(facingArmOcclusion(90).far).toBeLessThan(facingArmOcclusion(65).far);
    expect(facingArmOcclusion(65).far).toBeGreaterThan(0.85);
  });
  it("feet overlap seats on the Atlas foot window — 3/4 stacks on the path, not a width snap", () => {
    expect(facingFootOverlap(0)).toBe(0);
    expect(facingFootOverlap(ATLAS_SEAT.footOnDeg)).toBe(0);
    expect(facingFootOverlap(65)).toBeGreaterThan(0.4);
    expect(facingFootOverlap(ATLAS_SEAT.footSeatedDeg)).toBeCloseTo(1, 9);
    expect(facingFootOverlap(90)).toBeCloseTo(1, 9);
    expect(facingCompressFromYaw(45)).toBeGreaterThan(0.93);
    expect(facingCompressFromYaw(44)).toBeCloseTo(facingCompressFromYaw(46), 2);
  });
});

describe("Atlas Seat — face leads, hull follows, then lock", () => {
  it("drawing seats in order: face, far arm, legs", () => {
    const midFace = (ATLAS_SEAT.faceOnDeg + ATLAS_SEAT.faceSeatedDeg) / 2;
    expect(facingFaceSlideAmount(midFace)).toBeGreaterThan(0.4);
    expect(facingFarArmVisibility(midFace)).toBeGreaterThan(0.85);
    expect(facingFootOverlap(midFace)).toBeLessThan(0.08);
    const midArm = 70;
    expect(facingFaceSlideAmount(midArm)).toBeGreaterThan(0.85);
    expect(facingFarArmVisibility(midArm)).toBeGreaterThan(0.7);
    expect(facingFootOverlap(midArm)).toBeGreaterThan(0.4);
    expect(facingFaceSlideAmount(65)).toBeGreaterThan(0.95);
    expect(facingFarArmVisibility(65)).toBeGreaterThan(0.85);
    expect(facingFootOverlap(65)).toBeGreaterThan(0.55);
  });

  it("hull face offset is identity at front and slides, never a ±18 card", () => {
    const z = facingHullFaceOffset(0, 82);
    expect(z.x).toBeCloseTo(0, 9);
    expect(z.y).toBeCloseTo(0, 9);
    const r = facingHullFaceOffset(65, 82);
    const l = facingHullFaceOffset(-65, 82);
    expect(r.x).toBeGreaterThan(8);
    expect(l.x).toBeCloseTo(-r.x, 9);
    expect(Math.abs(r.x)).toBeLessThan(82);
  });

  it("front is identity: both arms, no foot overlap, no face slide", () => {
    expect(facingFaceSlideAmount(0)).toBe(0);
    expect(facingFarArmVisibility(0)).toBeCloseTo(1, 5);
    expect(facingFootOverlap(0)).toBe(0);
    expect(facingFootTrackScale(0)).toBeCloseTo(1, 9);
  });
});
