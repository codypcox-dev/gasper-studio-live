# PlanOps START HERE

Kernel: **PlanOps Engine 4.0.0**

## Boot (3 reads only)

1. `docs/planops/kernel.lock.json`
2. `docs/planops/state.json`
3. Role inbox: `.planops/inbox/<role>/`

Then run:

```bash
npx planops boot --role <role> --host <ide>
npx planops status
```

## Law

`transition(state, packet, capability, proofs) → Ok | Blocked`

Events in `.planops/events.jsonl` are the only durable truth.
`state.json` is a pure projection.

## Multi-IDE

Any agent in any IDE that has this repo open shares the same engine.
Claim a lease before acting. Deliver work via packets, not clipboard.
