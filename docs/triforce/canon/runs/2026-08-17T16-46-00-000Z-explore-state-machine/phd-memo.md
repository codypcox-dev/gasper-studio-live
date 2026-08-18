# CanonOps PHD — explore · State machine architecture

Earned under N20 / N335. Engine **3.0.0**.
Deposit: `docs/triforce/canon/runs/2026-08-17T16-46-00-000Z-explore-state-machine`
Parent: `control-rig`. Live twin: eight-state loop.

## 1. THE WALL

He has four clocks and no machine.
Eight-state loop. Gait φ. Takes. The cook line.
Treating the loop as “his state machine” would put presence on the hull.
Dual: `loop = character-FSM`.

## 2. QUESTION

What is a state, what is a phase, what is a score, and how many regions does a living character need?

## 3. FOUR OBJECTS (do not swap them)

| Object | Exclusive? | Time | Gasper |
|---|---|---|---|
| **FSM / HFSM** | One state per *region* | Transitions | Missing as a named chart |
| **Phase** | No — continuous | φ, 4π | Gait. Contact is a predicate |
| **Score** | Playing or not | τ ∈ [0, T] | 20s / Path take |
| **Dataflow** | Mute = passthrough | Every frame | Cook line |

Behavior trees tick decisions. Motion matching picks clips. Neither writes `#body`. We have no clip DB. Do not import them as the hull.

Harel: **orthogonal regions run at once**. A character is AND, not OR.

## 4. THREE REGIONS (the machine we actually need)

```
Locomotion   Rest | Walk
               Walk ⊃ plant-L / plant-R     ← SupportExchange, not a second d
Presence     eight holds + wake             ← face / energy / GSAP
Take         Idle | Playing(score)          ← 20s is a score, not Delay
```

The cook line is **not** a fourth region. Mute is passthrough.

Guards:
- `gaitGate` already blends Rest/Walk. Prefer the gate over a hard cut.
- Presence never sets travel.
- Playing a take does not add a travel writer. Backwards onto handles, then Forwards.

## 5. WHAT IS LIVE (honest)

- `EightStateId` = presence grammar. No walk. Three-beat envelopes. **LIVE**, face/energy.
- Gait φ + plant hold = locomotion clock. **LIVE**. Not states.
- Path / Northstar takes = scores. **LIVE**.
- Cook line = dataflow. **LIVE**.
- There is no HFSM that names the three regions. That is the residual.

## 6. REFUSE

- Flat FSM of 40 organs.
- Walk as an eight-state.
- Thinking as a gait state.
- BT leaf that moves the 512.
- Resetting φ on a Presence transition.

## 7. NOT THIS CUT

Explore only. Picture unchanged (168.3).
Next Work: a 3-region chart that only publishes flags the cook already reads (`gaitGate`, `eightState`, `takePlay`). No new writer.
