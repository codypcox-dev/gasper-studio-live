# CanonOps PHD — investigate · clean implementation audit

Earned under N20 / N335.
Date: 2026-08-19T02:40:00.000Z
Tri-Force: 3.0.0
Deposit: docs/triforce/canon/runs/2026-08-19T02-40-00-000Z-investigate-envelope-clean
Parents: canal-sweep · occluding-contour · medial-skeleton · 2026-08-19T01-20 envelope-audit (thin)

Adversarial verdict: the law is right. The first rest-lock table is **costume**. E1 can be coded. E2 must not, until `r(u)` is measured from the living W.

## 0. LIVE WRITE ORDER (one frame)

`all-script-3.js`:

1. `createBaseContour` :1090 — 512 polar slots. Not xy.
2. `sampleBodyForProfile` :1440 — **the 512 xy writer**. Gauss W + walk/relief `scaffoldContourZ` + stance fold + `authorKeyViewPoint`.
3. `_lp` + `kappaBoxLower` :3239–3290.
4. `facingCompress` about **centroid** :3357.
5. `bindHullToLiveGrid` :2195 — **the 1000 writer**. Lofts *from* the posed 512. `z = ox·sin + 58√(1−v²)·cos` :2295.
6. `closedSpline` → `#body` and `clipBody` :3404–3405.
7. `shadeCagePoints` **ignores stored z**: `uz=0`, `vz` from the same 58-dome :2044–2050.
8. `muteHardHighlights` :3419. Floor `removeAttribute('transform')` :3648.

`rotateViewXYZ` is **not** in the painter. It lives in the unhooked twin `scaffold/Mesh3D.ts` and rotates about **origin**. Importing it is `centroid-yaw = plant-yaw`.

`CageHullHonor.test.ts` is cited in CAGED-HULL. **Confirm existence before pinning.** New pins go in `EnvelopeHonor.test.ts`.

## 1. THE PLAN TABLE IS COSTUME

Measured from the live gauss W (`WISPWALKER_CANONICAL_CONTOUR` + `baseRadiusV63` + nub feet + `mapFormPoint` wispwalker `sx=.93, sy=1.16, cy=2`), rest, no stance live:

| locus | live xy | plan node | plan r |
|---|---|---|---|
| crown (th=−π/2) | **(120.00, 28.34)** | (120, 112) r=58 | tops at y=54 — 26 px short |
| cleft (th=π/2) | **(120.00, 192.28)** | (120.32, 180.77) r=8 | |
| plant R / L | **(140.64, 200.76) / (100.25, 201.03)** | (141.76 / 98.87, 189.80) | 11 px north of painted feet |
| bbox height | **~172.7** | envelope 54–197.8 | **~143.8** |

Where the plan stole r:

- **r_F = 58** is the shade dome (`shadeCagePoints` :2044) and a rounded `faceClearanceRadius`. FACE_CANON has **no radius**.
- **r_T = 64** is `profileDepthScale` default. A sphere r=64 at y=141 bottoms at **205** — through the floor. Regularity `|64−8| = 56 > L_TC ≈ 40` **fails**. Torso ball swallows crotch and plants.
- **M* = 197.80** is the muted-handles kill-sheet plant Y. Live feet sit at **y≈201**.

`STANCE_REST` (100,188) / (140,188) / (120,172) are Dirichlet **handles**. The painted feet are not at the sockets. Do not average handles with sphere centers.

## 2. WAVE ATTACKS

### E1 — overlay. SAFE if honest.

MUST: debug group, five dots, gated. Zero call from `bindHullToLiveGrid`.

MUST NOT: lock the costume table as `REST_SKELETON` any later wave will sample. Sniff `__GASPER_MEDIAL__`. Draw r=64 (punches the floor).

Film: dots *inside* the live W. `#body` d byte-identical. hull.h unchanged. Face at (120,112).

Halt E1 if radii are written into a const the sampler will later read.

### E2 — shadow XYZ. HALT until r is measured.

The E2 paint-gate (bbox unchanged) **passes even if envelopeXYZ is garbage**, because the pointer is not swapped. That is the trap. A correct E2 with costume r fossilizes a lie E3 will paint.

Helpful inversion: `const xyz = envelopeXYZ` at `paintSurfaceShade`. Height “fixed” by scaling r_F to ~84, which slides FACE_CANON.

### E3 — two bodies.

Sphere-sweep interiors + gauss rim is discontinuous at ring 23/24. Disagree at the cleft, the crown, after `facingCompress`, during walk, during stance fold. Isolines kink at the crust.

Do not unglue ring 24 “so the rim matches the tubes.” Then `hullFrontPath` ≠ `#body`. Fill leaks.

### E4 — two yaws.

If you leave `authorKeyViewPoint` (`farTuck` / `nearExpansion`) you have two yaws. If you kill it in the same commit as the 3D rotate, you invert the silhouette and the face together. Do not `import { rotateViewXYZ } from Mesh3D` — origin pivot, floor tips.

### E5 — do not delete walk before bones.

Live rest cleft is **~8.7 px**. Do not carve the identity W to feed G6 “cleft ≥ 10.” That gate is for the *walking* `#body`.

### E6 — who else reads the 512

After E6 the 512 is an isoline, not a polar sample. `kappaBoxLower`, `_lp`, `computeNormals` / ribbons, `distributedMeshPointsFor` (face anchors), `insetContour`, `scaffoldContourZ`, `PathEmbeddingTake` all assumed `th = −π/2 + i·2π/512`. Face slides if `distributedMeshPointsFor` keeps polar indexing.

Do not rewrite path-take schema in the extractor commit.

### E7 — same 5 nodes. No remesh. FACE_CANON holds.

## 3. FAIL-CLOSED

**First wave safe to code: E1 only** — as a measurement instrument, not as a lock of the costume table.

**Halt before E2** until rest lock is measured from the living W (plants ≈ 201, crown surface ≈ 28, r_F at FACE_CANON ≈ 84 if the node stays there, r_T must taper before the floor).

**Halt on any wave if:** `#body` inverted before bones; `paintCageFill` fed envelopeXYZ; height “fixed” to 168.3 or 144; `rotateViewXYZ` imported from Mesh3D; `radialEnvelope` / `hullFrontPath` becomes the body; walk deleted before plants write bones; `_lp` / κ-box on extracted isoline; path-take schema changes in E6; `CageHull.ts` appears; `all-script-3.js` wholesale-replaced; zombie floor-transform tests go green.
