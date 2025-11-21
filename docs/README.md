# Code Energy Profiler (VS Code Extension)

This extension identifies energy hotspots (structural inefficiencies) and provides actionable suggestions with one-click rewrites. Initial approach is heuristic + rule-based; optional remote API is available.

## Features

- Hotspot detection: loops, nested loops, string concatenation in loops, list membership scans.
- Comment-aware analysis: Comments and blank lines are excluded from energy analysis to ensure accurate results.
- Inline decorations + diagnostics with severity coloring.
- Quick Fix suggestions (convert string += to join; list scans → set; nested loops → set/dict precomputation).
- Summary panel with interactive Preview/Apply buttons for one-click rewrites.
- Energy estimates: Displays model-predicted energy consumption in millijoules (mJ) when available, with intelligent distribution across hotspots.
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

- **Analyze Current File**: Manually trigger analysis on the current file.
- **Show Energy Summary**: Display a detailed summary table with all hotspots, energy estimates, and actionable buttons.
  - Use "Preview" to see the proposed code changes in a diff view.
  - Use "Apply" to immediately apply the suggested rewrite.
- **Toggle Local-only Mode**: Switch between local heuristic/ONNX inference and remote API predictions.
- (Internal) previewRewrite, applyRewrite: Invoked by Quick Fix actions and summary table buttons.

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

## Energy Estimates

The extension provides two types of energy metrics:

1. **File Score** (0-1): A normalized score indicating overall code inefficiency.
2. **Estimated Energy (mJ)**: When using a trained model (remote API or local ONNX), the extension displays actual energy estimates in millijoules.
   - Model predictions are distributed across hotspots proportionally to their importance scores.
   - If no model estimate is available, a scaled approximation based on file score is shown.

Comments and blank lines are automatically excluded from analysis to ensure accurate energy measurements.

## Privacy

Local-only mode ensures no code leaves the machine. Telemetry is off by default and, when enabled, writes anonymized events to an Output channel.

## Roadmap

- Tree-sitter parsing
- ONNX model load
- JavaScript advanced rules
- Real energy measurement (RAPL)

## License

MIT