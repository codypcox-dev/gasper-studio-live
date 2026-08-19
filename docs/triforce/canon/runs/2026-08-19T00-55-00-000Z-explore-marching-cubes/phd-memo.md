# CanonOps PHD — explore · marching-cubes

Earned under N20 / N335.
Date: 2026-08-19T00:55:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-19T00-55-00-000Z-explore-marching-cubes
Parents: isophote-banding · urethane-to-vector · adaptive-shell · medial-fabric

## 1. THE WALL

M2 is marching-**squares** isobands on a 25×40 chart. The next costume is obvious: “upgrade to marching cubes, then he is actually 3D.”

That is a dimension we do not have. Dual: **`volume-iso = 2.5D-loft`**. Dual also killed: **`cubes = better-squares`**.

Marching cubes extracts a *triangle mesh of an isosurface* from a **3D scalar field** `φ(i,j,k)`. Gasper has a **2D chart** with a height loft `z(r,s)`. One number per vertex is not a voxel grid. Inventing voxels so we can run MC is a third body. Book 009’s AdaptiveShellScaffold already died that death.

## 2. THE 3D LAW (so we do not hand-wave it)

Lorensen & Cline, SIGGRAPH 1987 (GE, US 4,710,876, expired 2005):

```
for each cube of 8 samples:
  bit i = (φ_i ≥ c)          # 8 bits → 256 configs
  lookup triangles           # published as 15 unique by rotation / reflection / complement
  for each cut edge:
    t = (c − φ_a) / (φ_b − φ_a)
    P = (1−t) A + t B        # same linear interpolant as 2D
  n̂ from ∇φ on the grid, interpolated
```

Output: a **watertight-ish triangle mesh** of `{φ = c}`. Not a filled band. Not an SVG path. Not `#body`.

### Ambiguity (why the 15-table lies)

A face with alternating signs has two legal diagonals. The 1987 table picks one. Holes appear when two cubes disagree.

| Fix | What it adds |
|---|---|
| Nielson & Hamann 1991 | **Asymptotic decider** on the bilinear face interpolant (same idea as our 2D saddle-by-center) |
| Natarajan 1994 | Interior critical points; extra subcases |
| Chernyaev 1995 **MC33** | 33 cases; face *and* interior ambiguity; topology of the trilinear interpolant |
| Nielson 2003 | Proof the 33 are complete |
| Lewiner 2003 / Custodio 2013 | Implementations; later corrections |

Marching tetrahedra (6 tets per cube) was a patent dodge and a milder ambiguity story. Dual contouring (Ju 2002) puts one vertex per cell from a QEF on the hermite data — sharp features MC cannot hold. Surface Nets = DC without the QEF (cell center / average). **Cubical Marching Squares** (Ho, Chen, Lin 2005) unfolds each cube into faces, runs **2D marching squares**, folds back. CMS is MC rebuilt out of the primitive M2 already named.

## 3. DIMENSION TABLE

| Algorithm | Field | Cell | Output | Gasper? |
|---|---|---|---|---|
| Marching squares isoline | 2D `φ(r,s)` | 4 corners, 16 cases | Polylines | Diagnostic |
| **Marching squares isoband** | 2D `φ`, two thresholds | Ternary corners | **Filled polygons** | **M2 painter** |
| Marching cubes / MC33 | 3D `φ(i,j,k)` | 8 corners, 256 / 33 | Triangle *surface* | No volume |
| Dual contouring / Surface Nets | 3D + hermite | Dual verts | Quad/tri surface, sharp edges | No volume |
| Cubical Marching Squares | 3D, faces first | MS on 6 faces | Surface | Only if a volume is ever authored |
| Voxel MC of the z-dome | Fake 3D from `z(r,s)` | Invented voxels | A potato around the loft | **Third body. Forbidden.** |

The 2D and 3D algorithms are the **same law** in different dimensions:

```
sign pattern → lookup → linear interpolate the cut → stitch
```

3D is not an upgrade of 2D. 3D is 2D plus a dimension we refused to grow. CMS even *says so*: cubes become squares.

## 4. WHAT WE ACTUALLY HAVE

```
25×40 chart     φ ∈ {E, S_coat, z_loft}
     │
     ├─ E, S_coat   → 2D isobands (M2)     level sets in the chart
     ├─ z_loft      → n̂ = ∂P/∂u × ∂P/∂v   a height, not a volume
     └─ 512 rim     → #body                 the only silhouette
```

A lofted disk is a **graph** `z = f(u,v)`, a 2-manifold with boundary. An MC volume is a **subset** of R³. To run MC you must invent `φ(x,y,z)` inside and outside Gasper — a solid he is not. That is the Adaptive Shell 3D contract, still unhooked, still not paint.

Isophotes live in the *chart* (`n·L` at each fabric point). They are 2D level sets. Running MC on a voxelized n·L would extract a 3D surface of “equal brightness in space,” which is not a shade and not a body.

## 5. PHYSICAL vs ARTISTIC

| Physical | Artistic |
|---|---|
| MC = `{φ = c}` in a 3D grid | We have no 3D grid |
| Same interpolant as MS: `t = (c−φa)/(φb−φa)` | M2 already specified this in 2D |
| Ambiguity ⇒ holes unless MC33 / asymptotic decider | 2D saddle decider is the same organ |
| Output is triangles | Painter is SVG paths. No WebGL volume this book |

## 6. FAILURE MODES

- **Voxelize the loft, run MC, call it the skin.** Third mesh. `#body` becomes a projection of a potato. Dual killed.
- **“MC is higher quality than MS.”** Different dimension. Quality of M2 is interpolating crossings, not adding a K axis.
- **Use MC triangles as the 960-quad replacement.** Facets again, now irregular. Urethane packet already refused tessellation-as-varnish.
- **Dual contouring for sharp nubs.** Sharp features need hermite data we do not author. Nubs are the 512 + medial twigs, not a QEF.
- **Ship a voxel engine “for later 3D.”** AdaptiveShellScaffold is that later. It is not live paint.

## 7. TESTS (none this pass)

If anyone ever authors a real volume (not this book):

- There is a named 3D buffer, not a cast of `liveGridXYZ`.
- Extractor is CMS or MC33, not the 1987 15-table.
- The 512 remains the SVG silhouette. The volume does not replace `#body`.
- M2 isobands still paint. The volume does not.

Until then: `liveGridXYZ.length === 3000`. No voxel allocation.

## 8. IMPLEMENTATION (not this deposit)

None. M2 stays 2D marching-squares isobands. This packet forbids growing a K axis to look serious.

The only lawful reuse of this literature in M2:

- Linear edge interpolation (already specified)
- Asymptotic / center-sample saddle decider (already specified)
- Remember CMS exists if a volume is ever *authored* — built from the same squares

## 9. SOURCES

- Lorensen & Cline, *Marching Cubes*, SIGGRAPH 1987
- Nielson & Hamann, *The Asymptotic Decider*, Vis 1991
- Chernyaev, *Marching Cubes 33*, CERN 1995
- Nielson 2003 completeness; Lewiner 2003; Custodio 2013 corrections
- Ju, Losasso, Schaefer, Warren, Dual Contouring, 2002
- Ho, Chen, Lin, *Cubical Marching Squares*, CGF 2005
- Live: isophote-banding (2D isobands), urethane-to-vector, adaptive-shell (unhooked 3D), MESH-STACK
