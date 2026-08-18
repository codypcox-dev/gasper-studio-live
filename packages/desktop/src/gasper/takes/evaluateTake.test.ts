import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evaluateTake } from "./evaluateTake";
import { NORTHSTAR_TWENTY_TAKE } from "./NorthstarTwentyTake";

const here = dirname(fileURLToPath(import.meta.url));

function authoredWalkEnableAt(t: number): number {
  let value = typeof NORTHSTAR_TWENTY_TAKE.setup.walkEnable === "number"
    ? NORTHSTAR_TWENTY_TAKE.setup.walkEnable
    : 0;
  for (const beat of NORTHSTAR_TWENTY_TAKE.beats) {
    if (beat.at > t) continue;
    for (const action of beat.actions) {
      if (action.type === "walkEnable") value = action.on ? 1 : 0;
    }
  }
  return value;
}

describe("evaluateTake", () => {
  it("at t=4 walkEnable is the authored value; comet is not yet an impulse", () => {
    const take = NORTHSTAR_TWENTY_TAKE;
    const strutGo = take.beats.find((b) => b.id === "strut-go");
    const gather = take.beats.find((b) => b.id === "gather");
    expect(strutGo?.at).toBeLessThanOrEqual(4);
    expect(gather?.at).toBeGreaterThan(4);
    expect(gather?.actions.some((a) => a.type === "launchComet")).toBe(true);

    const state = evaluateTake(take, 4);
    expect(state.walkEnable).toBe(authoredWalkEnableAt(4));
    expect(state.walkEnable).toBe(1);
    expect(state.headingDeg).toBe(0);
    expect(state.boo).toBe(false);
    expect(state.impulses.some((i) => i.action.type === "launchComet")).toBe(false);
    expect(state.impulses.map((i) => i.action.type)).not.toContain("launchComet");
  });

  it("at t=12 the comet impulse is present if the take has it before 12", () => {
    const take = NORTHSTAR_TWENTY_TAKE;
    const gather = take.beats.find((b) => b.id === "gather");
    expect(gather?.at).toBeLessThan(12);
    expect(gather?.actions.some((a) => a.type === "launchComet")).toBe(true);

    const state = evaluateTake(take, 12);
    const comet = state.impulses.find((i) => i.action.type === "launchComet");
    expect(comet).toBeDefined();
    expect(comet?.at).toBe(gather?.at);
    expect(comet?.beatId).toBe("gather");
    expect(state.boo).toBe(true);
    expect(state.walkEnable).toBe(0);
    expect(state.expressionId).toBe("neutral-settled");
  });

  it("sustain windows: runInPlace/strut active only inside [at, sustainUntil]", () => {
    const take = NORTHSTAR_TWENTY_TAKE;
    const strutGo = take.beats.find((b) => b.id === "strut-go");
    const run = strutGo?.actions.find((a) => a.type === "runInPlace");
    expect(strutGo && run && run.type === "runInPlace").toBe(true);
    if (!strutGo || !run || run.type !== "runInPlace") return;

    const at = strutGo.at;
    const until = Number(run.sustainUntil);
    expect(until).toBeGreaterThan(at);

    expect(evaluateTake(take, at - 1e-6).runInPlace).toBeNull();
    const onOpen = evaluateTake(take, at);
    expect(onOpen.runInPlace).not.toBeNull();
    expect(onOpen.runInPlace?.at).toBe(at);
    expect(onOpen.runInPlace?.sustainUntil).toBe(until);
    expect(onOpen.runInPlace?.action).toMatchObject({
      type: "runInPlace",
      cadenceHz: 2.6,
      driveGain: 0.85,
    });
    expect(evaluateTake(take, (at + until) / 2).runInPlace).not.toBeNull();
    expect(evaluateTake(take, until).runInPlace).not.toBeNull();
    expect(evaluateTake(take, until + 1e-6).runInPlace).toBeNull();
    expect(evaluateTake(take, 12).runInPlace).toBeNull();

    expect(evaluateTake(take, at).strut).toBeNull();
    expect(evaluateTake(take, 4).strut).toBeNull();
    expect(evaluateTake(take, 12).strut).toBeNull();
  });

  it("has no 2Hz tick ids", () => {
    const mid = evaluateTake(NORTHSTAR_TWENTY_TAKE, 4);
    const late = evaluateTake(NORTHSTAR_TWENTY_TAKE, 12);
    for (const state of [mid, late]) {
      for (const impulse of state.impulses) {
        expect(impulse.beatId).not.toMatch(/-\d+$/);
      }
    }
    const src = readFileSync(join(here, "evaluateTake.ts"), "utf8");
    expect(src).not.toContain("${beat.id}-${tick}");
    expect(src).not.toContain("Math.floor(t * 2)");
    expect(src).not.toMatch(/performance\.now\s*\(/);
  });

  it("playAuthoredTake dropped the fired Set and 2Hz sustain re-issue", () => {
    const controller = readFileSync(join(here, "..", "GasperRigController.ts"), "utf8");
    const playStart = controller.indexOf("playAuthoredTake");
    const playEnd = controller.indexOf("N187 — file a grounded strut", playStart);
    const play = controller.slice(playStart, playEnd);
    expect(play).toContain("evaluateScore(take, t)");
    expect(play).not.toContain("const fired = new Set");
    expect(play).not.toContain("new Set<string>()");
    expect(play).not.toContain("${beat.id}-${tick}");
    expect(play).not.toContain("Math.floor(t * 2)");
    expect(play).not.toMatch(/performance\.now\s*\(/);
  });

  it("authored take path has no performance.now on the playhead", () => {
    const files = [
      "evaluateTake.ts",
      "GasperTake.ts",
      "bindTake.ts",
      "NorthstarTwentyTake.ts",
      join(here, "..", "GasperRigController.ts"),
      join(here, "..", "..", "..", "..", "gasper-studio", "src", "dais-first", "studioClock.ts"),
    ];
    for (const file of files) {
      const src = file.includes("/")
        ? readFileSync(file, "utf8")
        : readFileSync(join(here, file), "utf8");
      const play = file.endsWith("GasperRigController.ts")
        ? src.slice(src.indexOf("playAuthoredTake"), src.indexOf("N187 — file a grounded strut", src.indexOf("playAuthoredTake")))
        : src;
      expect(play, file).not.toMatch(/performance\.now\s*\(/);
    }
  });
});
