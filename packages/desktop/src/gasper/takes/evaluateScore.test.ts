import { afterEach, describe, expect, it } from "vitest";
import { applyScoreBinds, evaluateScore, parseScoreChannel } from "./evaluateScore";
import { NORTHSTAR_TWENTY_TAKE } from "./NorthstarTwentyTake";

describe("evaluateScore", () => {
  afterEach(() => {
    const host = globalThis as {
      __GASPER_ORBIT_YAW__?: number;
      __GASPER_HANDLE_STRETCH__?: number;
      __GASPER_GAIT_DRIVE__?: number;
      __GASPER_LIVE_COEFFS__?: { pearl?: { depth?: number } };
      SidekickFormMasterRig?: unknown;
    };
    delete host.__GASPER_ORBIT_YAW__;
    delete host.__GASPER_HANDLE_STRETCH__;
    delete host.__GASPER_GAIT_DRIVE__;
    delete host.__GASPER_LIVE_COEFFS__;
    delete host.SidekickFormMasterRig;
  });

  it("at 4s walk is on, comet is not an impulse, stretch is fenced", () => {
    const score = evaluateScore(NORTHSTAR_TWENTY_TAKE, 4);
    expect(score.walkEnable).toBe(1);
    expect(score.runInPlace).not.toBeNull();
    expect(score.impulses.some((i) => i.action.type === "launchComet")).toBe(false);
    expect(score.boo).toBe(false);
    expect(score.params["handles.stretch"] ?? 0).toBe(0);
    expect(score.params["orbit.yaw"]).toBe(0);
    expect(score.params["pearl.depth"]).toBeCloseTo(0.72, 5);
    expect(score.params["gait.hz"]).toBeCloseTo(2.6, 5);
  });

  it("at 6.85 pearl.depth has left rest; walk is off; still no comet", () => {
    const score = evaluateScore(NORTHSTAR_TWENTY_TAKE, 6.85);
    expect(score.walkEnable).toBe(0);
    expect(score.runInPlace).toBeNull();
    expect(score.impulses.some((i) => i.action.type === "launchComet")).toBe(false);
    expect(score.params["pearl.depth"]).toBeGreaterThan(0.72);
    expect(score.params["pearl.depth"]).toBeLessThan(1.1);
  });

  it("at 12 comet is present and walk is off", () => {
    const score = evaluateScore(NORTHSTAR_TWENTY_TAKE, 12);
    expect(score.walkEnable).toBe(0);
    expect(score.impulses.some((i) => i.action.type === "launchComet")).toBe(true);
    expect(score.boo).toBe(true);
  });

  it("channel ids are node.param", () => {
    expect(parseScoreChannel("orbit.yaw")).toEqual({ node: "orbit", param: "yaw" });
    expect(parseScoreChannel("yaw")).toEqual({ node: "orbit", param: "yaw" });
    expect(parseScoreChannel("face")).toEqual({ node: "pearl", param: "depth" });
    expect(parseScoreChannel("stretch")).toEqual({ node: "handles", param: "stretch" });
    const keys = Object.keys(NORTHSTAR_TWENTY_TAKE.tracks ?? {});
    expect(keys).toEqual(expect.arrayContaining(["orbit.yaw", "pearl.depth", "gait.hz", "stretch"]));
    expect(keys).not.toContain("yaw");
  });

  it("applyScoreBinds writes orbit and pearl onto the host without setYaw", () => {
    const yawCalls: number[] = [];
    const host = globalThis as {
      __GASPER_ORBIT_YAW__?: number;
      __GASPER_HANDLE_STRETCH__?: number;
      __GASPER_LIVE_COEFFS__?: { pearl?: { depth?: number } };
      SidekickFormMasterRig?: { setYaw?: (y: number) => void; setOrbit?: (y: number, p: number) => void };
    };
    host.SidekickFormMasterRig = {
      setYaw: (y) => yawCalls.push(y),
      setOrbit: () => {},
    };
    applyScoreBinds([
      { node: "orbit", param: "yaw", value: -22 },
      { node: "pearl", param: "depth", value: 1.02 },
      { node: "handles", param: "stretch", value: 0.4 },
    ]);
    expect(host.__GASPER_ORBIT_YAW__).toBe(-22);
    expect(host.__GASPER_LIVE_COEFFS__?.pearl?.depth).toBeCloseTo(1.02);
    expect(host.__GASPER_HANDLE_STRETCH__).toBeCloseTo(0.4);
    expect(yawCalls).toEqual([]);
  });

  it("northstar take has no headingWindows", () => {
    expect(NORTHSTAR_TWENTY_TAKE.headingWindows).toBeUndefined();
  });

  it("at seat heading and orbit.yaw are both -22 but they are different sinks", () => {
    const score = evaluateScore(NORTHSTAR_TWENTY_TAKE, 5.2);
    expect(score.headingDeg).toBeCloseTo(-22, 5);
    expect(score.params["orbit.yaw"]).toBeCloseTo(-22, 5);
  });
});
