export type RequestMetric = { at: number; path: string; status: number; durationMs: number };

const MAX_EVENTS = 5000;
const events: RequestMetric[] = [];

export function recordRequest(metric: RequestMetric) {
  events.push(metric);
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
}

export function getRequestMetrics(now = Date.now()) {
  const since = now - 60_000;
  const recent = events.filter(event => event.at >= since);
  const durations = recent.map(event => event.durationMs).sort((a, b) => a - b);
  const errors = recent.filter(event => event.status >= 500);
  const clientErrors = recent.filter(event => event.status >= 400 && event.status < 500);
  const percentile = (ratio: number) => durations.length ? Number(durations[Math.min(durations.length - 1, Math.floor(durations.length * ratio))].toFixed(1)) : 0;
  const pathCounts = new Map<string, number>();
  for (const event of recent) pathCounts.set(event.path, (pathCounts.get(event.path) || 0) + 1);
  const topPaths = Array.from(pathCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([path, count]) => ({ path, count }));
  return {
    windowSeconds: 60,
    requests: recent.length,
    errors: errors.length,
    clientErrors: clientErrors.length,
    errorRate: recent.length ? Number(((errors.length / recent.length) * 100).toFixed(2)) : 0,
    averageLatencyMs: durations.length ? Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(1)) : 0,
    p95LatencyMs: percentile(0.95),
    p99LatencyMs: percentile(0.99),
    topPaths,
    collectedAt: new Date(now).toISOString(),
  };
}
