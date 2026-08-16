/**
 * GASPER-NORTHSTAR-001 (N60) — the pack world-pose compose + release law.
 *
 * LIVE OUTPUTS: authored world_x/world_z ride as an ADDITIVE OFFSET over the
 * LIVE physics base (the kernel body's floor pose read at each output — the
 * body keeps its physical motion while the pack owns the pose; a hop happens
 * WHERE the walker is, never a teleport to an authored start). The composed
 * velocity = body velocity + authored derivative (≈ body velocity at the flat
 * ends) — C1 across the authority boundary. Null base => the pack stays
 * absolute (back-compat, no physics driver).
 *
 * RELEASE (the pack's provenance-'none' output): when a LIVE physics base is
 * present (the kernel is armed and owns the pose stream), the release
 * SPATIALLY YIELDS — it writes nothing, so the latest physics tick remains
 * the sole world authority and the handoff is position- and velocity-
 * continuous regardless of where the body is (a short hop may end mid-walk —
 * the yield keeps the body's own pose authoritative; no reliance on recall
 * timing). The provenance:'none' => home law is NOT weakened: it is simply
 * not exercised when a live authority is already on the wire. With NO physics
 * base (a pack run standalone), the legacy none => home release is preserved
 * exactly (the renderer's WorldSpace fence clamps it to WORLD_HOME_POSE).
 */
export function composePackWorldPose(
  authored: Readonly<{
    x: number;
    y: number;
    z: number;
    tilt: number;
    provenance: string;
  }>,
  base: Readonly<{ x: number; z: number }> | null,
): Readonly<{ x: number; y: number; z: number; tilt: number; provenance: string }> {
  return base
    ? { ...authored, x: authored.x + base.x, z: authored.z + base.z }
    : authored;
}

export type PackReleaseWrite =
  | { kind: "yield" } // a live physics base owns the pose stream — no write
  | {
      kind: "pose"; // legacy: the provenance-'none' release passes through
      pose: Readonly<{ x: number; y: number; z: number; tilt: number; provenance: string }>;
    };

/**
 * The pack-END release law (see the module doc): YIELD when a live physics
 * base owns the world stream, else pass the 'none' pose through (the
 * WorldSpace fence then clamps it to home — the legacy behavior).
 */
export function resolvePackRelease(
  releasePose: Readonly<{ x: number; y: number; z: number; tilt: number; provenance: string }>,
  physicsBase: Readonly<{ x: number; z: number }> | null,
  physicsArmed: boolean,
): PackReleaseWrite {
  if (physicsBase && physicsArmed) return { kind: "yield" };
  return { kind: "pose", pose: releasePose };
}
