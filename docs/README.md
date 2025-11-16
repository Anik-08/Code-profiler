# Code Energy Profiler (Hackathon Edition)

## Overview

This VS Code extension identifies **energy hotspots** (structural inefficiencies) and provides **actionable suggestions** with one-click rewrites. Initial approach is heuristic + rule-based; model swap is pluggable (ONNX support).

## Features

- Hotspot detection: loops, nested loops, string concatenation in loops, list membership scans.
- Inline decorations + diagnostics with severity coloring.
- Quick Fix suggestions (convert string += to join; list scans → set; nested loops → set/dict precomputation).
- Summary panel (score, hotspot table).
- Configurable thresholds & local-only mode.
- Optional remote API (FastAPI) for predictions.

## Getting Started

1. `npm install`
2. `npm run build`
3. Open in VS Code → F5 (Extension Development Host).
4. Open a Python or JS file containing inefficient patterns.
5. See colored bullets (●) marking hotspots; hover for details.
6. Use `Code Energy Profiler: Analyze Current File` or automatically triggered by edits.

## Commands

- `Analyze Current File`
- `Show Energy Summary`
- `Toggle Local-only Mode`
- (Internal) `previewRewrite`, `applyRewrite` invoked by Quick Fix actions.

## Configuration

`codeEnergyProfiler.localOnly` (bool): disables remote calls.
`codeEnergyProfiler.remoteEndpoint`: URL for FastAPI server.
`codeEnergyProfiler.debounceMs`: analysis debounce.
`codeEnergyProfiler.severityThresholds`: object with low/medium/high.
`codeEnergyProfiler.showPatchPreview`: show diff before rewrite.

## Model Integration

Place `energy_model.onnx` in `model_artifacts/`. Future: load at activation.

## Remote API

Run:

```bash
cd api
pip install -r requirements.txt
uvicorn server:app --reload --port 8080
```

Update `remoteEndpoint` settings accordingly.

## Testing

```bash
npm test
```

## Hackathon Demo Flow

See `DEMO_SCRIPT.md`.

## Privacy

Local-only mode ensures no code leaves machine. Telemetry off by default; anonymized derived metrics only.

## Roadmap

- Tree-sitter parsing
- ONNX model load
- JavaScript advanced rules
- Real energy measurement (RAPL)

## Contributing

Open issues for enhancements; PR policy: small, focused changes.

## License

MIT (add license file as needed)
