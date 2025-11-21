import * as vscode from 'vscode';

export interface CESuggestion {
  block_id: string;
  pattern: string;
  proposed_change: string;
  estimated_delta_percent: number;
  patch_diff?: string;
}

export class SuggestionsProvider implements vscode.TreeDataProvider<SuggestionItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SuggestionItem | undefined | null> = new vscode.EventEmitter();
  readonly onDidChangeTreeData: vscode.Event<SuggestionItem | undefined | null> = this._onDidChangeTreeData.event;

  private suggestions: CESuggestion[] = [];

  setSuggestions(suggestions: CESuggestion[]) {
    this.suggestions = suggestions || [];
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: SuggestionItem): vscode.TreeItem {
    return element;
  }

  getChildren(_element?: SuggestionItem): Thenable<SuggestionItem[]> {
    if (!this.suggestions.length) {
      return Promise.resolve([new SuggestionItem(
        'No suggestions yet',
        'Run “Code Energy: Analyze Current File”',
        vscode.TreeItemCollapsibleState.None
      )]);
    }
    return Promise.resolve(
      this.suggestions.map(s => {
        const label = `${s.pattern} (~${s.estimated_delta_percent}% improvement)`;
        const item = new SuggestionItem(label, s.proposed_change, vscode.TreeItemCollapsibleState.None);
        item.tooltip = `${s.proposed_change}\nBlock: ${s.block_id}`;
        item.command = {
          command: 'codeEnergy.openOutput',
          title: 'Open Output'
        };
        item.contextValue = 'suggestion';
        return item;
      })
    );
  }
}

class SuggestionItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.description = description;
    // Avoid ThemeIcon constructor to remain compatible with older vscode typings.
    // If you want an icon, prefix the label with a codicon: e.g., this.label = `$(lightbulb) ${label}`.
  }
}