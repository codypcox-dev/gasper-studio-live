# Walk arrival 4 — 2026-08-14

Make the arrived stop LOOK alive to a stranger. Recapture zoom-2. Do not bring back the 2x pop.

## What failed (life4)
take-stroll-z2-life4-20260814 watched 6/10: travel 8, face 10, arrival pop 10 — KEEP. Living stop 1/10 — from arrival to end the PICTURE is a still. 11-12px / H 197-208 last-2s p2p is invisible. Unique frames and bbox wobble are not life. Encode played back ~6.5s of 8s (concat without duration + -r 20 resampled 25fps->20fps) and hid the hold.

## The cut
1. Amplitude a stranger can see. Raise idleHeight so last-2s VIDEO lum>40 height p2p is 24-40px on this ~200px gathered body (~12-20%). Period 1.2-1.6s (slow breath). No single-frame height jump > 10%.
2. Internal stars keep drifting after arrival. motionStrength goes to 0 at rest and unifiedDynamics scaleY=1; unstick field/star paints with starMotion = max(motion, lifeFloor) plus a local arrived-hold drift. Stars moving while the hull is still is acceptable extra; hull still + stars still is FAIL.
3. Encode 1:1. 8s at 20fps via image2 -framerate 20. Do not time-compress.

Do NOT: dump gather, rebuild BASE_CONTOUR, switch gatherAxis to volume, multiply idleRig by 1+physTake/phi^2, grow toward the t0 home blob. Arrival->t-end height ratio 0.80-1.20 (breath peak can be taller than arrival still; mean stop size must not double).

## Do not recut
facingReadableLocomotionYawDeg, contact hold, walk gather amount, _plantHoldX off body, yaw 360, CSS floor, zoom-2 hold, travel writer, gather hold, TAKE-on-idleScale (stay reverted).

## Recapture
research/proofs/grok-successor-002/take-stroll-z2-life5-20260814
Reuse life harness: newLiveDocument, holdUserWorldFrame zoom 2, Auto Fit off, one-time dais clip, wander {x:980, z:48, cruise:200}, 8.0s real, life on, 20fps mp4 + t0 / mid / arrival / t-end. Delete JPEG frames after encode. ffprobe duration >= 7.5s.

## Pass bar (not 10/10)
Travel + face + no pop KEPT, and a stranger can see the stop breathe without being told to look.
If the stop would still look frozen, FAIL. If he grows 2x, FAIL.
