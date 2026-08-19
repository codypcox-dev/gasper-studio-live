# E2 — shadow canal sample, pointer not swapped

**Residual:** `plan-table = measurement`  
**Restore before this:** `checkpoint-e1-skeleton-20260818`  
**Law:** `NORTHSTAR-ENVELOPE.md` · wave E2

## Fit (locked)

| node | xy | r | regularity |
|---|---|---|---|
| crown | (120, 112) | 82 | — |
| torso | (120, 140) | 56 | \|56−82\|=26 < L=28 |
| crotch | (120, 172) | 25 | \|25−56\|=31 < L=32 ; r ≤ h−6 |
| plant | (100/140, 188) | 15 | \|15−25\|=10 < L=25.6 |

Costume `(58, 64, 8, 8)` refused.

## Gates

| Gate | Live `#body` | Shadow envelope |
|---|---|---|
| height | **173.70** unchanged | 172.44 |
| crown y | 30.19 | 30.00 |
| floor y | 203.41 | 202.44 |
| cleft | (123.7, 195.3) | n/a (not extracted) |
| n | 1000 live cage | 1000 shadow |
| paint | 4 isobands, `#body` spline | not fed |

Shadow is slimmer than the gauss pearl (torso ball width 112 vs live ~156). That is physical law, not a bug. Do not “fix” paint to match the shadow.

## Not this wave

E3 interiors of `liveGridXYZ`. Ring 24 stays glued to the 512.
