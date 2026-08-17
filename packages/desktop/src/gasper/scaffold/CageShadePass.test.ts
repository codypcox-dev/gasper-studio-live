import { describe, expect, it } from "vitest";
import { cageTriangles } from "./CageShadePass";

describe("cage shade pass", () => {
  it("skips the pole and emits two triangles per annular cell", () => {
    const idx = cageTriangles(25, 40, 1);
    expect(idx.length).toBe((25 - 2) * 40 * 6);
    expect(Math.max(...idx)).toBeLessThan(25 * 40);
    expect(idx[0]).toBe(40);
  });
});
