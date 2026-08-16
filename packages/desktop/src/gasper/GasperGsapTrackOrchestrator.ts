/**
 * Coordinates GSAP tracks across morphology domains (v0.2).
 * Embodiment/expression/manual changes must not leave relief/energy/optics unsynced.
 */

import gsap from "./gsap-shim";
import {
  MORPHOLOGY_DOMAINS,
  REQUIRED_GSAP_TRACKS,
  type MorphologyDomainId,
} from "./GasperMorphologyDomains";
import type { DomainScalarMap } from "./GasperDomainState";

export type TrackDomainId = (typeof REQUIRED_GSAP_TRACKS)[number];

type TrackProxy = { value: number };

type ActiveTimeline = {
  kill: () => void;
  pause: () => void;
  play: () => void;
  progress: (value?: number) => number;
  isActive: () => boolean;
  duration: () => number;
};

export class GasperGsapTrackOrchestrator {
  private trackProxies = new Map<string, TrackProxy>();
  private bindingToTrack = new Map<string, string>();
  private activeTimeline: ActiveTimeline | null = null;
  private onFlush: ((values: DomainScalarMap) => void) | null = null;
  /** Start values captured when the last coordinated clip began (for scrub without active tl). */
  private clipFrom: DomainScalarMap = {};
  private clipTo: DomainScalarMap = {};
  private playhead = 0;

  constructor() {
    for (const d of MORPHOLOGY_DOMAINS) {
      for (const bid of d.bindingIds) {
        this.bindingToTrack.set(bid, d.gsapTrack);
      }
    }
    // legacy keys
    for (const bid of [
      "overall_width",
      "overall_height",
      "crown_height",
      "lower_body_fullness",
      "ground_flattening",
    ]) {
      this.bindingToTrack.set(bid, "macro");
    }
  }

  setFlushHandler(fn: (values: DomainScalarMap) => void) {
    this.onFlush = fn;
  }

  ensureProxy(bindingId: string, initial = 0): TrackProxy {
    let p = this.trackProxies.get(bindingId);
    if (!p) {
      p = { value: initial };
      this.trackProxies.set(bindingId, p);
    }
    return p;
  }

  snapshot(): DomainScalarMap {
    const out: DomainScalarMap = {};
    for (const [id, p] of this.trackProxies) out[id] = p.value;
    return out;
  }

  /** Hot path: single binding via quickTo on track proxy. */
  previewBinding(
    bindingId: string,
    value: number,
    onUpdate: (v: number) => void,
  ) {
    const proxy = this.ensureProxy(bindingId, value);
    const qt = gsap.quickTo(proxy, "value", {
      duration: 0.08,
      ease: "none",
      onUpdate: () => {
        onUpdate(proxy.value);
        this.onFlush?.(this.snapshot());
      },
    });
    qt(value);
  }

  /**
   * Coordinate multi-domain retarget (embodiment morph, expression, Book 004 plan).
   * All listed domains receive concurrent timeline tweens from current values.
   * GASPER-007-G: optional per-channel duration scales and phase offsets.
   */
  playCoordinated(
    targets: DomainScalarMap,
    opts: {
      duration?: number;
      ease?: string;
      domains?: MorphologyDomainId[];
      label?: string;
      onProgress?: (t: number) => void;
      onComplete?: () => void;
      paused?: boolean;
      /** Per-binding duration multipliers (semantic phase). */
      channelDurationScale?: DomainScalarMap;
      /** Per-binding delay seconds. */
      phaseOffsets?: DomainScalarMap;
    } = {},
  ): ActiveTimeline {
    this.activeTimeline?.kill();
    const duration = opts.duration ?? 0.9;
    const ease = opts.ease ?? "power2.out";
    const scales = opts.channelDurationScale ?? {};
    const phases = opts.phaseOffsets ?? {};
    this.clipFrom = this.snapshot();
    // Ensure from proxies exist at current values
    for (const [bindingId, target] of Object.entries(targets)) {
      this.ensureProxy(
        bindingId,
        proxyValueOr(this.trackProxies, bindingId, this.clipFrom[bindingId] ?? target),
      );
      if (this.clipFrom[bindingId] === undefined) {
        this.clipFrom[bindingId] = this.trackProxies.get(bindingId)?.value ?? target;
      }
    }
    this.clipTo = { ...targets };
    this.playhead = 0;

    const tl = gsap.timeline({
      defaults: { overwrite: "auto" },
      paused: Boolean(opts.paused),
      onUpdate: () => {
        this.playhead = tl.progress();
        this.onFlush?.(this.snapshot());
        opts.onProgress?.(this.playhead);
      },
      onComplete: () => {
        this.playhead = 1;
        this.onFlush?.(this.snapshot());
        opts.onProgress?.(1);
        if (this.activeTimeline === (tl as unknown as ActiveTimeline)) {
          this.activeTimeline = null;
        }
        opts.onComplete?.();
      },
    });
    if (opts.label) tl.addLabel(opts.label, 0);

    for (const [bindingId, target] of Object.entries(targets)) {
      const proxy = this.ensureProxy(
        bindingId,
        proxyValueOr(this.trackProxies, bindingId, target),
      );
      const d = Math.max(0.05, duration * (scales[bindingId] ?? 1));
      const delay = phases[bindingId] ?? 0;
      // start from current proxy value (retarget-current, no snap to canonical)
      tl.to(
        proxy,
        {
          value: target,
          duration: d,
          ease,
          overwrite: "auto",
          onUpdate: () => this.onFlush?.(this.snapshot()),
        },
        delay,
      );
    }
    this.activeTimeline = tl as unknown as ActiveTimeline;
    // Kick one flush so listeners attach before first GSAP tick
    this.onFlush?.(this.snapshot());
    return this.activeTimeline;
  }

  /** 0–1 playhead of the active coordinated clip (or last scrub). */
  getPlayhead(): number {
    return this.playhead;
  }

  isPlaying(): boolean {
    return Boolean(this.activeTimeline?.isActive?.());
  }

  pause(): void {
    try {
      this.activeTimeline?.pause();
    } catch {
      /* ignore */
    }
  }

  resume(): void {
    try {
      this.activeTimeline?.play();
    } catch {
      /* ignore */
    }
  }

  /**
   * Seek coordinated clip to progress t ∈ [0,1].
   * If no active timeline, lerps last clipFrom→clipTo (or no-ops when empty).
   */
  seek(t: number): void {
    const p = Math.max(0, Math.min(1, t));
    this.playhead = p;
    if (this.activeTimeline) {
      try {
        this.activeTimeline.progress(p);
        this.activeTimeline.pause();
      } catch {
        /* ignore */
      }
      this.onFlush?.(this.snapshot());
      return;
    }
    const keys = new Set([
      ...Object.keys(this.clipFrom),
      ...Object.keys(this.clipTo),
    ]);
    if (keys.size === 0) return;
    const values: DomainScalarMap = {};
    for (const id of keys) {
      const a = this.clipFrom[id] ?? this.trackProxies.get(id)?.value ?? 0;
      const b = this.clipTo[id] ?? a;
      const v = a + (b - a) * p;
      const proxy = this.ensureProxy(id, a);
      proxy.value = v;
      values[id] = v;
    }
    this.onFlush?.(values);
  }

  interrupt() {
    this.activeTimeline?.kill();
    this.activeTimeline = null;
  }

  /**
   * Apply binding values + optional playhead without single-clip lerp.
   * Used by multi-keyframe scrub (Wave R8 depth).
   */
  applyValues(values: DomainScalarMap, playhead?: number): void {
    for (const [id, v] of Object.entries(values)) {
      if (typeof v !== "number") continue;
      this.ensureProxy(id, v).value = v;
    }
    if (typeof playhead === "number" && Number.isFinite(playhead)) {
      this.playhead = Math.max(0, Math.min(1, playhead));
    }
    this.onFlush?.(this.snapshot());
  }

  /** Domains that have at least one binding in targets. */
  domainsInTargets(targets: DomainScalarMap): MorphologyDomainId[] {
    const ids = new Set<MorphologyDomainId>();
    for (const bid of Object.keys(targets)) {
      const d = MORPHOLOGY_DOMAINS.find((x) => x.bindingIds.includes(bid));
      if (d) ids.add(d.id);
    }
    return [...ids];
  }

  requiredTracks(): readonly string[] {
    return REQUIRED_GSAP_TRACKS;
  }
}

function proxyValueOr(
  map: Map<string, TrackProxy>,
  id: string,
  fallback: number,
): number {
  return map.get(id)?.value ?? fallback;
}
