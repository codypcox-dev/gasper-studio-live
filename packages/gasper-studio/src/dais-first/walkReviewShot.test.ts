import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyWalkReviewShot,
  releaseWalkReviewShot,
} from "./daisFirstControls";
import {
  isWalkReviewFrame,
  operateRestModePolicy,
  WALK_REVIEW_FRAME,
  walkReviewHoldsPlant,
  walkReviewModePolicy,
} from "./walkReviewShot";

const railSource = readFileSync(new URL("./DaisControlRail.tsx", import.meta.url), "utf8");

describe("walk-review shot law", () => {
  it("is the isolated-proof cinematic hold, not a Fit", () => {
    expect(WALK_REVIEW_FRAME).toEqual({ zoom: 2, panX: 0, panY: -40 });
    expect(
      isWalkReviewFrame({
        ...WALK_REVIEW_FRAME,
        autoFit: false,
        userWorldFrameHeld: true,
      }),
    ).toBe(true);
    expect(
      isWalkReviewFrame({
        zoom: 4,
        panX: 0,
        panY: -40,
        autoFit: false,
        userWorldFrameHeld: true,
      }),
    ).toBe(false);
  });

  it("opens the wander gate without the eight-state loop", () => {
    expect(walkReviewModePolicy()).toEqual({
      autoSequence: true,
      restrainedIdle: false,
      freezeSequence: true,
    });
    expect(operateRestModePolicy().autoSequence).toBe(false);
  });

  it("scores plant margin on a review-sized dais", () => {
    const stage = { top: 76, bottom: 834, height: 758 };
    expect(walkReviewHoldsPlant(stage, { bottom: 591 }, { bottom: 631 })).toBe(
      true,
    );
    expect(walkReviewHoldsPlant(stage, { bottom: 820 }, { bottom: 830 })).toBe(
      false,
    );
    expect(
      walkReviewHoldsPlant({ top: 0, bottom: 400, height: 400 }, { bottom: 200 }),
    ).toBe(false);
  });

  it("applies the hold and wander without writing locomotion", () => {
    const calls: string[] = [];
    const surface = {
      ensurePhysicsDriver() {
        calls.push("phys");
      },
      setWanderEnabled(v: boolean) {
        calls.push(v ? "wander-on" : "wander-off");
      },
      living: {
        applyModePolicy(policy: { autoSequence: boolean; freezeSequence: boolean }) {
          calls.push(`policy:${policy.autoSequence}:${policy.freezeSequence}`);
        },
      },
      getViewport() {
        return {
          releaseUserWorldFrame() {
            calls.push("release");
          },
          holdUserWorldFrame(frame?: { zoom?: number; panY?: number }) {
            calls.push(`hold:${frame?.zoom}:${frame?.panY}`);
          },
        };
      },
    };
    const on = applyWalkReviewShot(surface);
    expect(on).toEqual({ ok: true, shot: "walk-review", wander: true });
    expect(calls).toEqual([
      "phys",
      "policy:true:true",
      "release",
      "hold:2:-40",
      "wander-on",
    ]);
    expect(railSource).not.toMatch(/setLocomotion\(/);
    const off = releaseWalkReviewShot(surface);
    expect(off).toEqual({ ok: true, shot: "operate", wander: false });
    expect(calls).toContain("wander-off");
    expect(calls).toContain("policy:false:true");
  });

  it("exposes Walk / Stand on the World rail", () => {
    expect(railSource).toContain('data-testid="dais-rail-walk-review"');
    expect(railSource).toContain('data-testid="dais-rail-walk-stand"');
    expect(railSource).toContain("applyWalkReviewShot");
  });
});
