# Worker Packet — Task 5: Three-Beat Grammar, Embodiment/State Matrix, Living Rests

**Issued:** 2026-08-03 by `kimi-vec000-worker-20260802` (architect / conductor)
**Assigned to:** DeepSeek Flash (live worker in this repo) — pick and use a unique worker identity, e.g. `deepseek-vec005-worker-20260803`, and sign every proof deposit with it.
**Residual:** `GASPER-FINISH-01`
**Plan of record:** `docs/triforce/plans/2026-08-02-gasper-finish-01.md` — Task 5 is specified at lines 250–284. This packet operationalizes it; it does not replace it. Acceptance gates §4 and stop rules §5 apply in full.

---

## 1. Mission

Make every behavior feel authored and alive instead of a state switch with idle gaps: one machine-readable `BeatSequence` contract, a non-empty three-beat sequence (gather/setup → peak/commit → settle/recovery) for **every** eight-state route **and** every supported embodiment, explicit moving holds, velocity-preserving interruption, wake-as-three-events, seeded bounded microvariation, and a matrix test that proves it all numerically.

## 2. Read first (in order)

1. `AGENTS.md`, `docs/triforce/START_HERE.md`, `docs/triforce/AGENTS.md`
2. `docs/triforce/plans/2026-08-02-gasper-finish-01.md` (whole file; Task 5 is your scope)
3. `docs/triforce/handoffs/2026-08-03-gasper-finish-01-next-worker.md` (state of the world, §4–§5)
4. `research/proofs/gasper-finish-01/implementation-proof-matrix.md` (rows 3–8, 10 are yours to close)
5. Your file scope (§3), especially `motion-grammar.ts`, `state-targets.ts`, `schedulers.ts`, `loop-manifest.ts`, `long-rest.ts`, `embodiment-state-matrix.ts`, `embodiment-life.ts`
6. Corpus guidance to apply: `MOTION-037` (moving holds / rest punctuation), `MOTION-063` (transition decision matrix / smoothstep), `MOTION-065` (state machine / blend-tree discipline), `VEC-ANIM-064` (absolute rest-pose anchoring)

## 3. Ownership boundary (hard)

**You own (edit freely):**
- `packages/desktop/src/gasper/eight-state-loop/**`
- `packages/shared/src/gasper-scenario/**` (only what the beat contract needs; full showcase compiler work is a later packet)
- `packages/desktop/src/gasper/GasperUnifiedTheory.ts`
- `packages/desktop/src/gasper/controller/legacyFormMasterPolicy.ts`
- `packages/desktop/src/gasper/continuity/captureLivingSequence.ts`
- New tests under `packages/desktop/src/gasper/eight-state-loop/` and `packages/desktop/src/gasper/continuity/`
- Your proof deposits: `research/proofs/gasper-finish-01/task5/**`

**Do NOT touch (architect-owned or locked):**
- `packages/desktop/src/gasper/assets/gasper-rig-v655.svg` and `packages/desktop/src/gasper/assets/**` (visual surface — just passed a verified calibration at checkpoint `5257ea7` / tag `checkpoint/gasper-finish-01-vec202-2026-08-03`)
- `packages/desktop/src/gasper/contracts/**`, `renderer/productionAuthority.ts`, `.triforce/**`, `docs/CANONICAL_BASELINE.md`
- `research/proofs/gasper-finish-01/implementation-proof-matrix.md` (architect updates it at integration)
- `packages/gasper-studio/**` (Task 6 scope, later)
- Anything outside this repo. No AgentBridge paths, ever.

If you believe a fix requires editing a file outside your scope, **stop and flag it in your deposit** (`task5/ESCALATION.md`) instead of editing.

## 4. Coordination protocol

- **No git commits.** The architect integrates, reviews, and commits checkpoints. Leave your work in the working tree, staged or unstaged — just don't commit, tag, reset, checkout, stash, or clean.
- The Vite dev server on `http://localhost:5174/` is live and shared. Hot reloads from your edits are expected. Never kill or restart it.
- The architect reviews visuals live in the browser while you work. Broken intermediate states are fine; do not "fix" the visuals — the rig SVG is not yours.
- **Classification vocabulary:** your deposits classify every claim as `machine-proven` (test/scan executed here), `live-observed` (seen running), or `open`. No unqualified "complete". Human acceptance is recorded by the architect only.
- Deposit proof before claiming anything: `research/proofs/gasper-finish-01/task5/`.
- Preserve unrelated working-tree changes. The tree is clean at packet issue (HEAD `6c4a336`); if you find unexpected modifications that aren't yours, stop and flag.

## 5. Environment

- Repo is ESM (`"type": "module"`), node v24. Helper scripts: write `.mjs`.
- npm (if your harness has none on PATH): `"C:\Users\funny\AppData\Local\Programs\Kimi\resources\resources\runtime\npm.cmd"` (Git Bash: `"/c/Users/funny/AppData/Local/Programs/Kimi/resources/resources/runtime/npm.cmd"`).
- Focused tests: `npm exec vitest run packages/desktop/src/gasper/eight-state-loop packages/desktop/src/gasper/continuity`
- Full suite: `npm test` · typecheck: `npm run typecheck` · scanner: `node scripts/gasper-vector-organism/scan-no-raster-runtime.mjs`
- Gates at packet issue: scanner PASS (157 files) · tests 84/84 · typecheck 0 · build clean. You must not regress any of them; new tests add to the count (record the new totals).

## 6. The work (steps with acceptance criteria)

**Corpus machine rules to encode (architect-queried 2026-08-03 — use these exact numbers, do not invent your own):**

- **MOTION-037 (rests/holds):** rests of 400–1200ms between major gestures; post-accent rest 1.5–2× the pre-accent gather; during any rest keep breath/sway/blink life layers running at 5–10% amplitude — never freeze all channels (a fully static frame reads as death, not rest). Moving hold = slow drift `A·fBm(t, 0.1–0.3Hz)` with A = 0.5–2 viewBox units (viewBox is 240×220).
- **EMO-CHAR-058 (hold duration = emotional weight):** `holdFrames = 4 + intensity × 56` (4–60 frames); narrative-significant beats 60–120 frames; holds keep 1–2% micro-oscillation, never a true freeze.
- **VEC-ANIM-064 (rest-pose anchoring):** contour computed absolutely as `restPose + f(parameters)` every frame — never `positions += delta` (drift accumulates). Deformation pipeline stateless; per-frame state only in parameter smoothing springs. Same parameter vector → same contour (required for deterministic replay).
- **MOTION-063 (transition decision matrix):** input-driven → interrupt/retarget with velocity preservation (never crossfade under operator control); large discontinuity / hard state boundary → cut (0ms, explicitly recorded justification); small/ambient/reversible → crossfade 150–300ms on smoothstep `w = 3t²−2t³` (never linear — linear kinks at both ends). Scale duration to state difference: subtle variation 150–200ms, gait-class change 250–400ms, full ambient mood 400–600ms.
- **MOTION-065 (state machine discipline):** per-edge `(condition, blendDuration)` — fast inbound blends to reactive states (80–150ms), longer ambient blends (250–400ms); smooth driving parameters with exponential τ = 80–150ms; no unreachable states; no >500ms blend on operator-driven routes.

1. **`BeatSequence` contract** — one machine-readable type in `eight-state-loop/types.ts` (or a new `beat-sequence.ts`): `{ id, phases: [gather, peak, settle], }` where each phase declares `durationMs`, `easing` (authored names only, e.g. `power1`/`power2` family already in use), numeric targets, face response, material response, and moving-hold policy; plus `interruptionPolicy` and `restPolicy` on the sequence. Include a runtime validator that rejects empty phases, non-finite targets, and unknown easing names.
2. **Every eight-state route** gets a non-empty three-beat sequence with finite, bounded targets. Peak must be legible (measurable accent above the hold baseline); settle must not erase face or material identity (respect the face floors — current proven minimum faceVis 0.38 on the dormant route).
3. **Every supported embodiment** (presence, singularity, dormant-orbit, low-orbit, comet, wispwalker, halo, lantern — reconcile against `embodiment-state-matrix.ts`) gets the same contract. Unsupported or endpoint-only embodiments return an explicit `{ supported: false, reason }` disposition — never silent fallback.
4. **Moving holds** — when macro motion rests, breath, subtle sway, eye life, material phase, and a small bounded drift continue. Absolute rest-pose anchoring (VEC-ANIM-064): long loops must not accumulate deformation drift — prove with a long-horizon test (≥ 3000 frames) that anchored rest pose error stays ~0.
5. **Rest punctuation** (MOTION-037) — post-accent rest longer than pre-accent gather where the route needs punctuation; record the durations in the scene manifest.
6. **Interruption** — retarget from the current resolved pose **and velocity** (MOTION-063), never a restart-from-target. Test interruption during gather, peak, settle, long rest, dormant hold, and wake.
7. **Wake = three events** — inhale/activation → stretch/re-entry → normal living hold. Not an instant state swap; prove the three sub-events appear in the beat trace in order.
8. **Microvariation** — seeded, bounded amplitude, deterministic replay (same seed → byte-identical sequence). Must never change topology, feature identity, face ownership, or beat ordering.
9. **Matrix test** — state × embodiment × direction × interruption × reduced-motion mode. Assert: finite outputs, face floors, material bounds, complete beat trace, explicit dispositions for unsupported routes.

**Architecture constraints (from the plan, restated):** beats evaluate as **numeric values only** — no SVG writes, no timers, no RAF, no GSAP ownership inside the beat evaluator. One clock / one compositor / one living-facial authority / one projection writer remain the only authorities. No new runtime dependencies. No raster/canvas/foreignObject/filter/mask/mix-blend-mode anywhere (the scanner enforces this).

## 7. Verification gates (all must pass before you hand back)

```powershell
npm exec vitest run packages/desktop/src/gasper/eight-state-loop packages/desktop/src/gasper/continuity
npm test
npm run typecheck
node scripts/gasper-vector-organism/scan-no-raster-runtime.mjs
```

## 8. Exit evidence (deposit under `research/proofs/gasper-finish-01/task5/`)

- `beat-matrix.json` — every route's three beats, durations, easing, rest policy, interruption result, wake result, deterministic hash, explicit unsupported dispositions.
- `TASK5-REPORT.md` — what you changed (file list), gate results with counts, classification per claim, open questions / escalations.
- Any long-horizon / replay traces backing the drift and determinism claims.

## 9. Stop rules

- Stop on discovering a second authority, hidden raster path, or mixed AgentBridge boundary — record the exact file, preserve the last valid vector state.
- Do not compensate for weak motion with visual patches, overlays, or rig edits.
- Do not add scene content; the showcase compiler packet follows after this one lands.
- If a gate you might regress is already failing when you start, stop and flag — don't fix someone else's red.

## 10. What happens after you hand back

The architect: reviews the diff and deposits, runs the full gate set, drives the new beats live on 5174 with 60fps captures for the owner's visual review, updates the proof matrix (rows 3–8, 10), and commits the next checkpoint. You may be handed a correction round — same scope, same rules.
