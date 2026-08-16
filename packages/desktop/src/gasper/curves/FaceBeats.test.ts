/**
 * GASPER-CRAFT-001 · C4 — FaceBeats tests.
 *
 * The AU vocabulary (canon-named, no ad-hoc shapes), the facs onset budget
 * (micro < 1 s, macro 0.5–4 s), the genuine-smile law (AU12 needs AU6), the
 * trapezoid envelopes, and the exact lowering onto the scalar face channel.
 */
import { describe, expect, it } from "vitest";
import { evaluateCurveTrack, type CurveTrack } from "./CurveTrack";
import {
  compileFaceBeats,
  FACE_ACTION_UNITS,
  FACE_ACTION_UNIT_SET,
  FACE_ENERGY_SHAPE,
  FACE_ONSET_BUDGET,
  faceBeatEnergyAt,
  faceBeatPeak,
  faceBeatsEnergyAt,
  type FaceBeat,
} from "./FaceBeats";

/** A genuine settle-smile beat (AU6 + AU12), well inside the budget. */
const smileBeat = (over: Record<string, unknown> = {}) => ({
  id: "settle-smile",
  t0: 1,
  t1: 2,
  aus: ["AU6", "AU12"],
  intensity: 0.6,
  onsetSeconds: 0.35,
  decaySeconds: 0.5,
  beatId: "settle",
  ...over,
});

describe("AU vocabulary (canon mirror)", () => {
  it("names the canon Action Units — AU6/AU12 genuine smile, AU4 focus", () => {
    expect(FACE_ACTION_UNITS.AU6.name).toBe("orbicularis oculi");
    expect(FACE_ACTION_UNITS.AU12.name).toBe("zygomatic major");
    expect(FACE_ACTION_UNITS.AU4.name).toBe("brow lowerer");
    expect(FACE_ACTION_UNITS.AU6.affect).toBe("positive");
    expect(FACE_ACTION_UNITS.AU12.affect).toBe("positive");
  });

  it("is a closed set — no ad-hoc shapes", () => {
    expect([...FACE_ACTION_UNIT_SET].sort()).toEqual(["AU12", "AU26", "AU4", "AU6"]);
    expect(Object.isFrozen(FACE_ACTION_UNITS)).toBe(true);
  });

  it("exposes the facs onset budget", () => {
    expect(FACE_ONSET_BUDGET.microMaxSeconds).toBe(1);
    expect(FACE_ONSET_BUDGET.macroMinSeconds).toBe(0.5);
    expect(FACE_ONSET_BUDGET.macroMaxSeconds).toBe(4);
  });

  it("ships the renderer-mirror smile shape table", () => {
    expect(FACE_ENERGY_SHAPE).toEqual({
      mouthCurve: 0.3,
      mouthOpen: 0.06,
      mouthWidth: 0.06,
      pullL: 0.12,
      pullR: 0.12,
      cheekL: 0.18,
      cheekR: 0.18,
      eyeOpen: -0.04,
    });
  });
});

describe("compileFaceBeats (fail-closed canon gate)", () => {
  it("compiles a genuine smile beat to a face-channel track", () => {
    const r = compileFaceBeats([smileBeat()], 3);
    expect(r.errors).toEqual([]);
    expect(r.track).not.toBeNull();
    expect(r.beats).toHaveLength(1);
    expect(r.beats[0].aus).toEqual(["AU6", "AU12"]);
  });

  it("rejects ad-hoc shapes — expression tracks map to named AUs", () => {
    const r = compileFaceBeats([smileBeat({ aus: ["smirk-left"] })], 3);
    expect(r.track).toBeNull();
    expect(r.errors.some((e) => e.includes("named AUs"))).toBe(true);
  });

  it("rejects an empty AU list", () => {
    const r = compileFaceBeats([smileBeat({ aus: [] })], 3);
    expect(r.track).toBeNull();
    expect(r.errors.some((e) => e.includes("no action units"))).toBe(true);
  });

  it("enforces the genuine-smile law: AU12 without AU6 reads as posed", () => {
    const r = compileFaceBeats([smileBeat({ aus: ["AU12"] })], 3);
    expect(r.track).toBeNull();
    expect(r.errors.some((e) => e.includes("AU12 without AU6"))).toBe(true);
    // AU6 alone is legal (a cheek lift without the lip pull).
    expect(compileFaceBeats([smileBeat({ aus: ["AU6"] })], 3).errors).toEqual([]);
  });

  it("enforces the onset budget (0, 4] s — union of micro + macro", () => {
    expect(compileFaceBeats([smileBeat({ onsetSeconds: 0 })], 3).errors.length).toBeGreaterThan(0);
    expect(compileFaceBeats([smileBeat({ onsetSeconds: 4.5 })], 6).errors.length).toBeGreaterThan(0);
    expect(compileFaceBeats([smileBeat({ onsetSeconds: NaN })], 3).errors.length).toBeGreaterThan(0);
    expect(compileFaceBeats([smileBeat({ onsetSeconds: 0.05 })], 3).errors).toEqual([]);
    expect(compileFaceBeats([smileBeat({ onsetSeconds: 4 })], 6).errors).toEqual([]);
    expect(compileFaceBeats([smileBeat({ onsetSeconds: 2.5 })], 6).errors).toEqual([]);
  });

  it("keeps the whole envelope inside the pack duration", () => {
    // t1 2 + decay 0.5 = 2.5 ≤ 3 OK; decay 1.5 would run to 3.5.
    expect(compileFaceBeats([smileBeat({ decaySeconds: 1.5 })], 3).errors.length).toBeGreaterThan(0);
    expect(compileFaceBeats([smileBeat({ decaySeconds: 1 })], 3).errors).toEqual([]);
  });

  it("rejects malformed windows and intensities", () => {
    expect(compileFaceBeats([smileBeat({ t1: 1 })], 3).errors.length).toBeGreaterThan(0);
    expect(compileFaceBeats([smileBeat({ t0: -1 })], 3).errors.length).toBeGreaterThan(0);
    expect(compileFaceBeats([smileBeat({ t1: 9 })], 3).errors.length).toBeGreaterThan(0);
    expect(compileFaceBeats([smileBeat({ intensity: 0 })], 3).errors.length).toBeGreaterThan(0);
    expect(compileFaceBeats([smileBeat({ intensity: NaN })], 3).errors.length).toBeGreaterThan(0);
  });

  it("rejects a face beat with no beat to serve (Doctrine 5: emotion is a result)", () => {
    const missing = compileFaceBeats([smileBeat({ beatId: undefined })], 3);
    expect(missing.track).toBeNull();
    expect(missing.errors.join(" ")).toContain("missing beatId");
    const empty = compileFaceBeats([smileBeat({ beatId: "   " })], 3);
    expect(empty.errors.join(" ")).toContain("missing beatId");
    // and the served beat id survives on the compiled beat
    const ok = compileFaceBeats([smileBeat()], 3);
    expect(ok.errors).toEqual([]);
    expect(ok.beats[0].beatId).toBe("settle");
  });

  it("clamps intensity to 1", () => {
    const r = compileFaceBeats([smileBeat({ intensity: 2.5, aus: ["AU4"] })], 3);
    expect(r.errors).toEqual([]);
    expect(r.beats[0].intensity).toBe(1);
    expect(faceBeatPeak(r.beats[0])).toBeCloseTo(0.55, 9);
  });

  it("one bad beat rejects the whole list (fail closed)", () => {
    const r = compileFaceBeats([smileBeat(), smileBeat({ id: "bad", aus: ["nope"] })], 3);
    expect(r.track).toBeNull();
    expect(r.beats).toEqual([]);
  });

  it("an empty list compiles to a flat-zero carrier (no face beats is legal)", () => {
    const r = compileFaceBeats([], 2);
    expect(r.errors).toEqual([]);
    expect(r.track).not.toBeNull();
    expect(evaluateCurveTrack(r.track as CurveTrack, 1)).toBe(0);
  });

  it("guards the payload shape + duration", () => {
    expect(compileFaceBeats("nope", 3).errors).toEqual(["face beats must be an array"]);
    expect(compileFaceBeats([smileBeat()], 0).errors.length).toBeGreaterThan(0);
    expect(compileFaceBeats([smileBeat()], NaN).errors.length).toBeGreaterThan(0);
  });

  it("is deterministic — same beats, identical track", () => {
    const a = compileFaceBeats([smileBeat()], 3);
    const b = compileFaceBeats([smileBeat()], 3);
    expect(JSON.stringify(a.track)).toBe(JSON.stringify(b.track));
  });
});

describe("envelopes + lowering", () => {
  const beat = compileFaceBeats([smileBeat()], 3).beats[0] as FaceBeat;

  it("peak energy = intensity × Σ AU weights, clamped 0..1", () => {
    expect(faceBeatPeak(beat)).toBe(1); // 0.6 × (1 + 1) = 1.2 → 1
    const focus = compileFaceBeats(
      [smileBeat({ aus: ["AU4"], intensity: 0.5 })],
      3,
    ).beats[0] as FaceBeat;
    expect(faceBeatPeak(focus)).toBeCloseTo(0.275, 9);
  });

  it("traces rise → hold → release", () => {
    expect(faceBeatEnergyAt(beat, 0.5)).toBe(0); // before onset
    expect(faceBeatEnergyAt(beat, 1)).toBeCloseTo(0, 9); // onset start
    expect(faceBeatEnergyAt(beat, 1.175)).toBeCloseTo(0.5, 9); // halfway up
    expect(faceBeatEnergyAt(beat, 1.35)).toBeCloseTo(1, 9); // peak
    expect(faceBeatEnergyAt(beat, 1.7)).toBe(1); // hold
    expect(faceBeatEnergyAt(beat, 2.25)).toBeCloseTo(0.5, 9); // halfway down
    expect(faceBeatEnergyAt(beat, 2.5)).toBeCloseTo(0, 9); // released
    expect(faceBeatEnergyAt(beat, 3)).toBe(0);
  });

  it("fails closed at non-finite time", () => {
    expect(faceBeatEnergyAt(beat, NaN)).toBe(0);
    expect(faceBeatEnergyAt(beat, Infinity)).toBe(0);
  });

  it("adds overlapping beats and clamps at 1", () => {
    const a = smileBeat({ id: "a", t0: 0.5, t1: 2, aus: ["AU6"], intensity: 0.3, onsetSeconds: 0.2, decaySeconds: 0.2 });
    const b = smileBeat({ id: "b", t0: 1, t1: 1.5, onsetSeconds: 0.2, decaySeconds: 0.2, intensity: 0.3 });
    const r = compileFaceBeats([a, b], 3);
    expect(r.errors).toEqual([]);
    // Inside the overlap, off a peak sum: 0.3 + 0.6·ramp ∈ (0.3, 0.9).
    expect(faceBeatsEnergyAt(r.beats, 1.1)).toBeCloseTo(0.3 + 0.6 * 0.5, 9);
    // Saturation: two full smiles clamp at 1.
    const c = smileBeat({ id: "c" });
    const d = smileBeat({ id: "d", t0: 1.2, t1: 2.2 });
    const s = compileFaceBeats([c, d], 3);
    expect(faceBeatsEnergyAt(s.beats, 1.7)).toBe(1);
  });

  it("the compiled track reproduces the summed envelope exactly (linear tangents)", () => {
    const a = smileBeat({ id: "a", t0: 0.5, t1: 2, onsetSeconds: 0.3, decaySeconds: 0.4 });
    const b = smileBeat({ id: "b", t0: 1, t1: 1.5, aus: ["AU4"], intensity: 0.8, onsetSeconds: 0.2, decaySeconds: 0.3 });
    const r = compileFaceBeats([a, b], 3);
    expect(r.errors).toEqual([]);
    const track = r.track as CurveTrack;
    for (let t = 0; t <= 3.0001; t += 0.05) {
      expect(evaluateCurveTrack(track, t)).toBeCloseTo(
        faceBeatsEnergyAt(r.beats, t),
        9,
      );
    }
  });

  it("keeps the carrier inside 0..1 everywhere", () => {
    const r = compileFaceBeats([smileBeat(), smileBeat({ id: "b2", t0: 1.2, t1: 2.4 })], 3);
    const track = r.track as CurveTrack;
    for (const k of (r.track as { keys: readonly { v: number }[] }).keys) {
      expect(k.v).toBeGreaterThanOrEqual(0);
      expect(k.v).toBeLessThanOrEqual(1);
    }
    expect(track).toBeTruthy();
  });
});
