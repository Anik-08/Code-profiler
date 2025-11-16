import * as vscode from 'vscode';
import { buildPatchPreview } from '../suggestions/patchPreview';
import { applyRuleToText } from '../suggestions/applyRewrite';

export function registerPatchPreviewCommand(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'codeEnergyProfiler.previewRewrite',
      async (ruleId: string, document: vscode.TextDocument, range: vscode.Range) => {
        const original = document.getText(range);
        const diff = buildPatchPreview(ruleId, original);
        const doc = await vscode.workspace.openTextDocument({ content: diff, language: 'diff' });
        vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
      },
    ),
    vscode.commands.registerCommand(
      'codeEnergyProfiler.applyRewrite',
      async (ruleId: string, document: vscode.TextDocument, range: vscode.Range) => {
        const original = document.getText(range);
        const { updated } = applyRuleToText(ruleId, original);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, range, updated);
        await vscode.workspace.applyEdit(edit);
      },
    ),
  );
}
