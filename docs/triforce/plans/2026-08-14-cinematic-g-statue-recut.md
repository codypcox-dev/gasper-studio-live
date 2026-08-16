# 2026-08-14 — cinematic-g frozen statue recut

**Worktree:** `C:\Users\funny\Documents\GasperStudio-worktrees\integrate-main-20260814` (5179 serves this tree)
**HEAD:** `4bb9af4b7` + uncommitted marble cuts + this recut
**Do not:** commit, push, Grimoire, clone, self-issue owner visual acceptance, start take-h until life paints on 5179.

**Sole free-motion writer:** `WorldPhysicsDriver`. Wander / life file `LocomotionIntent` only.
**One camera:** `holdUserWorldFrame` 100% after remount. No Auto Fit steal. No per-goal relock.
**One mass:** morph the live body. Do not `setProfile`+flush a second statue.

---

## Pixel / kernel

`take-20s-20260814-cinematic-g` filmed (mp4 337KB vs cinematic-f 1.3MB) then died on `rmSync(frames)` ENOTEMPTY — **no samples.json / receipt.json**. Kernel numbers below are cinematic-f (same harness family) plus g stills.

cinematic-f kernel: `activeXSpan` 1563.59, x -720 → +820, `gaitExpressionObserved` true, `pixelProjectionLock` true (DOM dataset, not watchVideo). Owner picture: frozen left 0-10s, morph 11-12s (4/10).

cinematic-g picture (watchVideo + stills t00/walk/t12/flight): small presence-shaped blob, no translation, no idle, no morph. UI wispwalker → presence ~14s. Camera did not steal. g active mp4 416KB vs f 1.2MB.

## Root cause

Marble cuts skipped **paint** when the form was already on stage, and the renderer **homes / settle-holds** whenever life floor is 0 and the body is near origin.

1. `GasperRigController.setEmbodiment` — early return when `currentProfile === id` skipped `paintLegacyAuthority` + `setMotion` + `requestOneFrame`. After `newLiveDocument` remount the SVG can sit as a dead poster labeled wispwalker. Living apply already correctly skips only `setProfile` (keep that).
2. `all-script-3.js` render loop — `_settledNow` (`_lifeFloor<=0.001 && !_awayFromHome`) freezes mesh/idle. Harness `setLifeEnabled(false)` + `setWanderEnabled(false)` + `startLiving({autoSequence:false})` keeps the floor at 0. `stopLiving` → `disarmWorldBody` emits provenance `none` (ease home).
3. `all-script-3.js` world pose — `provenance==='none' || motionStrength<=0.001` eases `worldPoseCurrent` to origin. Kernel x can move while the picture stays a centered statue.
4. `GasperStudioApp` first-run `holdUserWorldFrame()` + marble-cut `applyFitCamera`/`panBy` no-op while held. Capture could not set the 100% left-start frame. Body at world 0 + camera pan 0 = centered statue.

livewalk painted because wander was ON (`autoSequence:true`, substrate open, body away from home). g filed life locomotion with life/wander OFF.

## Recut landed (uncommitted, this tree)

- `all-script-3.js`: `_physicsLive` keeps `_settledNow` false while physics/life/wander own the pose. Physics-authority pose draws even if `motionStrength` glitches to 0. Idle/gait still gate on `motionStrength`.
- `GasperRigController.setEmbodiment`: same-form still paints the live SVG. Does **not** call `setProfile` / rebuild `BASE_CONTOUR`.
- `GasperRigController.applyPhysicsDriverOutput`: `writeLifeSubstrate(true)` while provenance is `physics-authority` (rest floor up; life director stays off).
- `capture-isolated-beat-120fps.mjs`: `releaseUserWorldFrame` then one `holdUserWorldFrame` after remount.

No camera steal restored. No second-statue `setProfile`+flush. No launchComet x0 rewrite. No new 20s take.

## Next

Confirm HMR on 5179 (life + a short walk). If life paints, film `take-20s-20260814-cinematic-h` (kill colliding capture PIDs first). If still a statue, next cut is `stopLiving` must not `disarmWorldBody` on a cinematic remount (keep the planted COM).
