# CanonOps PHD — explore · keyframe easing curves

Earned under N20 / N335. Engine 3.0.0.
Parent: `vector-studio-ux` (edge-triggered take beats) · `c2-continuity` (C¹ Hermite ≠ C²) · `svg-path-animation` (animate points, never `d`) · `daw-integration` (VEC-401 sole dispatch) · `plant-gated-tau` (τ is not an ease).
Deposit: docs/triforce/canon/runs/2026-08-18T18-17-00-000Z-explore-keyframe-easing-curves

## 1. THE WALL

The user asked for After Effects / Rive / Spine grade easing. Gasper already has **five** easing stacks, **one** real graph-editor (CurveTrack, C¹ Hermite, no independent in/out), and a 20 s Northstar take that is **not a curve at all**. Takes are edge-triggered beat lists: `if t ≥ at && !fired.has(id) then apply(actions)`. There is no interval to ease. A fire has no handles.

What AE/Rive/Spine sell as "easing" is a **keyed scalar** `v(t)` with independent in/out tangents on a value graph. What the Northstar 20 s take has is a **score of impulses** that shove physics. Easing a take beat is a category error. Easing a keyed parameter is a product Gasper already half-owns and then abandoned under four competing string vocabularies.

The wall is not "we need Bezier." The wall is: **nobody named which object is allowed to have a curve.**

## 2. QUESTION

What is a keyframe easing curve on a living 2.5D SVG organism that already has one clock (VEC-401), plant-gated τ, a C¹ hull writer, and edge-triggered takes — and which of the five existing easing stacks is the lawful model?

## 3. COORDINATE SPACES

| Space | Symbol | Unit | Authority |
|---|---|---|---|
| Organism time | `τ_clock = nowMs()` | ms | VEC-401 only |
| Take time | `t = (nowMs() − T0) / 1000` | s | `playAuthoredTake` stamps T0 from the clock |
| Editor playhead | `playheadMs` | ms | `AnimationEditorSession` — a **view** of t |
| Pack time | `t_pack ∈ [0, duration]` | s | `PerformancePackDriver` samples this |
| Channel value | `v` | channel units (deg, 0..1, world units, Hz) | the track |
| Timing unit square | `(x, y) ∈ [0,1]²` | dimensionless | CSS `cubic-bezier` only |
| Value-graph handles | `(Δt, Δv)` | s × channel-units | AE / Rive Cubic Value / the model we need |
| Spatial path | `γ(s) ∈ R²` | content px | motion-path; **not** `#body` |
| Hull samples | `p_i ∈ R²`, `i ∈ Z/512Z` | content px | posed → `_lp` → `closedSpline` |
| Phase | `φ` | rad, 4π-periodic | gait; C∞ leave via `tanh` |
| Viscosity | `τ_plant = 0.02 s`, `τ_swing` | s | plant-gated `_lp`. Not an ease. |

Two different "t"s already exist in the tree: clip `time_ms` (AnimationClip) and take `at` seconds (GasperTake). A third, pack seconds, sits on CurveTrack. They must all be **projections of VEC-401**, never clocks.

## 4. PHYSICAL LAW (what continuity is allowed to mean)

### 4.1 Interpolation classes (time, one scalar)

Let keys `k_i = (t_i, v_i)` with `t` increasing. Segment `i` lives on `s = (t − t_i) / Δt`, `Δt = t_{i+1} − t_i`.

| Class | Formula | C at knots | Who uses it |
|---|---|---|---|
| Hold / step | `v(t) = v_i` for `t ∈ [t_i, t_{i+1})` | C⁻¹ (jump) | CurveTrack `stepped`; Rive Hold; AE Hold; blocking packs |
| Linear | `v = (1−s) v_i + s v_{i+1}` | C⁰ | CurveTrack `linear`; Rive Linear; mechanical rails |
| Named power ease | `v = (1−e(s)) v_i + e(s) v_{i+1}` where `e` is `t²`, `t³`, `smoothstep`, GSAP `powerN.*` | C⁰ only (unless both ends flat) | `applyEasing`, `easeBeat`, FormMaster `easeBehavior`, GSAP play |
| CSS cubic-bezier | `e(s) = B_y(B_x⁻¹(s))`, P0=(0,0), P3=(1,1), x1,x2 ∈ [0,1] | C⁰ on the **value**; the **timing** is C¹ in the unit square | W3C; not live in Gasper |
| Cubic Hermite | `p(s) = h00 v0 + h10 Δt m0 + h01 v1 + h11 Δt m1` | C¹ iff `m_in(k) = m_out(k)` | **CurveTrack — live** |
| Independent-tangent Hermite | same, but `m_out(k_i)` ≠ `m_in(k_i)` allowed | C⁰; C¹ only if author matches them | AE value graph; Rive Cubic Value; **not live** |
| Catmull–Rom auto | `m_i = (v_{i+1} − v_{i−1}) / (t_{i+1} − t_{i−1})` | C¹ | CurveTrack `spline-auto`; Fritsch–Carlson clamp |
| Quintic minimum-jerk | `10s³ − 15s⁴ + 6s⁵` | C² in time (v=v̇=v̈=0 at ends) | `quinticMinimumJerk` — **breath / gather**, not keys |
| Periodic cubic spline | solve banded `M = γ̈` | C² | **not live**; illegal on the W (c2-continuity PHD) |

Hermite basis (the live evaluator):

```
h00 =  2s³ − 3s² + 1
h10 =    s³ − 2s² + s
h01 = −2s³ + 3s²
h11 =    s³ −  s²
```

`m` **is velocity** in channel-units / second. That is the AE "speed graph." CurveTrack already exposes `evaluateCurveTrackDerivative`. The speed graph is not a second model.

### 4.2 CSS cubic-bezier is not AE

W3C: `cubic-bezier(x1, y1, x2, y2)` with P0=(0,0), P3=(1,1), x ∈ [0,1] so `B_x` is invertible. Evaluation is a **timing function** `e: [0,1]→ℝ` then `v(t) = v0 + (v1−v0)·e(s)`.

This cannot express:

- independent in/out **in value space** (one curve for the whole segment, not per-key)
- a C¹ join across keys of different amplitudes (the unit square forgets |Δv|)
- a hold that is not `e(s)=0`
- overshoot that is not `y > 1` or `y < 0` (W3C allows y outside [0,1]; that is CurveTrack `overshoot`)

CSS bezier is a **preset compiler into Hermite**, not the store format.

Conversion (one segment, CSS → Hermite), first-order match at the ends:

```
m_out = (3 y1 / 3 x1) · (Δv / Δt) = (y1 / x1) · (Δv / Δt)     if x1 > ε
m_in  = (3 (1−y2) / 3 (1−x2)) · (Δv / Δt) = ((1−y2)/(1−x2)) · (Δv / Δt)
```

The interior of a CSS ease-in-out is **not** a single Hermite segment (CSS is degree-3 in the unit-square parameter, Hermite is degree-3 in s). They agree at ends and first derivatives; they disagree in the belly. That is fine for presets. It is not fine as the runtime.

### 4.3 AE / Rive / Spine — what "grade" actually is

**After Effects.** Two graphs, one key:

- *Value graph*: v vs t. Incoming handle `(influence_in, speed_in)`, outgoing `(influence_out, speed_out)`. Influence ∈ (0, 100%] is the temporal width of the handle as a fraction of the segment. Speed is `|dv/dt|`. Incoming and outgoing are **independent**. Continuous Bezier (AE "auto-Bezier") forces them colinear — that is C¹. Broken Bezier is C⁰ with a corner in the value graph — that is the artistic "hit."
- *Speed graph*: `|v̇|(t)`. Same handles, different view. Not a second store.
- *Spatial Bezier*: a path `γ(u)` in composition space, **separate** from temporal interpolation. Temporal easing walks the path; the path's curvature is not the ease.

**Rive.** Hold / Linear / Cubic / Cubic Value.

- Cubic = CSS-like unit-square ease (two handles on a timing curve).
- Cubic Value = AE value-graph handles, X and Y stored, **overshoot legal**. This is the grade the user named.

**Spine.** Per-key curve stored as four floats `(cx1, cy1, cx2, cy2)` on the **unit square of the segment** (same family as CSS). Stepped / linear / bezier. No independent in/out in value space. Motion-path bones are a different channel.

**GSAP.** Named strings (`power2.inOut`, `back.out`). A timing function, not handles. Live on `playCanonicalClip`. Scrub path (`applyEasing`) **approximates** the same names and already diverges (`power1.inOut` in evaluate.ts is not the same polynomial GSAP uses).

### 4.4 Motion-path easing ≠ property easing

| | Property ease | Motion-path ease |
|---|---|---|
| Store | `v(t)` on one float | `γ(s)` in R² plus `s = e(t)` |
| Handle | in/out on the value graph | spatial handles on the path, **plus** a temporal ease |
| Lawful on Gasper | yes, on legal channels | **no on `#body`** (svg-path-animation PHD: animate the 512, serialize to `d`) |
| Lawful elsewhere | — | take *world* pose is physics-owned; a motion path that writes `world_x/y` while WorldPhysicsDriver is armed is a second writer |

A "walk arc" is not a motion-path Bezier. Gait is `φ` → leave/plant via `tanh`. The arc is physical. Keying a cubic through COM samples would fight the inverted pendulum.

### 4.5 Why "easing a take beat" ≠ "easing a keyed parameter"

A take beat is:

```
fire(id, at, t, fn) {
  if (fired.has(id) || t < at) return;
  fired.add(id);
  fn();   // heading / launchComet / expression / walkEnable / …
}
```

It is a **Heaviside step** on the action set. The object that changes is physics state, which is **not a function of t**. Seeking to t=12 does not reconstruct the comet that launched at t=9.2. Easing the step would mean one of three different products, none of which is "put a Bezier on the beat":

1. **Delay the fire** (ease the *when*). Still a step. Still unrestorable on scrub-back.
2. **Ramp the payload** (ease `cadenceHz`, `driveGain`, `yaw`, `expression mix` from previous to next). That is a keyed parameter. Use CurveTrack.
3. **Replace the fire with a state-of-t** (`active(t) = beats whose [at, until) contains t`). Required for backward scrub. Still not an ease — it is a change of *evaluation law*.

Disney/Pixar slow-in-slow-out is (2) applied to an authored extreme. It is an **artistic spacing law**: more drawings near the pose, fewer in the middle. It is not C², it is not τ, and it does not apply to an impulse.

### 4.6 Disney SISO is artistic. C² is physical. Do not mix them.

| | Slow-in / slow-out (Thomas & Johnston 1981) | C² continuity (Farin; c2-continuity PHD) |
|---|---|---|
| Object | drawings between two extremes | `γ̈` of a curve |
| Statement | accelerate out of a pose, decelerate into the next | second derivative matches at the knot |
| Discrete test | more frames near keys | Laplacian matches |
| Legal break | a hold (zero drawings of change) is the point | the W cleft (θ≈0.54) **must** break C² |
| Live Gasper | `flat-clamped` Hermite, quintic gather, named `power*.inOut` | `closedSpline` is C¹ Catmull–Rom, **not C²** |

Minimum-jerk (`quinticMinimumJerk`) is the physical cousin: v=v̇=v̈=0 at both ends. It is already the breath and the three-beat gather. It is the right ease for **arrivals that physics should not own** (expression onset, silhouette mix, yaw settle). It is the wrong ease for a plant (the plant is a lawful C⁰ in time — first-step snap, plant-gated-tau PHD).

Plant-gated τ **is** the organism's ease for the hull. `τ_i = viscoTau + w·(0.02 − viscoTau)`, `w = _plantArtW`. If a CurveTrack also eases `stretch` / `walkEnable` / a handle weight during stance, two low-pass filters fight and the plant smears. That is the failure named in §8.

## 5. ARTISTIC LAW

- Slow-in-slow-out on **keyed parameters**. Not on hull samples. Not on plant τ. Not on the fire itself.
- Holds are events (Doctrine 5, PerformancePack). A hold is `stepped`, not a flat cubic that still breathes through `_lp`.
- Overshoot is authored (`overshoot` tangent or y>1 on a Cubic Value handle). It is never an accident of Fritsch–Carlson failing.
- Blocking first: every curve performance already ships a `*.blocking.json` with every tangent forced to `stepped`. That review gate stays. Easing is polish on a beat sheet that already reads.
- The W stays a W. No C²-smoothing of the cleft in the name of "nicer ease."
- Face is a hard Dirichlet on the hull (c2-continuity). Face **energy** (0..1) is a legal keyed channel. Face **vertices** are not.
- Opening head-shake was an eased yaw on take start. Comment in `playAuthoredTake`: "Do not ease yaw on take start." Snaps of heading at beat.at are legal. Ramps of heading between windows are legal as a keyed `yaw` channel. Both at once are a dual.

## 6. FAMILIES — what exists, live or dead

Inventoried 2026-08-18 against `/workspace/gasper-studio-live`.

### 6.1 LIVE — the organism's time and the 20 s take

| Object | Path | What it is | Easing? |
|---|---|---|---|
| VEC-401 | `clock/GasperOrganismClock.ts` | Sole dispatcher | n/a |
| GSAP bridge | `clock/GasperGsapClockBridge.ts` | `gsap.updateRoot(frame.timeMs/1000)`, ticker slept | slaves GSAP; does not author curves |
| `studioClock` | `gasper-studio/src/dais-first/studioClock.ts` | `t = nowMs() − T0`; pause/resume/scrub | **no second clock** (wave 2026-08-18) |
| `GasperTake` | `takes/GasperTake.ts` | `{ at, actions[] }` | **none**. Edge-triggered |
| `NORTHSTAR_TWENTY_TAKE` | `takes/NorthstarTwentyTake.ts` | 20 s, 10 beats (strut-go…loop) | **none** |
| `playAuthoredTake` | `GasperRigController.ts:1962` | `fired = Set`; `fire` once when `t ≥ at` | **none**. Physics is the interpolation |
| `buildNorthstarTwentyClip` | `takes/northstarTwentyClip.ts` | AnimationClip with `tracks: []`, markers only | dead as a curve; live as a shelf label |
| Plant-gated τ | FormMaster `_lp` | `τ_plant = 0.02 s` | **physical**, not artistic |
| `closedSpline` | FormMaster | C¹ CR-Bézier, τ=1/6, sole `d` writer | spatial, not temporal |

### 6.2 LIVE — the actual graph editor (and nobody put it on the 20 s take)

| Object | Path | Model | Status |
|---|---|---|---|
| `CurveTrack` | `curves/CurveTrack.ts` | Cubic Hermite. Keys `{ t, v, out, weight }`. `out ∈ {stepped, linear, spline-auto, flat-clamped, overshoot}`. Fritsch–Carlson clamp. Derivative = velocity | **LIVE**, tested, C¹ |
| `PerformancePack` | `curves/PerformancePack.ts` | Multi-channel CurveTracks + beat sheet + segments `authored \| physics` | **LIVE** compiler, fail-closed |
| `PerformancePackDriver` | `curves/PerformancePackDriver.ts` | Clock subscriber priority **26** (physics is 25). Samples `(pack, t)`. Yields world pose in `physics` segments | **LIVE** |
| Craft packs | `curves/packs/s2-bounce.json`, `s4-comet.json` + blocking twins | Graph-editor session as data | **LIVE** on the craft rail; **not** the Northstar 20 s |
| `FaceBeats` | `curves/FaceBeats.ts` | AU recipes → scalar `face` CurveTrack (linear tangents at breakpoints) | **LIVE** as a compiler onto CurveTrack |
| LifePacks | `behavior/LifePacks.ts` | PerformancePacks for idle life | **LIVE** |

CurveTrack is the AE-grade **kernel**. It is missing only independent in/out (`out` is the only stored tangent character; `m1` is inferred from the *next* key's `out`). That is the one lawful extension.

### 6.3 LIVE but the wrong product — named-string easing on form clips

| Object | Path | Model | Status |
|---|---|---|---|
| `ANIMATION_EASINGS` | `shared/src/gasper-animation/types.ts` | `linear`, `power1.*`, `power2.*`, `back.out` | live enum |
| `applyEasing` | `shared/src/gasper-animation/evaluate.ts` | polynomial approx for **scrub** | live; **≠ GSAP** |
| `evaluateClipAt` | same | lerp after `applyEasing(rawU, fromKf.easing)` | C⁰ |
| `playCanonicalClip` | `GasperRigController.ts:3454` | GSAP `ease: fromKf.easing \|\| "power2.inOut"` per segment | live for morphology clips |
| `set_keyframe_easing` | `shared/src/gasper-animation/commands.ts:901` | writes the string | live MCP / v2 |
| `VALID_EASINGS` (v2) | `shared/src/gasper-animation/v2/types.ts` | adds `power3.inOut`, `sine.inOut`; **drops** `back.out` | **diverges** from `ANIMATION_EASINGS` |
| Eight-state `BEAT_EASINGS` | `eight-state-loop/beat-sequence.ts` | power1/2/3 + `back.out(1.2)` + `quintic` | live for eight-state; **disabled** on Northstar 20 s (`eightStateLoop: false`) |
| `easeBeat` | same | own polynomials | live |
| FormMaster `easeBehavior` | `assets/all-script-3.js` | `linear` / `soft` (smoothstep) / cubic in-out | live for morphs |

Four string lists. None have handles. None are C¹ across keys. The play path and the scrub path already disagree.

### 6.4 LIVE as transport, DEAD as a curve editor

| Object | Path | What it has | What it does not |
|---|---|---|---|
| `AnimationEditorSession` | `animation-editor/AnimationEditorSession.ts` | scrub / play / pause / interrupt / loop; `set_easing` command forwards a **string** | no tangent handles; `EditorTrackRow.keyframes` is `{ id, timeMs, selected }` — **easing is not even in the projection** |
| WorldClass `PlaybackControls` | `studio/worldclass/animate/PlaybackControls.tsx` | dropdown `linear \| easeIn \| easeOut \| easeInOut \| hold` | **fifth** vocabulary; names do not match `ANIMATION_EASINGS` |
| `KeyframeTimelineVisualizer` | `gasper-studio/src/timeline/KeyframeTimelineVisualizer.tsx` | draws smoothstep / 3-beat phases | showcase leftover |
| MCP `set_keyframe_easing` | `gasper-mcp/src/index.ts` | "GSAP-compatible easing" | string only |

`AnimationEditorSession` is the right **session** (one playhead, injected `onPlayheadApply`). It is not a graph editor. Promoting it to handles without promoting the document model just paints a UI on the string.

### 6.5 DEAD / parallel / forbidden

| Object | Path | Verdict |
|---|---|---|
| `GasperAnimateSession` / `AnimateKeyframe` | `GasperAnimateTracks.ts` | `{ t, values }` — **no easing field**. Piecewise linear. Parallel to AnimationClip. Do not grow it |
| Path embedding take | `takes/PathEmbeddingTake.ts` | 512 xy @ 20 Hz, lerp points. Lawful recorder. **Not** an ease. Do not Bezier the `d` |
| SMIL / CSS `d` / WAAPI / Flubber / MorphSVG | — | **forbidden** on `#body` (svg-path-animation PHD) |
| Camera pack channels | `camera_scale/x/y` | **retired** D-0107 |
| `ground_impact` | pack channel | **retired** N40 |
| Periodic C² spline / clothoid as hull writer | — | **not live**; second `d` writer is a dual (c2-continuity) |

### 6.6 Duals to kill

| Lie | Law |
|---|---|
| Easing = physics | Physics is τ, Voigt, ballistics, inverted pendulum. Easing is authored `v(t)` on a legal channel |
| Bezier = take-beat | A beat is an impulse. A Bezier needs an interval and a scalar |
| Graph-editor = organism-clock | The graph is a **view** of `v(t)` at clock time. VEC-401 stays the only ticker (daw-integration, vector-studio-ux) |
| CSS cubic-bezier = AE graph | Unit-square timing function ≠ independent in/out in value space |
| Named string = handles | `power2.inOut` is a preset. Handles are the model |
| C² = slow-in-slow-out | C² is `γ̈` continuous (physical, illegal on the W). SISO is spacing (artistic, legal on keys) |
| Ease the plant | Plant is a lawful C⁰. `τ_plant = 0.02`. Easing it is taffy (plant-gated-tau) |
| Ease yaw on take start | That was the opening head-shake. Snap at bind; key `yaw` if you want a turn |
| One easing enum to rule them | Five enums already. The store is Hermite keys, not a string |
| Key the 512 | Animate embeddings if you must record; never key `d`; never key world pose while physics writes it |
| GSAP play = evaluateClipAt scrub | They already disagree. A second evaluator is a dual. One pure `eval(track, t)` |
| Motion-path of COM = walk | Walk is `φ`. A spatial Bezier on COM fights the pendulum |
| Graph editor needs its own RAF | `PerformancePackDriver` already ticks on the organism clock |

## 7. EXACT DATA MODEL

### 7.1 One key type (extend CurveTrack — do not add a sixth stack)

```
type Interp = "hold" | "linear" | "auto" | "bezier" | "overshoot";

type Handle = {
  dt: number;   // seconds, ≥ 0; temporal width of the handle
  dv: number;   // channel-units; signed. m = dv / max(dt, ε)
};

type Key = {
  t: number;            // seconds, take/pack time (projection of VEC-401)
  value: number;        // channel units
  in: Handle;           // arriving tangent (ignored on the first key)
  out: Handle;          // leaving tangent (ignored on the last key)
  interp: Interp;       // character of the segment LEAVING this key
  weight: number;       // [0, 4]; scales auto / overshoot. Existing field
};
```

Mapping from today's `CurveTangentType`:

| Today `out` | Tomorrow `interp` | Handles |
|---|---|---|
| `stepped` | `hold` | ignored |
| `linear` | `linear` | ignored |
| `spline-auto` | `auto` | computed, Fritsch–Carlson, then written back so the graph can show them |
| `flat-clamped` | `bezier` with `dv=0` | in and/or out flattened |
| `overshoot` | `overshoot` | unclamped auto × weight |

Independent in/out is the AE/Rive grade. Store both. Default `auto` keeps today's C¹. Authoring a broken Bezier (in.dv ≠ out.dv in a way that `m_in ≠ m_out`) is a **legal artistic corner** — a hit, an accent. It is C⁰. It is not a bug.

Broken-Bezier invariant: the **value** is still exact at the key (`p(0)=v0`, `p(1)=v1`). Only `v̇` jumps. That is G⁰ in time, which is what a punch looks like.

### 7.2 Presets compile into handles (they are not a parallel store)

```
ease-in     cubic-bezier(0.42, 0, 1, 1)     →  out.dv/out.dt = 0,           in matches CSS end slope
ease-out    cubic-bezier(0, 0, 0.58, 1)
ease-in-out cubic-bezier(0.42, 0, 0.58, 1)  →  both ends flat-ish
ease        cubic-bezier(0.25, 0.1, 0.25, 1)
hold        interp=hold
linear      interp=linear
quintic     compile to a 2-segment Hermite that matches min-jerk at 5 samples, or keep as a named evaluator ONLY for breath/gather (not keys)
```

UI dropdowns (`easeIn` / `power2.inOut` / `hold`) become **compilers**. After compile, the document stores handles. Re-selecting a preset overwrites handles. Editing a handle dirties the preset label to `custom`.

Kill the four string lists as *authoritative* vocabularies. Keep them as preset names in one table.

### 7.3 WHICH CHANNELS — never / must

**NEVER keyed** (physics or painter writes them; a key is a second writer):

| Channel | Why |
|---|---|
| Hull `p_i`, i=0..511 | posed by handles + gait + `_lp`. Keying samples fights the plant |
| `#body` `d` string | sole writer is `closedSpline` |
| World pose `x,y,z,tilt` **while** `WorldPhysicsDriver` is armed and the pack/take segment is `physics` | PerformancePack already **yields** here (`poseYield: true`) |
| `τ_plant`, `_plantArtW`, `supportSide` | plant-gated-tau. Not a slider, not a key |
| `_lp` state (filtered positions) | integrator memory. Seeking must not write it; it must re-filter from posed |
| Camera `scale/x/y` | retired D-0107 |
| `ground_impact` | retired N40 |
| Contour sample indexes, screen xy | VEC-701: features live in material space |
| GSAP proxy `.value` as source of truth | proxy is a mirror the clock pushes |

**MUST be keyed** if the artist wants AE-grade control (continuous, function of t, legal writers):

| Channel | Unit | Notes |
|---|---|---|
| Take **parameters** that are already numbers: `cadenceHz`, `driveGain`, `compression`, `cruise`, `launchPower`, `intensity` | Hz, 0..1, world-speed | Today they snap at `beat.at`. That snap is why the 20 s reads as a switchboard |
| `yaw` / orbit yaw / heading (between windows) | deg | Windows already exist (`headingWindows`). Promote to a CurveTrack. Snap at bind still legal via `hold` |
| Expression mix / `face` energy | 0..1 | FaceBeats already compile to this. Northstar `expression` actions become keys on `face` + a discrete `id` hold |
| Silhouette mix: `stretch` (Δ height), `squash` (ground_flattening) | living units, volume law `Sx·Sy = 1` | Already a pack channel. Fence: `PHYSICS_CHANNEL_BOUNDS` |
| Node params that are sliders today: gait `hz`, stance `lift`/`advance`, voigt `tau` **rest** (not plant), pearl `depth`, orbit `pitch`, facing `yaw` | each node's unit | Geonodes `NodeParam`. Key the **param**, not the organ's output contour |
| Light / wake emphasis | 0..12 / living-speed | Already pack channels; derived from derivatives if unauthored |
| Shot / zoom / pan **of the take setup** | 1, px | Setup is currently a one-shot. If the 20 s must push in, key it. Do not key the monitor camera during physics (Doctrine 1) |

**MAY be keyed only in `authored` segments, and must yield in `physics` segments** (already the PerformancePack law):

- `world_x`, `world_y`, `world_z`, `tilt` — curve-authority. The 20 s take must **not** grow these while wander/life/comet own the body.

**Discrete (stay beats, do not fake a curve):**

- `boo` on/off, `walkEnable` on/off, `land`, `loop`, `standDownWander`, `launchComet` (the impulse), `expression` **id** (the recipe; the *mix* is the curve), `lifeGoto` / `strut` **targets** (the destination is an impulse; cruise to it is physics).

A launch is a Dirac. You may ease **gatherSeconds** and **silhouette stretch into the gather**. You may not ease the velocity kick.

## 8. IMPLEMENTATION SPEC (no second clock)

Explore only this deposit. Next implement, if asked, is one cut:

### 8.1 Clock law (physical, already written — do not touch)

```
VEC-401 ──► subscribers, priority order
              10  gsap-root          (bridge; ticker asleep)
              25  world-physics
              26  performance-pack   (sample CurveTracks at t)
              48  take:id            (TODAY: edge-trigger; TOMORROW: state-of-t)
```

- `t = (organismClock.nowMs() − T0) / 1000`.
- Scrub = `T0 = nowMs() − t_ui` (already `studioClock.scrubStudio`).
- Pause = `clock.pause()`.
- `AnimationEditorSession.playheadMs` is a view. `onPlayheadApply` already exists.
- Forbidden: `performance.now()` as playhead, GSAP ticker as playhead, a per-track RAF, a per-ease `setTimeout`.

### 8.2 Cut 1 — state-of-t for take beats (unblocks scrub; still not an ease)

Replace

```
if (fired.has(id) || t < at) return;
fired.add(id); apply(actions);
```

with a pure evaluator:

```
function takeActionsAt(take, t): Action[]
  // heading: last window with until > t, else setup
  // walkEnable / boo / expression id: last beat with at ≤ t
  // strut / runInPlace: active while at ≤ t ≤ sustainUntil
  // launchComet / land / lifeGoto: impulse at at, reconstructed by
  //   RESETTING physics to the bind pose and REPLAYING every impulse
  //   with at ≤ t, in order, then integrating 0→t once
```

Backward seek of a comet is **not** un-apply. It is **replay from bind**. That is the only honest scrub of a hybrid take. Cache the replay at 10 Hz if needed; the cache is a view.

Loop wrap (`beat loop @ 20`): reset bind, clear physics, `T0 = nowMs()`, replay empty. Do not keep the fired set across the wrap — today's `playAuthoredTake` re-entry already does this, and it is why loop "works" only forward.

### 8.3 Cut 2 — CurveTrack grows independent in/out

- Add `in` / `out` handles to `CurveKey`. Keep `out: CurveTangentType` as a **synonym** for one release (`interp`).
- Evaluator: if `interp === "bezier"` use stored `m0 = out.dv/out.dt`, `m1 = next.in.dv/next.in.dt`; else keep today's table.
- `auto` still writes handles so the graph can draw them.
- No new module. No `EasingTrack.ts`. No GSAP CustomEase as source of truth.

### 8.4 Cut 3 — Northstar 20 s grows **parameter** tracks, not pose tracks

Legal first tracks on the 20 s take:

```
yaw            hold 0 → hold 0 @ 5.2 → bezier to −READABLE_THREE_QUARTER @ 5.2+Δ
face           0 → listening-orient mix @ 6.6 (quintic onset < 1 s) → 0 @ 8.8
cadenceHz      0 → 2.6 @ 2.618 (hold) → 0 @ 5.15
driveGain      0 → 0.85 @ 2.618 → 0 @ 5.15
stretch        gather into comet @ 9.2 (authored, volume law)
```

`launchComet` stays an impulse. `lifeGoto` stays an impulse. Physics still writes world pose.

### 8.5 Cut 4 — one evaluator, two views

```
evalChannel(track, t) → { value, derivative }     // already evaluateCurveTrack*
```

Graph editor = plot of that function. Dopesheet = keys. Transport = `studioClock`. MCP `set_keyframe_easing("power2.inOut")` = compile preset → write handles.

Deprecate `applyEasing` + `playCanonicalClip`'s per-segment GSAP as the **morphology** path's long-term evaluator. Morphology clips lower onto CurveTracks (one track per binding id) and sample on the same clock subscriber. GSAP may remain as a paint convenience only if the bridge stays slaved — but the number it paints must equal `evalChannel`.

### 8.6 What this implement does **not** do

- Does not replace `closedSpline`.
- Does not C²-filter the plant.
- Does not key 512 samples for the 20 s take (PathTake remains a recorder, not an editor).
- Does not invent a second clock.
- Does not put Bezier handles on `TakeBeat`.
- Does not revive camera channels.
- Does not merge PerformancePack and GasperTake into one schema this cut. A take **may carry** CurveTracks for parameters. A pack **may carry** a beat sheet. They share `evalChannel` and VEC-401. They do not share world-pose authority.

## 9. INVARIANTS

- One clock. `nowMs()` is the only playhead. T0 is clock time.
- One hull writer. `closedSpline` → `#body`.
- One free-motion writer per segment. Physics **or** curve-authority, never both on `world_*`.
- Evaluation is a pure function of `(tracks, take, bind, t)` after Cut 1+2. The fired Set is gone.
- `eval(track, t)` = `eval(track, t)` (determinism already tested on CurveTrack).
- Keys interpolate **values exactly** at `t_i` (Hermite endpoint exactness, already tested).
- Unit channels (`face`, mixes) stay in [0,1] unless `interp === "overshoot"` and the fence allows it. Compiler fail-closed on unit channels that overshoot without that flag (already `PACK_UNIT_CHANNELS`).
- Volume law on silhouette: `Sx · Sy = 1` (already craft gate).
- `τ_plant = 0.02` is not keyable. Rest τ may be keyed only while `supportSide === 0`.
- Loop wrap restores bind. It does not ease across the seam unless the first and last keys agree (C⁰ at 0 ≡ T).
- Reduced motion collapses exaggeration to 0 / stepped (already pack driver).

## 10. FAILURE MODES

| Failure | Why | Visual |
|---|---|---|
| **Seeking backward** with today's fired Set | Impulses do not un-apply. Comet stays in the air. Expression sticks. `walkEnable` stays 1 | Scrub left of 9.2 still flying. Named in vector-studio-ux residual |
| **Loop wrap** | `fire("loop")` re-enters `playAuthoredTake`; physics may still have leftover velocity if disarm is late | First frame of loop 2 is a slide, not a plant |
| **Plant-gated τ vs an ease** | Keyed `stretch` / `lift` / rest-τ during stance; `_lp` is already easing the plant at 0.02 s | Foot melts, cleft pads, "taffy plant" |
| **Easing the launch** | Bezier on `vx,vy` of `launchComet` | Comet eases off the ground; gather dies |
| **Easing yaw at T0** | Already forbidden in source | Opening head-shake |
| **Two evaluators** | Scrub uses `applyEasing`, play uses GSAP | Handles look right parked, wrong in motion |
| **CSS bezier as store** | Loses independent in/out and |Δv| | Graph editor cannot do a punch |
| **Keying 512 / `d`** | Second writer vs `_lp` + `closedSpline` | W buzzes, Safari snaps, identity dies |
| **Keying world pose during physics** | `poseYield` ignored | Body teleports against the pendulum |
| **C² on the W in the name of SISO** | c2-continuity residual | Cleft becomes a U |
| **Broken Bezier on `face` without a fence** | Independent handles overshoot 0..1 | Face energy > 1, AU recipe clips ugly |
| **Sustain tick `fire(id-tick)` every 0.5 s** | Today's `strut`/`runInPlace` re-files locomotion at 2 Hz | Cruise restamped; gait phase can hitch at the 0.5 s grid |
| **Ping-pong of a take** | AnimationClip has `ping_pong`; takes do not. Reversing impulses is meaningless | Do not offer ping-pong on takes |
| **Weight > 4 / dt = 0** | Already clamped; keep | NaN derivative, spike |

## 11. TESTS

Pure (extend `CurveTrack.test.ts`, no RAF):

- Independent in/out: `m_out(k) = 0`, `m_in(k) = 2` ⇒ value matches, left derivative ~0, right derivative ~2 (broken Bezier is legal).
- Matched handles ⇒ C¹ (existing spline-auto test still passes).
- Preset `ease-in-out` compile ⇒ both end derivatives ~0, midpoint value within 0.02 of CSS reference (Newton solve of `B_x`).
- Overshoot key still exceeds target; unit-channel compile without `overshoot` still fail-closed.
- `eval` determinism across 60 samples (existing).
- Derivative matches finite difference (existing).

Take / clock (extend `studioClock.test.ts`, `WalkBooTwentyAuthority.test.ts`):

- Backward scrub t=12 → t=4: `walkEnable` is 0, no comet provenance, yaw is the 5.2-window value. Replay-from-bind, not un-apply.
- Loop wrap: after `t` crosses 20, bind pose within ε of first-frame pose; fired/replay history empty.
- `playheadMs` after `scrubStudio(3500)` equals 3500 and equals `(nowMs()−T0)` while paused.
- No `performance.now()` in the take playhead path (already a studio-v2 law).

Plant vs ease (headless 120 fps, existing capture idiom):

- Keyed `stretch` during 2.618–5.15 **rejected** or fenced to 0 while `supportSide ≠ 0`. Max θ(y>140) stays ≤ 0.90.
- Keyed rest-τ while planted does not move. Identity: live=0 ⇒ byte-identical pearl.

Visual / review:

- Blocking twin of any new 20 s parameter tracks (all `hold`) still reads as the scored take.
- Spline polish: gather into comet reads as a squash, not a slide; expression onset < 1 s (FaceBeats micro budget).
- Opening 0–2.618: yaw locked, no head-shake, no ease.

## 12. VISUAL CONSEQUENCES

- The 20 s take **stops switching**. Cadence and face *arrive*. The walk still plants (physics), the comet still kicks (impulse), the seat still turns (keyed yaw, not a fire).
- Graph editor shows v(t) and v̇(t) for legal channels. The dopesheet shows take impulses as markers, not as fake keys with handles.
- Backward scrub is honest: the body is where a replay from bind says, not where the last forward pass left it.
- Planted foot stays planted. An ease never melts it.
- The W stays a W. The cubic on a **parameter** may overshoot. The cubic on the **hull** may not grow horns.

## 13. UNCERTAINTY

- Replay-from-bind at 120 fps for a 20 s take on every scrub-frame may be too expensive. A 10 Hz pose cache keyed by `hash(take)+bind+t` is the likely view. Not measured.
- Whether `headingWindows` should die the day `yaw` is a CurveTrack, or remain as a compiler source. Two sources is a dual; one release should pick.
- How far independent in/out should be exposed in MCP. Strings are what MCP has. Compiling presets server-side is enough for agents; handles are a Studio concern.
- Whether morphology `AnimationClip` lowers onto CurveTrack this wave or the next. The dual (GSAP play ≠ applyEasing scrub) is already a bug; the fix can land without the 20 s take.
- Quintic-as-preset: a single Hermite segment cannot be minimum-jerk. Two segments or a named evaluator. Prefer named evaluator **only** for breath/gather, not as a key type.
- LifePack + take + pack on the same clock: priority 26 vs 48. A keyed `face` on the take and a LifePack `face` is two writers. Fence: take owns the channel while a take is bound.

## 14. IMPLEMENTATION (next, not this receipt)

Explore only. Do not recut FormMaster. Do not add a sixth easing module.

1. Keep CurveTrack + PerformancePackDriver + VEC-401. That is the kernel.
2. Next cut: **state-of-t take evaluation** (replay-from-bind). Kills the backward-scrub residual named yesterday.
3. Then: **independent in/out on CurveKey**. Presets compile. Four string lists become one preset table.
4. Then: **parameter tracks on the 20 s take** (`yaw`, `face`, `cadenceHz`, `driveGain`). Impulses stay impulses.
5. Graph UI draws `evalChannel`. `AnimationEditorSession` stays the session. No new clock.
6. Do not key the 512. Do not ease the plant. Do not C² the W.

## 15. CITATIONS

- Thomas & Johnston, *The Illusion of Life*, 1981 — Slow in / slow out is spacing of drawings between extremes, not C² of a spline.
- Farin, *Curves and Surfaces for CAGD* — Cⁿ vs Gⁿ; cubic Hermite; Catmull–Rom is C¹.
- Fritsch & Carlson, 1980 — monotone cubic interpolation; live as CurveTrack clamped-auto.
- Flash & Hogan, 1985 — minimum-jerk; live as `quinticMinimumJerk`.
- W3C CSS Easing Functions — `cubic-bezier(x1,y1,x2,y2)`, P0=(0,0), P3=(1,1), x ∈ [0,1]. Timing function, not value graph.
- Adobe AE Help, "Speed between keyframes" — value graph vs speed graph; independent in/out influence+speed; spatial interpolation is separate.
- Rive docs, Interpolation (Easing) — Hold / Linear / Cubic / Cubic Value. Cubic Value is AE-grade handles with legal overshoot.
- Esoteric Spine — segment stored as unit-square bezier `(cx1,cy1,cx2,cy2)`.
- Catmull & Rom 1974 — live in `closedSpline` as τ=1/6 (spatial, not temporal).
- Canon `c2-continuity` 2026-08-17T14:30 — CurveTrack is C¹ Hermite, not a hull writer; C² everywhere pads the W.
- Canon `svg-path-animation` 2026-08-17T05:22 — animate 512 points; never tween `d`.
- Canon `daw-integration` 2026-08-16T19:40 — VEC-401 sole dispatch; a second ticker is the opening shake.
- Canon `vector-studio-ux` 2026-08-18T18:00 — take beats are edge-triggered; backward scrub does not un-apply.
- Canon `plant-gated-tau` 2026-08-16T16:20 — τ_plant = 0.02 s; not a slider; not an ease.
- GASPER-CRAFT-001 C1 `CurveTrack.ts` — the graph editor as code; tangent types; Hermite; already tested.
- GASPER-CRAFT-001 C1 `PerformancePackDriver.ts` — clock priority 26; pose yield; the lawful transport.
- `GasperTake.ts` / `NorthstarTwentyTake.ts` / `GasperRigController.playAuthoredTake` — the live 20 s score; no easing field.
- `AnimationEditorSession.ts` — live transport; dead curve editor (`set_easing` is a string; projection has no handles).

## 16. THINKOPS

Residual: `keyframe-easing-curves`.

Dual killed: `easing a take beat = AE graph editor`. A beat is an impulse. The graph editor is `v(t)` on a legal channel, sampled from VEC-401. CurveTrack is already that kernel. Independent in/out is the one missing derivative. The 20 s take needs **parameter tracks + state-of-t**, not handles on `fire()`.

Next: state-of-t take replay, then handles on CurveKey, then yaw/face/cadence tracks on Northstar 20 s. Film blocking first.
