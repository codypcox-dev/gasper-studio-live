/**
 * GASPER-CRAFT-001 · C5 — CraftPacks tests: the shipped packs compile clean
 * through the fail-closed gate suite, blocking derivations hold every
 * tangent, and each gate rejects its violation class.
 */
import { describe, expect, it } from "vitest";
import { evaluateCurveTrack, normalizeCurveTrack } from "./CurveTrack";
import { WORLD_SPACE_CONSTANTS } from "../space/WorldSpace";
import type { FaceBeat } from "./FaceBeats";
import {
  packMeaningManifest,
  validateArcPhase,
  type PerformancePack,
} from "./PerformancePack";
import { validateDepthLegibility } from "./ShotDirector";
import {
  CRAFT_AUTHORING_BODY_HEIGHT_PX,
  compileCraftPack,
  craftBeatSheetCoverage,
  craftEndsHome,
  craftFaceBeatObjectives,
  craftSegmentCoverage,
  craftSilhouetteHeadroom,
  craftWorldBounds,
  getCraftPack,
  getCraftPackErrors,
  listCraftPacks,
} from "./CraftPacks";

// ---------------------------------------------------------------------------
// The shipped registry
// ---------------------------------------------------------------------------

describe("craft pack registry", () => {
  it("ships exactly the four C5 packs (s2/s4 + blocking variants)", () => {
    expect([...listCraftPacks()].sort()).toEqual([
      "s2-bounce",
      "s2-bounce/blocking",
      "s4-comet",
      "s4-comet/blocking",
    ]);
  });

  it("every shipped pack compiles clean through the gate suite", () => {
    for (const id of listCraftPacks()) {
      const errors = getCraftPackErrors(id);
      expect(errors, `${id}: ${errors.join("; ")}`).toEqual([]);
      expect(getCraftPack(id)).not.toBeNull();
    }
  });

  it("unknown ids fail closed", () => {
    expect(getCraftPack("nope")).toBeNull();
    expect(getCraftPackErrors("nope")).toEqual(['unknown craft pack "nope"']);
  });

  it("compile is cached + deterministic", () => {
    expect(getCraftPack("s2-bounce")).toBe(getCraftPack("s2-bounce"));
    expect(getCraftPack("s2-bounce")!.hash).toBe(getCraftPack("s2-bounce")!.hash);
    expect(getCraftPack("s2-bounce")!.hash).toMatch(/^[0-9a-f]{8}$/);
  });
});

// ---------------------------------------------------------------------------
// Shipped meaning manifests (Doctrine 5 golden — S5)
// ---------------------------------------------------------------------------

describe("shipped meaning manifests (Doctrine 5 golden)", () => {
  it("s2-bounce: stillness -> delighted showing-off, three declared holds", () => {
    expect(packMeaningManifest(getCraftPack("s2-bounce")!)).toEqual({
      packId: "s2-bounce",
      sceneValueTurn: { from: "stillness", to: "delighted showing-off" },
      beats: [
        {
          id: "still", t0: 0, t1: 1.236, shotScale: "medium",
          objective: "find out whether the floor will answer",
          primaryIdea: "The question — a still body asking whether the floor will answer",
          valueTurn: "Stillness -> curiosity: the first bounce is imagined, not yet made.",
        },
        {
          id: "try", t0: 1.236, t1: 3.236, shotScale: "medium",
          objective: "risk the first bounce and taste the answer",
          primaryIdea: "The first bounce — a modest hop sideways, then the taste of the answer",
          valueTurn: "Curiosity -> daring: the floor answers, and the answer is held.",
        },
        {
          id: "delight", t0: 3.236, t1: 5.2, shotScale: "medium",
          objective: "spend the joy of flight",
          primaryIdea: "The full bounce — high flight with a lateral flourish, joy reading on the face",
          valueTurn: "Daring -> joy: the impulse spends itself and becomes play.",
        },
        {
          id: "show-off", t0: 5.2, t1: 8.414, shotScale: "extreme-close",
          objective: "carry the joy to the glass and give it to the viewer",
          primaryIdea: "The approach — the last bounce travels DEPTH: home to the glass, smile for the viewer",
          valueTurn: "Joy -> gift: the play turns outward and ends at the monitor glass.",
        },
      ],
      holds: [
        {
          id: "discover-hold", t0: 0, t1: 1.236,
          intent: "the discovery — stillness while the body asks the floor a question",
        },
        {
          id: "taste-hold", t0: 2.618, t1: 3.236,
          intent: "the taste — the first answer lands; he holds it and decides to play (φ⁻¹ seconds)",
        },
        {
          id: "gift-hold", t0: 6.428, t1: 8.414,
          intent: "the gift — stillness at the glass; the smile is for the viewer (bounds Layer 3 affordance; φ × the final flight)",
        },
      ],
    });
  });

  it("s4-comet: tension -> exhilaration, the wall holds declared", () => {
    expect(packMeaningManifest(getCraftPack("s4-comet")!)).toEqual({
      packId: "s4-comet",
      sceneValueTurn: { from: "tension", to: "exhilaration" },
      beats: [
        {
          id: "eye", t0: 0, t1: 1.618, shotScale: "medium",
          objective: "read the far wall and decide it is a launchpad",
          primaryIdea: "The measure — a decision in stillness, then drifting toward the far edge to read the wall (the focus reads on the face)",
          valueTurn: "Tension -> aim: the wall stops being a limit and becomes a target.",
        },
        {
          id: "brace", t0: 1.618, t1: 2.618, shotScale: "medium",
          objective: "put the whole body against the bound",
          primaryIdea: "The brace — committing the whole body to the bound",
          valueTurn: "Aim -> trust: the wall is asked to hold him, and it does.",
        },
        {
          id: "fire", t0: 2.618, t1: 3.236, shotScale: "medium",
          objective: "spend everything on one crossing",
          primaryIdea: "The whip — one crack across the full frame with a depth dip mid-flight (φ⁻³ seconds, a handful of frames), then the wall",
          valueTurn: "Trust -> impact: everything is spent on a handful of frames.",
        },
        {
          id: "consequence", t0: 3.236, t1: 5.236, shotScale: "medium",
          objective: "take the wall's answer and ride it home grinning",
          primaryIdea: "The aftermath — the wall answers; recoil, wobble, drift home thrilled (the grin reads on the face)",
          valueTurn: "Impact -> exhilaration: the dare pays out as joy.",
        },
      ],
      holds: [
        {
          id: "resolve-hold", t0: 0, t1: 0.618,
          intent: "the resolve — the opening stillness: the decision to dare (φ⁻¹ seconds)",
        },
        {
          id: "brace-hold", t0: 2.0, t1: 2.618,
          intent: "the brace — pinned to the far wall; the bound becomes the launchpad (bounds Layer 3 affordance; φ⁻¹ seconds)",
        },
        {
          id: "impact-hold", t0: 2.854, t1: 3.236,
          intent: "the impact — the wall answers; the hit lands and registers (bounds Layer 1; φ⁻² seconds)",
        },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// S2 — the bouncing ball
// ---------------------------------------------------------------------------

describe("s2-bounce (play — the joy carried to the glass)", () => {
  const pack = () => getCraftPack("s2-bounce")!;
  const PHI = (1 + Math.sqrt(5)) / 2;

  it("carries the four-beat sheet — the last beat earns extreme-close as DEPTH", () => {
    const p = pack();
    expect(p.durationSeconds).toBeCloseTo(8.414, 9);
    // Doctrine 1 (D-0099, S6): the show-off beat is extreme-close because
    // Gasper TRAVELS DEPTH — world_z authors −320 (scale = 1.2, the N35
    // glass cap) by the beat midpoint. The camera never moved.
    expect(p.beats.map((b) => [b.id, b.shotScale])).toEqual([
      ["still", "medium"],
      ["try", "medium"],
      ["delight", "medium"],
      ["show-off", "extreme-close"],
    ]);
    expect(p.beats[0].t0).toBe(0);
    expect(p.beats[p.beats.length - 1].t1).toBeCloseTo(8.414, 9);
    expect(validateDepthLegibility(p).ok).toBe(true);
  });

  it("golden-section timing (D-0105): pivot at T/φ, try = φ·still, taste = φ⁻¹, flight:gift = 1:φ", () => {
    const p = pack();
    const pivot = p.beats[3].t0; // the show-off onset carries the turn outward
    expect(p.durationSeconds / pivot).toBeCloseTo(PHI, 3); // T = pivot·φ
    const still = p.beats[0].t1 - p.beats[0].t0;
    const try_ = p.beats[1].t1 - p.beats[1].t0;
    expect(try_ / still).toBeCloseTo(PHI, 2); // 2.0 = φ · 1.236
    expect(p.holds[1].t1 - p.holds[1].t0).toBeCloseTo(1 / PHI, 3); // taste = φ⁻¹
    const flight = p.holds[2].t0 - p.beats[3].t0; // show-off launch -> gift landing
    const gift = p.holds[2].t1 - p.holds[2].t0;
    expect(gift / flight).toBeCloseTo(PHI, 2); // the gift is φ × the final flight
  });

  it("travels depth: home to the monitor glass, ending near-glass", () => {
    const z = pack().channels.world_z!;
    expect(evaluateCurveTrack(z, 5.0)).toBe(0); // still home depth in the delight beat
    expect(evaluateCurveTrack(z, 8.414)).toBeCloseTo(-320, 9); // ends at the N35 glass (1.2× max)
    // craftEndsHome is an x/y law — the near-glass z ending is legal.
    expect(craftEndsHome(pack()).ok).toBe(true);
  });

  it("authors the apex at 950 (the floor answers via the drop shadow — ring retired N40)", () => {
    const p = pack();
    const apex = Math.max(...p.channels.world_y!.keys.map((k) => k.v));
    expect(apex).toBe(950);
    // N40 (2026-08-06): the impact-ripple channel is retired by owner order —
    // the craft pack no longer authors it, and the compiler rejects new authors.
    expect(p.channels.ground_impact).toBeUndefined();
  });

  it("arc-phase law passes (linear legs, offset x/y peaks)", () => {
    expect(validateArcPhase(pack()).ok).toBe(true);
  });

  it("face carrier: rest -> spark -> focus -> delight -> the gift smile saturates", () => {
    const face = pack().channels.face!;
    expect(evaluateCurveTrack(face, 0.5)).toBe(0); // rest in the discovery hold
    expect(evaluateCurveTrack(face, 6.9)).toBeCloseTo(1, 9); // gift smile (AU6+AU12 @ 1.0)
    expect(evaluateCurveTrack(face, 8.05)).toBe(0); // rest after the smile decays
    for (let t = 0; t <= 8.414; t += 0.05) {
      const e = evaluateCurveTrack(face, t);
      expect(e).toBeGreaterThanOrEqual(0);
      expect(e).toBeLessThanOrEqual(1);
    }
  });

  it("travels space and lands home (flourishes ±160/−360, home at both ends)", () => {
    const xs = pack().channels.world_x!.keys.map((k) => k.v);
    expect(Math.max(...xs)).toBe(160);
    expect(Math.min(...xs)).toBe(-360);
    expect(evaluateCurveTrack(pack().channels.world_x!, 8.414)).toBeCloseTo(0, 9);
  });
});

// ---------------------------------------------------------------------------
// S4 — the comet
// ---------------------------------------------------------------------------

describe("s4-comet (daring — the wall is the launchpad)", () => {
  const pack = () => getCraftPack("s4-comet")!;
  const PHI = (1 + Math.sqrt(5)) / 2;

  it("carries the four-beat sheet — all medium under Doctrine 1", () => {
    const p = pack();
    expect(p.durationSeconds).toBeCloseTo(5.236, 9);
    expect(p.beats.map((b) => [b.id, b.shotScale])).toEqual([
      ["eye", "medium"],
      ["brace", "medium"],
      ["fire", "medium"],
      ["consequence", "medium"],
    ]);
    expect(validateDepthLegibility(p).ok).toBe(true);
  });

  it("golden-section timing (D-0105): the exact φ ladder [φ, 1, φ⁻¹] + consequence = T/φ²", () => {
    const p = pack();
    const durs = p.beats.map((b) => b.t1 - b.t0);
    expect(durs[0]).toBeCloseTo(PHI, 3); // eye = φ seconds
    expect(durs[1]).toBeCloseTo(1, 3); // brace = 1 second
    expect(durs[2]).toBeCloseTo(1 / PHI, 3); // fire = φ⁻¹ seconds
    expect(durs[3]).toBeCloseTo(p.durationSeconds / (PHI * PHI), 3); // consequence = T/φ²
    expect(p.durationSeconds / p.beats[3].t0).toBeCloseTo(PHI, 3); // pivot = T/φ
    // The whip spends φ⁻³ seconds (a handful of frames).
    expect(0.236).toBeCloseTo(1 / PHI ** 3, 3);
    // Holds sit on the φ ladder: φ⁻¹, φ⁻¹, φ⁻².
    expect(p.holds[0].t1 - p.holds[0].t0).toBeCloseTo(1 / PHI, 3);
    expect(p.holds[1].t1 - p.holds[1].t0).toBeCloseTo(1 / PHI, 3);
    expect(p.holds[2].t1 - p.holds[2].t0).toBeCloseTo(1 / (PHI * PHI), 3);
  });

  it("sweeps the full world (−960 → +960) with a depth dip on the whip", () => {
    const p = pack();
    const xs = p.channels.world_x!.keys.map((k) => k.v);
    expect(Math.min(...xs)).toBe(-960);
    expect(Math.max(...xs)).toBe(960);
    const z = p.channels.world_z!;
    expect(evaluateCurveTrack(z, 2.736)).toBeCloseTo(780, 9); // the dip: smaller mid-flight
    expect(evaluateCurveTrack(z, 3.0)).toBe(0); // pinned at the wall, home depth
    expect(evaluateCurveTrack(z, 5.236)).toBe(0); // ends home
  });

  it("the whip is a handful of frames — the crossing is φ⁻³ ≈ 0.236s", () => {
    // −960 → +960 between t=2.618 and t=2.854 (φ⁻³ s ≈ 7–8 frames at 32 fps) —
    // Doctrine 3 timing: the fire beat spends everything, then holds.
    const x = pack().channels.world_x!;
    expect(evaluateCurveTrack(x, 2.618)).toBe(-960);
    expect(evaluateCurveTrack(x, 2.854)).toBe(960);
  });

  it("N40: the brace and the wall impact no longer author a ground ring", () => {
    expect(pack().channels.ground_impact).toBeUndefined(); // retired — drop shadow only
  });

  it("keeps the D-0098 contour anchor as the depth-read reference", () => {
    // The Phase A plan text documented ~60px (falsified, D-0097); the
    // presence-settled #idleRig bbox then read 211.9 — itself polluted by
    // decorative layers clipped to the body (subsurface bands, D-0098). The
    // true silhouette is the projected body contour: live settled height
    // breathes 149.3–157.4px; the anchor is the breath midpoint rounded 153.
    // Under the Monitor Doctrine the anchor is the reference the S4 place
    // and the S7 depth-read capture gate measure against.
    expect(CRAFT_AUTHORING_BODY_HEIGHT_PX).toBe(153);
  });

  it("arc-phase law passes (flat floor y exempts every window)", () => {
    expect(validateArcPhase(pack()).ok).toBe(true);
  });

  it("face carrier: rest -> brace focus -> the thrill grin saturates", () => {
    const face = pack().channels.face!;
    expect(evaluateCurveTrack(face, 0.3)).toBe(0); // rest in the resolve hold
    expect(evaluateCurveTrack(face, 2.5)).toBeCloseTo(0.9 * 0.55, 9); // brace-focus peak (AU4 0.55)
    expect(evaluateCurveTrack(face, 4.4)).toBeCloseTo(1, 9); // thrill smile (0.9 × 2 clamps to 1)
    expect(evaluateCurveTrack(face, 5.236)).toBe(0); // rest at pack end
  });
});

// ---------------------------------------------------------------------------
// Blocking derivations (review-gate idiom)
// ---------------------------------------------------------------------------

describe("blocking derivations", () => {
  it("same keys, same beats — every tangent forced stepped", () => {
    for (const baseId of ["s2-bounce", "s4-comet"] as const) {
      const spline = getCraftPack(baseId)!;
      const blocking = getCraftPack(`${baseId}/blocking`)!;
      expect(blocking.beats).toEqual(spline.beats);
      expect(blocking.durationSeconds).toBe(spline.durationSeconds);
      for (const [name, track] of Object.entries(spline.channels)) {
        const bTrack = blocking.channels[name as keyof typeof blocking.channels]!;
        expect(bTrack.keys.length, baseId + "/" + name).toBe(track.keys.length);
        for (let i = 0; i < track.keys.length; i++) {
          expect(bTrack.keys[i].t).toBe(track.keys[i].t);
          expect(bTrack.keys[i].v).toBe(track.keys[i].v);
          expect(bTrack.keys[i].out, `${baseId}/${name}[${i}]`).toBe("stepped");
        }
      }
    }
  });

  it("blocking hash differs from the spline polish (tangents are content)", () => {
    expect(getCraftPack("s2-bounce")!.hash).not.toBe(getCraftPack("s2-bounce/blocking")!.hash);
    expect(getCraftPack("s4-comet")!.hash).not.toBe(getCraftPack("s4-comet/blocking")!.hash);
  });

  it("blocking holds poses exactly (derivative 0 everywhere)", () => {
    const p = getCraftPack("s2-bounce/blocking")!;
    // a stepped world_y: the apex value reads at the hold, with zero slope
    const y = p.channels.world_y!;
    const apexKey = y.keys.find((k) => k.v === 950)!;
    expect(evaluateCurveTrack(y, apexKey.t + 0.05)).toBe(950);
  });

  it("derived manifests may not add authored content", () => {
    const r = compileCraftPack({ id: "x/blocking", base: "s2-bounce", durationSeconds: 3 });
    expect(r.pack).toBeNull();
    expect(r.errors.join(" ")).toContain("author the base");
  });

  it("derived manifests reject unknown bases, chained bases, wrong tangentMode", () => {
    expect(compileCraftPack({ id: "a", base: "nope", tangentMode: "stepped" }).errors.join(" "))
      .toContain("unknown base");
    expect(compileCraftPack({ id: "a", base: "s2-bounce/blocking", tangentMode: "stepped" }).errors.join(" "))
      .toContain("itself derived");
    expect(compileCraftPack({ id: "a", base: "s2-bounce", tangentMode: "smooth" }).errors.join(" "))
      .toContain('tangentMode must be "stepped"');
  });
});

// ---------------------------------------------------------------------------
// Gate fail-closed matrix (inline malformed manifests)
// ---------------------------------------------------------------------------

const validRaw = () => ({
  id: "mini",
  intent: "bounce",
  durationSeconds: 4,
  valueTurn: { from: "grounded", to: "returned" },
  // The apex stillness [1.5, 2] (world_y holds 950 while world_x rests) is
  // a real hold — Doctrine 5 demands it be declared with an intent.
  holds: [{ id: "apex-hold", t0: 1.5, t1: 2, intent: "hang at the apex — the float is the point" }],
  beats: [
    {
      id: "a",
      t0: 0,
      t1: 4,
      // Home depth (no world_z) reads scale 1.0 — a medium performance
      // under the Doctrine 1 legibility bands.
      shotScale: "medium",
      primaryIdea: "one idea",
      valueTurn: "a turn",
      objective: "earn the apex and come home",
    },
  ],
  segments: [{ t0: 0, t1: 4, mode: "authored", mechanical: false }],
  channels: {
    world_x: [
      { t: 0, v: 0, out: "stepped" },
      { t: 4, v: 0, out: "flat-clamped" },
    ],
    world_y: [
      { t: 0, v: 0, out: "linear" },
      { t: 1.5, v: 950, out: "stepped" },
      { t: 2, v: 950, out: "linear" },
      { t: 4, v: 0, out: "flat-clamped" },
    ],
  },
  faceBeats: [] as Array<Record<string, unknown>>,
});

describe("craft gate fail-closed matrix", () => {
  it("a minimal valid manifest compiles", () => {
    const r = compileCraftPack(validRaw());
    expect(r.errors).toEqual([]);
    expect(r.pack).not.toBeNull();
  });

  it("rejects missing/unknown intent", () => {
    const raw = validRaw();
    delete (raw as Record<string, unknown>).intent;
    expect(compileCraftPack(raw).pack).toBeNull();
  });

  it("rejects an authored face channel (faceBeats own the carrier)", () => {
    const raw = validRaw();
    (raw.channels as Record<string, unknown>).face = [{ t: 0, v: 0 }, { t: 1, v: 1 }];
    expect(compileCraftPack(raw).errors.join(" ")).toContain("compiled from faceBeats");
  });

  it("rejects ad-hoc face shapes", () => {
    const raw = validRaw();
    raw.faceBeats = [{ id: "x", t0: 1, t1: 2, aus: ["smile-harder"], intensity: 1, onsetSeconds: 0.3, decaySeconds: 0.2 }];
    expect(compileCraftPack(raw).errors.join(" ")).toContain("named AUs");
  });

  it("rejects AU12 without AU6 (genuine-smile law)", () => {
    const raw = validRaw();
    raw.faceBeats = [{ id: "x", t0: 1, t1: 2, aus: ["AU12"], intensity: 1, onsetSeconds: 0.3, decaySeconds: 0.2 }];
    expect(compileCraftPack(raw).errors.join(" ")).toContain("AU12 without AU6");
  });

  it("rejects extreme-wide beats (environment scale)", () => {
    const raw = validRaw();
    raw.beats = [{ ...raw.beats[0], shotScale: "extreme-wide" }];
    expect(compileCraftPack(raw).pack).toBeNull();
    expect(compileCraftPack(raw).errors.join(" ")).toContain("extreme-wide");
  });

  it("rejects void time in the beat sheet", () => {
    const raw = validRaw();
    raw.beats = [
      { id: "a", t0: 0, t1: 1.5, shotScale: "medium", primaryIdea: "i", valueTurn: "t", objective: "o" },
      { id: "b", t0: 2.5, t1: 4, shotScale: "medium", primaryIdea: "i", valueTurn: "t", objective: "o" },
    ];
    // The apex hold would sit in the void between beats — clear it so the
    // test measures void time, not hold containment.
    raw.holds = [];
    expect(compileCraftPack(raw).errors.join(" ")).toContain("void time");
  });

  it("rejects beats missing their primary idea or value turn", () => {
    const raw = validRaw();
    raw.beats = [{ id: "a", t0: 0, t1: 4, shotScale: "medium", primaryIdea: "  ", valueTurn: "", objective: "o" }];
    const msg = compileCraftPack(raw).errors.join(" ");
    expect(msg).toContain("primaryIdea");
    expect(msg).toContain("valueTurn");
  });

  it("rejects pose channels leaving the world extent", () => {
    const raw = validRaw();
    raw.channels.world_x = [{ t: 0, v: 0, out: "linear" }, { t: 2, v: 2000, out: "linear" }, { t: 4, v: 0, out: "flat-clamped" }];
    expect(compileCraftPack(raw).errors.join(" ")).toContain("world_x 2000");
  });

  it("rejects stretch that breaks the volume law inside the fence", () => {
    const raw = validRaw();
    // inside overall_height bounds, but 1/(1−0.3)−1 = 0.4286 > width max 0.3
    raw.channels.stretch = [{ t: 0, v: 0, out: "linear" }, { t: 2, v: -0.3, out: "flat-clamped" }];
    expect(compileCraftPack(raw).errors.join(" ")).toContain("break Sx·Sy=1");
  });

  it("rejects stretch outside the silhouette fence", () => {
    const raw = validRaw();
    raw.channels.stretch = [{ t: 0, v: 0, out: "linear" }, { t: 2, v: 0.3, out: "flat-clamped" }];
    expect(compileCraftPack(raw).errors.join(" ")).toContain("overall_height bounds");
  });

  it("rejects physics-mode segments (craft packs are curve self-contained)", () => {
    const raw = validRaw();
    raw.segments = [{ t0: 0, t1: 4, mode: "physics", mechanical: false }];
    expect(compileCraftPack(raw).errors.join(" ")).toContain("curve-authority self-contained");
  });

  it("rejects ground_impact as RETIRED (N40 — the ring is gone, drop shadow is the floor answer)", () => {
    const raw = validRaw();
    raw.channels.ground_impact = [
      { t: 0, v: 0, out: "linear" },
      { t: 2, v: 1.4, out: "flat-clamped" },
    ];
    expect(compileCraftPack(raw).errors.join(" ")).toContain("ground_impact is retired");
  });

  it("rejects packs that do not end home", () => {
    const raw = validRaw();
    raw.channels.world_x = [{ t: 0, v: 0, out: "linear" }, { t: 4, v: 300, out: "flat-clamped" }];
    expect(compileCraftPack(raw).errors.join(" ")).toContain("ends at 300");
  });

  it("rejects a beat whose authored depth misses its shot-scale band (Doctrine 1)", () => {
    // Home depth (no world_z) reads scale 1.0 — outside the close band.
    const raw = validRaw();
    raw.beats = [{ ...raw.beats[0], shotScale: "close" }];
    const msg = compileCraftPack(raw).errors.join(" ");
    expect(msg).toContain("close band");
  });

  it("compiles a beat that AUTHORS its shot scale as depth", () => {
    // world_z −300 through the beat → scale ≈ 1.185 ∈ extreme-close
    // [1.12, 1.2]: the shot is earned by coming close, not by a lens move.
    // He returns to home depth at the end (home-to-home). Doctrine 2 bites
    // here too: at z=−300 the frustum ceiling is 1080/1.185 ≈ 911.4, so the
    // apex is authored under it (the space is lower AND narrower at the glass).
    const raw = validRaw();
    raw.beats = [{ ...raw.beats[0], shotScale: "extreme-close" }];
    raw.channels.world_z = [
      { t: 0, v: 0, out: "linear" },
      { t: 0.5, v: -300, out: "linear" },
      { t: 3.5, v: -300, out: "linear" },
      { t: 4, v: 0, out: "flat-clamped" },
    ];
    raw.channels.world_y = [
      { t: 0, v: 0, out: "linear" },
      { t: 1.5, v: 500, out: "stepped" },
      { t: 2, v: 500, out: "linear" },
      { t: 4, v: 0, out: "flat-clamped" },
    ];
    const r = compileCraftPack(raw);
    expect(r.errors, r.errors.join("; ")).toEqual([]);
    expect(r.pack).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Meaning law wiring (Doctrine 5, S5) — bites through compileCraftPack
// ---------------------------------------------------------------------------

describe("meaning law wiring (Doctrine 5)", () => {
  it("undeclared stillness rejects the pack — stillness is an event", () => {
    const raw = validRaw();
    raw.holds = []; // the apex stillness [1.5, 2] is now unflagged
    const msg = compileCraftPack(raw).errors.join(" ");
    expect(msg).toContain("unflagged hold");
    expect(msg).toContain("declare it with an intent");
  });

  it("a declared hold that moves is a lie", () => {
    const raw = validRaw();
    // [0.2, 1] is mid-ascent (world_y rising ~633 u/s) — not stillness.
    raw.holds = [{ id: "fake", t0: 0.2, t1: 1, intent: "pretending to be still" }];
    const msg = compileCraftPack(raw).errors.join(" ");
    expect(msg).toContain("hold fake moves");
    expect(msg).toContain("must be still");
  });

  it("blocking derivations are exempt — stepped grammar is hold-or-jump", () => {
    // A blocking pack is stepped everywhere: every interval is a plateau, so
    // the sampled stillness law would flag the whole performance. The law
    // bites the authored base; blocking inherits the base's holds and is
    // judged by the owner's eye at the review gate.
    expect(getCraftPackErrors("s2-bounce/blocking")).toEqual([]);
    expect(getCraftPackErrors("s4-comet/blocking")).toEqual([]);
  });

  it("a face beat that serves no beat fails closed", () => {
    const raw = validRaw();
    raw.faceBeats = [{
      id: "x", t0: 1, t1: 2, aus: ["AU6", "AU12"], intensity: 1,
      onsetSeconds: 0.3, decaySeconds: 0.2, beatId: "nope",
    }];
    expect(compileCraftPack(raw).errors.join(" ")).toContain("resolves to no beat");
  });
});

// ---------------------------------------------------------------------------
// Gate functions directly (fixture packs)
// ---------------------------------------------------------------------------

const fixturePack = (
  overrides: Partial<{
    channels: PerformancePack["channels"];
    beats: PerformancePack["beats"];
    segments: PerformancePack["segments"];
    valueTurn: PerformancePack["valueTurn"];
    holds: PerformancePack["holds"];
    durationSeconds: number;
  }>,
): PerformancePack =>
  Object.freeze({
    id: "fixture",
    version: 1,
    durationSeconds: overrides.durationSeconds ?? 4,
    channels: Object.freeze(overrides.channels ?? {}),
    beats: Object.freeze(overrides.beats ?? []),
    segments: Object.freeze(overrides.segments ?? []),
    valueTurn: overrides.valueTurn ?? Object.freeze({ from: "in", to: "out" }),
    holds: Object.freeze(overrides.holds ?? []),
    hash: "00000000",
  });

const flatTrack = (v: number, duration: number) =>
  normalizeCurveTrack([
    { t: 0, v, out: "stepped" },
    { t: duration, v, out: "flat-clamped" },
  ]);

describe("craft gate functions", () => {
  it("beat-sheet coverage flags head/tail voids and gaps", () => {
    const beat = (t0: number, t1: number) => ({
      id: `b${t0}`, t0, t1, shotScale: "medium" as const, primaryIdea: "i", valueTurn: "t", objective: "o",
    });
    const head = fixturePack({ beats: [beat(0.5, 4)] });
    expect(craftBeatSheetCoverage(head).ok).toBe(false);
    const tail = fixturePack({ beats: [beat(0, 3.5)] });
    expect(craftBeatSheetCoverage(tail).ok).toBe(false);
    const gap = fixturePack({ beats: [beat(0, 1), beat(2, 4)] });
    expect(craftBeatSheetCoverage(gap).violations.join(" ")).toContain("void time");
    const clean = fixturePack({ beats: [beat(0, 2), beat(2, 4)] });
    expect(craftBeatSheetCoverage(clean).ok).toBe(true);
  });

  it("segment coverage flags gaps and non-authored modes", () => {
    const seg = (t0: number, t1: number, mode: "authored" | "physics" = "authored") => ({
      t0, t1, mode, mechanical: false,
    });
    expect(craftSegmentCoverage(fixturePack({ segments: [seg(0, 2), seg(2.5, 4)] })).ok).toBe(false);
    expect(craftSegmentCoverage(fixturePack({ segments: [seg(0, 4, "physics")] })).ok).toBe(false);
    expect(craftSegmentCoverage(fixturePack({ segments: [seg(0, 4)] })).ok).toBe(true);
  });

  it("world bounds gate reads the Phase A constants", () => {
    const p = fixturePack({
      channels: {
        world_x: flatTrack(961, 4),
        world_y: flatTrack(-1, 4),
        tilt: flatTrack(46, 4),
      },
    });
    const v = craftWorldBounds(p).violations;
    // one violation per offending key (2 keys per flat track × 3 channels)
    expect(v.length).toBe(6);
  });

  it("world bounds gate is DEPTH-AWARE (D-0099 Doctrine 2): the frustum at the key's own depth decides", () => {
    const c = WORLD_SPACE_CONSTANTS;
    // 1500 units lateral is outside the home fence (±960)…
    expect(
      craftWorldBounds(fixturePack({ channels: { world_x: flatTrack(1500, 4) } })).ok,
    ).toBe(false);
    // …but inside the fence at an authored far depth (frustum ≈ ±2743 at zFar).
    const deep = fixturePack({
      channels: {
        world_x: flatTrack(1500, 4),
        world_z: flatTrack(c.zFar, 4),
      },
    });
    expect(craftWorldBounds(deep).ok).toBe(true);
    // At the glass the frustum narrows to ±800 (N35: 960/1.2) — even 900 is outside.
    const glass = fixturePack({
      channels: {
        world_x: flatTrack(900, 4),
        world_z: flatTrack(c.zNear, 4),
      },
    });
    expect(craftWorldBounds(glass).ok).toBe(false);
    // Depth keys themselves fence to [zNear, zFar].
    expect(
      craftWorldBounds(fixturePack({ channels: { world_z: flatTrack(99999, 4) } })).ok,
    ).toBe(false);
    expect(
      craftWorldBounds(fixturePack({ channels: { world_z: flatTrack(-99999, 4) } })).ok,
    ).toBe(false);
  });

  it("silhouette headroom derives width from the volume law", () => {
    const okPack = fixturePack({
      channels: { stretch: flatTrack(-0.22, 4), squash: flatTrack(0.5, 4) },
    });
    expect(craftSilhouetteHeadroom(okPack).ok).toBe(true);
    const badPack = fixturePack({ channels: { squash: flatTrack(0.7, 4) } });
    expect(craftSilhouetteHeadroom(badPack).ok).toBe(false);
  });

  it("home-to-home reads first and last pose keys", () => {
    const away = fixturePack({
      channels: { world_x: flatTrack(100, 4), world_y: flatTrack(0, 4) },
    });
    expect(craftEndsHome(away).violations.join(" ")).toContain("world_x");
    const home = fixturePack({
      channels: { world_x: flatTrack(0, 4), world_y: flatTrack(0, 4) },
    });
    expect(craftEndsHome(home).ok).toBe(true);
  });

  it("face beats must serve a real beat, onset inside it (Doctrine 5)", () => {
    const beat = (id: string, t0: number, t1: number) => ({
      id, t0, t1, shotScale: "medium" as const, primaryIdea: "i", valueTurn: "t", objective: "o",
    });
    const pack = fixturePack({ beats: [beat("a", 0, 2), beat("b", 2, 4)] });
    const fb = (over: Partial<FaceBeat> = {}): FaceBeat => ({
      id: "f", t0: 1, t1: 1.5, aus: ["AU6", "AU12"], intensity: 0.5,
      onsetSeconds: 0.2, decaySeconds: 0.2, beatId: "a", ...over,
    });
    expect(craftFaceBeatObjectives(pack, [fb()]).ok).toBe(true);
    expect(craftFaceBeatObjectives(pack, [fb({ beatId: "nope" })]).violations.join(" "))
      .toContain("resolves to no beat");
    // Onset after the beat it serves has ended — decay may carry past, onset may not.
    expect(craftFaceBeatObjectives(pack, [fb({ t0: 2.5 })]).violations.join(" "))
      .toContain("outside the beat it serves");
    // Onset exactly at the next beat's t0 is legal (serves beat b).
    expect(craftFaceBeatObjectives(pack, [fb({ beatId: "b", t0: 2 })]).ok).toBe(true);
  });
});
