# GASPER SEMANTIC PERFORMANCE NORTHSTAR

**Status:** ACTIVE — foundation and first vertical slice open.

**Version:** 2026-08-13 · `GASPER-SEMANTIC-PERFORMANCE-001` / N153–N158

**Supersedes:** N120's implication that matching a phrase to bounded Tuning Lab
parameters constitutes semantic understanding. N120's typed controls,
reversibility, telemetry, and proof routes remain useful infrastructure.

**Preserves:** the N152 source and proof baseline, `WorldPhysicsDriver` motion
authority, organism-clock time authority, vector topology, 5179 review route,
reduced-motion collapse, safety ref, and separate owner acceptance.

## North Star sentence

Gasper understands a human performance request or reference video, explains
what he believes it means, converts observed mechanics into a form-valid and
physics-authoritative performance score, performs it recognizably in the
correct embodiment, and improves it through review without inventing anatomy,
measurements, or certainty.

## Product promise

Say what Gasper should do or show him a video. See what he understood. Watch
him perform a physically truthful Gasper-native translation. Correct it in
seconds. Save an accepted result as reusable behavior.

## The current truth

- Gasper already has a substantial physics, gait, facing, expression,
  embodiment, parameter, timeline, proof, and live-control substrate.
- The existing `gasper.performance.intent.v1` and
  `gasper.performance.ir.v1` contracts are a provisional semantic foundation,
  but the compiler body does not yet encode locomotor actions, contacts,
  embodiment capabilities, or video observations.
- The current Tuning Lab compiler recognizes a few phrases and emits fixed
  values. It does not know named choreography or infer arbitrary intent.
- Wispwalker has physics-derived support expression and continuous structural
  foot-root lobes. It does not yet expose a complete action-capable control
  rig or form capability graph.
- Monocular video can provide useful pose, timing, contact, trajectory, and
  style evidence. It cannot, by itself, establish absolute mass, force,
  friction, depth, floor scale, or camera calibration.

## Governing architecture

```text
Natural-language request ─┐
                          ├─> Performance Brief ──────────────┐
Linked/local video ─> measured observation ─> Motion Score ──┤
                                                             v
                                                   Form capability gate
                                                             v
                                               Physics-intent retarget plan
                                                             v
                                               WorldPhysicsDriver + rig
                                                             v
                                            Preview / compare / critique
                                                             v
                                            accepted behavior library
```

The LLM or vision model proposes meaning at authoring time. Typed schemas,
capability checks, and physics validation decide what may execute. No model
runs in the frame loop.

## Evidence classes

Every value entering the system carries one of these classes:

1. **Measured** — source bytes, timestamps, decoded frame rate, tracked image
   landmarks, pixel displacement, landmark visibility, and user calibration.
2. **Derived** — timestamp-aware velocity/acceleration, contact likelihood,
   gait phase, normalized trajectory, support polygon, pose extremes, cadence,
   and beat boundaries computed from measured tracks.
3. **Inferred** — action name, intent, attitude, motion quality, likely weight
   transfer, causal interpretation, and correspondence between human mechanics
   and Gasper affordances. Inferred values require confidence and rationale.
4. **Calibrated** — floor plane, subject scale, body mass, inertia, gravity,
   friction, restitution, drag, stiffness, damping, actuator limits, and form
   deformation limits. These come from the environment/form contract or an
   explicit user calibration, never silently from monocular pixels.
5. **Simulated** — the forces, constraints, contacts, trajectories, and
   deformations produced by Gasper's runtime authorities.
6. **Accepted** — an owner-reviewed performance artifact promoted into the
   canonical behavior library.

No inferred value may be presented as measured. No measured human coordinate
may be applied directly as a Gasper transform.

## Reference video contract

### Supported sources

- Local file chosen by the owner.
- Direct `http` or `https` media URL.
- Page links through explicit provider adapters. A provider must resolve to a
  measured local media artifact before analysis; page scraping is never hidden
  inside the motion compiler.
- Every source records canonical URL or local source identity, content hash,
  media metadata, selected time range, crop, subject selection, and resolver
  provenance.

### Safe ingestion

- URL resolution rejects credentials, unsupported schemes, private/link-local
  network targets, redirect escapes, oversized responses, and unbounded
  duration before media bytes enter the session.
- Analysis operates on an owner-selected segment. The initial vertical slice
  targets short performances and preserves original timestamps.
- `ffprobe` is the media-measurement authority. Decoding and transcode steps
  are explicit, cancellable, and receipted.
- Source video remains reference material. Training artifacts store hashes and
  derived data; source bytes are not committed by default.

### Observation pipeline

1. Probe media and normalize orientation/timestamps without altering cadence.
2. Select subject, crop, floor line, scale hint, and analysis interval.
3. Decode timestamped frames at a rate selected from source cadence and motion
   bandwidth; do not assume 30fps when the source contains higher-frequency
   footwork.
4. Run pose/segmentation inference off the UI thread.
5. Retain raw landmarks, world-landmark estimates, visibility, and model
   identity. Never smooth away the source track.
6. Build a confidence-weighted cleaned track beside the raw track.
7. Derive normalized root path, facing, pose extremes, velocities,
   accelerations, foot trajectories, contact likelihood, support changes,
   cadence, rhythm, holds, reversals, vertical compression, rotation, and
   follow-through.
8. Segment the action into semantic beats using measured change points plus a
   vision/LLM proposal. Conflicts remain visible for correction.
9. Emit a versioned `MotionScore` with provenance and uncertainty.

Google's current Pose Landmarker is a practical first observation backend: it
provides 33 human landmarks, normalized image coordinates, approximate world
coordinates, visibility, optional segmentation, and timestamped video mode.
Its synchronous video API must run in a Worker so analysis never blocks Gasper
Studio. The backend remains replaceable behind a typed interface.

## Motion Score

The score is form-independent. It describes what the performance does, not how
Wispwalker's contour is keyed.

Each beat contains:

- start/end time and source frame range;
- action primitive and semantic purpose;
- travel direction, facing, root-path goal, and rhythm;
- support/contact requirements and exchange ordering;
- pose extreme and silhouette intent;
- motion qualities such as weight, flow, energy, directness, restraint,
  confidence, playfulness, and urgency;
- anticipation, commitment, release, follow-through, and settle roles;
- recognition-critical mechanics that must survive retargeting;
- source evidence, confidence, ambiguity, and user corrections.

The score is deterministic after acceptance: the same score, form profile,
environment profile, seed, and compiler version produce the same compiled
plan bytes.

## Embodiment capability contract

Each form publishes a versioned profile with:

- locomotion classes: grounded, sliding, hopping, floating, flying, orbiting;
- support/contact affordances and independent support count;
- controllable anchors and semantic degrees of freedom;
- facing and depth capabilities;
- expression and attention channels;
- mass, inertia, collision, drag, friction, restitution, stiffness, damping,
  and actuator envelopes with units and provenance;
- topology/deformation limits and forbidden anatomy;
- supported action primitives and required preconditions;
- retarget policies for unsupported source mechanics.

The compiler has exactly three responses to a requested mechanic:

1. **Exact capability** — preserve the mechanic directly.
2. **Declared stylization** — preserve its recognition-critical function using
   an explicitly named Gasper-native equivalent.
3. **Refusal / rig-extension request** — the form cannot express the mechanic
   without lying or breaking identity.

## Wispwalker performance rig

Wispwalker is the first complete capability profile. It remains one continuous
vector organism, not a humanoid skeleton. Its semantic controls are:

- left/right support-root plant, load, release, slide, and pivot;
- center-of-mass goal, velocity, and support-relative projection;
- body line of action, lean, lateral shear, and bounded axial twist;
- crown and upper-mass counterweight;
- lower-shell redistribution and contour tension;
- facing slice, gaze, face beat, and expression energy;
- contact patch, traction request, shadow commitment, impact, and settle;
- overlap/follow-through channels driven by simulated mass and damping.

The runtime derives actual forces and deformation from these goals. A Motion
Score never writes `x`, `y`, scale, or arbitrary contour points directly.

## Physics-variable foundation

The tuning system is reorganized around physically meaningful, versioned
profiles rather than an unstructured slider pile.

### Environment-owned variables

- world gravity vector and scale;
- floor plane and bounds;
- surface friction and restitution;
- air density / drag field and wind;
- collision geometry and composition envelope.

### Form-owned variables

- mass and moment-of-inertia approximation;
- collision/support geometry;
- contact patch limits;
- elastic and viscous deformation response;
- force/torque and angular-velocity envelopes;
- shape-preserving strain and volume limits.

### Performance-owned goals

- desired path and facing;
- contact schedule and support ordering;
- desired cadence and phase relationships;
- pose extremes and line of action;
- timing, anticipation, commitment, follow-through, and recovery;
- motion-quality modifiers.

Performance goals may be optimized, time-warped, or amplitude-scaled to fit
the physical envelope. Physical constants do not change merely to imitate a
reference clip.

Every exposed variable must show: name, meaning, unit, current value, safe
range, owner, source/provenance, affected observables, and whether a change
requires recompilation or takes effect live.

## Semantic intelligence law

- A language or vision model may identify a named movement, research unfamiliar
  terminology, propose beat segmentation, identify recognition-critical
  mechanics, and explain ambiguities.
- Model output must conform to a closed schema and cite source observations or
  external definitions. Unsupported free text cannot execute.
- The compiler validates embodiment capabilities, constraints, units, and
  authority before producing a plan.
- Unknown movement names do not map to convenient presets. The system either
  learns their mechanics from a reference/source or states that it lacks the
  knowledge.
- LLM/VLM calls occur only during authoring, analysis, critique, or repair.
  Playback and physics remain local, deterministic, and model-independent.

## Training library

A training session stores:

- source receipt and content hash;
- raw and cleaned observation tracks;
- derived mechanics and semantic score;
- form capability and physics-profile versions;
- compiled retarget plan and deterministic content hash;
- user edits, A/B variants, and critic notes;
- machine gates, videos, and acceptance class.

Promotion states are `experiment`, `machine_valid`, `architect_reviewed`,
`owner_accepted`, and `rejected`. Only `owner_accepted` artifacts are eligible
for canonical retrieval examples or a future fine-tuning dataset. The first
training mechanism is an audited demonstration library and retrieval compiler,
not an uninspectable online-learning loop.

## Studio experience

The primary workspace is a performance cockpit:

1. Paste prompt or video link / choose file.
2. Select the subject and useful interval.
3. Inspect the source beside pose/contact/trajectory overlays.
4. Read and edit "What Gasper understood."
5. Inspect the form capability mapping and any declared stylizations.
6. Preview the compiled behavior immediately.
7. Compare A/B, adjust semantic or physical variables, undo, and recapture.
8. Accept or reject the behavior into the training library.

Low-level Tuning Lab controls move into an expert drawer. Editing a parameter
must update telemetry without blocking playback. Analysis runs in a background
worker with progress and cancellation. The visible stage retains a 60fps
interactive budget; deterministic proof playback and capture remain 120Hz.

## Acceptance ladder

### Foundation gate

- All new contracts validate and hash deterministically.
- Wispwalker capability and physics profiles name every authority and unit.
- Direct application of source landmarks/transforms is structurally impossible.
- Unsupported or low-confidence observations fail visibly rather than
  producing fabricated mechanics.

### Video-analysis gate

- A local file and an allowed linked source produce identical analysis bytes
  when the media bytes and settings are identical.
- Golden annotated clips test timing, contact ordering, direction, cadence,
  pose extremes, holds, and reversals. Thresholds are fixed before candidate
  promotion and reported per feature.
- Camera cuts, multiple subjects, occlusion, low confidence, unknown scale,
  and missing floor calibration produce explicit diagnostics.

### Retarget gate

- The same accepted Motion Score compiles deterministically for a pinned form
  and environment profile.
- Wispwalker contact plans never create a third support, teleport the body, or
  bypass collision.
- Unsupported human mechanics yield declared stylization or refusal.
- Reduced motion collapses all new secondary performance channels.

### Product gate

- Prompt and video routes converge on the same Motion Score and retarget path.
- The Studio remains responsive while analysis runs.
- A source clip, overlays, inferred score, Gasper preview, A/B variants, and
  acceptance state are reviewable in one workspace.
- MCP exposes inspect, import, analyze, compile, preview, compare, capture, and
  promote operations through the same browser-owned session.

### Visual gate

- The first forcing functions are a recognizable Wispwalker dance/footwork
  translation and a semantic acting scene: sneak, notice, freeze, recover.
- Each ships with source-side mechanics overlays, exact-rate Gasper capture,
  chronological review, machine receipt, architect verdict, and separate owner
  verdict.

## Worker law

Sol owns this Northstar, schema arbitration, integration, visual critique, and
claims. Flash workers receive bounded non-overlapping scopes. A model response
is a proposal until its files, tests, and proofs are independently verified.
No worker may modify Grimoire, the safety ref, unrelated archived research, or
the active 5179 server process.

## Grounding receipts

- `g-9b568c5c28f0781968493ca2` — video motion becomes pose/action evidence;
  physics owns locomotion and secondary follow-through remains simulated.
- `g-da7938217871b843174adf2c` — form affordances gate atomic actions and
  readable pose extremes.

## Active plan

`docs/triforce/plans/2026-08-13-gasper-video-to-behavior-foundation.md`
