# CanonOps PHD — investigate · weight-transfer

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-16T14:55:17.880Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T14-55-17-878Z-investigate-weight-transfer

## 1. THE WALL

Kernel supportSide flips. Picture both-down. Weight transfer unearned on the pearl.

## 2. QUESTION

What PHD must be earned so the wall can be fixed inside canon only: Kernel supportSide flips. Picture both-down. Weight transfer unearned on the pearl.

## 3. COORDINATE SPACES

World u. Planted world (x,z). Screen plant = plantedScreenXUnits. GAIT_LOBE: swing 544 u, drop 192 u, settle 288 u. Live 20s strut: stepHz 1.43, supportSide ±1, plantedX 16–26 u, squash ≈0.

## 4. PHYSICAL LAW

- Weight transfer is plant-hinge + COM pay + free limb land + old support release.
- SupportExchange is the organ. skateUnits of a held plant ≈ 0. plantedCompress mid-stance. incomingCompress on the free side.
- gaitLobePose already derives the paint. Clearance 0 in double support (exchangeHold 0.35).
- At strut 200 the vault cannot carry the read (~4 u). Transfer must be lobe contrast and lean, not bob height.

## 5. ARTISTIC LAW

- One pearl. Lower-contour only. No shoes. No opacity vanish.
- COM payment stranger-visible at zoom-2 as settle/lean, not as a hop.
- walkEnable form-coeff is a second walk. It must not flatten SupportExchange contrast.

## 6. INVARIANTS

- No _plantHoldX on body.x. No second travel writer. No cruise raise.
- Do not restore gait8 smear or 118 px arch.
- Do not recut 20s beats until a 6s walk shows plant vs swing.

## 7. FAILURE MODES

- supportSide live, both lobes grounded (measured 2026-08-16).
- Seat kills gait (stepHz 0, plantedX 0) — freeze, not last exchange.
- Form walkEnable fighting physics lobes.

## 8. UNCERTAINTY

- Whether gaitLobePose returned 0 or the painter dropped it is owned by skate-no-swing.

## 9. TESTS

- Strut 200: supportSide alternates; stranger counts ≥2 plants.
- skateUnits held plant ≈ 0.
- Seat keeps one exchange; does not zero plantedX on the first arrived frame.

## 10. VISUAL CONSEQUENCES

- One foot carries him. One foot free. Whole pearl settles. Not a two-lobed puck.

## 11. IMPLEMENTATION

1. Packet only. The cut is skate-no-swing (paint path), not new GaitLaw amplitudes.
2. After skate-no-swing paints lift: re-watch 6s only (N258). Then 20s.

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
