/**
 * VEC-401 — Single authoritative Gasper organism clock.
 *
 * One structural clock port owns organism time in a JavaScript realm. Consumers
 * subscribe; the host controls lifecycle. The global install path is split-brain
 * safe and adopts compatible plain-JavaScript clocks without `instanceof`.
 */

export const ORGANISM_CLOCK_VERSION = "1" as const;
export const ORGANISM_CLOCK_PACKET = "VEC-401" as const;
export const ORGANISM_CLOCK_GLOBAL_KEY = "__GASPER_ORGANISM_CLOCK__" as const;

export type OrganismClockMode = "realtime" | "deterministic" | "fixed-step";
export type OrganismClockDirection = -1 | 0 | 1;

export type OrganismClockFrame = Readonly<{
  /** Absolute organism timeline position. */
  timeMs: number;
  /** Cumulative non-negative advancement since reset. */
  elapsedMs: number;
  /** Non-negative magnitude of this dispatch's time movement. */
  deltaMs: number;
  /** Signed timeline movement; negative only when scrubbing backward. */
  signedDeltaMs: number;
  deltaSec: number;
  direction: OrganismClockDirection;
  /** Monotonic dispatch index. */
  frameIndex: number;
  seed: number;
  mode: OrganismClockMode;
  paused: boolean;
  running: boolean;
}>;

export type OrganismClockSubscriber = {
  id: string;
  priority: number;
  onFrame: (frame: OrganismClockFrame) => void;
};

export type OrganismClockFault = Readonly<{
  subscriberId: string;
  frameIndex: number;
  message: string;
}>;

export type OrganismClockInspection = Readonly<{
  version: typeof ORGANISM_CLOCK_VERSION;
  packet: typeof ORGANISM_CLOCK_PACKET;
  authorityId: string;
  mode: OrganismClockMode;
  running: boolean;
  paused: boolean;
  timeMs: number;
  elapsedMs: number;
  deltaMs: number;
  signedDeltaMs: number;
  direction: OrganismClockDirection;
  frameIndex: number;
  seed: number;
  fixedStepMs: number;
  maxDeltaMs: number;
  subscriberIds: string[];
  subscriberCount: number;
  driverScheduled: boolean;
  dispatching: boolean;
  fault: OrganismClockFault | null;
  lastFrame: OrganismClockFrame | null;
  solePerpetualDriver: true;
}>;

export type OrganismClockOptions = {
  authorityId?: string;
  seed?: number;
  fixedStepMs?: number;
  maxDeltaMs?: number;
  nowMs?: () => number;
  scheduleFrame?: (cb: (wallNowMs: number) => void) => number;
  cancelFrame?: (handle: number) => void;
};

export interface GasperOrganismClockPort {
  readonly version: typeof ORGANISM_CLOCK_VERSION;
  readonly packet: typeof ORGANISM_CLOCK_PACKET;
  readonly authorityId: string;

  installGlobal(): GasperOrganismClockPort;
  start(opts?: { mode?: OrganismClockMode }): GasperOrganismClockPort;
  stop(): GasperOrganismClockPort;
  pause(): GasperOrganismClockPort;
  resume(): GasperOrganismClockPort;
  setMode(mode: OrganismClockMode): GasperOrganismClockPort;
  getMode(): OrganismClockMode;

  setSeed(seed: number): GasperOrganismClockPort;
  getSeed(): number;
  setFixedStepMs(ms: number): GasperOrganismClockPort;
  getFixedStepMs(): number;

  scrub(timeMs: number): OrganismClockFrame;
  setFixedTime(timeMs: number): OrganismClockFrame;
  setDeterministicTime(timeMs: number): OrganismClockFrame;
  step(deltaMs?: number): OrganismClockFrame;

  nowMs(): number;
  elapsed(): number;
  getDeltaMs(): number;
  getSignedDeltaMs(): number;
  getFrameIndex(): number;
  getLastFrame(): OrganismClockFrame | null;
  isRunning(): boolean;
  isPaused(): boolean;

  subscribe(sub: OrganismClockSubscriber): () => void;
  unsubscribe(id: string): boolean;
  hasSubscriber(id: string): boolean;
  inspect(): OrganismClockInspection;
  reset(opts?: { seed?: number; timeMs?: number }): GasperOrganismClockPort;
  clearFault(): GasperOrganismClockPort;
}

type GlobalClockHost = typeof globalThis & {
  [ORGANISM_CLOCK_GLOBAL_KEY]?: unknown;
};

const DEFAULT_FIXED_STEP_MS = 1000 / 60;
const DEFAULT_MAX_DELTA_MS = 50;
const DEFAULT_SEED = 654;
const DEFAULT_AUTHORITY_ID = "gasper-host";

function wallNow(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function defaultSchedule(cb: (wallNowMs: number) => void): number {
  if (typeof requestAnimationFrame === "function") return requestAnimationFrame(cb);
  return setTimeout(() => cb(wallNow()), 16) as unknown as number;
}

function defaultCancel(handle: number): void {
  if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(handle);
  else clearTimeout(handle);
}

function clampSeed(seed: number): number {
  return (Number(seed) || 0) >>> 0;
}

function directionOf(value: number): OrganismClockDirection {
  return value > 0 ? 1 : value < 0 ? -1 : 0;
}

function faultMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Structural protocol guard; deliberately does not use `instanceof`. */
export function isGasperOrganismClockPort(value: unknown): value is GasperOrganismClockPort {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const methods = [
    "installGlobal",
    "start",
    "stop",
    "pause",
    "resume",
    "setMode",
    "getMode",
    "setSeed",
    "getSeed",
    "setFixedStepMs",
    "getFixedStepMs",
    "scrub",
    "setFixedTime",
    "setDeterministicTime",
    "step",
    "nowMs",
    "elapsed",
    "getDeltaMs",
    "getSignedDeltaMs",
    "getFrameIndex",
    "getLastFrame",
    "isRunning",
    "isPaused",
    "subscribe",
    "unsubscribe",
    "hasSubscriber",
    "inspect",
    "reset",
    "clearFault",
  ];
  return (
    v.version === ORGANISM_CLOCK_VERSION &&
    v.packet === ORGANISM_CLOCK_PACKET &&
    typeof v.authorityId === "string" &&
    methods.every((name) => typeof v[name] === "function")
  );
}

/**
 * Install one clock globally. A different compatible clock is a split-brain
 * error unless replacement is explicitly allowed for tests.
 */
export function installGasperOrganismClock(
  clock: GasperOrganismClockPort,
  opts: { replace?: boolean } = {},
): GasperOrganismClockPort {
  if (!isGasperOrganismClockPort(clock)) {
    throw new TypeError("Invalid Gasper organism clock port");
  }
  const host = globalThis as GlobalClockHost;
  const existing = host[ORGANISM_CLOCK_GLOBAL_KEY];
  if (existing === clock) return clock;
  if (isGasperOrganismClockPort(existing) && !opts.replace) {
    throw new Error(
      `Gasper organism clock split-brain refused: existing=${existing.authorityId} incoming=${clock.authorityId}`,
    );
  }
  host[ORGANISM_CLOCK_GLOBAL_KEY] = clock;
  return clock;
}

export class GasperOrganismClock implements GasperOrganismClockPort {
  readonly version = ORGANISM_CLOCK_VERSION;
  readonly packet = ORGANISM_CLOCK_PACKET;
  readonly authorityId: string;

  private mode: OrganismClockMode = "realtime";
  private running = false;
  private paused = true;
  private timeMs = 0;
  private elapsedMs = 0;
  private deltaMs = 0;
  private signedDeltaMs = 0;
  private frameIndex = 0;
  private seed: number;
  private fixedStepMs: number;
  private maxDeltaMs: number;
  private lastWallMs: number | null = null;
  private rafHandle: number | null = null;
  private lastFrame: OrganismClockFrame | null = null;
  private fault: OrganismClockFault | null = null;
  private dispatching = false;
  private readonly subscribers = new Map<string, OrganismClockSubscriber>();
  private readonly nowMsFn: () => number;
  private readonly scheduleFrameFn: (cb: (wallNowMs: number) => void) => number;
  private readonly cancelFrameFn: (handle: number) => void;

  constructor(opts: OrganismClockOptions = {}) {
    this.authorityId = opts.authorityId?.trim() || DEFAULT_AUTHORITY_ID;
    this.seed = clampSeed(opts.seed ?? DEFAULT_SEED);
    this.fixedStepMs = Math.max(1, opts.fixedStepMs ?? DEFAULT_FIXED_STEP_MS);
    this.maxDeltaMs = Math.max(1, opts.maxDeltaMs ?? DEFAULT_MAX_DELTA_MS);
    this.nowMsFn = opts.nowMs ?? wallNow;
    this.scheduleFrameFn = opts.scheduleFrame ?? defaultSchedule;
    this.cancelFrameFn = opts.cancelFrame ?? defaultCancel;
  }

  installGlobal(): this {
    installGasperOrganismClock(this);
    return this;
  }

  start(opts?: { mode?: OrganismClockMode }): this {
    if (opts?.mode) this.setMode(opts.mode);
    this.running = true;
    if (this.mode === "realtime") {
      this.paused = false;
      this.ensureDriver();
    } else {
      this.paused = true;
      this.stopDriver();
    }
    return this;
  }

  stop(): this {
    this.running = false;
    this.paused = true;
    this.stopDriver();
    this.lastWallMs = null;
    return this;
  }

  pause(): this {
    this.paused = true;
    this.stopDriver();
    this.lastWallMs = null;
    return this;
  }

  resume(): this {
    this.mode = "realtime";
    this.running = true;
    this.paused = false;
    this.lastWallMs = null;
    this.ensureDriver();
    return this;
  }

  setMode(mode: OrganismClockMode): this {
    this.mode = mode;
    this.lastWallMs = null;
    if (mode === "realtime") {
      if (this.running && !this.paused) this.ensureDriver();
    } else {
      this.paused = true;
      this.stopDriver();
    }
    return this;
  }

  getMode(): OrganismClockMode {
    return this.mode;
  }

  setSeed(seed: number): this {
    this.seed = clampSeed(seed);
    return this;
  }

  getSeed(): number {
    return this.seed;
  }

  setFixedStepMs(ms: number): this {
    this.fixedStepMs = Math.max(1, Number(ms) || DEFAULT_FIXED_STEP_MS);
    return this;
  }

  getFixedStepMs(): number {
    return this.fixedStepMs;
  }

  scrub(timeMs: number): OrganismClockFrame {
    this.assertNotDispatching();
    const target = Math.max(0, Number(timeMs) || 0);
    const signed = target - this.timeMs;
    this.mode = "deterministic";
    this.paused = true;
    this.stopDriver();
    this.lastWallMs = null;
    this.timeMs = target;
    this.elapsedMs += Math.abs(signed);
    this.setDelta(signed);
    return this.dispatchFrame();
  }

  setFixedTime(timeMs: number): OrganismClockFrame {
    return this.scrub(timeMs);
  }

  setDeterministicTime(timeMs: number): OrganismClockFrame {
    return this.scrub(timeMs);
  }

  step(deltaMs?: number): OrganismClockFrame {
    this.assertNotDispatching();
    const d = Math.max(
      0,
      Math.min(
        this.maxDeltaMs,
        Number.isFinite(deltaMs as number) ? Number(deltaMs) : this.fixedStepMs,
      ),
    );
    if (this.mode === "realtime") this.mode = "fixed-step";
    this.paused = true;
    this.stopDriver();
    this.lastWallMs = null;
    this.timeMs += d;
    this.elapsedMs += d;
    this.setDelta(d);
    return this.dispatchFrame();
  }

  nowMs(): number {
    return this.timeMs;
  }

  elapsed(): number {
    return this.elapsedMs;
  }

  getDeltaMs(): number {
    return this.deltaMs;
  }

  getSignedDeltaMs(): number {
    return this.signedDeltaMs;
  }

  getFrameIndex(): number {
    return this.frameIndex;
  }

  getLastFrame(): OrganismClockFrame | null {
    return this.lastFrame;
  }

  isRunning(): boolean {
    return this.running;
  }

  isPaused(): boolean {
    return this.paused;
  }

  subscribe(sub: OrganismClockSubscriber): () => void {
    if (!sub?.id || typeof sub.onFrame !== "function") {
      throw new TypeError("Organism clock subscriber requires id and onFrame");
    }
    const id = sub.id.trim();
    if (!id) throw new TypeError("Organism clock subscriber id must be non-empty");
    this.subscribers.set(id, {
      id,
      priority: Number.isFinite(sub.priority) ? sub.priority : 100,
      onFrame: sub.onFrame,
    });
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.subscribers.delete(id);
    };
  }

  unsubscribe(id: string): boolean {
    return this.subscribers.delete(id);
  }

  hasSubscriber(id: string): boolean {
    return this.subscribers.has(id);
  }

  inspect(): OrganismClockInspection {
    const ordered = this.orderedSubscribers();
    return Object.freeze({
      version: this.version,
      packet: this.packet,
      authorityId: this.authorityId,
      mode: this.mode,
      running: this.running,
      paused: this.paused,
      timeMs: this.timeMs,
      elapsedMs: this.elapsedMs,
      deltaMs: this.deltaMs,
      signedDeltaMs: this.signedDeltaMs,
      direction: directionOf(this.signedDeltaMs),
      frameIndex: this.frameIndex,
      seed: this.seed,
      fixedStepMs: this.fixedStepMs,
      maxDeltaMs: this.maxDeltaMs,
      subscriberIds: ordered.map((s) => s.id),
      subscriberCount: ordered.length,
      driverScheduled: this.rafHandle != null,
      dispatching: this.dispatching,
      fault: this.fault,
      lastFrame: this.lastFrame,
      solePerpetualDriver: true as const,
    });
  }

  reset(opts?: { seed?: number; timeMs?: number }): this {
    this.stopDriver();
    if (opts?.seed !== undefined) this.seed = clampSeed(opts.seed);
    this.timeMs = Math.max(0, opts?.timeMs ?? 0);
    this.elapsedMs = 0;
    this.deltaMs = 0;
    this.signedDeltaMs = 0;
    this.frameIndex = 0;
    this.lastFrame = null;
    this.lastWallMs = null;
    this.fault = null;
    this.mode = "deterministic";
    this.paused = true;
    this.running = false;
    return this;
  }

  clearFault(): this {
    this.fault = null;
    return this;
  }

  private ensureDriver(): void {
    if (this.rafHandle != null) return;
    if (!this.running || this.paused || this.mode !== "realtime") return;
    const loop = (wallNowMs: number) => {
      this.rafHandle = null;
      if (!this.running || this.paused || this.mode !== "realtime") return;
      this.advanceFromWall(wallNowMs);
      this.dispatchFrame();
      if (this.running && !this.paused && this.mode === "realtime") {
        this.rafHandle = this.scheduleFrameFn(loop);
      }
    };
    this.rafHandle = this.scheduleFrameFn(loop);
  }

  private stopDriver(): void {
    if (this.rafHandle == null) return;
    this.cancelFrameFn(this.rafHandle);
    this.rafHandle = null;
  }

  private advanceFromWall(wallNowMs: number): void {
    let signed = 0;
    if (this.lastWallMs == null) {
      this.lastWallMs = wallNowMs;
    } else {
      signed = Math.max(0, Math.min(this.maxDeltaMs, wallNowMs - this.lastWallMs));
      this.lastWallMs = wallNowMs;
      this.timeMs += signed;
      this.elapsedMs += signed;
    }
    this.setDelta(signed);
  }

  private setDelta(signed: number): void {
    this.signedDeltaMs = signed;
    this.deltaMs = Math.abs(signed);
  }

  private assertNotDispatching(): void {
    if (this.dispatching) {
      throw new Error("Gasper organism clock reentrant dispatch refused");
    }
  }

  private orderedSubscribers(): OrganismClockSubscriber[] {
    return [...this.subscribers.values()].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  }

  private dispatchFrame(): OrganismClockFrame {
    this.assertNotDispatching();
    this.dispatching = true;
    this.frameIndex += 1;
    const frame = Object.freeze({
      timeMs: this.timeMs,
      elapsedMs: this.elapsedMs,
      deltaMs: this.deltaMs,
      signedDeltaMs: this.signedDeltaMs,
      deltaSec: this.signedDeltaMs / 1000,
      direction: directionOf(this.signedDeltaMs),
      frameIndex: this.frameIndex,
      seed: this.seed,
      mode: this.mode,
      paused: this.paused,
      running: this.running,
    }) satisfies OrganismClockFrame;
    this.lastFrame = frame;

    try {
      for (const sub of this.orderedSubscribers()) {
        try {
          sub.onFrame(frame);
        } catch (error) {
          this.fault = Object.freeze({
            subscriberId: sub.id,
            frameIndex: frame.frameIndex,
            message: faultMessage(error),
          });
          // GASPER-COMPOSITION-001 Wave 3: one organ may fault without stopping
          // the organism clock. Preserve the latest receipt for inspection,
          // continue dispatching healthy subscribers, and allow later frames
          // to run so transient/render-local failures can recover in place.
          console.error(`[GasperOrganismClock] subscriber "${sub.id}" faulted`, error);
        }
      }
    } finally {
      this.dispatching = false;
    }
    return frame;
  }
}

let defaultClock: GasperOrganismClockPort | null = null;

export function getGasperOrganismClock(
  opts?: OrganismClockOptions,
): GasperOrganismClockPort {
  const host = globalThis as GlobalClockHost;
  const existing = host[ORGANISM_CLOCK_GLOBAL_KEY];
  if (isGasperOrganismClockPort(existing)) {
    defaultClock = existing;
    return existing;
  }
  if (defaultClock) return defaultClock;
  defaultClock = new GasperOrganismClock(opts);
  installGasperOrganismClock(defaultClock);
  return defaultClock;
}

/** Test-only replacement path. */
export function resetGasperOrganismClockForTests(
  opts?: OrganismClockOptions,
): GasperOrganismClock {
  const clock = new GasperOrganismClock(opts);
  installGasperOrganismClock(clock, { replace: true });
  defaultClock = clock;
  return clock;
}

export type GasperOrganismClockGlobal = GasperOrganismClockPort;
