# STUDIO MASTER BOOK — execute for one day

**Id:** `GASPER-STUDIO-MASTER-001`  
**Date:** 2026-08-18  
**Lead:** PlanOps  
**Residual:** `score-is-not-a-curve`  
**Northstar:** `docs/triforce/NORTHSTAR-STUDIO.md`  
**Restore:** `git checkout 1d3dfd5` if a wave burns the pearl  
**Paint authority:** FormMaster `all-script-3.js`. Do not recut it this book except mute/passthrough and state-of-t take subscriber.

Chat is transport. A wave that cannot name its proof is not a wave.

---

## How to work this book

1. Re-read `NORTHSTAR-CAGED-HULL.md` §1–2 and this file’s current wave.
2. Execute only that wave.
3. Deposit proof (test + 120fps stills where named).
4. If proof fails: stop, restore checkpoint, do not “also fix chrome.”
5. Height 168.3 at rest is a kill switch. W is a W. Floor does not pulse.

Tri-Force CLI is **absent** in this host. Do not block on `triforce boot`. Disk deposits are the admit.

---

## Sources (adversarial, 2026-08-18)

| Packet | Residual | Verdict |
|---|---|---|
| seven-studio-laws | cargo-cult union | Keep 10 laws. Refuse layers, Merge, clip-FSM, pen, bones |
| keyframe-easing-curves | easing a fire | Extend CurveTrack. Take must become state-of-t first |
| node-based-compositing | composite = hull | Pick (A). No Nuke. Typed sockets. Mute = identity |
| live-vs-lie audit | costume chrome | Do not plan on four false sentences (below) |

**Do not plan a day on these four sentences — they are currently false:**

1. “We have one transport.”
2. “Mute is passthrough.”
3. “Wires cook the painter.”
4. “The 1000-field is the hull.”

---

# WAVE 0 — Honesty (morning, ~2h)

**Residual:** `costume-chrome`  
**Why first:** every later wave will be measured against the wrong UI if corpses stay mounted.

### Do

0.1 Unmount from `DaisFirstStageHost.tsx`: `DaisControlRail`, `DaisTransportBar`. Do not CSS-hide. Delete the JSX. Keep the files if tests import them as source; mark catalog DEAD.

0.2 Kill the **second** transport on the monitor. Monitor keeps Grid + topology + drag/resize. Play/pause/scrub live only on `StudioTransport`. `NodeGraphPage` clock hook must subscribe to `studioClock.readPlayhead` without painting a range input.

0.3 One autoplay. Remove either the host 1400ms `playNorthstarTwenty` **or** the `GasperStudioApp` boot play. Keep one. Prefer explicit user 20s.

0.4 One playhead poller. `StudioTransport` owns the rAF (or better: subscribe to organism clock). `NodeGraphPage` reads the same snapshot. No second rAF.

0.5 Catalog honesty. `geonodes/catalog.ts`: InstrumentTable, Lumen glass UI, WorldClass chrome, GeoNodeEditor, AuthoringAtlas → `DEAD` or `UNHOOKED`. Tests that assert LIVE must change.

0.6 Spacebar: only `toggleStudioPlayback`. Adapter / AnimationEditorSession must not also toggle.

### Proof

- Playwright: `[data-testid=dais-control-rail]` absent. `[data-testid=dais-transport-bar]` absent. `[data-testid=monitor-timeline]` absent or not interactive. `[data-testid=studio-transport]` present.
- `document.querySelectorAll('[data-testid=studio-scrub]').length === 1`
- Rest height 168.3. Console clean. One 20s start in network/log.
- Catalog test: no DEAD surface stamped LIVE.

### Stop if

Pearl changes. W rounds. Two 20s starts overlap.

---

# WAVE 1 — Score is a function of t (late morning, ~3h)

**Residual:** `fire = curve`  
**Unlocks:** real scrub, then easing.

### Law

```
t = (organismClock.nowMs() − T0) / 1000
heading / walkEnable / boo / expressionId  = last beat with at ≤ t
strut / runInPlace                         = active on [at, sustainUntil]
launchComet / land / lifeGoto              = replay every impulse with at ≤ t
                                             from bind, then integrate 0→t
```

Backward seek is **replay**, not un-apply. Do not offer ping-pong.

### Do

1.1 In `playAuthoredTake`, replace `fired` Set with `evaluateTake(take, t, bind)` sampled every organism frame (subscriber 48).

1.2 Cache replay at 10 Hz if 120 fps full replay is hot. Measure before guessing.

1.3 `scrubStudio(ms)`:
    - `T0 = clock.nowMs() − ms`
    - `clock.scrub(clock.nowMs())` is **illegal** as the seek (it is a no-op).
    - Hold physics `stepDt = 0` while pointer is down.
    - On release, if not paused, resume.

1.4 Loop wrap: reset bind, empty replay history, plant. Frame 0 of loop 2 is a plant, not a slide.

1.5 Remove `fire(\`${beat.id}-${tick}\`)` 2 Hz sustain re-issue. Sustain is a predicate of t.

### Proof

- Headless: play 20s, scrub 12000 → 4000. Assert `walkEnable === 0` (or the authored value at 4s). No comet residue. Yaw is the 5.2-window value if t≥5.2 else the prior window.
- `scrubStudio(3500)` ⇒ playhead 3500 ≡ `nowMs − T0` while paused.
- No `performance.now()` on the take playhead (grep the take path).
- 120fps stills: t=0, 2.6, 5.2, 9.2, 12, 4-after-scrub. Height 168 at t=0. W is a W. Floor still.

### Stop if

Opening 0–2.6 head-shakes (yaw ease at T0). Plant taffy. Cleft pads.

---

# WAVE 2 — CurveTrack is the only ease (afternoon, ~3h)

**Residual:** `easing = physics`  
**Depends on Wave 1.**

### Law

Extend `CurveTrack`. No `EasingTrack.ts`. No GSAP CustomEase as SoT.

```
type Interp = "hold" | "linear" | "auto" | "bezier" | "overshoot"
type Handle = { dt: number; dv: number }   // m = dv / max(dt, ε)
type Key = { t; value; in: Handle; out: Handle; interp; weight }
```

CSS `cubic-bezier(x1,y1,x2,y2)` compiles:

```
m_out = (y1 / x1) · (Δv / Δt)
m_in  = ((1−y2) / (1−x2)) · (Δv / Δt)
```

Then the document stores handles. Editing a handle dirties the preset to `custom`.

Broken Bézier (`m_in ≠ m_out`) is a legal punch. Value exact at the key. `v̇` may jump.

### Do

2.1 Independent in/out on `CurveKey`. Map today’s `stepped/linear/spline-auto/flat-clamped/overshoot` → `interp`. Keep Fritsch–Carlson on `auto`.

2.2 One preset table. Collapse `ANIMATION_EASINGS`, `VALID_EASINGS`, WorldClass dropdown, `BEAT_EASINGS` as **compilers**, not runtimes. `evaluateClipAt` and `playCanonicalClip` must share `evalChannel`.

2.3 First legal Score tracks on Northstar 20s (not pose tracks):

    | Channel | Why |
    |---|---|
    | `yaw` | replace headingWindows fire |
    | `face` | energy 0..1 |
    | `cadenceHz` | arrive, don’t switch |
    | `driveGain` | same |
    | `stretch` | gather only; **fence 0 while planted** |

2.4 Impulses stay impulses. `launchComet.vx` is not a curve.

2.5 UI: selecting a Score channel shows a value graph under the transport (Rive: graph replaces dopesheet). Handles drag. Preset dropdown compiles.

2.6 MCP `set_keyframe_easing("power2.inOut")` writes handles.

### Proof

- `CurveTrack.test.ts`: broken Bézier value-exact + `v̇` jump; matched handles C¹; ease-in-out preset within 0.02 of CSS reference; unit-channel + overshoot fail-closed.
- Take: cadence and face *arrive*. Walk still plants. Comet still kicks. Seat still turns via keyed yaw.
- Plant fence: keyed stretch during 2.618–5.15 is 0 while `supportSide ≠ 0`. Max θ(y>140) ≤ 0.90.
- Opening 0–2.618: yaw locked.

### Stop if

Cleft becomes a U (C² the W). Plant eases. Two evaluators disagree (handles look right parked, wrong in motion).

---

# WAVE 3 — Cook is a language (afternoon, ~4h)

**Residual:** `rack = visual-script`  
**Compositing verdict:** deepen the compiler. Never Merge.

### Do

3.1 `socketsCompatible` must **reject**:

```
ILLEGAL  shade → contour | take → contour | pose → contour
LEGAL    scalar → *; phase → phase|scalar|pose; pose → pose|scalar
         take → pose (Backwards); contour → contour|shade
         lattice → lattice; relief → relief; shade → shade
```

A type that cannot reject is chrome. Tests must fail today’s lie first, then pass the reject.

3.2 Every LIVE card declares `GeoSocket` in/out. Ports paint the type color. Illegal drop is refused with the existing lock-reason toast.

3.3 Mute = identity on the incoming buffer for **every** LIVE card. Host globals revert to authored `base`, not 0, not 0.02 (except Voigt mute meaning “passthrough Voigt” = skip `_lp`, not snap τ).

3.4 Cards OFFSET from `base`. Slider center = 0 = identity. Couple `lerp(user, law, mix)` stays. Park mix → 0.

3.5 `evaluateGraph` walks Kahn order. Each LIVE node reads a named buffer, writes a buffer of the same lock (or an Offset). Painter consults `eval.order` for **handles / voigt / kappa / couple** only. Do not recut Identity→Hull.

3.6 `graph.links` become the Couple sources. Hardcoded `COUPLE_LAWS` are the default edges, not a parallel language. Disconnecting a couple wire parks that mix.

3.7 Ghost `compositor` stays uncatalogued. VEC-501 stays the pose mixer in Machine.

### Proof

- Wire shade→contour is refused.
- Mute Voigt: incoming contour unchanged (not τ=0.02 snap). Height still 168.
- Disconnect froude→τ couple: τ returns to card base; walk still plants (Kernel still lives).
- Rewire a legal couple: host global changes this frame.
- `topoOrder` is not ignored for Couple. Cook-trace flash may stay theatrical.

### Stop if

A second `d`. A Merge node. Identity remeshes. Catalog still lies.

---

# WAVE 4 — Instrument chrome (evening, ~3h)

**Residual:** `badge-rail = transport`  
**Crystal:** AE transport + Spine dopesheet + Rive graph-toggle + Figma inspector.

### Do

4.1 Dopesheet under transport: one row per Score channel (Wave 2 tracks). Keys are dots. Drag time. Click selects. Inspector shows handles.

4.2 Toggle “Graph” on the transport (next to Stage|Graph workspace modes, or a small icon on the timeline) swaps dopesheet for value graph of the **selected** channel. Only selected. Rive law.

4.3 Slider changes go through `commit` so Ctrl+Z undoes dials.

4.4 Monitor is a picture-in-picture of the body. No chrome except Grid switch + drag/resize.

4.5 Stage mode: full-bleed Gasper, transport, no graph. Graph mode: today’s board + PiP.

4.6 Mark or delete: `GeoNodeEditor.tsx`, unused `MachineStrip` mount paths, `InstrumentTable` if still unmounted. Do not keep a second editor “just in case.”

4.7 Tooltips stay. Every card, port, transport button already has `tipFor*`. Do not add a help museum.

### Proof

- Screenshot: Stage mode = body + transport. Graph mode = columns + PiP + inspector + dopesheet.
- Undo a yaw key and a voigt slider.
- Owner can ease face from 0→1 on 2–4s and see it in the graph and on the pearl.
- No leftover pills. No presence badge row.

---

# Explicitly not this day

| Temptation | Why not |
|---|---|
| Recut FormMaster painter | Paint lock. Twins stay twins |
| Nuke Merge / Over / Mask | `composite = one hull` |
| Engine stamp 3.3 | Lock is 3.0.0; CLI missing |
| Key the 512 / `d` | svg-path-animation PHD |
| Ease plant / comet vx / yaw@T0 | artistic + physical law |
| Bone hierarchy | `samples = handles` already killed |
| Figma variants as embodiments | embeddings, not pictures |
| Second clock for the graph editor | VEC-401 |
| Ping-pong the take | Impulses do not reverse |
| “Also tidy CSS” inside Wave 1 | Dual residual |

---

# Proof ritual (every wave)

```
rest still      height 168.3 ± 0.4, W cleft visible, floor still
120fps          0, 2.6, 5.2, 9, 12, 16, 20  (and the wave’s scrub stills)
console         no throw, no filter spam
one d           grep: body.setAttribute('d'  only in all-script-3.js render
one clock       take path uses organismClock.nowMs, not performance.now
```

If rest does not look like the unify-back pearl, the wave failed even if tests pass.

---

# Breadcrumb queue (workers)

| # | File partition | proofRequired |
|---|---|---|
| 0a | `DaisFirstStageHost.tsx` unmount corpses | host-source-absent-rail |
| 0b | `NodeGraphPage.tsx` drop monitor transport | single-scrub-testid |
| 0c | `catalog.ts` honesty | catalog-test |
| 0d | single autoplay | one-play-log |
| 1a | `GasperRigController.playAuthoredTake` state-of-t | scrub-12-to-4 |
| 1b | `studioClock.scrubStudio` | playhead-identity |
| 1c | loop wrap plant | loop-frame0-plant |
| 2a | `CurveTrack` in/out | hermite-broken-bezier |
| 2b | preset compiler | css-bezier-within-0.02 |
| 2c | Northstar parameter tracks | yaw-face-cadence-arrive |
| 2d | value graph UI | selected-channel-plot |
| 3a | `socketsCompatible` reject | shade-to-contour-throws |
| 3b | mute passthrough | voigt-mute-identity |
| 3c | Couple from wires | disconnect-parks-mix |
| 4a | dopesheet | score-rows-visible |
| 4b | slider undo | ctrl-z-dial |
| 4c | Stage vs Graph | stage-hides-board |

Workers execute one breadcrumb. No peer transcripts. Proof or no advance.

---

# End of turn report (this deposit)

1. **Lead force:** PlanOps. Residual: `score-is-not-a-curve`.
2. **Disk:** this book, `NORTHSTAR-STUDIO.md`, three CanonOps runs, ThinkOps/DesignOps CURRENT.
3. **Who acts next:** human says go → worker Wave 0.
