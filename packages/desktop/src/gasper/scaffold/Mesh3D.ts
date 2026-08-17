/**
 * 3D cage on the polar ladder. Every morph is an embedding φ:V→R³.
 * Screen is a yaw projection. No per-shape hull writers.
 */
export function restPearlXYZ(rings: number, sectors: number, radius = 72): Float32Array {
  const xyz = new Float32Array(rings * sectors * 3);
  for (let r = 0; r < rings; r++) {
    const v = r / Math.max(1, rings - 1);
    for (let s = 0; s < sectors; s++) {
      const th = (s / sectors) * Math.PI * 2 - Math.PI / 2;
      const i = r * sectors + s;
      const x = radius * v * Math.cos(th);
      const y = radius * v * Math.sin(th);
      xyz[i * 3] = x;
      xyz[i * 3 + 1] = y;
      xyz[i * 3 + 2] = Math.sqrt(Math.max(0, radius * radius - x * x - y * y));
    }
  }
  return xyz;
}

export function paddleXYZ(rings: number, sectors: number): Float32Array {
  const xyz = new Float32Array(rings * sectors * 3);
  const rx = 66;
  const ry = 70;
  const cy = -2;
  const throatV = 0.7;
  const throatY = cy + ry * Math.sqrt(Math.max(0, 1 - (8 / rx) * (8 / rx)));
  const handleW = 8;
  const handleLen = 54;
  const bladeT = 9;
  for (let r = 0; r < rings; r++) {
    const v = r / Math.max(1, rings - 1);
    for (let s = 0; s < sectors; s++) {
      const u = s / sectors;
      const th = u * Math.PI * 2 - Math.PI / 2;
      const i = r * sectors + s;
      if (v <= throatV) {
        const p = v / throatV;
        xyz[i * 3] = rx * p * Math.cos(th);
        xyz[i * 3 + 1] = cy + ry * p * Math.sin(th);
        xyz[i * 3 + 2] = bladeT * Math.sqrt(Math.max(0, 1 - p * p));
      } else {
        const t = (v - throatV) / (1 - throatV);
        const ang = u * Math.PI * 2;
        xyz[i * 3] = handleW * Math.cos(ang);
        xyz[i * 3 + 1] = throatY + t * handleLen;
        xyz[i * 3 + 2] = handleW * Math.sin(ang);
      }
    }
  }
  return xyz;
}

export function rotateYawXYZ(xyz: Float32Array, yawDeg: number): Float32Array {
  const out = new Float32Array(xyz.length);
  const a = (yawDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  for (let i = 0; i < xyz.length; i += 3) {
    const x = xyz[i] ?? 0;
    const y = xyz[i + 1] ?? 0;
    const z = xyz[i + 2] ?? 0;
    out[i] = x * c + z * s;
    out[i + 1] = y;
    out[i + 2] = -x * s + z * c;
  }
  return out;
}

export function projectXY(xyz: Float32Array): Float32Array {
  const n = xyz.length / 3;
  const xy = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    xy[i * 2] = xyz[i * 3] ?? 0;
    xy[i * 2 + 1] = xyz[i * 3 + 1] ?? 0;
  }
  return xy;
}

export function embeddingXYZ(id: string, rings: number, sectors: number): Float32Array {
  if (id === "paddle") return paddleXYZ(rings, sectors);
  return restPearlXYZ(rings, sectors);
}
