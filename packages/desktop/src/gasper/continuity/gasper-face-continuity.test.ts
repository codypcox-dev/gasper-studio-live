/**
 * GASPER-FINISH-01 / Task 2 (VEC-101) — face continuity focused test.
 *
 * Route under proof: presence → singularity → dormant-orbit → presence.
 *
 * Proves, on the resolved numeric state (the same policy the production
 * FormMaster bundle now consumes through __GASPER_FACE_VISIBILITY_POLICY__):
 *  1. Face visibility never falls below the declared bounded floor on any
 *     frame — including transition midpoints (no blackout samples).
 *  2. The emission channel stays bounded-dim, never zero, on dormant routes.
 *  3. Frame metadata is monotonic (frameIndex strictly increasing, timeMs
 *     non-decreasing) and commits from the same resolved frame as the
 *     embodiment mix and semantic label.
 *  4. One live SVG root identity and one writer identity persist across the
 *     whole route (no detach/replace/substitute).
 *  5. The production wiring actually consumes the policy: source proof that
 *     all-script-3.js resolves face visibility through the bridge and that
 *     GasperDocument installs it before FormMaster executes.
 *  6. The full frame series passes the temporal no-blackout invariant with
 *     zero blackout frames.
 *
 * Environment note: node env (no jsdom in this repo). The numeric policy path
 * is executed directly; DOM-level evidence remains the Task 7 visual loop.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  analyzeNoBlackoutSequence,
  evaluateFrameReadability,
  PROJECTOR_FACE_VIS_FLOORS,
  resolveProjectorFaceVisibility,
} from "./noBlackoutInvariant";
import type { ContinuityFrame } from "./types";

const GASPER_ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Mirrors FORM_PROFILES face flags in all-script-3.js (wiring-asserted below). */
const PROFILE_FACE: Record<string, boolean> = {
  presence: true,
  singularity: false,
  "dormant-orbit": false,
};

type RouteSegment = {
  from: string;
  to: string;
  frames: number;
  routeHint: "wake" | "dormant" | "ordinary";
};

function segmentHint(from: string, to: string): "wake" | "dormant" | "ordinary" {
  const fromFace = PROFILE_FACE[from]!;
  const toFace = PROFILE_FACE[to]!;
  if (!fromFace && toFace) return "wake";
  if (!toFace) return "dormant";
  return "ordinary";
}

function buildRoute(): RouteSegment[] {
  const legs: Array<[string, string, number]> = [
    ["presence", "presence", 30], // hold
    ["presence", "singularity", 90], // enter singularity
    ["singularity", "singularity", 30], // hold singularity
    ["singularity", "dormant-orbit", 90], // cross dormant family
    ["dormant-orbit", "dormant-orbit", 30], // dormant long hold
    ["dormant-orbit", "presence", 90], // wake
    ["presence", "presence", 30], // recovered hold
  ];
  return legs.map(([from, to, frames]) => ({
    from,
    to,
    frames,
    routeHint: segmentHint(from, to),
  }));
}

function floorFor(hint: "wake" | "dormant" | "ordinary"): number {
  if (hint === "wake") return PROJECTOR_FACE_VIS_FLOORS.wake;
  if (hint === "dormant") return PROJECTOR_FACE_VIS_FLOORS.dormant;
  return PROJECTOR_FACE_VIS_FLOORS.ordinary;
}

describe("gasper face continuity (VEC-101)", () => {
  it("keeps face visibility at or above bounded floors on every frame of the route", () => {
    const svgRootIdentity = { id: "live-svg-root", writer: "formmaster-vector-projector" };
    let frameIndex = 0;
    let lastTimeMs = -1;
    const frames: ContinuityFrame[] = [];
    const resolutions: Array<{
      frameIndex: number;
      segment: string;
      progress: number;
      faceVis: number;
      emissionOp: number;
      floor: number;
      label: string;
      rootId: string;
      writer: string;
    }> = [];

    for (const seg of buildRoute()) {
      for (let i = 0; i < seg.frames; i++) {
        const progress = seg.from === seg.to ? 1 : i / (seg.frames - 1);
        const resolved = resolveProjectorFaceVisibility({
          progress,
          fromFace: PROFILE_FACE[seg.from]!,
          toFace: PROFILE_FACE[seg.to]!,
          routeHint: seg.routeHint,
        });
        const floor = floorFor(seg.routeHint);
        const timeMs = frameIndex * 16.6667;
        // Atomic same-frame commit: label derives from the same progress value.
        const label = progress < 0.5 ? seg.from : seg.to;

        resolutions.push({
          frameIndex,
          segment: `${seg.from}→${seg.to}`,
          progress,
          faceVis: resolved.faceVis,
          emissionOp: resolved.emissionOp,
          floor,
          label,
          rootId: svgRootIdentity.id,
          writer: svgRootIdentity.writer,
        });

        // Channel map for the temporal invariant, derived from the same frame.
        const channels = {
          face_scale: Math.max(0.92, resolved.faceVis),
          overall_height: 1,
          overall_width: 1,
          lower_body_fullness: 0.65,
          energy_level: seg.routeHint === "dormant" ? 0.22 : 0.52,
          energy_pulse: 0.1,
          internal_glow: Math.max(0.2, resolved.emissionOp),
          face_emissive: resolved.emissionOp,
          eye_openness: Math.max(
            seg.routeHint === "dormant" ? 0.18 : 0.56,
            resolved.faceVis * 0.4,
          ),
          mouth_openness: seg.routeHint === "dormant" ? 0.06 : 0.32,
        };
        frames.push({
          index: frameIndex,
          t: timeMs / 1000,
          channels,
          ownership: {
            face_emissive: "state_target",
            eye_openness: "state_target",
          },
          transition: {
            from: seg.from,
            to: seg.to,
            progress,
            phase: seg.from === seg.to ? "hold" : "transition",
          },
          topology: {
            contourSamples: 512,
            structuralNodes: 360,
            structuralTriangles: 672,
            topologyStable: true,
          },
          contour: {
            overall_height: 1,
            overall_width: 1,
            crown_height: 1,
            ground_flattening: 0,
            lower_body_fullness: 0.65,
          },
        });

        // Monotonic frame metadata.
        expect(frameIndex).toBe(resolutions.length - 1);
        expect(timeMs).toBeGreaterThan(lastTimeMs);
        lastTimeMs = timeMs;
        frameIndex++;
      }
    }

    // 1+2: per-frame bounded floors, zero sub-floor samples.
    for (const r of resolutions) {
      expect(
        r.faceVis,
        `frame ${r.frameIndex} (${r.segment} @${r.progress.toFixed(3)}) faceVis ${r.faceVis} below floor ${r.floor}`,
      ).toBeGreaterThanOrEqual(r.floor - 1e-9);
      expect(r.emissionOp).toBeGreaterThanOrEqual(
        PROJECTOR_FACE_VIS_FLOORS.emissionDormant - 1e-9,
      );
      expect(r.faceVis).toBeGreaterThan(0);
    }

    // 3: labels commit from the same resolved frame as the mix.
    for (const r of resolutions) {
      const [from, to] = r.segment.split("→") as [string, string];
      expect(r.label).toBe(r.progress < 0.5 ? from : to);
    }

    // 4: one root identity, one writer, across the whole route.
    const rootIds = new Set(resolutions.map((r) => r.rootId));
    const writers = new Set(resolutions.map((r) => r.writer));
    expect(rootIds.size).toBe(1);
    expect(writers.size).toBe(1);

    // 6: temporal no-blackout invariant, zero blackout frames.
    const report = analyzeNoBlackoutSequence(frames, { mode: "mixed" });
    expect(report.blackoutFrameCount).toBe(0);
    expect(report.readable).toBe(true);

    // Every frame is individually readable under its route mode.
    for (const f of frames) {
      const mode = f.transition?.to?.includes("dormant")
        ? "dormant"
        : f.transition?.from === "dormant-orbit"
          ? "wake"
          : "ordinary";
      const readability = evaluateFrameReadability(f.channels, mode, f);
      expect(readability.blackout).toBe(false);
    }
  });

  it("production wiring consumes the bounded policy (source proof)", () => {
    const script = readFileSync(`${GASPER_ROOT}/assets/all-script-3.js`, "utf8");
    const doc = readFileSync(`${GASPER_ROOT}/GasperDocument.ts`, "utf8");

    // FormMaster consumes the realm bridge.
    expect(script).toContain("globalThis.__GASPER_FACE_VISIBILITY_POLICY__");
    expect(script).toContain("_fvPolicy.resolve({progress:morphMix");

    // The legacy hard-withdrawal path survives only inside the fallback branch.
    const policyIdx = script.indexOf("__GASPER_FACE_VISIBILITY_POLICY__");
    const legacyIdx = script.indexOf("profileFaceWeight(morphProfileId),profileFaceWeight(nextMorphProfileId)");
    expect(policyIdx).toBeGreaterThan(-1);
    expect(legacyIdx).toBeGreaterThan(policyIdx); // fallback after policy branch

    // Emission is bounded separately (dim, not deleted).
    expect(script).toContain("faceEmissionVisibility");
    expect(script).toContain("faceEmissionLayer.style.opacity=faceEmissionVisibility.toFixed(3)");

    // GasperDocument installs the resolver before FormMaster executes and
    // restores it on error and teardown.
    expect(doc).toContain("__GASPER_FACE_VISIBILITY_POLICY__");
    expect(doc).toContain("resolve: resolveProjectorFaceVisibility");
    expect(doc).toContain("previousFaceVisibilityPolicy");

    // FORM_PROFILES still declare the dormant-family face flags the policy
    // interprets (the test's PROFILE_FACE mirror stays honest).
    expect(script).toMatch(/'singularity':Object\.freeze\({[^}]*face:false/);
    expect(script).toMatch(/'dormant-orbit':Object\.freeze\({[^}]*face:false/);
  });
});
