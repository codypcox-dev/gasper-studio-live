/**
 * GASPER-PHYSICS-001 · D-0112 — the BLACK ROOM (owner law N5): scenery
 * retired and the floor reads from Gasper's own glow + penumbra shadow.
 * N40 (2026-08-06): the authored impact ripple is RETIRED by owner order
 * ("get rid of that from the ground — his drop shadow should be enough");
 * the channel is sampled-but-never-drawn and new pack authors are rejected
 * at compile. The floor-plane law survives (the worldRig rides it), and the
 * TS↔AS3 renderer mirror is machine-enforced — now including sentinels
 * that the retired scenery AND the retired ring never return.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { WORLD_SPACE_CONSTANTS, depthScaleAt } from "../space/WorldSpace";
import {
  GROUND_IMPACT_RETIRED,
  STAGE_WORLD_CONSTANTS as C,
  STAGE_WORLD_HORIZON_Y,
  stageWorldFloorYAt,
} from "./StageWorld";

describe("black-room constants", () => {
  it("the horizon line derives from the S2 floor-plane law (anchor − 78)", () => {
    expect(STAGE_WORLD_HORIZON_Y).toBe(
      C.floorAnchorY - WORLD_SPACE_CONSTANTS.floorToHorizonPx,
    );
    expect(STAGE_WORLD_HORIZON_Y).toBe(112); // the plane the worldRig rides; nothing is drawn at it (the room is black)
  });

  it("carries ONLY the floor anchor — the ripple law retired with the scenery (N40)", () => {
    expect(Object.keys(C).sort()).toEqual(["floorAnchorY", "homeX"].sort());
  });

  it("N40: the impact-ripple ring is retired — the drop shadow is the floor's answer", () => {
    expect(GROUND_IMPACT_RETIRED).toContain("ground_impact is retired");
    expect(GROUND_IMPACT_RETIRED).toContain("the drop shadow is the floor's answer");
    expect("rippleRxMinPx" in C).toBe(false);
    expect("rippleMaxOpacity" in C).toBe(false);
  });
});

describe("N40: the authored impact ripple is retired (owner order 2026-08-06)", () => {
  it("the module no longer evaluates a ring — the sentinel carries the law", () => {
    expect(GROUND_IMPACT_RETIRED).toContain(
      "the impact-ripple ring is removed from the ground",
    );
    expect(GROUND_IMPACT_RETIRED).toContain("ground_impact");
  });

  it("the floor-plane helper survives for the worldRig mirror", () => {
    expect(stageWorldFloorYAt(0)).toBeCloseTo(
      C.floorAnchorY,
      9,
    );
    expect(stageWorldFloorYAt(WORLD_SPACE_CONSTANTS.zFar)).toBeLessThan(
      C.floorAnchorY,
    );
  });
});

describe("StageWorld — TS↔AS3 renderer mirror (machine-enforced)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const bundle = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");

  it("the AS3 STAGE_WORLD literal mirrors the TS black-room constants exactly", () => {
    const m = bundle.match(/const STAGE_WORLD=Object\.freeze\(\{([^}]+)\}\)/);
    expect(m).not.toBe(null);
    const lit = m![1];
    const val = (key: string): number => {
      const km = lit.match(new RegExp(`${key}:(-?[0-9.]+)`));
      expect(km, `AS3 STAGE_WORLD.${key}`).not.toBe(null);
      return Number(km![1]);
    };
    expect(val("homeX")).toBe(C.homeX);
    expect(val("floorAnchorY")).toBe(C.floorAnchorY);
  });

  it("the renderer builds the stage world as a BLACK ROOM — no floor event", () => {
    expect(bundle.includes("'data-craft-layer':'gasper-physics-001-black-room'")).toBe(true);
    expect(bundle.includes("avatar.insertBefore(root,worldRig)")).toBe(true);
  });

  it("N40: the impact-ripple ring is retired end-to-end in the renderer", () => {
    expect(bundle.includes("stageWorldEls.groundImpact=mk(")).toBe(false); // no ring element
    expect(bundle.includes("setGroundImpact(p,x,z){/* N40")).toBe(true); // no-op intake retained (sampled, never drawn)
    expect(bundle.includes("function updateGroundImpact(phase,x,z){return;} // N40")).toBe(true); // shape law retired
  });

  it("the retired scenery is GONE from the renderer (black-room sentinels)", () => {
    for (const retired of [
      "stageHorizonGrad",
      "stageFloorGrad",
      "stagePoolGrad",
      "stageVignetteGrad",
      "stageVignette",
      "STAGE_WORLD_LANES",
      "lightPool",
      "horizonTint",
      "updateStageWorld",
      "stageWorldDirty",
      "stageWorldFp",
      "lightRefSpeed",
    ]) {
      expect(bundle.includes(retired), `retired scenery "${retired}"`).toBe(false);
    }
  });

  it("the retired parallax machinery is GONE from the renderer", () => {
    expect(bundle.includes("farRate")).toBe(false);
    expect(bundle.includes("midFarRate")).toBe(false);
    expect(bundle.includes("midNearRate")).toBe(false);
    expect(bundle.includes("farBand")).toBe(false);
    expect(bundle.includes("midFarBand")).toBe(false);
    expect(bundle.includes("midNearBand")).toBe(false);
  });
});
