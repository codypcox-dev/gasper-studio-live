/**
 * Dormant Orbit structure geometry (Lane R3).
 */

import type { DormantGenerationInput, DormantOrbitGeometry } from "./types";

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
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function ringPath(r: number, squash: number): string {
  const rx = r;
  const ry = r * squash;
  const pts: string[] = [];
  const N = 36;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    pts.push(`${i === 0 ? "M" : "L"} ${(Math.cos(a) * rx).toFixed(4)} ${(Math.sin(a) * ry).toFixed(4)}`);
  }
  pts.push("Z");
  return pts.join(" ");
}

export function evaluateDormantOrbitGeometry(
  input: DormantGenerationInput,
): DormantOrbitGeometry {
  const mix = clamp01(input.mix);
  const enter = smoothstep(0.04, 0.55, mix);
  const collapse = clamp01(input.collapseProgress ?? mix);
  const collapseS = smoothstep(0, 1, collapse) * enter;
  const energy = clamp01(input.energy);
  const motion = clamp01(input.motion);
  const t = input.timeSeconds;
  const interrupted = !!input.interrupted;

  // Dormant energy policy: collapse drains authored energy presentation
  const dormantEnergyPolicy = enter * (0.15 + energy * 0.25 * (1 - collapseS * 0.7));
  const dormantCollapse = collapseS;
  const collapseTiming = collapseS;
  const wakeRestoration = interrupted ? 1 - collapseS : enter * (1 - collapseS);

  const rings: DormantOrbitGeometry["orbitRings"] = [];
  if (enter > 0.02) {
    const baseR = 0.42 + collapseS * 0.12;
    rings.push({
      pathD: ringPath(baseR, 0.35 + collapseS * 0.1),
      opacity: enter * (0.4 + energy * 0.2),
      radius: baseR,
    });
    rings.push({
      pathD: ringPath(baseR * 0.72, 0.28),
      opacity: enter * (0.28 + motion * 0.15),
      radius: baseR * 0.72,
    });
    if (collapseS > 0.35) {
      rings.push({
        pathD: ringPath(baseR * 0.5, 0.22),
        opacity: enter * collapseS * 0.35,
        radius: baseR * 0.5,
      });
    }
  }

  const particles: DormantOrbitGeometry["orbitalParticles"] = [];
  if (enter > 0.02) {
    const count = 6 + Math.floor(enter * 4);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + t * (0.3 + motion * 0.4) + (input.seed | 0) * 0.01;
      const r = 0.5 + (i % 3) * 0.06;
      particles.push({
        x: Math.cos(a) * r,
        y: Math.sin(a) * r * 0.32,
        r: 0.02 + (i % 2) * 0.01,
        opacity: enter * (0.35 + energy * 0.25),
      });
    }
  }

  const hash = fnv([
    dormantCollapse,
    dormantEnergyPolicy,
    wakeRestoration,
    rings.length,
    particles.length,
    enter,
    mix,
  ]);

  return {
    dormantCollapse,
    orbitRings: rings,
    orbitalParticles: particles,
    retainedIdentityCues: true, // face/silhouette cues retained by policy
    dormantEnergyPolicy,
    collapseTiming,
    wakeRestoration,
    interruptionHeld: interrupted,
    hash,
    mix,
    orphanedRings: false,
  };
}
