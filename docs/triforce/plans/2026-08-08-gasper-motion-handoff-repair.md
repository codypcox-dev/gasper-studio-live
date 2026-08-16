# Gasper Motion Handoff Repair Implementation Plan

> **For agentic workers:** Execute inline in this session. Do not commit, push, reset, clean, stash, rebase, merge, or self-accept.

**Goal:** Repair the proven physics-to-render handoff so physics motion reaches the visible rig, release and reduced-motion transitions complete, and composition bounds do not silently disagree with the physics authority.

**Architecture:** Keep the organism clock as the sole frame dispatcher and make render/projection requests observational rather than recursive. Make the physics driver and composition envelope share one admissible pose boundary, with no downstream clamp that the solver does not know about. Preserve the existing retired wake/impact decisions unless a later visual review proves a separate North Star requirement.

**Tech Stack:** TypeScript, React, Vitest, Gasper organism clock, physics driver, legacy FormMaster renderer, deterministic headless 120fps capture, FFmpeg/ffprobe.

## Global Constraints

- Preserve the existing dirty work and adapt around it; do not reset, clean, stash, revert, rebase, merge, commit, or push.
- No second Grok lane and no unrelated refactors.
- Production code follows TDD: each regression test must fail for the diagnosed break before the minimal implementation is written.
- The final gate requires machine tests, live state evidence, and a fresh chronological video reviewed at exactly 120fps.
- Do not claim completion until applied pose converges to the target, release clears the world transform, reduced motion collapses the pose, and the final video is visually reviewed.

---

### Task 1: Clock reentrancy safety

**Files:**
- Modify: `packages/desktop/src/gasper/clock/gasper-organism-clock.test.ts`
- Modify: `packages/desktop/src/gasper/clock/GasperOrganismClock.ts`

**Contract:** A rejected nested dispatch must not mutate the outer frame's current delta or elapsed time. The outer subscriber must continue to receive its original fixed-step delta.

- [ ] Write a failing test that enters `step(1000/120)`, attempts a nested `step(0)` from a subscriber, and asserts the nested call is rejected while the clock still reports `1000/120` after the outer frame.
- [ ] Run the focused clock test and observe the expected failure caused by the current pre-guard delta mutation.
- [ ] Move the reentrancy guard before any state mutation in `step()`; do not add a second clock or alter scheduler ordering.
- [ ] Run the focused clock tests and the existing Gasper clock suite.

### Task 2: Physics/composition boundary coherence

**Files:**
- Modify: `packages/desktop/src/gasper/GasperCompositionWorldEnvelope.test.ts`
- Modify: `packages/desktop/src/gasper/GasperRigController.ts`
- Modify: `packages/desktop/src/gasper/GasperDaisStage.tsx` only if the existing envelope publication is insufficient
- Modify: `packages/desktop/src/gasper/physics/WorldPhysicsDriver.ts` only if the shared-boundary contract requires driver input

**Contract:** A physics-authority pose must be constrained by the same admissible production envelope before physics output is declared final. The renderer must not silently rewrite an accepted physics pose after the driver has advanced it.

- [ ] Write a failing regression test around the existing envelope contract using a literal pose outside the production bounds and assert that the authority boundary returns the bounded pose before render application.
- [ ] Run the focused composition/rig test and observe the expected failure or missing authority-boundary assertion.
- [ ] Implement the smallest shared-boundary change that makes driver output and visible application agree; preserve editor Fit versus production framing separation.
- [ ] Run focused composition, rig, and physics-driver tests.

### Task 3: North Star proof rerun

**Files:**
- Modify only the capture/proof script if the repaired runtime requires a narrowly scoped instrumentation correction.
- Create fresh evidence under `research/proofs/gasper-physics-001/` without overwriting prior proof.

- [ ] Run typecheck and the focused/full Gasper Vitest gates.
- [ ] Run the deterministic headless capture at exactly 120fps.
- [ ] Verify target/applied pose convergence, release, transform clearing, reduced-motion collapse, exact frame cadence, and ffprobe metadata.
- [ ] Review the full chronological take and return the video plus a pass/fail report; do not advance the phase on machine gates alone.
