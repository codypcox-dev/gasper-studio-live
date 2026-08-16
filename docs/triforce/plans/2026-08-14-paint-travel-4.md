# Paint travel 4 — zoom-2 one-shot hold stroll — 2026-08-14

One writer, one mass, one screen position. Black room: one floor. No recut of the travel writer or the Doctrine-2 wall. Frame the shot.

## Served tree

`C:\Users\funny\Documents\GasperStudio-worktrees\integrate-main-20260814` @ `4bb9af4b7099d2474df4414085779bc0a0a97b1a` (dirty `main`). 5179 Vite DEV/HMR is this tree (PID 39824). Travel writer not recut. Wall not moved.

## Why this cut

Long stroll `take-stroll-long-20260814` proved paint is live (both lum>40 edges +132 / +115, chroma +124, worldRig tx +119.883, kernel +980) but he hit `worldBoundsAt(z).xHalf` ~981 at t~4.9s. At 100% hold the wall max is ~120px. A readable bar (>=180px, leave center third) is impossible at 100% without moving the wall. `CINEMATIC_ZOOM = 2` was authored so ~120 world-px reads as ~240 screen-px. Previous zoom-2 failures were Auto Fit / lockCinematicCamera stealing the frame.

## Probe

`research/proofs/grok-successor-002/take-stroll-z2-20260814`

Reused the stroll-long / paint-2 harness (params only). `newLiveDocument`, after remount `releaseUserWorldFrame` then `holdUserWorldFrame({ zoom: 2, panX: 0, panY: 0 })`. Auto Fit off. No lockCinematicCamera. No subject-close. No per-goal relock. No panBy follow. One-time dais clip 960x758. `setLocomotion("wander", {x:980,z:48,cruise:200})`, 8s @20fps.

### Fence (all 161 samples)

zoom=2, panX=0, panY=0, autoFit=false, userWorldFrameHeld=true. Clip stayed `{x:40,y:76,width:960,height:758}`. Hold was not stolen.

### VIDEO (ffmpeg-decoded mp4 first/last, 960x758, 130 frames @20fps)

| | t0 | t-end | Δ |
|---|---|---|---|
| lum>40 left | 317 | 583 | **+266** |
| lum>40 right | 657 | 892 | **+235** |
| lum>40 width | 341 | 310 | -31 |
| chromaCx | 483.75 | 735.12 | **+251.37** |
| mid-edge | 487.0 | 737.5 | **+250.50** |
| kernel body.x | 0 | 979.947 | +979.947 |
| worldRig tx | 0 (attr removed) | 119.506 | +119.506 |

Stills t0 / t-end match the mp4 edges to 1px (still t-end right=893).

Cruise 200 u/s until first body.x>=960 at t=4.9s, then pin at the wall (max body.x=979.947). Wander owner stayed true. Provenance ended physics-authority.

~2x the 100% take mid-edge (+123.50 -> +250.50). He walks right; camera does not follow; he occupies the right third.

### Pass bar (readable travel)

- Both lum>40 edges same direction: **pass**
- Mid-edge delta >= 180px: **pass** (250.50)
- Not in the center third at end (320-640): **pass** (mid 737.5, chroma 735.12)
- Hold stayed at zoom 2; autoFit stayed false; clip rect did not move: **pass**

Did not recut the writer, the wall, or yaw. Did not start cinematic-i / three-beat / Boo.

mp4: `research/proofs/grok-successor-002/take-stroll-z2-20260814/stroll-z2-20fps.mp4`

Owner visual acceptance: not self-issued.
