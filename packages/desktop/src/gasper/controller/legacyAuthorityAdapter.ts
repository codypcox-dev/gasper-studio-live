import {
  buildCanonicalProductionFieldPacket,
  type CanonicalProductionFieldPacket,
} from "../projection/CanonicalProductionField";

/**
 * VEC-801 — Renderer adapter for the production FormMaster (legacy authority) path.
 * Maps semantic pose → FormMaster bindings and requests one clock-driven frame.
 * Never performs post-paint SVG mutation (VEC-701 one-writer invariant).
 */

export type FormMasterRigSurface = {
  setMotion?: (v: number) => void;
  setYaw?: (v: number) => void;
  requestOneFrame?: () => void;
  setPaused?: (v: boolean) => void;
  setReliefPreset?: (v: string) => void;
};

export type FormMasterGlobalSurface = {
  applyCanonicalProjection?: (packet: CanonicalProductionFieldPacket) => void;
  applySemanticPose?: (p: Record<string, number>) => void;
  applyBindings?: (p: Record<string, number>) => void;
  setBinding?: (id: string, v: number) => void;
  setMotion?: (v: number) => void;
  setYaw?: (v: number) => void;
  requestOneFrame?: () => void;
  setPaused?: (v: boolean) => void;
  setReliefPreset?: (v: string) => void;
};

export type LegacyAuthorityAdapterHost = {
  legacyFormMaster: boolean;
  rig: FormMasterRigSurface | null;
  globalRig: FormMasterGlobalSurface | null | undefined;
  eightStateFaceMorphActive: boolean;
  externalBlinkEyeAuthority: boolean;
  livingEmbodimentTransitionKey: string | null;
  eightStateLoop: boolean;
  reducedMotion: boolean;
  eightState: string | null | undefined;
  onOperationalRelief: (amplitude: number, pose: Record<string, number>) => void;
  ensureLiveSvgRootVisible: () => void;
};

let canonicalProjectionRevision = 0;

/**
 * Request one FormMaster frame. FormMaster render is wrapped by the VEC-701
 * production transaction; the controller performs no post-paint SVG writes.
 */
export function paintLegacyAuthorityFrame(
  host: Pick<LegacyAuthorityAdapterHost, "legacyFormMaster" | "rig">,
): void {
  const rig = host.rig;
  if (!rig || !host.legacyFormMaster) return;
  try {
    rig.requestOneFrame?.();
  } catch {
    /* optional FormMaster frame request */
  }
}

/**
 * Map modern semantic pose keys into FormMaster motion/bindings and paint.
 * Does not invoke native mixer flush (would flatten complete character).
 * The FormMaster transaction is the only production projection writer.
 */
export function applyPoseToLegacyAuthority(
  host: LegacyAuthorityAdapterHost,
  pose: Record<string, number>,
): void {
  const ext = host.globalRig ?? undefined;
  const rig = host.rig;
  if (!rig && !ext) return;
  try {
    // GASPER-UNIFIED-FIELD-001: send the complete resolved field packet once
    // before legacy aliases are applied. This is state handoff only; FormMaster
    // remains the sole SVG writer and still paints through VEC-701.
    ext?.applyCanonicalProjection?.(
      buildCanonicalProductionFieldPacket(pose, ++canonicalProjectionRevision),
    );
    if (typeof pose.motion === "number") {
      (ext || rig)?.setMotion?.(pose.motion);
    }
    if (typeof pose.yaw === "number") {
      (ext || rig)?.setYaw?.(pose.yaw);
    }
    if (typeof ext?.applySemanticPose === "function") {
      // F1_FACE_MORPH_WINDOW: while the eight-state loop is mid-transition on the legacy
      // path, let FormMaster's geometric setExpressionPreview/setMorphPreview blend drive
      // the face; do NOT hard-snap eye/gaze over it. Non-face keys (energy/relief/motion/
      // yaw/etc.) still apply. Reduced motion keeps the shipped snap path.
      const faceMorph = host.eightStateFaceMorphActive && host.legacyFormMaster;
      // CONTINUOUS_FLUID_LOOP: a real blink (eye_openness dipping well below the
      // open band) must paint even mid-morph so the loop visibly blinks; let it
      // override the geometric blend for its brief close. Gaze stays morph-owned.
      const blinkDip =
        typeof pose.eye_openness === "number" && pose.eye_openness < 0.45;
      const poseToApply = faceMorph
        ? Object.fromEntries(
            Object.entries(pose).filter(([k]) => {
              if (k === "gaze") return false;
              // SINGLE-SOURCE EYE APERTURE (Cody 2026-07-24): on the live loop the TS
              // eight-state loop owns the aperture via externalEyeAperture (set above
              // from pose.eye_openness, which carries the real blink dip). applySemantic
              // Pose must NOT also write eye_openness, or current.eyeOpenL ping-pongs
              // against the geometric blend every frame (the aperture race) and the
              // per-state open-level change reads as a flinch. So under authority, never
              // pass eye_openness here. Scrub/reduced-motion (faceMorph false) bypass
              // this filter entirely; the blinkDip carve-out is retained only for the
              // non-authority morph path.
              if (k === "eye_openness")
                return !host.externalBlinkEyeAuthority && blinkDip;
              return true;
            }),
          )
        : pose;
      ext.applySemanticPose(poseToApply);
    } else if (ext?.applyBindings) {
      ext.applyBindings(pose);
    } else if (ext?.setBinding) {
      for (const [k, v] of Object.entries(pose)) {
        if (typeof v === "number") ext.setBinding(k, v);
      }
    }
    if (
      typeof pose.energy_level === "number" &&
      typeof document !== "undefined"
    ) {
      const el = document.getElementById(
        "interiorEnergy",
      ) as HTMLInputElement | null;
      if (el) {
        el.value = String(pose.energy_level);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    if (typeof pose.relief_amplitude === "number") {
      host.onOperationalRelief(pose.relief_amplitude, pose);
    }
    const freezeProfileFrame =
      host.eightStateLoop &&
      host.reducedMotion && // CONTINUOUS_FLUID_LOOP: only the reduced-motion static path freezes; the live loop keeps painting its authored idle (no frozen frames)
      !host.eightStateFaceMorphActive && // F1_FACE_MORPH_WINDOW: don't freeze mid-morph; freeze on hold
      (host.livingEmbodimentTransitionKey !== null ||
        host.eightState === "comet-executing-drive" ||
        host.eightState === "dormant-orbit-maintain" ||
        host.eightState === "wake");
    if (freezeProfileFrame) {
      // FormMaster's Comet/Dormant profiles derive orientation from wall time.
      // Pause the live SVG root (never substitute a bitmap snapshot).
      (ext || rig)?.setPaused?.(true);
      host.ensureLiveSvgRootVisible();
      return;
    }
    // FormMaster is the only production SVG projector.
    paintLegacyAuthorityFrame(host);
  } catch (e) {
    console.warn("[GasperLegacyAuthorityAdapter] legacy pose apply", e);
  }
}
