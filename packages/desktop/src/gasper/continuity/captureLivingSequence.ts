/**
 * Deterministic multi-frame capture on the living continuity path.
 * Generates continuity-preserving trajectories from state targets without
 * MCP frame driving; GSAP remains frame authority for real playback.
 *
 * Energy grammar + anti-collapse floors ensure full-matrix energy span > 0
 * and ordinary expression never collapses the whole head.
 */

import { EIGHT_STATE_TARGETS } from "../eight-state-loop/state-targets";
import type { EightStateId } from "../eight-state-loop/types";
import {
  CONTESTED_OWNERSHIP_CHANNELS,
  TOPOLOGY_LOCK,
} from "./channels";
import { boundStepMap, quantize } from "./derivatives";
import { livingFrameClaims, resolveOwnership } from "./ownership";
import {
  buildDeterministicSchedule,
  lerpMaps,
  smootherstep,
} from "./scheduler";
import { FrameSequenceRecorder } from "./frameRecorder";
import { analyzeFrameSequence, seriesEqualWithin } from "./analyzeSequence";
import type {
  CaptureSequenceOptions,
  ContinuityChannelMap,
  ContinuityFrame,
  FrameSequenceAnalysis,
} from "./types";
import { DEFAULT_CONTINUITY_THRESHOLDS } from "./types";
import {
  applyEnergyGrammar,
  analyzeEnergySpan,
  ANTI_COLLAPSE_FLOORS,
  ENERGY_GRAMMAR,
  FULL_ENERGY_MATRIX_ROUTES,
  enforceAntiCollapseFloors,
  resolveEnergyTarget,
  type EnergyRouteId,
  type EnergySpanReport,
} from "./energyGrammar";
import {
  enforceNoBlackoutFloors,
  resolveNoBlackoutMode,
  sampleWakeReconstruction,
  sampleDormantMaintain,
  analyzeNoBlackoutSequence,
  type NoBlackoutMode,
  type TemporalNoBlackoutReport,
} from "./noBlackoutInvariant";

/** Default showcase segment used for proof capture (presence + energy variety). */
const CAPTURE_ROUTE: readonly EightStateId[] = [
  "presence-neutral-settled",
  "presence-listening-receive",
  "presence-thinking-knit",
  "presence-recognition-spark",
  "presence-blocked-strain",
  "presence-pleased-resolve",
] as const;

/** Full energy matrix route including dormant, wake, interrupt, reset, expression. */
const FULL_MATRIX_CAPTURE_ROUTE: readonly EnergyRouteId[] = [
  "presence-neutral-settled",
  "presence-listening-receive",
  "presence-thinking-knit",
  "presence-recognition-spark",
  "comet-executing-drive",
  "presence-blocked-strain",
  "presence-pleased-resolve",
  "dormant-orbit-maintain",
  "wake",
  "interruption",
  "reset",
  "expression-soft",
  "expression-bright",
  "expression-strain",
  "expression-resolve",
] as const;

/** Keys that must exist on every frame so sparse IR targets cannot materialize mid-matrix. */
const STABLE_CAPTURE_KEYS: ReadonlyArray<{ key: string; fallback: number }> = [
  { key: "overall_height", fallback: 1 },
  { key: "overall_width", fallback: 1 },
  { key: "crown_height", fallback: 0 },
  { key: "ground_flattening", fallback: 0 },
  { key: "lower_body_fullness", fallback: 0.7 },
  { key: "eye_openness", fallback: 0.5 },
  { key: "eye_spacing", fallback: 0 },
  { key: "mouth_openness", fallback: 0.15 },
  { key: "mouth_width", fallback: 0.5 },
  { key: "gaze", fallback: 0 },
  { key: "corner_pull_l", fallback: 0 },
  { key: "corner_pull_r", fallback: 0 },
  { key: "face_scale", fallback: 1 },
  { key: "energy_level", fallback: 0.52 },
  { key: "energy_pulse", fallback: 0.16 },
  { key: "energy_lag", fallback: 0.35 },
  { key: "internal_glow", fallback: 0.48 },
  { key: "face_emissive", fallback: 0.4 },
  { key: "settling", fallback: 0.5 },
  { key: "rebound", fallback: 0.4 },
  { key: "secondary_lag", fallback: 0.3 },
  { key: "skin_tension", fallback: 0.35 },
  // Sparse IR keys — keep continuous so they never teleport in at full amplitude.
  { key: "spectral_energy_envelope", fallback: 0.5 },
  { key: "center_of_mass_y", fallback: 0 },
];

function baseChannelsFor(id: string): ContinuityChannelMap {
  const eightId = id as EightStateId;
  const t =
    eightId in EIGHT_STATE_TARGETS
      ? EIGHT_STATE_TARGETS[eightId]
      : EIGHT_STATE_TARGETS["presence-neutral-settled"];
  const out: ContinuityChannelMap = {};
  for (const [k, v] of Object.entries(t)) {
    out[k] = typeof v === "number" ? v : 0;
  }
  // Overlay deterministic energy grammar (source of dynamic energy span).
  const energy = resolveEnergyTarget(id);
  out.energy_level = energy.level;
  out.energy_pulse = energy.pulse;
  out.energy_lag = energy.lag;
  out.internal_glow = energy.glow;
  // Ensure contour / face / sparse IR keys always present at safe neutrals.
  for (const { key, fallback } of STABLE_CAPTURE_KEYS) {
    if (out[key] === undefined || out[key] === null) out[key] = fallback;
  }
  // Volume-safe fullness so independent H/W steps cannot product-dip under VOLUME_FLOOR.
  out.lower_body_fullness = Math.max(out.lower_body_fullness ?? 0, 0.96);
  // R4: preserve IR geometry (incl. dormant face_scale/H/W below identity) then
  // lift through anti-collapse + no-blackout floors — do not force face_scale=1
  // (that hid IR dormant 0.72 / height 0.88 from structural proofs).
  // Mild upper clamp only (no whole-head inflation as expression vehicle).
  if (typeof out.overall_height === "number") {
    out.overall_height = Math.min(1.15, out.overall_height);
  }
  if (typeof out.overall_width === "number") {
    out.overall_width = Math.min(1.15, out.overall_width);
  }
  if (typeof out.face_scale === "number") {
    out.face_scale = Math.min(1.2, out.face_scale);
  }
  const anti = enforceAntiCollapseFloors(out, energy.mode);
  return enforceNoBlackoutFloors(anti, energy.mode as NoBlackoutMode);
}

/**
 * Per-channel floors for boundStepMap soft walls.
 * lower_body_fullness is raised so independent H/W steps cannot product-dip
 * volume below VOLUME_FLOOR (0.88*0.9*f^0.35 >= 0.78 → f ≳ 0.96).
 */
function antiCollapseBoundFloors(
  mode: keyof typeof ANTI_COLLAPSE_FLOORS,
): ContinuityChannelMap {
  const f = ANTI_COLLAPSE_FLOORS[mode];
  // Fullness floor high enough that min H/W under anti-collapse still clears VOLUME_FLOOR.
  const volumeSafeFullness = Math.max(f.lower_body_fullness, 0.96);
  // Capture floors: near-identity structural band (no whole-head squash vehicle).
  // R4 no-blackout: include face_emissive / glow so boundStep cannot dark-wipe.
  return {
    face_scale: 0.95,
    overall_height: 0.95,
    overall_width: 0.95,
    lower_body_fullness: volumeSafeFullness,
    energy_level: f.energy_level,
    eye_openness: f.eye_openness,
    mouth_openness: f.mouth_openness,
    face_emissive: f.face_emissive ?? 0.12,
    internal_glow: f.internal_glow ?? 0.14,
  };
}

function targetFor(id: EightStateId): ContinuityChannelMap {
  return baseChannelsFor(id);
}

/**
 * Capture a multi-frame continuity sequence with deterministic scheduling.
 * Uses retarget-from-current style lerps + interrupt-safe blend at interrupt edge.
 */
export function captureLivingFrameSequence(
  opts: CaptureSequenceOptions,
): ContinuityFrame[] {
  const seed = opts.seed >>> 0;
  const proofMode = opts.proofMode !== false;
  const schedule = buildDeterministicSchedule({
    seed,
    dt: opts.dt ?? 1 / 60,
    frameCount: opts.frameCount ?? 48,
    forceInterrupt: opts.forceInterrupt === true,
  });
  const recorder = new FrameSequenceRecorder({
    seed,
    dt: schedule.dt,
  });
  recorder.start();

  const route = CAPTURE_ROUTE;
  const segmentCount = route.length - 1;
  let current = targetFor(route[0]!);
  // Hold-last-good buffer: last good continuous sample
  let lastGood = { ...current };

  const interruptSet = new Set(schedule.interruptFrameIndices);
  let interrupted = false;
  let interruptFrom: ContinuityChannelMap | null = null;
  let interruptTarget: ContinuityChannelMap | null = null;
  const interruptBlendFrames = 14;
  // Live derivative state for boundStepMap (shipped bounded-derivative policy).
  let priorVelocity: ContinuityChannelMap = {};
  let priorAcceleration: ContinuityChannelMap = {};
  // Conservative margins: low maxV keeps stopping distance << anti-collapse band width.
  const maxV = DEFAULT_CONTINUITY_THRESHOLDS.maxVelocity * 0.35;
  const maxA = DEFAULT_CONTINUITY_THRESHOLDS.maxAcceleration * 0.75;
  const maxJ = DEFAULT_CONTINUITY_THRESHOLDS.maxJerk * 0.6;

  for (let i = 0; i < schedule.frameCount; i++) {
    const p = schedule.progress[i]!;
    const segFloat = p * segmentCount;
    const seg = Math.min(segmentCount - 1, Math.floor(segFloat));
    const local = segFloat - seg;
    const fromId = route[seg]!;
    const toId = route[seg + 1]!;
    const from = targetFor(fromId);
    const to = targetFor(toId);
    // Smootherstep is C2 at ends (zero 1st/2nd derivatives) → bounded jerk at segment joins.
    const eased = smootherstep(local);

    let channels: ContinuityChannelMap;
    let interruptEdge = false;
    let phase: "hold" | "transition" | "interrupted" | "idle" = "transition";
    let transitionProgress = eased;

    if (interruptSet.has(i) && !interrupted) {
      // Interrupt mid-flight: retarget from CURRENT (not canonical from) via smoothstep.
      interrupted = true;
      interruptFrom = { ...current };
      interruptTarget = targetFor("presence-pleased-resolve");
      channels = lerpMaps(interruptFrom, interruptTarget, smootherstep(0));
      interruptEdge = true;
      phase = "interrupted";
      transitionProgress = 0;
    } else if (interrupted && interruptFrom && interruptTarget) {
      const i0 = schedule.interruptFrameIndices[0] ?? i;
      const blendP = Math.min(1, (i - i0) / interruptBlendFrames);
      const e = smootherstep(blendP);
      channels = lerpMaps(interruptFrom, interruptTarget, e);
      phase = blendP >= 1 ? "hold" : "interrupted";
      transitionProgress = e;
      // Entire interrupt blend counts as interrupt-region for ownership accounting.
      interruptEdge = blendP < 1;
    } else {
      channels = lerpMaps(from, to, eased);
      phase = local < 0.02 || local > 0.98 ? "hold" : "transition";
    }

    // Soft multi-frame blink envelope (smooth, low amplitude — boundStep owns derivatives).
    // Frames [8..14] close/open around rest eye with smoothstep weights.
    let midBlink = false;
    if (proofMode && i >= 8 && i <= 14) {
      const u = (i - 8) / 6;
      const dip = Math.sin(Math.PI * u); // 0..1..0
      const rest = channels.eye_openness ?? 0.5;
      // Milder dip so FD jerk under proof blink stays inside continuity thresholds.
      channels = {
        ...channels,
        eye_openness: Math.max(0.14, rest * (1 - 0.35 * dip)),
      };
      midBlink = dip > 0.35;
    }

    // Mild saccade pulse on a longer hold (smooth, low amplitude).
    let midSaccade = false;
    if (proofMode && i >= 28 && i <= 32) {
      const u = (i - 28) / 4;
      const pulse = Math.sin(Math.PI * u) * 0.06;
      channels = {
        ...channels,
        gaze: (channels.gaze ?? 0) + pulse,
      };
      midSaccade = Math.abs(pulse) > 0.02;
    }

    // Energy grammar + anti-collapse on PROPOSED target only (before boundStep).
    // Hard post-step floors create FD acceleration spikes; brake-limited boundStep
    // approaches floored proposals without overshoot/collapse snaps.
    const routeForEnergy = interrupted ? "presence-pleased-resolve" : toId;
    const energyMode = resolveEnergyTarget(routeForEnergy).mode;
    channels = applyEnergyGrammar(channels, {
      routeId: routeForEnergy,
      progress: transitionProgress,
      phase:
        phase === "interrupted"
          ? "interrupt"
          : phase === "hold"
            ? "hold"
            : "sustain",
      forceEnergy: true,
    });
    channels = enforceAntiCollapseFloors(channels, energyMode);
    channels = enforceNoBlackoutFloors(
      channels,
      resolveNoBlackoutMode(routeForEnergy),
    );
    if (typeof channels.energy_level === "number") {
      channels.energy_level = Math.min(
        1,
        Math.max(
          ANTI_COLLAPSE_FLOORS[energyMode].energy_level,
          channels.energy_level,
        ),
      );
    }
    // Seed newly appearing keys at neutral fallback (not full target) so boundStep ramps.
    for (const k of Object.keys(channels)) {
      if (current[k] === undefined) {
        const stable = STABLE_CAPTURE_KEYS.find((s) => s.key === k);
        current[k] = stable?.fallback ?? 0;
      }
    }

    // Bounded derivatives: clamp step velocity/acceleration/jerk vs prior frame.
    const floors = antiCollapseBoundFloors(energyMode);
    const bounded =
      i === 0
        ? {
            values: channels,
            velocity: {} as ContinuityChannelMap,
            acceleration: {} as ContinuityChannelMap,
          }
        : boundStepMap(current, channels, priorVelocity, schedule.dt, maxV, maxA, {
            priorAcceleration,
            maxJerk: maxJ,
            floors,
            ceilings: {
              energy_level: 1,
              face_scale: 1.65,
              eye_openness: 1.2,
            },
          });
    priorVelocity = bounded.velocity;
    priorAcceleration = bounded.acceleration;

    // No hard post-step floor (creates FD jerk spikes). Floors applied on
    // proposed target + soft-wall boundStep floors only (R3 continuity).
    const qChannels: ContinuityChannelMap = {};
    for (const [k, v] of Object.entries(bounded.values)) {
      qChannels[k] = quantize(v, 6);
    }

    const claims = livingFrameClaims({
      midBlink,
      midSaccade,
      interrupted: phase === "interrupted",
      holdLastGood: false,
    });
    const ownership = resolveOwnership(claims, [
      ...CONTESTED_OWNERSHIP_CHANNELS,
    ]);

    // Topology lock — never rewrite mid-sequence
    const topology = {
      contourSamples: TOPOLOGY_LOCK.contourSamples,
      structuralNodes: TOPOLOGY_LOCK.structuralNodes,
      structuralTriangles: TOPOLOGY_LOCK.structuralTriangles,
      topologyStable: true as const,
    };

    recorder.push({
      channels: qChannels,
      ownership,
      topology,
      transition: {
        from: fromId,
        to: interrupted ? "presence-pleased-resolve" : toId,
        progress: transitionProgress,
        phase,
      },
      interruptEdge,
      t: schedule.times[i],
    });

    current = { ...qChannels };
    lastGood = { ...qChannels };
    void lastGood;
  }

  return recorder.snapshot();
}

/**
 * Full-matrix multi-route capture: every canonical energy route, interrupt,
 * reset, dormant-maintain, wake, and expression families. Energy span is
 * material (> MATERIAL_ENERGY_SPAN_FLOOR) by construction of ENERGY_GRAMMAR.
 */
export function captureFullEnergyMatrixSequence(opts: {
  seed: number;
  dt?: number;
  /** Frames per route segment (default 8). */
  framesPerRoute?: number;
  forceInterrupt?: boolean;
  proofMode?: boolean;
}): {
  frames: ContinuityFrame[];
  energy: EnergySpanReport;
  routeHoldLevels: Record<string, number>;
} {
  const seed = opts.seed >>> 0;
  const dt = opts.dt ?? 1 / 60;
  const framesPerRoute = Math.max(4, opts.framesPerRoute ?? 8);
  const route = FULL_MATRIX_CAPTURE_ROUTE;
  const frameCount = framesPerRoute * route.length;
  const recorder = new FrameSequenceRecorder({ seed, dt });
  recorder.start();

  let current = baseChannelsFor(route[0]!);
  let priorVelocity: ContinuityChannelMap = {};
  let priorAcceleration: ContinuityChannelMap = {};
  const maxV = DEFAULT_CONTINUITY_THRESHOLDS.maxVelocity * 0.35;
  const maxA = DEFAULT_CONTINUITY_THRESHOLDS.maxAcceleration * 0.75;
  const maxJ = DEFAULT_CONTINUITY_THRESHOLDS.maxJerk * 0.6;
  const routeHoldLevels: Record<string, number> = {};
  const energyLevels: number[] = [];

  // Optional mid-matrix interrupt retarget
  const interruptAt = opts.forceInterrupt !== false
    ? Math.floor(frameCount * 0.45)
    : -1;
  let interrupted = false;
  let interruptFrom: ContinuityChannelMap | null = null;
  const interruptTarget = baseChannelsFor("interruption");
  const interruptBlendFrames = 12;

  for (let i = 0; i < frameCount; i++) {
    const seg = Math.min(route.length - 1, Math.floor(i / framesPerRoute));
    const local = (i % framesPerRoute) / Math.max(1, framesPerRoute - 1);
    const fromId = route[Math.max(0, seg - (local < 0.02 ? 0 : 0))]!;
    const toId = route[seg]!;
    const from = baseChannelsFor(seg === 0 ? toId : route[seg - 1] ?? toId);
    const to = baseChannelsFor(toId);
    const eased = smootherstep(local);

    let channels: ContinuityChannelMap;
    let interruptEdge = false;
    let phase: "hold" | "transition" | "interrupted" | "idle" = "transition";
    let transitionProgress = eased;
    let toLabel: string = toId;

    if (i === interruptAt && !interrupted) {
      interrupted = true;
      interruptFrom = { ...current };
      channels = lerpMaps(interruptFrom, interruptTarget, smootherstep(0));
      interruptEdge = true;
      phase = "interrupted";
      transitionProgress = 0;
      toLabel = "interruption";
    } else if (interrupted && interruptFrom && i - interruptAt < interruptBlendFrames) {
      const blendP = Math.min(1, (i - interruptAt) / interruptBlendFrames);
      const e = smootherstep(blendP);
      channels = lerpMaps(interruptFrom, interruptTarget, e);
      phase = blendP >= 1 ? "hold" : "interrupted";
      transitionProgress = e;
      interruptEdge = blendP < 1;
      toLabel = "interruption";
    } else {
      // After interrupt blend, resume matrix route (reset segment uses reset target).
      if (toId === "reset") {
        channels = lerpMaps(current, baseChannelsFor("reset"), eased);
      } else {
        channels = lerpMaps(from, to, eased);
      }
      phase = local < 0.08 || local > 0.92 ? "hold" : "transition";
    }

    // Force energy grammar onto PROPOSED channels (inspection-visible dynamism).
    // Floors apply before boundStep only — post-step hard clamps spike acceleration.
    const energyPhase =
      phase === "interrupted"
        ? "interrupt"
        : toId === "reset"
          ? "reset"
          : phase === "hold"
            ? "hold"
            : "sustain";
    const mode = resolveEnergyTarget(toLabel).mode;
    channels = applyEnergyGrammar(channels, {
      routeId: toLabel,
      progress: transitionProgress,
      phase: energyPhase,
      forceEnergy: true,
    });
    channels = enforceAntiCollapseFloors(channels, mode);
    // Wake reconstruct / dormant maintain: progressive face, not dark-until-snap.
    if (toLabel === "wake") {
      const wakeSample = sampleWakeReconstruction(transitionProgress, current);
      channels = { ...channels, ...wakeSample };
    } else if (toLabel === "dormant-orbit-maintain") {
      const dormSample = sampleDormantMaintain(transitionProgress, current);
      channels = {
        ...channels,
        face_emissive: dormSample.face_emissive,
        eye_openness: Math.max(
          channels.eye_openness ?? 0,
          dormSample.eye_openness ?? 0,
        ),
        energy_level: Math.max(
          channels.energy_level ?? 0,
          dormSample.energy_level ?? 0,
        ),
        internal_glow: Math.max(
          channels.internal_glow ?? 0,
          dormSample.internal_glow ?? 0,
        ),
        face_scale: Math.max(channels.face_scale ?? 0, dormSample.face_scale ?? 0),
      };
    }
    channels = enforceNoBlackoutFloors(channels, resolveNoBlackoutMode(toLabel));
    if (typeof channels.energy_level === "number") {
      channels.energy_level = Math.min(
        1,
        Math.max(ANTI_COLLAPSE_FLOORS[mode].energy_level, channels.energy_level),
      );
    }
    if (typeof channels.face_scale === "number") {
      channels.face_scale = Math.min(
        1.65,
        Math.max(ANTI_COLLAPSE_FLOORS[mode].face_scale, channels.face_scale),
      );
    }
    // Seed newly appearing keys at neutral fallback so boundStep ramps (no teleport).
    for (const k of Object.keys(channels)) {
      if (current[k] === undefined) {
        const stable = STABLE_CAPTURE_KEYS.find((s) => s.key === k);
        current[k] = stable?.fallback ?? 0;
      }
    }

    const floors = antiCollapseBoundFloors(mode);
    const bounded =
      i === 0
        ? {
            values: channels,
            velocity: {} as ContinuityChannelMap,
            acceleration: {} as ContinuityChannelMap,
          }
        : boundStepMap(current, channels, priorVelocity, dt, maxV, maxA, {
            priorAcceleration,
            maxJerk: maxJ,
            floors,
            ceilings: {
              energy_level: 1,
              face_scale: 1.65,
              eye_openness: 1.2,
            },
          });
    priorVelocity = bounded.velocity;
    priorAcceleration = bounded.acceleration;

    // No hard post-step floor (FD jerk). Pre-step + boundStep soft walls only.
    const qChannels: ContinuityChannelMap = {};
    for (const [k, v] of Object.entries(bounded.values)) {
      qChannels[k] = quantize(v, 6);
    }

    // Record hold-level sample for span
    if (phase === "hold" || local > 0.9) {
      routeHoldLevels[toLabel] = qChannels.energy_level ?? 0;
    }
    energyLevels.push(qChannels.energy_level ?? 0);

    const claims = livingFrameClaims({
      midBlink: false,
      midSaccade: false,
      interrupted: phase === "interrupted",
      holdLastGood: false,
    });
    const ownership = resolveOwnership(claims, [
      ...CONTESTED_OWNERSHIP_CHANNELS,
    ]);

    recorder.push({
      channels: qChannels,
      ownership,
      topology: {
        contourSamples: TOPOLOGY_LOCK.contourSamples,
        structuralNodes: TOPOLOGY_LOCK.structuralNodes,
        structuralTriangles: TOPOLOGY_LOCK.structuralTriangles,
        topologyStable: true,
      },
      transition: {
        from: fromId,
        to: toLabel,
        progress: transitionProgress,
        phase,
      },
      interruptEdge,
      t: Number((i * dt).toFixed(9)),
    });
    current = { ...qChannels };
  }

  // Ensure every route has a hold level entry from grammar if missed
  for (const id of FULL_ENERGY_MATRIX_ROUTES) {
    if (routeHoldLevels[id] == null) {
      routeHoldLevels[id] = ENERGY_GRAMMAR[id].level;
    }
  }

  const energy = analyzeEnergySpan(energyLevels);
  energy.routeLevels = { ...routeHoldLevels };

  return { frames: recorder.snapshot(), energy, routeHoldLevels };
}

/** Capture full matrix + analyze continuity derivatives. */
export function captureAndAnalyzeFullEnergyMatrix(opts: {
  seed: number;
  dt?: number;
  framesPerRoute?: number;
  forceInterrupt?: boolean;
}): {
  analysis: FrameSequenceAnalysis;
  energy: EnergySpanReport;
  routeHoldLevels: Record<string, number>;
  frames: ContinuityFrame[];
} {
  const { frames, energy, routeHoldLevels } = captureFullEnergyMatrixSequence(opts);
  const analysis = analyzeFrameSequence(frames, {
    seed: opts.seed,
    dt: opts.dt ?? 1 / 60,
    deterministicScheduling: true,
  });
  return { analysis, energy, routeHoldLevels, frames };
}

/**
 * Capture + analyze in one call (shipped entry used by scripts and tests).
 */
export function captureAndAnalyzeLivingSequence(
  opts: CaptureSequenceOptions,
): FrameSequenceAnalysis {
  const frames = captureLivingFrameSequence(opts);
  const dt = opts.dt ?? 1 / 60;
  return analyzeFrameSequence(frames, {
    seed: opts.seed,
    dt,
    deterministicScheduling: true,
  });
}

/**
 * Dual-run determinism check: two captures with same seed must match within eps.
 */
export function assertDeterministicRerun(
  opts: CaptureSequenceOptions,
  eps?: number,
): {
  ok: boolean;
  a: FrameSequenceAnalysis;
  b: FrameSequenceAnalysis;
  maxAbsDiff: number;
  firstMismatch: string | null;
} {
  const a = captureAndAnalyzeLivingSequence(opts);
  const b = captureAndAnalyzeLivingSequence(opts);
  const cmp = seriesEqualWithin(a, b, eps);
  return {
    ok: cmp.equal,
    a,
    b,
    maxAbsDiff: cmp.maxAbsDiff,
    firstMismatch: cmp.firstMismatch,
  };
}

/** R4 no-blackout route ids exercised densely. */
export type NoBlackoutRouteId =
  | "wake-reconstruct"
  | "dormant-maintain"
  | "bidirectional-forward"
  | "bidirectional-reverse"
  | "wake-dormant-forward"
  | "wake-dormant-reverse"
  | "interruption"
  | "reset";

function pushBoundedFrame(opts: {
  recorder: FrameSequenceRecorder;
  current: ContinuityChannelMap;
  target: ContinuityChannelMap;
  priorVelocity: ContinuityChannelMap;
  priorAcceleration: ContinuityChannelMap;
  dt: number;
  maxV: number;
  maxA: number;
  maxJ: number;
  mode: NoBlackoutMode;
  fromLabel: string;
  toLabel: string;
  progress: number;
  phase: "hold" | "transition" | "interrupted" | "idle";
  interruptEdge?: boolean;
  t: number;
  frameIndex: number;
}): {
  channels: ContinuityChannelMap;
  velocity: ContinuityChannelMap;
  acceleration: ContinuityChannelMap;
} {
  let channels = enforceNoBlackoutFloors(
    enforceAntiCollapseFloors(opts.target, opts.mode as keyof typeof ANTI_COLLAPSE_FLOORS),
    opts.mode,
  );
  for (const k of Object.keys(channels)) {
    if (opts.current[k] === undefined) {
      const stable = STABLE_CAPTURE_KEYS.find((s) => s.key === k);
      opts.current[k] = stable?.fallback ?? 0;
    }
  }
  const floors = antiCollapseBoundFloors(
    opts.mode as keyof typeof ANTI_COLLAPSE_FLOORS,
  );
  const bounded =
    opts.frameIndex === 0
      ? {
          values: channels,
          velocity: {} as ContinuityChannelMap,
          acceleration: {} as ContinuityChannelMap,
        }
      : boundStepMap(
          opts.current,
          channels,
          opts.priorVelocity,
          opts.dt,
          opts.maxV,
          opts.maxA,
          {
            priorAcceleration: opts.priorAcceleration,
            maxJerk: opts.maxJ,
            floors,
            ceilings: {
              energy_level: 1,
              face_scale: 1.65,
              eye_openness: 1.2,
            },
          },
        );
  // Quantize boundStep result without hard post-step floor snaps.
  const qChannels: ContinuityChannelMap = {};
  for (const [k, v] of Object.entries(bounded.values)) {
    qChannels[k] = quantize(v, 6);
  }
  const claims = livingFrameClaims({
    midBlink: false,
    midSaccade: false,
    interrupted: opts.phase === "interrupted",
    holdLastGood: false,
  });
  opts.recorder.push({
    channels: qChannels,
    ownership: resolveOwnership(claims, [...CONTESTED_OWNERSHIP_CHANNELS]),
    topology: {
      contourSamples: TOPOLOGY_LOCK.contourSamples,
      structuralNodes: TOPOLOGY_LOCK.structuralNodes,
      structuralTriangles: TOPOLOGY_LOCK.structuralTriangles,
      topologyStable: true,
    },
    transition: {
      from: opts.fromLabel,
      to: opts.toLabel,
      progress: opts.progress,
      phase: opts.phase,
    },
    interruptEdge: opts.interruptEdge === true,
    t: opts.t,
  });
  return {
    channels: qChannels,
    velocity: bounded.velocity,
    acceleration: bounded.acceleration,
  };
}

/**
 * Dense R4 route capture: Wake reconstruct, Dormant Maintain, bidirectional
 * pair, interruption, reset — each with no-blackout floors + boundStep.
 */
export function captureNoBlackoutRouteSequence(opts: {
  route: NoBlackoutRouteId;
  seed: number;
  dt?: number;
  frameCount?: number;
}): ContinuityFrame[] {
  const seed = opts.seed >>> 0;
  const dt = opts.dt ?? 1 / 60;
  const frameCount = Math.max(8, opts.frameCount ?? 24);
  const recorder = new FrameSequenceRecorder({ seed, dt });
  recorder.start();
  const maxV = DEFAULT_CONTINUITY_THRESHOLDS.maxVelocity * 0.35;
  const maxA = DEFAULT_CONTINUITY_THRESHOLDS.maxAcceleration * 0.75;
  const maxJ = DEFAULT_CONTINUITY_THRESHOLDS.maxJerk * 0.6;

  let current: ContinuityChannelMap;
  let priorVelocity: ContinuityChannelMap = {};
  let priorAcceleration: ContinuityChannelMap = {};

  const neutral = baseChannelsFor("presence-neutral-settled");
  const dormant = baseChannelsFor("dormant-orbit-maintain");
  const listening = baseChannelsFor("presence-listening-receive");
  const thinking = baseChannelsFor("presence-thinking-knit");

  if (opts.route === "wake-reconstruct") {
    current = { ...dormant };
    for (let i = 0; i < frameCount; i++) {
      const p = i / Math.max(1, frameCount - 1);
      const target = sampleWakeReconstruction(p, dormant);
      const stepped = pushBoundedFrame({
        recorder,
        current,
        target,
        priorVelocity,
        priorAcceleration,
        dt,
        maxV,
        maxA,
        maxJ,
        mode: "wake",
        fromLabel: "dormant-orbit-maintain",
        toLabel: "wake",
        progress: p,
        phase: p < 0.05 || p > 0.95 ? "hold" : "transition",
        t: Number((i * dt).toFixed(9)),
        frameIndex: i,
      });
      current = stepped.channels;
      priorVelocity = stepped.velocity;
      priorAcceleration = stepped.acceleration;
    }
    return recorder.snapshot();
  }

  if (opts.route === "dormant-maintain") {
    current = { ...neutral };
    for (let i = 0; i < frameCount; i++) {
      const p = i / Math.max(1, frameCount - 1);
      const target = sampleDormantMaintain(p, i === 0 ? neutral : current);
      const stepped = pushBoundedFrame({
        recorder,
        current,
        target,
        priorVelocity,
        priorAcceleration,
        dt,
        maxV,
        maxA,
        maxJ,
        mode: "dormant",
        fromLabel: "presence-neutral-settled",
        toLabel: "dormant-orbit-maintain",
        progress: p,
        phase: p > 0.85 ? "hold" : "transition",
        t: Number((i * dt).toFixed(9)),
        frameIndex: i,
      });
      current = stepped.channels;
      priorVelocity = stepped.velocity;
      priorAcceleration = stepped.acceleration;
    }
    return recorder.snapshot();
  }

  if (opts.route === "bidirectional-forward") {
    current = { ...listening };
    for (let i = 0; i < frameCount; i++) {
      const p = i / Math.max(1, frameCount - 1);
      const e = smootherstep(p);
      const target = enforceNoBlackoutFloors(
        lerpMaps(listening, thinking, e),
        "ordinary",
      );
      const stepped = pushBoundedFrame({
        recorder,
        current,
        target,
        priorVelocity,
        priorAcceleration,
        dt,
        maxV,
        maxA,
        maxJ,
        mode: "ordinary",
        fromLabel: "presence-listening-receive",
        toLabel: "presence-thinking-knit",
        progress: e,
        phase: e < 0.05 || e > 0.95 ? "hold" : "transition",
        t: Number((i * dt).toFixed(9)),
        frameIndex: i,
      });
      current = stepped.channels;
      priorVelocity = stepped.velocity;
      priorAcceleration = stepped.acceleration;
    }
    return recorder.snapshot();
  }

  if (opts.route === "bidirectional-reverse") {
    current = { ...thinking };
    for (let i = 0; i < frameCount; i++) {
      const p = i / Math.max(1, frameCount - 1);
      const e = smootherstep(p);
      const target = enforceNoBlackoutFloors(
        lerpMaps(thinking, listening, e),
        "ordinary",
      );
      const stepped = pushBoundedFrame({
        recorder,
        current,
        target,
        priorVelocity,
        priorAcceleration,
        dt,
        maxV,
        maxA,
        maxJ,
        mode: "ordinary",
        fromLabel: "presence-thinking-knit",
        toLabel: "presence-listening-receive",
        progress: e,
        phase: e < 0.05 || e > 0.95 ? "hold" : "transition",
        t: Number((i * dt).toFixed(9)),
        frameIndex: i,
      });
      current = stepped.channels;
      priorVelocity = stepped.velocity;
      priorAcceleration = stepped.acceleration;
    }
    return recorder.snapshot();
  }

  if (opts.route === "wake-dormant-forward") {
    // dormant → wake progressive reconstruct (mission bi-di face continuity)
    current = { ...dormant };
    for (let i = 0; i < frameCount; i++) {
      const p = i / Math.max(1, frameCount - 1);
      const target = sampleWakeReconstruction(p, dormant);
      const stepped = pushBoundedFrame({
        recorder,
        current,
        target,
        priorVelocity,
        priorAcceleration,
        dt,
        maxV,
        maxA,
        maxJ,
        mode: "wake",
        fromLabel: "dormant-orbit-maintain",
        toLabel: "wake",
        progress: p,
        phase: p < 0.05 || p > 0.95 ? "hold" : "transition",
        t: Number((i * dt).toFixed(9)),
        frameIndex: i,
      });
      current = stepped.channels;
      priorVelocity = stepped.velocity;
      priorAcceleration = stepped.acceleration;
    }
    return recorder.snapshot();
  }

  if (opts.route === "wake-dormant-reverse") {
    // wake/neutral → dormant settle (inverse of wake reconstruct)
    current = { ...neutral };
    for (let i = 0; i < frameCount; i++) {
      const p = i / Math.max(1, frameCount - 1);
      const target = sampleDormantMaintain(p, i === 0 ? neutral : current);
      const stepped = pushBoundedFrame({
        recorder,
        current,
        target,
        priorVelocity,
        priorAcceleration,
        dt,
        maxV,
        maxA,
        maxJ,
        mode: "dormant",
        fromLabel: "wake",
        toLabel: "dormant-orbit-maintain",
        progress: p,
        phase: p > 0.85 ? "hold" : "transition",
        t: Number((i * dt).toFixed(9)),
        frameIndex: i,
      });
      current = stepped.channels;
      priorVelocity = stepped.velocity;
      priorAcceleration = stepped.acceleration;
    }
    return recorder.snapshot();
  }

  if (opts.route === "interruption") {
    current = { ...listening };
    const mid = Math.floor(frameCount * 0.4);
    const interruptTarget = baseChannelsFor("interruption");
    let interrupted = false;
    let interruptFrom: ContinuityChannelMap | null = null;
    const blendFrames = 10;
    for (let i = 0; i < frameCount; i++) {
      const p = i / Math.max(1, frameCount - 1);
      let target: ContinuityChannelMap;
      let phase: "hold" | "transition" | "interrupted" | "idle" = "transition";
      let interruptEdge = false;
      let progress = smootherstep(p);
      if (i === mid && !interrupted) {
        interrupted = true;
        interruptFrom = { ...current };
        target = lerpMaps(interruptFrom, interruptTarget, 0);
        phase = "interrupted";
        interruptEdge = true;
        progress = 0;
      } else if (interrupted && interruptFrom && i - mid < blendFrames) {
        const bp = Math.min(1, (i - mid) / blendFrames);
        target = lerpMaps(interruptFrom, interruptTarget, smootherstep(bp));
        phase = bp >= 1 ? "hold" : "interrupted";
        interruptEdge = bp < 1;
        progress = bp;
      } else if (interrupted) {
        target = { ...interruptTarget };
        phase = "hold";
        progress = 1;
      } else {
        target = lerpMaps(listening, thinking, smootherstep(p));
        phase = "transition";
      }
      target = enforceNoBlackoutFloors(target, interrupted ? "interrupt" : "ordinary");
      const stepped = pushBoundedFrame({
        recorder,
        current,
        target,
        priorVelocity,
        priorAcceleration,
        dt,
        maxV,
        maxA,
        maxJ,
        mode: interrupted ? "interrupt" : "ordinary",
        fromLabel: "presence-listening-receive",
        toLabel: interrupted ? "interruption" : "presence-thinking-knit",
        progress,
        phase,
        interruptEdge,
        t: Number((i * dt).toFixed(9)),
        frameIndex: i,
      });
      current = stepped.channels;
      priorVelocity = stepped.velocity;
      priorAcceleration = stepped.acceleration;
    }
    return recorder.snapshot();
  }

  // reset
  current = { ...thinking };
  const resetTarget = baseChannelsFor("reset");
  for (let i = 0; i < frameCount; i++) {
    const p = i / Math.max(1, frameCount - 1);
    const e = smootherstep(p);
    const target = enforceNoBlackoutFloors(
      lerpMaps(thinking, resetTarget, e),
      "reset",
    );
    const stepped = pushBoundedFrame({
      recorder,
      current,
      target,
      priorVelocity,
      priorAcceleration,
      dt,
      maxV,
      maxA,
      maxJ,
      mode: "reset",
      fromLabel: "presence-thinking-knit",
      toLabel: "reset",
      progress: e,
      phase: e > 0.92 ? "hold" : "transition",
      t: Number((i * dt).toFixed(9)),
      frameIndex: i,
    });
    current = stepped.channels;
    priorVelocity = stepped.velocity;
    priorAcceleration = stepped.acceleration;
  }
  return recorder.snapshot();
}

/** Capture + analyze no-blackout temporal predicates for one route. */
export function captureAndAnalyzeNoBlackoutRoute(opts: {
  route: NoBlackoutRouteId;
  seed: number;
  dt?: number;
  frameCount?: number;
  forwardFrames?: ContinuityFrame[];
}): {
  frames: ContinuityFrame[];
  analysis: FrameSequenceAnalysis;
  noBlackout: TemporalNoBlackoutReport;
} {
  const frames = captureNoBlackoutRouteSequence(opts);
  const dt = opts.dt ?? 1 / 60;
  const analysis = analyzeFrameSequence(frames, {
    seed: opts.seed,
    dt,
    deterministicScheduling: true,
  });
  const mode: NoBlackoutMode | "mixed" =
    opts.route === "wake-reconstruct" || opts.route === "wake-dormant-forward"
      ? "wake"
      : opts.route === "dormant-maintain" || opts.route === "wake-dormant-reverse"
        ? "dormant"
        : opts.route === "interruption"
          ? "interrupt"
          : opts.route === "reset"
            ? "reset"
            : "ordinary";
  const noBlackout = analyzeNoBlackoutSequence(frames, {
    mode,
    wakeRoute:
      opts.route === "wake-reconstruct" || opts.route === "wake-dormant-forward",
    forwardFrames: opts.forwardFrames,
  });
  return { frames, analysis, noBlackout };
}

/** All R4 routes + inverse pair proof. */
export function captureAndAnalyzeNoBlackoutRouteMatrix(opts: {
  seed: number;
  dt?: number;
  frameCount?: number;
}): {
  routes: Record<
    NoBlackoutRouteId,
    {
      frames: ContinuityFrame[];
      analysis: FrameSequenceAnalysis;
      noBlackout: TemporalNoBlackoutReport;
    }
  >;
  allReadable: boolean;
} {
  const routes = [
    "wake-reconstruct",
    "dormant-maintain",
    "bidirectional-forward",
    "bidirectional-reverse",
    "wake-dormant-forward",
    "wake-dormant-reverse",
    "interruption",
    "reset",
  ] as const;
  const out = {} as Record<
    NoBlackoutRouteId,
    {
      frames: ContinuityFrame[];
      analysis: FrameSequenceAnalysis;
      noBlackout: TemporalNoBlackoutReport;
    }
  >;
  let allReadable = true;
  let forwardFrames: ContinuityFrame[] | undefined;
  let wakeDormantForward: ContinuityFrame[] | undefined;
  for (const route of routes) {
    const result = captureAndAnalyzeNoBlackoutRoute({
      route,
      seed: opts.seed,
      dt: opts.dt,
      frameCount: opts.frameCount,
      forwardFrames:
        route === "bidirectional-reverse"
          ? forwardFrames
          : route === "wake-dormant-reverse"
            ? wakeDormantForward
            : undefined,
    });
    if (route === "bidirectional-forward") {
      forwardFrames = result.frames;
    }
    if (route === "wake-dormant-forward") {
      wakeDormantForward = result.frames;
    }
    out[route] = result;
    if (!result.noBlackout.readable) allReadable = false;
    if (!result.analysis.boundedDerivatives) allReadable = false;
  }
  return { routes: out, allReadable };
}
