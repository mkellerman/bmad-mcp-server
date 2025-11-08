#!/usr/bin/env node
/**
 * Metrics Summarizer (relocated outside read-only bmad/agents)
 * Aggregates NDJSON events emitted by instrumentation (src/utils/metrics.ts)
 * Usage:
 *   BMAD_METRICS_FILE=path/to/metrics.ndjson npm run metrics:summarize
 */
import fs from 'fs-extra';
import path from 'path';

const file = process.env.BMAD_METRICS_FILE || 'test-results/metrics.ndjson';
const filePath = path.resolve(file);

async function readEvents() {
  if (!(await fs.pathExists(filePath))) return [];
  const raw = await fs.readFile(filePath, 'utf8');
  return raw
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function summarize(events) {
  const byRoute = new Map();
  const variants = new Set();
  for (const e of events) {
    if (e.variant) variants.add(e.variant);
    if (e.event === 'response_ready' || e.event === 'response_error') {
      const key = e.route || 'unknown';
      if (!byRoute.has(key))
        byRoute.set(key, {
          durations: [],
          errors: 0,
          count: 0,
          tokens: 0,
          size: 0,
          sections: 0,
          affordances: 0,
        });
      const agg = byRoute.get(key);
      agg.count += 1;
      if (e.event === 'response_error') agg.errors += 1;
      else if (typeof e.durationMs === 'number')
        agg.durations.push(e.durationMs);
      if (typeof e.tokenEstimate === 'number') agg.tokens += e.tokenEstimate;
      if (typeof e.sizeBytes === 'number') agg.size += e.sizeBytes;
      if (typeof e.sections === 'number') agg.sections += e.sections;
      if (typeof e.affordances === 'number') agg.affordances += e.affordances;
    }
  }
  const routeSummaries = [];
  for (const [route, agg] of byRoute.entries()) {
    const ds = agg.durations.sort((a, b) => a - b);
    routeSummaries.push({
      route,
      count: agg.count,
      errorRate: agg.count ? +(agg.errors / agg.count).toFixed(4) : 0,
      avgDurationMs: agg.durations.length
        ? +(ds.reduce((a, b) => a + b, 0) / ds.length).toFixed(2)
        : 0,
      p50DurationMs: percentile(ds, 50),
      p95DurationMs: percentile(ds, 95),
      avgTokens: agg.count ? +(agg.tokens / agg.count).toFixed(2) : 0,
      totalTokens: agg.tokens,
      avgSizeBytes: agg.count ? +(agg.size / agg.count).toFixed(2) : 0,
      avgSections: agg.count ? +(agg.sections / agg.count).toFixed(2) : 0,
      avgAffordances: agg.count ? +(agg.affordances / agg.count).toFixed(2) : 0,
    });
  }
  routeSummaries.sort((a, b) => a.route.localeCompare(b.route));
  return {
    routes: routeSummaries,
    variantCount: variants.size,
    variants: [...variants],
  };
}

function formatTable(rows, headers) {
  const colWidths = headers.map((h) =>
    Math.max(h.length, ...rows.map((r) => String(r[h]).length)),
  );
  const line = (vals) =>
    vals.map((v, i) => String(v).padEnd(colWidths[i])).join('  ');
  return [
    line(headers),
    line(headers.map((h) => '-'.repeat(colWidths[headers.indexOf(h)]))),
    ...rows.map((r) => line(headers.map((h) => r[h]))),
  ].join('\n');
}

(async () => {
  const events = await readEvents();
  if (!events.length) {
    console.warn(
      `No metrics events found at ${filePath}. Enable with BMAD_METRICS=1.`,
    );
    return;
  }
  const summary = summarize(events);
  const headers = [
    'route',
    'count',
    'errorRate',
    'avgDurationMs',
    'p50DurationMs',
    'p95DurationMs',
    'avgTokens',
    'totalTokens',
    'avgSizeBytes',
    'avgSections',
    'avgAffordances',
  ];
  console.warn('\nBMAD Metrics Summary');
  console.warn('File:', filePath);
  if (summary.variantCount) {
    console.warn('Variants:', summary.variants.join(', '));
  }
  console.warn('\nPer-Route KPIs:\n');
  console.warn(formatTable(summary.routes, headers));
  const totalCount = summary.routes.reduce((a, r) => a + r.count, 0);
  const totalErrors = summary.routes.reduce(
    (a, r) => a + Math.round(r.errorRate * r.count),
    0,
  );
  const totalTokens = summary.routes.reduce((a, r) => a + r.totalTokens, 0);
  console.warn('\nGlobal:');
  console.warn(`  Requests: ${totalCount}`);
  console.warn(
    `  Errors: ${totalErrors} (rate ${totalCount ? (totalErrors / totalCount).toFixed(4) : 0})`,
  );
  console.warn(`  Tokens: ${totalTokens}`);
  console.warn('\nDone.');
})();
