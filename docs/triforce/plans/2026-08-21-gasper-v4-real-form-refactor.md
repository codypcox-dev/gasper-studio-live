# PlanOps — GASPER-V4-REAL-001 Refactor

**Date:** 2026-08-21  
**Authority:** `docs/triforce/v4/CANON-V4.md` + `docs/triforce/NORTHSTAR-V4-REAL-GASPER.md`  
**Execution mode:** Tri-Force 4.0 + GrokForce divide-and-conquer  
**Architect:** ChatGPT / top-level integration authority  
**Primary worker:** fresh interactive Grok TUI in Co-Pilot mode  
**Target runtime:** Gasper Studio on port 8080

---

## Mission

Replace the malformed pseudo-3D Wispwalker with a real watertight 3D Gasper body constrained by the historical vector rig, then bind and animate the vector facial rig on that body.

Do not spend another cycle polishing the current crushed/candy geometry.

---

## Starting evidence

Preserve and learn from these existing facts:

- v6.5.5 defines the eight canonical embodiments as reversible reorganizations of the same identity;
- historical view rig uses authored key-view evidence and is not full-rotation authoritative;
- current v3 geometry corpus records self-crossing W offset rings, open-strip sewing, ring-24 discontinuities, polar-sine foot depth disagreement, and duplicate cage buffers;
- current Studio screenshot visually confirms the resulting body is not recognizable Wispwalker;
- latest v3 work did produce useful components: live body controls, relief field, GSAP orchestration, authored state, orbit plumbing, lighting/material work, topology instrumentation, and vWebGL experiments.

The plan preserves the useful components and replaces the failed body authority.

---

## Phase 0 — Freeze and inventory

### P0.1 Create recovery tag/branch

- record current main HEAD;
- do not delete existing v3 experiments;
- create v4 integration branch/worktrees;
- keep runtime launchable.

### P0.2 Build authority inventory

Classify each current module as:

- KEEP — reusable without semantic change;
- ADAPT — useful but must bind to v4 body;
- REFERENCE — historical oracle only;
- RETIRE — failed body-authority path;
- UNKNOWN — inspect before writing.

Minimum modules to classify:

- FormMaster / historical renderer;
- `liveGridXYZ` / 25×40 field;
- `envelopeXYZ`;
- 512 contour path;
- 360 lattice;
- 5-node body rig;
- orbit/yaw/pitch writers;
- body material/lighting;
- GSAP orchestrator;
- behavior/fixture runtime;
- Studio Look/Form controls;
- current vWebGL renderer.

Deliverable: `docs/triforce/v4/AUTHORITY-INVENTORY.md`.

---

## Phase 1 — Reference oracle extraction

### P1.1 Extract old-rig embodiment data

For each of the eight forms record:

- profile parameters;
- face parameters;
- material/energy defaults;
- ground/contact semantics;
- behavior adaptation values.

### P1.2 Capture key views

Wispwalker first:

- 0° front;
- 22.5°;
- 45°;
- mirrored negative views where appropriate;
- canonical neutral expression;
- canonical review lighting.

Capture vector silhouette samples, face anchors, bounding metrics, and screenshots.

### P1.3 Build `ReferenceOracle`

Provide deterministic APIs such as:

```ts
getEmbodimentProfile(id)
getCanonicalSilhouette(id, view)
getFaceFrame(id, view)
getReferenceMetrics(id, view)
```

No rendering implementation may mutate these values.

Gate: **G0**.

---

## Phase 2 — Build the v4 body topology

### P2.1 Author shared template topology

Create `GasperVolumeMesh` as a real closed surface.

Requirements:

- one connected watertight manifold;
- stable indices;
- subdivision friendly;
- dense enough around Wispwalker cleft/feet and face patch;
- explicit backside topology;
- no front zipper seam;
- semantic vertex groups/regions.

Do not reuse the 25×40 relief connectivity as the manifold solely to preserve old doctrine.

### P2.2 Fit Wispwalker

Create a mesh-fitting tool/process using:

- canonical silhouette losses at available views;
- landmark constraints;
- smoothness;
- volume/thickness priors;
- self-intersection penalty;
- ground contact;
- symmetry where appropriate.

The solver may seed the form, but final promotion requires Studio visual correction and review.

### P2.3 Add deterministic mesh validation

- manifold edge check;
- connected components = 1;
- signed volume > 0;
- normal consistency;
- self-intersection scan;
- stable topology hash;
- canonical camera projection metrics.

Gate: **G1** after visual/orbit proof.

---

## Phase 3 — Body renderer + Studio authoring

### P3.1 Renderer

Use current vWebGL/Three path if serviceable, otherwise replace it cleanly.

The renderer consumes `GasperVolumeMesh`; it does not own identity.

Required:

- perspective and orthographic cameras;
- canonical review light rig;
- smooth normals/subdivision path;
- dark-pearl material;
- depth buffer available to face projection/occlusion;
- deterministic canonical capture mode.

### P3.2 Body authoring tools

Minimum v4 authoring set:

- silhouette sculpt;
- depth sculpt;
- grab / smooth / inflate / pinch;
- soft select;
- symmetry;
- semantic Wispwalker form controls;
- macro 5-node rig controls;
- undo/redo;
- save/open.

### P3.3 Relief reattachment

Bind the 25×40 field onto the v4 body with a stable UV/barycentric map.

The field must remain editable and semantic, but must not close the body.

Gate: **G2**.

---

## Phase 4 — Vector face surface binding

### P4.1 Extract face semantics

Preserve existing semantic values for:

- eye opening/width/tilt/lift;
- gaze;
- mouth open/curve/round/pinch/skew;
- cheek/tension data;
- face scale and offsets;
- expression fixtures and microstates.

### P4.2 Implement `FaceSurfaceBinder`

Contract:

```text
semantic vector face
  -> local face coordinates
  -> current 3D face patch
  -> projected vector control points
  -> SVG paths
```

The face remains vector at display resolution.

### P4.3 Depth-aware occlusion

As body rotates:

- visible portions remain correctly attached;
- back-facing/occluded face geometry hides;
- no HUD drift;
- no raster texture fallback.

### P4.4 GSAP animation

Wire:

- blink scheduler;
- gaze/saccades;
- expression fixtures;
- microstates;
- interruption-aware transitions;
- embodiment face adaptation.

Gate: **G3**.

---

## Phase 5 — Wispwalker body motion

Rebind existing useful motion systems onto v4 body controls.

Required:

- breathing/volume idle;
- viscoelastic secondary settle;
- plant/step controls;
- posture shifts;
- body/face coordination;
- relief/energy lag;
- interruptible behavior transitions.

No per-frame topology mutation.

Gate: **G4**.

---

## Phase 6 — Eight canonical embodiments

For each form create `EmbodimentVolumeProfile` and canonical captures.

Parallelize by family only after Wispwalker topology/authoring contracts are stable.

Suggested grouping:

- Family A: Presence + Wispwalker;
- Family B: Comet + Lantern;
- Family C: Halo + Low Orbit;
- Family D: Dormant Orbit + Singularity.

Each form returns:

- accepted mesh/morph target;
- silhouette metrics;
- depth profile;
- face frame;
- material/energy defaults;
- orbit capture;
- transition tests.

Gate: **G5**.

---

## Phase 7 — Recreate the 20-second reference scene

Rebuild the historical 20s vector scene using:

- v4 3D body;
- vector face binder;
- same semantic timing;
- canonical cameras;
- matched/improved material;
- authored keyframes/tweens.

Gate: **G6**.

---

## Integration rules

- no worker writes directly to main;
- one writer per file/scope;
- worker branches/worktrees only;
- each lane returns exact changed files, tests, captures, remaining blockers;
- integration owner resolves cross-lane contracts;
- 8080 refresh only after an integrated build passes smoke tests;
- no visual acceptance claim without screenshots/orbit capture;
- do not rewrite reference targets to fit implementation.

---

## Required proof packet per geometry landing

- current commit SHA;
- build/test commands;
- manifold report;
- topology hash;
- canonical front screenshot;
- 22.5° screenshot;
- 45° screenshot;
- side screenshot;
- back screenshot;
- full 360° turntable video/GIF/frames;
- silhouette error metrics;
- console/page errors;
- user-review status.

---

## First execution target

The first meaningful GrokForce run is successful only if it produces a materially improved **Wispwalker body candidate** in the live Studio, not another architecture-only response.

Minimum next-run visible result:

1. historical Wispwalker reference extraction complete;
2. new v4 watertight template integrated;
3. Wispwalker fitted to front + authored key-view evidence;
4. 360 orbit renders one coherent body;
5. current crushed-candy body path is bypassed in the v4 preview;
6. a proof packet is returned for architect review.
