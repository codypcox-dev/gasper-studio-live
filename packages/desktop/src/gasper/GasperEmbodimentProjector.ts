/**
 * Wave R3 — project embodiment profile traits onto live SVG without FormMaster.
 * Shared-topology traits: idleRig scale, face plane visibility, horizon/disc optics.
 * Contour path `d` is rewritten by GasperContourSolver via the mixer; identity
 * is preserved via profile registry + multi-domain mixer bindings.
 */

import type { GasperEmbodimentProfile } from "./GasperRigDefinition";
import {
  getEmbodimentProfile,
  profileToDomainBindings,
} from "./GasperRigDefinition";
import { resolveProjectorFaceVisibility } from "./continuity/noBlackoutInvariant";

export type EmbodimentProjectReport = {
  profileId: string;
  faceVisible: boolean;
  idleTransform: string;
  domains: Record<string, number>;
  layersTouched: string[];
};

function q(svg: SVGSVGElement, id: string): SVGElement | null {
  return svg.querySelector(`#${id}`) as SVGElement | null;
}

/**
 * Apply profile geometry traits to mounted SVG layers.
 * @param mix 0 = pure profile; used by morph adapter for partial blends.
 */
export function projectEmbodimentOntoSvg(
  svg: SVGSVGElement,
  profileId: string,
  mix = 1,
  fromProfileId?: string,
): EmbodimentProjectReport {
  const to = getEmbodimentProfile(profileId);
  if (!to) {
    throw new Error(`Unknown embodiment profile: ${profileId}`);
  }
  const from =
    fromProfileId && mix < 1
      ? getEmbodimentProfile(fromProfileId) ?? to
      : to;
  const t = Math.max(0, Math.min(1, mix));
  const lerp = (a: number, b: number) => a + (b - a) * t;

  const sx = lerp(from.sx, to.sx);
  const sy = lerp(from.sy, to.sy);
  const cx = lerp(from.cx, to.cx);
  const cy = lerp(from.cy, to.cy);
  const horizon = lerp(from.horizon, to.horizon);
  const disc = lerp(from.disc, to.disc);
  const faceY = lerp(from.faceY, to.faceY);
  const faceScaleX = lerp(from.faceScaleX, to.faceScaleX);
  const faceScaleY = lerp(from.faceScaleY, to.faceScaleY);
  const faceX = lerp(from.faceX ?? 0, to.faceX ?? 0);

  // R4 no-blackout: resolve face visibility with dim-but-legible floors.
  // Wake reconstructs from non-zero; dormant never wipes to empty orb.
  const fromDormant = from.geometryModel === "dormant-family" || !from.face;
  const toDormant = to.geometryModel === "dormant-family" || !to.face;
  let routeHint: "wake" | "dormant" | "ordinary" = "ordinary";
  if (fromDormant && !toDormant) routeHint = "wake";
  else if (toDormant) routeHint = "dormant";
  const vis = resolveProjectorFaceVisibility({
    progress: t,
    fromFace: from.face,
    toFace: to.face,
    routeHint,
  });
  const faceVis = vis.faceVis;
  const dormantFamily = vis.dormantFamily || fromDormant || toDormant;

  const layersTouched: string[] = [];
  const idle = q(svg, "idleRig") as SVGGElement | null;
  const idleTransform = `translate(${(cx * 2).toFixed(3)} ${(cy * 1.5).toFixed(3)}) translate(120 110) scale(${sx.toFixed(5)} ${sy.toFixed(5)}) translate(-120 -110)`;
  if (idle) {
    idle.setAttribute("transform", idleTransform);
    layersTouched.push("idleRig");
  }

  const faceRecess = q(svg, "faceRecessLayer");
  const faceEm = q(svg, "faceEmissionLayer");
  // GASPER-007-G + R4: dormant face reduction via compression + occlusion +
  // emissive dimming (not hard delete / not zero opacity). Face nodes stay in
  // tree; opacity/scale carry doctrine with no-blackout floors.
  // Anti-collapse: dormant may compress but never zero-scale disappear.
  // Ordinary expression paths keep face scale ≥ ~0.88 effective.
  const faceScaleMul = dormantFamily
    ? Math.max(0.78, 0.62 + faceVis * 0.4)
    : Math.max(0.88, 1);
  const sxFace = Math.max(0.78, faceScaleX * faceScaleMul);
  const syFace = Math.max(0.78, faceScaleY * faceScaleMul);
  const faceTx = `translate(${faceX.toFixed(2)} ${faceY.toFixed(2)}) translate(120 112) scale(${sxFace.toFixed(4)} ${syFace.toFixed(4)}) translate(-120 -112)`;
  for (const [name, el] of [
    ["faceRecessLayer", faceRecess],
    ["faceEmissionLayer", faceEm],
  ] as const) {
    if (!el) continue;
    el.setAttribute("transform", faceTx);
    const op =
      name === "faceEmissionLayer" ? vis.emissionOp : vis.recessOp;
    el.style.opacity = op.toFixed(3);
    layersTouched.push(name);
  }
  // Eye/mouth feature fade for reduced-dormant doctrine — floored for legibility.
  // Only set baseline opacity here — GasperRenderMixer.renderFace is the
  // character/state-visual authority for eye_openness / mouth geometry scales.
  for (const id of ["eyeL", "eyeR", "mouth"] as const) {
    const el = q(svg, id);
    if (!el) continue;
    el.style.opacity = vis.featureOp.toFixed(3);
    layersTouched.push(id);
  }

  // Horizon / disc optical emphasis
  for (const id of [
    "horizonLens",
    "horizonBloom",
    "accretionArc",
    "accretionDisc",
  ]) {
    const el = q(svg, id);
    if (!el) continue;
    const base =
      id === "horizonLens"
        ? horizon * 0.48
        : id === "horizonBloom"
          ? horizon * 0.12
          : id.startsWith("accretion")
            ? Math.max(horizon, disc) * 0.55
            : horizon;
    el.style.opacity = String(Math.max(0, Math.min(1, base)));
    layersTouched.push(id);
  }

  // Shell mass presence
  const shell = q(svg, "chromaticShell");
  if (shell) {
    const shellOp =
      to.geometryModel === "dormant-family"
        ? 0.55 + (1 - (to.dormantCollapse ?? 0)) * 0.35
        : 0.92;
    shell.setAttribute("opacity", shellOp.toFixed(3));
    layersTouched.push("chromaticShell");
  }

  svg.dataset.gasperProfile = profileId;
  // R4: face remains present under no-blackout floors (threshold lowered only
  // for telemetry — visibility itself is floored above blackout).
  svg.dataset.gasperFace = faceVis > 0.2 ? "1" : "0";
  svg.dataset.gasperGeometryModel =
    t < 0.5 ? from.geometryModel : to.geometryModel;
  svg.dataset.gasperFaceVis = faceVis.toFixed(3);

  const domains = profileToDomainBindings({
    ...to,
    sx,
    sy,
    face: faceVis > 0.2,
    faceScaleX,
    faceScaleY,
    horizon,
    disc,
  });

  return {
    profileId,
    faceVisible: faceVis > 0.2,
    idleTransform,
    domains,
    layersTouched,
  };
}

export function projectEmbodimentProfile(
  svg: SVGSVGElement,
  profile: GasperEmbodimentProfile,
): EmbodimentProjectReport {
  return projectEmbodimentOntoSvg(svg, profile.id, 1);
}
