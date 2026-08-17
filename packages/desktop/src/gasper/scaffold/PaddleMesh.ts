/**
 * Ping-pong paddle embedding. Blade is an ellipse. Handle is a capsule.
 * Hull is a dense outline (ellipse + shaft) raycast by angle — polar
 * sector lerp cannot put enough meridians on a thin handle.
 */
import { SCAFFOLD_RINGS, SCAFFOLD_SECTORS } from "./AdaptiveShellScaffold";

export const PADDLE_REST_RADIUS = 72;
export const PADDLE_BLADE_RX = 54;
export const PADDLE_BLADE_RY = 58;
export const PADDLE_BLADE_CY = -4;
export const PADDLE_HANDLE_W = 8;
export const PADDLE_HANDLE_LEN = 54;
export const PADDLE_THROAT_V = 0.7;

const BLADE_RX2 = PADDLE_BLADE_RX * PADDLE_BLADE_RX;

export const PADDLE_HALF = Math.PI / 2 - Math.acos(Math.min(0.999, PADDLE_HANDLE_W / PADDLE_BLADE_RX));
export const PADDLE_THROAT_Y =
  PADDLE_BLADE_CY + PADDLE_BLADE_RY * Math.sqrt(Math.max(0, 1 - (PADDLE_HANDLE_W * PADDLE_HANDLE_W) / BLADE_RX2));
export const PADDLE_TIP_Y = PADDLE_THROAT_Y + PADDLE_HANDLE_LEN;

export type PaddlePoint = { x: number; y: number };

export function sectorTheta(sector: number, sectors = SCAFFOLD_SECTORS): number {
  return (sector / sectors) * Math.PI * 2 - Math.PI / 2;
}

function clamp(n: number, a: number, b: number): number {
  return n < a ? a : n > b ? b : n;
}

function bladePoint(th: number, t: number): PaddlePoint {
  const k = clamp(t, 0, 1);
  return {
    x: PADDLE_BLADE_RX * k * Math.cos(th),
    y: PADDLE_BLADE_CY + PADDLE_BLADE_RY * k * Math.sin(th),
  };
}

function handleOutline(uLocal: number): PaddlePoint {
  const r = PADDLE_HANDLE_W;
  const wall = Math.max(4, PADDLE_HANDLE_LEN - r);
  const cap = Math.PI * r;
  const total = 2 * wall + cap;
  const d = clamp(uLocal, 0, 1) * total;
  if (d <= wall) return { x: r, y: PADDLE_THROAT_Y + d };
  if (d <= wall + cap) {
    const a = ((d - wall) / cap) * Math.PI;
    return {
      x: r * Math.cos(a),
      y: PADDLE_THROAT_Y + wall + r * Math.sin(a),
    };
  }
  const d2 = d - wall - cap;
  return { x: -r, y: PADDLE_THROAT_Y + wall - d2 };
}

function inHandleWedge(th: number): boolean {
  let d = th - Math.PI / 2;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d) <= PADDLE_HALF + 1e-4;
}

export function paddleVertex(u: number, v: number): PaddlePoint {
  const th = u * Math.PI * 2 - Math.PI / 2;
  if (v <= PADDLE_THROAT_V) {
    return bladePoint(th, v / PADDLE_THROAT_V);
  }
  const t = (v - PADDLE_THROAT_V) / Math.max(1e-4, 1 - PADDLE_THROAT_V);
  const across = u * 2 - 1;
  const along = t * PADDLE_HANDLE_LEN;
  const capStart = PADDLE_HANDLE_LEN - PADDLE_HANDLE_W;
  if (along <= capStart) {
    return { x: PADDLE_HANDLE_W * across, y: PADDLE_THROAT_Y + along };
  }
  const ct = clamp((along - capStart) / PADDLE_HANDLE_W, 0, 1);
  const half = Math.sqrt(Math.max(0, 1 - ct * ct));
  return { x: PADDLE_HANDLE_W * across * half, y: PADDLE_THROAT_Y + along };
}

export function buildPaddleMesh(
  rings = SCAFFOLD_RINGS,
  sectors = SCAFFOLD_SECTORS,
): { xy: Float32Array; heights: Float32Array } {
  const xy = new Float32Array(rings * sectors * 2);
  const heights = new Float32Array(rings * sectors);
  for (let r = 0; r < rings; r++) {
    const vv = r / Math.max(1, rings - 1);
    for (let s = 0; s < sectors; s++) {
      const i = r * sectors + s;
      const p = paddleVertex(s / sectors, vv);
      xy[i * 2] = p.x;
      xy[i * 2 + 1] = p.y;
      heights[i] = Math.hypot(p.x, p.y) - PADDLE_REST_RADIUS;
    }
  }
  return { xy, heights };
}

export function buildPaddleOutline(samples = 128): Float32Array {
  const handleN = 40;
  const bladeN = Math.max(16, samples - handleN);
  const xy = new Float32Array((bladeN + handleN) * 2);
  const start = Math.PI / 2 - PADDLE_HALF;
  const sweep = Math.PI * 2 - 2 * PADDLE_HALF;
  for (let i = 0; i < bladeN; i++) {
    const th = start + (i / Math.max(1, bladeN - 1)) * sweep;
    const p = bladePoint(th, 1);
    xy[i * 2] = p.x;
    xy[i * 2 + 1] = p.y;
  }
  for (let i = 0; i < handleN; i++) {
    const p = handleOutline(1 - i / Math.max(1, handleN - 1));
    const k = bladeN + i;
    xy[k * 2] = p.x;
    xy[k * 2 + 1] = p.y;
  }
  return xy;
}

export function raycastOutline(th: number, xy: Float32Array): PaddlePoint | null {
  const rx = Math.cos(th);
  const ry = Math.sin(th);
  const n = xy.length / 2;
  let bestT = 0;
  let hit: PaddlePoint | null = null;
  for (let i = 0; i < n; i++) {
    const ax = xy[i * 2] ?? 0;
    const ay = xy[i * 2 + 1] ?? 0;
    const bx = xy[((i + 1) % n) * 2] ?? 0;
    const by = xy[((i + 1) % n) * 2 + 1] ?? 0;
    const sx = bx - ax;
    const sy = by - ay;
    const denom = rx * sy - ry * sx;
    if (Math.abs(denom) < 1e-8) continue;
    const t = (ax * sy - ay * sx) / denom;
    const u = (ax * ry - ay * rx) / denom;
    if (t > 1 && u >= 0 && u <= 1 && t > bestT) {
      bestT = t;
      hit = { x: rx * t, y: ry * t };
    }
  }
  return hit;
}
