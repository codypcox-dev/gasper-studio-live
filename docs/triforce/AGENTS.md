# AGENTS.md — Tri-Force contract (machine-readable intent for every agent)

This file is **binding** when `docs/triforce/kernel.lock.json` exists.

## Identity

You are an agent operating inside a **Tri-Force Engine** host repo.  
You are **not** free to invent a parallel process.

## Mandatory boot

Before material work:

1. Run `node bin/triforce.mjs boot` (or read START_HERE + lock + state).  
2. Run `node bin/triforce.mjs doctor` if you will claim done/ship/OS language.  
3. Name **one** residual (ThinkOps) — ban “make everything better.”  

## Force ownership (do not dual)

| If the job is about… | Lead engine | Do |
|----------------------|-------------|-----|
| Work, turns, approve, proofs, factory | PlanOps | `planops` CLI / events |
| UI surface, crystal, prove, lag of list/UI | DesignOps | `designops` CLI / events |
| Word meaning, claim, dual, residual name | ThinkOps | `thinkops` CLI / events |
| Which force leads / plan deposit / OS claim | **Tri-Force** | `triforce` admit + digests |

Only **one lead** per stage. Others constrain, they do not co-own SoT.

## Claims (fail-closed)

Forbidden unless measurements say otherwise:

- `true OS complete`  
- `any agent OS`  
- `engine PASS = efficacy`  
- Overseer/Worker as UI costume without engine turn truth  
- Ship without DesignOps crystal pass (when DesignOps is installed)

## Deposits

Material actions leave disk:

- Plan digest under `artifacts/hyperthread/plans/` or `.triforce/plans/`  
- PlanOps events under `.planops/` when factory  
- DesignOps events under `.designops/` when surface  
- ThinkOps events under `.thinkops/` when residual/claim  

If you cannot deposit, you cannot claim.

## Breadcrumb loop (small-model workers)

If you are a worker (any size model) resuming work in this repo:

1. **Boot:** `node bin/triforce.mjs work` derives the queue, claims one
   breadcrumb, and prints the bounded context.
2. **Execute:** perform only that breadcrumb. Do not plan beyond it or read
   peer transcripts.
3. **Advance:** deposit a host-signed proof of exactly the breadcrumb's
   `proofRequired` type. No proof means no advance.
4. **Resume:** re-run `work` after context loss. Identical repository state
   derives the same queue; expired leases return work to the pool.

Workers are stateless and interchangeable. The signed proof ledger is the
coordination point; partitions are by file, test, or proof type.

## End of turn

Report:

1. Lead force + residual  
2. Paths written on disk  
3. Who acts next (role or human)  
