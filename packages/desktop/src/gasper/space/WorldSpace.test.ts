/**
 * GASPER-SPACE-001 · PHASE A — world stage coordinate proofs.
 * GASPER-CRAFT-002 · S2 (D-0099 Monitor Doctrine) — the DEPTH LAW proofs:
 * projection scale, floor-plane coupling, frustum bounds, depth fences.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  WORLD_HOME_POSE,
  WORLD_PROVENANCE_SET,
  WORLD_SPACE_CONSTANTS,
  clampWorldPose,
  clampWorldPoseCommand,
  collapseWorldPose,
  depthScaleAt,
  horizonLiftPxAt,
  validateWorldProvenance,
  worldBoundsAt,
  worldPoseEquals,
  worldPoseInsideBounds,
  worldPoseIsHome,
  worldPoseToContentOffset,
} from "./WorldSpace";

describe("WorldSpace — clamp fence", () => {
  it("fails closed to home for malformed payloads", () => {
    expect(clampWorldPose(undefined)).toEqual(WORLD_HOME_POSE);
    expect(clampWorldPose("nope")).toEqual(WORLD_HOME_POSE);
    expect(clampWorldPose({ x: NaN, y: Infinity, z: "deep" })).toEqual(
      WORLD_HOME_POSE,
    );
  });

  it("clamps to the frustum fence", () => {
    const c = WORLD_SPACE_CONSTANTS;
    const p = clampWorldPose({
      x: 10_000,
      y: -40,
      z: 9000,
      tilt: 900,
    });
    expect(p.z).toBe(c.zFar);
    const b = worldBoundsAt(c.zFar);
    expect(p.x).toBe(b.xHalf); // the frustum is wider in the distance
    expect(p.y).toBe(0); // altitude never goes below the floor
    expect(p.tilt).toBe(c.maxTiltDeg);
  });

  it("clamps x against the frustum at the payload's OWN depth", () => {
    const c = WORLD_SPACE_CONSTANTS;
    // At the glass the frustum is narrow: 960 / 1.2 = 800 (N35 glass law).
    const p = clampWorldPose({ x: 900, y: 0, z: c.zNear, tilt: 0 });
    expect(p.x).toBeCloseTo(800, 6);
    // In the distance the same command stays inside: 960 / 0.35 ≈ 2743.
    const q = clampWorldPose({ x: 900, y: 0, z: c.zFar, tilt: 0 });
    expect(q.x).toBe(900);
  });

  it("keeps in-fence poses untouched", () => {
    const p = clampWorldPose({ x: -480, y: 320, z: 200, tilt: -12 });
    expect(p).toEqual({ x: -480, y: 320, z: 200, tilt: -12 });
  });
});

describe("WorldSpace — provenance fence", () => {
  it("accepts only the closed provenance set", () => {
    expect(validateWorldProvenance("physics-authority")).toBe(
      "physics-authority",
    );
    expect(validateWorldProvenance("scene-authority")).toBe("scene-authority");
    expect(validateWorldProvenance("capture-drive")).toBe("capture-drive");
    expect(validateWorldProvenance("curve-authority")).toBe("curve-authority");
    expect(validateWorldProvenance("wander-authority")).toBe("wander-authority");
    // GASPER-ALIVE-001 · D-0108: the life director's approach legs.
    expect(validateWorldProvenance("life-authority")).toBe("life-authority");
    expect(validateWorldProvenance("god-mode")).toBe("none");
    expect(validateWorldProvenance(42)).toBe("none");
  });

  it("unprovenanced commands fail closed to home", () => {
    const cmd = clampWorldPoseCommand({ x: 800, provenance: "unknown" });
    expect(cmd.provenance).toBe("none");
    expect(cmd.pose).toEqual(WORLD_HOME_POSE);
  });

  it("provenanced commands carry the clamped pose", () => {
    const cmd = clampWorldPoseCommand({
      x: 480,
      y: 120,
      z: 0,
      tilt: 8,
      provenance: "physics-authority",
    });
    expect(cmd.provenance).toBe("physics-authority");
    expect(cmd.pose).toEqual({ x: 480, y: 120, z: 0, tilt: 8 });
  });
});

describe("WorldSpace — the projection law (D-0099 Doctrine 1)", () => {
  it("home scale is exactly 1", () => {
    expect(depthScaleAt(0)).toBe(1);
  });

  it("the monitor glass reads 1.2× home (N35 owner cap); the far fade ≈0.35×", () => {
    const c = WORLD_SPACE_CONSTANTS;
    expect(depthScaleAt(c.zNear)).toBeCloseTo(1.2, 6);
    expect(depthScaleAt(c.zFar)).toBeCloseTo(0.35, 2);
  });

  it("fences corrupt depth — never divides by ≤ 0", () => {
    const c = WORLD_SPACE_CONSTANTS;
    expect(depthScaleAt(-999999)).toBe(depthScaleAt(c.zNear));
    // Non-finite depths fall back to home (fail closed, never a division blowup).
    expect(depthScaleAt(Infinity)).toBe(1);
    expect(depthScaleAt(NaN)).toBe(1);
    expect(Number.isFinite(depthScaleAt(-c.homeViewDistance * 2))).toBe(true);
  });

  it("scale is strictly monotone: nearer = bigger", () => {
    let prev = depthScaleAt(WORLD_SPACE_CONSTANTS.zNear);
    for (let z = WORLD_SPACE_CONSTANTS.zNear + 100; z <= WORLD_SPACE_CONSTANTS.zFar; z += 100) {
      const s = depthScaleAt(z);
      expect(s).toBeLessThan(prev);
      prev = s;
    }
  });
});

describe("WorldSpace — the floor-plane law (feet stay planted)", () => {
  it("home anchor sits exactly on the home floor line (lift 0)", () => {
    expect(horizonLiftPxAt(0)).toBe(0);
  });

  it("the far fade converges toward the horizon; the horizon is the bound", () => {
    const c = WORLD_SPACE_CONSTANTS;
    // lift(zFar) = floorToHorizonPx · (1 − 0.35) — the anchor approaches the
    // horizon; the fence keeps z finite, and the lift is bounded above by
    // floorToHorizonPx itself (the horizon line), monotone in z.
    expect(horizonLiftPxAt(c.zFar)).toBeCloseTo(c.floorToHorizonPx * (1 - 0.35), 1);
    expect(horizonLiftPxAt(c.zFar)).toBeLessThan(c.floorToHorizonPx);
    let prev = horizonLiftPxAt(c.zNear);
    for (let z = c.zNear + 400; z <= c.zFar; z += 400) {
      const lift = horizonLiftPxAt(z);
      expect(lift).toBeGreaterThan(prev);
      expect(lift).toBeLessThan(c.floorToHorizonPx);
      prev = lift;
    }
  });

  it("approaching the glass moves the floor anchor DOWN (near = low + big)", () => {
    expect(horizonLiftPxAt(WORLD_SPACE_CONSTANTS.zNear)).toBeLessThan(0);
  });

  it("screen position scales with the SAME projection as size (pinhole law)", () => {
    // A floor point at half the frustum width of its own depth: its screen
    // offset must scale exactly like the body does — off.dx = (x/8)·scale.
    const c = WORLD_SPACE_CONSTANTS;
    for (const z of [c.zNear, -500, 0, 800, c.zFar]) {
      const s = depthScaleAt(z);
      const x = worldBoundsAt(z).xHalf * 0.5; // in-fence at this depth
      const off = worldPoseToContentOffset({ x, y: 0, z, tilt: 0 });
      expect(off.dx).toBeCloseTo((x / c.unitsPerContentPx) * s, 6);
    }
  });
});

describe("WorldSpace — frustum bounds (D-0099 Doctrine 2)", () => {
  it("home bounds are the authored desktop", () => {
    const b = worldBoundsAt(0);
    expect(b.xHalf).toBe(WORLD_SPACE_CONSTANTS.extentWidth / 2);
    expect(b.yMax).toBe(WORLD_SPACE_CONSTANTS.extentHeight);
    expect(b.zMin).toBe(WORLD_SPACE_CONSTANTS.zNear);
    expect(b.zMax).toBe(WORLD_SPACE_CONSTANTS.zFar);
  });

  it("the frustum widens with depth and narrows at the glass", () => {
    const near = worldBoundsAt(WORLD_SPACE_CONSTANTS.zNear);
    const far = worldBoundsAt(WORLD_SPACE_CONSTANTS.zFar);
    expect(near.xHalf).toBeCloseTo(800, 6); // 960 / 1.2 (N35 glass)
    expect(far.xHalf).toBeCloseTo(960 / 0.35, 0); // ≈ 2743
    expect(far.yMax).toBeGreaterThan(worldBoundsAt(0).yMax);
  });

  it("worldPoseInsideBounds gates the box at the pose's own depth", () => {
    expect(worldPoseInsideBounds({ x: 0, y: 0, z: 0, tilt: 0 })).toBe(true);
    expect(worldPoseInsideBounds({ x: 900, y: 0, z: WORLD_SPACE_CONSTANTS.zNear, tilt: 0 })).toBe(false); // outside the glass frustum
    expect(worldPoseInsideBounds({ x: 900, y: 0, z: WORLD_SPACE_CONSTANTS.zFar, tilt: 0 })).toBe(true); // fine in the distance
    expect(worldPoseInsideBounds({ x: 0, y: 2000, z: 0, tilt: 0 })).toBe(false); // above the ceiling
    expect(worldPoseInsideBounds({ x: 0, y: 2000, z: WORLD_SPACE_CONSTANTS.zFar, tilt: 0 })).toBe(true);
  });
});

describe("WorldSpace — content mapping", () => {
  it("home maps to identity", () => {
    const off = worldPoseToContentOffset(WORLD_HOME_POSE);
    expect(off.dx).toBe(0);
    expect(off.dy).toBe(0);
    expect(off.screenAltitudePx).toBe(0);
    expect(off.depthScale).toBe(1);
    expect(off.horizonShiftPx).toBe(0);
  });

  it("a full half-world traverse spans half the content viewBox at home", () => {
    const c = WORLD_SPACE_CONSTANTS;
    const off = worldPoseToContentOffset({
      x: c.extentWidth / 2,
      y: 0,
      z: 0,
      tilt: 0,
    });
    expect(off.dx).toBeCloseTo(120, 6); // 1920/2 world / 8 = 120 content px
  });

  it("altitude maps to content lift; screen altitude carries the projection", () => {
    const home = worldPoseToContentOffset({ x: 0, y: 800, z: 0, tilt: 0 });
    expect(home.dy).toBeCloseTo(100, 6);
    expect(home.screenAltitudePx).toBeCloseTo(100, 6);
    const far = worldPoseToContentOffset({
      x: 0,
      y: 800,
      z: WORLD_SPACE_CONSTANTS.zFar,
      tilt: 0,
    });
    expect(far.dy).toBeCloseTo(100, 6); // world altitude unchanged…
    expect(far.screenAltitudePx).toBeCloseTo(100 * far.depthScale, 6); // …but reads smaller
  });

  it("is deterministic (same input => same output, frozen)", () => {
    const pose = { x: -300, y: 150, z: 350, tilt: 9 };
    const first = worldPoseToContentOffset(pose);
    const second = worldPoseToContentOffset({ ...pose });
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
  });
});

describe("WorldSpace — reduced-motion collapse", () => {
  it("strength 0 collapses exactly to home", () => {
    const p = collapseWorldPose({ x: 640, y: 400, z: 600, tilt: 30 }, 0);
    expect(worldPoseIsHome(p)).toBe(true);
  });

  it("strength 1 preserves the pose", () => {
    const pose = { x: 640, y: 400, z: 600, tilt: 30 };
    expect(collapseWorldPose(pose, 1)).toEqual(pose);
  });

  it("scales linearly between", () => {
    const p = collapseWorldPose({ x: 800, y: 200, z: 1000, tilt: 40 }, 0.5);
    expect(p.x).toBeCloseTo(400, 6);
    expect(p.y).toBeCloseTo(100, 6);
    expect(p.z).toBeCloseTo(500, 6);
    expect(p.tilt).toBeCloseTo(20, 6);
  });
});

describe("WorldSpace — equality helpers", () => {
  it("worldPoseEquals honors epsilon", () => {
    expect(
      worldPoseEquals({ x: 1, y: 0, z: 0, tilt: 0 }, { x: 1.0000001, y: 0, z: 0, tilt: 0 }),
    ).toBe(true);
    expect(
      worldPoseEquals({ x: 1, y: 0, z: 0, tilt: 0 }, { x: 2, y: 0, z: 0, tilt: 0 }),
    ).toBe(false);
  });
});

describe("WorldSpace — TS↔AS3 renderer mirror (C4 idiom, machine-enforced)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const bundle = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");

  it("the AS3 WORLD_SPACE literal mirrors the TS depth-law constants exactly", () => {
    const m = bundle.match(/const WORLD_SPACE=Object\.freeze\(\{([^}]+)\}\)/);
    expect(m).not.toBe(null);
    const lit = m![1];
    const val = (key: string): number => {
      const km = lit.match(new RegExp(`${key}:(-?[0-9.]+)`));
      expect(km, `AS3 WORLD_SPACE.${key}`).not.toBe(null);
      return Number(km![1]);
    };
    const c = WORLD_SPACE_CONSTANTS;
    expect(val("unitsPerContentPx")).toBe(c.unitsPerContentPx);
    expect(val("xHalf")).toBe(c.extentWidth / 2);
    expect(val("yMax")).toBe(c.extentHeight);
    expect(val("maxTiltDeg")).toBe(c.maxTiltDeg);
    expect(val("homeViewDistance")).toBe(c.homeViewDistance);
    expect(val("zNear")).toBe(c.zNear);
    expect(val("zFar")).toBe(c.zFar);
    expect(val("floorToHorizonPx")).toBe(c.floorToHorizonPx);
    expect(val("releaseTau")).toBe(c.releaseTauSeconds);
  });

  it("the retired smoothing + lane constants are GONE from the renderer", () => {
    expect(bundle.includes("WORLD_SPACE.tau")).toBe(false);
    expect(bundle.includes("depthFarScale")).toBe(false);
    expect(bundle.includes("depthHorizonShiftPx")).toBe(false);
  });

  it("the renderer draws authored poses EXACTLY (keys are truth)", () => {
    // The render loop hard-assigns current = target for any provenance in
    // flight; the only easing branches on provenance === 'none'.
    expect(
      bundle.includes(
        "else{worldPoseCurrent.x=worldPoseTarget.x;worldPoseCurrent.y=worldPoseTarget.y;worldPoseCurrent.z=worldPoseTarget.z;worldPoseCurrent.tilt=worldPoseTarget.tilt;}",
      ),
    ).toBe(true);
    expect(bundle.includes("worldPoseTarget.provenance==='none'")).toBe(true);
  });

  it("the AS3 provenance fence mirrors the TS closed set exactly", () => {
    // D-0106: the renderer's intake array must carry every non-none tag the
    // TS set declares — the fence is one law in two languages.
    const m = bundle.match(/\['scene-authority'[^\]]*\]/);
    expect(m).not.toBe(null);
    const arr = m![0];
    for (const prov of WORLD_PROVENANCE_SET) {
      if (prov === "none") continue;
      expect(arr, `AS3 fence missing '${prov}'`).toContain(`'${prov}'`);
    }
  });
});
