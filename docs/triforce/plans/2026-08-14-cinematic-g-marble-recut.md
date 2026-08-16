# cinematic-g marble recut — paint pose even when setProfile is skipped

Root cause of the 1/10 statue: `all-script-3.js` eased `worldPoseCurrent` home whenever `motionStrength<=0.001`, so physics-authority `body.x` never became `worldRig` pixels. The marble `setProfile` skip then also left morph/UI able to flip without a mesh write. Stripping panBy COM-follow revealed the statue.

Recut:
- In-flight provenance draws exactly. Only `provenance==='none'` eases home.
- `applyPhysicsDriverOutput` still writes pose/gait/life and `requestOneFrame` when `setProfile` is skipped.
- `setProfile` skip stays for topology (no second statue).
- Paint probe: `WorldPosePaint.test.ts` — body.x 400u => 50px worldRig travel at home depth.

Do not treat kernel `pixelProjectionLock` as the picture.
