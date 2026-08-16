# Walk arrival — 2026-08-14

Kill the wall-arrival SCALE/POSITION POP and make the living stop visible. Keep the face. Keep travel. Recapture zoom-2.

## Residuals
1. Arrival pop. At the Doctrine-2 wall (~980u, ~5s) gather target dumped 0.60->0 in one beat when walkingSupport fell; envelope tau 0.18s (and a second envelope step in integrate) rebuilt overall_height. Residual plant CoG on body.x was zeroed while pathX still subtracted it, so x jumped. Recut: gatherReleaseTau = 1/phi; supportGatherTarget and residual CoG ease off over ARRIVAL_RELEASE_SECONDS. Do not snap overall_height. Do not rebuild BASE_CONTOUR. Do not change zoom-2 hold.
2. Visible living stop. Arrived-hold TAKE was in WorldPhysicsDriver and setPhysicsTake (eyes only). The picture froze because idle breath is ~2% and TAKE never reached idleRig scale. Recut: physTake expresses volume on idleScale (1 + take/phi^2). Life stays on. Last 1s of VIDEO must not be a duplicate of the arrival frame.

## Do not recut
contact hold, gather scale (2/phi^2 amount — only ease it off), _plantHoldX (stays off the body), yaw 360 law, facingReadableLocomotionYawDeg, CSS floor, zoom-2 hold, travel writer.

## Recapture
research/proofs/grok-successor-002/take-stroll-z2-life2-20260814
Reuse life harness: newLiveDocument, holdUserWorldFrame zoom 2, Auto Fit off, one-time dais clip, wander {x:980, z:48, cruise:200}, ~8s, life stays on, 20fps mp4 + t0 / mid / arrival / t-end. Delete JPEG frames after encode.

## Pass bar (not 10/10)
Travel readable, no jarring scale pop; face stays; last second is alive.
