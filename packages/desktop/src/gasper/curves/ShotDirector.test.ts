/**
 * GASPER-CRAFT-002 · S3 — ShotDirector tests: the compile-time camera law.
 *
 * Doctrine 1 (D-0099): the camera is the monitor — shot scale IS Gasper's
 * authored depth (the S2 projection law). The legibility table anchors at
 * the depth-law endpoints (2.4 at the glass, ≈0.35 at the far fade, 1 at
 * home); every beat's authored depth must land inside the beat's band;
 * extreme-wide is never a performance scale; and the capture-side gate
 * asserts zoom delta ≡ 0 across any performance.
 */
import { describe, expect, it } from "vitest";
import { WORLD_SPACE_CONSTANTS, depthScaleAt } from "../space/WorldSpace";
import {
  DEFAULT_PERFORMANCE_SCALES,
  SHOT_SCALE_DEPTH_BANDS,
  beatAuthoredDepth,
  shotScaleDepthBand,
  validateCameraFixity,
  validateDepthLegibility,
  validatePerformanceShotScales,
} from "./ShotDirector";
import {
  compilePerformancePack,
  type PackShotScale,
  type PerformancePack,
} from "./PerformancePack";

describe("legibility table (canon shot-scales in the depth law)", () => {
  it("anchors at the S2 depth-law endpoints", () => {
    // The glass IS the extreme-close ceiling (N35: 1.2× home max); the far
    // fade IS the extreme-wide floor (exactly — the bands span the whole
    // legible space).
    expect(SHOT_SCALE_DEPTH_BANDS["extreme-close"].scale[1]).toBe(
      depthScaleAt(WORLD_SPACE_CONSTANTS.zNear),
    );
    expect(SHOT_SCALE_DEPTH_BANDS["extreme-close"].scale[1]).toBe(1.2);
    expect(SHOT_SCALE_DEPTH_BANDS["extreme-wide"].scale[0]).toBeCloseTo(
      depthScaleAt(WORLD_SPACE_CONSTANTS.zFar),
      3,
    );
  });

  it("home (scale 1) sits inside the medium band", () => {
    const [lo, hi] = SHOT_SCALE_DEPTH_BANDS.medium.scale;
    expect(lo).toBeLessThan(1);
    expect(hi).toBeGreaterThan(1);
  });

  it("bands are contiguous + monotone down the depth ladder", () => {
    const order: PackShotScale[] = [
      "extreme-close",
      "close",
      "medium",
      "wide",
      "extreme-wide",
    ];
    for (let i = 0; i + 1 < order.length; i++) {
      const near = SHOT_SCALE_DEPTH_BANDS[order[i]].scale;
      const far = SHOT_SCALE_DEPTH_BANDS[order[i + 1]].scale;
      expect(near[0]).toBeCloseTo(far[1], 9); // contiguous
      expect(near[0]).toBeGreaterThan(far[0]); // monotone
    }
    for (const s of order) {
      const [lo, hi] = SHOT_SCALE_DEPTH_BANDS[s].scale;
      expect(hi).toBeGreaterThan(lo);
    }
  });

  it("marks exactly extreme-wide as a non-performance scale", () => {
    expect(SHOT_SCALE_DEPTH_BANDS["extreme-wide"].performance).toBe(false);
    for (const s of ["extreme-close", "close", "medium", "wide"] as PackShotScale[]) {
      expect(SHOT_SCALE_DEPTH_BANDS[s].performance).toBe(true);
    }
  });

  it("default performance scales are medium/wide", () => {
    expect([...DEFAULT_PERFORMANCE_SCALES].sort()).toEqual(["medium", "wide"]);
  });

  it("shotScaleDepthBand returns the band for known scales, null otherwise", () => {
    expect(shotScaleDepthBand("medium")).toBe(SHOT_SCALE_DEPTH_BANDS.medium);
    expect(shotScaleDepthBand("nope" as PackShotScale)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The depth-legibility gate
// ---------------------------------------------------------------------------

const K = (t: number, v: number, out?: string) => (out ? { t, v, out } : { t, v });

/** Compile a pack with a beat scale + optional authored depth (world_z). */
const depthPack = (opts: {
  shotScale?: PackShotScale;
  z?: number;
}): PerformancePack => {
  const channels: Record<string, Array<{ t: number; v: number; out?: string }>> = {
    world_x: [K(0, 0), K(2, 0)],
  };
  if (opts.z !== undefined) {
    channels.world_z = [K(0, opts.z), K(2, opts.z)];
  }
  const r = compilePerformancePack({
    id: "t-depth",
    durationSeconds: 2,
    valueTurn: { from: "placed", to: "read" },
    channels,
    beats: [
      {
        id: "b1",
        t0: 0,
        t1: 2,
        shotScale: opts.shotScale ?? "medium",
        primaryIdea: "x",
        valueTurn: "y",
        objective: "hold the depth",
      },
    ],
    segments: [],
  });
  expect(r.errors).toEqual([]);
  return r.pack as PerformancePack;
};

describe("beatAuthoredDepth", () => {
  it("samples world_z at the beat midpoint", () => {
    const pack = depthPack({ z: 500 });
    expect(beatAuthoredDepth(pack, pack.beats[0])).toBeCloseTo(500, 9);
  });

  it("reads home depth when the pack authors no world_z", () => {
    const pack = depthPack({});
    expect(beatAuthoredDepth(pack, pack.beats[0])).toBe(0);
  });
});

describe("validateDepthLegibility (Doctrine 1 compile gate)", () => {
  it("home depth reads medium — the unauthored pack is a medium performance", () => {
    expect(validateDepthLegibility(depthPack({ shotScale: "medium" })).ok).toBe(true);
    expect(validateDepthLegibility(depthPack({ shotScale: "wide" })).ok).toBe(false);
    expect(validateDepthLegibility(depthPack({ shotScale: "close" })).ok).toBe(false);
  });

  it("an authored near-glass depth reads extreme-close", () => {
    // z = −300 → scale 1920/1620 ≈ 1.185 ∈ [1.12, 1.2] (the N35 glass)
    const pack = depthPack({ shotScale: "extreme-close", z: -300 });
    const rep = validateDepthLegibility(pack);
    expect(rep.ok).toBe(true);
    // the SAME depth declared as medium violates the band
    const wrong = depthPack({ shotScale: "medium", z: -300 });
    expect(validateDepthLegibility(wrong).ok).toBe(false);
  });

  it("an authored far depth reads wide / extreme-wide", () => {
    // z = 1200 → scale 1920/3120 ≈ 0.615 ∈ [0.5, 0.8]
    expect(validateDepthLegibility(depthPack({ shotScale: "wide", z: 1200 })).ok).toBe(
      true,
    );
    // the SAME depth declared as medium violates the band
    expect(
      validateDepthLegibility(depthPack({ shotScale: "medium", z: 1200 })).ok,
    ).toBe(false);
    // z = 2000 → scale 1920/3920 ≈ 0.490 ∈ [0.35, 0.5]. The compiler forbids
    // extreme-wide beats (fail-closed), so the pack is assembled by hand to
    // exercise the legibility law on the environment scale.
    const base = depthPack({ shotScale: "medium", z: 2000 });
    const far: PerformancePack = {
      ...base,
      beats: [
        { id: "b1", t0: 0, t1: 2, shotScale: "extreme-wide", primaryIdea: "x", valueTurn: "y", objective: "z" },
      ],
    };
    expect(validateDepthLegibility(far).ok).toBe(true);
    // …and at that depth a wide declaration misses its band
    const wide: PerformancePack = {
      ...base,
      beats: [
        { id: "b1", t0: 0, t1: 2, shotScale: "wide", primaryIdea: "x", valueTurn: "y", objective: "z" },
      ],
    };
    expect(validateDepthLegibility(wide).ok).toBe(false);
  });

  it("reports the offending beat, depth and band", () => {
    const rep = validateDepthLegibility(depthPack({ shotScale: "close" }));
    expect(rep.ok).toBe(false);
    expect(rep.violations.length).toBe(1);
    expect(rep.violations[0]).toContain("b1");
    expect(rep.violations[0]).toContain("close band");
    expect(rep.violations[0]).toContain("1.000");
  });
});

describe("validatePerformanceShotScales (staging validator)", () => {
  it("accepts every performance scale", () => {
    for (const s of ["extreme-close", "close", "medium", "wide"] as PackShotScale[]) {
      expect(validatePerformanceShotScales(depthPack({ shotScale: s })).ok).toBe(true);
    }
  });

  it("rejects extreme-wide during a performance beat", () => {
    // The compiler rejects extreme-wide on beats (fail-closed), so a pack
    // that carries one must be assembled by hand to exercise the validator.
    const base = depthPack({ shotScale: "medium" });
    const pack: PerformancePack = {
      ...base,
      beats: [
        { id: "b1", t0: 0, t1: 2, shotScale: "extreme-wide", primaryIdea: "x", valueTurn: "y", objective: "z" },
      ],
    };
    const report = validatePerformanceShotScales(pack);
    expect(report.ok).toBe(false);
    expect(report.violations.length).toBe(1);
    expect(report.violations[0]).toContain("extreme-wide");
  });
});

describe("compiler staging law (fail-closed)", () => {
  it("compilePerformancePack rejects a beat carrying extreme-wide", () => {
    const r = compilePerformancePack({
      id: "t-ew",
      durationSeconds: 2,
      valueTurn: { from: "a", to: "b" },
      channels: {},
      beats: [
        { id: "b1", t0: 0, t1: 2, shotScale: "extreme-wide", primaryIdea: "x", valueTurn: "y", objective: "z" },
      ],
      segments: [],
    });
    expect(r.pack).toBeNull();
    expect(r.errors.some((e) => e.includes("extreme-wide"))).toBe(true);
  });

  it("compilePerformancePack accepts performance scales", () => {
    const r = compilePerformancePack({
      id: "t-ok",
      durationSeconds: 2,
      valueTurn: { from: "a", to: "b" },
      channels: {},
      beats: [
        { id: "b1", t0: 0, t1: 2, shotScale: "wide", primaryIdea: "x", valueTurn: "y", objective: "z" },
      ],
      segments: [],
    });
    expect(r.errors).toEqual([]);
    expect(r.pack).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The camera-fixity gate (the capture-side observable)
// ---------------------------------------------------------------------------

describe("validateCameraFixity (zoom delta ≡ 0 across a performance)", () => {
  const cam = (zoom: number, panX = 0, panY = 0) => ({ zoom, panX, panY });

  it("passes a perfectly stable camera series", () => {
    const rep = validateCameraFixity([cam(1), cam(1), cam(1), cam(1)]);
    expect(rep.ok).toBe(true);
    expect(rep.maxZoomDelta).toBe(0);
    expect(rep.maxPanDeltaPx).toBe(0);
    expect(rep.samples).toBe(4);
  });

  it("fails any zoom motion during the performance", () => {
    const rep = validateCameraFixity([cam(1), cam(1), cam(1.02), cam(1.02)]);
    expect(rep.ok).toBe(false);
    expect(rep.maxZoomDelta).toBeCloseTo(0.02, 9);
    expect(rep.violations.join(" ")).toContain("camera is the monitor");
  });

  it("fails any pan motion during the performance", () => {
    const rep = validateCameraFixity([cam(1, 0, 0), cam(1, 3, 0)]);
    expect(rep.ok).toBe(false);
    expect(rep.maxPanDeltaPx).toBeCloseTo(3, 9);
  });

  it("fails closed with fewer than two samples", () => {
    expect(validateCameraFixity([]).ok).toBe(false);
    expect(validateCameraFixity([cam(1)]).ok).toBe(false);
    expect(validateCameraFixity([]).violations.join(" ")).toContain(
      "at least 2 samples",
    );
  });

  it("flags corrupt samples without crashing", () => {
    const rep = validateCameraFixity([
      cam(1),
      { zoom: Number.NaN, panX: 0, panY: 0 },
      cam(1),
    ]);
    expect(rep.ok).toBe(false);
    expect(rep.violations.some((v) => v.includes("corrupt camera read"))).toBe(true);
  });
});
