# CanonOps PHD — investigate · walk-plant-off-frame

Earned under N20 / N335: Explore / Summarize / Investigate → update Tri-Force → PHD → return.
Date: 2026-08-16T06:44:57.743Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-16T06-44-57-743Z-investigate-walk-plant-off-frame

## 1. THE WALL

Walk is live but the operate/proof crop is a face plate, so the loaded Wispwalker lobe and the swing clearance sit below the frame. The plant cannot be reviewed.

## 2. QUESTION

What PHD must be earned so the wall can be fixed inside canon only: Walk is live but the operate/proof crop is a face plate, so the loaded Wispwalker lobe and the swing clearance sit below the frame. The plant cannot be reviewed.

## 3. COORDINATE SPACES

World u; h_G=1224 u; content px=u/8; viewBox 240×220. Measured 1440×900 preview, dais 1120×758. Cinematic hold zoom=2 panY=-40: #body 300×337 @ y=254–591, ground 631, stage bottom 834 (243 px plant margin). Production Fit calibrates 231% and face-plates. Facial-review targetHeightFraction 0.72 + ZOOM_MAX 4 is the operate plate.

## 4. PHYSICAL LAW

- A walk is an inverted-pendulum vault: one support planted, COM pays, swing limb clears.
- Plant/swing contrast is a screen observable. A face plate makes gait unreviewable even when GaitLaw is live.
- Phase is travel-locked. wanderGateOpen requires living.autoSequence; boot seals autoSequence false (N334), so wander enable alone files no locomotion.
- headingPinDeg pins paint yaw only. Frontal pin (0) is lawful for walk review — both lobes face the monitor while travel still writes.

## 5. ARTISTIC LAW

- Operate / Fit stay face-first (facial-review 0.62–0.72). That shot is expression, not gait.
- Walk review is a dedicated authored hold equal to the isolated-proof cinematic frame (zoom 2, panY -40). Not shotBias. Not a moving camera during the walk.
- Doctrine 1: set the hold once, freeze it, do not follow COM. User Fit still outranks if they take the dial.

## 6. INVARIANTS

- Do not invent a second walk writer. Wander files walk-band LocomotionIntent; the rail never writes x/z/cruise.
- Do not enlarge cruise, add shoes, or change GaitLaw amplitudes to fake a plant.
- Do not change face grammar or Wispwalker authoring defaults to simulate gait.
- Do not resurrect shotBias as a live camera actuator (D-0107).

## 7. FAILURE MODES

- Face plate: Fit / production 231% crop hides both lobes.
- Silent wander: Walk clicked but autoSequence stays false, so the gate never opens.
- Hover/skate: both lobes stay grounded or both leave together.
- Clock walk: phase advances while travel is zero.
- Second camera: live zoom/pan during the stroll (Doctrine 1 leak).

## 8. UNCERTAINTY

- Stranger-countable plant vs swing still requires owner eyes at 60fps after wander is live. This PHD only unblocks the shot + gate.

## 9. TESTS

- Walk Review hold equals {zoom:2, panX:0, panY:-40}, userWorldFrameHeld, autoFit false.
- On a ≥700 px dais, #body bottom and #ground stay above the stage fold by ≥80 px.
- After Walk, wanderEnabled is true and living.autoSequence is true; after Stand, wanderEnabled is false.
- No new setLocomotion writer appears in the rail path. GaitLaw is untouched.
- Reduced motion still collapses gait to byte-identical rest.

## 10. VISUAL CONSEQUENCES

- A stranger can count plant vs swing on the lower contour without clicking Fit.
- Both Wispwalker foot-root lobes and the contact shadow stay on stage.
- Operate Fit still face-plates for expression review.

## 11. IMPLEMENTATION

1. Add walkReviewShot.ts: WALK_REVIEW_FRAME = cinematic hold. Operate Fit stays facial-review.
2. Rail Walk: releaseUserWorldFrame + holdUserWorldFrame(WALK_REVIEW_FRAME), living.applyModePolicy({autoSequence:true, restrainedIdle:false, freezeSequence:true}), ensurePhysicsDriver, setWanderEnabled(true). Keep heading pin. Mark data-shot=walk-review.
3. Rail Stand: setWanderEnabled(false), restore autoSequence false, keep the body hold.
4. Do not change GaitLaw, CraftRail shotBias, or Wispwalker authoring defaults.

## 12. CITATIONS

- `codeops-engine/proc-phys-048` [canon] TriForce corpus · inverted pendulum + Froude number — Normalize locomotion by Fr = v²/(g·l); walk cannot be judged if the plant is off-frame.
- `vfxops-engine/3danim-state-locomotion` [canon] TriForce corpus · Williams walk contact/passing — A gait is its footfall rhythm. One foot planted, one free. Shot must show both lobes.
- `gait-expression-phd-memo` [canon] research/canon/anim-physics/gait-expression-phd-memo.md L8/L9 — Phase is travel, never clock. Expression is illegal if it cannot be reviewed.
- `d-0099-doctrine-1` [canon] GASPER-CRAFT-002 · S3 / CraftRail D-0107 — The monitor never moves during a performance. shotBias is retired as a live camera dial. A framing return is a DEPTH offset or a one-time authored hold.
- `n334-opening-rest` [canon] NORTHSTAR N334 · GasperStudioApp boot — Bare 5179 is sealed Wispwalker rest. Wander and life stay down until an owned walk-review shot opens the wander gate.
