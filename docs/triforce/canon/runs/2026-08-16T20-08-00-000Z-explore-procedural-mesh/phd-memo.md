# CanonOps PHD — explore · procedural-mesh

Earned under N20 / N335.
Date: 2026-08-16T20:08:00.000Z
Tri-Force: 3.0.0

## 1. THE WALL

Six products hide under “procedural mesh generation.” Gasper already has one: a locked polar constructor. The shatter on Goose was a second product — generating paint faces from the field.

## 2. FAMILIES

| Family | Live? | Lawful? |
|---|---|---|
| Polar constructor (25×40 / 15×24) | Yes | Yes |
| Displacement on that cage | Yes | Yes |
| Catmull-Clark / Loop | No | No — remesh |
| SDF / marching cubes | No | No — remesh |
| Skin modifier / metaballs | No | No as hull |
| MeshGPT / VertexRegen | No | No — offline |
| Golden-spiral 1000 twin | Tests | Yes, not paint |
| shadeLitMesh tiles | Non-goose | Not as a body |

## 3. THE COUNT LAW

```
verts = rings × sectors
tris  = (rings − 1) × sectors × 2
```

1000 and 360 are computed, not magic. They do not grow because the field got denser.

## 4. WHAT “MORE MESH” MEANS HERE

More **field**. More gaussians. Regional τ. A captured L for a remote.

Not more vertices. Not a new cage every frame.

## 5. NOT THIS RECEIPT

Explore only. Painter not recut.
