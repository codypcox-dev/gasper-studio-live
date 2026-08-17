/**
 * Face center rides φ. Landmark spacing is FACE_CANON — never rescaled to the body.
 */
import { FACE_CONTENT } from "./FaceCanon";
import { rotateYawXYZ } from "./Mesh3D";

export const FACE_LANDMARKS = {
  center: { u: 0.5, v: 0.06 },
  leftEye: { u: 0.8, v: 0.52 },
  rightEye: { u: 0.2, v: 0.52 },
  mouth: { u: 0.5, v: 0.42 },
} as const;

export type FaceSample = { x: number; y: number; z: number };

export function sampleMeshXYZ(
  xyz: Float32Array,
  rings: number,
  sectors: number,
  u: number,
  v: number,
): FaceSample {
  const rf = Math.max(0, Math.min(rings - 1, v * (rings - 1)));
  const r0 = Math.floor(rf);
  const r1 = Math.min(rings - 1, r0 + 1);
  const fr = rf - r0;
  const uu = ((u % 1) + 1) % 1;
  const sf = uu * sectors;
  const s0 = Math.floor(sf) % sectors;
  const s1 = (s0 + 1) % sectors;
  const fs = sf - Math.floor(sf);
  const at = (r: number, s: number) => {
    const i = r * sectors + s;
    return {
      x: xyz[i * 3] ?? 0,
      y: xyz[i * 3 + 1] ?? 0,
      z: xyz[i * 3 + 2] ?? 0,
    };
  };
  const a = at(r0, s0);
  const b = at(r0, s1);
  const c = at(r1, s0);
  const d = at(r1, s1);
  const mix = (p: FaceSample, q: FaceSample, t: number) => ({
    x: p.x + (q.x - p.x) * t,
    y: p.y + (q.y - p.y) * t,
    z: p.z + (q.z - p.z) * t,
  });
  return mix(mix(a, b, fs), mix(c, d, fs), fr);
}

export function projectFaceOnMesh(
  xyz: Float32Array,
  rings: number,
  sectors: number,
  yawDeg: number,
): {
  center: FaceSample;
  leftEye: FaceSample;
  rightEye: FaceSample;
  mouth: FaceSample;
  facing: number;
} {
  const rotated = rotateYawXYZ(xyz, yawDeg);
  const center = sampleMeshXYZ(rotated, rings, sectors, FACE_LANDMARKS.center.u, FACE_LANDMARKS.center.v);
  const facing = Math.cos((yawDeg * Math.PI) / 180);
  const place = (off: { x: number; y: number }): FaceSample => ({
    x: center.x + off.x,
    y: center.y + off.y,
    z: center.z,
  });
  return {
    center,
    leftEye: place(FACE_CONTENT.leftEye),
    rightEye: place(FACE_CONTENT.rightEye),
    mouth: place(FACE_CONTENT.mouth),
    facing,
  };
}
