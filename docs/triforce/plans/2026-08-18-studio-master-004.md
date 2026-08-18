# STUDIO MASTER BOOK 004 — one writer, live light

**Id:** `GASPER-STUDIO-MASTER-004`  
**Date:** 2026-08-18  
**Lead:** PlanOps (work). ThinkOps named.  
**Status:** coded + filmed. Not owner acceptance (S3).  
**Restore:** `checkpoint-real-system-20260818` (`69e5789`)  
**Parent:** `GASPER-STUDIO-MASTER-003`  
**Northstar:** `docs/triforce/NORTHSTAR-CAGED-HULL.md` + `NORTHSTAR.md` N353–N358

Chat is transport. This file is the plan.

---

## What this book closed

| Item | Law | Proof |
|---|---|---|
| Yaw double-write | `orbit.yaw` bind writes `setOrbit` / lights only. Painted travel is heading beats → `setHeadingYaw`. Dial stays setup/user. They add. They do not replace each other. | Seat film: dial ~9, heading −14, facing −5. Not −44. `evaluateScore.test` asserts `setYaw` is never called. |
| Stretch bind | `handles.stretch` fenced 0 while planted. Host `__GASPER_HANDLE_STRETCH__` scales stance lift. | Test + StanceInstrument. |
| Cage-light cook order | `FUNCTION_ORDER.painter` = orbit, pearl, cage-light, hull, radial-facing. | layout.ts |
| Mute writes base | cage-light spec/wrap/keyAz/keyEl use `liveOrBase`. | host.ts |
| Point-light tools | Key az / key el on cage-light. Orbit pitch. Pearl depth. 12 Look dials. | Stage inspector, two-column, above transport. |
| Craters | `reliefShadow` `d=''`, fill `#2a1458`, opacity 0. Shade bowls 0. | Film `cratersGone: true` |
| Grid toggle | Desk writes `cage.grid`. Sticks. | Film off→on |

## Film

`screenshots/unify-004/packet.json`

| Gate | Result |
|---|---|
| noPageError | PASS |
| inspector 12 dials | PASS |
| cratersGone | PASS |
| noWhiteHot | PASS (`#efe6ff`) |
| gridToggle | PASS |
| noDoubleYaw | PASS |
| stageDefault | PASS (0 compiler cols) |
| spec 8→42 | **11.6 px** — shy of G4 16. Honest. |
| spec 8→90 | **39.9 px** — lights are real at large orbit. |

## Live stack (honest)

```
Machine → Kernel → Cook → Painter → Score
LIVE: machine, world-driver, gait, support, identity, cage,
      handles, voigt, kappa, couple, orbit, pearl, cage-light,
      hull, northstar-20
Paint: FormMaster all-script-3.js only
Cage: 25×40 = skin. 512 rim. n̂·L on verts.
τ field: { foot 0.028, waist 0.05, crown 0.12 }
orbit.yaw = lights / loft. headingDeg = painted travel. dial = user.
```

## Residual (do not stamp PASS)

- Height 173.7 vs kill switch 168.3 ± 0.4 (001 leftover, not recut).
- Spec travel 11.6 px on 8→42. G4 asked 16. 90° proves 40 px.
- `tssGlint` still dim (~0.18). Not the key. Dual named `overlay-ellipse = cage-surface` is mostly dead.
- S2 dopesheet key-drag, S3 cook fold — chrome. ThinkOps residual `pillar = work-surface`.
- WorldClass still mounted (001 leftover).

## Not this book

GGX on 1000. Remount InstrumentTable. Recut rest height. Pen / bones / Merge.
