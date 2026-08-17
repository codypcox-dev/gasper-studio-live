# Instrument Studio — ThinkOps + DesignOps handoff

phase: handoff
gate: Approve (owner)
status: not executed as a redesign
updated: 2026-08-16

This is a Handoff. It is not an Approve. It is not a chat-PASS.

Hardened this turn: atlas chapters recede other organs (never hide).
Factory + user baseline stay. Northstar stays a take. One physics writer.

---

## What Disney and Pixar actually do

They do not put every slider on one rail.

**Pixar Presto** (replaced Marionette; Academy Technical Achievement 2018; Disney Animation adopted it before *Zootopia 2*):

- Built for traditional animators, not TD dashboards.
- Work **in scene context** on full-resolution characters with sophisticated rigs.
- Departments share one scene through **USD layers**: model, look, rig, anim, layout compose. Nobody erases anybody.
- Iterate fast. Pixar: the ingredient of high-quality digital art is the ability to iterate quickly and often.

**USD (open from Pixar):**

- Layers stack like Photoshop. Stronger layer overrides, never destroys the weaker.
- References assemble assets. Variants switch costumes/forms non-destructively.
- Parallel work is the product, not a feature.

**Disney Animation pipeline** (public process + dRig):

- Separate **Modeling → Look → Rigging → Layout → Animation → Simulation**.
- Rigging (dRig) is artist-friendly reuse: thousands of controls, but the **animator sees a picker**, not the graph.
- Layout owns camera and staging. Animation owns performance. Those are different jobs.
- Dailies: stepped blocking first, then spline, then polish. Director reviews *intent*, not knobs.

**Industry authoring UX that works:**

| Pattern | Who | What it is | Gasper analog |
|---|---|---|---|
| Pose / clip library | Pixar, DreamWorks, Maya Studio Library, Blender, UE5 | Save a pose or a take, apply from any start | Canonical baseline + `gasper.take.v1` |
| Picker face | Feature-animation rigs | Click the part, not a 40-slider list | Atlas chapters + expression/eight-state |
| Session vs Arrangement | Ableton Live | Clip grid to play; timeline to score | Take shelf vs clip timeline |
| Blocking → spline → polish | Every feature studio | Stepped intent, then flow, then micro | Take beats → physics fill → gait/face |
| Department isolation | Presto / USD | Recede other crafts | `data-focus` on the rail |
| Camera is layout | Disney Layout | Monitor does not act | Doctrine 1 / walk-review |
| Dailies | All of them | Prove on the picture | CanonOps, not chat-PASS |

**What they do not do:**

- One inspector with every parameter of the show.
- Morph the character to “make the walk work.”
- Let the camera finish the animation.
- Treat a screenshot as a dailies gate.

---

## What Gasper already has (keep)

- One instrument: `WorldPhysicsDriver`.
- One canonical body: Wispwalker factory baseline. User save. Morph = embodiment.
- One score format: portable takes, relative to live COM.
- One shelf clip: Northstar 20s.
- One teaching map: Home / Shape / Walk / Fly / Act / Shot / Proof.
- One proof organ: CanonOps.

Do not rebuild Maya. Do not dump more sliders.

---

## The instrument law (ThinkOps)

| Term | Means | Forbidden as |
|---|---|---|
| Home | Named baseline you restore | A costume you lose on morph |
| Shape | FormMaster sculpt | A second walk |
| Take | Relative intent score | A `fire()` script on origin |
| Session | Play clips from now | A timeline you must rewind |
| Arrangement | The scored 20s / document clips | A hidden GSAP tween |
| Shot | Monitor / layout | A walk ruler |
| Prove | Measured packet | Chat-PASS |
| Focus | Recede other organs | Hide a dial |

Duals already killed: `chat-PASS=acceptance`, `slider-dump=authoring`.
Next dual to kill: `Maya-clone=instrument`.

---

## Comprehensive next step (this order)

### 0. Approve this handoff

Owner says Approve. Then Work. Not before.

### 1. Instrument chrome (DesignOps crystal) — first Work

Make the rail feel like Ableton + a picker, not a preference pane.

- **Session strip** under the stage: Home / Northstar 20s / empty slots. Click plays. Loop is clip loop.
- **Arrangement** is the existing timeline, only when a take is open. Empty tracks stay empty (no fake form keys).
- **Picker**, not sliders-first:
  - Face: eight-state pads (already exist) become the Act picker.
  - Body: click crown / cleft / feet on a silhouette to reveal that sculpt group.
  - Walk: Walk / Stand / 20s / Loop only. Gait numbers are readouts.
- Keep **All** as the mixer. Focus remains the default.

Hardened already: chapter focus recedes, never hides.

### 2. Library (Pixar pose library)

- Home library: Factory + Mine + later named sculpts. Thumb the live dais, not an icon font.
- Take library: Northstar 20s first. Next takes compile to the same shelf.
- Apply is bind + play. Never snap world `x` to a desktop number.

### 3. Layers (USD, small)

Four stacked layers on the document, visible in the atlas readout:

1. **Form** — baseline + live sculpt  
2. **Life** — expression / eight-state  
3. **Motion** — takes filed to physics  
4. **Shot** — walk-review / operate  

Stronger layer overrides. Weaker layer remains. Morph does not rewrite Home.

### 4. Blocking grammar (Disney dailies)

Author in this order, and the UI should force the order:

1. **Block** the take (beats, stills, headings).  
2. **Play** through physics (spline is the kernel).  
3. **Polish** face and craft *after* travel reads.  
4. **Dailies** = CanonOps on the residual, then picture.

The rail should say which pass you are in. Do not offer Walk Accent during Block.

### 5. Layout vs Animation split (Doctrine 1)

- Shot chapter owns Fit / Walk-review / hold.  
- Walk chapter cannot change viewBox, zoom law, or `unitsPerContentPx`.  
- Those stay readouts forever.

### 6. Harden the existing artifact (do this even if 1–5 wait)

- Baseline persist round-trips through `.gasper` save/open.  
- Take shelf lists `take-northstar-20s` in Session even when the timeline is empty of form keys.  
- Atlas readout is live (class, writer, take id, shot) — not a string constant.  
- No second walk writer. No GSAP on travel. No shoes.

---

## What not to do next

- A new engine.
- A floating “AI copilot” that writes `x`.
- Auto-morph so every take “just works” on a ball.
- Recutting Froude / viewBox / kernel-8 to make a chew look like a step.
- Replacing FormMaster with a generic inspector.

---

## Success picture

You sit down. Home is the pearl you recognize. You sculpt, Save, morph, Restore. You pick a take from the session strip. He starts from wherever he is. The shot stays put. The atlas names the organ you are touching. Proof is a packet, not a compliment.

That is an instrument.
