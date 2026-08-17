# CanonOps PHD — investigate · skate-no-swing

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-16T14:55:17.885Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T14-55-17-884Z-investigate-skate-no-swing

## 1. THE WALL

Painter remaps 68 px kernel lift to the 42 px notch N305 rejected. SupportSide live. Both lobes stay down.

## 2. QUESTION

What PHD must be earned so the wall can be fixed inside canon only: Painter remaps 68 px kernel lift to the 42 px notch N305 rejected. SupportSide live. Both lobes stay down.

## 3. COORDINATE SPACES

Kernel GAIT_LOBE.swingLiftUnits = 68·8 = 544 u. Painter all-script-3.js: liftPx = 42 · (swingLiftUnits / 544) · gaitLive. Full clearance ⇒ 42 px. Zoom-2 cinematic. N305: 42 px · σ=0.22 was a notch Cody could not see.

## 4. PHYSICAL LAW

- WorldPhysicsDriver already calls gaitLobePose and publishes swingLiftUnits · gaitExpressionGate.
- gaitSwingClearance is 0 unless planted and |tanh(k cos(φ/2))| ≥ 0.35. If planted is false, lift is zero even when supportSide telemetry flips.
- The painter remaps the 68 px kernel lift back to a 42 px cap — the exact notch N305 rejected.
- Chin-keep (gauss at π/2, σ=0.16) zeros lift on the belly. If lobe gaussians miss the cyan nubs, lift is computed and invisible.

## 5. ARTISTIC LAW

- Show the EXISTING lobe pose. Do not invent shoes. Do not enlarge cruise.
- Air gap must hold a countable interval in single support. No permanent cyan bridge.
- Face/membrane seq18 untouchable.

## 6. INVARIANTS

- One writer: WorldPhysicsDriver. No _plantHoldX.
- Do not restore 118 px arch (N305 reject) or gait8 smear.
- Do not raise strut cruise to 1485 to make lift obvious.

## 7. FAILURE MODES

- 42 px remap: kernel 68 never reaches the screen (earned this receipt from source).
- planted=false while supportSide ≠ 0 → clearance 0.
- gaitExpressionGate still ramping through the 2.6 s strut window.
- walkEnable lateral-first form walk flattening contrast.

## 8. UNCERTAINTY

- Live 20s did not print swingLiftUnits / swingClearance / gaitExpressionGate. Visual both-down is certain. planted=false vs 42 px remap not isolated on the tape.

## 9. TESTS

- During strut single support: gaitScreen.swingLiftUnits > 0 and swingClearance > 0.
- Painter full-clearance lift ≥ 68 content px at zoom-2 (the N305 floor), not 42.
- Stranger counts ≥2 plants on a 6s take. Both-down skate fails.
- No _plantHoldX. No shoes. Seq18 face unchanged.

## 10. VISUAL CONSEQUENCES

- One cyan lobe holds the floor. The other lifts with black separation, advances, lands. Then weight transfers.

## 11. IMPLEMENTATION

1. Packet only this receipt. When cut: stop remapping 544 u → 42 px. Paint GAIT_LOBE.swingLiftUnits / 8 directly (68 px) on the swing nub only.
2. Confirm planted=true whenever supportSide ≠ 0. If not, that is the kernel bug — fix SupportExchange planted, not the painter.
3. Proof: 6s only at 120fps (N258). Not the full 20s until the 6s picture passes.
4. Do not touch Froude endpoints or strut 200 to 'help' the lift.

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
