/**
 * GASPER-CRAFT-001 · C5 — CraftPacks: the shipped craft performances.
 *
 * Canon: `animatic-beat-sheet`, `review-gate-phases`, `timing`,
 * `limited-animation-hold` (research/canon/anim-physics).
 *
 * A craft pack is the graph-editor session as authored data (the JSONs in
 * ./packs): a beat sheet (beginning/middle/end, one primary idea per beat,
 * a value turn), a segment map, the channel curves, and AU-named face
 * beats. `compileCraftPack` lowers the raw manifest fail-closed:
 *
 *  1. face beats compile through `compileFaceBeats` onto the scalar `face`
 *     carrier (the only legal source of the face channel);
 *  2. channels + beats + segments + meaning compile through
 *     `compilePerformancePack` (Doctrine 5: beat objectives, the scene's
 *     value turn, flagged holds — fail closed at the core compiler);
 *  3. the craft gate suite runs — shot scales, arc phase, depth legibility
 *     (D-0099 Doctrine 1: the camera never moves, so every beat's authored
 *     depth must land the body inside the beat's shot-scale band — the
 *     successor of the retired C4 amplitude floors), silhouette headroom
 *     (volume law exact inside the fence — no clamp may engage), world
 *     bounds at each key's own depth, beat-sheet coverage, segment coverage,
 *     home-to-home, face-beat objective references (every expression serves
 *     a beat — Doctrine 5), and the hold-stillness law (stillness is an
 *     event: declared holds are still, stillness ≥ the budget is declared —
 *     base packs only; blocking inherits its base's holds by construction).
 *
 * Any violation rejects the pack — a bad pack never reaches the organism.
 *
 * Review-gate idiom (we eat our own medicine): every pack also ships a
 * `…/blocking` derivation — the SAME keys, beats and timings with every
 * tangent forced to `stepped`. Blocking is reviewed in captures before the
 * spline polish is trusted.
 */
import { PHYSICS_CHANNEL_BOUNDS } from "../physics/PhysicsSilhouetteAuthority";
import { WORLD_SPACE_CONSTANTS, worldBoundsAt } from "../space/WorldSpace";
import { compileFaceBeats, type FaceBeat } from "./FaceBeats";
import {
  compilePerformancePack,
  hashPackContent,
  validateArcPhase,
  validateHoldStillness,
  type PerformancePack,
} from "./PerformancePack";
import {
  validateDepthLegibility,
  validatePerformanceShotScales,
} from "./ShotDirector";
import { evaluateCurveTrack, type CurveKey } from "./CurveTrack";
import s2BounceBlockingRaw from "./packs/s2-bounce.blocking.json";
import s2BounceRaw from "./packs/s2-bounce.json";
import s4CometBlockingRaw from "./packs/s4-comet.blocking.json";
import s4CometRaw from "./packs/s4-comet.json";

/**
 * The authoring body height the floor gates measure against (content px).
 *
 * Amendment 1 (live measurement 2026-08-04, D-0097): the Phase A plan text
 * documented "~60 content-px body ≈ 480 world units", but the live
 * presence-settled #idleRig bbox measures 211.9 content px — at
 * unitsPerContentPx 8 the 1920-unit world is 1.43 body-widths wide, not 4.
 *
 * Amendment 2 (live measurement 2026-08-04, D-0098): the 211.9 #idleRig read
 * was itself falsified — the rig bbox is polluted by decorative layers that
 * are CLIPPED to the body but geometrically overflow it (subsurface-band
 * ellipses: invisible outside the clip, yet 790×541 in getBBox; the 211.9
 * read was deterministic only while that overflow happened to dominate).
 * The true silhouette is the projected body contour — the #bodyClip path the
 * renderer rewrites every frame. Live presence-settled contour height
 * breathes 149.3–157.4px; the anchor is the breath-midpoint rounded 153.
 * Under the Monitor Doctrine (D-0099/D-0100) the anchor is the reference
 * the depth law's on-screen sizes read against (S4 place + the S7 depth-read
 * capture gate). Residual carried to the owner: restoring the "desk, not
 * stadium" doctrine (world ≈ 4 body-widths) means re-scaling
 * unitsPerContentPx — a Phase A constant change beyond C5 authority.
 */
export const CRAFT_AUTHORING_BODY_HEIGHT_PX = 153;

/**
 * The craft pack's authored movement class. S3 (Doctrine 1): no longer an
 * alias of the retired amplitude-floor intents — the floors were a live
 * framing law; intent survives as pack metadata (the S5 meaning schema
 * builds on it).
 */
export type CraftPackIntent = "bounce" | "comet";

const CRAFT_PACK_INTENT_SET: ReadonlySet<string> = new Set(["bounce", "comet"]);

export type CraftPackCompileResult = Readonly<{
  pack: PerformancePack | null;
  errors: readonly string[];
}>;

export type CraftBaseResolver = (baseId: string) => unknown;

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

type GateReport = { ok: boolean; violations: string[] };

/**
 * Silhouette headroom: every authored stretch/squash key must sit inside
 * PHYSICS_CHANNEL_BOUNDS AND leave the volume-derived width inside its
 * bounds too — the driver derives width as 1/(1+h)−1 (Sx·Sy = 1), and a
 * clamp engagement would break the volume law at runtime.
 */
export function craftSilhouetteHeadroom(pack: PerformancePack): GateReport {
  const violations: string[] = [];
  const hb = PHYSICS_CHANNEL_BOUNDS.overall_height;
  const wb = PHYSICS_CHANNEL_BOUNDS.overall_width;
  const fb = PHYSICS_CHANNEL_BOUNDS.ground_flattening;
  const stretch = pack.channels.stretch;
  if (stretch) {
    for (const k of stretch.keys) {
      if (k.v < hb.min || k.v > hb.max) {
        violations.push(
          `stretch ${k.v} at t=${k.t}s outside overall_height bounds [${hb.min}, ${hb.max}]`,
        );
        continue;
      }
      const w = 1 / Math.max(0.05, 1 + k.v) - 1; // volume law, driver idiom
      if (w < wb.min || w > wb.max) {
        violations.push(
          `stretch ${k.v} at t=${k.t}s derives width ${w.toFixed(3)} outside [${wb.min}, ${wb.max}] — the clamp would break Sx·Sy=1`,
        );
      }
    }
  }
  const squash = pack.channels.squash;
  if (squash) {
    for (const k of squash.keys) {
      if (k.v < fb.min || k.v > fb.max) {
        violations.push(
          `squash ${k.v} at t=${k.t}s outside ground_flattening bounds [${fb.min}, ${fb.max}]`,
        );
      }
    }
  }
  return { ok: violations.length === 0, violations };
}

/**
 * World bounds — DEPTH-AWARE (D-0099 Doctrine 2): pose keys stay inside the
 * FRUSTUM AT THEIR OWN DEPTH. The space is wider in the distance and narrower
 * at the glass: each world_x/world_y key is judged against
 * `worldBoundsAt(z)` with z sampled from the world_z channel at the key's
 * time (home depth when no world_z channel exists). world_z keys must stay
 * inside the depth fence [zNear (the monitor glass), zFar (the far fade)].
 */
export function craftWorldBounds(pack: PerformancePack): GateReport {
  const violations: string[] = [];
  const c = WORLD_SPACE_CONSTANTS;
  const tiltMax = c.maxTiltDeg;
  const zTrack = pack.channels.world_z ?? null;
  const depthAt = (t: number) => (zTrack ? evaluateCurveTrack(zTrack, t) : 0);
  const check = (name: string, k: CurveKey, lo: number, hi: number) => {
    if (k.v < lo || k.v > hi) {
      violations.push(`${name} ${k.v} at t=${k.t}s outside [${lo}, ${hi}]`);
    }
  };
  for (const k of pack.channels.world_z?.keys ?? []) {
    check("world_z", k, c.zNear, c.zFar);
  }
  for (const k of pack.channels.world_x?.keys ?? []) {
    const b = worldBoundsAt(depthAt(k.t));
    check("world_x", k, -Math.round(b.xHalf * 100) / 100, Math.round(b.xHalf * 100) / 100);
  }
  for (const k of pack.channels.world_y?.keys ?? []) {
    const b = worldBoundsAt(depthAt(k.t));
    check("world_y", k, 0, Math.round(b.yMax * 100) / 100);
  }
  for (const k of pack.channels.tilt?.keys ?? []) check("tilt", k, -tiltMax, tiltMax);
  return { ok: violations.length === 0, violations };
}

/**
 * Beat-sheet coverage (`animatic-beat-sheet` + `limited-animation-hold`):
 * the sheet spans the whole pack with no gaps — no void time. Every beat
 * carries its primary idea and value turn.
 */
export function craftBeatSheetCoverage(pack: PerformancePack): GateReport {
  const violations: string[] = [];
  const beats = pack.beats;
  if (beats.length === 0) {
    return { ok: false, violations: ["beat sheet is empty — no void packs"] };
  }
  if (beats[0].t0 > 1e-6) violations.push("beat sheet starts after t=0 — void at the top");
  let prevEnd = beats[0].t0;
  for (const b of beats) {
    if (b.t0 > prevEnd + 1e-6) {
      violations.push(`beat sheet gap ${prevEnd.toFixed(2)}–${b.t0.toFixed(2)}s — void time`);
    }
    prevEnd = Math.max(prevEnd, b.t1);
    if (!b.primaryIdea.trim()) violations.push(`beat ${b.id}: missing primaryIdea`);
    if (!b.valueTurn.trim()) violations.push(`beat ${b.id}: missing valueTurn`);
  }
  if (prevEnd < pack.durationSeconds - 1e-6) {
    violations.push("beat sheet ends before pack duration — void at the tail");
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Segment-map coverage + authorship law: segments tile the pack, and every
 * segment is authored — a craft pack is self-contained on the curve
 * authority (a physics-mode segment would yield the pose channel and
 * silently freeze, since no physics driver is armed under a craft pack).
 */
export function craftSegmentCoverage(pack: PerformancePack): GateReport {
  const violations: string[] = [];
  const segs = pack.segments;
  if (segs.length === 0) {
    return { ok: false, violations: ["segment map is empty"] };
  }
  if (segs[0].t0 > 1e-6) violations.push("segments start after t=0");
  let prevEnd = segs[0].t0;
  for (const s of segs) {
    if (s.t0 > prevEnd + 1e-6) {
      violations.push(`segment gap ${prevEnd.toFixed(2)}–${s.t0.toFixed(2)}s`);
    }
    prevEnd = Math.max(prevEnd, s.t1);
    if (s.mode !== "authored") {
      violations.push(
        `segment ${s.t0.toFixed(2)}–${s.t1.toFixed(2)}s is ${s.mode}-mode — craft packs are curve-authority self-contained`,
      );
    }
  }
  if (prevEnd < pack.durationSeconds - 1e-6) {
    violations.push("segments end before pack duration");
  }
  return { ok: violations.length === 0, violations };
}

/** Home-to-home (D-0089): the first and last pose keys sit at home. */
export function craftEndsHome(pack: PerformancePack): GateReport {
  const violations: string[] = [];
  for (const name of ["world_x", "world_y"] as const) {
    const track = pack.channels[name];
    if (!track || track.keys.length === 0) {
      violations.push(`${name} missing — a craft pack must pose itself`);
      continue;
    }
    const first = track.keys[0];
    const last = track.keys[track.keys.length - 1];
    if (Math.abs(first.v) > 1e-6) violations.push(`${name} starts at ${first.v}, not home`);
    if (Math.abs(last.v) > 1e-6) violations.push(`${name} ends at ${last.v}, not home`);
  }
  return { ok: violations.length === 0, violations };
}

/**
 * Face-beat objective references (Doctrine 5, S5): emotion is the RESULT of
 * pursuing an objective — every face beat serves exactly one beat of the
 * sheet. The `beatId` field is required at FaceBeats compile; here the
 * reference resolves: the named beat exists, and the expression's onset
 * starts inside the beat it serves (the decay may carry past the beat's
 * end — an emotion outlives its cause). Secondary action supports the main
 * action (`twelve-principles-1981`); it does not float free of it.
 */
export function craftFaceBeatObjectives(
  pack: PerformancePack,
  faceBeats: readonly FaceBeat[],
): GateReport {
  const violations: string[] = [];
  for (const fb of faceBeats) {
    const beat = pack.beats.find((b) => b.id === fb.beatId);
    if (!beat) {
      violations.push(
        `face beat ${fb.id}: beatId "${fb.beatId}" resolves to no beat — an expression must serve an existing beat's objective`,
      );
      continue;
    }
    if (fb.t0 < beat.t0 - 1e-6 || fb.t0 >= beat.t1) {
      violations.push(
        `face beat ${fb.id}: onset t=${fb.t0}s starts outside the beat it serves (${beat.id} ${beat.t0}–${beat.t1}s)`,
      );
    }
  }
  return { ok: violations.length === 0, violations };
}

const steppedKey = (k: CurveKey): CurveKey => ({ ...k, out: "stepped" });

/**
 * Compile a raw craft-pack manifest into a PerformancePack — fail closed.
 * Derived manifests (a `base` id + `tangentMode: "stepped"`) inherit the
 * base's authored content and force every tangent to stepped (the blocking
 * review pass). Derived manifests may NOT add authored content of their
 * own — author the base instead.
 */
export function compileCraftPack(
  raw: unknown,
  opts: { resolveBase?: CraftBaseResolver } = {},
): CraftPackCompileResult {
  const errors: string[] = [];
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const resolveBase = opts.resolveBase ?? registryResolver;

  // --- derivation (blocking variants) -------------------------------------
  let source: Record<string, unknown> = r;
  if (r.base !== undefined) {
    const baseId = typeof r.base === "string" && r.base.length > 0 ? r.base : null;
    if (!baseId) return { pack: null, errors: ["derived pack: base must be a non-empty id"] };
    const baseRaw = resolveBase(baseId);
    const b = (baseRaw && typeof baseRaw === "object" ? baseRaw : null) as Record<
      string,
      unknown
    > | null;
    if (!b) return { pack: null, errors: [`derived pack: unknown base "${baseId}"`] };
    if (b.base !== undefined) {
      return { pack: null, errors: [`derived pack: base "${baseId}" is itself derived`] };
    }
    for (const key of Object.keys(r)) {
      if (!["id", "base", "tangentMode", "note"].includes(key)) {
        return {
          pack: null,
          errors: [`derived pack declares "${key}" — author the base pack instead`],
        };
      }
    }
    if (r.tangentMode !== "stepped") {
      return {
        pack: null,
        errors: [`derived pack: tangentMode must be "stepped" (blocking), got ${JSON.stringify(r.tangentMode)}`],
      };
    }
    source = b;
  }
  const blocking = r.base !== undefined;

  // --- manifest fields -----------------------------------------------------
  const id = typeof r.id === "string" && r.id.length > 0 ? r.id : null;
  if (!id) errors.push("craft pack id missing");
  if (blocking && id === (source.id as unknown)) {
    errors.push("derived pack id must differ from its base");
  }

  const intent =
    typeof source.intent === "string" && CRAFT_PACK_INTENT_SET.has(source.intent)
      ? (source.intent as CraftPackIntent)
      : null;
  if (!intent) {
    errors.push(`craft pack intent must be one of bounce|comet (got ${JSON.stringify(source.intent)})`);
  }

  const duration = finiteOr(source.durationSeconds, NaN);
  if (!Number.isFinite(duration) || duration <= 0) {
    return { pack: null, errors: [...errors, "durationSeconds must be a positive finite number"] };
  }

  // --- face beats → the face carrier ---------------------------------------
  const authoredChannels =
    source.channels && typeof source.channels === "object"
      ? { ...(source.channels as Record<string, unknown>) }
      : {};
  if ("face" in authoredChannels) {
    errors.push("face channel authored — the face carrier is compiled from faceBeats");
  }
  delete authoredChannels.face;
  const face = compileFaceBeats(source.faceBeats ?? [], duration);
  if (face.track === null) {
    errors.push(...face.errors.map((e) => `faceBeats: ${e}`));
  }

  // --- blocking tangent forcing ---------------------------------------------
  if (blocking) {
    for (const [name, keys] of Object.entries(authoredChannels)) {
      if (!Array.isArray(keys)) continue;
      authoredChannels[name] = keys.map((k) => {
        const rk = (k && typeof k === "object" ? k : {}) as Record<string, unknown>;
        return { ...rk, out: "stepped" };
      });
    }
  }

  // --- pack compile ----------------------------------------------------------
  const compiled = compilePerformancePack({
    ...source,
    id,
    channels: authoredChannels,
  });
  errors.push(...compiled.errors);
  if (compiled.pack === null || face.track === null || errors.length > 0) {
    return { pack: null, errors };
  }

  // Merge the face carrier (blocking forces it stepped too) and re-hash:
  // the shipped hash covers the merged content (face + meaning included).
  const faceTrack = blocking
    ? { keys: Object.freeze(face.track.keys.map(steppedKey)) }
    : face.track;
  const channels = Object.freeze({ ...compiled.pack.channels, face: faceTrack });
  const pack: PerformancePack = Object.freeze({
    ...compiled.pack,
    channels,
    hash: hashPackContent({
      durationSeconds: compiled.pack.durationSeconds,
      channels,
      beats: compiled.pack.beats,
      segments: compiled.pack.segments,
      valueTurn: compiled.pack.valueTurn,
      holds: compiled.pack.holds,
    }),
  });

  // --- the craft gate suite (fail closed) ------------------------------------
  const shotScales = validatePerformanceShotScales(pack);
  errors.push(...shotScales.violations);

  const arcPhase = validateArcPhase(pack);
  errors.push(...arcPhase.violations);

  // Depth legibility (D-0099 Doctrine 1, S3): the camera never moves, so a
  // beat's shot scale IS its authored depth — every beat must land the body
  // inside its band at the beat's own world_z. Successor of the retired C4
  // amplitude floors (a live framing law — the camera that framed them no
  // longer exists).
  const legibility = validateDepthLegibility(pack);
  errors.push(...legibility.violations);

  errors.push(...craftSilhouetteHeadroom(pack).violations);
  errors.push(...craftWorldBounds(pack).violations);
  errors.push(...craftBeatSheetCoverage(pack).violations);
  errors.push(...craftSegmentCoverage(pack).violations);
  errors.push(...craftEndsHome(pack).violations);

  // Doctrine 5 (S5) meaning rubric — wired fail-closed: every expression
  // serves a beat's objective; stillness is an event (declared holds are
  // still, stillness ≥ the budget is declared). The hold law runs on the
  // AUTHORED pack only — blocking is the stepped review artifact of the
  // base's holds, exempt by construction (its tangents turn every interval
  // into hold-or-jump).
  errors.push(...craftFaceBeatObjectives(pack, face.beats).violations);
  if (!blocking) {
    errors.push(...validateHoldStillness(pack).violations);
  }

  if (errors.length > 0) return { pack: null, errors };
  return { pack, errors: [] };
}

// ---------------------------------------------------------------------------
// The shipped registry
// ---------------------------------------------------------------------------

const CRAFT_PACK_REGISTRY_RAW: Readonly<Record<string, unknown>> = Object.freeze({
  "s2-bounce": s2BounceRaw,
  "s2-bounce/blocking": s2BounceBlockingRaw,
  "s4-comet": s4CometRaw,
  "s4-comet/blocking": s4CometBlockingRaw,
});

const registryResolver: CraftBaseResolver = (baseId) =>
  CRAFT_PACK_REGISTRY_RAW[baseId] ?? null;

const compileCache = new Map<string, CraftPackCompileResult>();

function compileEntry(id: string): CraftPackCompileResult {
  const cached = compileCache.get(id);
  if (cached) return cached;
  const raw = CRAFT_PACK_REGISTRY_RAW[id];
  const result =
    raw === undefined
      ? { pack: null, errors: [`unknown craft pack "${id}"`] }
      : compileCraftPack(raw);
  compileCache.set(id, result);
  return result;
}

/** The compiled craft pack for an id — null when unknown or gate-rejected. */
export function getCraftPack(id: string): PerformancePack | null {
  return compileEntry(id).pack;
}

/** Compile errors for an id (empty when the pack is clean). */
export function getCraftPackErrors(id: string): readonly string[] {
  return compileEntry(id).errors;
}

/** The shipped craft-pack ids. */
export function listCraftPacks(): readonly string[] {
  return Object.keys(CRAFT_PACK_REGISTRY_RAW);
}
