# Paint travel 2 — 2026-08-14

One writer, one mass, one screen position. Black room: one floor.

## Served tree

`C:\Users\funny\Documents\GasperStudio-worktrees\integrate-main-20260814` @ `4bb9af4b7099d2474df4414085779bc0a0a97b1a` (dirty `main`). 5179 Vite DEV/HMR is this tree (PID 39824). `_plantHoldX` is gone from `sampleBodyForProfile` posed.x.

## Root cause

`all-script-3.js` already writes kernel travel onto `#worldRig`:
`translate(wDx) = (body.x / 8) * depthScale`. Last probe stored the live attribute: body.x 400.02 → `translate(48.783)`. Pose-home eases only when `provenance==='none'`. Physics-authority draws exactly. Capture was a one-time dais clip, not subject-close.

VIDEO lum>40 looked glued because a **second world** painted on top of the dais: `[data-cinematic-set="1"] .gwc-stage-slot::after` (static warm contact-ground, `z-index: 0`) plus slot/frame CSS gradients. Floor band y 560–640 in the last stills was byte-identical t0→t3. Body-core (lum>50) already traveled +58 / +42. WatchVideo's "rotate in place" was yaw on a pinned CSS floor.

## Recut

`packages/gasper-studio/src/dais-first/daisFirst.css`

Removed the cinematic-set stage gradients and the `::after` contact-ground. Slot/frame are `#000`. Chrome opacity recede kept. The only floor is worldRig's SVG ground/shadow (D-0112). WorldPhysicsDriver remains the sole free-motion writer.

Did not touch: yaw law, holdUserWorldFrame, plant floor/shadow, `_plantHoldX` (already gone), wander/life ownership, camera hold.

## Probe

`research/proofs/grok-successor-002/take-stroll-paint-2-20260814`

newLiveDocument, holdUserWorldFrame 100%, Auto Fit off, one-time dais clip 960×758, `setLocomotion("wander", {x:400,z:48,cruise:200})`, 4s @20fps.

| | t0 still | t3 still | Δ |
|---|---|---|---|
| lum>40 left | 398 | 457 | **+59** |
| lum>40 right | 568 | 610 | **+42** |
| chromaCx | 481.20 | 532.83 | **+51.63** |
| kernel body.x | 0 | 400.02 | +400 |
| worldRig tx | 0 (attr removed) | 48.783 | +48.78 |

mp4 f0→f65 lum>40: left +63, right +48, chromaCx +55.71.

Pass: both bright-core edges move. Neither pinned. Mid-edge ~50px matches projection (400/8 * 0.97561 = 48.78). Left/right not identical because yaw narrows the silhouette (width 171→154); yaw law not recut.

Owner visual acceptance: not self-issued.
