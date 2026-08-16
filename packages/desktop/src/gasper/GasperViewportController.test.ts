/**
 * GASPER-CRAFT-002 · S3 — GasperViewportController camera-fixity tests.
 *
 * Doctrine 1 (D-0099): the viewport IS the monitor. During a performance the
 * machine never touches zoom/pan — the lock freezes the framing (Auto Fit
 * included), restores it on release, and any USER takeover (the Book 005
 * §15.2 dial is untouched) is final. Machine framing paths are inert under
 * the lock.
 */
import { describe, expect, it } from "vitest";
import {
  GasperViewportController,
} from "./GasperViewportController";

const rect = { left: 0, top: 0, width: 400, height: 300 } as DOMRect;

describe("performance camera lock (Doctrine 1)", () => {
  it("lock captures the baseline, suspends Auto Fit, reports state", () => {
    const vp = new GasperViewportController();
    vp.applyFitCamera(1.4, 12, -8, 140);
    vp.lockPerformanceCamera();
    const s = vp.getState();
    expect(s.performanceCameraLocked).toBe(true);
    expect(vp.isPerformanceCameraLocked()).toBe(true);
    expect(vp.autoFit).toBe(false);
    expect(s.zoom).toBe(1.4);
    expect(s.panX).toBe(12);
    expect(s.panY).toBe(-8);
  });

  it("lock is idempotent — the baseline is captured once", () => {
    const vp = new GasperViewportController();
    vp.applyFitCamera(1.2, 0, 0, 120);
    vp.lockPerformanceCamera();
    vp.zoom = 1.6; // mid-performance
    vp.lockPerformanceCamera();
    // release restores the FIRST baseline, not the re-lock framing
    vp.releasePerformanceCamera();
    expect(vp.zoom).toBe(1.2);
  });

  it("release restores the baseline when nothing moved (no-op restore)", () => {
    const vp = new GasperViewportController();
    vp.applyFitCamera(1.3, 4, 0, 130);
    vp.lockPerformanceCamera();
    vp.releasePerformanceCamera();
    expect(vp.isPerformanceCameraLocked()).toBe(false);
    expect(vp.zoom).toBe(1.3);
    expect(vp.panX).toBe(4);
    vp.releasePerformanceCamera(); // idempotent, no throw
  });

  it("release restores the baseline if a legacy path leaked camera motion", () => {
    const vp = new GasperViewportController();
    vp.applyFitCamera(1.1, 0, 6, 110);
    vp.lockPerformanceCamera();
    // Simulate a machine path moving the camera mid-performance (a Doctrine
    // 1 violation) — the release-restore defends the pre-performance framing.
    vp.zoom = 2.2;
    vp.panY = 40;
    vp.releasePerformanceCamera();
    expect(vp.zoom).toBe(1.1);
    expect(vp.panY).toBe(6);
  });

  it("release keeps the user's camera after a takeover (never overwritten)", () => {
    const vp = new GasperViewportController();
    vp.applyFitCamera(1.1, 0, 0, 110);
    vp.lockPerformanceCamera();
    vp.zoomAt(200, 150, -100, rect); // the user zooms mid-performance
    const userZoom = vp.zoom;
    expect(userZoom).not.toBe(1.1);
    vp.releasePerformanceCamera();
    expect(vp.zoom).toBe(userZoom); // the dial choice is final
  });

  it("user wheel zoom + pan work under the lock (the dial is untouched)", () => {
    const vp = new GasperViewportController();
    vp.lockPerformanceCamera();
    const z0 = vp.zoom;
    vp.zoomAt(200, 150, -100, rect);
    expect(vp.zoom).toBeGreaterThan(z0); // zoom-in
    vp.panBy(15, -9);
    expect(vp.panX).toBe(15);
    expect(vp.panY).toBe(-9);
    expect(vp.isPerformanceCameraLocked()).toBe(true); // lock survives user moves
  });

  it("Fit, world-100 and reset under the lock are user takeovers", () => {
    const make = () => {
      const v = new GasperViewportController();
      v.applyFitCamera(1.7, 0, 0, 170);
      v.lockPerformanceCamera();
      return v;
    };
    const a = make();
    a.fitToSafeBounds(800, 600, { x: 0, y: 0, width: 240, height: 220 });
    const az = a.zoom;
    a.releasePerformanceCamera();
    expect(a.zoom).toBe(az); // not restored over the Fit
    const b = make();
    b.setWorldScale100();
    b.releasePerformanceCamera();
    expect(b.zoom).toBe(1); // the user's 100% stands
    const c = make();
    c.reset();
    c.releasePerformanceCamera();
    expect(c.zoom).toBe(1);
    expect(c.panX).toBe(0);
  });

  it("applyFitCamera (the Fit path) marks a takeover under the lock", () => {
    const vp = new GasperViewportController();
    vp.applyFitCamera(1.5, 0, 0, 150);
    vp.lockPerformanceCamera();
    vp.applyFitCamera(2.1, 3, -4, 88);
    vp.releasePerformanceCamera();
    expect(vp.zoom).toBe(2.1); // user Fit survives the release
    expect(vp.panX).toBe(3);
  });

  it("applyFitSafetyScale is inert under the lock (machine framing forbidden)", () => {
    const vp = new GasperViewportController();
    vp.applyFitCamera(1.5, 0, 0, 150);
    vp.lockPerformanceCamera();
    vp.applyFitSafetyScale(0.82);
    expect(vp.zoom).toBe(1.5); // untouched — Doctrine 1
    vp.releasePerformanceCamera();
    vp.applyFitSafetyScale(0.5); // outside a lock it still works
    expect(vp.zoom).toBeCloseTo(0.75, 9);
  });

  it("lock emits once; release emits once", () => {
    const vp = new GasperViewportController();
    let emits = 0;
    vp.subscribe(() => {
      emits += 1;
    });
    vp.lockPerformanceCamera();
    expect(emits).toBe(1);
    vp.lockPerformanceCamera(); // idempotent — no emit
    expect(emits).toBe(1);
    vp.releasePerformanceCamera();
    expect(emits).toBe(2);
    vp.releasePerformanceCamera(); // idempotent — no emit
    expect(emits).toBe(2);
  });

  it("automatic editor Fit does not acquire user camera ownership", () => {
    const vp = new GasperViewportController();
    vp.applyAutomaticFitCamera(3.21, 18, -7, 321);
    const state = vp.getState();
    expect(state.zoom).toBeCloseTo(3.21, 9);
    expect(state.userCameraOwned).toBe(false);
  });

  it("performance lock uses stored production calibration, not automatic editor Fit", () => {
    const vp = new GasperViewportController();
    vp.applyAutomaticFitCamera(3.21, 18, -7, 321);
    vp.setProductionCameraCalibration(2.25, -2, 1, 225);
    vp.setAutoFit(true);
    vp.lockPerformanceCamera();
    const state = vp.getState();
    expect(state.performanceCameraLocked).toBe(true);
    expect(state.userCameraOwned).toBe(false);
    expect(state.productionCamera.calibrated).toBe(true);
    expect(state.productionCamera.zoom).toBe(2.25);
    expect(state.zoom).toBe(2.25);
    expect(state.panX).toBe(-2);
    expect(state.panY).toBe(1);
    expect(state.lastFitPercent).toBe(225);
    expect(state.autoFit).toBe(false);
  });

  it("world-100 remains the fail-closed performance fallback before calibration", () => {
    const vp = new GasperViewportController();
    vp.applyAutomaticFitCamera(3.21, 18, -7, 321);
    vp.lockPerformanceCamera();
    const state = vp.getState();
    expect(state.productionCamera.calibrated).toBe(false);
    expect(state.zoom).toBe(1);
    expect(state.panX).toBe(0);
    expect(state.panY).toBe(0);
  });

  it("explicit user Fit remains the performance baseline", () => {
    const vp = new GasperViewportController();
    vp.applyFitCamera(1.65, 9, -3, 165);
    expect(vp.getState().userCameraOwned).toBe(true);
    vp.lockPerformanceCamera();
    expect(vp.zoom).toBe(1.65);
    expect(vp.panX).toBe(9);
    expect(vp.panY).toBe(-3);
  });

  it("production calibration is metadata-only and cannot move an active performance", () => {
    const vp = new GasperViewportController();
    vp.setProductionCameraCalibration(2.2, 3, 4, 220);
    expect(vp.zoom).toBe(1);
    vp.lockPerformanceCamera();
    expect(vp.zoom).toBe(2.2);
    vp.setProductionCameraCalibration(3.8, 80, 90, 380);
    expect(vp.zoom).toBe(2.2);
    expect(vp.getState().productionCamera.zoom).toBe(2.2);
  });

  it("automatic Fit is inert while performance camera is locked", () => {
    const vp = new GasperViewportController();
    vp.lockPerformanceCamera();
    vp.applyAutomaticFitCamera(3.5, 50, 50, 350);
    expect(vp.zoom).toBe(1);
    expect(vp.panX).toBe(0);
    expect(vp.panY).toBe(0);
  });

  it("state exposes no retired camera-authority fields", () => {
    const vp = new GasperViewportController();
    const s = vp.getState() as Record<string, unknown>;
    expect("worldFollowActive" in s).toBe(false);
    expect("shotDirectionActive" in s).toBe(false);
    expect("shotScale" in s).toBe(false);
  });

  // GASPER-NORTHSTAR-001 — the render-only surface applies the STORED
  // production calibration to the camera (the monitor IS the camera). It must
  // be inert while a performance lock holds, never acquire user ownership, and
  // never apply an editor fit.
  it("applyProductionCameraCalibration frames the monitor without user ownership", () => {
    const vp = new GasperViewportController();
    vp.setProductionCameraCalibration(2.25, -2, 1, 225);
    vp.applyProductionCameraCalibration();
    expect(vp.zoom).toBe(2.25);
    expect(vp.panX).toBe(-2);
    expect(vp.panY).toBe(1);
    expect(vp.getState().userCameraOwned).toBe(false);
  });

  it("applyProductionCameraCalibration is inert before calibration, under lock, and after a user takeover", () => {
    const vp = new GasperViewportController();
    // Before any calibration: fail-closed (no movement).
    vp.applyProductionCameraCalibration();
    expect(vp.zoom).toBe(1);
    // Under a performance lock: the doctrine freeze (metadata-only calibration).
    vp.setProductionCameraCalibration(2.25, -2, 1, 225);
    vp.lockPerformanceCamera();
    expect(vp.zoom).toBe(2.25);
    vp.setProductionCameraCalibration(2.4, 0, 0, 240);
    vp.applyProductionCameraCalibration();
    expect(vp.zoom).toBe(2.25);
    // After the user takes over the camera, the machine never reframes.
    vp.releasePerformanceCamera();
    vp.applyFitCamera(3.0, 5, 5, 300); // user Fit marks ownership
    vp.setProductionCameraCalibration(2.25, -2, 1, 225);
    vp.applyProductionCameraCalibration();
    expect(vp.zoom).toBe(3.0);
  });
});

describe("cinematic isolated-proof camera", () => {
  it("lockCinematicCamera merges into the user-owned 100% world frame", () => {
    const vp = new GasperViewportController();
    vp.lockCinematicCamera();
    expect(vp.isCinematicCamera()).toBe(true);
    expect(vp.isUserWorldFrameHeld()).toBe(true);
    expect(vp.isPerformanceCameraLocked()).toBe(true);
    expect(vp.zoom).toBe(1);
    expect(vp.panX).toBe(0);
    expect(vp.panY).toBe(0);
    expect(vp.autoFit).toBe(false);
    expect(vp.getState().userCameraOwned).toBe(true);
    expect(vp.getState().userWorldFrameHeld).toBe(true);
    vp.applyAutomaticFitCamera(2.25, 0, 0, 225);
    expect(vp.zoom).toBe(1);
    expect(vp.panY).toBe(0);
  });
  it("does not steal an earlier user-owned world frame with zoom 2", () => {
    const vp = new GasperViewportController();
    vp.reset();
    vp.holdUserWorldFrame();
    expect(vp.zoom).toBe(1);
    vp.lockCinematicCamera();
    expect(vp.isCinematicCamera()).toBe(true);
    expect(vp.zoom).toBe(1);
    expect(vp.panY).toBe(0);
  });
  it("does not yield to the pack/pose lock cycle or Auto Fit", () => {
    const vp = new GasperViewportController();
    vp.setProductionCameraCalibration(2.26, 14, -6, 226);
    vp.lockCinematicCamera();
    vp.releasePerformanceCamera();
    expect(vp.isCinematicCamera()).toBe(true);
    expect(vp.zoom).toBe(1);
    expect(vp.panY).toBe(0);
    vp.lockPerformanceCamera();
    expect(vp.zoom).toBe(1);
    expect(vp.panX).toBe(0);
    expect(vp.panY).toBe(0);
    vp.setAutoFit(true);
    expect(vp.autoFit).toBe(false);
    vp.applyAutomaticFitCamera(2.26, 14, -6, 226);
    expect(vp.zoom).toBe(1);
  });
  it("holdUserWorldFrame freezes 100% and does not yield to Auto Fit", () => {
    const vp = new GasperViewportController();
    vp.setProductionCameraCalibration(2.26, 14, -6, 226);
    vp.reset();
    vp.holdUserWorldFrame();
    expect(vp.isCinematicCamera()).toBe(true);
    expect(vp.zoom).toBe(1);
    expect(vp.autoFit).toBe(false);
    expect(vp.getState().userCameraOwned).toBe(true);
    expect(vp.getState().cinematicLocked).toBe(true);
    vp.releasePerformanceCamera();
    expect(vp.isCinematicCamera()).toBe(true);
    expect(vp.zoom).toBe(1);
    vp.lockPerformanceCamera();
    expect(vp.zoom).toBe(1);
    vp.setAutoFit(true);
    expect(vp.autoFit).toBe(false);
    vp.applyAutomaticFitCamera(2.26, 14, -6, 226);
    expect(vp.zoom).toBe(1);
    expect(vp.panX).toBe(0);
    expect(vp.panY).toBe(0);
  });
  it("holdUserWorldFrame can freeze a user-owned medium shot without following COM", () => {
    const vp = new GasperViewportController();
    vp.reset();
    vp.applyFitCamera(1.618033988749895, -120, -32, 162);
    vp.holdUserWorldFrame({ zoom: 1.618033988749895, panX: -120, panY: -32 });
    expect(vp.zoom).toBeCloseTo(1.618033988749895);
    expect(vp.panX).toBe(-120);
    expect(vp.panY).toBe(-32);
    expect(vp.autoFit).toBe(false);
    expect(vp.getState().userCameraOwned).toBe(true);
    expect(vp.getState().cinematicLocked).toBe(true);
    vp.applyAutomaticFitCamera(2.26, 14, -6, 226);
    expect(vp.zoom).toBeCloseTo(1.618033988749895);
    expect(vp.panX).toBe(-120);
  });
  it("once held, machine stealers cannot take the user-owned world frame", () => {
    const vp = new GasperViewportController();
    vp.holdUserWorldFrame({ zoom: 1, panX: 12, panY: -8 });
    vp.releasePerformanceCamera();
    vp.lockPerformanceCamera();
    vp.setAutoFit(true);
    vp.setWorldScale100();
    vp.applyFitCamera(2.26, 80, 40, 226);
    vp.lockCinematicCamera();
    vp.reset();
    vp.applyAutomaticFitCamera(2.26, 14, -6, 226);
    vp.applyProductionCameraCalibration();
    vp.holdUserWorldFrame({ zoom: 2.618, panX: -120, panY: -32 });
    expect(vp.isUserWorldFrameHeld()).toBe(true);
    expect(vp.zoom).toBe(1);
    expect(vp.panX).toBe(12);
    expect(vp.panY).toBe(-8);
    expect(vp.autoFit).toBe(false);
    expect(vp.getState().userWorldFrameHeld).toBe(true);
  });
});
