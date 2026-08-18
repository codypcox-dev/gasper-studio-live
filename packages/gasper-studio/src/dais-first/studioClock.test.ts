import { readFileSync } from "node:fs";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  formatPlayhead,
  pauseStudio,
  readPlayhead,
  resumeStudio,
  scrubStudio,
  TAKE_DURATION_MS,
} from "./studioClock";

describe("studioClock", () => {
  beforeEach(() => {
    const g = globalThis as {
      __GASPER_TAKE_T0__?: number;
      __GASPER_SCRUB_MS__?: number;
      __GASPER_SCRUB_HOLD__?: number;
      __GASPER_TAKE_PAUSED__?: number;
      __GASPER_ORGANISM_CLOCK__?: {
        nowMs: () => number;
        isPaused: () => boolean;
        pause: () => void;
        resume: () => void;
      };
    };
    let t = 5000;
    let paused = false;
    g.__GASPER_ORGANISM_CLOCK__ = {
      nowMs: () => t,
      isPaused: () => paused,
      pause: () => {
        paused = true;
      },
      resume: () => {
        paused = false;
      },
    };
    g.__GASPER_TAKE_T0__ = 1000;
    g.__GASPER_SCRUB_MS__ = undefined;
    g.__GASPER_SCRUB_HOLD__ = 0;
    g.__GASPER_TAKE_PAUSED__ = 0;
  });

  afterEach(() => {
    const g = globalThis as {
      __GASPER_SCRUB_HOLD__?: number;
      __GASPER_SCRUB_MS__?: number;
    };
    g.__GASPER_SCRUB_HOLD__ = 0;
    g.__GASPER_SCRUB_MS__ = undefined;
  });

  it("reads take time from the organism clock, not wall time", () => {
    const ph = readPlayhead();
    expect(ph.mode).toBe("take");
    expect(ph.t).toBe(4000);
    expect(ph.dur).toBe(TAKE_DURATION_MS);
    expect(formatPlayhead(ph).now).toBe("4.0");
  });

  it("pauses and holds the playhead", () => {
    pauseStudio();
    const ph = readPlayhead();
    expect(ph.paused).toBe(true);
    expect(ph.t).toBe(4000);
  });

  it("scrubs the take without mixing performance.now", () => {
    const next = scrubStudio(12500);
    expect(next.t).toBe(12500);
    expect(readPlayhead().t).toBe(12500);
    resumeStudio();
  });

  it("seek is T0 = nowMs − ms; playhead while paused equals ms", () => {
    const g = globalThis as {
      __GASPER_TAKE_T0__?: number;
      __GASPER_ORGANISM_CLOCK__?: { nowMs: () => number };
    };
    const next = scrubStudio(3500);
    expect(next.t).toBe(3500);
    expect(next.paused).toBe(true);
    const ph = readPlayhead();
    expect(ph.t).toBe(3500);
    expect(ph.paused).toBe(true);
    const clock = g.__GASPER_ORGANISM_CLOCK__;
    expect(clock).toBeDefined();
    expect(clock!.nowMs() - Number(g.__GASPER_TAKE_T0__)).toBe(3500);
  });

  it("does not call clock.scrub(nowMs) as the take seek", () => {
    const src = readFileSync(new URL("./studioClock.ts", import.meta.url), "utf8");
    expect(src).not.toContain("clock.scrub?.(clock.nowMs())");
    expect(src).not.toMatch(/performance\.now\s*\(/);
    expect(src).toContain("__GASPER_SCRUB_HOLD__ = 1");
    expect(src).toContain("clock.nowMs() - clamped");
  });
});
