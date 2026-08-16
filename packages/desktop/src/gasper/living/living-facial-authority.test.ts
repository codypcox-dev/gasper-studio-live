/**
 * GASPER-FINISH-01 / Task 3 (VEC-601/602) — living/facial authority focused test.
 *
 * Proves locally (structural suite referenced by the lock is absent here):
 *  1. Numeric-only authority: the module owns no RAF, timer, GSAP, DOM, SVG,
 *     or global-install surface (source-wiring proof).
 *  2. Deterministic seeded replay: identical seed + identical frame sequence
 *     yields identical channel values and snapshot hashes.
 *  3. One owner per facial channel: every FACIAL_TEMPORAL_BINDINGS value is
 *     traced to facial_continuum or state_target — never an untracked writer.
 *  4. Reduced motion suppresses autonomous blink and saccade.
 *  5. Snapshot carries the packet identity and a deterministic hash.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  FACIAL_TEMPORAL_BINDINGS,
  GasperLivingFacialAuthority,
  type LivingFacialSnapshot,
} from "./GasperLivingFacialAuthority";

const HERE = fileURLToPath(new URL(".", import.meta.url));

function runSequence(seed: number, frames = 180): LivingFacialSnapshot[] {
  const authority = new GasperLivingFacialAuthority();
  authority.configure({ seed });
  authority.start("presence-neutral-settled", 0);
  const out: LivingFacialSnapshot[] = [];
  for (let i = 0; i < frames; i++) {
    out.push(
      authority.evaluate(
        { timeMs: i * (1000 / 60), deltaMs: 1000 / 60, frameIndex: i },
        { energy_level: 0.52 },
      ),
    );
  }
  return out;
}

describe("GasperLivingFacialAuthority (VEC-601/602)", () => {
  it("owns no RAF, timer, GSAP, DOM, SVG, or global install (source proof)", () => {
    const src = readFileSync(`${HERE}/GasperLivingFacialAuthority.ts`, "utf8");
    expect(src).not.toMatch(/requestAnimationFrame/);
    expect(src).not.toMatch(/setInterval|setTimeout/);
    expect(src).not.toMatch(/import\s+[^;]*\bgsap\b|require\(\s*['"]gsap/i);
    expect(src).not.toMatch(/\bgsap\s*\.\s*(to|from|fromTo|set|timeline|tween|registerPlugin)\s*\(/i);
    expect(src).not.toMatch(/document\.|createElement|querySelector/);
    expect(src).not.toMatch(/setAttribute/);
    expect(src).not.toMatch(/globalThis/);
  });

  it("replays identical values and hashes for identical seed and frame sequence", () => {
    const a = runSequence(1007);
    const b = runSequence(1007);

    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i]!.hash).toBe(b[i]!.hash);
      expect(a[i]!.values).toEqual(b[i]!.values);
      expect(a[i]!.ownership).toEqual(b[i]!.ownership);
      expect(a[i]!.frameIndex).toBe(b[i]!.frameIndex);
    }

    // A different seed diverges (seeded life is real, not constant).
    const c = runSequence(2042);
    const diverges = c.some((snap, i) => snap.hash !== a[i]!.hash);
    expect(diverges).toBe(true);
  });

  it("traces exactly one owner for every facial temporal channel", () => {
    const frames = runSequence(1007, 60);
    const legalOwners = new Set(["facial_continuum", "state_target"]);

    for (const snap of frames) {
      for (const bindingId of FACIAL_TEMPORAL_BINDINGS) {
        const value = snap.values[bindingId];
        if (typeof value !== "number") continue;
        const owner = snap.ownership[bindingId];
        expect(
          owner && legalOwners.has(owner),
          `channel ${bindingId} frame ${snap.frameIndex} owner=${owner}`,
        ).toBe(true);
      }
      // Unified substrate channels belong to the living authority itself.
      expect(snap.ownership.unified_breath).toBe("living_authority");
    }
  });

  it("suppresses autonomous blink and saccade under reduced motion", () => {
    const authority = new GasperLivingFacialAuthority();
    authority.configure({ seed: 1007, reducedMotion: true });
    authority.start("presence-neutral-settled", 0);

    expect(authority.triggerBlink()).toBe(false);
    expect(authority.triggerSaccade?.(0.4) ?? false).toBe(false);

    for (let i = 0; i < 600; i++) {
      const snap = authority.evaluate(
        { timeMs: i * (1000 / 60), deltaMs: 1000 / 60, frameIndex: i },
        { energy_level: 0.52 },
      );
      expect(snap.blinkActive).toBe(false);
      expect(snap.saccadeActive).toBe(false);
    }
  });

  it("emits packet identity, monotonic revisions, and deterministic hashes", () => {
    const frames = runSequence(1007, 30);
    let lastRevision = -1;
    for (const snap of frames) {
      expect(snap.authorityId).toBe("gasper-living-facial-authority");
      expect(snap.packet).toBe("VEC-602");
      expect(snap.hash).toMatch(/^[0-9a-f]{8}$/);
      expect(snap.revision).toBeGreaterThan(lastRevision);
      lastRevision = snap.revision;
      // Unified law frame validates clean on the production packet.
      expect(snap.unifiedViolations).toEqual([]);
    }
  });
});
