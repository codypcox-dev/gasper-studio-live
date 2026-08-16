/**
 * GASPER-FINISH-01 / Task 3 (VEC-401) — single organism clock focused test.
 *
 * Proves the typed clock contract locally (the structural suite referenced by
 * the architecture lock is absent from this tree; this re-establishes proof):
 *  1. One driver model: deterministic/fixed-step modes advance only via
 *     explicit step/scrub; realtime advances only through the injected driver.
 *  2. Monotonic frame index; fixed-step increments; signed delta on reverse
 *     scrub; pause stops advancement.
 *  3. Subscriber priority dispatch order (10 before 20 before 90).
 *  4. Subscriber faults are contained into inspection without stopping organism time.
 *  5. Split-brain refusal: a second compatible clock cannot overwrite the
 *     installed global authority without explicit replace.
 *  6. Deterministic replay: identical seed + command sequence yields
 *     identical frame traces.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  GasperOrganismClock,
  installGasperOrganismClock,
  ORGANISM_CLOCK_GLOBAL_KEY,
  type OrganismClockFrame,
} from "./GasperOrganismClock";

function makeClock(authorityId = "test-clock") {
  let wall = 1000;
  const pending: Array<(wallNowMs: number) => void> = [];
  const clock = new GasperOrganismClock({
    authorityId,
    seed: 654,
    fixedStepMs: 1000 / 60,
    nowMs: () => wall,
    scheduleFrame: (cb) => {
      pending.push(cb);
      return pending.length;
    },
    cancelFrame: () => {
      pending.length = 0;
    },
  });
  return {
    clock,
    advanceWall: (ms: number) => {
      wall += ms;
      const cb = pending.shift();
      if (cb) cb(wall);
    },
  };
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[ORGANISM_CLOCK_GLOBAL_KEY];
});

describe("GasperOrganismClock (VEC-401)", () => {
  it("advances deterministically in fixed-step mode with monotonic frames", () => {
    const { clock } = makeClock();
    clock.start({ mode: "fixed-step" });
    expect(clock.isRunning()).toBe(true);

    const f1 = clock.step();
    const f2 = clock.step();
    const f3 = clock.step();

    expect(f1.frameIndex).toBeGreaterThanOrEqual(0);
    expect(f2.frameIndex).toBe(f1.frameIndex + 1);
    expect(f3.frameIndex).toBe(f2.frameIndex + 1);
    expect(f2.timeMs - f1.timeMs).toBeCloseTo(1000 / 60, 6);
    expect(f3.deltaMs).toBeCloseTo(1000 / 60, 6);
    expect(f3.direction).toBe(1);
    expect(clock.getFrameIndex()).toBe(f3.frameIndex);
  });

  it("keeps the realtime driver scheduled after a contained subscriber fault", () => {
    const { clock, advanceWall } = makeClock();
    const healthyFrames: number[] = [];
    let throwOnce = true;
    clock.subscribe({
      id: "faulty-realtime",
      priority: 5,
      onFrame: () => {
        if (throwOnce) {
          throwOnce = false;
          throw new Error("realtime-boom");
        }
      },
    });
    clock.subscribe({ id: "healthy-realtime", priority: 10, onFrame: (f) => healthyFrames.push(f.frameIndex) });

    clock.start({ mode: "realtime" });
    advanceWall(16.7);
    expect(clock.inspect().fault?.subscriberId).toBe("faulty-realtime");
    expect(clock.inspect().driverScheduled).toBe(true);
    advanceWall(16.7);

    expect(healthyFrames).toEqual([1, 2]);
    expect(clock.getFrameIndex()).toBe(2);
    expect(clock.isRunning()).toBe(true);
    expect(clock.isPaused()).toBe(false);
  });

  it("supports scrub, reverse scrub with signed delta, and pause", () => {
    const { clock } = makeClock();
    clock.start({ mode: "deterministic" });

    const fwd = clock.scrub(500);
    expect(fwd.timeMs).toBe(500);
    expect(fwd.signedDeltaMs).toBeGreaterThan(0);

    const back = clock.scrub(200);
    expect(back.timeMs).toBe(200);
    expect(back.signedDeltaMs).toBeLessThan(0);
    expect(back.direction).toBe(-1);
    expect(back.deltaMs).toBeCloseTo(300, 6); // magnitude non-negative
    expect(back.frameIndex).toBeGreaterThan(fwd.frameIndex); // index still monotonic

    clock.pause();
    expect(clock.isPaused()).toBe(true);
  });

  it("drives realtime mode only through the single injected driver", () => {
    const { clock, advanceWall } = makeClock();
    const frames: number[] = [];
    clock.subscribe({ id: "probe", priority: 10, onFrame: (f) => frames.push(f.frameIndex) });

    clock.start({ mode: "realtime" });
    expect(clock.inspect().driverScheduled).toBe(true);

    advanceWall(16.7);
    advanceWall(16.7);
    expect(frames.length).toBe(2);

    clock.pause();
    expect(clock.inspect().driverScheduled).toBe(false);
    advanceWall(16.7);
    expect(frames.length).toBe(2); // paused: no advancement
    clock.stop();
  });

  it("dispatches subscribers in ascending priority order", () => {
    const { clock } = makeClock();
    const order: string[] = [];
    clock.subscribe({ id: "90:formmaster-render", priority: 90, onFrame: () => order.push("90") });
    clock.subscribe({ id: "40:domain-tick", priority: 40, onFrame: () => order.push("40") });
    clock.subscribe({ id: "10:gsap-root", priority: 10, onFrame: () => order.push("10") });
    clock.subscribe({ id: "20:eight-state", priority: 20, onFrame: () => order.push("20") });
    clock.subscribe({ id: "30:living-runtime", priority: 30, onFrame: () => order.push("30") });

    clock.start({ mode: "fixed-step" });
    clock.step();

    expect(order).toEqual(["10", "20", "30", "40", "90"]);
  });

  it("rejects a nested step without mutating the outer frame clock state", () => {
    const { clock } = makeClock();
    let nestedError: unknown = null;
    let deltaInsideSubscriber = -1;

    clock.subscribe({
      id: "reentrant-render-request",
      priority: 10,
      onFrame: () => {
        try {
          clock.step(0);
        } catch (error) {
          nestedError = error;
        }
        deltaInsideSubscriber = clock.getDeltaMs();
      },
    });

    clock.start({ mode: "fixed-step" });
    const outer = clock.step(1000 / 120);

    expect(nestedError).toBeInstanceOf(Error);
    expect((nestedError as Error).message).toContain(
      "Gasper organism clock reentrant dispatch refused",
    );
    expect(deltaInsideSubscriber).toBeCloseTo(1000 / 120, 6);
    expect(clock.getDeltaMs()).toBeCloseTo(1000 / 120, 6);
    expect(clock.nowMs()).toBeCloseTo(1000 / 120, 6);
    expect(clock.getFrameIndex()).toBe(outer.frameIndex);
  });

  it("contains subscriber faults without stopping healthy organs or later frames", () => {
    const { clock } = makeClock();
    const healthyFrames: number[] = [];
    let throwOnce = true;
    clock.subscribe({
      id: "faulty",
      priority: 10,
      onFrame: () => {
        if (throwOnce) {
          throwOnce = false;
          throw new Error("boom");
        }
      },
    });
    clock.subscribe({
      id: "healthy",
      priority: 20,
      onFrame: (frame) => healthyFrames.push(frame.frameIndex),
    });
    clock.start({ mode: "fixed-step" });
    clock.step();
    clock.step();

    const inspection = clock.inspect();
    expect(inspection.fault).not.toBeNull();
    expect(inspection.fault?.subscriberId).toBe("faulty");
    expect(inspection.fault?.message).toContain("boom");
    expect(healthyFrames).toEqual([1, 2]);
    expect(clock.isRunning()).toBe(true);
    expect(clock.getFrameIndex()).toBe(2);

    clock.clearFault();
    expect(clock.inspect().fault).toBeNull();
  });

  it("refuses split-brain global install without explicit replace", () => {
    const a = makeClock("authority-a").clock;
    const b = makeClock("authority-b").clock;

    installGasperOrganismClock(a);
    expect(() => installGasperOrganismClock(b)).toThrow(/split-brain/);

    // Explicit replace is allowed (test lifecycle), then b is the authority.
    installGasperOrganismClock(b, { replace: true });
    expect(() => installGasperOrganismClock(a)).toThrow(/split-brain/);
  });

  it("replays identical frame traces for identical seed and command sequence", () => {
    const run = (): OrganismClockFrame[] => {
      const { clock } = makeClock("replay-clock");
      clock.start({ mode: "fixed-step" });
      const frames: OrganismClockFrame[] = [];
      for (let i = 0; i < 120; i++) frames.push(clock.step());
      clock.scrub(500);
      clock.scrub(250);
      for (let i = 0; i < 60; i++) frames.push(clock.step());
      return frames;
    };

    const a = run();
    const b = run();
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i]!.timeMs).toBe(b[i]!.timeMs);
      expect(a[i]!.frameIndex).toBe(b[i]!.frameIndex);
      expect(a[i]!.deltaMs).toBe(b[i]!.deltaMs);
      expect(a[i]!.signedDeltaMs).toBe(b[i]!.signedDeltaMs);
      expect(a[i]!.seed).toBe(b[i]!.seed);
    }
  });
});
