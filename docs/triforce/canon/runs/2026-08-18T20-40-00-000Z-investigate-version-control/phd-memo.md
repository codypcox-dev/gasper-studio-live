# CanonOps PHD — investigate · version-control

Earned under N20 / N335. Engine 3.0.0.
Parent: `seven-studio-laws` (file = runtime) · `vector-studio-ux` (instrument, not badge rail).
Deposit: `docs/triforce/canon/runs/2026-08-18T20-40-00-000Z-investigate-version-control`

## 1. THE WALL

The owner says “checkpoint this version.” The agent tags git. The next turn the look is gone.

Git restored the *painter*. It did not restore the *cheek drag*, the *yaw dial*, the *muted cards*, or the *playhead*. Those live in RAM. Ctrl+Z only rewinds the GeoGraph. `__GASPER_GRID_SCULPT__` has no tape. The factory baseline (`gasper.canonical-baseline.v1`) snapshots rail knobs, not the 1000-point field.

The wall is not “pick Perforce or Git LFS.” The wall is: **three version spaces keep being treated as one word.**

## 2. QUESTION

What is a version of Gasper — the engine, the instrument, or the organism — and which restore primitive belongs to each, so “checkpoint,” “undo,” and “save as embodiment” stop destroying each other?

## 3. COORDINATE SPACES

| Space | Object | Unit | Live authority | Restore today |
|---|---|---|---|---|
| **Source** | painter, laws, UI, book | git commit | `checkpoint-live-skin-20260818` = `de5f7a0` | Agent `git checkout` |
| **Instrument** | GeoGraph + mute + params + links | JSON graph | `undoGraph` RAM, limit 80 | Ctrl+Z this session only |
| **Organism** | `gridSculpt[2000]`, showGrid, take T0, playhead, embodiment | float field + clock | `__GASPER_GRID_SCULPT__` RAM | **nobody** |
| **Publish** | named frozen look | document | factory baseline only | partial (rail, not sculpt) |

Figma versions the *file*, not Figma.app.  
After Effects versions the *project*, not ae.exe.  
Pixar versions a *USD layer publish* (`char_gasper_mod_v014.usda`), not Presto.  
Rive versions the `.riv`.  
Spine versions setup JSON vs animate JSON.

Git for the **tool**. A document for the **character**.

## 4. PHYSICAL LAW (what a version is allowed to mean)

### 4.1 Dual (ThinkOps)

`tag = organism`

A git tag is a source pin. An organism is a field + graph + clock. Equating them is how the cheek comes back as a flat pearl.

### 4.2 Three verbs (irreducible)

| Verb | Space | Meaning |
|---|---|---|
| **Pin** | Source | “This engine is lawful. Do not rewrite the painter.” Annotated tag. Never force-push. |
| **Undo** | Instrument (+ organism if joined) | Session tape. Linear. Dies on reload unless persisted. |
| **Publish** | Organism + instrument | Named, reloadable document. The owner’s “save this Gasper.” |

“Checkpoint the app” after a wiring fix = **Pin**. Lawful today.  
“Checkpoint Gasper” after a good look = **Publish**. Not implemented.  
Ctrl+Z after a bad yaw = **Undo**. Graph only. Lie if the user also sculpted.

### 4.3 Document (the missing type)

```
gasper.revision.v1 = {
  schema, id, name, capturedAt,
  sourcePin,          // git describe, informational
  graph,              // GeoGraph clone
  sculpt,             // Float32[2000] sparse or b64
  showGrid,
  takeId, playheadMs, paused,
  baseline            // canonicalBaseline v1 subset
}
```

Size: graph ~tens of KB. Sculpt 2000×4 B = 8 KB dense; sparse deltas after a cheek drag are hundreds of bytes. This belongs in `localStorage` (last 12) and as a downloadable `.gasper.json`. It does **not** belong in git on every mouse-up.

### 4.4 What other studios keep — stolen set, fat trimmed

| Keep | From | Refuse |
|---|---|---|
| File is the runtime | Rive `.riv` | Cloud-only lock-in |
| Named version history on the file | Figma | Git-style branches of the character |
| Incremental auto-save | After Effects | Incremental `all-script-3.js` |
| Publish v001 / v002, pull when ready | Pixar USD | USD composition stack (one hull, no layers) |
| Variant = costume of one asset | USD VariantSet | Variant = take (already refused) |
| Setup vs Animate freeze | Spine | Bone tree |
| File locking for binaries | Perforce | Perforce as the product VCS |
| LFS for film stills | Git LFS | LFS for the sculpt field |

Pixar’s VariantSet is a **selector on one asset** (hair A/B, lookdev). Gasper already has embodiments for that. Do not invent a second variant axis.

Perforce / Plastic / SVN win for **binary film and locking**. This studio is one author, one SVG organism, one sandbox. Those tools are the wrong mass. Git stays for Source. The document stays in-app.

### 4.5 Git policy for Source (this repo)

1. `main` only moves forward. No rebase of owner pins.
2. Owner-accepted engine looks get an annotated tag: `checkpoint-<name>-YYYYMMDD`.
3. Agent experiments that might burn the painter use a branch or worktree, then merge or throw away.
4. Proof PNGs are evidence, not the character. Prefer one proof folder per pin, not a PNG per slider tick.
5. `git checkout checkpoint-*` restores the **engine**. Print that sentence in the UI if we ever expose restore.

Current pins:

| Tag | What it actually pins |
|---|---|
| `checkpoint/gasper-unified-runtime` | early unified runtime |
| `checkpoint/gasper-strut-unshear-20260817` | planted W, no shell skew |
| `checkpoint-glued-cage-20260818` | cage rides the rig |
| `checkpoint-live-skin-20260818` | pointer hits the cage; yaw/foot live |

### 4.6 Undo law

Today `history.ts` clones the graph only. After a sculpt, Ctrl+Z rewinds dials and leaves the dent. That is a lie.

Either:

- **Join** — each `pushPast` also snapshots `gridSculpt` (8 KB, fine), or
- **Label** — the Undo button reads “graph only” until joined.

No third option.

### 4.7 Auto-save law

On a successful `setVertex` / `setNodeParam` / take scrub-end: debounce 800 ms, write `gasper.revision.autosave` to `localStorage`. Reload hydrates if schema matches. This is Figma’s “I didn’t lose the file,” not a pin.

## 5. INVARIANTS

1. Source pins never serialize the sculpt field.
2. Publishes never rewrite `all-script-3.js`.
3. Undo either includes sculpt or says it does not.
4. Factory Wispwalker is publish `v000` and is read-only.
5. One schema: `gasper.revision.v1`. No second snapshot format.
6. VEC-401 remains the only clock; a revision stores `playheadMs`, it does not start a second clock.
7. Embodiment list is a view of Publishes, not a fourth space.

## 6. FAILURE MODES

| Failure | Why | Fix |
|---|---|---|
| Tag the look, reload, look gone | sculpt/graph not in the tag | Publish document |
| Undo after sculpt | tape is graph-only | join or label |
| Commit every drag | repo becomes a film strip | debounce autosave off-git |
| Checkout old tag in a running preview | two painters | full reload after pin restore |
| “Save embodiment” without sculpt | Wispwalker list lies | embodiment = Publish |
| Second schema (`canonical-baseline` vs `revision`) | two homes | baseline is a *subset* of a revision, or migrate |

## 7. KNOWN UNCERTAINTY

- Whether `content_meta.canonicalBaseline` is still mounted on the live document shelf (optional catch-all in `persistCanonicalBaseline`).
- Whether the 2000-float sculpt should be sparse-delta or dense in v1 (dense is honest and small).
- Multi-device sync is out of scope. One author, one preview.

## 8. TESTS

- Pin: `git rev-parse checkpoint-live-skin-20260818` equals `de5f7a0`.
- Undo-lie: sculpt Δenergy > 0, Ctrl+Z, energy must return **or** the control must read “graph only.”
- Publish round-trip: drag cheek, save “paddle-study”, reload, energy and bbox match ±0.5 px.
- Autosave: reload without Save still restores last graph + sculpt.
- Source isolation: a Publish file must not appear as a git change unless the owner exports it into the repo.

## 9. VISUAL CONSEQUENCES

- A **Versions** strip on the Score compiler: Autosave · last 12 publishes · Factory.
- Each chip shows a 64 px still (optional) and the name. Click = hydrate. No git chrome in the owner UI.
- Undo/Redo stay Photoshop. After join, a sculpt undoes as one step with the dial that happened in the same gesture, or as its own step if it was a drag.
- Pin remains an agent/owner conversation (“checkpoint the app”), not a button next to Grid.

## 10. IMPLEMENTATION (do not start until asked)

1. Add `packages/desktop/src/gasper/revision/GasperRevision.ts` — schema, `capture()`, `hydrate()`, sparse/dense sculpt codec.
2. Join `pushPast` to `{ graph, sculpt }` or stamp the Undo tooltip “graph only.”
3. Autosave debounce to `localStorage['gasper.revision.autosave']`.
4. Score strip: Factory / Autosave / named publishes. `Save look` writes a Publish. Embodiment list reads the same store.
5. Keep git tags for Source only. Next owner “checkpoint the app” = annotated tag. Next “save this Gasper” = Publish.

Lead force: PlanOps (one type). ThinkOps named the dual. DesignOps crystals the Score strip. CodeOps does not pin by rewriting the painter.
