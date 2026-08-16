/**
 * GASPER-CRAFT-001 · C1 — the live curve-performance transport.
 *
 * Subscribes to the organism clock (sole time source; same idiom as
 * WorldPhysicsDriver) at priority 26 — one tick AFTER the physics driver
 * (25) — and plays a compiled PerformancePack. Each tick it forwards:
 *
 *  - the world pose through the Phase A fence as `curve-authority`
 *    (or `scene-authority` when a scene sequencer launches the pack);
 *  - silhouette deltas through the D-0090 fence vocabulary — stretch →
 *    overall_height, width DERIVED from the volume law Sx·Sy = 1, squash →
 *    ground_flattening — every channel bounded by PHYSICS_CHANNEL_BOUNDS;
 *  - wake/light feeds derived from track derivatives × physToLiving (1/160);
 *  - a face-energy scalar (C4 maps AU recipes onto it) and the current
 *    beat's shot scale (witness telemetry for the depth-legibility law).
 *
 * D-0107: the camera intents are RETIRED (D-0099 Doctrine 1 — the camera is
 * the monitor; camera channels have no actuator and the compiler rejects
 * them). Framing is authored as Gasper's depth.
 *
 * Pose-to-pose / straight-ahead division of labor: inside a `physics`-mode
 * segment the driver yields the pose channel (`poseYield: true`) — D-0090
 * ballistics own that window — while still supplying silhouette/face feeds.
 * Curves own everything else, including the handoff keys.
 *
 * Auto-release: at pack end the driver forwards provenance `none` once and
 * idles — packs are authored to end home (D-0089 collapse path: the renderer
 * eases Gasper back). Reduced motion collapses the authority the same way
 * (motionStrength 0 at the renderer).
 */
import type { GasperOrganismClockPort, OrganismClockFrame } from "../clock";
import type { WorldProvenance } from "../space/WorldSpace";
import { WORLD_PHYSICS_CONSTANTS } from "../physics/WorldPhysics";
import { PHYSICS_CHANNEL_BOUNDS } from "../physics/PhysicsSilhouetteAuthority";
import { evaluateCurveTrackDerivative } from "./CurveTrack";
import {
  beatAt,
  packChannelValueAt,
  segmentAt,
  type PackChannelId,
  type PackSegmentMode,
  type PackShotScale,
  type PerformancePack,
} from "./PerformancePack";

/** Provenances a pack may claim (never physics/capture — those are fenced). */
export type PackProvenance = "curve-authority" | "scene-authority";

export type PerformancePackParams = Readonly<{
  /** Playback-rate rail (C4 Tempo): 0.75 … 1.25. */
  tempo: number;
  /** Amplitude rail (C4 Exaggeration): 0.5 … 2, default 1.25. */
  exaggeration: number;
}>;

export const PERFORMANCE_PACK_PARAM_BOUNDS = Object.freeze({
  tempo: Object.freeze({ min: 0.75, max: 1.25 }),
  exaggeration: Object.freeze({ min: 0.5, max: 2 }),
});

export const DEFAULT_PERFORMANCE_PACK_PARAMS: PerformancePackParams =
  Object.freeze({ tempo: 1, exaggeration: 1.25 });

export function clampPerformancePackParams(
  patch: Partial<PerformancePackParams> | undefined,
  base: PerformancePackParams = DEFAULT_PERFORMANCE_PACK_PARAMS,
): PerformancePackParams {
  const B = PERFORMANCE_PACK_PARAM_BOUNDS;
  const pick = (v: number | undefined, fb: number, min: number, max: number) =>
    Math.max(min, Math.min(max, typeof v === "number" && Number.isFinite(v) ? v : fb));
  return Object.freeze({
    tempo: pick(patch?.tempo, base.tempo, B.tempo.min, B.tempo.max),
    exaggeration: pick(
      patch?.exaggeration,
      base.exaggeration,
      B.exaggeration.min,
      B.exaggeration.max,
    ),
  });
}

export type PerformancePackDriverOutput = Readonly<{
  /** Pack time this tick sampled (seconds). */
  t: number;
  pose: Readonly<{
    x: number;
    y: number;
    z: number;
    tilt: number;
    provenance: WorldProvenance;
  }>;
  /** True inside physics-mode segments — D-0090 owns the pose channel. */
  poseYield: boolean;
  /** Bounded silhouette deltas (empty when nothing authored is active). */
  silhouetteDeltas: Readonly<Record<string, number>>;
  /** Wake-warp feed in living-speed units (content-space; +y down). */
  wakeVX: number;
  wakeVY: number;
  /** MOTION_LIGHT feed, living-speed units, 0..12. */
  lightSpeed: number;
  /** Expression energy 0..1 — C4 maps AU recipes onto this carrier. */
  face: number;
  /**
   * GASPER-CRAFT-002 S4: authored impact-ripple phase 0..1 (the
   * `ground_impact` channel) — the floor answers to weight (Doctrine 4).
   * 0 at rest = invisible.
   */
  groundImpact: number;
  beatId: string | null;
  /**
   * The current beat's shot scale — witness telemetry for the depth-
   * legibility law (Doctrine 1: the scale names Gasper's authored depth).
   */
  shotScale: PackShotScale | null;
  segmentMode: PackSegmentMode;
}>;

/** One organism-clock beat after world-physics (25): the pack composes its
 * pose from the LIVE physics body of the SAME tick (GASPER-NORTHSTAR-001 N60
 * ordering — the yield at release leaves the latest same-tick physics pose). */
export const PERFORMANCE_PACK_CLOCK_PRIORITY = 26;

export class PerformancePackDriver {
  private pack: PerformancePack | null = null;
  private provenance: PackProvenance = "curve-authority";
  private t = 0;
  private params: PerformancePackParams = DEFAULT_PERFORMANCE_PACK_PARAMS;
  private running = false;
  private readonly unsub: () => void;

  constructor(
    clock: Pick<GasperOrganismClockPort, "subscribe">,
    private readonly forward: (out: PerformancePackDriverOutput) => void,
  ) {
    this.unsub = clock.subscribe({
      id: "performance-pack",
      priority: PERFORMANCE_PACK_CLOCK_PRIORITY, // one beat after world-physics (25): pose yields, feeds layer
      onFrame: (frame: OrganismClockFrame) => this.tick(frame),
    });
  }

  destroy(): void {
    this.unsub();
  }

  /** Start (or restart) a compiled pack. */
  run(
    pack: PerformancePack,
    opts: { provenance?: PackProvenance } = {},
  ): void {
    this.pack = pack;
    this.provenance =
      opts.provenance === "scene-authority" ? "scene-authority" : "curve-authority";
    this.t = 0;
    this.running = true;
  }

  /** Release the authority — provenance none, renderer eases home. */
  disarm(): void {
    const duration = this.pack?.durationSeconds ?? 0;
    this.running = false;
    this.forward({
      t: duration,
      pose: { x: 0, y: 0, z: 0, tilt: 0, provenance: "none" },
      poseYield: false,
      silhouetteDeltas: {},
      wakeVX: 0,
      wakeVY: 0,
      lightSpeed: 0,
      face: 0,
      groundImpact: 0,
      beatId: null,
      shotScale: null,
      segmentMode: "authored",
    });
  }

  setParams(patch: Partial<PerformancePackParams> | undefined): void {
    this.params = clampPerformancePackParams(patch, this.params);
  }

  getState(): Readonly<{
    running: boolean;
    t: number;
    packId: string | null;
    params: PerformancePackParams;
  }> {
    return {
      running: this.running,
      t: this.t,
      packId: this.pack?.id ?? null,
      params: this.params,
    };
  }

  private tick(frame: OrganismClockFrame): void {
    if (!this.running || !this.pack) return;
    const rawDt = frame.deltaMs / 1000;
    if (!Number.isFinite(rawDt)) return;
    const dt = Math.max(0, Math.min(WORLD_PHYSICS_CONSTANTS.maxDt, rawDt));
    if (dt <= 0) return;
    this.t += dt * this.params.tempo;
    if (this.t >= this.pack.durationSeconds) {
      this.disarm(); // auto-release at pack end
      return;
    }
    this.forwardCurrent();
  }

  private forwardCurrent(): void {
    const pack = this.pack as PerformancePack;
    const t = this.t;
    const E = this.params.exaggeration;
    const seg = segmentAt(pack, t);
    const ch = (c: PackChannelId) => packChannelValueAt(pack, c, t);
    const dch = (c: PackChannelId) => {
      const track = pack.channels[c];
      return track ? evaluateCurveTrackDerivative(track, t) : 0;
    };
    const k = WORLD_PHYSICS_CONSTANTS.physToLiving;

    // Pose — authored curves, exaggeration rail applied to the whole body.
    // GASPER-CRAFT-002 S2 (D-0099): world_z authors DEPTH — moving toward or
    // away from the user is the new shot scale (the camera never moves).
    const tiltMax = 45; // mirror WORLD_SPACE_CONSTANTS.maxTiltDeg
    const pose = {
      x: ch("world_x") * E,
      y: Math.max(0, ch("world_y") * E),
      z: ch("world_z") * E,
      tilt: Math.max(-tiltMax, Math.min(tiltMax, ch("tilt") * E)),
      provenance: this.provenance as WorldProvenance,
    };

    // Silhouette — stretch → height delta; width DERIVES from the volume
    // law Sx·Sy = 1 (bounds win over the law at the extremes); squash →
    // ground_flattening. Every channel inside PHYSICS_CHANNEL_BOUNDS.
    const deltas: Record<string, number> = {};
    const stretch = ch("stretch") * E;
    if (Number.isFinite(stretch) && Math.abs(stretch) > 1e-4) {
      const hb = PHYSICS_CHANNEL_BOUNDS.overall_height;
      const h = Math.max(hb.min, Math.min(hb.max, stretch));
      deltas.overall_height = h;
      const sy = Math.max(0.05, 1 + h);
      const wb = PHYSICS_CHANNEL_BOUNDS.overall_width;
      const w = Math.max(wb.min, Math.min(wb.max, 1 / sy - 1));
      if (Math.abs(w) > 1e-4) deltas.overall_width = w;
    }
    const squash = ch("squash") * E;
    if (Number.isFinite(squash) && squash > 1e-4) {
      const fb = PHYSICS_CHANNEL_BOUNDS.ground_flattening;
      deltas.ground_flattening = Math.max(fb.min, Math.min(fb.max, squash));
    }

    // Wake/light — track velocity × physToLiving; an authored `wake` channel
    // overrides the neutral ×1 multiplier (0 silences the warp, ≤4 emphasis).
    const wakeMul = pack.channels.wake ? Math.max(0, Math.min(4, ch("wake"))) : 1;
    const vx = dch("world_x");
    const vy = dch("world_y");
    const speed = Math.hypot(vx, vy);
    const lightChannel = pack.channels.light ? ch("light") : 0;
    const wakeVX = vx * k * wakeMul;
    // World +y is up; content space +y is down — flip for the wake warp.
    const wakeVY = -vy * k * wakeMul;
    const lightSpeed = Math.max(0, Math.min(12, Math.max(speed * k * wakeMul, lightChannel)));

    // Face energy — unit channel (D-0107: compiler-fenced to 0..1; the
    // clamp survives as the runtime fail-closed layer, ground_impact idiom).
    const face = Math.max(0, Math.min(1, ch("face")));

    // GASPER-CRAFT-002 S4: authored impact-ripple phase (unit channel —
    // compiler-fenced to 0..1; the clamp is the runtime fail-closed layer).
    const groundImpact = Math.max(0, Math.min(1, ch("ground_impact")));

    const beat = beatAt(pack, t);

    this.forward({
      t,
      pose,
      poseYield: seg.mode === "physics",
      silhouetteDeltas: deltas,
      wakeVX,
      wakeVY,
      lightSpeed,
      face,
      groundImpact,
      beatId: beat?.id ?? null,
      shotScale: beat?.shotScale ?? null,
      segmentMode: seg.mode,
    });
  }
}
