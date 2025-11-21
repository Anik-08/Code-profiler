# Code Energy Profiler - Complete Architecture Implementation

## Overview

This project implements a complete energy profiling system for code with ML-based predictions and intelligent suggestions. The architecture follows a modular design with clear separation of concerns.

## High-Level Architecture Components

### 1. IDE Plugin / Extension (VS Code)
**Location:** `src/extension.ts`

The extension runs inside VS Code and provides:
- Real-time code analysis on document changes
- Inline decorations showing energy hotspots
- Diagnostics with severity levels (Error/Warning/Info)
- Quick Fix suggestions with one-click rewrites
- Summary panel showing overall energy metrics
- Configurable thresholds and settings

**Features:**
- Debounced analysis (configurable delay)
- LRU cache for predictions (256 entries)
- Support for Python, JavaScript, TypeScript, and Java
- Local-only mode or remote API integration

### 2. Static Analyzer
**Location:** `src/analyzer/`

The analyzer parses code and extracts syntactic and semantic features:

**Components:**
- `index.ts` - Main entry point, language detection
- `pythonAnalyzer.ts` - Python-specific analysis
- `jsAnalyzer.ts` - JavaScript/TypeScript analysis
- `javaAnalyzer.ts` - Java analysis
- `heuristics.ts` - Pattern-based feature extraction

**Extracted Features:**
- Token count
- Loop count and nesting depth
- String concatenation operations
- List/membership scan operations
- Function count and average length
- Conditional statements count
- Recursion detection
- Memory allocation operations

**AST/CFG Integration:**
The analyzer uses regex-based heuristics currently, with hooks for tree-sitter integration for more accurate AST parsing.

### 3. Feature Extractor
**Location:** `src/analyzer/heuristics.ts`

Converts code analysis into model-ready feature vectors:

```typescript
interface FeatureVector {
  languageId: string;
  tokenCount: number;
  loopCount: number;
  nestedLoopDepth: number;
  stringConcatOps: number;
  listScanOps: number;
  functionCount: number;
  avgFunctionLength: number;
  hotspotsSeeds: Range[];
  conditionalCount?: number;
  recursionPotential?: number;
  memoryOps?: number;
}
```

### 4. Prediction API (Inference Service)
**Location:** `api/server.py`

FastAPI-based REST service that serves the trained ML model:

**Endpoints:**
- `GET /health` - Health check with model status
- `POST /v1/predict` - Energy prediction endpoint

**Model Support:**
- Primary: LightGBM regressor trained on synthetic data
- Fallback: Heuristic scoring function
- Returns: File-level score + per-block hotspot predictions

**Features:**
- Automatic model loading from `ml/energy_model.pkl`
- Contextual suggestions based on code patterns
- Confidence scores for predictions
- Energy estimates in millijoules (mJ)

### 5. ML Model (ONNX Format)
**Location:** `model_artifacts/energy_model.onnx`

**Training Pipeline:**
1. Generate synthetic dataset (`ml/generate_synthetic_dataset.py`)
2. Train LightGBM model (`ml/train_model.py`)
3. Export to ONNX format (`ml/export_onnx.py`)

**Model Features:**
- Input: 6 features (loops, depth, concat ops, scan ops, function count, avg length)
- Output: Energy score (0-10, normalized to 0-1)
- Algorithm: LightGBM Regressor
- Performance: R² = 0.90, MAE = 0.46

**ONNX Integration:**
- Runs locally in VS Code extension via `onnxruntime-node`
- Low latency (<100ms per prediction)
- CPU-only inference

### 6. Suggestion Engine
**Location:** `src/suggestions/`

Hybrid rule-based + ML-based system for actionable recommendations:

**Components:**
- `engine.ts` - Matches features to applicable rules
- `rules.ts` - Catalog of optimization patterns
- `applyRewrite.ts` - Code transformation logic
- `patchPreview.ts` - Diff preview before applying

**Suggestion Rules:**
1. **Nested Loop Optimization** - Convert to set/dict lookups
2. **String Concatenation** - Use join() instead of +=
3. **List Scan to Set** - Replace membership tests
4. **Recursion Memoization** - Add caching decorators
5. **Memory Optimization** - Use generators

Each rule includes:
- Matching criteria (when to suggest)
- Rewrite pattern (how to fix)
- Estimated energy delta (potential improvement)
- Before/after examples

### 7. Training Pipeline
**Location:** `ml/`

Complete ML workflow for model training:

**Scripts:**
- `generate_synthetic_dataset.py` - Creates 2000 synthetic code samples
- `train_model.py` - Trains LightGBM model with cross-validation
- `export_onnx.py` - Exports to ONNX for deployment
- `test_pipeline.py` - Validates entire ML pipeline

**Dataset Schema:**
```csv
loopCount, nestedLoopDepth, stringConcatOps, listScanOps, functionCount, avgFunctionLength, energyLabel
```

**Future Enhancements:**
- Real energy measurements using RAPL/PowerAPI
- Benchmark workloads (sorting, searching, graph algorithms)
- Per-line energy attribution
- Cross-language model training

### 8. Telemetry & Feedback Store
**Location:** `src/telemetry/telemetry.ts`

Collects anonymized usage data (opt-in):

**Events Tracked:**
- Analysis requests (file score, hotspot count)
- Suggestion acceptance/rejection
- Model version used
- Performance metrics

**Privacy:**
- Disabled by default
- No code content transmitted
- Local logging to VS Code Output panel
- Future: Aggregation service for model improvement

### 9. Cache / Local Model
**Location:** `src/extension.ts` (LRU cache)

**Caching Strategy:**
- QuickLRU cache (256 entries max)
- Cache key: URI + content hash + config
- Invalidation on document changes
- Reduces duplicate analysis

**Local Model Priority:**
1. Use cache if available
2. Try remote API (if enabled)
3. Try ONNX model (if loaded)
4. Fallback to heuristic scoring

## Data Flow

```
User Types Code
    ↓
Debounced Analysis Trigger
    ↓
Document → Static Analyzer → Feature Vector
    ↓
Cache Check → [Cache Hit? Return]
    ↓
[Cache Miss]
    ↓
Remote API (if enabled) → Prediction
    ↓ [Fallback]
ONNX Model (local) → Prediction
    ↓ [Fallback]
Heuristic Scoring → Prediction
    ↓
Suggestion Engine → Enrich with Recommendations
    ↓
Cache Result
    ↓
Render Diagnostics + Decorations
    ↓
User Sees Hotspots + Suggestions
    ↓
User Applies Quick Fix
    ↓
Re-analyze Updated Code
```

## Configuration

### Extension Settings (`.vscode/settings.json`)

```json
{
  "codeEnergyProfiler.localOnly": true,
  "codeEnergyProfiler.remoteEndpoint": "http://localhost:8080",
  "codeEnergyProfiler.debounceMs": 500,
  "codeEnergyProfiler.enableTelemetry": false,
  "codeEnergyProfiler.severityThresholds": {
    "low": 0.3,
    "medium": 0.6,
    "high": 0.8
  },
  "codeEnergyProfiler.showPatchPreview": true
}
```

## Running the System

### 1. Build Extension
```bash
npm install
npm run build
```

### 2. Train ML Model
```bash
cd ml
python generate_synthetic_dataset.py
python train_model.py
python export_onnx.py
python test_pipeline.py
```

### 3. Start API Server (Optional)
```bash
cd api
pip install -r requirements.txt
uvicorn server:app --reload --port 8080
```

### 4. Run Extension
- Open project in VS Code
- Press F5 to launch Extension Development Host
- Open a Python/JS file with inefficient code
- See hotspots highlighted inline

## Testing

### Unit Tests
```bash
npm test
```

Tests cover:
- Analyzer feature extraction
- Scoring algorithms
- Suggestion matching
- Cache behavior

### API Tests
```bash
# Health check
curl http://localhost:8080/health

# Prediction
curl -X POST http://localhost:8080/v1/predict \
  -H "Content-Type: application/json" \
  -d @test_request.json
```

### ML Pipeline Test
```bash
cd ml
python test_pipeline.py
```

## Performance Metrics

- **Analysis Latency:** <100ms (heuristic), <150ms (ONNX), <300ms (remote)
- **Cache Hit Rate:** >80% for typical editing sessions
- **Model Accuracy:** R² = 0.90 on synthetic data
- **Memory Usage:** <50MB (extension + ONNX runtime)

## Security & Privacy

- **Local-only mode** (default): No data leaves the machine
- **Remote API**: Only features sent, never source code
- **Telemetry**: Opt-in, anonymized, no PII
- **Model**: Open source, auditable weights

## Future Roadmap

1. **Advanced AST Parsing**
   - Integrate tree-sitter for all languages
   - Build full CFG and call graphs
   - Track data flow for better hotspot attribution

2. **Real Energy Measurements**
   - RAPL integration on Linux
   - PowerAPI for cross-platform support
   - Benchmark suite with known energy profiles

3. **Enhanced ML Models**
   - Per-language specialized models
   - Transformer-based code embeddings
   - Fine-tuning on real-world codebases

4. **IDE Integrations**
   - JetBrains plugin
   - Visual Studio extension
   - Web-based editor support

5. **Collaborative Features**
   - Team dashboards
   - Energy budgets per project
   - Historical trend analysis

## Contributing

See individual component README files in:
- `src/` - Extension development
- `ml/` - Model training
- `api/` - API server
- `docs/` - Additional documentation

## License

MIT - See LICENSE file for details
