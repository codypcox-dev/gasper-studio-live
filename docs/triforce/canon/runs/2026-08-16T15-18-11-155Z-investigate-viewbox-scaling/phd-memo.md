# CanonOps PHD — investigate · viewbox-scaling

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-16T15:18:11.157Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T15-18-11-155Z-investigate-viewbox-scaling

## 1. THE WALL

Three maps stacked: u/8 → viewBox 240×220 → stage·zoom. Meet-filling the dais (×3.45) is not the gait scale. viewBox is not the W-unhook wall.

## 2. QUESTION

What PHD must be earned so the wall can be fixed inside canon only: Three maps stacked: u/8 → viewBox 240×220 → stage·zoom. Meet-filling the dais (×3.45) is not the gait scale. viewBox is not the W-unhook wall.

## 3. COORDINATE SPACES

Three stacked maps. (1) World u / 8 = content px. (2) SVG #avatar viewBox 0 0 240 220 — the content canvas; origin for camera at (120, 110). (3) Stage: screen = stage/2 + pan + (content − origin)·zoom. 1 content px = zoom CSS px. Dais measured 1120×758. Cinematic zoom=2, panY=−40. Depth scale(z)=1920/(1920+z) applies INSIDE the avatar before (3).

## 4. PHYSICAL LAW

- The viewBox is not stretched to fill the dais. meet(1120/240, 758/220)=3.445 is NOT the gait scale. Using it double-counts zoom and lies about lift size.
- Honest walk-review scale: 1 content px = 2 CSS px. Kernel 544 u → 68 content px → 136 CSS px at zoom 2.
- Home silhouette law: 1224 u / 8 = 153 content px. × zoom 2 = 306 CSS px (~34% of a 900 px stage). Measured #body ~300×337 on 1120×758 — Wispwalker, not Presence 153.
- Fit is a computed zoom (production ~2.31) that face-plates. It is a shot, not a change of viewBox. Judging a 68 px lift under Fit is the operate plate, not walk review.
- Owner 6.8s tape is a tight portrait crop (black void). That crop is not the 1120×758 dais. Do not score CSS px off that tape without knowing its zoom.

## 5. ARTISTIC LAW

- Doctrine 1: camera is the monitor. viewBox stays 240×220. Shot scale is zoom/pan or him moving in z. Do not resize the viewBox to 'see the step'.
- Walk review holds zoom 2. Operate/Fit may face-plate. Those are different pictures.

## 6. INVARIANTS

- viewBox stays 0 0 240 220.
- unitsPerContentPx stays 8.
- Do not meet-fill the dais and then also apply zoom.
- Do not change viewBox to 120×110 or 480×440 to fake a bigger lift.

## 7. FAILURE MODES

- Treating 240×220 as a texture that fills 1120×758 (×3.45) and concluding 68 px is huge or tiny.
- Fit (2.31) used as the walk-review ruler.
- Scoring the owner tape in CSS px without its zoom.
- Resizing viewBox so a W-chew looks like a longer step.

## 8. UNCERTAINTY

- How the owner 6.8s tape was framed (export crop vs dais) is unearned. The three-map stack on the live dais is earned.

## 9. TESTS

- svg#avatar viewBox === '0 0 240 220'.
- At zoom=1, a 10 content-px edge is 10 CSS px on the stage (not 34).
- At cinematic zoom=2, 68 content-px lift = 136 CSS px.
- CONTENT_VIEWBOX.width === 240 && 960/8 === 120.

## 10. VISUAL CONSEQUENCES

- The W-unhook size is 68 content px (~136 CSS at zoom 2). If it still reads as a bite, the verb is wrong. The viewBox is not the wall.

## 11. IMPLEMENTATION

1. Packet only. Do not change viewBox, 8, or zoom 2 this receipt.
2. When scoring gait, lock walk-review frame (zoom 2) and quote content px, not dais-fill px.
3. Next picture residual remains w-unhook (contour verb), not a bigger canvas.

## 12. CITATIONS

- `codeops-engine/proc-phys-048` [canon] TriForce corpus · inverted pendulum + Froude number — Normalize locomotion by Fr = v²/(g·l); walk cannot be judged if the plant is off-frame.
- `vfxops-engine/3danim-state-locomotion` [canon] TriForce corpus · Williams walk contact/passing — A gait is its footfall rhythm. One foot planted, one free. Shot must show both lobes.
- `gait-expression-phd-memo` [canon] research/canon/anim-physics/gait-expression-phd-memo.md L8/L9 — Phase is travel, never clock. Expression is illegal if it cannot be reviewed.
- `d-0099-doctrine-1` [canon] GASPER-CRAFT-002 · S3 / CraftRail D-0107 — The monitor never moves during a performance. shotBias is retired as a live camera dial. A framing return is a DEPTH offset or a one-time authored hold.
- `n334-opening-rest` [canon] NORTHSTAR N334 · GasperStudioApp boot — Bare 5179 is sealed Wispwalker rest. Wander and life stay down until an owned walk-review shot opens the wander gate.
- `gait-law-x1-walk-band` [canon] GaitLaw.ts · X1 stride × φ Hz — Grounded stroll is 918·φ ≈ 1485 u/s. The 2610/3200 Froude band is flight terminal-v, not a walk.
- `world-physics-field-g` [canon] PhysicsField.ts · worldPhysicsParamsFromField + WorldPhysics.ts — Live g/μ/maxSpeed come from the field. The World rail only multiplies gravity, restitution, launch, intensity.
- `n35-monitor-glass` [canon] WorldSpace.ts zNear · owner N35 — He may approach only to +20% size (z=-320). The monitor does not pull back.
- `support-exchange-plant` [canon] SupportExchange.ts · planted-base sample-and-hold — The planted foot is world-space sample-and-hold. Mass shifts onto that support. Travel is the support carrier, not a root slide.
- `gait-lobe-n305` [canon] GaitLaw.ts GAIT_LOBE · N305–N310 — One existing lobe lifts (~68 px) with cleft held. Loaded drops. COM settles. No shoes. No second travel writer.
- `williams-contact-passing` [reference] Williams · The Animator's Survival Kit · walk contact/passing — A walk is contact and passing. One foot planted, one free. Both down for the whole stride is a skate.
- `inverted-pendulum-vault` [reference] Cavagna / Kuo / Adamczyk · COM vault + step-to-step transition — Single support is an inverted pendulum: COM rides an arc over the plant. Double support is a collision, not a vault. IP models do not simulate the exchange.
- `alexander-froude-walk` [reference] Alexander · Fr = v²/(g L) dynamic similarity — Same Fr ⇒ same gait class. Comfortable walk ≈ 0.15–0.35. Walk–run ≈ 0.5. Fr does not set screen stride.
- `world-8-u-per-px` [canon] WorldSpace.ts unitsPerContentPx · GASPER-SPACE-001 — Home plane: 8 world u = 1 SVG content px. 960 u half-width = 120 px = half of viewBox 240. Inverse of paint: kernel u / 8.
- `content-viewbox-240` [canon] gasper-rig-v655.svg viewBox 0 0 240 220 · GasperVisualBounds CONTENT_VIEWBOX — Content canvas is 240×220. Stage map: (cx−120)·zoom + pan + stage/2. 1 content px = zoom CSS px. Not a meet-fill of the dais.
