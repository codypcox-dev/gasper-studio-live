import { describe, expect, it } from "vitest";
import { shadeMesh, shadeNormal, vertexNormal } from "./SurfaceShader";
import { restPearlXYZ } from "./Mesh3D";

describe("surface shader", () => {
  it("front samples face the camera and yaw changes the field", () => {
    const xyz = restPearlXYZ(25, 40);
    const pole = vertexNormal(xyz, 25, 40, 6, 0);
    expect(pole.nz).toBeGreaterThan(0.2);
    const shade = shadeMesh(xyz, 25, 40, 0);
    expect(shade.intensity[6 * 40] ?? 0).toBeGreaterThan(0.2);
    const side = shadeMesh(xyz, 25, 40, 80);
    expect(side.intensity[6 * 40] ?? 0).not.toBeCloseTo(shade.intensity[6 * 40] ?? 0, 2);
  });

  it("a highlight-facing normal is brighter when the gel is smoother", () => {
    const L = { x: -0.55, y: -0.65, z: 0.52 };
    const hl = Math.hypot(L.x, L.y, L.z + 1) || 1;
    const n = { nx: L.x / hl, ny: L.y / hl, nz: (L.z + 1) / hl };
    const tight = shadeNormal(n, 0.12, 0);
    const rough = shadeNormal(n, 0.8, 0);
    expect(tight.spec).toBeGreaterThan(rough.spec);
  });
});
