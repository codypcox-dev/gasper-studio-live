# CanonOps PHD — explore · anisotropic-reflections

Earned under N20 / N335.
Date: 2026-08-17T01:16:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-17T01-16-00-000Z-explore-anisotropic-reflections
Parent: explore · pbr-shader

## 1. THE WALL

PBR is live as **isotropic GGX**. One α. The highlight is a round island. When the W pulls, when he runs, when a handle stretches, the spec does not streak. Dual: **`isotropic-blob = stretched-fiber-highlight`**.

The old KEY_ANCHORS slash *looked* anisotropic. It was glue at a fixed θ. It is muted. Do not bring it back.

## 2. THE LAW

Isotropic D cares only about `n·h`. Anisotropic D cares where `h` sits in the tangent frame:

```
hx = H · T
hy = H · B
hz = H · n
```

Disney / Burley 2012 (the production close):

```
aspect = √(1 − 0.9 a)
αx = r² / aspect
αy = r² · aspect

D = 1/(π αx αy) · 1 / ( (hx/αx)² + (hy/αy)² + hz² )²
```

`a = 0` ⇒ `αx = αy` ⇒ today’s GGX. That reduction is the rest identity.

Smith G must use the same `αx, αy` (Heitz 2014). Mix isotropic G with anisotropic D and energy leaks.

## 3. WHERE T AND B COME FROM

Not from the screen. Not from KEY_ANCHORS.

The cage already builds them every shade:

```
T = ∂P/∂u     # sector, wraps
P_v = ∂P/∂v   # ring
n̂ = T × P_v
```

Feed that T (and `B = n̂ × T`) into D. Same stencil. No new mesh.

**Heitz stretch** is the Gasper source of `a`, not a new slider:

```
a = saturate( | ℓ_T / ℓ_T0  −  ℓ_B / ℓ_B0 | )
```

Rest edges equal → `a = 0` → round glint. A pulled meridian → `a > 0` → streak along the pull.

Pole: `v → 0`, T vanishes. Clamp `a = 0` for `v < 0.08`.

## 4. WHAT IS NOT THE LAW

| Model | Why not |
|---|---|
| Kajiya–Kay / Chiang hair | Fibers. He is gel. |
| Ward | Old ellipse. Not the close. |
| Painted brow slash | Fixed θ. Glue. |
| Screen-space T | Highlights park again after idleRig. |
| Aniso at rest | Brushed bowling ball. |
| Aniso on FACE_CANON | The face is not brushed metal. |
| Aniso on the coat | Coat is the isotropic gel skin. Base lobe may streak. |

Ashikhmin–Shirley 2000 is the ancestor (two Phong exponents + energy-aware diffuse). Disney swapped D for GGX. We take Disney.

## 5. PHYSICAL vs ARTISTIC

Physical: stretched microsurface → different α along T vs B → elongated highlight, lower peak. Rest is isotropic.

Artistic: rest stays a round crawling glint. Stretch may streak. Intensity-only. No hair. No chrome. Coat round. Face untouched. `a = 0` path byte-identical.

## 6. NOT THIS RECEIPT

Explore only. Painter not recut.

If Work: keep today’s GGX as `a = 0`. Add T,B + Disney `αx,αy` + matching Smith. Derive `a` from rest/live edge stretch. Clamp the pole. Leave the coat isotropic. Do not revive KEY_ANCHORS.
