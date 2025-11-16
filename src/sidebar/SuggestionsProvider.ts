import * as vscode from 'vscode';

export interface CESuggestion {
  block_id: string;
  pattern: string;
  proposed_change: string;
  estimated_delta_percent: number;
  patch_diff?: string;
}

export class SuggestionsProvider implements vscode.TreeDataProvider<SuggestionItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SuggestionItem | undefined | void> = new vscode.EventEmitter();
  readonly onDidChangeTreeData: vscode.Event<SuggestionItem | undefined | void> = this._onDidChangeTreeData.event;

  private suggestions: CESuggestion[] = [];

  setSuggestions(suggestions: CESuggestion[]) {
    this.suggestions = suggestions || [];
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SuggestionItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<SuggestionItem[]> {
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
    this.iconPath = new vscode.ThemeIcon('lightbulb');
  }
}