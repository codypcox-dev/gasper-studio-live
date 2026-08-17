import { describe, expect, it } from "vitest";
import { paddleXYZ } from "./Mesh3D";
import { projectAndSilhouette } from "./Silhouette2D";

describe("3D cage + silhouette", () => {
  it("hull is from the projected edge soup, and yaw thins the blade", () => {
    const xyz = paddleXYZ(25, 40);
    const front = projectAndSilhouette(xyz, 0, 25, 40);
    const side = projectAndSilhouette(xyz, 72, 25, 40);
    let frontW = 0;
    let sideW = 0;
    let frontY = -999;
    for (let i = 0; i < front.outline.length; i += 2) {
      frontW = Math.max(frontW, Math.abs(front.outline[i] ?? 0));
      frontY = Math.max(frontY, front.outline[i + 1] ?? 0);
    }
    for (let i = 0; i < side.outline.length; i += 2) {
      sideW = Math.max(sideW, Math.abs(side.outline[i] ?? 0));
    }
    expect(frontY).toBeGreaterThan(60);
    expect(frontW).toBeGreaterThan(40);
    expect(sideW).toBeLessThan(frontW * 0.85);
  });
});
