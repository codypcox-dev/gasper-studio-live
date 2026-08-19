# CanonOps PHD — explore · canal / sphere-sweep

Earned under N20 / N335.
Date: 2026-08-19T02:00:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-19T02-00-00-000Z-explore-canal-sweep
Parents: NORTHSTAR-ENVELOPE · medial-fabric · marching-cubes (refused as skin)

## 1. THE WALL

`dist ≤ r` looks implicit, so a helpful engineer writes `F = Σ ∫ k` “to make it smooth.” That substitution is the dual. The set `{dist ≤ r}` on one bone is a **canal volume**. The iso `{∫ k = c}` is a **different solid**. They agree only in a limit we do not live in.

## 2. THE OBJECT

A **canal surface** is the envelope of a 1-parameter family of spheres along a spine `c(u)` with radius `r(u)`. Regularity (Garcia–Sotomayor; Dana-Picard):

```
|ṙ| < ‖ċ‖     i.e. on a straight bone    |r_B − r_A| < L
```

When this fails the characteristic radius `ρ = r √(1−σ²)` is imaginary: spheres nest, no real envelope, a cusp. Constant `r` is a **pipe**. Linear `r` is a **truncated cone of revolution** (Thiery sphere-mesh edge).

Closed-form sample (tilted characteristic, not an offset tube):

```
σ = (r_B − r_A) / L
n̂(θ) = −σ t̂ + √(1−σ²) (cosθ ê₁ + sinθ ê₂)
P(u, v, θ) = c(u) + v · r(u) · n̂(θ)
```

Naive `c + v r n̂_perp` lands on the *sphere*, not the *envelope*, whenever `σ ≠ 0`.

## 3. FOUR CANALS, NOT ONE FIELD

```
Bones = { crown—torso, torso—crotch, crotch—plantL, crotch—plantR }
Body  = ⋃ Canal(e)
```

Shared node radius ⇒ G¹ at the joint sphere. No extra blend. PlantL and plantR share a *node*, not an *edge*. Guy & Wyvill 1995: no arc ⇒ no blend. Do not fill the W with a sphere-mesh face.

`torso–crotch` may be **interior** (crotch sphere ⊂ torso sphere). It exists for topology and grassfire. Surface-generating bones (crown–torso, both legs) must be regular.

## 4. CONVOLUTION IS THE OTHER SOLID

Bloomenthal & Shoemake SIGGRAPH 1991: `F = ∫_S k`. Superposition fillets every nearby pair, including pairs that were never authored. Bloomenthal 1997: at a **3-valent crotch** the overlapping integrals **swell**. SCALIS (Zanni 2013) is still `F = ∫ k`. Still wants marching cubes. Dual stays dead.

A UDF of the Y-polyline plus `smoothmin` *is* convolution in costume.

## 5. ORTHOGRAPHIC SILHOUETTE

Sphere → disk (same `r`, ortho). Pipe → stadium. Linear taper → tapered stadium (two disks + two external tangents). Rank-1 `#body` = outer walk of **5 disks + 4 stadiums**. Exact. Vector. Hertzmann–Zorin is the coupling check, not the authority.

This slogan is true only when the radii actually leave a W. The plan’s first-guess `r_T = 64` at `y ≈ 141` **contains** the crotch sphere and both plant spheres (`|64−8| = 56 > L_TC ≈ 40`). The “canal” is the torso ball. No W.

## 6. PHYSICAL vs ARTISTIC

| Physical | Artistic |
|---|---|
| Canal regularity `|ṙ| < ‖ċ‖` | 5 nodes, FACE_CANON unmoved |
| Guy–Wyvill: blend only authored edges | How deep the W reads |
| Convolution is a different solid | Wispwalker pear as a *target outline* |
| Sphere is isotropic. Belly width = `2 r_T` | A wide pear + a W cannot both be a Y of balls. Slimmer belly, or later amend the law. |

## 7. VERDICT

Lawful body = sphere-sweep. Convolution / UDF / constant-`r` / `r_T=64` destroy the W. Fit `r(u)` before E2. Do not ship the first-guess table.
