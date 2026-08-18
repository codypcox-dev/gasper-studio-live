# CanonOps PHD — explore · uv-mapping

Earned under N20 / N335.
Date: 2026-08-18T23:00:00.000Z
Tri-Force: 3.0.0

## 1. THE WALL

The 25×40 is bound by **homothety from a pole** (chest, then a hip blend).
That is a polar map. It is not a UV.

A polar map puts almost all rings on the circular crown and leaves the W as a thin angular slice of the outer rings. The picture is a pizza. The user can see it. Dual killed: `homothety = UV`.

## 2. SOTA (what “UV” means)

A UV is a chart: a map from a surface disk to the unit square, used so every texel / cage vertex has a stable name.

| Method | Distortion | Border | Lawful for Gasper? |
|---|---|---|---|
| Tutte barycentric | none minimized; convex combo | fixed convex | Yes as a *fill*, not as the rim |
| Floater mean-value (2003) | approx conformal; one-to-one if border convex | fixed convex | Yes for an unstructured interior |
| LSCM (Lévy 2002) | least-squares angle | free (2 pins) | Overkill; 25×40 is structured |
| Discrete authalic | area | fixed | Not the look we need |
| Cylindrical / Y-band | height × longitude | natural | Yes for a torso; W needs multi-span |
| Planar (x,y) | projective | none | Sides squash; not 3D-aware |
| Spherical / cube | polar seams | — | Wrong genus |
| Multi-chart / UDIM / pelt | per-part | seams | Refused: **one cage** |
| **Offset / parallel curves** | arc-length on each inset | rim = hull | **Yes. This is the skin.** |
| Medial-axis / skeleton | branch u, offset v | — | Next, if offset cusps at the cleft |

Sources: CGAL Surface_mesh_parameterization (Floater / LSCM / Tutte / authalic); Lévy 2002 LSCM; Floater 1997/2003; character TD practice (torso cylindrical, limbs separate — we will not split the cage); MESH-STACK polar lock; NORTHSTAR-CAGED-HULL “grid is the skin / rim = hull”.

## 3. COORDINATE SPACES

| Name | Domain | Unit |
|---|---|---|
| Contour arc | 512 samples | content-px, closed |
| Sector u | 0..39 wrap | arc-length fraction of the **live rim** |
| Ring v | 0..24 | 0 = inward core, 1 = rim (hull) |
| Homothety (dead) | p = pole + v·(rim − pole) | pizza |
| Offset (lawful) | p = rim + n̂_in · (1−v)·inset | nested silhouette |
| Isoline / Y-band | y = lerp(minY,maxY,v); x on spans | sweater; rim is **not** one ring |
| Floater | Laplacian on a triangulation | needs a mesh we do not paint |

Northstar law **rim = hull** means ring 24 **is** the 512. Y-band breaks that (ring 24 becomes the foot line only). Offset keeps it.

## 4. EQUATIONS

Inward normal at rim sector s (smoothed three-tap):

```
t = rim[s+1] − rim[s−1]
ñ = (t.y, −t.x) / |t|
n̂ = ñ   if ñ · (c − rim[s]) ≥ 0
n̂ = −ñ  otherwise
```

Inset cap (do not cross the medial on the first cut):

```
inset[s] = 0.62 · max(10, |rim[s] − c|)
p(s,v) = rim[s] + n̂[s] · (1−v) · inset[s]
```

Depth (front dome, not sector-as-longitude):

```
z₀ = 58 √(1−v²)
z  = x sin θ + z₀ cos θ     // θ = orbit yaw; screen XY stay on the hull
```

Hide a meridian only when z < 0 **after** that rotate.

## 5. INVARIANTS

1. Topology stays 25×40. No remesh.
2. Ring 24 = live 512. Nubs and W are rim vertices.
3. Rings v < 1 are **insets of that same silhouette**, not circles about a pole.
4. u wraps. v clamps.
5. One cage. No UDIM islands. No second polar overlay.
6. Sculpt is Δ in the same embedding. Hull rewrite only when sculpted.

## 6. FAILURE MODES

- **Homothety:** pizza on the crown. W starves. (Current still.)
- **Hard two-pole:** horizontal seam at the blend. Two pizzas.
- **Y-band:** covers the W as scanlines, but ring 24 is no longer the hull. Breaks rim=hull and sculpt-to-silhouette.
- **Naive offset past κ⁻¹:** rings cusp and cross at the W cleft. Cap inset. Smooth n̂.
- **Floater on 1000 without a rim lock:** interior swims; face leaves the almonds.
- **LSCM free border:** rim drifts off the 512.

## 7. VISUAL CONSEQUENCE

Offset rings are **nested Gaspers**. The W is visible on the outer ~8 rings. Meridians meet the silhouette at right angles, like a garment pattern, not a sunburst.

Y-band would look like graph paper clipped to the body. Useful as a *display mode*. Not the bind.

## 8. FIX SPEC

Replace the pole lerp in `bindHullToLiveGrid` with the offset equation above. Keep z-dome and sculpt. Do not drop Y-band as a later *view* of the same 25×40 (u,v still named). Do not run LSCM this pass.

Physical law: a chart of a disk with fixed convex-enough border.
Artistic law: the picture of the cage must read as the skin of this silhouette, including the W.

## 9. TESTS

- Ring 24 samples lie on the live 512 (max err < 2 px).
- Count of cage dots with y > 180 ≥ 80 at rest W.
- No `z * cos(sector)` anywhere.
- `phd-memo` names the dual `homothety = UV`.
