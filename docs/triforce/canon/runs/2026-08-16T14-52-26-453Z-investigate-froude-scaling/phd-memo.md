# CanonOps PHD — investigate · froude-scaling

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-16T14:52:26.454Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T14-52-26-453Z-investigate-froude-scaling

## 1. THE WALL

Three live speeds, three laws, one name. Fr classifies under field g [2612,3990]. X1 sets grounded cadence (1485 = 918·φ). Northstar strut 200 is acting (Fr 0.00088). Comments and clampToComfortBand still treat the Froude band as a stroll.

## 2. QUESTION

What PHD must be earned so the wall can be fixed inside canon only: Three live speeds, three laws, one name. Fr classifies under field g [2612,3990]. X1 sets grounded cadence (1485 = 918·φ). Northstar strut 200 is acting (Fr 0.00088). Comments and clampToComfortBand still treat the Froude band as a stroll.

## 3. COORDINATE SPACES

World u. L = l_eff = 612 u. Field g = 74210 u/s² (D-0112). Desktop g = 2600 (rail base only). Fr = v²/(g·L). v = √(Fr·g·L). Cadence X1: f = clamp(v/918, 1, f_max) Hz. λ_actual = v/f.

## 4. PHYSICAL LAW

- Alexander: same Fr ⇒ same gait class. Comfortable walk Fr∈[0.15, 0.35]. Walk–run ≈ 0.5. This classifies. It does not pick a screen stride.
- comfortCruiseBand(g) = √(Fr·g·l_eff) over [0.15, 0.35]. At field g that is [2612, 3990]. cruiseBase 3200 sits inside it. That band is dynamic similarity at his φ-scale g.
- X1 cadence is f = v/λ_norm, λ_norm = 0.75·h_G = 918 u, floored at 1 Hz, capped so exchange ≥ 60 ms. Walk-band 1485 = 918·φ. Same stride as the Froude floor, slower cadence (φ Hz vs 2.84 Hz).
- Fr at live speeds, field g: strut 200 → 0.00088 (not a walk). Walk-band 1485 → 0.049 (below comfort). 2612 → 0.15. 3200 → 0.23. 3990 → 0.35.
- Fr at desktop g=2600 is a lie for class: 1485 → Fr 1.39 (a run). Never classify grounded walk on the rail gravity.
- Cycle 8 rejected Froude-scaled cadence (5.83 Hz): perception 3× out of regime. Fr keeps SPEED class. X1 keeps TIME the eye can count.
- At f floor 1 Hz, λ shrinks: strut 200 ⇒ λ = 200 u, not 918. tan α = 0.16. Vault dies. That is lawful X1, not a Froude match.

## 5. ARTISTIC LAW

- Northstar strut 200 is acting, not a Fr walk. Do not raise it to 2612 to 'be similar'.
- Do not call 3200 a stroll. Comments that do are false. 3200 is flight / comfort-band terminal.
- clampToComfortBand is for the wander φ-ladder only. fileStrut and walk-band must not pass through it.

## 6. INVARIANTS

- Do not clamp grounded Wispwalker up into [2612, 3990]. That is the old teleport.
- Do not restore Froude cadence (f ∝ √(g/L)). X1 stands.
- Do not classify gait on desktop g=2600.
- Do not merge the three speeds into one 'walk' knob.

## 7. FAILURE MODES

- Dual fence unnamed: wander comments still advertise [2612, 3990] as stroll; painted wander files 1485; Northstar files 200.
- clampToComfortBand eating a strut or a walk-band intent (class change: stroll→teleport or walk→run).
- Using Fr to set bob/cadence at 200 so the pendulum 'shows' — that is a hop lie.
- Owner rail labeled 'speed' pointing at cruiseBase 3200.

## 8. UNCERTAINTY

- Which live callers still pass intents through clampToComfortBand was not re-audited this receipt beyond GoldenWander + fileStrut (fileStrut writes 200 directly).
- Walk-run Fr 0.5 at field g is ~4764 u/s. Whether any flight path uses that fence is unearned.

## 9. TESTS

- comfortCruiseBand(74210) ≈ {min:2612, max:3990}.
- Fr(200, 74210, 612) < 0.01. Fr(1485, 74210, 612) < 0.15. Fr(3200, 74210, 612) ∈ [0.15, 0.35].
- gaitStepHz(1485) === φ. gaitStepHz(2612) ≈ 2.84. gaitStepHz(200) === 1.
- fileStrut({cruise:200}) does not pass clampToComfortBand.
- clampToComfortBand(200, 74210) === 2612 — prove it must NOT be applied to strut.

## 10. VISUAL CONSEQUENCES

- A stranger can name which speed they are watching: acting strut (200), grounded walk-band (1485), or flight comfort (2612–3990).
- Froude is a class label, not a bigger bounce. The plant still has to read at whatever speed is filed.

## 11. IMPLEMENTATION

1. Do not recut speeds this receipt. Packet only.
2. When cut: one owner map with three named fences (strut 200 / walk-band 1485 / Fr comfort 2612–3990). Stop comments that call 3200 a stroll.
3. Guard: fileStrut and walk-band intents never enter clampToComfortBand. Wander φ-ladder still may.
4. Do not change GaitLaw Fr endpoints or X1 λ. They are different organs.
5. Investigate skate-no-swing remains a separate residual. Froude will not paint the swing.

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
