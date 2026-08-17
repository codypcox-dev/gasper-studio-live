import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  facingCompressFromYaw,
  facingPaintYawDeg,
  facingReadableLocomotionYawDeg,
  facingVerticalScale,
  READABLE_THREE_QUARTER_DEG,
} from "./RadialFacingLaw";

const here = dirname(fileURLToPath(import.meta.url));
const painter = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");
const chase = readFileSync(
  join(here, "../../../../../docs/triforce/NORTHSTAR-CAGED-HULL.md"),
  "utf8",
);
const lock = readFileSync(
  join(here, "../../../../../docs/triforce/canon/CAGED-HULL-LOCK.json"),
  "utf8",
);

describe("Adobe 2.5D turntable — unchangeable law", () => {
  it("far tuck and near expansion are live", () => {
    expect(painter).toContain(
      "const nearExpansion=3.6*turn*Math.pow(Math.max(0,mx),.78)*lobeBand,farTuck=4.8*turn*Math.pow(Math.max(0,-mx),.78)*lobeBand;",
    );
    expect(painter).not.toContain("farTuck=0.0*turn");
    expect(lock).toContain("farTuck=0.0*turn");
  });

  it("width is the ellipse; height is never 1/width", () => {
    expect(facingCompressFromYaw(0)).toBeCloseTo(1, 8);
    expect(facingCompressFromYaw(180)).toBeCloseTo(1, 8);
    expect(facingCompressFromYaw(90)).toBeCloseTo(0.9, 5);
    expect(facingVerticalScale).toBe(1);
    expect(painter).toContain("facingVerticalScale='1.0000'");
    expect(painter).not.toContain("vK=1/hK");
    expect(chase).toContain("Adobe turntable (UNCHANGEABLE)");
  });

  it("locomotion yaw is continuous — 180 is the back, 22 is a shot pin", () => {
    expect(facingReadableLocomotionYawDeg(180)).toBe(180);
    expect(facingReadableLocomotionYawDeg(90)).toBe(90);
    expect(facingPaintYawDeg(180)).toBe(180);
    expect(READABLE_THREE_QUARTER_DEG).toBe(22);
    expect(painter).toContain("_stanceLive?0:");
    expect(chase).toContain("22° is a **take pin**");
  });
});
