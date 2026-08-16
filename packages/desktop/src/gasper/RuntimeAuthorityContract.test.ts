import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const loop = read("./eight-state-loop/EightStateLoopController.ts");
const living = read("./GasperLivingRuntime.ts");
const controller = read("./GasperRigController.ts");
const gsapBridge = read("./clock/GasperGsapClockBridge.ts");
const layout = read("./GasperDaisLayoutReady.ts");

describe("GASPER-COMPOSITION-001 Wave 3 single-writer authority", () => {
  it("GSAP sleeps its own ticker and consumes organism-clock frames", () => {
    expect(gsapBridge).toContain("typedApi.ticker.remove(typedApi.updateRoot)");
    expect(gsapBridge).toContain("typedApi.ticker.sleep?.()");
    expect(gsapBridge).toContain("clock.subscribe({");
    expect(gsapBridge).toContain("typedApi.updateRoot(frame.timeMs / 1000)");
  });

  it("living presentation coalescers read organism time rather than advancing it", () => {
    expect(loop).toContain("timeMs: this.organismClock.nowMs()");
    expect(loop).toContain("deltaMs: this.organismClock.getDeltaMs()");
    expect(living).toContain("timeMs: this.organismClock.nowMs()");
    expect(living).toContain("deltaMs: this.organismClock.getDeltaMs()");
  });

  it("pending one-shot presentation writes are cancelled when authority stops/detaches", () => {
    const loopStart = loop.indexOf("  stop() {");
    const livingStart = living.indexOf("  stop() {");
    const detachStart = controller.indexOf("  detach() {");
    const loopStop = loop.slice(loopStart, loop.indexOf("  /** Enter dormant", loopStart));
    const livingStop = living.slice(livingStart, living.indexOf("  /**", livingStart + 10));
    const controllerDetach = controller.slice(detachStart, controller.indexOf("  /**", detachStart + 10));
    expect(loopStop).toContain("this.pushRaf != null");
    expect(loopStop).toContain("cancelAnimationFrame(this.pushRaf)");
    expect(loopStop).toContain("this.pushRaf = null");
    expect(livingStop).toContain("this.pushRaf != null");
    expect(livingStop).toContain("cancelAnimationFrame(this.pushRaf)");
    expect(livingStop).toContain("this.pushRaf = null");
    expect(controllerDetach).toContain("this.emitRaf != null");
    expect(controllerDetach).toContain("cancelAnimationFrame(this.emitRaf)");
    expect(controllerDetach).toContain("this.emitRaf = null");
  });

  it("layout rAF polling is bounded and cancelable, not an organism time writer", () => {
    expect(layout).toContain("frames >= max");
    expect(layout).toContain("cancelAnimationFrame(raf)");
    expect(layout).not.toContain("organismClock");
  });
});
