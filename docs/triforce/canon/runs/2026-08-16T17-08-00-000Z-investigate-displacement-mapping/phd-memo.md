# CanonOps PHD — investigate · displacement-mapping

Earned under N20 / N335.
Date: 2026-08-16T17:08:00.000Z
Tri-Force: 3.0.0

## 1. THE WALL

Displacement is three writers and two spaces, not one map. Studios author one field on a locked cage. We shade a height, puff a rim, and leave the lattice offsets aside.

## 2. SOTA (what “workflow” means)

1. Lock a cage (OpenSubdiv / USD).
2. Author a map in a named space (scalar along n̂, or vector in object/tangent).
3. Bind UV. Zero is rest. Amplitude remaps in float (PxrDispTransform), not 8-bit 0.5-gray.
4. One field, two consumers: shading normals and geometric P'.
5. Tessellation is the renderer’s job — or, here, the 1000 **is** the tessellation.

## 3. WHAT GASPER HAS

| Writer | Space | Moves 512? | Shades? |
|---|---|---|---|
| `evaluateRelief` → `shadeLitMesh` | screen height | no (goose zeros rim) | yes |
| N350 pressure → rim | contour radius | yes | no |
| `meshOffsets` on 360 | content-px XY | only if warped | no |
| Contract `C=Γ(L)+Σs` | rest-normal 3D | not painted | no |

Reconciliation still says: 1000 → vertex displacement is **PARTIAL**.

## 4. LAWFUL WORKFLOW (not a 4k EXR)

The 1000-float field **is** the map.

- **Author:** Neutral / Puff / Goose / later paint-on-UV / import resampled to 25×40.
- **Bind:** u = sector/40, v = ring/24. Say it on Skin.
- **Apply:** pressure + relief + captured → `composeScaffoldScalars` → `commitScaffoldField`. `shadeLitMesh` reads the **same** scalars.
- **Space v1:** scalar along rest-radial.
- **Space v2:** tangent via `computeLocalFrame` once L is the live 360.

Remote is a new embedding or a captured vector. Not a photo of a remote.

## 5. FIX SPEC (not this receipt)

1. One field. Shade and rim consume it.
2. `meshOffsets` bake to captured on Save (or resample 360→1000). No fifth writer.
3. Skin UI shows layers Pressure / Relief / Captured. Neutral clears all to +0.
4. No bitmap pipeline. No 0.5-as-rest. No firewall drop. No gait recut.

## 6. NOT WRITTEN

Investigate only. N350 puff still shade-blind. Goose still rim-blind.
