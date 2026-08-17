# CanonOps PHD — explore · kernel-8

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-16T15:15:36.119Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T15-15-36-118Z-explore-kernel-8

## 1. THE WALL

kernel/8 is the home-plane ruler (8 u = 1 content px), not Cycle 8 cadence. Two rulers (42/22 remaps) were the paint bug. Do not retune 8 to fix the W-chew.

## 2. QUESTION

What corpus already governs kernel-8, and what is still unearned?

## 3. COORDINATE SPACES

World u. Home map: 8 u = 1 content px (unitsPerContentPx). ViewBox 240×220. Home frustum half-width 960 u = 120 px. D0=1920. scale(z)=D0/(D0+z). Zoom-2 cinematic multiplies the already-projected content px. h_G=1224 u = 153 content px at home.

## 4. PHYSICAL LAW

- Kernel-8 is not Cycle 8 (X1 cadence). It is the home-plane ruler: px = u / 8. Paint of lift/advance/drop is that inverse.
- Authored GAIT_LOBE.swingLiftUnits = 68·8 = 544 u means 68 content px at z=0. Painting 544/8 = 68 is identity. Painting 42·(u/544) was a second ruler.
- Depth: screen = (u/8)·scale(z)·zoom. At z=0, zoom=2, 68 content px ≈ 136 CSS px if 1:1 CSS/content — then the stage scale maps viewBox→dais.
- Desktop desk law: 1920 u home width / 240 viewBox = 8. He is a creature on a desk (~60–150 content px), not a dot in a stadium and not a 1 u = 1 px giant.
- The 22 px advance remap (352 u → 22) and 0.35 drop attenuator were extra rulers. They are off. One map remains.

## 5. ARTISTIC LAW

- Do not invent a second px scale to 'see' a step. If 68 home-px is invisible, the verb is wrong (W-chew), not the ruler.
- Zoom-2 is a shot, not a change of unitsPerContentPx. Do not set the ruler to 4 so zoom-2 'looks like 8'.

## 6. INVARIANTS

- unitsPerContentPx stays 8. Do not retune it to fix gait.
- Do not mix content-px authorship (68, 44, 24) with world u without ·8 / ÷8.
- Do not confuse kernel-8 with Cycle 8 X1 (stride 918 · φ Hz).

## 7. FAILURE MODES

- Two rulers: kernel stores 544 u, painter treats 68 as a cap and remaps to 42.
- Calling Cycle 8 (cadence) 'kernel 8' and changing stride to fix a px map.
- Changing 8 to make the W-unhook look like a longer step.

## 8. UNCERTAINTY

- Exact CSS-px per content-px on the live 1120×758 dais after zoom-2 was not remeasured this receipt. The ruler itself is earned.

## 9. TESTS

- WORLD_SPACE.unitsPerContentPx === 8 in TS and all-script-3.js.
- swingLiftUnits 544 paints 68 content px. swingAdvanceUnits 352 paints 44. loadedDropUnits 192 paints 24.
- 960 / 8 === 120 === viewBox/2.

## 10. VISUAL CONSEQUENCES

- A 68 px lift is a real home-plane number. If the tape still chews, the contour is the wall, not the 8.

## 11. IMPLEMENTATION

1. Explore only. Do not change 8. Do not recut gait this receipt.
2. Cycle 8 X1 stays a different organ.

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
- `world-8-u-per-px` [canon] WorldSpace.ts unitsPerContentPx · GASPER-SPACE-001 — Home plane: 8 world u = 1 SVG content px. 960 u half-width = 120 px = half of viewBox 240. Inverse of paint: kernel u / 8.
