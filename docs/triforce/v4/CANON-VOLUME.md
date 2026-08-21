# CANON — Gasper v4 Volume

**Id:** `GASPER-V4-VOLUME-001`  
**Status:** controlling v4 geometry contract

## Diagnosis

The current failure is not primarily a shader problem. It is a representation problem.

v3 overloaded the 25×40 / 1,000-sample field. That field was originally useful for adaptive relief, pressure, regional weights, and authoring. It was then asked to become a closed 3D body by polar inflation and sewing. A concave Wispwalker silhouette is not star-convex, the offset rings self-cross, and a single polar depth rule cannot represent both lower lobes. The result can be watertight-looking while still being anatomically wrong.

## v4 separation of concerns

### Identity boundary

`Contour512`
- canonical front-view silhouette oracle;
- exact Wispwalker front lock;
- may be projected from a v4 surface, but no runtime system may independently rewrite it at the canonical front view.

### Structural domain

`Lattice360/672`
- mass, anchor, face attachment, lighting/region support;
- may drive deformations;
- does not directly paint the silhouette.

### Authoring/relief domain

`Field25x40`
- semantic cage, weight paint, pressure, relief, regional deformation coordinates;
- stable 1,000-sample correspondence;
- never again treated as the body render topology.

### Volume surface

`GasperVolumeMesh`
- one watertight closed genus-0 render surface;
- deterministic, generated from canonical semantic data;
- has independent topology from the 25×40 field;
- runtime topology is stable for a given schema/version;
- may have render LOD/subdivision that does not alter semantic correspondence.

## Construction: silhouette-constrained bilateral shell

The first production implementation uses a constrained 2D domain and two 3D sheets.

1. Let `Ω` be the exact interior of the protected 512-point Wispwalker contour.
2. Create a deterministic constrained triangulation of `Ω` using the 512 boundary plus a stable set of interior structural samples derived from the 360 lattice.
3. Duplicate interior vertices into **front** and **back** sheets.
4. Keep the 512 boundary as the common seam with depth `z = 0`.
5. Evaluate an authored regional half-depth field `D(x,y) > 0` over the interior.
6. Front sheet: `z = +D(x,y) + Zbias(x,y)`.
7. Back sheet: `z = -D(x,y) + Zbias(x,y)`.
8. Sew both sheets to the shared 512 boundary.
9. Compute normals from actual geometry.
10. Derive the visible silhouette from raster/depth visibility of this surface, never from a secondary hull formula.

This is not a single height graph. It is a closed bilateral manifold with exact concave boundary support.

## Depth is authored anatomy

`D(x,y)` is not one scalar inflation. It is composed from named regions and smooth fields:

- crown depth;
- upper-body depth;
- face-support depth;
- cheek/side depth;
- mid-body depth;
- lower-body depth;
- left/right plant depth;
- cleft bridge depth;
- asymmetric front/back bias where needed;
- local flattening at ground contact;
- authored profile correction curve.

The initial field may use v3 F1 thickness as a starting estimate, but v3 F1 is not acceptance authority.

## Profile authoring

The side silhouette is a first-class asset. Studio must expose 90° and 45° views with semantic depth handles. The profile is accepted visually, then stored as canonical regional depth parameters / profile constraints.

Required Wispwalker profile characteristics:

- continuous pear/bean mass, not a coin or mint;
- no flat front/back faces;
- no platform shelf under the body;
- feet retain independent contact volumes without becoming detached tubes;
- lower cleft reads as front anatomy, not a deep slot through the entire body;
- crown remains soft and continuous;
- overall depth feels substantial enough for true 3/4 rotation.

## Deformation

Macro deformation is applied in semantic space, then evaluated into the volume mesh:

`base volume → embodiment projection → structural rig → authored/manual offsets → behavior/physics → relief/skin derivation → render mesh`

The 5-node Y rig remains useful for crown/torso/crotch/plants, but it drives smooth region fields instead of directly constructing the render hull.

## Relief mapping

The 25×40 field maps to the volume surface by a stable attachment map:

- each field sample stores triangle ID + barycentric coordinates + side/region;
- sculpt/relief displaces along the evaluated surface normal or a named deformation vector;
- rim-coupled effects may influence silhouette only through the volume solver, never by independently editing another contour;
- attachments are regenerated only by explicit topology/schema migration.

## Ground and feet

Ground contact is solved as a physical/authoring constraint, not by flattening the whole body.

- contact patches are region-specific;
- loaded plant compresses and broadens locally;
- free plant unloads and lifts;
- COM shifts precede/track weight transfer;
- no torso/leg carve;
- no humanoid leg segmentation.

## Render topology rule

Semantic topology is immutable during ordinary runtime. Render tessellation may be deterministic and denser than semantic topology. Subdivision/LOD is a **reader**, not identity authority.

## Required tests

- canonical front contour max deviation threshold;
- watertight manifold / edge valence;
- no self-intersections for accepted poses;
- full yaw/pitch orbit continuity;
- stable triangle correspondence and attachment map;
- profile acceptance snapshots;
- 45°/90° silhouette regression;
- plant-contact continuity;
- no body component split;
- no independent hull writer.
