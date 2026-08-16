/**
 * GASPER-FINISH-01 / Task 4 — projection transaction (VEC-701) and
 * pressure -> material coupling (GASPER-VEC-401) focused tests.
 *
 * Proves the one-writer projection boundary and the bounded, deterministic
 * pressure -> material causality that the material field consumes:
 *  1. One writer owns a mounted SVG root; a second writer is refused
 *     (split-brain), a mode mismatch is refused, and a duplicate active
 *     lease is refused.
 *  2. Frames commit in strict order with a required resolved hash; stale or
 *     malformed frames are refused; faults latch and block later commits.
 *  3. The pressure -> material chain is bounded on every channel, and its
 *     identity hash excludes frame time (causality is time-independent).
 *
 * Environment note: node env (no jsdom). The SVG root is a structural
 * stand-in implementing the attribute contract the authority actually uses;
 * live DOM inspection remains the WebBridge visual loop.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  GasperVectorProjectionAuthority,
  getGasperVectorProjectionAuthority,
  installGasperVectorProjectionAuthority,
  resetGasperVectorProjectionAuthorityForTests,
} from "./GasperVectorProjectionTransaction";
import {
  applyPressureMaterialResponse,
  evaluatePressureMaterialCoupling,
  type PressureMaterialInput,
} from "./PressureMaterialCoupling";

function fakeRoot(id: string, nodeName = "svg"): SVGSVGElement {
  return {
    nodeName,
    id,
    getAttribute: () => null,
    setAttribute: () => undefined,
    querySelector: () => null,
  } as unknown as SVGSVGElement;
}

afterEach(() => {
  resetGasperVectorProjectionAuthorityForTests();
});

describe("VEC-701 one projection writer per mounted root", () => {
  it("commits frames in order and reports a monotonic inspection", () => {
    const authority = new GasperVectorProjectionAuthority();
    const root = fakeRoot("root-a");
    const lease = authority.claim(root, "formmaster-vector-projector", "production");
    const first = lease.transact({ frameIndex: 0, timeMs: 0, resolvedHash: "hash-0", changedWrites: 12 }, () => "frame-0");
    const second = lease.transact({ frameIndex: 1, timeMs: 16.7, resolvedHash: "hash-1" }, () => "frame-1");
    expect(first.value).toBe("frame-0");
    expect(second.inspection.revision).toBe(2);
    expect(second.inspection.lastFrameIndex).toBe(1);
    expect(second.inspection.lastResolvedHash).toBe("hash-1");
    expect(second.inspection.writerId).toBe("formmaster-vector-projector");
    expect(second.inspection.mode).toBe("production");
    expect(authority.hasWriter(root, "formmaster-vector-projector")).toBe(true);
    lease.dispose();
  });

  it("refuses a second writer on the same root (split-brain)", () => {
    const authority = new GasperVectorProjectionAuthority();
    const root = fakeRoot("root-b");
    const lease = authority.claim(root, "formmaster-vector-projector", "production");
    expect(() => authority.claim(root, "native-vector-projector", "native-lab")).toThrow(/split-brain/);
    lease.dispose();
  });

  it("refuses a mode mismatch and a duplicate active lease from the same writer", () => {
    const authority = new GasperVectorProjectionAuthority();
    const root = fakeRoot("root-c");
    const lease = authority.claim(root, "formmaster-vector-projector", "production");
    expect(() => authority.claim(root, "formmaster-vector-projector", "native-lab")).toThrow(/mode mismatch/);
    expect(() => authority.claim(root, "formmaster-vector-projector", "production")).toThrow(/duplicate active lease/);
    lease.dispose();
    const reclaimed = authority.claim(root, "formmaster-vector-projector", "production");
    reclaimed.dispose();
  });

  it("refuses stale, duplicate, and malformed frames", () => {
    const authority = new GasperVectorProjectionAuthority();
    const root = fakeRoot("root-d");
    const lease = authority.claim(root, "formmaster-vector-projector", "production");
    lease.transact({ frameIndex: 5, timeMs: 83.3, resolvedHash: "hash-5" }, () => null);
    expect(() => lease.transact({ frameIndex: 5, timeMs: 100, resolvedHash: "hash-5b" }, () => null)).toThrow(/duplicate\/stale frame/);
    expect(() => lease.transact({ frameIndex: 4, timeMs: 116, resolvedHash: "hash-4" }, () => null)).toThrow(/duplicate\/stale frame/);
    expect(() => lease.transact({ frameIndex: -1, timeMs: 0, resolvedHash: "hash-x" }, () => null)).toThrow(TypeError);
    expect(() => lease.transact({ frameIndex: 6, timeMs: Number.NaN, resolvedHash: "hash-x" }, () => null)).toThrow(TypeError);
    expect(() => lease.transact({ frameIndex: 6, timeMs: 100, resolvedHash: "  " }, () => null)).toThrow(TypeError);
    lease.dispose();
  });

  it("latches a projection fault and blocks later commits", () => {
    const authority = new GasperVectorProjectionAuthority();
    const root = fakeRoot("root-e");
    const lease = authority.claim(root, "formmaster-vector-projector", "production");
    expect(() =>
      lease.transact({ frameIndex: 0, timeMs: 0, resolvedHash: "hash-0" }, () => {
        throw new Error("projector exploded");
      }),
    ).toThrow(/projector exploded/);
    expect(lease.inspect().fault?.message).toBe("projector exploded");
    expect(() => lease.transact({ frameIndex: 1, timeMs: 16.7, resolvedHash: "hash-1" }, () => null)).toThrow(/faulted/);
    lease.dispose();
  });

  it("rejects non-SVG roots and installs one global authority port", () => {
    const authority = new GasperVectorProjectionAuthority();
    expect(() => authority.claim(fakeRoot("root-f", "div"), "w", "production")).toThrow(TypeError);
    const installed = installGasperVectorProjectionAuthority(new GasperVectorProjectionAuthority());
    expect(getGasperVectorProjectionAuthority()).toBe(installed);
    expect(() => installGasperVectorProjectionAuthority(new GasperVectorProjectionAuthority())).toThrow(/split-brain/);
  });
});

describe("GASPER-VEC-401 pressure -> material coupling", () => {
  const baseInput = (overrides: Partial<PressureMaterialInput> = {}): PressureMaterialInput => ({
    revision: 7,
    energy: { energy_level: 0.62, energy_pulse: 0.31, internal_glow: 0.44 },
    dynamics: { motion: 0.55, coupling: 0.4, rebound: 0.2, inertia: 0.3 },
    relief: { relief_amplitude: 0.4, relief: 0.3, texture_scale: 0.5 },
    material: { key_intensity: 0.58, rim: 0.62, normal_strength: 0.58, curvature_response: 0.48, texture: 0.56 },
    time: 3.2,
    delta: 1 / 60,
    ...overrides,
  });

  it("bounds every response channel across a drive sweep", () => {
    for (let i = 0; i <= 20; i += 1) {
      const level = i / 20;
      const response = evaluatePressureMaterialCoupling(
        baseInput({
          energy: { energy_level: level, energy_pulse: 1 - level, internal_glow: level * 0.5 },
          dynamics: { motion: level, coupling: 1 - level, rebound: level * 0.4, inertia: (1 - level) * 0.6 },
          time: i * 0.37,
        }),
      );
      expect(response.pressure).toBeGreaterThanOrEqual(-1);
      expect(response.pressure).toBeLessThanOrEqual(1);
      for (const value of [response.shellCompliance, response.reliefGain, response.materialCoupling]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      expect(response.phase).toBeGreaterThanOrEqual(0);
      expect(response.phase).toBeLessThan(Math.PI * 2);
      expect(Number.isFinite(response.phase)).toBe(true);
    }
  });

  it("excludes frame time from the causal identity hash", () => {
    const a = evaluatePressureMaterialCoupling(baseInput({ time: 0 }));
    const b = evaluatePressureMaterialCoupling(baseInput({ time: 999.5, delta: 0.25 }));
    expect(a.hash).toBe(b.hash);
    const c = evaluatePressureMaterialCoupling(
      baseInput({ energy: { energy_level: 0.9, energy_pulse: 0.31, internal_glow: 0.44 } }),
    );
    expect(c.hash).not.toBe(a.hash);
    const d = evaluatePressureMaterialCoupling(baseInput({ revision: 8 }));
    expect(d.hash).not.toBe(a.hash);
  });

  it("applies the response onto material targets without taking render ownership", () => {
    const response = evaluatePressureMaterialCoupling(baseInput());
    const applied = applyPressureMaterialResponse({ key: 0.5, pearl: 0.7 }, response);
    expect(applied.key).toBe(0.5);
    expect(applied.pearl).toBe(0.7);
    expect(applied.intensity).toBe(response.materialCoupling);
    expect(applied.transport).toBe(response.reliefGain);
    expect(applied.pressure).toBe(response.pressure);
    expect(Object.isFrozen(applied)).toBe(true);
  });
});
