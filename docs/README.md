# Code Energy Profiler (VS Code Extension)

This extension identifies energy hotspots (structural inefficiencies) and provides actionable suggestions with one-click rewrites. Initial approach is heuristic + rule-based; optional remote API is available.

## Features

- Hotspot detection: loops, nested loops, string concatenation in loops, list membership scans.
- Inline decorations + diagnostics with severity coloring.
- Quick Fix suggestions (convert string += to join; list scans → set; nested loops → set/dict precomputation).
- Summary panel (score, hotspot table).
- Configurable thresholds & local-only mode.
- Optional remote API (FastAPI) for predictions.

## Getting Started

1. npm install
2. npm run build
3. Open in VS Code → F5 (Extension Development Host).
4. Open a Python or JS file containing inefficient patterns.
5. See colored bullets (●) marking hotspots; hover for details.
6. Use “Code Energy Profiler: Analyze Current File” or rely on automatic analysis on edits.

## Commands

- Analyze Current File
- Show Energy Summary
- Toggle Local-only Mode
- (Internal) previewRewrite, applyRewrite invoked by Quick Fix actions.

## Configuration

- codeEnergyProfiler.localOnly (bool): disables remote calls.
- codeEnergyProfiler.remoteEndpoint: URL for FastAPI server.
- codeEnergyProfiler.debounceMs: analysis debounce.
- codeEnergyProfiler.severityThresholds: object with low/medium/high.
- codeEnergyProfiler.showPatchPreview: show diff before rewrite.
- codeEnergyProfiler.enableTelemetry: opt-in anonymized telemetry to the Output panel.

## Optional Remote API

Run:

```bash
cd api
pip install -r requirements.txt
uvicorn server:app --reload --port 8080
```

Update remoteEndpoint accordingly and disable local-only mode if you add remote integration later.

## Testing

```bash
npm test
```

## Privacy

Local-only mode ensures no code leaves the machine. Telemetry is off by default and, when enabled, writes anonymized events to an Output channel.

## Roadmap

- Tree-sitter parsing
- ONNX model load
- JavaScript advanced rules
- Real energy measurement (RAPL)

## License

MIT