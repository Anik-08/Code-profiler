# Quick Start Guide - Code Energy Profiler

This guide will help you get the Code Energy Profiler up and running in minutes.

## ⚠️ IMPORTANT: Build Required!

**Before using the extension, you MUST build it first!** If you see "command not found" errors, follow the setup instructions below.

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- VS Code 1.85+

## Installation & Setup

### Option 1: Quick Setup (Recommended)

```bash
# Run the automated setup script
./setup.sh
```

This will:
1. Install Node.js dependencies
2. Build the TypeScript extension
3. Optionally train the ML model

### Option 2: Manual Setup

### 1. Clone and Install Dependencies

```bash
# Install Node.js dependencies (REQUIRED)
npm install

# Install Python dependencies (for API/ML features)
cd api
pip install -r requirements.txt
cd ..
```

**Note:** After `npm install`, you MUST run `npm run build` before the extension will work!

### 2. Train the ML Model

```bash
cd ml

# Generate synthetic training data
python generate_synthetic_dataset.py

# Train the LightGBM model
python train_model.py

# Export to ONNX format for the extension
python export_onnx.py

# Verify the pipeline works
python test_pipeline.py

cd ..
```

You should see:
```
✓ All tests passed!
```

### 3. Build the Extension

```bash
npm run build
```

### 4. Run the Extension

#### Option A: Test in VS Code Extension Development Host

1. Open this project in VS Code
2. Press `F5` to launch the Extension Development Host
3. In the new window, open `examples/sample_inefficient.py`
4. You should see colored bullets (●) marking energy hotspots

#### Option B: Package and Install

```bash
# Package the extension
npm install -g vsce
vsce package

# Install the .vsix file in VS Code
# Extensions → ... menu → Install from VSIX
```

## Using the Extension

### Basic Usage

1. **Open a Python/JavaScript file** with inefficient code patterns
2. **Energy hotspots are automatically detected** and shown as:
   - Colored bullets (● red/orange/yellow) in the editor
   - Diagnostics in the Problems panel
   - Hover tooltips with details

3. **View suggestions** by hovering over a hotspot
4. **Apply quick fixes**:
   - Click the lightbulb icon
   - Select the suggested fix
   - Preview the diff
   - Accept the changes

5. **View summary**:
   - Press `Cmd/Ctrl+Shift+P`
   - Run: "Code Energy Profiler: Show Energy Summary"
   - See overall score and hotspot table

### Example: String Concatenation Hotspot

**Before (Inefficient):**
```python
result = ""
for item in data:
    result += str(item) + ","  # ● Red hotspot here
```

**After Quick Fix:**
```python
parts = []
for item in data:
    parts.append(str(item) + ",")
result = "".join(parts)  # ✓ Optimized
```

## Configuration

Press `Cmd/Ctrl+Shift+P` → "Preferences: Open Settings (JSON)"

```json
{
  "codeEnergyProfiler.localOnly": true,
  "codeEnergyProfiler.remoteEndpoint": "http://localhost:8080",
  "codeEnergyProfiler.debounceMs": 500,
  "codeEnergyProfiler.severityThresholds": {
    "low": 0.3,
    "medium": 0.6,
    "high": 0.8
  }
}
```

### Settings Explained

- **localOnly**: Use local ONNX model only (no remote API calls)
- **remoteEndpoint**: URL for the FastAPI prediction service
- **debounceMs**: Delay before analyzing after typing stops
- **severityThresholds**: Scores that determine error/warning/info levels

## Using the Remote API (Optional)

For team deployments or more powerful models:

### 1. Start the API Server

```bash
cd api
uvicorn server:app --host 0.0.0.0 --port 8080
```

### 2. Update Extension Settings

```json
{
  "codeEnergyProfiler.localOnly": false,
  "codeEnergyProfiler.remoteEndpoint": "http://your-server:8080"
}
```

### 3. Test the API

```bash
# Health check
curl http://localhost:8080/health

# Example prediction
curl -X POST http://localhost:8080/v1/predict \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "languageId": "python",
      "tokenCount": 500,
      "loopCount": 5,
      "nestedLoopDepth": 2,
      "stringConcatOps": 3,
      "listScanOps": 10,
      "functionCount": 3,
      "avgFunctionLength": 100,
      "hotspotsSeeds": [],
      "version": "0.1.0"
    }
  }'
```

## Testing

### Run Unit Tests

```bash
npm test
```

### Test with Example Files

1. Open `examples/sample_inefficient.py` in the Extension Development Host
2. Should see multiple hotspots detected:
   - String concatenation in loop
   - Nested loops
   - List membership scans
   - Inefficient recursion
   - Memory-intensive operations

3. Compare with `examples/sample_optimized.py` to see improvements

### Verify ML Pipeline

```bash
cd ml
python test_pipeline.py
```

## Commands

- `Code Energy Profiler: Analyze Current File` - Force analysis
- `Code Energy Profiler: Show Energy Summary` - Open summary panel
- `Code Energy Profiler: Toggle Local-only Mode` - Enable/disable remote API

## Common Hotspot Patterns

The profiler detects these energy-inefficient patterns:

1. **Nested Loops** (Score: 0.4-0.8)
   - Suggests: Use sets/dicts for O(1) lookups

2. **String Concatenation in Loops** (Score: 0.3-0.6)
   - Suggests: Use join() method

3. **Repeated List Membership Tests** (Score: 0.25-0.5)
   - Suggests: Convert to set

4. **Unoptimized Recursion** (Score: 0.35-0.7)
   - Suggests: Add memoization (@lru_cache)

5. **Memory-Intensive Operations** (Score: 0.3-0.5)
   - Suggests: Use generators

## Troubleshooting

### Extension not showing hotspots?

1. Check the language is supported (Python, JS, TS, Java)
2. Verify the code has inefficient patterns
3. Check Output panel (View → Output → "Code Energy Profiler")
4. Try "Analyze Current File" command

### ONNX model not loading?

1. Verify `model_artifacts/energy_model.onnx` exists
2. Run: `cd ml && python export_onnx.py`
3. Check extension logs in Output panel

### Remote API not working?

1. Verify API server is running: `curl http://localhost:8080/health`
2. Check `localOnly` setting is `false`
3. Check firewall/network settings
4. View API logs for errors

## Performance Tips

- **Local-only mode**: Fastest, no network latency
- **Cache**: Results are cached for 256 files
- **Debounce**: Increase `debounceMs` for slower machines
- **Remote API**: Use for shared team models

## Next Steps

- Read [ARCHITECTURE_IMPLEMENTATION.md](ARCHITECTURE_IMPLEMENTATION.md) for technical details
- Explore [docs/](docs/) for more documentation
- Customize suggestion rules in `src/suggestions/rules.ts`
- Train models on your own codebase

## Support

- GitHub Issues: Report bugs and feature requests
- Documentation: See `docs/` directory
- Examples: Check `examples/` for sample code

## License

MIT - See LICENSE file
