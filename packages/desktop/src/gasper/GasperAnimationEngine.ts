/**
 * GSAP-driven continuous stage animation for the authoring hot path.
 * pointer → GasperRigBinding.preview → gsap.quickTo → mixer → flush
 * No React setState / REST / MCP / CDP / iframe / postMessage.
 */
import gsap from "./gsap-shim";

export type ProxyTarget = { v: number };

type ProxyEntry = {
  target: ProxyTarget;
  quickTo: (value: number) => void;
  onUpdate: (value: number) => void;
};

export class GasperAnimationEngine {
  private proxies = new Map<string, ProxyEntry>();

  /**
   * Register a numeric proxy driven by real GSAP quickTo.
   */
  registerProxy(
    id: string,
    initial: number,
    onUpdate: (value: number) => void,
    duration = 0.08,
  ) {
    const target: ProxyTarget = { v: initial };
    const quickTo = gsap.quickTo(target, "v", {
      duration,
      ease: "none",
      onUpdate: () => onUpdate(target.v),
    });
    this.proxies.set(id, { target, quickTo, onUpdate });
  }

  /** Hot-path set — real GSAP continuous interpolation. */
  preview(id: string, value: number) {
    const p = this.proxies.get(id);
    if (!p) return;
    p.quickTo(value);
  }

  /** Snap without interpolation (commit / cancel). */
  setImmediate(id: string, value: number, onUpdate: (value: number) => void) {
    const p = this.proxies.get(id);
    if (p) {
      gsap.killTweensOf(p.target);
      gsap.set(p.target, { v: value });
      p.target.v = value;
    }
    onUpdate(value);
  }

  kill(id: string) {
    const p = this.proxies.get(id);
    if (p) gsap.killTweensOf(p.target);
  }

  /** Test/diagnostic: engine is backed by real GSAP. */
  static engineKind(): "gsap" {
    return "gsap";
  }
}

export const gasperAnimation = new GasperAnimationEngine();
