# CanonOps PHD — explore + implement · Geometry Nodes

Earned under N20 / N335. Engine 3.0.0.
Deposit: docs/triforce/canon/runs/2026-08-17T14-55-00-000Z-explore-geometry-nodes

## 1. THE WALL

The user cannot see the stack. Forty organs. One painter. Mute does not exist. Asking every turn is the product failure.

## 2. QUESTION

What is the honest inventory, what is the live order, and what Geometry Nodes contract makes that stack visible, mixable, and muteable without a second `#body` writer?

## 3. LAW (stolen from Blender, refused mesh algebra)

- Fields compile. Data-flow evaluates. Mute is passthrough.
- 512 / 360 / 1000 never change cardinality.
- One writer: `closedSpline` → `#body`.
- Join is Σ on the same lock, not concatenate.
- Viewer does not write.
- C² everywhere is a pad. κ-box is G¹.

## 4. LIVE ORDER (now the default graph)

Identity 512 → Cage 25×40 → Handles → Gait → Voigt τ → κ-box → Orbit → Pearl → Hull

## 5. INVENTORY

See `geonodes/catalog.ts`. LIVE / TWIN / UNHOOKED / DEAD. ARAP is UNHOOKED. FormMaster is LIVE. Ribbons are DEAD.

## 6. IMPLEMENTATION THIS CUT

- Schema `gasper.geometry-nodes.v1`
- Evaluator + persist
- Painter honors mute on handles / voigt / kappa
- UI: Nodes tab, graph strip + stack catalog
- Stage stays primary

## 7. NOT THIS CUT

Full diamond-field compiler. Spreadsheet of 512. Promoting compositor layers. Those are next groups, not posters.
