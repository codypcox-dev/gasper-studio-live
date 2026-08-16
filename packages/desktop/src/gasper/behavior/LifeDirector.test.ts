/**
 * GASPER-ALIVE-001 · D-0108 — tests for the long-horizon life authority.
 *
 * Three layers, each machine-proven:
 *   1. The LAW (LifeDirector) — rotor coprimality, mood partition, golden
 *      attention, φ-ladder gaps (never metronomic), habituation feedback.
 *   2. The VOCABULARY (LifePacks) — zero compile errors, Doctrine 5 fields
 *      on every beat, home-to-home channels.
 *   3. The TRANSPORT (LifeDirectorDriver) — hierarchy of authorities on a
 *      fake clock: gate closed = nothing; φ² gradual resume; release-not-
 *      snap yielding; the full approach arc (out / gift / home); a
 *      deterministic 10-minute census with the aperiodicity gate.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { OrganismClockFrame } from "../clock";
import { GAIT_LAW } from "../physics/GaitLaw";
import {
  ATTENTION_LAW,
  LIFE_ACTION_IDS,
  LIFE_LAW,
  PHI,
  attentionYawDegreesFor,
  lifeActionFor,
  lifeApproachTarget,
  lifeAttentionTarget,
  lifeEventGapSeconds,
  lifeLongRestSeconds,
  lifeMoodAt,
  lifeAccentGains,
  type LifeActionId,
  type LifeMood,
} from "./LifeDirector";
import { insetWanderArrivalTarget } from "./GoldenWander";
import {
  LifeDirectorDriver,
  type LifeDirectorPorts,
} from "./LifeDirectorDriver";
import {
  LIFE_PACK_COMPILE_ERRORS,
  LIFE_PACK_IDS,
  getLifePack,
} from "./LifePacks";

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// ---------------------------------------------------------------------------
// The law — pure, deterministic, φ-shaped.
// ---------------------------------------------------------------------------

describe("D-0108 — the life law (rotors and ladders)", () => {
  it("the three rotors are pairwise coprime (LAW-3 incommensurability)", () => {
    const { attentionPeriodSeconds: a, moodPeriodSeconds: m, energyPeriodSeconds: e } =
      LIFE_LAW;
    expect([a, m, e]).toEqual([11, 29, 71]);
    expect(gcd(a, m)).toBe(1);
    expect(gcd(a, e)).toBe(1);
    expect(gcd(m, e)).toBe(1);
  });

  it("the golden angle is 360/φ² (the attention bearing never repeats a lane)", () => {
    expect(LIFE_LAW.goldenAngleDeg).toBeCloseTo(137.50776, 4);
  });

  it("the mood rotor visits all four moods inside one period, deterministically", () => {
    const seen = new Set<LifeMood>();
    for (let t = 0; t < LIFE_LAW.moodPeriodSeconds; t += 0.05) {
      seen.add(lifeMoodAt(7, t));
    }
    expect(seen.size).toBe(4);
    expect(lifeMoodAt(7, 13.2)).toBe(lifeMoodAt(7, 13.2));
    expect(lifeMoodAt(7, 13.2)).not.toBe(lifeMoodAt(913, 13.2)); // seeds differ
  });

  it("attention targets stay inside the face cone, holds ride the φ ladder", () => {
    const ladder = new Set(LIFE_LAW.attentionHoldLadderSeconds);
    for (let k = 0; k < 40; k++) {
      const t = lifeAttentionTarget(3, k);
      expect(Object.isFrozen(t)).toBe(true);
      expect(Math.abs(t.nx)).toBeLessThanOrEqual(0.9);
      expect(Math.abs(t.ny)).toBeLessThanOrEqual(0.9 * 0.6);
      expect(ladder.has(t.holdSeconds)).toBe(true);
    }
    // Consecutive bearings turn by the golden angle (never a patrol).
    const b0 = Math.atan2(lifeAttentionTarget(3, 0).ny, lifeAttentionTarget(3, 0).nx);
    const b1 = Math.atan2(lifeAttentionTarget(3, 1).ny, lifeAttentionTarget(3, 1).nx);
    const delta = ((b1 - b0) * 180) / Math.PI;
    const norm = ((delta % 360) + 360) % 360;
    // The y-axis 0.6 squeeze distorts the read-back angle, but it must be
    // far from 0/180 (no lane reuse) — the golden angle reads ≈137.5° ±.
    expect(norm).toBeGreaterThan(60);
    expect(norm).toBeLessThan(300);
    expect(Math.abs(norm - 180)).toBeGreaterThan(30);
  });

  it("event gaps live on the φ ladder × mood tempo — bounded, never metronomic", () => {
    const moods: LifeMood[] = ["content", "curious", "playful", "tired"];
    const lo = (1 / PHI) * 0.8; // smallest rung × fastest tempo
    const hi = 2 * PHI * 1.6 * (1 + LIFE_LAW.gapWobble); // biggest × slowest × wobble
    const gaps: number[] = [];
    for (let k = 0; k < 24; k++) {
      const g = lifeEventGapSeconds(k, moods[k % 4]);
      expect(g).toBeGreaterThanOrEqual(lo);
      expect(g).toBeLessThanOrEqual(hi);
      gaps.push(g);
    }
    // Aperiodicity: 24 consecutive gaps must not collapse onto few values.
    expect(new Set(gaps.map((g) => g.toFixed(4))).size).toBeGreaterThanOrEqual(10);
  });

  it("long rests live inside the 8–13 s window (the rotor picks, never fixed)", () => {
    const seen = new Set<number>();
    for (let t = 0; t < 400; t += 1.37) {
      const d = lifeLongRestSeconds(3, t);
      expect(d).toBeGreaterThanOrEqual(LIFE_LAW.longRestMinSeconds);
      expect(d).toBeLessThanOrEqual(LIFE_LAW.longRestMaxSeconds);
      seen.add(Math.round(d * 10));
    }
    expect(seen.size).toBeGreaterThan(10); // not a single duration
  });

  it("approach targets walk the near-glass lane inside the frustum", () => {
    // At z=−320 the frustum half-width is 960·(1920−320)/1920 = 800 (N35 glass).
    for (let k = 0; k < 40; k++) {
      const p = lifeApproachTarget(k);
      expect(p.z).toBe(-320);
      expect(Math.abs(p.x)).toBeGreaterThanOrEqual(60);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(150);
      expect(Math.abs(p.x)).toBeLessThan(800);
    }
  });

  it("action choice is deterministic, in-vocabulary, and habituation redirects it", () => {
    for (let k = 0; k < 30; k++) {
      const a = lifeActionFor("content", k, {});
      expect(LIFE_ACTION_IDS).toContain(a);
      expect(lifeActionFor("content", k, {})).toBe(a);
    }
    // Damping is real: for some draw, burying the curious favorite (notice)
    // in recent counts must change the verdict.
    let redirected = 0;
    for (let k = 0; k < 40; k++) {
      const base = lifeActionFor("curious", k, {});
      const damped = lifeActionFor("curious", k, { notice: 100 });
      if (base !== damped) redirected++;
    }
    expect(redirected).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// The attention-yaw law (S5 · A-LAW, expression-attention-phd-memo) — the
// body turns to address. Every constant pins from the field + φ EXPRESSION.
// ---------------------------------------------------------------------------

describe("S5 A-LAW — attention drives body yaw (consonant C7)", () => {
  it("A-LAW 1 — the yaw amplitude is the golden cut of the turntable range", () => {
    expect(ATTENTION_LAW.yawMaxDeg).toBeCloseTo(45 / PHI, 12);
    expect(ATTENTION_LAW.yawMaxDeg * PHI).toBeCloseTo(45, 12);
    // The dial owns the whole range; autonomous attention owns the cut.
    expect(ATTENTION_LAW.yawMaxDeg).toBeLessThan(ATTENTION_LAW.yawFenceDeg);
  });

  it("A-LAW 1 — target → yaw is linear, odd, and clamped to the cone", () => {
    expect(attentionYawDegreesFor(0)).toBe(0);
    // Odd: addressing left turns the silhouette left.
    expect(attentionYawDegreesFor(0.6)).toBeCloseTo(
      -attentionYawDegreesFor(-0.6),
      12,
    );
    expect(attentionYawDegreesFor(1)).toBeCloseTo(ATTENTION_LAW.yawMaxDeg, 12);
    expect(attentionYawDegreesFor(-1)).toBeCloseTo(-ATTENTION_LAW.yawMaxDeg, 12);
    // Linearity inside the cone.
    expect(attentionYawDegreesFor(0.5)).toBeCloseTo(ATTENTION_LAW.yawMaxDeg / 2, 12);
    // Clamped beyond it; corrupt input fails closed to frontal.
    expect(attentionYawDegreesFor(3)).toBeCloseTo(ATTENTION_LAW.yawMaxDeg, 12);
    expect(attentionYawDegreesFor(-3)).toBeCloseTo(-ATTENTION_LAW.yawMaxDeg, 12);
    expect(attentionYawDegreesFor(Number.NaN)).toBe(0);
    expect(attentionYawDegreesFor(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("A-LAW 1 — every rotor attention target maps inside the symmetric fence", () => {
    for (let k = 0; k < 60; k++) {
      const t = lifeAttentionTarget(5, k);
      const yaw = attentionYawDegreesFor(t.nx);
      expect(Math.abs(yaw)).toBeLessThanOrEqual(ATTENTION_LAW.yawMaxDeg);
      expect(Math.abs(yaw)).toBeLessThan(ATTENTION_LAW.yawFenceDeg);
    }
  });

  it("A-LAW 2 — pursuit τ is the action constant τ_c·φ³ (== flight thrust τ)", () => {
    expect(ATTENTION_LAW.yawTauSec).toBeCloseTo(
      GAIT_LAW.bankSmoothTauSec * PHI * PHI,
      12,
    );
    expect(ATTENTION_LAW.yawTauSec).toBeCloseTo(0.06 * PHI * PHI * PHI, 12);
    expect(ATTENTION_LAW.yawTauSec).toBeGreaterThan(0.24);
    expect(ATTENTION_LAW.yawTauSec).toBeLessThan(0.27);
  });

  it("A-LAW 2 — the ordering is derived: eyes lead, the body answers later", () => {
    // The renderer's external-gaze pursuit is 0.16 s (D-0108). The body yaw
    // must be STRICTLY slower so the eyes arrive first, the silhouette after.
    expect(ATTENTION_LAW.yawTauSec).toBeGreaterThan(
      ATTENTION_LAW.externalGazeTauSec,
    );
    expect(ATTENTION_LAW.externalGazeTauSec).toBe(0.16);
  });
});

// ---------------------------------------------------------------------------
// The vocabulary — the self-initiated acts (alive-015), Doctrine 5 enforced.
// ---------------------------------------------------------------------------

describe("D-0108 — the life-pack vocabulary", () => {
  it("compiles with ZERO errors (fail-closed compiler)", () => {
    expect(LIFE_PACK_COMPILE_ERRORS).toEqual([]);
    expect([...LIFE_PACK_IDS]).toEqual([
      "life-notice",
      "life-delight-hop",
      "life-stretch",
    ]);
  });

  it("every beat carries Doctrine 5 (objective + primaryIdea + value turn)", () => {
    for (const id of LIFE_PACK_IDS) {
      const pack = getLifePack(id);
      expect(pack, id).not.toBe(null);
      expect(pack!.beats.length).toBeGreaterThan(0);
      for (const beat of pack!.beats) {
        expect(beat.objective.length, `${id}:${beat.id} objective`).toBeGreaterThan(0);
        expect(beat.primaryIdea.length, `${id}:${beat.id} primaryIdea`).toBeGreaterThan(0);
        expect(beat.valueTurn.length, `${id}:${beat.id} valueTurn`).toBeGreaterThan(0);
      }
      expect(pack!.valueTurn.from === pack!.valueTurn.to).toBe(false);
    }
  });

  it("acts are small (fidgets over the breathing base) and home-to-home", () => {
    for (const id of LIFE_PACK_IDS) {
      const pack = getLifePack(id)!;
      expect(pack.durationSeconds).toBeGreaterThan(1);
      expect(pack.durationSeconds).toBeLessThanOrEqual(2 * PHI + 0.1);
    }
  });

  it("unknown ids fail closed", () => {
    expect(getLifePack("life-gift-look")).toBe(null);
    expect(getLifePack("s2-bounce")).toBe(null);
    expect(getLifePack("")).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// The transport — hierarchy of authorities, live on a fake clock.
// ---------------------------------------------------------------------------

function fakeClock() {
  let sub: { onFrame: (frame: OrganismClockFrame) => void } | null = null;
  let t = 0;
  return {
    subscribe(s: { onFrame: (frame: OrganismClockFrame) => void }) {
      sub = s;
      return () => {
        sub = null;
      };
    },
    /** The organism-time the simulated body integrates against. */
    now(): number {
      return t;
    },
    fire(deltaMs = 1000 / 60) {
      t += deltaMs / 1000;
      sub?.onFrame({ deltaMs } as unknown as OrganismClockFrame);
    },
    fireFor(seconds: number, stepMs = 1000 / 60) {
      const n = Math.round((seconds * 1000) / stepMs);
      for (let i = 0; i < n; i++) this.fire(stepMs);
    },
  };
}

/**
 * D-0112: a simulated body with the kernel's arrival semantics — walks the
 * filed intent at the intent's cruise speed, stands at the target. Every
 * read/write integrates up to the clock first, so the double is a pure
 * function of elapsed time + intent history.
 */
function fakeLocomotion(clock: ReturnType<typeof fakeClock>) {
  const intents: Partial<
    Record<"wander" | "life" | "internal", { x: number; z: number; cruise: number }>
  > = {};
  const owners = { wander: false, life: false, internal: false };
  const body = { x: 0, z: 0, speed: 0 };
  const log: string[] = [];
  /** The body path, sampled on every read (continuity proofs). */
  const path: { x: number; z: number }[] = [];
  let lastT = 0;

  function integrate() {
    const dt = Math.max(0, clock.now() - lastT);
    lastT = clock.now();
    if (dt <= 0) return;
    const intent = intents.life ?? intents.wander ?? intents.internal;
    if (!intent) {
      body.speed = 0;
      return;
    }
    const dx = intent.x - body.x;
    const dz = intent.z - body.z;
    const d = Math.hypot(dx, dz);
    if (d <= 1e-9) {
      body.speed = 0;
      return;
    }
    const step = Math.min(d, intent.cruise * dt);
    body.x += (dx / d) * step;
    body.z += (dz / d) * step;
    body.speed = step < d ? intent.cruise : 0; // arrived => standing
  }

  return {
    intents,
    owners,
    body,
    log,
    path,
    setLocomotion(
      owner: "wander" | "life" | "internal",
      intent: { x: number; z: number; cruise: number },
    ): void {
      integrate();
      intents[owner] = intent;
      owners[owner] = true;
      log.push(
        `set|${owner}|${intent.x.toFixed(3)}|${intent.z.toFixed(3)}|${intent.cruise.toFixed(3)}`,
      );
    },
    clearLocomotion(owner: "wander" | "life" | "internal"): void {
      integrate();
      delete intents[owner]; // ownership retained (the gift hold)
      log.push(`clear|${owner}`);
    },
    standDownLocomotion(owner: "wander" | "life" | "internal"): void {
      integrate();
      delete intents[owner];
      owners[owner] = false;
      log.push(`standDown|${owner}`);
    },
    floorPose() {
      integrate();
      path.push({ x: body.x, z: body.z });
      return { x: body.x, z: body.z, speed: body.speed };
    },
    // Cycle 3 M1/M2 — the kernel's live Coulomb budget (D-0112 field idiom:
    // μ = 1/φ², g = 74210 u/s²). The simulated body ignores it.
    traction: () => ({ mu: 1 / (PHI * PHI), gravity: 74210 }),
  };
}

function recorder(clock: ReturnType<typeof fakeClock>, gate: () => boolean) {
  const locomotion = fakeLocomotion(clock);
  const calls = {
    packs: [] as string[],
    gazes: [] as { x: number; y: number; s: number }[],
    states: [] as string[],
    rests: 0,
    wakes: 0,
    wander: [] as boolean[],
    accents: [] as { m: number; f: number }[],
    substrates: [] as boolean[],
  };
  let packTicksLeft = 0;
  const ports: LifeDirectorPorts = {
    locomotion,
    runPack: (id) => {
      calls.packs.push(id);
      packTicksLeft = 150; // ~2.5 s at 60 fps — a believable act length
      return true;
    },
    packRunning: () => {
      if (packTicksLeft > 0) {
        packTicksLeft--;
        return true;
      }
      return false;
    },
    setGaze: (x, y, s) => calls.gazes.push({ x, y, s }),
    accentState: (id) => calls.states.push(id),
    enterLongRest: () => {
      calls.rests++;
    },
    wakeFromLongRest: () => {
      calls.wakes++;
    },
    setWanderEnabled: (v) => calls.wander.push(v),
    accent: (m, f) => calls.accents.push({ m, f }),
    substrate: (open) => calls.substrates.push(open),
    gate,
  };
  return { calls, ports, locomotion };
}

describe("D-0108 — the life director driver (hierarchy of authorities)", () => {
  it("emits nothing while the gate is closed", () => {
    const clock = fakeClock();
    const { calls, ports, locomotion } = recorder(clock, () => false);
    const d = new LifeDirectorDriver(clock, ports);
    clock.fireFor(30);
    expect(locomotion.log.length).toBe(0);
    expect(locomotion.body.x).toBe(0);
    expect(calls.gazes.length).toBe(0);
    expect(calls.packs.length).toBe(0);
    expect(calls.states.length).toBe(0);
    expect(d.getState().phase).toBe("observing");
    d.destroy();
  });

  it("opens with a φ² gradual resume, then lives", () => {
    const clock = fakeClock();
    const { calls, ports } = recorder(clock, () => true);
    const d = new LifeDirectorDriver(clock, ports);

    clock.fireFor(LIFE_LAW.resumeCooldownSeconds - 0.1);
    expect(calls.gazes.length + calls.packs.length + calls.states.length).toBe(0);

    clock.fireFor(8); // first event lands within φ² + the largest gap
    expect(
      calls.gazes.length + calls.packs.length + calls.states.length,
    ).toBeGreaterThan(0);
    expect(d.getState().eventCount).toBeGreaterThan(0);
    d.destroy();
  });

  it("is deterministic — two organisms under the same law live identical lives", () => {
    const run = () => {
      const clock = fakeClock();
      const { ports } = recorder(clock, () => true);
      const d = new LifeDirectorDriver(clock, ports);
      clock.fireFor(300);
      const s = d.getState();
      d.destroy();
      return { eventCount: s.eventCount, log: s.log, mood: s.mood };
    };
    expect(run()).toEqual(run());
  });

  it("yielding: a closed gate mid-attention releases (never snaps) and waits φ²", () => {
    const clock = fakeClock();
    let open = true;
    const { calls, ports } = recorder(clock, () => open);
    const d = new LifeDirectorDriver(clock, ports);

    // Find the first attention hold.
    let guard = 0;
    while (d.getState().phase !== "attending" && guard++ < 60 * 400) clock.fire();
    expect(d.getState().phase).toBe("attending");
    expect(d.getState().attention).not.toBe(null);

    // Suppression: gaze released, accent reset, back to observing.
    open = false;
    clock.fire();
    expect(d.getState().phase).toBe("observing");
    expect(calls.gazes[calls.gazes.length - 1]).toEqual({ x: 0, y: 0, s: 0 });
    expect(calls.accents[calls.accents.length - 1]).toEqual({ m: 1, f: 1 });

    // Gradual resume: nothing for φ², life again after.
    const before = d.getState().eventCount;
    open = true;
    clock.fireFor(LIFE_LAW.resumeCooldownSeconds - 0.2);
    expect(d.getState().eventCount).toBe(before);
    clock.fireFor(8);
    expect(d.getState().eventCount).toBeGreaterThan(before);
    d.destroy();
  });

  it("setEnabled(false) stands everything down", () => {
    const clock = fakeClock();
    const { calls, ports } = recorder(clock, () => true);
    const d = new LifeDirectorDriver(clock, ports);
    clock.fireFor(20);
    expect(d.getState().eventCount).toBeGreaterThan(0);
    d.setEnabled(false);
    clock.fireFor(20);
    expect(d.getState().enabled).toBe(false);
    // A suppressed life releases its seams (gaze home, identity accents).
    expect(calls.gazes[calls.gazes.length - 1]).toEqual({ x: 0, y: 0, s: 0 });
    expect(calls.accents[calls.accents.length - 1]).toEqual({ m: 1, f: 1 });
    d.destroy();
  });

  it("the approach arc: stroll to the glass, φ² gift hold, walk home, zero seam", () => {
    const clock = fakeClock();
    const { calls, ports, locomotion } = recorder(clock, () => true);
    const d = new LifeDirectorDriver(clock, ports);

    // Find the first gift-look (deterministic — it WILL come).
    let guard = 0;
    while (d.getState().phase !== "approaching" && guard++ < 60 * 2400) clock.fire();
    expect(d.getState().phase).toBe("approaching");

    // Wander (the lower spatial autonomy) was paused for the leg.
    expect(calls.wander[calls.wander.length - 1]).toBe(false);

    // D-0112: the outward leg is a filed INTENT, not a dragged pose — the
    // glass anchor at the law's cruise (the kernel owns the walk). The
    // intent lands on the first approaching tick, so step once.
    clock.fire();
    // record() bumps eventCount before the gift case reads it, so the live
    // count IS the target index.
    const to = lifeApproachTarget(d.getState().eventCount);
    const filed = insetWanderArrivalTarget({ x: 0, z: 0 }, to);
    const out = locomotion.intents.life;
    expect(out).toBeDefined();
    expect(out!.x).toBeCloseTo(filed.x, 9);
    expect(out!.z).toBeCloseTo(filed.z, 9);
    expect(out!.cruise).toBeCloseTo(LIFE_LAW.approachSpeedUnitsPerSec, 9);

    // Tick through the whole act.
    const gazesBefore = calls.gazes.length;
    const statesBefore = calls.states.length;
    const pathBefore = locomotion.path.length;
    guard = 0;
    while (d.getState().phase === "approaching" && guard++ < 60 * 60) clock.fire();
    expect(d.getState().phase).toBe("observing");

    // The BODY walked the arc — a continuous path, never a teleport, depth
    // monotonically toward the glass, inside the frustum at every step.
    const path = locomotion.path.slice(pathBefore);
    // N35 (2026-08-06): the glass is nearer (−320 vs −650) — the stroll is
    // shorter, so the sample floor drops (17 observed); the LAW reads the
    // monotone approach + the arrival anchor, not a sample count.
    expect(path.length).toBeGreaterThan(10);
    for (let i = 1; i < path.length; i++) {
      const step = Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
      expect(step).toBeLessThan(LIFE_LAW.approachSpeedUnitsPerSec / 60 + 10); // Cycle 1 L2 rebase: approach cruise per frame + margin (was 260/φ ≈ 2.7 u/frame)
    }
    const minZ = Math.min(...path.map((p) => p.z));
    expect(minZ).toBeCloseTo(filed.z, 0); // arrival at the N35 glass anchor (1.2× max)
    for (const p of path) {
      expect(Math.abs(p.x)).toBeLessThan(635); // inside the frustum at its z
      expect(p.z).toBeGreaterThanOrEqual(-320); // never through the glass (N35)
    }

    // The gift hold: ownership KEPT with a cleared intent (the kernel holds
    // the body still while the smile is given) — exactly one clear, and the
    // stand-down lands only after it.
    const clearIdx = locomotion.log.indexOf("clear|life");
    expect(clearIdx).toBeGreaterThanOrEqual(0);
    expect(locomotion.log.filter((l) => l === "clear|life").length).toBe(1);
    const standIdx = locomotion.log.lastIndexOf("standDown|life");
    expect(standIdx).toBeGreaterThan(clearIdx);
    expect(locomotion.log.filter((l) => l === "standDown|life").length).toBe(1);

    // The gift: eyes on the viewer + pleased accent + identity-lifting gains.
    const gazeCalls = calls.gazes.slice(gazesBefore);
    expect(gazeCalls.some((g) => g.x === 0 && g.y === 0 && g.s === 1)).toBe(true);
    expect(calls.states.slice(statesBefore)).toContain("presence-pleased-resolve");
    expect(
      calls.accents.some(
        (a) => a.m === LIFE_LAW.accentMouthGain && a.f === LIFE_LAW.accentFormGain,
      ),
    ).toBe(true);

    // Home again: the body stands down at (0,0), ownership released, wander
    // restored, gaze + accent released — zero seam.
    expect(locomotion.owners.life).toBe(false);
    expect(locomotion.intents.life).toBeUndefined();
    expect(Math.hypot(locomotion.body.x, locomotion.body.z)).toBeLessThan(8);
    expect(calls.wander[calls.wander.length - 1]).toBe(true);
    expect(calls.gazes[calls.gazes.length - 1]).toEqual({ x: 0, y: 0, s: 0 });
    expect(calls.accents[calls.accents.length - 1]).toEqual({ m: 1, f: 1 });
    d.destroy();
  });

  it("yielding mid-approach releases ownership — the kernel owns the release", () => {
    const clock = fakeClock();
    let open = true;
    const { ports, locomotion } = recorder(clock, () => open);
    const d = new LifeDirectorDriver(clock, ports);

    let guard = 0;
    while (d.getState().phase !== "approaching" && guard++ < 60 * 2400) clock.fire();
    expect(d.getState().phase).toBe("approaching");

    // The gate closes mid-stroll (a performance is called, capture, …).
    open = false;
    clock.fire();
    expect(d.getState().phase).toBe("observing");
    // Ownership stood down — no lingering life intent to outrank wander.
    expect(locomotion.log).toContain("standDown|life");
    expect(locomotion.owners.life).toBe(false);
    expect(locomotion.intents.life).toBeUndefined();
    d.destroy();
  });

  it("D-0112 xyz-awareness: noticeEnvironment lands a look-around when free", () => {
    const clock = fakeClock();
    const { calls, ports } = recorder(clock, () => true);
    const d = new LifeDirectorDriver(clock, ports);

    // Bring him to a free moment (observing) past the φ² resume.
    clock.fireFor(LIFE_LAW.resumeCooldownSeconds + 1);
    let guard = 0;
    while (d.getState().phase !== "observing" && guard++ < 60 * 60) clock.fire();
    expect(d.getState().phase).toBe("observing");

    const gazesBefore = calls.gazes.length;
    const statesBefore = calls.states.length;
    const eventsBefore = d.getState().eventCount;

    // The environment changed under his feet: he looks around to re-locate.
    expect(d.noticeEnvironment()).toBe(true);
    expect(d.getState().phase).toBe("attending");
    expect(d.getState().eventCount).toBe(eventsBefore + 1);
    expect(d.getState().log[d.getState().log.length - 1].action).toBe("look-around");
    // Gaze engaged + the listening-receive accent fired.
    expect(calls.gazes.length).toBeGreaterThan(gazesBefore);
    expect(calls.gazes[calls.gazes.length - 1].s).toBe(1);
    expect(calls.states.slice(statesBefore)).toContain("presence-listening-receive");

    // It never interrupts a held act: fire it again mid-attending => declined.
    expect(d.noticeEnvironment()).toBe(false);
    d.destroy();
  });

  it("noticeEnvironment is silent when the gate is closed (hierarchy law)", () => {
    const clock = fakeClock();
    const { calls, ports } = recorder(clock, () => false);
    const d = new LifeDirectorDriver(clock, ports);
    clock.fireFor(5);
    expect(d.noticeEnvironment()).toBe(false);
    expect(calls.gazes.length).toBe(0);
    expect(d.getState().eventCount).toBe(0);
    d.destroy();
  });

  it("a 10-minute census: many self-initiated acts, all families, no loop", () => {
    const clock = fakeClock();
    const { calls, ports } = recorder(clock, () => true);
    const d = new LifeDirectorDriver(clock, ports);
    clock.fireFor(600);
    const s = d.getState();

    // Large stretches of visible autonomy: dozens of self-initiated acts.
    expect(s.eventCount).toBeGreaterThanOrEqual(40);
    // The vocabulary is exercised broadly (deterministic seed — stable).
    expect(calls.packs.length).toBeGreaterThanOrEqual(3);
    expect(calls.wander.filter((v) => !v).length).toBeGreaterThanOrEqual(1); // ≥1 approach
    expect(calls.rests).toBeGreaterThanOrEqual(1); // ≥1 dormant arc
    expect(calls.wakes).toBeGreaterThanOrEqual(1);
    // Attention: many gaze engagements, each released (last call is home).
    expect(calls.gazes.filter((g) => g.s === 1).length).toBeGreaterThanOrEqual(8);

    // Aperiodicity gate: the last 24 acts hold no period p ∈ 1..8 —
    // a looping sequence loops everywhere, so a loop-free tail is loop-free.
    const seq = s.log.map((e) => e.action);
    expect(seq.length).toBe(24);
    for (let p = 1; p <= 8; p++) {
      let periodic = true;
      for (let i = 0; i + p < seq.length; i++) {
        if (seq[i] !== seq[i + p]) {
          periodic = false;
          break;
        }
      }
      expect(periodic, `period ${p} must not exist`).toBe(false);
    }
    d.destroy();
  });

  it("clock fault law: a throwing gate silences the organ, never the clock", () => {
    const clock = fakeClock();
    let broken = true;
    const { ports } = recorder(clock, () => {
      if (broken) throw new Error("gate exploded");
      return true;
    });
    const d = new LifeDirectorDriver(clock, ports);
    // Must not throw out of the clock subscriber.
    expect(() => clock.fireFor(10)).not.toThrow();
    expect(d.getState().eventCount).toBe(0);
    // Repair: life resumes after the φ² gradual resume.
    broken = false;
    clock.fireFor(LIFE_LAW.resumeCooldownSeconds + 8);
    expect(d.getState().eventCount).toBeGreaterThan(0);
    d.destroy();
  });
});

describe("D-0109 — the life substrate (the body breathes at home)", () => {
  it("substrate follows the gate on every transition, and releases with the desk", () => {
    const clock = fakeClock();
    let gate = true;
    const { calls, ports } = recorder(clock, () => gate);
    const d = new LifeDirectorDriver(clock, ports);
    clock.fireFor(2);
    expect(calls.substrates).toEqual([true]); // opens with the gate
    gate = false;
    clock.fireFor(2);
    expect(calls.substrates).toEqual([true, false]); // closes on gate drop
    gate = true;
    clock.fireFor(2);
    expect(calls.substrates).toEqual([true, false, true]);
    d.setEnabled(false); // the master switch releases the substrate too
    expect(calls.substrates).toEqual([true, false, true, false]);
    d.destroy();
  });

  it("a throwing gate closes the substrate through standDown (fault law)", () => {
    const clock = fakeClock();
    let broken = false;
    const { calls, ports } = recorder(clock, () => {
      if (broken) throw new Error("boom");
      return true;
    });
    const d = new LifeDirectorDriver(clock, ports);
    clock.fireFor(2);
    expect(calls.substrates).toEqual([true]);
    broken = true;
    expect(() => clock.fireFor(2)).not.toThrow();
    expect(calls.substrates[calls.substrates.length - 1]).toBe(false);
    d.destroy();
  });
});

describe("D-0109 — renderer mirror (the face thinks, the body breathes, the place is lit)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const bundle = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");

  it("D-0110 absence law: the face grammar carries NO pupil/iris anatomy", () => {
    // Owner-ratified character design: Gasper's eyes are pupil-less almonds +
    // specular sparks only. Pupils were added once without approval and
    // retracted by owner order (D-0110); this test locks the absence in.
    expect(bundle).not.toContain("data-pupil");
    expect(bundle).not.toContain("makePupil");
    expect(bundle).not.toContain("pupilDX");
  });

  it("carries the life substrate intake with byte-identical defaults", () => {
    // The three life keys read with ??0 / ??1 defaults => absent subkey = pre-002 bytes.
    expect(bundle).toContain("Number(_lifeCfg.restFloor)||0");
    expect(bundle).toContain("Number(_lifeCfg.breathGain)||1");
    expect(bundle).toContain("Number(_lifeCfg.restWarmth)||0");
    // The rest gate floors at the life floor; the settled-hold waits for floor 0.
    expect(bundle).toContain("bodyRestGate=lerp(bodyRestGate,_restSettled?_lifeFloor:1");
    expect(bundle).toContain("_lifeFloor<=0.001");
    // Phase-continuous release (no breath pop when life opens the gate).
    expect(bundle).toContain("idleClockOffset+=heldCycleSeconds-elapsed");
    expect(bundle).toContain("elapsed+idleClockOffset");
    // breathGain lifts the idle transform at the application site, eased.
    expect(bundle).toContain("idle.driftX*stateMotion*breathGainE");
    expect(bundle).toContain("breathGainE=lerp(breathGainE,_breathGainT");
    // Arrived-hold: field/star paints floor at the life floor (motion.value is 0 at rest).
    expect(bundle).toContain("starMotion=reducedMotion?0:Math.max(Number(motion.value)*lifeScale,_lifeFloor)");
    expect(bundle).toContain("if(_lifeFloor>0.001){const starT=cycleSeconds");
    expect(bundle).not.toContain("if(unifiedDynamics&&_lifeFloor>0.001){const starT=cycleSeconds");
    expect(bundle).toContain("if(bodyHeld){frameState=heldFrameState;if(_lifeFloor<=0.001){cycleSeconds=heldCycleSeconds;idle=heldIdle;}}");
    expect(bundle).not.toContain("violetFieldNode.setAttribute");
    expect(bundle).toContain("idle.reflectionX*starMotion*0.5");
    expect(bundle).toContain("setPhysicsIdle(v){physIdle=");
    expect(bundle).toContain("volumeX=st.postureScaleX||1,volumeY=st.postureScaleY||1");
    expect(bundle).toContain("lifeDxM=_lifeFloorM>0.001?Math.sin(starTM*0.73)*10:0");
    expect(bundle).toContain("if(_lifeFloorC>0.001||key!==_fleckCache.key||_fleckCache.frame>=30)");
    expect(bundle).toContain("getPaintProbe(){");
    expect(bundle).toContain("const _livingVol=num('unified_volume_scale_y')!==null");
    expect(bundle).not.toContain("const _livingVol=num('unified_time_seconds')!==null||num('unified_volume_scale_y')!==null");
    expect(bundle).toContain("Math.max(motionStrength,_lifeFloor)*bodyRestGate");
    expect(bundle).toContain("Math.max(motionStrength*(frameState.motionGain??.72),_lifeFloor)");
    // restWarmth eases a calm half-smile into neutral-settled on the body tau.
    expect(bundle).toContain("_lifeWarm*(eightStateId==='presence-neutral-settled'?1:0)");
    // Attention gains at the ratified D-0108 values (D-0110: the A-1 bump is reverted).
    expect(bundle).toContain("externalGazeTX*4.2*egGate");
    expect(bundle).toContain("externalGazeTY*3.0*egGate");
  });

  it("the guarded face block stays pupil-less by construction (FACE_GEOMETRY_SHA idiom)", () => {
    // D-0110: eyePath / renderExpressionShell sources carry no pupil/iris writes —
    // the face grammar is pupil-less all the way down, not just at the top level.
    const eyePathSrc = bundle.slice(
      bundle.indexOf("function eyePath("),
      bundle.indexOf("function mouthPath("),
    );
    expect(eyePathSrc).not.toContain("pupil");
    expect(eyePathSrc).not.toContain("iris");
  });
});

describe("N41 — mood personality signatures (owner: more varied personality)", () => {
  it("composed accent gains vary by mood and stay inside the fences", () => {
    const playful = lifeAccentGains("playful");
    const tired = lifeAccentGains("tired");
    const curious = lifeAccentGains("curious");
    const content = lifeAccentGains("content");
    expect(playful.mouth).toBeCloseTo(1.6 * 1.15, 9);
    expect(playful.form).toBeCloseTo(1.4 * 1.1, 9);
    expect(tired.mouth).toBeCloseTo(1.6 * 0.75, 9);
    expect(tired.form).toBeCloseTo(1.4 * 0.8, 9);
    // the personality contrast: playful accents LOUDER than tired
    expect(playful.mouth).toBeGreaterThan(tired.mouth);
    expect(playful.form).toBeGreaterThan(tired.form);
    expect(playful.form).toBeGreaterThan(curious.form);
    expect(content.mouth).toBeLessThan(curious.mouth);
    // fences: the playful peak stays under the 2.0 form-variant pinch fence
    expect(playful.form).toBeLessThanOrEqual(2.0);
    expect(playful.mouth).toBeLessThanOrEqual(2.0);
    for (const g of [playful, tired, curious, content]) {
      expect(g.mouth).toBeGreaterThan(0);
      expect(g.form).toBeGreaterThan(0);
    }
    // unknown mood fail-closes to the content signature
    expect(lifeAccentGains("unknown" as LifeMood).mouth).toBeCloseTo(
      1.6 * 0.9,
      9,
    );
  });
});
