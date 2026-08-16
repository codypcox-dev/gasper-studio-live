# Migration map — Gasper v6.5.5 candidate → native Dais modules

**Source (protected, do not rewrite):**  
`%LOCALAPPDATA%\AgentBridge\rigs\gasper-v6.5.5-behavioral-continuity\sidekickex-gasper-v6.5.5-standalone.html`  
SHA256: `196679B242A597E2299CA855D556D25485F8CF0B451BB4288C9EE0D9F3988887`

## Extracted assets

| Candidate region | Internal module / asset |
|------------------|-------------------------|
| Largest `<svg id="avatar">` (~26KB) | `assets/gasper-rig-v655.svg` |
| `<script>` 0 — `SidekickAdaptiveMesh` | `assets/all-script-0.js` |
| `<script>` 1 — `SidekickFacePlane` | `assets/all-script-1.js` |
| `<script>` 2 — relief kinds | `assets/all-script-2.js` |
| `<script>` 3 — FormMaster + Gasper runtime | `assets/all-script-3.js` |
| `FORM_PROFILES` (8 embodiments) | Loaded via script-3 → `SidekickFormMasterRig.setProfile` |
| `EMOTION_FIXTURES` (18 fixtures) | `setFixture` / `setFixtureImmediate` |
| 13 microstates | `triggerMicrostate` / `setMicrostateProgress` |
| `CONTOUR_SAMPLES = 512` | Preserved in script-3 constants |
| `STRUCTURAL_NODES = 360` | Preserved |
| `ARTICULATION_MESH.triangles` (672) | Polar topology 15×24 rings/sectors |
| Materials / masks / filters | SVG `<defs>` in extracted SVG |
| Face / eye / mouth nodes | SVG ids + FacePlane + renderFace* |
| GSAP timelines | **Not present in candidate** — Studio adds `gsap` for Dais hot-path proxies only |

## Not mounted (page chrome)

Candidate HTML page chrome is **excluded** from authoring mode:

- title, lead copy, pills, reference panel cards
- sidebar runtime buttons, fixture button grids
- nested page scroll / `main` layout
- `postMessage` sidekick-form-control bridge (authoring uses direct API)

## Module map

| Module | Responsibility |
|--------|----------------|
| `GasperDocument.ts` | Mount SVG + stub host; load scripts 0–3 in scope |
| `GasperRigController.ts` | Facade over `SidekickFormMasterRig` + form overrides |
| `GasperAnimationEngine.ts` | GSAP quickTo/quickSetter for preview hot path |
| `GasperParameterRegistry.ts` | Binding contract + gate (controls ≡ bindings) |
| `GasperSelectionModel.ts` | Single source of truth for embodiment/expression/tool/mode |
| `GasperViewportController.ts` | Pan/zoom/fit (stage camera only) |
| `GasperDirectManipulation.ts` | Stage handles → bindings |
| `GasperRenderMixer.ts` | Layer compose + flush |
| `GasperDaisStage.tsx` | Stage viewport React shell |

## Legacy routes removed from normal authoring

| Route | Status |
|-------|--------|
| `iframe.viewport-iframe` embed of full candidate HTML | Removed from authoring stage |
| REST continuous param on slider drag | Removed from Dais binding preview |
| MCP/CDP/Playwright/postMessage on slider drag | Forbidden on hot path |
| Open Rig → headed browser page as stage | Open Rig now boots native Dais document |

Runtime/capture/validation remain available via cold-path overflow tools (unchanged gateway).
