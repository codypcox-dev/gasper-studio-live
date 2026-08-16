/**
 * Default eight-state showcase loop timing (MegaBook §10 mid-range).
 * Total cycle target: ~26–36 s (nominal ~31.4 s).
 */

import {
  channelDurationScales,
  easeForTransition,
  threeBeatFor,
} from "./motion-grammar";
import { THREE_BEAT_SEQUENCES } from "./beat-sequence";
import type { EightStateId, GasperLoopManifestV1, LoopStepV1 } from "./types";

/** Canonical showcase route including wake close. */
export const EIGHT_STATE_LOOP_ROUTE: readonly EightStateId[] = [
  "presence-neutral-settled",
  "presence-listening-receive",
  "presence-thinking-knit",
  "presence-recognition-spark",
  "comet-executing-drive",
  "presence-blocked-strain",
  "presence-pleased-resolve",
  "dormant-orbit-maintain",
  "wake",
  "presence-neutral-settled",
] as const;

/**
 * Hold + transition pairs along the route.
 * Each step describes arrival at `to` and the hold once there.
 * Wake holds 0 — pure closing transition into Neutral.
 */
const RAW_STEPS: Array<{
  from: EightStateId;
  to: EightStateId;
  transitionSeconds: number;
  holdSeconds: number;
}> = [
  { from: "presence-neutral-settled", to: "presence-listening-receive", transitionSeconds: 1.05, holdSeconds: 2.5 },
  { from: "presence-listening-receive", to: "presence-thinking-knit", transitionSeconds: 1.3, holdSeconds: 3.0 },
  { from: "presence-thinking-knit", to: "presence-recognition-spark", transitionSeconds: 0.52, holdSeconds: 0.95 },
  { from: "presence-recognition-spark", to: "comet-executing-drive", transitionSeconds: 0.85, holdSeconds: 2.5 },
  { from: "comet-executing-drive", to: "presence-blocked-strain", transitionSeconds: 0.42, holdSeconds: 2.3 },
  { from: "presence-blocked-strain", to: "presence-pleased-resolve", transitionSeconds: 1.6, holdSeconds: 2.3 },
  { from: "presence-pleased-resolve", to: "dormant-orbit-maintain", transitionSeconds: 2.3, holdSeconds: 2.75 },
  { from: "dormant-orbit-maintain", to: "wake", transitionSeconds: 1.4, holdSeconds: 0 },
  { from: "wake", to: "presence-neutral-settled", transitionSeconds: 1.2, holdSeconds: 2.5 },
];

function buildSteps(): LoopStepV1[] {
  return RAW_STEPS.map((s) => ({
    from: s.from,
    to: s.to,
    transitionSeconds: s.transitionSeconds,
    holdSeconds: s.holdSeconds,
    easeBias: easeForTransition(s.from, s.to),
    channelDurationScale: channelDurationScales(s.to),
    phaseOffsets: {
      energy_level: s.to === "presence-recognition-spark" ? 0 : 0.05,
      eye_openness: 0.02,
      overall_height: s.to === "presence-blocked-strain" ? 0 : 0.04,
    },
    // GASPER-BEH-001: arrival-state three-beat envelope (identity contract).
    threeBeat: threeBeatFor(s.to),
    // Task 5: authored rest punctuation recorded in the scene manifest.
    restPolicy: THREE_BEAT_SEQUENCES[s.to].restPolicy,
  }));
}

export const DEFAULT_LOOP_MANIFEST: GasperLoopManifestV1 = {
  id: "gasper-007-g-eight-state-showcase-v1",
  version: 1,
  route: EIGHT_STATE_LOOP_ROUTE,
  totalCycleTargetSeconds: { min: 26, max: 36 },
  steps: buildSteps(),
  proofSeedDefault: 1007,
};

/**
 * PARADE LOOP (Cody directive 2026-07-28, supersedes the 2026-07-24 "continuous fluid"
 * collapse below): the showcase as a HIGHLIGHT REEL — each state enters with its impact
 * beat, HOLDS long enough to read as a scene (the gather→peak→settle arc + the held
 * silhouette/light/mouth), then transitions with intent. The 2026-07-24 continuous-fluid
 * mode collapsed holds to 0.18–0.42s, which made every state permanent mid-transition:
 * the expression fixture retargeted ~every 1.5s (reads as "eyes blinking like crazy"),
 * no 3-beat scene could ever complete, and the reel had no parade. Authored holds are
 * restored and raised (floor 2.5s; recognition gets 2.5s so the 'aha' + goosebumps read);
 * transitions stretch slightly for deliberate entrances. Used only by the live auto loop
 * with reduced motion OFF; reduced motion / restrained / manual paths keep the authored
 * DEFAULT_LOOP_MANIFEST (which still feeds computeCycleSeconds/tests, untouched).
 */
const CONTINUOUS_HOLD_FLOOR_S = 2.5;
const CONTINUOUS_HOLD_SCALE = 1.4;
const CONTINUOUS_TRANSITION_SCALE = 1.15;

function buildContinuousSteps(): LoopStepV1[] {
  return RAW_STEPS.map((s) => {
    const holdSeconds =
      s.holdSeconds <= 0
        ? 0
        : Math.max(
            CONTINUOUS_HOLD_FLOOR_S,
            s.holdSeconds * CONTINUOUS_HOLD_SCALE,
          );
    const baseBeat = threeBeatFor(s.to);
    // Scale hold sustain with parade hold floor; keep gather/peak/settle authored.
    const threeBeat = Object.freeze({
      ...baseBeat,
      holdSeconds:
        holdSeconds <= 0
          ? baseBeat.holdSeconds
          : Math.max(baseBeat.holdSeconds, holdSeconds * 0.35),
    });
    return {
      from: s.from,
      to: s.to,
      transitionSeconds: s.transitionSeconds * CONTINUOUS_TRANSITION_SCALE,
      holdSeconds,
      easeBias: easeForTransition(s.from, s.to),
      channelDurationScale: channelDurationScales(s.to),
      phaseOffsets: {
        energy_level: s.to === "presence-recognition-spark" ? 0 : 0.05,
        eye_openness: 0.02,
        overall_height: s.to === "presence-blocked-strain" ? 0 : 0.04,
      },
      threeBeat,
      restPolicy: THREE_BEAT_SEQUENCES[s.to].restPolicy,
    };
  });
}

export const CONTINUOUS_LOOP_MANIFEST: GasperLoopManifestV1 = {
  id: "gasper-007-g-eight-state-continuous-fluid-v1",
  version: 1,
  route: EIGHT_STATE_LOOP_ROUTE,
  totalCycleTargetSeconds: { min: 34, max: 44 },
  steps: buildContinuousSteps(),
  proofSeedDefault: 1007,
};

/**
 * SCENE LOOP (Cody directive 2026-08-03, supersedes the 2026-07-28 parade reel
 * for the live auto loop): the showcase matures from a highlight reel into
 * long-form performances. Holds stretch so each embodiment's scene suite
 * (GASPER-SCENE-001) can play its full in/during/out arc: presence performs
 * the 20s Awareness suite, the rest state collapses into singularity and
 * performs the 24s Collapse & Orbit suite, comet completes the 16s Pursuit.
 * Transitions keep their authored three-beat physics. Reduced motion /
 * restrained / manual paths keep DEFAULT_LOOP_MANIFEST, untouched.
 */
const SCENE_STATE_HOLDS: Readonly<Record<EightStateId, number>> = Object.freeze({
  "presence-neutral-settled": 20,
  "presence-listening-receive": 6,
  "presence-thinking-knit": 8,
  "presence-recognition-spark": 3,
  "comet-executing-drive": 16,
  "presence-blocked-strain": 4,
  "presence-pleased-resolve": 6,
  "dormant-orbit-maintain": 24,
  wake: 0,
});

function buildSceneSteps(): LoopStepV1[] {
  return RAW_STEPS.map((s) => {
    const holdSeconds = SCENE_STATE_HOLDS[s.to] ?? Math.max(2.5, s.holdSeconds);
    const baseBeat = threeBeatFor(s.to);
    const threeBeat = Object.freeze({
      ...baseBeat,
      holdSeconds:
        holdSeconds <= 0
          ? baseBeat.holdSeconds
          : Math.max(baseBeat.holdSeconds, holdSeconds * 0.35),
    });
    return {
      from: s.from,
      to: s.to,
      transitionSeconds: s.transitionSeconds * CONTINUOUS_TRANSITION_SCALE,
      holdSeconds,
      easeBias: easeForTransition(s.from, s.to),
      channelDurationScale: channelDurationScales(s.to),
      phaseOffsets: {
        energy_level: s.to === "presence-recognition-spark" ? 0 : 0.05,
        eye_openness: 0.02,
        overall_height: s.to === "presence-blocked-strain" ? 0 : 0.04,
      },
      threeBeat,
      restPolicy: THREE_BEAT_SEQUENCES[s.to].restPolicy,
    };
  });
}

export const SCENE_LOOP_MANIFEST: GasperLoopManifestV1 = {
  id: "gasper-scene-001-embodiment-suites-v1",
  version: 1,
  route: EIGHT_STATE_LOOP_ROUTE,
  totalCycleTargetSeconds: { min: 90, max: 110 },
  steps: buildSceneSteps(),
  proofSeedDefault: 1007,
};

export function computeCycleSeconds(manifest: GasperLoopManifestV1 = DEFAULT_LOOP_MANIFEST): number {
  // First neutral hold is included as the final step hold; initial hold before first step is that same 2.5s
  // when starting mid-cycle from neutral. Sum all transition + hold on steps.
  let t = 0;
  for (const s of manifest.steps) {
    t += s.transitionSeconds + s.holdSeconds;
  }
  return t;
}

export function stepForTransition(
  from: EightStateId,
  to: EightStateId,
  manifest: GasperLoopManifestV1 = DEFAULT_LOOP_MANIFEST,
): LoopStepV1 | undefined {
  return manifest.steps.find((s) => s.from === from && s.to === to);
}

export function nextRouteState(
  current: EightStateId,
  route: readonly EightStateId[] = EIGHT_STATE_LOOP_ROUTE,
): { next: EightStateId; index: number } {
  // Route ends with neutral-settled; find first occurrence of current, advance.
  let idx = route.indexOf(current);
  if (idx < 0) idx = 0;
  // Prefer earliest non-final match for neutral so we leave initial neutral.
  if (current === "presence-neutral-settled") {
    const last = route.length - 1;
    if (idx === last) idx = 0;
  }
  const nextIdx = (idx + 1) % route.length;
  // Avoid staying on same if route has duplicate neutral at end
  let next = route[nextIdx]!;
  if (next === current && route.length > 1) {
    next = route[(nextIdx + 1) % route.length]!;
    return { next, index: (nextIdx + 1) % route.length };
  }
  return { next, index: nextIdx };
}

export function nominalCycleSeconds(): number {
  return computeCycleSeconds(DEFAULT_LOOP_MANIFEST);
}
