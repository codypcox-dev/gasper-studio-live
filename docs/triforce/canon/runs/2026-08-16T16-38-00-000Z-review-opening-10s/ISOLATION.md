# Opening 10s @ 120fps — isolation

1201 kernel frames + 9 live stills. Not a self-PASS.

## What is already clean

| Window | Kernel | Picture |
|---|---|---|
| 0–2.618 rest | lift 0, side 0, Δx 0, Δy 0 | Sealed pearl. Glow holds. Camera holds. |
| 2.70–5.15 strut | 4 exchanges, lift 544 u, adv 251 u, plant drift 0 | Travel is real (body.x 0→491). |
| 5.15–6.6 seat | lift 9→0, hz 1.43→0 | Parks. |
| 6.6–9.2 notice | lift 0 | Face only. |
| 9.2–10 gather | boo on | Sphere begins. Not a leg window. |

## Isolated leg faults (solvable)

### L1 — Swing is a Y-chew, not a leave
**Picture:** bbox height 168 → 166 at mid-strut. Kernel lift is 68 px. The hull barely changes. One V of the W bites up and heals.
**Site:** `packages/desktop/src/gasper/assets/all-script-3.js` ~1476–1490
`posed.y -= _liftPx * _swingArtW` on rest μ 1.31/1.83, σ=0.16.
**Cut:** Do not Y-translate the rest nub. Travel the swing gauss μ in (x,y). Air gap is a new lowest-y, not a shorter W.

### L2 — Advance is a bulge, not a new plant
**Picture:** Kernel adv 251 u = 31 px. Exchange does not leave a new floor X. The W reconstitutes.
**Site:** same block `posed.x += _advPx * _swingArtW`
**Cut:** At exchange, plant μ := old swing μ. Handoff, not snap-back of y.

### L3 — Opening monitor is face-first
**Picture:** Stills at zoom 2 / panY −40. The W sits on the fold. Legs cannot be reviewed on this crop.
**Site:** `GasperStudioApp` first-run cinematic hold. Take no longer reframes (N347). `walkReviewShot.ts` claims 243 px plant margin on 1120×758 — this preview is shorter.
**Cut:** Do not move the camera mid-take. Boot the 20s on a body hold that already includes both lobes, or raise the walk-review fence for this viewport. Separate from L1/L2.

### L4 — Seat does not kill walkEnable
**Picture:** This tape died on `stay` cruise 1 (lift→0). Residual: walkEnable stays 1 until gather 9.2.
**Site:** `NorthstarTwentyTake.ts` seat beat — only `stay` + heading. `walkEnable: false` is on gather, not seat.
**Cut:** Seat files `walkEnable: false` (or seated leftover). Optional; not the chew.

### L5 — D-0016 radius press (check, not proven on this tape)
**Site:** `walk_enable` / stepDepth in `formRadiusAtFor` if `walkPhysicsDrivenHold` fails.
**Cut:** Confirm hold still zeros the old walkGate whenever provenance is physics. Do not run two walks.

## Not this 10s

- Plant-gated τ (N348): kernel plant drift 0. Need a smear tape, not this one.
- Froude / kernel-8 / viewBox: not in the opening picture.
- W-skeleton: still rejected. L1/L2 are the contour cut.

## Next cut order

1. L1+L2 together (one painter block). 6s walk-review tape.
2. L3 only if the 6s still hides the plant.
3. L4 after the chew reads as a step.
