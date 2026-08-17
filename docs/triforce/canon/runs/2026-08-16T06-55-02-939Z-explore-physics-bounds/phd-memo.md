# CanonOps PHD — explore · physics-bounds

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-16T06:55:02.939Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T06-55-02-939Z-explore-physics-bounds

## 1. THE WALL

Physics bounds live in four stacks that do not share one owner-facing map: kernel/field, gait walk-band vs Froude comfort, room/depth, and the World rail. Walk Review already files 1485 u/s walk-band; the rail cannot name or fence it.

## 2. QUESTION

What corpus already governs physics-bounds, and what is still unearned?

## 3. COORDINATE SPACES

World u; h_G=1224 u; l_eff=612 u; content px=u/8. Home frustum 1920×1080. D0=1920. scale(z)=D0/(D0+z). Field g≈74210 u/s² (φ-scale). Authored desktop g=2600 is the rail multiplier base, not the live field.

## 4. PHYSICAL LAW

- Walk-band cruise is X1: λ=0.75·h_G=918 u × φ Hz ≈ 1485 u/s. Live Walk Review filed exactly this (1485.355).
- Froude comfort is v=√(Fr·g·l_eff), Fr∈[0.15,0.35]. At field g=74210 that is ≈[2612,3990]. cruiseBase 3200 sits inside it and is reserved for flight terminal-v, not grounded stroll.
- Kernel speed cap is a ceiling-height fall: maxSpeed=√(2 g H_ceil) (authored fallback 4200). Integrator dt≤0.05 s.
- Room: zNear=-320 (scale 1.2, N35 glass), zFar=3566 (scale ≈0.35). Painted wander further caps z≤160, |x|≤2000 so the first stroll is not a depth teleport.
- Traction is Coulomb: ax/az apply only in contact. Airborne they are silently zero unless flight-marked.
- Silhouette physics deltas: height [-0.35,+0.18], width [-0.16,+0.30], flatten [0,0.60]. Volume law after exaggeration.

## 5. ARTISTIC LAW

- The World rail may tune gravity scale, restitution, launch, intensity. It must not rename walk-band as 'speed' or expose the Froude teleport as a stroll.
- Walk Review is a body hold, not a bound. Bounds are world/field. The monitor does not move to fake a fence.
- A 1485 u/s stroll can still look like a zip if depth approaches the glass (he grows, plant margin shrinks). That is projection, not a second speed law.

## 6. INVARIANTS

- Do not invent a second walk writer or a second gravity.
- Do not clamp grounded stroll up into the 2612–3990 Froude band (that is the old teleport).
- Do not expose maxSpeed 4200 or cruiseBase 3200 as owner walk knobs.
- Do not move the camera to compensate for zNear growth.

## 7. FAILURE MODES

- Dual fence: comments still advertise [2612,3990] as stroll while painted wander files 1485.
- Rail lie: owner sliders do not name the fences that actually bound the walk.
- Glass approach: fixed Walk Review hold + z→zNear shrinks plant margin (measured dip to 56 px).
- Silent zero: airborne ax/az dropped, reads as a stall.

## 8. UNCERTAINTY

- Later wander legs after the painted seed may still compose against comfortCruiseBand(field g). Not re-measured past the first three legs this receipt.
- Live field g on this preview was not printed; walk-band match is exact, field g is corpus (GaitLaw.test G=74210).

## 9. TESTS

- Walk Review first seed cruise === GAIT_WALK_BAND_CRUISE_UNITS_PER_SEC (918·φ).
- comfortCruiseBand(74210) brackets 3200 and does not equal 1485.
- WORLD_PHYSICS rail clamps stay gravityScale 0.25–2, restitution 0–0.9, launch 0.25–2, intensity 0–1.
- Painted wander target z≤160 and |x|≤2000. zNear remains -320.

## 10. VISUAL CONSEQUENCES

- A stranger can name which fence they are watching: walk-band stroll, flight comfort, or glass approach.
- Plant stays reviewable at home z; he may fill the frame if he walks at the glass — that is depth, not a crop bug.

## 11. IMPLEMENTATION

1. Do not recut GaitLaw or WorldPhysics this receipt. Explore only.
2. If a next cut is earned: one owner-facing bound map (walk-band / flight / room / rail) and stop comments that call 3200 a stroll.
3. Investigate next only if Cody names one fence (two-speed-fences or glass-approach-plant).

## 12. CITATIONS

- `codeops-engine/proc-phys-048` [canon] TriForce corpus · inverted pendulum + Froude number — Normalize locomotion by Fr = v²/(g·l); walk cannot be judged if the plant is off-frame.
- `vfxops-engine/3danim-state-locomotion` [canon] TriForce corpus · Williams walk contact/passing — A gait is its footfall rhythm. One foot planted, one free. Shot must show both lobes.
- `gait-expression-phd-memo` [canon] research/canon/anim-physics/gait-expression-phd-memo.md L8/L9 — Phase is travel, never clock. Expression is illegal if it cannot be reviewed.
- `d-0099-doctrine-1` [canon] GASPER-CRAFT-002 · S3 / CraftRail D-0107 — The monitor never moves during a performance. shotBias is retired as a live camera dial. A framing return is a DEPTH offset or a one-time authored hold.
- `n334-opening-rest` [canon] NORTHSTAR N334 · GasperStudioApp boot — Bare 5179 is sealed Wispwalker rest. Wander and life stay down until an owned walk-review shot opens the wander gate.
- `gait-law-x1-walk-band` [canon] GaitLaw.ts · X1 stride × φ Hz — Grounded stroll is 918·φ ≈ 1485 u/s. The 2610/3200 Froude band is flight terminal-v, not a walk.
- `world-physics-field-g` [canon] PhysicsField.ts · worldPhysicsParamsFromField + WorldPhysics.ts — Live g/μ/maxSpeed come from the field. The World rail only multiplies gravity, restitution, launch, intensity.
- `n35-monitor-glass` [canon] WorldSpace.ts zNear · owner N35 — He may approach only to +20% size (z=-320). The monitor does not pull back.
