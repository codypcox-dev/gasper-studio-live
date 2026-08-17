/**
 * GASPER-FINISH-01 / Task 4 — analytic vector material continuity test.
 *
 * Proves on the pure material field (GASPER-MAT-004), chained from the
 * production pressure -> material coupling (GASPER-VEC-401):
 *  1. The feature registry is frozen at the declared counts (24 cosmic
 *     flecks, 4 cosmic streaks, 3 subsurface bands, 3 hard highlights) with
 *     IDs identical to GASPER_MATERIAL_CONTINUITY_CONTRACT.json.
 *  2. Across a 360-frame morph every feature keeps its stable ID, stays
 *     finite, and keeps opacity inside the contract responseBounds.
 *  3. No snap: per-frame position/opacity deltas stay below the declared
 *     transition derivative bounds (measured maxima in
 *     research/proofs/gasper-finish-01/material-frame-trace.json are >4x
 *     inside these bounds).
 *  4. Deterministic replay: same seed and inputs reproduce the identical
 *     frame series; feature identity does not depend on mesh size.
 *  5. The packaged realm bridge (assets/vector-material.js) stays DOM-free:
 *     it publishes math and stable identity while FormMaster remains the
 *     only visible writer (writer ownership proven in the VEC-701 suite).
 *
 * Environment note: node env (no jsdom). Live DOM evidence is the WebBridge
 * visual loop (Task 7); the trace deposit records that as open.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runInNewContext } from "node:vm";
import {
  createVectorMaterialState,
  evaluateVectorMaterialFrame,
  VECTOR_MATERIAL_FEATURES,
  type VectorMaterialFrame,
  type VectorMaterialMeshPoint,
} from "./GasperVectorMaterial";
import { evaluatePressureMaterialCoupling } from "../projection/PressureMaterialCoupling";
import contract from "../contracts/GASPER_MATERIAL_CONTINUITY_CONTRACT.json";
import manifest from "../assets/vector-material-manifest.json";

const here = dirname(fileURLToPath(import.meta.url));

const FRAMES = 360;
const DT = 1 / 60;
const SEED = 37;

/** Declared transition derivative bounds (no-snap gate). */
const DECLARED_MAX_POSITION_DELTA_PER_FRAME = 0.5;
const DECLARED_MAX_OPACITY_DELTA_PER_FRAME = 0.08;

function buildMesh(t: number, sectors = 24, rings = 10): VectorMaterialMeshPoint[] {
  const points: VectorMaterialMeshPoint[] = [];
  for (let ring = 0; ring < rings; ring += 1) {
    const radial = ring / (rings - 1);
    for (let sector = 0; sector < sectors; sector += 1) {
      const theta = (sector / sectors) * Math.PI * 2;
      const baseR = 20 + radial * 46;
      const morph =
        1 +
        0.18 * t * Math.sin(theta * 2 + ring * 0.6) +
        0.08 * Math.sin(t * Math.PI * 2 + theta * 3);
      const r = baseR * morph;
      points.push({
        x: 120 + Math.cos(theta) * r,
        y: 112 + Math.sin(theta) * r * (0.82 + 0.1 * t),
        projectedDepth: Math.sin(theta + t * 2) * radial,
      });
    }
  }
  return points;
}

function runSequence(seed: number, frames = FRAMES): VectorMaterialFrame[] {
  const state = createVectorMaterialState(seed);
  const out: VectorMaterialFrame[] = [];
  for (let f = 0; f < frames; f += 1) {
    const t = f / (frames - 1);
    const time = f * DT;
    const energyLevel = 0.5 + 0.4 * Math.sin(time * 0.7);
    const coupling = evaluatePressureMaterialCoupling({
      revision: f,
      energy: { energy_level: energyLevel, energy_pulse: 0.2 + 0.2 * Math.sin(time * 1.3), internal_glow: 0.4 },
      dynamics: { motion: 0.5 + 0.3 * Math.cos(time * 0.5), coupling: 0.4, rebound: 0.2, inertia: 0.3 },
      relief: { relief_amplitude: 0.4, relief: 0.3, texture_scale: 0.5 },
      material: { key_intensity: 0.58, rim: 0.62, normal_strength: 0.58, curvature_response: 0.48, texture: 0.56 },
      time,
      delta: DT,
    });
    out.push(
      evaluateVectorMaterialFrame(state, buildMesh(t), {
        dt: DT,
        time,
        energy: energyLevel,
        motion: 0.5 + 0.3 * Math.cos(time * 0.5),
        yaw: 12 * Math.sin(time * 0.3),
        material: { pressureGain: coupling.materialCoupling, reliefGain: coupling.reliefGain },
      }),
    );
  }
  return out;
}

const BOUNDS = contract.calibration.responseBounds;

describe("GASPER-MAT-004 registry freeze", () => {
  it("freezes the declared feature counts and contract-identical IDs", () => {
    expect(VECTOR_MATERIAL_FEATURES.cosmicFlecks).toHaveLength(contract.features.cosmic_flecks.count);
    expect(VECTOR_MATERIAL_FEATURES.cosmicStreaks).toHaveLength(contract.features.cosmic_streaks.count);
    expect(VECTOR_MATERIAL_FEATURES.subsurfaceBands).toHaveLength(contract.features.subsurface_bands.count);
    expect(VECTOR_MATERIAL_FEATURES.hardHighlights).toHaveLength(contract.features.hard_highlights.count);
    expect(VECTOR_MATERIAL_FEATURES.cosmicFlecks.map((a) => a.id)).toEqual(contract.features.cosmic_flecks.ids);
    expect(VECTOR_MATERIAL_FEATURES.cosmicStreaks.map((a) => a.id)).toEqual(contract.features.cosmic_streaks.ids);
    expect(VECTOR_MATERIAL_FEATURES.subsurfaceBands.map((a) => a.id)).toEqual(contract.features.subsurface_bands.ids);
    expect(VECTOR_MATERIAL_FEATURES.hardHighlights.map((a) => a.id)).toEqual(contract.features.hard_highlights.ids);
    expect(contract.features.cosmic_flecks.count).toBe(24);
    expect(contract.features.cosmic_streaks.count).toBe(4);
    expect(contract.features.subsurface_bands.count).toBe(3);
    expect(contract.features.hard_highlights.count).toBe(3);
  });

  it("freezes every anchor record against registry mutation", () => {
    for (const family of Object.values(VECTOR_MATERIAL_FEATURES)) {
      for (const anchor of family) {
        expect(Object.isFrozen(anchor)).toBe(true);
      }
    }
  });
});

describe("GASPER-MAT-004 360-frame morph continuity", () => {
  const frames = runSequence(SEED);

  it("keeps every feature ID stable and ordered across all frames", () => {
    const families = ["flecks", "streaks", "subsurfaceBands", "highlights"] as const;
    for (const family of families) {
      const ids = (frames[0]![family] as readonly { id: string }[]).map((f) => f.id);
      for (const frame of frames) {
        expect((frame[family] as readonly { id: string }[]).map((f) => f.id)).toEqual(ids);
      }
    }
  });

  it("keeps every family opacity inside the contract response bounds", () => {
    for (const frame of frames) {
      for (const fleck of frame.flecks) {
        expect(fleck.opacity).toBeGreaterThanOrEqual(BOUNDS.fleckOpacity[0]);
        expect(fleck.opacity).toBeLessThanOrEqual(BOUNDS.fleckOpacity[1]);
      }
      for (const streak of frame.streaks) {
        expect(streak.opacity).toBeGreaterThanOrEqual(BOUNDS.streakOpacity[0]);
        expect(streak.opacity).toBeLessThanOrEqual(BOUNDS.streakOpacity[1]);
      }
      for (const band of frame.subsurfaceBands) {
        expect(band.opacity).toBeGreaterThanOrEqual(BOUNDS.subsurfaceBandOpacity[0]);
        expect(band.opacity).toBeLessThanOrEqual(BOUNDS.subsurfaceBandOpacity[1]);
      }
      for (const highlight of frame.highlights) {
        expect(highlight.opacity).toBeGreaterThanOrEqual(BOUNDS.hardHighlightOpacity[0]);
        expect(highlight.opacity).toBeLessThanOrEqual(BOUNDS.hardHighlightOpacity[1]);
      }
    }
  });

  it("never snaps: per-frame deltas stay below the declared derivative bounds", () => {
    const positionOf = (frame: VectorMaterialFrame, family: string, i: number): [number, number] => {
      if (family === "flecks") return [frame.flecks[i]!.x, frame.flecks[i]!.y];
      if (family === "subsurfaceBands") return [frame.subsurfaceBands[i]!.cx, frame.subsurfaceBands[i]!.cy];
      if (family === "highlights") return [frame.highlights[i]!.x, frame.highlights[i]!.y];
      return [frame.streaks[i]!.depth, frame.streaks[i]!.opacity];
    };
    for (const family of ["flecks", "streaks", "subsurfaceBands", "highlights"] as const) {
      for (let f = 1; f < frames.length; f += 1) {
        const count = (frames[f]![family] as readonly unknown[]).length;
        for (let i = 0; i < count; i += 1) {
          const [px, py] = positionOf(frames[f - 1]!, family, i);
          const [cx, cy] = positionOf(frames[f]!, family, i);
          expect(Math.hypot(cx - px, cy - py)).toBeLessThanOrEqual(DECLARED_MAX_POSITION_DELTA_PER_FRAME);
          const prev = (frames[f - 1]![family] as readonly { opacity: number }[])[i]!.opacity;
          const curr = (frames[f]![family] as readonly { opacity: number }[])[i]!.opacity;
          expect(Math.abs(curr - prev)).toBeLessThanOrEqual(DECLARED_MAX_OPACITY_DELTA_PER_FRAME);
        }
      }
    }
  });

  it("keeps all emitted values finite across the whole morph", () => {
    for (const frame of frames) {
      for (const fleck of frame.flecks) {
        expect([fleck.x, fleck.y, fleck.rx, fleck.ry, fleck.opacity, fleck.rotation, fleck.depth].every(Number.isFinite)).toBe(true);
      }
      for (const streak of frame.streaks) {
        expect([streak.opacity, streak.strokeWidth, streak.depth].every(Number.isFinite)).toBe(true);
        expect(streak.d.startsWith("M ")).toBe(true);
      }
      for (const band of frame.subsurfaceBands) {
        expect([band.cx, band.cy, band.rx, band.ry, band.opacity, band.depth].every(Number.isFinite)).toBe(true);
      }
      for (const highlight of frame.highlights) {
        expect([highlight.x, highlight.y, highlight.opacity, highlight.depth].every(Number.isFinite)).toBe(true);
      }
    }
  });

  it("replays deterministically for the same seed and inputs", () => {
    const replay = runSequence(SEED);
    expect(JSON.stringify(replay)).toBe(JSON.stringify(frames));
  });

  it("binds identity to anchor IDs, not mesh size or sample indexes", () => {
    const small = createVectorMaterialState(SEED);
    const large = createVectorMaterialState(SEED);
    const a = evaluateVectorMaterialFrame(small, buildMesh(0.5, 24, 4), { dt: DT, time: 0.5, energy: 0.6 });
    const b = evaluateVectorMaterialFrame(large, buildMesh(0.5, 24, 16), { dt: DT, time: 0.5, energy: 0.6 });
    expect(a.flecks.map((f) => f.id)).toEqual(b.flecks.map((f) => f.id));
    expect(a.streaks.map((f) => f.id)).toEqual(b.streaks.map((f) => f.id));
    expect(a.subsurfaceBands.map((f) => f.id)).toEqual(b.subsurfaceBands.map((f) => f.id));
    expect(a.highlights.map((f) => f.id)).toEqual(b.highlights.map((f) => f.id));
  });
});

describe("GASPER-MAT-004 packaged realm bridge", () => {
  it("stays DOM-free and publishes only math and stable identity", () => {
    const source = readFileSync(join(here, "..", "assets", "vector-material.js"), "utf8");
    expect(source).toContain("__GASPER_VECTOR_MATERIAL__");
    expect(source).toContain("GASPER-MAT-004");
    for (const forbidden of ["document.", "createElement", "setAttribute", "appendChild", "replaceChildren", "querySelector"]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it("publishes anchors identical to the typed manifest, with and without the manifest installed", () => {
    const source = readFileSync(join(here, "..", "assets", "vector-material.js"), "utf8");
    const run = (withManifest: boolean) => {
      const sandbox: Record<string, unknown> = { Math, Object, Array, Number, String, JSON, globalThis: {} };
      sandbox.globalThis = sandbox;
      if (withManifest) sandbox.__GASPER_MATERIAL_FEATURE_MANIFEST__ = manifest;
      runInNewContext(source, sandbox);
      return (sandbox.__GASPER_VECTOR_MATERIAL__ as { features: unknown }).features;
    };
    const expected = {
      cosmicFlecks: manifest.cosmicFlecks,
      cosmicStreaks: manifest.cosmicStreaks,
      subsurfaceBands: manifest.subsurfaceBands,
      hardHighlights: manifest.hardHighlights,
    };
    expect(JSON.parse(JSON.stringify(run(true)))).toEqual(JSON.parse(JSON.stringify(expected)));
    expect(JSON.parse(JSON.stringify(run(false)))).toEqual(JSON.parse(JSON.stringify(expected)));
  });
});

describe("GASPER-MAT-004 production reconciliation (one final write per feature)", () => {
  const bundle = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");

  it("commits the typed frame to the four families and returns before the legacy fallback", () => {
    const branch = bundle.indexOf("const vectorMaterial=globalThis.__GASPER_VECTOR_MATERIAL__;");
    const earlyReturn = bundle.indexOf("avatar.dataset.vectorMaterialRevision=String(vectorFrame.revision);");
    const legacyFlecks = bundle.indexOf("never replaceChildren");
    expect(branch).toBeGreaterThan(-1);
    expect(earlyReturn).toBeGreaterThan(branch);
    expect(legacyFlecks).toBeGreaterThan(earlyReturn);
    expect(bundle.slice(earlyReturn, legacyFlecks)).toContain("return;");
  });

  it("makes the material commit the single final writer for glint highlights", () => {
    expect(bundle).toContain("depthLightGlintGain");
    expect(bundle).toContain("committedHighlights");
    // The D-0060 fold defers the two glint nodes to the material commit when
    // the persistent (typed-field) path is active.
    expect(bundle).toContain("avatar.dataset.materialSpace==='persistent'&&(_d[0]==='leftLobeGlint'||_d[0]==='rightLobeGlint')");
    // The composed final write stays bounded.
    expect(bundle).toContain("Math.max(.05,Math.min(1,Number(feature.opacity)*gain))");
  });
});


describe("GASPER-MAT-006 analytic 6.5 depth hierarchy", () => {
  const svg = readFileSync(join(here, "..", "assets", "gasper-rig-v655.svg"), "utf8");
  const bundle = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");

  it("restores the approved dark-pearl depth target without image-space compositing", () => {
    expect(svg).toContain('data-material-depth-target="m4c-analytic-6.5-no-legacy-caustics"');
    expect(svg).toContain('id="bodyBase"');
    expect(svg).toContain('id="bodyBase" gradientUnits="userSpaceOnUse" cx="120" cy="118" r="101"');
    expect(svg).toContain('stop-color="#2a1068"');
    expect(svg).toContain('id="opticalDepthGrad"');
    expect(svg).toContain('stop-color="#01000a" stop-opacity=".88"');
    expect(svg).toContain('id="pearlCoreGrad"');
    expect(svg).toContain('stop-color="#5878f4" stop-opacity=".42"');
    expect(svg).toContain('id="shellChromaticGrad"');
    expect(svg).toContain('stop-color="#9d5cff" stop-opacity=".34"');
    expect(svg).toContain('id="lobeShadeGrad"');
    expect(svg).toContain('stop-color="#010009" stop-opacity=".92"');
    expect(svg).toContain('stop-color="#7fb4ff"');
    expect(svg).not.toContain('filter=');
    expect(svg).not.toContain('mix-blend-mode');
    for (const legacy of ['violetCaustic','violetCaustic2','cyanCaustic','blueCaustic2','pearlCaustic']) {
      expect(svg).not.toContain(legacy);
      expect(bundle).not.toContain(legacy);
    }
    for (const canonical of ['cosmic-streak-01','cosmic-streak-02','cosmic-streak-03','cosmic-streak-04']) {
      expect(svg).toContain(canonical);
      expect(bundle).toContain(canonical);
    }

  });

  it("keeps the VEC-302 optical-depth cap while deepening the analytic field", () => {
    expect(bundle).toContain('opticalDepthOpacityCap: 0.14');
    expect(bundle).toContain("opticalDepth?.style.setProperty('opacity', String(MATERIAL_CALIBRATION.response.opticalDepthOpacityCap), 'important')");
  });
});
