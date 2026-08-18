# CanonOps PHD — explore · vector-studio-ux

Earned under N20 / N335.
Date: 2026-08-18T18:00:00.000Z
Tri-Force: 3.0.0

## 1. THE WALL

Gasper Studio had five UIs claiming to be the instrument (desk pills, MachineStrip, Dais rail, Dais transport, monitor bar). The 20s scrubber used `performance.now()` against a T0 stamped with `organismClock.nowMs()`. Dual: badge-rail = transport. Dual: wall-clock = organism-clock.

## 2. WHAT FIRST-CLASS VECTOR STUDIOS DO

| Product | Law to keep |
|---|---|
| Rive | Two modes: Design/Stage and Animate/Graph. Inspector follows selection. Timelines are states. |
| Cavalry | Nodes are the animation system. Timeline is a view, not a second author. |
| After Effects | Transport is always present. Spacebar pause. Playhead is one number. |
| Toon Boom Harmony | Attribute controllers offset; they do not overwrite. Selection lock. |
| Spine | Dopesheet + viewport. Tools are few. |
| Illustrator / Figma | Contextual properties. No 13 chapter pills. |

## 3. CLOCK LAW (physical)

VEC-401 is the only dispatch. Pause = `clock.pause()`. Scrub take = `T0 = nowMs - t`. Gait scrub = `__GASPER_SCRUB_PHASE__` + hold. Mixing `performance.now()` with `nowMs()` is a second ticker.

## 4. ARTISTIC LAW

The bottom chrome is a transport, not a museum. Presence, locomotion, and unused organs live on cards. They do not get a permanent badge row.

## 5. IMPLEMENTATION

`studioClock.ts` + `StudioTransport.tsx`. Host `data-studio-v2` hides rail/old transport.

## 6. UNCERTAINTY

Take beats are edge-triggered. Backward scrub does not un-apply physics. A later wave must make beats a function of t.
