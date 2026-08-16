# Walk plant read — 2026-08-14

## Wall
Zoom-2 stroll travel paints (both edges ~250px) but the body is a constant-height skate. Support-driven locomotion is live; the silhouette does not pay for a plant.

## One writer
`SupportExchange.gatherTarget` only. WorldPhysicsDriver already steps `stepPhysicsSilhouetteEnvelope` from that target. No second motion writer. No `_plantHoldX` on the body. No travel / yaw / CSS floor / Doctrine-2 recut.

## Recut
Old: gather fired in the exchange window (`absHold < PLANT_HOLD`). That pulse is shorter than `gatherTau`, so a 1 Hz stroll never holds a crouch — bottom edge undulates, no countable plants.

New: vertical gather ON committed support at `1/φ` of the jump PREP, held for `φ⁻²` s (capped at half a step), then the target drops so the envelope recovers on push-off. A stance-long gather left the stroll a crouched skate. Floor/shadow stay world-locked via existing `plantedScreenXUnits`.

## Capture
Reuse `take-stroll-z2-20260814/capture-stroll-paint.mjs` params. Save `research/proofs/grok-successor-002/take-stroll-z2-plant-20260814`. Pass: travel still readable AND a stranger can count at least 2 plants (base holds, body gathers, then push-off). Not 10/10.