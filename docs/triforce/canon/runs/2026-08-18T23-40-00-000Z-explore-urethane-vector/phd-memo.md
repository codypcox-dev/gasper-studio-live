# CanonOps PHD — explore · urethane-to-vector

Earned under N20 / N335.
Date: 2026-08-18T23:40:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-18T23-40-00-000Z-explore-urethane-vector
Parents: pbr-shader · disney-principled · anisotropic-reflections · subsurface-scattering · uv-mapping

## 1. THE WALL

Live paint is 960 Gouraud quads (`paintCageFill`) plus a white `#body` stroke. The cage owns color — that part is lawful. The *look* is a disco ball. Dual: **`quad-fill = urethane`**.

A real urethane organism (TPU toy, pearl vinyl, automotive clearcoat over tinted gel) does not show facets. The highlight is a sliding isophote, not a coin, not a tessellation.

## 2. WHAT URETHANE ACTUALLY IS

Physical stack (car-paint / vinyl / glossy TPU), one interface at a time:

```
air
  │  Fresnel F_coat (IOR_c ≈ 1.5, α_c ≈ 0.04)     ← varnish
clearcoat (thin dielectric, almost smooth)
  │  T = 1 − F_coat, then Beer tint
base dielectric (colored, rougher, α_b ≈ 0.18–0.30)
  │  Disney/Burley diffuse or BSSRDF
volume (σs, σa)                                     ← the gel
```

Filament / VTK / glTF clearcoat (Kitware 2021, Burley 2012, Karis):

- Coat is a **second isotropic GGX**. F0 from IOR: `f0 = ((n−1)/(n+1))²`. For n=1.5, F0=0.04.
- Coat spec stays **white**. Coat *color* tints only the **transmitted** base.
- Base F0 is recomputed against the coat IOR, not air.
- Energy: what the coat reflects never reaches the base. `I = I_coat + T · I_base`.
- Pearl / mica is **not** metalness. It is a view-dependent flake or thin-film on the long channel. Dual already killed: `specularTint` (D-0033). Hue shift rides intensity, not a new pigment.

Gasper numbers (artistic lock, not a new hue):

| Layer | α | F0 | Role |
|---|---|---|---|
| Coat | 0.04–0.08 | 0.04 | Sharp sliding band |
| Base | 0.20 | 0.04 | Soft body turn |
| Volume | ld ~ 8–14 px | — | Jimenez SSS on the cage |
| Metallic | **0** | — | Forbidden |

## 3. HOW VECTOR ART ALREADY FAKES THIS

The industry that actually draws glossy plastic in 2D:

| Primitive | Who | What it is | Lawful here? |
|---|---|---|---|
| **Gradient mesh** (Coons patches, per-vertex color) | Illustrator, Corel, Xara, PDF | 8–64 patches. Color IS the shade. C1 if patches share edges. | **Painter gold.** SVG `<meshGradient>` is not in Chromium. We would reconstruct, not ship the tag. |
| **Diffusion curves** (Orzan 2008) | INRIA / research | Shade solves a Laplace field from colored curves. | Beautiful. Too slow per frame. The 512 as a diffusion curve is a later organ, not this pass. |
| **Isophote bands** | Traditional airbrush / cel-plus | Fills of constant n·L, feathered. 4–8 bands = urethane. | **Lawful now.** Cage already has n·L per sample. |
| **SVG feSpecularLighting** | Native SVG | Phong in a filter. | Cheap. Wrong BRDF. Forbidden as the organism. Optional debug. |
| **Raster shade → SVG image** | Hybrid | Canvas samples the 25×40 BRDF, one `<image>` clipped to `#body`. | Honest. Looks perfect. Not “pure vector.” Cage still drives. Last resort. |
| **960 path quads** | Us, tonight | Gouraud mesh. | **Proved ownership. Failed the look.** Dual killed. |

Sun, Liang, Wen, Shum (SIGGRAPH 2007) — *Image Vectorization using Optimized Gradient Meshes*: a photo of glossy plastic becomes ~30 Coons patches, not 1000 triangles. That is the density that reads as urethane.

Tavmjong (2012) SVG mesh proposal: Coons = 4 cubics + 4 corner colors. Adjacent patches share an edge. Chromium still does not paint `<meshGradient>`. Reconstruct with few large SVG paths + blur, or with a clipped image. Do not wait for the tag.

## 4. THE VECTOR SYNTHESIS (what we actually draw)

One writer: the cage samples.
Three readers, **none of them 960 facets**:

```
cage 25×40
  │  n̂, E = n·L, S = GGX_coat + GGX_base
  ├─► isophote bands (4–6 path fills, feathered)     = body turn
  ├─► one coat band (high S, small, slides with yaw) = varnish
  └─► one SSS under (Jimenez blur of E, warmer, 8–12%) = gel
#body fill is the darkest base, not a second skin
#body stroke is OFF
grid overlay is a toggle, never the material
```

Isophote extraction (cheap, SVG-native):

```
band k = { quads whose mean S or E ∈ [t_k, t_{k+1}) }
union those quads → one path (or a few)
fill = pearlHex(mid)
feGaussianBlur stdDeviation ≈ 2.5 px so C0 seams read C1
```

4–6 bands + 1 coat + 1 SSS under. That is 6–8 DOM nodes, not 960. The highlight becomes an **isophote**, which is what urethane *is*.

Fresnel is not a white rim stroke. It is the last isophote (grazing E) climbing toward F0. Schlick already in the PBR packet. Wire it into the band thresholds, not into `#body`.

## 5. PHYSICAL vs ARTISTIC

| Physical | Artistic |
|---|---|
| Two-lobe dielectric, metallic=0 | Pearl hex lock (violet/cyan, D-0033) |
| Coat α ≪ base α | Coat band 6–10% of area at rest |
| SSS occupies the diffuse slot | Under-layer opacity 0.08–0.12 |
| Energy: coat first, then T·base | No white coins, no cyan reservoir |
| Isophotes slide when n̂ yaws | Face plate stays FACE_CANON |

## 6. FAILURE MODES

- **Keep 960 quads, blur them.** Still facets under the blur. Dual still dead.
- **Bring back overlay ellipses.** Packet already killed `overlay-ellipse = cage-surface`.
- **Paint a second `#body` gradient.** Two skins. The cage must remain the only writer.
- **Wait for `<meshGradient>`.** Not in the preview browser.
- **Call a canvas `<image>` “the vector.”** It is a lawful last resort, not the claim.
- **Aniso as a stretched ellipse overlay.** Aniso packet: T,B from ∂P/∂u, ∂P/∂v. If the *grid* is wrong, T,B are pizza meridians and the coat streaks toward the crown. This is why the grid packet is the sibling, not a later polish.

## 7. TESTS

- Rest: no visible quad edges. Unique fill colors of the *painter* ≤ 8, not 385.
- Yaw 0→40: coat centroid travels ≥ 12 px. Body turn travels with it.
- Grid toggle OFF: zero scaffold circles. Organism still reads glossy.
- Grid toggle ON: dots/lines only. They do not add light.
- `#body` stroke opacity = 0.
- Arms / W receive the same bands (not a dead pad).
- No white pixel with (r,g,b) all > 200 on the body.

## 8. IMPLEMENTATION (do not do in this deposit)

1. Keep `shadeCagePoints` (n̂, E, S). Upgrade S to two-lobe GGX when the bands land.
2. Replace `paintCageFill` with `paintUrethaneBands` (isophote union + blur).
3. Kill the white stroke in the same commit.
4. SSS under-layer = one blurred fill of E, not painted cores.
5. Do **not** change `bindHullToLiveGrid` in the urethane commit. Grid is the sibling residual.

## 9. SOURCES

- Burley, *Physically-Based Shading at Disney*, SIGGRAPH 2012 / 2015
- Karis, *Real Shading in Unreal Engine 4*
- Kitware, *PBR Journey Part 3: Clear Coat* (VTK, 2021)
- Orzan et al., *Diffusion Curves*, SIGGRAPH 2008
- Sun, Liang, Wen, Shum, *Image Vectorization using Optimized Gradient Meshes*, SIGGRAPH 2007
- Tavmjong Bah, *Coons Patch Mesh Gradients in SVG*, 2012
- Adobe, *Mesh objects overview* (Illustrator)
- Live packets: pbr-shader, disney-principled, anisotropic-reflections, subsurface-scattering
- Live painter: `all-script-3.js` `paintCageFill` / `pearlHex` / `shadeCagePoints`
