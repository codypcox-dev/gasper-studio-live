/**
 * GASPER-FINISH-01 Task 5 — three-beat grammar, embodiment/state matrix,
 * moving holds, interruption, wake, microvariation, and deterministic replay.
 *
 * Pure numeric proofs over the beat contract. The runtime production
 * authorities (clock/compositor/living/projection) are not duplicated here.
 */

import { describe, expect, it } from "vitest";
import {
  BEAT_EASINGS,
  beatSequenceFor,
  beatTraceHash,
  embodimentBeatSequenceFor,
  evaluateBeatSequence,
  evaluateBeatTrace,
  isSupportedEmbodiment,
  THREE_BEAT_SEQUENCES,
  validateBeatSequence,
  type BeatSequence,
} from "./beat-sequence";
import {
  evaluateMovingHold,
  movingHoldBounds,
} from "./moving-hold";
import {
  evaluateMicrovariation,
  MICROVARIATION_AMPLITUDE,
  MICROVARIATION_KEYS,
  MICROVARIATION_REDUCED_AMPLITUDE,
} from "./microvariation";
import { evaluateWakeEventTrace } from "./wake";
import {
  estimateVelocity,
  resolveInterruptionRetarget,
  type InterruptionDisposition,
} from "./interruption";
import { DEFAULT_LOOP_MANIFEST, EIGHT_STATE_LOOP_ROUTE } from "./loop-manifest";
import { EIGHT_STATE_TARGETS } from "./state-targets";
import { GASPER_EMBODIMENT_IDS } from "../GasperRigDefinition";
import type { EightStateId } from "./types";

const ALL_STATES = Object.keys(THREE_BEAT_SEQUENCES) as EightStateId[];
const INTERRUPTION_PHASES = ["gather", "peak", "settle", "hold"] as const;

function routePairs(): Array<[EightStateId, EightStateId]> {
  const route = EIGHT_STATE_LOOP_ROUTE;
  const pairs: Array<[EightStateId, EightStateId]> = [];
  for (let i = 0; i < route.length - 1; i++) {
    pairs.push([route[i]!, route[i + 1]!]);
  }
  return pairs;
}

function directionsFor(
  stateId: EightStateId,
): Array<{ label: "forward" | "reverse"; from: EightStateId; to: EightStateId }> {
  const dirs: Array<{
    label: "forward" | "reverse";
    from: EightStateId;
    to: EightStateId;
  }> = [];
  for (const [from, to] of routePairs()) {
    if (to === stateId) dirs.push({ label: "forward", from, to });
    if (from === stateId) dirs.push({ label: "reverse", from: to, to: from });
  }
  return dirs;
}

function sampleTimes(seq: BeatSequence): number[] {
  const [g, p, s] = seq.phases.map((ph) => ph.durationMs);
  const hold = seq.holdMs;
  const times = [g * 0.5, g + p * 0.5, g + p + s * 0.5];
  if (hold > 0) times.push(g + p + s + hold * 0.5);
  return times;
}

function interruptionAtPhase(
  trace: ReturnType<typeof evaluateBeatTrace>,
  seq: BeatSequence,
  phaseId: (typeof INTERRUPTION_PHASES)[number],
): InterruptionDisposition | null {
  const idx =
    phaseId === "hold" ? 3 : phaseId === "gather" ? 0 : phaseId === "peak" ? 1 : 2;
  if (idx < 0 || idx >= trace.length) return null;
  const sample = trace[idx]!;
  const prev = trace[Math.max(0, idx - 1)]!;
  const dtSec = Math.max(
    1 / 60,
    (sample.elapsedMs - prev.elapsedMs) / 1000,
  );
  const velocity = estimateVelocity(
    { ...prev.resolved },
    { ...sample.resolved },
    dtSec,
  );
  const toward = EIGHT_STATE_TARGETS["presence-listening-receive"] ?? {};
  return resolveInterruptionRetarget({
    sequence: seq,
    current: { ...sample.resolved },
    velocity,
    toward: { ...toward },
  });
}

function caseFloorsOk(
  trace: ReturnType<typeof evaluateBeatTrace>,
  seq: BeatSequence,
): boolean {
  for (const s of trace) {
    const idx = s.phase === "gather" ? 0 : s.phase === "peak" ? 1 : 2;
    const ph = seq.phases[idx]!;
    const r = s.resolved;
    if (!Object.values(r).every((v) => Number.isFinite(v))) return false;
    if ((r.face_scale ?? 0) < ph.face.floorFaceScale - 1e-9) return false;
    if ((r.eye_openness ?? 0) < ph.face.floorEyeOpenness - 1e-9) return false;
    if ((r.face_emissive ?? 0) < ph.face.floorFaceEmissive - 1e-9) {
      return false;
    }
    if ((r.energy_level ?? 0) < ph.material.floorEnergyLevel - 1e-9) {
      return false;
    }
    if ((r.internal_glow ?? 0) < ph.material.floorInternalGlow - 1e-9) {
      return false;
    }
  }
  return true;
}

describe("GASPER-FINISH-01 Task 5 — three-beat contract", () => {
  it("every canonical state has a valid non-empty three-beat sequence", () => {
    for (const stateId of ALL_STATES) {
      const seq = beatSequenceFor(stateId);
      expect(validateBeatSequence(seq)).toEqual([]);
      expect(seq.phases.map((p) => p.id)).toEqual([
        "gather",
        "peak",
        "settle",
      ]);
      for (const ph of seq.phases) {
        expect(ph.durationMs).toBeGreaterThan(0);
        expect(Object.keys(ph.targets).length).toBeGreaterThan(0);
        expect((BEAT_EASINGS as readonly string[])).toContain(ph.easing);
      }
      // Peak must be a legible accent above the hold baseline.
      const g = seq.phases[0]!.durationMs;
      const p = seq.phases[1]!.durationMs;
      const s = seq.phases[2]!.durationMs;
      const hold = Math.max(1, seq.holdMs);
      const peakSample = evaluateBeatTrace(seq, {
        seed: 1007,
        sampleTimesMs: [g + p * 0.9],
      })[0]!;
      const holdSample = evaluateBeatTrace(seq, {
        seed: 1007,
        sampleTimesMs: [g + p + s + hold * 0.5],
      })[0]!;
      expect(peakSample.envelope).toBeGreaterThan(
        holdSample.envelope + 0.1,
      );
    }
  });

  it("every supported embodiment gets the same three-beat contract; unknown profiles get an explicit unsupported disposition", () => {
    for (const emb of GASPER_EMBODIMENT_IDS) {
      expect(isSupportedEmbodiment(emb)).toBe(true);
      for (const stateId of ALL_STATES) {
        const disposition = embodimentBeatSequenceFor(emb, stateId);
        expect("phases" in disposition).toBe(true);
        if ("phases" in disposition) {
          expect(validateBeatSequence(disposition)).toEqual([]);
        }
      }
    }
    const unknown = embodimentBeatSequenceFor(
      "unknown-embodiment",
      "presence-neutral-settled",
    );
    expect("supported" in unknown && unknown.supported).toBe(false);
    if ("reason" in unknown) {
      expect(unknown.reason).toContain("unsupported-embodiment");
    }
    expect(isSupportedEmbodiment("unknown-embodiment")).toBe(false);
  });

  it("moving holds: anchored rest pose error ~0 over 3000 frames, bounded and deterministic", () => {
    for (const stateId of ALL_STATES) {
      const seq = beatSequenceFor(stateId);
      const preHold =
        seq.phases[0]!.durationMs +
        seq.phases[1]!.durationMs +
        seq.phases[2]!.durationMs;
      const holdMs = Math.max(1, seq.holdMs);
      const stepsPerHold = Math.max(1, Math.round(holdMs / (1000 / 60)));
      let maxBoundaryError = 0;
      let maxDrift = 0;
      for (let i = 0; i < 3000; i++) {
        const t = preHold + (i % stepsPerHold) * (1000 / 60);
        const sample = evaluateMovingHold(seq, t, {
          seed: 1007,
          reducedMotion: false,
        });
        maxDrift = Math.max(maxDrift, Math.abs(sample.drift));
        if (i % stepsPerHold === 0) {
          expect(sample.restPoseError).toBeLessThan(1e-9);
          maxBoundaryError = Math.max(maxBoundaryError, sample.restPoseError);
        }
      }
      expect(maxBoundaryError).toBeLessThan(1e-9);
      expect(maxDrift).toBeLessThanOrEqual(0.25);
      const mid = evaluateMovingHold(seq, preHold + holdMs / 2, {
        seed: 1007,
        reducedMotion: false,
      });
      expect(movingHoldBounds(mid).bounded).toBe(true);
      const a = evaluateMovingHold(seq, preHold + 1234, {
        seed: 1007,
        reducedMotion: false,
      });
      const b = evaluateMovingHold(seq, preHold + 1234, {
        seed: 1007,
        reducedMotion: false,
      });
      expect(a).toEqual(b);
    }
  });

  it("rest punctuation: post-accent rest exceeds pre-accent gather and is recorded in the scene manifest", () => {
    for (const stateId of ALL_STATES) {
      const seq = beatSequenceFor(stateId);
      if (seq.restPolicy.enforcePunctuation) {
        expect(seq.restPolicy.postAccentRestMs).toBeGreaterThan(
          seq.restPolicy.preAccentGatherMs,
        );
      }
    }
    for (const step of DEFAULT_LOOP_MANIFEST.steps) {
      const seq = THREE_BEAT_SEQUENCES[step.to]!;
      expect(step.restPolicy).toEqual(seq.restPolicy);
      if (step.restPolicy?.enforcePunctuation) {
        expect(step.restPolicy.postAccentRestMs).toBeGreaterThan(
          step.restPolicy.preAccentGatherMs,
        );
      }
    }
    expect(
      THREE_BEAT_SEQUENCES.wake.restPolicy.enforcePunctuation,
    ).toBe(false);
  });

  it("interruption retargets from current pose + velocity in every beat phase", () => {
    for (const stateId of ALL_STATES) {
      const seq = beatSequenceFor(stateId);
      const times = sampleTimes(seq);
      const trace = evaluateBeatTrace(seq, {
        seed: 1007,
        sampleTimesMs: times,
        microvariation: true,
      });
      for (const phaseId of INTERRUPTION_PHASES) {
        const disposition = interruptionAtPhase(trace, seq, phaseId);
        if (!disposition) continue; // wake has no hold phase
        expect(
          disposition.faceContinuity,
          `${stateId} ${phaseId} face`,
        ).toBe(true);
        expect(
          disposition.silhouetteContinuity,
          `${stateId} ${phaseId} silhouette`,
        ).toBe(true);
        expect(
          disposition.energyContinuity,
          `${stateId} ${phaseId} energy`,
        ).toBe(true);
        expect(disposition.snapped, `${stateId} ${phaseId} snap`).toBe(false);
        expect(disposition.policy).toBe("velocity-retarget");
        expect(
          Number.isFinite(disposition.immediateDeltaMax),
        ).toBe(true);
      }
    }
  });

  it("wake is three ordered events, never an instant swap", () => {
    const seq = beatSequenceFor("wake");
    const trace = evaluateWakeEventTrace(seq);
    const events = trace.map((s) => s.eventIndex);
    expect(events[0]).toBe(0);
    expect(events.includes(1)).toBe(true);
    expect(events.includes(2)).toBe(true);
    for (let i = 1; i < events.length; i++) {
      expect(events[i]!).toBeGreaterThanOrEqual(events[i - 1]!);
    }
    const beatTrace = evaluateBeatTrace(seq, {
      seed: 1007,
      dtMs: 1000 / 60,
    });
    const order = [...new Set(beatTrace.map((s) => s.phase))];
    expect(order[0]).toBe("gather");
    expect(order[order.length - 1]).toBe("settle");
    expect(order).toContain("peak");
  });

  it("microvariation: bounded, deterministic, reduced-motion collapsed, never reorders beats", () => {
    const seq = beatSequenceFor("presence-recognition-spark");
    const base = evaluateBeatTrace(seq, {
      seed: 7,
      dtMs: 1000 / 60,
      microvariation: false,
    });
    const micro = evaluateBeatTrace(seq, {
      seed: 7,
      dtMs: 1000 / 60,
      microvariation: true,
    });
    expect(micro.map((s) => s.phase)).toEqual(base.map((s) => s.phase));
    const reduced = evaluateBeatTrace(seq, {
      seed: 7,
      dtMs: 1000 / 60,
      microvariation: true,
      reducedMotion: true,
    });
    expect(reduced.map((s) => s.phase)).toEqual(base.map((s) => s.phase));
    // Layer isolation: sample at the same clock times with no carry-forward so
    // the only difference is the microvariation delta itself.
    const times = [250, 700, 1400, 2600];
    let maxDelta = 0;
    let maxReduced = 0;
    for (const t of times) {
      const withMicro = evaluateBeatSequence(seq, t, {
        seed: 7,
        microvariation: true,
      });
      const without = evaluateBeatSequence(seq, t, {
        seed: 7,
        microvariation: false,
      });
      const withReduced = evaluateBeatSequence(seq, t, {
        seed: 7,
        microvariation: true,
        reducedMotion: true,
      });
      for (const k of MICROVARIATION_KEYS) {
        maxDelta = Math.max(
          maxDelta,
          Math.abs((withMicro.resolved[k] ?? 0) - (without.resolved[k] ?? 0)),
        );
        maxReduced = Math.max(
          maxReduced,
          Math.abs((withReduced.resolved[k] ?? 0) - (without.resolved[k] ?? 0)),
        );
      }
    }
    expect(maxDelta).toBeLessThanOrEqual(MICROVARIATION_AMPLITUDE + 1e-9);
    expect(maxReduced).toBeLessThanOrEqual(
      MICROVARIATION_REDUCED_AMPLITUDE + 1e-9,
    );
    const direct = evaluateMicrovariation({ seed: 9, timeMs: 1234 });
    const directAgain = evaluateMicrovariation({ seed: 9, timeMs: 1234 });
    expect(direct).toEqual(directAgain);
    for (const v of Object.values(direct)) {
      expect(Math.abs(v)).toBeLessThanOrEqual(MICROVARIATION_AMPLITUDE + 1e-9);
    }
  });

  it("validator rejects empty phases, non-finite targets, unknown eases, and broken punctuation", () => {
    const good = beatSequenceFor("presence-neutral-settled");
    expect(validateBeatSequence(good)).toEqual([]);

    const badEmpty = { ...good, phases: [] } as unknown as BeatSequence;
    expect(validateBeatSequence(badEmpty).length).toBeGreaterThan(0);

    const badNaN = {
      ...good,
      phases: good.phases.map((ph, i) =>
        i === 1
          ? { ...ph, targets: { ...ph.targets, energy_level: Number.NaN } }
          : ph,
      ),
    } as unknown as BeatSequence;
    expect(validateBeatSequence(badNaN).length).toBeGreaterThan(0);

    const badEase = {
      ...good,
      phases: good.phases.map((ph, i) =>
        i === 0 ? { ...ph, easing: "bounce.out" } : ph,
      ),
    } as unknown as BeatSequence;
    expect(validateBeatSequence(badEase).length).toBeGreaterThan(0);

    const badRest = {
      ...good,
      restPolicy: {
        ...good.restPolicy,
        enforcePunctuation: true,
        preAccentGatherMs: 500,
        postAccentRestMs: 10,
      },
    };
    expect(validateBeatSequence(badRest).length).toBeGreaterThan(0);
  });

  it("matrix: state × embodiment × direction × interruption × reduced-motion — finite outputs, floors, complete traces, explicit dispositions", () => {
    const seed = 1007;
    const failures: string[] = [];
    let variantCount = 0;
    let interruptionCaseCount = 0;
    const hashes = new Set<string>();
    for (const stateId of ALL_STATES) {
      const dirs = directionsFor(stateId);
      expect(dirs.length, `${stateId} directions`).toBeGreaterThan(0);
      for (const emb of GASPER_EMBODIMENT_IDS) {
        const disposition = embodimentBeatSequenceFor(emb, stateId);
        expect("phases" in disposition, `${emb}:${stateId}`).toBe(true);
        if (!("phases" in disposition)) continue;
        const seq = disposition as BeatSequence;
        for (const dir of dirs) {
          for (const reduced of [false, true] as const) {
            const times = sampleTimes(seq);
            const trace = evaluateBeatTrace(seq, {
              seed,
              sampleTimesMs: times,
              reducedMotion: reduced,
              microvariation: true,
            });
            const expected = [
              "gather",
              "peak",
              "settle",
              ...(seq.holdMs > 0 ? (["hold"] as const) : []),
            ];
            const order = trace.map((s) => s.phase);
            if (JSON.stringify(order) !== JSON.stringify(expected)) {
              failures.push(
                `${emb}:${stateId}:${dir.label}:${reduced} order ${order.join(">")}`,
              );
            }
            if (!caseFloorsOk(trace, seq)) {
              failures.push(
                `${emb}:${stateId}:${dir.label}:${reduced} floors`,
              );
            }
            for (const phaseId of INTERRUPTION_PHASES) {
              interruptionCaseCount++;
              const dispositionI = interruptionAtPhase(trace, seq, phaseId);
              if (!dispositionI) continue;
              if (
                !dispositionI.faceContinuity ||
                !dispositionI.silhouetteContinuity ||
                !dispositionI.energyContinuity ||
                dispositionI.snapped
              ) {
                failures.push(
                  `${emb}:${stateId}:${dir.label}:${reduced}:${phaseId} interruption`,
                );
              }
            }
            variantCount++;
            hashes.add(beatTraceHash(trace));
          }
        }
      }
    }
    expect(failures).toEqual([]);
    expect(variantCount).toBeGreaterThanOrEqual(288);
    expect(interruptionCaseCount).toBeGreaterThanOrEqual(1000);
    expect(hashes.size).toBeGreaterThanOrEqual(144);
  });

  it("deterministic replay: same seed → byte-identical traces, different seed → different hash", () => {
    for (const emb of GASPER_EMBODIMENT_IDS.slice(0, 4)) {
      const seq = embodimentBeatSequenceFor(
        emb,
        "presence-thinking-knit",
      ) as BeatSequence;
      const a = evaluateBeatTrace(seq, {
        seed: 4242,
        dtMs: 1000 / 60,
        microvariation: true,
      });
      const b = evaluateBeatTrace(seq, {
        seed: 4242,
        dtMs: 1000 / 60,
        microvariation: true,
      });
      expect(beatTraceHash(a)).toBe(beatTraceHash(b));
      expect(JSON.stringify(a.map((s) => s.resolved))).toBe(
        JSON.stringify(b.map((s) => s.resolved)),
      );
      const c = evaluateBeatTrace(seq, {
        seed: 4243,
        dtMs: 1000 / 60,
        microvariation: true,
      });
      expect(beatTraceHash(c)).not.toBe(beatTraceHash(a));
    }
  });
});
