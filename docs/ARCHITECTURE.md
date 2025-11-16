# Architecture (Condensed)

## Components

- Extension (TypeScript)
- Analyzer (heuristic; future: tree-sitter)
- Scoring Engine (heuristic; pluggable ONNX)
- Suggestion Engine (rule-based)
- UI (diagnostics, Webview summary)
- Remote API (optional FastAPI)
- ML Pipeline (synthetic dataset → LightGBM → ONNX export)
- Energy Measurement Script (timing proxy; stretch)

## Flow

Edit → Debounce → Analyze → Score → Map Suggestions → Render → (User applies rewrite) → Re-analyze.

## Extensibility Points

- Replace heuristic with tree-sitter feature extraction.
- Swap scoring with advanced ML model.
- Add new rules to `rules.ts`.
- Add remote inference call inside `extension.ts` if `localOnly=false`.

## Non-functional

- Latency target <500ms heuristic.
- Privacy: local-only path default.
- Modularity: each domain separated by folder.

## Future

- CFG/Call graph integration
- Per-line attribution gradient
- Telemetry aggregation service
- Multi-language advanced parsers
