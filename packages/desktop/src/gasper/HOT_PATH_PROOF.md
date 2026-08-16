# Hot-path proof

Authoring path:
  pointer/slider → GasperRigBinding.preview → **gsap.quickTo** (vendor/gsap/gsap.min.js via gsap-shim) → GasperRenderMixer.setFormValue → rAF flush → SVG host transform / node styles

Forbidden (not present in mixer/animation/registry executable code):
  fetch, postMessage, playwright, chrome.debugger, iframe mount

Evidence:
- `GasperAnimationEngine` imports `./gsap-shim` and calls `gsap.quickTo` / `gsap.killTweensOf` / `gsap.set`
- data-hot-path="dais" + data-latency-class="local-gsap" on form sliders (honest: real GSAP)
- data-iframe="false" on GasperDaisStage
- Playwright: iframe-count=0, overall_width commit → dataset.formWidth=1.4, transform scale(1.4,1)
- Unit: mixer flush writes scale() + dataset.formWidth on host HTMLElement

Topology from mounted SidekickFormMasterRig snapshot:
  CONTOUR_SAMPLES=512, STRUCTURAL_NODES=360, structural triangles via ARTICULATION_MESH (15 rings × 24 sectors → 672 tris)
