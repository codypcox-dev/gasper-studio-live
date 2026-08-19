# Plan — Medial Fabric + Urethane Painter

**Book slice:** after studio-master-005
**Engine:** Tri-Force 3.0.0
**Packets:**
- `docs/triforce/canon/runs/2026-08-18T23-40-00-000Z-explore-urethane-vector`
- `docs/triforce/canon/runs/2026-08-18T23-45-00-000Z-investigate-medial-fabric`

## Residuals

| Dual | Meaning |
|---|---|
| `quad-fill = urethane` | 960 Gouraud quads proved the cage owns color. They are not varnish. |
| `single-pole = organism` | One centroid cannot be a W, a face, a paddle, and a coat isophote. |
| `mesh-tool = cage` | Illustrator gradient mesh is the painter. The cage is the controller. |

## Synthesized system

```
authored skeleton (4 nodes, rest-locked)
        │
        ▼
medial fabric 25×40   v = grassfire ratio
                      u = piecewise per branch
        │
        ├─► 512 rim (ring 24, local chart)
        ├─► τ(v, chart)          Kernel
        ├─► n̂ = ∂P/∂u × ∂P/∂v   Painter
        └─► isophote bands + coat + SSS under
            (6–8 SVG nodes, not 960 quads)
```

## Waves (do not merge)

| Wave | Does | Film gate |
|---|---|---|
| M0 | Author rest skeleton from FACE_CANON + rest plants. No paint change. | Nodes visible in a debug overlay only |
| M1 | Remap `bindHullToLiveGrid` to piecewise-u + grassfire v. Buffer stays 1000. | Grid ON: two foot charts, meridians die at crotch, vision must not say pizza-through-W |
| M2 | Replace `paintCageFill` with marching-squares isobands: 2 body (`E`) + 1 coat (`S_coat`) + SSS under. Linear crossings, not quad-bin. Stroke off. | Grid OFF: no facets, no cel posters, no white coins, coat travels ≥12 px on yaw. Band edges must not ride cage edges. |
| M3 | τ as a field on v. Kernel card. | Plant charts stay planted; crown still gels |
| M4 | Morph = skeleton first (paddle / ? / blowfish as modes of the same fabric) | Face stays FACE_CANON |

M1 before M2. A new chart under 960 quads still looks like a net.

## Not this book

- QuadWild remesh
- `<meshGradient>` tag
- Per-frame Voronoi
- Triforce 3.3 (does not exist; lock is 3.0.0)
