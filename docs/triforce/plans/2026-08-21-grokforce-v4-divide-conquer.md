# GrokForce Graph — GASPER-V4-REAL-001

**Mode:** TURBO / divide-and-conquer  
**Primary controller:** one fresh interactive Grok TUI in Co-Pilot mode  
**Architect above controller:** ChatGPT  
**Authority:** `CANON-V4.md`, `NORTHSTAR-V4-REAL-GASPER.md`, `2026-08-21-gasper-v4-real-form-refactor.md`

---

## Graph

```text
ARCHITECT
   │
   ▼
GROK PRIMARY / INTEGRATION CONTROLLER
   │
   ├── L0 Reference Oracle
   │      └── extracts v6.5.5 embodiments + key-view silhouettes + face anchors
   │
   ├── L1 Body Topology
   │      └── builds watertight shared GasperVolumeMesh + validators
   │
   ├── L2 Wispwalker Fit
   │      └── multi-view constrained fit + semantic landmarks + depth profile
   │
   ├── L3 Renderer / Studio
   │      └── v4 WebGL body preview + cameras + sculpt hooks + relief attachment contract
   │
   ├── L4 Vector Face
   │      └── FaceSurfaceBinder + SVG projection + GSAP face runtime
   │
   └── L5 Adversarial Validation
          └── geometry audit + silhouette diffs + orbit proof + regression guard

GATES
G0 Reference -> G1 Body -> G2 Studio -> G3 Face -> G4 Motion -> G5 Eight Forms -> G6 20s Scene
```

---

## Controller prompt

The primary Grok TUI should receive this exact mission:

> You are the GrokForce integration controller for GASPER-V4-REAL-001. Read `docs/triforce/v4/CANON-V4.md`, `docs/triforce/NORTHSTAR-V4-REAL-GASPER.md`, and `docs/triforce/plans/2026-08-21-gasper-v4-real-form-refactor.md` completely before writing code. The current crushed/candy Wispwalker is rejected. Do not patch the old 25×40-as-final-manifold construction. Divide the work across independent workers with one writer per scope. Your first visible landing must be a real watertight Wispwalker candidate constrained by the old v6.5.5 front/22.5/45 evidence and shown in a full orbit. Preserve the 512 contour as front identity oracle, the 25×40 field as relief, the structural rig, GSAP semantics, and vector face data. WebGL is permitted as the 3D body renderer in v4. Do not rasterize the face. Do not claim success without visual proof. Integrate only through gates and keep port 8080 refreshed after accepted integrations.

---

## Worker L0 — Reference Oracle

### Ownership

Reference extraction only. No body renderer writes.

### Tasks

- inspect historical v6.5.5 rig;
- extract all eight `FORM_PROFILES` and embodiment semantic data;
- capture Wispwalker 0°, 22.5°, 45° silhouettes/canonical screenshots;
- extract face anchor and expression semantics;
- build deterministic `ReferenceOracle` data/API;
- hash reference artifacts.

### Deliverables

- `docs/triforce/v4/REFERENCE-ORACLE.md`;
- machine-readable reference data;
- canonical capture folder;
- tests proving immutable reference values.

### Gate

G0.

---

## Worker L1 — Body Topology

### Ownership

New v4 mesh kernel and geometry validators. No UI and no face runtime.

### Tasks

- define `GasperVolumeMesh` data contract;
- build a watertight shared base topology;
- semantic regions: crown, torso, cleft, footL, footR, facePatch, back;
- stable indices/topology hash;
- manifold/normal/volume/self-intersection validation;
- subdivision/render buffer adapter.

### Prohibitions

- do not make the 25×40 relief connectivity the body topology by default;
- do not derive final depth from the front 512 alone;
- do not edit reference targets.

### Deliverables

- mesh kernel;
- validators;
- neutral test mesh;
- geometry report.

---

## Worker L2 — Wispwalker Fit

### Ownership

Wispwalker mesh target and fitting solver only.

### Dependencies

L0 reference data + L1 mesh contract.

### Tasks

- define Wispwalker landmarks;
- fit mesh against front / 22.5 / 45 reference silhouettes;
- regularize smoothness and volume;
- author depth priors for torso, cleft, feet, face plane, back;
- enforce ground contact;
- generate candidate morph target;
- provide editable semantic depth controls.

### Deliverables

- Wispwalker v4 candidate;
- silhouette metrics;
- depth profile;
- full orbit capture;
- residual list.

### Gate

G1 only after L5 validates and Architect reviews.

---

## Worker L3 — Renderer / Studio

### Ownership

v4 body renderer integration and authoring viewport. No reference data mutation.

### Tasks

- integrate `GasperVolumeMesh` into current 3D stage;
- bypass old crushed-candy body path under explicit v4 feature switch;
- canonical perspective/ortho cameras;
- front/3/4/side/back views;
- orbit/pan/dolly;
- canonical light/material preset;
- silhouette/depth sculpt hooks;
- macro rig bridge;
- 25×40 relief attachment interface;
- deterministic capture mode;
- keep existing app operational.

### Deliverables

- v4 preview in Studio;
- screenshot/turntable capture path;
- authoring controls with undo-safe transactions.

### Gate

G2.

---

## Worker L4 — Vector Face

### Ownership

Vector face binding and facial animation only.

### Tasks

- inventory current eye/mouth/path semantics;
- implement `FaceSurfaceBinder`;
- bind local vector coordinates to body face patch;
- project body-bound points to SVG paths;
- depth-aware visibility/occlusion;
- preserve GSAP expression/microstate runtime;
- blink/gaze/saccade/expression proof;
- prove no raster face texture is canonical.

### Deliverables

- face binder contract/tests;
- live Wispwalker vector face demo;
- orbit/deformation attachment capture.

### Gate

G3.

---

## Worker L5 — Adversarial Validation

### Ownership

Read-only inspection/tests except dedicated validation files.

### Tasks

Attack every landing for:

- nonmanifold edges;
- disconnected components;
- self intersections;
- inverted normals;
- silhouette mismatch;
- front/quarter/side discontinuity;
- card/slab/candy failure;
- face drift;
- face rasterization;
- duplicate body authority;
- 25×40 topology re-entering as final body;
- state/renderer mismatch;
- user-facing 8080 stale build.

### Deliverables

- PASS/FAIL matrix;
- metrics;
- visual comparison captures;
- explicit rejection reasons.

L5 may veto G1-G6.

---

## Parallelism schedule

### Wave A — immediate

Run L0 and L1 concurrently.

L3 may inspect current renderer in read-only mode and prepare adapter interfaces, but may not bind to an unstable body contract yet.

### Wave B — after L0/L1 contracts stabilize

Run L2 and L3 concurrently against frozen interfaces.

L5 validates continuously.

### Wave C — after a recognizable Wispwalker exists

Run L4 while L2 performs visual correction and L3 finishes authoring controls.

### Wave D — after G3

Split embodiment authoring by family across 4 workers using the same topology/profile contract.

### Wave E

Motion rebinding + 20s scene recreation.

---

## Merge discipline

Suggested worktrees/branches:

- `grok/v4-reference-oracle`
- `grok/v4-body-topology`
- `grok/v4-wisp-fit`
- `grok/v4-renderer-studio`
- `grok/v4-vector-face`
- `grok/v4-validation`

The primary Grok controller alone merges worker work into the v4 integration branch after gate checks.

No worker force-pushes another worker’s branch.

---

## Fast-fail rules

Immediately stop/rewrite a lane if:

- its body is not one watertight manifold;
- it tries to preserve v3 body topology solely because of a historical lock;
- it uses bbox width as proof of a good 3D form;
- it cannot show a 360 orbit;
- it changes the old reference to reduce error;
- it rasterizes the face;
- it produces a new independent body path instead of migrating to one authority;
- it leaves the live Studio stale after integration.

---

## First turbo-run success criteria

Before the primary Grok controller reports success, it must have:

- completed G0 reference extraction;
- landed L1 body topology + validators;
- produced an L2 Wispwalker candidate;
- rendered that candidate through L3 in Studio;
- provided a full 360 orbit and canonical-view stills;
- passed L5 manifold/component/basic silhouette gates;
- refreshed the user-visible 8080 runtime to the integrated candidate;
- clearly marked the candidate `REVIEWED`, not `ACCEPTED_CANON`, until human approval.
