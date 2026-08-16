# GASPER-PHYSICS-001 — PHYSICS SUPREMACY (D-0112, the φ-synthesis)

Owner signal 2026-08-04: "PHYSICAL MOVEMENT IS IMPOSSIBLE WITHOUT HONORING
THE LAWS OF PHYSICS." Every iota of movement calculated through physical law;
no cheap motion paths; smart, snappy, intentional; mass collects
center-and-down before liftoff; aware black-room environment (any desktop,
any size, eventually); believable drop shadow; dais gone; 2.5D mastery;
non-negotiable proofs of math thoroughness / only-decided-physics /
stochastic human-grade intelligence. One answer to all refinement:
**USE THE GOLDEN RATIO** — inferred and applied through synthesis of physics
and system design. RUN IT, deeper than planned, parallel streams.

## Ownership law (the environment verdict)

Physics encoding lives in BOTH, divided by ownership:
- **The environment owns the FIELD**: gravity, floor, bounds
  (resolution/environment-dependent), restitution, friction, epoch. It
  controls environmental physics (owner N5) and is the desktop portability
  seam — today the black-room stage, tomorrow any desktop at any size.
- **Gasper owns the BODY**: mass, contact solver, impulse generation, intent
  forces. Field-agnostic; he can move ONLY through the field's constraints.
- **The co-guarantee**: intent is proposed → the field decides what is
  possible → only lawful motion exists. There is no other write path.

## The φ-law (constants, all golden-ratio derived; φ = 1.6180339887)

| constant | value | derivation |
|---|---|---|
| canonical height h_G | 16.180 cm | 10φ cm — desk-companion body |
| pxPerMeter | homeHeightPx / 0.161803 | derived PER ENVIRONMENT (invariant body; bigger screen = bigger room) |
| gravity g_px | 9.81 × pxPerMeter (~9276 at home) | real gravity at toy scale → snappy BY LAW |
| restitution e | φ⁻¹ = 0.618034 | bounce heights fall in the golden series h·φ⁻²ⁿ |
| friction μ | φ⁻² = 0.381966 | Coulomb |
| settle ζ | φ⁻¹ = 0.618034 | underdamped, deliberate, alive |
| leg peak force | φ³·mg ≈ 4.236 bodyweights | launch authority |
| hop apices | {φ⁻³, φ⁻², φ⁻¹}·h_G | {0.236, 0.382, 0.618} × own height |
| loading stroke | δ = v₀²/(2(φ³−1)g) | MECHANICALLY REQUIRED — anticipation is law, not style (owner N3) |
| deliberation base | φ⁻² s ≈ 0.382 s | decision rhythm on the φ-ladder |
| integrator | semi-implicit Euler, dt = 1/240 s | fixed-step, organism clock sole time source |
| non-determinism | rotor-seeded chaos, golden-angle bearings | appears non-deterministic; proofs reproducible (S4 intact) |

## Streams (parallel, per owner order)

### Stream A — CanonOps grounding (research)
Ingest the missing shelf: character-controller physics (dynamic vs kinematic),
game-feel movement math (Swink; Celeste/Insomniac GDC movement talks),
anticipation-as-mechanics (COM loading, impulse generation), contact/constraint
solving for characters, volume-conserving squash as mass, physics acting
(Luxo Jr.), black-box staging with motivated light. Output: canon memo +
receipts under research/canon/, routed into this plan's constants.

### Stream B — BodyKernel + PhysicsField (engineering core)
`packages/desktop/src/gasper/physics/`:
- `phi.ts` — the φ-law constants above, single source, unit-tested.
- `PhysicsField.ts` — the environment contract: epoch, boundsPx (x/z/ceiling,
  from the live viewport), floor, g_px, e, μ, pxPerMeter; defaults = φ-law;
  environment may override; epoch increments on resize/change.
- `BodyKernel.ts` — the ONLY writer of pose: semi-implicit Euler @240 Hz,
  contact states (grounded/airborne), Coulomb friction, restitution impulses,
  the loading-stroke requirement, squash from impulse magnitude (emergent,
  volume-conserving), ζ-settle on landings, φ-ladder hop apices, intent API
  (`proposeIntent(force|impulse|goal)`) — NEVER positions.
- Provenance tag `physics-authority` mirrored through the TS↔AS3 fence.

### Stream C — Only-physics locks (the non-negotiable proofs, part 1+2)
- **Construction lock**: AST/grep absence gates — no write to worldPose /
  applied pose outside the kernel (the pupil-lock idiom generalized); the
  wander/life/pack/drag paths are rewritten to submit intent, proven by test.
- **Observation lock**: capture-side gate — between impulses, observed
  pixels must fit the ballistic/ODE solution within ε; landings match
  impulse-momentum; path-dragging becomes measurably impossible.
- **Math thoroughness**: integrator property suites — energy/momentum
  accounting within ε, no-penetration fuzz (10⁶ randomized steps),
  determinism twin-runs, dimensional-consistency lint on every constant.

### Stream D — Environment awareness + black room (render)
- StageWorld re-dress: lanes/pool/horizon/dais STRIPPED → black void; floor
  exists physically, reads only through the contact shadow + his glow.
- Believable drop shadow: penumbra model — size/softness/opacity computed
  from altitude + light; vector-only.
- Resize/change awareness: field epoch → re-locate (exact xyz in the
  environment frame) → awareness beat (he notices the new bound — glance at
  golden-angle bearing); measurable latency gate.
- 2.5D mastery: projection-law scale + floor-plane placement + shadow
  separation + glow falloff — depth read with zero set dressing.

### Stream E — Stochastic-intelligence battery (the non-negotiable proofs, part 3)
Long-run aperiodicity census (no periodicity across hours), perturbation-
response battery (resize ⇒ adaptive response within latency bound), decision-
timing signatures (deliberation→commit structure on the φ-ladder), behavioral
diversity census under the new physics. Rotor-seeded (S4 intact).

## Order (parallel streams, dependencies marked)

A runs alongside everything. B first (the core), C's locks scaffold beside B
and tighten as paths migrate, D integrates B into the renderer (needs B),
E runs against the integrated system (needs B+D). Witness + video sign-off at
every milestone; final take = long zero-command physics-authority performance.

## Guardrails (standing law, all in force)

S1–S6 from NORTHSTAR: golden ratio everywhere; video sign-off every turn;
owner-only visual acceptance; classification vocabulary; no commit without
owner confirmation; 5174 never touched without consent; captures
observer-only; vector-only; organism clock sole time source; reduced motion
collapses everything; no ambient Math.random; pupil-less face grammar.
Per stream: vitest scope + tsc + no-raster + triforce doctor + decision
record + state.json.

PHASE GATE: owner visual verdict, as always. Proof file:
research/proofs/gasper-physics-001/PHYSICS_PROOF.md.
