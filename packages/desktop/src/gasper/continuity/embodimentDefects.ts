/**
 * Frame-dense embodiment defect detectors.
 * First-class rejection for duplicate contour authority, topology ghosting,
 * volume collapse, feature piercing, teleporting, derivative spikes,
 * horizontal shearing, stale duplicate silhouettes, snap reconstruction,
 * dragged facial features, transparent ghost anatomy, and axial needles.
 *
 * Pure analysis — does not own GSAP frames.
 */

import { finiteDifferences, maxAbs } from "./derivatives";
import type {
  ContinuityFrame,
  ContinuityThresholds,
} from "./types";
import { DEFAULT_CONTINUITY_THRESHOLDS } from "./types";
import type {
  EmbodimentDefectFinding,
  MorphologyFrame,
} from "../morphology/types";

/** Thresholds for embodiment-specific defects. */
export type EmbodimentDefectThresholds = {
  /** Min volume (width×height×fullness^0.35). */
  volumeFloor: number;
  /** Max |Δchannel| for teleport rejection. */
  maxTeleportDelta: number;
  /** Max |jerk| for derivative spike. */
  maxJerk: number;
  /** Max |COM| step per frame. */
  maxComStep: number;
  /** Max axial_needle specialty residual. */
  maxAxialNeedle: number;
  /** Max ghost_anatomy residual. */
  maxGhostAnatomy: number;
  /** Max horizontal_shear residual. */
  maxHorizontalShear: number;
  /** Max dual_silhouette residual. */
  maxDualSilhouette: number;
  /** Max |Δeye| or |Δmouth| relative to contour width step (drag). */
  maxFeatureDragRatio: number;
  /** Continuity thresholds for shared detectors. */
  continuity: ContinuityThresholds;
};

export const DEFAULT_EMBODIMENT_DEFECT_THRESHOLDS: EmbodimentDefectThresholds = {
  volumeFloor: 0.78,
  maxTeleportDelta: 0.55,
  maxJerk: DEFAULT_CONTINUITY_THRESHOLDS.maxJerk,
  maxComStep: 0.12,
  maxAxialNeedle: 0.02,
  maxGhostAnatomy: 0.02,
  maxHorizontalShear: 0.05,
  maxDualSilhouette: 0.02,
  maxFeatureDragRatio: 2.5,
  continuity: DEFAULT_CONTINUITY_THRESHOLDS,
};

function volumeOf(channels: Record<string, number>): number {
  const w = channels.overall_width ?? 1;
  const h = channels.overall_height ?? 1;
  const f = channels.lower_body_fullness ?? 1;
  return w * h * Math.pow(Math.max(0.5, f), 0.35);
}

/**
 * Analyze a morphology frame sequence for embodiment defects.
 * Returns all findings (empty = clean).
 */
export function detectEmbodimentDefects(
  frames: readonly MorphologyFrame[],
  thresholds: EmbodimentDefectThresholds = DEFAULT_EMBODIMENT_DEFECT_THRESHOLDS,
): EmbodimentDefectFinding[] {
  const findings: EmbodimentDefectFinding[] = [];
  if (frames.length === 0) return findings;

  // Track intermediate state transitions for snap reconstruction
  let sawDissolve = false;
  let sawMigrate = false;

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]!;
    const ch = f.channels;

    // --- volume collapse ---
    const vol = f.volume ?? volumeOf(ch);
    // Epsilon: floating-point equality at the floor is not a collapse
    if (vol < thresholds.volumeFloor - 1e-6) {
      findings.push({
        defect: "volume_collapse",
        frameIndex: i,
        severity: "P0",
        detail: `volume ${vol.toFixed(4)} below floor ${thresholds.volumeFloor}`,
        value: vol,
        threshold: thresholds.volumeFloor,
      });
    }

    // --- axial needle ---
    const needle = f.specialty.axialNeedle ?? ch.axial_needle ?? 0;
    if (needle > thresholds.maxAxialNeedle) {
      findings.push({
        defect: "axial_needle",
        frameIndex: i,
        severity: "P0",
        detail: `axial needle residual ${needle}`,
        value: needle,
        threshold: thresholds.maxAxialNeedle,
      });
    }

    // --- feature piercing: high singularity well while face still present ---
    const faceOpen =
      (ch.eye_openness ?? 0) * 0.5 +
      (ch.mouth_openness ?? 0) * 0.3 +
      (ch.face_emissive ?? 0) * 0.2;
    const well = f.specialty.singularityMix;
    if (well > 0.65 && faceOpen > 0.4 && needle <= thresholds.maxAxialNeedle) {
      // Piercing without explicit needle metric
      findings.push({
        defect: "feature_piercing",
        frameIndex: i,
        severity: "P0",
        detail: `singularity mix ${well.toFixed(3)} with face presence ${faceOpen.toFixed(3)}`,
        value: well * faceOpen,
      });
    }

    // --- transparent ghost anatomy ---
    const ghost = f.specialty.ghostAnatomy ?? ch.ghost_anatomy ?? 0;
    if (ghost > thresholds.maxGhostAnatomy) {
      findings.push({
        defect: "transparent_ghost_anatomy",
        frameIndex: i,
        severity: "P0",
        detail: `ghost anatomy residual ${ghost}`,
        value: ghost,
        threshold: thresholds.maxGhostAnatomy,
      });
    }
    // Ghost: deep well + open face without dissolve/migrate/reconstitute governance
    const faceGoverned =
      f.features.face.dissolve >= 0.25 ||
      f.features.face.migrate >= 0.25 ||
      f.features.face.reconstitute >= 0.25 ||
      f.features.eyes.dissolve >= 0.25;
    if (well > 0.55 && faceOpen > 0.35 && !faceGoverned) {
      findings.push({
        defect: "transparent_ghost_anatomy",
        frameIndex: i,
        severity: "P0",
        detail: "face coexists with deep well without dissolve/reconstitute governance",
        value: well * faceOpen,
      });
    }

    // --- horizontal shearing (residual channel OR structural uncompensated width) ---
    const shear = f.specialty.horizontalShear ?? ch.horizontal_shear ?? 0;
    if (shear > thresholds.maxHorizontalShear) {
      findings.push({
        defect: "horizontal_shearing",
        frameIndex: i,
        severity: "P0",
        detail: `horizontal shear residual ${shear}`,
        value: shear,
        threshold: thresholds.maxHorizontalShear,
      });
    }
    // Structural: large width without compensating height while comet/wake specialty active
    if (i > 0) {
      const prevCh = frames[i - 1]!.channels;
      const wStep = Math.abs((ch.overall_width ?? 1) - (prevCh.overall_width ?? 1));
      const hStep = Math.abs((ch.overall_height ?? 1) - (prevCh.overall_height ?? 1));
      const specialtyMotion =
        (f.specialty.cometMix ?? 0) + (f.specialty.wakeMix ?? 0);
      if (
        specialtyMotion > 0.35 &&
        wStep > 0.06 &&
        hStep < wStep * 0.12 &&
        shear <= thresholds.maxHorizontalShear
      ) {
        findings.push({
          defect: "horizontal_shearing",
          frameIndex: i,
          severity: "P0",
          detail: `uncompensated width step ${wStep.toFixed(4)} (height step ${hStep.toFixed(4)})`,
          value: wStep,
        });
      }
    }

    // --- stale duplicate silhouette / dual authority ---
    const dual = f.specialty.dualSilhouette ?? ch.dual_silhouette ?? 0;
    if (dual > thresholds.maxDualSilhouette) {
      findings.push({
        defect: "stale_duplicate_silhouette",
        frameIndex: i,
        severity: "P0",
        detail: `dual silhouette residual ${dual}`,
        value: dual,
        threshold: thresholds.maxDualSilhouette,
      });
    }

    // --- duplicate contour authority ---
    // Contour owner must be singular (type system enforces one field; check non-none
    // and that shell/contour aren't owned by different specialty bodies simultaneously
    // with both accretion and wake_tail active).
    if (f.ownership.contour === "none") {
      findings.push({
        defect: "duplicate_contour_authority",
        frameIndex: i,
        severity: "P0",
        detail: "contour ownership is none (no exclusive authority)",
      });
    }
    const specialtyOwners = [
      f.ownership.accretion,
      f.ownership.wake_tail,
      f.ownership.orbit,
    ].filter((o) => o !== "none");
    // More than one exclusive specialty body claiming form
    if (specialtyOwners.length > 1) {
      // Allow only if progress is mid-blend with transition_blend on contour
      if (f.ownership.contour !== "transition_blend") {
        findings.push({
          defect: "duplicate_contour_authority",
          frameIndex: i,
          severity: "P0",
          detail: `multiple specialty owners: ${specialtyOwners.join(",")}`,
        });
      }
    }

    // --- topology ghosting: specialty layer owned but mix ~0, or mix high but owner none ---
    if (f.ownership.accretion !== "none" && f.specialty.singularityMix < 0.02) {
      findings.push({
        defect: "topology_ghosting",
        frameIndex: i,
        severity: "P1",
        detail: "accretion ownership without singularity mix",
      });
    }
    if (f.ownership.wake_tail !== "none" && f.specialty.cometMix < 0.02) {
      findings.push({
        defect: "topology_ghosting",
        frameIndex: i,
        severity: "P1",
        detail: "wake_tail ownership without comet mix",
      });
    }
    if (
      f.specialty.singularityMix > 0.4 &&
      f.ownership.accretion === "none" &&
      f.ownership.contour === "none"
    ) {
      findings.push({
        defect: "topology_ghosting",
        frameIndex: i,
        severity: "P0",
        detail: "singularity mix without layer ownership",
      });
    }

    // Track feature phases for snap reconstruction (weights, not only phase labels)
    if (
      f.features.eyes.phase === "dissolve" ||
      f.features.face.phase === "dissolve" ||
      f.features.eyes.dissolve > 0.4 ||
      f.features.face.dissolve > 0.4
    ) {
      sawDissolve = true;
    }
    if (
      f.features.eyes.phase === "migrate" ||
      f.features.face.phase === "migrate" ||
      f.features.eyes.migrate > 0.3 ||
      f.features.face.migrate > 0.3 ||
      f.features.mouth.migrate > 0.3
    ) {
      sawMigrate = true;
    }
    if (
      (f.features.eyes.phase === "reconstitute" ||
        f.features.face.phase === "reconstitute") &&
      sawDissolve &&
      !sawMigrate &&
      f.features.eyes.reconstitute > 0.7
    ) {
      findings.push({
        defect: "snap_reconstruction",
        frameIndex: i,
        severity: "P0",
        detail: "reconstitute after dissolve without migrate phase",
      });
    }

    // Illegal feature order: reconstitute + dissolve simultaneous
    if (
      f.features.eyes.reconstitute > 0.5 &&
      f.features.eyes.dissolve > 0.5
    ) {
      findings.push({
        defect: "snap_reconstruction",
        frameIndex: i,
        severity: "P0",
        detail: "eyes dissolve and reconstitute both dominant",
      });
    }

    // Pairwise frame deltas
    if (i > 0) {
      const prev = frames[i - 1]!;
      // --- teleporting ---
      let maxDelta = 0;
      for (const k of Object.keys(ch)) {
        if (
          k === "singularity_mix" ||
          k === "comet_mix" ||
          k === "dormant_mix" ||
          k === "wake_mix"
        ) {
          // Specialty mixes can change faster mid-route but still bounded
          const d = Math.abs((ch[k] ?? 0) - (prev.channels[k] ?? 0));
          if (d > thresholds.maxTeleportDelta * 1.2) {
            maxDelta = Math.max(maxDelta, d);
          }
          continue;
        }
        const d = Math.abs((ch[k] ?? 0) - (prev.channels[k] ?? 0));
        if (d > maxDelta) maxDelta = d;
      }
      if (maxDelta > thresholds.maxTeleportDelta) {
        findings.push({
          defect: "teleporting",
          frameIndex: i,
          severity: "P0",
          detail: `max channel delta ${maxDelta.toFixed(4)}`,
          value: maxDelta,
          threshold: thresholds.maxTeleportDelta,
        });
      }

      // --- COM continuity ---
      const comStep = Math.hypot(f.com.x - prev.com.x, f.com.y - prev.com.y);
      if (comStep > thresholds.maxComStep) {
        findings.push({
          defect: "teleporting",
          frameIndex: i,
          severity: "P0",
          detail: `COM jump ${comStep.toFixed(4)}`,
          value: comStep,
          threshold: thresholds.maxComStep,
        });
      }

      // --- dragged facial features: face teleports with contour without lifecycle governance ---
      const widthStep = Math.abs(
        (ch.overall_width ?? 1) - (prev.channels.overall_width ?? 1),
      );
      const eyeStep = Math.abs(
        (ch.eye_openness ?? 0) - (prev.channels.eye_openness ?? 0),
      );
      const mouthStep = Math.abs(
        (ch.mouth_openness ?? 0) - (prev.channels.mouth_openness ?? 0),
      );
      const gazeStep = Math.abs((ch.gaze ?? 0) - (prev.channels.gaze ?? 0));
      const faceGovernedDrag =
        f.features.face.phase !== "hold" ||
        f.features.eyes.phase !== "hold" ||
        f.features.face.migrate > 0.2 ||
        f.features.eyes.migrate > 0.2 ||
        f.features.face.dissolve > 0.2;
      // Contour width shift dragging ungoverned face/gaze (Comet shear signature)
      if (
        widthStep > 0.04 &&
        !faceGovernedDrag &&
        (gazeStep > 0.12 ||
          eyeStep > widthStep * thresholds.maxFeatureDragRatio ||
          mouthStep > widthStep * thresholds.maxFeatureDragRatio)
      ) {
        findings.push({
          defect: "dragged_facial_features",
          frameIndex: i,
          severity: "P0",
          detail: `face dragged with contour: widthΔ=${widthStep.toFixed(3)} gazeΔ=${gazeStep.toFixed(3)} eyeΔ=${eyeStep.toFixed(3)}`,
          value: Math.max(gazeStep, eyeStep) / Math.max(widthStep, 1e-6),
        });
      }
    }
  }

  // --- derivative spikes on primary channels ---
  const dt = 1 / 60;
  for (const key of [
    "overall_height",
    "overall_width",
    "energy_level",
    "eye_openness",
    "mouth_openness",
    "com_x",
  ] as const) {
    const series = frames.map((f) => f.channels[key] ?? 0);
    const { jerk } = finiteDifferences(series, dt);
    const mj = maxAbs(jerk);
    if (mj > thresholds.maxJerk) {
      // Find first spike frame
      let idx = 0;
      for (let i = 0; i < jerk.length; i++) {
        if (Math.abs(jerk[i]!) === mj) {
          idx = i;
          break;
        }
      }
      findings.push({
        defect: "derivative_spike",
        frameIndex: idx,
        severity: "P1",
        detail: `jerk spike on ${key}: ${mj.toFixed(1)}`,
        value: mj,
        threshold: thresholds.maxJerk,
      });
    }
  }

  return findings;
}

/**
 * Analyze continuity frames that carry morphology specialty channels
 * (when LivingRuntime embeds morphology proxies into channel maps).
 */
export function detectEmbodimentDefectsFromContinuity(
  frames: readonly ContinuityFrame[],
  thresholds: EmbodimentDefectThresholds = DEFAULT_EMBODIMENT_DEFECT_THRESHOLDS,
): EmbodimentDefectFinding[] {
  const findings: EmbodimentDefectFinding[] = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]!;
    const ch = f.channels;
    const vol = volumeOf(ch);
    if (vol < thresholds.volumeFloor) {
      findings.push({
        defect: "volume_collapse",
        frameIndex: i,
        severity: "P0",
        detail: `volume ${vol.toFixed(4)} below floor`,
        value: vol,
        threshold: thresholds.volumeFloor,
      });
    }
    if ((ch.axial_needle ?? 0) > thresholds.maxAxialNeedle) {
      findings.push({
        defect: "axial_needle",
        frameIndex: i,
        severity: "P0",
        detail: "axial needle channel elevated",
        value: ch.axial_needle,
      });
    }
    if ((ch.ghost_anatomy ?? 0) > thresholds.maxGhostAnatomy) {
      findings.push({
        defect: "transparent_ghost_anatomy",
        frameIndex: i,
        severity: "P0",
        detail: "ghost anatomy channel elevated",
        value: ch.ghost_anatomy,
      });
    }
    if ((ch.horizontal_shear ?? 0) > thresholds.maxHorizontalShear) {
      findings.push({
        defect: "horizontal_shearing",
        frameIndex: i,
        severity: "P0",
        detail: "horizontal shear channel elevated",
        value: ch.horizontal_shear,
      });
    }
    if ((ch.dual_silhouette ?? 0) > thresholds.maxDualSilhouette) {
      findings.push({
        defect: "stale_duplicate_silhouette",
        frameIndex: i,
        severity: "P0",
        detail: "dual silhouette channel elevated",
        value: ch.dual_silhouette,
      });
    }
    if (i > 0) {
      const prev = frames[i - 1]!;
      let maxDelta = 0;
      for (const k of Object.keys(ch)) {
        const d = Math.abs((ch[k] ?? 0) - (prev.channels[k] ?? 0));
        if (d > maxDelta) maxDelta = d;
      }
      if (maxDelta > thresholds.maxTeleportDelta && !f.interruptEdge) {
        findings.push({
          defect: "teleporting",
          frameIndex: i,
          severity: "P0",
          detail: `teleport delta ${maxDelta.toFixed(4)}`,
          value: maxDelta,
        });
      }
    }
    // Topology lock stability = anti-ghosting for continuity topology
    if (!f.topology.topologyStable) {
      findings.push({
        defect: "topology_ghosting",
        frameIndex: i,
        severity: "P0",
        detail: "topologyStable=false",
      });
    }
  }

  // Derivative spikes
  const dt =
    frames.length >= 2
      ? Math.max(1e-6, (frames[1]!.t - frames[0]!.t) || 1 / 60)
      : 1 / 60;
  for (const key of ["overall_height", "overall_width", "energy_level", "eye_openness"]) {
    const series = frames.map((f) => f.channels[key] ?? 0);
    const { jerk } = finiteDifferences(series, dt);
    const mj = maxAbs(jerk);
    if (mj > thresholds.maxJerk) {
      findings.push({
        defect: "derivative_spike",
        frameIndex: 0,
        severity: "P1",
        detail: `jerk spike on ${key}: ${mj.toFixed(1)}`,
        value: mj,
      });
    }
  }

  return findings;
}

/** True when no P0/P1 findings. */
export function isEmbodimentSequenceClean(
  findings: readonly EmbodimentDefectFinding[],
): boolean {
  return findings.length === 0;
}

/**
 * Synthetic defect injectors for negative tests — prove detectors fire.
 * Not used on the living path.
 */
export function injectDefectForTest(
  frames: MorphologyFrame[],
  defect:
    | "volume_collapse"
    | "axial_needle"
    | "teleporting"
    | "feature_piercing"
    | "duplicate_contour_authority"
    | "derivative_spike"
    | "topology_ghosting"
    | "transparent_ghost_anatomy"
    | "horizontal_shearing"
    | "stale_duplicate_silhouette"
    | "snap_reconstruction"
    | "dragged_facial_features",
): MorphologyFrame[] {
  if (frames.length === 0) return frames;
  const out = frames.map((f) => ({
    ...f,
    channels: { ...f.channels },
    specialty: { ...f.specialty },
    ownership: { ...f.ownership },
    features: {
      eyes: { ...f.features.eyes },
      mouth: { ...f.features.mouth },
      face: { ...f.features.face },
    },
    com: { ...f.com },
  }));
  const mid = Math.floor(out.length / 2);
  const f = out[mid]!;
  switch (defect) {
    case "volume_collapse":
      f.channels.overall_width = 0.3;
      f.channels.overall_height = 0.3;
      f.volume = 0.09;
      break;
    case "axial_needle":
      f.specialty.axialNeedle = 0.8;
      f.channels.axial_needle = 0.8;
      break;
    case "teleporting":
      if (mid > 0) {
        f.channels.overall_height = (out[mid - 1]!.channels.overall_height ?? 1) + 0.9;
        f.channels.energy_level = 1;
      }
      break;
    case "feature_piercing":
      f.specialty.singularityMix = 0.9;
      f.channels.eye_openness = 0.7;
      f.channels.mouth_openness = 0.5;
      f.channels.face_emissive = 0.5;
      f.features.face.dissolve = 0;
      f.features.face.migrate = 0;
      f.features.face.reconstitute = 0;
      f.features.eyes.dissolve = 0;
      break;
    case "duplicate_contour_authority":
      f.ownership.contour = "none";
      f.ownership.accretion = "singularity_well";
      f.ownership.wake_tail = "comet_drive";
      break;
    case "derivative_spike":
      // Create a spike by alternating a channel wildly
      for (let i = 1; i < out.length; i++) {
        out[i]!.channels.overall_height = i % 2 === 0 ? 1.2 : 0.85;
      }
      break;
    case "topology_ghosting":
      f.ownership.accretion = "singularity_well";
      f.specialty.singularityMix = 0;
      f.channels.singularity_mix = 0;
      break;
    case "transparent_ghost_anatomy":
      f.specialty.ghostAnatomy = 0.5;
      f.channels.ghost_anatomy = 0.5;
      f.specialty.singularityMix = 0.8;
      f.channels.eye_openness = 0.6;
      f.channels.mouth_openness = 0.4;
      f.channels.face_emissive = 0.5;
      f.features.face.dissolve = 0;
      f.features.face.migrate = 0;
      f.features.face.reconstitute = 0;
      f.features.eyes.dissolve = 0;
      break;
    case "horizontal_shearing":
      f.specialty.horizontalShear = 0.4;
      f.channels.horizontal_shear = 0.4;
      // Also structural uncompensated width for detector path
      if (mid > 0) {
        f.specialty.cometMix = 0.8;
        f.channels.overall_width = (out[mid - 1]!.channels.overall_width ?? 1) + 0.12;
        f.channels.overall_height = out[mid - 1]!.channels.overall_height ?? 1;
      }
      break;
    case "stale_duplicate_silhouette":
      f.specialty.dualSilhouette = 0.5;
      f.channels.dual_silhouette = 0.5;
      break;
    case "snap_reconstruction":
      // Force reconstitute after dissolve without migrate on the entire sequence
      for (let i = 0; i < out.length; i++) {
        out[i]!.features.eyes = {
          phase: "dissolve",
          dissolve: 0.9,
          migrate: 0,
          reconstitute: 0,
        };
        out[i]!.features.mouth = {
          phase: "dissolve",
          dissolve: 0.9,
          migrate: 0,
          reconstitute: 0,
        };
        out[i]!.features.face = {
          phase: "dissolve",
          dissolve: 0.9,
          migrate: 0,
          reconstitute: 0,
        };
      }
      f.features.eyes = {
        phase: "reconstitute",
        dissolve: 0,
        migrate: 0,
        reconstitute: 0.95,
      };
      f.features.mouth = {
        phase: "reconstitute",
        dissolve: 0,
        migrate: 0,
        reconstitute: 0.95,
      };
      f.features.face = {
        phase: "reconstitute",
        dissolve: 0,
        migrate: 0,
        reconstitute: 0.95,
      };
      break;
    case "dragged_facial_features":
      if (mid > 0) {
        const prev = out[mid - 1]!;
        f.features.face = {
          phase: "hold",
          dissolve: 0,
          migrate: 0,
          reconstitute: 0,
        };
        f.features.eyes = {
          phase: "hold",
          dissolve: 0,
          migrate: 0,
          reconstitute: 0,
        };
        f.channels.overall_width = (prev.channels.overall_width ?? 1) + 0.1;
        f.channels.gaze = (prev.channels.gaze ?? 0) + 0.25;
        f.channels.eye_openness = (prev.channels.eye_openness ?? 0.5) + 0.2;
      }
      break;
  }
  return out;
}
