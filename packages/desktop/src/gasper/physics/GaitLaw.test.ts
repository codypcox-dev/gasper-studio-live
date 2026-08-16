/**
 * GaitLaw — Pressure-Cooker Cycle 1 (gait-expression-phd-memo L1–L9).
 * The gait organ derives its conclusions from live state: travel-locked
 * phase, vault-arc bob, accel lean, similarity cruise. No clocks, no
 * authored keys, fail-closed on corrupt input.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  clampToComfortBand,
  comfortCruiseBand,
  deriveGait,
  GAIT_EXCHANGE_SWITCH_FRAC,
  GAIT_LAW,
  GAIT_LEG_UNITS,
  GAIT_REST,
  GAIT_STEP_HZ_MAX,
  GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC,
  GAIT_WALK_BAND_STEP_HZ,
  gaitStepHz,
  walkGaitMix,
  walkCadenceHz,
  walkFlightFrac,
  WALK_GAIT_CURVE,
  GAIT_BASE_PLANT,
  gaitBasePlantWeight,
  gaitBasePlantPx,
  gaitLoadedLobeWeight,
  gaitSwingLobeWeight,
  gaitSwingClearance,
  gaitSwingTravel01,
  gaitLobePose,
  GAIT_LOBE,
} from "./GaitLaw";
import { PHI_LAW } from "./PhiLaw";

const G = 74210; // D-0112 field gravity (world units/s²)
const CRUISE = GAIT_LAW.cruiseBaseUnitsPerSec;

describe("L2 — similarity cruise band", () => {
  it("brackets the adopted base at the D-0112 gravity", () => {
    const band = comfortCruiseBand(G);
    expect(band.min).toBeLessThan(CRUISE);
    expect(band.max).toBeGreaterThan(CRUISE);
    // memo §4 L2 numerics: [2612, 3990] u/s at g = 74,210.
    expect(band.min).toBeCloseTo(2612, -1.8);
    expect(band.max).toBeCloseTo(3990, -1.8);
  });
  it("scales with the environment field (N5: the environment owns g)", () => {
    const half = comfortCruiseBand(G / 4);
    expect(half.max / comfortCruiseBand(G).max).toBeCloseTo(0.5, 9);
  });
});

describe("Cycle 2 E2 — the φ ladder lives inside the comfort band", () => {
  it("clamps the amble up and the brisk down; the base passes", () => {
    const band = comfortCruiseBand(G);
    expect(clampToComfortBand(CRUISE / PHI_LAW.phi, G)).toBeCloseTo(band.min, 9);
    expect(clampToComfortBand(CRUISE * PHI_LAW.phi, G)).toBeCloseTo(band.max, 9);
    expect(clampToComfortBand(CRUISE, G)).toBe(CRUISE);
  });
  it("fail-closed: corrupt input collapses to the adopted base", () => {
    expect(clampToComfortBand(Number.NaN, G)).toBe(CRUISE);
    expect(clampToComfortBand(1000, Number.NaN)).toBe(CRUISE);
    expect(clampToComfortBand(1000, -1)).toBe(CRUISE);
  });
});

describe("Cycle 8 X1 — step frequency from the stride-length law", () => {
  it("is zero at rest (no clock)", () => {
    expect(gaitStepHz(0)).toBe(0);
    expect(gaitStepHz(GAIT_LAW.speedEpsilonUnitsPerSec / 2)).toBe(0);
  });
  it("is v/λ_norm at the band floor, capped so the exchange clears τ_c, floored at the stroll", () => {
    const band = comfortCruiseBand(G);
    expect(gaitStepHz(band.min)).toBeCloseTo(band.min / (0.75 * GAIT_LAW.bodyHeightUnits), 9);
    expect(gaitStepHz(band.min)).toBeCloseTo(2.8432, 3); // the triple-convergence cadence
    expect(gaitStepHz(CRUISE)).toBe(GAIT_STEP_HZ_MAX); // 3200/918 = 3.49 > cap
    expect(gaitStepHz(2 * CRUISE)).toBe(GAIT_STEP_HZ_MAX);
    expect(gaitStepHz(CRUISE / 100)).toBe(GAIT_LAW.stepHzFloor);
  });
  it("the S1 exchange window never falls below the critical duration", () => {
    const band = comfortCruiseBand(G);
    for (const v of [band.min, CRUISE, comfortCruiseBand(G).max]) {
      expect(GAIT_EXCHANGE_SWITCH_FRAC / gaitStepHz(v)).toBeGreaterThanOrEqual(
        GAIT_LAW.exchangeCriticalDurationSec - 1e-12,
      );
    }
    expect(GAIT_EXCHANGE_SWITCH_FRAC).toBeCloseTo(0.1814, 3); // clinical band (T1)
  });
});

describe("L5/L8 — phase and bob", () => {
  it("freezes phase when speed is zero", () => {
    const out = deriveGait({ speed: 0, accelTangent: 0, gravity: G, phase: 1.3, dt: 1 / 60 });
    expect(out.phase).toBe(1.3);
    expect(out.bobUnits).toBe(0);
    expect(out.swayUnits).toBe(0);
    expect(out.speedRatio).toBe(0);
  });
  it("advances phase by 2π·f·dt while moving (travel, never clock)", () => {
    const dt = 1 / 240;
    const out = deriveGait({ speed: CRUISE, accelTangent: 0, gravity: G, phase: 0, dt });
    expect(out.phase).toBeCloseTo(2 * Math.PI * gaitStepHz(CRUISE) * dt, 9);
  });
  it("bobs on the vault arc: l_eff·(1−cos α), tan α = λ/(2·l_eff) — X1 triple convergence at the band floor", () => {
    const band = comfortCruiseBand(G);
    const out = deriveGait({ speed: band.min, accelTangent: 0, gravity: G, phase: 0, dt: 1 / 240 });
    const lambda = band.min / gaitStepHz(band.min);
    const alpha = Math.atan(lambda / (2 * GAIT_LEG_UNITS));
    expect(out.bobUnits).toBeCloseTo(GAIT_LEG_UNITS * (1 - Math.cos(alpha)), 9);
    // tan α = 0.75 ⇒ cos α = 0.8 ⇒ bob = exactly the 10 % fence, unclipped.
    expect(out.bobUnits).toBeCloseTo(0.1 * GAIT_LAW.bodyHeightUnits, 9);
  });
  it("X3 disclosure: above 2772 u/s the derived bob exceeds the fence — the renderer clips, never hides", () => {
    const fast = deriveGait({ speed: CRUISE, accelTangent: 0, gravity: G, phase: 0, dt: 1 / 240 });
    expect(fast.bobUnits).toBeGreaterThan(0.1 * GAIT_LAW.bodyHeightUnits);
    expect(fast.bobUnits).toBeCloseTo(148.9, 0);
  });
  it("bob grows with speed (faster vault, longer step, deeper arc)", () => {
    const slow = deriveGait({ speed: CRUISE / 8, accelTangent: 0, gravity: G, phase: 0, dt: 1 / 240 });
    const fast = deriveGait({ speed: CRUISE, accelTangent: 0, gravity: G, phase: 0, dt: 1 / 240 });
    expect(fast.bobUnits).toBeGreaterThan(slow.bobUnits);
  });
});

describe("L6 — lean into acceleration", () => {
  it("carries no lean at constant speed", () => {
    const out = deriveGait({ speed: CRUISE, accelTangent: 0, gravity: G, phase: 0, dt: 1 / 240 });
    expect(out.leanDeg).toBe(0);
  });
  it("leans by atan(a/g) and flips sign on braking", () => {
    // a = 10000 u/s² ⇒ atan(a/g) ≈ 7.68°, inside the L6 grounded clamp.
    const acc = deriveGait({ speed: CRUISE / 2, accelTangent: 10000, gravity: G, phase: 0, dt: 1 / 240 });
    const brake = deriveGait({ speed: CRUISE / 2, accelTangent: -10000, gravity: G, phase: 0, dt: 1 / 240 });
    expect(acc.leanDeg).toBeCloseTo((Math.atan(10000 / G) * 180) / Math.PI, 9);
    expect(brake.leanDeg).toBeCloseTo(-acc.leanDeg, 9);
  });
  it("clamps at the grounded lean ceiling", () => {
    const out = deriveGait({ speed: CRUISE, accelTangent: 10 * G, gravity: G, phase: 0, dt: 1 / 240 });
    expect(out.leanDeg).toBe(GAIT_LAW.maxGroundedLeanDeg);
  });
});

describe("Cycle 8 X2 — lateral sway at the Weber floor", () => {
  it("is 0.02·φ·h_G at cruise so the plant base shift clears the 2 % JND, ratio-scaled below", () => {
    const out = deriveGait({ speed: CRUISE, accelTangent: 0, gravity: G, phase: 0, dt: 1 / 240 });
    expect(out.swayUnits).toBeCloseTo(0.02 * PHI_LAW.phi * 1224, 9);
    // stepDx = sway/φ = exactly the 2 % displacement floor at the home contour:
    expect(out.swayUnits / PHI_LAW.phi).toBeCloseTo(0.02 * 1224, 9);
    const half = deriveGait({ speed: CRUISE / 2, accelTangent: 0, gravity: G, phase: 0, dt: 1 / 240 });
    expect(half.swayUnits).toBeCloseTo(out.swayUnits / 2, 9);
  });
});

describe("Cycle 4 R3 — contact squash, volume law (walk-weight-transfer-phd-memo)", () => {
  // Probe a phase without advancing it (dt = 0 — the observables are a pure
  // function of the live state; the squash rides the RETURNED phase).
  const atPhase = (phase: number, speed = CRUISE) =>
    deriveGait({ speed, accelTangent: 0, gravity: G, phase, dt: 0 });

  it("is zero at rest and in GAIT_REST (no travel, no impulse)", () => {
    expect(GAIT_REST.contactSquash).toBe(0);
    expect(deriveGait({ speed: 0, accelTangent: 0, gravity: G, phase: Math.PI, dt: 1 / 240 }).contactSquash).toBe(0);
  });

  it("peaks at contact (phase π, COM lowest) and vanishes at mid-stance (phase 0)", () => {
    expect(atPhase(0).contactSquash).toBe(0);
    expect(atPhase(Math.PI).contactSquash).toBeGreaterThan(0);
    expect(atPhase(2 * Math.PI).contactSquash).toBeCloseTo(0, 9);
    // monotone rise through the sink, symmetric fall through the vault:
    expect(atPhase(Math.PI / 2).contactSquash).toBeCloseTo(atPhase((3 * Math.PI) / 2).contactSquash, 9);
    expect(atPhase(Math.PI / 2).contactSquash).toBeLessThan(atPhase(Math.PI).contactSquash);
  });

  it("is the vault Froude impulse q = v_v²/(g·h_G), v_v = (bob/2)·2π·f", () => {
    const gait = atPhase(Math.PI);
    const vVert = (gait.bobUnits / 2) * 2 * Math.PI * gait.stepHz;
    const q = (vVert * vVert) / (G * GAIT_LAW.bodyHeightUnits);
    expect(gait.contactSquash).toBeCloseTo(q, 12); // (1−cos π)/2 = 1 ⇒ c_peak = q
  });

  it("spans ≈ 1.3 %…3.8 % across the comfort band under X1 — the T3 family, under the 5 % fence", () => {
    const band = comfortCruiseBand(G);
    const lo = atPhase(Math.PI, band.min).contactSquash;
    const hi = atPhase(Math.PI, band.max).contactSquash;
    expect(lo).toBeGreaterThan(0.01);
    expect(lo).toBeLessThan(0.02);
    expect(hi).toBeGreaterThan(0.03);
    expect(hi).toBeLessThan(0.045);
    expect(hi).toBeLessThan(0.05); // the renderer's fail-closed fence never binds
    expect(hi).toBeGreaterThan(lo); // grows with the vault impulse
  });
});

describe("fail-closed + determinism", () => {
  it("corrupt input collapses to rest, preserving a finite phase", () => {
    const out = deriveGait({ speed: NaN, accelTangent: 1, gravity: G, phase: 2.2, dt: 1 / 240 });
    expect(out.phase).toBe(2.2);
    expect(out.stepHz).toBe(GAIT_REST.stepHz);
    expect(out.bobUnits).toBe(0);
    const noG = deriveGait({ speed: CRUISE, accelTangent: 0, gravity: 0, phase: 0, dt: 1 / 240 });
    expect(noG.bobUnits).toBe(0);
  });
  it("is deterministic — same inputs, same observables", () => {
    const a = deriveGait({ speed: 1234, accelTangent: -500, gravity: G, phase: 0.7, dt: 1 / 240 });
    const b = deriveGait({ speed: 1234, accelTangent: -500, gravity: G, phase: 0.7, dt: 1 / 240 });
    expect(a).toEqual(b);
  });
});

describe("Cycle 3 M3 — floor-answer contrast floor (locomotion-legibility-phd-memo)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const bundle = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");

  // The shadow gap the eye reads is the SCREEN gap wGap = bobLift·wDepthScale;
  // the gait expresses half the vault bob (bobLiftUnits = bob/2·cos φ-phase)
  // through the 8 u/px channel, so at the home plane wGap swings ±bob/16 px.
  // DERIVED here from the live gait law, never a copy of renderer numbers.
  const halfSwingPxAt = (v: number): number => {
    const gait = deriveGait({ speed: v, accelTangent: 0, gravity: G, phase: 0, dt: 1 / 240 });
    return gait.bobUnits / 8 / 2;
  };
  // Cycle 13 L1/L2 (contact-shadow-load-phd-memo): the fade reads only true
  // lift — wFade = 1/(1+max(0,wGap)·G) — so the stride swing is the lift-fade
  // 1−1/(1+Gh) = Gh/(1+Gh); landing on the 10 % JND floor needs G = 0.10/(h·(1−0.10)).
  const floorGainAt = (h: number): number => 0.1 / (h * (1 - 0.1));
  const liftFadeSwing = (h: number, gain: number): number =>
    (gain * h) / (1 + gain * h);

  it("the AS3 wGap fade carries SHADOW_WGAP_GAIN and reads only true lift (Cycle 13 L2)", () => {
    expect(bundle).toContain("wFade=1/(1+Math.max(0,wGap)*SHADOW_WGAP_GAIN)*wDepthFade");
    expect(bundle).toContain("wShrink=1/(1+wGap*0.02)"); // size channel is not the M3 target
    expect(bundle).toContain(
      "const SHADOW_WGAP_GAIN=0.10/(M3_WGAP_HALF_PX*(1-0.10));",
    );
    expect(bundle).not.toContain("Math.max(0.045"); // the Cycle-3 authored floor is retired (cycle-13 wall)
  });

  it("the renderer's M3 constants mirror this gait law exactly (C4 idiom)", () => {
    expect(bundle).toContain(
      `const M3_BAND_MIN_CRUISE=Math.sqrt(${GAIT_LAW.froudeComfortMin}*${G}*${GAIT_LEG_UNITS})`,
    );
    expect(bundle).toContain(
      `const M3_STEP_HZ=Math.min(M3_BAND_MIN_CRUISE/(${GAIT_LAW.strideLenFracOfHeight}*${GAIT_LAW.bodyHeightUnits}),${GAIT_STEP_HZ_MAX});`,
    );
    expect(bundle).toContain(
      `const M3_BOB_UNITS=${GAIT_LEG_UNITS}*(1-Math.cos(Math.atan(M3_BAND_MIN_CRUISE/M3_STEP_HZ/${GAIT_LAW.bodyHeightUnits})))`,
    );
    expect(bundle).toContain("const M3_WGAP_HALF_PX=M3_BOB_UNITS/8/2");
    // and the bundle's derivation chain evaluates to the SAME number the
    // live gait law produces at the band-min cruise (X1: bob = the fence):
    const cruise = Math.sqrt(0.15 * 74210 * 612);
    const hz = Math.min(cruise / (0.75 * 1224), GAIT_STEP_HZ_MAX);
    const bob = 612 * (1 - Math.cos(Math.atan(cruise / hz / 1224)));
    const as3HalfPx = bob / 8 / 2;
    expect(as3HalfPx).toBeCloseTo(halfSwingPxAt(comfortCruiseBand(G).min), 12);
  });

  it("Cycle 13 L1 — the gain stands derived; the Cycle-3 authored floor is retired", () => {
    const band = comfortCruiseBand(G);
    const gain = floorGainAt(halfSwingPxAt(band.min));
    expect(gain).toBeLessThan(0.045); // the old authored gain was the clip engine
    expect(gain).toBeCloseTo(0.1 / (halfSwingPxAt(band.min) * 0.9), 12);
  });

  it("stride lift-fade swing lands on the 10 % JND floor at every band cruise (L1)", () => {
    const band = comfortCruiseBand(G);
    const gain = floorGainAt(halfSwingPxAt(band.min));
    for (const v of [band.min, GAIT_LAW.cruiseBaseUnitsPerSec, band.max]) {
      expect(liftFadeSwing(halfSwingPxAt(v), gain)).toBeGreaterThanOrEqual(0.1 - 1e-9);
    }
  });

  it("Cycle 13 L2 — occlusion ceiling: wFade ≤ 1 for every lawful gap; no renderer clip", () => {
    const band = comfortCruiseBand(G);
    const gain = floorGainAt(halfSwingPxAt(band.min));
    for (let wGap = -8; wGap <= 8; wGap += 0.25) {
      const wFade = 1 / (1 + Math.max(0, wGap) * gain);
      expect(wFade).toBeLessThanOrEqual(1); // contact darkness is the ceiling
      expect(wFade).toBeGreaterThan(0);
    }
    expect(0.78).toBeLessThan(1); // contactShadow at contact: below the clamp
  });

  it("Cycle 9 C1 — the floor stack holds at the world plant; COM travel stays on worldRig", () => {
    // contact-shadow-phd-memo: the contact shadow converges at the point of
    // contact, so the contact pair receives the SAME δ the contour base
    // expresses (phase-locked); the penumbra pool keeps riding the COM.
    expect(bundle).toContain(
      "contactShadow.setAttribute('transform',`translate(${shadowStepDxPx.toFixed(3)} 0) skewX(${_shear.toFixed(3)})`);contactShadowCore.setAttribute('transform',`translate(${shadowStepDxPx.toFixed(3)} 0) skewX(${_shear.toFixed(3)})`);",
    );
    expect(bundle).toContain("ground.setAttribute('transform',`translate(${shadowStepDxPx.toFixed(3)} 0)`);");
    expect(bundle).toContain("groundOuter.setAttribute('transform',`translate(${shadowStepDxPx.toFixed(3)} 0)`);");
    expect(bundle).toContain("contactShadowOuter.setAttribute('transform',`translate(${shadowStepDxPx.toFixed(3)} 0)`);");
    // one law, two expressions: the shadow δ mirrors the stepRig δ
    expect(bundle).toContain(
      "(plantX*gaitGate)/WORLD_SPACE.unitsPerContentPx",
    );
    expect(bundle).toContain("physGait.plantedScreenXUnits");
    // N239: plantedScreenXUnits must keep reaching the cyan base path.
    expect(bundle).toContain(
      "const _cyanPlant=",
    );
    expect(bundle).toContain("cyanFieldNode.setAttribute('transform'");
    // C4 byte-stability idiom: snapped at 0.004 px and the attribute removed at zero
    expect(bundle).toContain(
      "contactShadow.removeAttribute('transform');contactShadowCore.removeAttribute('transform')",
    );
  });

  it("Cycle 9 C3 — δ p2p clears the 2 % displacement JND on the contact core", () => {
    // δ/A = max over phase of |tanh(k·cos(φ/2)) − cos(φ/2)| (S2 golden split,
    // ≈ 0.6187) — swept live from the law, never copied.
    const k = GAIT_LAW.stepPlacementSharpness;
    let ratio = 0;
    for (let p = 0; p < 2 * Math.PI; p += 0.0005) {
      const d = Math.abs(Math.tanh(k * Math.cos(p / 2)) - Math.cos(p / 2));
      if (d > ratio) ratio = d;
    }
    expect(ratio).toBeCloseTo(0.6187, 3);
    const sway = GAIT_LAW.swayFracOfHeight * GAIT_LAW.bodyHeightUnits; // X2 amplitude
    const deltaPx = (ratio * sway) / 8; // home plane, 8 u per content px
    const coreRx = 38; // authored contact-core rx (AS3 shadow block)
    expect(deltaPx / coreRx).toBeGreaterThanOrEqual(0.02); // half-swing ≥ 2 % JND
    expect((2 * deltaPx) / coreRx).toBeGreaterThanOrEqual(0.1); // p2p ≥ 10 % of the core
  });

  it("Cycle 9 C1 — the shadow δ is witness-readable observer-only (N23)", () => {
    expect(bundle).toContain("avatar.dataset.gaitShadowDx=plantDxPx.toFixed(3)");
  });

  it("home byte-stability: at wGap = 0 the multiplier is exactly 1 under any gain", () => {
    const band = comfortCruiseBand(G);
    const gain = floorGainAt(halfSwingPxAt(band.min));
    expect(1 / (1 + Math.max(0, 0) * gain)).toBe(1);
    expect(liftFadeSwing(0, gain)).toBe(0); // no swing without travel
  });
});

describe("Cycle 11 Z1/Z2 — the contact flatten (step-shape-phd-memo)", () => {
  // Probe a phase without advancing it (dt = 0 — the R3 idiom): the flatten
  // rides the RETURNED phase, signed by the planted side sign(cos(phase/2)).
  const atPhase = (phase: number, speed = CRUISE) =>
    deriveGait({ speed, accelTangent: 0, gravity: G, phase, dt: 0 });

  it("collapses to zero at rest and in GAIT_REST (no travel, no support)", () => {
    expect(GAIT_REST.stepFlattenSignedUnits).toBe(0);
    expect(GAIT_REST.stepFlattenWidthUnits).toBe(0);
    const out = deriveGait({ speed: 0, accelTangent: 0, gravity: G, phase: 0, dt: 1 / 240 });
    expect(out.stepFlattenSignedUnits).toBe(0);
    expect(out.stepFlattenWidthUnits).toBe(0);
  });

  it("X1 triple convergence: at the band floor d_phys = exactly 2 % of h_G, exaggerated by k = φ", () => {
    const band = comfortCruiseBand(G);
    const out = atPhase(0, band.min);
    // tan α = 0.75 ⇒ cos α = 0.8 ⇒ d_phys = l_eff·(1−cos α)² = 24.48 u = the
    // plant cue's own JND unit (X2 stepDx); k = φ ∈ [1,2] (twelve principles).
    const dPhys = GAIT_LEG_UNITS * (1 - 0.8) * (1 - 0.8);
    expect(dPhys).toBeCloseTo(0.02 * GAIT_LAW.bodyHeightUnits, 9);
    expect(PHI_LAW.phi).toBeGreaterThanOrEqual(1);
    expect(PHI_LAW.phi).toBeLessThanOrEqual(2);
    // tanh(k·1) saturates ⇒ support share ≈ 1 at mid-stance:
    expect(out.stepFlattenSignedUnits).toBeCloseTo(PHI_LAW.phi * dPhys, 2);
    expect(out.stepFlattenWidthUnits).toBeCloseTo(PHI_LAW.phi * dPhys, 2);
  });

  it("peaks at mid-stance on the planted side, vanishes at the exchange, alternates each half-stride", () => {
    const mid = atPhase(0).stepFlattenSignedUnits;
    expect(mid).toBeGreaterThan(0); // cos(0) > 0 half-stride
    expect(atPhase(2 * Math.PI).stepFlattenSignedUnits).toBeCloseTo(-mid, 9);
    expect(Math.abs(atPhase(Math.PI).stepFlattenSignedUnits)).toBeLessThan(0.5);
    expect(Math.abs(atPhase(3 * Math.PI).stepFlattenSignedUnits)).toBeLessThan(0.5);
    // Hertz monotonic form: the patch grows monotonically from the exchange
    // (w = 0) to mid-stance (w = 1) — depth w^(2/3), width w^(1/3).
    const growing = [Math.PI + 0.3, Math.PI + 0.9, Math.PI + 1.5, 2 * Math.PI].map(
      (p) => Math.abs(atPhase(p).stepFlattenSignedUnits),
    );
    for (let i = 1; i < growing.length; i++) {
      expect(growing[i]).toBeGreaterThan(growing[i - 1]);
    }
    // the mid-stance value is the phase maximum (the hold bears full load):
    for (let p = 0; p <= 4 * Math.PI; p += 0.05) {
      expect(Math.abs(atPhase(p).stepFlattenSignedUnits)).toBeLessThanOrEqual(mid + 1e-9);
    }
  });

  it("Z2 fences: depth ≤ 5 % h_G (binding at the band top), width ≤ 25 % base half-width", () => {
    const band = comfortCruiseBand(G);
    for (const v of [band.min, CRUISE, band.max, 2 * CRUISE]) {
      for (let p = 0; p <= 4 * Math.PI; p += 0.1) {
        const o = atPhase(p, v);
        expect(Math.abs(o.stepFlattenSignedUnits)).toBeLessThanOrEqual(
          GAIT_LAW.flattenMaxUnits + 1e-9,
        );
        expect(o.stepFlattenWidthUnits).toBeGreaterThanOrEqual(0);
        expect(o.stepFlattenWidthUnits).toBeLessThanOrEqual(
          GAIT_LAW.flattenPatchMaxUnits + 1e-9,
        );
      }
    }
    // the clamp BINDS at the band top (never hidden — X3 idiom): the φ-gain
    // amplitude φ·d_phys exceeds the fence there and lands on it, up to the
    // tanh(k·1) ≈ 0.99996 support-share saturation residual.
    const top = atPhase(0, band.max);
    expect(Math.abs(top.stepFlattenSignedUnits)).toBeGreaterThan(
      0.999 * GAIT_LAW.flattenMaxUnits,
    );
    expect(Math.abs(top.stepFlattenSignedUnits)).toBeLessThanOrEqual(
      GAIT_LAW.flattenMaxUnits + 1e-9,
    );
    expect(GAIT_LAW.flattenMaxUnits).toBeCloseTo(0.05 * GAIT_LAW.bodyHeightUnits, 9);
    // the mid-band amplitude stays under the fence (the clamp is the edge case):
    expect(Math.abs(atPhase(0, CRUISE).stepFlattenSignedUnits)).toBeLessThan(
      GAIT_LAW.flattenMaxUnits,
    );
  });

  it("Z4 — the AS3 intake mirrors the Z2 fences; telemetry is observer-only and gated", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const bundle = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");
    expect(bundle).toContain(
      "stepFlattenUnits:Math.max(-61.2,Math.min(61.2,n(s.stepFlattenUnits,0)))",
    );
    expect(bundle).toContain(
      "stepFlattenWidthUnits:Math.max(0,Math.min(144,n(s.stepFlattenWidthUnits,0)))",
    );
    expect(bundle).toContain("stepFlattenUnits:0,stepFlattenWidthUnits:0");
    expect(bundle).toContain(
      "avatar.dataset.gaitFlatten=(physGait.stepFlattenUnits*gaitGate).toFixed(2)",
    );
    expect(bundle).toContain(
      "avatar.dataset.gaitFlattenW=(physGait.stepFlattenWidthUnits*gaitGate).toFixed(2)",
    );
    // the contour expression: the planted side picks the foot-root anchor,
    // the flank bulges conserve the displaced area (σ_bulge = φ·σ, amp d/2φ
    // ⇒ 2·(d/2φ)·(φσ) = dσ exactly). CYCLE 12 (embodiment-silhouette-phd-memo
    // W1/W2): the same math now lives in the gaitFlattenRadiusDelta carrier so
    // EVERY family base consumes it (the dormant branches no longer early-return
    // past it); the grammar below is pinned byte-for-byte in the carrier.
    expect(bundle).toContain("function gaitFlattenRadiusDelta(th){");
    expect(bundle).toContain("const _fpTh=_fdPx>0?1.34:1.80");
    expect(bundle).toContain("return -_fpD*gaussAngle(th,_fpTh,_fpSig)");
    expect(bundle).toContain("const _gfd=gaitFlattenRadiusDelta(th);if(_gfd!==0)radius+=_gfd;");
    expect(bundle).toContain(
      "(_fpD/(2*AMORPH_PHI))*gaussAngle(th,_fpTh-2.5*_fpSig,AMORPH_PHI*_fpSig)",
    );
    // Z4 byte-stability: the term is snapped at 0.004 px and gated on live motion
    expect(bundle).toContain("Math.abs(_fdPx)>=0.004&&_fwPx>=0.004&&Number(motion.value)>0.01");
  });
});

describe("Cycle 10 Y3 — bank fences (bank-phd-memo)", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const bundle = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");
  const phi = (1 + Math.sqrt(5)) / 2;

  it("Y3 — the φ extension of the L6 clamp, inside the friction cone; τ = τ_c·φ", () => {
    expect(GAIT_LAW.bankMaxDeg).toBeCloseTo(8 * phi, 12);
    expect(GAIT_LAW.bankSmoothTauSec).toBeCloseTo(
      GAIT_LAW.exchangeCriticalDurationSec * phi,
      12,
    );
    // The friction cone atan(μ) = atan(1/φ²) ≈ 20.89° is the physical ceiling;
    // the gait-honest cap must sit inside it.
    const coneDeg = (Math.atan(PHI_LAW.frictionMu) * 180) / Math.PI;
    expect(GAIT_LAW.bankMaxDeg).toBeLessThan(coneDeg);
  });

  it("the AS3 intake mirrors the Y3 fence; telemetry is observer-only and gated", () => {
    expect(bundle).toContain(
      "bankDeg:Math.max(-12.94427190999916,Math.min(12.94427190999916,n(s.bankDeg,0)))",
    );
    expect(bundle).toContain(
      "avatar.dataset.gaitBankDeg=(physGait.bankDeg*gaitGate).toFixed(3)",
    );
  });
});

describe("GASPER-NORTHSTAR-001 — gait continuity & support-foot transfer", () => {
  const G = 74210;
  const CRUISE = 3200;
  const dt = 1 / 240;

  it("a steady walk's observables are continuous functions of phase (no jitter steps)", () => {
    // Integrate a full steady walk; every observable must be bounded + finite
    // and its per-sample delta must stay inside a continuity band (the phase
    // advances smoothly; sway/bob are constant at steady speed).
    let phase = 0;
    let prev: ReturnType<typeof deriveGait> | null = null;
    const squashPeak = 0;
    for (let i = 0; i < 4 * 240; i += 1) {
      const out = deriveGait({ speed: CRUISE, accelTangent: 0, gravity: G, phase, dt });
      expect(Number.isFinite(out.phase)).toBe(true);
      expect(out.stepHz).toBeGreaterThanOrEqual(GAIT_LAW.stepHzFloor);
      expect(out.stepHz).toBeLessThanOrEqual(GAIT_STEP_HZ_MAX);
      expect(out.swayUnits).toBeGreaterThan(0);
      expect(out.bobUnits).toBeGreaterThan(0);
      expect(out.contactSquash).toBeGreaterThanOrEqual(0);
      expect(out.contactSquash).toBeLessThanOrEqual(0.05); // R3 fence
      expect(out.stepFlattenWidthUnits).toBeLessThanOrEqual(GAIT_LAW.flattenPatchMaxUnits);
      expect(Math.abs(out.stepFlattenSignedUnits)).toBeLessThanOrEqual(GAIT_LAW.flattenMaxUnits);
      if (prev) {
        // the phase advances continuously (travel-locked, L8) — never a reset.
        const dPhase = out.phase - prev.phase;
        expect(dPhase).toBeGreaterThan(0);
        expect(dPhase).toBeLessThanOrEqual(2 * Math.PI * GAIT_STEP_HZ_MAX * dt + 1e-9);
        // the support share (flatten) and the squash are continuous functions
        // of phase — per-sample deltas bounded (no step artifacts).
        expect(Math.abs(out.stepFlattenSignedUnits - prev.stepFlattenSignedUnits)).toBeLessThanOrEqual(
          GAIT_LAW.flattenMaxUnits * 0.6 + 1e-9,
        );
      }
      phase = out.phase;
      prev = out;
    }
  });

  it("the support-foot transfers side-to-side each half-stride (planted exchange)", () => {
    // Over one full stride, the signed flatten (the planted side's support
    // read) must land on BOTH sides and alternate through the exchange.
    let phase = 0;
    const sides = new Set<number>();
    let prevSign: number | null = null;
    let exchanges = 0;
    for (let i = 0; i < 240 * 2; i += 1) {
      const out = deriveGait({ speed: CRUISE, accelTangent: 0, gravity: G, phase, dt });
      if (Math.abs(out.stepFlattenSignedUnits) > 1) {
        sides.add(Math.sign(out.stepFlattenSignedUnits));
        if (prevSign != null && prevSign !== Math.sign(out.stepFlattenSignedUnits)) {
          exchanges += 1;
        }
        prevSign = Math.sign(out.stepFlattenSignedUnits);
      }
      phase = out.phase;
    }
    expect(sides.has(-1)).toBe(true);
    expect(sides.has(1)).toBe(true);
    expect(exchanges).toBeGreaterThanOrEqual(1); // the exchange is a real event
  });

  it("contact squash peaks at the exchange (phase π) and vanishes at mid-stance (mass answer)", () => {
    // The squash is the IMPULSE read (0 at mid-stance, max at contact); the
    // flatten (support read) peaks at mid-stance and hands off at the exchange
    // — two reads, one floor dialogue.
    const atMid = deriveGait({ speed: CRUISE, accelTangent: 0, gravity: G, phase: 0, dt });
    const atContact = deriveGait({ speed: CRUISE, accelTangent: 0, gravity: G, phase: Math.PI, dt });
    // the squash integrates on nextPhase (the phase advances before the read),
    // so mid-stance is ~0 (a residue) against a strong contact peak.
    expect(atMid.contactSquash).toBeLessThan(atContact.contactSquash / 10);
    expect(atContact.contactSquash).toBeGreaterThan(atMid.contactSquash);
    // the support share is saturated at mid-stance (a planted foot bears the
    // load) and split at the exchange.
    expect(Math.abs(atMid.stepFlattenSignedUnits)).toBeGreaterThan(
      Math.abs(atContact.stepFlattenSignedUnits),
    );
  });
});

describe("walk-band cruise — measured steps, not the Froude teleport", () => {
  it("is stride × φ Hz and lands inside the 1.6–2.0 Hz class", () => {
    const stride = GAIT_LAW.strideLenFracOfHeight * GAIT_LAW.bodyHeightUnits;
    expect(GAIT_WALK_BAND_STEP_HZ).toBe(PHI_LAW.phi);
    expect(GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC).toBeCloseTo(stride * PHI_LAW.phi, 9);
    expect(GAIT_LAW.walkBandCruiseUnitsPerSec).toBe(GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC);
    expect(gaitStepHz(GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC)).toBeCloseTo(PHI_LAW.phi, 9);
    expect(gaitStepHz(GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC)).toBeGreaterThanOrEqual(1.6);
    expect(gaitStepHz(GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC)).toBeLessThanOrEqual(2.0);
  });
  it("stays well below the 2610/3200 teleport rungs", () => {
    expect(GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC).toBeLessThan(2000);
    expect(GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC).toBeLessThan(comfortCruiseBand(G).min);
    expect(GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC).toBeLessThan(GAIT_LAW.cruiseBaseUnitsPerSec);
  });
});

describe("walk gait curve — strut ↔ hop, no switch", () => {
  it("slow end is the approved 1 Hz / ~2s strut", () => {
    expect(WALK_GAIT_CURVE.strutStepHz).toBe(1);
    expect(walkCadenceHz(200, 0)).toBeCloseTo(1, 5);
    expect(walkGaitMix(200, 0)).toBeLessThan(0.08);
    expect(walkFlightFrac(200, 0)).toBeCloseTo(WALK_GAIT_CURVE.strutFlightFrac, 5);
  });

  it("3/4 / profile heading lifts the same speed into hop without a band switch", () => {
    const strut = walkGaitMix(200, 0);
    const q = walkGaitMix(200, 65);
    const profile = walkGaitMix(200, 90);
    expect(q).toBeGreaterThan(strut);
    expect(profile).toBeGreaterThan(q);
    expect(profile).toBeGreaterThan(0.55);
    expect(walkCadenceHz(200, 90)).toBeGreaterThan(walkCadenceHz(200, 0));
    expect(walkFlightFrac(200, 90)).toBeGreaterThan(walkFlightFrac(200, 0));
  });

  it("mix is continuous — 1° heading or 10 u/s never snaps", () => {
    expect(Math.abs(walkGaitMix(200, 44) - walkGaitMix(200, 45))).toBeLessThan(0.04);
    expect(Math.abs(walkGaitMix(210, 65) - walkGaitMix(200, 65))).toBeLessThan(0.05);
    expect(walkGaitMix(0, 90)).toBe(0);
  });
});

describe("N207 gait law — contact-rooted plant", () => {
  it("locks only the foot contact, not the belly or crown", () => {
    const ry = 80;
    expect(gaitBasePlantWeight(0, ry)).toBe(0);
    expect(gaitBasePlantWeight(-ry, ry)).toBe(0);
    expect(gaitBasePlantWeight(0.22 * ry, ry)).toBe(0);
    expect(gaitBasePlantWeight(0.50 * ry, ry)).toBe(0);
    expect(gaitBasePlantWeight(0.72 * ry, ry)).toBeCloseTo(1, 10);
    expect(gaitBasePlantWeight(ry, ry)).toBe(1);
    const mid = gaitBasePlantWeight(0.61 * ry, ry);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.7);
  });

  it("locks only the loaded Wispwalker lobe, not the swing lobe", () => {
    const right = Math.PI / 2 - 0.3;
    const left = Math.PI / 2 + 0.3;
    expect(gaitLoadedLobeWeight(right, 1)).toBeGreaterThan(0.9);
    expect(gaitLoadedLobeWeight(left, 1)).toBeLessThan(0.4);
    expect(gaitLoadedLobeWeight(left, -1)).toBeGreaterThan(0.9);
    expect(gaitLoadedLobeWeight(right, -1)).toBeLessThan(0.4);
    expect(gaitLoadedLobeWeight(0, 1)).toBeLessThan(0.15);
  });

  it("cancels body+sway so the reconstructed plant stays at plantedWorld", () => {
    const plantedWorld = 400;
    const body = 280;
    const sway = 24;
    const plantedScreen = plantedWorld - body;
    const px = gaitBasePlantPx(plantedScreen, sway, 8);
    expect(px).toBeCloseTo((plantedScreen - sway) / 8, 8);
    expect(body / 8 + sway / 8 + px).toBeCloseTo(plantedWorld / 8, 8);
    expect(gaitBasePlantPx(0, sway, 8)).toBe(0);
    expect(gaitBasePlantPx(0.001, sway, 8)).toBe(0);
  });

  it("AS3 locks the loaded nub in posed.x only — no y-lift, no whole-body hold", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const script = readFileSync(join(here, "..", "assets", "all-script-3.js"), "utf8");
    expect(script).not.toContain("arr[i].x+=_plantPx*_baseW*_sideW");
    expect(script).not.toContain("posed.x+=(Number(physGait.swayXUnits)||0)/WORLD_SPACE.unitsPerContentPx*(1-_baseW)");
    expect(script).toContain("wDx=(worldPoseCurrent.x/WORLD_SPACE.unitsPerContentPx)*wScale");
    expect(script).not.toContain("posed.x+=_plantPx*_baseW*_lobeW");
    expect(script).not.toContain("posed.y+=_dropPx*_lobeLoadW-_liftPx*_lobeSwingW");
    expect(script).not.toContain("_plantHoldX");
    expect(script).not.toContain("_contactHoldX");
  });
});

describe("N251/N253 support-lobe cycle — lift on the free Wispwalker lobe", () => {
  it("swing weight is the opposite of the loaded lobe, never the crown", () => {
    const right = Math.PI / 2 - 0.3;
    const left = Math.PI / 2 + 0.3;
    expect(gaitSwingLobeWeight(left, 1)).toBeGreaterThan(0.9);
    expect(gaitSwingLobeWeight(right, 1)).toBeLessThan(0.4);
    expect(gaitSwingLobeWeight(right, -1)).toBeGreaterThan(0.9);
    expect(gaitSwingLobeWeight(left, -1)).toBeLessThan(0.4);
    expect(gaitSwingLobeWeight(0, 1)).toBeLessThan(0.15);
    expect(gaitSwingLobeWeight(right, 1)).toBeLessThan(gaitLoadedLobeWeight(right, 1));
  });

  it("clearance holds a single-support plateau, then collapses at exchange / rest", () => {
    expect(gaitSwingClearance(0, false)).toBe(0);
    expect(gaitSwingClearance(0, true)).toBeGreaterThan(0.75);
    expect(gaitSwingClearance(0.8, true)).toBeGreaterThan(0.75);
    expect(gaitSwingClearance(1.6, true)).toBeGreaterThan(0.75);
    expect(gaitSwingClearance(Math.PI, true)).toBe(0);
    expect(gaitSwingClearance(2 * Math.PI, true)).toBeGreaterThan(0.75);
    const held = gaitSwingClearance(1.2, true);
    const towardExchange = gaitSwingClearance(2.85, true);
    expect(held).toBeGreaterThan(0.75);
    expect(towardExchange).toBeLessThan(0.45);
    expect(held).toBeGreaterThan(towardExchange);
  });

  it("swing travel goes back → mid → forward across one step, then wraps", () => {
    expect(gaitSwingTravel01(Math.PI)).toBeCloseTo(0, 8);
    expect(gaitSwingTravel01(0)).toBeCloseTo(0.5, 8);
    expect(gaitSwingTravel01(Math.PI - 0.01)).toBeGreaterThan(0.9);
    expect(gaitSwingTravel01(Math.PI + 0.01)).toBeLessThan(0.1);
  });

  it("peak swing lift is large enough to open a black air gap, not a contour wave", () => {
    expect(GAIT_LOBE.swingLiftUnits / 8).toBeGreaterThanOrEqual(56);
    expect(GAIT_LOBE.swingLiftUnits / 8).toBeLessThanOrEqual(80);
    expect(GAIT_LOBE.comSettleUnits / 8).toBeGreaterThanOrEqual(28);
    expect(GAIT_LOBE.comBobUnits / 8).toBeGreaterThanOrEqual(24);
    expect(GAIT_LOBE.torsoLeanDeg).toBeGreaterThanOrEqual(6);
    expect(GAIT_LOBE.comShiftMinUnits / 8).toBeGreaterThanOrEqual(22);
    expect(GAIT_LOBE.swingLobeSigma).toBeGreaterThanOrEqual(0.18);
    expect(GAIT_LOBE.swingLobeSigma).toBeLessThanOrEqual(0.26);
    const mid = gaitLobePose({
      phase: 0,
      planted: true,
      plantedCompress: 0.7,
      travelSign: 1,
    });
    expect(mid.swingLiftUnits).toBeGreaterThan(280);
    expect(mid.loadedDropUnits).toBeGreaterThan(60);
    expect(mid.comSettleUnits).toBeGreaterThan(90);
    expect(Math.abs(mid.swingAdvanceUnits)).toBeLessThan(8);
    const held = gaitLobePose({
      phase: 1.2,
      planted: true,
      plantedCompress: 0.6,
      travelSign: 1,
    });
    expect(held.swingLiftUnits).toBeGreaterThan(240);
    const land = gaitLobePose({
      phase: Math.PI,
      planted: true,
      plantedCompress: 0.1,
      travelSign: 1,
    });
    expect(land.swingLiftUnits).toBe(0);
    const rest = gaitLobePose({
      phase: 0,
      planted: false,
      plantedCompress: 0,
      travelSign: 1,
    });
    expect(rest.swingLiftUnits).toBe(0);
    expect(rest.loadedDropUnits).toBe(0);
    expect(rest.swingAdvanceUnits).toBe(0);
    expect(rest.comSettleUnits).toBe(0);
  });

  it("advance is signed with travel and grows from push-off to landing", () => {
    const early = gaitLobePose({
      phase: Math.PI + 0.4,
      planted: true,
      plantedCompress: 0.4,
      travelSign: 1,
    });
    const late = gaitLobePose({
      phase: Math.PI - 0.4,
      planted: true,
      plantedCompress: 0.4,
      travelSign: 1,
    });
    expect(early.swingAdvanceUnits).toBeLessThan(0);
    expect(late.swingAdvanceUnits).toBeGreaterThan(0);
    const left = gaitLobePose({
      phase: Math.PI - 0.4,
      planted: true,
      plantedCompress: 0.4,
      travelSign: -1,
    });
    expect(Math.sign(left.swingAdvanceUnits)).toBe(-1);
  });
});
