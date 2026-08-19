# Mesh stack — promoted corpus (2026-08-16)

Investigate: `docs/triforce/canon/runs/2026-08-16T16-52-00-000Z-investigate-thousand-mesh`
Firewall: `docs/triforce/canon/runs/2026-08-16T16-56-00-000Z-explore-contour-firewall`
Shell: `docs/triforce/canon/runs/2026-08-16T17-00-00-000Z-investigate-adaptive-shell`

Gasper is not one 1000-point body. He is a **locked trio**. Live paint is FormMaster `all-script-0..3` (`legacy-authority-formmaster-v655`).

```
        Relief 1000 (25×40 pressure / goose / regions)
                    │  rim ring 24
                    ▼
        Contour 512  ──────── silhouette, gait, KV
                    ▲
        Lattice 360 / 672  ── mass, sculpt, face anchors, light
```

Polar constructor: verts = rings × sectors. Tris = (rings−1) × sectors × 2.
- 512 = `CONTOUR_SAMPLES` (not a mesh)
- 360 / 672 = 15 × 24 lattice
- 1000 / 1920 implied faces = 25 × 40 (`DETAIL_TOPOLOGY`)

Neutral rim is 0. Topology never remeshes. Shape is an embedding.

## Live vs twin

| Module | Status |
|---|---|
| `assets/all-script-0..3.js` | **Live paint** |
| `GasperTopologyLock.ts` | Lock claim 512/360/672/1000 |
| `GasperContourSolver.ts` | Stale twin. Mixer firewalled off `#body` |
| `living/AdaptiveReliefInstrument.ts` | Golden-spiral 1000. Tests only. Not 25×40 |
| `scaffold/AdaptiveShellScaffold.ts` | Book 009 3D contract. **Unhooked** |
| `ScaffoldAttachment.ts` | **Missing.** Comments lie. Bilinear is inlined |
| `candidate-script-3.js` | Lock: do_not_converge |

`GASPER_TOPOLOGY.adaptiveRelief.changesSilhouetteTopology = false` means **do not remesh**. Live `scaffoldContourZ` **does** displace the same 512. That is coupling.

## Adaptive shell — C = Γ(L) + Σs_i

Compose, do not paint. Amplitude 0 is identity (+0).

| | Contract | FormMaster today |
|---|---|---|
| Grid | 25×40 = 1000 | same index: ring×40+sector |
| Buffer | 3D vertices (1000×3) | `__GASPER_SCAFFOLD_Z__` 1000 scalars |
| Writer | `composeAdaptiveShellScaffold` | relief + nubs + walk + singularity |
| Rim | not painted | ring 24 → 512 radius |
| L | rest unit sphere | 360 placed on the 512 |

Hook (not written): Σs_i scalars → `__GASPER_SCAFFOLD_Z__`. Not 3D SVG. Not a dropped firewall.
u = sector (40), v = ring (25). Lock names width/height the other way — do not transpose.
Blowfish = pressure. Goose = regional relief. Remote = captured or a new L.

## What one frame actually writes

1. Interior energy → **one** VEC-401 pressure scalar (not 1000 pressures).
2. `evaluateRelief(DETAIL_TOPOLOGY)` → quads / goose ellipses.
3. Same 25×40 buffer also takes `nubScaffoldZ`, `walkScaffoldZ`, `singularityScaffoldZ`.
4. Rim ring 24 may add to 512 radius (`SCAFFOLD_COUPLING_DEFAULT = 0.5`, clamp 3.5 px).
5. 360 lattice is **placed on** the 512. It does not define the outline.

## Regional isolation today

Gauss weights on the 512: crown / lower / sides / mouth / cheeks.
One global τ. One expansion. One tension. Relief kernels are height, not material.

## Named embodiments only (8)

presence, wispwalker, comet, singularity, dormant-orbit, halo, lantern, low-orbit.
`arbitraryMidMorphRetargeting: false`. Blowfish = Skin Pressure (N350). No remote. No fit-to-contour.

## Displacement mapping (Investigate 2026-08-16T17:08)

The 1000-float field **is** the map. Not a 4k EXR.

Today shade and silhouette do not share it:
- Goose shades, zeros the rim.
- Puff moves the rim, does not shade.
- `meshOffsets` dent the 360 in secret.

Lawful workflow: author → bind **offset isolines + live W cleft** (E1 overlay is the authored 5-node rest; interiors still loft from the 512 until E3) → **isophote urethane** (4 superlevel paths). 960 Gouraud quads are dead. Duals killed: `single-pole = organism`, `quad-fill = urethane`, `extracted-medial = rest-lock`. Zero is +0. Overlay ellipses are not the light.


## Mastery order

1. Atlas names Contour 512 · Lattice 360 · Relief 1000. **Done (N350).**
2. One field, two consumers (this Investigate). Not written.
3. Regional τ on the same UV.
4. Shape-snap: target curve → 512. Remote = embedding.
