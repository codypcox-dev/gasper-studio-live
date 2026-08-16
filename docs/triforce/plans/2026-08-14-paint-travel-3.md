# Paint travel 3 — long stroll — 2026-08-14

One writer, one mass, one screen position. Black room: one floor. No recut.

## Served tree

`C:\Users\funny\Documents\GasperStudio-worktrees\integrate-main-20260814` @ `4bb9af4b7099d2474df4414085779bc0a0a97b1a` (dirty `main`). 5179 Vite DEV/HMR is this tree (PID 39824). Travel writer not recut.

## Why this cut

Paint-2 both-edges passed (VIDEO lum>40 left +63, right +47) but WatchVideo read as an in-place 180 turn. 400u at 100% hold is ~50px by design (body.x/8). A stranger-readable stroll needs ~200-300px (1600-2400u).

## Probe

`research/proofs/grok-successor-002/take-stroll-long-20260814`

newLiveDocument, holdUserWorldFrame 100%, Auto Fit off, no panBy, one-time dais clip 960x758, `setLocomotion("wander", {x:2000,z:48,cruise:200})`, 12s @20fps. Reused paint-2 harness (params only).

### VIDEO (ffmpeg-decoded mp4 first/last, 960x758)

| | t0 | t-end | Δ |
|---|---|---|---|
| lum>40 left | 398 | 530 | **+132** |
| lum>40 right | 568 | 683 | **+115** |
| lum>40 width | 171 | 154 | -17 |
| chromaCx | 481.61 | 606.06 | **+124.45** |
| mid-edge | 483.0 | 606.5 | **+123.50** |
| kernel body.x | 0 | 980.000 | +980 |
| worldRig tx | 0 (attr removed) | 119.883 | +119.883 |

Stills t0 / t-end match the mp4 edges to 1px.

Cruise was 200 u/s until t=4.90 (x=966). Then the body oscillated 966-980 through t=12. Wander owner stayed true. Provenance stayed physics-authority.

He hit the Doctrine-2 wall: `worldBoundsAt(z).xHalf`. At z≈42, scale=1920/1962, xHalf=960/scale≈981. Target x=2000 is past the wall. Extra time cannot add travel.

### Pass bar (readable travel)

- Both lum>40 edges same direction: **pass**
- Mid-edge delta >= 180px: **fail** (123.50)
- Not in the center third at end (320-640): **fail** (mid 606.5, chroma 606.06)

100% hold projection is ~0.125 px/u. Wall max ≈980u → ≈120px. 180px would need ~1440u, past xHalf. Leaving the center third from a centered start needs ~157px / ~1256u, also past the wall. Did not zoom. Did not recut the writer, the wall, or yaw.

mp4: `research/proofs/grok-successor-002/take-stroll-long-20260814/stroll-long-20fps.mp4`

Owner visual acceptance: not self-issued.
