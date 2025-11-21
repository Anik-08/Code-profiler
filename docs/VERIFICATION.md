# Verify the Extension Works

Follow these steps to build, test, launch, and smoke‑test the Code Energy Profiler VS Code extension.

## 1) Install & Build

- Ensure VS Code and Node.js (>=18) are installed.
- From the project root, install dependencies and build:

```
npm install
npm run build
```

## 2) Run Unit Tests (optional)

```
npm test
```

If tests fail, open `src/test/*.test.ts` to inspect; the build step above should still produce `out/` for debugging.

## 3) Launch the Extension (Debug)

- Open this folder in VS Code.
- Press `F5` (Run → Start Debugging) to start "Extension Development Host".
- In the new VS Code window (Extension Host), open a Python, JavaScript, or TypeScript file with a loop or heavy processing.

## 4) Trigger Analysis

Use any of these to make the analyzer run:

- Save or edit the file (debounced by `codeEnergyProfiler.debounceMs`).
- Command Palette → `Code Energy Profiler: Analyze Current File`.

Expected results:

- Diagnostics panel shows entries from source `Code Energy Profiler` with hotspot severities.
- Inline dot decorations appear at hotspot lines (colored by severity).
- Hovering the dot shows a tooltip with score, confidence, estimate, and suggestion (if available).

## 5) View Summary & Toggle Modes

- Command Palette → `Code Energy Profiler: Show Energy Summary` to open summary panel.
  - The summary panel displays:
    - File score and total energy estimate (in mJ when available)
    - Table of all hotspots with their line ranges, scores, energy estimates, and suggestions
    - **Preview** and **Apply** buttons for each hotspot with actionable suggestions
  - Click **Preview** to see a diff view of the proposed code change
  - Click **Apply** to immediately apply the suggested rewrite to your code
- Command Palette → `Code Energy Profiler: Toggle Local-only Mode` to switch between local heuristic/ONNX and remote API usage.

Related settings (File → Preferences → Settings):

- `codeEnergyProfiler.localOnly` (default: true)
- `codeEnergyProfiler.remoteEndpoint` (Prediction API URL)
- `codeEnergyProfiler.debounceMs` (analysis throttle)
- `codeEnergyProfiler.enableTelemetry` (opt-in)

## 6) Optional: Run the Local API

If you want to test remote inference locally:

```
cd api
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python server.py
```

Then set `codeEnergyProfiler.localOnly=false` and `codeEnergyProfiler.remoteEndpoint=http://127.0.0.1:8080` in VS Code settings.

## 7) Troubleshooting

- No decorations or diagnostics:
  - Make sure the opened file language is Python/JavaScript/TypeScript.
  - Run `Code Energy Profiler: Analyze Current File` explicitly.
  - Check for errors in `Developer Tools` (Help → Toggle Developer Tools).
- Commands not found:
  - Ensure you launched in an Extension Development Host (via F5).
  - Rebuild (`npm run build`) then re-run F5.
- Remote API errors:
  - Verify the service URL and that the server is running.

## 8) What to Look for in Code

To trigger hotspots quickly, create a snippet with nested loops or repeated string concatenation; then run `Analyze Current File`. You should see diagnostics and a heatmap-like decoration near the loops.

**Note on Comments**: The analyzer automatically excludes comments and blank lines from energy analysis. This means:
- Comment-only sections will not be flagged as hotspots
- Hotspot ranges avoid spanning pure comment lines
- Energy estimates are based only on executable code

Test this by adding comments before/after loops and verifying they don't affect the analysis.
