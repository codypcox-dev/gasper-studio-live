# CanonOps PHD — explore · Node-based visual scripting

Earned under N20 / N335. Engine **3.0.0** (pinned).
Deposit: `docs/triforce/canon/runs/2026-08-17T15-48-00-000Z-explore-visual-scripting`
Parent: `geometry-nodes` (2026-08-17T14-55).

## 1. THE WALL

You can drag cards and draw wires. The painter does not care.
`evaluateGraph` publishes mute and params. `topoOrder(links)` is computed and ignored.
Identity → … → Hull is still hardcoded in `all-script-3.js`.
That is a **rack**. It is not a language.
Dual: `rack = visual-script`.

## 2. QUESTION

What family of node systems is Gasper, which laws make a wire carry meaning, and what must we refuse from Blueprints?

## 3. THREE FAMILIES

| Family | Who | Cook | Gasper |
|---|---|---|---|
| Dataflow / fields | Blender GN, Houdini, Nuke | Typed sockets. Pull or topo-push. Mute = passthrough | **Yes** |
| Exec + data | UE Blueprints | Exec orders side effects. One next | **No** — becomes a second walk writer |
| Signal / patch | Max, TouchDesigner | Every frame | **Yes** — he is alive |

He is a field that cooks every frame. The 20s take is a score, not OnTick.

## 4. LAW (stolen, then bound to the lock)

- Socket types: `contour` (512), `lattice` (360/672), `relief` (25×40), `scalar`, `phase`, `shade`.
- Circle = one value. Diamond = field over a lock. Circle may feed diamond. Diamond may not feed circle.
- Fan-out legal. Fan-in is one source or an explicit **Join = Σ on the same lock**. Never concatenate. Never remesh.
- Mute = `out = in` on the incoming contour. Muted params do not cook.
- Viewer reads. Hull writes. `closedSpline` is the only `d`.
- Cycles illegal on geometry (`wouldCycle` already). No exec token.
- Search, constants on unconnected pins, type-check on connect — language UX, not chrome.

## 5. LIVE GAP

| Law | Now |
|---|---|
| Cards, drag, wires, on-card dials | Yes. Nodes page. |
| Typed sockets | No. `from`/`to` only. |
| Data on the wire | No. |
| Cook follows links | No. Painter hardcoded. |
| Mute passthrough | Yes, handles / voigt / kappa. |
| Viewer | No. PIP is the whole organism. |
| Exec wires | Correctly absent. Keep it that way. |

## 6. NOT THIS CUT

Do not recut FormMaster. Do not add Blueprint exec. Do not remesh. Do not stamp engine 3.3 — lock is 3.0.0.

## 7. NEXT WORK (when you say go)

1. `GeoSocket` on every card. `connectNodes` type-checks.
2. Each LIVE node reads a named buffer, writes one buffer. Painter consults `eval.order`.
3. Viewer node: strokes the 512, never writes `d`.
4. Then, and only then, compositor groups.

Until a rewire changes the cook, the page is an honest mixer — call it that — not a language.
