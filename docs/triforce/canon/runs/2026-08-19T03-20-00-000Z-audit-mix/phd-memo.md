# Technical audit — live stack vs envelope law

**Mode:** investigate + Wave I implement. Dual killed: `snap-id = interpolation`.

## What is actually running

| Organ | Live writer | Law | Honest? |
|---|---|---|---|
| `#body` | `occupiedOutline` (5 disks + 4 stadiums → 512) | Rank-1 union | Yes, when `morphMix≈0` |
| Face | `viewFaceTransform` at (120, 112) | FACE_CANON | Yes |
| Cage interiors | `sampleCanal` rings 0–23 | canal wrap | Yes |
| Cage rim | ring 24 glued to the 512 | unglue after E6 | **Seam leftover** |
| Yaw | `rotateAboutM` about plant M | plant-yaw | Yes |
| Gait | `poseSkeleton` plants | plants only | Yes |
| Shade | xyz differences → 4 isobands | no 58-dome | Yes |
| Morph | **was** a snap id | interpolate the table | **This cut** |
| Ink | `closedSpline` | one `d` | Yes |
| Voigt | skipped on occupied | no `_lp` on isoline | Yes |

## The gap that mattered this pass

Named looks were **replacements**. Puff was a hard 1.07 on the silhouette only. Interiors stayed at rest `r`. Uniform 1.07 on torso–crotch is **already irregular** (`|Δr|=33.17 > 31.5`). So the table as shipped could not be a legal canal.

## What this cut did

Interpolate the 3-vector `(puff, collapse, hook)`. Named looks are presets. After mix, scale `r` then clamp `|Δr| < L−0.5`. Occupied, bind, shadow, and overlay all read those radii. Collapse is a 0..1 lerp, not a boolean.

Do **not** lerp the silhouette. That is two drawings.

## Gaps still open (ordered)

1. Ring 24 still glued — interiors can disagree with the rim.
2. Any FORM_PROFILE morph (`morphMix>0`) drops occupied and the gauss 512 returns.
3. No sliders on the 3-vector yet (host API is live).
4. A Y of spheres cannot be a wide pearl and a W. Slimmer belly is physics, not a bug.
5. RBF waits for an off-axis sculpt (puff+paddle as a fifth row).
6. `isoCoat` still thin. Lighting residual.

Next lawful slice: Wave II refractory rest→blowfish on the same fabric, then UI sliders. Do not unglue ring 24 until the seam is small.
