# Gasper v4 Acceptance Gates

**Authority:** companion to `CANON-V4.md` and `NORTHSTAR-V4-REAL-GASPER.md`  
**Purpose:** prevent another false landing where implementation metrics pass but Gasper is visibly wrong.

---

## Gate classes

Every promotion requires all four classes:

1. **Structural** — topology/geometry validity.
2. **Projection** — canonical visual correspondence.
3. **Behavioral** — rig/face/animation truth.
4. **Human visual** — final identity acceptance.

Automation may reject. Automation may not grant final aesthetic acceptance.

---

## G0 — Reference oracle

PASS only if:

- all eight canonical embodiments are enumerated;
- historical profile/face semantics are machine-readable;
- Wispwalker 0°, 22.5°, 45° targets are captured or explicitly marked unavailable;
- reference artifacts are immutable and hashed;
- no new renderer participates in producing the reference values.

---

## G1 — Wispwalker body

### Structural

- connected components: exactly 1;
- watertight: every manifold edge has two incident faces;
- signed volume: positive and finite;
- normals: consistently oriented;
- degenerate triangles/quads: none above defined epsilon;
- self-intersections: none in canonical neutral pose;
- topology hash stable across save/open;
- no topology changes during orbit.

### Projection

At canonical review resolution/camera:

- front silhouette median deviation <= 1 px where feasible;
- front silhouette max deviation target <= 2 px excluding explicitly approved soft-detail differences;
- 22.5° and 45° target deviation recorded and visually reviewed;
- face frame remains within approved tolerance;
- ground plane/contact points remain stable;
- cleft and both foot roots remain visually distinct.

Metrics are diagnostic, not substitutes for recognition.

### Orbit

A full 360° capture must show:

- no card/slab state;
- no disconnected blobs;
- no crown cloud/bowl split;
- no platform/capsule side profile;
- no sudden thickness inversion;
- no seam opening;
- no face detachment.

### Human visual

Status can be `REVIEWED` after automated pass. `ACCEPTED_CANON` requires user approval.

---

## G2 — Studio body authoring

PASS only if:

- silhouette sculpt changes the v4 body and front projection predictably;
- depth sculpt changes depth without silently corrupting front identity;
- soft select is local and stable;
- symmetry is explicit and reversible;
- macro rig controls deform the same body authority;
- undo/redo restores exact authored state;
- save/open round-trips exact mesh/profile state;
- 25×40 relief remains attached after edits;
- no visible dead controls.

---

## G3 — Vector face

PASS only if:

- canonical face geometry remains SVG/vector/path data;
- eyes and mouth are not baked into a raster texture;
- vector paths stay attached to the 3D face patch through orbit/deformation;
- depth-aware occlusion behaves correctly;
- blink works;
- gaze/saccades work;
- expression fixtures work;
- interruption begins from current interpolation;
- no screen-space drift over a 360° orbit.

---

## G4 — Wispwalker motion

PASS only if:

- breathing/volume idle is visible;
- secondary settle is visible;
- Wispwalker plant/step behavior deforms the v4 body cleanly;
- ground contact remains believable;
- face and body timing remain coordinated;
- relief/energy follow with intended lag;
- no topology tear/self-intersection under standard motion;
- animation can be interrupted cleanly.

---

## G5 — Eight embodiments

For every embodiment:

- one explicit `EmbodimentVolumeProfile` exists;
- canonical front target exists;
- available authored key views are used;
- deliberate depth/profile exists;
- face frame exists or face-off state is explicit;
- material/energy default exists;
- full orbit capture exists;
- structural validation passes;
- identity review is recorded.

No embodiment may be silently represented by a generic scale of another form if its historical semantics require a distinct mass organization.

---

## G6 — 20-second scene

PASS only if:

- v4 3D body is used;
- vector face is used;
- canonical timing and semantic beats are reproduced;
- camera staging is coherent in true 3D;
- material/energy read matches or improves the reference;
- no compatibility fallback to the old 2.5D body occurs during the scene;
- final video is reviewed by the user.

---

## Regression tripwires

Any of these force FAIL:

- `25×40 mesh == final canonical body topology` reintroduced without explicit v4 canon amendment;
- body final depth inferred only from front 512;
- raster face accepted as canonical;
- reference oracle mutated by implementation;
- two independent body authorities active in normal runtime;
- orbit uses CSS/card tricks instead of turning the body;
- passing bbox/component metrics used as visual acceptance;
- user-visible port 8080 serves a stale build after an integration claim.
