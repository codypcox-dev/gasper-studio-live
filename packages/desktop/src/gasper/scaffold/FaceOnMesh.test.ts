import { describe, expect, it } from "vitest";
import { projectFaceOnMesh } from "./FaceOnMesh";
import { FACE_CONTENT } from "./FaceCanon";
import { paddleXYZ, restPearlXYZ } from "./Mesh3D";

describe("face on mesh", () => {
  it("keeps canonical eye span and drops facing with yaw", () => {
    const xyz = restPearlXYZ(25, 40);
    const front = projectFaceOnMesh(xyz, 25, 40, 0);
    expect(front.rightEye.x - front.leftEye.x).toBeCloseTo(FACE_CONTENT.rightEye.x - FACE_CONTENT.leftEye.x, 5);
    expect(front.facing).toBeGreaterThan(0.9);
    const side = projectFaceOnMesh(xyz, 25, 40, 70);
    expect(side.facing).toBeLessThan(front.facing);
    expect(side.rightEye.x - side.leftEye.x).toBeCloseTo(72, 5);
  });

  it("keeps the mouth on the paddle blade", () => {
    const xyz = paddleXYZ(25, 40);
    const face = projectFaceOnMesh(xyz, 25, 40, 0);
    expect(face.mouth.y).toBeLessThan(50);
  });
});
