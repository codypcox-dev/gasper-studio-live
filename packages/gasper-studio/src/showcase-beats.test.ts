/**
 * GASPER-FINISH-01 Task 6 — authored scene beats registry.
 *
 * Machine gate: every unique authored clip in the served showcase pack
 * declares its three-beat arc (gather/peak/settle), gestures satisfy
 * recovery-longest, and face/material/easing coverage is present.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_PACK = `${HERE}../public/demo/gasper-hero-pack-v1`;
const CONTENT_PACK =
  `${HERE}../../../packages/gasper-demo-content/content/gasper-hero-pack-v1`;

const FACE_KEYS = [
  "eye_openness",
  "eye_spacing",
  "gaze",
  "mouth_openness",
  "mouth_width",
  "face_scale",
  "corner_pull_l",
  "corner_pull_r",
];
const MATERIAL_KEYS = [
  "internal_glow",
  "face_emissive",
  "energy_level",
  "energy_pulse",
  "relief_amplitude",
  "secondary_lag",
  "skin_tension",
];
const KNOWN_EASINGS = new Set([
  "power1.in",
  "power1.out",
  "power1.inOut",
  "power2.in",
  "power2.out",
  "power2.inOut",
  "power3.in",
  "power3.out",
  "power3.inOut",
  "back.out(1.2)",
  "quintic",
  "bezier",
]);

function uniqueClips(packRoot: string): Map<string, unknown> {
  const docsDir = `${packRoot}/documents`;
  const clips = new Map<string, unknown>();
  for (const file of readdirSync(docsDir).filter((f) => f.endsWith(".gasper"))) {
    const doc = JSON.parse(readFileSync(`${docsDir}/${file}`, "utf8"));
    for (const clip of doc.animation?.clips ?? []) {
      if (clips.has(clip.id)) continue;
      const keyframes = (clip.tracks ?? []).flatMap((t: { keyframes?: unknown[] }) =>
        (t.keyframes ?? []).map((k) => ({ ...k, bindings: t })),
      );
      const bindings = new Set<string>();
      for (const track of clip.tracks ?? []) {
        for (const b of track.binding_ids ?? []) bindings.add(b);
      }
      const easings = keyframes.map((k) => k.easing).filter(Boolean);
      clips.set(clip.id, {
        id: clip.id,
        durationMs: clip.duration_ms,
        loopMode: clip.loop_mode,
        faceCoverage: FACE_KEYS.filter((k) => bindings.has(k)).length,
        materialCoverage: MATERIAL_KEYS.filter((k) => bindings.has(k)).length,
        unknownEasings: easings.filter((e) => !KNOWN_EASINGS.has(e)),
      });
    }
  }
  return clips;
}

describe("authored scene beats registry (Task 6)", () => {
  it("served pack and content pack registries match and cover every unique clip", () => {
    const publicRegistry = JSON.parse(
      readFileSync(`${PUBLIC_PACK}/beats-registry.json`, "utf8"),
    );
    const contentRegistry = JSON.parse(
      readFileSync(`${CONTENT_PACK}/beats-registry.json`, "utf8"),
    );
    expect(publicRegistry).toEqual(contentRegistry);

    const clips = uniqueClips(PUBLIC_PACK);
    expect(clips.size).toBeGreaterThanOrEqual(13);
    for (const clipId of clips.keys()) {
      const beats = publicRegistry.clips[clipId];
      expect(beats, `${clipId} beats missing`).toBeDefined();
      expect(beats.gatherMs).toBeGreaterThanOrEqual(0);
      expect(beats.peakMs).toBeGreaterThan(0);
      expect(beats.settleMs).toBeGreaterThanOrEqual(0);
      if (beats.kind === "gesture") {
        expect(beats.settleMs, `${clipId} recovery-longest`).toBeGreaterThanOrEqual(
          beats.gatherMs,
        );
      }
    }
  });

  it("every unique clip passes face, material, easing, and duration checks", () => {
    const registry = JSON.parse(
      readFileSync(`${PUBLIC_PACK}/beats-registry.json`, "utf8"),
    );
    const clips = uniqueClips(PUBLIC_PACK);
    for (const clip of clips.values()) {
      expect(clip.faceCoverage).toBeGreaterThanOrEqual(4);
      expect(clip.materialCoverage).toBeGreaterThanOrEqual(3);
      expect(clip.unknownEasings).toEqual([]);
      expect(Number.isFinite(clip.durationMs) && clip.durationMs > 0).toBe(true);
      expect(registry.clips[clip.id]).toBeDefined();
    }
  });

  it("manifest advertises the beats registry", () => {
    const manifest = JSON.parse(
      readFileSync(`${PUBLIC_PACK}/manifest.json`, "utf8"),
    );
    expect(manifest.beats_registry).toBe("beats-registry.json");
  });
});
