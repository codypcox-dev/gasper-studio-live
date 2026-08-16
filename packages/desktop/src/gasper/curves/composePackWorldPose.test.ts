/**
 * GASPER-NORTHSTAR-001 — the pack world-pose compose contract (N60).
 * Authored world_x/world_z ride as an ADDITIVE OFFSET over the LIVE physics
 * base; the tests bound position continuity at pack entry and release, and
 * the composed velocity across the authority boundary.
 */
import { describe, expect, it } from "vitest";
import { composePackWorldPose, resolvePackRelease } from "./packWorldPose";
import { clampWorldPoseCommand, WORLD_HOME_POSE } from "../space/WorldSpace";
import { WORLD_PHYSICS_CLOCK_PRIORITY } from "../physics/WorldPhysicsDriver";
import { PERFORMANCE_PACK_CLOCK_PRIORITY } from "./PerformancePackDriver";

const authored = (x: number, y = 0, z = 0) => ({
  x,
  y,
  z,
  tilt: 0,
  provenance: "curve-authority",
});

describe("GASPER-NORTHSTAR-001 — composePackWorldPose (N60 handoff continuity)", () => {
  it("pack entry: the first authored offset (0) composes to the LIVE body — no teleport", () => {
    // The walker is mid-walk at (320, -150); the pack's first key is 0.
    const composed = composePackWorldPose(authored(0, 0, 0), { x: 320, z: -150 });
    expect(composed.x).toBe(320); // identical to the physics base: no jump
    expect(composed.z).toBe(-150);
    expect(composed.provenance).toBe("curve-authority");
  });

  it("the authored offset rides on the LIVE base (the hop happens where he is)", () => {
    const composed = composePackWorldPose(authored(70, 40, 0), { x: 320, z: -150 });
    expect(composed.x).toBe(390); // base + authored offset
    expect(composed.z).toBe(-150);
    expect(composed.y).toBe(40);
  });

  it("pack release: the authored end (0) composes to the body itself — continuous", () => {
    const composed = composePackWorldPose(authored(0, 0, 0), { x: 320, z: -150 });
    expect(composed.x).toBe(320);
    expect(composed.z).toBe(-150);
    // the release pose IS the body — the renderer's provenance-none intake
    // eases home from exactly the body's position.
  });

  it("the composed velocity = body velocity + authored derivative (C1 at the flat ends)", () => {
    // At entry the authored keys are flat (derivative 0): the composed
    // velocity equals the LIVE body velocity — no velocity discontinuity.
    const entry = composePackWorldPose(authored(0), { x: 320, z: -150 });
    const entryNext = composePackWorldPose(authored(0), { x: 320, z: -150 });
    // constant base + flat authored => zero composed velocity; a moving base
    // carries the body's velocity through the authority boundary.
    expect(entryNext.x - entry.x).toBe(0);
    const movingA = composePackWorldPose(authored(0), { x: 300, z: -150 });
    const movingB = composePackWorldPose(authored(0), { x: 353, z: -150 });
    expect(movingB.x - movingA.x).toBe(53); // the body's own per-frame travel
  });

  it("null base keeps the pack absolute (back-compat, no physics driver)", () => {
    expect(composePackWorldPose(authored(70), null).x).toBe(70);
    expect(composePackWorldPose(authored(0), null).x).toBe(0);
  });
});

describe("GASPER-NORTHSTAR-001 — the release law (N60, pack-end)", () => {
  const release = { x: 0, y: 0, z: 0, tilt: 0, provenance: "none" };

  it("pack entry at SUBSTANTIAL speed: the first composed pose is the moving body (no teleport)", () => {
    // The walker is mid-walk at (500, 0); the pack's first authored key is 0.
    const a = composePackWorldPose(authored(0), { x: 500, z: 0 });
    expect(a.x).toBe(500); // identical to the physics base: no jump
    // One frame later the body moved: the composed pose carries the body's
    // own travel (velocity continuity — the pack's pose tracks the live base).
    const b = composePackWorldPose(authored(0), { x: 525, z: 0 });
    expect(b.x - a.x).toBe(25);
  });

  it("with a LIVE physics base, the release YIELDS — no home write (the old compose+none path would snap home)", () => {
    // The hop ends mid-walk at (500, -300): the OLD path composed {500,-300,
    // none} and WorldSpace clamped it to WORLD_HOME_POSE — a snap. The NEW
    // law yields: the latest physics tick remains the sole world authority.
    const write = resolvePackRelease(release, { x: 500, z: -300 }, true);
    expect(write.kind).toBe("yield");
  });

  it("a non-home MOVING release yields — position- AND velocity-continuous", () => {
    // The release moment: the body at (320, -150) still walking; the yield
    // keeps the physics tick authoritative (no home snap, no velocity jump).
    const write = resolvePackRelease(release, { x: 320, z: -150 }, true);
    expect(write.kind).toBe("yield");
  });

  it("without a physics base the legacy 'none' => home release passes through untouched", () => {
    const write = resolvePackRelease(release, null, false);
    expect(write.kind).toBe("pose");
    expect(write.pose).toEqual(release); // WorldSpace clamps it to home (legacy)
  });

  it("a physics base that is NOT armed still passes the legacy release through", () => {
    // The kernel exists but is idle (no live pose stream) — the legacy none
    // => home release is the correct behavior (a pack run standalone).
    const write = resolvePackRelease(release, { x: 320, z: -150 }, false);
    expect(write.kind).toBe("pose");
    expect(write.pose).toEqual(release);
  });
});

describe("GASPER-NORTHSTAR-001 — the controller pack-output boundary (N60, production)", () => {
  const release = { x: 0, y: 0, z: 0, tilt: 0, provenance: "none" };

  it("live pack outputs compose over a NON-HOME MOVING base and pass the WorldSpace fence unchanged", () => {
    // The walker mid-walk at (500, -300); the pack authors a +70 x offset.
    const base = { x: 500, z: -300 };
    const composed = composePackWorldPose(
      { x: 70, y: 40, z: 0, tilt: 0, provenance: "curve-authority" },
      base,
    );
    // The controller's setWorldPose -> clampWorldPoseCommand boundary:
    const cmd = clampWorldPoseCommand(composed);
    expect(cmd.provenance).toBe("curve-authority");
    expect(cmd.pose.x).toBe(570); // preserved: 500 + 70 (in the frustum at z -300)
    expect(cmd.pose.z).toBe(-300);
  });

  it("a provenance:'none' release with LIVE physics makes NO world write — the applied physics pose is preserved", () => {
    // The hop ends mid-walk at a NON-HOME moving position.
    const base = { x: 500, z: -300 };
    const write = resolvePackRelease(release, base, true);
    expect(write.kind).toBe("yield"); // no setWorldPose call
    // The renderer keeps the already-applied pose: the last composed LIVE
    // pose (authored end = 0) IS the body — preserved, never a home snap.
    const applied = composePackWorldPose(release, base);
    expect(applied.x).toBe(500);
    expect(applied.z).toBe(-300);
  });

  it("without live physics the 'none' release still clamps HOME at the WorldSpace boundary", () => {
    const write = resolvePackRelease(release, null, false);
    expect(write.kind).toBe("pose");
    const cmd = clampWorldPoseCommand(write.pose);
    expect(cmd.provenance).toBe("none");
    expect(cmd.pose).toEqual(WORLD_HOME_POSE); // the provenance fence is intact
  });

  it("same-clock ordering: physics (25) forwards BEFORE the pack (26) — the yield leaves the latest same-tick physics pose", () => {
    // The organism clock delivers subscriber frames in priority order:
    // world-physics at 25 forwards the body pose, then the pack at 26 reads
    // the LIVE body for its compose; the release yield therefore leaves the
    // latest SAME-TICK physics pose — never a stale one.
    expect(WORLD_PHYSICS_CLOCK_PRIORITY).toBe(25);
    expect(PERFORMANCE_PACK_CLOCK_PRIORITY).toBe(26);
  });
});
