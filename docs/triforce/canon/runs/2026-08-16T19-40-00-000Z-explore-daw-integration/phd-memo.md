# CanonOps PHD — explore · daw-integration

Earned under N20 / N335.
Date: 2026-08-16T19:40:00.000Z
Tri-Force: 3.0.0

## 1. THE WALL

Five products hide under “DAW integration.” Gasper already has a session/arrangement law and one organism clock. It has no wire.

## 2. WHAT “CUSTOM DAW” CAN MEAN

| # | Product | Lawful here? |
|---|---|---|
| 1 | Gasper **is** the DAW (Session clips / Arrangement) | Yes — already written |
| 2 | OSC launch from Live / Bitwig / Max | Yes |
| 3 | Web MIDI note → take | Yes |
| 4 | Named-organ CC (Skin only) | Yes, fenced |
| 5 | Tempo follow (MIDI clock / Link → VEC-401) | Yes, follower only |
| 6 | Audio listen (FFT → energy) | Yes, no contour write |
| 7 | VST3 / AU inside Live | No — this preview is a browser |
| 8 | OTIO export | Yes, offline |

## 3. THE CLOCK LAW

VEC-401 is the only dispatch. Link or MIDI clock may **feed** it. They may not sit beside it. Two tickers is the opening shake again.

## 4. HIGHEST-VALUE WIRE (not written)

OSC + Web MIDI that only call `playAuthoredTake` and `applySkinTake`.

```
/gasper/take/{id}
/gasper/skin/neutral|puff|goose
/gasper/state/{eight}
```

That is how Resolume sits next to Live. Launch and clock. Not a remesh.

## 5. NOT THIS RECEIPT

Explore only. No socket. No MIDI. No VST.
