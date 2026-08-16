/**
 * D-0088 — scene-scoped silhouette admission proofs (owner-approved fence
 * change, 2026-08-03). The FormMaster fence keeps overall_width /
 * overall_height / ground_flattening closed for every living source EXCEPT
 * the provenance-tagged scene-suite admission.
 */
import { describe, expect, it } from "vitest";
import {
  admitSceneSilhouetteValues,
  filterLegacyEndpointValues,
} from "./legacyFormMasterPolicy";
import { filterLivingFlushValues } from "./livingIntent";

const SILHOUETTE = { overall_height: 0.93, overall_width: 1.05, ground_flattening: 0.34 };

describe("D-0088 scene-scoped silhouette admission", () => {
  it("the fence stays closed without scene provenance", () => {
    const flushed = {
      overall_width: 1.05,
      overall_height: 0.93,
      ground_flattening: 0.34,
      internal_glow: 0.2,
    };
    const legacyLoop = filterLivingFlushValues(flushed, {
      legacy: true,
      eightStateLoop: true,
      reducedMotion: false,
    });
    expect(legacyLoop.overall_width).toBeUndefined();
    expect(legacyLoop.overall_height).toBeUndefined();
    expect(legacyLoop.ground_flattening).toBeUndefined();
    expect(legacyLoop.internal_glow).toBe(0.2);
    const native = filterLivingFlushValues(flushed, {
      legacy: false,
      eightStateLoop: true,
      reducedMotion: false,
    });
    expect(native.overall_width).toBeUndefined();
    expect(native.overall_height).toBeUndefined();
  });

  it("scene provenance admits exactly the tagged silhouette values", () => {
    const flushed = {
      overall_width: 9.9, // hostile values: admission must not pass these —
      overall_height: 9.9, // only the provenance-tagged record reaches pixels
      ground_flattening: 9.9,
      internal_glow: 0.2,
    };
    const out = filterLivingFlushValues(flushed, {
      legacy: true,
      eightStateLoop: true,
      reducedMotion: false,
      sceneSilhouette: SILHOUETTE,
    });
    expect(out.overall_height).toBe(SILHOUETTE.overall_height);
    expect(out.overall_width).toBe(SILHOUETTE.overall_width);
    expect(out.ground_flattening).toBe(SILHOUETTE.ground_flattening);
    expect(out.internal_glow).toBe(0.2);
  });

  it("admission is channel-scoped and ignores non-silhouette keys", () => {
    const filtered = filterLegacyEndpointValues({ internal_glow: 0.1 });
    const out = admitSceneSilhouetteValues(filtered, {
      ...SILHOUETTE,
      mouth_openness: 0.9, // FormMaster fixture-owned plane: never admitted
      eye_openness: 0.9,
    });
    expect(out.overall_height).toBe(SILHOUETTE.overall_height);
    expect(out.mouth_openness).toBeUndefined();
    expect(out.eye_openness).toBeUndefined();
  });

  it("empty/undefined provenance leaves the filtered packet untouched", () => {
    const filtered = filterLegacyEndpointValues({ internal_glow: 0.1 });
    expect(admitSceneSilhouetteValues(filtered, undefined)).toBe(filtered);
    expect(admitSceneSilhouetteValues(filtered, {})).toEqual(filtered);
  });

  it("reduced motion keeps the fence closed (scene deltas collapse to zero)", () => {
    // Under reduced motion evaluateSceneSuite emits zero deltas, so the loop
    // produces an empty admission; the fence then drops silhouette keys.
    const out = filterLivingFlushValues(
      { overall_height: 0.93, internal_glow: 0.1 },
      { legacy: true, eightStateLoop: true, reducedMotion: true, sceneSilhouette: {} },
    );
    expect(out.overall_height).toBeUndefined();
    expect(out.internal_glow).toBe(0.1);
  });
});
