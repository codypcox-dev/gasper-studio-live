import type { VWebGLParams } from "./createVWebGLEngine";

export const FACTORY_BASELINE: VWebGLParams = {
  autoOrbit: false,
  yaw: 8,
  pitch: 0,
  key: 1.45,
  rim: 0.62,
  fill: 0.48,
  hemi: 0.55,
  roughness: 0.28,
  metalness: 0.04,
  clearcoat: 0.72,
  transmission: 0.1,
  thickness: 0.75,
  depth: 0.78,
};

const BASE_KEY = "gasper.vwebgl.baseline.v4";
const LIVE_KEY = "gasper.vwebgl.live.v4";

export function readBaseline(): VWebGLParams {
  try {
    const raw = localStorage.getItem(BASE_KEY);
    if (!raw) return { ...FACTORY_BASELINE };
    return { ...FACTORY_BASELINE, ...(JSON.parse(raw) as Partial<VWebGLParams>) };
  } catch {
    return { ...FACTORY_BASELINE };
  }
}

export function writeBaseline(p: VWebGLParams) {
  try {
    localStorage.setItem(BASE_KEY, JSON.stringify(p));
  } catch {
    /* */
  }
}

export function readLive(): VWebGLParams {
  try {
    const raw = localStorage.getItem(LIVE_KEY);
    if (!raw) return readBaseline();
    return { ...FACTORY_BASELINE, ...(JSON.parse(raw) as Partial<VWebGLParams>) };
  } catch {
    return readBaseline();
  }
}

export function writeLive(p: VWebGLParams) {
  try {
    localStorage.setItem(LIVE_KEY, JSON.stringify(p));
  } catch {
    /* */
  }
}
