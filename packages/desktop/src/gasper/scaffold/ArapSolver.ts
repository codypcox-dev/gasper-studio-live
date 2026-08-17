/**
 * 2D ARAP on a polar ladder. Jacobi global step — no matrix, any (rings,sectors).
 * Stretch projection makes pins pull neighbors. Face band is Dirichlet.
 */
export function isFaceLocked(ring: number, rings: number): boolean {
  const v = ring / Math.max(1, rings - 1);
  return v >= 0.32 && v <= 0.58;
}

function neighbors(r: number, s: number, rings: number, sectors: number): Array<[number, number]> {
  const out: Array<[number, number]> = [
    [r, (s + 1) % sectors],
    [r, (s - 1 + sectors) % sectors],
  ];
  if (r > 0) out.push([r - 1, s]);
  if (r + 1 < rings) out.push([r + 1, s]);
  return out;
}

export function projectStretch(
  live: Float32Array,
  rest: Float32Array,
  rings: number,
  sectors: number,
  pinned: (i: number) => boolean,
  iterations = 2,
): void {
  const apply = (i: number, j: number) => {
    const ix = live[i * 2] ?? 0;
    const iy = live[i * 2 + 1] ?? 0;
    const jx = live[j * 2] ?? 0;
    const jy = live[j * 2 + 1] ?? 0;
    const dx = jx - ix;
    const dy = jy - iy;
    const len = Math.hypot(dx, dy);
    const restLen = Math.hypot(
      (rest[i * 2] ?? 0) - (rest[j * 2] ?? 0),
      (rest[i * 2 + 1] ?? 0) - (rest[j * 2 + 1] ?? 0),
    );
    if (len < 1e-6 || restLen < 1e-6) return;
    const corr = (len - restLen) / len;
    const pinI = pinned(i);
    const pinJ = pinned(j);
    if (pinI && pinJ) return;
    const wI = pinI ? 0 : pinJ ? 1 : 0.5;
    const wJ = pinJ ? 0 : pinI ? 1 : 0.5;
    live[i * 2] = ix + dx * corr * wI;
    live[i * 2 + 1] = iy + dy * corr * wI;
    live[j * 2] = jx - dx * corr * wJ;
    live[j * 2 + 1] = jy - dy * corr * wJ;
  };
  for (let n = 0; n < iterations; n++) {
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < sectors; s++) {
        const i = r * sectors + s;
        apply(i, r * sectors + ((s + 1) % sectors));
        if (r + 1 < rings) apply(i, (r + 1) * sectors + s);
      }
    }
  }
}

export function tickArap(
  live: Float32Array,
  rest: Float32Array,
  rings: number,
  sectors: number,
  opts: { lockTo?: Float32Array; faceLock?: boolean; iterations?: number; pins?: Set<number> } = {},
): Float32Array {
  const n = rings * sectors;
  const lockTo = opts.lockTo ?? rest;
  const faceLock = opts.faceLock !== false;
  const iterations = Math.max(1, Math.min(12, opts.iterations ?? 5));
  const pins = opts.pins;
  const rc = new Float32Array(n);
  const rs = new Float32Array(n);
  const next = new Float32Array(n * 2);
  const pinned = (i: number) => {
    const r = Math.floor(i / sectors);
    return !!pins?.has(i) || r === 0 || (faceLock && isFaceLocked(r, rings));
  };

  for (let it = 0; it < iterations; it++) {
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < sectors; s++) {
        const i = r * sectors + s;
        let s11 = 0;
        let s12 = 0;
        let s21 = 0;
        let s22 = 0;
        for (const [rr, ss] of neighbors(r, s, rings, sectors)) {
          const j = rr * sectors + ss;
          const lx = (live[i * 2] ?? 0) - (live[j * 2] ?? 0);
          const ly = (live[i * 2 + 1] ?? 0) - (live[j * 2 + 1] ?? 0);
          const px = (rest[i * 2] ?? 0) - (rest[j * 2] ?? 0);
          const py = (rest[i * 2 + 1] ?? 0) - (rest[j * 2 + 1] ?? 0);
          const w = 1 / Math.max(1e-4, Math.hypot(px, py));
          s11 += w * lx * px;
          s12 += w * lx * py;
          s21 += w * ly * px;
          s22 += w * ly * py;
        }
        const th = Math.atan2(s21 - s12, s11 + s22);
        rc[i] = Math.cos(th);
        rs[i] = Math.sin(th);
      }
    }

    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < sectors; s++) {
        const i = r * sectors + s;
        if (pins?.has(i)) {
          next[i * 2] = live[i * 2] ?? 0;
          next[i * 2 + 1] = live[i * 2 + 1] ?? 0;
          continue;
        }
        if (r === 0 || (faceLock && isFaceLocked(r, rings))) {
          next[i * 2] = lockTo[i * 2] ?? 0;
          next[i * 2 + 1] = lockTo[i * 2 + 1] ?? 0;
          continue;
        }
        let nx = 0;
        let ny = 0;
        let den = 0;
        for (const [rr, ss] of neighbors(r, s, rings, sectors)) {
          const j = rr * sectors + ss;
          const px = (rest[i * 2] ?? 0) - (rest[j * 2] ?? 0);
          const py = (rest[i * 2 + 1] ?? 0) - (rest[j * 2 + 1] ?? 0);
          const w = 1 / Math.max(1e-4, Math.hypot(px, py));
          const c = ((rc[i] ?? 1) + (rc[j] ?? 1)) * 0.5;
          const si = ((rs[i] ?? 0) + (rs[j] ?? 0)) * 0.5;
          nx += w * ((live[j * 2] ?? 0) + c * px - si * py);
          ny += w * ((live[j * 2 + 1] ?? 0) + si * px + c * py);
          den += w;
        }
        next[i * 2] = den > 0 ? nx / den : live[i * 2] ?? 0;
        next[i * 2 + 1] = den > 0 ? ny / den : live[i * 2 + 1] ?? 0;
      }
    }
    live.set(next);
    const p0x = live[0] ?? 0;
    const p0y = live[1] ?? 0;
    for (let s = 1; s < sectors; s++) {
      live[s * 2] = p0x;
      live[s * 2 + 1] = p0y;
    }
    projectStretch(live, rest, rings, sectors, pinned);
  }
  return live;
}

export function maxDelta(a: Float32Array, b: Float32Array): number {
  let peak = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 2) {
    const d = Math.hypot((a[i] ?? 0) - (b[i] ?? 0), (a[i + 1] ?? 0) - (b[i + 1] ?? 0));
    if (d > peak) peak = d;
  }
  return peak;
}
