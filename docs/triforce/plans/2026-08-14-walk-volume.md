# Walk volume — 2026-08-14

life11 watched 3/10. Shear/tear 9/10 (contact lock gone — KEEP). Limbo/volume 2/10 (Y-scale duck, W +12px / 3.5% invisible). Home-idle SNAP at ~5s after deep crouch t=3s H=280. Living stop 1/10. Plant 2/10 skate.
Do not write life11. Do not put `_contactHoldX` back on the body.

## Causes (life11)
1. Width stayed flat to the eye. `gatherW` was exact area-complement (~10% on a 9% dip) and did not read. CSS `idleScaleY` got gaitSquash; `idleScaleX` did not — a second Y-only duck on top of the contour. Kernel W 342→354 (+12px) is not volume.
2. Home-idle SNAP: arrived hold drove `setPhysicsIdle` ±1 (13% height trough, t=3s H=280) then dumped toward a tall symmetrical idle at ~5s. Gather could freeze at 0.594 (puddle) or 0 (2× pop).

## Cut (walk only)
1. One screen-X writer. `_contactHoldX` / `_plantHoldX` stay OFF the body. Floor/shadow may stay planted. WorldPhysicsDriver remains the sole free-motion writer.
2. Volume must PAINT. Cartoon width-out: φ × area complement, and any painted height dip is forced to that width. CSS idleScaleX gets (1+gaitSquash) so the Y-duck also widens. Walk dip stays a step (≤15% H). Axis stays vertical.
3. No home-idle SNAP. Freeze arrived gather in 0.05–0.20 (never 0.594, never 0). Do not write a height idle trough. TAKE breath stays for living. TAKE-on-idleScale stays reverted.

## Keep
facingReadableLocomotionYawDeg, yaw 360, CSS floor, zoom-2, travel writer, TAKE-on-idleScale reverted, encode 1:1 with clock left in realtime.

## Recapture
research/proofs/grok-successor-002/take-stroll-z2-life12-20260814
newLiveDocument, holdUserWorldFrame zoom 2, Auto Fit off, one-time dais clip
wander {x:980, z:48, cruise:200}, 8.0s real, life on
clock realtime, no step-then-stop
mp4 >=7.5s, 20fps, t0/mid/arrival/t-end
Delete JPEG / _vf after encode

## Pass bar (not 10/10)
stranger-visible width-out on the dip, no home-idle snap, no tear lock, travel, face, tall arrival.
Limbo (H down, W flat to the eye) = FAIL.
Home-idle snap = FAIL.
Gather 0.59 = FAIL.
`_contactHoldX` back on the body = FAIL.
