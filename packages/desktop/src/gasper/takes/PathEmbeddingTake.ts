/**
 * Path takes are embeddings, not ink.
 * Record 512 xy (and optional 1000-cage xy). Playback lerps points.
 * closedSpline remains the only d writer. No SMIL. No Flubber.
 */
export const PATH_TAKE_SCHEMA = "gasper.path-take.v1" as const;
export const PATH_TAKE_SAMPLES = 512;
export const PATH_TAKE_HZ = 20;
export const PATH_TAKE_STORAGE_KEY = "gasper.path-takes.v1";

export type PathTakeFrame = Readonly<{
  t: number;
  rim: string;
  cage?: string;
}>;

export type PathTake = Readonly<{
  schema: typeof PATH_TAKE_SCHEMA;
  id: string;
  name: string;
  durationSec: number;
  samples: number;
  hz: number;
  frames: readonly PathTakeFrame[];
}>;

export type PathTakeRuntime = {
  recording: boolean;
  playing: PathTake | null;
  playT0: number;
  recT0: number;
  recAcc: number;
  recFrames: PathTakeFrame[];
  last: PathTake | null;
  library: PathTake[];
};

function host(): typeof globalThis & {
  GasperPathTake?: PathTakeApi;
  __GASPER_FABRIC_POS__?: Float32Array;
} {
  return globalThis as typeof globalThis & {
    GasperPathTake?: PathTakeApi;
    __GASPER_FABRIC_POS__?: Float32Array;
  };
}

export function encodeF32(a: Float32Array): string {
  const bytes = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function decodeF32(b64: string): Float32Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

export function packRim(
  pts: ReadonlyArray<{ x: number; y: number }>,
  samples = PATH_TAKE_SAMPLES,
): Float32Array {
  const out = new Float32Array(samples * 2);
  const n = pts.length;
  if (!n) return out;
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * n;
    const i0 = Math.floor(t) % n;
    const i1 = (i0 + 1) % n;
    const f = t - Math.floor(t);
    const a = pts[i0];
    const b = pts[i1];
    out[i * 2] = (a?.x ?? 0) + ((b?.x ?? 0) - (a?.x ?? 0)) * f;
    out[i * 2 + 1] = (a?.y ?? 0) + ((b?.y ?? 0) - (a?.y ?? 0)) * f;
  }
  return out;
}

export function lerpF32(a: Float32Array, b: Float32Array, u: number): Float32Array {
  const n = Math.min(a.length, b.length);
  const out = new Float32Array(n);
  const t = u <= 0 ? 0 : u >= 1 ? 1 : u;
  for (let i = 0; i < n; i++) out[i] = (a[i] ?? 0) + ((b[i] ?? 0) - (a[i] ?? 0)) * t;
  return out;
}

export function sampleTake(take: PathTake, timeSec: number): Float32Array {
  const frames = take.frames;
  if (!frames.length) return new Float32Array(take.samples * 2);
  const dur = Math.max(1e-4, take.durationSec);
  let t = timeSec;
  if (t < 0) t = 0;
  if (t > dur) t = dur;
  let lo = 0;
  let hi = frames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((frames[mid]?.t ?? 0) < t) lo = mid + 1;
    else hi = mid;
  }
  const b = frames[Math.min(lo, frames.length - 1)] ?? frames[0];
  const a = frames[Math.max(0, lo - 1)] ?? b;
  if (!a || !b || a === b) return decodeF32(b?.rim ?? a?.rim ?? "");
  const span = Math.max(1e-6, (b.t ?? 0) - (a.t ?? 0));
  const u = (t - (a.t ?? 0)) / span;
  return lerpF32(decodeF32(a.rim), decodeF32(b.rim), u);
}

export function applyRim(
  pts: Array<{ x: number; y: number }>,
  rim: Float32Array,
): void {
  const n = Math.min(pts.length, Math.floor(rim.length / 2));
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    if (!p) continue;
    p.x = rim[i * 2] ?? p.x;
    p.y = rim[i * 2 + 1] ?? p.y;
  }
}

export function cubicCount(d: string): number {
  const m = d.match(/ C /g);
  return m ? m.length : 0;
}

export type PathTakeApi = {
  record: (name?: string) => void;
  stop: () => PathTake | null;
  play: (id?: string) => PathTake | null;
  stopPlay: () => void;
  list: () => PathTake[];
  last: () => PathTake | null;
  recording: () => boolean;
  playing: () => boolean;
  _ingest: (pts: ReadonlyArray<{ x: number; y: number }>) => void;
  _playbackRim: () => Float32Array | null;
};

function loadLibrary(): PathTake[] {
  try {
    const raw = localStorage.getItem(PATH_TAKE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PathTake[];
    return parsed.filter((t) => t && t.schema === PATH_TAKE_SCHEMA && Array.isArray(t.frames));
  } catch {
    return [];
  }
}

function persist(library: PathTake[]): void {
  try {
    const slim = library.slice(-4);
    localStorage.setItem(PATH_TAKE_STORAGE_KEY, JSON.stringify(slim));
  } catch {
    /* quota — memory still holds last */
  }
}

export function createPathTakeRuntime(): PathTakeRuntime {
  const library = typeof localStorage !== "undefined" ? loadLibrary() : [];
  return {
    recording: false,
    playing: null,
    playT0: 0,
    recT0: 0,
    recAcc: 0,
    recFrames: [],
    last: library[library.length - 1] ?? null,
    library,
  };
}

export function mountPathTake(rt: PathTakeRuntime = createPathTakeRuntime()): PathTakeApi {
  const dtMin = 1 / PATH_TAKE_HZ;
  const api: PathTakeApi = {
    record(name) {
      rt.recording = true;
      rt.playing = null;
      rt.recT0 = performance.now();
      rt.recAcc = 0;
      rt.recFrames = [];
      rt.last = {
        schema: PATH_TAKE_SCHEMA,
        id: "rec-pending",
        name: name || "Take",
        durationSec: 0,
        samples: PATH_TAKE_SAMPLES,
        hz: PATH_TAKE_HZ,
        frames: [],
      };
    },
    stop() {
      if (!rt.recording) return rt.last;
      rt.recording = false;
      const durationSec = rt.recFrames.length
        ? rt.recFrames[rt.recFrames.length - 1]?.t ?? 0
        : 0;
      const take: PathTake = Object.freeze({
        schema: PATH_TAKE_SCHEMA,
        id: `take-${Date.now().toString(36)}`,
        name: rt.last?.name || "Take",
        durationSec,
        samples: PATH_TAKE_SAMPLES,
        hz: PATH_TAKE_HZ,
        frames: Object.freeze([...rt.recFrames]),
      });
      rt.last = take;
      rt.library = [...rt.library.filter((t) => t.id !== take.id), take];
      persist(rt.library);
      return take;
    },
    play(id) {
      const take = id ? rt.library.find((t) => t.id === id) ?? rt.last : rt.last;
      if (!take || !take.frames.length) return null;
      rt.recording = false;
      rt.playing = take;
      rt.playT0 = performance.now();
      return take;
    },
    stopPlay() {
      rt.playing = null;
    },
    list() {
      return [...rt.library];
    },
    last() {
      return rt.last;
    },
    recording() {
      return rt.recording;
    },
    playing() {
      return !!rt.playing;
    },
    _ingest(pts) {
      if (!rt.recording || !pts.length) return;
      const now = (performance.now() - rt.recT0) / 1000;
      if (rt.recFrames.length && now - rt.recAcc < dtMin) return;
      rt.recAcc = now;
      const rim = packRim(pts, PATH_TAKE_SAMPLES);
      const cage = host().__GASPER_FABRIC_POS__;
      rt.recFrames.push({
        t: now,
        rim: encodeF32(rim),
        ...(cage && cage.length >= 8 ? { cage: encodeF32(cage) } : {}),
      });
    },
    _playbackRim() {
      if (!rt.playing) return null;
      const t = (performance.now() - rt.playT0) / 1000;
      if (t >= rt.playing.durationSec) {
        const last = sampleTake(rt.playing, rt.playing.durationSec);
        rt.playing = null;
        return last;
      }
      return sampleTake(rt.playing, t);
    },
  };
  host().GasperPathTake = api;
  return api;
}
