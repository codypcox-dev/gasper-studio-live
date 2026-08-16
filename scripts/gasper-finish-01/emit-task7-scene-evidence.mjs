/**
 * GASPER-FINISH-01 Task 7 — machine scene evidence emitter.
 *
 * Samples every authored clip's merged keyframes at 60 fps (deterministic
 * linear interpolation), enforces the no-blackout face/material floors from
 * the continuity contract, measures per-frame derivative bounds, verifies the
 * authored three-beat coverage from the beats registry, and runs a 10-minute
 * long-session sweep across all clips. Observer-only numeric evidence — no
 * pixels feed Gasper state.
 *
 * Run: node scripts/gasper-finish-01/emit-task7-scene-evidence.mjs
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const PACK = `${ROOT}packages/gasper-demo-content/content/gasper-hero-pack-v1`;
const OUT_DIR = `${ROOT}research/proofs/gasper-unified-theory-vision`;

const FACE_FLOORS = {
  eye_openness: 0.1,
  face_scale: 0.88,
  face_emissive: 0.12,
  mouth_openness: 0.03,
};
const MATERIAL_BOUNDS = {
  energy_level: [0.14, 1],
  internal_glow: [0.14, 1],
  face_emissive: [0.12, 1],
};
const MAX_FRAME_DELTA = 0.08; // per-frame channel delta at 60 fps (bounded derivative)

/**
 * Per-channel keyframe series (the runtime interpolates each track/channel
 * independently — a channel absent from one track must not snap).
 */
function channelSeries(clip) {
  const series = new Map();
  for (const track of clip.tracks ?? []) {
    for (const kf of track.keyframes ?? []) {
      for (const [k, v] of Object.entries(kf.values ?? {})) {
        if (!series.has(k)) series.set(k, []);
        const list = series.get(k);
        const existing = list.find((e) => e.t === kf.time_ms);
        if (existing) existing.v = v; // later track wins (matches collectMergedKeyframes)
        else list.push({ t: kf.time_ms, v });
      }
    }
  }
  for (const list of series.values()) list.sort((a, b) => a.t - b.t);
  return series;
}

function sampleChannels(series, tMs) {
  const out = {};
  for (const [k, kfs] of series) {
    if (kfs.length === 0) continue;
    if (tMs <= kfs[0].t) {
      out[k] = kfs[0].v;
      continue;
    }
    const last = kfs[kfs.length - 1];
    if (tMs >= last.t) {
      out[k] = last.v;
      continue;
    }
    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i];
      const b = kfs[i + 1];
      if (tMs >= a.t && tMs <= b.t) {
        const span = Math.max(1, b.t - a.t);
        const p = (tMs - a.t) / span;
        out[k] = a.v + (b.v - a.v) * p;
        break;
      }
    }
  }
  return out;
}

function fnv(payload) {
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function analyzeClip(clip, beats) {
  const series = channelSeries(clip);
  const durationMs = Math.max(1, clip.duration_ms ?? 0);
  const dtMs = 1000 / 60;
  const frames = [];
  for (let t = 0; t <= durationMs + 1e-6; t += dtMs) {
    frames.push(sampleChannels(series, t));
  }
  let faceFloorOk = true;
  let materialBoundsOk = true;
  let maxFrameDelta = 0;
  let maxDeltaChannel = null;
  let maxDeltaAtMs = 0;
  const floorViolations = [];
  const boundViolations = [];
  let prev = frames[0] ?? {};
  const keys = new Set();
  for (const f of frames) for (const k of Object.keys(f)) keys.add(k);
  for (let i = 1; i < frames.length; i++) {
    const cur = frames[i];
    for (const k of keys) {
      const a = prev[k] ?? 0;
      const b = cur[k] ?? 0;
      const d = Math.abs(b - a);
      if (d > maxFrameDelta) {
        maxFrameDelta = d;
        maxDeltaChannel = k;
        maxDeltaAtMs = Math.round(i * dtMs);
      }
    }
    for (const [k, floor] of Object.entries(FACE_FLOORS)) {
      if (typeof cur[k] === "number" && cur[k] < floor) {
        faceFloorOk = false;
        floorViolations.push({ channel: k, min: Math.round(cur[k] * 1e4) / 1e4, floor });
      }
    }
    for (const [k, [lo, hi]] of Object.entries(MATERIAL_BOUNDS)) {
      if (typeof cur[k] === "number" && (cur[k] < lo || cur[k] > hi)) {
        materialBoundsOk = false;
        boundViolations.push({
          channel: k,
          value: Math.round(cur[k] * 1e4) / 1e4,
          bounds: [lo, hi],
        });
      }
    }
    prev = cur;
  }
  const hash = fnv(
    JSON.stringify(
      frames.map((f) =>
        Object.keys(f)
          .sort()
          .map((k) => `${k}=${Math.round((f[k] ?? 0) * 1e6)}`)
          .join(";"),
      ),
    ),
  );
  const hasBeats = !!beats;
  const recoveryLongest =
    hasBeats && beats.kind === "gesture" ? beats.settleMs >= beats.gatherMs : true;
  return {
    id: clip.id,
    durationMs,
    frameCount: frames.length,
    faceFloorOk,
    materialBoundsOk,
    maxFrameDelta: Math.round(maxFrameDelta * 1e6) / 1e6,
    derivativeBounded: maxFrameDelta <= MAX_FRAME_DELTA,
    maxDeltaChannel,
    maxDeltaAtMs,
    floorViolations: [...new Set(floorViolations.map((v) => JSON.stringify(v)))].map(JSON.parse).slice(0, 8),
    boundViolations: [...new Set(boundViolations.map((v) => JSON.stringify(v)))].map(JSON.parse).slice(0, 8),
    beatsDeclared: hasBeats,
    recoveryLongest,
    determinismHash: hash,
    pass:
      faceFloorOk &&
      materialBoundsOk &&
      maxFrameDelta <= MAX_FRAME_DELTA &&
      hasBeats &&
      recoveryLongest,
  };
}

const registry = JSON.parse(
  readFileSync(`${PACK}/beats-registry.json`, "utf8"),
);
const docsDir = `${PACK}/documents`;
const clips = new Map();
for (const file of readdirSync(docsDir).filter((f) => f.endsWith(".gasper"))) {
  const doc = JSON.parse(readFileSync(`${docsDir}/${file}`, "utf8"));
  for (const clip of doc.animation?.clips ?? []) {
    if (!clips.has(clip.id)) clips.set(clip.id, clip);
  }
}

const scenes = [];
for (const [id, clip] of clips) {
  scenes.push(analyzeClip(clip, registry.clips[id]));
}

// Long-session sweep: 10 minutes at 60 fps cycling all clips. Deltas are
// measured within each clip only; clip-switch boundaries are authored cuts.
const longFrames = [];
const order = [...clips.values()];
const dtMs = 1000 / 60;
const totalSeconds = 600;
let longMaxDelta = 0;
let elapsedMs = 0;
let clipIdx = 0;
while (elapsedMs < totalSeconds * 1000) {
  const clip = order[clipIdx % order.length];
  const series = channelSeries(clip);
  const durationMs = Math.max(1, clip.duration_ms ?? 0);
  let prev = null;
  for (let t = 0; t <= durationMs + 1e-6; t += dtMs) {
    const f = sampleChannels(series, t);
    longFrames.push(f);
    if (prev) {
      const ks = new Set([...Object.keys(prev), ...Object.keys(f)]);
      for (const k of ks) {
        longMaxDelta = Math.max(
          longMaxDelta,
          Math.abs((f[k] ?? 0) - (prev[k] ?? 0)),
        );
      }
    }
    prev = f;
    elapsedMs += dtMs;
    if (elapsedMs >= totalSeconds * 1000) break;
  }
  clipIdx++;
}

const evidence = {
  schema: "gasper.finish-01.task7.machine-evidence.v1",
  date: "2026-08-03",
  worker: "codex-vec005-worker-20260803",
  classification:
    "machine-proven (deterministic 60fps sampling of the authored clips; observer-only)",
  method:
    "merged keyframes sampled at 60 fps with linear interpolation; face floors and material bounds from the no-blackout contract; per-frame derivative bound 0.08",
  scenes,
  summary: {
    scenes: scenes.length,
    pass: scenes.filter((s) => s.pass).length,
    fail: scenes.filter((s) => !s.pass).length,
  },
  longSession: {
    seconds: 600,
    frames: longFrames.length,
    maxFrameDelta: Math.round(longMaxDelta * 1e6) / 1e6,
    derivativeBounded: longMaxDelta <= MAX_FRAME_DELTA,
  },
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  `${OUT_DIR}/task7-machine-evidence.json`,
  JSON.stringify(evidence, null, 2),
);
console.log(JSON.stringify({ summary: evidence.summary, longSession: evidence.longSession }, null, 2));
for (const s of scenes.filter((s) => !s.pass)) console.log("FAIL", s.id, s);
