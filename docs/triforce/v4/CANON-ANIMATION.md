# CANON — Gasper v4 Animation & Motion

**Id:** `GASPER-V4-ANIMATION-001`

## Motion law

Gasper does not animate by moving a picture of a body. The body, face, material, energy, and dynamics are coordinated tracks over one semantic organism.

GSAP remains the continuous stage executor for semantic animation tracks. Geometry/render evaluators consume numeric state; React does not own per-frame animation.

## Evaluation order

```text
Base authored organism
→ Embodiment projection
→ Expression fixture / semantic intent
→ Primary animation / take
→ Additive living tracks
→ Manual authoring preview
→ Transient microstate
→ Identity + contact + topology constraints
→ Volume / face / relief / optics evaluation
→ Final render pose
```

## Additive tracks

At minimum:

- breathing / volume idle;
- blink scheduler;
- gaze and saccade;
- face microvariation;
- internal-energy pulse and lag;
- relief drift;
- secondary wobble / settle;
- contact compression;
- recovery / refractory settle;
- gait load transfer;
- embodiment morph;
- expression transition;
- optional speech/viseme extension.

## Interruption

Every transition begins from current evaluated values.

Preserve where applicable:

- current position/value;
- current direction;
- approximate velocity;
- active additive tracks;
- energy lag;
- contact state;
- embodiment provenance;
- dormant memory provenance.

No canonical-pose snap is allowed during interruption.

## Wispwalker locomotion

A step is not body translation with decorative feet.

Required phase logic:

1. planted side accepts load;
2. COM shifts toward support;
3. free lobe unloads/compresses less;
4. free lobe lifts/clears;
5. body yaws/leans through true 3/4 volume;
6. free lobe travels and plants;
7. load transfers;
8. prior support releases;
9. shell settles with viscoelastic lag.

The silhouette may deform, but identity mass must remain continuous.

## Viscosity

τ/viscoelastic lag delays and settles deformation. It does not create body volume and may not be used as a hidden puff/inflation writer.

## Eight-state emotional proof

The v4 rig must preserve the meaningful difference among:

- neutral-settled;
- listening-receive;
- thinking-knit;
- blocked-strain;
- recovering;
- pleased-soft;
- plus the remaining accepted fixture families/microstates.

States must visibly alter more than eye/mouth values. They should change tension, gaze, blink cadence, energy, silhouette pressure, momentum, timing, and settling character where appropriate.

## 20-second take

The existing 20-second vector-side scene is a required v4 milestone after Wispwalker form/face acceptance.

Rebuild it as a semantic 3D take:

- same story beats and timing intent;
- true planted weight transfer;
- true orbit/3D orientation;
- vector face remains surface-bound;
- material/light reacts to actual geometry;
- no pre-rendered sprite or alternate body;
- keyframes and clips are editable in Studio.

## Timeline model

Animation data must support:

- playhead and in/out;
- hierarchical tracks;
- clips;
- keyframes;
- curve editor;
- dope sheet;
- easing;
- additive lanes;
- mute/solo/lock;
- interruption markers;
- embodiment/expression markers;
- deterministic playback;
- selected-key inspector.

## Performance

Per-frame hot path is local numeric evaluation and GPU/typed-buffer update.

Forbidden in the per-frame path:

- MCP;
- REST;
- browser automation;
- React geometry rerender;
- document serialization;
- Git or filesystem work.

## Acceptance

PASS requires one continuous capture showing living idle, blink, gaze, expression transition, interruption, gait/weight transfer, orbit, material response, and settle without visible identity discontinuity.
