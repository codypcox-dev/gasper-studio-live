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

## Volumetric mesh (Investigate 2026-08-19T15:00)

A height graph is not a volume mesh. Dual: `z-loft = volume-mesh`.

| Generator | Role |
|---|---|
| Teddy inflate of the live 512 | **Rest solid.** Height already F1. Hoop must follow `chartId` (V1). |
| Canal / sphere-mesh `(u,v,θ)` | **fabricLive solid.** Structured prism. |
| MC / CMS / Dual Contouring | Reader only, if a volume is authored |
| TetWild / hex fill | Reader only (SSS / mass). Never paint |
| Visual hull of one silhouette | Prism / card. Forbidden as body |

Lock unchanged: 25×40, no remesh, `#body` is the occluding contour. Packet: `canon/runs/2026-08-19T15-00-00-000Z-investigate-volumetric-mesh`.

## Live topology errors (watched 2026-08-19T20:10)

Packet: `canon/runs/2026-08-19T20-10-00-000Z-mesh-topology`. Duals below are **in the live cage**, not theory.

The 25×40 never remeshes. The errors are the **embedding** and the **edges the 960 quads actually join**.

| Id | Error | Live number |
|---|---|---|
| T1 | Disk chart on a W. `chartId` computed, ignored at rest. | torso 27 / L 6 / R 7 |
| T2 | Offset isolines of a W self-cross. | **16** bowtie rings at rest; r6 = 39 crossings. r0 peri **851** > rim **513** |
| T3 | Polar sine Z. One foot = −z, other = +z. | `sineShare`; L 42/42 neg, R 42/42 pos |
| T4 | C4 sew is an open strip. r11–r12 is a Z-wall. r23–r24 leaps the pillow. Front never meets the rim. | y45 r23↔r24 = **153 px**; y90 = **157 px** |
| T5 | Ring 24 glue dies when the solid turns. | rest 1.93 px · y90 **31.5 / 70.8**; r24w = **0** |
| T6 | Side silhouette = convex of a line + polar thickness. No foot shelf. | y90 `#body` 141.6×171.7 |
| T7 | `envelopeXYZ` ≠ `liveGridXYZ` | RMS **99–107 px**. two-grid |
| T8 | `DETAIL_TOPOLOGY` polar+stagger ≠ isoline cage | second connectivity on the same index |
| T9 | 512→40 undersamples the cleft | 8 px notch on a 40-gon |
| T10 | Face winding flip (`if nz<0 flip`) | 666 / 960 honest n̂z < 0 |
| T11 | y90 sliver quads | maxAspect **78** |
| T12 | `wrapFoot` dead at rest (keep it that way) | V1 two-component. Dual: wrapFoot-at-rest = two-mass |

Do not remesh. Next cut is **P(r,s)**: sew front and back onto ring 24, rest Z by `chartId` (Teddy, not V1), envelope becomes a reader.

## Mastery order

1. Atlas names Contour 512 · Lattice 360 · Relief 1000. **Done (N350).**
2. One field, two consumers (this Investigate). Not written.
3. Regional τ on the same UV.
4. Shape-snap: target curve → 512. Remote = embedding.
