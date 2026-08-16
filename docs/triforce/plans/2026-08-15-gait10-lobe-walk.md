# Plan — restore the gait10 walk on the seq18 pearl

**Date:** 2026-08-15  
**Residual:** the drawing does not walk  
**Authority stills:** seq18 t0 (rest identity) · gait10 t1/t3 (walk)

## What the older tapes show

| Tape | Picture |
|---|---|
| seq18 t0 | Tall pearl, big face, two cyan lobes, deep cleft. Rest identity. |
| gait10 t0 | Same identity, closer. |
| gait10 t1 / t3 | **Walk:** planted lobe on the floor, swing lobe lifted, black air gap, face still full. One membrane. |
| gait10 samples at 1s | `heading -21`, `gaitBob -3.5`, `gaitSwayX 1.2`, `plantX -33`. The walk is the **lobe air gap**, not a 28 px root whip. |
| livewalk 20260814 | Older sculpt with arm nubs; still two-root. Not the seq18 face. Do not restore this sculpt. |
| stroll-z2 mid | Torn face. Do not restore. |
| n327 10s | Identity holds; rigid taxi. Kernel side/bob/plant live; renderer hid the W. |

## Do

1. Rest (`speedRatio < 0.01`): seq18 carve, both lobes at 1.0. No lift.
2. Walk: subtract `swingLiftUnits` (gait10 = 68 content px) from the **swing** lobe only, existing gauss at 1.31 / 1.83, σ=0.20. Planted lobe stays full. Cleft stays.
3. Modest planted extra on the loaded lobe from `loadedDropUnits` / `plantedCompress` — heavier plant, not a flatten pad.
4. Take the 224 u idleRig sway back off. gait10 sway was ~1 px. Keep a 2–3° idleRig lean only.
5. Shadow keeps `plantedScreenXUnits`. Cyan stays on the hull.
6. Flatten / `walkLean` / `walkPostX` stay off.
7. Seat at 5.2s already drops speed → lift goes to 0 (rest carve).
8. Heading 0 is superseded by N329/N306 — walk proof uses readable 3/4 (−22°). Zoom stays 1 on live 5179.

## Do not

- `posed.y` swing-lift hole, `_plantHoldX`, flatten, worldRig roll/sway.
- Restore the livewalk slider sculpt or the stroll torn face.
- Reopen face/material (N238).
- Self-PASS.

## Proof

Unique 6s exact-120fps of `playNorthstarTwenty`. Review 0 / 1 / 2 / 3 / 5 on pixels vs gait10. Tests corroborate only.
