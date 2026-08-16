# Walk plant read 4 — 2026-08-14

## Wall
Plant3 travel still paints (~250px both edges) and gather is stranger-visible (~60px). The contact lock was nub-only (gauss 1.27/1.87 σ=0.22 and ny>0.70*ry), so a stranger saw the whole cyan blob slide as one piece. Living stop read as a freeze.

## One writer
WorldPhysicsDriver remains the sole free-motion writer. wander/life stay LocomotionIntent only. Do not put `_plantHoldX` on the whole body. Pin the ENTIRE visible cyan W / bottom ~25-30% of the silhouette at `plantedScreenXUnits` during a committed plant. Upper mass `posed.x` unchanged. `worldRig` / `body.x` stay the sole travel writer. After push-off / exchange, contact hands off to the next plant.

## Recut
1. Contact hold: `_contactHoldX = plantedScreenXUnits / unitsPerContentPx` (no sway subtraction, no whole-body `_plantHoldX`). `_baseStart = 0.44*ry` so ny>=baseStart is fully world-locked (bottom ~28% of height, weight=1) with a short fade above. Nub gauss stays as a floor, not the lock.
2. Living stop: keep plant2 arrived-hold TAKE breath in WorldPhysicsDriver (locomotion + contact + speed < 40). `writeLifeSubstrate` stays open after halt via physics-authority. No `setLifeEnabled(false)` from the kernel.
3. Recapture the same z2 harness to `research/proofs/grok-successor-002/take-stroll-z2-plant4-20260814`.

## Pass bar (not 10/10)
Travel readable. A stranger can see the cyan base stick then release at least twice while the belly moves past it. Living stop is not a freeze.
