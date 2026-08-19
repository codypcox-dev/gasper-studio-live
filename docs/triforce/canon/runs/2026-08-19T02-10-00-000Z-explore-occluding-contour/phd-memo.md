# CanonOps PHD — explore · occluding-contour

Earned under N20 / N335.
Date: 2026-08-19T02:10:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-19T02-10-00-000Z-explore-occluding-contour
Parents: envelope-audit · canal-sweep · marching-cubes · isophote-banding

## 1. THE WALL

Two costumes share a name.

| Costume | Lie |
|---|---|
| `authored-512 = silhouette` | The 512 *is* the shape |
| `n̂·V-on-a-pancake = occluding-contour` | Run Hertzmann–Zorin on today’s loft and you extracted a contour |

Today’s loft is a graph `z = 58√(1−v²)` on a 2D 512. For any graph, `n · V = 1/√(1+|∇f|²) > 0`. Γ is empty. `shadeCagePoints` builds n̂ with `uz=0`, so **n̂·V = 1 on the rim too**. Fallback = ring 24.

## 2. RANK-1 — DISK + STADIUM UNION

Orthographic projection of a sphere-sweep:

```
π(B(c,r)) = D(π(c), r)
π(bone)   = conv(D(A,r_A), D(B,r_B))   // stadium / tapered stadium
Ω         = ⋃ 5 disks ∪ ⋃ 4 stadiums
#body     = ∂Ω⁺   outer walk, arc-length 512, closedSpline inks
```

The W is a union valley at the 3-valent crotch. No Pac-Man notch. No third gauss. Far foot dies because it is interior to Ω (T-junction if an internal stroke is ever drawn), not because `farTuck` tucked a lobe.

## 3. RANK-2 — HZ IS A CHECK

Hertzmann & Zorin 2000: isoline `{n̂·V = 0}`, interpolated on edges, visibility by Appel. On a canal, Γ is known in closed form — it *is* the stadium union. HZ on a cage that actually samples the canal must Hausdorff-match Rank-1. That is the coupling check. HZ is **never** `#body` authority.

Legal only after E3 (xyz is the sweep) + E4 (yaw about M) + 3D n̂ (delete `uz=0`).

## 4. ILLEGAL EXTRACTORS

| Extractor | Why |
|---|---|
| `hullFrontPath` | Walks ring 24, skip `z<0`. That *is* the authored 512. |
| `radialEnvelope` | Star-convex polar ray-cast, 160 samples. **Fills the W.** Most dangerous costume. |

## 5. E6 GATE

Do not invert `#body` until E3 and E4 have filmed. Never in one commit: invert `#body` + remap bind + retarget face + delete `walkScaffoldZ`.

`closedSpline` stays the only `d`. Voigt is **not** applied to extracted xy. `kappaBoxLower` muted on extracted samples (`th` is a lie). Path-take schema does not change in the extractor commit. FACE_CANON / `viewFaceTransform` (120, 112) do not move.

## 6. VERDICT

`#body` is the occluding contour of the projection this frame. Rank-1 = disk/stadium union. HZ = check. Extractor on today’s loft is costume.
