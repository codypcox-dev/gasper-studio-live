/**
 * Owner 20s: walk in place → spin → Boo. Source + clock writer contract.
 */
import "./gsapTestHydrate";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resetGasperOrganismClockForTests } from "../clock";

const controllerSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../GasperRigController.ts"),
  "utf8",
);

let GasperRigController: typeof import("../GasperRigController").GasperRigController;

function stepTo(
  clock: { nowMs: () => number; step: (d?: number) => unknown },
  sec: number,
  stepMs = 50,
) {
  const target = sec * 1000;
  let guard = 0;
  while (clock.nowMs() + 1e-6 < target) {
    const remain = target - clock.nowMs();
    clock.step(Math.min(stepMs, remain));
    if (++guard > 8000) throw new Error(`clock did not reach ${sec}s`);
  }
}

describe("playWalkBooTwenty", () => {
  beforeAll(async () => {
    ({ GasperRigController } = await import("../GasperRigController"));
  });

  beforeEach(() => {
    resetGasperOrganismClockForTests({
      authorityId: "walk-boo-20s",
      seed: 20260816,
      fixedStepMs: 50,
    });
  });

  afterEach(() => {
    resetGasperOrganismClockForTests({ authorityId: "walk-boo-20s-done" });
  });

  it("uses in-place walk then Boo flight, never a second walk writer", () => {
    const start = controllerSrc.indexOf("playWalkBooTwenty");
    const play = controllerSrc.slice(start, start + 4200);
    expect(play).toContain('this.setLiveFormCoeff("walkEnable", 1)');
    expect(play).toContain('this.setLiveFormCoeff("walkAmp", 1.2)');
    expect(play).toContain("x0: planted.x");
    expect(play).toContain('this.setLiveFormCoeff("walkEnable", 0)');
    expect(play).toContain("this.enableBoo(true)");
    expect(play).toContain("launchComet");
    expect(play).toContain('id: "walk-boo-20s"');
    expect(play).toContain('fire("loop", 20, t');
    expect(play).not.toContain("requestBooLanding");
    expect(play).not.toContain("gsap.");
    expect(play).not.toMatch(/setWorldPose\s*\(/);
    expect(play).not.toContain("fileStrutLocomotion");
  });

  it("walks grounded then goes Boo without leaving Wispwalker", () => {
    const ctl = new GasperRigController();
    const clock = ctl.getOrganismClock();
    clock.start({ mode: "fixed-step" });
    clock.setFixedStepMs(50);
    ctl.playWalkBooTwenty();

    const snap = () => {
      const review = ctl.ownerReviewStatus();
      return {
        embodiment: review.embodiment,
        boo: review.boo,
        eightLoop: review.living.eightStateLoop,
      };
    };

    expect(snap()).toMatchObject({
      embodiment: "wispwalker",
      boo: false,
      eightLoop: false,
    });

    stepTo(clock, 3);
    expect(snap()).toMatchObject({
      embodiment: "wispwalker",
      boo: false,
    });

    stepTo(clock, 6);
    expect(snap()).toMatchObject({
      embodiment: "wispwalker",
      boo: true,
      eightLoop: false,
    });

    stepTo(clock, 10.5);
    expect(snap()).toMatchObject({
      embodiment: "wispwalker",
      boo: true,
    });
  });

  it("loops: at 20s it plants and walks again", () => {
    const ctl = new GasperRigController();
    const clock = ctl.getOrganismClock();
    clock.start({ mode: "fixed-step" });
    clock.setFixedStepMs(50);
    ctl.setWalkBooLoop(true);
    ctl.playWalkBooTwenty();
    stepTo(clock, 6);
    expect(ctl.ownerReviewStatus().boo).toBe(true);
    stepTo(clock, 20.1);
    const after = ctl.ownerReviewStatus();
    expect(after.boo).toBe(false);
    expect(after.embodiment).toBe("wispwalker");
  });
});