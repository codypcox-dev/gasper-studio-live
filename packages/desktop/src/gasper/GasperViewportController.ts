/**
 * Stage camera only — does not alter Gasper authored morphology.
 * Book 005 §15.2: 100% = world scale 1.0; Fit = calculated from live safe-fit;
 * zoom range 25–400%; Auto Fit optional; pan/zoom disables Auto Fit.
 *
 * GASPER-CRAFT-002 · S3 (D-0099 Doctrine 1) — CAMERA FIXITY. The viewport IS
 * the monitor: during a performance the machine never touches zoom/pan (the
 * retired C2 shot-direction zoom framing and the Phase A world-follow are
 * gone). All shot scale comes from Gasper's authored position + depth inside
 * content space (the S2 projection law). The performance camera lock freezes
 * the framing — including Auto Fit — for the duration, and restores it on
 * release unless the user took over. The Book 005 §15.2 user dial (25–400%,
 * wheel/pan/Fit/reset) is untouched and outranks the machine at all times
 * (ownership rule, D-0089 idiom).
 */

import type { Rect } from "./GasperVisualBounds";
import {
  fitCameraFromSafeBounds,
  visualFullyVisible,
  CONTENT_VIEWBOX,
} from "./GasperVisualBounds";

/** World-to-screen scale where 1.0 === 100% display. */
export const WORLD_SCALE_100 = 1;

/**
 * Isolated-proof / first-run cinematic framing.
 * Home silhouette is 153 px at 100%. Zoom 2 (= φ + φ⁻²) reads ~306 px on a
 * 900 px stage — 34% of viewport height (inside the 25–40% brief).
 * Locked: never glued to COM. Travel reads as travel.
 */
export const CINEMATIC_ZOOM = 2;
export const CINEMATIC_PAN_Y = -40;

/** Book 005 §15.2: 25%–400% — the user dial. The ONLY zoom fence now. */
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;

export type ViewportState = {
  /** World-to-screen scale (1 = 100%). */
  zoom: number;
  panX: number;
  panY: number;
  /** Auto-fit on embodiment switch / resize when true. */
  autoFit: boolean;
  /** Last Fit percentage (may differ from zoom*100 if not at fit). */
  lastFitPercent: number | null;
  /** True when visual bounds are clipped at current camera. */
  clipped: boolean;
  /** True after an explicit user camera action (Fit / zoom / pan / 100 / reset). */
  userCameraOwned: boolean;
  /** Fixed production-monitor calibration derived from live bounds before performance. */
  productionCamera: Readonly<{
    calibrated: boolean;
    zoom: number;
    panX: number;
    panY: number;
    fitPercent: number;
  }>;
  /** GASPER-CRAFT-002 · S3: camera frozen for a performance (Doctrine 1). */
  performanceCameraLocked: boolean;
  /** Isolated-proof cinematic lock; pack/pose cycle must not release it. */
  cinematicLocked: boolean;
  /** Sticky user-owned fixed world frame. First hold wins; machine paths cannot steal. */
  userWorldFrameHeld: boolean;
};

export class GasperViewportController {
  /** World scale: WORLD_SCALE_100 === 100%. */
  zoom = WORLD_SCALE_100;
  panX = 0;
  panY = 0;
  autoFit = true;
  lastFitPercent: number | null = null;
  clipped = false;
  /** GASPER-CRAFT-002 · S3: camera frozen for a performance (Doctrine 1). */
  performanceCameraLocked = false;
  private minZoom = ZOOM_MIN;
  private maxZoom = ZOOM_MAX;
  private listeners = new Set<() => void>();
  private stageW = 800;
  private stageH = 600;
  // Performance camera lock state (S3). The baseline is the framing the
  // performance began under; it is restored on release unless the user
  // took over (an explicit dial choice is never overwritten).
  private pcBaseZoom = WORLD_SCALE_100;
  private pcBasePanX = 0;
  private pcBasePanY = 0;
  private pcUserOverride = false;
  // Isolated-proof cinematic lock. The pack/pose performance cycle must
  // not release this and re-apply the 226% Auto Fit production camera.
  private cinematicLocked = false;
  // ONE camera authority: a user-owned fixed world frame. First hold wins.
  private userWorldFrameHeld = false;
  // GASPER-COMPOSITION-001: automatic editor fitting is not a production-
  // camera decision. The product monitor owns a separate calibration derived
  // from the same live bounds at the canonical character-fit target.
  private userCameraOwned = false;
  private productionCameraCalibrated = false;
  private productionCameraZoom = WORLD_SCALE_100;
  private productionCameraPanX = 0;
  private productionCameraPanY = 0;
  private productionCameraFitPercent = 100;

  /**
   * Lock a cinematic stage camera: 200%, slight lift so the floor reads,
   * Auto Fit off, no COM follow. Idempotent on the cinematic framing
   * (re-bases if an earlier 100% performance lock is already held).
   */
  lockCinematicCamera() {
    // Merged into holdUserWorldFrame. A second zoom-2 authority must not exist
    // and must not steal a frame that is already held.
    if (this.userWorldFrameHeld) return;
    this.holdUserWorldFrame();
  }

  isCinematicCamera(): boolean {
    return this.cinematicLocked || this.userWorldFrameHeld;
  }

  isUserWorldFrameHeld(): boolean {
    return this.userWorldFrameHeld;
  }

  /** Explicit release only. reset / Fit / production lock must not clear a hold. */
  releaseUserWorldFrame() {
    if (!this.userWorldFrameHeld) return;
    this.userWorldFrameHeld = false;
    this.cinematicLocked = false;
    this.emit();
  }

  /**
   * Isolated-proof 100% world frame. reset() first so the user owns the
   * camera; this then freezes that frame. Pack/pose must not release it.
   * Does not follow COM. Does not zoom 2.
   */
  holdUserWorldFrame(frame?: { zoom?: number; panX?: number; panY?: number }) {
    if (this.userWorldFrameHeld) return;
    this.userWorldFrameHeld = true;
    this.noteUserCameraTakeover();
    // Default is the livewalk 100% hold. An explicit frame freezes a
    // one-time user-owned medium shot on a FIXED world point — never COM follow.
    if (frame && Number.isFinite(frame.zoom) && Number(frame.zoom) > 0) {
      this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, Number(frame.zoom)));
      if (Number.isFinite(frame.panX)) this.panX = Number(frame.panX);
      if (Number.isFinite(frame.panY)) this.panY = Number(frame.panY);
      this.lastFitPercent = Math.round(this.zoom * 100);
    } else {
      this.zoom = WORLD_SCALE_100;
      this.panX = 0;
      this.panY = 0;
      this.lastFitPercent = 100;
    }
    this.clipped = false;
    this.autoFit = false;
    this.performanceCameraLocked = true;
    this.cinematicLocked = true;
    this.pcBaseZoom = this.zoom;
    this.pcBasePanX = this.panX;
    this.pcBasePanY = this.panY;
    this.pcUserOverride = true;
    this.emit();
  }

  /**
   * GASPER-CRAFT-002 · S3 (D-0099 Doctrine 1) — lock the camera for a
   * performance. While a pack performs (or any provenanced world pose is in
   * flight) the machine never touches zoom/pan: Auto Fit is suspended so
   * bounds-driven fits cannot swim the frame, and every machine framing path
   * is inert. Idempotent while locked (the baseline is captured once).
   * The user dial keeps working — wheel/pan/Fit outrank the lock.
   */
  lockPerformanceCamera() {
    if (this.cinematicLocked || this.userWorldFrameHeld) return;
    if (this.performanceCameraLocked) return;
    // Automatic authoring Fit is not a camera choice. If the user has not
    // explicitly taken camera ownership, enter performance on the separately
    // calibrated fixed monitor camera. World-100 remains the fail-closed
    // fallback until live bounds have produced a valid calibration.
    if (!this.userCameraOwned) {
      this.zoom = this.productionCameraCalibrated
        ? this.productionCameraZoom
        : WORLD_SCALE_100;
      this.panX = this.productionCameraCalibrated ? this.productionCameraPanX : 0;
      this.panY = this.productionCameraCalibrated ? this.productionCameraPanY : 0;
      this.lastFitPercent = this.productionCameraCalibrated
        ? this.productionCameraFitPercent
        : 100;
      this.clipped = false;
    }
    this.performanceCameraLocked = true;
    this.pcBaseZoom = this.zoom;
    this.pcBasePanX = this.panX;
    this.pcBasePanY = this.panY;
    this.pcUserOverride = false;
    this.autoFit = false;
    this.emit();
  }

  /** True while the camera is locked for a performance. */
  isPerformanceCameraLocked(): boolean {
    return this.performanceCameraLocked;
  }

  /**
   * Release the performance lock. The pre-performance framing is restored
   * unless the user took over during the performance (Doctrine 1 says no
   * machine path may move the camera; a difference without a user takeover
   * means a legacy path leaked, and the baseline is the truth). autoFit
   * stays off so the landing never snap-fits — user Fit or the stage's
   * loop-camera safety owns subsequent framing. Idempotent.
   */
  releasePerformanceCamera() {
    if (this.cinematicLocked || this.userWorldFrameHeld) return;
    if (!this.performanceCameraLocked) return;
    this.performanceCameraLocked = false;
    if (!this.pcUserOverride) {
      const moved =
        Math.abs(this.zoom - this.pcBaseZoom) > 1e-9 ||
        Math.abs(this.panX - this.pcBasePanX) > 1e-6 ||
        Math.abs(this.panY - this.pcBasePanY) > 1e-6;
      if (moved) {
        this.zoom = this.pcBaseZoom;
        this.panX = this.pcBasePanX;
        this.panY = this.pcBasePanY;
      }
    }
    this.emit();
  }

  /**
   * Ownership rule (D-0089 idiom): any USER framing takeover under a
   * performance lock is final — the release-restore must not overwrite an
   * explicit dial choice.
   */
  private noteUserCameraTakeover() {
    this.userCameraOwned = true;
    if (this.performanceCameraLocked) this.pcUserOverride = true;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  setStageSize(w: number, h: number) {
    this.stageW = w;
    this.stageH = h;
  }

  getStageSize() {
    return { width: this.stageW, height: this.stageH };
  }

  getState(): ViewportState {
    return {
      zoom: this.zoom,
      panX: this.panX,
      panY: this.panY,
      autoFit: this.autoFit,
      lastFitPercent: this.lastFitPercent,
      clipped: this.clipped,
      userCameraOwned: this.userCameraOwned,
      cinematicLocked: this.cinematicLocked,
      userWorldFrameHeld: this.userWorldFrameHeld,
      productionCamera: {
        calibrated: this.productionCameraCalibrated,
        zoom: this.productionCameraZoom,
        panX: this.productionCameraPanX,
        panY: this.productionCameraPanY,
        fitPercent: this.productionCameraFitPercent,
      },
      performanceCameraLocked: this.performanceCameraLocked,
    };
  }

  /**
   * Display zoom percent — never falsify the number.
   * When clipped, UI must show e.g. "100% · clipped", not change 100 → 99.
   */
  displayZoomPercent(): number {
    return Math.round(this.zoom * 100);
  }

  /** Suffix for HUD when visual bounds exceed the safe frame. */
  clippedHudSuffix(): string {
    return this.clipped ? " · clipped" : "";
  }

  /** True when zoom is exactly world 100% (not merely a Fit that landed near 100). */
  isWorldScale100(): boolean {
    return Math.abs(this.zoom - WORLD_SCALE_100) < 1e-6;
  }

  /** World 100% scale (zoom = 1), independent of Fit. Disables Auto Fit. */
  setWorldScale100() {
    if (this.cinematicLocked || this.userWorldFrameHeld) return;
    this.noteUserCameraTakeover();
    this.zoom = WORLD_SCALE_100;
    this.autoFit = false;
    this.emit();
  }

  setAutoFit(enabled: boolean) {
    if ((this.cinematicLocked || this.userWorldFrameHeld) && enabled) return;
    this.autoFit = enabled;
    this.emit();
  }

  /** Wheel zoom toward pointer — disables Auto Fit. Clamped 25–400%. */
  zoomAt(clientX: number, clientY: number, deltaY: number, stageRect: DOMRect) {
    this.noteUserCameraTakeover();
    this.autoFit = false;
    const prev = this.zoom;
    const factor = deltaY > 0 ? 0.92 : 1.08;
    const next = Math.min(this.maxZoom, Math.max(this.minZoom, prev * factor));
    if (next === prev) return;
    const lx = clientX - stageRect.left - stageRect.width / 2;
    const ly = clientY - stageRect.top - stageRect.height / 2;
    const wx = (lx - this.panX) / prev;
    const wy = (ly - this.panY) / prev;
    this.zoom = next;
    this.panX = lx - wx * next;
    this.panY = ly - wy * next;
    this.emit();
  }

  /** Pan — disables Auto Fit. */
  panBy(dx: number, dy: number) {
    if (dx === 0 && dy === 0) return;
    this.noteUserCameraTakeover();
    this.autoFit = false;
    this.panX += dx;
    this.panY += dy;
    this.emit();
  }

  /**
   * Apply a computed fit camera (the Fit path). Under a performance lock
   * this is a user takeover — Fit is a dial action, and the release-restore
   * must not overwrite it.
   */
  applyFitCamera(zoom: number, panX: number, panY: number, fitPercent: number) {
    if (this.userWorldFrameHeld || this.cinematicLocked) return;
    this.noteUserCameraTakeover();
    this.zoom = zoom;
    this.panX = panX;
    this.panY = panY;
    this.lastFitPercent = fitPercent;
    this.clipped = false;
    this.emit();
  }

  /**
   * Store the fixed production-monitor calibration. This is metadata only:
   * it never moves the editor camera and never mutates an active performance.
   */
  setProductionCameraCalibration(
    zoom: number,
    panX: number,
    panY: number,
    fitPercent: number,
  ) {
    if (this.performanceCameraLocked || this.userWorldFrameHeld || this.cinematicLocked) return;
    if (![zoom, panX, panY, fitPercent].every(Number.isFinite) || zoom <= 0) return;
    this.productionCameraCalibrated = true;
    this.productionCameraZoom = Math.min(this.maxZoom, Math.max(this.minZoom, zoom));
    this.productionCameraPanX = panX;
    this.productionCameraPanY = panY;
    this.productionCameraFitPercent = Math.round(this.productionCameraZoom * 100);
  }

  /** Machine/editor Fit: never acquires user camera ownership. */
  applyAutomaticFitCamera(
    zoom: number,
    panX: number,
    panY: number,
    fitPercent: number,
  ) {
    if (this.performanceCameraLocked || this.cinematicLocked || this.userWorldFrameHeld) return;
    this.zoom = zoom;
    this.panX = panX;
    this.panY = panY;
    this.lastFitPercent = fitPercent;
    this.clipped = false;
    this.emit();
  }

  /**
   * GASPER-NORTHSTAR-001 — apply the STORED production-monitor calibration to
   * the camera (the monitor IS the camera). Used by the render-only surface so
   * it opens at the calibrated framing instead of an arbitrary editor fit, and
   * reframes deliberately per embodiment — never by chasing the body. No-op
   * while a performance lock holds (the doctrine freeze) and never acquires
   * user camera ownership; the user dial outranks it.
   */
  applyProductionCameraCalibration() {
    if (this.performanceCameraLocked || this.userWorldFrameHeld) return;
    if (this.userCameraOwned) return;
    if (!this.productionCameraCalibrated) return;
    this.zoom = this.productionCameraZoom;
    this.panX = this.productionCameraPanX;
    this.panY = this.productionCameraPanY;
    this.lastFitPercent = this.productionCameraFitPercent;
    this.clipped = false;
    this.emit();
  }

  /**
   * @deprecated Prefer fitToSafeBounds from live visual-bounds service.
   */
  fit(stageW: number, stageH: number, contentW = 240, contentH = 220, occupy = 0.55) {
    this.setStageSize(stageW, stageH);
    const safe: Rect = {
      x: (CONTENT_VIEWBOX.width - contentW) / 2,
      y: (CONTENT_VIEWBOX.height - contentH) / 2,
      width: contentW,
      height: contentH,
    };
    const pad = (1 - occupy) * 0.5;
    const expanded = {
      x: safe.x - safe.width * pad,
      y: safe.y - safe.height * pad,
      width: safe.width * (1 + 2 * pad),
      height: safe.height * (1 + 2 * pad),
    };
    this.fitToSafeBounds(stageW, stageH, expanded);
  }

  /** Fit using live safe-fit bounds (authoritative). Re-enables Auto Fit. */
  fitToSafeBounds(stageW: number, stageH: number, safe: Rect) {
    if (this.userWorldFrameHeld) return;
    this.noteUserCameraTakeover();
    this.setStageSize(stageW, stageH);
    const cam = fitCameraFromSafeBounds(stageW, stageH, safe, {
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
    });
    this.zoom = cam.zoom;
    this.panX = cam.panX;
    this.panY = cam.panY;
    this.lastFitPercent = cam.fitPercent;
    this.autoFit = true;
    this.clipped = false;
    this.emit();
  }


  /** Machine/editor counterpart of fitToSafeBounds; never becomes camera ownership. */
  fitToSafeBoundsAutomatic(stageW: number, stageH: number, safe: Rect) {
    if (this.performanceCameraLocked || this.userWorldFrameHeld) return;
    this.setStageSize(stageW, stageH);
    const cam = fitCameraFromSafeBounds(stageW, stageH, safe, {
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
    });
    this.applyAutomaticFitCamera(cam.zoom, cam.panX, cam.panY, cam.fitPercent);
    this.autoFit = true;
  }
  /**
   * Wave R5 Fit intents. Character Fit frames mass geometry (not effects envelope).
   */
  fitIntent:
    | "character"
    | "character-handles"
    | "effects"
    | "selection"
    | "world-100" = "character";

  setFitIntent(
    intent:
      | "character"
      | "character-handles"
      | "effects"
      | "selection"
      | "world-100",
  ) {
    this.fitIntent = intent;
    this.emit();
  }

  /**
   * Apply a non-interactive safety margin to an existing fitted camera.
   * Unlike wheel zoom, this preserves Auto Fit ownership and pan centering.
   * Doctrine 1: this is a MACHINE framing move — forbidden while the
   * performance camera lock holds.
   */
  applyFitSafetyScale(factor: number) {
    if (this.performanceCameraLocked || this.userWorldFrameHeld || this.cinematicLocked) return;
    if (!Number.isFinite(factor) || factor <= 0) return;
    this.zoom = Math.min(
      this.maxZoom,
      Math.max(this.minZoom, this.zoom * factor),
    );
    this.lastFitPercent = Math.round(this.zoom * 100);
    this.emit();
  }

  /** Update clipped flag from current visual bounds. */
  updateClipped(visual: Rect | null) {
    if (!visual) {
      this.clipped = false;
      return;
    }
    this.clipped = !visualFullyVisible(
      this.stageW,
      this.stageH,
      visual,
      this.zoom,
      this.panX,
      this.panY,
    );
    this.emit();
  }

  /**
   * Reset camera: world 100%, pan 0, Auto Fit off.
   * Prefer Fit (forceFit) for embodiment-aware framing.
   */
  reset() {
    if (this.userWorldFrameHeld) return;
    this.noteUserCameraTakeover();
    this.cinematicLocked = false;
    this.zoom = WORLD_SCALE_100;
    this.panX = 0;
    this.panY = 0;
    this.lastFitPercent = 100;
    this.clipped = false;
    this.autoFit = false;
    this.emit();
  }

  contentTransform(): string {
    return `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }
}
