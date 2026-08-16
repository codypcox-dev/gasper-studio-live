# 2026-08-14 — Cinematic affect overnight (implementation order)

**Worktree:** `C:\Users\funny\Documents\GasperStudio-worktrees\integrate-main-20260814`
**Surface:** `http://127.0.0.1:5179/` (do not restart without owner word)
**Do not:** commit, push, edit this brief after handoff, self-issue owner visual acceptance.
**Do not:** add pupils / lids / brows / cheeks / new mouth anatomy; emotion-wheel internals; one-face-per-emotion; canned clip as physics; LLM in the frame loop; Grimoire; ambient `Math.random`; reset-through-neutral; a second free-motion writer.

**Sole free-motion writer:** `WorldPhysicsDriver`. Wander / life / performance file `LocomotionIntent {x,z,cruise}` only.
**Time:** organism clock only. **φ** is the design generator. Continuity: inherit current values and velocities.

Owner ask tonight: smoother cinematic movement + emotionally alive body language, driven by the causal affect stack, **and** the body must stop reading as a sliding 2D card. Sky is the limit for research. Implementation stays legal.

---

## Residual order (do in this sequence)

R1 is the only residual that must be *visibly different on 5179 before anything else*. Do not start R2–R6 until R1's machine gate is green and a walk on 5179 no longer skates the contour foot.

| # | Residual | Visible on 5179? |
|---|---|---|
| R1 | `plantedWorld` → renderer (kill visual skate) | YES — first |
| R2 | 2.5D turn-in-volume (card-rotate / facing telegraph / depth-as-squeeze) | YES |
| R3 | Walk volume: airborne-stretch + gather as contact physics (kill Y=0 puck) | YES |
| R4 | Causal affect → physics goals / scaffold sources (never emotion names) | YES (body language) |
| R5 | Bidirectional wind samples (reverse-direction receipt) | YES (flight / fast walk) |
| R6 | Adaptive Shell Scaffold source (pressure/relief → 25×40, not a face painter) | YES if R4 needs a surface; else land the contract only |

---

## R1 — Planted world foot into the renderer (FIRST, visible)

**Law:** WorldPhysicsDriver sole writer + SupportExchange world-lock. A planted foot is a world-space sample-and-hold; travel is the support carrier, not a root slide. (`SupportExchange.ts` header; step-cycle-phd-memo S0; walk-weight-transfer-phd-memo R1.)

**SOTA (translate, do not copy anatomy):** Pratt, Carff, Drakunov, Goswami, *Capture Point: A Step toward Humanoid Push Recovery*, Humanoids 2006. The capture / plant point is where support must sit for the COM to stop diverging. Gasper already computes `plantedWorldX/Z`. The renderer still ignores it.

**What is broken (proven):**
- `stepSupportExchange` world-locks the plant (`maxHoldDrift=0`, `plantedWorldLock=true`) — `research/proofs/grok-successor-002/wave-support/receipt.json`.
- `gaitScreen` still emits body-relative `stepBaseXUnits` = `swayUnits * tanh(k·cos(φ/2)) * ⊥(heading)` (`WorldPhysicsDriver.ts` ~1688–1730).
- `all-script-3.js` `setPhysicsGait` / `stepRig` / shadow consume `physGait.stepBaseXUnits` (~1263–1321, ~2876, ~2903). The contour foot rides the body along-track → visual skate after physics plant lock.

**Change (narrow):**
1. `packages/desktop/src/gasper/physics/WorldPhysicsDriver.ts` — add `gaitScreen.plantedScreenXUnits` (and keep `stepBaseXUnits` as the *load* carrier). Project the held plant into screen x:
   - `plantedScreenX = (plantedWorldX - body.x) * scale_perp + (plantedWorldZ - body.z) * …` using the existing S0 `⊥(heading)` idiom (`supportProjectionAxis = -vz/speed`).
   - During a hold, this value must be **constant in world**, so its screen-x changes only because the COM walks past the plant — that is the anti-skate.
   - Do **not** write `body.x/z` from the renderer. Driver remains sole writer. `walkingSupport` may keep applying `cogX/cogZ` onto the body (already legal).
2. `packages/desktop/src/gasper/GasperRigController.ts` `applyPhysicsDriverOutput` — forward the new field through `setPhysicsGait` (same Tuning Lab `footworkPrimitiveGain` fence as `stepBaseXUnits`).
3. `packages/desktop/src/gasper/assets/all-script-3.js`:
   - extend `physGait` + `setPhysicsGait` fence (same ±61.2 as sway);
   - `stepRig` / foot-root / `shadowStepDxPx` use `plantedScreenXUnits` as the **plant**, `stepBaseXUnits`/`swayXUnits` as the **load**.
   - Telemetry: `avatar.dataset.gaitPlantX`.

**Proof:**
- Test: extend `SupportExchange.test.ts` + `WorldPhysicsDriver.test.ts` — during a committed hold (`|hold|≥0.9`), `hypot(ΔplantedWorldX, ΔplantedWorldZ) === 0`; `plantedScreenXUnits` equals the projection of `(plantedWorld − body)` and **does not** track `body.x` one-for-one (anti-skate: `|d(plantedScreenX)/dt + v_screen|` stays near 0 while planted).
- Existing skate comment in `wave-support/receipt.json` must become false.
- **5179:** Wispwalker walk, camera fixed. The down-lobe / contact-shadow patch stays nailed to the floor through single support; the body vaults over it. Today the lobe slides with the root. After: plant holds, COM passes, exchange at double-support only.

**Forbidden:**
- Second motion writer. Authored step-cycle clip. Invented knees / feet bones. Resetting plant through origin. Changing Y floor convention. Touching face grammar.

---

## R2 — 2.5D turn-in-volume (the body is a volume, not a card)

See the dedicated section below for the full diagnosis. This residual is the first 2–3 *legal tunings* only.

**Law:** N38/N39 radial facing; constitution 6.1 “face belongs to the shell”; 7.5 weight/inertia; 7.7 volume conservation; WorldSpace depth law `scale(z)=D0/(D0+z)`. `facingProjectionYawDeg` may fold travel into the readable cone; it must not become a billboard rotate that replaces volume.

**SOTA:** John Lasseter, *Principles of Traditional Animation Applied to 3D Computer Animation*, SIGGRAPH 1987 (Computer Graphics 21(4)). Anticipation / overlap / follow-through / squash as *physical consequences*, not keys. Disney Animation, *The Art of Crowds Animation*, SIGGRAPH 2025 — appeal = clear arcs + planned heading; squash/stretch at the individual as volume, not a gag.

**What is broken:**
- `GasperRigController.ts` ~1528 feeds `setHeadingYaw(facingProjectionYawDeg(facingSliceCenterDeg(bearing)))` — 12-slice truth clamped to ±45°.
- `all-script-3.js` `effectiveViewYaw = viewYaw + headingYaw + attentionYaw`; `viewAmount` saturates at ±1. `worldRig` is `translate + uniform scale(z) + rotate(-tilt)` about the floor anchor (~2866). That is a **card**: one quad, one rotate, one uniform scale.
- `getViewMetrics` already has finite-thickness ortho width (`_orthoWidth`, `facingCompress`) and hemisphere / faceTurnFade / backPresence — under-used. The silhouette still reads as a cutout because the *pose* is a 2D card and the *face* is a yaw-shifted decal (`authorKeyViewPoint` + `faceShift`).
- `verticalDepthGain` in `tuningRegistry.ts` commits `overall_height` — a squeeze gag, not depth-as-volume.
- Wander telegraph (`GoldenWanderDriver.ts` ~302–308 + `GasperRigController.ts` ~838–851) writes `setAttentionYaw` + `setExternalGaze` for φ⁻¹ s **while the body is still at the origin**. `headingYawDeg` stays 0 until `vx,vz` clear the rest gate. Composed `dataset.facingDeg` therefore telegraphs a turn the mass has not begun. Wave-wander receipt remaining residual: “facingDeg still advances during the intent telegraph while the body is still at origin.”

**Change (three legal tunings — do these, not a new turntable):**

**T1 — Heading vs travel (kill the origin telegraph as body yaw).**
- Files: `GoldenWanderDriver.ts`, `GasperRigController.ts` telegraph closure, `all-script-3.js` `setAttentionYaw` / `setHeadingYaw`.
- Keep N41 look-then-go. Telegraph may drive **gaze + attention strength only**.
- Do **not** let `attentionYaw` rotate the shell while `body.vx, body.vz` are below `RADIAL_FACING_LAW.restSpeedUnitsPerSec` (40). Body yaw = `headingYaw` from the kernel bearing after motion exists, pursued at existing `τ·φ²` (~2464).
- Optional legal anticipation (constitution 7.3 / 7.8): during the intent hold, file a **gather** (`support.gatherTarget` / `env.gather`) and a bounded opposite-sign lean via the existing bank/tilt channel — mass loads before the step. No extra rotate.

**T2 — Depth / squash as volume, not `overall_height` squeeze.**
- Files: `packages/gasper-studio/src/tuning/tuningRegistry.ts` (stop committing `verticalDepthGain` → `overall_height`); `all-script-3.js` `getViewMetrics` + `worldRig`; `PhysicsSilhouetteAuthority.ts` volume law already `Sx·Sy=1`.
- `verticalDepthGain` becomes a **projection gain on `wDepthScale` / `facingCompress`**: more gain → more readable z-foreshortening and finite-thickness breadth (`_orthoWidth`), **never** a shorter card.
- Reciprocal: if projected width changes with yaw, height stays camera-stable (comment at ~721–726 is already law — enforce it). Contact squash stays R3 volume-law (`scaleY 1−c`, `scaleX 1+c`) about the floor, not a Tuning Lab height knob.

**T3 — Turn-in-volume (face belongs to the shell).**
- Files: `all-script-3.js` `authorKeyViewPoint`, `getViewMetrics`, `worldRig` rotate; `RadialFacingLaw.ts` (law only — do not explode the cone).
- Use the already-authored extension terms when `|effectiveYaw|>45`: `facingCompress`, lobe near/far, `faceTurnFade`, `backPresence`. Do **not** raise `viewAmount` past ±1 (that explodes the authored 45° curve — RadialFacingLaw forbids it).
- Reduce `worldRig` `rotate(-wTilt)` as the *sole* 3D cue. Tilt stays the vault/bank/flight lean (physics). Yaw is shell deformation + finite thickness, not a CSS/SVG card spin.
- Face apertures ride `authorKeyViewPoint` / stitched local frames (Book 008/009). No second face yaw. No pupils.

**Proof:**
- Test: `RadialFacingLaw` + a new renderer-contract assertion: with `headingYaw=0` and a live telegraph bearing, `dataset.facingDeg` change is **gaze/attention only** (attention yaw fenced ±45/φ) and `worldPose.{x,z}` still at origin; `headingYaw` remains 0 until speed ≥ 40.
- Test: `verticalDepthGain=0.85` does **not** change `overall_height` admission; `worldDepthScale` / `facingCompress` move; `Sx·Sy` stays 1±0.02 (physics-authority-memo / constitution 7.7).
- **5179:** Walk a 3-o'clock then 12-o'clock leg. Today: face yaws while the blob sits, then the card slides and uniformly scales. After: eyes address first; mass gathers; then the shell turns *in volume* (near lobe grows, far tucks, breadth follows `_orthoWidth`); at 12 o'clock the face recedes via `faceTurnFade`, body stays a pearl, not a flipped sticker.

**Forbidden:** Full 3D mesh. Raising `AUTHORED_YAW_RANGE` / unsaturating `viewAmount`. Pupils, lids, a painted far-side face. A second yaw writer. `Math.random` jitter on heading.

---

## R3 — Walk volume: stretch / gather as contact physics (kill the Y=0 puck)

**Law:** Physics silhouette is the squash & stretch authority (`PhysicsSilhouetteAuthority.ts`). Volume law. Walking may keep `y=0` as the **floor convention**; it must not skip the floor dialogue. SupportExchange already charges `impactSpeed` + `gatherTarget`. `envelope.stretch` is the airborne-speed channel — on a grounded walk it *should* stay 0; the missing read is **gather + impact overshoot as COM/silhouette**, not a fake hop.

**SOTA:** GaitSpan (2026), *Growing Humanoid Locomotion from Walking to Running* — H-SLIP: compression, rebound, touchdown, (optional) flight as coordinated dynamic events, not a clip. Translate to Gasper as gather → plant impact → underdamped recover (`ζ=1/φ`), still `y=0`.

**What is broken:**
- Wave-support receipt: `peakStretch: 0`, `yPeak: 0`, `yStaysFloorConvention: true`. Stretch=0 is correct for grounded walk; the *visual* puck is because gather/impact barely reach the silhouette and the renderer still slides the root (R1).
- `WorldPhysicsDriver.ts` ~1632–1641: `walkingSupport` freezes `y:0, vy:0`. Legal. But `stepPhysicsSilhouetteEnvelope` is only stepped when `impactSpeed>0 || gatherTarget>0` (~1454–1472). If those pulses are thin, `env.gather` never reads.
- `physicsSilhouetteDeltas`: stretch contributes `+0.16` height / `−0.12` width — unused on walk. Recover is impact overshoot only (`ζ=1/φ`).

**Change:**
1. Keep `y=0` on walk. Do not invent a hop.
2. `WorldPhysicsDriver.ts`: always step the silhouette envelope while `walkingSupport` (even when `impactSpeed==0`) so `gatherTarget` from `SupportExchange` actually integrates. Impact still charges on exchange/first-plant.
3. `all-script-3.js` / `physicsSilhouetteAdmission`: express `gather` as a **base-anchored** volume crouch (height down, width up, `Sx·Sy=1`, re-planted at floor — same idiom as `exprBodyFe` ~631). Impact overshoot already exists; make it visible at contact (R3 contact squash + envelope.impact, no double-count: flatten is the support patch, squash is the impulse).
4. Flight / Boo: `stretch` may go non-zero when `!contact` (already the law). Do not force stretch onto the walk.

**Proof:**
- Test: `WorldPhysicsDriver` walk — `env.gather` peaks in the exchange window (`|hold|<0.9`); `env.impact>0` on plant; `env.stretch===0` for the whole grounded walk; `body.y===0`.
- Flight mode: `env.stretch>0` when airspeed > 0 and `contact===false`.
- **5179:** Each step shows a tiny crouch before the plant, a contact thicken into the floor, then φ-settle overshoot. Not a bouncing ball. Not a sliding hockey puck.

**Forbidden:** Setting `body.y` during walk. Authored bounce clip. Stretch as a walk bob (bob already has `bobLiftUnits`). Breaking volume law.

---

## R4 — Causal affect writes physics goals / scaffold sources (never emotion names)

**Law:** Expression Science Constitution + Book 004 §§5–6. Stack: event → appraisal → core affect `{valence, arousal, gain}` → action tendency → **then** mass, face plane, gaze, motion, light, voice from one state. A smile is an OUTPUT. No emotion wheel. No one-face-per-emotion. Book 004 `SemanticExpressionIntent` is directional (approach/withdraw, expand/contract, …), not a fixture id.

**SOTA:** Liu et al., *An Emotional BDI Framework for Affective Decision Making Based on Action Tendency*, Electronics 15(8):1691 (2026) — Frijda action tendency as the mediation layer; same affect ≠ same motor program. Zhang & Herrmann, *A Robotic Mind Model for Affective Decision Making and Behaviour Generation*, Int. J. Social Robotics 18:23 (2026) — valence/arousal/gain modulate decision + body, not a label→clip table. LaMoGen (Kim et al., 2025, arXiv:2509.24469) — Laban Effort `{Space, Weight, Time, Flow}` as quantitative motion qualities **without emotion labels**. Translate Effort → Gasper tendency → cruise / gather / bank / scaffold pressure.

**What is broken:**
- `packages/gasper-studio/src/tuning/intentToMotion.ts` — four regex buckets (`height`, `crip walk`, `ground/heavy`, combo) emit Tuning Lab knobs. Not Score → capability gate → physics goals.
- `FacialBodyContinuum.ts` still targets `targetId` fixture semantics.
- `GasperLivingFacialAuthority.ts` still imports `UnifiedEmotionId` / eight-state fixture projection.
- Book 004 v2 (`AppraisalStateV2`, `ActionTendencyV2`, `SemanticExpressionIntent`) is specified, **not a live writer**. No `CanonicalBehavioralState` `.ts` on this worktree.
- `livingIntent.ts` is mount/flush, not the causal stack.

**Change (vertical slice, one writer, no LLM in the loop):**
1. Add a **pure** module (suggested: `packages/desktop/src/gasper/expression/CausalAffectStack.ts`) that holds/steps Book 004 v2 fields only: `appraisal`, `coreAffect {valence,arousal,gain}`, `actionTendency` (orient/explore/approach/withdraw/assert/yield/persist/release/…), `semanticIntent` chirality vector. Organism-clock dt. Continuity: inherit values + velocities (first-order lags at `τ·φ^n`, no reset-through-neutral). Seed from organism rotors, not `Math.random`.
2. **Outputs are goals, not names.** Map tendency → existing authorities:
   - `approach/persist` ↑ → `LocomotionIntent.cruise` toward current target (file through WorldPhysicsDriver only).
   - `withdraw/inhibit` ↑ → lower cruise, higher `gather`, bank away (existing tilt/bank channels).
   - `assert` ↑ → higher `expression_gain` + support flatten / contact squash *gain* (post-kernel Tuning-style fence, not a new writer).
   - `affiliate/orient` ↑ → gaze + attention **strength**, still gated by R2 T1 (no origin body-yaw).
   - expand/contract → scaffold / relief **pressure source** (R6) and `PhysicsSilhouette` gather/intensity — apertures + shell tension, not a smile blendshape.
3. `intentToMotion.ts`: replace regex buckets with “compile to `SemanticExpressionIntent` + capability gate + physics goals”. Tuning Lab knobs may remain as **authoring projections** (Book 004 §6.6 Derived views), never as source affect.
4. Do **not** store `happy/sad/angry`. Do not call `setFixture('pleased')` from this stack. Fixtures remain authored anchors (constitution), selected only if a policy projects intent→anchor with provenance.

**Proof:**
- Unit: same appraisal+affect+tendency + same dt + same seed → identical goal bytes. Interrupt mid-step inherits velocities.
- Ablation: zeroing `actionTendency.approach` changes cruise goal; zeroing a label field (there isn't one) is a compile error.
- **5179:** Two walks, same path, different tendency (high approach+arousal vs withdraw+low arousal). Same embodiment. Different cruise, gather, bank, shell pressure. **No** different stored face. Owner should read “he wants to go” vs “he would rather not” from mass and timing, not from a smile sticker.

**Forbidden:** Emotion enum as state. One-face-per-emotion. LLM in the frame loop. Painting a smile as stored emotion. New facial anatomy. Writing `body.x` from the affect stack.

---

## R5 — Reverse-direction wind samples

**Law:** Flight-physics F-LAW 2 / N31 — lagged dynamic pressure `p=(v/v_c)²` + screen-x direction; renderer trail-stretch / lead-compress. Pure depth travel ⇒ `dirX→0`.

**SOTA:** Same Lasseter 1987 overlap / follow-through: the surface lags the COM. Wind is the overlap channel for a footless (and fast grounded) body.

**What is broken:** `wave-identity/wind-skip.json` — Stage 4 receipts only sample one travel direction (`negativePressureDeltaPx` null). Kernel already lags `wind.dirX` (`WorldPhysicsDriver.ts` ~1558–1565). Tests at `WorldPhysicsDriver.test.ts` ~1783 already expect `dirX < -0.5` then `> 0.5` in isolation. Live 5179 / capture harness does not publish the reverse-direction sample.

**Change:**
- Capture / analyze script (the same family as `scripts/gasper-physics-001/analyze-support-stream.mts` or the 5179 Tuning Lab wind pass): force a +x cruise then a −x cruise (or a 180° wander leg). Record `dataset.windDirX` and contour trail/lead deltas **both signs**.
- Do not retune `windPressureForSpeed` unless a sign is missing in the renderer (`formRadiusAtFor` / `windStretchRadiusDelta` — identity receipt says the function exists). If the renderer ignores `dirX<0`, fix the sign fold in `all-script-3.js` only.

**Proof:**
- Receipt: `+pressureDeltaPx` and `-pressureDeltaPx` both ≥ 0.5 px (N152 wind threshold).
- **5179:** Fast Presence/Boo or Wispwalker reversal — trail on the old side, compress on the new lead, both directions.

**Forbidden:** New wind writer. Random gusts. Stretching the face independently of the shell.

---

## R6 — Adaptive Shell Scaffold source (only if R4 needs a surface tonight)

**Law:** Book 009 — 1000-point (25×40) temporary shell geometry, sourced by pressure/relief, **must not paint its own face**. Coupled to 360/672 lattice, not merged. Book 008: Interior → Pressure → Surface. No pupils/lids/brows/cheeks.

**SOTA:** LaMoGen / LMA Shape (Şahin, Sonlu, Güdükbay, *Data-driven Inverse Kinematics using Laban Movement Analysis*, Computers & Graphics 2026) — Shape Qualities as spatial expand/contract, not FACS. Translate to scaffold displacement, not blendshapes.

**What is broken:** Book 009 disposition claims `AdaptiveShellScaffold.ts` + `ReliefScaffoldSource.ts`. **They are absent on this worktree** (and on `grok-successor-foundation`). Production still treats the 1000-field as relief samples / SVG ellipses (Book 008 rejected as canonical).

**Change (contract, not a new face):**
- If time after R1–R5: land a **pure** `AdaptiveShellScaffold.ts` (1000 verts, deterministic faces/normals, exact-zero at amplitude 0) + one endogenous source = R4 `semanticIntent` expand/contract + relief amplitude. Do not hook a new SVG painter. Existing outer-shell / aperture consumers stay until the shared frame contract is proven (Book 009 A3–A4).
- If not tonight: do not fake it. R4 writes gather/intensity only.

**Proof:** amplitude 0 → identity zeros; continuous pressure → continuous displacement; topology still 512/360/672/1000. No fourth face system.

**Forbidden:** Ellipse face painter. Merging scaffold into the lattice. Brows. Opacity-as-geometry proof.

---

## 2.5D projection vs physics body (owner add — read before R2)

This is the diagnosis the residuals above implement. Do not invent a second projector.

### How 3D `WorldBodyState` becomes the 2.5D silhouette today

```
WorldPhysics.stepWorldBody
  body {x, y, z, vx, vy, vz, angle, angVel, contact}
       │
WorldPhysicsDriver (SOLE writer)
  walkingSupport → y=0, vy=0, x+=cogX, z+=cogZ, angle=support.angle
  pose {x,y,z,tilt}  tilt = lean+bank  OR flight bank  OR travelTilt
  gaitScreen {bob, swayX, roll, squash, stepBaseX, flatten, bank}
  facingBearingDeg(vx,vz) | null if speed < 40
       │
GasperRigController.applyPhysicsDriverOutput
  setWorldPose(pose)
  setPhysicsGait(gaitScreen)
  setHeadingYaw( facingProjectionYawDeg( facingSliceCenterDeg(bearing) ) )  // CLAMP ±45
  wander telegraph → setAttentionYaw + setExternalGaze   // can fire at origin
       │
all-script-3.js (FormMaster)
  worldRig: translate((x+sway)/8 * scale(z), -horizon)
            scale(scale(z))                          // WorldSpace: D0/(D0+z)
            rotate(-tilt) about floor (120,190)
  idleRig:  altitude (y + bob) inside the scaled frame
  stepRig:  body-relative stepBaseX   ← SKATE
  face:     authorKeyViewPoint(effectiveViewYaw) + faceShift
  facingDeg = viewYaw + headingYaw + attentionYaw     // dataset
```

`WorldSpace.ts`: camera is the monitor; shot scale is Gasper moving in z; floor recedes with `floorToHorizonPx·(1−scale(z))`. That part is correct and must stay.

### Facing vs travel (headingYaw vs facingDeg telegraph)

| Channel | Who writes | When live | What it should mean |
|---|---|---|---|
| `facingBearingDeg` | Driver from `vx,vz` | speed ≥ 40, locomotion/comet-fly only | Travel clock (12 slices) |
| `headingYawDeg` | Renderer pursuit of `setHeadingYaw` | After kernel bearing exists | Body commit to travel slice, τ·φ² |
| `attentionYawDeg` | Telegraph / life `setGaze` | N41 intent hold, social address | Eyes + *fenced* address, **not** body yaw at rest |
| `viewYawDegrees` | User dial | User-owned | Override |
| `dataset.facingDeg` | Sum, fenced ±180 | Always | Telemetry of the composed law |

**Bug:** telegraph writes attention yaw (and therefore `facingDeg`) for φ⁻¹ s while `worldPose` is still the origin and `headingYaw===0`. That is a look. It currently reads as a body turn. R2 T1.

### Depth / squash / `verticalDepthGain` as volume

- Honest depth: `wDepthScale = D0/(D0+z)` + horizon lift. Keep.
- Honest contact squash: R3 `scaleY=1−c`, `scaleX=1+c` about the floor. Keep.
- **Gag:** `verticalDepthGain` → `overall_height` (`tuningRegistry.ts` ~314, ~612). That shortens the card. R2 T2 remaps it onto projection / finite-thickness breadth.
- `getViewMetrics._orthoWidth` is the legal 3/4-view thickness read. Use it. Do not reciprocal-stretch height to fake depth.

### Turn-in-volume (face belongs to the shell)

Constitution 6.1–6.3: eyes and mouth are co-equal **shell-deformation sources**. `authorKeyViewPoint` already deforms the shell with yaw (near expansion, far tuck, crown bias, depth parallax). The fake is stacking a **uniform card rotate** on `worldRig` and a **faceShift decal** on top, then clamping all travel into a 45° sticker cone so side/rear never become volume.

Legal: keep the cone for the *authored* 2.5D curve (`viewAmount` saturate ±1). Past 45°, the **extension terms already in `getViewMetrics`** (hemisphere, faceTurnFade, backPresence, facingCompress) must actually drive the silhouette. Face apertures follow the same projected surface. No new anatomy.

### What currently makes the body feel fake

1. **Card-rotate** — `worldRig` uniform scale + `rotate(-tilt)` as the only 3D; yaw is a 2D squash of a cutout (`viewAmount`).
2. **Root slide** — renderer `stepBaseX` body-relative; physics plant is world-locked (R1).
3. **Missing overlap** — heading/attention/mass commit on the same sample as the intent hold; constitution 7.3 wants eyes → face plane → mass → shell → light. Telegraph currently yaws the shell first.
4. **Y=0 puck** — walk freezes altitude; gather/impact barely expressed; stretch correctly 0 but the floor dialogue is invisible (R3).
5. **facingDeg telegraph** — composed yaw moves at origin (R2 T1).
6. **Depth-as-squeeze** — `verticalDepthGain` hits `overall_height` (R2 T2).

### First 2–3 natural-feel tunings that are legal (φ, sole writer, no pupils)

Do these inside R1–R3. Constants stay φ-derived; no new random.

1. **Plant lock (R1)** — `plantedScreenXUnits` from `plantedWorld − body`. Biggest single “he has weight” read on 5179.
2. **Look ≠ turn (R2 T1)** — telegraph = gaze + gather; `headingYaw` only after `speed≥40`; pursuit already `1-exp(-dt/(0.06·φ·φ²))` in `all-script-3.js` ~2464. Add opposite-sign gather lean at `GAIT_ANTICIPATION_FRACTION` (already in the driver for support-x) onto the **tilt** channel, not yaw.
3. **Volume depth (R2 T2 + R3)** — remap `verticalDepthGain` off height; express `env.gather` as base-anchored volume crouch; keep `Sx·Sy=1`. Optional: raise `facingCompress` contribution of `_orthoWidth` by `φ⁻¹` inside the cone (comment already allows a small finite-thickness width read at 3/4) — **do not** unsaturate `viewAmount`.

---

## Tomorrow morning — owner eyes (what should look different)

Open `http://127.0.0.1:5179/` (or the worktree preview the implementer names with a **full path** to the contact sheet). Wispwalker first, then a footless fly. You are the only acceptance.

Walk (Wispwalker)
- [ ] Planted lobe / shadow patch **stays on the floor** through single support. Body moves over it. No skate.
- [ ] Before each go: eyes address the direction; the **body does not spin in place**. Then a small gather (he gets heavier), then the step.
- [ ] Mid-stance: mass over the planted side (sway + roll). Contact: slight thicken into the floor, then a short φ settle — not a cartoon squash gag, not a puck.
- [ ] A 3-o'clock walk turns him in **volume** (near side fuller, far side tucked). A 12-o'clock walk recedes the face *with the shell*. He is not a playing-card.
- [ ] `verticalDepthGain` 0.85 (if still on the compound recipe) makes him read **deeper**, not shorter.

Fly / reversal
- [ ] Trail-stretch / lead-compress on **both** directions. Lean into acceleration, not a constant velocity tilt.

Affect (same path, two tendencies — if R4 landed)
- [ ] High approach+arousal: snappier cruise, clearer gather, more shell pressure. Low / withdraw: slower, more inhibit, contracted shell. **Same face grammar.** No new smile asset. No pupils.

Machine (not acceptance)
- [ ] Focused vitest: `SupportExchange`, `WorldPhysicsDriver`, `RadialFacingLaw`, `GaitLaw`, `GoldenWander` telegraph, `intentToMotion` if R4 touched.
- [ ] `dataset.gaitPlantX` present; `dataset.facingDeg` does not jump at origin without `headingYaw`.
- [ ] No commit / no push unless you say so.

**Owner visual acceptance is never self-issued.**

---

## Citation list (real; translate into laws, do not import systems)

- Pratt, J., Carff, J., Drakunov, S., Goswami, A. *Capture Point: A Step toward Humanoid Push Recovery.* IEEE-RAS Humanoids 2006.
- Lasseter, J. *Principles of Traditional Animation Applied to 3D Computer Animation.* SIGGRAPH 1987 / Computer Graphics 21(4).
- Walt Disney Animation Studios. *The Art of Crowds Animation.* SIGGRAPH 2025.
- GaitSpan. *Growing Humanoid Locomotion from Walking to Running.* arXiv:2607.12114 (2026). H-SLIP / SLIP-inspired compression–rebound–touchdown.
- Kim et al. *LaMoGen: Laban Movement-Guided Diffusion for Text-to-Motion Generation.* arXiv:2509.24469 (2025).
- Şahin, M.A., Sonlu, S., Güdükbay, U. *Data-driven Inverse Kinematics using Laban Movement Analysis.* Computers & Graphics 138:104643 (2026).
- Liu et al. *An Emotional BDI Framework for Affective Decision Making Based on Action Tendency.* Electronics 15(8):1691 (2026).
- Zhang, J., Herrmann, J.M. *A Robotic Mind Model for Affective Decision Making and Behaviour Generation.* Int. J. Social Robotics 18:23 (2026).
- Internal (binding): `research/constitution/GASPER_*_CONSTITUTION_v0.1.md`; Book 004 §§4–6; Books 008–009; `research/canon/anim-physics/{walk-weight-transfer,physics-authority,radial-facing,step-cycle,flight-physics}-phd-memo.md`; wave receipts under `research/proofs/grok-successor-002/`.
