/**
 * Comet wake geometry (Lane R3) — attached tail, no detached wake.
 */

import type { CometGenerationInput, CometWakeGeometry } from "./types";

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / Math.max(1e-9, e1 - e0));
  return t * t * (3 - 2 * t);
}
function fnv(parts: number[]): string {
  let h = 2166136261 >>> 0;
  for (const p of parts) {
    const q = Math.round(p * 1e6);
    h = Math.imul(h ^ (q & 0xff), 16777619) >>> 0;
    h = Math.imul(h ^ ((q >>> 8) & 0xff), 16777619) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function wakePath(length: number, width: number, dir: number, side: "back" | "front"): string {
  const sign = side === "back" ? 1 : -0.35;
  const tipX = Math.cos(dir) * length * sign;
  const tipY = Math.sin(dir) * length * 0.25 * sign;
  const half = width * 0.5;
  // Body attachment at origin — ensures attachedTail
  return [
    `M 0 ${-half * 0.3}`,
    `Q ${tipX * 0.35} ${-half} ${tipX} ${tipY}`,
    `Q ${tipX * 0.4} ${half * 0.8} 0 ${half * 0.25}`,
    "Z",
  ].join(" ");
}

export function evaluateCometGeometry(input: CometGenerationInput): CometWakeGeometry {
  const mix = clamp01(input.mix);
  const enter = smoothstep(0.04, 0.5, mix);
  const energy = clamp01(input.energy);
  const motion = clamp01(input.motion);
  const t = input.timeSeconds;

  const forwardMassDeform = enter * (0.2 + motion * 0.35 + energy * 0.15);
  const wakeLength = enter * (0.55 + motion * 0.4 + energy * 0.15);
  const wakeWidth = enter * (0.28 + energy * 0.2) * (1 - motion * 0.1);
  const wakePersistence = enter * (0.4 + energy * 0.35);
  const spectralFalloff = enter * (0.5 + energy * 0.3);
  const tailDirection = -0.12 + Math.sin(t * 0.4 + (input.seed | 0) * 0.01) * 0.05 * motion;
  const attachedTail = enter > 0.02;

  const backPath = attachedTail ? wakePath(wakeLength, wakeWidth, tailDirection, "back") : "";
  const frontPath = attachedTail
    ? wakePath(wakeLength * 0.35, wakeWidth * 0.55, tailDirection, "front")
    : "";

  const hash = fnv([
    forwardMassDeform,
    wakeLength,
    wakeWidth,
    wakePersistence,
    spectralFalloff,
    tailDirection,
    enter,
    mix,
  ]);

  return {
    forwardMassDeform,
    backWake: {
      pathD: backPath,
      opacity: enter * (0.45 + energy * 0.3),
      width: wakeWidth,
      length: wakeLength,
    },
    frontFlow: {
      pathD: frontPath,
      opacity: enter * (0.25 + motion * 0.25),
    },
    attachedTail,
    tailDirection,
    wakeWidth,
    wakeLength,
    wakePersistence,
    spectralFalloff,
    energyCoupling: enter * energy,
    motionCoupling: enter * motion,
    hash,
    mix,
  };
}
