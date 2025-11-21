import * as vscode from 'vscode';
import { PredictionResult } from '../types';

let panel: vscode.WebviewPanel | null = null;

export function showSummary(result: PredictionResult) {
  if (!panel) {
    panel = vscode.window.createWebviewPanel(
      'codeEnergySummary',
      'Code Energy Summary',
      vscode.ViewColumn.Beside,
      { enableScripts: true },
    );
    panel.onDidDispose(() => (panel = null));
  }
  panel.webview.html = renderHtml(result);
}

function renderHtml(result: PredictionResult) {
  const rows = result.hotspots
    .map(
      (h, i) => `<tr>
    <td>${i}</td>
    <td>${h.start.line}-${h.end.line}</td>
    <td>${h.score.toFixed(2)}</td>
    <td>${h.estimate_mJ ?? '—'}</td>
    <td>${(h.confidence ?? 0).toFixed(2)}</td>
  </tr>`,
    )
    .join('');
  return `<!DOCTYPE html>
<html>
<head>
<style>
body { font-family: system-ui, sans-serif; padding: 1rem; }
table { border-collapse: collapse; width:100%; }
th, td { border:1px solid #ccc; padding:4px; font-size:12px; }
th { background:#f5f5f5; }
.score { font-size: 1.4rem; font-weight: bold; }
</style>
</head>
<body>
  <h2>File Energy Summary</h2>
  <div class="score">File Score: ${result.fileScore.toFixed(3)}</div>
  <p>Model: ${result.modelVersion}</p>
  <table>
    <thead><tr><th>#</th><th>Lines</th><th>Score</th><th>Est (mJ)</th><th>Conf</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}