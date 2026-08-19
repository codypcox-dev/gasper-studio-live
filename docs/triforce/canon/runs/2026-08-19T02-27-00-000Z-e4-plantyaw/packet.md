# E4 — plant-yaw

**Restore before this:** `checkpoint-e3-interiors-20260818`  
**Law:** `NORTHSTAR-ENVELOPE.md` §5 · wave E4

## Cut

- `rotateAboutM` — world-Y through the live plant midpoint. Interiors only.
- Ring 24 stays the live 512. `#body` not extracted.
- Centroid `facingCompress` squash is dead. Dataset locked at `1.0000`.
- `authorKeyViewPoint` kept (do not kill two yaws vs face invert in this commit).
- No `rotateViewXYZ` / Mesh3D import.

## Gates

| Gate | Result |
|---|---|
| `#body` height | **173.70** at rest, walk, and yaw attempts |
| plant Y | **203.4 / 203.4** — floor does not tip |
| cleft | (123.7, 195.3) |
| facingCompress | **1.0000** |
| bind | e4 |
| face | held |
| rotateAboutM(120,30,82) @ 42° | x → ~176, y stays 30 |

## Residual

Studio orbit host rewrites `setYaw` every frame (~8°). Film `setYaw(42)` does not stick until the orbit card moves. Plant-yaw follows `effectiveViewYaw`, so the orbit slider is the lawful turn. Do not chase host in this wave.

Next is E5 (gait writes plants only).
