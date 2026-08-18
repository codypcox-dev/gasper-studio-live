/**
 * Driven-key coupling — Maya SDK / Houdini ch() for Gasper.
 * User dials stay authored. Effective params = lerp(user, law(driver), mix).
 * Park the Couple card to isolate sliders.
 */
export type CoupleEnd = { node: string; param: string };

export type CoupleLaw = {
  id: string;
  label: string;
  why: string;
  from: CoupleEnd;
  to: CoupleEnd;
  mix: number;
  apply: (driver: number, driven: number) => number;
};

export type CoupleTrace = {
  id: string;
  label: string;
  from: CoupleEnd;
  to: CoupleEnd;
  before: number;
  after: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const COUPLE_LAWS: readonly CoupleLaw[] = [
  {
    id: "froude-tau",
    label: "Hz → τ",
    why: "Froude: faster cadence needs stiffer legs. τ drops as Hz rises.",
    from: { node: "gait", param: "hz" },
    to: { node: "voigt", param: "tau" },
    mix: 0.32,
    apply: (hz, tau) => clamp(tau * (1 - 0.32 * ((hz - 2.6) / 2)), 0.02, 0.08),
  },
  {
    id: "tempo-lift",
    label: "Gate → lift",
    why: "World tempo scales swing height. Gate 0 rests the feet.",
    from: { node: "world-driver", param: "gate" },
    to: { node: "handles", param: "lift" },
    mix: 0.35,
    apply: (gate, lift) => clamp(lift * (0.65 + 0.35 * gate), 0, 2),
  },
  {
    id: "yaw-pearl",
    label: "Yaw → pearl",
    why: "Facing the key light thickens optical depth. Profile thins it.",
    from: { node: "orbit", param: "yaw" },
    to: { node: "pearl", param: "depth" },
    mix: 0.22,
    apply: (yaw, depth) => {
      const facing = Math.abs(Math.cos((yaw * Math.PI) / 180));
      return clamp(depth * (0.82 + 0.18 * facing), 0, 1.44);
    },
  },
  {
    id: "plant-k-tau",
    label: "k → τ",
    why: "Harder plant (k) shortens the damper so the planted foot does not gel.",
    from: { node: "support", param: "k" },
    to: { node: "voigt", param: "tau" },
    mix: 0.2,
    apply: (k, tau) => clamp(tau * (1.12 - 0.028 * (k - 6)), 0.02, 0.08),
  },
];

function read(
  params: Record<string, Record<string, number>>,
  end: CoupleEnd,
): number | undefined {
  const bag = params[end.node];
  if (!bag || bag[end.param] === undefined) return undefined;
  return bag[end.param];
}

function write(
  params: Record<string, Record<string, number>>,
  end: CoupleEnd,
  value: number,
): void {
  if (!params[end.node]) params[end.node] = {};
  params[end.node][end.param] = value;
}

export function applyCouplings(
  params: Record<string, Record<string, number>>,
  mute: Record<string, boolean>,
  masterMix = 1,
): { params: Record<string, Record<string, number>>; traces: CoupleTrace[] } {
  if (mute.couple || masterMix <= 0) {
    return { params, traces: [] };
  }
  const next: Record<string, Record<string, number>> = {};
  for (const [k, bag] of Object.entries(params)) next[k] = { ...bag };
  const traces: CoupleTrace[] = [];
  for (const law of COUPLE_LAWS) {
    if (mute[law.from.node] || mute[law.to.node]) continue;
    const driver = read(next, law.from);
    const driven = read(next, law.to);
    if (driver === undefined || driven === undefined) continue;
    const mapped = law.apply(driver, driven);
    const after = lerp(driven, mapped, clamp(law.mix * masterMix, 0, 1));
    write(next, law.to, after);
    traces.push({
      id: law.id,
      label: law.label,
      from: law.from,
      to: law.to,
      before: driven,
      after,
    });
  }
  return { params: next, traces };
}

export function lawsFor(nodeId: string): CoupleLaw[] {
  return COUPLE_LAWS.filter((l) => l.from.node === nodeId || l.to.node === nodeId);
}
