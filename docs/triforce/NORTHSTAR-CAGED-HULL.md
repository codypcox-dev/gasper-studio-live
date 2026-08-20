# NORTHSTAR — Caged Hull

**Id:** `GASPER-CAGED-HULL-001`  
**Status:** LIVE-OBSERVED — G1–G11 machine-proven and agent-watched on 2026-08-17. Not owner acceptance (S3).  
**Proof:** `screenshots/ns-final/gates.json` — bloomTravel 50.9px, stanceDY 8.0, cleft ≥ 12.7, orbit 162→113, ribbons 0, floor still, console clean.  
**Written:** 2026-08-17 · owner tired of repeating himself.  
**Authority:** this file wins over chat memory, prior plans, and any new composer an agent wants to invent.  
**Live paint:** FormMaster `packages/desktop/src/gasper/assets/all-script-3.js` (`legacy-authority-formmaster-v655`). TypeScript scaffold modules are twins or contracts. They do not paint unless this file says they do.

This file is the product we agreed to. Every turn re-reads it before editing. One residual at a time. No parallel systems.

---

## 1. What Gasper is

Gasper is a **living vector-fabric organism**. Not a sprite. Not an SDF blob. Not a painted cartoon with a grid stuck on it.

The **25×40 cage (1000 points)** is his skin, his shape, his motion, and his light. One embedding. The silhouette is the rim of that embedding. The grid is that embedding made visible. Light is that embedding facing a room.

He is a **deep glossy purple pearl**. That look is not optional. Every form (Wispwalker rest, strut, notice, morphs, orbit) must be recognizable as the same organism: dark urethane volume, soft traveling key, sealed W, locked face, no cartoon ears, no white gel, no extra organs.

**Rest reference:** the unify-back pearl. If a frame does not read as that creature, the turn failed — even if the math is “correct.”

---

## 2. Irreducible law

```
                    25×40 cage  (the skin)
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
        HULL           GRID           LIGHT
     (512 rim)    (same verts)   (n̂ · L on verts)
```

If hull, grid, and light disagree, the system is wrong. Do not add a fourth writer.

```
C = Γ(L) + Σ s_i
```

- `L` is rest identity.
- `s_i` are named sources: nubs, W / feet, stance, yaw perspective, relief / goose, authored morphs.
- Amplitude 0 is identity. Topology never remeshes. Shape is an embedding.
- Polar lock: 25 rings × 40 sectors = 1000 verts. Rim ring 24 is the silhouette coupling.
- 512 contour samples the rim. It does not own a second body.
- One Kelvin-Voigt `τ` law, regionally weighted, plant-gated. Not a bag of unrelated easings.

**One writer, three readers.** New modules (`CageHull.ts`, `CageTau.ts`, a fake triforce 3.3, a second painter) are forbidden unless this file is amended by the owner.

---

## 3. Final decisions

### 3.0 Canonical appearance (honored, not optional)

| Decision | Law |
|---|---|
| Unify-back is rest | Deep purple, sealed W, pupil-less face, soft key. Not pale lavender. Not white gel. |
| Color | Dark pearl urethane. `bodyBase` stays in the violet well (`#2a1068` → `#7a44c8`). Rim never blows to `#fff`. |
| Depth | Optical depth + inner volume give a dark well, not a flat sticker and not a second body under the skin. |
| Light | One soft traveling key + a larger dim bloom. No hard `#fffaff` islands. No white circle overlays. No screen-blend. |
| Silhouette | Identity W + the pearl’s own side fullness (`baseRadiusV63` 6.5). **No extra ear term.** Cartoon lobes are a fail. |
| Forms | Wispwalker, puff, pinch, remote, paddle, goose, orbit — same organism, same material, same face law. A morph changes embedding, not species. |
| Weird is a regression | If he looks “off” (ears, pizza, film, bleach, melted W), stop and restore appearance before any new feature. |

### 3.1 Cage / topology


| Decision | Law |
|---|---|
| 1000-point 25×40 cage | The only shape authority. Goosebump-level mapping. Can puff like a blowfish or become a TV remote. |
| No remesh | Point count may LOD for a morph (paddle ladder) then return. Neutral topology is 25×40. |
| Rim = hull | Ring 24 couples into the 512. The painted `#body` path is that rim, not a parallel gauss body. |
| Regions | crown, face, torso, leftLobe, rightLobe, crotch, leftLeg, rightLeg, feet. Isolate does not leak. |
| Live paint | `all-script-3.js`. Do not overwrite the file. Surgical edits only. |
| FormMaster v6.5.5 | Production authority. TS contour solver is firewalled off `#body`. |

### 3.2 Grid

| Decision | Law |
|---|---|
| Grid **is** the skin | Meridians and parallels are the cage, not a decal. |
| Hull locked to grid | Outer ring of the grid **is** the silhouette. Nubs and W are grid vertices pushed out. |
| Visibility | One pill toggle. On or off. Default off for play, on for authoring / proof. |
| Morphs | Grid hidden while a morph (pinch / puff / paddle / …) is live. Toggle still wins when the user turns it on to inspect. |
| At rest | Grid lofts the **live 512** (nubs + W included). Never a nubless rest-pearl pizza that ignores the hull. |
| During morph | Grid may read `__GASPER_FABRIC_POS__` / XYZ of that morph. |
| Backfaces | Meridians that cross the perspective horizon are hidden. The far nub disappears with them. |
| No second grid | Hex / goose / “good grid” overlays do not replace this cage. |

### 3.3 Nubs, W, perspective

| Decision | Law |
|---|---|
| Nubs are cage | Side nubs (ears) and foot nubs (W) are displacements on the 25×40 / 512. Not SVG ribbons at x=34 / x=206. |
| Ribbon dual is dead | `leftLobeVolume`, shade, aura, contained-lobe material, spatial-depth restore: opacity 0. They may never sit outside the grid again. |
| W | Two load-bearing feet + center cleft. Rest cleft ≥ 12 px on stance sockets (188 / 188 / 172). Air gap on the swing foot. No Y-chew that flattens the W into a pad. |
| Identity W | `WISPWALKER_CANONICAL_CONTOUR` + `footAmp: 4`, `armAmp: 0`, `lobeAmp: 3.2`, `cleftDepth: 3.2`, `crownAmp/chinAmp: -5`. Gait does not rewrite identity radius. |
| Side nubs | The pearl’s own side fullness only (`baseRadiusV63`). No extra 7.2 ear term. Grid wraps what the hull already is. |
| Far nub | The out-of-view nub crossing the horizon is hidden / tucked. `farTuck` is live, never authored 0. |
| Near nub | The closer nub moves forward and reads larger. `nearExpansion` is live. |
| 3/4 default | Yaw 8°. Heading does not chew the W. |
| Adobe turntable (UNCHANGEABLE) | Continuous Euler on S¹. `w(θ)=√(cos²θ + t² sin²θ)`, t=0.90. Height is never 1/width. `facingVerticalScale=1`. `farTuck` and `nearExpansion` live (`sin θ` lobes). No ±45 cone fold. No `min(22,|θ|)` on locomotion paint — 22° is a **shot pin** only (`READABLE_THREE_QUARTER_DEG`). 90 is 90. 180 is the back. Shortest-arc pursuit. Face is Map Art on the volume. Shell `skewX=0` while stance is live. Plant is sockets + Voigt, not parallelogram. |
| κ-box (G¹ lock) | After `_lp`, before `closedSpline`. Lower rim (`y>140`) turning θ ≤ 0.90 rad. Rest cleft 0.54 is a feature. 3 rad is a fail. Foot peaks re-asserted. Never `/Σw`. C² everywhere is a pad. |

### 3.3a Adobe 2.5D lock — UNCHANGEABLE

This block is law. An agent may not weaken it to “fix” a still.

| Forbidden | Why |
|---|---|
| `farTuck=0.0*turn` | Lobes freeze. W shears. Adobe near/far is `sin θ`. |
| `vK = 1/hK` / `facingVerticalScale ≠ 1` | Card squash. Adobe Inflate never does this. |
| `facingProjectionYawDeg` as paint | 90 and 180 become one sticker. |
| `min(22, \|θ\|)` on locomotion yaw | Stuck Rotate dial. 22° is a **take pin**, not a fold. |
| `stepSkewDeg` while `stance.live` | Parallelogram plant. Sockets + Voigt own the W. |
| `/Σw` on overlapping foot gaussians | Needle. Un-normalized `posed += Σ w Δ` only. |
| C² spline that replaces the W | Pad. κ-box, not a second `d` writer. |
| 45° `hemisphere` gate on width | Whole-body X snap. Width is the ellipse, always. |
| Linear lerp through the camera | Unwind shear. Shortest-arc only. |

Adobe Rotate / Revolve / Inflate / Map Art / Turntable are continuous in viewing angle. Gasper must be too.

### 3.4 Light / material

| Decision | Law |
|---|---|
| Light lives on the cage | `n̂ · L` on the 1000. Highlights **slide** as he yaws, leans, and steps. |
| No hard painted highlights | Fixed `crownHotGrad` / `crownBloomGrad` / `keyCore` / facet islands are not the light. If those gradients exist they are **driven** by the spec centroid, not pinned at (86,42) / (132,42). |
| No screen-blend film | `mix-blend-mode: screen` overlays are banned. They blew him out to white gel. |
| No purple film under the skin | No second body, no pizza-fan shade, no vesicle stack under the pearl. |
| Canonical look | Deep glossy purple pearl. Soft traveling key + fill + rim. Arms and legs receive the same light as the crown. |
| Cyan well | Subsurface / optical depth is the pearl’s interior, intensity-only, not glued specks. |
| Spec must travel | Across a northstar walk, spec centroid / bloom `cx` must move **≥ 16 px**. Frozen spec is a fail. |
| Face | Pupil-less (S6). Canonical rig is the source of truth. Body clears the face disk. Yaw may slide the face around the perimeter; the face does not shrink to a bad hull. |

### 3.5 Physics / tau / walk

| Decision | Law |
|---|---|
| One τ law | Kelvin-Voigt. Plant `τ = 0.02`. Swing `τ = 0.07`. Rest hold `τ = 0.42`. Fabric default `0.12`. Regions inherit. Plant gate stiffens the loaded leg. |
| Stance sockets | `__GASPER_STANCE__` `{left,right,crotch,x,y,theta,planted,tau,live,side}` is the W pose writer. |
| Forbidden chew | `posed.y -= _liftPx * _swingArtW` is banned. `_cyanPlant = 0` is banned. |
| Walk | Run-in-place / strut W. Plant vs swing contrast. Air gap. Cleft survives gait. Not a skate, not a melting pad. |
| Intro | Sealed rest. Floor baseline locked. Camera does not tip. Glow spot stays on the floor. `walkPhysicsDrivenHold` is the rest provenance. |
| Floor | No pulse, no flash, no shifting plane on footsteps. Bounce highlight opacity 0. Ground `transform` attribute removed / empty. |
| Viscosity | Wired to the cage and stance. One-shot snap must not bypass τ. Stuck snap flags are a bug. |
| Takes | Authored takes are reusable from any position / embodiment. Same physical laws. |

### 3.6 Authoring / UI / 360 orbit

| Decision | Law |
|---|---|
| Instrument, not a dashboard | Settings are a collapsible instrument. Teaches itself. No hidden dials. Every live coeff has a bipolar slider (0 at center, travel both ways). |
| Settings stay | Skin, fabric, pose, form, limbs, walk, light, physics, craft, **orbit**. Wired to the same live coeffs the painter reads. Missing a dial is a regression. |
| Grid pill | Slider-style on/off. Morphs do not force the grid on. Orbit 360 may turn it on to demonstrate the cage. |
| Yaw identity | Authored facing dial stays 8° (0–45 cone). Do not blow `clampYaw` to invent 360. |
| **360 cage orbit** | Separate orbit yaw (−180…180, wraps) + pitch (−80…80). Rotates the **lofted 25×40 cage**. Grid and (when orbiting) hull are the projected cage. Drag on Gasper to orbit. “Orbit 360” plays a full turn with grid on. |
| Demonstrate the grid | At orbit ≠ 0 the meridians wrap nubs in 3D. Far side hides. Near side comes forward. This is the mastery proof of the cage. |
| Default orbit 0,0 | Identity northstar / walk do not change until the user touches orbit. |
| Embodiments | Authored cage profiles save to the list. |
| API | `GasperField` + `setOrbit(yaw, pitch)` on the rig. |
| Morphs | Embeddings of the same cage. Face stays. |

### 3.7 Proof ritual (every turn)

After **every** material turn the agent must:

1. Re-read this file.
2. Run identity + cage-honor + walk authority tests.
3. Play northstar opening at 120fps (`scripts/proof-120-loop.mjs`).
4. **Watch** rest, strut (~3.4s), and at least one later beat. Compare to unify-back and G1–G10.
5. If a closed dual reappears (ribbons, floor pulse, white gel, frozen spec, melted W), stop and fix that dual. Do not ship the new feature on top of the regression.
6. If orbit was touched, also capture yaw 0 / 90 / 180 / 270 and pitch +35 with grid on.

An agent who skips the 120fps watch has not finished the turn.

### 3.8 Governance

| Decision | Law |
|---|---|
| ThinkOps | Name **one** residual. Kill duals. Do not “make everything better.” |
| DesignOps | UI / instrument surfaces. |
| PlanOps | Work, proofs, turns. |
| Triforce | Vendor on disk is **3.0.0**. Do not stamp a fake 3.3. Domain law lives in this file. |
| Proof | 120fps watch after every material turn. Agent watches. Owner accepts (S3). Skipping the watch means the turn is not done. |
| No overwrite | Never replace `all-script-3.js` wholesale. Surgical edits only. |
| Tests | Identity, W, plant-gated τ, northstar walk, cage-honor. Update stale tests to the stance path. Do not revive forbidden strings to make a test green. |
| No repeated mistake | A dual that has been killed stays killed. If it returns, stop and restore it before any new work. |


---

## 4. Forbidden duals (if you see these, you are wrong)

| Dual | Means |
|---|---|
| ribbon-lobe = cage | Painted ears outside the grid |
| pizza-POS = rest hull | Grid is a nubless sphere; body is a W |
| farTuck = 0 | Far nub never hides |
| screen-film = pearl | White blowout overlay |
| posed.y chew = walk | W melts into a pad |
| `_cyanPlant = 0` | Floor / plant writer gutted |
| restPearl spec = live light | Highlight frozen while he moves. Closed by `sampleCageLight` — `n̂ · L` on the 25×40 every frame. |
| new CageHull.ts = fabric | Fourth writer |
| triforce 3.3 stamp = upgrade | Lie about the engine |
| goose freckles = 1000-point skin | Decals instead of displacement |
| hard keyCore = lighting | Fixed white islands |
| two τ writers | Scaffold τ fighting painter τ |

---

## 5. 120fps proof gates (chase these)

Opening 20 of northstar, grid **on** for cage proof, grid **off** for beauty proof.

| Gate | Pass |
|---|---|
| G1 Rest pearl | Deep purple, sealed W, face on canon, no white gel, no ribbon ears |
| G2 Hull = grid | With grid on, every nub and both feet sit **on** meridians. Nothing painted outside the outer ring |
| G3 Far / near | At yaw ≥ 8°, far nub tucks / hides with back-facing meridians; near nub comes forward |
| G4 Light travels | bloom `cx` or spec centroid travels **≥ 16 px** across 2.6–5.2 s. Arms/legs receive light |
| G5 No floor event | bounce opacity 0, ground transform empty, no flash on plant |
| G6 Walk W | stance live, stanceDY ≥ 6, cleft ≥ 10 during strut, swing reads as leave not smear |
| G7 Ribbons dead | left/right lobe volume/shade/aura opacity 0 the whole take |
| G8 Intro locked | t=0..2.6 camera/floor baseline still. No tippy camera. Glow spot on the floor |
| G9 Console | No uncaught errors |
| G10 Identity | `armAmp: 0`, canonical contour coeffs, gait stays out of `formRadiusAtFor` |
| G11 Orbit | Orbit 0,0 is identity. At 90° / 180° / 270° with grid on, meridians wrap nubs; far hemisphere hidden; walk/W not melted at orbit 0 |

---

## 6. Residual queue

Owner order 2026-08-17: close G1–G11. Agent-watched 2026-08-17. Remaining is **owner eyes (S3)** — not a second composer.

| Gate | Live-observed |
|---|---|
| G1 Rest pearl | yes — deep purple, sealed W, no ears, no gel |
| G2 Hull = grid | yes — meridians wrap W and sides |
| G3 Far / near | yes — 90° orbit hides far hemisphere |
| G4 Light travels | yes — bloom driven by cage `n̂ · L` centroid + stance crawl. Residual name: **light-deaf-to-gait**. |
| G5 No floor event | yes — bounce 0, ground transform empty |
| G6 Walk W | yes — live 1, DY 8.0, cleft 12.7, advance 14 |
| G7 Ribbons dead | yes — lobe opacity 0 entire take |
| G8 Intro locked | yes — t=800 rest visible, floor still |
| G9 Console | yes — no uncaught errors |
| G10 Identity | yes — identity + walk authority tests green |
| G11 Orbit | yes — 0/90/180, width 162 / 113 / 132 |

Beauty reference (grid off): the unify-back pearl — deep gloss, proper W, soft key, no extra ears glued on.

Cage reference (grid on): the owner’s polar-grid still — clean meridians, nubs **are** the grid, far side recedes.


---

## 7. What “reached” means

This document is reached when G1–G10 are live-observed on a fresh northstar 20 at 120fps, with thinkops claiming **one** residual and the dual table still killed — and the owner has not had to restate any row in §3.

Until then: do not invent process, do not bump engines, do not open a second body.

---

## 8. Pointers

- Owner voice log: `docs/triforce/NORTHSTAR.md`
- Mesh trio: `docs/triforce/canon/MESH-STACK.md`
- Viscosity cluster: `docs/triforce/canon/VISCOSITY-CLUSTER.md`
- Motion history: `docs/triforce/NORTHSTAR-GASPER-MOTION.md` (chronology, not this contract)
- ThinkOps now: `docs/thinkops/CURRENT.md`
- Lock: `docs/triforce/canon/CAGED-HULL-LOCK.json`
- Honor tests: `packages/desktop/src/gasper/physics/CageHullHonor.test.ts`
- 120fps harness: `/workspace/scripts/proof-120-loop.mjs`
