# Walk arrival 2 — 2026-08-14

Stop the 2x scale SNAP at the wall. Hold the arrived silhouette. Breathe small. Keep the face. Keep travel. Recapture zoom-2.

## What failed (life2)
take-stroll-z2-life2-20260814 watched 4/10.
- Face 10/10 — KEEP facingReadableLocomotionYawDeg
- Travel 6/10 — he still goes right
- Arrival pop 1/10: between 4s and 5s he instantly becomes ~twice as large and snaps further right. Hard snap, not an ease.
- Living stop 1/10: dead freeze after the pop
- Arrival still W=317 H=224 vs t-end W=405 H=392. Height 224->392 IS the pop.

Do not claim ease if the picture doubles.

## The cut
When he arrives (wall / speed < 40 / walkingSupport falls):
1. HOLD the current painted silhouette. Do not dump gather 0.618->0. Do not rebuild BASE_CONTOUR. Do not zero support CoG in a way that jumps pathX. Freeze envelope at the arrived values. CoG peel only, over >=2 seconds.
2. TAKE/breath must be small (a few percent). Reverted idleRig multiply by 1+physTake/phi^2 — that stacked with gather release into a 2x pop. Eyes can take; body volume at the stop is a 2-5% idle, not a scale-up. No volume-axis gather switch at arrival.
3. Last 1s of VIDEO must move a little (stars, 2-5% height) without a size jump.

## Do not recut
contact hold, gather amount during the walk, _plantHoldX (stay off the body), yaw 360, readable locomotion yaw, CSS floor, zoom-2 hold, travel writer.

## Recapture
research/proofs/grok-successor-002/take-stroll-z2-life3-20260814
Reuse life harness: newLiveDocument, holdUserWorldFrame zoom 2, Auto Fit off, one-time dais clip, wander {x:980, z:48, cruise:200}, ~8s, life stays on, 20fps mp4 + t0 / mid / arrival / t-end. Delete JPEG frames after encode.

## Pass bar (not 10/10)
Travel readable, face stays, no 2x pop, stop is alive and the same size.
