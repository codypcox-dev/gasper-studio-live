# Walk arrival 7 — 2026-08-14

life7 kept the tall arrived walk (gather 8s = 0.085, no puddle). The hold
was a still. Kernel idle already swung ±0.96. The picture did not.

## Why the hold was a still

1. Star drift was gated on unifiedDynamics. Isolated walk proofs run
   eightStateLoop=false, so the extra ±10px field drift never ran.
   leftover idleCycleAt reflection is ~2px — invisible. Stars look frozen
   when motion.value is low.
2. applySemanticPose overall_height is skipped when the living pose carries
   unified_volume_scale_y (_livingVol). Living flush can stomp or skip the
   physics height. HMR of all-script-3.js?raw often misses the mounted
   document, so the painter never got the un-pin.
3. bodyHeld froze cycleSeconds+idle even if the life floor was up.

## Cut

Paint the hold in the painter (all-script-3), not the bbox.

- Ungate star drift: if(_lifeFloor>0.001) use cycleSeconds. Not unifiedDynamics.
- bodyHeld freezes cycleSeconds/idle only when _lifeFloor<=0.001.
- setPhysicsIdle(signed -1..1). sampleBody volumeY *= (1+0.13*physIdle).
  Not idleRig*(1+physTake/phi^2). Not a gather write.
- _livingVol is unified_volume_scale_y only (physics height still admits).
- Idle height pulse is painter-owned. Do not also add it on the gather delta
  (that is the 2x pop).

## Keep

facingReadableLocomotionYawDeg, contact hold, walk gather during the walk,
_plantHoldX off body, yaw 360, CSS floor, zoom-2, travel writer, encode 1:1,
scaleY un-pin, arrived gather freeze at the painted value (not 0.594).

## Recapture

research/proofs/grok-successor-002/take-stroll-z2-life8-20260814
newLiveDocument, holdUserWorldFrame zoom 2, Auto Fit off, one-time dais clip
wander {x:980, z:48, cruise:200}, 8.0s real, life on
mp4 >=7.5s, 20fps, t0/mid/arrival/t-end. Delete JPEG/_vf after encode.

Pass: life7 no-snap + plant KEPT, and the stop is visibly alive.
Gather ~0.59 at 5s = FAIL. Frozen hold = FAIL. No 10/10.
