/**
 * Real Compare mode: baseline vs current binding maps + dual-state silhouettes.
 */

import {
  computeBoundsSnapshot,
  type BoundsInput,
  type BoundsSnapshot,
  type Rect,
} from "./GasperVisualBounds";

export type CompareDelta = {
  bindingId: string;
  baseline: number;
  current: number;
  delta: number;
};

export type CompareReport = {
  active: boolean;
  baselineLabel: string;
  currentLabel: string;
  changedCount: number;
  deltas: CompareDelta[];
  selectedDelta: CompareDelta | null;
};

export type CompareRenderMode = "ghost" | "split" | "contour";

export type CompareSilhouettes = {
  baseline: BoundsSnapshot;
  current: BoundsSnapshot;
  baselineGeometry: Rect;
  currentGeometry: Rect;
  baselineVisual: Rect;
  currentVisual: Rect;
};

/** Map serialized bindings → BoundsInput for dual-state silhouette math. */
export function boundsInputFromBindings(
  embodimentId: string,
  values: Record<string, number>,
  extra?: Partial<BoundsInput>,
): BoundsInput {
  return {
    embodimentId,
    formWidth: values.overall_width ?? 1,
    formHeight: values.overall_height ?? 1,
    crownHeight: values.crown_height ?? 0,
    lowerBodyFullness: values.lower_body_fullness ?? 1,
    groundFlattening: values.ground_flattening ?? 0,
    energyLevel: values.energy_level ?? 0.5,
    reliefAmplitude: values.relief_amplitude ?? 0.4,
    outerRadius: values.singularity_outer_radius ?? 1,
    verticalCompression: values.singularity_vertical_compression ?? 0,
    spectralEnergy: values.spectral_energy_envelope ?? 0.5,
    orbitalPlaneScale: values.orbital_plane_scale ?? 1,
    horizonRadius: values.horizon_radius ?? 0.5,
    shellThickness: values.shell_thickness ?? 0.4,
    centerOfMassY: values.center_of_mass_y ?? 0,
    horizonVerticalPosition: values.horizon_vertical_position ?? 0,
    ...extra,
  };
}

/**
 * Dual-state silhouettes: baseline snapshot vs current live bindings.
 * Same computeBoundsSnapshot path as Fit — not a freehand CSS ellipse.
 */
export function computeCompareSilhouettes(
  embodimentId: string,
  baseline: Record<string, number>,
  current: Record<string, number>,
): CompareSilhouettes {
  const baseSnap = computeBoundsSnapshot(
    boundsInputFromBindings(embodimentId, baseline),
  );
  const curSnap = computeBoundsSnapshot(
    boundsInputFromBindings(embodimentId, current),
  );
  return {
    baseline: baseSnap,
    current: curSnap,
    baselineGeometry: baseSnap.geometry,
    currentGeometry: curSnap.geometry,
    baselineVisual: baseSnap.visual,
    currentVisual: curSnap.visual,
  };
}

export function computeCompareReport(
  baseline: Record<string, number> | null,
  current: Record<string, number>,
  selectedBindingId: string | null,
  opts?: { baselineLabel?: string; currentLabel?: string },
): CompareReport {
  if (!baseline) {
    return {
      active: false,
      baselineLabel: opts?.baselineLabel ?? "Baseline",
      currentLabel: opts?.currentLabel ?? "Current",
      changedCount: 0,
      deltas: [],
      selectedDelta: null,
    };
  }
  const keys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  const deltas: CompareDelta[] = [];
  for (const id of keys) {
    const b = baseline[id];
    const c = current[id];
    if (b === undefined || c === undefined) continue;
    if (Math.abs(b - c) > 1e-4) {
      deltas.push({ bindingId: id, baseline: b, current: c, delta: c - b });
    }
  }
  deltas.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const selectedDelta =
    (selectedBindingId &&
      deltas.find((d) => d.bindingId === selectedBindingId)) ||
    deltas[0] ||
    null;
  return {
    active: true,
    baselineLabel: opts?.baselineLabel ?? "Baseline",
    currentLabel: opts?.currentLabel ?? "Current",
    changedCount: deltas.length,
    deltas,
    selectedDelta,
  };
}

/** Ellipse path for a content-space rect (authored contour outline). */
export function rectToEllipsePath(r: Rect): string {
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const rx = r.width / 2;
  const ry = r.height / 2;
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy}`;
}

/**
 * Stage Compare surface state driven by selection + live bindings.
 * GasperDaisStage and tests share this — real mode API, not source greps.
 */
export type CompareSurfaceState = {
  active: boolean;
  renderMode: CompareRenderMode;
  report: CompareReport;
  silhouettes: CompareSilhouettes | null;
  /** Which surfaces should be in the DOM when active. */
  surfaces: {
    ghost: boolean;
    wipe: boolean;
    contour: boolean;
    baselineLabel: string;
    currentLabel: string;
    changedCount: number;
    selectedDelta: CompareDelta | null;
  };
};

export function buildCompareSurfaceState(input: {
  stageMode: string;
  baseline: Record<string, number> | null;
  current: Record<string, number>;
  embodimentId: string;
  selectedBindingId: string | null;
  renderMode: CompareRenderMode;
}): CompareSurfaceState {
  const report = computeCompareReport(
    input.baseline,
    input.current,
    input.selectedBindingId,
  );
  const active = input.stageMode === "COMPARE" && !!input.baseline;
  const silhouettes =
    active && input.baseline
      ? computeCompareSilhouettes(
          input.embodimentId,
          input.baseline,
          input.current,
        )
      : null;
  const mode = input.renderMode;
  return {
    active,
    renderMode: mode,
    report: active
      ? report
      : { ...report, active: false, changedCount: 0, deltas: [], selectedDelta: null },
    silhouettes,
    surfaces: {
      ghost: active && (mode === "ghost" || mode === "split"),
      wipe: active && mode === "split",
      contour: active && (mode === "contour" || mode === "ghost"),
      baselineLabel: report.baselineLabel,
      currentLabel: report.currentLabel,
      changedCount: active ? report.changedCount : 0,
      selectedDelta: active ? report.selectedDelta : null,
    },
  };
}
