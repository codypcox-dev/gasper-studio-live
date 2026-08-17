# CanonOps PHD — explore · weight-transfer

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-16T14:22:24.422Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T14-22-24-421Z-explore-weight-transfer

## 1. THE WALL

Kernel supportSide flips and gaitLobePose already names swing lift / loaded drop / COM settle. The live 20s strut still paints both lobes on the floor: a skate. Weight transfer is unearned on the picture.

## 2. QUESTION

What corpus already governs weight-transfer, and what is still unearned?

## 3. COORDINATE SPACES

World u; h_G=1224 u; content px=u/8. Planted world (x,z) sample-and-hold. Screen plant = plantedScreenXUnits. Swing lift authored 68 px = 544 u. Loaded drop 24 px. Strut cruise 200 u/s. Live 20s strut: stepHz 1.43, supportSide ±1, bob −99..−110 u, squash ≈0, plantedX 16–26 u.

## 4. PHYSICAL LAW

- Weight transfer is the inverted-pendulum vault: COM pays over a planted hinge, then the free limb lands and the old support releases.
- SupportExchange is the organ: plantedWorld is sample-and-hold; plantedCompress high at mid-stance; incomingCompress high on the unloaded side; skateUnits of a held plant must stay ~0.
- gaitLobePose derives swingLift = 544 u · clearance, loadedDrop = 192 u · compress. Clearance is 0 through double support (exchangeHold 0.35) so landing can overlap.
- Gait phase is travel-locked. supportSide flipping without a visible lift is a renderer fail, not a missing clock.
- Williams: contact and passing. Both feet down for the whole stride is a skate, not a walk.

## 5. ARTISTIC LAW

- One pearl. Lower-contour articulation, not shoes. No opacity vanish. No second walk writer (walkEnable form-coeff must not fight SupportExchange).
- COM payment must be stranger-visible at zoom-2: settle, then rise/transfer. A −100 u bob with both lobes grounded is a crouched skate.
- True 3/4: near/far lobe depth alternates. Face/membrane stay seq18.

## 6. INVARIANTS

- Do not invent a second travel writer or _plantHoldX on the whole body.
- Do not enlarge cruise or strut length to fake a bigger step.
- Do not restore gait8 contour smear or 118 px arch (N305 reject).
- Do not recut the 20s beats until a 6s walk picture shows plant vs swing.

## 7. FAILURE MODES

- Kernel live / picture dead: supportSide flips, both cyan lobes stay on the floor (N245, measured 2026-08-16 20s).
- Negative bob + zero squash: he sinks as a unit instead of vaulting over a plant.
- walkEnable lateral-first form walk fighting physics lobes on the same silhouette.
- Seat kills gait (stepHz 0, plantedX 0) — arrival is a freeze, not a last exchange.

## 8. UNCERTAINTY

- Live 20s probe did not print swingLiftUnits / swingClearance. Visual both-down is certain; whether gaitLobePose returned 0 or the painter gated it is unearned.
- z ±25 u during strut may be heading/3-4 projection, not a second writer. Not isolated.

## 9. TESTS

- Strut 200: supportSide alternates; swingClearance > 0 for a countable interval each step.
- Stranger can count ≥2 plants: loaded lobe holds, swing lifts with air gap, lands, old support releases.
- COM: plantedCompress rises on plant; contactSquash > 0 on exchange; bob is not a stance-long sink.
- skateUnits of a held plant ≈ 0. No _plantHoldX on body.x.

## 10. VISUAL CONSEQUENCES

- A stranger sees one foot carry him and one foot free. Not a two-lobed puck sliding at 200.
- Weight reads in the whole pearl (settle / lean / lift), not in a wiggling base under a frozen egg.

## 11. IMPLEMENTATION

1. Explore only. Do not recut GaitLaw, SupportExchange, or the 20s this receipt.
2. Next Investigate names whether swingLift is zero at the kernel or dropped in all-script-3.js paint.
3. Fix spec when earned: make the EXISTING lobe pose visible at zoom-2. Do not add shoes.

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
- `inverted-pendulum-vault` [reference] Perry / inverted-pendulum walking · COM vaults over the plant — The passenger unit is carried over the planted hinge. No vault and no swing means no weight transfer — only translation.
