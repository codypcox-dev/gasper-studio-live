# GrokForce Dispatch — Gasper v4

**Pool:** GrokForce  
**Governor:** TriForce 4.0  
**Architect / pilot:** ChatGPT  
**Owner visual authority:** Cody

## Worker rule

Every worker reads, in order:

1. `docs/triforce/v4/README.md`
2. `docs/triforce/v4/NORTHSTAR-GASPER-V4.md`
3. the canon file for its lane
4. `docs/triforce/v4/PLANOPS-V4-REFACTOR-GRAPH.md`
5. this dispatch

Workers do not rewrite canon. They may file a contradiction report to the architect.

## GF-0 — Regression / Reference Worker

**Write:** tests/fixtures/evidence only.  
**Do not write:** live geometry/rendering.

Mission:
- extract Wispwalker front reference from v6.5.5;
- extract vector eye/mouth/fixture semantics;
- capture current pressed-mint baseline;
- build front/45/90/full-orbit regression tooling;
- produce one red baseline report.

Return: commit, commands, evidence paths, exact failure metrics.

## GF-1 — Volume Kernel Worker

**Write:** new v4 volume module + direct tests only.  
**Do not write:** face, Studio, animation, material except minimal debug normal shader.

Mission:
- implement constrained silhouette-domain triangulation;
- implement front/back bilateral closed manifold;
- implement named regional depth field;
- preserve canonical front contour;
- implement full 3D orbit of that mesh;
- add surface attachment query API;
- return Wispwalker debug/beauty turntable.

Hard rejects:
- sphere/capsule/metaball replacement;
- one-pole polar inflation;
- 25×40 as render topology;
- convex/scanline hull body.

## GF-2 — Vector Face Worker

**Write:** v4 face model/evaluator/tests.  
**Do not write:** body solver.

Mission:
- port semantic `eyePath` / `mouthPath` behavior into clean module;
- port fixtures/parameter schema;
- build FaceRig2D;
- build FacePatch3D contract against mocked/real surface attachment API;
- adaptive Bézier tessellation to 3D geometry;
- blink + gaze/saccade + mouth + one expression;
- test no raster dependency.

## GF-3 — Look / Material Worker

**Write:** v4 material/lighting/energy modules.  
**Do not write:** body topology.

Mission:
- dark-pearl shell on v4 normals;
- key/fill/spec travel under actual rotation;
- internal energy coupling;
- contact shadow;
- diagnostics that reveal geometry rather than hide it.

## GF-4 — Animation Worker

**Write:** v4 semantic mixer / GSAP adapter / motion tests.  
**Do not write:** topology or Studio layout.

Mission:
- additive track mixer;
- current-value interruption;
- breath/blink/gaze/energy/settle;
- planted Wispwalker load transfer;
- deterministic scrub state;
- one continuous proof take.

## GF-5 — Embodiment Worker

Start only after Volume + Face contracts stabilize.

Mission:
- author projections for Presence and Low Orbit first;
- then remaining embodiments in PlanOps order;
- no mesh swap;
- produce atlas and transition tests.

## GF-6 — Studio Worker

Start against frozen semantic APIs.

Mission:
- semantic form/profile handles;
- Face workspace;
- single hierarchy/selection;
- timeline minimum;
- compare views;
- undo/redo + serialized authoring state;
- MCP semantic bindings.

## GF-7 — Integrator / Adversarial Reviewer

Read all lane commits. Do not trust PASS labels.

Mission:
- identify duplicated writers;
- integrate in dependency order;
- remove v3 normal-runtime body authority;
- run all proof gates;
- capture full orbit and motion;
- compare to reference and baseline;
- return ACCEPT / REVISE / BLOCK with exact reason.

## First turbo wave

Run concurrently:

- GF-0 Regression
- GF-1 Volume
- GF-2 Face
- GF-3 Look (API/mock only until GF-1 surface contract lands)

Architect reviews contracts before Wave 2.

## Required worker footer

Every worker response ends with:

```text
LANE:
START SHA:
END SHA:
FILES CHANGED:
TESTS:
RUNTIME PROOF:
VISUAL RESIDUALS:
CONTRACT RISKS:
DECISION: ACCEPT | REVISE | BLOCK
NEXT SAFE HANDOFF:
```
