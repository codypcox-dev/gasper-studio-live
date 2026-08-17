/**
 * Screen silhouette of a projected cage. Radial envelope of the edge soup —
 * any convex or star-convex embedding, any yaw. No per-shape outline writer.
 */
import { projectXY, rotateViewXYZ } from "./Mesh3D";

export function radialEnvelope(
  xy: Float32Array,
  rings: number,
  sectors: number,
  samples = 160,
): Float32Array {
  const edges: number[] = [];
  const push = (i: number, j: number) => {
    edges.push(xy[i * 2] ?? 0, xy[i * 2 + 1] ?? 0, xy[j * 2] ?? 0, xy[j * 2 + 1] ?? 0);
  };
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < sectors; s++) {
      const i = r * sectors + s;
      push(i, r * sectors + ((s + 1) % sectors));
      if (r + 1 < rings) push(i, (r + 1) * sectors + s);
    }
  }
  const out = new Float32Array(samples * 2);
  for (let k = 0; k < samples; k++) {
    const th = (k / samples) * Math.PI * 2 - Math.PI / 2;
    const rx = Math.cos(th);
    const ry = Math.sin(th);
    let best = 8;
    for (let e = 0; e < edges.length; e += 4) {
      const ax = edges[e] ?? 0;
      const ay = edges[e + 1] ?? 0;
      const bx = edges[e + 2] ?? 0;
      const by = edges[e + 3] ?? 0;
      const sx = bx - ax;
      const sy = by - ay;
      const denom = rx * sy - ry * sx;
      if (Math.abs(denom) < 1e-8) continue;
      const t = (ax * sy - ay * sx) / denom;
      const u = (ax * ry - ay * rx) / denom;
      if (t > 1 && u >= 0 && u <= 1 && t > best) best = t;
    }
    out[k * 2] = rx * best;
    out[k * 2 + 1] = ry * best;
  }
  return out;
}

export function projectAndSilhouette(
  xyz: Float32Array,
  yawDeg: number,
  rings: number,
  sectors: number,
  pitchDeg = 0,
): { xy: Float32Array; outline: Float32Array } {
  const xy = projectXY(rotateViewXYZ(xyz, yawDeg, pitchDeg));
  return { xy, outline: radialEnvelope(xy, rings, sectors) };
}
