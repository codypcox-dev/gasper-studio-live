import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  KAPPA_TH_CAP,
  kappaBoxLower,
  maxLowerTurning,
  turningAt,
} from "./KappaBox";

const painter = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "all-script-3.js"),
  "utf8",
);

function ring(n = 48): { x: number; y: number; th: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const th = (i / n) * Math.PI * 2;
    return { x: 120 + 50 * Math.cos(th), y: 140 + 50 * Math.sin(th), th };
  });
}

describe("KappaBox", () => {
  it("rest circle is under the cap and is a no-op", () => {
    const pts = ring();
    const before = maxLowerTurning(pts);
    expect(before).toBeLessThan(KAPPA_TH_CAP);
    kappaBoxLower(pts, 1);
    expect(maxLowerTurning(pts)).toBeCloseTo(before, 5);
  });

  it("a needle (θ→π) is pulled under the cap; foot peaks stay", () => {
    const pts = ring(64);
    const i = pts.findIndex((p) => Math.abs(p.th - 2.05) < 0.08);
    const peakL = pts.findIndex((p) => Math.abs(p.th - 1.83) < 0.08);
    const peakR = pts.findIndex((p) => Math.abs(p.th - 1.31) < 0.08);
    const lx = pts[peakL].x;
    const rx = pts[peakR].x;
    pts[i].x += 24;
    pts[i].y += 18;
    expect(Math.abs(turningAt(pts, i))).toBeGreaterThan(1.2);
    kappaBoxLower(pts, 1);
    expect(maxLowerTurning(pts)).toBeLessThanOrEqual(KAPPA_TH_CAP + 0.05);
    expect(pts[peakL].x).toBe(lx);
    expect(pts[peakR].x).toBe(rx);
  });

  it("live=0 is identity even if a needle is present", () => {
    const pts = ring();
    pts[20].x += 30;
    const x = pts[20].x;
    kappaBoxLower(pts, 0);
    expect(pts[20].x).toBe(x);
  });

  it("painter mounts the box after _lp and keeps closedSpline as the only d writer", () => {
    expect(painter).toContain("function kappaBoxLower(pts,S)");
    expect(painter).toContain("KAPPA_TH_CAP=0.9");
    expect(painter).toContain("pts=kappaBoxLower(smoothPts,S)");
    expect(painter).toContain("kappaBoxLower(pts,S)");
    expect(painter).toContain("KAPPA_LOWER_SIN=0.12");
    expect(painter).toContain("function closedSpline(pts)");
    expect(painter).not.toContain("/wSum");
  });
});
