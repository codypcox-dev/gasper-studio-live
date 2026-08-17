# CanonOps PHD — explore · inverted-pendulum

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-16T14:49:35.193Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T14-49-35-192Z-explore-inverted-pendulum

## 1. THE WALL

The inverted-pendulum vault is lawful and invisible at Northstar strut 200 (~4 u, 0.5 px). Live bob −100 is load-drop, not L5. Weight cannot be a bounce at this speed.

## 2. QUESTION

What corpus already governs inverted-pendulum, and what is still unearned?

## 3. COORDINATE SPACES

World u. l_eff = COM height = 0.5·h_G = 612 u. Stride λ = v/f. Vault angle α: tan α = λ/(2·l_eff). Bob = l_eff·(1−cos α). Content px = u/8. Live Northstar strut: v=200, f≈1.43 Hz ⇒ λ≈140 u ⇒ α≈0.114 rad ⇒ bob≈4 u ≈ 0.5 px.

## 4. PHYSICAL LAW

- L5: walking single-support is an inverted pendulum. The planted foot is the hinge. COM rides a circular arc of radius l_eff. Rise is geometric: bob = l_eff·(1−cos α), not a bounce authored on Y.
- X1 triple convergence: at λ = 0.75·h_G = 918 u, tan α = 0.75, vault bob = exactly 10% of h_G (122 u). That is the walk-band (1485 u/s), not the Northstar strut.
- At strut 200 the vault is ~4 u. Below a pixel. The pendulum is lawful and invisible. A −100 u measured bob is not L5 (L5 bob is ≥ 0). It is load-drop / COM-settle, signed down.
- Contact squash q = v_v²/(g·h_G) with v_v = (bob/2)·2π·f. Tiny vault ⇒ tiny q. Measured squash ≈ 0 is the geometry, not a dead organ.
- Froude Fr = v²/(g·l_eff). Comfort walk is Fr∈[0.15,0.35]. Strut 200 at field g is Fr≪0.15 — a stroll class, not a vault class.
- IP models are not cyclic through double support (McGrath 2015; Kuo/Donelan step-to-step). The exchange is a collision redirection. SupportExchange owns that window. The vault only exists in single support.

## 5. ARTISTIC LAW

- Do not amplify L5 bob at strut 200 to 10% h_G. That would be a 1485 walk painted on a 200 body — a hop lie.
- At stroll speed, weight reads from plant vs swing and lean, not from COM height. GaitLaw already says this: strut fills transfer via sway so 200 is not a 6% skate.
- GAIT_LOBE.comBobUnits is a load drop of the pearl, not the inverted-pendulum vault-up. Do not add them. Opposite signs.

## 6. INVARIANTS

- Do not write body.y to fake a vault. Y=0 is the floor. Bob is an observable the renderer expresses.
- Do not raise Northstar strut cruise to 1485 to make the pendulum visible. Strut is 200 by N191.
- Do not use cart-pole inverted-pendulum (upright balance) as the walk law. Walking IP is the stance-leg vault.

## 7. FAILURE MODES

- Expecting a readable vault at cruise 200. Geometry forbids it (~0.5 px).
- Signing load-drop as vault bob. Live probe bob −100 is the wrong channel.
- Asking the IP to draw double support. It cannot. That is the exchange organ.
- Scaling bob until the pearl hops so the skate 'looks like a walk'.

## 8. UNCERTAINTY

- Which screen channel getGaitProofSample.bobUnits was (vault-up vs load-drop) was not printed separately this receipt. Sign is enough to know it is not L5.
- Live field g on the 20s take was not logged; Fr at 200 is ≪0.15 on both 2600 and 74210.

## 9. TESTS

- deriveGait({speed:200}) bobUnits ≈ 4 u, never negative.
- deriveGait at λ=918 (X1 floor) bobUnits ≈ 0.1·h_G.
- contactSquash at strut 200 stays ≪ the 2% plant JND.
- SupportExchange.flight = 0 on the strut plant. Vault is single-support only.

## 10. VISUAL CONSEQUENCES

- A stranger will not see him rise and fall at strut 200. That is honest.
- They must see the hinge: one lobe planted, one free, COM lean onto the plant. The pendulum is the plant, not the bounce.

## 11. IMPLEMENTATION

1. Explore only. Do not recut deriveGait or raise strut cruise.
2. Investigate next still names skate-no-swing (paint vs kernel lift), not a bigger vault.
3. If a later cut touches bob: keep L5 ≥ 0 and keep load-drop on its own channel.

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
