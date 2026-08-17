import { describe, expect, it } from "vitest";
import {
  CUBE_DIRS,
  CUBE_LAW,
  cube,
  cubeAdd,
  cubeDistance,
  cubeNeighbor,
  cubeReflect,
  cubeRotate60,
  cubeRotate60About,
  cubeRound,
  cubeToOddR,
  cubeToUv,
  cubeValid,
  cubeWrapQ,
  hexDualDistance,
  hexKernel,
  hexSiteDistance,
  liDistance,
  oddRToCube,
  uvToCube,
} from "./HexCube";

describe("cube coordinate arithmetic", () => {
  it("keeps q+r+s=0 on every constructor and neighbor", () => {
    expect(CUBE_LAW).toBe("q+r+s=0");
    expect(CUBE_DIRS).toHaveLength(6);
    const origin = cube(0, 0);
    expect(cubeValid(origin)).toBe(true);
    for (let dir = 0; dir < 6; dir++) {
      const n = cubeNeighbor(origin, dir);
      expect(cubeValid(n)).toBe(true);
      expect(cubeDistance(origin, n)).toBe(1);
    }
    expect(cubeDistance(cube(2, -1, -1), cube(-1, 2, -1))).toBe(3);
  });

  it("round-trips odd-r through cube and back", () => {
    for (let row = 0; row <= 4; row++) {
      for (let col = 0; col < 10; col++) {
        const c = oddRToCube(col, row);
        expect(cubeValid(c)).toBe(true);
        const back = cubeToOddR(c);
        expect(back.col).toBeCloseTo(col, 9);
        expect(back.row).toBeCloseTo(row, 9);
        expect(cubeRound(c)).toEqual(c);
      }
    }
  });

  it("rotates 60° six times back to origin and preserves the plane", () => {
    const start = cube(2, -3, 1);
    let cur = start;
    for (let i = 0; i < 6; i++) {
      cur = cubeRotate60(cur, 1);
      expect(cubeValid(cur)).toBe(true);
    }
    expect(cur).toEqual(start);
    expect(cubeRotate60(start, 3)).toEqual(cube(-2, 3, -1));
    expect(cubeRotate60(start, 1)).toEqual(cube(-1, -2, 3));
    expect(cubeDistance(start, cube(0, 1, -1))).toBe(
      cubeDistance(cubeRotate60(start, 2), cubeRotate60(cube(0, 1, -1), 2)),
    );
  });

  it("rotates about an arbitrary pivot and reflects as D6", () => {
    const pivot = cube(1, -1, 0);
    const p = cube(3, -2, -1);
    expect(cubeRotate60About(p, pivot, 0)).toEqual(p);
    expect(cubeRotate60About(p, pivot, 6)).toEqual(p);
    expect(cubeRotate60About(pivot, pivot, 2)).toEqual(pivot);
    const spun = cubeRotate60About(p, pivot, 1);
    expect(cubeValid(spun)).toBe(true);
    expect(cubeDistance(pivot, p)).toBe(cubeDistance(pivot, spun));
    expect(cubeReflect(cubeReflect(p, "q"), "q")).toEqual(p);
    expect(cubeValid(cubeReflect(p, "r"))).toBe(true);
    expect(cubeReflect(p, "s")).toEqual({ q: p.r, r: p.q, s: p.s });
  });

  it("wraps the cylinder on q and treats u=0 as u=1", () => {
    const a = cubeWrapQ(cube(10, 1, -11), 10);
    expect(a.q).toBeCloseTo(0, 9);
    expect(cubeValid(a)).toBe(true);
    const p0 = uvToCube(0, 0.5, 10, 4);
    const p1 = uvToCube(1, 0.5, 10, 4);
    expect(cubeDistance(p0, cubeAdd(p1, cube(-10, 0, 10)))).toBeLessThan(1e-9);
    expect(hexSiteDistance(0.01, 0.5, 10, 4)).toBeLessThan(0.2);
    expect(hexSiteDistance(0.99, 0.5, 10, 4)).toBeLessThan(0.2);
  });

  it("is isotropic: six neighbors share one distance, Li agrees at unit step", () => {
    const o = cube(0, 0, 0);
    const ds = CUBE_DIRS.map((d) => cubeDistance(o, d));
    const li = CUBE_DIRS.map((d) => liDistance(o, d));
    expect(ds.every((d) => d === 1)).toBe(true);
    expect(Math.max(...li) - Math.min(...li)).toBeLessThan(1e-9);
  });

  it("maps commensurate UV sites onto integer cubes", () => {
    for (const row of [1, 2, 3]) {
      for (let col = 0; col < 10; col++) {
        const u = (col + (row & 1) * 0.5) / 10;
        const v = row / 4;
        const c = cubeRound(uvToCube(u, v, 10, 4));
        expect(cubeValid(c)).toBe(true);
        expect(hexSiteDistance(u, v, 10, 4)).toBeLessThan(1e-9);
        const uv = cubeToUv(c, 10, 4);
        expect(uv.v).toBeCloseTo(v, 6);
      }
    }
  });

  it("kernel peaks on the site and dual grain peaks on the edge", () => {
    expect(hexKernel(0, 0.34)).toBeCloseTo(1, 9);
    expect(hexKernel(1, 0.34)).toBeLessThan(0.02);
    const siteU = 0.2;
    const siteV = 0.5;
    expect(hexSiteDistance(siteU, siteV, 10, 4)).toBeLessThan(1e-9);
    expect(hexDualDistance(siteU, siteV, 10, 4)).toBeGreaterThan(0.4);
  });
});
