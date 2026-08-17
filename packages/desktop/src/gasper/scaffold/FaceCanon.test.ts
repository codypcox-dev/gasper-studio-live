import { describe, expect, it } from "vitest";
import {
  FACE_CANON,
  FACE_CONTENT,
  availableRadius,
  clearanceScale,
  faceClearanceRadius,
} from "./FaceCanon";

describe("canonical face", () => {
  it("locks the authored spacing", () => {
    expect(FACE_CANON.eyeWidth).toBe(38);
    expect(FACE_CANON.rightEye[0] - FACE_CANON.leftEye[0]).toBe(72);
    expect(FACE_CANON.mouth[1] - FACE_CANON.center[1]).toBe(28);
    expect(FACE_CONTENT.leftEye.x).toBe(-36);
    expect(FACE_CONTENT.rightEye.x).toBe(36);
  });

  it("body must grow to clear the face, the face does not shrink", () => {
    const need = faceClearanceRadius();
    expect(need).toBeGreaterThan(50);
    const tight = new Float32Array(16);
    for (let i = 0; i < 8; i++) {
      const th = (i / 8) * Math.PI * 2;
      tight[i * 2] = 20 * Math.cos(th);
      tight[i * 2 + 1] = 20 * Math.sin(th);
    }
    expect(availableRadius(FACE_CONTENT.center, tight)).toBeLessThan(need);
    expect(clearanceScale(tight)).toBeGreaterThan(1);
    const roomy = new Float32Array(16);
    for (let i = 0; i < 8; i++) {
      const th = (i / 8) * Math.PI * 2;
      roomy[i * 2] = 90 * Math.cos(th);
      roomy[i * 2 + 1] = 90 * Math.sin(th);
    }
    expect(clearanceScale(roomy)).toBe(1);
  });
});
