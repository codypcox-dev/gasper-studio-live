# Gasper Finish 01 — End-to-End Product Authority and Visual Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use triforce-worker-orchestration (recommended) or triforce-plan-execution to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish Gasper Studio as one canonical, continuously mounted, vector-native organism with a readable face in every supported scene, a unified material/light response, authored three-beat behavior for every state and embodiment route, physically coherent easing and rest motion, and fresh machine plus visual evidence of the result.

**Architecture:** Preserve the current production FormMaster renderer as the production authority until parity is proven. Converge all upstream intent through one organism clock, one resolved-pose compositor, one living/facial temporal authority, and one vector projection transaction. Keep the native renderer as a lab candidate. Serve and activate the authored showcase pack from the canonical Gasper Studio root. Keep Gasper Studio completely separate from AgentBridge.

**Tech Stack:** React 19, Vite 7, TypeScript 5.8, Vitest 3, live SVG/FormMaster v655 production route, typed Gasper runtime, deterministic seeded replay, TriForce v2.3.0, native Codex browser/MCP visual inspection.

## Global Constraints

- The only implementation boundary is `C:/Users/funny/Documents/GasperStudio`. Do not read from, write to, merge from, or execute through `C:/Users/funny/Documents/AgentBridge-worktrees` or any AgentBridge repository. The optional bridge is an external transport boundary only; it is never a Gasper runtime authority.
- Preserve unrelated user changes. Do not use reset, checkout, clean, stash, destructive deletion, or broad generated-file rewrites.
- Gasper remains a continuous live-vector organism. No `HTMLCanvasElement`, `OffscreenCanvas`, `CanvasRenderingContext2D`, `Image`, `ImageData`, `ImageBitmap`, bitmap transition, SVG-to-image decode, pixel-derived relief, image-space material mask, SVG raster node, `foreignObject`, organism-internal raster filter, CSS mask, or `mix-blend-mode` may be introduced.
- External screenshots and video captures are allowed only as observer-only evidence. Captured pixels must never feed Gasper state, geometry, relief, material, or motion.
- The same live SVG root remains mounted and visible through supported transitions. Unsupported routes fail closed and preserve the last valid vector state.
- One `GasperOrganismClock` advances organism time. One `ResolvedPoseCompositor` resolves numeric intent. One `GasperLivingFacialAuthority` owns autonomous living and facial temporal values. One `GasperVectorProjectionTransaction` owns the final SVG write boundary.
- Stable material identity is ID-based and authored in organism/material space, never in screen coordinates or temporary contour samples.
- Preserve and reconcile all user-specified visual material: the hard white streaks defining the nubs, the hard white streak on the left face, faint circular subsurface light bands, cosmic flecks, cosmic streaks, shell highlights, bounded shadows, and the deeper/more vivid 6.5 fallback color target.
- Every state and embodiment must have at least three readable beats: gather/setup, committed peak, and settle/recovery. A hold is a moving hold with breath, micro-sway, and material life; it is not a dead frozen frame.
- State transitions use the correct primitive: input-driven changes interrupt/retarget with velocity preservation; small ambient changes crossfade with smoothstep; incompatible or hard-boundary changes cut only when explicitly justified. Do not apply one global blend to every route.
- Determinism is required for fixed document, state, clock, seed, viewport, and optical mode. Stochastic life may vary only through a seeded, bounded process owned by the canonical authority.
- Machine gates do not equal artistic acceptance. Do not claim Disney/Pixar-level finish or release readiness until fresh visual evidence is inspected and the remaining human visual gate is explicitly recorded.
- TriForce operating rule: query the corpus before decisions, maintain one named residual (`GASPER-FINISH-01`), keep disk truth as the source of state, use one lead force for the active packet, and deposit proof before claiming completion. PlanOps is not initialized in this repo, so do not pretend a PlanOps kernel or event log exists; this plan file is the authoritative execution handoff until the engine is explicitly booted for execution.

---

## 1. What the current evidence says

This is the reconciliation of the user’s questions against the current canonical tree. These are starting facts, not completion claims.

| User question | Current evidence | Actual gap | Plan response |
|---|---|---|---|
| Why does Gasper’s face disappear? | Production still uses `legacy-authority-formmaster-v655`; dormant/singularity FormMaster profiles contain `face:false`; `profileFaceWeight()` can drive face opacity to zero; live sampling reproduced an embodiment/body change while facial opacity and labels were stale. | Face visibility is not part of one atomic transition commit. Dormant behavior is treated as face withdrawal instead of a bounded readable reduction, and transition producers can settle on different frames. | Task 2 makes facial continuity and visibility a single transaction, preserves face nodes, applies bounded dormant reduction, and proves no-blackout plus label/state coherence. |
| Where is the real vector shader/rendering system? | `packages/desktop/src/gasper/assets/vector-material.js` and the material manifest implement persistent material-space IDs; `GasperVectorProjectionTransaction` and FormMaster provide a vector write boundary; native renderer files exist. | Production is still legacy FormMaster, and native rendering is explicitly lab-only. The material runtime is not yet proven end-to-end as the sole owner of every requested highlight, shadow, band, fleck, and streak. | Task 4 completes the analytic material contract and proves its projection path without promoting the incomplete native renderer. |
| Where are the three-beat sequences? | `eight-state-loop/motion-grammar.ts`, `loop-manifest.ts`, schedulers, state targets, and authored `.gasper` documents already contain beat/easing data. | Runtime ownership and showcase serving are incomplete; multiple clocks/compositors can flatten or bypass authored beats; some embodiments are only represented as endpoints or optional content. | Tasks 5 and 6 bind every route to one beat evaluator and make authored scenes visibly active, including arbitrary transitions, long rest, interruption, and wake. |
| Where is the research implementation? | The implementation-spec planbook, VEC packet specs, vector shader research, unified theory, and TriForce corpus are present. | Research is distributed across docs and partial code; there is no current implementation-to-proof matrix that distinguishes machine-proven, live-observed, and human-unaccepted claims. | Task 1 creates the matrix and Task 7 closes it with fresh evidence. |
| Where is the easing? | Authored documents use `power1`/`power2` eases; motion grammar and transition helpers exist; the corpus contains the transition decision matrix and moving-hold rules. | Easing is not guaranteed to survive every authority boundary. Autonomous living, authored clips, legacy FormMaster, and the typed route can still run on overlapping timing domains. | Task 3 unifies clock/compositor/authority ownership; Task 5 verifies easing and moving-hold behavior at the resolved numeric state. |
| Where is the Disney/Pixar-quality finish? | The corpus contains animation research on moving holds, secondary motion, layered facial performance, asymmetric timing, rest punctuation, and transition design. | Principles are not yet an inspected, end-to-end product result. Visual QA already reports preview wiring as passing but release completeness, renderer parity, long-loop proof, and no-raster closure as open. | Task 7 turns the principles into a repeatable visual rubric and fresh capture set; Task 8 gates the final disposition on evidence rather than intention. |

### Canonical evidence to carry forward

- `research/proofs/implementation-spec/planbooks/GASPER_VECTOR_ORGANISM_COMPLETION_PLANBOOK_2026-07-31.md` identifies the original P0/P1 defects: raster transition substitution, pixel-derived relief, missing permanent gate, multiple clocks, multiple compositors, multiple living authorities, multiple SVG writers, and an overburdened controller.
- `research/proofs/implementation-spec/planbooks/VEC-401_SINGLE_ORGANISM_CLOCK_EXECUTION_SPEC.md` defines the single clock, subscriber order, forbidden independent RAFs, and deterministic replay tests.
- `research/proofs/implementation-spec/planbooks/VEC-501_CANONICAL_COMPOSITOR_EXECUTION_SPEC.md` defines the canonical layer order and trace requirements while keeping FormMaster production authority.
- `research/proofs/implementation-spec/planbooks/VEC-601-602_SINGLE_LIVING_AND_FACIAL_AUTHORITY_EXECUTION_SPEC.md` defines one living/facial temporal owner and explicitly says that facial continuity is numeric input to the compositor, not direct SVG mutation.
- `research/proofs/implementation-spec/planbooks/VEC-701_SINGLE_VECTOR_PROJECTION_TRANSACTION_EXECUTION_SPEC.md` defines the fail-closed one-writer transaction and explicitly keeps native rendering lab-only.
- `research/proofs/implementation-spec/research/GASPER_VECTOR_SHADER_RESEARCH_2026-08-01.md` defines the vector shader as an analytic material-response contract in material space, not a GPU pixel shader or storage-texture pipeline.
- `research/proofs/eight-state-loop/VISUAL/FACE_INTEGRATION_TRACE.md` defines the intended dormant face behavior: compress/occlude/fade while retaining nodes, not hard-delete/detach; its endpoint targets are useful starting bounds, not immutable visual acceptance.
- `research/proofs/eight-state-loop/FINAL/INTEGRATION_REPORT.md` records that the packaged eight-state video, semantic loop closure, executable rebuild, full compiler-driven binding, and human aesthetic acceptance were still open.
- `research/proofs/visual-qa-2026-08-02/VERIFICATION.md` records that developer-preview mount/render/control wiring passed, while renderer parity, long-loop, no-raster, and release-complete gates remained open.
- TriForce corpus entries to apply during execution include `MOTION-037` (moving holds and rest punctuation), `VEC-ANIM-064` (absolute rest-pose anchoring), `MOTION-063` (transition decision matrix and smoothstep), `MOTION-065` (state machine/blend-tree discipline), and the Gasper-specific VEC planbook/spec entries returned by the current corpus query.

## 2. Target architecture and proof model

```text
authored document / operator command
  -> canonical command
  -> one GasperOrganismClock
  -> one state + embodiment resolver
  -> one ResolvedPoseCompositor
  -> one GasperLivingFacialAuthority
  -> analytic material + relief + optics response
  -> one GasperVectorProjectionTransaction
  -> one continuously mounted production SVG root
  -> observer-only live browser / capture evidence
```

The product route stays FormMaster until a separate renderer-equivalence gate proves that the native candidate matches topology, face, material, embodiment, continuity, and deterministic hashes. “Vector shader” means that each material feature is a persistent analytic record such as:

```ts
type GasperMaterialFeature = {
  id: string;
  family: "fleck" | "streak" | "subsurface-band" | "hard-highlight" | "shell" | "shadow";
  materialSpace: { u: number; v: number; depth: number };
  phase: number;
  response: { intensity: number; softness: number; hue: number; width: number };
  anchor: "nub-left" | "face-left" | "body" | "orbit";
};

type GasperMaterialFrame = {
  frameIndex: number;
  resolvedHash: string;
  features: readonly GasperMaterialFeature[];
  writes: readonly VectorMaterialWrite[];
};
```

The renderer consumes the frame as vector geometry/attributes. It never samples pixels to derive state. Every visible feature must be traceable to a stable ID, material-space record, resolved value, and SVG target.

## 3. Execution order

Work in the following order. Do not skip ahead when a packet’s authority contract is not proven, because later animation polish would otherwise mask a broken source of truth.

### Task 1 — VEC-000 / canonical boundary, baseline, and research-to-proof matrix

**Purpose:** Establish a trustworthy starting point and make the previous work legible without importing the old pilot’s mixed-repo assumptions.

**Files and interfaces:**

- Inspect `AGENTS.md`, `package.json`, `vite.config.ts`, `.triforce/`, `docs/CANONICAL_BASELINE.md`, and `docs/triforce/`.
- Inspect `packages/desktop/src/gasper/contracts/GASPER_ARCHITECTURE_LOCK.json` and `packages/desktop/src/gasper/contracts/GASPER_MATERIAL_CONTINUITY_CONTRACT.json`.
- Inspect `packages/desktop/src/gasper/GasperDocument.ts`, `GasperRigController.ts`, `GasperLivingRuntime.ts`, `GasperRenderMixer.ts`, `GasperUnifiedTheory.ts`, `GasperVectorProjectionTransaction.ts`, and `renderer/productionAuthority.ts`.
- Inspect `research/proofs/implementation-spec/`, `research/proofs/eight-state-loop/`, and `research/proofs/visual-qa-2026-08-02/`.
- Create `research/proofs/gasper-finish-01/preflight.json`, `git-status.txt`, `authority-inventory.json`, and `implementation-proof-matrix.md`.

**Steps:**

- [ ] Record absolute repo root, branch, HEAD, worktree list, inherited dirty state, and the exact production authority without touching unrelated files.
- [ ] Run the TriForce boot/doctor/status commands against this repo and record their receipts; do not initialize PlanOps files unless the engine is explicitly required for execution.
- [ ] Run `npm run typecheck`, `npm test`, and `npm run build` as baseline probes; classify each result as pass, fail, or unavailable.
- [ ] Run `node scripts/gasper-vector-organism/scan-no-raster-runtime.mjs` if present; if the script is absent, record that the permanent scanner is not currently available rather than inventing a pass.
- [ ] Populate the proof matrix with one row per requirement: face continuity, material authority, all eight states, each embodiment, three beats, long rest, interruption, wake, deterministic replay, easing, no-raster, one clock, one compositor, one writer, authored pack serving, and visual acceptance.
- [ ] Search the matrix and receipt for `AgentBridge`, external worktree paths, stale authority claims, and unsupported “complete” language; remove only new wording introduced by this packet.

**Verification:**

```powershell
node bin/triforce.mjs doctor
node bin/triforce.mjs status
npm run typecheck
npm test
npm run build
git status --short
```

**Exit evidence:** The preflight files exist under `research/proofs/gasper-finish-01/`; they identify current production FormMaster authority, native lab-only status, baseline command results, and the first named residual `GASPER-FINISH-01`.

### Task 2 — VEC-101 plus face-authority continuity and showcase asset serving

**Purpose:** Eliminate the user-visible failure first: the face must remain readable and the actual authored showcase must load before motion quality can be judged.

**Files and interfaces:**

- `packages/gasper-studio/src/GasperStudioApp.tsx`
- `vite.config.ts` and the canonical `public/` tree
- `packages/gasper-studio/public/demo/gasper-hero-pack-v1/`
- `packages/desktop/src/gasper/assets/all-script-3.js`
- `packages/desktop/src/gasper/GasperDocument.ts`
- `packages/desktop/src/gasper/GasperRigController.ts`
- `packages/desktop/src/gasper/continuity/noBlackoutInvariant.ts`
- `packages/desktop/src/gasper/continuity/liveSvgVisibilityInvariant.ts`
- `packages/desktop/src/gasper/continuity/headedLiveMetrics.ts`
- `packages/desktop/src/gasper/continuity/captureLivingSequence.ts`
- New focused test: `packages/desktop/src/gasper/continuity/gasper-face-continuity.test.ts`

**Steps:**

- [ ] Make the root Vite server serve the authored `gasper-hero-pack-v1` documents that `GasperStudioApp.tsx` requests, while retaining the existing root `public/vendor/gsap` asset path; do not leave the app silently falling back to seeded `thinking-knit`.
- [ ] Add a deterministic asset-serving probe that fetches `10-showcase-project.gasper`, `manifest.json`, and one representative scene and asserts HTTP 200 plus the expected document IDs.
- [ ] Replace the production `face:false` hard withdrawal for supported dormant/singularity routes with an explicit bounded face-visibility target that retains the face nodes and is resolved through the facial authority; preserve reduced expression rather than deleting the face.
- [ ] Make embodiment, face visibility, expression, and semantic labels commit from the same resolved frame/transaction; stale labels or body-only settlement are test failures.
- [ ] Preserve the live SVG root identity through every supported transition. A transition may reduce face scale, opacity, emission, or aperture within bounded floors, but may not hide, detach, replace, or bitmap-substitute the root.
- [ ] Add a focused continuity test that runs presence → singularity → dormant-orbit → presence, checks face floors on every frame, checks root identity, checks monotonic frame metadata, and asserts zero blackout samples.
- [ ] Keep existing dormant endpoint targets from `FACE_INTEGRATION_TRACE.md` as starting bounds, then tune only through the evidence loop; do not hard-code a visually dead face to satisfy a scalar test.

**Verification:**

```powershell
npm exec vitest run packages/desktop/src/gasper/continuity/gasper-face-continuity.test.ts
npm exec vitest run packages/shared/src/gasper-performance/gasper-performance.test.ts packages/shared/src/gasper-performance/compiler/compiler.test.ts
node scripts/gasper-vector-organism/scan-no-raster-runtime.mjs
npm run typecheck
```

**Exit evidence:** `research/proofs/gasper-finish-01/face-continuity.json`, a fresh live capture or headed metrics trace, and the asset-serving test prove that the visible app is using authored scenes and that face visibility never falls through a transition blackout.

### Task 3 — VEC-401 / VEC-501 / VEC-601-602 authority convergence

**Purpose:** Make easing, life, expression, and state sequencing evaluate from one clock and one numeric authority instead of several competing clocks and writers.

**Files and interfaces:**

- `packages/desktop/src/gasper/clock/GasperOrganismClock.ts`
- `packages/desktop/src/gasper/clock/GasperGsapClockBridge.ts`
- `packages/desktop/src/gasper/gsap-shim.ts`
- `packages/desktop/src/gasper/GasperDocument.ts`
- `packages/desktop/src/gasper/GasperRigController.ts`
- `packages/desktop/src/gasper/eight-state-loop/EightStateLoopController.ts`
- `packages/desktop/src/gasper/GasperLivingRuntime.ts`
- `packages/desktop/src/gasper/living/GasperLivingFacialAuthority.ts`
- `packages/desktop/src/gasper/GasperRenderMixer.ts`
- `packages/desktop/src/gasper/compositor/ResolvedPoseCompositor.ts` and compatibility adapters
- `packages/desktop/src/gasper/assets/all-script-3.js`
- New focused tests under `packages/desktop/src/gasper/clock/`, `compositor/`, and `living/`

**Steps:**

- [ ] Confirm or finish the typed clock contract: one driver, deterministic/manual stepping, pause, scrub, reverse scrub, fixed-step, frame index, signed delta, subscriber priority, reentrancy guard, inspection, and fault handling.
- [ ] Route GSAP root advancement through the clock bridge exactly once per clock frame; remove autonomous organism-time RAF/ticker paths from the production route.
- [ ] Make the canonical compositor order explicit and inspectable: `document_base → embodiment → expression → clip → runtime → living → manual_preview → constraints → character_state`.
- [ ] Ensure compatibility mixers delegate to the canonical compositor and cannot provide a second final-value algorithm.
- [ ] Ensure the living/facial authority owns breath, wobble, energy pulse, relief drift, microvariation, blink envelope, saccade/gaze, idle yaw, face scale, and reduced-motion behavior as numeric values only; it must not write SVG, own timers, own RAF, or run GSAP tweens.
- [ ] Ensure authored face tracks and autonomous facial life cannot overwrite each other silently. The authority trace must show every contribution and one final owner per channel.
- [ ] Implement the transition routing matrix: authored clip crossfades use smoothstep; operator/input interruption retargets from current resolved velocity; hard incompatible routes fail closed or use an explicitly recorded cut.
- [ ] Add deterministic replay tests for the same seed/command/frame sequence and a split-brain test proving a second clock, compositor, living authority, or projection owner is refused.

**Verification:**

```powershell
npm exec vitest run packages/desktop/src/gasper/clock packages/desktop/src/gasper/compositor packages/desktop/src/gasper/living
node scripts/gasper-vector-organism/scan-no-raster-runtime.mjs
npm run typecheck
```

**Exit evidence:** `research/proofs/gasper-finish-01/authority-trace.json` contains the clock identity, subscriber order, resolved-pose trace, facial ownership trace, deterministic hash, and no duplicate owner/RAF findings.

### Task 4 — analytic vector material and physically legible light response

**Purpose:** Turn the partial material bridge into the actual Gasper vector shader/material system the product uses, while retaining the visual language the user called out.

**Files and interfaces:**

- `packages/desktop/src/gasper/assets/vector-material.js`
- `packages/desktop/src/gasper/assets/vector-material-manifest.json`
- `packages/desktop/src/gasper/contracts/GASPER_MATERIAL_CONTINUITY_CONTRACT.json`
- `packages/desktop/src/gasper/vector/GasperVectorMaterial.ts`
- `packages/desktop/src/gasper/projection/PressureMaterialCoupling.ts`
- `packages/desktop/src/gasper/projection/GasperVectorProjectionTransaction.ts`
- `packages/desktop/src/gasper/GasperRenderMixer.ts`
- `packages/desktop/src/gasper/assets/all-script-3.js`
- `packages/desktop/src/gasper/assets/gasper-rig-v655.svg`
- `packages/desktop/src/gasper/renderer/productionAuthority.ts`
- New focused tests under `packages/desktop/src/gasper/vector/` and `projection/`

**Steps:**

- [ ] Freeze the material feature registry as stable IDs and families: 24 cosmic flecks, 4 cosmic streaks, 3 subsurface bands, 3 hard highlights, plus shell/shadow/optical channels already present in the manifest.
- [ ] Make every feature resolve from material-space coordinates, contour/normal/curvature state, pressure, energy, seeded phase, and the one clock frame. Screen coordinates and transient contour sample indexes must not identify a feature.
- [ ] Encode separate analytic responses for the nub-defining hard white streaks, the left-face hard white streak, circular subsurface bands, soft shell sheen, shadow falloff, fleck twinkle, and streak flow. Preserve edges and bounded amplitude so highlights read as light, not white decoration.
- [ ] Make internal flecks and streaks identity-bound and continuously transported through morphology. Their phase may evolve, but a state transition may not re-randomize, snap, or recreate them.
- [ ] Use bounded vector primitives for relief and optical response: line/Bezier distance, Gaussian ridge, signed-distance ellipse, lens/bridge curves, face anchors, normal-derived response, and vector path/attribute writes.
- [ ] Reconcile the FormMaster material writes with the typed material manifest. If both routes produce a feature, expose one traceable owner and one final write; no post-paint overlay may become a shadow authority.
- [ ] Restore the 6.5-style color/depth envelope as measured bounds: dark-pearl body separation, violet/cyan depth, controlled white highlights, subsurface circles, and readable shadow planes. Tune against fresh captures rather than copying raster output.
- [ ] Keep the native renderer behind the lab firewall. Do not change `productionAuthority.ts` to claim native parity until the equivalence matrix passes.
- [ ] Add material continuity tests across at least 300 frames of a morph, checking stable IDs, bounded intensity/color, no snap discontinuity beyond the declared transition derivative, and deterministic replay.

**Verification:**

```powershell
npm exec vitest run packages/desktop/src/gasper/vector packages/desktop/src/gasper/projection
node scripts/gasper-vector-organism/scan-no-raster-runtime.mjs
npm run typecheck
npm run build
```

**Exit evidence:** `research/proofs/gasper-finish-01/material-frame-trace.json`, a material manifest hash, per-family response bounds, and a live SVG inspection showing one projection writer owns the visible material.

### Task 5 — three-beat grammar, embodiment/state matrix, and living rests

**Purpose:** Make every behavior feel authored and alive instead of like a state switch with long idle gaps.

**Files and interfaces:**

- `packages/desktop/src/gasper/eight-state-loop/types.ts`
- `state-targets.ts`, `schedulers.ts`, `motion-grammar.ts`, `loop-manifest.ts`, `long-rest.ts`, `layer-authority.ts`, `ir-targets.ts`, `embodiment-state-matrix.ts`, and `embodiment-life.ts`
- `packages/desktop/src/gasper/GasperUnifiedTheory.ts`
- `packages/desktop/src/gasper/controller/legacyFormMasterPolicy.ts`
- `packages/desktop/src/gasper/continuity/captureLivingSequence.ts`
- `packages/shared/src/gasper-scenario/loop.ts`, `eight-states.ts`, and compiler files
- New focused tests under `packages/desktop/src/gasper/eight-state-loop/`

**Steps:**

- [ ] Define one machine-readable `BeatSequence` contract with setup/gather, peak/commit, and settle/recovery phases, explicit durations, easing, interruption policy, material response, face response, and moving-hold behavior.
- [ ] Give every eight-state route a non-empty three-beat sequence with finite, bounded numeric targets. The peak must be legible; the settle must not erase the face or material identity.
- [ ] Give every supported embodiment the same three-beat contract, including presence, singularity, comet, dormant-orbit, and any additional canonical embodiment IDs present in the current matrix. Unsupported embodiments must report a deliberate unsupported disposition, not silently fall back.
- [ ] Add explicit moving holds: macro motion rests while breath, subtle sway, eye life, material phase, and a small bounded drift continue. Use absolute rest-pose anchoring so long loops do not accumulate deformation drift.
- [ ] Make rest durations obey the research rule: a readable low-motion interval after an accent, with post-accent rest longer than pre-accent gather where the route needs punctuation. Record durations in the scene manifest.
- [ ] Make interruption retarget from the current resolved pose and velocity. Test interruption during gather, peak, settle, long rest, dormant hold, and wake.
- [ ] Make wake a three-event sequence: inhale/activation, stretch/re-entry, normal living hold; wake must not be an instant state swap.
- [ ] Add a seeded stochastic microvariation layer with bounded amplitude and deterministic replay. It must never change topology, feature identity, face ownership, or beat ordering.
- [ ] Add a matrix test over state × embodiment × direction × interruption × reduced-motion mode and require finite outputs, face floors, material bounds, and a complete beat trace.

**Verification:**

```powershell
npm exec vitest run packages/desktop/src/gasper/eight-state-loop packages/desktop/src/gasper/continuity
npm run typecheck
node scripts/gasper-vector-organism/scan-no-raster-runtime.mjs
```

**Exit evidence:** `research/proofs/gasper-finish-01/beat-matrix.json` records every route’s three beats, durations, easing, rest policy, interruption result, wake result, and deterministic hash.

### Task 6 — authored scene compiler and actual studio showcase route

**Purpose:** Ensure the scenes the user asked for are not merely present as dormant documents; they must be compiled, loaded, and visibly drive the canonical runtime.

**Files and interfaces:**

- `packages/shared/src/gasper-scenario/compiler.ts`, `loop.ts`, `eight-states.ts`, and scenario contracts
- `packages/gasper-demo-content/content/gasper-hero-pack-v1/`
- `packages/gasper-studio/public/demo/gasper-hero-pack-v1/documents/*.gasper`
- `packages/gasper-studio/public/demo/gasper-hero-pack-v1/manifest.json`
- `packages/gasper-studio/src/GasperStudioApp.tsx`
- `packages/gasper-studio/src/IntegratedGasperStage.tsx`
- `packages/gasper-studio/src/dais-first/DaisControlRail.tsx`
- `packages/desktop/src/gasper/scenario/index.ts` and adapters
- New scenario/compiler tests under `packages/shared/src/gasper-scenario/`

**Steps:**

- [ ] Make the showcase project load the real `10-showcase-project.gasper` and expose its document/scene identity in the studio state; a seeded fallback may be used only for a deliberate missing-asset test.
- [ ] Compile every authored track into the canonical command/beat contract without dropping face, material, easing, or interruption metadata.
- [ ] Build the minimum polished scene set: recognition spark, listening/hold, thinking/resolve, presence-to-singularity, presence-to-comet, dormant-orbit/wake, and one full eight-state loop. Each scene must expose its three beats and its rest/interrupt behavior.
- [ ] Ensure the UI controls trigger canonical commands rather than directly mutating SVG or bypassing the clock/compositor.
- [ ] Add bidirectional route coverage for the supported embodiment/state matrix. A route is not complete because one direction works.
- [ ] Add content validation for missing optional spectral/material keys: optional content may degrade within the vector contract, but it may not erase the face, replace the live root, or switch to a hidden raster fallback.
- [ ] Add a compiler snapshot that proves authored easing names, durations, state IDs, face intent, material intent, and transition policy survive compilation.

**Verification:**

```powershell
npm exec vitest run packages/shared/src/gasper-scenario
npm exec vitest run packages/desktop/src/gasper/scenario
npm run typecheck
npm run build
```

**Exit evidence:** `research/proofs/gasper-finish-01/scene-compiler.json`, authored-scene fetch logs, and a studio runtime trace showing the showcase document rather than the seeded fallback.

### Task 7 — visual polish, renderer witness, and fresh QA loop

**Purpose:** Convert machine-correct behavior into a visually judged product result and expose defects that scalar tests cannot see.

**Files and interfaces:**

- `research/proofs/gasper-finish-01/visual/`
- `packages/desktop/src/gasper/continuity/frameRecorder.ts`, `captureLivingSequence.ts`, `analyzeSequence.ts`, `headedLiveMetrics.ts`
- `packages/desktop/src/gasper/renderer/RendererEquivalenceLab.ts`
- `packages/desktop/src/gasper/renderer/NativeGasperRenderer.ts`
- `packages/desktop/src/gasper/renderer/productionAuthority.ts`
- `research/proofs/eight-state-loop/FINAL/RENDERER_DISPOSITION.json`
- `research/proofs/visual-qa-2026-08-02/VERIFICATION.md`

**Steps:**

- [ ] Start the canonical Vite app and inspect it through the native in-app browser/MCP path; do not use Playwright as the critical visual route.
- [ ] Capture a fresh baseline screenshot and fresh sequence evidence for the real showcase project at a fixed viewport, fixed seed, fixed optical mode, and fixed background.
- [ ] Review the face at every state and embodiment: eyes, mouth, brows, face plane, face scale, left-face streak, and readable expression during gather, peak, settle, rest, interruption, and wake.
- [ ] Review material as light: hard nub streaks must define volume without clipping, the left-face streak must follow the face plane, circular bands must feel subsurface, cosmic flecks/streaks must move continuously, and shadows/highlights must obey the same contour and normal state.
- [ ] Review animation quality: clear anticipation, readable accent, overshoot where appropriate, moving hold, secondary motion, asymmetric recovery, interruption responsiveness, and no dead long rests.
- [ ] Run the renderer equivalence lab for representative frames. Record the native candidate as lab-only unless topology, face, material, continuity, and deterministic hashes meet the explicit equivalence gate.
- [ ] Score the visual rubric and record defects as concrete deltas: face disappearance, snap, clipping, flat color, muddy shadow, floating material, stale label, frozen hold, or unparseable beat. Iterate on the responsible authority rather than adding a visual patch.
- [ ] Keep the human visual disposition open for user review even when the machine gates pass.

**Verification:**

```powershell
npm run dev -- --host 127.0.0.1 --port 5174
```

Then use the in-app browser/MCP to capture the live state and save the screenshots/metrics under `research/proofs/gasper-finish-01/visual/`. Run:

```powershell
npm exec vitest run packages/desktop/src/gasper/continuity packages/desktop/src/gasper/renderer
npm run typecheck
npm run build
```

**Exit evidence:** Fresh screenshots, sequence metrics, a visual scorecard, and a renderer disposition that explicitly separates machine pass, visual pass, and user acceptance.

### Task 8 — permanent gates, proof deposit, and closure decision

**Purpose:** Close only what the evidence proves and leave one honest residual for anything still requiring human judgment.

**Files and interfaces:**

- `packages/desktop/src/gasper/contracts/GASPER_ARCHITECTURE_LOCK.json`
- `packages/desktop/src/gasper/contracts/GASPER_MATERIAL_CONTINUITY_CONTRACT.json`
- `scripts/gasper-vector-organism/scan-no-raster-runtime.mjs` or its canonical replacement if the current scanner is absent
- `research/proofs/gasper-finish-01/`
- `docs/CANONICAL_BASELINE.md`
- `.triforce/` state and receipt paths, only through the TriForce CLI

**Steps:**

- [ ] Run the cumulative focused suites for continuity, clock, compositor, living/facial authority, projection transaction, material, scenario compiler, and performance.
- [ ] Run the permanent no-raster scan across executable Gasper source and SVG assets, including raw SVG markers; prove a synthetic forbidden SVG fails and the production SVG passes.
- [ ] Prove one clock, one compositor, one living/facial authority, one final SVG writer, one mounted root, stable topology, stable material IDs, and deterministic fixed-frame replay.
- [ ] Prove the authored showcase pack is served, loaded, compiled, and rendered by the production route.
- [ ] Record the exact production authority, renderer ID, commit/HEAD, viewport, seed, optical mode, build result, and evidence hashes.
- [ ] Update the proof matrix so every requirement is classified as `machine-proven`, `live-observed`, `human-accepted`, or `open`; do not use an unqualified “complete.”
- [ ] Deposit the final packet proof through TriForce after all artifacts exist. If the visual gate remains open, keep `GASPER-FINISH-01` as the named residual and stop without promoting native or declaring a finished product.
- [ ] Update `docs/CANONICAL_BASELINE.md` only with evidence-backed status and the exact next residual.

**Verification:**

```powershell
node bin/triforce.mjs doctor
node bin/triforce.mjs status
npm exec vitest run packages/shared/src/gasper-performance packages/shared/src/gasper-scenario packages/desktop/src/gasper
node scripts/gasper-vector-organism/scan-no-raster-runtime.mjs
npm run typecheck
npm test
npm run build
git diff --check
```

**Exit evidence:** `research/proofs/gasper-finish-01/final-manifest.json`, `proof-matrix-final.md`, command logs, screenshots, hashes, and a TriForce deposit receipt.

## 4. Acceptance gates

The finish packet can be called machine-complete only when every gate below is green:

1. The canonical app loads the authored showcase project rather than silently falling back to seeded content.
2. The live SVG root remains mounted, visible, and identity-stable through every supported route.
3. No transition frame loses the face below its declared bounded floor; face/body/label state settles atomically.
4. One clock, one compositor, one living/facial authority, and one projection writer are proven by inspection and tests.
5. All requested material families have stable IDs, material-space coordinates, bounded analytic responses, and deterministic replay.
6. Every supported state and embodiment has setup, peak, settle, and moving-rest behavior; interruption and wake are explicit sequences.
7. The material reads as light: nub streaks and left-face streak are hard but volumetric; subsurface bands are faint and layered; shadows/highlights follow geometry; cosmic internals do not snap.
8. The permanent no-raster scanner passes over executable source and SVG assets, and synthetic forbidden inputs fail the scanner.
9. Typecheck, focused tests, full tests, and build pass from the canonical root.
10. Fresh native-browser/MCP visual evidence exists for the actual showcase route at fixed conditions.
11. Renderer disposition is explicit: FormMaster production, native candidate lab-only unless equivalence is proven.
12. Human visual acceptance is either recorded by the user or remains explicitly open; no agent may infer it from tests.

## 5. Stop rules and escalation

- Stop the current packet if a second authority, hidden raster path, or mixed Gasper/AgentBridge boundary is discovered. Record the exact file and preserve the last valid vector state.
- Do not compensate for a missing face with a CSS/SVG overlay. Repair the facial authority and projection trace.
- Do not compensate for flat or weak material with screenshot-derived textures, filters, blend modes, or a second compositor. Repair the analytic material response.
- Do not add more scene content while the authored showcase still falls back or while the one-clock/one-writer contracts are unproven.
- If native parity fails, keep FormMaster production and record the candidate failure; do not relabel the candidate as finished.
- If visual review reveals a defect after machine gates pass, reopen the responsible packet and preserve the capture as regression evidence.

## 6. Recommended execution mode

Use subagent-driven execution with disjoint packet ownership after Task 1 establishes the baseline. The conductor owns authority decisions, integration, visual taste, and final proof. Workers may take Tasks 2, 4, 5, and 6 only after their file scopes are separated; Task 3 and Task 7 stay conductor-led because they cross-cut timing, authority, and visual judgment. Run one worker round, integrate, run one correction round, then execute Task 8 as the final proof gate.

The first execution action is Task 1 only. Do not begin material polish or scene expansion until the baseline proves which route is actually serving the app and which authority is actually rendering it.
