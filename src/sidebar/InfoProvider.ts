import * as vscode from 'vscode';

export interface CEInfoState {
  apiStatus: 'online' | 'offline' | 'unknown';
  lastAnalysisAt?: string;
  lastFile?: string;
  modelVersion?: string;
  energy?: number;
  cacheHit?: boolean;
  latencyMs?: number;
}

export class InfoProvider implements vscode.TreeDataProvider<InfoItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private state: CEInfoState = { apiStatus: 'unknown' };

  setState(update: Partial<CEInfoState>) {
    this.state = { ...this.state, ...update };
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: InfoItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<InfoItem[]> {
    const items: InfoItem[] = [];

    items.push(new InfoItem(`API: ${this.state.apiStatus.toUpperCase()}`, '', new vscode.ThemeIcon(
      this.state.apiStatus === 'online' ? 'pass' : this.state.apiStatus === 'offline' ? 'error' : 'question'
    )));

    if (this.state.modelVersion) items.push(new InfoItem(`Model: ${this.state.modelVersion}`, ''));
    if (this.state.energy !== undefined) items.push(new InfoItem(`Last Energy: ${this.state.energy.toFixed(1)} mJ`, ''));
    if (this.state.cacheHit !== undefined) items.push(new InfoItem(`Cache: ${this.state.cacheHit ? 'Hit' : 'Miss'}`, ''));
    if (this.state.latencyMs !== undefined) items.push(new InfoItem(`Latency: ${this.state.latencyMs} ms`, ''));
    if (this.state.lastFile) items.push(new InfoItem(`File: ${this.state.lastFile}`, ''));
    if (this.state.lastAnalysisAt) items.push(new InfoItem(`Analyzed: ${this.state.lastAnalysisAt}`, ''));

    if (items.length === 1) {
      items.push(new InfoItem('Run an analysis to populate info', '', new vscode.ThemeIcon('clock')));
    }
    return Promise.resolve(items);
  }
}

class InfoItem extends vscode.TreeItem {
  constructor(label: string, description?: string, icon?: vscode.ThemeIcon) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    if (icon) this.iconPath = icon;
  }
}