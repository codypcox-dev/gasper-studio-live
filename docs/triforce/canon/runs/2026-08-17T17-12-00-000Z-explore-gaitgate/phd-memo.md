# CanonOps PHD — explore · gaitGate

Earned under N20 / N335. Engine **3.0.0**.
Deposit: `docs/triforce/canon/runs/2026-08-17T17-12-00-000Z-explore-gaitgate`
Parent: `state-machine`.

## 1. THE WALL

Three things are named `gaitGate`.
Dual: `gate = gate = gate`.

## 2. QUESTION

Which one is locomotion, which is a firewall, and how does the machine enter without a pop?

## 3. THREE GATES

| Name | Lives in | Range | Job |
|---|---|---|---|
| **Kernel g** | `WorldPhysicsDriver` | [0,1] ramp | Onset of the step |
| **Painter G** | `all-script-3.js` L3116 | {0,1} | Reduced-motion identity |
| **Machine ĝ** | `__GASPER_MACHINE__` | {0,1} | Intent. Nobody reads it yet |

### Kernel (lawful locomotion)

```
target = walking ∧ ¬boo ∧ (speed > ε ∨ anticipation) ∧ embodimentGain = 1
g     += ± dt / τ          // ~180 ms
expr   = g² (3 − 2g)       // smoothstep, flat at both ends
```

First stroke: `g = 1`, `φ = 0`. Sustain must not. That wrap is the 14px spike.

### Painter (not locomotion)

```
gaitGate = motionStrength > 0.001 ? 1 : 0
```

Multiplies bob, plant, step, flatten, bank, squash, flight, swing, wind, support, telemetry.
Purpose: `G = 0` ⇒ byte-identical rest raster (constitution 7.1).
While he is living, **G is already 1**. Rest is kernel zeros, not this bit.

### Machine (intent only)

`ĝ` is Rest|Walk. It does not feed the driver. The world-driver card’s `gate` slider does not cook.

## 4. LAWFUL STACK

```
ĝ  →  kernel target  →  ramp g  →  smoothstep  →  physGait  →  × G  →  paint
```

Never `ĝ × channels`. That is a vault on the first Walk frame.
Never a second ramp on the machine. The 180 ms is enough.
Never fold `booGate` into `g`. Boo never stands.

## 5. SPEECH

Say **expression gate** (kernel), **motion firewall** (painter), **intent** (machine).
Stop calling all three `gaitGate`.

## 6. NOT THIS CUT

Explore only. Picture unchanged (168.3).
Next Work: `ĝ` writes the kernel **target**, not `G`, not a hard `g=1` except first-stroke.
