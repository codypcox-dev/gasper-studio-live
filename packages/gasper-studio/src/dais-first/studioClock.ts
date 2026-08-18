/**
 * One playhead for the desk. Take time uses the organism clock (VEC-401).
 * Mixing wall-clock time with clock.nowMs() was the dead scrubber.
 */
import {
  playNorthstarTwentyFromRail,
  stopWalkBooTwentyFromRail,
} from "./daisFirstControls";

export const TAKE_DURATION_MS = 20_000;

export type StudioPlayhead = {
  t: number;
  dur: number;
  mode: "take" | "gait";
  paused: boolean;
  playing: boolean;
};

type ClockPort = {
  nowMs: () => number;
  isPaused: () => boolean;
  pause: () => void;
  resume: () => void;
  scrub?: (timeMs: number) => void;
};

type Host = {
  __GASPER_ORGANISM_CLOCK__?: ClockPort;
  __GASPER_TAKE_T0__?: number;
  __GASPER_SCRUB_MS__?: number;
  __GASPER_SCRUB_PHASE__?: number;
  __GASPER_SCRUB_HOLD__?: number;
  __GASPER_TAKE_PAUSED__?: number;
};

function host(): Host {
  return globalThis as Host;
}

export function organismClock(): ClockPort | null {
  const c = host().__GASPER_ORGANISM_CLOCK__;
  if (!c || typeof c.nowMs !== "function") return null;
  return c;
}

export function readPlayhead(): StudioPlayhead {
  const h = host();
  const clock = organismClock();
  const paused = clock?.isPaused?.() === true || h.__GASPER_TAKE_PAUSED__ === 1 || h.__GASPER_SCRUB_HOLD__ === 1;
  const t0 = Number(h.__GASPER_TAKE_T0__);
  if (Number.isFinite(t0)) {
    const now = clock?.nowMs?.() ?? 0;
    const raw = Number.isFinite(h.__GASPER_SCRUB_MS__) && (paused || h.__GASPER_SCRUB_HOLD__ === 1)
      ? Number(h.__GASPER_SCRUB_MS__)
      : now - t0;
    const t = ((raw % TAKE_DURATION_MS) + TAKE_DURATION_MS) % TAKE_DURATION_MS;
    return { t, dur: TAKE_DURATION_MS, mode: "take", paused, playing: !paused };
  }
  const av = typeof document !== "undefined" ? document.querySelector("#avatar") as HTMLElement | null : null;
  const phase = Number(av?.dataset.gaitPhase ?? 0);
  return { t: ((phase % 1) + 1) % 1, dur: 1, mode: "gait", paused, playing: !paused };
}

export function pauseStudio(): void {
  const h = host();
  h.__GASPER_TAKE_PAUSED__ = 1;
  h.__GASPER_SCRUB_HOLD__ = 1;
  const ph = readPlayhead();
  if (ph.mode === "take") h.__GASPER_SCRUB_MS__ = ph.t;
  else h.__GASPER_SCRUB_PHASE__ = ph.t;
  organismClock()?.pause();
}

export function resumeStudio(): void {
  const h = host();
  const clock = organismClock();
  const ph = readPlayhead();
  h.__GASPER_TAKE_PAUSED__ = 0;
  h.__GASPER_SCRUB_HOLD__ = 0;
  if (ph.mode === "take" && clock) {
    h.__GASPER_TAKE_T0__ = clock.nowMs() - ph.t;
    h.__GASPER_SCRUB_MS__ = undefined;
  }
  clock?.resume();
}

export function toggleStudioPlayback(): { playing: boolean } {
  const ph = readPlayhead();
  if (ph.mode !== "take") {
    playNorthstarTwentyFromRail();
    resumeStudio();
    return { playing: true };
  }
  if (ph.paused) {
    resumeStudio();
    return { playing: true };
  }
  pauseStudio();
  return { playing: false };
}

export function stopStudio(): void {
  stopWalkBooTwentyFromRail();
  const h = host();
  h.__GASPER_TAKE_T0__ = undefined;
  h.__GASPER_SCRUB_MS__ = undefined;
  h.__GASPER_SCRUB_HOLD__ = 0;
  h.__GASPER_TAKE_PAUSED__ = 0;
  organismClock()?.resume();
}

export function scrubStudio(t: number): StudioPlayhead {
  const h = host();
  const clock = organismClock();
  const ph = readPlayhead();
  const clamped = Math.max(0, Math.min(ph.dur, t));
  h.__GASPER_SCRUB_HOLD__ = 1;
  if (ph.mode === "take") {
    h.__GASPER_SCRUB_MS__ = clamped;
    if (clock) {
      h.__GASPER_TAKE_T0__ = clock.nowMs() - clamped;
      // pause() stops the rAF driver. One zero-dt step dispatches
      // take:id so evaluateTake sees the new t without advancing physics.
      clock.step?.(0);
    }
  } else {
    h.__GASPER_SCRUB_PHASE__ = clamped;
  }
  return { ...ph, t: clamped, paused: true, playing: false };
}

export function releaseScrub(): void {
  const h = host();
  if (h.__GASPER_TAKE_PAUSED__ === 1) return;
  h.__GASPER_SCRUB_HOLD__ = 0;
}

export function formatPlayhead(ph: StudioPlayhead): { now: string; end: string } {
  if (ph.mode === "take") {
    return { now: (ph.t / 1000).toFixed(1), end: "20.0" };
  }
  return { now: `φ ${ph.t.toFixed(2)}`, end: "step" };
}
