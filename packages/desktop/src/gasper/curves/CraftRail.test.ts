/**
 * GASPER-CRAFT-001 · C4 — Craft rail tests.
 *
 * The craft bounds (exaggeration 0.5–2 default 1.25, tempo 0.75–1.25), the
 * fail-closed patch clamp, and the shot-bias law: one step toward the bias
 * scale along the performance axis, never crossing it, never leaving it.
 */
import { describe, expect, it } from "vitest";
import {
  applyShotBias,
  clampCraftRailPatch,
  CRAFT_RAIL_BOUNDS,
  CRAFT_SHOT_BIAS_POSITIONS,
  CRAFT_SHOT_BIAS_SET,
  DEFAULT_CRAFT_RAIL_PARAMS,
  PERFORMANCE_SCALE_AXIS,
} from "./CraftRail";
import type { PackShotScale } from "./PerformancePack";

describe("craft rail bounds + defaults", () => {
  it("ships the amended defaults: exaggeration 1.25, shot dial authored, tempo 1", () => {
    // Amendment (D-0097): the old "wide" default walked every beat one step
    // looser — at the live body anchor that drops the shipped packs below
    // the amplitude floors, so the default performs packs as authored.
    expect(DEFAULT_CRAFT_RAIL_PARAMS).toEqual({
      exaggeration: 1.25,
      shotBias: "authored",
      tempo: 1,
    });
    expect(Object.isFrozen(DEFAULT_CRAFT_RAIL_PARAMS)).toBe(true);
  });

  it("bounds match the pack-driver fence (one source of truth)", () => {
    expect(CRAFT_RAIL_BOUNDS.exaggeration).toEqual({ min: 0.5, max: 2 });
    expect(CRAFT_RAIL_BOUNDS.tempo).toEqual({ min: 0.75, max: 1.25 });
    expect([...CRAFT_SHOT_BIAS_SET].sort()).toEqual(["medium", "wide"]);
    expect(CRAFT_SHOT_BIAS_POSITIONS).toEqual(["authored", "medium", "wide"]);
  });

  it("the performance axis is tight→loose and excludes extreme-wide", () => {
    expect(PERFORMANCE_SCALE_AXIS).toEqual([
      "extreme-close",
      "close",
      "medium",
      "wide",
    ]);
    expect(PERFORMANCE_SCALE_AXIS.includes("extreme-wide" as PackShotScale)).toBe(false);
  });
});

describe("clampCraftRailPatch", () => {
  it("merges a valid patch over the base", () => {
    const p = clampCraftRailPatch({ exaggeration: 1.6, tempo: 0.9 });
    expect(p.exaggeration).toBe(1.6);
    expect(p.tempo).toBe(0.9);
    expect(p.shotBias).toBe(DEFAULT_CRAFT_RAIL_PARAMS.shotBias);
  });

  it("clamps out-of-range values inside the fence", () => {
    expect(clampCraftRailPatch({ exaggeration: 9 }).exaggeration).toBe(2);
    expect(clampCraftRailPatch({ exaggeration: 0.01 }).exaggeration).toBe(0.5);
    expect(clampCraftRailPatch({ tempo: 3 }).tempo).toBe(1.25);
    expect(clampCraftRailPatch({ tempo: -1 }).tempo).toBe(0.75);
  });

  it("fails closed on garbage — garbage reads as the base", () => {
    const base = { exaggeration: 1.4, shotBias: "medium" as const, tempo: 1.1 };
    const p = clampCraftRailPatch(
      { exaggeration: NaN, tempo: Infinity, shotBias: "cinema" as never },
      base,
    );
    expect(p).toEqual(base);
    expect(clampCraftRailPatch(undefined, base)).toEqual(base);
  });

  it("accepts every shot-dial position (authored + the walk-target biases)", () => {
    expect(clampCraftRailPatch({ shotBias: "authored" }).shotBias).toBe("authored");
    expect(clampCraftRailPatch({ shotBias: "medium" }).shotBias).toBe("medium");
    expect(clampCraftRailPatch({ shotBias: "wide" }).shotBias).toBe("wide");
  });
});

describe("applyShotBias (the bias law)", () => {
  it("authored performs every scale unchanged (the framing floors gate)", () => {
    for (const scale of PERFORMANCE_SCALE_AXIS) {
      expect(applyShotBias(scale, "authored")).toBe(scale);
    }
  });

  it("wide bias loosens each scale one step (and holds at wide)", () => {
    expect(applyShotBias("extreme-close", "wide")).toBe("close");
    expect(applyShotBias("close", "wide")).toBe("medium");
    expect(applyShotBias("medium", "wide")).toBe("wide");
    expect(applyShotBias("wide", "wide")).toBe("wide");
  });

  it("medium bias tightens wide + medium, steps the tighter scales in", () => {
    expect(applyShotBias("wide", "medium")).toBe("medium");
    expect(applyShotBias("medium", "medium")).toBe("medium");
    expect(applyShotBias("close", "medium")).toBe("medium");
    expect(applyShotBias("extreme-close", "medium")).toBe("close");
  });

  it("never crosses the bias, never leaves the performance axis", () => {
    for (const bias of ["medium", "wide"] as const) {
      const biasIdx = PERFORMANCE_SCALE_AXIS.indexOf(bias);
      for (const scale of PERFORMANCE_SCALE_AXIS) {
        const out = applyShotBias(scale, bias);
        expect(PERFORMANCE_SCALE_AXIS.includes(out)).toBe(true);
        const idx = PERFORMANCE_SCALE_AXIS.indexOf(scale);
        const outIdx = PERFORMANCE_SCALE_AXIS.indexOf(out);
        // one step at most
        expect(Math.abs(outIdx - idx)).toBeLessThanOrEqual(1);
        // never crosses the bias
        if (idx <= biasIdx) expect(outIdx).toBeLessThanOrEqual(biasIdx);
        if (idx >= biasIdx) expect(outIdx).toBeGreaterThanOrEqual(biasIdx);
      }
    }
  });

  it("repeated bias walks monotonically to the bias scale", () => {
    let s: PackShotScale = "extreme-close";
    for (let i = 0; i < 3; i++) s = applyShotBias(s, "wide");
    expect(s).toBe("wide");
    let t: PackShotScale = "wide";
    for (let i = 0; i < 2; i++) t = applyShotBias(t, "medium");
    expect(t).toBe("medium");
  });

  it("fails closed: scales outside the axis enter at the loosest legal scale", () => {
    expect(applyShotBias("extreme-wide" as PackShotScale, "wide")).toBe("wide");
    expect(applyShotBias("extreme-wide" as PackShotScale, "medium")).toBe("medium");
    expect(applyShotBias("nope" as PackShotScale, "wide")).toBe("wide");
  });

  it("is idempotent at the bias scale", () => {
    expect(applyShotBias("wide", "wide")).toBe("wide");
    expect(applyShotBias("medium", "medium")).toBe("medium");
  });
});
