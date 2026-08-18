# CanonOps PHD — explore · Node-based compositing

Earned under N20 / N335. Engine **3.0.0** (pinned).
Deposit: `docs/triforce/canon/runs/2026-08-18T18-17-00-000Z-explore-node-based-compositing`
Parent: `visual-scripting` (2026-08-17T15-48). Dual already named: `rack = visual-script`.

## 1. THE WALL

Nuke Merge is `A + B(1 − a)` on pixel buffers. Gasper is one closed silhouette.
Calling the five-column compiler a compositor is a category error: there is no plate B.
Dual: `composite = one hull`.
Second dual (the word already taken): `composition-frame = composition-graph`.
`GasperCompositionContract` judges one organism inside a monitor. It is not a merge tree.

## 2. QUESTION

Is node-based compositing lawful for a single-organism SVG painter? What should flow on wires? Which sockets do not lie? Which of Machine / Kernel / Cook / Painter / Score is a compositor? How does Harmony's "offset, do not overwrite" map to cards? What fat from Nuke / AE must be refused? Pick (A) refuse compositing as a product and deepen the compiler, or (B) add a real merge / over / mask graph that paints after the hull exists.

## 3. WHAT THE WORLD ACTUALLY HAS

| System | What flows | What "composite" means | Gasper analog | Steal? |
|---|---|---|---|---|
| Nuke / Natron / Fusion | Image buffers (RGBA, premult) | Merge A over B. Mask. Shuffle. Deep. | **None.** Lock forbids pixel buffers. | No |
| After Effects | Layer stack + precomps | The stack *is* the compositor. Nested plates. | Pearl insets of the *same* 512. Not plates. | No |
| Harmony Node View | Drawings + pegs + cutters → Composite | Several images → one image. Cutter = matte. Peg = transform. | Peg → orbit / world-driver. Cutter → `#bodyClip` (same hull). Composite → **forbidden**. | Peg + Attribute Controller only |
| Harmony Attribute Controller | Attribute offsets | Inserts an offset into the attribute's final value. Rig and controller both adjust. Non-destructive. | Couple `lerp(user, law, mix)`. Living additive. Card `base` + slider Δ. | **Yes** |
| Blender Geometry Nodes | Fields over geometry | Deform / generate mesh. Mute = passthrough. | Cook column. Identity → … → Hull. | **Yes** (already law) |
| Blender Shader Nodes | BSDF / coeffs at a shading point | Shade a surface. Mix Shader is not Merge. | Pearl / SurfaceShader / CageLight. | Shade coeffs, not Mix Shader as product |
| Blender Compositor | Rendered image tree | Post on pixels after the mesh exists. | **Forbidden.** `pixel_buffers_forbidden`. | No |
| Cavalry | Generators → effectors → render | They refuse to be a compositor. Render with alpha; AE composites the shot. | Gasper *is* Cavalry. The organism is the generator. | The refusal |
| UE Blueprints | Exec + data | Event Tick. One next. | Refused (prior packet). | No |
| UE Material Editor | Shader graph | Surface, not plates. | Pearl. | No |
| UE Control Rig | Controls → bones | Forwards every frame. | Cook + Voigt + κ. | Already stolen |
| UE Sequencer Composure | Shot plates | Cinematic merge after the character exists. | Out of product. Capture is observer-only. | No |

Blender keeps **three graphs** because they operate on three substances. Unreal keeps **three graphs** (Event / Anim / Material) plus a fourth (Control Rig) for the same reason. Gasper already has the lawful three:

```
Machine  = Harel regions + VEC-501 pose mixer     (flags, bindings)
Cook     = Geometry Nodes / Anim Graph / Control Rig Forwards
Painter  = Shader Nodes + the sole d writer
```

A fourth graph that merges images would be Blender's Compositor. The lock already killed it.

## 4. LAW (stolen, then bound to the lock)

### Physical

- A compositor operates on **independent image buffers**. Merge needs an A, a B, and an alpha. Gasper has one hull. There is no B.
- `A + B(1 − a)` on two silhouettes is a second body. Cook law: "Never a second hull." Painter law: "Never a second d."
- Architecture lock (`GASPER_ARCHITECTURE_LOCK.json`): `pixel_buffers_forbidden`, `mix_blend_mode_forbidden`, `css_image_space_compositing_forbidden`, `mask_image_space_forbidden`, `svg_filter_primitives_forbidden`, `pixel_intermediate_forbidden`. `geometric_clip_path_allowed` — that is `#bodyClip`, not a Cutter drawing.
- Fields compile. Dataflow evaluates. Mute is `out = in` on the incoming buffer. Cycles illegal (`wouldCycleKahn`).
- Circle (scalar / phase / pose / take) may feed diamond (contour / lattice / relief). Diamond may not feed circle without an explicit Reduce. Shade feeds shade only.
- Fan-out legal. Fan-in is one source (`tryConnect` already replaces the incoming wire) or an explicit **Join = Σ on the same lock** or **Offset** (Harmony). Never concatenate. Never remesh.
- VEC-501 `ResolvedPoseCompositor` composites **semantic bindings** (numbers), not images. Order: `document_base → embodiment → expression → clip → runtime → living → manual_preview → constraints → character_state`. That is a mixer of offsets. It is not Nuke.

### Artistic

- One organism on the monitor. The graph is the instrument. The PIP is him.
- Cards OFFSET. They do not overwrite. Harmony: "the controller will insert an offset into the attribute's final values." Couple already: `after = lerp(driven, law(driver), mix)`. Living already: `blendMode: "additive"`. Character-state is the only overwrite, and it is final authority by lock.
- Pearl is painter's algorithm on **inset contours of the same 512**. Vesicle-stack packet already: not A-over-B of independent plates. Not a Merge product.
- `GasperCompositionContract` is shot framing (safe margin, occupy, face overlap). Keep the word "composition" for the frame. Do not spend it on a graph.
- Cavalry's lesson: generate the creature; do not become After Effects.

## 5. LIVE vs DEAD (geonodes + compositing-adjacent)

### Compiler graph — LIVE as a rack, DEAD as a language

| File | Status | Honest job |
|---|---|---|
| `geonodes/catalog.ts` | LIVE | 40 organs. LIVE / TWIN / UNHOOKED / DEAD. |
| `geonodes/pillars.ts` | LIVE | Five compiler seats + phase gutter. |
| `geonodes/layout.ts` | LIVE | Magnetize into Machine / Kernel / Cook / Painter / Score. `LAYOUT_VERSION = 18`. |
| `geonodes/evaluate.ts` | LIVE rack | Publishes `mute` + `params` + Couple traces. `topoOrder(links)` computed, **ignored by painter**. |
| `geonodes/host.ts` | LIVE rack | `applyGeoEvalToHost` writes `__GASPER_*` globals. Rewire does not change cook. |
| `geonodes/coupling.ts` | LIVE | Four driven keys. Harmony-offset already. Park Couple to isolate sliders. |
| `geonodes/topology.ts` | LIVE DAG | Kahn cook. Cycle refused. `cookTrace` is a flash, not a cook. |
| `geonodes/types.ts` | LYING | `socketsCompatible` lets `shade → contour`, `pose → contour`, `take → shade`. Family set is a no-op. |
| `geonodes/library.ts` META `compositor` | GHOST | Seated in Machine, ordered in `FUNCTION_ORDER`, typed `pose→pose`. **Not in `GASPER_ORGANS`.** No card. |
| `dais-first/NodeGraphPage.tsx` | LIVE UI | Columns, wires, mute, monitor PIP. Honest mixer. |
| `dais-first/GeoNodeEditor.tsx` | LIVE UI | Stack catalog. Stage stays primary. |
| `assets/all-script-3.js` | LIVE painter | Mute honored only for **handles / voigt / kappa** (`GN.mute&&GN.mute.*`). Identity→Hull hardcoded. |

### Pose "compositor" — LIVE, and it is not a compositor

| File | Status | Honest job |
|---|---|---|
| `compositor/ResolvedPoseCompositor.ts` | LIVE | VEC-501 scalar mixer. Single authority. Lock-required. |
| `compositor/types.ts` | LIVE | Blend modes on **bindings**, not pixels. |
| `GasperLayerMixer.ts` | LIVE adapter | Delegates. May not resolve independently. |
| `controller/stateResolver.ts` | LIVE | One invocation path. |

### Named "composition" that is framing, not merge

| File | Status | Honest job |
|---|---|---|
| `GasperCompositionContract.ts` | LIVE observer | Screen-space fence of one hull. No DOM. No merge. |
| `GasperCompositionWorldEnvelope.ts` | LIVE | Depth-presence fence. φ⁻¹ far plane. |

### Painter stack that looks like layers and is not Merge

| File | Status | Honest job |
|---|---|---|
| Pearl (`all-script-3.js`) | LIVE | `bodyBase`, `opticalDepth`, crown bloom. Inset `closedSpline` of the **same** `pts`. |
| `#bodyClip` | LIVE | Geometric clip-path. Lock-allowed. Not a matte drawing. |
| `GasperRenderMixer.ts` | LAB / TWIN | Native multi-domain flush. Production writer remains FormMaster. |
| `muteHardHighlights` | DEAD | Opacity 0. |
| Ribbons | DEAD | Lobes outside grid. Killed. |

### Catalog census (40 organs)

- **LIVE (29):** contour-512, lattice-360, relief-1000, topology-lock, scaffold-z, paint-grid, stance, gait-law, support, voigt, kappa, world-driver, radial-facing, orbit, formmaster, closed-spline, pearl, path-take, northstar-20, gsap, eight-state, curve-track, field-api, rig-controller, machine, instrument, lumen, worldclass, couple.
- **TWIN (4):** hex-cube, fabric-solver, surface-shader, cage-light.
- **UNHOOKED (4):** contour-solver, adaptive-shell, arap, paddle.
- **DEAD (3):** hard-highlights, ribbons, walk-scaffold.
- **GHOST (1):** `compositor` — seated, never catalogued.

`LIVE_PIPELINE` (what actually paints the hull):  
`contour-512 → relief-1000 → stance → gait-law → voigt → kappa → orbit → pearl → closed-spline`

`ACTIVE_LINE` (unmuted cards):  
`machine, world-driver, gait, support, identity, cage, handles, voigt, kappa, couple, orbit, pearl, hull, northstar-20`

Test drift: `GeoNodes.test.ts` still expects `layoutVersion === 17`. Layout is 18. The rack moved; the language did not.

## 6. ANSWERS

### 1. Is node-based compositing lawful?

No. It is a category error. Composite, in every DCC that invented the phrase, means **one image from several images**. Gasper is one organism. A Merge of two hulls is a second `#body`. The lock forbids the substance (pixel buffers, mix-blend, image-space masks). Option (B) is not a product cut — it is a second painter.

### 2. What SHOULD flow on wires?

Never images. Never EXR. Never a framebuffer.

| Socket | Cardinality | Substance |
|---|---|---|
| `contour` | 512 | Silhouette samples. The bone/skin. |
| `lattice` | 360 / 672 | Interior mass + face anchors. |
| `relief` | 25 × 40 | Pressure / goose / regions. |
| `scalar` | 1 | Authored dial. Circle. |
| `phase` | 1 | φ. Plant predicates. Not a state. |
| `pose` | N bindings | VEC-501 semantic numbers. |
| `take` | score τ ∈ [0, T] | Backwards onto handles. Never `d`. |
| `shade` | coeffs | depth / spec / rough. Tints the same hull. |

### 3. Typed sockets that do not lie

```
LEGAL
  scalar → phase | pose | shade | take | contour | lattice | relief
  phase  → phase | scalar | pose
  pose   → pose  | scalar
  take   → pose                         (Backwards only)
  contour → contour
  lattice → lattice
  relief  → relief
  contour → shade                       (hull exists, then shade samples it)
  shade   → shade

ILLEGAL
  shade → contour | lattice | relief    (a material is not a silhouette)
  take  → contour                       (a score is not a hull)
  pose  → contour                       (bindings are not samples)
  diamond → circle without Reduce
  any → any  via the current family-set no-op
```

`socketsCompatible` today returns true for almost every pair. That is the lie. `canBind` then widens further (same pillar, or adjacent compiler bus). A type that cannot reject is chrome.

### 4. Which pillar is a compositor?

None of them, in the Nuke sense.

| Pillar | Kind | Analog | Refuse |
|---|---|---|---|
| **Machine** | State machine + pose mixer | Harel regions. VEC-501 lives here. | Never move mass. Never draw. Never Merge. |
| **Kernel** | Compiler of mass | Control Rig COM / gaitGate / plants | Never decide Rest / Walk. |
| **Cook** | Compiler of silhouette | Geometry Nodes / Anim Graph | Never a second hull. |
| **Painter** | Renderer | Shader Nodes + `closedSpline` | Never a second `d`. |
| **Score** | Replay | Montage / take | Never Delay. Never a travel writer. |

The ghost `compositor` card, if it is ever catalogued, is a **Machine** organ: pose-in, pose-out, mix. It is not a sixth column and not a second page.

### 5. Harmony's lesson → Gasper cards

"The controller will insert an offset into the attribute's final values. This will result in both the standard rig and the controller being able to adjust the values."

| Harmony | Gasper |
|---|---|
| Attribute Controller offset | Couple `lerp(user, law, mix)`. Card `base` + slider Δ. Living `additive`. |
| Mute / bypass | `out = in` on the incoming buffer. Not skip. Not zero. |
| Peg | `world-driver` (mass), `orbit` (view space). Transform, not merge. |
| Cutter + matte drawing | `#bodyClip` of the **same** hull. No second drawing as matte. |
| Composite node | Forbidden. One hull. |

A muted Voigt must pass the incoming contour untouched (`τ` unused). A muted Handles must leave the 512 at Construction rest. That is already painter law for those three. Every other LIVE card still *overwrites* its host global to a parked value (machine gate → 0, northstar play → 0, cage coupling → 0). That is overwrite, not offset. Residual inside (A).

### 6. Fat that must be refused

From Nuke / Fusion / Natron / AE, refuse as product:

- Color management / OCIO / ACES
- EXR, Deep, Cryptomatte, Shuffle, Copy, Channel
- Premult / unpremult
- Reformat / Format / pixel aspect
- 3D cameras as a graph (ShotDirector is framing law, not a camera DAG)
- Particle systems
- Roto / paint as pixel tools
- `mix-blend-mode`, CSS filters, SVG `<fe*>`, image-space masks
- Precomps of independent plates
- Merge / Over / Under / Plus / Multiply as node types
- Viewer that writes `#body`

Keep: typed dataflow, mute-as-passthrough, Kahn DAG, Harmony offset, Blender field/circle rule, Cavalry's refusal to become AE.

### 7. Pick one

**(A). Refuse compositing as a product. Deepen the compiler graph.**

(B) is lock-illegal and a second painter. The thing people want from (B) — "stack after the hull" — already exists as pearl insets + `#bodyClip` + VEC-501 bindings. Promoting that into Merge / Over / Mask nodes would reintroduce plates, invite mix-blend, and split `#body`.

## 7. RECOMMENDED ARCHITECTURE

One graph. Five columns. Three substances. Zero image trees.

```
Machine ──may I──► Kernel ──mass──► Cook ──silhouette──► Painter ──frame──► Score
   │                  │               │                    │                  │
 flags              COM, φ          512 / τ / κ         closedSpline       take τ
 VEC-501            plants          cage 25×40          pearl coeffs       Backwards
 (pose mixer)       tempo           Couple offsets      #bodyClip          onto handles
```

- Wires carry the eight sockets above. Not pixels.
- Each LIVE node reads one named buffer, writes one buffer of the same lock (or an Offset of it).
- Mute = identity on the incoming buffer. Authored `base` remains. Couple mix parks to 0.
- Hull is Group Output. Viewer (future) strokes the 512, never writes `d`.
- VEC-501 stays the sole pose mixer, invoked from Machine, never drawn as a Merge.
- Pearl stays painter-owned shade. No Shade Editor page this cut.
- FormMaster remains the sole `#body` writer.

This is Blender's Geometry Nodes + a tiny Shader stack + a Harel machine. It is not Nuke.

## 8. NOT THIS CUT

Do not recut FormMaster. Do not add Merge / Over / Mask. Do not catalog the ghost compositor as a sixth column. Do not stamp engine 3.3 — lock is 3.0.0. Do not promote pearl into a graph product. Do not give `GasperCompositionContract` a node.

## 9. NEXT WORK (when you say go)

1. Tighten `socketsCompatible`. Reject `shade→contour`, `take→contour`, `pose→contour`. Tests must fail the current lie.
2. `GeoSocket` on every card. `connectNodes` type-checks the lattice above.
3. Each LIVE node reads a named buffer, writes one buffer. Painter consults `eval.order`.
4. Mute becomes passthrough on **every** LIVE card, not only handles / voigt / kappa. Parked params do not cook. Host globals revert to `base`, not to 0-unless-that-is-base.
5. Cards OFFSET: slider is Δ from `base`; Couple remains the driven-key Offset bus.
6. Then, and only then, a Viewer. Never a Merge.

Until a rewire changes the cook, the page remains an honest mixer. Call it that. Do not call it a compositor.
