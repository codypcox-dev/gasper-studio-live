# NORTHSTAR — Gasper Studio

**Id:** `GASPER-STUDIO-MASTER-001`  
**Status:** REAL-SYSTEM CHECKPOINT — 2026-08-18. Live cage drag. Joined undo. Publish looks.  
**Proof:** `docs/triforce/canon/runs/2026-08-18T20-55-00-000Z-revision-publish`  
**This file plus the day book win over memory.**  
**Parent locks:** `NORTHSTAR-CAGED-HULL.md`, `NORTHSTAR-PILLARS.md`  
**Checkpoint restore:** `checkpoint-real-system-20260818`  
**Look restore:** Factory / Autosave / Save look (`gasper.revision.v1`) — not a git tag. Dual: `tag = organism`.  
**Prior restore:** `checkpoint-live-skin-20260818` · `checkpoint-glued-cage-20260818`  
**Engine:** Tri-Force lock 3.0.0 (CLI absent in this host; disk is still law)

---

## 0. Residual (ThinkOps)

**`score-is-not-a-curve`**

The 20s take is a fire list. Easing a fire is a category error.  
Compositing one hull is a category error.  
The graph is a mixer rack.

Duals for this book:

| Dual | Meaning |
|---|---|
| easing = physics | τ interpolates flesh. Curves interpolate Score parameters |
| bezier = take-beat | A beat is an impulse. A curve needs an interval |
| composite = one hull | There is no plate B |
| rack = visual-script | Wires must carry typed buffers or they are unused |
| layer = organ | One embedding |
| clip-FSM = presence | Locomotion ⊥ Presence ⊥ Take |
| wall-clock = organism-clock | VEC-401 only |
| mute = skip-write | Mute is `out = in` |
| catalog LIVE = paint path | Catalog matches the mount |
| page-bag = selection-inspector | Look pages are a fallback when nothing is selected. Inspector follows the pick. |

Lead force this book: **PlanOps** (work). ThinkOps names. DesignOps owns the UI. CodeOps executes one wave at a time.

---

## 1. What this product is

**Gasper Studio is the tool on which you displace, take, and replay a single locked vector fabric — Construction, Forwards, Score — under one clock, one τ, one `#body` — where the graph is the Cook, the transport is the Score, and the Machine only answers “may I?”**

Anything that cannot be said inside that sentence is a different product.

25×40 cage = skin = shape = motion = light. 512 is the rim. FormMaster writes `d` once.

---

## 2. Stolen laws (best of seven, fat trimmed)

Adversarial memo: four agents, seven studios, two topic PHDs, one live-vs-lie audit.

| Keep | From | Refuse |
|---|---|---|
| Direct manipulation of visible structure | Illustrator | Pen, Pathfinder, new paths, artboards |
| Stage \| Graph views; inspector follows selection; file that plays is the file | Rive | Clip state machine, blend states, listeners-as-will |
| Graph *is* the Cook; timeline is a view | Cavalry | Duplicator, connect-anything, Sheets |
| One playhead; transport sacred; spacebar; graph editor as a *view* | After Effects | Layers, precomps, parenting-as-walk, easing = viscosity |
| Offsets not overwrites; hierarchy ≠ paint order | Harmony | Drawing layers, Merge/Over, exposure sheet |
| Setup/Animate firewall; dopesheet on handles; few tools | Spine | Bone tree, skins, atlas, 512 = bone |
| Few tools; declare what selection may change | Figma | Auto-layout, variants, infinite canvas |

**Hard refusals (incompatible first-class claims):**

- AE layers vs Cavalry nodes — pick nodes as Cook, never layers.
- Cavalry Join (Σ) vs Harmony Composite (over) — pick Σ on one lock.
- Rive OR-states vs Harel AND-regions — pick AND (already Machine law).
- Illustrator path vs Spine bone vs cage — pick cage.
- Nuke Merge — lock-illegal (`pixel_buffers_forbidden`).

Studio V2’s “AE transport + Rive Stage/Graph + Cavalry nodes” is three metaphors. Only this survives: transport is AE’s *one* law, Stage|Graph is a *view split*, nodes are the Cook.

---

## 3. Three times

| Time | Analog | Owns | Must never |
|---|---|---|---|
| **Construction** | Spine Setup, Harmony Setup | Identity `L`, rest W, face lock | Mutate during play |
| **Forwards** | Every frame | handles → 512 → Voigt → κ → orbit → pearl → `d` | A second writer |
| **Score** | AE / Rive timeline | `τ ∈ [0, T]` on **parameters** | Key the 512, key world pose, ease a plant |

Gait `φ` is a phase, not a Score and not a Machine state.

---

## 4. What exists (audit — do not plan on lies)

LIVE you can see: `DaisFirstStageHost` + `StudioDesk` + `StudioTransport` + `NodeGraphPage` + FormMaster `#body`.

| Claim we already made | Truth |
|---|---|
| One transport | Monitor still has a second playhead |
| Mute is passthrough | Only κ. Voigt mute snaps to 0.02 |
| Wires cook | `evaluateGraph` ignores links; Couple is hardcoded |
| 1000-field is the hull | TS field is a twin; sculpt is the only hull write from the cage |
| Scrub the 20s | Fire-set cannot unfire. `clock.scrub(now)` is a no-op |
| Catalog is honest | Instrument/Lumen still stamped LIVE while unmounted |

About **six sliders** move him: foot, cleft, coupling, voigt.tau, gait.hz, handles, orbit.yaw, kappa.cap, support.k, grid.

Unused controls: pearl.depth, voigt.rest, machine.gate, northstar-20.play global.

Two autoplays fire the 20s (host 1400ms + app boot).

---

## 5. Easing (PHD)

**Do not add a sixth easing stack.** Extend `CurveTrack`.

```
Key = { t, value, in:{dt,dv}, out:{dt,dv}, interp: hold|linear|auto|bezier|overshoot }
m = dv / max(dt, ε)
v(s) = Hermite(p0, p1, m0, m1, Δt, s)
```

CSS `cubic-bezier` is a **preset compiler** into handles, not the store.

**Never key:** 512, `d`, world pose while physics is armed, `τ_plant`, `_lp` memory, camera.

**Must key (Score):** yaw/heading windows, face energy, cadenceHz, driveGain, compression, gather stretch, node sliders that already move him.

**Stay discrete:** boo, walkEnable, land, loop, launchComet kick, expression *id*, strut *targets*.

**Take must become state-of-t** before any ease is visible on the 20s. Backward seek = reset to bind + replay impulses with `at ≤ t`. Not un-apply.

Physical: VEC-401 only. Plant is C⁰. C² on the W is illegal.  
Artistic: slow-in-slow-out on parameters. Do not ease the kick, the plant, or yaw at T0.

---

## 6. Compositing (PHD)

**Pick (A). Refuse (B).**

There is no plate B. A Merge/Over/Mask graph after the hull is a second painter and is lock-illegal.

Wires carry: `contour | lattice | relief | scalar | phase | pose | take | shade`.  
Never images, EXR, mix-blend, SVG filters, precomps.

VEC-501 is the pose mixer (Harmony offset math). It is not Nuke. Do not catalog the ghost `compositor` as a sixth column.

Mute law: `out = in` on the incoming buffer. Cards OFFSET from `base`. Amplitude 0 = identity.

---

## 7. Chrome (DesignOps crystal)

```
┌─────────────────────────────────────────────┐
│  STAGE  |  GRAPH          [ Gasper PiP ]    │
│  (body) |  (Cook)         drag / sculpt     │
├─────────────────────────────────────────────┤
│  ■  ▶/❚❚  20s  ↺   ████████●────  08.4/20  │
│  Grid  Rec     [ dopesheet of selected ]    │
│  inspector of selection (not a museum)      │
└─────────────────────────────────────────────┘
```

- Two modes. One transport. One inspector. Nothing else permanently on.
- Graph editor (value of selected Score channel) *replaces* the dopesheet when toggled — Rive’s law.
- Monitor is a picture, not a second transport.
- Delete CSS-corpses from the host. Do not keep mounting the dead.

---

## 8. Day book — execute in this order

Full steps, proofs, and stop-conditions:  
`docs/triforce/plans/2026-08-18-studio-master-book.md`

Waves are serial. A wave that fails its proof does not start the next.

| Wave | Residual | Proof |
|---|---|---|
| 0 Honesty | costume-chrome | Host mounts only live surfaces. One autoplay. Catalog matches mount. Monitor has no transport. |
| 1 State-of-t | fire = curve | Scrub 12s → 4s restores pre-comet walk. Loop wrap plants. |
| 2 CurveTrack | easing = physics | Independent in/out. yaw/face/cadenceHz tracks. Play = scrub evaluator. |
| 3 Cook language | rack = script | Illegal sockets reject. Mute passthrough. Wires change Couple. |
| 4 Instrument | badge-rail = transport | Dopesheet + value graph. Slider undo. Dead files marked or gone. |

Do not recut FormMaster. Do not add Merge. Do not stamp engine 3.3. Do not key the 512.

---

## 9. Deposits this turn

- `docs/triforce/canon/runs/2026-08-18T18-00-00-000Z-explore-vector-studio-ux`
- `docs/triforce/canon/runs/2026-08-18T18-17-00-000Z-explore-keyframe-easing-curves`
- `docs/triforce/canon/runs/2026-08-18T18-17-00-000Z-explore-node-based-compositing`
- `docs/triforce/canon/runs/2026-08-18T18-30-00-000Z-explore-seven-studio-laws` (this synthesis)
- `docs/triforce/plans/2026-08-18-studio-master-book.md`
- This file

Next actor: worker on Wave 0. Human says go.
