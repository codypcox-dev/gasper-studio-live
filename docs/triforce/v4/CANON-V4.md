# Gasper Canon v4 — Real 3D Identity Authority

**Status:** PROPOSED-CANON / architect authority for v4 refactor  
**Date:** 2026-08-21  
**Supersedes where conflicting:** Tri-Force 3.x geometry doctrine that equated the 25×40 relief cage with the final closed 3D body, prohibited a WebGL body categorically, or attempted to infer full 3D volume from one front silhouette.  
**Preserves:** v6.5.5 visual identity, eight canonical embodiments, 512 front contour authority, semantic face/emotion system, GSAP orchestration, 25×40 adaptive relief field, 360 structural lattice, identity/material/motion constraints, human visual acceptance.

---

## 1. Prime directive

Gasper must become a **true, continuously deformable 3D organism** whose front and authored key views preserve the approved Gasper identity, while his face remains a **fully vector, semantically animated rig**.

The current crushed / pressed-candy result is not a tuning problem. It is an authority-model problem.

The v3 stack asked one representation to do incompatible jobs:

- the 512 contour is a 2D silhouette oracle;
- the 25×40 field is a surface/relief authoring field;
- the 360 lattice is structural/deformation support;
- the 5-node Y is a macro animation rig;
- then the 25×40 field was also treated as if its ring/sector connectivity were the final closed 3D manifold.

That last step is invalid for a branched W-shaped silhouette such as Wispwalker. The repository already records self-crossing offset isolines, a polar sine that assigns opposite depth signs to the two feet, an open sewn strip, large ring-23→24 jumps, and duplicate cage buffers. v4 stops trying to repair that embedding with more special cases.

---

## 2. First-principles fact: one silhouette does not determine one solid

A front outline constrains the projection of a body. It does **not** uniquely determine depth, back curvature, cross-sections, cleft depth, foot depth, or profile taper.

Therefore:

> **No v4 system may silently infer canonical 3D depth from the front 512 alone and then call that result canon.**

Depth must come from explicit authored evidence:

1. historical authored key views where available;
2. canonical 0° / 22.5° / 45° view silhouettes extracted from the old rig;
3. embodiment-specific depth controls and profile sculpt;
4. smoothness / volume / identity constraints;
5. human visual approval.

The old v6.5.5 rig already declares hand-authored view anchors and bounded authored key-view comparison. Those views are migration evidence, not disposable presentation.

---

## 3. Authority layers

v4 separates authority cleanly.

### A. Identity oracle — 2D vector canon

The protected historical rig is the migration oracle for:

- front silhouette and proportions;
- eight embodiment semantics;
- face placement and scale;
- expression semantics;
- motion timing and interruption behavior;
- material/light read;
- authored key-view comparison.

It is not the final runtime container.

### B. Body authority — `GasperVolumeMesh`

A new **watertight, genus-0, shared-topology manifold** is the canonical 3D body representation for normal embodied forms.

Requirements:

- stable vertex/index topology across compatible embodiment morphs;
- no self-intersections at accepted canonical endpoints;
- subdivision-friendly edge flow;
- enough topology around the lower cleft, feet, face patch, crown, and silhouette extrema;
- one connected closed surface;
- explicit front/side/back anatomical charting;
- a stable face patch and attachment coordinates;
- GPU-friendly morph/skinning path;
- deterministic serialization.

The mesh may be rendered through WebGL/Three or equivalent. **WebGL is no longer prohibited as a body renderer.** The renderer is not canon; the authored mesh and semantic parameters are canon.

### C. Structural authority — rig + deformation cage

The 5-node Y remains a useful macro control rig, but it is no longer mistaken for body topology.

v4 body deformation stack:

1. canonical embodiment morph target;
2. macro control rig / skeletal controls;
3. authored sculpt/cage deltas;
4. behavior deformation;
5. secondary viscoelastic dynamics;
6. relief displacement;
7. identity clamps.

### D. Relief authority — 25×40 field

The 25×40 / 1000-sample field remains first-class, but its role is **surface detail and regional deformation data**, not final manifold connectivity.

It binds onto `GasperVolumeMesh` through UV/barycentric attachment.

The field can drive:

- pressure;
- goose/regional relief;
- skin response;
- local deformation amplitude;
- material/normal response;
- authored semantic regions.

It must not decide where the final body is closed.

### E. Contour authority — 512 front projection

The 512 contour remains the front-view identity oracle and a regression measurement.

At canonical front view the 3D body projection must match the accepted vector silhouette within the v4 acceptance tolerance. The 512 is a constraint/readout, not a 3D topology.

### F. Face authority — vector surface rig

Eyes, mouth, brows/tension geometry, and face accents remain vector paths.

They are attached to the 3D body through a `FaceSurfaceBinder`:

- semantic vector controls produce local 2D Bezier/path geometry;
- path control points bind to a stable face patch in local coordinates;
- those points lift/project through the current 3D body transform;
- the visible result is emitted as SVG/vector geometry every frame or at the necessary update cadence;
- depth/occlusion hides the vector face when it turns behind the body;
- no raster face texture is accepted as the canonical face.

GSAP remains the semantic animation/orchestration authority for face and high-level body weights.

---

## 4. Eight canonical embodiments

The v6.5.5 set remains canonical:

1. Presence
2. Wispwalker
3. Comet Familiar
4. Dormant Singularity
5. Dormant Orbit
6. Halo Crown
7. Lantern Geist
8. Low Orbit

Each v4 embodiment must own an **Embodiment Volume Profile** containing:

- shared-topology body target (or explicitly declared exceptional family target where mathematically necessary);
- front silhouette target;
- 22.5° and 45° key-view targets where historical evidence exists;
- depth/profile parameters;
- face frame and face scale;
- center of mass;
- ground/contact policy;
- material/energy defaults;
- allowed macro-rig ranges;
- identity clamps;
- validation captures.

All embodiments remain reorganizations of one identity, not unrelated character presets.

---

## 5. Wispwalker is the v4 proving ground

Wispwalker is first because its lower W/cleft makes invalid parameterizations fail immediately.

The accepted Wispwalker v4 result must:

- preserve the recognizable historical front W;
- have continuous organic crown/torso/leg/foot volume;
- contain a real lower cleft rather than a torn hole or pinched zipper seam;
- keep both foot roots part of one continuous mass;
- rotate through full orbit without becoming a card, capsule platform, bowl, crown cloud, or two disconnected blobs;
- avoid the current pressed/candy slab read;
- preserve face placement and intelligent creature cadence;
- accept clean rig deformation without topology surgery.

A missing side contour is an **authoring input gap**, not permission to fabricate a final side profile from one formula. v4 may seed a plausible depth profile, but the result remains `CANDIDATE` until reviewed.

---

## 6. Authoring model

Studio v4 authors the body like a deliberately simplified professional 3D package:

### Essential tools

- Orbit / pan / dolly
- Orthographic Front / Side / 3/4 / Back
- Silhouette Sculpt
- Depth Sculpt
- Soft Select
- Grab / Smooth / Inflate / Pinch
- Symmetry / mirror
- Macro Rig controls
- Face isolation
- Relief paint
- Morph target authoring
- Pose / keyframe / curve editing

### Critical UX rule

The user edits **meaningful form**, not raw implementation artifacts.

Examples:

- crown depth
- torso depth
- cleft depth
- foot root width
- foot thickness
- lower-body fullness
- side taper
- face-plane depth
- wisp spread
- ground relation

Raw vertices remain available in an advanced mode, but the default path is semantic + sculpt authoring.

---

## 7. 3D reconstruction bootstrap

For each embodiment, v4 bootstraps a candidate through constrained mesh fitting rather than naive extrusion.

Recommended pipeline:

1. Extract canonical vector silhouettes at 0°, 22.5°, and 45° from the old rig where available.
2. Start from the shared watertight v4 template mesh.
3. Solve vertex positions to minimize projected silhouette error at all available views.
4. Regularize with Laplacian/ARAP smoothness, volume preservation, bilateral symmetry where appropriate, and embodiment-specific depth priors.
5. Preserve designated semantic landmarks: crown, face plane, cleft, plants/feet, torso, silhouette extrema.
6. Subdivide for render quality without changing base authoring topology.
7. Run self-intersection/manifold tests.
8. Show the result in Studio for direct visual correction.
9. Promote only after human acceptance.

A visual-hull or SDF result may be used as a **temporary initialization/reference**, never as accepted final identity by itself.

---

## 8. Rendering

v4 permits a hybrid renderer because the body and face have different optimal representations.

### Body

- WebGL/Three or equivalent 3D renderer;
- PBR-like dark-pearl optical material tuned to historical read;
- vector-derived/semantic material parameters remain canonical;
- subdivision / smooth normals;
- real perspective and orthographic cameras;
- deterministic canonical review lighting.

### Face

- SVG/vector overlay projected from 3D face patch;
- no raster texture as canonical facial geometry;
- GSAP semantic animation;
- depth-aware occlusion.

### Energy / relief

May use GPU effects, but their semantic controls and attachment fields remain inspectable and deterministic.

---

## 9. Animation architecture

GSAP drives semantic weights and time-domain orchestration, not thousands of ad-hoc DOM mutations.

High-level tracks:

- embodiment morph weights;
- body rig controls;
- breathing/volume;
- gaze/saccade;
- blink;
- mouth/eye expression semantics;
- relief/energy;
- material response;
- secondary dynamics;
- recovery/settle.

All transitions start from current interpolated values. No snap through canonical source poses.

The body renderer consumes those weights through morph targets, skinning, cage deformation, or GPU deformation. React remains UI authority, not frame-by-frame geometry authority.

---

## 10. Acceptance gates

A v4 embodiment cannot be `ACCEPTED_CANON` until all of the following pass.

### Geometry

- one connected watertight body;
- manifold edges;
- no material self-intersections in canonical poses;
- stable topology/hash;
- full 360° orbit capture;
- no card/slab/two-blob failure.

### Identity projection

- front projection matches canonical vector target within tolerance;
- 22.5° / 45° projections match extracted historical targets where available;
- face anchor remains within canonical tolerance;
- silhouette extrema and ground relation remain correct.

### Face

- vector eyes/mouth remain vector;
- blink, gaze, fixture transitions, and interruption work;
- projection remains attached during orbit and deformation;
- occlusion is correct.

### Motion

- breathing/idle;
- secondary settling;
- Wispwalker stance/step deformation;
- no topology tearing;
- interruption from current interpolated state.

### Visual

- canonical review lighting;
- dark-pearl material read;
- no accidental candy/plastic slab read;
- human visual approval.

Human visual approval remains the final aesthetic gate.

---

## 11. Explicitly retired v3 assumptions

The following are retired where they conflict with this document:

- `25×40 connectivity = final closed body topology`;
- `front 512 alone = sufficient canonical 3D depth evidence`;
- `WebGL body = forbidden second body`;
- `no new canonical body mesh may exist`;
- `offset isolines of the W can be sewn directly into a valid closed manifold`;
- `polar sine depth around the W is a universal solid construction`;
- `ring 24 glue is enough to convert a front relief field into a real body`.

What remains locked is identity, not a failed parameterization.

---

## 12. Migration rule

Do not delete the historical rig or v3 experiments during v4 recovery.

They become:

- reference oracle;
- regression corpus;
- migration evidence;
- failure corpus.

Normal runtime must converge on the v4 body + vector-face architecture after acceptance.

---

## 13. Definition of “real Gasper”

The v4 refactor succeeds when the user can orbit Wispwalker and immediately recognize Gasper from every useful angle, deform him through meaningful Studio controls, watch a fully vector face remain alive and attached, and switch/morph among the canonical embodiments without the body collapsing into a projection hack.
