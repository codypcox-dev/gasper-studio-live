# CanonOps PHD — explore · uv-unwrapping

Earned under N20 / N335.
Date: 2026-08-18T23:10:00.000Z
Tri-Force: 3.0.0
Parent: explore · uv-mapping (`homothety = UV`)

## 1. THE WALL

Unwrap algorithms flatten a **3D surface into a 2D chart**.
Gasper’s 512 **is already the chart border**. The 25×40 is a structured disk.

Running ABF++ / LSCM / BFF / xatlas to “fix the pizza” would flatten a surface we then have to put back on the silhouette. That is the inverse of the bind.

Dual killed: `unwrap = bind`.

## 2. QUESTION

Which unwrap algorithms exist, what each actually computes, and which (if any) is lawful on a locked 25×40 whose rim is the live 512?

## 3. THE PIPELINE (three jobs, do not swap them)

PartUV (Wang et al. 2025) and every studio packer agree: unwrapping is **cut → flatten → pack**.

| Job | Input | Output | Gasper |
|---|---|---|---|
| **Cut** | closed 3D mesh | disk charts + seams | Already a disk. The silhouette **is** the cut. Zero seams. |
| **Flatten** | one disk, 3D metric | 2D (u, v) | Inverse of our problem. We **embed** 2D → screen. |
| **Pack** | many islands | atlas square | One cage. No UDIM. Pack is a no-op. |

xatlas, Blender Smart UV, OptCuts, PartUV are mostly **cut + pack**. We do not have that problem.

## 4. FLATTENERS (the actual algorithms)

| Algorithm | Year | Energy | Border | Solver | Flips |
|---|---|---|---|---|---|
| Tutte barycentric | 1963 | convex combo | fixed convex | 1 SPD Laplacian | none if border convex |
| Floater mean-value | 1997 / 2003 | MVC weights | fixed convex-ish | 2 linear (#V) | rare; better than Tutte |
| LSCM (Lévy) | 2002 | conformal LS | free, 2 pins | 1 rectangular | possible |
| ABF / ABF++ (Sheffer) | 2001 / 2005 | angle residual | reconstructed | nonlinear, then reconstruct | ABF++ more robust |
| Spectral conformal (Mullen) | 2008 | conformal eigen | free | smallest eigenvector | possible |
| ARAP-param (Liu) | 2008 | local rigidity | free or pinned | local/global | can fold |
| SCAF / SLIM | 2017– | inversion-free | various | iterated | designed not to |
| **BFF (Sawhney & Crane)** | 2017 | conformal, *boundary first* | scale **or** exterior angles (Σk = 2π) | linear; one factorization | ~10⁻⁵ area |

BFF (TOG 2017, geometry-central `parameterizeBFF*`): prescribe boundary scale *or* exterior angles, Cherrier / Poisson for the complementary data, integrate a closed border, extend holomorphically (or harmonically at sharp corners). Faster than ABF++, more control than LSCM, cones optional.

ARAP-param is **not** Igarashi 2005 (our live deform). Same local/global split, opposite direction: flatten, do not pose.

## 5. COORDINATE SPACES

| Name | Direction | Unit |
|---|---|---|
| Unwrap / flatten | 3D surface → ℝ² | (u, v) in a chart |
| Offset bind (locked) | rim + n̂_in · (1−v)·inset | content-px XY + front-dome Z |
| Floater *embed* | disk connectivity → interior of the 512 | content-px XY |
| Shade UV (optional later) | same 25×40, names only | u = s/40, v = r/24 or BFF of the dome |

Do not write flatten coordinates into `liveGridXYZ`.

## 6. WHY FLATTEN STARVES THE W

Tutte / Floater / BFF-as-positions put interior vertices in the **convex hull of the border**, pulled by a Laplacian. The 512 is not convex. The W is a pair of inlets.

Harmonic maps **leave concave pockets**. Feet go empty. That is the same visual crime as the pizza, from the other side.

Offset isolines force rings to follow those inlets. That is why the last Explore locked offset as the **position** bind, and why this Explore does not override it.

BFF *from the 512’s turning angles* is lawful only as a **name** for relief / goose — a second channel. Not as φ.

## 7. INVARIANTS

1. One disk. No seam cut. No pack.
2. Ring 24 = live 512. Positions from offset bind.
3. (u, v) stay structured: u wraps, v clamps. Topology never remeshes.
4. Igarashi ARAP stays a **deform** energy on φ. Not a flattener.
5. LSCM free border is illegal: the rim would leave the hull.
6. ABF++ / xatlas / PartUV / UDIM are refused as painters.

## 8. FAILURE MODES

- **Unwrap as bind:** rim drifts or W starves. Dual.
- **LSCM two-pin:** border is a free curve, not Gasper.
- **ABF++ per frame:** nonlinear, 1000 verts, 60 fps tax for a chart we already have.
- **xatlas seams on a blob:** islands. Second skin.
- **BFF cones on the pearl:** useful on a head mesh; here they punch holes in a 25×40.
- **Swapping Liu ARAP-param for Igarashi ARAP:** category error already killed 2026-08-17.

## 9. VISUAL CONSEQUENCE

If we flattened the z-dome and drew those (u, v) as the cage, Gasper would become a **packed island**, not an organism. The picture would look “correctly unwrapped” and wrong.

Offset rings still read as a fan on the round pearl. That is the pearl, not a missing unwrap.

## 10. FIX SPEC (not this receipt)

No painter change this pass.

Later, and only if goose / relief stretch is measurable:

1. Keep offset φ.
2. Optionally compute BFF (u, v) of the dome **once per bind**, store as `__GASPER_SHADE_UV__`.
3. Sample relief in that chart. Do not move cage dots.

Physical law: conformal / equiareal maps are flatteners of a 3D metric.
Artistic law: the cage on screen is the skin of this silhouette, including the W.

## 11. TESTS

- `bindHullToLiveGrid` still contains `Offset UV` and `inset[s]`.
- No `parameterizeBFF` / `LSCM` / `ABF` write to `liveGridXYZ`.
- This memo names the dual `unwrap = bind`.
- Parent memo `homothety = UV` remains in force.

## 12. KNOWN UNCERTAINTY

Whether shade-UV BFF is worth a second 960×960 factor on a 25×40. Structured (s, r) may be enough forever. Measure stretch of goose before writing it.
