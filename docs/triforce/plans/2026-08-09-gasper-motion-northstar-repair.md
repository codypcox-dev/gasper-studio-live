# Gasper Motion North Star Repair Implementation Plan

> **For agentic workers:** Execute inline in this session. Preserve the dirty tree and do not dispatch a second lane. Do not commit, push, reset, clean, stash, rebase, merge, revert, invoke autopilot, or write a self-acceptance marker.

**Goal:** Make Gasper's motion continuous and physically legible across Wispwalker walking, Boo-like floating, flight release, facing, and the final coupled performance.

**Architecture:** `WorldPhysicsDriver` remains the sole free-motion authority. Active-to-active transitions inherit the current body state; a just-disarmed body is retained for the next authored handoff; idle authored performances may retain their authored spawn defaults. Expression channels and authored release velocity are clock-driven state with explicit ramps. The proof harness records adjacent-frame telemetry and exact-120fps media so continuity failures cannot hide behind body/output equality.

**Tech Stack:** TypeScript, React, Vitest, Gasper organism clock, `WorldPhysicsDriver`, `GaitLaw`, `BooFlightLaw`, vector FormMaster renderer, Playwright/CDP, FFmpeg/ffprobe, TriForce Engine 3.0.0.

## Global Constraints

- Preserve the existing dirty working tree; do not reset, clean, stash, revert, rebase, merge, commit, or push.
- Work only in the preserved GasperStudio tree and one bounded implementation lane; do not start a second lane or invoke autopilot.
- Wispwalker is the only walking embodiment; every footless embodiment floats and carries zero gait expression.
- Use the organism clock as the sole time source, vector-only rendering, no ambient `Math.random`, no pupils, no jump ring, and preserve the near-glass bound.
- The 5174 server is never killed or restarted; use the existing 5176 preview surface for headless proof capture.
- Every behavior change follows test-first red → minimal green → refactor; visual defects require a recorded proof-loop audit.
- Every final behavior clip is captured headlessly at exactly 120fps, measured with ffprobe, reviewed chronologically by the architect, and returned with an absolute path before phase advancement.
- Machine-green without live/product state evidence and chronological video review is incomplete. Owner human acceptance remains separate and is never self-issued.

---

### Task 1: Preserve the active body at the walk-to-flight handoff

**Files:**
- Modify: `packages/desktop/src/gasper/physics/WorldPhysicsDriver.ts:181-188,511-528`
- Test: `packages/desktop/src/gasper/physics/WorldPhysicsDriver.test.ts`
- Proof: `scripts/gasper-physics-001/capture-isolated-beat-120fps.mjs`
- Evidence: new directory under `research/proofs/gasper-physics-001/`

**Interfaces:** `WorldPhysicsDriver.setLocomotion(owner, intent)`, `WorldPhysicsDriver.launchComet(cfg)`, `GasperRigController.launchWorldComet(cfg)`, and `CometLaunchConfig` remain the public seams. When `launchComet` is called while the driver is active, its default start pose is the current body pose; after a disarm, the last visible body is retained for the next handoff. When called without a retained body, an omitted `x0` retains the standalone `-700` authored spawn. Release `Δv` loads over `PHI_LAW.loadRhythmSeconds`.

- [x] **Step 1: Write the failing regression.** Added the active-body and
  last-disarmed-body regressions to `WorldPhysicsDriver.test.ts`:

```ts
it("inherits the active body position when comet gather begins without x0", () => {
  const clock = new FakeClock();
  const { push } = collect();
  const d = new WorldPhysicsDriver(clock, push, () => "wispwalker");

  d.setLocomotion("wander", { x: 180, z: 0, cruise: 180 });
  runFor(clock, 0.5, 1000 / 120);
  const before = d.getState().body.x;
  expect(before).toBeGreaterThan(0);

  d.launchComet({ gatherSeconds: 0.5 });

  expect(d.getState().mode).toBe("comet-gather");
  expect(d.getState().body.x).toBeCloseTo(before, 6);
  d.destroy();
});
```

- [x] **Step 2: Run the focused test and watch it fail for the real reason.** The
  active handoff first failed at the standalone `-700` spawn; the disarmed
  handoff then exposed the same lifecycle seam.
- [x] **Step 3: Implement the minimal correction.** Implemented the retained
  body precedence without adding a renderer writer, plus the clock-driven Boo
  gate and φ-loaded comet release required by the same continuity seam.
- [x] **Step 4: Run the focused test green and check neighboring launch behavior.**
  `WorldPhysicsDriver.test.ts` is green at `68/68`, including neighboring
  bounce/comet behavior and the release-envelope regression.
- [x] **Step 5: Capture the isolated handoff.** Fresh r6 evidence records the
  active 1200-sample sequence, adjacent mode changes, velocity/body state,
  Boo/gait/facing reads, exact cadence, and the focused handoff/release clip.

**Exit evidence:** The red tests are witnessed, the driver suite is green, the
new receipt reports no position teleport at the handoff, and the chronological
120fps interval is architect-reviewed PASS. Phase 2 remains blocked until this
evidence is returned to chat.

### Task 2: Ramp Boo and flight expression

**Files:**
- Modify: `packages/desktop/src/gasper/physics/WorldPhysicsDriver.ts:282-349,1128-1135`
- Modify: `packages/desktop/src/gasper/physics/BooFlightLaw.ts`
- Test: `packages/desktop/src/gasper/physics/WorldPhysicsDriver.test.ts`
- Test: `packages/desktop/src/gasper/physics/BooFlightLaw.test.ts` if present; otherwise create it beside the law
- Proof: `scripts/gasper-physics-001/proof-metrics.mjs`

**Interfaces:** `setBooMode(boolean)` remains the mode control; `booBobUnits(tSeconds)` remains the carrier. Add only a clock-driven expression gate, expose its observed value in the output, and keep zero outside Boo mode and under reduced motion.

- [x] **Step 1: Write the failing test.** Added the active Boo ramp regression; it
  initially observed the full carrier on the first sample.
- [x] **Step 2: Run the focused test and retain the red result.** The red
  result was `17.762...` equal to the full carrier before the gate existed.
- [x] **Step 3: Implement the smallest ramp in the organism-clock path.** Boo
  now advances through `BOO_FLIGHT_LAW.expressionRampSeconds`, derived from φ,
  and only the expression channel is gated.
- [x] **Step 4: Run the focused tests green.** The driver suite is green at
  `70/70` and `BooFlightLaw.test.ts` is green at `5/5`; the r8 receipt also
  reports `floatGaitCollapsed: true` and `booModeObserved: true`.
- [x] **Step 5: Capture an isolated Boo clip.** The clean subject-close r2b
  exit recipe is exact `120fps`, machine-green, and visually reviewed through
  `comet-fly → locomotion → retiring → idle` with zero gait leakage. The
  companion subject-close Presence r1 witness is exact `120fps`, machine-green,
  and admits the wind-response metric with positive and negative runs.

**Exit evidence:** Boo expression has a measured ramp and no gait leakage; exact-120fps video is visually reviewed.

### Task 3: Make Wispwalker gait enter, turn, brake, and settle naturally

**Files:**
- Inspect/modify only the active seam: `packages/desktop/src/gasper/physics/GaitLaw.ts`, `packages/desktop/src/gasper/physics/WorldPhysicsDriver.ts`, and `packages/desktop/src/gasper/assets/all-script-3.js`
- Tests: `packages/desktop/src/gasper/physics/WorldPhysicsDriver.test.ts` and the existing gait/embodiment suites
- Proof: `scripts/gasper-physics-001/capture-isolated-beat-120fps.mjs`

**Interfaces:** Gait remains derived from speed, acceleration, contact, and phase. The renderer consumes the gated `gaitScreen` output; it may not invent a second gait phase.

- [x] **Step 1: Write failing continuity tests** for gait entry, cruise lean, and an authored target reversal: contact stays true while walking, gait expression changes within the declared transition envelope, and the body velocity reverses through braking rather than a target snap.
- [x] **Step 2: Run the focused red tests** and retain the real violations: first gait bob `5.536`, cruise lean drop `5.725753°`, and speed-epsilon settle drop `3.38429°`.
- [x] **Step 3: Implement one transition profile** at the driver/gait seam. `GAIT_EXPRESSION_RAMP_SECONDS` provides a `180ms` gate and `groundedLeanDeg` carries acceleration-derived lean through cruise and final settle; stride amplitude was not increased.
- [x] **Step 4: Run the gait and embodiment suites green.** The focused driver suite is `73/73` and the production build passes.
- [x] **Step 5: Capture concise Wispwalker beats** for entry, reversal, and settle, then review them at source cadence. r12 is exact deterministic `120fps`; the two focused clips are `72` frames at `120/1`, with conditional visual review returned to chat.
- [x] **Step 6: Add the near-rest stability receipt.** The old `travelReversalCount = 16` was replaced by a sustained-direction metric that ignores near-rest sign chatter. The arrival-band regression also removes the one-unit target-speed floor that re-seeded micro-reversals; its red tail-speed witness was `83.034460`, and the green repaired tail is zero. The rendered screen-space contour is now the gait witness, and the shallow-depth r20 subject-close receipt is exact `120fps`, `focusedMachineGate: true`, with four authored travel reversals, 93.5% foot-root coverage, and three reviewed 72-frame clips at `120/1`.

**Exit evidence:** Wispwalker reads grounded and intentional without visible bob/step/root snapping.

### Task 4: Reprove yaw, face continuity, and 2.5D after motion repairs

**Files:**
- Inspect/modify only if the repaired motion exposes a new active defect: `packages/desktop/src/gasper/physics/RadialFacingLaw.ts`, `packages/desktop/src/gasper/GasperRigController.ts`, `packages/desktop/src/gasper/assets/all-script-3.js`
- Tests: existing radial-facing and render-contract suites
- Proof: exact-120fps yaw and 3/4 recipes

**Interfaces:** Radial physics bearing remains full-field; display yaw remains bounded and face visibility stays above its declared floor; depth shell retains finite width.

- [x] **Step 1: Run the facing suites against the repaired active path.** The
  radial-facing, render-contract, physics-silhouette, and embodiment-authority
  suites pass `31/31`.
- [x] **Step 2: Capture only the suspect yaw/3⁄4 interval at 120fps.** The
  full-yaw and 3⁄4 subject-close receipts are exact `120fps` and machine-green.
- [x] **Step 3: Patch one projection seam only if the chronological review identifies a real defect.** No new projection defect was observed, so no source patch was warranted.
- [x] **Step 4: Re-run the direct tests and review the new clip.** Full-yaw
  review shows face-floor presence through `179.51°`; the 3⁄4 review shows a
  readable face and side-thickness cue through `44.95°`, with no contour blow-up.

**Exit evidence:** Facing follows travel without angular snap, the face remains visible, and the 3/4 shell reads as depth rather than a flat card.

### Task 5: Add continuity gates and close the coupled showcase

**Files:**
- Modify: `scripts/gasper-physics-001/proof-metrics.mjs`
- Test: `scripts/gasper-physics-001/proof-metrics.test.ts`
- Modify: `scripts/gasper-physics-001/capture-isolated-beat-120fps.mjs`
- Evidence: `research/proofs/gasper-physics-001/`
- Update with evidence only: `research/proofs/gasper-physics-001/PHYSICS_PROOF.md`

**Interfaces:** Proof receipts must report adjacent-frame deltas, transition labels, predicted/observed continuity, maximum acceleration/jerk, expression-ramp state, gait leakage, and exact source cadence. Existing body/output, face, yaw, and embodiment gates remain necessary but no longer sufficient.

- [x] **Step 1: Write failing proof-metric tests** for the coupled handoff: an
  adjacent grounded Wispwalker-to-Boo transition must preserve position, while
  an idle/origin reset must fail.
- [x] **Step 2: Run the metric tests red** and confirm the new handoff witness
  fails before its implementation exists; the corrected metric suite is now
  green at `13/13`.
- [x] **Step 3: Implement the continuity metrics and isolated recipes.** The
  coupled recipe now keeps the last walking leg alive through midpoint and
  launches Boo from the live body without authored `x0`.
- [x] **Step 4: Run focused metrics, full tests, typecheck, build, and `git diff --check`.** Full suite is `49/49` files and `714/714` tests; typecheck, build, and diff check pass.
- [x] **Step 5: Capture the final coupled performance at exact 120fps, inspect every suspect interval chronologically, and update `PHYSICS_PROOF.md` with only machine-proven/live-observed/architect-reviewed/open facts.** The r2 master caught and repaired the idle/origin seam; r4 is the fresh live standalone master with the adjacent handoff at zero position delta and no capture-scoped bridge interception. Its receipt and visual review are recorded in section 13.
- [x] **Step 6: Close the optional bridge proof-surface seam without changing motion authority.** Browser previews now remain standalone by default; packaged/Tauri launches retain bridge auto-start, and browser integration can opt in explicitly. The 4-test policy suite is green, the rebuilt live browser audit has zero console/network errors, and r4 confirms the same motion gate with `offlineBridgeStub: false`.

**Exit evidence:** A coupled performance is visually impressive and passes the continuity gates; owner acceptance remains pending.

## Execution order

Task 1 is machine-green and architect-reviewed PASS for the repaired
entry/release seam. Task 2's flight/retirement mechanical sub-gate is
machine-green with conditional architect review, backed by
`northstar-motion-phase2-flight-r8/phase2-handoff-flight-retirement-120fps.mp4`.
Task 3's entry/lean correction and near-rest arrival receipt are red-to-green
and visually conditional, backed by `northstar-motion-phase3-gait-r20/`; G2's
gait/arrival sub-gate is conditionally closed. Task 4's facing/2.5D machine
and isolated visual sub-gates are now conditionally closed by the r1 receipts;
the active production path is intentionally bounded to the readable ±45° cone
while the isolated full-yaw receipt exercises the face floor. Task 2's clean
Boo-exit and Presence/wind receipts now conditionally close G3. Task 5's
handoff regression caught the old idle/origin seam; the fresh r4 coupled
receipt is exact `120fps`, machine-green, has an empty capture event list with `offlineBridgeStub: false`, and the adjacent handoff witness
passes at zero position delta. The final full-test/build/diff audit is green;
owner human acceptance is the only North Star residual. The live optional
AgentBridge path is now explicit packaged/opt-in capability and is not an
accidental browser preview dependency. If a visual interval fails, return to
the smallest task that owns that seam and change one concrete variable before
recapturing.
