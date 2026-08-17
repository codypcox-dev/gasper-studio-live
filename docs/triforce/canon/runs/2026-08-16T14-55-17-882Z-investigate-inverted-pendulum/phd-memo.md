# CanonOps PHD — investigate · inverted-pendulum

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-16T14:55:17.882Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T14-55-17-882Z-investigate-inverted-pendulum

## 1. THE WALL

L5 vault lawful and invisible at strut 200 (~4 u). Live −100 bob is load-drop, not the pendulum.

## 2. QUESTION

What PHD must be earned so the wall can be fixed inside canon only: L5 vault lawful and invisible at strut 200 (~4 u). Live −100 bob is load-drop, not the pendulum.

## 3. COORDINATE SPACES

l_eff=612 u. bob = l_eff·(1−cos α), tan α = λ/(2·l_eff). Strut 200 / 1.43 Hz ⇒ λ≈140 ⇒ bob≈4 u. X1 floor λ=918 ⇒ bob=122 u.

## 4. PHYSICAL LAW

- Single support is the inverted pendulum. Double support is a collision. SupportExchange owns the exchange.
- L5 bob is always ≥ 0. Live −100 is load-drop (GAIT_LOBE.comBob), opposite sign, opposite law.
- Fr≪0.15 at 200: stroll class. The pendulum is lawful and sub-pixel.
- This is not cart-pole balance. Walking IP is the stance-leg vault.

## 5. ARTISTIC LAW

- Do not amplify L5 at 200 to 10% h_G. That is a 1485 walk on a 200 body.
- Do not add vault-up to load-drop. Do not write body.y. Y=0 is the floor.

## 6. INVARIANTS

- Strut cruise stays 200 (N191).
- L5 and comBob stay separate channels.
- No Y bounce to fake a vault.

## 7. FAILURE MODES

- Reading −100 bob as L5.
- Raising strut so the vault shows.
- Asking IP to draw double support.

## 8. UNCERTAINTY

- getGaitProofSample channel map (vault vs load-drop) still not split in the 20s probe.

## 9. TESTS

- deriveGait(200).bobUnits ≈ 4 and ≥ 0.
- deriveGait at λ=918 bobUnits ≈ 0.1·h_G.
- SupportExchange.flight = 0 on the strut plant.

## 10. VISUAL CONSEQUENCES

- No rise-and-fall at 200. The hinge is the read: planted lobe, free lobe, lean.

## 11. IMPLEMENTATION

1. Packet only. Do not recut deriveGait. Do not raise strut. Next cut is still skate-no-swing.

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
