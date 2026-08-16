# Walk arrival 9 — 2026-08-14

life9 watched 4/10. Face and tall arrival held (gather 5s/8s ~0.09). Living stop 1/10.
The PAGE moved (paintedH 154/140/143). The FILE was a still. Two rAF on a stopped
driver did not put the hold in the JPEG.

life9b also 4/10: freeze still, plus a 1-frame SNAP at ~6s from the stretched walk
shape into a symmetrical home idle. Do not introduce that snap. Hold the arrived
walk silhouette.

## Cause

Clock.step then stopping RAF is why CDP fromSurface reuses a dead bitmap.
Do not step-then-stop. Keep the organism clock in realtime with RAF running
for the entire 8s capture, the way 5179 composites for a human.

## Cut (encode/compositor only)

1. Keep RAF / organism clock RUNNING for the entire 8s capture.
2. Screenshot the live compositor. If fromSurface:true caches, use fromSurface
   false or a full viewport shot after a real 50-100ms wall-clock wait.
3. Encode 1:1, every JPEG, >=7.5s file.

Do not recut the body. Do not write gather 0.594. Do not change gather hold,
idle amplitude, TAKE-on-idleScale (stays reverted), plant, yaw, travel writer.
Do not snap the arrived walk silhouette into a home idle.

## Keep

facingReadableLocomotionYawDeg, contact hold, walk gather during walk,
_plantHoldX off body, yaw 360, CSS floor, zoom-2, arrived gather freeze
~0.08-0.12, live-probe.json at 5.5/6.5/7.5.

## Recapture

research/proofs/grok-successor-002/take-stroll-z2-life10-20260814
newLiveDocument, holdUserWorldFrame zoom 2, Auto Fit off, one-time dais clip
wander {x:980, z:48, cruise:200}, 8.0s real, life on
mp4 20fps, t0/mid/arrival/t-end. Delete JPEG/_vf after encode.

Pass: walk+tall arrival KEPT, stranger can see the stop live IN THE FILE.
Frozen mp4 = FAIL. Gather 0.59 = FAIL. Home-idle snap = FAIL. No 10/10.
