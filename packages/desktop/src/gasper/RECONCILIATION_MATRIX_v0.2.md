# Architecture Pack v0.2 reconciliation matrix

Compared against Dais implementation after v0.2 patch.

| Item | Status | Notes |
|------|--------|-------|
| Dais stage / no iframe authoring | COMPLETE | GasperDaisStage |
| Single selection model | COMPLETE | GasperSelectionModel |
| Parameter bindings + undo | COMPLETE | Expanded multi-domain ids |
| Real GSAP continuous animation | COMPLETE | gsap.quickTo via gsap-shim |
| 512 contour / 360 nodes / 672 tris lock | COMPLETE | GasperTopologyLock + FormMaster |
| 25×40 / 1000 adaptive relief field | PARTIAL | Animated Float32 field + #reliefLayer; FormMaster presets optional |
| Macro deformation field | COMPLETE | Bindings + host scale |
| Face plane | PARTIAL | Bindings + FormMaster face; co-equal eyes/mouth |
| Internal energy volume (not glow-only) | PARTIAL | laggedLevel/pulse/occlusion + volume layer scale |
| Skin/surface domain | PARTIAL | tension/damping/coupling → shell filter |
| Texture/relief domain | PARTIAL | texture_amount/scale on cosmic layer |
| Normal/curvature field | PARTIAL | scalars → specular/key reflection |
| Material stack | PARTIAL | roughness/clearcoat/pearl distinct from skin |
| World-space optical rig | PARTIAL | key/rim/face-emissive/absorption channels |
| Secondary dynamics | PARTIAL | inertia/lag/rebound/settling residual tick |
| GSAP multi-domain tracks | PARTIAL | GasperGsapTrackOrchestrator + GsapPlanCompiler |
| Book 004 AnimationPlan adapter | PARTIAL | GsapPlanCompiler + playAnimationPlan |
| Layer mixer (base…microstate) | COMPLETE | GasperLayerMixer |
| .gasper document schema/model | PARTIAL | GasperDocumentModel createGasperDocument |
| Rust owns canonical document | MISSING | Still TS/runtime; deferred |
| MorphSVG/Flubber path morph | NOT_EXTRACTED | FormMaster shared-topology morph remains |
| Full 1000-sample → mesh vertex displacement | PARTIAL | Field drives relief layer; not full vertex scatter |
| Identity constraint engine (full) | PARTIAL | Layer mixer clamps only |

## Conflicts resolved

| Conflict | Resolution |
|----------|------------|
| Contour-only host scale as “full morph” | Multi-domain flush + coordinated GSAP tracks on embodiment/expression |
| Energy as glow opacity only | Energy volume state + spatial volume layers + lag/pulse |
| Relief as static texture | Movement-bearing 25×40 samples animated each tick |
| Material flattened with skin | Separate skin_* vs roughness/clearcoat/pearl |
