# CanonOps PHD — investigate · w-unhook

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-16T15:11:34.743Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T15-11-34-742Z-investigate-w-unhook

## 1. THE WALL

Owner 6.8s tape: one V of the cyan W rises and snaps back. Countable unhook. Not leave/travel/land. Lift is a Y-chew of a foot-nub gaussian on one closed contour.

## 2. QUESTION

What PHD must be earned so the wall can be fixed inside canon only: Owner 6.8s tape: one V of the cyan W rises and snaps back. Countable unhook. Not leave/travel/land. Lift is a Y-chew of a foot-nub gaussian on one closed contour.

## 3. COORDINATE SPACES

One closed contour. Foot nubs at th=1.31 (viewer's right) and th=1.83 (left). SVG +y down. Lift is posed.y -= liftPx·w. Owner tape 6.8s zoom-2: body stays centered; one V of the cyan W rises and snaps back.

## 4. PHYSICAL LAW

- The W is not two feet. It is two radius gaussians on one pearl (footAmp at 1.31/1.83). Topology never splits.
- skate-no-swing lift translates those vertices UP the screen. The valley of the W shortens. That is a chew, not a step. The swing never occupies a new floor X.
- Laterality is lawful: supportSide +1 plants 1.31 (right), swings 1.83 (left). The unhook is the correct side. The motion is the wrong verb (Y-chew vs leave/travel/land).
- Advance is still remapped: 352 u → 22 px (same class as the old 42 px lift cap). 22 px on a 300 px body is a nudge. The tape shows no forward travel of the free lobe.
- Plant drop is 0.35·loadedDrop/8. The hinge barely pays. Exchange = lift weight moves to the other gauss, previous side snaps to rest radius. That is the W reconstituting on the tape.
- D-0016 walk-in-place is lateral-first and forbids per-step vertical sink. Physics Y-lift was bolted onto the same contour. Two laws, one polyline. The chew is their interference pattern.

## 5. ARTISTIC LAW

- A step is leave / travel / land / take weight (N251). A W-unhook is a bite in the base. Countable, not a walk.
- Do not split the pearl into shoes. Do not raise strut cruise so the chew gets bigger.
- Camera hold that nails COM to center makes travel unreadable. The W becomes the only motion.

## 6. INVARIANTS

- One writer. One contour. No _plantHoldX. No second silhouette.
- Do not restore 118 px arch or gait8 smear.
- Do not call a Y-chew a swing.

## 7. FAILURE MODES

- Y-lift of a foot-nub gaussian = W-unhook (this tape).
- 22 px advance remap hides leave/travel/land.
- 0.35 plant-drop remap hides COM pay.
- Centered hold + frontal heading ⇒ only the W is visible.

## 8. UNCERTAINTY

- Whether walkEnable form press (stepDepth on radius) still fights the physics Y-lift on this tape was not isolated. walkPhysicsDrivenHold zeros the old walkGate when physics is live — radius nubs still exist.

## 9. TESTS

- Swing nub's lowest painted y is above the plant nub by a countable air gap AND its x has advanced along heading before contact.
- At exchange, old swing x becomes the new plant x. Not: old swing y snaps back to the rest W.
- Painter advance = swingAdvanceUnits/8, not 22·(u/352).

## 10. VISUAL CONSEQUENCES

- Stranger sees a foot leave the W, move, and become the new W-side. Not a bite that heals.

## 11. IMPLEMENTATION

1. Analyze / packet only this receipt.
2. When cut: stop Y-chewing the rest nub. Pose the EXISTING swing gauss in screen (x,y) from gaitLobePose (lift + full advance, no 22 px remap). Plant gauss stays world-locked. Exchange is a handoff of which gauss is locked, not a snap-back of y.
3. Drop the 0.35 plant-drop attenuator. Paint loadedDropUnits/8.
4. 6s tape only. Do not recut 20s or Froude.

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
