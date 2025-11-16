# Demo Script

## Goal

Show transformation from inefficient code to optimized version with reduced predicted energy score.

## Steps

1. Open `bad_example.py`:

```python
result = ""
items = list(range(10000))
for i in items:
    for j in items:
        result += str(i*j)  # concatenation
    if i in items:  # membership scan
        pass
```

2. Observe hotspots (two nested loops + string concat).
3. Hover over red decoration: see suggestion.
4. Open Command Palette: "Code Energy Profiler: Show Energy Summary" (note file score).
5. Trigger Quick Fix on diagnostic (string concatenation rule).
6. Patch preview appears; accept rewrite.
7. Summary panel updates with improved score (simulate recompute).
8. Optional timing: run `python scripts/measure_energy.py optimized_example.py`.

## Talking Points

- Real-time static hints lower iteration time.
- Extensible model backend (heuristic → ML).
- Privacy-first (local-only).
- Future: multi-language, dynamic energy correlation.

## Backup Plan

If patch preview fails, show OutputChannel with suggested snippet.

## Final Slide

Before vs After side-by-side + predicted delta %.
