import * as vscode from 'vscode';
import QuickLRU from 'quick-lru';
import { analyzeDocumentFeatures } from './analyzer';
import { scoreFeatures } from './model/scoreHeuristic';
import { getExtensionConfig } from './config';
import { hashString } from './util/hash';
import { evaluateSuggestions } from './suggestions/engine';
import { showSummary } from './ui/summaryPanel';
import { registerPatchPreviewCommand } from './ui/commands';
import { recordEvent, flushTelemetryIfEnabled } from './telemetry/telemetry';
import { Hotspot, PredictionResult } from './types';
import { InfoProvider } from './sidebar/InfoProvider';
import { SuggestionsProvider, CESuggestion } from './sidebar/SuggestionsProvider';
import { predictWithModel } from './model/modelClient';

let diagnosticCollection: vscode.DiagnosticCollection;
let decorationType: vscode.TextEditorDecorationType;
const cache = new QuickLRU<string, PredictionResult>({ maxSize: 256 });

// Sidebar providers
let infoProvider: InfoProvider;
let suggestionsProvider: SuggestionsProvider;

export async function activate(context: vscode.ExtensionContext) {
  diagnosticCollection = vscode.languages.createDiagnosticCollection('code-energy-profiler');
  decorationType = vscode.window.createTextEditorDecorationType({});
  registerPatchPreviewCommand(context);

  // Register side panels
  infoProvider = new InfoProvider();
  suggestionsProvider = new SuggestionsProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('codeEnergy.info', infoProvider),
    vscode.window.registerTreeDataProvider('codeEnergy.suggestions', suggestionsProvider),
  );

  // Helper: command for Suggestions panel to open the summary
  context.subscriptions.push(
    vscode.commands.registerCommand('codeEnergy.openOutput', () =>
      vscode.commands.executeCommand('codeEnergyProfiler.showSummary'),
    ),
  );

  const schedule = new Map<string, NodeJS.Timeout>();

  async function analyze(doc?: vscode.TextDocument) {
    const editor = vscode.window.activeTextEditor;
    const document = doc ?? editor?.document;
    if (!document) return;
    const cfg = getExtensionConfig();
    const text = document.getText();
    const key = `${document.uri.toString()}::${hashString(text)}::${JSON.stringify(cfg.thresholds)}::${cfg.localOnly}`;
    let result = cache.get(key);
    if (!result) {
      const fv = await analyzeDocumentFeatures(document);
      let fileScore: number;
      let hotspots = [];
      // try model prediction (remote or ONNX)
      const pred = await predictWithModel(fv);
      if (pred && typeof pred.fileScore === 'number') {
        fileScore = pred.fileScore;
        // Map model-level fileScore to hotspots produced by heuristics so we still have ranges
        const base = scoreFeatures(fv); // reuse heuristic to get ranges/order
        hotspots = base.hotspots.map((h, i) => ({
          ...h,
          // combine model fileScore with heuristic distribution
          score: Math.min(1, (pred.fileScore * 0.8) + (h.score * 0.2)),
          estimate_mJ: pred.estimated_mJ ? pred.estimated_mJ * (1 - i * 0.12) : h.estimate_mJ,
        }));
      } else {
        // fallback to heuristic
        const out = scoreFeatures(fv);
        fileScore = out.fileScore;
        hotspots = out.hotspots;
      }

      // Attach suggestions
      const suggestionsMap = evaluateSuggestions(fv, hotspots);
      const enriched: Hotspot[] = hotspots.map((h) => {
        const applicable = Object.values(suggestionsMap).filter((s) => h.score >= 0.25);
        const top = applicable[0];
        return {
          ...h,
          suggestion: top?.suggestion,
          ruleId: top?.ruleId,
          deltaScore: top?.deltaScore,
        };
      });
      result = { fileScore, hotspots: enriched, modelVersion: 'heuristic-v1' };
      cache.set(key, result);
      recordEvent('analysis', { fileScore, hotspots: hotspots.length });
    }

    renderDiagnostics(document, result);
    renderDecorations(result);

    // Update sidebar panels
    try {
      infoProvider.setState({
        lastAnalysisAt: new Date().toLocaleTimeString(),
        lastFile: document.fileName,
        modelVersion: result.modelVersion,
        energy: Number((result.fileScore * 1000).toFixed(1)), // simple scaled score → mJ-like display
      });

      const ceSuggestions: CESuggestion[] = result.hotspots
        .filter((h) => h.ruleId && h.suggestion)
        .map((h, idx) => ({
          block_id: `${h.start.line}-${h.end.line}`,
          pattern: h.ruleId!,
          proposed_change: h.suggestion!,
          estimated_delta_percent: Math.round((h.deltaScore ?? 0) * 100),
        }));
      suggestionsProvider.setSuggestions(ceSuggestions);
    } catch {
      // ignore sidebar update failures
    }

    flushTelemetryIfEnabled(cfg.telemetry);
  }

  function renderDiagnostics(document: vscode.TextDocument, result: PredictionResult) {
    const cfg = getExtensionConfig();
    const diags = result.hotspots.map((h) => {
      const range = new vscode.Range(h.start.line, h.start.character, h.end.line, h.end.character);
      const severity = toSeverity(h.score, cfg.thresholds);
      const msg = `Energy hotspot score=${h.score.toFixed(2)} ${h.suggestion ? 'Suggestion: ' + h.suggestion : ''}`;
      const d = new vscode.Diagnostic(range, msg, severity);
      d.source = 'Code Energy Profiler';
      d.code = h.ruleId || 'hotspot';
      return d;
    });
    diagnosticCollection.set(document.uri, diags);
  }

  function renderDecorations(result: PredictionResult) {
    const cfg = getExtensionConfig();
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const options: vscode.DecorationOptions[] = result.hotspots.map((h) => {
      const range = new vscode.Range(h.start.line, h.start.character, h.end.line, h.end.character);
      const color = toColor(h.score, cfg.thresholds);
      const hover = new vscode.MarkdownString(
        `**Energy Hotspot**\n\nScore: ${h.score.toFixed(2)}\nEst: ${h.estimate_mJ ?? '—'} mJ\nConfidence: ${(h.confidence ?? 0).toFixed(2)}\n${
          h.suggestion ? 'Suggestion: ' + h.suggestion : ''
        }${h.deltaScore ? `\nPotential reduction: ${(h.deltaScore * 100).toFixed(1)}%` : ''}`,
      );
      hover.isTrusted = true;
      return {
        range,
        renderOptions: {
          before: { contentText: '●', color, margin: '0 0.3rem 0 0' },
        },
        hoverMessage: hover,
      };
    });
    editor.setDecorations(decorationType, options);
  }

  function toSeverity(score: number, th: any) {
    if (score >= th.high) return vscode.DiagnosticSeverity.Error;
    if (score >= th.medium) return vscode.DiagnosticSeverity.Warning;
    if (score >= th.low) return vscode.DiagnosticSeverity.Information;
    return vscode.DiagnosticSeverity.Hint;
  }
  function toColor(score: number, th: any) {
    if (score >= th.high) return '#ff4d4f';
    if (score >= th.medium) return '#fa8c16';
    if (score >= th.low) return '#faad14';
    return '#52c41a';
  }

  function scheduleAnalyze(doc: vscode.TextDocument) {
    const ms = getExtensionConfig().debounceMs;
    const id = doc.uri.toString();
    clearTimeout(schedule.get(id));
    const t = setTimeout(() => analyze(doc), ms);
    schedule.set(id, t);
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => scheduleAnalyze(e.document)),
    vscode.workspace.onDidSaveTextDocument((doc) => scheduleAnalyze(doc)),
    vscode.window.onDidChangeActiveTextEditor(() => analyze()),
    vscode.commands.registerCommand('codeEnergyProfiler.analyzeCurrentFile', () => analyze()),
    vscode.commands.registerCommand('codeEnergyProfiler.showSummary', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const cfg = getExtensionConfig();
      const text = editor.document.getText();
      const key = `${editor.document.uri.toString()}::${hashString(text)}::${JSON.stringify(cfg.thresholds)}::${cfg.localOnly}`;
      const result = cache.get(key);
      if (result) showSummary(result);
      else vscode.window.showInformationMessage('Analyze file first.');
    }),
    vscode.commands.registerCommand('codeEnergyProfiler.toggleLocalOnly', async () => {
      const cfg = vscode.workspace.getConfiguration('codeEnergyProfiler');
      const newVal = !cfg.get('localOnly');
      await cfg.update('localOnly', newVal, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`Local-only mode = ${newVal}`);
    }),
    diagnosticCollection,
    decorationType,
  );

  analyze();
}

export function deactivate() {
  diagnosticCollection?.clear();
  decorationType?.dispose();
}