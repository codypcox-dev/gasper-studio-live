# Gasper Studio — Canonical Working Baseline

**Status:** migrated and verified as a standalone developer baseline; all machine gates pass; the human visual acceptance gate remains open
**Product:** Gasper Studio only  
**Repository:** `C:\Users\funny\Documents\GasperStudio`

## Canonical rule

This repository is the working destination for Gasper Studio. Gasper and
AgentBridge are separate products. AgentBridge is not a source directory,
worktree, or build route for this baseline. Any bridge connection is an
optional authenticated transport boundary only.

## Imported implementation

The Gasper-only implementation was extracted from the latest verifiable
August 2 checkpoint `ae5283b0`. The import includes:

- the vector organism runtime and material projection;
- unified theory, pressure/material coupling, and morphology routes;
- eight-state life, three-beat behavior, long-rest/wake transport, and motion grammar;
- the standalone Studio surface, Dais stage, controls, protocol boundary, and proof hooks;
- the FormMaster assets required by the current renderer contract.

The source is now local under `packages/`. No AgentBridge application source,
desktop shell, gateway, or worktree was copied into this repository.

## Research included

`research/` contains the curated working set:

- constitutions, books, decisions, claims, ledgers, protocols, and alignment notes;
- the vision handoff and kickoff prompt;
- selected latest vector-material, unified-theory, eight-state, and Tri-Force proof records;
- the user-provided shader/vector reference links.

Historical scratch, duplicate worktrees, raw capture media, credentials,
recovery bundles, and conflicting route documents are intentionally excluded.

## Acceptance gates

The baseline is not called release-ready until all of these are evidenced from
this repository:

1. TypeScript and unit/structural tests pass.
2. The Vite production build passes.
3. Tri-Force `doctor` passes.
4. The migrated Studio visibly mounts the living Gasper stage.
5. Visual proof confirms the vector material, eight-state loop, transitions,
   and no hidden raster/legacy authoring route.

The current named residual is **human visual acceptance of the full authored scene set (GASPER-FINISH-01 row 16)**. Standalone renderer parity remains a lab-only candidate; FormMaster (`legacy-authority-formmaster-v655`) is the production authority.

## Evidence-backed status (2026-08-03)

- Tasks 1-8 machine gates: pass in this tree (122/122 tests, typecheck 0, no-raster scanner PASS, build clean). Final matrix: `research/proofs/gasper-finish-01/proof-matrix-final.md`.
- Authored showcase pack `gasper-hero-pack-v1` (10 documents, 13 clips) is served, compiled (`scene-compiler.json`), and loaded at runtime (`doc-showcase-project`, active clip `clip-presence-living-idle`).
- Live scene drive: all 8 representative clips select correctly and `playStudioAnimate()` changes the rendered frame (captures under `research/proofs/gasper-unified-theory-vision/visual/scenes/`).
- Unified Theory vision (ten laws + verification appendix): machine-proven, `research/proofs/gasper-unified-theory-vision/unified-vision-proof.json`.
- Rig baseline lock refreshed to `707c39bb…` (SVG attribute, production script constant) and architecture lock rig hashes to `C511E5A1…`.
- Visual acceptance: vivid calibration accepted by Kimi under owner delegation; full scene/sequence human gate remains open.

The completed migration and visual verification record is maintained at
`research/proofs/visual-qa-2026-08-02/VERIFICATION.md`.
