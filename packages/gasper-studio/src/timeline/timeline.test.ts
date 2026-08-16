/**
 * Gasper Studio — Timeline visualizer test.
 */

import { describe, expect, it } from "vitest";
import { THREE_BEAT_SEQUENCES } from "../../../desktop/src/gasper/eight-state-loop/beat-sequence";

describe("Gasper Studio — Keyframe & Curve Timeline Visualizer", () => {
  it("verifies 3-beat sequence phase definitions exist for all 8 states", () => {
    const states = Object.keys(THREE_BEAT_SEQUENCES);
    expect(states.length).toBeGreaterThanOrEqual(8);

    for (const stateId of states) {
      const seq = THREE_BEAT_SEQUENCES[stateId as keyof typeof THREE_BEAT_SEQUENCES]!;
      expect(seq.phases.length).toBe(3);
      expect(seq.phases[0]!.id).toBe("gather");
      expect(seq.phases[1]!.id).toBe("peak");
      expect(seq.phases[2]!.id).toBe("settle");
      expect(seq.phases[0]!.durationMs).toBeGreaterThan(0);
      expect(seq.phases[1]!.durationMs).toBeGreaterThan(0);
      expect(seq.phases[2]!.durationMs).toBeGreaterThan(0);
    }
  });
});
