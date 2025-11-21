import * as vscode from 'vscode';

export function getExtensionConfig() {
  const cfg = vscode.workspace.getConfiguration('codeEnergyProfiler');
  return {
    remoteEndpoint: cfg.get<string>('remoteEndpoint')!,
    localOnly: cfg.get<boolean>('localOnly')!,
    debounceMs: cfg.get<number>('debounceMs')!,
    thresholds: cfg.get<any>('severityThresholds')!,
    telemetry: cfg.get<boolean>('enableTelemetry')!,
    patchPreview: cfg.get<boolean>('showPatchPreview')!,
  };
}