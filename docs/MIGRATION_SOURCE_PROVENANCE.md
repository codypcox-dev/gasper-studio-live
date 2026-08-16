# Migration Source Provenance

## Destination

`C:\Users\funny\Documents\GasperStudio`

## Source checkpoint

- source revision: `ae5283b0`
- checkpoint: `checkpoint(gasper): preserve post-proof unified theory delta`
- source selection: Gasper-only runtime, Studio surface, selected pure support
  contracts, and selected proof records

## Boundary proof

The migration copied only Gasper-specific paths into the standalone repository.
It did not copy the AgentBridge application, gateway, desktop shell, service,
worktrees, or administrative UI. Executable imports were rewritten to local
Gasper paths. The optional bridge remains a protocol boundary rather than a
co-owned application source tree.

## Exclusions

- historical worktrees and branch metadata;
- raw video/image capture scratch;
- recovery bundles and large archives;
- stale route documents that name another repository as Gasper authority;
- unrelated AgentBridge packages.

This file records provenance only; the destination repository is the authoring
route for all future Gasper work.
