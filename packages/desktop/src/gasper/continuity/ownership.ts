/**
 * Anti-flicker ownership arbitration for contested continuity channels.
 * Exactly one owner wins per contested channel per frame.
 */

import type { ContinuityOwner } from "./types";
import { CONTESTED_OWNERSHIP_CHANNELS } from "./channels";

/** Priority: higher wins when multiple claimers present. */
const OWNER_PRIORITY: Record<ContinuityOwner, number> = {
  hold_last_good: 100,
  interrupt_blend: 90,
  blink: 80,
  saccade: 70,
  state_target: 50,
  breath: 30,
  wobble: 20,
  base_form: 10,
  none: 0,
};

export type OwnershipClaim = {
  channel: string;
  owner: ContinuityOwner;
};

/**
 * Resolve single owner per channel from a bag of claims.
 * Deterministic: same claims → same winners; ties broken by owner priority then name.
 */
export function resolveOwnership(
  claims: readonly OwnershipClaim[],
  channels: readonly string[] = CONTESTED_OWNERSHIP_CHANNELS as unknown as string[],
): Record<string, ContinuityOwner> {
  const best = new Map<string, ContinuityOwner>();
  for (const ch of channels) {
    best.set(ch, "none");
  }
  for (const claim of claims) {
    if (!channels.includes(claim.channel) && !best.has(claim.channel)) {
      best.set(claim.channel, "none");
    }
    const prev = best.get(claim.channel) ?? "none";
    const pPrev = OWNER_PRIORITY[prev] ?? 0;
    const pNext = OWNER_PRIORITY[claim.owner] ?? 0;
    if (pNext > pPrev) {
      best.set(claim.channel, claim.owner);
    } else if (pNext === pPrev && claim.owner < prev) {
      // Stable alphabetical tie-break for equal priority (rare).
      best.set(claim.channel, claim.owner);
    }
  }
  const out: Record<string, ContinuityOwner> = {};
  for (const [k, v] of best) out[k] = v;
  return out;
}

/**
 * Count ownership flips across a series (excluding intentional interrupt edges).
 * A flip is owner[i] !== owner[i-1] when interruptEdges[i] is false.
 */
export function countOwnershipFlips(
  owners: readonly ContinuityOwner[],
  interruptEdges: readonly boolean[] = [],
): number {
  let flips = 0;
  for (let i = 1; i < owners.length; i++) {
    if (interruptEdges[i]) continue;
    if (owners[i] !== owners[i - 1]) flips += 1;
  }
  return flips;
}

/**
 * Count rapid A→B→A oscillations within a 3-frame window (true flicker).
 * Legitimate long holds under blink/interrupt/saccade are not flicker.
 */
export function countOwnershipOscillations(
  owners: readonly ContinuityOwner[],
): number {
  let n = 0;
  for (let i = 2; i < owners.length; i++) {
    const a = owners[i - 2]!;
    const b = owners[i - 1]!;
    const c = owners[i]!;
    if (a === c && a !== b) n += 1;
  }
  return n;
}

/**
 * True when ownership is anti-flicker stable: no rapid A→B→A oscillations
 * beyond maxFlipsPerChannel (interpreted as max oscillations per channel).
 */
export function ownershipAntiFlickerStable(
  ownershipSeries: Record<string, ContinuityOwner[]>,
  _interruptEdges: readonly boolean[],
  maxFlipsPerChannel: number,
): boolean {
  for (const series of Object.values(ownershipSeries)) {
    if (countOwnershipOscillations(series) > maxFlipsPerChannel) {
      return false;
    }
  }
  return true;
}

/**
 * Build default living-path claims for a frame.
 * Blink owns eye_openness when mid-blink; saccade owns gaze when mid-saccade;
 * otherwise state_target owns contested face channels.
 */
export function livingFrameClaims(input: {
  midBlink: boolean;
  midSaccade: boolean;
  interrupted: boolean;
  holdLastGood?: boolean;
}): OwnershipClaim[] {
  const claims: OwnershipClaim[] = [];
  if (input.holdLastGood) {
    for (const ch of CONTESTED_OWNERSHIP_CHANNELS) {
      claims.push({ channel: ch, owner: "hold_last_good" });
    }
    return claims;
  }
  if (input.interrupted) {
    for (const ch of CONTESTED_OWNERSHIP_CHANNELS) {
      claims.push({ channel: ch, owner: "interrupt_blend" });
    }
  }
  if (input.midBlink) {
    claims.push({ channel: "eye_openness", owner: "blink" });
  } else {
    claims.push({ channel: "eye_openness", owner: "state_target" });
  }
  if (input.midSaccade) {
    claims.push({ channel: "gaze", owner: "saccade" });
  } else {
    claims.push({ channel: "gaze", owner: "state_target" });
  }
  claims.push({ channel: "mouth_openness", owner: "state_target" });
  claims.push({ channel: "mouth_width", owner: "state_target" });
  return claims;
}
