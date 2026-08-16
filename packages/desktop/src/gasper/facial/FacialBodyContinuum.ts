/**
 * FacialBodyContinuum — multi-frame stepper for continuous one-body facial deformation.
 *
 * Owns interpolation, anticipation / settle / overshoot clamps, interrupt continuation,
 * and hold-last-good handoff. Feeds channel maps into expression projection; does not
 * steal GSAP/native frame authority (consumers apply channels on the host tick).
 */

import {
  DEFAULT_FACIAL_POLICY,
  FACE_ONLY_CHANNELS,
  FACIAL_BODY_CHANNELS,
  FACIAL_SEMANTIC_TARGETS,
  WHOLE_FACE_CHANNELS,
  analyzeFacialSequence,
  attachmentErrorFromChannels,
  boundFacialStep,
  enforceExpressionVisibilityFloors,
  getFacialSemantic,
  getWholeFaceMorphology,
  interpolateExpressionContinuum,
  listFacialSemantics,
  resolveFacialSemantic,
  resolveWholeFaceSemantic,
  type FacialChannelMap,
  type FacialContinuumPolicy,
  type FacialFrame,
  type FacialMotionPhase,
  type FacialOwner,
  type FacialSemanticId,
  type FacialSequenceReport,
} from "../../../../shared/src/gasper/facial";
import { applyControlAsGain, clampExpressionGain } from "../../../../shared/src/gasper/index";
import { projectExpression, PHYSICAL_BASELINE } from "../expression/grammar";
import type { DomainScalarMap } from "../GasperDomainState";

/**
 * Presence holds need high control-as-gain so multi-domain morphology stays legible.
 * R3 contact-sheet blackouts: gain 0.4 + double application collapsed facial deltas
 * into near-baseline (visually inert) holds.
 */
export const PRESENCE_EXPRESSION_GAIN = 0.92;

/**
 * How firmly authored whole-face morphology wins over gain-shrunk companions
 * at default presence gain. Scales with expressionGain so gain remains non-noop
 * while default holds stay multi-domain distinct.
 */
export const WHOLE_FACE_MORPHOLOGY_AUTHORITY = 0.95;

export type ContinuumTargetSpec = {
  /** Semantic face or kernel fixture id. */
  targetId: string;
  embodiment?: string;
  expressionGain?: number;
  /** Total synthetic frames for full anticipate→transition→settle. */
  totalFrames?: number;
};

export type ContinuumSnapshot = {
  revision: number;
  phase: FacialMotionPhase;
  fromId: string;
  toId: string;
  frame: number;
  totalFrames: number;
  channels: FacialChannelMap;
  ownership: Record<string, FacialOwner>;
  mix: number;
  holdingLastGood: boolean;
  interrupted: boolean;
};

export type StepResult = {
  snapshot: ContinuumSnapshot;
  frame: FacialFrame;
};

const CONTESTED = ["eye_openness", "gaze", "mouth_openness", "mouth_width", "face_scale"] as const;

/**
 * Project a semantic / fixture id into multi-domain whole-face channels via
 * morphology vocabulary + expression grammar. Always merges onto PHYSICAL_BASELINE
 * so sparse targets remain one-body multi-domain (not same-mask scale variants).
 *
 * Whole-face morphology is re-asserted at full authored authority after control-as-gain
 * so Presence holds stay legible and multi-domain distinct (R4 expression visibility).
 */
export function projectFacialTarget(
  targetId: string,
  opts?: { embodiment?: string; expressionGain?: number },
): { ok: true; id: string; semantic: FacialSemanticId | null; channels: FacialChannelMap } | { ok: false; error: string } {
  // Whole-face vocabulary is authoritative for the six Presence holds.
  const wholeFaceKey = resolveWholeFaceSemantic(targetId);
  const semantic = resolveFacialSemantic(targetId) ?? (wholeFaceKey as FacialSemanticId | null);
  if (semantic || wholeFaceKey) {
    const key = wholeFaceKey ?? (semantic as NonNullable<typeof wholeFaceKey>);
    const wf = getWholeFaceMorphology(key);
    const t = semantic ? getFacialSemantic(semantic) : null;
    const presenceGain = clampExpressionGain(
      opts?.expressionGain ?? PRESENCE_EXPRESSION_GAIN,
    );
    const projected = projectExpression({
      fixtureId: wf.kernelId,
      embodiment: opts?.embodiment ?? "presence",
      expressionGain: presenceGain,
    });
    // Order: baseline → expression projection → semantic face → whole-face morphology
    // so coordinated dual-lid / brow / cheek / contour / asymmetry always win.
    const absolute: FacialChannelMap = {
      ...PHYSICAL_BASELINE,
      ...(projected.ok && projected.state ? projected.state.channels : {}),
      ...(t ? t.channels : {}),
      ...wf.channels,
    };
    const gained = applyControlAsGain(absolute, presenceGain, {
      baseline: PHYSICAL_BASELINE,
      absoluteTargets: true,
    }) as FacialChannelMap;

    // Re-assert whole-face morphology + coupled legacy keys, scaled by gain.
    // auth→1 at PRESENCE_EXPRESSION_GAIN so default holds stay multi-domain legible;
    // low gain still reduces displacement (expressionGain is not a no-op).
    const channels: FacialChannelMap = { ...gained };
    const gainRatio = presenceGain / PRESENCE_EXPRESSION_GAIN;
    const auth = Math.max(
      0.2,
      Math.min(1, WHOLE_FACE_MORPHOLOGY_AUTHORITY * gainRatio),
    );
    for (const ch of WHOLE_FACE_CHANNELS) {
      const authored = wf.channels[ch];
      if (typeof authored !== "number" || !Number.isFinite(authored)) continue;
      const g = channels[ch];
      channels[ch] =
        typeof g === "number" && Number.isFinite(g)
          ? g + (authored - g) * auth
          : authored;
    }
    // Coupled legacy continuum keys derived from morphology (document geometry path).
    for (const k of [
      "eye_openness",
      "eye_spacing",
      "mouth_openness",
      "mouth_width",
      "gaze",
      "corner_pull_l",
      "corner_pull_r",
      "skin_tension",
      "energy_level",
      "energy_pulse",
      "internal_glow",
      "face_emissive",
      "overall_width",
      "overall_height",
      "face_scale",
      "relief_amplitude",
    ] as const) {
      const authored = wf.channels[k];
      if (typeof authored !== "number" || !Number.isFinite(authored)) continue;
      const g = channels[k];
      channels[k] =
        typeof g === "number" && Number.isFinite(g)
          ? g + (authored - g) * auth
          : authored;
    }

    return {
      ok: true,
      id: wf.kernelId,
      semantic: (semantic ?? key) as FacialSemanticId,
      channels: enforceExpressionVisibilityFloors(channels, "presence"),
    };
  }

  const projected = projectExpression({
    fixtureId: targetId,
    embodiment: opts?.embodiment ?? "presence",
    expressionGain: opts?.expressionGain ?? PRESENCE_EXPRESSION_GAIN,
  });
  if (!projected.ok || !projected.state) {
    return { ok: false, error: projected.error ?? `unknown target ${targetId}` };
  }
  // Even non-semantic fixtures: fill whole-face defaults from baseline + visibility floors.
  return {
    ok: true,
    id: projected.state.fixtureId,
    semantic: resolveFacialSemantic(projected.state.fixtureId),
    channels: enforceExpressionVisibilityFloors(
      { ...PHYSICAL_BASELINE, ...projected.state.channels },
      "presence",
    ),
  };
}

export class FacialBodyContinuum {
  private policy: FacialContinuumPolicy;
  private revision = 0;
  private fromId = "neutral-settled";
  private toId = "neutral-settled";
  private fromChannels: FacialChannelMap;
  private toChannels: FacialChannelMap;
  private current: FacialChannelMap;
  private velocity: FacialChannelMap = {};
  private acceleration: FacialChannelMap = {};
  private frame = 0;
  private totalFrames = 48;
  private phase: FacialMotionPhase = "hold";
  private mix = 1;
  private holdingLastGood = false;
  private interrupted = false;
  private lastGood: FacialChannelMap;
  private ownership: Record<string, FacialOwner> = {};
  private history: FacialFrame[] = [];

  constructor(policy: Partial<FacialContinuumPolicy> = {}) {
    this.policy = { ...DEFAULT_FACIAL_POLICY, ...policy };
    const neutral = projectFacialTarget("neutral");
    const ch =
      neutral.ok
        ? neutral.channels
        : ({ ...PHYSICAL_BASELINE } as FacialChannelMap);
    this.fromChannels = { ...ch };
    this.toChannels = { ...ch };
    this.current = { ...ch };
    this.lastGood = { ...ch };
    this.ownership = this.ownersFor("state_target");
  }

  getPolicy(): FacialContinuumPolicy {
    return { ...this.policy };
  }

  getSnapshot(): ContinuumSnapshot {
    return {
      revision: this.revision,
      phase: this.phase,
      fromId: this.fromId,
      toId: this.toId,
      frame: this.frame,
      totalFrames: this.totalFrames,
      channels: { ...this.current },
      ownership: { ...this.ownership },
      mix: this.mix,
      holdingLastGood: this.holdingLastGood,
      interrupted: this.interrupted,
    };
  }

  getHistory(): FacialFrame[] {
    return this.history.map((f) => ({
      ...f,
      channels: { ...f.channels },
      ownership: { ...f.ownership },
      attachmentError: { ...f.attachmentError },
    }));
  }

  clearHistory(): void {
    this.history = [];
  }

  /**
   * Retarget continuum to a new semantic / fixture.
   * Idempotent when same target + already settled: bumps revision only if channels change.
   */
  setTarget(spec: ContinuumTargetSpec): { ok: boolean; error?: string; snapshot: ContinuumSnapshot } {
    const projected = projectFacialTarget(spec.targetId, {
      embodiment: spec.embodiment,
      expressionGain: spec.expressionGain,
    });
    if (!projected.ok) {
      return { ok: false, error: projected.error, snapshot: this.getSnapshot() };
    }

    // Idempotent no-op when already holding this target (same kernel id, settled).
    if (
      this.phase === "hold" &&
      this.toId === projected.id &&
      !this.interrupted &&
      channelNear(this.current, projected.channels, 0.08)
    ) {
      return { ok: true, snapshot: this.getSnapshot() };
    }

    this.fromId = this.toId;
    this.fromChannels = { ...this.current };
    this.toId = projected.id;
    this.toChannels = { ...projected.channels };
    this.totalFrames = Math.max(16, spec.totalFrames ?? 48);
    this.frame = 0;
    this.interrupted = false;
    this.holdingLastGood = false;
    this.phase = "anticipate";
    this.mix = 0;
    this.ownership = this.ownersFor("state_target");
    this.revision += 1;
    return { ok: true, snapshot: this.getSnapshot() };
  }

  /**
   * Interrupt mid-transition: capture hold-last-good, then retarget continuously.
   * Never snaps; first post-interrupt step keeps last-good ownership.
   */
  interrupt(spec: ContinuumTargetSpec): { ok: boolean; error?: string; snapshot: ContinuumSnapshot } {
    // Project first — never corrupt hold/interrupt flags on unknown targets.
    const projected = projectFacialTarget(spec.targetId, {
      embodiment: spec.embodiment,
      expressionGain: spec.expressionGain,
    });
    if (!projected.ok) {
      return { ok: false, error: projected.error, snapshot: this.getSnapshot() };
    }

    this.lastGood = { ...this.current };
    this.holdingLastGood = true;
    this.interrupted = true;
    this.ownership = this.ownersFor("hold_last_good");
    this.fromId = this.toId;
    this.fromChannels = { ...this.lastGood };
    this.toId = projected.id;
    this.toChannels = { ...projected.channels };
    this.totalFrames = Math.max(16, spec.totalFrames ?? 40);
    this.frame = 0;
    this.phase = "interrupted";
    this.mix = 0;
    this.revision += 1;
    return { ok: true, snapshot: this.getSnapshot() };
  }

  /**
   * Advance one synthetic frame at dt. Deterministic for fixed seed/path.
   * Callers (GSAP ticker / native frame) own real clock; this is policy math only.
   */
  step(dt?: number): StepResult {
    const safeDt = dt && dt > 0 ? dt : this.policy.dtDefault;
    const interruptEdge = this.holdingLastGood && this.interrupted && this.frame === 0;

    let proposed: FacialChannelMap;
    let phase: FacialMotionPhase;
    let mix: number;

    if (this.holdingLastGood && this.frame === 0) {
      // Hold last good for the interrupt edge frame — no teleport.
      proposed = { ...this.lastGood };
      phase = "interrupted";
      mix = this.mix;
      this.ownership = this.ownersFor("hold_last_good");
    } else {
      if (this.holdingLastGood) {
        this.holdingLastGood = false;
        this.ownership = this.ownersFor("interrupt_blend");
      } else if (this.phase === "settle") {
        this.ownership = this.ownersFor("settle");
      } else {
        this.ownership = this.ownersFor("state_target");
      }

      // Continuum sample is multi-domain (face+shell+energy) — one-body by construction.
      const sample = interpolateExpressionContinuum(
        this.fromChannels,
        this.toChannels,
        this.frame,
        this.totalFrames,
        this.policy,
      );
      proposed = sample.channels;
      phase = this.interrupted && this.frame < 2 ? "interrupted" : sample.phase;
      mix = sample.mix;
    }

    // Visibility floors on the *proposal* (before derivative clamp) so floors
    // cannot inject post-clamp jerk spikes that fail sequence boundedness.
    const visMode =
      this.holdingLastGood || this.interrupted
        ? "interrupt"
        : this.toId.includes("dormant")
          ? "dormant"
          : "presence";
    const flooredProposed = enforceExpressionVisibilityFloors(proposed, visMode);

    const bounded = boundFacialStep(
      this.current,
      flooredProposed,
      this.velocity,
      this.acceleration,
      safeDt,
      this.policy,
    );

    this.current = bounded.values;
    this.velocity = bounded.velocity;
    this.acceleration = bounded.acceleration;
    this.phase = phase;
    this.mix = mix;

    if (this.frame >= this.totalFrames - 1 && !this.holdingLastGood) {
      this.phase = "hold";
      this.mix = 1;
      this.interrupted = false;
      // Soft approach final target under the same derivative bounds (no hard snap).
      const end = boundFacialStep(
        this.current,
        enforceExpressionVisibilityFloors(this.toChannels, visMode),
        this.velocity,
        this.acceleration,
        safeDt,
        this.policy,
      );
      this.current = end.values;
      this.velocity = end.velocity;
      this.acceleration = end.acceleration;
      this.ownership = this.ownersFor("state_target");
    }

    const t = this.history.length === 0 ? 0 : this.history[this.history.length - 1]!.t + safeDt;
    const frame: FacialFrame = {
      index: this.history.length,
      t,
      phase: this.phase,
      channels: { ...this.current },
      ownership: { ...this.ownership },
      attachmentError: attachmentErrorFromChannels(this.current),
      interruptEdge,
    };
    this.history.push(frame);
    this.frame += 1;
    this.revision += 1;

    // Capture last-good continuously when not mid hold-edge.
    if (!this.holdingLastGood) {
      this.lastGood = { ...this.current };
    }

    return { snapshot: this.getSnapshot(), frame };
  }

  /**
   * Run a full continuous transition and return dense frames + analysis.
   */
  runSequence(
    fromId: string,
    toId: string,
    opts?: { totalFrames?: number; dt?: number; embodiment?: string },
  ): { frames: FacialFrame[]; report: FacialSequenceReport } {
    this.clearHistory();
    const start = projectFacialTarget(fromId, { embodiment: opts?.embodiment });
    if (!start.ok) throw new Error(start.error);
    this.fromId = start.id;
    this.toId = start.id;
    this.fromChannels = { ...start.channels };
    this.toChannels = { ...start.channels };
    this.current = { ...start.channels };
    this.lastGood = { ...start.channels };
    this.velocity = {};
    this.acceleration = {};
    this.frame = 0;
    this.phase = "hold";
    this.interrupted = false;
    this.holdingLastGood = false;
    this.ownership = this.ownersFor("state_target");

    // Seed one hold frame at origin.
    const dt = opts?.dt ?? this.policy.dtDefault;
    this.history.push({
      index: 0,
      t: 0,
      phase: "hold",
      channels: { ...this.current },
      ownership: { ...this.ownership },
      attachmentError: attachmentErrorFromChannels(this.current),
      interruptEdge: false,
    });

    this.setTarget({
      targetId: toId,
      totalFrames: opts?.totalFrames ?? 48,
      embodiment: opts?.embodiment,
    });

    const n = opts?.totalFrames ?? 48;
    for (let i = 0; i < n; i++) {
      this.step(dt);
    }
    const frames = this.getHistory();
    return { frames, report: analyzeFacialSequence(frames, this.policy) };
  }

  /**
   * Neutral → target → interrupt mid-way → new target, with hold-last-good.
   */
  runInterruptSequence(opts?: {
    fromId?: string;
    firstTarget?: string;
    secondTarget?: string;
    totalFrames?: number;
    interruptAt?: number;
    dt?: number;
  }): { frames: FacialFrame[]; report: FacialSequenceReport } {
    this.clearHistory();
    const fromId = opts?.fromId ?? "neutral";
    const first = opts?.firstTarget ?? "recognition";
    const second = opts?.secondTarget ?? "blocked";
    const total = opts?.totalFrames ?? 48;
    const interruptAt = opts?.interruptAt ?? Math.floor(total / 2);
    const dt = opts?.dt ?? this.policy.dtDefault;

    const start = projectFacialTarget(fromId);
    if (!start.ok) throw new Error(start.error);
    this.fromId = start.id;
    this.toId = start.id;
    this.fromChannels = { ...start.channels };
    this.toChannels = { ...start.channels };
    this.current = { ...start.channels };
    this.lastGood = { ...start.channels };
    this.velocity = {};
    this.acceleration = {};
    this.frame = 0;
    this.phase = "hold";
    this.interrupted = false;
    this.holdingLastGood = false;
    this.ownership = this.ownersFor("state_target");

    this.history.push({
      index: 0,
      t: 0,
      phase: "hold",
      channels: { ...this.current },
      ownership: { ...this.ownership },
      attachmentError: attachmentErrorFromChannels(this.current),
      interruptEdge: false,
    });

    this.setTarget({ targetId: first, totalFrames: total });
    for (let i = 0; i < interruptAt; i++) this.step(dt);
    this.interrupt({ targetId: second, totalFrames: total });
    for (let i = 0; i < total; i++) this.step(dt);

    const frames = this.getHistory();
    return { frames, report: analyzeFacialSequence(frames, this.policy) };
  }

  /** DomainScalarMap view for expression / rig consumers. */
  asDomainScalars(): DomainScalarMap {
    return { ...this.current };
  }

  private ownersFor(role: FacialOwner): Record<string, FacialOwner> {
    const out: Record<string, FacialOwner> = {};
    // One-body ownership: same role for face + shell + energy + motion channels.
    for (const k of FACIAL_BODY_CHANNELS) out[k] = role;
    for (const k of CONTESTED) out[k] = role;
    return out;
  }
}

function channelNear(a: FacialChannelMap, b: FacialChannelMap, eps: number): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const av = a[k] ?? 0;
    const bv = b[k] ?? 0;
    if (Math.abs(av - bv) > eps) return false;
  }
  return true;
}

/** List semantic ids for studio / tests. */
export function listContinuumSemantics(): FacialSemanticId[] {
  return listFacialSemantics();
}

export function continuumSemanticChannels(id: FacialSemanticId): FacialChannelMap {
  return { ...FACIAL_SEMANTIC_TARGETS[id].channels };
}

// Re-export face-only list for tests that assert no discrete swap path.
export { FACE_ONLY_CHANNELS };
