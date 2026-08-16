/**
 * GSAP continuous animation authority for the Dais hot path.
 *
 * Browser: classic UMD from index.html → window.gsap / globalThis.gsap
 * Node/vitest: vitest.config.ts hydrates globalThis.gsap from vendor UMD
 */

export type GsapTweenVars = Record<string, unknown> & {
  duration?: number;
  delay?: number;
  ease?: string;
  overwrite?: "auto" | boolean;
  yoyo?: boolean;
  repeat?: number;
  onUpdate?: () => void;
  onComplete?: () => void;
};

export type GsapTimelineLike = {
  to(target: object, vars: GsapTweenVars, position?: number | string): GsapTimelineLike;
  addLabel(label: string, position?: number | string): GsapTimelineLike;
  kill(): void;
  pause(): GsapTimelineLike;
  play(): GsapTimelineLike;
  progress(value?: number): number;
  isActive(): boolean;
  duration(): number;
};

export type GsapApi = {
  quickTo: (
    target: object,
    property: string,
    vars?: GsapTweenVars,
  ) => (value: number) => void;
  killTweensOf: (target: object) => void;
  set: (target: object, vars: Record<string, unknown>) => void;
  to: (target: object, vars: GsapTweenVars) => { kill: () => void };
  timeline: (vars?: Record<string, unknown>) => GsapTimelineLike;
  /** Preferred for proof-mode delays (GSAP-owned clock when available). */
  delayedCall?: (delay: number, callback: () => void) => { kill: () => void };
  /** VEC-401: root timeline advancement supplied by the organism clock bridge. */
  updateRoot?: (timeSeconds?: number) => void;
  ticker?: {
    add: (fn: (time?: number) => void) => void;
    remove: (fn: (time?: number) => void) => void;
    sleep?: () => void;
    wake?: () => void;
  };
};

type GlobalWithGsap = typeof globalThis & { gsap?: GsapApi };

function loadGsap(): GsapApi {
  const g = (globalThis as GlobalWithGsap).gsap;
  if (g && typeof g.quickTo === "function") return g;
  throw new Error(
    "GSAP failed to load (globalThis.gsap.quickTo missing). " +
      "Browser: ensure index.html loads /vendor/gsap/gsap.min.js before the app module. " +
      "Tests: vitest.config.ts must hydrate globalThis.gsap from vendor UMD.",
  );
}

const gsap: GsapApi = loadGsap();

export default gsap;
export { gsap };
