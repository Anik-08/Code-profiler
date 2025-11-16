import * as vscode from 'vscode';
import { SuggestionsProvider, CESuggestion } from './sidebar/SuggestionsProvider';
import { InfoProvider } from './sidebar/InfoProvider';

const DEFAULT_BASE = 'http://127.0.0.1:8085';

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel('Code Energy');
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
  status.command = 'codeEnergy.analyze';
  status.text = '$(zap) Code Energy: starting...';
  status.show();

  const suggestionsProvider = new SuggestionsProvider();
  const infoProvider = new InfoProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('codeEnergy.suggestions', suggestionsProvider),
    vscode.window.registerTreeDataProvider('codeEnergy.info', infoProvider),
  );

  const getCfg = () => vscode.workspace.getConfiguration('codeEnergy');
  const apiBase = () => process.env.CODE_ENERGY_API_URL || (getCfg().get<string>('apiUrl') || DEFAULT_BASE);
  const analyzeUrl = () => apiBase() + (getCfg().get<string>('analyzePath') || '/analyze');
  const healthUrl = () => apiBase() + (getCfg().get<string>('healthPath') || '/health');
  const pollInterval = () => getCfg().get<number>('pollIntervalMs') || 5000;

  // Heartbeat
  const heartbeat = async () => {
    try {
      const res = await fetch(healthUrl(), { method: 'GET' });
      if (res.ok) {
        status.text = '$(zap) Code Energy: Online';
        status.tooltip = apiBase();
        infoProvider.setState({ apiStatus: 'online' });
      } else {
        status.text = '$(warning) Code Energy: Unhealthy';
        infoProvider.setState({ apiStatus: 'offline' });
      }
    } catch {
      status.text = '$(plug) Code Energy: Offline';
      infoProvider.setState({ apiStatus: 'offline' });
    }
  };
  const hbTimer = setInterval(heartbeat, pollInterval());
  context.subscriptions.push(new vscode.Disposable(() => clearInterval(hbTimer)));
  heartbeat();

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('codeEnergy.openOutput', () => output.show(true)),
    vscode.commands.registerCommand('codeEnergy.refreshViews', () => {
      suggestionsProvider.refresh();
      infoProvider.setState({});
    }),
    vscode.commands.registerCommand('codeEnergy.analyze', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor.');
        return;
      }
      const doc = editor.document;
      const code = doc.getText();

      output.appendLine(`[analyze] ${new Date().toISOString()} → ${doc.fileName}`);
      const url = analyzeUrl();

      status.text = '$(sync~spin) Code Energy: Analyzing...';

      const start = Date.now();
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_path: doc.fileName, language: doc.languageId, code })
        });

        const latency = Date.now() - start;

        if (!resp.ok) {
          status.text = '$(error) Code Energy: Error';
          const msg = `API error: ${resp.status} ${resp.statusText}`;
          output.appendLine(msg);
          vscode.window.showErrorMessage(msg);
          return;
        }
        const data = await resp.json();

        // Update providers
        const suggestions: CESuggestion[] = data.suggestions || [];
        suggestionsProvider.setSuggestions(suggestions);
        infoProvider.setState({
          apiStatus: 'online',
          lastFile: doc.fileName,
          lastAnalysisAt: new Date().toLocaleTimeString(),
          modelVersion: data.model_version,
          energy: data.total_energy_mJ,
          cacheHit: !!data.cache_hit,
          latencyMs: latency
        });

        // Highlight loops (simple)
        decorateLoops(editor);

        status.text = `$(zap) ${data.total_energy_mJ.toFixed(1)} mJ ${data.cache_hit ? '(cache)' : ''}`;
        output.appendLine(`[analyze:ok] ${latency}ms | energy=${data.total_energy_mJ.toFixed(1)} mJ | cache=${data.cache_hit}`);
        if (suggestions.length) {
          output.appendLine('Suggestions:');
          for (const s of suggestions) {
            output.appendLine(`- ${s.pattern}: ${s.proposed_change} (~${s.estimated_delta_percent}%)`);
          }
        }
      } catch (e: any) {
        status.text = '$(error) Code Energy: Failed';
        const msg = `Request failed: ${e?.message ?? e}`;
        output.appendLine(msg);
        vscode.window.showErrorMessage(msg);
      }
    })
  );

  // Analyze on save (optional)
  vscode.workspace.onDidSaveTextDocument(async (doc) => {
    if (!getCfg().get<boolean>('analyzeOnSave')) return;
    const active = vscode.window.activeTextEditor?.document.uri.toString() === doc.uri.toString();
    if (active) {
      await vscode.commands.executeCommand('codeEnergy.analyze');
    }
  });

  // Initial UI state
  suggestionsProvider.setSuggestions([]);
  infoProvider.setState({ apiStatus: 'unknown' });
}

function decorateLoops(editor: vscode.TextEditor) {
  const decorationType = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: 'rgba(255, 215, 0, 0.15)'
  });
  const text = editor.document.getText();
  const loopRegex = /\bfor\s+.*:|\bwhile\s+.*:/g;
  const ranges: vscode.Range[] = [];
  let match: RegExpExecArray | null;
  while ((match = loopRegex.exec(text)) !== null) {
    const pos = editor.document.positionAt(match.index);
    const end = new vscode.Position(pos.line, editor.document.lineAt(pos.line).text.length);
    ranges.push(new vscode.Range(pos, end));
  }
  editor.setDecorations(decorationType, ranges);
}

export function deactivate() {}