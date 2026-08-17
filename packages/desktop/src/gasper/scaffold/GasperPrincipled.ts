/**
 * Disney principled dialect for the canonical glossy organism.
 * metallic 0. No hue tints. Layers, not dimmers.
 */
export const CANON_GLOSS = Object.freeze({
  roughness: 0.14,
  clearcoat: 0.92,
  clearcoatGloss: 0.88,
  pearl: 0.82,
  absorption: 0.22,
  specular: 0.5,
  metallic: 0,
  anisotropic: 0,
  sheen: 0,
  specTrans: 0,
  f0: 0.04,
});

export function coatAlpha(gloss = CANON_GLOSS.clearcoatGloss): number {
  return Math.max(0.045, (1 - gloss) * (1 - gloss) * 0.35 + 0.06);
}
