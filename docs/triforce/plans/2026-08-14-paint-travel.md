# Paint travel — 2026-08-14

One writer, one mass, one screen position.

## Livewalk vs cinematic-h

| | livewalk (6/10) | cinematic-g/h (2/10) |
|---|---|---|
| locomotion | wander-on; harness never calls setLocomotion. GoldenWanderDriver.fileIntent -> setLocomotion("wander", {x,z,cruise}) | wander off, life off; harness setLocomotion("life", {x,z,cruise}) |
| disarm | disarmWorldBody then wander re-arms | does not disarm |
| camera | holdUserWorldFrame 100%, Auto Fit off, no panBy (center) | same hold, plus one-shot vp.panBy to left third |
| capture | full 1280x900 surface | fixed dais clip, chrome hidden |
| kernel | body.x span 885 | body.x span 998 |
| paint | SVG contour cx span 116px; he left center | SVG contour cx span 133px; stills still read left |

WorldPosePaint.test.ts asserted 400u->50px from the wDx formula only. It never opened a screenshot.

## Hypotheses

1. FALSE. #body is a child of #worldRig (gasper-rig-v655.svg: worldRig > idleRig > stepRig > shellBaseLayer > #body).
2. TRUE as the second screen-x writer. all-script-3.js sampleBodyForProfile applied _plantHoldX*_plantW = (plantedScreenXUnits - swayX)/8 onto the silhouette. plantedScreenXUnits is projectPlantedScreenX = plantedWorldX - bodyX (SupportExchange.ts). During a held plant the COM walks past the foot and that term counter-translates #body against worldRig. Probe glue window 1.50-2.10s: kernel +115u / wDx +13.8px, #body rect +1.7px.
3. FALSE. holdUserWorldFrame held; bodyRect moved in page space rest-to-rest.
4. FALSE. Capture is one fixed dais clip. Never follows #body.
5. Partial (harness only). Cinematic files life-owner not wander-owner, and starts left-third. Kernel still traveled 998u. Not the paint cancel.
6. FALSE on this tree. all-script-3.js pose block eases home only when provenance==='none'. Probe applied physics-authority x=400.02.

## Recut

all-script-3.js sampleBodyForProfile: removed _plantHoldX*_plantW from posed.x. Floor stack still uses plantedScreenXUnits (shadowStepDxPx). worldRig remains the sole free-motion screen-x writer.

EmbodimentSilhouetteAuthority.test.ts updated to match.

Did not undo yaw (facingPaintYawDeg, facingCompress=_orthoWidth). Did not undo holdUserWorldFrame. Did not bring back panBy COM-follow. Did not start cinematic-i.

## Probe (take-stroll-paint-20260814)

newLiveDocument, holdUserWorldFrame 100%, Auto Fit off, film dais, one setLocomotion("wander", {x:400,z:48,cruise:200}), 4s, stills t0/t3.

After recut, rest-to-rest:

| t | chromaCx | body.x | wDx | #body cx | #worldRig cx |
|---|----------|--------|-----|----------|--------------|
| 0 | 482.78 | 0 | 0 | 524.07 | 506.38 |
| 3 | 533.32 | 400.02 | 48.78 | 574.06 | 554.49 |
| Δ | +50.54 | +400.02 | +48.78 | +49.99 | +48.11 |

expected wDx = 400/8 * depthScale ≈ 48.78. chroma/kernel = 50.54/400 = 0.126 px/u.

Owner visual acceptance: not self-issued.
