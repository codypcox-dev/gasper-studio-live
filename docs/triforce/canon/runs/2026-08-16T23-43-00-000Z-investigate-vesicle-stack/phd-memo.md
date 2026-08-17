# CanonOps PHD — investigate · vesicle-stack

Earned under N20 / N335.
Date: 2026-08-16T23:43:00.000Z
Tri-Force: 3.0.0

## 1. THE WALL

The owner's still is a mid-purple gel: distinct discs *inside* a luminous volume, cyan well visible through them, glass coat on top, face last. Live is a near-black pearl with 390 overlapping #e6ccfa discs appended as the last child of the clip. Dual: `foam-on-black = vesicles-in-gel`.

## 2. STACK (painter's algorithm)

Lawful (the still):

```
body (mid-purple gel)
  → cyan well
  → far vesicles (small, absorbed)
  → near vesicles (larger, paler)
  → key / fill / rim  (shell BRDF)
  → face
```

Live (broken):

```
body (#02010f) + opticalDepth (#01000a · 0.88 · layer 0.48)
  → cyan, cores, flecks
  → key gloss
  → 390 discs appended LAST inside the clip   ← buries gloss + cyan
  → face (outside clip — the only layer that survived)
```

`appendChild(reliefLayer)` every frame is the reorder. Measured: relief is last in `#chromaticShell > clip`.

## 3. COMPOSITE MATH

SVG: `C = α Src + (1−α) Dst`.

- `bodyBase` is black until the last 9% of radius. Interior ≈ `#02010f`.
- `opticalDepth` then multiplies a near-black veil. Center ≈ black.
- One disc: `0.82 · #e6ccfa + 0.18 · #02010f` ≈ muddy lavender.
- Three overlaps → solid #e6ccfa. The gel is gone. Cyan is gone. Gloss is gone.

The still needs the *inverse*: low-α discs over a *lit* gel so the purple and the teal remain the field.

## 4. SAMPLE MATH

Cage is 25×40. Equator spacing ≈ π·140 / 40 ≈ 11 px. Max radius 12 px. Keep 44% of verts → 390 sites. Neighbors overlap completely. Hash-on-index is a polar lattice, not a Poisson disc. The still is organic, ~120–180 discs, gaps showing gel.

`n̂ · L` is computed and then unused for color. Every disc is the same hex. No far/near. No Beer. No face-plate skip.

## 5. WHAT TO CUT / WHAT TO KEEP

| Thing | Verdict |
|---|---|
| `appendChild(relief)` to last | Cut. Insert before `keyReflectionLayer`. |
| opticalDepth 0.48 · #01000a | Cut crush. Veil stays, opacity ~0.14. |
| bodyBase interior black | Lift to mid-purple. The still is not a black pearl. |
| 390 lattice discs α=0.82 | Cut. Poisson ~150, α 0.32–0.48, two depths. |
| Face outside clip | Keep. |
| Cyan well / key gradients | Keep. They must *show*. |
| 1000-length field | Keep. Sites are a subset, not a remesh. |

## 6. NOT A NEW BODY

Topology stays 25×40. Vesicles are a subset of the cage, depth-sorted, under the shell BRDF. Gain 0 / Neutral still has the gel (this is the identity, not a preset sticker).
