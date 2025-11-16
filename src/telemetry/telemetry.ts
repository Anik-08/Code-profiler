interface TelemetryEvent {
  type: string;
  timestamp: number;
  data: Record<string, any>;
}
const buffer: TelemetryEvent[] = [];

export function recordEvent(type: string, data: Record<string, any>) {
  buffer.push({ type, timestamp: Date.now(), data });
}

export function flushTelemetryIfEnabled(enabled: boolean) {
  if (!enabled) return;
  // For hackathon just log to console; production: send to endpoint
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(buffer, null, 2));
  buffer.length = 0;
}
