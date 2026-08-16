/**
 * GASPER-CRAFT-001 · C1 — PerformancePackDriver tests.
 *
 * Fake organism clock (WorldPhysicsDriver idiom): the driver samples ONLY on
 * subscriber frames — no wall-clock, no timers — and every run is
 * deterministic.
 */
import { describe, expect, it } from "vitest";
import type {
  GasperOrganismClockPort,
  OrganismClockFrame,
  OrganismClockSubscriber,
} from "../clock";
import { normalizeCurveTrack } from "./CurveTrack";
import { checkSquashVolume } from "./PerformancePack";
import { compilePerformancePack, type PerformancePack } from "./PerformancePack";
import {
  PerformancePackDriver,
  type PerformancePackDriverOutput,
} from "./PerformancePackDriver";

type OrganismClockSubscription = () => void;

type Sub = {
  id: string;
  priority: number;
  onFrame: (frame: OrganismClockFrame) => void;
};

type ClockPick = Pick<GasperOrganismClockPort, "subscribe">;

class FakeClock implements ClockPick {
  private subs: Sub[] = [];
  private timeMs = 0;
  private frameIndex = 0;
  subscribe(sub: OrganismClockSubscriber): OrganismClockSubscription {
    const s: Sub = { id: sub.id, priority: sub.priority, onFrame: sub.onFrame };
    this.subs.push(s);
    return () => {
      this.subs = this.subs.filter((x) => x !== s);
    };
  }
  frame(deltaMs: number): void {
    this.timeMs += deltaMs;
    const frame: OrganismClockFrame = {
      timeMs: this.timeMs,
      elapsedMs: this.timeMs,
      deltaMs,
      signedDeltaMs: deltaMs,
      deltaSec: deltaMs / 1000,
      direction: 1,
      frameIndex: ++this.frameIndex,
      seed: 0,
      mode: "fixed-step",
      paused: false,
      running: true,
    };
    for (const s of [...this.subs].sort((a, b) => a.priority - b.priority)) {
      s.onFrame(frame);
    }
  }
}

const collect = () => {
  const outs: PerformancePackDriverOutput[] = [];
  return { outs, push: (o: PerformancePackDriverOutput) => outs.push(o) };
};

const runFor = (clock: FakeClock, seconds: number, stepMs = 16) => {
  const n = Math.round((seconds * 1000) / stepMs);
  for (let i = 0; i < n; i++) clock.frame(stepMs);
};

const K = (t: number, v: number, out?: string) =>
  out ? { t, v, out } : { t, v };

/** A 2s travel pack: arc rightward, one stretch, one squash, face. */
const travelPack = (over: Record<string, unknown> = {}): PerformancePack => {
  const r = compilePerformancePack({
    id: "t-travel",
    durationSeconds: 2,
    valueTurn: { from: "calm", to: "home" },
    channels: {
      world_x: [K(0, 0), K(0.5, 260), K(1, 400), K(1.5, 260), K(2, 0)],
      world_y: [K(0, 0), K(0.5, 180, "flat-clamped"), K(1, 0), K(1.5, 120, "flat-clamped"), K(2, 0)],
      tilt: [K(0, 0), K(0.5, 12), K(1, 0), K(1.5, -12), K(2, 0)],
      stretch: [K(0, 0), K(0.4, 0.12), K(0.5, 0), K(1, -0.2), K(2, 0)],
      squash: [K(0, 0), K(1, 0.3), K(1.4, 0)],
      face: [K(0, 0.2), K(1, 0.9), K(2, 0.4)],
    },
    beats: [
      { id: "out", t0: 0, t1: 1, shotScale: "wide", primaryIdea: "leap", valueTurn: "calm→bold", objective: "commit to the leap" },
      { id: "back", t0: 1, t1: 2, shotScale: "medium", primaryIdea: "return", valueTurn: "bold→home", objective: "carry the boldness home" },
    ],
    ...over,
  });
  expect(r.errors).toEqual([]);
  return r.pack as PerformancePack;
};

describe("PerformancePackDriver", () => {
  it("forwards nothing while idle", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new PerformancePackDriver(clock, push);
    runFor(clock, 1);
    expect(outs).toHaveLength(0);
    d.destroy();
  });

  it("subscribes as performance-pack at priority 26 (after physics 25)", () => {
    const seen: { id: string; priority: number }[] = [];
    const spy: ClockPick = {
      subscribe: (sub: OrganismClockSubscriber) => {
        seen.push({ id: sub.id, priority: sub.priority });
        return () => {};
      },
    };
    const d = new PerformancePackDriver(spy, () => {});
    d.destroy();
    expect(seen).toEqual([{ id: "performance-pack", priority: 26 }]);
  });

  it("run() forwards curve-authority poses sampled from the channels", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new PerformancePackDriver(clock, push);
    d.setParams({ exaggeration: 1 }); // exact channel read-back
    d.run(travelPack());
    runFor(clock, 0.56); // just past the first arc apex (t=0.5)
    expect(outs.length).toBeGreaterThan(10);
    for (const o of outs) expect(o.pose.provenance).toBe("curve-authority");
    const apex = outs.reduce((a, b) => (b.pose.y > a.pose.y ? b : a));
    expect(apex.pose.y).toBeGreaterThan(150); // near the authored 180 apex
    expect(apex.pose.x).toBeGreaterThan(200); // travelling right on the arc
    expect(Math.max(...outs.map((o) => Math.abs(o.pose.tilt)))).toBeGreaterThan(8);
    expect(apex.beatId).toBe("out");
    expect(apex.shotScale).toBe("wide"); // ShotDirector framing input (C2)
    d.destroy();
  });

  it("forwards the per-beat shot scale across beat boundaries, null on disarm", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new PerformancePackDriver(clock, push);
    d.run(travelPack());
    runFor(clock, 1.5); // inside beat 2 (medium)
    const late = outs[outs.length - 1];
    expect(late.beatId).toBe("back");
    expect(late.shotScale).toBe("medium");
    const early = outs.find((o) => o.t < 1);
    expect(early?.shotScale).toBe("wide");
    d.disarm();
    const disarmOut = outs[outs.length - 1];
    expect(disarmOut.shotScale).toBeNull();
    expect(disarmOut.beatId).toBeNull();
    d.destroy();
  });

  it("scene sequencers may claim scene-authority provenance", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new PerformancePackDriver(clock, push);
    d.run(travelPack(), { provenance: "scene-authority" });
    runFor(clock, 0.2);
    expect(outs[outs.length - 1].pose.provenance).toBe("scene-authority");
    d.destroy();
  });

  it("exaggeration rail scales pose and silhouette amplitude", () => {
    const maxX = (exaggeration: number) => {
      const clock = new FakeClock();
      const { outs, push } = collect();
      const d = new PerformancePackDriver(clock, push);
      d.setParams({ exaggeration });
      d.run(travelPack());
      runFor(clock, 1.2);
      d.destroy();
      return Math.max(...outs.map((o) => Math.abs(o.pose.x)));
    };
    const low = maxX(0.5);
    const high = maxX(2);
    expect(high).toBeCloseTo(low * 4, 1);
  });

  it("setParams clamps tempo [0.75, 1.25] and exaggeration [0.5, 2]", () => {
    const clock = new FakeClock();
    const { push } = collect();
    const d = new PerformancePackDriver(clock, push);
    d.setParams({ tempo: 99, exaggeration: -3 });
    expect(d.getState().params).toEqual({ tempo: 1.25, exaggeration: 0.5 });
    d.setParams({ tempo: Number.NaN });
    expect(d.getState().params.tempo).toBe(1.25); // non-finite keeps prior
    d.destroy();
  });

  it("tempo scales pack time — slower tempo takes more frames to release", () => {
    const perfFrames = (tempo: number) => {
      const clock = new FakeClock();
      const { outs, push } = collect();
      const d = new PerformancePackDriver(clock, push);
      d.setParams({ tempo, exaggeration: 1 });
      d.run(travelPack()); // 2s pack
      runFor(clock, 4);
      d.destroy();
      expect(outs[outs.length - 1].pose.provenance).toBe("none"); // released
      return outs.filter((o) => o.pose.provenance !== "none").length;
    };
    const fast = perfFrames(1.25); // 2 / 1.25 = 1.6s of wall time
    const slow = perfFrames(0.75); // 2 / 0.75 = 2.67s of wall time
    expect(fast).toBeGreaterThan(0);
    expect(slow).toBeGreaterThan(fast * 1.4);
  });

  it("silhouette deltas obey the volume law and PHYSICS_CHANNEL_BOUNDS", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new PerformancePackDriver(clock, push);
    d.setParams({ exaggeration: 1 });
    d.run(travelPack());
    runFor(clock, 1.2);
    // Stretch moment (t≈0.4): height +, width − (reciprocal).
    const stretched = outs.find((o) => (o.silhouetteDeltas.overall_height ?? 0) > 0.05);
    expect(stretched).toBeDefined();
    expect(stretched!.silhouetteDeltas.overall_width ?? 0).toBeLessThan(0);
    expect(
      checkSquashVolume(
        1 + (stretched!.silhouetteDeltas.overall_width ?? 0),
        1 + stretched!.silhouetteDeltas.overall_height!,
      ),
    ).toBe(true);
    // Squash moment (t≈1): height −, width derived +, ground_flattening armed.
    const squashed = outs.find((o) => (o.silhouetteDeltas.overall_height ?? 0) < -0.1);
    expect(squashed).toBeDefined();
    expect(squashed!.silhouetteDeltas.overall_width ?? 0).toBeGreaterThan(0.05);
    expect(squashed!.silhouetteDeltas.ground_flattening ?? 0).toBeGreaterThan(0.2);
    // Fence: nothing outside PHYSICS_CHANNEL_BOUNDS, ever.
    for (const o of outs) {
      expect(o.silhouetteDeltas.overall_height ?? 0).toBeGreaterThanOrEqual(-0.35);
      expect(o.silhouetteDeltas.overall_height ?? 0).toBeLessThanOrEqual(0.18);
      expect(o.silhouetteDeltas.overall_width ?? 0).toBeGreaterThanOrEqual(-0.16);
      expect(o.silhouetteDeltas.overall_width ?? 0).toBeLessThanOrEqual(0.3);
      expect(o.silhouetteDeltas.ground_flattening ?? 0).toBeGreaterThanOrEqual(0);
      expect(o.silhouetteDeltas.ground_flattening ?? 0).toBeLessThanOrEqual(0.6);
    }
    d.destroy();
  });

  it("oversized authored squash clamps inside the fence (bounds beat the law)", () => {
    const pack = travelPack({
      channels: {
        world_x: [K(0, 0), K(2, 0)],
        world_y: [K(0, 0), K(2, 0)],
        stretch: [K(0, 0), K(1, -0.9), K(2, 0)], // absurd authored value
      },
      beats: [],
    });
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new PerformancePackDriver(clock, push);
    d.setParams({ exaggeration: 1 });
    d.run(pack);
    runFor(clock, 1.2);
    const deepest = outs.reduce((a, b) =>
      (b.silhouetteDeltas.overall_height ?? 0) < (a.silhouetteDeltas.overall_height ?? 0)
        ? b
        : a,
    );
    expect(deepest.silhouetteDeltas.overall_height ?? 0).toBeLessThan(-0.3);
    expect(deepest.silhouetteDeltas.overall_height).toBeCloseTo(-0.35);
    expect(deepest.silhouetteDeltas.overall_width).toBeCloseTo(0.3);
    d.destroy();
  });

  it("wake feeds derive from track velocity × 1/160 with y-flip", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new PerformancePackDriver(clock, push);
    d.setParams({ exaggeration: 1 });
    d.run(travelPack());
    runFor(clock, 0.4); // ascending on the first arc
    const climbing = outs.find((o) => o.wakeVY < -0.05);
    expect(climbing).toBeDefined(); // world +y up → content wake −y
    expect(climbing!.wakeVX).toBeGreaterThan(0); // moving +x
    expect(climbing!.lightSpeed).toBeGreaterThan(0);
    d.destroy();
  });

  it("an authored wake channel overrides the neutral multiplier", () => {
    const run = (wakeKeys?: { t: number; v: number }[]) => {
      const pack = travelPack({
        channels: {
          world_x: [K(0, 0, "linear"), K(1, 1600)],
          world_y: [K(0, 0), K(1, 0)],
          ...(wakeKeys ? { wake: wakeKeys } : {}),
        },
        beats: [],
      });
      const clock = new FakeClock();
      const { outs, push } = collect();
      const d = new PerformancePackDriver(clock, push);
      d.setParams({ exaggeration: 1 });
      d.run(pack);
      runFor(clock, 0.5);
      d.destroy();
      return Math.max(...outs.map((o) => Math.abs(o.wakeVX)));
    };
    const neutral = run();
    const emphasized = run([{ t: 0, v: 3 }, { t: 1, v: 3 }]);
    const silenced = run([{ t: 0, v: 0 }, { t: 1, v: 0 }]);
    expect(emphasized).toBeCloseTo(neutral * 3, 1);
    expect(silenced).toBe(0);
  });

  it("face energy stays clamped 0..1 at sampling (the runtime fail-closed layer)", () => {
    // D-0107: face joined the compile-time unit fence (PACK_UNIT_CHANNELS),
    // so an out-of-range face track cannot compile. This fixture bypasses
    // the compiler (a doctored pack object) to prove the DRIVER'S clamp
    // survives as the second layer — defense in depth, ground_impact idiom.
    const base = travelPack();
    const pack = {
      ...base,
      channels: {
        ...base.channels,
        face: normalizeCurveTrack([{ t: 0, v: -3 }, { t: 1, v: 7 }, { t: 2, v: 0.5 }]),
      },
    } as PerformancePack;
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new PerformancePackDriver(clock, push);
    d.run(pack);
    runFor(clock, 1.9);
    for (const o of outs) {
      expect(o.face).toBeGreaterThanOrEqual(0);
      expect(o.face).toBeLessThanOrEqual(1);
    }
    const peak = outs.reduce((a, b) => (b.face > a.face ? b : a));
    expect(peak.face).toBe(1);
    d.destroy();
  });

  it("N40: ground_impact is retired — the driver forwards rest (0) without the channel, and packs that author it reject at compile", () => {
    // Retirement gate: a pack with the channel is rejected at compile, so the
    // driver can never see a non-zero ripple phase again (sampled, never drawn —
    // the camera_* retirement idiom; the renderer intake is a no-op).
    const pack = travelPack({
      channels: {
        world_x: [K(0, 0), K(2, 0)],
      },
      beats: [],
    });
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new PerformancePackDriver(clock, push);
    d.run(pack);
    runFor(clock, 1.9);
    for (const o of outs) expect(o.groundImpact).toBe(0);
    d.disarm();
    expect(outs[outs.length - 1].groundImpact).toBe(0);
    d.destroy();
  });

  it("physics-mode segments yield the pose channel but keep the feeds", () => {
    const pack = travelPack({
      segments: [{ t0: 0.8, t1: 1.4, mode: "physics" }],
    });
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new PerformancePackDriver(clock, push);
    d.run(pack);
    runFor(clock, 1.9);
    const yielded = outs.filter((o) => o.poseYield);
    const authored = outs.filter((o) => !o.poseYield);
    expect(yielded.length).toBeGreaterThan(5);
    expect(authored.length).toBeGreaterThan(5);
    for (const o of yielded) {
      expect(o.t).toBeGreaterThanOrEqual(0.8);
      expect(o.t).toBeLessThan(1.4);
      expect(o.segmentMode).toBe("physics");
    }
    // Silhouette keeps forwarding inside the physics window.
    expect(yielded.some((o) => Object.keys(o.silhouetteDeltas).length > 0)).toBe(true);
    d.destroy();
  });

  it("auto-releases at pack end: home pose, provenance none, then idle", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new PerformancePackDriver(clock, push);
    d.run(travelPack()); // 2s
    runFor(clock, 5);
    const last = outs[outs.length - 1];
    expect(last.pose.provenance).toBe("none");
    expect(last.pose).toMatchObject({ x: 0, y: 0, z: 0, tilt: 0 });
    expect(last.silhouetteDeltas).toEqual({});
    expect(last.wakeVX).toBe(0);
    expect(d.getState().running).toBe(false);
    const count = outs.length;
    runFor(clock, 0.5);
    expect(outs.length).toBe(count); // idle — nothing more forwarded
    d.destroy();
  });

  it("disarm releases immediately from a running pack", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new PerformancePackDriver(clock, push);
    d.run(travelPack());
    runFor(clock, 0.3);
    d.disarm();
    const last = outs[outs.length - 1];
    expect(last.pose.provenance).toBe("none");
    runFor(clock, 0.3);
    expect(outs[outs.length - 1]).toBe(last);
    d.destroy();
  });

  it("is deterministic for identical frame sequences", () => {
    const run = () => {
      const clock = new FakeClock();
      const { outs, push } = collect();
      const d = new PerformancePackDriver(clock, push);
      d.setParams({ exaggeration: 1.5, tempo: 1.25 });
      d.run(travelPack());
      runFor(clock, 3);
      d.destroy();
      return outs.map((o) =>
        [
          o.t.toFixed(4),
          o.pose.x.toFixed(4),
          o.pose.y.toFixed(4),
          o.pose.tilt.toFixed(4),
          o.wakeVX.toFixed(4),
          o.wakeVY.toFixed(4),
          o.lightSpeed.toFixed(4),
          JSON.stringify(o.silhouetteDeltas),
          o.face.toFixed(4),
          o.beatId ?? "-",
          o.segmentMode,
        ].join("|"),
      );
    };
    expect(run()).toEqual(run());
  });

  it("survives oversized / degenerate frames without non-finite state", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new PerformancePackDriver(clock, push);
    d.run(travelPack());
    clock.frame(5000); // tab-suspend spike — clamped to maxDt
    clock.frame(Number.NaN);
    clock.frame(-50);
    runFor(clock, 2);
    for (const o of outs) {
      expect(Number.isFinite(o.pose.x)).toBe(true);
      expect(Number.isFinite(o.pose.y)).toBe(true);
      expect(Number.isFinite(o.wakeVX)).toBe(true);
      expect(Number.isFinite(o.lightSpeed)).toBe(true);
    }
    const st = d.getState();
    expect(Number.isFinite(st.t)).toBe(true);
    d.destroy();
  });

  it("destroy unsubscribes from the clock", () => {
    const clock = new FakeClock();
    const { outs, push } = collect();
    const d = new PerformancePackDriver(clock, push);
    d.run(travelPack());
    d.destroy();
    runFor(clock, 0.5);
    expect(outs).toHaveLength(0);
  });
});
