/**
 * Three orthogonal regions. Publishes flags. Does not write d.
 * Locomotion ⊥ Presence ⊥ Take.
 */
export const PRESENCE_IDS = [
  "presence-neutral-settled",
  "presence-listening-receive",
  "presence-thinking-knit",
  "presence-recognition-spark",
  "comet-executing-drive",
  "presence-blocked-strain",
  "presence-pleased-resolve",
  "dormant-orbit-maintain",
] as const;

export type PresenceId = (typeof PRESENCE_IDS)[number];
export type LocomotionId = "rest" | "walk";
export type TakeId = "idle" | "playing";

export type MachineSnap = {
  locomotion: LocomotionId;
  presence: PresenceId;
  take: TakeId;
  gaitGate: 0 | 1;
  takePlay: boolean;
  eightState: PresenceId;
};

export type MachineIntent =
  | { type: "rest" }
  | { type: "walk" }
  | { type: "play20" }
  | { type: "stopTake" }
  | { type: "presence"; id: PresenceId };

export const MACHINE_DEFAULT: MachineSnap = {
  locomotion: "rest",
  presence: "presence-neutral-settled",
  take: "idle",
  gaitGate: 0,
  takePlay: false,
  eightState: "presence-neutral-settled",
};

export function isPresenceId(id: string): id is PresenceId {
  return (PRESENCE_IDS as readonly string[]).includes(id);
}

/** Pure. Presence never flips locomotion. Walk/20s couple at the live rail. */
export function reduceMachine(snap: MachineSnap, intent: MachineIntent): MachineSnap {
  if (intent.type === "rest" || intent.type === "stopTake") {
    return {
      ...snap,
      locomotion: "rest",
      take: "idle",
      gaitGate: 0,
      takePlay: false,
    };
  }
  if (intent.type === "walk" || intent.type === "play20") {
    return {
      ...snap,
      locomotion: "walk",
      take: "playing",
      gaitGate: 1,
      takePlay: true,
    };
  }
  if (intent.type === "presence") {
    if (!isPresenceId(intent.id)) return snap;
    return { ...snap, presence: intent.id, eightState: intent.id };
  }
  return snap;
}

export function publishMachine(snap: MachineSnap): MachineSnap {
  const host = globalThis as { __GASPER_MACHINE__?: MachineSnap };
  host.__GASPER_MACHINE__ = snap;
  return snap;
}

export function readMachine(): MachineSnap {
  const host = globalThis as { __GASPER_MACHINE__?: MachineSnap };
  return host.__GASPER_MACHINE__ ?? MACHINE_DEFAULT;
}
