/**
 * GASPER-CRAFT-001 · C1 — PerformancePacks: authored multi-channel curve
 * performances with beat sheets (pure module).
 *
 * Canon: `animatic-beat-sheet`, `bezier-tangent-model`, `arc-phase-law`,
 * `squash-stretch-volume-guard`, `straight-ahead-pose-to-pose`.
 *
 * A pack is the graph-editor session as data: synchronized CurveTracks on
 * closed channels + a beat sheet (beginning/middle/end, one primary idea per
 * beat, one objective per beat) + the scene's value turn + the flagged
 * holds + a per-segment mode map implementing the
 * pose-to-pose / straight-ahead division of labor — `authored` segments are
 * curve-owned (anticipation/holds/settle/expression), `physics` segments are
 * D-0090 ballistic territory, and the handoff keys are authored.
 *
 * GASPER-CRAFT-002 S5 — the meaning schema (D-0099 Doctrine 5, fail-closed):
 * every beat carries an `objective` (the playable thing Gasper pursues —
 * `acting-for-animators-2011`); every pack IS a scene and must turn a value
 * (`valueTurn {from, to}`, from ≠ to — `story-1997`); stillness is never
 * void — a hold is an EVENT flagged with an intent (`limited-animation-hold`);
 * emotion is the RESULT of an objective, so face beats serve a beat
 * (FaceBeats.beatId). The compiler rejects any pack missing its meaning.
 *
 * Channel semantics (living units unless noted):
 *   world_x / world_y — world pose (units; +y up; forwarded curve-authority)
 *   world_z           — depth from the home plane (units; − = toward the
 *                       monitor glass; D-0099 Doctrine 1 — depth IS the new
 *                       shot scale: the camera never moves, Gasper does)
 *   tilt              — whole-body roll, degrees
 *   stretch           — overall_height DELTA (− at squash, + at stretch);
 *                       overall_width derives from the volume law Sx·Sy = 1
 *   squash            — ground_flattening delta (0..0.6), the flat-disc read
 *   wake              — wake-warp emphasis multiplier over pose velocity
 *   light             — interior-light feed (0..12)
 *   face              — expression energy 0..1 (C4 maps AU recipes onto it)
 *
 * camera_scale/x/y are RETIRED (D-0099 Doctrine 1, D-0107): the camera is
 * the monitor — nothing moves the viewport during a performance, so camera
 * channels had no actuator. The compiler rejects them fail-closed with an
 * explicit retirement error (RETIRED_PACK_CHANNELS); framing is authored as
 * Gasper's depth (world_z against the shot-scale legibility bands).
 *
 * compilePerformancePack is fail-closed: a malformed payload compiles to
 * null with errors — a bad pack never reaches the organism.
 */
import {
  curveTrackDuration,
  evaluateCurveTrack,
  evaluateCurveTrackDerivative,
  normalizeCurveTrack,
  type CurveTrack,
} from "./CurveTrack";

export type PackChannelId =
  | "world_x"
  | "world_y"
  | "world_z"
  | "tilt"
  | "stretch"
  | "squash"
  | "wake"
  | "light"
  | "face"
  | "ground_impact";

export const PACK_CHANNEL_SET: ReadonlySet<PackChannelId> = new Set([
  "world_x",
  "world_y",
  "world_z",
  "tilt",
  "stretch",
  "squash",
  "wake",
  "light",
  "face",
  "ground_impact",
]);

/**
 * Retired channels (D-0107): authored, sampled — and never drawn, because
 * Doctrine 1 retired their actuator (the moving camera). Compiling one
 * rejects the pack fail-closed with the retirement reason. Framing is now
 * authored as Gasper's depth (world_z against the legibility bands).
 * N40 (2026-08-06): ground_impact joins the retirement by owner order —
 * the impact-ripple ring is removed from the ground; the drop shadow is
 * the floor's answer. Sampled, never drawn (the renderer intake is a no-op).
 */
export const RETIRED_PACK_CHANNELS: Readonly<Record<string, string>> =
  Object.freeze({
    camera_scale:
      "camera_scale is retired (D-0099 Doctrine 1) — the camera is the monitor; author framing as Gasper's depth (world_z)",
    camera_x:
      "camera_x is retired (D-0099 Doctrine 1) — the camera is the monitor; author framing as Gasper's depth (world_z)",
    camera_y:
      "camera_y is retired (D-0099 Doctrine 1) — the camera is the monitor; author framing as Gasper's depth (world_z)",
    ground_impact:
      "ground_impact is retired (N40, owner 2026-08-06) — the impact-ripple ring is removed from the ground; the drop shadow is the floor's answer",
  });

/**
 * Unit channels — carriers whose authored keys must stay inside 0..1
 * (they map to bounded renderer laws, not world motion). Compiling a key
 * outside the fence rejects the pack (fail closed). GASPER-CRAFT-002 S7
 * (D-0107): face joins the fence — the S5 candidate lands; the driver's
 * sampling clamp survives as the runtime fail-closed layer (defense in
 * depth). N40: ground_impact left the unit fence with the retirement.
 */
export const PACK_UNIT_CHANNELS: ReadonlySet<PackChannelId> = new Set([
  "face",
]);

export type PackShotScale =
  | "extreme-close"
  | "close"
  | "medium"
  | "wide"
  | "extreme-wide";

export const PACK_SHOT_SCALE_SET: ReadonlySet<PackShotScale> = new Set([
  "extreme-close",
  "close",
  "medium",
  "wide",
  "extreme-wide",
]);

export type PackBeat = Readonly<{
  id: string;
  t0: number;
  t1: number;
  /** One primary idea per beat (C5 gate). */
  primaryIdea: string;
  shotScale: PackShotScale;
  /** The value turn of the beat (McKee): what changes for Gasper. */
  valueTurn: string;
  /**
   * Doctrine 5 (S5): the playable thing Gasper pursues in this beat — an
   * objective in the acting sense (`acting-for-animators-2011`). Required;
   * the compiler rejects a beat without one. Movement is the pursuit of an
   * objective; emotion is the result.
   */
  objective: string;
}>;

/**
 * Doctrine 5 (S5): a pack IS a scene, and a scene must turn a value —
 * charged state `from` → charged state `to`, and the turn must actually
 * change something (from ≠ to; `story-1997`). Required on every pack.
 */
export type PackValueTurn = Readonly<{
  from: string;
  to: string;
}>;

/**
 * Doctrine 5 (S5): a hold is an EVENT, not void time — stillness flagged
 * with an intent (`limited-animation-hold`). Holds are optional, but the
 * craft gate suite enforces the bidirectional law: every declared hold must
 * be still, and every stillness ≥ the hold budget must be declared
 * (validateHoldStillness).
 */
export type PackHold = Readonly<{
  id: string;
  t0: number;
  t1: number;
  /** What Gasper is doing while still — the hold's reason to exist. */
  intent: string;
}>;

export type PackSegmentMode = "authored" | "physics";

export type PackSegment = Readonly<{
  t0: number;
  t1: number;
  mode: PackSegmentMode;
  /** Mechanical moves (linear rails) are exempt from the arc-phase law. */
  mechanical: boolean;
}>;

export type PerformancePack = Readonly<{
  id: string;
  version: 1;
  durationSeconds: number;
  channels: Readonly<Partial<Record<PackChannelId, CurveTrack>>>;
  beats: readonly PackBeat[];
  segments: readonly PackSegment[];
  /** Doctrine 5 (S5): the scene's value turn — required, fail-closed. */
  valueTurn: PackValueTurn;
  /** Doctrine 5 (S5): the flagged holds (stillness as events with intent). */
  holds: readonly PackHold[];
  /** Deterministic content hash (FNV-1a 32 over canonical JSON). */
  hash: string;
}>;

export type PackCompileResult = Readonly<{
  pack: PerformancePack | null;
  errors: readonly string[];
}>;

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** FNV-1a 32-bit over a string — deterministic, dependency-free. */
export function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

/**
 * Hash the authored content (channels + beats + segments + meaning +
 * duration). Doctrine 5 (S5): the meaning fields ARE content — a retimed
 * objective or a reworded turn is a different performance.
 */
export function hashPackContent(content: {
  durationSeconds: number;
  channels: Readonly<Partial<Record<PackChannelId, CurveTrack>>>;
  beats: readonly PackBeat[];
  segments: readonly PackSegment[];
  valueTurn: PackValueTurn;
  holds: readonly PackHold[];
}): string {
  return fnv1aHex(canonicalJson(content));
}

/**
 * Compile a raw payload into a PerformancePack — fail closed. Beat sheet
 * rules: beats sorted, non-overlapping, inside [0, duration], t0 < t1, and
 * performance shot scales only (extreme-wide forbidden on beats, C2).
 * Meaning rules (Doctrine 5, S5): every beat carries a non-empty objective;
 * the pack IS a scene and must turn a value (valueTurn {from, to}, from ≠
 * to); holds are flagged events with an intent, each inside one beat.
 */
export function compilePerformancePack(raw: unknown): PackCompileResult {
  const errors: string[] = [];
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const id = typeof r.id === "string" && r.id.length > 0 ? r.id : null;
  if (!id) errors.push("pack id missing");

  const duration = finiteOr(r.durationSeconds, NaN);
  if (!Number.isFinite(duration) || duration <= 0) {
    errors.push("durationSeconds must be a positive finite number");
    return { pack: null, errors };
  }

  // Doctrine 5 (S5): a pack IS a scene — it must turn a value (story-1997).
  const rawTurn = (r.valueTurn && typeof r.valueTurn === "object"
    ? r.valueTurn
    : null) as Record<string, unknown> | null;
  const turnFrom = rawTurn && typeof rawTurn.from === "string" ? rawTurn.from.trim() : "";
  const turnTo = rawTurn && typeof rawTurn.to === "string" ? rawTurn.to.trim() : "";
  if (!rawTurn || !turnFrom || !turnTo) {
    errors.push("scene valueTurn missing — every scene turns a value {from, to} (Doctrine 5)");
  } else if (turnFrom === turnTo) {
    errors.push("scene valueTurn must actually turn (from ≠ to) — nothing changed is not a scene");
  }
  const valueTurn: PackValueTurn = Object.freeze({ from: turnFrom, to: turnTo });

  // Channels.
  const channels: Partial<Record<PackChannelId, CurveTrack>> = {};
  const rawChannels = (r.channels && typeof r.channels === "object"
    ? r.channels
    : {}) as Record<string, unknown>;
  for (const [name, keys] of Object.entries(rawChannels)) {
    // D-0107: retired channels fail closed with their retirement reason —
    // an authored camera channel is a doctrine error, not an unknown name.
    const retired = RETIRED_PACK_CHANNELS[name];
    if (retired) {
      errors.push(`channel ${name}: ${retired}`);
      continue;
    }
    if (!PACK_CHANNEL_SET.has(name as PackChannelId)) {
      errors.push(`unknown channel: ${name}`);
      continue;
    }
    const track = normalizeCurveTrack(keys);
    if (track.keys.length === 0) continue;
    const last = track.keys[track.keys.length - 1].t;
    if (last > duration + 1e-6) {
      errors.push(`channel ${name} extends past pack duration`);
      continue;
    }
    // GASPER-CRAFT-002 S4: unit channels (face, ground_impact) drive bounded
    // renderer laws — every authored key must stay inside 0..1 (fail closed).
    if (PACK_UNIT_CHANNELS.has(name as PackChannelId)) {
      for (const k of track.keys) {
        if (k.v < -1e-6 || k.v > 1 + 1e-6) {
          errors.push(`channel ${name} key ${k.v} at t=${k.t}s outside the unit fence [0, 1]`);
          break;
        }
      }
    }
    channels[name as PackChannelId] = track;
  }

  // Beat sheet.
  const beats: PackBeat[] = [];
  const rawBeats = Array.isArray(r.beats) ? r.beats : [];
  for (const b of rawBeats) {
    const rb = (b && typeof b === "object" ? b : {}) as Record<string, unknown>;
    const t0 = finiteOr(rb.t0, NaN);
    const t1 = finiteOr(rb.t1, NaN);
    const shotScale =
      typeof rb.shotScale === "string" &&
      PACK_SHOT_SCALE_SET.has(rb.shotScale as PackShotScale)
        ? (rb.shotScale as PackShotScale)
        : null;
    if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) {
      errors.push("beat with invalid t0/t1");
      continue;
    }
    if (t0 < -1e-6 || t1 > duration + 1e-6) {
      errors.push("beat outside pack duration");
      continue;
    }
    if (!shotScale) {
      errors.push("beat with unknown shotScale");
      continue;
    }
    // Doctrine 5 (S5): a beat without an objective is not a beat — movement
    // is the pursuit of something (acting-for-animators-2011). Fail closed.
    const objective = typeof rb.objective === "string" ? rb.objective.trim() : "";
    if (!objective) {
      errors.push(`beat ${typeof rb.id === "string" && rb.id ? rb.id : `(t ${t0}–${t1})`}: missing objective — what is Gasper pursuing? (Doctrine 5)`);
      continue;
    }
    // GASPER-CRAFT-001 · C2 staging law (shot-scales canon): extreme-wide is
    // the scale of environment/isolation — never a performance scale. Beats
    // ARE performance, so the compiler rejects it fail-closed (the review-gate
    // validator lives in ShotDirector.validatePerformanceShotScales).
    if (shotScale === "extreme-wide") {
      errors.push("beat with extreme-wide shotScale — forbidden during performance beats");
      continue;
    }
    beats.push({
      id: typeof rb.id === "string" && rb.id ? rb.id : `beat-${beats.length + 1}`,
      t0,
      t1,
      primaryIdea: typeof rb.primaryIdea === "string" ? rb.primaryIdea : "",
      shotScale,
      valueTurn: typeof rb.valueTurn === "string" ? rb.valueTurn : "",
      objective,
    });
  }
  beats.sort((a, b) => a.t0 - b.t0);
  for (let i = 1; i < beats.length; i++) {
    if (beats[i].t0 < beats[i - 1].t1 - 1e-6) {
      errors.push(`beats overlap: ${beats[i - 1].id} / ${beats[i].id}`);
    }
  }

  // Doctrine 5 (S5): holds — stillness flagged as events with intent
  // (limited-animation-hold). Optional array; every entry fail-closed:
  // finite window inside the pack, non-empty intent, contained by one beat
  // (a hold belongs to a beat's objective), no overlapping holds.
  const holds: PackHold[] = [];
  const rawHolds = Array.isArray(r.holds) ? r.holds : [];
  for (const h of rawHolds) {
    const rh = (h && typeof h === "object" ? h : {}) as Record<string, unknown>;
    const t0 = finiteOr(rh.t0, NaN);
    const t1 = finiteOr(rh.t1, NaN);
    const hId =
      typeof rh.id === "string" && rh.id ? rh.id : `hold-${holds.length + 1}`;
    if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) {
      errors.push(`hold ${hId}: invalid t0/t1`);
      continue;
    }
    if (t0 < -1e-6 || t1 > duration + 1e-6) {
      errors.push(`hold ${hId}: outside pack duration`);
      continue;
    }
    const intent = typeof rh.intent === "string" ? rh.intent.trim() : "";
    if (!intent) {
      errors.push(`hold ${hId}: missing intent — stillness is an event, say what it is (Doctrine 5)`);
      continue;
    }
    const owner = beats.find((b) => t0 >= b.t0 - 1e-6 && t1 <= b.t1 + 1e-6);
    if (!owner) {
      errors.push(`hold ${hId}: not inside any beat — a hold belongs to a beat's objective`);
      continue;
    }
    holds.push({ id: hId, t0, t1, intent });
  }
  holds.sort((a, b) => a.t0 - b.t0);
  for (let i = 1; i < holds.length; i++) {
    if (holds[i].t0 < holds[i - 1].t1 - 1e-6) {
      errors.push(`holds overlap: ${holds[i - 1].id} / ${holds[i].id}`);
    }
  }

  // Segment mode map.
  const segments: PackSegment[] = [];
  const rawSegments = Array.isArray(r.segments) ? r.segments : [];
  for (const s of rawSegments) {
    const rs = (s && typeof s === "object" ? s : {}) as Record<string, unknown>;
    const t0 = finiteOr(rs.t0, NaN);
    const t1 = finiteOr(rs.t1, NaN);
    const mode = rs.mode === "physics" ? "physics" : rs.mode === "authored" ? "authored" : null;
    if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0 || !mode) {
      errors.push("segment with invalid t0/t1/mode");
      continue;
    }
    segments.push({
      t0: Math.max(0, t0),
      t1: Math.min(duration, t1),
      mode,
      mechanical: rs.mechanical === true,
    });
  }
  segments.sort((a, b) => a.t0 - b.t0);

  if (errors.length) return { pack: null, errors };

  const content = { durationSeconds: duration, channels, beats, segments, valueTurn, holds };
  return {
    pack: Object.freeze({
      id: id as string,
      version: 1,
      durationSeconds: duration,
      channels: Object.freeze(channels),
      beats: Object.freeze(beats),
      segments: Object.freeze(segments),
      valueTurn,
      holds: Object.freeze(holds),
      hash: hashPackContent(content),
    }),
    errors: [],
  };
}

/** Channel value at pack time (0 when the channel is absent). */
export function packChannelValueAt(
  pack: PerformancePack,
  channel: PackChannelId,
  t: number,
): number {
  const track = pack.channels[channel];
  if (!track) return 0;
  return evaluateCurveTrack(track, t);
}

/** The beat containing t (null in the gaps). */
export function beatAt(
  pack: PerformancePack,
  t: number,
): PackBeat | null {
  for (const b of pack.beats) {
    if (t >= b.t0 && t < b.t1) return b;
  }
  return null;
}

/** The segment covering t (defaults to authored — curves own the gaps). */
export function segmentAt(
  pack: PerformancePack,
  t: number,
): PackSegment {
  for (const s of pack.segments) {
    if (t >= s.t0 && t < s.t1) return s;
  }
  return { t0: 0, t1: pack.durationSeconds, mode: "authored", mechanical: false };
}

// ---------------------------------------------------------------------------
// Craft gates (canon machine rules as pure functions)
// ---------------------------------------------------------------------------

export type ArcPhaseReport = Readonly<{
  ok: boolean;
  violations: readonly string[];
}>;

/**
 * `arc-phase-law`: for authored (non-mechanical) movement, the x and y
 * velocity peaks must be phase-offset (arcs = phase-shifted sin/cos).
 * Aligned peaks = straight-line robotic travel → reject. Channels with
 * near-constant speed carry no measurable phase and are exempt.
 */
export function validateArcPhase(
  pack: PerformancePack,
  opts: { samples?: number; toleranceRatio?: number } = {},
): ArcPhaseReport {
  const x = pack.channels.world_x;
  const y = pack.channels.world_y;
  const violations: string[] = [];
  if (!x || !y) return { ok: true, violations };

  const samples = Math.max(16, opts.samples ?? 96);
  const tol = Math.max(0.02, opts.toleranceRatio ?? 0.08);

  // Evaluate per authored segment (the whole pack when no segments exist).
  const windows: PackSegment[] = pack.segments.length
    ? pack.segments.filter((s) => s.mode === "authored" && !s.mechanical)
    : [{ t0: 0, t1: pack.durationSeconds, mode: "authored", mechanical: false }];

  for (const w of windows) {
    const span = w.t1 - w.t0;
    if (span <= 0.05) continue;
    let maxVX = 0;
    let maxVY = 0;
    let tVX = w.t0;
    let tVY = w.t0;
    let minVX = Infinity;
    let minVY = Infinity;
    // Strict interior only: the track's out-of-range rule reports derivative
    // 0 at the endpoints, which would read as a fake speed trough.
    for (let i = 1; i < samples; i++) {
      const t = w.t0 + (span * i) / samples;
      const vx = Math.abs(evaluateCurveTrackDerivative(x, t));
      const vy = Math.abs(evaluateCurveTrackDerivative(y, t));
      if (vx > maxVX) {
        maxVX = vx;
        tVX = t;
      }
      if (vy > maxVY) {
        maxVY = vy;
        tVY = t;
      }
      if (vx < minVX) minVX = vx;
      if (vy < minVY) minVY = vy;
    }
    // Exempt near-constant-speed channels (no measurable phase).
    if (maxVX < 1e-6 || maxVY < 1e-6) continue;
    if (maxVX < minVX * 1.25 || maxVY < minVY * 1.25) continue;
    const offset = Math.abs(tVX - tVY);
    if (offset < tol * span) {
      violations.push(
        `arc-phase: x/y velocity peaks aligned at t≈${tVX.toFixed(2)}s (offset ${(offset / span).toFixed(3)} of span) — mechanical flag required for straight-line travel`,
      );
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * `squash-stretch-volume-guard`: Sx·Sy = 1. Given a height scale Sy (>0),
 * the volume-preserving width scale is Sx = 1/Sy (2D silhouette plane).
 */
export function volumeLawWidthScale(heightScale: number): number {
  const sy = Number.isFinite(heightScale) && heightScale > 0.05 ? heightScale : 1;
  return 1 / sy;
}

/** Check |Sx·Sy − 1| ≤ tolerance (default 0.02 per canon). */
export function checkSquashVolume(
  sx: number,
  sy: number,
  tolerance = 0.02,
): boolean {
  if (!Number.isFinite(sx) || !Number.isFinite(sy)) return false;
  return Math.abs(sx * sy - 1) <= tolerance;
}

/**
 * Amplitude floors (`exaggeration` gate, C4): the authored screen-space
 * amplitude a pack can reach, measured from its own tracks.
 */
export function packAmplitude(pack: PerformancePack): Readonly<{
  worldX: number;
  worldY: number;
  worldZ: number;
  tilt: number;
}> {
  const amp = (ch: PackChannelId): number => {
    const track = pack.channels[ch];
    if (!track || track.keys.length < 2) return 0;
    let min = Infinity;
    let max = -Infinity;
    for (const k of track.keys) {
      if (k.v < min) min = k.v;
      if (k.v > max) max = k.v;
    }
    return max - min;
  };
  return Object.freeze({
    worldX: amp("world_x"),
    worldY: amp("world_y"),
    worldZ: amp("world_z"),
    tilt: amp("tilt"),
  });
}

/** Pack duration read-back (convenience over the frozen field). */
export function packDuration(pack: PerformancePack): number {
  return pack.durationSeconds;
}

/** The longest channel span — authoring aid for beat alignment. */
export function packChannelSpan(pack: PerformancePack): number {
  let span = 0;
  for (const track of Object.values(pack.channels)) {
    if (track) span = Math.max(span, curveTrackDuration(track));
  }
  return span;
}

/**
 * The hold law (`limited-animation-hold` — Doctrine 5, S5). Stillness is
 * never void: it is either a declared hold (an event with intent) or a lie.
 * Bidirectional, sampled on the pose channels (world_x/y/z — place, not
 * internal prep: squash/tilt may move inside a hold):
 *
 *  1. every DECLARED hold must actually be still (speed < eps everywhere
 *     inside its window) — a flagged hold that moves is a lie;
 *  2. every STILLNESS at or above `minHoldSeconds` must be covered by a
 *     declared hold — an unflagged hold is stillness pretending to be void.
 *
 * The law runs on authored (splined) packs. Blocking derivations are exempt
 * at the craft-gate wiring: stepped tangents turn every interval into a
 * hold-or-jump, and the blocking grammar inherits its base pack's declared
 * holds by construction.
 */
export const PACK_HOLD_LAW = Object.freeze({
  /** Below this pose speed (world units/s) the body reads as still. */
  stillSpeedEps: 2,
  /** A stillness shorter than this is a pause, not a hold. */
  minHoldSeconds: 0.35,
  /** Sampling density of the stillness scan. */
  samplesPerSecond: 32,
  /** Detection ↔ declaration match tolerance at the window edges. */
  coverageTolSeconds: 0.05,
});

export function validateHoldStillness(
  pack: PerformancePack,
  opts: {
    stillSpeedEps?: number;
    minHoldSeconds?: number;
    samplesPerSecond?: number;
    coverageTolSeconds?: number;
  } = {},
): ArcPhaseReport {
  const violations: string[] = [];
  const eps = Math.max(0.01, opts.stillSpeedEps ?? PACK_HOLD_LAW.stillSpeedEps);
  const minHold = Math.max(0.05, opts.minHoldSeconds ?? PACK_HOLD_LAW.minHoldSeconds);
  const sps = Math.max(4, opts.samplesPerSecond ?? PACK_HOLD_LAW.samplesPerSecond);
  const tol = Math.max(0, opts.coverageTolSeconds ?? PACK_HOLD_LAW.coverageTolSeconds);

  const xs = pack.channels.world_x ?? null;
  const ys = pack.channels.world_y ?? null;
  const zs = pack.channels.world_z ?? null;
  const speedAt = (t: number): number => {
    const vx = xs ? evaluateCurveTrackDerivative(xs, t) : 0;
    const vy = ys ? evaluateCurveTrackDerivative(ys, t) : 0;
    const vz = zs ? evaluateCurveTrackDerivative(zs, t) : 0;
    return Math.hypot(vx, vy, vz);
  };

  const dt = 1 / sps;
  const duration = pack.durationSeconds;

  // 2. the stillness scan — maximal runs of still samples become windows.
  let runStart = -1;
  let runCount = 0;
  const windows: Array<{ t0: number; t1: number }> = [];
  const n = Math.max(1, Math.floor(duration / dt));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) * dt;
    const still = speedAt(t) < eps;
    if (still) {
      if (runCount === 0) runStart = t;
      runCount++;
    } else if (runCount > 0) {
      windows.push({ t0: runStart - dt / 2, t1: t - dt / 2 });
      runCount = 0;
    }
  }
  if (runCount > 0) windows.push({ t0: runStart - dt / 2, t1: duration });

  for (const w of windows) {
    if (w.t1 - w.t0 < minHold) continue;
    const covered = pack.holds.some(
      (h) => w.t0 >= h.t0 - tol && w.t1 <= h.t1 + tol,
    );
    if (!covered) {
      violations.push(
        `unflagged hold ${w.t0.toFixed(2)}–${w.t1.toFixed(2)}s — stillness is an event, declare it with an intent (Doctrine 5)`,
      );
    }
  }

  // 1. declared holds must be still.
  for (const h of pack.holds) {
    const m = Math.max(1, Math.ceil((h.t1 - h.t0) / dt));
    for (let i = 0; i < m; i++) {
      const t = h.t0 + ((i + 0.5) * (h.t1 - h.t0)) / m;
      if (speedAt(t) >= eps) {
        violations.push(
          `hold ${h.id} moves (${speedAt(t).toFixed(1)} u/s at t=${t.toFixed(2)}s) — a flagged hold must be still`,
        );
        break;
      }
    }
  }

  return { ok: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// The meaning manifest (Doctrine 5 — the capture-side rubric read, S7)
// ---------------------------------------------------------------------------

export type PackMeaningManifest = Readonly<{
  packId: string;
  sceneValueTurn: PackValueTurn;
  beats: readonly Readonly<{
    id: string;
    t0: number;
    t1: number;
    shotScale: PackShotScale;
    objective: string;
    primaryIdea: string;
    valueTurn: string;
  }>[];
  holds: readonly PackHold[];
}>;

/**
 * The pack's meaning as a manifest — pure read-back of the Doctrine 5
 * fields. The S7 capture drive deposits this beside each capture: the
 * machine proofs say what moved; the manifest says why.
 */
export function packMeaningManifest(pack: PerformancePack): PackMeaningManifest {
  return Object.freeze({
    packId: pack.id,
    sceneValueTurn: pack.valueTurn,
    beats: Object.freeze(
      pack.beats.map((b) =>
        Object.freeze({
          id: b.id,
          t0: b.t0,
          t1: b.t1,
          shotScale: b.shotScale,
          objective: b.objective,
          primaryIdea: b.primaryIdea,
          valueTurn: b.valueTurn,
        }),
      ),
    ),
    holds: pack.holds,
  });
}
