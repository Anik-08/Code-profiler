import * as vscode from 'vscode';

type EventRecord = {
  name: string;
  props?: Record<string, unknown>;
  ts: number;
};

const queue: EventRecord[] = [];
let channel: vscode.OutputChannel | null = null;

function getTelemetryEnabled(): boolean {
  const cfg = vscode.workspace.getConfiguration('codeEnergyProfiler');
  return !!cfg.get<boolean>('enableTelemetry');
}

function getChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel('Code Energy Profiler (Telemetry)');
  }
  return channel;
}

/**
 * Record an event (enqueued). No-op if telemetry is disabled.
 */
export function recordEvent(name: string, props?: Record<string, unknown>) {
  if (!getTelemetryEnabled()) return;
  queue.push({ name, props, ts: Date.now() });

  // Flush periodically based on queue length
  if (queue.length >= 10) {
    flushTelemetryIfEnabled();
  }
}

/**
 * Flushes the telemetry queue if telemetry is enabled.
 * Safe to call frequently.
 */
export function flushTelemetryIfEnabled(_cfg?: unknown) {
  if (!getTelemetryEnabled()) return;
  const ch = getChannel();
  while (queue.length) {
    const e = queue.shift()!;
    ch.appendLine(JSON.stringify(e));
  }
}