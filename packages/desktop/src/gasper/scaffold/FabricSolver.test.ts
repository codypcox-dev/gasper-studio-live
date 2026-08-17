import { describe, expect, it } from "vitest";
import { regionIndex, regionWeights, FABRIC_REGION_IDS } from "./FabricRegions";
import {
  composeTarget,
  createFabricState,
  morphEmbedding,
  setMorph,
  setRegion,
  tickFabric,
} from "./FabricSolver";

describe("fabric regions", () => {
  it("covers the 1000 and keeps named regions non-empty", () => {
    for (const id of FABRIC_REGION_IDS) {
      const w = regionWeights(id);
      expect(w.length).toBe(1000);
      expect(regionIndex(id).length).toBeGreaterThan(8);
    }
  });
});

describe("fabric solver", () => {
  it("rest is exact zero", () => {
    const field = morphEmbedding("rest");
    expect(field.length).toBe(1000);
    expect(field.every((n) => n === 0)).toBe(true);
  });

  it("puff lifts the dermis", () => {
    const field = morphEmbedding("puff");
    expect(Math.max(...field)).toBeGreaterThan(0.8);
  });

  it("isolate keeps a crown puff off the feet", () => {
    const st = createFabricState();
    setMorph(st, "puff", 1);
    setRegion(st, "crown", { isolated: true });
    const goal = composeTarget(st);
    const feet = regionIndex("feet");
    const crown = regionIndex("crown");
    const footPeak = Math.max(...feet.map((i) => Math.abs(goal[i] ?? 0)));
    const crownPeak = Math.max(...crown.map((i) => Math.abs(goal[i] ?? 0)));
    expect(crownPeak).toBeGreaterThan(0.4);
    expect(footPeak).toBeLessThan(0.08);
  });

  it("paddle snaps a handle down and keeps the face quiet", () => {
    const st = createFabricState();
    setMorph(st, "paddle");
    tickFabric(st, 1 / 60);
    expect(st.liveXYZ?.length).toBe(3920 * 3);
    expect(st.liveXY?.length).toBe(3920 * 2);
    let maxY = -999;
    const xy = st.liveXY!;
    for (let i = 1; i < xy.length; i += 2) maxY = Math.max(maxY, xy[i] ?? 0);
    expect(maxY).toBeGreaterThan(60);
    const face = Math.round(0.35 * (st.rings - 1)) * st.sectors;
    expect(Math.hypot(xy[face * 2] ?? 0, xy[face * 2 + 1] ?? 0)).toBeLessThan(55);
  });
});
