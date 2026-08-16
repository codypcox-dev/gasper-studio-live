/**
 * GASPER-FINISH-01 / Task 3 (VEC-501) — canonical compositor focused test.
 *
 * Proves locally (structural suite referenced by the lock is absent here):
 *  1. Canonical order is exactly document_base → embodiment → expression →
 *     clip → runtime → living → manual_preview → constraints → character_state.
 *  2. One final owner per binding; higher-rank ownership wins; contribution
 *     trace records every layer's input/output.
 *  3. Constraints execute before character_state final authority.
 *  4. Deterministic hash: identical inputs produce identical values, traces,
 *     and hash.
 *  5. Scrub suppresses living layers marked suppressOnScrub.
 *  6. The compatibility adapter GasperLayerMixer delegates to
 *     composeResolvedPose and implements no independent final-value loop
 *     (source-wiring proof).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  CANONICAL_POSE_ORDER,
  clearHeldPose,
  composeResolvedPose,
} from "./ResolvedPoseCompositor";
import type { CompositorInput, PoseLayer } from "./types";

const GASPER_ROOT = fileURLToPath(new URL("..", import.meta.url));

function layer(
  id: string,
  ownership: PoseLayer["ownership"],
  bindingId: string,
  value: number,
  extra?: Partial<PoseLayer>,
): PoseLayer {
  return {
    id,
    ownership,
    blendMode: "weighted_override",
    weight: 1,
    persistence: "session",
    interruption: "hold_resolved",
    contributions: [{ bindingId, value }],
    ...extra,
  };
}

function baseInput(): CompositorInput {
  return {
    layers: [
      layer("doc", "document_base", "face_scale", 0.8),
      layer("emb", "embodiment", "face_scale", 0.9),
      layer("expr", "expression", "face_scale", 1.0),
      layer("liv", "living", "face_scale", 1.1),
      layer("prev", "manual_preview", "face_scale", 1.2),
      layer("char", "character_state", "face_scale", 1.3),
    ],
    constraints: [
      { id: "cap", bindingId: "face_scale", min: 0, max: 1.05, mode: "clamp" },
    ],
    bindingTargets: { face_scale: ["#facePlane"] },
  };
}

describe("ResolvedPoseCompositor (VEC-501)", () => {
  it("declares the exact canonical layer order", () => {
    expect([...CANONICAL_POSE_ORDER]).toEqual([
      "document_base",
      "embodiment",
      "expression",
      "clip",
      "runtime",
      "living",
      "manual_preview",
      "character_state",
    ]);
  });

  it("resolves one final owner per binding with full contribution trace", () => {
    clearHeldPose();
    const pose = composeResolvedPose(baseInput());

    // Constraints clamp (1.05) execute before character_state (1.3) final authority.
    expect(pose.values.face_scale).toBe(1.3);

    const trace = pose.traces.find((t) => t.bindingId === "face_scale");
    expect(trace).toBeDefined();
    expect(trace!.finalOwner).toBe("character_state");
    expect(trace!.base).toBe(0.8);
    expect(trace!.embodiment).toBe(0.9);
    expect(trace!.expression).toBe(1.0);
    expect(trace!.living).toBe(1.1);
    expect(trace!.manualPreview).toBe(1.2);
    expect(trace!.characterState).toBe(1.3);
    expect(trace!.finalValue).toBe(1.3);
    expect(trace!.svgTargets).toEqual(["#facePlane"]);

    // Every contribution is traced with before/after.
    expect(trace!.contributions.length).toBe(6);
    for (const c of trace!.contributions) {
      expect(Number.isFinite(c.after)).toBe(true);
    }
    // Constraint trace records the clamp.
    expect(trace!.constraints.some((c) => c.id === "cap" && c.changed)).toBe(true);
  });

  it("produces identical values, traces, and hash for identical inputs", () => {
    clearHeldPose();
    const a = composeResolvedPose(baseInput());
    clearHeldPose();
    const b = composeResolvedPose(baseInput());

    expect(a.hash).toBe(b.hash);
    expect(a.values).toEqual(b.values);
    expect(JSON.stringify(a.traces)).toBe(JSON.stringify(b.traces));

    // Different inputs produce a different deterministic hash.
    clearHeldPose();
    const modified = baseInput();
    modified.layers.push(layer("char2", "character_state", "face_scale", 1.4));
    const c = composeResolvedPose(modified);
    expect(c.hash).not.toBe(a.hash);
  });

  it("suppresses living layers marked suppressOnScrub during scrub mode", () => {
    clearHeldPose();
    const input: CompositorInput = {
      layers: [
        layer("doc", "document_base", "eye_openness", 0.5),
        layer("liv", "living", "eye_openness", 0.9, { suppressOnScrub: true }),
      ],
    };
    const normal = composeResolvedPose(input);
    expect(normal.values.eye_openness).toBe(0.9);

    clearHeldPose();
    const scrubbed = composeResolvedPose({ ...input, scrubMode: true });
    expect(scrubbed.values.eye_openness).toBe(0.5);
    const trace = scrubbed.traces.find((t) => t.bindingId === "eye_openness");
    expect(trace!.finalOwner).toBe("document_base");
  });

  it("compatibility adapter delegates to composeResolvedPose (source proof)", () => {
    const mixer = readFileSync(`${GASPER_ROOT}/GasperLayerMixer.ts`, "utf8");

    // Every public resolution path delegates to the canonical compositor.
    const delegations = mixer.match(/composeResolvedPose\(/g) ?? [];
    expect(delegations.length).toBeGreaterThanOrEqual(4);

    // No independent blending algorithm in the adapter.
    expect(mixer).not.toMatch(/applyBlend\s*\(/);
    expect(mixer).not.toMatch(/function blend|const blend\s*=/);
  });
});
