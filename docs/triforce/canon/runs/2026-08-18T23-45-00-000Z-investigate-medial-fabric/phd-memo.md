# CanonOps PHD — investigate · medial-fabric

Earned under N20 / N335.
Date: 2026-08-18T23:45:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-18T23-45-00-000Z-investigate-medial-fabric
Parents: uv-mapping · uv-unwrapping · thousand-mesh · adaptive-shell · hex-lattice · urethane-to-vector

## 1. THE WALL

The 25×40 is offset isolines with `cageFeatureV = t^0.30`. Rings hug the W. Meridians still run to **one centroid**. The picture is a pizza with a fitted crust. Dual: **`single-pole = organism`**.

A W-body, two nubs, a locked face, a paddle morph, a blowfish puff, and a sliding coat isophote **cannot share one pole**. That is not a tuning problem. It is the topology of the chart.

Sibling residual (`quad-fill = urethane`): even a perfect fabric will look like graph paper if we keep painting 960 quads. This packet is the *controller*. That packet is the *painter*. Do not conflate them. Dual: **`mesh-tool = cage`**.

## 2. FIRST PRINCIPLES (what a grid is for)

Gasper needs one embedding that can do four jobs at once:

| Job | What the chart must provide |
|---|---|
| **Skin** | Every visible point of the silhouette, including W inlets and nubs, has a vertex |
| **Morph** | A semantic shape (paddle, ?, blowfish) is a *lawful* move of those vertices, not a sticker |
| **Physics** | τ, plant, pressure can be a field on the chart (solid at plants, gel at crown) |
| **Light** | n̂ = ∂P/∂u × ∂P/∂v. Isophotes of n·L must be *smooth curves on the body*, not pizza slices |

A chart that fails any one job will be patched forever. That is the last year.

## 3. ADVERSARIAL COMPARISON

| System | Poles | W | Morph | Light T,B | Lock 25×40 | Verdict |
|---|---|---|---|---|---|---|
| Polar homothety | 1 centroid | Starves inlets | Blowfish only | Pizza meridians | Yes | **Dead** |
| Offset isolines (live) | 1 centroid, rim-parallel rings | Coverage yes, meridians no | Paddle shears to the pole | T points at the crown | Yes | **Half-dead** — current |
| Y-band | None (scanlines) | Yes | Walk only | No n̂ | As a view | View, not bind |
| Floater / Tutte | 1 harmonic chart | Smooth, starves concavities | Soft | Better than polar, still one pole | Yes | Not enough |
| LSCM / BFF / ABF++ | N/A (3D→2D) | Category error | — | Shade names only | — | Dual already killed |
| Hex lattice | None | No silhouette bind | No | No | No | Dead for bind |
| Feature-aligned quad remesh (Bommes, Pietroni 2021, QuadWild) | Umbilics at features | Yes if W is a feature | Yes | Curvature-aligned — *this is what isophotes want* | **Remeshes** | Right idea, wrong lock |
| Gradient mesh (Illustrator, Sun 2007) | Artist poles | If authored | Manual | Color IS shade | No | **Painter**, not controller |
| Multi-pole homothety (pearl + feet) | 2–3 blended polars | Better | Hack | Blend seams | Yes | Costume of the next row |
| **Medial fabric (this packet)** | 1 per *medial branch* | Yes | Skeleton first, then grassfire | T along rim, B along grassfire — limbs are tubes | Yes, remapped | **Lawful controller** |

Why offset still looks like pizza (the exact bug):

```
p(r,s) = rim[s] + n̂_in[s] · (1 − v(r)) · inset[s]
```

`s` is a single 0..40 around the **whole** 512. Every meridian is the inward normal of one rim sample, and they all aim at the centroid because that is how `n̂_in` was oriented (`n · (c − rim) > 0`). Feature-adaptive `v` only *packs* rings toward the crust. It does not give the W its own pole. The crotch still has meridians crossing the cleft toward a point in the belly.

Why a single pole cannot morph:

- Paddle = one long medial stem. A centroid polar puts the handle and the face on the same star.
- Question mark = a *curved* stem. Polar has no curve to follow.
- Blowfish = radial pressure. Polar is fine for this *one* morph — which is why we kept reaching for it.

## 4. THE LAW — MEDIAL FABRIC

A 2D organism with a W is a **disk whose medial axis branches**. Blum’s grassfire: the medial axis is where inward offsets collide. CGAL’s straight skeleton is the polygonal cousin (Aichholzer, Felkel, Held). Lan et al. (CGI 2017) and Guo’s Medial Skeletal Diagram (2024) deform the *skeleton first*, then rebuild the surface. That is the morph we have been faking with stickers.

### 4.1 Canonical skeleton (authored, not extracted every frame)

Extracted medial axes flicker. FACE_CANON already taught us: lock the rest, drive the live.

```
        crownPole     ← face center. FACE_CANON is the source of truth.
            │
         torsoStem
            │
         crotchBranch
           / \
     leftPlant  rightPlant     ← rest plants, not the swinging feet
```

Optional nub twigs exist as *amplitude*, default 0. They do not add charts until a nub is actually proud.

This skeleton is a rest lock, same class as FACE_CANON. Live gait moves the *plants* (and the 512). The fabric rebuilds by grassfire, it does not re-author the topology.

### 4.2 Coordinates

For each point P inside the 512:

```
d_rim  = dist(P, 512)                 # grassfire from the silhouette
d_med  = dist(P, skeleton)            # grassfire from the local branch
v      = d_med / (d_med + d_rim)      # 0 on skeleton, 1 on rim
```

`u` is **piecewise**. Each skeleton edge owns a rim interval:

| Chart | u domain | v domain | Owns |
|---|---|---|---|
| Crown / torso | rim arc from L-waist to R-waist, over the head | stem → crown rim | Face, nubs, belly |
| Left plant | rim arc of the left W lobe | crotch → left plant rim | Left foot, left ankle |
| Right plant | rim arc of the right W lobe | crotch → right plant rim | Right foot, right ankle |

Meridians run **skeleton → rim**. They meet at the *branch*, not at the belly centroid. The crotch is an honest 3-valent singularity (one umbilic). That is what feature-aligned remesh would put there. We do not hide it.

True offset identity: on each chart, isolines of `v` are parallel to the *local* rim. They cannot cross the cleft, because the cleft is on another chart’s rim. This is the permanent W fix. Offset-past-cleft was the spike source.

### 4.3 Lock numbers stay 25×40

Do **not** remesh. The 1000-buffer is a contract (MESH-STACK, topology lock). Remap the embedding:

```
rings  0–16  → torso/crown chart   (v from stem to crown rim, 17 samples)
rings 17–24  → split by sector
               sectors 0–19  left plant chart
               sectors 20–39 right plant chart
```

Or keep 25 rings as global grassfire levels and 40 sectors as piecewise-u with a seam at the two waist samples. Same buffer. Different meaning of `(r,s)`.

`__GASPER_SHADE_UV__` stays a *name*. BFF is still not a position writer.

### 4.4 Morph, physics, light — one chart

**Morph.** Deform the skeleton, then grassfire.

- Blowfish = radial pressure on `v` (rest identity of polar, now a *mode*).
- Paddle = elongate torsoStem, collapse plant branches to stubs, rebuild.
- `?` = polyline torsoStem through three bends, rebuild.
- Goose / bas-relief = scalar field on `(u,v)`, same as today’s relief, but the `(u,v)` is medial, so a bump on the calf stays on the calf.

**Physics.** τ is a field on `v` and on chart id:

```
τ(plant charts, v > 0.6)  ≈ solid     # load-bearing
τ(torso, v < 0.4)         ≈ gel       # crown
```

This is the pressure-gradient the user asked for, finally with a coordinate that *means* “waist down.” Y-band was a costume of this.

**Light.**

```
T = ∂P/∂u     # along the local rim  → around a leg, this is circumferential
B = ∂P/∂v     # grassfire            → along the limb
n̂ = T × B
```

On a tubular limb, `T` is the direction a molded urethane highlight *streaks*. That is the aniso packet’s T, finally sourced from a chart that matches the body. Coat isophotes will wrap a calf instead of slicing toward the crown.

## 5. WHAT WE REFUSE

- Extracting a full Voronoi medial axis every frame. Flicker. Author the rest skeleton.
- Remeshing 25×40 into QuadWild. Lock numbers stay.
- Blending three polar maps and calling it medial. That is the multi-pole costume.
- Using the gradient mesh as the cage. Painter ≠ controller.
- Letting grassfire run past the local medial (the old inset-too-far W spike).
- Changing FACE_CANON to follow the new chart. The outer rim obeys the face, not the other way around. Crown pole *is* the face center.

## 6. PHYSICAL vs ARTISTIC

| Physical | Artistic |
|---|---|
| Grassfire / straight skeleton | Authored 4-node rest skeleton |
| 3-valent singularity at the crotch | Hidden under the belly, never drawn |
| τ field on v | Slider: plant solid ↔ crown gel |
| n̂ from the fabric | Coat isophotes (sibling packet) |
| Charts share seams at waist | Seams not drawn; C1 after painter blur |

## 7. FAILURE MODES

- **Keep offset, add a second foot pole lerp.** Multi-pole costume. Meridians still fight in the belly.
- **Y-band as the bind.** Walk looks good. Nubs and crown die. Already refused.
- **Rebuild topology when he runs.** Gait must move plants *inside* the same charts. Topology is rest.
- **Let the painter stay 960 quads.** Sibling residual. Medial meridians will still read as a net.
- **Call this UV unwrap.** We are embedding a 2D disk along its own skeleton. Inverse of BFF.

## 8. TESTS

- Rest grid ON: meridians on each foot terminate at the crotch, not the belly centroid. Vision must not say “pizza from the crown” about the W.
- W dots: ≥ 2 distinct clusters (L/R), not one U pad.
- `#body` rim = ring 24 of the *local* chart. Cleft samples stay on the cleft.
- Yaw: coat isophote on a calf moves *around* the calf, not toward the head.
- Paddle morph (when that organ is on): handle meridians follow the stem. Face stays FACE_CANON.
- Buffer length stays 1000. `liveGridXYZ.length === 3000`.
- Face anchors do not move when the fabric remaps.

## 9. IMPLEMENTATION ORDER (next pass, not this deposit)

1. Author rest skeleton (4 nodes) from FACE_CANON + rest plants. Lock it.
2. Piecewise-u remap inside `bindHullToLiveGrid`. Keep 25×40.
3. v = grassfire ratio, not `t^0.30` of a single inset.
4. Prove with grid ON: two foot charts, no pizza through the cleft.
5. *Then* the urethane painter (sibling) so the new T,B feed real isophotes.
6. τ-on-v as a Kernel card after the chart is honest.

Do not land 1–6 in one commit. Chart first, film, then painter.

## 10. SOURCES

- Blum, *A Transformation for Extracting New Descriptors of Shape*, 1967 (grassfire / medial axis)
- Aichholzer, Aurenhammer, Alberts, Gärtner — straight skeleton
- CGAL 6.2, *2D Straight Skeleton and Polygon Offsetting*
- Liu, Chambers et al., *Extended grassfire transform on medial axes of 2D shapes*
- Lan, Li, Xu, Guo, *Medial-Axis-Driven Shape Deformation*, CGI 2017
- Guo et al., *Medial Skeletal Diagram*, 2024
- Myles & Zorin, *Feature-aligned T-meshes*, 2010
- Pietroni et al., *Reliable Feature-Line Driven Quad-Remeshing*, 2021
- Bommes / QuadWild / frame fields (curvature-aligned quads)
- Sun et al., gradient meshes, SIGGRAPH 2007 (painter, not cage)
- Live: uv-mapping, uv-unwrapping, thousand-mesh, MESH-STACK.md, FACE_CANON
