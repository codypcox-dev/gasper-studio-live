# Walk arrival 8 — 2026-08-14

life8 kept tall arrival (gather 5s/8s ~0.09). The hold looked still.
Kernel idle swung. bodyRect H moved. Stars in the picture did not.

## Painter-dead vs encode-dead

Live-page probe at t=5.5 / 6.5 / 7.5 (Playwright evaluate, not the mp4):
painted hull, postureScaleY, physIdle, overall_height, 3 star positions
or star-field centroid, restFloor, motion.value, life, gather,
setPhysicsIdle present.

- Identical on the LIVE page → painter still dead. Find the remaining pin.
  Do not raise bbox.
- Differ on the LIVE page and the mp4 is a still → encode dropping hold
  frames. Fix encode (1:1, every JPEG, no duplicate squash).

## Remaining pin (stars)

life8 drifted idle.reflection onto violetFieldNode / cyanFieldNode.
The visible stars are materialFlecksLayer + legacy cosmicFlecks.
Those layers stayed cached / mesh-locked. Field glow is not the
constellation.

## Cut

- Life-floor constellation drift on fleck-01..24 and legacy cosmicFlecks
  (same ±10/±8 as the field, on the dots).
- Rebuild cosmicFlecks every frame while restFloor > 0.001.
- Pass max(motion, lifeFloor) into vector-material motion.
- getPaintProbe() for the live-page table.
- Encode 1:1: every JPEG listed, concat+duration, no duplicate squash.

Not a gather write. Not TAKE-on-idleScale. Not a bbox raise.

## Keep

facingReadableLocomotionYawDeg, contact hold, walk gather during walk,
_plantHoldX off body, yaw 360, CSS floor, zoom-2, travel writer,
encode 1:1, arrived gather freeze (~0.08–0.12), squash/stretch during walk.

## Recapture

research/proofs/grok-successor-002/take-stroll-z2-life9-20260814
newLiveDocument, holdUserWorldFrame zoom 2, Auto Fit off, one-time dais clip
wander {x:980, z:48, cruise:200}, 8.0s real, life on
mp4 >=7.5s, 20fps, t0/mid/arrival/t-end. Delete JPEG/_vf after encode.
live-probe.json required.

Pass: walk+tall arrival KEPT, and a stranger can see the stop live.
Identical live-probe = FAIL. Frozen mp4 = FAIL. Gather 0.59 = FAIL.
No 10/10.
