import fs from 'fs-extra';
import path from 'path';

let metricsFile =
  process.env.BMAD_METRICS_FILE || 'test-results/metrics.ndjson';
let enabled = false;
let variantCached: string | undefined;

export function metricsEnabled(): boolean {
  if (enabled) return true;
  const flag = process.env.BMAD_METRICS;
  enabled = flag === '1' || flag === 'true';
  return enabled;
}

export async function initMetrics(): Promise<void> {
  if (!metricsEnabled()) return;
  const filePath = path.resolve(metricsFile);
  await fs.ensureDir(path.dirname(filePath));
  // Touch file to ensure it exists
  if (!(await fs.pathExists(filePath))) {
    await fs.writeFile(filePath, '', 'utf8');
  }
}

export function setMetricsFile(filePath: string): void {
  metricsFile = filePath;
}

export interface MetricEvent {
  [key: string]: string | number | boolean | null | undefined | object;
}

export async function emit(event: MetricEvent): Promise<void> {
  if (!metricsEnabled()) return;
  const line =
    JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n';
  const filePath = path.resolve(metricsFile);
  await fs.appendFile(filePath, line, 'utf8');
}

export function correlationId(): string {
  return (
    'corr-' +
    Math.random().toString(36).slice(2, 10) +
    '-' +
    Date.now().toString(36)
  );
}

export function metricsVariant(): string | undefined {
  if (variantCached !== undefined) return variantCached;
  const v = process.env.BMAD_VARIANT || process.env.BMAD_METRICS_VARIANT;
  variantCached = v && String(v);
  return variantCached;
}

export function estimateTokens(input: unknown): number {
  try {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    // Rough heuristic: 1 token ~ 4 chars
    return Math.ceil((text?.length || 0) / 4);
  } catch {
    return 0;
  }
}

export function sizeBytes(input: unknown): number {
  try {
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    return Buffer.byteLength(text, 'utf8');
  } catch {
    return 0;
  }
}
