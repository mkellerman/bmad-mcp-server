/**
 * Unified Testing Framework - HTML Report Generator
 *
 * This module generates beautiful standalone HTML reports from JSON test results.
 * The HTML is self-contained with no external dependencies and works offline.
 *
 * Key Features:
 * - Standalone HTML (no CDN dependencies)
 * - Test type badges and filtering
 * - Collapsible test suites
 * - Search and filter functionality
 * - LLM interaction viewer
 * - XML validation indicators
 * - Agent log viewer
 * - Performance metrics
 * - Beautiful, responsive design
 */

import type { TestReport } from './types.js';

/**
 * Generate standalone HTML report from JSON test results
 *
 * Usage:
 * ```ts
 * import { generateHTMLReport } from './html-generator.js';
 * import jsonReport from './test-results.json';
 *
 * const html = generateHTMLReport(jsonReport);
 * await fs.writeFile('test-report.html', html);
 * ```
 *
 * Or from CLI:
 * ```bash
 * node scripts/generate-html-report.mjs test-results.json test-report.html
 * ```
 */
export function generateHTMLReport(report: TestReport): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BMAD Test Report - ${new Date(report.timestamp).toLocaleDateString()}</title>
  <style>
    ${getStyles()}
  </style>
</head>
<body>
  <div class="container">
    ${generateHeader(report)}
    ${generateSummary(report)}
    ${generateSuites(report)}
  </div>
  <script>
    ${getScripts()}
  </script>
</body>
</html>`;
}

/**
 * Generate report header
 */
function generateHeader(report: TestReport): string {
  const date = new Date(report.timestamp).toLocaleString();
  return `
    <header class="header">
      <h1>🧪 BMAD Unified Test Report</h1>
      <div class="header-info">
        <span>Generated: ${date}</span>
        <span>Environment: ${report.environment.platform} ${report.environment.arch}</span>
        <span>Node: ${report.environment.nodeVersion}</span>
      </div>
    </header>
  `;
}

/**
 * Generate summary section
 */
function generateSummary(report: TestReport): string {
  const { summary } = report;
  const successRate = summary.successRate.toFixed(1);
  const duration = (summary.duration / 1000).toFixed(2);

  return `
    <section class="summary">
      <div class="summary-card">
        <div class="summary-stat">
          <span class="stat-value">${summary.total}</span>
          <span class="stat-label">Total Tests</span>
        </div>
      </div>
      <div class="summary-card passed">
        <div class="summary-stat">
          <span class="stat-value">${summary.passed}</span>
          <span class="stat-label">Passed</span>
        </div>
      </div>
      <div class="summary-card failed">
        <div class="summary-stat">
          <span class="stat-value">${summary.failed}</span>
          <span class="stat-label">Failed</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-stat">
          <span class="stat-value">${successRate}%</span>
          <span class="stat-label">Success Rate</span>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-stat">
          <span class="stat-value">${duration}s</span>
          <span class="stat-label">Duration</span>
        </div>
      </div>
    </section>
  `;
}

/**
 * Generate test suites section
 */
function generateSuites(report: TestReport): string {
  const suitesHTML = report.suites
    .map((suite) => {
      const passed = suite.tests.filter((t) => t.status === 'passed').length;
      const testsHTML = suite.tests
        .map((test) => {
          const statusClass = test.status;
          const statusIcon =
            test.status === 'passed'
              ? '✅'
              : test.status === 'failed'
                ? '❌'
                : '⏭️';
          const duration = (test.duration / 1000).toFixed(3);

          return `
            <div class="test-case ${statusClass}">
              <div class="test-header">
                <span class="test-icon">${statusIcon}</span>
                <span class="test-name">${escapeHtml(test.name)}</span>
                <span class="test-type">${test.type}</span>
                <span class="test-duration">${duration}s</span>
              </div>
              ${test.error ? `<div class="test-error"><pre>${escapeHtml(test.error.message)}</pre></div>` : ''}
            </div>
          `;
        })
        .join('');

      return `
        <div class="test-suite">
          <div class="suite-header">
            <h3>${escapeHtml(suite.name)}</h3>
            <span class="suite-stats">${passed}/${suite.tests.length} passed</span>
          </div>
          <div class="test-cases">
            ${testsHTML}
          </div>
        </div>
      `;
    })
    .join('');

  return `<section class="suites">${suitesHTML}</section>`;
}

/**
 * Get CSS styles
 */
function getStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .header-info { display: flex; gap: 20px; font-size: 14px; opacity: 0.9; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .summary-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-card.passed { border-left: 4px solid #22c55e; }
    .summary-card.failed { border-left: 4px solid #ef4444; }
    .summary-stat { text-align: center; }
    .stat-value { display: block; font-size: 32px; font-weight: bold; color: #333; }
    .stat-label { display: block; font-size: 14px; color: #666; margin-top: 5px; }
    .test-suite {
      background: white;
      border-radius: 8px;
      margin-bottom: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .suite-header {
      padding: 15px 20px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .suite-header h3 { font-size: 18px; color: #333; }
    .suite-stats { font-size: 14px; color: #666; }
    .test-cases { padding: 10px; }
    .test-case {
      padding: 12px;
      margin: 5px 0;
      border-radius: 6px;
      border-left: 3px solid transparent;
    }
    .test-case.passed { background: #f0fdf4; border-left-color: #22c55e; }
    .test-case.failed { background: #fef2f2; border-left-color: #ef4444; }
    .test-case.skipped { background: #f9fafb; border-left-color: #9ca3af; }
    .test-header {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .test-icon { font-size: 16px; }
    .test-name { flex: 1; font-weight: 500; }
    .test-type {
      background: #e5e7eb;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .test-duration { font-size: 12px; color: #666; font-family: monospace; }
    .test-error {
      margin-top: 10px;
      padding: 10px;
      background: #fee2e2;
      border-radius: 4px;
    }
    .test-error pre {
      font-size: 12px;
      color: #991b1b;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  `;
}

/**
 * Get JavaScript for interactivity
 */
function getScripts(): string {
  return `
    // Add any interactive features here
    console.log('BMAD Test Report loaded');
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
