import { describe, expect, it } from "vitest";
import { bindTake } from "./bindTake";
import { rotateTakeOffset, worldFromTake } from "./GasperTake";
import { NORTHSTAR_TWENTY_TAKE } from "./NorthstarTwentyTake";

describe("bindTake", () => {
  it("offsets origin so the same take starts wherever he is", () => {
    const bind = bindTake(NORTHSTAR_TWENTY_TAKE, {
      x: 400,
      z: -20,
      embodimentId: "wispwalker",
    });
    expect(bind.admitted).toBe(true);
    expect(bind.originX).toBe(400);
    expect(bind.originZ).toBe(-20);
    const strut = worldFromTake(bind, "origin", 980, 0, 400, -20);
    expect(strut.x).toBe(1380);
    expect(strut.z).toBe(-20);
  });

  it("snaps walker-need on a presence body; refuses when policy is refuse", () => {
    const snap = bindTake(NORTHSTAR_TWENTY_TAKE, {
      x: 0,
      z: 0,
      embodimentId: "presence",
    });
    expect(snap.admitted).toBe(true);
    expect(snap.rejected).toContain("needs-walker");

    const refuse = bindTake(
      { ...NORTHSTAR_TWENTY_TAKE, policy: "refuse" },
      { x: 0, z: 0, embodimentId: "presence" },
    );
    expect(refuse.admitted).toBe(false);
  });

  it("live heading rotates origin offsets", () => {
    const off = rotateTakeOffset(100, 0, Math.PI / 2);
    expect(off.x).toBeCloseTo(0, 8);
    expect(off.z).toBeCloseTo(100, 8);
  });
});
