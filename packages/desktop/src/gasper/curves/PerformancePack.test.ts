/**
 * GASPER-CRAFT-001 · C1 — PerformancePack tests.
 *
 * Fail-closed compilation, deterministic hashing, beat-sheet rules, and the
 * craft gates: arc-phase law (arcs = phase-shifted sin/cos) and the
 * squash/stretch volume law Sx·Sy = 1.
 */
import { describe, expect, it } from "vitest";
import {
  beatAt,
  checkSquashVolume,
  compilePerformancePack,
  fnv1aHex,
  hashPackContent,
  packAmplitude,
  packChannelSpan,
  packChannelValueAt,
  packMeaningManifest,
  segmentAt,
  validateArcPhase,
  validateHoldStillness,
  volumeLawWidthScale,
  type PerformancePack,
} from "./PerformancePack";

const K = (t: number, v: number, out?: string) =>
  out ? { t, v, out } : { t, v };

/** A well-formed three-beat bounce-shaped payload (valid fixture). */
const fixture = (over: Record<string, unknown> = {}) => ({
  id: "t-fixture",
  durationSeconds: 3,
  valueTurn: { from: "calm", to: "settled" },
  channels: {
    world_x: [K(0, 0), K(1.5, 300), K(3, 0)],
    world_y: [K(0, 0), K(0.75, 220, "flat-clamped"), K(1.5, 0), K(2.25, 160, "flat-clamped"), K(3, 0)],
  },
  beats: [
    { id: "b1", t0: 0, t1: 1, shotScale: "wide", primaryIdea: "the launch", valueTurn: "calm→excited", objective: "commit to the leap" },
    { id: "b2", t0: 1, t1: 2, shotScale: "medium", primaryIdea: "the hang", valueTurn: "excited→worried", objective: "ride the hang" },
    { id: "b3", t0: 2, t1: 3, shotScale: "close", primaryIdea: "the landing", valueTurn: "worried→settled", objective: "land the arrival" },
  ],
  ...over,
});

const compiled = (over: Record<string, unknown> = {}): PerformancePack => {
  const r = compilePerformancePack(fixture(over));
  expect(r.errors).toEqual([]);
  expect(r.pack).not.toBeNull();
  return r.pack as PerformancePack;
};

describe("compilePerformancePack", () => {
  it("compiles a well-formed pack with sorted beats and a content hash", () => {
    const pack = compiled();
    expect(pack.id).toBe("t-fixture");
    expect(pack.version).toBe(1);
    expect(pack.durationSeconds).toBe(3);
    expect(pack.beats.map((b) => b.id)).toEqual(["b1", "b2", "b3"]);
    expect(pack.hash).toMatch(/^[0-9a-f]{8}$/);
    expect(Object.isFrozen(pack)).toBe(true);
  });

  it("hash is deterministic and content-sensitive", () => {
    expect(compiled().hash).toBe(compiled().hash);
    const a = compiled();
    const b = compiled({ durationSeconds: 3, channels: { world_x: [K(0, 0), K(1.5, 301), K(3, 0)], world_y: fixture().channels.world_y } });
    expect(a.hash).not.toBe(b.hash);
    // Hash ignores key insertion order (canonical JSON).
    expect(
      hashPackContent({
        durationSeconds: 1,
        channels: {},
        beats: [],
        segments: [],
        valueTurn: { from: "a", to: "b" },
        holds: [],
      }),
    ).toBe(
      hashPackContent({
        durationSeconds: 1,
        channels: {},
        beats: [],
        segments: [],
        valueTurn: { from: "a", to: "b" },
        holds: [],
      }),
    );
  });

  it("hash covers the meaning (Doctrine 5): a reworded objective is a different performance", () => {
    const a = compiled();
    const b = compiled({
      beats: fixture().beats.map((b2, i) => (i === 0 ? { ...b2, objective: "commit to something else" } : b2)),
    });
    expect(a.hash).not.toBe(b.hash);
    const c = compiled({ valueTurn: { from: "calm", to: "triumphant" } });
    expect(a.hash).not.toBe(c.hash);
  });

  it("fnv1aHex is stable and padded to 8 hex chars", () => {
    expect(fnv1aHex("gasper")).toBe(fnv1aHex("gasper"));
    expect(fnv1aHex("")).toBe("811c9dc5");
    expect(fnv1aHex("a")).toMatch(/^[0-9a-f]{8}$/);
    expect(fnv1aHex("a")).not.toBe(fnv1aHex("b"));
  });

  it.each([
    ["missing id", { id: "" }],
    ["non-positive duration", { durationSeconds: 0 }],
    ["NaN duration", { durationSeconds: Number.NaN }],
  ])("fails closed: %s", (_name, over) => {
    const r = compilePerformancePack(fixture(over));
    expect(r.pack).toBeNull();
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("fails closed on garbage payloads", () => {
    for (const raw of [null, undefined, 42, "pack", []]) {
      const r = compilePerformancePack(raw);
      expect(r.pack).toBeNull();
      expect(r.errors.length).toBeGreaterThan(0);
    }
  });

  it("rejects unknown channels and channels past the duration", () => {
    let r = compilePerformancePack(fixture({ channels: { bogus: [K(0, 0)] } }));
    expect(r.pack).toBeNull();
    expect(r.errors.some((e) => e.includes("unknown channel"))).toBe(true);

    r = compilePerformancePack(fixture({ channels: { world_x: [K(0, 0), K(5, 1)] } }));
    expect(r.pack).toBeNull();
    expect(r.errors.some((e) => e.includes("past pack duration"))).toBe(true);
  });

  it("ground_impact is rejected as RETIRED (N40 — the ring is gone; the drop shadow is the floor answer)", () => {
    const r = compilePerformancePack(
      fixture({ channels: { ground_impact: [K(0, 0), K(0.5, 1), K(1, 0)] } }),
    );
    expect(r.pack).toBeNull();
    expect(r.errors.some((e) => e.includes("ground_impact") && e.includes("retired"))).toBe(true);
  });

  it("face compiles inside the unit fence, rejects outside (D-0107 S7 unification)", () => {
    const ok = compilePerformancePack(
      fixture({ channels: { face: [K(0, 0), K(1, 1), K(2, 0.4)] } }),
    );
    expect(ok.errors).toEqual([]);
    expect(ok.pack?.channels.face).toBeDefined();

    const bad = compilePerformancePack(
      fixture({ channels: { face: [K(0, 0), K(1, 7)] } }),
    );
    expect(bad.pack).toBeNull();
    expect(bad.errors.some((e) => e.includes("face") && e.includes("unit fence"))).toBe(true);

    const neg = compilePerformancePack(
      fixture({ channels: { face: [K(0, -0.1), K(1, 0.5)] } }),
    );
    expect(neg.pack).toBeNull();
    expect(neg.errors.some((e) => e.includes("face") && e.includes("unit fence"))).toBe(true);
  });

  it("camera_scale/x/y are rejected as RETIRED (D-0107, Doctrine 1 — the camera is the monitor)", () => {
    for (const name of ["camera_scale", "camera_x", "camera_y"]) {
      const r = compilePerformancePack(
        fixture({ channels: { [name]: [K(0, 0.6), K(2, 0.6)] } }),
      );
      expect(r.pack).toBeNull();
      expect(
        r.errors.some((e) => e.includes(name) && e.includes("retired")),
        `expected a retirement error for ${name}, got: ${JSON.stringify(r.errors)}`,
      ).toBe(true);
      // The error names the doctrine's replacement, not just the loss:
      expect(r.errors.some((e) => e.includes("world_z"))).toBe(true);
    }
  });

  it("drops empty tracks silently (all-garbage keys = absent channel)", () => {
    const r = compilePerformancePack(fixture({ channels: { world_x: [{ t: "x", v: "y" }] } }));
    expect(r.errors).toEqual([]);
    expect(r.pack?.channels.world_x).toBeUndefined();
  });

  it("rejects overlapping beats, beats outside duration, unknown shot scales", () => {
    let r = compilePerformancePack(
      fixture({
        beats: [
          { id: "a", t0: 0, t1: 1.5, shotScale: "wide", objective: "hold the stage" },
          { id: "b", t0: 1, t1: 2, shotScale: "wide", objective: "take it back" },
        ],
      }),
    );
    expect(r.pack).toBeNull();
    expect(r.errors.some((e) => e.includes("overlap"))).toBe(true);

    r = compilePerformancePack(
      fixture({ beats: [{ id: "a", t0: 2, t1: 4, shotScale: "wide" }] }),
    );
    expect(r.pack).toBeNull();
    expect(r.errors.some((e) => e.includes("outside pack duration"))).toBe(true);

    r = compilePerformancePack(
      fixture({ beats: [{ id: "a", t0: 0, t1: 1, shotScale: "cosmic" }] }),
    );
    expect(r.pack).toBeNull();
    expect(r.errors.some((e) => e.includes("shotScale"))).toBe(true);

    r = compilePerformancePack(fixture({ beats: [{ id: "a", t0: 2, t1: 1, shotScale: "wide" }] }));
    expect(r.pack).toBeNull();
    expect(r.errors.some((e) => e.includes("invalid t0/t1"))).toBe(true);
  });

  it("clamps segment ranges into the pack window", () => {
    const pack = compiled({
      segments: [
        { t0: -1, t1: 1.2, mode: "physics" },
        { t0: 2.9, t1: 99, mode: "authored" },
      ],
    });
    expect(pack.segments).toHaveLength(2);
    expect(pack.segments[0]).toMatchObject({ t0: 0, t1: 1.2, mode: "physics" });
    expect(pack.segments[1]).toMatchObject({ t0: 2.9, t1: 3, mode: "authored" });
  });

  it("fails closed on malformed segments (bad mode, inverted range)", () => {
    let r = compilePerformancePack(fixture({ segments: [{ t0: 0, t1: 1, mode: "sideways" }] }));
    expect(r.pack).toBeNull();
    expect(r.errors.some((e) => e.includes("segment"))).toBe(true);
    r = compilePerformancePack(fixture({ segments: [{ t0: 1.5, t1: 1.2, mode: "authored" }] }));
    expect(r.pack).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Doctrine 5 (S5) — the meaning schema, fail-closed
// ---------------------------------------------------------------------------

describe("meaning schema (Doctrine 5)", () => {
  it("every beat must pursue an objective — missing/empty rejects", () => {
    const noObjective = fixture().beats.map((b) => ({ ...b, objective: undefined }));
    let r = compilePerformancePack(fixture({ beats: noObjective }));
    expect(r.pack).toBeNull();
    expect(r.errors.some((e) => e.includes("missing objective"))).toBe(true);

    r = compilePerformancePack(
      fixture({
        beats: [
          { id: "b1", t0: 0, t1: 3, shotScale: "medium", objective: "   " },
        ],
      }),
    );
    expect(r.pack).toBeNull();
    expect(r.errors.some((e) => e.includes("missing objective"))).toBe(true);

    // a beat WITH an objective compiles (primaryIdea/valueTurn stay craft-gated)
    r = compilePerformancePack(
      fixture({
        beats: [{ id: "b1", t0: 0, t1: 3, shotScale: "medium", objective: "hold the stillness" }],
      }),
    );
    expect(r.errors).toEqual([]);
    expect(r.pack!.beats[0].objective).toBe("hold the stillness");
  });

  it("the pack IS a scene: valueTurn {from,to} required, and it must turn", () => {
    let r = compilePerformancePack({ ...fixture(), valueTurn: undefined });
    expect(r.pack).toBeNull();
    expect(r.errors.some((e) => e.includes("scene valueTurn missing"))).toBe(true);

    r = compilePerformancePack(fixture({ valueTurn: { from: "calm" } }));
    expect(r.errors.some((e) => e.includes("scene valueTurn missing"))).toBe(true);

    r = compilePerformancePack(fixture({ valueTurn: { from: "  ", to: "settled" } }));
    expect(r.errors.some((e) => e.includes("scene valueTurn missing"))).toBe(true);

    // a turn that changes nothing is not a scene (McKee)
    r = compilePerformancePack(fixture({ valueTurn: { from: "calm", to: " calm " } }));
    expect(r.errors.some((e) => e.includes("must actually turn"))).toBe(true);

    const ok = compilePerformancePack(fixture());
    expect(ok.errors).toEqual([]);
    expect(ok.pack!.valueTurn).toEqual({ from: "calm", to: "settled" });
  });

  it("holds are flagged events with intent — windows, containment, overlap", () => {
    // valid hold inside beat b1
    let r = compilePerformancePack(
      fixture({ holds: [{ id: "h1", t0: 0.1, t1: 0.5, intent: "deciding" }] }),
    );
    expect(r.errors).toEqual([]);
    expect(r.pack!.holds).toEqual([{ id: "h1", t0: 0.1, t1: 0.5, intent: "deciding" }]);

    // no holds is legal (a scene without stillness)
    r = compilePerformancePack(fixture());
    expect(r.errors).toEqual([]);
    expect(r.pack!.holds).toEqual([]);

    // missing intent — stillness without a reason is void
    r = compilePerformancePack(fixture({ holds: [{ t0: 0.1, t1: 0.5 }] }));
    expect(r.errors.some((e) => e.includes("missing intent"))).toBe(true);

    // invalid window / outside duration
    r = compilePerformancePack(fixture({ holds: [{ t0: 0.5, t1: 0.5, intent: "x" }] }));
    expect(r.errors.some((e) => e.includes("invalid t0/t1"))).toBe(true);
    r = compilePerformancePack(fixture({ holds: [{ t0: 2.5, t1: 3.5, intent: "x" }] }));
    expect(r.errors.some((e) => e.includes("outside pack duration"))).toBe(true);

    // a hold must belong to a beat's objective
    r = compilePerformancePack(
      fixture({
        beats: [{ id: "b1", t0: 0, t1: 1, shotScale: "medium", objective: "o" }],
        holds: [{ t0: 1.5, t1: 2, intent: "x" }],
      }),
    );
    expect(r.errors.some((e) => e.includes("not inside any beat"))).toBe(true);

    // two holds cannot run at once (one intent at a time)
    r = compilePerformancePack(
      fixture({
        holds: [
          { t0: 0.1, t1: 0.6, intent: "a" },
          { t0: 0.5, t1: 0.9, intent: "b" },
        ],
      }),
    );
    expect(r.errors.some((e) => e.includes("holds overlap"))).toBe(true);
  });

  it("hold stillness law: declared holds are still, stillness is declared", () => {
    // a pack with a real stillness window [0.5, 1.5] on x (stepped) — y flat
    const still = (holds: unknown[]) =>
      compilePerformancePack({
        id: "t-hold",
        durationSeconds: 2,
        valueTurn: { from: "a", to: "b" },
        channels: {
          world_x: [K(0, 0), K(0.5, 200, "stepped"), K(1.5, 200, "linear"), K(2, 400)],
          world_y: [K(0, 0), K(2, 0)],
        },
        beats: [{ id: "b1", t0: 0, t1: 2, shotScale: "medium", objective: "o" }],
        holds,
      }).pack as PerformancePack;

    // undeclared stillness of 1s — the law flags it
    const unflagged = still([]);
    const u = validateHoldStillness(unflagged);
    expect(u.ok).toBe(false);
    expect(u.violations.join(" ")).toContain("unflagged hold");

    // declared and genuinely still — clean
    const declared = still([{ id: "h", t0: 0.5, t1: 1.5, intent: "deciding" }]);
    expect(validateHoldStillness(declared).ok).toBe(true);

    // a hold that MOVES is a lie (window covers the linear travel)
    const lying = compilePerformancePack({
      id: "t-lie",
      durationSeconds: 2,
      valueTurn: { from: "a", to: "b" },
      channels: {
        world_x: [K(0, 0), K(2, 400)],
        world_y: [K(0, 0), K(2, 0)],
      },
      beats: [{ id: "b1", t0: 0, t1: 2, shotScale: "medium", objective: "o" }],
      holds: [{ id: "h", t0: 0.2, t1: 1.8, intent: "pretending to be still" }],
    }).pack as PerformancePack;
    const lie = validateHoldStillness(lying);
    expect(lie.ok).toBe(false);
    expect(lie.violations.join(" ")).toContain("must be still");

    // a short stillness (under the budget) needs no declaration
    const pause = compilePerformancePack({
      id: "t-pause",
      durationSeconds: 2,
      valueTurn: { from: "a", to: "b" },
      channels: {
        world_x: [K(0, 0), K(0.5, 200, "stepped"), K(0.7, 200, "linear"), K(2, 400)],
        world_y: [K(0, 0), K(2, 0)],
      },
      beats: [{ id: "b1", t0: 0, t1: 2, shotScale: "medium", objective: "o" }],
    }).pack as PerformancePack;
    expect(validateHoldStillness(pause).ok).toBe(true);
  });

  it("packMeaningManifest reads the scene back for the capture rubric", () => {
    const pack = compiled({
      holds: [{ id: "h1", t0: 0, t1: 0.5, intent: "gathering" }],
    });
    const m = packMeaningManifest(pack);
    expect(m.packId).toBe("t-fixture");
    expect(m.sceneValueTurn).toEqual({ from: "calm", to: "settled" });
    expect(m.beats.map((b) => b.objective)).toEqual([
      "commit to the leap",
      "ride the hang",
      "land the arrival",
    ]);
    expect(m.holds).toEqual([{ id: "h1", t0: 0, t1: 0.5, intent: "gathering" }]);
    // golden shape: the manifest is exactly these fields, in this order
    expect(Object.keys(m)).toEqual(["packId", "sceneValueTurn", "beats", "holds"]);
    expect(Object.keys(m.beats[0])).toEqual([
      "id",
      "t0",
      "t1",
      "shotScale",
      "objective",
      "primaryIdea",
      "valueTurn",
    ]);
  });
});

describe("pack sampling", () => {
  it("packChannelValueAt reads the track; absent channel = 0", () => {
    const pack = compiled();
    expect(packChannelValueAt(pack, "world_x", 1.5)).toBeCloseTo(300);
    expect(packChannelValueAt(pack, "tilt", 1)).toBe(0);
  });

  it("beatAt finds the containing beat and null in gaps", () => {
    const pack = compiled({
      beats: [
        { id: "a", t0: 0, t1: 1, shotScale: "wide", objective: "cross the gap" },
        { id: "b", t0: 1.5, t1: 3, shotScale: "close", objective: "arrive up close" },
      ],
    });
    expect(beatAt(pack, 0.5)?.id).toBe("a");
    expect(beatAt(pack, 1.2)).toBeNull(); // the gap
    expect(beatAt(pack, 1.5)?.id).toBe("b");
    expect(beatAt(pack, 3)).toBeNull(); // end is exclusive
  });

  it("segmentAt defaults to authored — curves own the gaps", () => {
    const pack = compiled({ segments: [{ t0: 1, t1: 2, mode: "physics", mechanical: false }] });
    expect(segmentAt(pack, 1.5).mode).toBe("physics");
    expect(segmentAt(pack, 0.5).mode).toBe("authored");
    expect(segmentAt(pack, 2.5).mode).toBe("authored");
  });

  it("packAmplitude measures authored key ranges; packChannelSpan the longest track", () => {
    const pack = compiled();
    const amp = packAmplitude(pack);
    expect(amp.worldX).toBeCloseTo(300);
    expect(amp.worldY).toBeCloseTo(220);
    expect(amp.tilt).toBe(0); // channel absent
    expect(packChannelSpan(pack)).toBeCloseTo(3);
  });
});

describe("validateArcPhase — arcs are phase-shifted sin/cos", () => {
  const quarterArc = {
    world_x: [K(0, 1), K(0.25, 0.924), K(0.5, 0.707), K(0.75, 0.383), K(1, 0)],
    world_y: [K(0, 0), K(0.25, 0.383), K(0.5, 0.707), K(0.75, 0.924), K(1, 1)],
  };

  it("passes phase-offset authored arcs", () => {
    const pack = compiled({ durationSeconds: 1, channels: quarterArc, beats: [] });
    const r = validateArcPhase(pack);
    expect(r.violations).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("rejects aligned x/y velocity peaks (straight-line robotic travel)", () => {
    const diagonal = {
      world_x: [K(0, 0), K(0.5, 0.9), K(1, 1)],
      world_y: [K(0, 0), K(0.5, 0.9), K(1, 1)],
    };
    const pack = compiled({ durationSeconds: 1, channels: diagonal, beats: [] });
    const r = validateArcPhase(pack);
    expect(r.ok).toBe(false);
    expect(r.violations[0]).toContain("arc-phase");
  });

  it("the mechanical flag exempts linear rails", () => {
    const diagonal = {
      world_x: [K(0, 0, "linear"), K(1, 1)],
      world_y: [K(0, 0, "linear"), K(1, 1)],
    };
    const pack = compiled({
      durationSeconds: 1,
      channels: diagonal,
      beats: [],
      segments: [{ t0: 0, t1: 1, mode: "authored", mechanical: true }],
    });
    expect(validateArcPhase(pack).ok).toBe(true);
  });

  it("physics-mode segments are D-0090 territory — not arc-checked", () => {
    const diagonal = {
      world_x: [K(0, 0), K(0.5, 0.9), K(1, 1)],
      world_y: [K(0, 0), K(0.5, 0.9), K(1, 1)],
    };
    const pack = compiled({
      durationSeconds: 1,
      channels: diagonal,
      beats: [],
      segments: [{ t0: 0, t1: 1, mode: "physics" }],
    });
    expect(validateArcPhase(pack).ok).toBe(true);
  });

  it("exempts constant-speed channels (no measurable phase)", () => {
    const rail = {
      world_x: [K(0, 0, "linear"), K(1, 1)],
      world_y: [K(0, 0, "linear"), K(1, -1)],
    };
    const pack = compiled({ durationSeconds: 1, channels: rail, beats: [] });
    expect(validateArcPhase(pack).ok).toBe(true);
  });

  it("passes when a channel is missing (nothing to phase against)", () => {
    const pack = compiled({ durationSeconds: 1, channels: { world_x: [K(0, 0), K(1, 1)] }, beats: [] });
    expect(validateArcPhase(pack).ok).toBe(true);
  });
});

describe("volume law — Sx·Sy = 1", () => {
  it("width scale is the reciprocal of height scale", () => {
    expect(volumeLawWidthScale(0.8)).toBeCloseTo(1.25);
    expect(volumeLawWidthScale(1.25)).toBeCloseTo(0.8);
    expect(checkSquashVolume(volumeLawWidthScale(0.8), 0.8)).toBe(true);
    expect(checkSquashVolume(volumeLawWidthScale(1.18), 1.18)).toBe(true);
  });

  it("guards degenerate heights fail-closed to identity", () => {
    expect(volumeLawWidthScale(0)).toBe(1);
    expect(volumeLawWidthScale(-1)).toBe(1);
    expect(volumeLawWidthScale(Number.NaN)).toBe(1);
    expect(volumeLawWidthScale(0.02)).toBe(1); // below the 0.05 floor
  });

  it("checkSquashVolume honors the 0.02 tolerance (and rejects non-finite)", () => {
    expect(checkSquashVolume(1.01, 1)).toBe(true); // product 1.01
    expect(checkSquashVolume(1.03, 1)).toBe(false); // product 1.03
    expect(checkSquashVolume(1.03, 1, 0.05)).toBe(true);
    expect(checkSquashVolume(Number.NaN, 1)).toBe(false);
  });
});
