/** Live 1000-point sculpt field. Mutate in place — the painter holds this buffer. */

export const SCULPT_COUNT = 2000;

type Host = {
  __GASPER_GRID_SCULPT__?: ArrayLike<number> & { [i: number]: number; length: number };
};

function host(): Host {
  return globalThis as Host;
}

export function readLiveSculpt(): number[] {
  const sc = host().__GASPER_GRID_SCULPT__;
  if (!sc || sc.length !== SCULPT_COUNT) return new Array(SCULPT_COUNT).fill(0);
  const out = new Array(SCULPT_COUNT);
  for (let i = 0; i < SCULPT_COUNT; i++) out[i] = Number(sc[i]) || 0;
  return out;
}

export function writeLiveSculpt(data: readonly number[]): void {
  const h = host();
  let sc = h.__GASPER_GRID_SCULPT__;
  if (!sc || sc.length !== SCULPT_COUNT || typeof (sc as { set?: unknown }).set !== "function") {
    const next = new Float32Array(SCULPT_COUNT);
    for (let i = 0; i < SCULPT_COUNT; i++) next[i] = Number(data[i]) || 0;
    h.__GASPER_GRID_SCULPT__ = next;
    return;
  }
  for (let i = 0; i < SCULPT_COUNT; i++) sc[i] = Number(data[i]) || 0;
}

export function sculptEnergy(data: readonly number[]): number {
  let e = 0;
  for (let i = 0; i < data.length; i++) e += Math.abs(data[i] || 0);
  return e;
}
