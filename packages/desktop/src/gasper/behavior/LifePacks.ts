/**
 * GASPER-ALIVE-001 · D-0108 — the self-initiated act vocabulary.
 *
 * Micro-performances the life director spends (alive-015: "these
 * SELF-INITIATED actions prove the character has its own agenda and is not
 * waiting for input"). Each is a real PerformancePack — Doctrine 5 applies
 * to autonomous life exactly as to authored scenes: every beat names an
 * objective, every scene turns a value, holds are flagged with intent. The
 * compiler is the enforcement; a life pack that fails its gates simply does
 * not enter the vocabulary (fail-closed).
 *
 * They are SMALL on purpose — fidgets and accents over the breathing base
 * (oot-idle: "a single breathing base loop underlies all idles"), 2–3.2 s,
 * home-centered, medium shot (the legibility band at z≈0), contacts
 * flat-clamped, arcs honest (phi-beta: the action reads from keys alone).
 */
import {
  compilePerformancePack,
  type PerformancePack,
} from "../curves/PerformancePack";

const K = (t: number, v: number, out?: string) =>
  out ? { t, v, out } : { t, v };

type Raw = Record<string, unknown>;

const LIFE_PACK_SOURCES: ReadonlyArray<Raw> = [
  {
    id: "life-notice",
    durationSeconds: 2,
    valueTurn: { from: "calm", to: "alert" },
    channels: {
      world_y: [K(0, 0), K(0.55, 34), K(1.2, 22), K(2, 0)],
      face: [K(0, 0), K(0.5, 0.32), K(1.3, 0.2), K(2, 0.05)],
    },
    beats: [
      {
        id: "catch", t0: 0, t1: 1, shotScale: "medium",
        primaryIdea: "The orient — a small rise toward whatever moved",
        valueTurn: "Calm -> attention: something earned a look.",
        objective: "catch the movement",
      },
      {
        id: "weigh", t0: 1, t1: 2, shotScale: "medium",
        primaryIdea: "The weigh — held a beat higher, deciding",
        valueTurn: "Attention -> verdict: it matters, or it doesn't.",
        objective: "decide whether it matters",
      },
    ],
    holds: [
      { id: "weigh-hold", t0: 1.2, t1: 2, intent: "the verdict — stillness while it decides" },
    ],
  },
  {
    id: "life-delight-hop",
    durationSeconds: 2.618,
    valueTurn: { from: "content", to: "joy" },
    channels: {
      world_y: [
        K(0, 0), K(0.35, -14), K(0.95, 118), K(1.6, 0, "flat-clamped"),
        K(2.1, 46), K(2.618, 0, "flat-clamped"),
      ],
      world_x: [K(0, 0), K(0.95, 60), K(1.6, 70), K(2.618, 0)],
      face: [K(0, 0.05), K(1.2, 0.5), K(2.0, 0.42), K(2.618, 0.12)],
      // N40 (2026-08-06): ground_impact keys REMOVED — the impact-ripple ring
      // is retired by owner order ("get rid of that from the ground. his drop
      // shadow should be enough"); RETIRED_PACK_CHANNELS now rejects new
      // authors of the channel.
    },
    beats: [
      {
        id: "coil", t0: 0, t1: 0.5, shotScale: "medium",
        primaryIdea: "The coil — a dip that promises the spring",
        valueTurn: "Content -> intent: the body gathers itself.",
        objective: "gather the spring",
      },
      {
        id: "flight", t0: 0.5, t1: 1.6, shotScale: "medium",
        primaryIdea: "The hop — spent upward with a lateral flourish",
        valueTurn: "Intent -> joy: the floor answers generously.",
        objective: "spend it upward",
      },
      {
        id: "encore", t0: 1.6, t1: 2.618, shotScale: "medium",
        primaryIdea: "The encore — one more, smaller, for the pleasure of it",
        valueTurn: "Joy -> savoring: the second bounce is a grin.",
        objective: "one more, smaller",
      },
    ],
  },
  {
    id: "life-stretch",
    durationSeconds: 3.236,
    valueTurn: { from: "tired", to: "content" },
    channels: {
      world_y: [K(0, 0), K(1.236, 58), K(2.0, 52), K(3.236, 0)],
      face: [K(0, 0), K(1.236, 0.14), K(3.236, 0.04)],
    },
    beats: [
      {
        id: "inhale", t0: 0, t1: 1.236, shotScale: "medium",
        primaryIdea: "The lengthen — a slow rise, crown leading",
        valueTurn: "Tired -> reaching: the body asks for room.",
        objective: "lengthen upward",
      },
      {
        id: "exhale", t0: 1.236, t1: 3.236, shotScale: "medium",
        primaryIdea: "The let-go — a longer fall, heavier at the end",
        valueTurn: "Reaching -> ease: the exhale is the point.",
        objective: "let it go",
      },
    ],
    holds: [
      { id: "crown-hold", t0: 1.236, t1: 2, intent: "the top — a beat of full length before the fall" },
    ],
  },
  // The gift-look act deliberately has NO pack: the stroll to the glass and
  // the φ² smile-hold on the viewer are carried by the life-authority pose +
  // the external-gaze intake (a home-relative pack could never start from a
  // z=−650 arrival without a snap — keys are truth, so the truth walks).
];

export type LifePackId = "life-notice" | "life-delight-hop" | "life-stretch";

export const LIFE_PACK_IDS: readonly LifePackId[] = Object.freeze(
  LIFE_PACK_SOURCES.map((s) => s.id as LifePackId),
);

const compiled = new Map<LifePackId, PerformancePack>();
export const LIFE_PACK_COMPILE_ERRORS: ReadonlyArray<string> = (() => {
  const errors: string[] = [];
  for (const src of LIFE_PACK_SOURCES) {
    const r = compilePerformancePack(src);
    if (r.pack) compiled.set(src.id as LifePackId, r.pack);
    else errors.push(...r.errors.map((e) => `${src.id}: ${e}`));
  }
  return Object.freeze(errors);
})();

/** The compiled act, or null if the compiler rejected it (fail-closed). */
export function getLifePack(id: string): PerformancePack | null {
  return compiled.get(id as LifePackId) ?? null;
}
