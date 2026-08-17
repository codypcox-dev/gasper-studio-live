/**
 * Ping-pong paddle as a polar radius curve.
 * Blade = upright ellipse. Handle = capsule down the +y (th = π/2) axis.
 * Same θ convention as FormMaster: x = r cos θ, y = r sin θ, θ = 0 is +x.
 */
export const PADDLE_REST_RADIUS = 72;
export const PADDLE_HANDLE_SECTOR = 20;

function sdEllipse(px: number, py: number, cx: number, cy: number, rx: number, ry: number): number {
  const qx = (px - cx) / rx;
  const qy = (py - cy) / ry;
  return (Math.hypot(qx, qy) - 1) * Math.min(rx, ry);
}

function sdCapsule(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  rad: number,
): number {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const denom = bax * bax + bay * bay || 1;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / denom));
  return Math.hypot(pax - bax * h, pay - bay * h) - rad;
}

function paddleSdf(px: number, py: number): number {
  const blade = sdEllipse(px, py, 0, -8, 54, 58);
  const handle = sdCapsule(px, py, 0, 38, 0, 98, 7.4);
  return Math.min(blade, handle);
}

export function paddleRadiusAt(theta: number): number {
  let lo = 10;
  let hi = 128;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const d = paddleSdf(Math.cos(theta) * mid, Math.sin(theta) * mid);
    if (d > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export function paddleThetaForSector(sector: number, sectors = 40): number {
  return (sector / sectors) * Math.PI * 2 - Math.PI / 2;
}

export function paddleDeltaAtSector(sector: number, sectors = 40): number {
  return paddleRadiusAt(paddleThetaForSector(sector, sectors)) - PADDLE_REST_RADIUS;
}
