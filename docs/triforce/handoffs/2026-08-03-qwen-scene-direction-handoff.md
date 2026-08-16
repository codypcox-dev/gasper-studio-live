# Handoff — Gasper Studio → Qwen — Scene Direction & Open Expectations — 2026-08-03

**For:** Qwen (or any worker) picking up Gasper Studio scene direction.
**From:** `kimi-vec006-worker-20260803`
**Branch:** `split-test/capability` · **HEAD at handoff:** `286c766` (+ this handoff commit)
**Repo of record:** `C:\Users\funny\Documents\GasperStudio` (canonical per `docs/CANONICAL_BASELINE.md`; AgentBridge is not a source/build route)
**Plan context:** `GASPER-FINISH-01` is machine-complete; sole open gate = human visual acceptance (proof-matrix row 16). New directive (below) now takes priority.

---

## 1. Read first (in order)

1. `AGENTS.md` → `docs/triforce/START_HERE.md` → `docs/triforce/AGENTS.md`
2. `docs/CANONICAL_BASELINE.md` — acceptance gates and classification vocabulary
3. `docs/triforce/handoffs/2026-08-03-gasper-finish-01-next-worker.md` — environment/tooling survival guide (still accurate)
4. `research/decisions/DECISION_LOG.md` — especially **D-0087** (scene suites) and D-0026 (face brow removal)
5. `GASPER_AI_FAMILIAR_VISION.md` (repo root or research/) — the product thesis: Gasper is a real agent with a life; animation is how the life shows
6. This document

Boot: `node bin/triforce.mjs boot && node bin/triforce.mjs doctor` (expect 22/22 PASS).

## 2. The owner's current creative directive (2026-08-03 12:30, TOP PRIORITY, UNSTARTED)

Verbatim intent, decoded:

- **"Zero noticeable changes on 5174"** — the scene-suite work (§3) is machine-proven but NOT visually convincing to the owner. Treat this as an open defect, not a preference. See §4.
- **"Canonops full scenes mined from Pixar films"** — he wants scene direction of Pixar caliber: study how Pixar structures shots/beats (anticipation, staging, squash & stretch, timing, emotional holds) and mine those principles into authored Gasper scenes. The Tri-Force engine has a `canonops`-adjacent ops family; check `docs/triforce/ENGINES.md` and the engine at `C:\Users\funny\Documents\triforce-engine` for the canon/canonops capability before inventing one.
- **"Develop a system that we use to develop and design scenes"** — a repeatable scene-development pipeline, not one-off animation tweaks: propose → rubric → author → witness → accept.
- **"Create a rubric for requirements of each scene"** — every scene needs explicit acceptance requirements. Minimum skeleton the owner stated: **beginning, middle, end**. Extend with the project's existing law: three-beat physics (gather/peak/settle), Refractory Arc (impact → spread → displaced settle), viscosity-tuned transitions, face readability, material-as-light.
- **"Step into movie director mode / scene animator mode"** — he wants taste, staging, and narrative intent per scene, not parameter soup.
- **"Use triforce to its fullest capabilities"** — route the work through the Tri-Force engine's ops families (designops/thinkops/planops at minimum; canonops if it exists) rather than ad-hoc editing.

## 3. What exists now (built 2026-08-03, commit `286c766`, D-0087)

- **`packages/desktop/src/gasper/eight-state-loop/scene-suites.ts`** — GASPER-SCENE-001. Per-embodiment long-form timelines: movements with `in/during/out` intent, normalized-time channel curves, deterministic organism-clock sampling, bounded additive modulation, reduced-motion collapse. Suites: presence "Awareness" 20s, singularity "Collapse & Orbit" 24s, comet "Pursuit" 16s, low-orbit "Compression Physics" 18s, generic "Breath" 12s.
- **Suite anchor = embodiment arrival** (not state entry) — macro-arc flows across states inside one embodiment (`EightStateLoopController.sceneAnchorOrganismMs`, reset in `setEmbodiment`).
- **Dormant retired**: `dormant-orbit-maintain` endpoint → `embodimentId: "singularity"` (`GasperExpressionProjector.ts`). dormant-orbit embodiment still manually selectable; out of the rest pairing.
- **`SCENE_LOOP_MANIFEST`** (loop-manifest.ts, ~90–110s cycle) drives the live auto loop (wired in `GasperLivingRuntime.ts` line ~670); DEFAULT/CONTINUOUS manifests kept for proofs/reduced-motion.
- **Telemetry**: `EightStateLoopStatus.sceneSuiteId/sceneMovementId/sceneIntent`.
- **Gates at handoff:** 134/134 tests (incl. 9 scene-suite proofs), typecheck 0, no-raster scanner PASS, triforce doctor 22/22.
- **Captures:** `research/proofs/gasper-scene-001/visual/` (8 PNGs) + `research/proofs/gasper-finish-01/visual/acceptance-2026-08-03/` (11 PNGs + MANIFEST.md).

## 4. KNOWN OPEN PROBLEM — "no visible change on 5174" (start here)

The owner watched the live app after `286c766` and saw no behavioral difference. Machine evidence says the suites run; visually they don't read. Likely causes, in order of suspicion:

1. **Amplitudes too small on the wrong channels.** Suite deltas are additive ±0.02–0.3 on channels (energy_level, internal_glow, gaze, overall_height…) whose rendered impact at 100% zoom may be nearly invisible. The curves were authored blind (never visually calibrated). Fix: live-tune curve amplitudes against the running app; consider driving higher-leverage channels (silhouette, posture, gaze translation) and verify each channel's visual weight empirically before authoring.
2. **State morphs mask the suite.** During holds, the state's endpoint targets dominate; additive deltas of ±0.05 on height/glow sit under the noise floor of the morph + living loop + material motion.
3. **Stale bundle possibility.** Vite HMR across the deep `packages/` graph may not have fully reloaded; a hard navigate was done and new telemetry appeared, but if Qwen sees no `sceneSuiteId` in loop status, restart the dev server (kill PID on 5174 ONLY with owner's consent; it's the owner's main server).
4. **Suite anchor semantics.** The anchor resets only on embodiment change; in the auto loop the presence suite loops under state morphs, so movement boundaries don't align with what the eye expects ("scene starts when the state starts"). Consider re-anchoring on state entry for presence, or keying movement entrances to state entrances.

**Do not declare any scene work "done" from tests alone. The owner's eye on 5174 is the only acceptance instrument that matters here.**

## 5. Full backlog — everything Cody still expects that is NOT complete

### 5a. Scene direction (the active front)
- [ ] Scene-development system + per-scene rubric (beginning/middle/end minimum) — §2, unstarted
- [ ] Pixar-caliber scene canon mined into Gasper scenes — unstarted
- [ ] Scene suites that are VISIBLY convincing live on 5174 (owner witnessed none) — §4
- [ ] Slider/tunability rule: every emergent behavior ships with a labeled rail slider group (established rule; scene suites have NO sliders yet — movements/intensities should become tunable)
- [ ] Singularity as an "impressive scene" — captured once (torus + lensing flare), owner acceptance pending
- [ ] Presence as "a full display honoring locked beat frequencies" — v1 authored, not accepted
- [ ] Comet with "movement and weight and consequence" — v1 authored, not accepted
- [ ] Low-orbit "powerful compression physics, focused display of compression and expansion" — v1 authored, not accepted
- [ ] Human visual acceptance of full scene set (proof-matrix row 16) — OPEN, the final gate

### 5b. Carried visual defects (older, still open)
- [ ] **Eye-size bounce** — aperture size oscillates unrealistically; diagnosed as overshoot-without-settle; planned fix via refractory damp; never implemented
- [ ] **Wispwalker feet regression** — feet lost crispness vs the old rig after cusp-soften; plan was to re-crisp feet while keeping chin/cleft soft (viscoelastic inertia is the actual jitter fix)
- [ ] **Yaw / 2.5D turntable** — inspect VIEW_RIG logic against the stored Adobe Illustrator turntable research; find where 2.5D falls short; never done
- [ ] **Internal light flicker** — reconsider internal light as a first-class expression channel (lagged, gathering, occluding per constitution §5.4), not a pulse; never done
- [ ] Face stroke cleanup (optional owner call): cheek/mouth/eyeTrough tension strokes remain after brow removal (D-0026); owner may want face strictly 3-part rig + relief fields

### 5c. Vision-level (long arc, from GASPER_AI_FAMILIAR_VISION.md)
- [ ] **Truthful soul** — eight states driven by real agent events (runtime signals), not a clock loop
- [ ] **Fascia/muscle-tension system** — build on RELIEF_PRESETS tension fields + `AdaptiveReliefInstrument.ts` (1000-point); never duplicate the fields (three face systems exist: 3-part rig, relief fields, tension strokes)
- [ ] **Geometric scaffold / mask mimicry** — 1000-point system as re-scaffoldable substrate; webcam face-scan → adopt user facial geometry → mimic/mock (owner's stated fidelity bar)
- [ ] **Embodiments as agent-modes** (Presence = companion, Comet = task pursuit, Singularity = compaction/sleep, Wispwalker = pilgrimage)
- [ ] **`.gui` vector format** (new file format, later); **SidekickEX marriage** (agentic mind + Gasper soul/surface); genie/bumblebee shapeshifter energy
- [ ] Eyes as stitched apertures: shear/stretch with surface morphs then recover clean almond (bounded legibility; comet eye-shear backlog item)

## 6. Environment & tooling (learned the hard way)

- **npm is NOT on PATH.** Use `cmd //c "C:\Users\funny\AppData\Roaming\kimi-desktop\daimon-share\daimon\command-process-owner\bin\npm.cmd <args>"` from Git Bash (the handoff in `docs/triforce/handoffs/2026-08-03-gasper-finish-01-next-worker.md` lists an alternate Kimi runtime path — both exist; the command-process-owner path is verified working today).
- **Dev server:** Vite on `http://localhost:5174/` (PID 8488 at handoff — the OWNER's server; never kill without consent). 5175 was a worker server; 7100 is the Kimi Work preview instance (same tree).
- **WebBridge** (visual loop): daemon `http://127.0.0.1:10086/command`, session `gasper-visual-review`. Windows: write each request JSON to a UNIQUE temp file with a file-writing tool, POST with `curl.exe --data-binary "@file"`, delete after. Non-ASCII never inline.
- **RAF stall trap:** screenshots do NOT foreground the tab — the organism clock freezes and every capture looks identical. Always CDP `Page.bringToFront` first, then verify `inspectOrganismClock().timeMs` advances between two evaluates.
- **Cycler interference:** the living auto loop retargets driven embodiments mid-capture. Freeze with `SidekickFormMasterRig.setEightStateEnabled(false)`; restore after.
- **Long evaluates get killed:** fire-and-forget (`void promise; return 'ok'`), sleep driver-side (`Atomics.wait` in .mjs), poll separately.
- **Drive APIs:** `SidekickFormMasterRig.{setEightState, morphToBehavioral, setPaused, setEightStateEnabled, wake, getBehaviorState, inspectOrganismClock}`; rail buttons `data-testid="dais-rail-embodiment-<id>"`; status `__GASPER_DAIS__.livingStatus()` (curated subset; loop controller status not fully exposed).
- **Mixed line endings:** `GasperLivingRuntime.ts` has lone-CR rendering quirks — multi-line Edit old_strings fail; use single-line edits or verify with `od -c`.
- **Repo rules:** no raster in organism code (scanner: `node scripts/gasper-vector-organism/scan-no-raster-runtime.mjs`); classification vocabulary (`machine-proven` / `live-observed` / `human-accepted` / `open` — never unqualified "complete"); captures are observer-only; no destructive git; commit checkpoints (owner tolerates worker proof commits; message format `type: summary (worker: <id>)`); deposit proof under `research/proofs/` before completion claims.
- **Working scripts to reuse:** `scripts/gasper-finish-01/capture-scene-suites-2026-08-03.mjs` (scene-anchored capture drive), `capture-acceptance-drive-2026-08-03.mjs` (8 states), `capture-acceptance-dormant-wake-2026-08-03.mjs`.

## 7. Repo map (scene-relevant)

| Path | Role |
|------|------|
| `packages/desktop/src/gasper/eight-state-loop/` | Loop controller, three-beat grammar, embodiment life, **scene-suites.ts** (+test), manifests |
| `packages/desktop/src/gasper/GasperExpressionProjector.ts` | State→endpoint/embodiment pairing + channel targets |
| `packages/desktop/src/gasper/GasperLivingRuntime.ts` | Live loop start; SCENE manifest selection (~line 656–675) |
| `packages/desktop/src/gasper/GasperRigController.ts` | Morph application, `setEmbodiment` adoption on settle |
| `packages/desktop/src/gasper/embodiments/{singularity,comet,dormant}/` | Embodiment geometry evaluators (deterministic) |
| `packages/desktop/src/gasper/living/AdaptiveReliefInstrument.ts` | 1000-point relief/fascia evaluator |
| `packages/shared/src/gasper-scenario/` | Authored scenario compiler (showcase pack) |
| `packages/gasper-studio/src/dais-first/` | Studio rail UI (sliders, embodiment/state buttons) |
| `packages/gasper-studio/src/timeline/KeyframeTimelineVisualizer.tsx` | Existing timeline visualizer — candidate surface for the scene-design system |
| `research/decisions/DECISION_LOG.md` | Doctrine record (latest D-0087) |
| `research/proofs/` | Proof deposits (per-effort dirs) |

## 8. Suggested first moves for Qwen

1. Reproduce §4: watch 5174 for one full ~100s cycle; confirm whether scene suites visibly read. Fix amplitude/channel leverage before authoring anything new.
2. Stand up the scene rubric (owner requirement: beginning/middle/end + three-beat physics + refractory settle + face readability + material-as-light) as a machine-checkable contract; route through Tri-Force ops per the owner's "use triforce to its fullest".
3. Re-anchor or re-key suite entrances so scenes begin when the eye expects (state entrance), then live-tune one scene (singularity rest is the owner's emotional priority) to visible conviction before scaling to the rest.
