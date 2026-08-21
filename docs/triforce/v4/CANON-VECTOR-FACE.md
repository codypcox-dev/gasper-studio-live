# CANON — Gasper v4 Vector Face Rig

**Id:** `GASPER-V4-FACE-001`

## Core law

The face remains a **vector rig** in 3D. Eyes, mouth, tension marks, and expression apertures are authored as cubic Bézier geometry in local face space and projected/tessellated onto the live Gasper surface. No raster face texture is canonical.

## Protected v6.5.5 inheritance

Preserve the mature semantic face vocabulary already present in the historical rig:

- per-eye openness, width, tilt, lift;
- mouth width, open, curve, pull L/R, lift, skew, pinch, round;
- asymmetry, cheek tension, brow/skin tension, crown contribution;
- face-plane anchors;
- fixture families and interruption-aware blends;
- pupil-less identity.

The v6.5.5 `eyePath` and `mouthPath` behavior is treated as the initial vector-shape oracle, not disposable reference code.

## Representation

`FaceRig2D`
- canonical cubic Bézier paths and semantic parameters;
- stable local coordinate system;
- no dependence on screen pixels.

`FacePatch3D`
- a local tangent-frame patch attached to the body surface by stable barycentric/UV anchors;
- defines origin, tangent U, tangent V, and outward normal;
- follows body deformation and embodiment projection.

`VectorSurfaceProjection`
- adaptively samples/tessellates Bézier paths into 3D geometry at render time;
- maps each local 2D point into the face patch and then onto/above the body surface;
- keeps curves smooth under perspective and deformation;
- retains source Bézier control points for editing and animation.

## Eyes

Eyes are living apertures/recessed emissive shapes, not decals.

- blink is shape closure, not opacity;
- gaze/saccade is expressed through aperture orientation, lift, asymmetry, face-plane micro-rotation, and local deformation rather than pupils;
- left/right eyes remain independently controllable;
- the eye surface can recess into the shell with an emissive interior layer;
- at strong yaw, far-eye visibility follows real surface occlusion.

## Mouth

The mouth remains a closed cubic path with independent corners and upper/lower curvature.

- speech extension may add viseme targets later;
- smile/frown/strain is geometric;
- no sprite swap;
- no texture atlas;
- no hard-coded screen transform divorced from the surface.

## Expression shell

What previously appeared as brow/cheek/tension strokes becomes one of two things:

1. subtle vector crease geometry projected on the surface; or
2. a deformation/relief field that changes the skin.

No cartoon eyebrow object is introduced unless explicitly accepted. Skin tension should usually read through form and shading before graphic marks.

## Face attachment

The face cannot be a single flat plane glued at world XY.

- canonical face center starts from the protected front anchor around `(120,112)` in the legacy coordinate system;
- v4 stores the equivalent surface attachment in semantic coordinates;
- body yaw rotates the actual patch;
- face depth follows local surface depth;
- face can slide only through an explicit semantic face-offset control;
- attachment survives embodiment morphs through named anchor correspondence.

## Animation authority

GSAP drives semantic face parameters. The vector rig evaluator converts semantic state → Bézier control points → 3D projected geometry. React does not rerender per-frame face geometry.

## Studio tooling

Face workspace/tool must provide:

- 2D canonical face editor and 3D projected preview together;
- direct Bézier handles in advanced mode;
- semantic sliders in normal mode;
- mirrored edit with break-symmetry control;
- fixture browser;
- blink/gaze preview;
- expression blend preview;
- keyframe status per parameter;
- face-patch anchor and normal visualization;
- surface-occlusion preview at 0/45/90°.

## Acceptance

PASS requires:

- same recognizable front face as the accepted vector rig;
- smooth blink at front and 3/4;
- no floating/sliding during body motion;
- far features occlude correctly;
- mouth and eyes remain vector-derived at every frame;
- no raster dependency in canonical runtime;
- fixture transitions remain interruption-aware.
