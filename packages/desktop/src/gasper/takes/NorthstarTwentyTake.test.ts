import { describe, expect, it } from "vitest";
import { NORTHSTAR_TWENTY_TAKE } from "./NorthstarTwentyTake";
import { buildNorthstarTwentyClip } from "./northstarTwentyClip";

describe("NORTHSTAR_TWENTY_TAKE", () => {
  it("is a relative walker take with the scored beats", () => {
    expect(NORTHSTAR_TWENTY_TAKE.setup.walkEnable).toBe(0);
    expect(NORTHSTAR_TWENTY_TAKE.beats[0]!.actions.some((a) => a.type === "walkEnable" && a.on === true)).toBe(true);
    expect(NORTHSTAR_TWENTY_TAKE.needs).toBe("walker");
    expect(NORTHSTAR_TWENTY_TAKE.durationSec).toBe(20);
    const ids = NORTHSTAR_TWENTY_TAKE.beats.map((b) => b.id);
    expect(ids).toEqual([
      "strut-go",
      "seat",
      "notice",
      "notice-release",
      "gather",
      "zip1",
      "zip2",
      "land",
      "hold",
      "loop",
    ]);
    const run = NORTHSTAR_TWENTY_TAKE.beats[0]!.actions[0];
    expect(run).toMatchObject({ type: "runInPlace", cadenceHz: 2.6, driveGain: 0.85 });
    expect(JSON.stringify(run)).not.toContain('"dx"');
    expect(NORTHSTAR_TWENTY_TAKE.beats.find((b) => b.id === "notice")?.at).toBe(6.6);
    expect(JSON.stringify(NORTHSTAR_TWENTY_TAKE)).not.toContain("gsap");
    expect(JSON.stringify(NORTHSTAR_TWENTY_TAKE)).not.toContain("setWorldPose");
  });

  it("compiles to a document clip with markers and no GSAP tracks", () => {
    const clip = buildNorthstarTwentyClip();
    expect(clip.id).toBe("take-northstar-20s");
    expect(clip.family).toBe("gasper.take.v1");
    expect(clip.tracks).toEqual([]);
    expect(clip.markers.map((m) => m.label)).toContain("strut-go");
    expect(clip.duration_ms).toBe(20000);
  });
});
