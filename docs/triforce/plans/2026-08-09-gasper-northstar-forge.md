# Gasper Northstar Forge Implementation Plan

> **For agentic workers:** Execute inline in this session. Do not commit, push, reset, clean, stash, rebase, merge, revert, open a second Grok lane, invoke autopilot, or write a self-acceptance marker.

**Goal:** Close the remaining Gasper Northstar residual by proving that physics authority, Wispwalker walking, footless floating, radial 2.5D facing, and the final movement proof loop all agree on the same visible product behavior.

**Architecture:** Keep `WorldPhysicsDriver` as the sole free-motion writer and keep the organism clock as the sole frame authority. `GasperRigController` and the legacy vector renderer remain projection layers: they may expose or shape physics output for composition, but they may not silently replace the physics pose. The proof harness drives the production APIs at an exact 120fps fixed step, records body/output/renderer state beside every frame, and creates a new immutable receipt for each isolated question.

**Tech Stack:** TypeScript, React, Vitest, Gasper organism clock, `WorldPhysicsDriver`, `EmbodimentLocomotion`, `GoldenWanderDriver`, vector FormMaster renderer, Playwright/CDP, FFmpeg/ffprobe, TriForce 3.0.0.

## Global Constraints

- Preserve the existing dirty working tree; do not reset, clean, stash, revert, rebase, merge, commit, or push.
- Work only in the preserved GasperStudio tree and one bounded implementation lane; do not start a second lane or use autopilot.
- Wispwalker is the only walking embodiment; every footless embodiment floats and carries zero gait expression.
- Use the organism clock as the sole time source, vector-only rendering, no ambient `Math.random`, no pupils, no jump ring, and preserve the near-glass bound.
- The 5174 server is never killed or restarted; use the existing 5176 preview surface for the headless proof harness.
- Every behavior change follows test-first red → minimal green → refactor; visual defects require a recorded proof-loop audit.
- Every final behavior clip is captured headlessly at exactly 120fps, measured with ffprobe, reviewed chronologically by the architect, and returned with an absolute path before phase advancement.
- Machine-green without live/product state evidence and chronological video review is incomplete. Owner human acceptance remains separate and is never self-issued.

---

### Task 1: Close the physics-authority witness residual

**Files:**
- Inspect and, if the failing seam is confirmed, modify: `packages/desktop/src/gasper/physics/WorldPhysicsDriver.ts`
- Test: `packages/desktop/src/gasper/physics/WorldPhysicsDriver.test.ts`
- Test: `packages/desktop/src/gasper/GasperRigController.test.ts` if a rig-output residual is the active seam
- Proof: `scripts/gasper-physics-001/capture-isolated-beat-120fps.mjs`
- Evidence: new immutable capture under `research/proofs/gasper-physics-001/northstar-r8-authority-120fps/`

**Interfaces:** `WorldPhysicsDriver.setField(field)`, `WorldPhysicsDriver.setLocomotion(owner, intent)`, `WorldPhysicsDriver.step(dt)`, `WorldPhysicsDriver.inspectAuthorityWitness()`, `WorldPhysicsDriver.getState()`, and `GasperRigController.applyPhysicsDriverOutput()` remain the neighboring contracts. The witness must report packet `GASPER-PHYSICS-AUTHORITY-001`, writer `world-physics-driver`, body/output residual, provenance, field epoch, and any renderer composition clamp as separate values.

- [x] **Step 1: Write the failing regression.** Drive a fixed-step locomotion intent, capture the driver body and emitted pose each step, change the field once, and assert that the witness reports the epoch transition, zero body/output residual, and a bounded nonzero response latency. Add a pixel-equation sample assertion that compares the body-derived expected centroid with the observed renderer target instead of accepting only a dataset flag.
- [x] **Step 2: Run the focused test and observe the expected failure.** Run `npx vitest run packages/desktop/src/gasper/physics/WorldPhysicsDriver.test.ts` and retain the failure showing which witness field or pixel-equation measurement is absent or incorrect.
- [x] **Step 3: Implement one minimal fix at the proven seam.** Preserve the sole writer and expose only the missing mechanical measurement; do not add a second pose writer or broaden the renderer clamp.
- [x] **Step 4: Run the focused test green.** Re-run the same Vitest command, then the neighboring `GasperRigController` and composition tests.
- [x] **Step 5: Capture the authority beat.** Fresh exact-120fps receipts under `research/proofs/gasper-physics-001/northstar-r9-*` now name the driven path, body/output witness, pixel equation, and two field perturbations; the stochastic receipt is `northstar-r9-stochastic-battery-120fps-r9/receipt.json`.

**Exit evidence:** A fresh receipt proves the production physics path, sole writer, epoch transition/latency, body/output residual, composition-clamp separation, and exact 120fps video metadata.

### Task 2: Prove the embodiment contract in the authored movement path

**Files:**
- Inspect: `packages/desktop/src/gasper/behavior/EmbodimentLocomotion.ts`
- Inspect: `packages/desktop/src/gasper/behavior/GoldenWanderDriver.ts`
- Test: `packages/desktop/src/gasper/behavior/EmbodimentLocomotion.test.ts`
- Test: `packages/desktop/src/gasper/behavior/GoldenWander.test.ts`
- Proof: `scripts/gasper-physics-001/capture-isolated-beat-120fps.mjs`
- Evidence: `research/proofs/gasper-physics-001/northstar-r8-wispwalker-120fps/` and `research/proofs/gasper-physics-001/northstar-r8-presence-120fps/`

**Interfaces:** `embodimentLocomotionClass(id)`, `embodimentWanderOpen(id)`, `embodimentGaitGain(id)`, `GoldenWanderDriver.tick()`, and `WorldPhysicsDriver.setLocomotion()` must preserve the distinction: Wispwalker receives gait expression while Presence and all footless forms remain airborne/float expression with gait gain zero.

- [x] **Step 1: Write one failing authored-path test per contract.** Assert Wispwalker walk has grounded contact, bidirectional travel, and nonzero gait; assert Presence float has positive altitude, no grounded contact, and zero gait over the same fixed-step window.
- [x] **Step 2: Run the two focused behavior suites and retain the red result if the active path violates either contract.**
- [x] **Step 3: Make the smallest authority or embodiment correction.** Do not solve a visual symptom in CSS/SVG when the class/gait decision is upstream.
- [x] **Step 4: Run both suites green and capture both clips at exact 120fps.** Inspect chronological frame sheets and reject any take that recedes so quickly that gait or contact cannot be judged. Final receipts: `northstar-r9-visual-wispwalker-showcase-120fps-r2/receipt.json` and `northstar-r9-visual-presence-showcase-120fps-r2/receipt.json`.

**Exit evidence:** Two receipts independently prove Wispwalker grounded walking and Presence floating with collapsed gait, with the driven production path named.

### Task 3: Close radial-facing, face-continuity, and 2.5D visual proof

**Files:**
- Modify only if a new visual defect is found: `packages/desktop/src/gasper/physics/RadialFacingLaw.ts`, `packages/desktop/src/gasper/GasperRigController.ts`, `packages/desktop/src/gasper/assets/all-script-3.js`
- Test: `packages/desktop/src/gasper/physics/RadialFacingLaw.test.ts`
- Test: `packages/desktop/src/gasper/physics/RadialFacingRenderContract.test.ts`
- Proof: `scripts/gasper-physics-001/capture-isolated-beat-120fps.mjs`

**Interfaces:** `facingBearingDeg()`, `facingSliceCenterDeg()`, `facingProjectionYawDeg()`, the renderer datasets `headingYaw`, `facingDeg`, `facingSlice`, `facingCompress`, and `facingFaceVisibility` form one inspectable projection contract. Full radial physics truth remains available while display yaw uses the bounded readable cone and the face floor never reaches zero.

- [x] **Step 1: Use the existing manual-yaw test as the semantic red probe if it regresses.** It observes near-180° physics yaw, face visibility at or above `.72`, and a true finite-thickness 3⁄4 cue.
- [x] **Step 2: Run the focused facing/render suites before any edit.**
- [x] **Step 3: If and only if the visual probe fails, patch one projection seam and add its direct regression assertion.** No new visual defect was found; the proof harness and witness were tightened instead.
- [x] **Step 4: Capture a new manual-yaw clip and review the chronological turn; do not accept a contact sheet alone when the face-turn interval is suspect.** Final receipts: `northstar-r9-visual-three-quarter-120fps-r2/receipt.json` and `northstar-r9-visual-yaw-face-120fps-r2/receipt.json`.

**Exit evidence:** Exact-120fps yaw/face proof plus the renderer contract receipt, with no face disappearance and no flat side silhouette.

### Task 4: Final coupled gate and Northstar evidence handoff

**Files:**
- Update only with evidence-backed facts: `research/proofs/gasper-physics-001/PHYSICS_PROOF.md`
- Optional evidence index: `research/proofs/gasper-physics-001/northstar-r8-proof-matrix.md`
- No phase-gate marker and no owner acceptance marker.

- [x] Run `npm run test` and `npm run build` from `C:\Users\funny\Documents\GasperStudio`.
- [x] Run `git diff --check` and verify no forbidden Git operation occurred.
- [x] Verify every final MP4 with `ffprobe` for H.264, 1280×900, `120/1`, and frame count equal to duration × 120.
- [x] Review every final chronological clip at source cadence and inspect the isolated suspect intervals frame-by-frame; sign off only the exact semantic rules that the video visibly passes.
- [x] Update `PHYSICS_PROOF.md` with machine-proven/live-observed/architect-reviewed/open vocabulary and preserve owner human acceptance as pending.

**Exit evidence:** Full machine gate, live/product state, fresh exact-120fps Wispwalker/Presence/3⁄4/yaw videos, stochastic and pixel receipts, architect verdicts, and an owner-pending residual matrix instead of a self-acceptance marker.

## Execution order

Execute Task 1 first because the authority witness is the foundation for every movement claim. Then execute Task 2, Task 3, and Task 4 in order. If any visual proof fails, return to the smallest task that owns that seam; do not repeat an unchanged fix.
