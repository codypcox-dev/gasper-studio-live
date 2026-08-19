# NORTHSTAR — GASPER-ENVELOPE-001

**Id:** `GASPER-ENVELOPE-001`  
**Name:** The Medial Envelope  
**Status:** LAW WRITTEN — CanonOps earned 2026-08-19T02. Impl plan in `docs/triforce/plans/2026-08-19-envelope-001.md`  
**Engine:** Tri-Force 3.0.0  
**Parents:** `NORTHSTAR-CAGED-HULL.md`, medial-fabric, isophote-banding, marching-cubes (refused as body)  
**Packets:**
- `canon/runs/2026-08-19T02-00-00-000Z-explore-canal-sweep`
- `canon/runs/2026-08-19T02-10-00-000Z-explore-occluding-contour`
- `canon/runs/2026-08-19T02-20-00-000Z-explore-medial-skeleton`
- `canon/runs/2026-08-19T02-40-00-000Z-investigate-envelope-clean`

**Chase this** for shape. Chat is transport.

---

## 0. One sentence

Gasper is the **envelope of spheres along an authored 3D medial skeleton**; the 25×40 are **samples of that envelope**; `#body` is the **occluding contour of the projection** this frame — never an authored 2D pancake with a z sticker.

## 1. Duals (already earned, now locked)

| Lie | Law |
|---|---|
| authored 512 = shape | 512 = outline *this frame* |
| `z = 58√(1−v²)` = 3D | 3D = envelope; z is a sample |
| one pole = two legs | two limb bones, two charts |
| rotate the drawing | rotate the skeleton in R³ about M |
| volume-iso = body | no voxels, no MC skin |
| dist≤r = convolution | sphere-sweep / canal. Convolution bulges the W and wants a volume |
| poisson-set = chart | blue-noise may mask goose, never write XYZ |
| mesh-tool = cage | gradient mesh paints; envelope defines |
| extracted-medial = rest-lock | MAT flickers. Author 5 nodes like FACE_CANON |
| centroid-yaw = plant-yaw | Yaw about the navel tips the floor. Pivot is plant midpoint |
| gauss-W = medial-W | Two gaussians on a polyline are not two tubes |
| constant-r = W | A sausage cannot cleft. `r_C ≤ h − δ` |
| n̂·V-on-a-pancake = occluding-contour | Extractor on today’s loft is ring 24. Costume |
| hullFrontPath = body | Front rim of the cage is not the silhouette of the solid |
| radialEnvelope = outline | Star-convex polar ray-cast fills the W |
| farTuck = occlusion | Far foot dies interior to the union, not by an x-pull |
| plan-table = measurement | First-guess `r_F=58, r_T=64` is costume. Fit `r(u)` |

## 2. Objects

```
SKELETON (authored, rest-locked, 5 nodes)
  crown     FACE_CANON center
  torso     mid-stem
  crotch    W branch (sphere center, not the rim cleft)
  plantL    left foot sphere center
  plantR    right foot sphere center

BONES     crown—torso, torso—crotch, crotch—plantL, crotch—plantR
          torso—crotch may be interior (crotch ⊂ torso). It is topology.
          Surface-generating bones must satisfy |ṙ| < ‖ċ‖.

RADIUS    r(u) per bone     rest-authored, linear taper, shared node radius (G1)
          τ and morph SCALE it. They do not change topology.
          FIT ONCE so yaw-0 projection matches WISPWALKER_CANONICAL_CONTOUR.
          Do not ship the first-guess (58, 64, 8, 8).

ENVELOPE  { x : dist(x, bone) ≤ r(u(x)) }   canal / sphere-mesh EDGE
          NOT a convolution field. NOT an unsigned-distance field of a polyline.

CHART     u = bone parameter (piecewise), v = grassfire toward the envelope
CAGE      25×40 samples of the envelope in R³     LOCK
SILHOUETTE  Rank-1 = outer walk of 5 disks + 4 stadiums (ortho, exact)
            Rank-2 = Hertzmann–Zorin isoline of n̂·V — coupling check after E3+E4
PAINT     isobands of n̂·L / S_coat on the projection     (Wave 006)
```

## 3. Canal law (physical — do not negotiate)

A canal is the envelope of spheres along `c(u)` with radius `r(u)`. Regular iff

```
|ṙ| < ‖ċ‖      on a straight bone:   |r_B − r_A| < L
```

Sample (tilted characteristic, not an offset tube):

```
σ = (r_B − r_A) / L
n̂(θ) = −σ t̂ + √(1−σ²) (cosθ ê₁ + sinθ ê₂)
P(u, v, θ) = c(u) + v · r(u) · n̂(θ)
```

Shared endpoint sphere ⇒ G¹. Guy & Wyvill: blend **only authored edges**. No edge plantL—plantR. No `smoothmin`. No sphere-mesh face filling the W.

Convolution (`F = ∫ k`, Bloomenthal 1991, Cauchy, SCALIS) is a different solid. It fillets unauthored pairs and **bulges** at a 3-valent crotch (Bloomenthal 1997). It wants marching cubes. Refused.

A sphere is isotropic. Belly width = `2 r_T`. A wide pear **and** a W cannot both be a Y of balls. The envelope may be slimmer than the gauss pearl. That is a physical fact, not a tuning bug. `r(u)` is fit to the 512; we do not spend regularity to buy pear-width.

## 4. Chart lock (25×40 — no remesh)

```
rings  0–16   torso/crown.  ring 0 = FACE_CANON (120, 112).
rings 17–24   split L/R plant by sector (0–19 left, 20–39 right).
ring 24       glued to the live 512 until E6.
```

`v = d_med / r(u)`. Meridians **die at the crotch**. Far samples with `n̂·view < 0` do not paint and do not own the silhouette.

n̂ = ∂P/∂u × ∂P/∂v from actual xyz. The dome `z0 = 58√(1−v²)` in `shadeCagePoints` is a costume the moment interiors follow the sweep.

## 5. Plant-yaw

```
X' = M + R_Y(θ)(X − M)
```

World-Y through the plant midpoint (double support) or the planted contact (single). Plants stay on the floor. Crown x moves. Floor does not tip.

Kill `facingCompress` about the 512 centroid. Kill `z = ox·sin + z0·cos`. Do not import `rotateViewXYZ` from `Mesh3D.ts` (origin pivot).

## 6. Occupied outline (E6 only)

```
Ω     = ⋃ 5 disks ∪ ⋃ 4 stadiums     (ortho projection of the posed skeleton)
#body = ∂Ω⁺  →  arc-length 512  →  closedSpline
```

The W is a union valley. No Pac-Man. Far foot dies interior to Ω, not as `farTuck`.

Hertzmann–Zorin `{n̂·V = 0}` on the cage is the **coupling check**, never the ink. Extractor on today’s loft is empty or = ring 24 (`n·V > 0` on any graph `z=f(x,y)`).

`closedSpline` stays the only `d`. Voigt is **not** applied to extracted xy. `kappaBoxLower` muted on extracted samples. Path-take schema does not change in the extractor commit.

## 7. Invariants

- `liveGridXYZ.length === 3000`
- FACE_CANON / `viewFaceTransform` (120, 112) do not move when the envelope remaps
- Gait writes **plants** (and only plants), and only **after** bones exist
- One `#body`. One clip. No second hull
- Metallic = 0. D-0033. No pupils (S6)
- Far samples with `n̂·view < 0` do not paint and do not own the silhouette
- Rest `#body` bbox height **173.5 ± 1**. Never “correct” to 168.3 or to a sausage 144
- `|ṙ| < ‖ċ‖` on every surface-generating bone, every frame
- `r_C ≤ h − δ` or the floor between the feet is inside → U
- Engine 3.0.0. Surgical `all-script-3.js`. No `CageHull.ts` / `EnvelopePainter.ts`

## 8. What this file is not

Not a voxel engine. Not AdaptiveShell 3D revived as paint. Not QuadWild. Not “put a better dome on the 512.” Not convolution. Not an extracted MAT. Not a lock of the first-guess radii `(58, 64, 8, 8)`.

Implementation plan lives in `docs/triforce/plans/2026-08-19-envelope-001.md`.
