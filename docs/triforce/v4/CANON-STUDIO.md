# CANON — Gasper Studio v4 Authoring UX

**Id:** `GASPER-V4-STUDIO-001`

## Product principle

Gasper Studio is a specialized character-authoring environment, not a reduced Blender clone and not a dashboard around hidden code. It borrows the strongest interaction patterns from Blender, Rive, Cavalry, Figma, and modern animation tools while exposing only controls that are meaningful for Gasper.

## Progressive disclosure

Default experience: semantic, direct, fast.

Advanced experience: topology, weights, curves, graph, diagnostics.

No advanced panel is allowed to contaminate the default authoring surface unless the user explicitly opens it.

## Core workspaces

### Form
- silhouette/profile/depth authoring;
- semantic body handles;
- 25×40 cage/relief editing;
- structural rig visibility;
- front/45/profile/back views;
- live beauty preview.

### Face
- semantic expression controls;
- 2D vector control view + 3D projected preview;
- blink/gaze tools;
- fixture browser;
- advanced Bézier editing;
- face patch/anchor inspection.

### Animate
- timeline;
- keyframes;
- clips;
- curve editor/dope sheet;
- embodiment and expression markers;
- interruption/additive lanes;
- 20s scene authoring.

### Behavior
- semantic state graph;
- fixtures/microstates;
- appraisal/intent inputs;
- route trace;
- dormant memory;
- runtime preview.

### Look / Validate
- material;
- internal energy;
- lighting;
- relief;
- topology/attachment diagnostics;
- compare/difference;
- performance/regression proof.

## One selection model

Hierarchy:

```text
Gasper
├─ Volume
│  ├─ Canonical contour
│  ├─ Structural lattice
│  ├─ Semantic cage 25×40
│  └─ Depth/profile fields
├─ Rig
│  ├─ Crown
│  ├─ Torso
│  ├─ Cleft/Crotch
│  ├─ Plant L
│  └─ Plant R
├─ Face
│  ├─ Eye L
│  ├─ Eye R
│  ├─ Mouth
│  ├─ Face patch
│  └─ Tension/relief
├─ Interior Energy
├─ Material / Optics
└─ Dynamics
```

Selection synchronizes viewport overlays, inspector, timeline tracks, graph focus, and validation readout.

## Direct manipulation

Normal mode uses semantic handles:

- width / height;
- crown fullness/depth;
- mid-body depth;
- lower-body fullness;
- plant depth/spread/contact;
- cleft bridge;
- face patch position/orientation;
- material/key-light direction.

Advanced form mode can isolate a single cage/mesh control sample. Soft selection is explicit and visually indicated.

## Truthful controls

Every visible control must be:

- bound to one semantic parameter;
- immediately visible in the viewport;
- undoable/redoable;
- serializable;
- keyframeable when meaningful;
- inspectable for authored/current/final value;
- labeled when constrained or clamped.

Dead controls are removed, not left as costume UI.

## Timeline

The timeline is a real editor, not a transport strip.

Minimum v4:

- playhead;
- in/out;
- track hierarchy;
- clips;
- keyframes;
- easing presets;
- graph curves;
- dope sheet;
- mute/solo/lock;
- additive track display;
- embodiment/expression event markers;
- deterministic scrubbing.

## Compare

Compare must render actual differences:

- v6.5.5 reference vs v4;
- canonical front vs current front;
- accepted profile vs current profile;
- embodiment A vs B;
- authored vs runtime;
- before vs after transaction.

Modes: split, wipe, onion, silhouette, flicker, approximate heatmap.

## Camera

Camera state is presentation, not identity.

- orbit camera and character orientation are distinct values;
- fit uses evaluated body bounds;
- front/profile shortcuts are exact;
- no camera transform may masquerade as body yaw;
- authoring views can isolate face/topology without mutating the document.

## MCP / LLM control

LLM/MCP tooling operates on semantic commands, never raw per-frame vertices.

Examples:

- `set_embodiment("wispwalker")`
- `set_depth_region("crown", 0.72)`
- `set_expression("thinking-knit")`
- `keyframe("rig.plantL.load", t, value)`
- `compare("canonical-front", "current")`

All remote/LLM actions are transactional, logged, undoable, and constrained by the same bindings as local UI.

## UX acceptance

A new user should be able to:

1. select Wispwalker;
2. orbit him;
3. adjust profile depth;
4. edit an eye/mouth expression;
5. keyframe it;
6. play a short take;
7. undo;
8. compare to canon;

without opening a graph or raw vertex table.
