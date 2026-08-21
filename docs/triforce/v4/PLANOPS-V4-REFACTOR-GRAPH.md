# PlanOps — Gasper v4 Refactor Graph

**Plan:** `GASPER-V4-PLAN-001`  
**Architect:** ChatGPT  
**Execution pool:** GrokForce under TriForce 4.0

## Critical path

```text
P0 Canon + regression harness
   ├── P1 Volume kernel ───────────┬── P4 Embodiments ──────┐
   │                               ├── P5 Studio authoring ──┤
   │                               └── P3 Render/look ───────┤
   └── P2 Vector face rig ─────────┬── P4 Embodiments        │
                                   ├── P5 Studio authoring    │
                                   └── P6 Animation runtime ──┤
P1 + P2 + P3 + P6 ────────────────────────────────────────────┤
P4 + P5 ──────────────────────────────────────────────────────┤
                                                            P7 Integration / evidence
                                                                     ↓
                                                            P8 20s 3D take
                                                                     ↓
                                                            P9 Owner acceptance
```

## P0 — Canon + regression harness

**Goal:** freeze what must be recognized before code changes.

Deliverables:
- v6.5.5 reference capture pack;
- canonical Wispwalker 512 contour fixture;
- face-path/fixture extraction fixture;
- front/45/profile comparison harness;
- current pressed-mint baseline capture;
- objective topology/component checks;
- one command to run the v4 visual regression suite.

Write scope: tests, fixtures, evidence tooling. No renderer mutation.

Gate: reproducible red baseline that identifies the current failure.

## P1 — Volume kernel

**Goal:** replace 25×40-as-body with the v4 silhouette-constrained bilateral closed surface.

Deliverables:
- deterministic constrained triangulation of canonical interior;
- front/back bilateral manifold;
- regional depth field;
- stable semantic attachments;
- orbit from the actual mesh;
- front contour exactness;
- 45/profile authoring parameters;
- Wispwalker first pass.

Forbidden:
- generic sphere/capsule/metaball body;
- polar one-pole inflation;
- convex/scanline hull as body;
- second unrelated mesh.

Gate: Wispwalker full orbit is one mass and no longer reads as mint/candy.

## P2 — Vector face rig

**Goal:** move legacy semantic Bézier face into a true 3D surface-bound vector system.

Deliverables:
- extracted legacy eye/mouth semantic functions/fixtures;
- FaceRig2D data model;
- surface face patch;
- Bézier → 3D adaptive tessellation;
- blink/gaze/mouth/expression runtime;
- real occlusion at yaw;
- face editing API.

Gate: front identity matches reference and 3/4 motion does not float or rasterize.

## P3 — Render / Look

**Goal:** dark-pearl material and internal energy read the actual v4 geometry.

Deliverables:
- physically coherent normals;
- key/fill/spec travel;
- dark-pearl layered material;
- internal energy volume/surface coupling;
- contact shadow;
- no shading trick that hides bad geometry.

Gate: turntable light response proves volume instead of faking it.

## P4 — Embodiment projections

**Goal:** eight forms as projections over one semantic organism.

Order:
1. Wispwalker
2. Presence
3. Low Orbit
4. Comet
5. Lantern
6. Halo
7. Dormant Orbit
8. Singularity

Each projection must define volume/depth, rig, face, energy, contact, material, and dynamics changes without mesh identity swap.

Gate: atlas + transition in/out for all eight.

## P5 — Studio authoring

**Goal:** expose the v4 authorities with simple, truthful tools.

Deliverables:
- semantic Form handles;
- front/45/profile/back view presets;
- cage/weight/relief edit mode;
- vector Face workspace;
- hierarchy/selection synchronization;
- timeline/curve editor minimum;
- compare views;
- undo/redo/serialization;
- semantic MCP command bindings.

Gate: normal authoring never touches raw render mesh unless advanced edit mode is explicit.

## P6 — Animation runtime

**Goal:** living 3D Gasper with GSAP semantic orchestration.

Deliverables:
- additive track mixer;
- interruption from current evaluated values;
- blink/gaze/breath/energy/relief/settle;
- planted Wispwalker gait with COM transfer;
- embodiment/expression transitions;
- deterministic scrubbing.

Gate: required continuous proof sequence passes.

## P7 — Integration / evidence

**Goal:** one runtime, one body, one face rig, one control truth.

Tasks:
- delete/disable normal-runtime v3 body writers;
- resolve shared state ownership;
- run all tests;
- full orbit film;
- compare against v6.5.5 and current baseline;
- performance profile;
- inspect console/network/errors;
- record residuals.

Gate: no authority duplication.

## P8 — Rebuild the 20s scene in 3D

Use the accepted v4 rig only. Recreate the existing vector-side story beats as editable clips/keyframes. No pre-rendered substitution.

Gate: scene reads as the same character and stronger than the vector version spatially.

## P9 — Owner acceptance

Owner reviews:
- Wispwalker identity;
- face identity;
- 360° form;
- gait/weight;
- eight embodiments;
- 20s scene;
- Studio usability.

No final promotion without explicit visual acceptance.

## Parallelization

Wave A, concurrent after P0 contracts freeze:
- P1 Volume
- P2 Face
- P3 Look research/prototype (read-only dependency on P1 API)

Wave B:
- P6 Animation against P1/P2 contracts
- P5 Studio shell against P1/P2 APIs
- P4 embodiment authored projections

Wave C:
- P7 integration/evidence
- P8 scene
- P9 owner review

## First next-run target

Do not attempt all eight forms in the first worker sprint. The next run is successful if it returns an unmistakably improved **Wispwalker v4** with:

- exact canonical front;
- credible authored profile;
- full 360° closed-surface orbit;
- legacy-derived vector face on the surface;
- blink + one expression;
- moving key/spec;
- before/after capture against the pressed-mint baseline.
