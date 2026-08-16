/** Vitest hydrate for modules that import gsap-shim at load time. */
const host = globalThis as { gsap?: { quickTo: unknown } };
if (!host.gsap || typeof host.gsap.quickTo !== "function") {
  const tl = {
    to() {
      return this;
    },
    addLabel() {
      return this;
    },
    kill() {},
    pause() {
      return this;
    },
    play() {
      return this;
    },
    progress() {
      return 0;
    },
    isActive() {
      return false;
    },
    duration() {
      return 0;
    },
  };
  host.gsap = {
    quickTo: () => () => {},
    killTweensOf: () => {},
    set: () => {},
    to: () => ({ kill: () => {} }),
    timeline: () => tl,
    delayedCall: () => ({ kill: () => {} }),
    updateRoot: () => {},
    ticker: { add() {}, remove() {}, sleep() {}, wake() {} },
  } as typeof host.gsap;
}
