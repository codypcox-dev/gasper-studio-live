import { describe, expect, it } from "vitest";
import { goosePivot } from "./GoosebumpsField";
import {
  HEX_ROTATE_LAW,
  POLE_SPIN_LAW,
  rotateScaffoldField,
  sampleFieldBilinear,
  spinScaffoldField,
} from "./HexFieldRotate";
import { cubeDistance, cubeRotate60About, uvToCube } from "./HexCube";

function blob(u0: number, v0: number): Float32Array {
  const out = new Float32Array(1000);
  for (let r = 0; r < 25; r++) {
    const v = r / 24;
    for (let s = 0; s < 40; s++) {
      let du = Math.abs(s / 40 - u0);
      if (du > 0.5) du = 1 - du;
      const dv = v - v0;
      out[r * 40 + s] = Math.exp(-0.5 * (du * du * 220 + dv * dv * 180));
    }
  }
  return out;
}

function peakUv(field: ArrayLike<number>): { u: number; v: number; peak: number } {
  let peak = -1;
  let u = 0;
  let v = 0;
  for (let r = 0; r < 25; r++) {
    for (let s = 0; s < 40; s++) {
      const h = field[r * 40 + s] ?? 0;
      if (h > peak) {
        peak = h;
        u = s / 40;
        v = r / 24;
      }
    }
  }
  return { u, v, peak };
}

describe("hex field rotation", () => {
  it("hex C6 warps the 1000 about a cube pivot (cylinder is not C6)", () => {
    expect(HEX_ROTATE_LAW).toBe("C6-about-cube-pivot");
    const field = blob(0.72, 0.52);
    const once = rotateScaffoldField(field, 1, goosePivot());
    let delta = 0;
    for (let i = 0; i < field.length; i++) delta += Math.abs((field[i] ?? 0) - (once[i] ?? 0));
    expect(delta).toBeGreaterThan(8);
    const p = uvToCube(0.7, 0.5, 10, 4);
    const q = cubeRotate60About(p, goosePivot(), 1);
    expect(cubeDistance(goosePivot(), p)).toBeCloseTo(cubeDistance(goosePivot(), q), 6);
  });

  it("pole spin is a cylinder isometry — 40 sectors restore the field", () => {
    expect(POLE_SPIN_LAW).toBe("sector-shift-cylinder");
    const field = blob(0.72, 0.52);
    const once = spinScaffoldField(field, 4);
    const a = peakUv(field);
    const b = peakUv(once);
    expect(b.peak).toBeCloseTo(a.peak, 6);
    const du = Math.min(Math.abs(b.u - a.u), 1 - Math.abs(b.u - a.u));
    expect(du).toBeCloseTo(0.1, 3);
    expect(b.v).toBeCloseTo(a.v, 6);
    let cur: ArrayLike<number> = field;
    for (let i = 0; i < 10; i++) cur = spinScaffoldField(cur, 4);
    let err = 0;
    for (let i = 0; i < field.length; i++) err += Math.abs((cur[i] ?? 0) - (field[i] ?? 0));
    expect(err).toBeLessThan(1e-9);
    expect(sampleFieldBilinear(field, 0, 0.5)).toBeCloseTo(sampleFieldBilinear(field, 1, 0.5), 6);
  });
});
