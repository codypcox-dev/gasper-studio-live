# CanonOps PHD — explore · poisson-disk

Earned under N20 / N335.
Date: 2026-08-19T00:40:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-19T00-40-00-000Z-explore-poisson-disk
Parents: hex-lattice · goose-follicle · medial-fabric · isophote-banding

## 1. THE WALL

A 25×40 is a *lattice*. Lattices alias. Goose read as freckles. The pizza is a regular meridian. The obvious next idea: throw away the chart and sprinkle 1000 Poisson-disk points so coverage is “even.”

That idea is a category error. Dual: **`poisson-set = fabric-chart`**.

Poisson-disk is a **sample set**. It has no `u`, no `v`, no ring, no sector wrap, no marching-squares neighbor, no `τ(v)`. A chart is a **parameterization**. Blue-noise cannot drive the organism. It can only *read* it.

Sibling already killed: `offset-UV-Euclidean = hex-lattice`. Same crime in a new costume: measuring distance in the wrong metric.

## 2. THE LAW

A set `{x_i} ⊂ Ω` is Poisson-disk of radius `r` when

```
∀ i ≠ j,   d(x_i, x_j)  ≥  r
```

and (when *maximal*) every leftover point of `Ω` sits inside someone’s disk. The spectrum is **blue**: flat high frequencies, no spike at a lattice wavelength. That is why it does not moiré and does not look like graph paper.

`d` is the whole game. Euclidean-in-screen, Euclidean-in-offset-UV, and geodesic-on-the-fabric are three different sets. Only the last one is on Gasper.

## 3. THE METHODS (what actually exists)

| Method | Move | Exact N? | Maximal? | Domain | Cost |
|---|---|---|---|---|---|
| **Dart throwing** (Cook 1986) | Propose uniform, reject if `< r` | No | Eventually, slowly | Any, if you can test `d` | Unbounded |
| **Bridson 2007** | Active list. Candidate in annulus `[r, 2r]`. Background grid of cell `r/√d` so neighbor check is O(1). `k≈30` then retire. | No (N follows `r`) | Approximately | R^n, easy | **O(N)** |
| **Mitchell best-candidate** | From k random, keep the farthest from the set | No | No | Easy | O(N²) |
| **Lloyd relaxation** | Voronoi centroids, iterate | Yes (you start with N) | No — *not* Poisson | Needs Voronoi | Looks even, spectrum worse |
| **Yuksel 2015 sample elimination** | Over-sample, weight by local crowding, delete heaviest until N remain. `r` is *implicit*. Progressive subsets stay blue. | **Yes** | No guarantee | **Any** — you only need `d` | O(M log M) typical |
| **Wei 2010 multi-class** | Several radii (or several species) that respect each other | Per class | Approx | 2D / surface | For mixed organs |
| **Surface / geodesic MPS** (Bowers, Cline, Guo 2015) | Same law, `d` = geodesic (or 3D Euclidean in a tubular neighborhood) | No | Yes, on meshes | Triangle mesh | Heavy |

Bridson is the default blog algorithm. Yuksel is the one you want when the lock says “exactly 1000” or “exactly 84 follicles” and you refuse to pick `r` by hand. Lloyd is what people ship when they say Poisson and mean “looks even.”

Variable radius (importance): `r(x) = r0 / √ρ(x)`. Density from curvature, from `v` (more on the rim), from τ. Bridson still works if the annulus uses the *local* `r`. Yuksel handles it by the weight.

## 4. WHAT EACH METHOD IS ALLOWED TO TOUCH

```
25×40 medial fabric     ← chart. lock. not Poisson.
        │
        ├─► isobands of E, S_coat     (marching squares needs the lattice)
        ├─► τ(v, chart)
        └─► derived sample sets
                 ├─ goose / papule sites     Yuksel from the 1000, or Bridson in the fabric metric
                 ├─ stipple / diagnostic
                 └─ shade probes (optional)
```

| Ask | Lawful tool | Unlawful |
|---|---|---|
| Even follicles, no freckle lattice | Yuksel elimination **from the 1000** (exact N, hex-octave leftover dies) | New mesh of Poisson verts |
| Adaptive density (calf denser than belly) | Variable-`r` Bridson in `(u,v)` with the chart’s metric | Screen-space dart throwing |
| Multi-species (goose ≠ nub ≠ highlight flakes) | Wei multi-class | One radius for everything |
| Replace the cage because pizza | **Refused.** Pizza is a *chart* failure (single-pole). Poisson has no poles because it has no meridians. | Remesh the lock |
| Painter samples for isobands | The 25×40 **is** the field. Marching squares already interpolates. | Poisson shade points |
| 512 rim | Arc-length samples. Already blue-enough on a curve. | Poisson on the silhouette |

Radius scale if anyone *does* Bridson on the interior, as a diagnostic only: body area ~ 1.5e4 px², N=1000 ⇒ `r ≈ 0.75 √(A/N) ≈ 3 px`. That is follicle spacing, not cage spacing. The cage’s mean edge is ~6–10 px. Different organs.

## 5. THE METRIC (do not skip this)

Hex packet already proved Euclidean-in-offset-UV is a lie. Same here.

```
d_screen(a,b)     = ‖P_a − P_b‖          # clumps on the W, thins on the crown under yaw
d_uv(a,b)         = hypot(Δu_wrap, Δv)   # ignores that v is grassfire, not arc
d_fabric(a,b)     = ‖P_a − P_b‖ on the lofted cage, or geodesic hops on the 25×40
d_medial(a,b)     = chart-aware: Δu on the *same branch*, Δv = grassfire
```

Lawful `d` for a derived set: **`d_fabric`** today, **`d_medial`** after M1. Screen-space Poisson will crawl when he yaws — the same crawl we already killed on the spec ellipse.

Bridson’s background grid must live in the same metric. A square grid in screen space behind a geodesic test is a speed hack that *accepts* illegal pairs. Forbidden if the set is visible.

## 6. PHYSICAL vs ARTISTIC

| Physical | Artistic |
|---|---|
| `d(x_i,x_j) ≥ r` in the fabric metric | Goose N, papule amplitude (already locked) |
| Blue spectrum ⇒ no lattice wavelength | Follicles must not read as a grid when Grid is OFF |
| Maximal ⇒ no holes bigger than `r` | Crown / plants stay dermis-masked (goose packet) |
| Chart remains 25×40 | Poisson never writes `liveGridXYZ` |

## 7. FAILURE MODES

- **Poisson cage.** No `u,v`. Isobands die. τ(v) dies. Bind dies. Dual killed.
- **Bridson in screen space.** Follicles swim under yaw and plant.
- **Lloyd and call it Poisson.** Even look, not blue. Moiré can return.
- **Dart throwing every frame.** N jitters. Follicles sparkle. Author once at rest, bind barycentric to the fabric, replay.
- **Pick `r` so N≈1000 and swap buffers.** That is a remesh wearing a radius.
- **Use Poisson to “fix” the pizza.** The pizza is meridians to one pole. A point cloud cannot be a W-chart.

## 8. TESTS (when a derived set lands — not this deposit)

- `liveGridXYZ.length === 3000` unchanged.
- Any Poisson / Yuksel set is a *second* buffer, named, not aliased to the cage.
- Grid OFF: no visible lattice in the goose. Grid ON: the 25×40 is still the overlay.
- Yaw 0→40: follicle barycentrics stay put; screen motion is the fabric’s, not a re-throw.
- Rest N is exact (Yuksel) or stable ±0 (authored Bridson, not live).

## 9. IMPLEMENTATION (not this deposit)

None. This packet refuses a cage rewrite.

Later, under goose — not under M1/M2:

1. Author a Yuksel subset of the 1000 (or a rest-time Bridson in `d_fabric`) as follicle sites.
2. Store barycentric `(r,s,α)` into the fabric. Never re-sample at runtime.
3. Displacement stays `P + n̂ · s` on those sites, written *into* the 25×40 field (goose law). The Poisson set is the *mask*, not the mesh.

M1 (medial fabric) and M2 (isobands) do not wait on this.

## 10. SOURCES

- Cook, *Stochastic Sampling in Computer Graphics*, ACM TOG 1986
- Bridson, *Fast Poisson Disk Sampling in Arbitrary Dimensions*, SIGGRAPH sketches 2007
- Yuksel, *Sample Elimination for Generating Poisson Disk Sample Sets*, CGF 2015 (cemyuksel.com/research/sampleelimination)
- Wei, *Multi-Class Blue Noise Sampling*, SIGGRAPH 2010
- Yan / Guo / et al., surveys of blue-noise and mesh MPS (JCST 2015; CAG 2015)
- Bowers / Cline — geodesic / surface Poisson
- Live: hex-lattice, goose-follicle, medial-fabric, isophote-banding, MESH-STACK lock 25×40
