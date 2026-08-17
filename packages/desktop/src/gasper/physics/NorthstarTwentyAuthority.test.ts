/**
 * N204 — the 20s notice → gather → zip → hold path must actually run.
 * Source-string absence of deleted nodes is not the contract.
 */
import "./gsapTestHydrate";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eightStateForwardId, mainFormOverride } from "../controller/livingIntent";
import { resetGasperOrganismClockForTests } from "../clock";

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

describe("eight-state forward authority", () => {
  it("suspends Presence restore when the eight-state loop is off", () => {
    expect(eightStateForwardId(false, "presence-neutral-settled")).toBeNull();
    expect(eightStateForwardId(false, null)).toBeNull();
    expect(eightStateForwardId(true, "presence-listening-receive")).toBe(
      "presence-listening-receive",
    );
    expect(eightStateForwardId(true, "")).toBeNull();
  });

  it("keeps the authored main form when a Presence-family endpoint arrives", () => {
    expect(mainFormOverride("wispwalker", "presence")).toBe("wispwalker");
    expect(mainFormOverride("wispwalker", "comet")).toBe("comet");
  });
});

describe("playNorthstarTwenty writer transitions", () => {
  beforeAll(async () => {
    ({ GasperRigController } = await import("../GasperRigController"));
  });

  beforeEach(() => {
    resetGasperOrganismClockForTests({
      authorityId: "n204-twenty",
      seed: 20260815,
      fixedStepMs: 50,
    });
  });

  afterEach(() => {
    resetGasperOrganismClockForTests({ authorityId: "n204-twenty-done" });
  });

  it("releases listening-orient before gather and stays wispwalker through zip/hold", () => {
    const ctl = new GasperRigController();
    const clock = ctl.getOrganismClock();
    clock.start({ mode: "fixed-step" });
    clock.setFixedStepMs(50);

    expect(ctl.getTuningLabTelemetry().authoredMainForm).toBe("wispwalker");

    ctl.playNorthstarTwenty();

    const snap = () => {
      const review = ctl.ownerReviewStatus();
      const tel = ctl.getTuningLabTelemetry();
      return {
        embodiment: review.embodiment,
        expression: review.expression,
        authored: tel.authoredMainForm,
        boo: review.boo,
        eightLoop: review.living.eightStateLoop,
        physicsMode: tel.physicsMode,
      };
    };

    expect(snap()).toMatchObject({
      embodiment: "wispwalker",
      authored: "wispwalker",
      expression: "neutral",
      boo: false,
      eightLoop: false,
    });

    stepTo(clock, 6.6);
    expect(snap()).toMatchObject({
      embodiment: "wispwalker",
      authored: "wispwalker",
      expression: "listening-orient",
      boo: false,
      eightLoop: false,
    });

    stepTo(clock, 8.7);
    expect(snap().expression).toBe("listening-orient");

    stepTo(clock, 8.8);
    expect(snap()).toMatchObject({
      embodiment: "wispwalker",
      authored: "wispwalker",
      expression: "neutral-settled",
      eightLoop: false,
    });

    stepTo(clock, 9.2);
    const gather = snap();
    expect(gather.expression).toBe("neutral-settled");
    expect(gather.embodiment).toBe("wispwalker");
    expect(gather.authored).toBe("wispwalker");
    expect(gather.boo).toBe(true);
    expect(gather.eightLoop).toBe(false);

    stepTo(clock, 10.0);
    const zip = snap();
    expect(zip.expression).toBe("neutral-settled");
    expect(zip.embodiment).toBe("wispwalker");
    expect(zip.authored).toBe("wispwalker");
    expect(zip.boo).toBe(true);
    expect(zip.eightLoop).toBe(false);

    stepTo(clock, 11.2);
    const airborne = ctl.getGaitProofSample();
    expect(airborne.bodyY).toBeGreaterThan(80);
    expect(ctl.getTuningLabTelemetry().physicsMode).toMatch(/comet-fly|locomotion/);

    stepTo(clock, 16.5);
    const hold = snap();
    expect(hold.expression).toBe("neutral-settled");
    expect(hold.embodiment).toBe("wispwalker");
    expect(hold.authored).toBe("wispwalker");
    expect(hold.boo).toBe(true);
    expect(hold.eightLoop).toBe(false);
  });

  it("runs in place through the strut window — cadence, no travel", () => {
    const ctl = new GasperRigController();
    const clock = ctl.getOrganismClock();
    clock.start({ mode: "fixed-step" });
    clock.setFixedStepMs(50);
    ctl.playNorthstarTwenty();
    stepTo(clock, 3.4);
    const mid = ctl.getGaitProofSample();
    expect(Math.abs(mid.bodyX)).toBeLessThan(24);
    expect(Math.abs(mid.bodyZ)).toBeLessThan(24);
    expect(Math.abs(mid.supportSide)).toBeGreaterThan(0);
    expect(mid.swingLift).toBeGreaterThan(80);
    expect(mid.stepHz).toBeGreaterThan(1.4);
  });

  it("opening plant is sealed until strut-go", () => {
    const ctl = new GasperRigController();
    const clock = ctl.getOrganismClock();
    clock.start({ mode: "fixed-step" });
    clock.setFixedStepMs(50);
    ctl.playNorthstarTwenty();
    stepTo(clock, 2.5);
    const plant = ctl.getGaitProofSample();
    expect(plant.stepHz).toBe(0);
    expect(Math.abs(plant.supportSide)).toBe(0);
    expect(plant.swingLift).toBe(0);
  });

  it("restart stands down leftover run-in-place", () => {
    const ctl = new GasperRigController();
    const clock = ctl.getOrganismClock();
    clock.start({ mode: "fixed-step" });
    clock.setFixedStepMs(50);
    ctl.playNorthstarTwenty();
    stepTo(clock, 3.4);
    expect(Math.abs(ctl.getGaitProofSample().supportSide)).toBeGreaterThan(0);
    expect(ctl.getGaitProofSample().stepHz).toBeGreaterThan(1.4);
    ctl.playNorthstarTwenty();
    clock.step(50);
    clock.step(50);
    const sealed = ctl.getGaitProofSample();
    expect(Math.abs(sealed.supportSide)).toBe(0);
    expect(sealed.stepHz).toBe(0);
  });
});
