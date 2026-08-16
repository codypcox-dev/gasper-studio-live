/**
 * GASPER-ALIVE-001 · D-0108 — the life director transport.
 *
 * The long-horizon autonomy organ: while its gate is open it composes
 * visible life — attention holds (the external gaze intake), self-initiated
 * acts (life packs), curiosity approaches (a stroll to the monitor glass,
 * the smile held on the viewer, then the walk home), state accents
 * (event-scoped live-coefficient gains) and dormant arcs (long rest /
 * wake) — over the φ-ladder gaps, mood-weighted and habituation-damped
 * (LifeDirector law).
 *
 * Hierarchy of authorities (it yields to everything above it): the gate is
 * asked every tick — autonomy open, no FOREIGN pack in flight, no physics
 * beyond the locomotion transport, no reduced motion, no capture. When the
 * gate closes mid-act it does not snap: gaze releases, the locomotion
 * ownership stands down (the kernel settles the body and walks it home),
 * wander is handed back, a long rest wakes, and resume waits φ² (alive-015
 * gradual resume). While an approach leg is underfoot the wander organ is
 * paused (it is the lower spatial autonomy); on release wander resumes
 * under its own law.
 *
 * GASPER-PHYSICS-001 · D-0112 transport law: the approach legs no longer
 * drag a pose along a smoothstep path. The director files LOCOMOTION
 * INTENTS (target + cruise) with the body kernel — the sole writer of free
 * movement — and a leg completes when the BODY arrives (floor pose inside
 * the arrival band), never when a timer says so. The ease-out of every
 * arrival is Coulomb friction inside the kernel, not an authored curve.
 * The gift hold is ownership with a cleared intent: the kernel holds the
 * body still under physics while the smile is given.
 *
 * Clock fault law: the onFrame body is self-guarded — a throwing organ
 * must never stop the organism clock (GasperOrganismClock fault model).
 */
import type { GasperOrganismClockPort, OrganismClockFrame } from "../clock";
import type { LocomotionPort } from "../physics/WorldPhysicsDriver";
import {
  insetWanderArrivalTarget,
  wanderArrived,
  wanderTargetOvershot,
} from "./GoldenWander";
import {
  lifeActionFor,
  lifeApproachTarget,
  lifeAttentionTarget,
  lifeEventGapSeconds,
  lifeAccentGains,
  lifeLongRestSeconds,
  lifeMoodAt,
  LIFE_LAW,
  type LifeActionId,
  type LifeMood,
} from "./LifeDirector";

export type LifeDirectorPhase =
  | "observing"
  | "attending"
  | "acting"
  | "approaching"
  | "resting";

/** Sub-phases of the approach act (the stroll to the glass and home). */
export type LifeApproachLeg = "out" | "gift" | "home";

export type LifeDirectorLogEntry = Readonly<{
  t: number;
  action: LifeActionId;
}>;

export type LifeDirectorState = Readonly<{
  enabled: boolean;
  phase: LifeDirectorPhase;
  mood: LifeMood;
  eventCount: number;
  nextEventIn: number;
  attention: Readonly<{ nx: number; ny: number; s: number }> | null;
  log: ReadonlyArray<LifeDirectorLogEntry>;
}>;

export type LifeDirectorPorts = Readonly<{
  /**
   * D-0112: the body kernel seam. Approach legs are filed as locomotion
   * intents; the leg's truth is read back from the kernel's floor pose.
   * The kernel is the only writer of pose — arrival and release included.
   */
  locomotion: LocomotionPort;
  runPack: (id: string) => boolean;
  packRunning: () => boolean;
  /** External gaze intake (normalized −1..1, strength 0..1). */
  setGaze: (nx: number, ny: number, s: number) => void;
  /** Visible state accent (eight-state interrupt; owns continuity). */
  accentState: (id: string) => void;
  enterLongRest: () => void;
  wakeFromLongRest: () => void;
  setWanderEnabled: (v: boolean) => void;
  /** Event-scoped live-coefficient gains (1,1 = identity). */
  accent: (mouthGain: number, formGain: number) => void;
  /**
   * D-0109 A-2/A-3/A-4: the life substrate switch. Called on every gate
   * transition: open => the renderer lifts the D-0018 rest gate (breath,
   * blink and micro persist at home), raises breathGain into the legible
   * band and eases the resting warmth floor; closed => all three return to
   * their byte-identical defaults. The driver owns WHEN (hierarchy law);
   * the controller owns the wire (the live-coeffs life subkey).
   */
  substrate: (open: boolean) => void;
  gate: () => boolean;
}>;

const MAX_DT_SECONDS = 0.05;
const LOG_LEN = 24;
/** A leg is complete when the BODY is inside this radius, this slow. */
const ARRIVE_EPS_UNITS = 8;
const ARRIVE_SPEED_UNITS = 40;

export class LifeDirectorDriver {
  private enabled = true;
  private phase: LifeDirectorPhase = "observing";
  private t = 0;
  private nextEventAt = LIFE_LAW.resumeCooldownSeconds;
  private eventCount = 0;
  private mood: LifeMood = "content";
  private attention: { nx: number; ny: number; s: number } | null = null;
  private holdSeconds = 0;
  private recent: Partial<Record<LifeActionId, number>> = {};
  private log: LifeDirectorLogEntry[] = [];
  // Approach geometry (the stroll to the glass and home).
  private leg: LifeApproachLeg = "out";
  private to = { x: 0, z: 0 };
  private packStarted = false;
  private substrateOpen = false;
  private pendingSecondLook: { nx: number; ny: number; holdSeconds: number } | null =
    null;
  private readonly unsub: () => void;

  constructor(
    clock: Pick<GasperOrganismClockPort, "subscribe">,
    private readonly ports: LifeDirectorPorts,
    private readonly seed = 1005,
  ) {
    this.unsub = clock.subscribe({
      id: "life-director",
      // Above wander (20) — it may pause the lower spatial autonomy — and
      // below physics (25): a launched body outranks a stroll.
      priority: 22,
      onFrame: (frame: OrganismClockFrame) => {
        try {
          this.tick(frame);
        } catch {
          // Fault law: a broken organ goes quiet; the clock never stops.
          this.standDown();
        }
      },
    });
  }

  destroy(): void {
    this.standDown();
    this.unsub();
  }

  setEnabled(v: boolean): void {
    this.enabled = !!v;
    if (!this.enabled) this.standDown();
  }

  getState(): LifeDirectorState {
    return Object.freeze({
      enabled: this.enabled,
      phase: this.phase,
      mood: this.mood,
      eventCount: this.eventCount,
      nextEventIn: Math.max(0, this.nextEventAt - this.t),
      attention: this.attention ? Object.freeze({ ...this.attention }) : null,
      log: Object.freeze([...this.log]),
    });
  }

  /** Release every held seam; hand the desk back to wander. */
  private standDown(): void {
    if (this.phase === "resting") this.safe(() => this.ports.wakeFromLongRest());
    if (this.phase === "approaching") {
      // D-0112: release locomotion ownership — the kernel settles the body
      // and walks it home under its own law (release, never snap).
      this.safe(() => this.ports.locomotion.standDownLocomotion("life"));
      this.safe(() => this.ports.setWanderEnabled(true));
    }
    if (this.attention) this.safe(() => this.ports.setGaze(0, 0, 0));
    this.safe(() => this.ports.accent(1, 1));
    if (this.substrateOpen) {
      this.substrateOpen = false;
      this.safe(() => this.ports.substrate(false));
    }
    this.attention = null;
    this.pendingSecondLook = null;
    this.packStarted = false;
    this.phase = "observing";
    this.nextEventAt = this.t + LIFE_LAW.resumeCooldownSeconds;
  }

  private safe(fn: () => void): void {
    try {
      fn();
    } catch {
      /* a dead seam closes, never throws */
    }
  }

  private safeGate(): boolean {
    try {
      return this.ports.gate();
    } catch {
      return false;
    }
  }

  private tick(frame: OrganismClockFrame): void {
    const dt = Math.max(0, Math.min(MAX_DT_SECONDS, frame.deltaMs / 1000));
    if (dt <= 0) return;
    this.t += dt;

    const open = this.enabled && this.safeGate();
    // D-0109: the substrate follows the gate on every transition (the body
    // breathes at home exactly while the life authority may act).
    if (open !== this.substrateOpen) {
      this.substrateOpen = open;
      this.safe(() => this.ports.substrate(open));
    }
    if (!open) {
      if (this.phase !== "observing") this.standDown();
      return;
    }
    this.mood = lifeMoodAt(this.seed, this.t);

    switch (this.phase) {
      case "observing":
        if (this.t >= this.nextEventAt) this.beginEvent();
        return;
      case "attending":
        this.holdSeconds -= dt;
        if (this.holdSeconds <= 0) this.endAttention();
        return;
      case "acting":
        if (this.packStarted && !this.ports.packRunning()) this.endAct();
        return;
      case "approaching":
        this.advanceApproach(dt);
        return;
      case "resting":
        this.holdSeconds -= dt;
        if (this.holdSeconds <= 0) {
          this.safe(() => this.ports.wakeFromLongRest());
          this.safe(() => this.ports.accent(1, 1));
          this.observe();
        }
        return;
    }
  }

  private observe(gap?: number): void {
    this.phase = "observing";
    this.nextEventAt =
      this.t + (gap ?? lifeEventGapSeconds(this.eventCount, this.mood));
  }

  /**
   * The look-around beat: two attention holds back to back (the second rides
   * the first), a listening-receive accent and identity-lifting gains. Shared
   * by the scheduled "look-around" action and the environment-awareness beat.
   */
  private doLookAround(): void {
    const a = lifeAttentionTarget(this.seed, this.eventCount);
    const b = lifeAttentionTarget(this.seed, this.eventCount + 1);
    this.attention = { nx: a.nx, ny: a.ny, s: 1 };
    this.safe(() => this.ports.setGaze(a.nx, a.ny, 1));
    this.safe(() => this.ports.accentState("presence-listening-receive"));
    this.safe(() =>
      {const _ag=lifeAccentGains(this.mood);this.ports.accent(_ag.mouth,_ag.form);}
    );
    this.phase = "attending";
    this.holdSeconds = a.holdSeconds;
    this.pendingSecondLook = b;
  }

  /**
   * GASPER-PHYSICS-001 · D-0112 — the xyz-awareness beat. The environment's
   * physics field changed under his feet (resize / resolution change bumped
   * the epoch): he notices and re-orients with a look-around. It fires only
   * when the hierarchy allows a self-initiated attention beat (gate open,
   * observing) — a performance, an approach or another hold is never
   * interrupted; the re-orientation simply waits for a free moment.
   * Returns true when the beat landed now.
   */
  noticeEnvironment(): boolean {
    if (!this.enabled || !this.safeGate()) return false;
    if (this.phase !== "observing") return false;
    this.record("look-around");
    this.doLookAround();
    return true;
  }

  private record(action: LifeActionId): void {
    this.eventCount += 1;
    this.recent[action] = (this.recent[action] ?? 0) + 1;
    // Disposition, not history (LAW-10): counts decay so a loved act can
    // return — the feedback damps habituation without erasing it.
    for (const k of Object.keys(this.recent) as LifeActionId[]) {
      const v = (this.recent[k] ?? 0) * 0.9;
      if (v < 0.05) delete this.recent[k];
      else this.recent[k] = v;
    }
    this.log.push(Object.freeze({ t: this.t, action }));
    if (this.log.length > LOG_LEN) this.log.shift();
  }

  private beginEvent(): void {
    const action = lifeActionFor(this.mood, this.eventCount, this.recent);
    this.record(action);
    switch (action) {
      case "notice": {
        const target = lifeAttentionTarget(this.seed, this.eventCount);
        this.attention = { nx: target.nx, ny: target.ny, s: 1 };
        this.safe(() => this.ports.setGaze(target.nx, target.ny, 1));
        this.safe(() => this.ports.accentState("presence-recognition-spark"));
        this.safe(() =>
          {const _ag=lifeAccentGains(this.mood);this.ports.accent(_ag.mouth,_ag.form);}
        );
        this.phase = "attending";
        this.holdSeconds = target.holdSeconds;
        return;
      }
      case "look-around":
        this.doLookAround();
        return;
      case "delight-hop":
        this.safe(() => this.ports.accentState("presence-pleased-resolve"));
        this.safe(() =>
          {const _ag=lifeAccentGains(this.mood);this.ports.accent(_ag.mouth,_ag.form);}
        );
        this.startPack("life-delight-hop");
        return;
      case "stretch":
        this.safe(() => this.ports.accentState("presence-neutral-settled"));
        this.safe(() =>
          {const _ag=lifeAccentGains(this.mood);this.ports.accent(_ag.mouth,_ag.form);}
        );
        this.startPack("life-stretch");
        return;
      case "gift-look": {
        // The stroll to the monitor glass. Wander (the lower spatial
        // autonomy) is paused for the duration of the act. The leg starts
        // where the BODY is — the kernel's floor pose is the only truth.
        const to = lifeApproachTarget(this.eventCount);
        this.safe(() => this.ports.setWanderEnabled(false));
        const from = this.floorPose();
        this.approachOrigin = { x: from.x, z: from.z };
        const inset = insetWanderArrivalTarget(from, to);
        this.to = { x: inset.x, z: inset.z };
        this.leg = "out";
        this.phase = "approaching";
        return;
      }
      case "long-rest": {
        const d = lifeLongRestSeconds(this.seed, this.t);
        this.safe(() => this.ports.enterLongRest());
        this.phase = "resting";
        this.holdSeconds = d + 1;
        return;
      }
      case "settle":
        this.safe(() => this.ports.setGaze(0, 0, 0));
        this.attention = null;
        this.safe(() => this.ports.accentState("presence-neutral-settled"));
        this.observe(1);
        return;
    }
  }

  private startPack(id: string): void {
    const ok = this.ports.runPack(id);
    this.packStarted = ok;
    this.phase = "acting";
    if (!ok) this.observe(1); // a rejected pack is a non-event, never a fault
  }

  private endAttention(): void {
    if (this.pendingSecondLook) {
      const b = this.pendingSecondLook;
      this.pendingSecondLook = null;
      this.attention = { nx: b.nx, ny: b.ny, s: 1 };
      this.safe(() => this.ports.setGaze(b.nx, b.ny, 1));
      this.holdSeconds = b.holdSeconds;
      return;
    }
    this.safe(() => this.ports.setGaze(0, 0, 0));
    this.attention = null;
    this.safe(() => this.ports.accent(1, 1));
    this.observe();
  }

  private endAct(): void {
    this.packStarted = false;
    this.safe(() => this.ports.accent(1, 1));
    this.observe();
  }

  /** The body's floor truth, fail-closed to home. */
  private floorPose(): { x: number; z: number; speed: number } {
    try {
      const p = this.ports.locomotion.floorPose();
      if (
        p &&
        Number.isFinite(p.x) &&
        Number.isFinite(p.z) &&
        Number.isFinite(p.speed)
      ) {
        return { x: p.x, z: p.z, speed: p.speed };
      }
    } catch {
      /* fail-closed below */
    }
    return { x: 0, z: 0, speed: 0 };
  }

  private approachOrigin = { x: 0, z: 0 };

  private arrived(x: number, z: number): boolean {
    const p = this.floorPose();
    const target = { x, z };
    return (
      wanderArrived(p, target, p.speed) ||
      wanderTargetOvershot(this.approachOrigin, target, p)
    );
  }

  private advanceApproach(dt: number): void {
    const cruise = LIFE_LAW.approachSpeedUnitsPerSec;
    switch (this.leg) {
      case "out": {
        this.safe(() =>
          this.ports.locomotion.setLocomotion("life", {
            x: this.to.x,
            z: this.to.z,
            cruise,
          }),
        );
        if (this.arrived(this.to.x, this.to.z)) {
          // At the glass: the smile is GIVEN (alive-008: a being that
          // initiates contact reads alive). Eyes on the viewer, pleased
          // state, accent gains — held for φ² while ~1.5× home size keeps
          // the face legible. The hold is OWNERSHIP with a cleared intent:
          // the kernel holds the body still under physics, so no lower
          // authority drifts him home mid-gift.
          this.safe(() => this.ports.locomotion.clearLocomotion("life"));
          this.leg = "gift";
          this.holdSeconds = LIFE_LAW.giftHoldSeconds;
          this.attention = { nx: 0, ny: 0, s: 1 };
          this.safe(() => this.ports.setGaze(0, 0, 1));
          this.safe(() => this.ports.accentState("presence-pleased-resolve"));
          this.safe(() =>
            this.ports.accent(
              LIFE_LAW.accentMouthGain,
              LIFE_LAW.accentFormGain,
            ),
          );
        }
        return;
      }
      case "gift": {
        // The gift is the stillness — the kernel owns the held pose.
        this.holdSeconds -= dt;
        if (this.holdSeconds <= 0) {
          // Walk home under the same traction law; on arrival the kernel
          // releases (zero seam — he stands down where wander resumes).
          this.leg = "home";
          const here = this.floorPose();
          this.approachOrigin = { x: here.x, z: here.z };
        }
        return;
      }
      case "home": {
        this.safe(() =>
          this.ports.locomotion.setLocomotion("life", {
            x: 0,
            z: 0,
            cruise,
          }),
        );
        if (this.arrived(0, 0)) {
          this.safe(() => this.ports.locomotion.standDownLocomotion("life"));
          this.safe(() => this.ports.setWanderEnabled(true));
          this.safe(() => this.ports.setGaze(0, 0, 0));
          this.safe(() => this.ports.accent(1, 1));
          this.attention = null;
          this.observe();
        }
        return;
      }
    }
  }
}
