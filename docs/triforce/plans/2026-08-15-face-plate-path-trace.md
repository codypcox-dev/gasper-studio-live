# Face-plate path trace — take / prep / morph / flight (2026-08-15)

Not a visual PASS. Not owner acceptance. Membrane residual only.

Scored picture: seq11 `10.5–12.5s` (Cody: plate reappears ~11.4s). Capture
telemetry: `wispwalker`, `y=0`, cruise 380, heading 0, eyes still
`listening-orient` from t=6.6. Deleted discs (`faceFieldNode`,
`violetFieldNode`, `faceZone`) are gone. Accretion/horizon nodes are
opacity 0. The plate is authored by the paths below.

## A. Always-on drawing (live FormMaster SVG)

These exist every frame. They become a *face card* when the apertures
close and interior energy rises.

| Authority | File | What it paints |
|---|---|---|
| `#body` / `bodyBase` | `gasper-rig-v655.svg` | Dark-center radial on the hull. Face-sized hole when almonds slit. |
| `#opticalDepth` | same + CSS `opacity: 0.48 !important` | `<use href="#body">` second dark disc at face center. |
| `pearlCorePath` / `innerVolumePath` / `violetCorePath` | SVG + `renderMaterialRig` | Hull-inset fills. Were face-centered `userSpaceOnUse` discs; seq12 moved them to `objectBoundingBox`. Still a pale volume behind the face. |
| `crownVolumePath` / `apexGlowNode` | `all-script-3.js` energy fold | Full-contour fill, opacity tracks `e`. Brightens on notice/zip. |
| `cosmicTextureLayer` + cells | SVG opacity `.68` | Nebula / spiral-arm read on a rounded interior. |
| `faceRecessLayer` + inner recesses | `setRecess` 24×11 / 30×10 | Dark sockets. Outers removed; inners remain. At layer opacity 1 they still plate the trio when eyes close. |
| `faceBloomOuter` / `faceBloomCore` | `setTriplet` scale 1.38 | Pale bloom of the *flattened* eye path. Fuses into a plate under slits. Locked 3-part — do not redesign almonds. |
| `cyanFieldNode` | energy opacity + idle transform | Foot reservoir. Not the face plate. Keep. |

## B. Sequence / expression (authors the 10.5–12.5s hold)

| Authority | File | When |
|---|---|---|
| `setExpression("listening-orient")` | `GasperRigController.playNorthstarTwenty` t=6.6 | **Never released.** Fixture: eyeOpen 0.3, energy 0.86. Holds through gather / zip / hold. This is why t8–t20 all show slits + plate. |
| `setMotion(0.82)` | same notice fire | Raises `motionStrength` → motion-light + idle energy. Not restored. |
| `triggerMicrostate("orient")` | same, 1600ms | `energy +.06` on top of the fixture. |
| No notice-release beat | playNorthstarTwenty | Gather at 9.2 / zip at 10.0 inherit the notice face. |

## C. Living / eight-state / Presence restoration

| Authority | File | When |
|---|---|---|
| `setEightState(livingStatus.eightState ?? "presence-neutral-settled")` | `GasperRigController` living flush | **Every tick.** If eight-state loop is off, `eightState` is null and the fallback **forces** the Presence recipe key. HUD reads `presence-neutral-settled`. |
| `setEightState` fallback | `all-script-3.js` | Empty/unknown id → `'presence-neutral-settled'`. |
| `EIGHT_STATE_BODY` / mouth / pop / form-variant | same | Recipe table is Presence-named. Neutral light is 0; `presence-listening-receive` light +0.35. Form-variant only composes when `silhouetteProfile==='presence'`. |
| `prepareEightStateRestingBaseline` | `livingIntent.ts` | Snaps fixture + pose to Presence-neutral channels. |
| `applyLivingEightStateTransition` wake | `GasperRigController` | `toState === "wake"` → `presence-neutral-settled`. Then `eightLoop.setEmbodiment(mainFormOverride(...))`. |
| `authoredMainForm` default | controller | Starts as `"presence"`. 20s sets it via `setEmbodiment("wispwalker")`. |
| `rig.setProfile("presence")` | `GasperDocument.ts:919` | **Mount boot.** Every legacy mount starts Presence. |
| `NativeGasperRigInstance` constructor | `GasperDocument.ts:211` | Same Presence default on native. |
| `setEmbodiment` if current ≠ id | controller | `morphToBehavioral(id, 1618ms)` — Presence→Wispwalker morph can leave Presence interior mid-window. |
| `setProfile` without `"settle"` | `all-script-3.js` | Also starts 1618ms morph. |
| `IntegratedGasperStage` | studio | Explicit `setEmbodiment("presence")` on some boots. |
| `$('reset')` | `all-script-3.js` | `silhouetteProfile='presence'`. |

## D. Energy / light writers (state-dependent intensity)

| Authority | File | Effect |
|---|---|---|
| `applySemanticPose(energy_level)` | FormMaster | Writes `current.energy` + `#interiorEnergy`. Living pose every tick. |
| `applyPoseToLegacyAuthority` | `legacyAuthorityAdapter.ts` | Also writes the energy slider + `applyCanonicalProjection`. |
| `legacyInteriorLight` / `e` | `all-script-3.js` | `interiorEnergy * laggedEnergy * familyLight * recognitionSpark * DEPTH_GLOW * FORM_EXPANSION * FORM_TENSION * eightState light * MOTION_LIGHT`. |
| `MOTION_LIGHT` amp 0.25 | same | Zip speed 380 → interior +~25%. Matches plate reading hardest mid-taxi. |
| `canonicalUnifiedLightFrame` | same | Unified field multiplies interior/crown. |
| `DEPTH_GLOW` | same | Projected-depth range lifts interior. |
| Mixer `renderEnergy` | `GasperRenderMixer.ts` | Scales `pearlCore`/`innerVolume` about (120,118) by `energy + horizon_radius`. **Firewall should skip** when FormMaster is mounted. If the firewall drops, this recreates a face-centered disc. |
| `DocumentFacialGeometry` energy core | native | Circle at face-center energy anchor. Not the live FormMaster painter. |

## E. Morph / clip / cached geometry

| Authority | File | Effect |
|---|---|---|
| `applyBoundMorphFrame` | `GasperDocument.ts` native | Projects Presence/Wispwalker domain bindings onto SVG. |
| `manualMorph` / `setMorphPreview` | FormMaster | Forces `silhouetteProfile = from` for the mix. Presence-from paints Presence interior. |
| `candidate-script-3.js` | unused live | Still writes `faceFieldNode` energy opacity. Not the 5179 painter. |
| Mixer node cache | `rebuildNodeCache` | Can re-query deleted ids (null). Does not resurrect geometry. |

## F. Boo / zip (does not swap embodiment)

`enableBoo(true)` only sets `WorldPhysicsDriver.booMode`. It does **not**
`setEmbodiment("presence")`. Seq11 10.5–12.5s is `y=0` life taxi at 380,
not aerial. Boo still raises motion-light / gather intensity on the same
drawing.

## What the 10.5–12.5s plate actually is (seq11, machine + picture)

One sentence: **notice never ends**, so slit apertures + raised energy sit
on the always-on pearl interior while zip motion-light brightens it; a
parallel living flush still names the renderer `presence-neutral-settled`.

Not the deleted 57×42 disc. Not accretion (opacity 0). Not a new second
card we added.

Classification: open. Next cut must close those state paths at the
drawing/sequence authority — no opacity floor, no aperture redesign, no
gait.

## Implemented (2026-08-15, seq13) — not visual PASS

- B: `playNorthstarTwenty` fires `notice-release` at 8.8 →
  `setExpression("neutral-settled")` + `setMotion(0.55)` before gather 9.2.
- C: 20s calls `setEightStateEnabled(false)`. Living flush forwards
  `eightStateForwardId(loop, id)` — null when the loop is off. Empty
  `setEightState` no longer remaps to `presence-neutral-settled`.
- A/D/E: hull fills stay `objectBoundingBox` + hull-inset paths. Mixer
  energy scale about (120,118) remains behind the FormMaster firewall.
  MOTION_LIGHT still folds into hull cyan/crown only.
- Recess + bloom hug live aperture (`bloomScale:1+0.38*open`, recess
  rx/ry collapse with open). Locked 3-part almonds untouched.
- Regression: `NorthstarTwentyAuthority.test.ts` steps the live
  controller clock through notice / release / gather / zip / hold.

Seq13 recapture after those cuts:
`research/proofs/grok-successor-002/take-20s-20260814-seq13/seq-20s-120fps.mp4`