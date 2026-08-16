/**
 * GASPER-SCENE-001 — Embodiment Scene Suites (owner directive 2026-08-03).
 * GASPER-SCENE-002 — Stage 2 re-leverage (2026-08-03, worker qwen-vec001).
 *
 * The three-beat grammar is the micro-law of transitions; a scene suite is the
 * macro-law of holds. Each embodiment owns a long-form authored timeline
 * (>= 12s; presence and singularity >= 20s) composed of movements with
 * in/during/out intent. Movements carry channel curves over normalized time,
 * sampled deterministically from the organism clock — pure: no RAF, timer,
 * GSAP tween, DOM write, or random source is allowed here.
 *
 * A state is a sentence; a suite is the paragraph the embodiment performs
 * while holding it. State supplies intent; the suite supplies performance.
 * Suite output is bounded additive modulation folded into living channels —
 * it never owns topology, face authority, morph routes, or beat ordering.
 *
 * SCENE-002 LEVERAGE LAW (research/proofs/gasper-scene-002/channel-leverage.json):
 * the production living path (FormMaster via filterLegacyEndpointValues) fences
 * overall_width/overall_height and drops ground_flattening; the controller
 * clobbers `motion` with a fixed gain. The CONTINUITY LAW requires every
 * movement to carry each live channel from the previous movement's terminal
 * value (no pops at movement boundaries), and every loop to end at zero so
 * entrance keying is jump-safe.
 *
 * SCENE-003 / D-0088 (owner-approved fence change, 2026-08-03): the scene
 * path earns a SCENE-SCOPED SILHOUETTE ADMISSION. overall_width /
 * overall_height / ground_flattening remain fenced for every other living
 * source, but a suite that authors them carries provenance-tagged absolute
 * values (base + bound-clamped delta) through admitSceneSilhouetteValues.
 * Budgets stay tight (SUITE_CHANNEL_BOUNDS) and are re-clamped at the fence
 * boundary; `motion` stays forbidden (controller-clobbered). Suites also keep
 * the admitted levers — crown_height, lower_body_fullness, wide, low, asym,
 * body_lean, posture_x/posture_y — plus eye_openness (N3 aperture authority)
 * and the light/dynamics channels.
 */

import type { DomainScalarMap } from "../GasperDomainState";

export type SceneIntent = "in" | "during" | "out";

/** Normalized-time keyframes within a movement: [t01, additiveDelta][]. */
export type SceneCurve = ReadonlyArray<readonly [number, number]>;

export type SceneMovement = Readonly<{
  id: string;
  intent: SceneIntent;
  /** Start within the suite loop, seconds. */
  startSeconds: number;
  durationSeconds: number;
  /** Bounded additive channel deltas over movement-normalized time. */
  channels: Readonly<Record<string, SceneCurve>>;
}>;

export type EmbodimentSceneSuite = Readonly<{
  id: string;
  /** Profile grammar id this suite performs under. */
  embodimentId: string;
  loopSeconds: number;
  movements: readonly SceneMovement[];
}>;

export type SceneSuiteSample = Readonly<{
  suiteId: string;
  movementId: string;
  intent: SceneIntent;
  /** 0..1 position within the suite loop. */
  loopT: number;
  /** 0..1 position within the active movement. */
  movementT: number;
  /** Bounded additive deltas (zero under reduced motion). */
  deltas: Readonly<Record<string, number>>;
}>;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function smooth01(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/** Sample a normalized-time curve with smoothstep segments. */
export function sampleSceneCurve(curve: SceneCurve, t01: number): number {
  if (curve.length === 0) return 0;
  const t = clamp(t01, 0, 1);
  let prev: readonly [number, number] = curve[0]!;
  if (t <= prev[0]) return prev[1];
  for (let i = 1; i < curve.length; i++) {
    const next = curve[i]!;
    if (t <= next[0]) {
      const span = Math.max(1e-6, next[0] - prev[0]);
      const k = smooth01((t - prev[0]) / span);
      return prev[1] + (next[1] - prev[1]) * k;
    }
    prev = next;
  }
  return prev[1];
}

const mv = (
  id: string,
  intent: SceneIntent,
  startSeconds: number,
  durationSeconds: number,
  channels: Record<string, SceneCurve>,
): SceneMovement =>
  Object.freeze({ id, intent, startSeconds, durationSeconds, channels: Object.freeze(channels) });

// ── SCENE-002 rubric machinery (pure, unit-tested) ───────────────────────

/**
 * Channels a suite must never author on the production living path.
 * `motion` is clobbered by the controller's compatibility gain
 * (GasperRigController: eightStateLivingMotionGain) whenever the packet
 * carries no unified_time_seconds — the loop emits none, so suite motion
 * deltas never reach pixels. The silhouette channels left this set in D-0088
 * (scene-scoped admission; see SCENE_SUITE_SILHOUETTE_CHANNELS).
 */
export const SUITE_FORBIDDEN_CHANNELS: ReadonlySet<string> = Object.freeze(
  new Set(["motion"]),
);

/**
 * D-0088: silhouette channels a scene suite may author. They stay FENCED for
 * every other living source (filterLegacyEndpointValues); the scene path
 * carries provenance-tagged absolute values (see sceneSilhouetteAdmission and
 * admitSceneSilhouetteValues in controller/legacyFormMasterPolicy).
 */
export const SCENE_SUITE_SILHOUETTE_CHANNELS = [
  "overall_width",
  "overall_height",
  "ground_flattening",
] as const;

/** Per-channel bound for suite additive deltas (the rubric's budget law). */
export const SUITE_CHANNEL_BOUNDS: Readonly<Record<string, number>> = Object.freeze({
  posture_x: 5, // px translation
  posture_y: 4, // px translation
  // D-0088 scene-scoped silhouette admission: tight budgets far below
  // state-scale morphs (leverage: ~11–27px contour displacement per 0.25).
  // Re-clamped at the admission fence boundary.
  overall_height: 0.1,
  overall_width: 0.08,
  ground_flattening: 0.4,
  crown_height: 0.2,
  lower_body_fullness: 0.2,
  wide: 0.12,
  low: 0.15,
  asym: 0.28,
  body_lean: 0.34,
  gaze: 0.22,
  eye_openness: 0.2,
  eye_spacing: 0.05,
  energy_level: 0.25,
  energy_pulse: 0.25,
  energy_lag: 0.25,
  energy_occlusion: 0.2,
  internal_glow: 0.28,
  face_emissive: 0.2,
  relief_amplitude: 0.12,
  relief_motion_coupling: 0.12,
  skin_tension: 0.2,
  rebound: 0.25,
  secondary_lag: 0.18,
  inertia: 0.18,
  settling: 0.15,
});

/**
 * D-0088 scene-scoped silhouette admission: the exact absolute values
 * (living base + bound-clamped scene delta) the active sample authors on the
 * silhouette channels. Empty when the suite authors no silhouette beat this
 * frame — the FormMaster fence stays closed for every other source.
 * Defense-in-depth: deltas are re-clamped to SUITE_CHANNEL_BOUNDS here at the
 * fence boundary, independent of authoring-time gates.
 */
export function sceneSilhouetteAdmission(
  baseValues: Readonly<Record<string, number>>,
  deltas: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const ch of SCENE_SUITE_SILHOUETTE_CHANNELS) {
    const delta = deltas[ch];
    if (typeof delta !== "number" || !Number.isFinite(delta)) continue;
    const bound = SUITE_CHANNEL_BOUNDS[ch] ?? 0;
    const clamped = clamp(delta, -bound, bound);
    if (Math.abs(clamped) < 1e-4) continue;
    const base = baseValues[ch];
    if (typeof base !== "number" || !Number.isFinite(base)) continue;
    out[ch] = base + clamped;
  }
  return out;
}

export type SceneRubricIssue = Readonly<{ rule: string; detail: string }>;

/**
 * Channel-vocabulary gate: no forbidden channels; every authored channel has a
 * declared bound. Machine gate of the scene rubric (GASPER-SCENE-002 §2.2/§2.3).
 */
export function sceneSuiteChannelAudit(suite: EmbodimentSceneSuite): SceneRubricIssue[] {
  const issues: SceneRubricIssue[] = [];
  for (const m of suite.movements) {
    for (const [ch, curve] of Object.entries(m.channels)) {
      if (SUITE_FORBIDDEN_CHANNELS.has(ch)) {
        issues.push({
          rule: "forbidden-channel",
          detail: `${suite.id}:${m.id} authors ${ch} — dead or clobbered on the living path`,
        });
      }
      if (!(ch in SUITE_CHANNEL_BOUNDS)) {
        issues.push({
          rule: "unbounded-channel",
          detail: `${suite.id}:${m.id} authors ${ch} with no declared bound`,
        });
      }
      for (const [, v] of curve) {
        const bound = SUITE_CHANNEL_BOUNDS[ch] ?? 0.35;
        if (Math.abs(v) > bound) {
          issues.push({
            rule: "bound-exceeded",
            detail: `${suite.id}:${m.id}:${ch} keyframe ${v} exceeds bound ${bound}`,
          });
        }
      }
    }
  }
  return issues;
}

/**
 * EYES-OPEN HARD GATE (GASPER-SCENE-002 §2.3): a face-bearing suite must show
 * readable open-eye beats, never suite-driven eye closing.
 *  - at least one movement peaks eye_openness delta >= 0.1 ("legible open beat");
 *  - that beat sustains delta >= 0.06 for >= 30% of its movement's duration;
 *  - no movement authors eye_openness delta below -0.03 (the aperture rest and
 *    blink grammar stay loop-owned; suites only lift).
 */
export function sceneSuiteEyesOpenGate(suite: EmbodimentSceneSuite): SceneRubricIssue[] {
  const issues: SceneRubricIssue[] = [];
  let openBeat = false;
  for (const m of suite.movements) {
    const curve = m.channels.eye_openness;
    if (!curve) continue;
    for (const [, v] of curve) {
      if (v < -0.03) {
        issues.push({
          rule: "eyes-driven-closed",
          detail: `${suite.id}:${m.id} authors eye_openness ${v} < -0.03`,
        });
      }
    }
    const peak = Math.max(...curve.map(([, v]) => v));
    if (peak >= 0.1) {
      // Sustained fraction: sample the curve and measure time above 0.06.
      const SAMPLES = 64;
      let above = 0;
      for (let i = 0; i <= SAMPLES; i++) {
        if (sampleSceneCurve(curve, i / SAMPLES) >= 0.06) above += 1;
      }
      if (above / (SAMPLES + 1) >= 0.3) openBeat = true;
    }
  }
  if (!openBeat) {
    issues.push({
      rule: "no-open-eye-beat",
      detail: `${suite.id} has no sustained eye_openness beat (peak >= 0.1 held >= 30% of a movement)`,
    });
  }
  return issues;
}

/**
 * CONTINUITY LAW: no pops at movement boundaries. Each channel's terminal
 * value in movement N must equal its opening value in movement N+1 (absent
 * channels open at 0, so a live channel must be carried or returned to zero).
 * Loop end must return to ~zero so entrance keying is jump-safe.
 */
export function sceneSuiteContinuityGate(suite: EmbodimentSceneSuite): SceneRubricIssue[] {
  const issues: SceneRubricIssue[] = [];
  const tol = (ch: string) => (ch === "posture_x" || ch === "posture_y" ? 0.25 : 0.02);
  const movements = suite.movements;
  for (let i = 0; i < movements.length; i++) {
    const cur = movements[i]!;
    const next = movements[(i + 1) % movements.length]!;
    const isWrap = i === movements.length - 1;
    for (const [ch, curve] of Object.entries(cur.channels)) {
      const terminal = sampleSceneCurve(curve, 1);
      const opening = next.channels[ch] ? sampleSceneCurve(next.channels[ch]!, 0) : 0;
      if (Math.abs(terminal - opening) > tol(ch)) {
        issues.push({
          rule: isWrap ? "loop-end-not-zero" : "boundary-pop",
          detail: `${suite.id} ${cur.id}→${next.id}:${ch} jumps ${terminal.toFixed(3)} → ${opening.toFixed(3)}`,
        });
      }
    }
  }
  return issues;
}

/**
 * ENTRANCE KEYING (GASPER-SCENE-002 §2.2): the scene boundary aligns to a
 * state entry. When the suite is performing its exit (wrapped time inside the
 * final "out" movement), a state entry may open the next scene — the anchor
 * resets so the new scene's "in" begins with the new state. Mid-arc the suite
 * flows across states untouched (the macro-law of holds).
 */
export function shouldKeySceneEntrance(
  suite: EmbodimentSceneSuite,
  wrappedSeconds: number,
): boolean {
  const loop = Math.max(1e-6, suite.loopSeconds);
  const wrapped = ((wrappedSeconds % loop) + loop) % loop;
  const last = suite.movements[suite.movements.length - 1]!;
  return wrapped >= last.startSeconds;
}

/**
 * PRESENCE — "Awareness" (20s). A full display, honoring the locked beat
 * frequencies: arrive (visible descent + hush) → orient (posture sweeps, mass
 * follows attention) → regard (lift, eyes open, interior light rises) →
 * spark-echo (recognition dilation + crown crest) → home (settle to a changed
 * rest). SCENE-002: silhouette spend moved from fenced overall_height to
 * admitted posture/crown/asym/lean levers; gaze kept within FormMaster focusX
 * band; two sustained eye-open beats satisfy the eyes-open hard gate.
 */
const PRESENCE_AWARENESS: EmbodimentSceneSuite = Object.freeze({
  id: "suite-presence-awareness-v2",
  embodimentId: "presence",
  loopSeconds: 20,
  movements: Object.freeze([
    mv("arrive", "in", 0, 2.5, {
      posture_y: [[0, 0], [1, 2.2]],
      crown_height: [[0, 0], [1, -0.05]],
      energy_level: [[0, -0.08], [1, -0.02]],
      internal_glow: [[0, -0.05], [1, -0.01]],
    }),
    mv("orient", "during", 2.5, 5.5, {
      posture_y: [[0, 2.2], [0.5, 2.0], [1, 2.0]],
      posture_x: [[0, 0], [0.25, 3.2], [0.5, 3.2], [0.7, -2.6], [0.9, -2.6], [1, 0]],
      asym: [[0, 0], [0.25, 0.14], [0.5, 0.12], [0.7, -0.11], [0.9, -0.1], [1, 0]],
      gaze: [[0, 0], [0.22, 0.16], [0.45, 0.16], [0.62, -0.14], [0.85, -0.14], [1, 0]],
      body_lean: [[0, 0], [0.28, 0.1], [0.6, -0.08], [1, 0]],
      eye_openness: [[0, 0], [0.4, 0.05], [1, 0.03]],
      crown_height: [[0, -0.05], [1, -0.05]],
      energy_level: [[0, -0.02], [1, 0]],
      internal_glow: [[0, -0.01], [1, -0.01]],
    }),
    mv("regard", "during", 8, 6, {
      posture_y: [[0, 2.0], [0.5, 0.7], [1, 0.6]],
      crown_height: [[0, -0.05], [0.5, 0.09], [1, 0.05]],
      eye_openness: [[0, 0.03], [0.35, 0.1], [0.75, 0.1], [1, 0.05]],
      internal_glow: [[0, -0.01], [0.5, 0.13], [1, 0.06]],
      energy_level: [[0, 0], [0.5, 0.1], [1, 0.05]],
    }),
    mv("spark-echo", "during", 14, 2.5, {
      posture_y: [[0, 0.6], [0.4, -0.2], [1, 0.2]],
      crown_height: [[0, 0.05], [0.4, 0.14], [1, 0.03]],
      eye_openness: [[0, 0.05], [0.35, 0.16], [0.7, 0.12], [1, 0.03]],
      energy_pulse: [[0, 0], [0.35, 0.2], [1, 0.02]],
      internal_glow: [[0, 0.06], [0.4, 0.16], [1, 0.05]],
      energy_level: [[0, 0.05], [0.4, 0.12], [1, 0.04]],
    }),
    mv("home", "out", 16.5, 3.5, {
      posture_y: [[0, 0.2], [1, 0]],
      crown_height: [[0, 0.03], [1, 0]],
      eye_openness: [[0, 0.03], [1, 0]],
      energy_pulse: [[0, 0.02], [1, 0]],
      // Converge to the loop's arrival hush (arrive opens at glow -0.05 /
      // energy -0.08) so the wrap — and any entrance-keyed re-anchor — is
      // jump-safe.
      internal_glow: [[0, 0.05], [0.45, -0.05], [1, -0.05]],
      energy_level: [[0, 0.04], [0.45, -0.08], [1, -0.08]],
      settling: [[0, 0], [0.6, 0.1], [1, 0]],
    }),
  ]),
});

/**
 * SINGULARITY — "Collapse & Orbit" (24s). Rest is a scene, not a dimming:
 * fall (anticipation lift → plunge → landing SQUASH) → orbit-a (accretion
 * breathes, disciplined asymmetric mass drift under the squat) → lensing-flare
 * (the crest: brightest beat + silhouette STRETCH) → orbit-b (opposite echo) →
 * soften (the well relaxes — wake is possible). SCENE-002 replaced dead
 * height/motion spend with posture/crown/lean/asym drift; SCENE-003 / D-0088
 * adds the Pixar beat the fence was blocking — true squash & stretch on
 * overall_height/overall_width + ground contact flattening, within tight
 * scene-scoped bounds (height ±0.1, width ±0.08, flattening ≤ 0.4).
 * Faceless embodiment — the eyes-open gate does not apply (no face plane).
 */
const SINGULARITY_COLLAPSE: EmbodimentSceneSuite = Object.freeze({
  id: "suite-singularity-collapse-v2",
  embodimentId: "singularity",
  loopSeconds: 24,
  // SCENE-003 tune (2026-08-03, rev4 / D-0088): rev3 spent the entire admitted
  // lever budget and still read calm — the dramatic silhouette channels were
  // fenced (LEVERAGE.md §5). Owner-admitted now: squash & stretch on
  // overall_height/overall_width + ground contact flattening, tight budgets
  // (height ±0.1 ≈ ±5px, width ±0.08 ≈ ±9px contour, flattening ≤ 0.4).
  // Boundaries stay continuous; loop closes at zero.
  movements: Object.freeze([
    mv("fall", "in", 0, 4, {
      posture_y: [[0, 0], [1, 3.6]],
      crown_height: [[0, 0], [1, -0.14]],
      body_lean: [[0, 0], [1, 0.18]],
      // Pixar anticipation → plunge → landing squash: a small lift first,
      // height surrenders, width takes the mass, the ground receives contact.
      overall_height: [[0, 0], [0.18, 0.03], [0.55, -0.07], [0.8, -0.1], [1, -0.07]],
      overall_width: [[0, 0], [0.18, -0.02], [0.55, 0.05], [0.8, 0.08], [1, 0.05]],
      ground_flattening: [[0, 0], [0.75, 0], [0.88, 0.35], [1, 0.24]],
      // Open at zero (loop-wrap continuity): the surrender begins from rest.
      energy_level: [[0, 0], [0.4, -0.12], [1, -0.2]],
      energy_lag: [[0, 0], [1, 0.24]],
      energy_occlusion: [[0, 0], [1, 0.18]],
      internal_glow: [[0, 0], [1, -0.12]],
    }),
    mv("orbit-cycle-a", "during", 4, 7, {
      posture_y: [[0, 3.6], [0.5, 3.2], [1, 3.2]],
      posture_x: [[0, 0], [0.3, 4], [0.55, 0.6], [0.8, -3.4], [1, 0]],
      crown_height: [[0, -0.14], [1, -0.14]],
      body_lean: [[0, 0.18], [0.5, 0.06], [1, 0.1]],
      asym: [[0, 0], [0.3, 0.26], [0.55, -0.06], [0.8, -0.22], [1, 0]],
      // Accretion breathes under the landing squat; the contact spread eases.
      overall_height: [[0, -0.07], [0.5, -0.05], [1, -0.06]],
      overall_width: [[0, 0.05], [0.3, 0.07], [0.6, 0.03], [1, 0.05]],
      ground_flattening: [[0, 0.24], [1, 0.15]],
      energy_level: [[0, -0.2], [0.5, -0.12], [1, -0.16]],
      energy_lag: [[0, 0.24], [1, 0.22]],
      energy_occlusion: [[0, 0.18], [0.5, 0.06], [1, 0.12]],
      internal_glow: [[0, -0.12], [0.3, 0.08], [0.55, -0.06], [0.8, 0.06], [1, -0.04]],
    }),
    mv("lensing-flare", "during", 11, 4, {
      posture_y: [[0, 3.2], [0.45, 1.4], [1, 2.6]],
      crown_height: [[0, -0.14], [0.45, -0.02], [1, -0.08]],
      body_lean: [[0, 0.1], [0.45, 0], [1, 0.04]],
      // The STRETCH half of squash-and-stretch: the well rises and narrows
      // into the flare crest, then falls back toward the squat.
      overall_height: [[0, -0.06], [0.45, 0.06], [1, -0.02]],
      overall_width: [[0, 0.05], [0.45, -0.04], [1, 0.02]],
      ground_flattening: [[0, 0.15], [0.45, 0], [1, 0]],
      energy_level: [[0, -0.16], [0.45, -0.02], [1, -0.1]],
      energy_lag: [[0, 0.22], [1, 0.2]],
      energy_occlusion: [[0, 0.12], [0.45, 0], [1, 0.05]],
      internal_glow: [[0, -0.04], [0.45, 0.28], [0.7, 0.18], [1, 0.04]],
      energy_pulse: [[0, 0], [0.45, 0.25], [1, 0.04]],
      face_emissive: [[0, 0], [0.45, 0.2], [1, 0.04]],
    }),
    mv("orbit-cycle-b", "during", 15, 4.5, {
      posture_y: [[0, 2.6], [0.5, 2.9], [1, 2.9]],
      posture_x: [[0, 0], [0.35, -3], [0.65, 2], [1, 0]],
      crown_height: [[0, -0.08], [1, -0.08]],
      body_lean: [[0, 0.04], [0.5, -0.04], [1, 0.03]],
      asym: [[0, 0], [0.35, -0.2], [0.65, 0.14], [1, 0]],
      // The stretch echo settles back into a lighter squat.
      overall_height: [[0, -0.02], [0.5, -0.045], [1, -0.03]],
      overall_width: [[0, 0.02], [0.5, 0.035], [1, 0.025]],
      energy_level: [[0, -0.1], [1, -0.14]],
      energy_lag: [[0, 0.2], [1, 0.2]],
      energy_occlusion: [[0, 0.05], [0.5, 0.08], [1, 0.1]],
      internal_glow: [[0, 0.04], [0.35, 0.1], [0.65, -0.05], [1, 0]],
      energy_pulse: [[0, 0.04], [0.35, 0.12], [0.65, -0.05], [1, 0]],
      face_emissive: [[0, 0.04], [0.5, 0.06], [1, 0]],
    }),
    mv("soften", "out", 19.5, 4.5, {
      posture_y: [[0, 2.9], [1, 0]],
      crown_height: [[0, -0.08], [1, 0]],
      body_lean: [[0, 0.03], [1, 0]],
      // The squat releases; silhouette returns to rest-zero so the wrap and
      // any entrance-keyed re-anchor are jump-safe.
      overall_height: [[0, -0.03], [1, 0]],
      overall_width: [[0, 0.025], [1, 0]],
      energy_level: [[0, -0.14], [1, 0]],
      energy_lag: [[0, 0.2], [1, 0]],
      energy_occlusion: [[0, 0.1], [1, 0]],
      settling: [[0, 0], [0.7, 0.1], [1, 0]],
    }),
  ]),
});

/**
 * COMET — "Pursuit" (16s). Movement with weight and consequence: windup
 * (compression gathers behind — drawn back, low, loaded) → drive (thrust:
 * mass leads forward, lean into it) → consequence (the overshoot arrives —
 * rebound, the droplet law) → recover (settle to a changed rest, ready to
 * launch again). SCENE-002: fenced overall_height/ground_flattening and
 * clobbered motion replaced by posture_x thrust + body_lean + wide/low load.
 */
const COMET_PURSUIT: EmbodimentSceneSuite = Object.freeze({
  id: "suite-comet-pursuit-v2",
  embodimentId: "comet",
  loopSeconds: 16,
  movements: Object.freeze([
    mv("windup", "in", 0, 3, {
      posture_x: [[0, 0], [1, -2.6]],
      posture_y: [[0, 0], [1, 1.6]],
      crown_height: [[0, 0], [1, -0.07]],
      asym: [[0, 0], [1, -0.13]],
      body_lean: [[0, 0], [1, -0.12]],
      wide: [[0, 0], [1, 0.05]],
      low: [[0, 0], [1, 0.08]],
      energy_level: [[0, 0], [1, 0.08]],
      energy_lag: [[0, 0], [1, 0.12]],
      skin_tension: [[0, 0], [1, 0.12]],
    }),
    mv("drive", "during", 3, 6, {
      posture_x: [[0, -2.6], [0.3, 3.8], [0.7, 3.2], [1, 2.6]],
      posture_y: [[0, 1.6], [0.3, 0.4], [1, 0.8]],
      crown_height: [[0, -0.07], [0.3, 0.06], [1, 0.03]],
      asym: [[0, -0.13], [0.3, 0.1], [1, 0.06]],
      body_lean: [[0, -0.12], [0.3, 0.3], [0.7, 0.22], [1, 0.16]],
      wide: [[0, 0.05], [0.3, -0.02], [1, 0]],
      low: [[0, 0.08], [1, 0.03]],
      energy_level: [[0, 0.08], [0.4, 0.16], [1, 0.1]],
      energy_pulse: [[0, 0.05], [0.25, 0.22], [0.5, 0.12], [0.75, 0.2], [1, 0.08]],
      energy_lag: [[0, 0.12], [1, 0.1]],
      skin_tension: [[0, 0.12], [0.4, 0.16], [1, 0.1]],
      internal_glow: [[0, 0], [0.4, 0.1], [1, 0.05]],
    }),
    mv("consequence", "during", 9, 4, {
      posture_x: [[0, 2.6], [0.25, 3.4], [0.6, 1.2], [1, 0.6]],
      posture_y: [[0, 0.8], [0.25, 0.2], [0.6, 1.0], [1, 0.6]],
      crown_height: [[0, 0.03], [0.25, -0.03], [0.6, 0.02], [1, 0]],
      asym: [[0, 0.06], [0.3, 0.12], [0.7, -0.04], [1, 0]],
      body_lean: [[0, 0.16], [0.3, 0.06], [1, 0]],
      low: [[0, 0.03], [1, 0]],
      energy_level: [[0, 0.1], [0.5, -0.04], [1, 0]],
      energy_pulse: [[0, 0.08], [0.3, 0.14], [0.7, 0], [1, 0]],
      energy_lag: [[0, 0.1], [1, 0.06]],
      skin_tension: [[0, 0.1], [0.5, 0.04], [1, 0]],
      internal_glow: [[0, 0.05], [1, 0]],
      rebound: [[0, 0], [0.25, 0.22], [0.55, -0.14], [0.8, 0.06], [1, 0]],
      secondary_lag: [[0, 0], [0.4, 0.12], [1, 0.05]],
    }),
    mv("recover", "out", 13, 3, {
      posture_x: [[0, 0.6], [1, 0]],
      posture_y: [[0, 0.6], [1, 0]],
      energy_lag: [[0, 0.06], [1, 0]],
      secondary_lag: [[0, 0.05], [1, 0]],
      settling: [[0, 0], [0.6, 0.1], [1, 0]],
    }),
  ]),
});

/**
 * LOW-ORBIT — "Compression Physics" (18s). A focused display of compression
 * and expansion: the shell loads pressure (sinks, flattens crown, widens
 * base), holds it against micro-resistance, then releases with an expansion
 * that overshoots upward and recomposes. SCENE-002: fenced
 * overall_height/width and ground_flattening replaced by posture_y +
 * crown/wide/low levers.
 */
const LOW_ORBIT_COMPRESSION: EmbodimentSceneSuite = Object.freeze({
  id: "suite-low-orbit-compression-v2",
  embodimentId: "low-orbit",
  loopSeconds: 18,
  movements: Object.freeze([
    mv("compress", "in", 0, 4, {
      posture_y: [[0, 0], [1, 2.2]],
      crown_height: [[0, 0], [1, -0.1]],
      wide: [[0, 0], [1, 0.08]],
      low: [[0, 0], [1, 0.1]],
      skin_tension: [[0, 0], [1, 0.16]],
      energy_lag: [[0, 0], [1, 0.14]],
      energy_level: [[0, 0], [1, -0.04]],
    }),
    mv("pressure-hold", "during", 4, 6, {
      posture_y: [[0, 2.2], [0.5, 2.3], [1, 2.2]],
      crown_height: [[0, -0.1], [0.5, -0.09], [1, -0.1]],
      wide: [[0, 0.08], [0.5, 0.09], [1, 0.08]],
      low: [[0, 0.1], [0.5, 0.11], [1, 0.1]],
      skin_tension: [[0, 0.16], [0.25, 0.13], [0.5, 0.17], [0.75, 0.13], [1, 0.16]],
      energy_lag: [[0, 0.14], [1, 0.14]],
      energy_pulse: [[0, 0], [0.25, 0.06], [0.5, 0.02], [0.75, 0.07], [1, 0.03]],
      energy_level: [[0, -0.04], [1, -0.04]],
    }),
    mv("expand", "during", 10, 4, {
      posture_y: [[0, 2.2], [0.4, -0.8], [0.7, -0.2], [1, 0.4]],
      crown_height: [[0, -0.1], [0.4, 0.1], [0.7, 0.05], [1, 0.01]],
      wide: [[0, 0.08], [0.4, -0.03], [1, 0]],
      low: [[0, 0.1], [0.4, -0.02], [1, 0]],
      skin_tension: [[0, 0.16], [0.5, 0.05], [1, 0]],
      energy_lag: [[0, 0.14], [1, 0.04]],
      energy_pulse: [[0, 0.03], [0.4, 0.16], [0.8, 0.04], [1, 0]],
      energy_level: [[0, -0.04], [0.4, 0.12], [1, 0.03]],
      internal_glow: [[0, 0], [0.4, 0.1], [1, 0.02]],
      rebound: [[0, 0], [0.4, 0.2], [0.7, -0.08], [1, 0]],
    }),
    mv("recompose", "out", 14, 4, {
      posture_y: [[0, 0.4], [1, 0]],
      crown_height: [[0, 0.01], [1, 0]],
      energy_lag: [[0, 0.04], [1, 0]],
      energy_level: [[0, 0.03], [1, 0]],
      internal_glow: [[0, 0.02], [1, 0]],
      settling: [[0, 0], [0.6, 0.12], [1, 0]],
    }),
  ]),
});

/** Generic breath suite until an embodiment earns an authored performance. */
const GENERIC_BREATH: EmbodimentSceneSuite = Object.freeze({
  id: "suite-generic-breath-v2",
  embodimentId: "generic",
  loopSeconds: 12,
  movements: Object.freeze([
    mv("inhale", "in", 0, 4, {
      posture_y: [[0, 0], [1, -0.8]],
      crown_height: [[0, 0], [1, 0.04]],
      internal_glow: [[0, 0], [1, 0.05]],
      energy_level: [[0, 0], [1, 0.03]],
    }),
    mv("hold-breath", "during", 4, 4, {
      posture_y: [[0, -0.8], [0.5, -0.9], [1, -0.8]],
      crown_height: [[0, 0.04], [0.5, 0.05], [1, 0.04]],
      internal_glow: [[0, 0.05], [0.5, 0.07], [1, 0.05]],
      energy_level: [[0, 0.03], [1, 0.03]],
      energy_pulse: [[0, 0], [0.5, 0.05], [1, 0]],
    }),
    mv("exhale", "out", 8, 4, {
      posture_y: [[0, -0.8], [1, 0]],
      crown_height: [[0, 0.04], [1, 0]],
      internal_glow: [[0, 0.05], [1, 0]],
      energy_level: [[0, 0.03], [1, 0]],
      settling: [[0, 0], [0.7, 0.05], [1, 0]],
    }),
  ]),
});

const SUITES: Readonly<Record<string, EmbodimentSceneSuite>> = Object.freeze({
  presence: PRESENCE_AWARENESS,
  singularity: SINGULARITY_COLLAPSE,
  comet: COMET_PURSUIT,
  "low-orbit": LOW_ORBIT_COMPRESSION,
});

/** Face-bearing embodiments: suites here must pass the eyes-open hard gate. */
export const FACE_BEARING_SUITE_EMBODIMENTS: ReadonlySet<string> = Object.freeze(
  new Set(["presence"]),
);

/** Authored suite for an embodiment, or the generic breath performance. */
export function getSceneSuiteForEmbodiment(embodimentId: string): EmbodimentSceneSuite {
  return SUITES[embodimentId] ?? GENERIC_BREATH;
}

/** All authored suite ids (proof enumeration). */
export function listSceneSuites(): readonly EmbodimentSceneSuite[] {
  return Object.freeze([...Object.values(SUITES), GENERIC_BREATH]);
}

/**
 * Sample a suite at elapsed seconds (loops). Deterministic and clock-fed;
 * reduced motion collapses all deltas to zero, matching the microvariation
 * and tremble doctrine.
 */
export function evaluateSceneSuite(
  suite: EmbodimentSceneSuite,
  elapsedSeconds: number,
  opts?: { reducedMotion?: boolean },
): SceneSuiteSample {
  const loop = Math.max(1e-6, suite.loopSeconds);
  const wrapped = ((elapsedSeconds % loop) + loop) % loop;
  let active: SceneMovement = suite.movements[suite.movements.length - 1]!;
  for (const m of suite.movements) {
    if (wrapped >= m.startSeconds && wrapped < m.startSeconds + m.durationSeconds) {
      active = m;
      break;
    }
  }
  const movementT = clamp((wrapped - active.startSeconds) / Math.max(1e-6, active.durationSeconds), 0, 1);
  const zero = !opts?.reducedMotion ? false : true;
  const deltas: Record<string, number> = {};
  for (const [key, curve] of Object.entries(active.channels)) {
    deltas[key] = zero ? 0 : sampleSceneCurve(curve, movementT);
  }
  return Object.freeze({
    suiteId: suite.id,
    movementId: active.id,
    intent: active.intent,
    loopT: wrapped / loop,
    movementT,
    deltas: Object.freeze(deltas),
  });
}

/**
 * Bipolar levers (px translations + 0-centered shape levers): the composed
 * value may legitimately go negative. Everything else is a 0..1-ish unit
 * channel clamped like the embodiment-life layer.
 */
const SUITE_BIPOLAR_CHANNELS: ReadonlySet<string> = Object.freeze(
  new Set([
    "rebound",
    "gaze",
    "eye_spacing",
    "posture_x",
    "posture_y",
    "asym",
    "body_lean",
    "crown_height",
    "wide",
    "low",
  ]),
);

/** px translations need headroom beyond the unit-channel ceiling. */
const SUITE_CHANNEL_CEILING: Readonly<Record<string, number>> = Object.freeze({
  posture_x: 8,
  posture_y: 8,
});

/**
 * Fold suite deltas into living channels. Additive and clamped like the
 * embodiment-life layer; absent channels are created only when the suite
 * authors them (suites own their curve vocabulary, nothing else).
 */
export function applySceneSuiteToChannels(
  values: DomainScalarMap,
  sample: SceneSuiteSample,
): DomainScalarMap {
  const next = { ...values };
  for (const [key, delta] of Object.entries(sample.deltas)) {
    const base = typeof next[key] === "number" && Number.isFinite(next[key]) ? next[key]! : 0;
    const min = SUITE_BIPOLAR_CHANNELS.has(key) ? (key === "posture_x" || key === "posture_y" ? -8 : -1) : 0;
    next[key] = clamp(base + delta, min, SUITE_CHANNEL_CEILING[key] ?? 1.6);
  }
  return next;
}
