# Handoff — GASPER-FINISH-01 — Next Worker (2026-08-03)

**For:** any competent agent (Codex, Kimi, or a fresh session) picking up Gasper Studio to finish the remaining plan work.
**Plan of record:** `docs/triforce/plans/2026-08-02-gasper-finish-01.md` (Tasks 1–8, acceptance gates §4, stop rules §5). Do not invent a different plan.
**Residual:** `GASPER-FINISH-01` — keep it named until Task 8 closes it.
**Written by:** `kimi-vec000-worker-20260802`, after completing the vivid calibration pass.

---

## 1. Boot sequence (do this first, every session)

```powershell
cd C:\Users\funny\Documents\GasperStudio
# Read, in this order:
#   AGENTS.md
#   docs/triforce/START_HERE.md
#   docs/triforce/AGENTS.md
#   docs/triforce/plans/2026-08-02-gasper-finish-01.md
#   research/proofs/gasper-finish-01/implementation-proof-matrix.md
node bin/triforce.mjs boot
node bin/triforce.mjs status
node bin/triforce.mjs doctor
git status --short
git log --oneline -5
```

Use a **unique worker identity** (e.g. `<agent>-vec000-worker-<date>`) and do not edit files owned by another worker. Deposit proof under `research/proofs/gasper-finish-01/` **before** claiming any completion.

## 2. Non-negotiable constraints

- **Boundary:** work only inside `C:\Users\funny\Documents\GasperStudio`. Never read/write/merge/execute through AgentBridge worktrees.
- **No destructive git:** no reset/checkout/clean/stash/broad rewrites. Preserve unrelated user changes and the inherited dirty state.
- **No raster in organism code:** no `HTMLCanvasElement`, `OffscreenCanvas`, `CanvasRenderingContext2D`, `Image`/`ImageData`/`ImageBitmap`, SVG raster nodes, `foreignObject`, organism-internal filters, CSS `mask`, or `mix-blend-mode`. The permanent scanner is `node scripts/gasper-vector-organism/scan-no-raster-runtime.mjs` — production scope must PASS (currently 157 files). `--include-lab` is **expected to FAIL** on `candidate-script-3.js` (filter ×2) — that is standing evidence the native lab candidate is not promotable.
- **Authority:** FormMaster (`legacy-authority-formmaster-v655`) is the production renderer. Native renderer stays lab-only until an explicit equivalence gate passes. One clock, one compositor, one living/facial authority, one projection writer.
- **Classification vocabulary:** every claim is `machine-proven`, `live-observed`, `human-accepted`, or `open`. Never write an unqualified "complete". Human acceptance is recorded only when the user explicitly gives it.
- **Screenshots/captures are observer-only evidence.** Captured pixels must never feed Gasper state, geometry, material, or motion.
- PlanOps is not initialized in this repo. The plan file + this handoff are the execution record; don't pretend a PlanOps kernel/event log exists.

## 3. Environment and tooling (learned the hard way — read this)

- **Shell:** Git Bash on Windows. `node` is v24 and the repo is `"type":"module"` — write helper scripts as `.mjs` (or run from TEMP) or ESM import errors will bite.
- **npm is NOT on PATH.** Use:
  `NPM="/c/Users/funny/AppData/Local/Programs/Kimi/resources/resources/runtime/npm.cmd"`
  - tests: `"$NPM" test` or `"$NPM" exec vitest run <dir>`
  - typecheck: `"$NPM" run typecheck` · build: `"$NPM" run build`
  - run TS scripts: `"$NPM" exec vite-node <script>`
- **Dev server:** Vite on `http://localhost:5174/` (was PID 8488; verify with `netstat -ano | findstr 5174`). Edits auto-reload; a hard `navigate` guarantees a fresh load. Never leave a second dev server running; never kill the user's without asking.
- **WebBridge (visual loop):** daemon at `http://127.0.0.1:10086/command`, session `gasper-visual-review`, browser extension connected.
  - Write request JSON with a file-writing tool (e.g. to `%TEMP%\wb-*.json`) — **never** heredoc/`node -e` paths through bash; quoting mangles them (this already produced one junk file, now removed).
  - POST with `curl.exe -s -X POST http://127.0.0.1:10086/command -H "Content-Type: application/json" --data-binary "@C:\\path\\to\\req.json"`.
  - Actions used: `{"action":"navigate","args":{"url":"http://localhost:5174/"},"session":"gasper-visual-review"}` and `{"action":"screenshot","args":{"format":"png","path":"<abs png path>"},"session":"gasper-visual-review"}`. For a **fresh window** add `"newTab":true,"group":"Gasper visual review"` to navigate args.
  - Long-running `evaluate` calls get killed — install fire-and-forget recorders that store to `window.__GASPER_*__` and poll. If RAF sampling stalls, the tab is hidden: CDP `Page.bringToFront`.
  - Delete temp request files when done.
- **In-page drive API (console/evaluate on 5174):** `SidekickFormMasterRig.morphToBehavioral('singularity'|'dormant-orbit'|'presence'|...)`, `setProfile(...)`, `setPaused(...)`.
- **DOM:** `svg#avatar` (dataset: morphFrom/To/Mix/Phase, `materialSpace='persistent'`, `vectorMaterialRevision`), `#faceRecessLayer`, `#faceEmissionLayer`, `#materialFlecksLayer` (`fleck-01`…`fleck-24`), `#cosmicStreaks`, `#subsurfaceBands`, highlights via `document.querySelector('[data-material-id="highlight-nub-left"]')` (also `leftLobeGlint`/`rightLobeGlint`/`keyCore`).
- **Introspection globals:** `__GASPER_MATERIAL_PROJECTION__` (`.last`, `.committedHighlights`, `.revision`, `.pressureMaterial`), `__GASPER_VECTOR_MATERIAL__`, `__GASPER_FACE_VISIBILITY_POLICY__`, `__GASPER_DAIS__`, `__GASPER_VECTOR_PROJECTION__`.

## 4. Where the work stands (verified state)

**Checkpoints:**
- `a221eaa` (tag `checkpoint/gasper-finish-01-vec101-2026-08-02`) — Task 1 baseline + Task 2 face continuity.
- `b3ba5a2` (tag `checkpoint/gasper-finish-01-vec201-2026-08-02`) — Task 4 unified analytic material.

**Proof matrix** (`research/proofs/gasper-finish-01/implementation-proof-matrix.md`):
- **machine-proven:** face continuity (1), deterministic replay at material level (9), no-raster scanner (11), one clock (12), one compositor (13), one projection writer (14, also live-observed), showcase pack serving (15).
- **machine-proven + live-observed:** material authority (2) — 246/246 frames × 7 attribute checks, DOM equals typed commit (`visual/material-unification-246f.jsonl`).
- **open:** all eight states (3), embodiments (4), three-beat sequences (5), long rest (6), interruption (7), wake (8), easing across boundaries (10), human visual acceptance (16).

**UNCOMMITTED right now (vivid calibration, Task 4's color/depth step — live-observed, human acceptance PENDING):**
- `packages/desktop/src/gasper/assets/gasper-rig-v655.svg` — 28 gradient-stop / CSS-opacity edits across three passes (`vivid-01/02/03`; scripts in `research/proofs/gasper-finish-01/scripts/`). Result: saturated violet body, dark pearl core, near-white recessed-glowing eyes/mouth, strong cyan reservoir — matched against `research/references/abgasp.mp4` (6.5 standard rig target) and `sidekickex-approved-character-reference-sheet.png`.
- Untracked proof files: `vivid-calibration-2026-08-03.json`, `visual/vivid-0{1,2,3}-presence-2026-08-03.png`, `scripts/`, `research/references/` (2 files).
- Verified after edits: scanner PASS (157 files), 84/84 tests, typecheck 0, build clean.
- **Hash drift:** rig content sha256 is now `7018ca6898738d64083182d5b8e60a3bf17275e52b71bda61bb76a73fe3693d8` vs frozen `data-baseline-sha256 59028a87…` in the SVG. Do NOT refresh the lock here — that is Task 8. Face geometry untouched (all edits are stops/opacity; FACE_GEOMETRY_SHA intact).

## 5. Remaining work, in order

### 0. Close out the vivid calibration (first action)
1. Show the user the current 5174 render (fresh window). Get explicit acceptance or iterate further using the same edit-script → reload → screenshot → judge loop (scripts must assert each replacement matches exactly once; record every pass in a new `vivid-calibration` entry).
2. On acceptance, commit checkpoint **vec-202**: stage the rig SVG, `research/proofs/gasper-finish-01/` (scripts, captures, calibration JSON), and `research/references/`. Message format follows prior checkpoints, e.g. `checkpoint: GASPER-FINISH-01 Task 4 — 6.5 color/depth envelope restored (vivid-01..03)`. Tag optional, consistent with `checkpoint/gasper-finish-01-vec202-2026-08-03`.
3. Update the proof matrix row 2 gap note and row 16 to record the user's disposition.

### Task 5 — three-beat grammar, embodiment/state matrix, living rests (the big one)
Plan lines 250–284 are the spec. Approach:
1. Read `packages/desktop/src/gasper/eight-state-loop/` (`types.ts`, `state-targets.ts`, `schedulers.ts`, `motion-grammar.ts`, `loop-manifest.ts`, `long-rest.ts`, `layer-authority.ts`, `ir-targets.ts`, `embodiment-state-matrix.ts`, `embodiment-life.ts`) plus `GasperUnifiedTheory.ts` and `legacyFormMasterPolicy.ts`.
2. Define ONE machine-readable `BeatSequence` contract (setup/gather, peak/commit, settle/recovery; durations, easing, interruption policy, material + face response, moving-hold behavior).
3. Every eight-state route AND every supported embodiment gets a non-empty three-beat sequence with finite bounded targets; unsupported embodiments must return a deliberate unsupported disposition, never silent fallback.
4. Moving holds: breath, subtle sway, eye life, material phase, bounded drift continue while macro motion rests; absolute rest-pose anchoring (VEC-ANIM-064) so long loops don't accumulate drift. Post-accent rest longer than pre-accent gather (MOTION-037); record durations in the scene manifest.
5. Interruption retargets from current resolved pose + velocity (MOTION-063); test during gather, peak, settle, long rest, dormant hold, wake.
6. Wake = three events: inhale/activation → stretch/re-entry → normal living hold. Not an instant swap.
7. Seeded bounded microvariation layer, deterministic replay; never touches topology/feature identity/face ownership/beat order.
8. Matrix test: state × embodiment × direction × interruption × reduced-motion — finite outputs, face floors, material bounds, complete beat trace.
- **Verification:** `"$NPM" exec vitest run packages/desktop/src/gasper/eight-state-loop packages/desktop/src/gasper/continuity`, typecheck, scanner.
- **Exit evidence:** `research/proofs/gasper-finish-01/beat-matrix.json`.
- **Visual:** after the matrix passes, live-drive each state/embodiment on 5174 (`morphToBehavioral`) and capture at 60fps-ish for the user to inspect segment-by-segment (standing user rule: visually review each changed segment at high frame rate).

### Task 6 — authored scene compiler and studio showcase route
Plan lines 286–321. Core: prove the running app loads `10-showcase-project.gasper` (not the seeded fallback — serving is already proven; runtime loading is not), compile every authored track without dropping face/material/easing/interruption metadata, build the minimum scene set (recognition spark, listening/hold, thinking/resolve, presence→singularity, presence→comet, dormant-orbit/wake, one full eight-state loop), bidirectional route coverage, compiler snapshot proving easing/durations/state IDs/face+material intent survive.
- **Verification:** `"$NPM" exec vitest run packages/shared/src/gasper-scenario packages/desktop/src/gasper/scenario`, typecheck, build.
- **Exit evidence:** `research/proofs/gasper-finish-01/scene-compiler.json` + runtime trace of the loaded authored document.

### Task 7 — visual polish, renderer witness, fresh QA loop
Plan lines 323–362.
- **Pause the autonomous living sequence before rubric captures** (`setPaused` or the documented capture path in `captureLivingSequence.ts`); fixed viewport, seed, optical mode, background.
- Fresh captures per state × embodiment; rubric: face readable in gather/peak/settle/rest/interrupt/wake; material reads as light (nub streaks, left-face streak, subsurface bands, flecks/streaks continuous, shadows follow contour); animation quality (anticipation, accent, overshoot, moving hold, secondary motion, asymmetric recovery).
- Renderer equivalence lab for representative frames; native stays lab-only unless the explicit gate passes. Record defects as concrete deltas and fix the responsible authority — no visual patches/overlays.
- Save everything under `research/proofs/gasper-finish-01/visual/` with a scorecard; keep the human gate explicitly open.

### Task 8 — permanent gates, proof deposit, closure
Plan lines 364–401.
- Cumulative suites; scanner incl. selftest; one-clock/compositor/authority/writer/root/topology/material-ID/deterministic-replay proofs; showcase pack end-to-end.
- **Refresh the frozen locks** (this is where hash drift gets resolved): recompute the rig SVG content sha256 at that time (more edits may have landed) and update `data-baseline-sha256`, `GASPER_ARCHITECTURE_LOCK.json`, `GASPER_MATERIAL_CONTINUITY_CONTRACT.json` per their own procedures.
- Update `implementation-proof-matrix.md` → `proof-matrix-final.md` with all four classifications; `final-manifest.json` with renderer ID, HEAD, viewport, seed, optical mode, build result, evidence hashes; TriForce deposit receipt; update `docs/CANONICAL_BASELINE.md` with evidence-backed status + next residual. If the visual gate is still open, keep `GASPER-FINISH-01` as the residual and stop — do not promote native or declare finish.

## 6. User standing rules (from this project's owner)

- Rapid iteration, as fast as possible; automate everything automatable.
- Live-update 5174; **always show the most current working version in a fresh browser window** (navigate with `newTab:true`, group `Gasper visual review`).
- Visually review every changed segment at high frame rate (60fps+ captures) — the owner wants to inspect the minutiae.
- Keep `research/references/` targets in mind for all visual judgment: `sidekickex-approved-character-reference-sheet.png` (color depth concept art) and `abgasp.mp4` (6.5 standard rig side-by-side — the current target).
- Checkpoints are committed only with the owner's confirmation.

## 7. Verification block (run before any completion claim)

```powershell
node bin/triforce.mjs doctor
node bin/triforce.mjs status
node scripts/gasper-vector-organism/scan-no-raster-runtime.mjs --out research/proofs/gasper-finish-01/no-raster-scan.json
# with NPM as in §3:
"$NPM" test
"$NPM" run typecheck
"$NPM" run build
git diff --check
```

Expected at handoff time: scanner PASS 157 files · tests 84/84 (9 files) · typecheck 0 errors · build clean (chunk-size warning is pre-existing).

## 8. Stop rules (from plan §5, restated)

- Stop if you find a second authority, a hidden raster path, or a mixed Gasper/AgentBridge boundary — record the exact file, preserve the last valid vector state.
- Never compensate for a missing face with a CSS/SVG overlay — repair the facial authority/projection trace.
- Never compensate for flat material with screenshot-derived textures, filters, blend modes, or a second compositor — repair the analytic response.
- No new scene content while the showcase falls back or one-clock/one-writer is unproven.
- If visual review finds a defect after machine gates pass, reopen the responsible packet and keep the capture as regression evidence.

## 9. Rig SVG gradient map (for future color/light tuning)

`packages/desktop/src/gasper/assets/gasper-rig-v655.svg` — gradient defs are lines 3–39; key levers:
- `bodyBase` (line 3): body radial, center→edge stops.
- `violetField` (4), `cyanField` (5): large color washes.
- `faceZone` (6): blue veil over face area — lower = darker face field.
- `faceFill` (11): eye/mouth fill (white→lavender-blue, objectBoundingBox per path).
- `innerVolumeGrad` (13), `pearlCoreGrad` (14): center milkiness — lower = darker pearl core.
- `violetCoreGrad` (15): light wash upper-center behind face.
- `cyanReservoirGrad` (19): bottom cyan glow.
- `faceRecessGrad` (35): recess shadows around eyes/mouth.
- `opticalDepthGrad` (36): dark core overlay behind face.
- `faceBloomGrad`/`faceBloomOuterGrad` (41–42): eye/mouth glow halo.
- Eye/mouth base opacity: CSS around lines 63–64 (`#eyeL, #eyeR`, `#mouth` with `!important`; per-state overrides follow).
- Edit method: exact-string replace via script, assert unique match per edit, keep scripts under `research/proofs/gasper-finish-01/scripts/` as proof.
