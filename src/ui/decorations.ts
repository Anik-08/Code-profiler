import * as vscode from 'vscode';
import { PredictionResult, LineEnergy } from '../types';
import { truncate } from 'fs';

const lowEnergyDecoration = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  backgroundColor: new vscode.ThemeColor('editor.rangeHighlightBackground'),
});

const mediumEnergyDecoration = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  backgroundColor: new vscode.ThemeColor('editor.wordHighlightBackground'),
});

const highEnergyDecoration = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  backgroundColor: new vscode.ThemeColor('editor.wordHighlightStrongBackground'),
});

const commentDecoration = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  // very subtle or none, to indicate "green"
  backgroundColor: undefined,
  overviewRulerColor: undefined,
});

export function decorateHotspots(editor: vscode.TextEditor, result: PredictionResult) {
  const lineEnergies = result.lineEnergies;
  if (!lineEnergies || lineEnergies.length === 0) {
    clearAll(editor);
    return;
  }

  const lows: vscode.DecorationOptions[] = [];
  const meds: vscode.DecorationOptions[] = [];
  const highs: vscode.DecorationOptions[] = [];
  const comments: vscode.DecorationOptions[] = [];

  for (const le of lineEnergies) {
    const range = new vscode.Range(
      new vscode.Position(le.line - 1, 0),
      new vscode.Position(le.line - 1, Number.MAX_SAFE_INTEGER),
    );

    const tooltip = buildTooltip(le, result);

    const opt: vscode.DecorationOptions = {
      range,
      hoverMessage: tooltip,
    };

    if (le.isComment || le.isBlank) {
      comments.push(opt);
      continue;
    }

    if (le.relative < 0.2) {
      lows.push(opt);
    } else if (le.relative < 0.6) {
      meds.push(opt);
    } else {
      highs.push(opt);
    }
  }

  editor.setDecorations(commentDecoration, comments);
  editor.setDecorations(lowEnergyDecoration, lows);
  editor.setDecorations(mediumEnergyDecoration, meds);
  editor.setDecorations(highEnergyDecoration, highs);
}

function buildTooltip(le: LineEnergy, result: PredictionResult): vscode.MarkdownString {
  const md = new vscode.MarkdownString(undefined);
  if (le.isComment || le.isBlank) {
    md.appendMarkdown('`Code Energy` This line is a comment/blank and does **not** consume energy.\n');
    return md;
  }
  md.appendMarkdown('`Code Energy`\n\n');
  md.appendMarkdown(`- Estimated: **${le.energy_mJ.toFixed(3)} mJ**\n`);
  md.appendMarkdown(`- Relative: ${(le.relative * 100).toFixed(1)}% of file energy\n`);
  if (result.estimated_mJ !== undefined) {
    md.appendMarkdown(`- File total: ~${result.estimated_mJ.toFixed(1)} mJ\n`);
  } else {
    md.appendMarkdown(`- File score: ${result.fileScore.toFixed(3)}\n`);
  }
  return md;
}

function clearAll(editor: vscode.TextEditor) {
  editor.setDecorations(commentDecoration, []);
  editor.setDecorations(lowEnergyDecoration, []);
  editor.setDecorations(mediumEnergyDecoration, []);
  editor.setDecorations(highEnergyDecoration, []);
}