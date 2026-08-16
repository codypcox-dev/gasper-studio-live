# Walk arrival 6 — freeze the painted walk, not the plant crouch

life6 locked gather 0.594 at t=5.05 after walkingSupport fell. That value is
the walk-plant gather (1/phi eased), not the arrived walk silhouette. The
picture snapped from the tall rounded walk blob (~4.5s, gather 0.137) into a
wide flat puddle and held the crouch.

## Cut

Do not write gather = 0.594 (or any plant-crouch target) when he arrives.

On the first arrival-band / arrived frame, freeze the last painted *walk*
envelope (gather sampled while SupportExchange gatherTarget was not 1/phi).
If that gather is 0.2, hold 0.2. Then breathe +/- from that held height
(idle phase starts at 0 when travel is done, ease 0.6s). Do not ease toward
a deeper crouch. Do not dump gather to 0 (that is the 2x wall pop).

Long legs: stop plant-crouch pulses once inside the 220u arrival band so the
last wall plant cannot lock the puddle. Short legs keep walk volume until
walkingSupport falls.

## Keep

facingReadableLocomotionYawDeg, contact hold, _plantHoldX off body, yaw 360,
CSS floor, zoom-2, travel writer, TAKE-on-idleScale reverted, encode 1:1,
scaleY un-pin, stars life-floor.

## Recapture

research/proofs/grok-successor-002/take-stroll-z2-life7-20260814
newLiveDocument, holdUserWorldFrame zoom 2, Auto Fit off, one-time dais clip
wander {x:980, z:48, cruise:200}, 8.0s real, life on
mp4 >=7.5s, 20fps, t0/mid/arrival/t-end. Delete JPEGs after encode.

Pass: he arrives and STAYS the walk shape, then that shape breathes.
Puddle at 5s = FAIL. Gather 0.594 at 5s = FAIL. No 10/10.
