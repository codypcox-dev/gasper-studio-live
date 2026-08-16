# Debug holdback — why a new issue every turn (2026-08-14)

Residual (owner): "we seem to have a new issue at every turn."
Lead: ThinkOps / Debug. Not a painter, physics, or sequence patch.
Classification: open. Not PASS. Not owner acceptance.

Proven picture (do not re-litigate): seq3 first 15s orb + dark disc + lost arm + one cyan scoop; N195 cut killed the disc, still egg, far arm melted; N196 cut walk taller pearl / left nub / W-cleft / notice looks; zip t12–15 is Presence sphere. Latest file: `research/proofs/grok-successor-002/take-20s-20260814-seq4/seq-20s-120fps.mp4`.

## 1. Writer map (one row each)

Every symbol that can add/subtract hull radius, fade arms, yaw the volume, morph embodiment, or paint a face disc. Live SVG paint is `all-script-3.js`. TypeScript twins are not the pixels unless noted.

| Writer | Channel | What it does to the picture |
|---|---|---|
| `all-script-3.js:baseRadiusV63` | hull radius | Shared pearl. Equator term is now `1.2` at θ=0/π (the 6.5→4.4→1.2 cut). |
| `all-script-3.js:formRadiusAtFor` | hull radius + arm fade | Family carve. Wispwalker adds `crownAmp??2.0` on the **same equator** as V63, `chinAmp??0.0` (5 then reverted), lobes `6.4`, cleft `4.8`, nub arms with **inline** far-arm fade floor `0.78`. Gait flatten + wind add on **every** family. |
| `all-script-3.js:gaitFlattenRadiusDelta` | hull radius | Plant flatten on every profile, including Presence. |
| `all-script-3.js:windStretchRadiusDelta` | hull radius | Trail stretch / lead compress on every profile. |
| `all-script-3.js:sampleBodyForProfile` | hull radius | Second hull: `wide/crown/low/asym` + eight-state form-variant (Presence only) + walk scaffold (wispwalker-gated) + mouth + drift + scaffold coupling + `_formK` expansion/tension. |
| `all-script-3.js:authorKeyViewPoint` / `viewDeformPoint` | yaw volume | identityShift `1.2*turn` + nearExpansion `1.2` + **farTuck** + crownBias. Deforms the already-carved hull in X. |
| `all-script-3.js:getViewMetrics` | yaw + arm fade + face | facingCompress ellipse (`t=0.90`), faceShift ±18, **farArmVis floor 0.78** (`smooth 90→140`), foot overlap, faceTurnFade `110–155°`. |
| `all-script-3.js:render` (facingCompress scale) | yaw volume | After sample, scales every contour X about centroid by `facingCompress`. Second squash on the same heading. |
| `all-script-3.js:render` (morph block) | embodiment | If `manualMorph`, **forces `silhouetteProfile = morph.from`**. Snapshot.profile therefore names the FROM form while mix already shows TO feet/arms. |
| `all-script-3.js:faceFieldNode.setAttribute` | face disc | Hard `opacity='0'` (N195). Disc geometry still exists; only opacity is dead. |
| `all-script-3.js:setHeadingYaw` + heading pursuit | yaw | Target + τ·φ² chase. Paint lags the pin. |
| `all-script-3.js:effectiveViewYaw` | yaw | `viewYaw + headingYaw + attentionYaw`, fenced ±180. |
| `all-script-3.js:setProfile` | embodiment | **Without `settle` this is not a snap.** `value !== silhouetteProfile` → `morphToBehavioral(1618ms)`. |
| `all-script-3.js:morphToBehavioral` / `setMorphTransitionPreview` | embodiment | 1618ms refractory morph. Sets `silhouetteProfile` to FROM for the whole mix. |
| `all-script-3.js` apply `overall_width` / `overall_height` | hull | `postureScaleX/Y` + plant Y. Physics/scene deltas land here. |
| `GasperContourSolver.ts:baseRadiusV63` | hull (twin) | Mirrors V63 equator 1.2. Not live SVG. |
| `GasperContourSolver.ts:formRadiusAtFor` | hull (twin) | Stale wispwalker: equator `+2.0` hardcoded, no chinAmp, no far-arm fade, no live coeffs. |
| `GasperContourSolver.ts:solveContour` | hull (twin) | Macro wide/crown/low/asym + volume. Probes/tests can read this instead of paint. |
| `RadialFacingLaw.ts:facingCompressFromYaw` | yaw (twin) | Same ellipse law the JS render squash uses. |
| `RadialFacingLaw.ts:facingFarArmVisibility` | arm fade (twin) | Atlas 58→125°, **no paint floor** (can go to 0). |
| `RadialFacingLaw.ts:facingArmOcclusion` | arm fade (twin) | **Floor 0.32** — the N195 leftover. JS paint uses 0.78. |
| `RadialFacingLaw.ts:facingReadableLocomotionYawDeg` | yaw setpoint | Clamps clock 60–120° to ±22°. |
| `RadialFacingLaw.ts:facingPaintOrbitYawDeg` | yaw setpoint | Negates walk-right so left is near. |
| `RadialFacingLaw.ts:faceTurnFadeFromYaw` | face fade | 110–155°. Does not own `faceFieldNode`. |
| `PhysicsSilhouetteAuthority.ts:physicsSilhouetteDeltas` | hull | `overall_height` / `overall_width` / `ground_flattening` (gather/take/impact). |
| `GasperRigController.ts:playNorthstarTwenty` | embodiment + yaw | t0 `setEmbodiment("wispwalker")` + `setProfile("wispwalker")` (no settle). t5.2 pin heading 0. t10 zip1 **`setEmbodiment("presence")`** + pin −22. |
| `GasperRigController.ts:setEmbodiment` | embodiment | Writes `authoredMainForm`, then `morphToBehavioral(1618)` if snapshot.profile ≠ id. |
| `GasperRigController.ts` physics tick `setHeadingYaw` | yaw | `headingPinDeg` **or** `facingPaintOrbitYawDeg(facingReadableLocomotionYawDeg(paintYaw))`. |
| `GasperRigController.ts:getRenderedEmbodiment` | telemetry | Returns `getSnapshot().profile` — i.e. morph FROM — so t0 can read Presence while feet paint. |
| `GasperRigController.ts` eight-state apply / `mixer.setContourProfile` | embodiment | Can start another 1618ms morph if snapshot.profile ≠ `mainFormOverride`. |
| `GasperStudioApp.tsx` first-run boot | embodiment | `newLiveDocument({embodiment:"wispwalker"})`, `setEmbodiment` ×2, then `playNorthstarTwenty()` on bare 5179. |

## 2. Which writers fought in the last six cuts

| Cut | Intended writer | Who fought it |
|---|---|---|
| Equator 6.5 → 4.4 → 1.2 | `baseRadiusV63` | Wispwalker `formRadiusAtFor` still adds `crownAmp??2.0` on θ=0/π (same equator). `sampleBody` `wide`. `render` facingCompress squash. `authorKeyViewPoint` identityShift+nearExpansion. Twin `GasperContourSolver.formRadiusAtFor` still +2.0. |
| Chin 0 → 5 → 0 | `formRadiusAtFor` `chinAmp` | Cleft `4.8` (N196 wanted 3.2) still carves a W. `sampleBody` `low`. Revert to 0 left the cleft as the chin. Twin solver has no chinAmp. |
| FarArm 0 → 0.32 → 0.78 | `formRadiusAtFor` inline fade + `getViewMetrics.farArmVis` | **Three floors at once:** JS paint 0.78, `facingArmOcclusion` 0.32, `facingFarArmVisibility` 0. Heading 65° still sits inside the fade window until the pin. Nub `armAmp 3.4` only exists on wispwalker, so Presence zip has one scoop by construction. |
| Heading 65 → 22 | `facingReadableLocomotionYawDeg` + `headingPinDeg` | Physics bearing still writes until pin. Heading pursuit lags. `authorKeyViewPoint` + facingCompress still egg the pearl at 22°. Zip1 later pins −22 on a Presence sphere. |
| Presence morph at 10s | `playNorthstarTwenty` zip1 `setEmbodiment("presence")` | Presence `formRadiusAtFor` is V63-only (an orb). Walk/nubs/cleft gate off. `morphToBehavioral` holds snapshot.profile at FROM (wispwalker) then TO (presence) for 1.6s. First 15s score includes this sphere. |

## 3. Single architectural holdback

**Hypothesis (N166 / N198 / N199):** there is no one drawing authority. The silhouette is the sum of independent writers (family radius, sampleBody, yaw deform, facing squash, physics width, arm fade twins, embodiment morph). Each cut retunes one writer. The others still own the same pixels, so the next frame presents a new defect (disc, melted arm, egg, W-cleft, Presence sphere).

**Evidence from code (not from a new watch):**
- Live paint and TS law disagree on far-arm floor (`0.78` vs `0.32` vs `0`) and on wispwalker equator (`crownAmp 2.0` live vs hardcoded `+2.0` in the solver, stacked on V63 `1.2`).
- `setProfile` without `settle` starts a 1618ms morph. `render()` then sets `silhouetteProfile = manualMorph.from`. `getRenderedEmbodiment()` reports that FROM id.
- `playNorthstarTwenty` comments "snap t0 so it is not a Presence morph" then calls `setProfile("wispwalker")` **without settle**, so t0 is exactly that morph.
- Zip1 `setEmbodiment("presence")` at t=10 makes seconds 10–15 a V63 sphere no matter what equator/chin/arm numbers wispwalker holds.

**Falsify:** lock one painted form id for 0–15s (wispwalker, no morph.from rewrite), route heading/arm/radius through that one paint function, and recapture. If the first 15s is still an orb, the holdback is not multi-writer identity (look at facingCompress + equator stack next). If a new defect appears from a writer left outside that lock, the hypothesis stands.

## 4. Why the t0 probe said form=presence while the picture had feet

`silhouetteProfile` defaults to `'presence'`. First-run and `playNorthstarTwenty` call `setEmbodiment("wispwalker")`, which starts `morphToBehavioral(1618)` from whatever `getSnapshot().profile` is. The intended snap `setProfile("wispwalker")` does **not** snap unless called with `settle`; it starts another 1618ms morph. Every paint frame with `manualMorph` does `silhouetteProfile = morph.from` (Presence). `getRenderedEmbodiment()` / FormMaster `getSnapshot().profile` therefore print `presence`. The mix already adds wispwalker lobes/nubs/cleft, so the picture has feet. The probe told the truth about the **name**; the name is lying about the **drawing**.

## 5. The one seam that, if left unfixed, guarantees the first 15s stays an orb

**Seam:** painted-form identity — `setEmbodiment` / `setProfile` (no-settle morph) + `render()` rewriting `silhouetteProfile` to `morph.from` + zip1 `setEmbodiment("presence")` at t=10.

Leave that seam and the scored window cannot be a pearl: t0 is a Presence→wispwalker blend (probe says presence, egg + feet), and t10–15 is Presence, whose `formRadiusAtFor` is a sphere. Equator/chin/farArm/heading cuts cannot reach those seconds.

Sequence may delete the t10 Presence morph. That is necessary and not sufficient. If morph.from still owns the profile name, the next knob still lands on the wrong family.

## Recommended next cut (one seam, not a knob)

One painted-form lock for the scored 15s:
1. `silhouetteProfile` / `getSnapshot().profile` / `getRenderedEmbodiment()` must name the form on screen (destination after t0, never morph.from).
2. t0 snap must be `setProfile(id, 'settle')` or skip morph when the director already chose wispwalker.
3. Do not `setEmbodiment("presence")` before t=15 (N199 sequence residual). Zip may stay; embodiment may not.

Do not retune equator, chin, farArm, or heading until that identity is one marble. Do not claim PASS.
