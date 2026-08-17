# CanonOps PHD — summarize · froude-scaling

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-16T14:55:17.885Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T14-55-17-885Z-summarize-froude-scaling

## 1. THE WALL

Three speeds, three laws, one name. Fr classifies. X1 times. Strut 200 is acting.

## 2. QUESTION

What earned laws already constrain the wall: Three speeds, three laws, one name. Fr classifies. X1 times. Strut 200 is acting.

## 3. COORDINATE SPACES

World u; l_eff=612; field g=74210. Screen px=u/8. Zoom-2 strut 200. Kernel swing 544 u; painter remaps to 42 px.

## 4. PHYSICAL LAW

- Fr = v²/(g L) classifies under field g. Comfort [2612, 3990]. Not a screen stride.
- X1 cadence: f = v/918, floor 1 Hz. Walk-band 1485 = 918·φ. Strut 200 is acting (Fr 0.00088).
- L5 vault bob = l_eff·(1−cos α). At 200 that is ~4 u. Invisible. Live −100 bob is load-drop.
- SupportExchange sample-and-holds the plant. gaitLobePose names swing lift / loaded drop / COM settle.
- Williams: contact and passing. Both lobes down is a skate.

## 5. ARTISTIC LAW

- Three named speeds. Do not call 3200 a stroll. Do not raise strut to show a vault.
- One pearl. No shoes. No second travel writer. walkEnable must not fight SupportExchange.

## 6. INVARIANTS

- Do not clamp strut through clampToComfortBand.
- Do not restore Froude cadence.
- Do not write body.y to fake a vault.
- Do not add a second walk writer.

## 7. FAILURE MODES

- Kernel supportSide flips; painter both-down.
- Painter still remaps 68 px kernel lift to the 42 px notch N305 rejected.
- Unnamed dual fence: 200 / 1485 / 2612–3990 all called walk.

## 8. UNCERTAINTY

- gaitExpressionGate and planted=false during live strut not re-logged this summarize.

## 9. TESTS

- fileStrut 200 never clampToComfortBand.
- deriveGait(200).bobUnits ≈ 4 and ≥ 0.
- Painter lift at full clearance must exceed the 42 px invisible notch at zoom-2.

## 10. VISUAL CONSEQUENCES

- Stranger names the speed class, then counts plant vs swing. No bounce required at 200.

## 11. IMPLEMENTATION

1. Summarize only. Fixes stay on the Investigate packets. Do not recut this receipt.

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
