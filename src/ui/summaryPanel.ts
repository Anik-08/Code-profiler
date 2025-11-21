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

    panel.webview.onDidReceiveMessage(async (msg) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        console.warn('[summaryPanel] No active editor for message:', msg?.type);
        return;
      }

      if (msg?.type === 'preview' || msg?.type === 'apply') {
        const { start, end, ruleId } = msg;
        
        // Defensive checks for missing or invalid data
        if (!ruleId) {
          console.warn('[summaryPanel] Missing ruleId in message:', msg);
          vscode.window.showWarningMessage('Cannot perform action: missing rule identifier');
          return;
        }
        
        if (!start || !end || 
            typeof start.line !== 'number' || typeof end.line !== 'number' ||
            (start.character !== undefined && typeof start.character !== 'number') ||
            (end.character !== undefined && typeof end.character !== 'number')) {
          console.warn('[summaryPanel] Invalid range in message:', msg);
          vscode.window.showWarningMessage('Cannot perform action: invalid code range');
          return;
        }

        const range = new vscode.Range(
          new vscode.Position(start.line, start.character ?? 0),
          new vscode.Position(end.line, end.character ?? 0),
        );

        try {
          if (msg.type === 'preview') {
            await vscode.commands.executeCommand('codeEnergyProfiler.previewRewrite', ruleId, editor.document, range);
          } else {
            await vscode.commands.executeCommand('codeEnergyProfiler.applyRewrite', ruleId, editor.document, range);
          }
        } catch (err) {
          console.error('[summaryPanel] Command execution failed:', err);
          vscode.window.showErrorMessage(`Failed to ${msg.type} rewrite: ${err}`);
        }
      }
    });
  }
  panel.webview.html = renderHtml(result);
}

function renderHtml(result: PredictionResult) {
  const rows = result.hotspots
    .map((h, i) => {
      const suggestion = h.suggestion ?? '—';
      const delta = h.deltaScore ? `${(h.deltaScore * 100).toFixed(1)}%` : '—';
      const ruleId = h.ruleId ?? '';
      const canAct = !!ruleId && !!h.suggestion;

      return `<tr>
        <td>${i}</td>
        <td>${h.start.line}-${h.end.line}</td>
        <td>${h.score.toFixed(2)}</td>
        <td>${h.estimate_mJ ?? '—'}</td>
        <td>${(h.confidence ?? 0).toFixed(2)}</td>
        <td>${escapeHtml(suggestion)}</td>
        <td>${delta}</td>
        <td>
          ${canAct
            ? `<button data-idx="${i}" data-action="preview">Preview</button>
               <button data-idx="${i}" data-action="apply">Apply</button>`
            : ''}
        </td>
      </tr>`;
    })
    .join('');

  // Serialize hotspots needed fields for actions
  const hsPayload = JSON.stringify(
    result.hotspots.map((h) => ({
      start: h.start,
      end: h.end,
      ruleId: h.ruleId,
    })),
  );

  const energyDisplay = result.estimated_mJ 
    ? `${result.estimated_mJ.toFixed(1)} mJ` 
    : `~${(result.fileScore * 1000).toFixed(1)} mJ (scaled)`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  body { font-family: system-ui, sans-serif; padding: 1rem; }
  table { border-collapse: collapse; width:100%; }
  th, td { border:1px solid #ccc; color: #000; padding:6px; font-size:12px; vertical-align: top; }
  th { background:#f5f5f5; }
  td { color: #eee; }
  .score { font-size: 1.2rem; font-weight: 600; margin-bottom: .5rem; }
  button { padding: 4px 8px; margin-right: 4px; }
</style>
</head>
<body>
  <h2>File Energy Summary</h2>
  <div class="score">File Score: ${result.fileScore.toFixed(3)} | Energy: ${energyDisplay}</div>
  <p>Model: ${result.modelVersion}</p>

  <h3>Hotspots & Suggestions</h3>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Lines</th><th>Score</th><th>Est (mJ)</th><th>Conf</th>
        <th>Suggestion</th><th>Potential Reduction</th><th>Actions</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <script>
    const vscode = acquireVsCodeApi();
    const hs = ${hsPayload};

    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.tagName === 'BUTTON') {
        const idx = Number(t.getAttribute('data-idx'));
        const action = t.getAttribute('data-action');
        if (!Number.isNaN(idx) && hs[idx]) {
          vscode.postMessage({
            type: action,
            start: hs[idx].start,
            end: hs[idx].end,
            ruleId: hs[idx].ruleId
          });
        }
      }
    });
  </script>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}