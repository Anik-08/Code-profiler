import * as vscode from 'vscode';

class EnergyCodeActionProvider implements vscode.CodeActionProvider {
  static readonly kinds = [vscode.CodeActionKind.QuickFix];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
  ): vscode.ProviderResult<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = [];

    for (const d of context.diagnostics) {
      if (d.source !== 'Code Energy Profiler') continue;
      const ruleId = typeof d.code === 'string' ? d.code : undefined;
      if (!ruleId) continue;

      // Preview action
      const preview = new vscode.CodeAction('Code Energy Profiler: Preview Rewrite', vscode.CodeActionKind.QuickFix);
      preview.command = {
        command: 'codeEnergyProfiler.previewRewrite',
        title: 'Preview Rewrite',
        arguments: [ruleId, document, d.range],
      };
      preview.diagnostics = [d];
      actions.push(preview);

      // Apply action
      const apply = new vscode.CodeAction('Code Energy Profiler: Apply Suggested Rewrite', vscode.CodeActionKind.QuickFix);
      apply.command = {
        command: 'codeEnergyProfiler.applyRewrite',
        title: 'Apply Suggested Rewrite',
        arguments: [ruleId, document, d.range],
      };
      apply.diagnostics = [d];
      actions.push(apply);
    }

    return actions;
  }
}

export function registerCodeActions(context: vscode.ExtensionContext) {
  const selector: vscode.DocumentSelector = [
    { language: 'python' },
    { language: 'javascript' },
    { language: 'typescript' },
    { language: 'java' },
  ];
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(selector, new EnergyCodeActionProvider(), {
      providedCodeActionKinds: EnergyCodeActionProvider.kinds,
    }),
  );
}