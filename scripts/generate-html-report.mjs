#!/usr/bin/env node

/**
 * Generate HTML Report from JSON Test Results
 *
 * Usage:
 *   node scripts/generate-html-report.mjs <input.json> [output.html]
 *
 * Examples:
 *   node scripts/generate-html-report.mjs test-results/reports/test-results.json
 *   node scripts/generate-html-report.mjs test-results.json test-report.html
 */

import fs from 'node:fs/promises';

/**
 * Generate standalone HTML report from JSON test results
 */
function generateHTMLReport(report) {
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
    ${generateTypeFilter(report)}
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
function generateHeader(report) {
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
function generateSummary(report) {
  const { summary } = report;
  const successRate = summary.successRate.toFixed(1);
  const duration = (summary.duration / 1000).toFixed(2);

  return `
    <section class="summary">
      <div class="summary-card clickable" onclick="filterByStatus('all')">
        <div class="summary-stat">
          <span class="stat-value">${summary.total}</span>
          <span class="stat-label">Total Tests</span>
        </div>
      </div>
      <div class="summary-card passed clickable" onclick="filterByStatus('passed')">
        <div class="summary-stat">
          <span class="stat-value">${summary.passed}</span>
          <span class="stat-label">Passed</span>
        </div>
      </div>
      <div class="summary-card failed clickable" onclick="filterByStatus('failed')">
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
 * Generate test type filter section
 */
function generateTypeFilter(report) {
  // Collect test type statistics
  const typeStats = {};
  report.suites.forEach((suite) => {
    suite.tests.forEach((test) => {
      const type = test.type || 'unit';
      if (!typeStats[type]) {
        typeStats[type] = { total: 0, passed: 0, failed: 0 };
      }
      typeStats[type].total++;
      if (test.status === 'passed') typeStats[type].passed++;
      if (test.status === 'failed') typeStats[type].failed++;
    });
  });

  const typeOrder = ['unit', 'integration', 'e2e', 'llm', 'agent'];
  const sortedTypes = Object.keys(typeStats).sort((a, b) => {
    const aIdx = typeOrder.indexOf(a);
    const bIdx = typeOrder.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  const typeEmojis = {
    unit: '🧩',
    integration: '🔗',
    e2e: '🌐',
    llm: '🤖',
    agent: '🎯',
  };

  const typeCards = sortedTypes
    .map((type) => {
      const stats = typeStats[type];
      const emoji = typeEmojis[type] || '📝';
      return `
      <div class="type-filter-card" data-type="${type}" onclick="filterByType('${type}')">
        <div class="type-icon">${emoji}</div>
        <div class="type-info">
          <div class="type-name">${type}</div>
          <div class="type-stats">${stats.passed}/${stats.total}</div>
        </div>
      </div>
    `;
    })
    .join('');

  return `
    <section class="type-filter">
      <div class="filter-header">
        <h3>Filter by Test Type</h3>
        <button class="filter-reset" onclick="filterByType('all')">Show All</button>
      </div>
      <div class="type-filter-cards">
        ${typeCards}
      </div>
    </section>
  `;
}

/**
 * Generate test suites section
 */
function generateSuites(report) {
  const suitesHTML = report.suites
    .map((suite) => {
      const passed = suite.tests.filter((t) => t.status === 'passed').length;
      const testsHTML = suite.tests
        .map((test, index) => {
          const statusClass = test.status;
          const statusIcon =
            test.status === 'passed'
              ? '✅'
              : test.status === 'failed'
                ? '❌'
                : '⏭️';
          const duration = (test.duration / 1000).toFixed(3);
          const testId = `test-${suite.id}-${index}`;
          const hasDetails = hasTestDetails(test);

          return `
            <div class="test-case ${statusClass}" id="${testId}">
              <div class="test-header ${hasDetails ? 'clickable' : ''}" onclick="${hasDetails ? `toggleDetails('${testId}')` : ''}">
                <span class="test-icon">${statusIcon}</span>
                <span class="test-name">${escapeHtml(test.name)}</span>
                <span class="test-type">${test.type}</span>
                <span class="test-duration">${duration}s</span>
                ${hasDetails ? '<span class="expand-icon">▶</span>' : ''}
              </div>
              ${generateTestDetails(test)}
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
 * Check if test has details to show
 */
// eslint-disable-next-line no-unused-vars
function hasTestDetails(_test) {
  // Always return true - all tests are clickable to show metadata
  return true;
}

/**
 * Generate test details section
 */
function generateTestDetails(test) {
  let detailsHTML = '<div class="test-details" style="display: none;">';

  // Error details (for failed tests)
  if (test.error) {
    detailsHTML += `
      <div class="detail-section">
        <h4>❌ Error</h4>
        <div class="error-box">
          <pre>${escapeHtml(test.error.message)}</pre>
          ${
            test.error.showDiff &&
            test.error.expected !== null &&
            test.error.actual !== null
              ? `
            <div class="diff-section">
              <div class="diff-expected">
                <strong>Expected:</strong>
                <pre>${escapeHtml(typeof test.error.expected === 'object' ? JSON.stringify(test.error.expected, null, 2) : String(test.error.expected))}</pre>
              </div>
              <div class="diff-actual">
                <strong>Actual:</strong>
                <pre>${escapeHtml(typeof test.error.actual === 'object' ? JSON.stringify(test.error.actual, null, 2) : String(test.error.actual))}</pre>
              </div>
            </div>
          `
              : ''
          }
          ${
            test.error.diff
              ? `
            <div class="diff-output">
              <strong>Diff:</strong>
              <pre>${escapeHtml(test.error.diff)}</pre>
            </div>
          `
              : ''
          }
          ${test.error.stack ? `<details><summary>Stack Trace</summary><pre class="stack-trace">${escapeHtml(test.error.stack)}</pre></details>` : ''}
        </div>
      </div>
    `;
  }

  // Test metadata (always shown for all tests)
  detailsHTML += `
    <div class="detail-section">
      <h4>📋 Test Information</h4>
      <div class="test-info">
        <div class="info-row"><strong>Full Name:</strong> ${escapeHtml(test.fullName)}</div>
        <div class="info-row"><strong>File:</strong> ${escapeHtml(test.filePath)}</div>
        <div class="info-row"><strong>Type:</strong> ${test.type}</div>
        <div class="info-row"><strong>Status:</strong> ${test.status}</div>
        <div class="info-row"><strong>Duration:</strong> ${(test.duration / 1000).toFixed(3)}s</div>
        <div class="info-row"><strong>Started:</strong> ${new Date(test.startTime).toLocaleTimeString()}</div>
        ${test.metadata?.file ? `<div class="info-row"><strong>Source File:</strong> ${escapeHtml(test.metadata.file)}</div>` : ''}
        ${test.metadata?.line ? `<div class="info-row"><strong>Line:</strong> ${test.metadata.line}</div>` : ''}
        ${test.tags?.length ? `<div class="info-row"><strong>Tags:</strong> ${test.tags.map((t) => `<span class="tag">${t}</span>`).join(' ')}</div>` : ''}
      </div>
    </div>
  `;

  // Console output
  if (test.console?.length) {
    detailsHTML += `
      <div class="detail-section">
        <h4>📝 Console Output (${test.console.length})</h4>
        <div class="console-output">
          ${test.console
            .map(
              (log) => `
            <div class="console-log console-${log.type}">
              <span class="console-type">[${log.type.toUpperCase()}]</span>
              <pre>${escapeHtml(log.content)}</pre>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
  }

  // LLM Interactions
  if (test.llmInteractions?.length) {
    detailsHTML += `
      <div class="detail-section">
        <h4>🤖 LLM Interactions (${test.llmInteractions.length})</h4>
        ${test.llmInteractions
          .map(
            (interaction, i) => `
          <div class="llm-interaction">
            <div class="interaction-header">
              <strong>Interaction ${i + 1}</strong>
              <span>${interaction.provider.model}</span>
              <span>${(interaction.duration / 1000).toFixed(2)}s</span>
            </div>
            <div class="interaction-content">
              <div class="prompt-box">
                <strong>Prompt:</strong>
                <pre>${escapeHtml(interaction.prompt)}</pre>
              </div>
              ${
                interaction.toolCalls?.length
                  ? `
                <div class="tools-box">
                  <strong>Tool Calls (${interaction.toolCalls.length}):</strong>
                  ${interaction.toolCalls
                    .map(
                      (tool) => `
                    <div class="tool-call">
                      <code>${tool.name}</code> - ${(tool.duration / 1000).toFixed(2)}s
                      ${tool.error ? `<span class="tool-error">Error: ${escapeHtml(tool.error)}</span>` : ''}
                    </div>
                  `,
                    )
                    .join('')}
                </div>
              `
                  : ''
              }
              <div class="response-box">
                <strong>Response:</strong>
                <pre>${escapeHtml(interaction.response)}</pre>
              </div>
              ${
                interaction.tokenUsage
                  ? `
                <div class="token-usage">
                  Tokens: ${interaction.tokenUsage.prompt} prompt + ${interaction.tokenUsage.completion} completion = ${interaction.tokenUsage.total} total
                </div>
              `
                  : ''
              }
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
    `;
  }

  // XML Validation
  if (test.xmlValidation) {
    const validation = test.xmlValidation;
    detailsHTML += `
      <div class="detail-section">
        <h4>${validation.valid ? '✅' : '❌'} XML Validation</h4>
        <div class="xml-validation">
          ${validation.instructionLeakage ? '<div class="warning">⚠️ Instruction leakage detected!</div>' : ''}
          <div class="validation-tags">
            ${validation.tags
              .map(
                (tag) => `
              <div class="tag-validation ${tag.found && tag.closed && tag.hasContent ? 'valid' : 'invalid'}">
                <strong>&lt;${tag.tag}&gt;</strong>
                <span>${tag.found ? '✓ Found' : '✗ Not found'}</span>
                <span>${tag.closed ? '✓ Closed' : '✗ Not closed'}</span>
                <span>${tag.hasContent ? '✓ Has content' : '✗ Empty'}</span>
                ${tag.errors.length ? `<div class="tag-errors">${tag.errors.join(', ')}</div>` : ''}
              </div>
            `,
              )
              .join('')}
          </div>
          ${
            validation.errors.length
              ? `
            <div class="validation-errors">
              <strong>Errors:</strong>
              <ul>${validation.errors.map((err) => `<li>${escapeHtml(err)}</li>`).join('')}</ul>
            </div>
          `
              : ''
          }
        </div>
      </div>
    `;
  }

  // Agent validations
  if (test.agent || test.validations?.length) {
    detailsHTML += `
      <div class="detail-section">
        <h4>🎭 Agent Validation</h4>
        ${
          test.agent
            ? `
          <div class="agent-info">
            <div><strong>Agent:</strong> ${escapeHtml(test.agent.name)}</div>
            <div><strong>Module:</strong> ${escapeHtml(test.agent.module)}</div>
            <div><strong>File:</strong> ${escapeHtml(test.agent.filePath)}</div>
            <div><strong>Exists:</strong> ${test.agent.exists ? '✅' : '❌'}</div>
            <div><strong>Valid Format:</strong> ${test.agent.validFormat ? '✅' : '❌'}</div>
            ${
              test.agent.formatErrors?.length
                ? `
              <div class="format-errors">
                <strong>Format Errors:</strong>
                <ul>${test.agent.formatErrors.map((err) => `<li>${escapeHtml(err)}</li>`).join('')}</ul>
              </div>
            `
                : ''
            }
          </div>
        `
            : ''
        }
        ${
          test.validations?.length
            ? `
          <div class="validations-list">
            ${test.validations
              .map(
                (v) => `
              <div class="validation-item ${v.passed ? 'passed' : 'failed'}">
                ${v.passed ? '✅' : '❌'} ${escapeHtml(v.check)}
                ${v.message ? `<div class="validation-message">${escapeHtml(v.message)}</div>` : ''}
              </div>
            `,
              )
              .join('')}
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  // E2E Steps
  if (test.steps?.length) {
    detailsHTML += `
      <div class="detail-section">
        <h4>📋 Test Steps</h4>
        <div class="steps-list">
          ${test.steps
            .map(
              (step, i) => `
            <div class="step-item ${step.status}">
              <span class="step-number">${i + 1}</span>
              <span class="step-name">${escapeHtml(step.name)}</span>
              <span class="step-status">${step.status}</span>
              <span class="step-duration">${(step.duration / 1000).toFixed(2)}s</span>
              ${step.error ? `<div class="step-error">${escapeHtml(step.error)}</div>` : ''}
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
  }

  // Integration test components
  if (test.components?.length) {
    detailsHTML += `
      <div class="detail-section">
        <h4>🔗 Components</h4>
        <div class="components-list">
          ${test.components.map((c) => `<span class="component-badge">${escapeHtml(c)}</span>`).join('')}
        </div>
        ${
          test.dependencies?.length
            ? `
          <div class="dependencies-list">
            <strong>Dependencies:</strong>
            ${test.dependencies.map((d) => `<span class="dependency-badge">${escapeHtml(d)}</span>`).join('')}
          </div>
        `
            : ''
        }
      </div>
    `;
  }

  detailsHTML += '</div>';
  return detailsHTML;
}

/**
 * Get CSS styles
 */
function getStyles() {
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
    .summary-card.clickable {
      cursor: pointer;
      transition: all 0.2s;
    }
    .summary-card.clickable:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    .summary-card.passed { border-left: 4px solid #22c55e; }
    .summary-card.failed { border-left: 4px solid #ef4444; }
    .summary-stat { text-align: center; }
    .stat-value { display: block; font-size: 32px; font-weight: bold; color: #333; }
    .stat-label { display: block; font-size: 14px; color: #666; margin-top: 5px; }
    .type-filter {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .filter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .filter-header h3 {
      font-size: 18px;
      color: #333;
      margin: 0;
    }
    .filter-reset {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .filter-reset:hover {
      background: #e5e7eb;
      border-color: #9ca3af;
    }
    .type-filter-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }
    .type-filter-card {
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .type-filter-card:hover {
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.2);
    }
    .type-filter-card.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-color: #667eea;
      color: white;
    }
    .type-icon {
      font-size: 24px;
      line-height: 1;
    }
    .type-info {
      flex: 1;
    }
    .type-name {
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .type-stats {
      font-size: 12px;
      opacity: 0.8;
    }
    .type-filter-card.active .type-stats {
      opacity: 1;
    }
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
      padding: 12px;
    }
    .test-header.clickable {
      cursor: pointer;
      transition: background-color 0.2s;
    }
    .test-header.clickable:hover {
      background-color: rgba(0, 0, 0, 0.02);
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
    .expand-icon {
      font-size: 10px;
      transition: transform 0.2s;
      color: #666;
    }
    .test-case.expanded .expand-icon {
      transform: rotate(90deg);
    }
    .test-details {
      padding: 15px;
      border-top: 1px solid #e5e7eb;
      background: rgba(0, 0, 0, 0.02);
    }
    .detail-section {
      margin-bottom: 20px;
    }
    .detail-section:last-child {
      margin-bottom: 0;
    }
    .detail-section h4 {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 10px;
      color: #374151;
    }
    .error-box {
      background: white;
      padding: 12px;
      border-radius: 6px;
      margin: 8px 0;
    }
    .error-box {
      border-left: 3px solid #ef4444;
    }
    .error-box pre {
      font-size: 13px;
      color: #991b1b;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'SF Mono', Monaco, monospace;
    }
    .diff-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 12px 0;
    }
    .diff-expected, .diff-actual {
      background: #f9fafb;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    .diff-expected {
      border-left: 3px solid #22c55e;
    }
    .diff-expected strong {
      color: #16a34a;
      font-size: 12px;
    }
    .diff-actual {
      border-left: 3px solid #ef4444;
    }
    .diff-actual strong {
      color: #dc2626;
      font-size: 12px;
    }
    .diff-expected pre, .diff-actual pre {
      margin-top: 8px;
      font-size: 12px;
      color: #374151;
      font-family: 'SF Mono', Monaco, monospace;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .diff-output {
      background: #f9fafb;
      padding: 12px;
      border-radius: 6px;
      margin: 12px 0;
    }
    .diff-output strong {
      color: #6b7280;
      font-size: 12px;
    }
    .diff-output pre {
      margin-top: 8px;
      font-size: 12px;
      color: #374151;
      font-family: 'SF Mono', Monaco, monospace;
    }
    .stack-trace {
      font-size: 11px;
      color: #666;
      max-height: 200px;
      overflow-y: auto;
    }
    .prompt-box, .response-box, .tools-box {
      background: white;
      padding: 12px;
      border-radius: 6px;
      margin: 8px 0;
      border-left: 3px solid #3b82f6;
    }
    .llm-interaction {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      margin: 10px 0;
      overflow: hidden;
    }
    .interaction-header {
      background: #f9fafb;
      padding: 10px 15px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      gap: 15px;
      align-items: center;
      font-size: 13px;
    }
    .interaction-content {
      padding: 15px;
    }
    .interaction-content pre {
      font-size: 12px;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'SF Mono', Monaco, monospace;
      line-height: 1.5;
    }
    .tool-call {
      background: #f3f4f6;
      padding: 8px 12px;
      border-radius: 4px;
      margin: 5px 0;
      font-size: 12px;
    }
    .tool-call code {
      background: #e5e7eb;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
    }
    .tool-error {
      color: #dc2626;
      margin-left: 10px;
    }
    .token-usage {
      font-size: 11px;
      color: #666;
      margin-top: 10px;
      font-family: monospace;
    }
    .xml-validation {
      background: white;
      padding: 12px;
      border-radius: 6px;
    }
    .warning {
      background: #fef3c7;
      color: #92400e;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 10px;
      font-size: 13px;
    }
    .validation-tags {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .tag-validation {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
    }
    .tag-validation.valid {
      background: #f0fdf4;
      border-left: 3px solid #22c55e;
    }
    .tag-validation.invalid {
      background: #fef2f2;
      border-left: 3px solid #ef4444;
    }
    .tag-validation strong {
      font-family: monospace;
      min-width: 120px;
    }
    .tag-errors {
      color: #dc2626;
      font-size: 11px;
      margin-top: 4px;
    }
    .validation-errors ul {
      margin-left: 20px;
      font-size: 12px;
      color: #dc2626;
    }
    .agent-info, .validations-list {
      background: white;
      padding: 12px;
      border-radius: 6px;
    }
    .agent-info div {
      padding: 4px 0;
      font-size: 13px;
    }
    .test-info {
      background: white;
      padding: 12px;
      border-radius: 6px;
    }
    .info-row {
      padding: 6px 0;
      font-size: 13px;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-row strong {
      display: inline-block;
      min-width: 120px;
      color: #6b7280;
    }
    .tag {
      background: #e5e7eb;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      margin-right: 4px;
    }
    .console-output {
      background: #1e293b;
      padding: 12px;
      border-radius: 6px;
      max-height: 400px;
      overflow-y: auto;
    }
    .console-log {
      margin: 4px 0;
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 12px;
      display: flex;
      gap: 8px;
    }
    .console-type {
      color: #94a3b8;
      font-weight: 600;
      min-width: 60px;
    }
    .console-log pre {
      margin: 0;
      color: #e2e8f0;
      white-space: pre-wrap;
      word-wrap: break-word;
      flex: 1;
    }
    .console-log.console-error pre {
      color: #fca5a5;
    }
    .console-log.console-warn pre {
      color: #fcd34d;
    }
    .console-log.console-info pre {
      color: #93c5fd;
    }
    .format-errors ul {
      margin-left: 20px;
      color: #dc2626;
      font-size: 12px;
    }
    .validation-item {
      padding: 8px 12px;
      margin: 5px 0;
      border-radius: 4px;
      font-size: 13px;
    }
    .validation-item.passed {
      background: #f0fdf4;
    }
    .validation-item.failed {
      background: #fef2f2;
    }
    .validation-message {
      margin-top: 4px;
      font-size: 12px;
      color: #666;
    }
    .steps-list {
      background: white;
      padding: 12px;
      border-radius: 6px;
    }
    .step-item {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 8px;
      margin: 5px 0;
      border-radius: 4px;
      font-size: 13px;
    }
    .step-item.passed { background: #f0fdf4; }
    .step-item.failed { background: #fef2f2; }
    .step-number {
      background: #e5e7eb;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 11px;
    }
    .step-name { flex: 1; }
    .step-status {
      text-transform: uppercase;
      font-size: 11px;
      font-weight: 600;
    }
    .step-duration {
      font-family: monospace;
      font-size: 11px;
      color: #666;
    }
    .step-error {
      width: 100%;
      margin-top: 5px;
      color: #dc2626;
      font-size: 12px;
    }
    .components-list, .dependencies-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 10px 0;
    }
    .component-badge, .dependency-badge {
      background: #dbeafe;
      color: #1e40af;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .dependency-badge {
      background: #fef3c7;
      color: #92400e;
    }
    details {
      margin-top: 8px;
    }
    summary {
      cursor: pointer;
      font-size: 12px;
      color: #666;
      padding: 4px 0;
    }
    summary:hover {
      color: #333;
    }
  `;
}

/**
 * Get JavaScript for interactivity
 */
function getScripts() {
  return `
    let activeFilter = 'all';
    let activeStatusFilter = 'all';
    
    function toggleDetails(testId) {
      const testCase = document.getElementById(testId);
      const details = testCase.querySelector('.test-details');
      
      if (details.style.display === 'none' || !details.style.display) {
        details.style.display = 'block';
        testCase.classList.add('expanded');
      } else {
        details.style.display = 'none';
        testCase.classList.remove('expanded');
      }
    }
    
    function filterByStatus(status) {
      activeStatusFilter = status;
      
      // Filter test cases by status
      document.querySelectorAll('.test-case').forEach(testCase => {
        const matchesType = activeFilter === 'all' || 
          testCase.querySelector('.test-type').textContent.toLowerCase() === activeFilter;
        const matchesStatus = status === 'all' || testCase.classList.contains(status);
        
        if (matchesType && matchesStatus) {
          testCase.style.display = '';
        } else {
          testCase.style.display = 'none';
        }
      });
      
      updateSuiteVisibility();
    }
    
    function filterByType(type) {
      activeFilter = type;
      
      // Update active state on filter cards
      document.querySelectorAll('.type-filter-card').forEach(card => {
        if (type === 'all') {
          card.classList.remove('active');
        } else if (card.dataset.type === type) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });
      
      // Filter test cases by type
      document.querySelectorAll('.test-case').forEach(testCase => {
        const matchesType = type === 'all' || 
          testCase.querySelector('.test-type').textContent.toLowerCase() === type;
        const matchesStatus = activeStatusFilter === 'all' || 
          testCase.classList.contains(activeStatusFilter);
        
        if (matchesType && matchesStatus) {
          testCase.style.display = '';
        } else {
          testCase.style.display = 'none';
        }
      });
      
      updateSuiteVisibility();
    }
    
    function updateSuiteVisibility() {
      // Update suite visibility - hide suites with no visible tests
      document.querySelectorAll('.test-suite').forEach(suite => {
        const visibleTests = Array.from(suite.querySelectorAll('.test-case')).filter(
          test => test.style.display !== 'none'
        );
        
        if (visibleTests.length === 0) {
          suite.style.display = 'none';
        } else {
          suite.style.display = '';
          // Update suite stats
          const statsSpan = suite.querySelector('.suite-stats');
          const passedCount = visibleTests.filter(
            test => test.classList.contains('passed')
          ).length;
          statsSpan.textContent = passedCount + '/' + visibleTests.length + ' passed';
        }
      });
    }
    
    console.log('🧪 BMAD Test Report loaded');
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
📊 Generate HTML Report from JSON Test Results

Usage:
  npm run generate-html <input.json> [output.html]

Arguments:
  input.json   - Path to JSON test results file
  output.html  - Path to output HTML file (optional)
                 Default: same directory as input with .html extension

Examples:
  npm run generate-html test-results/reports/test-results.json
  npm run generate-html test-results.json custom-report.html

Options:
  --help, -h   - Show this help message
`);
    process.exit(0);
  }

  const inputPath = args[0];
  const outputPath =
    args[1] ||
    inputPath.replace(/\.json$/i, '.html').replace(/\.json$/i, '-report.html');

  try {
    // Read JSON report
    console.log(`📂 Reading JSON report: ${inputPath}`);
    const jsonContent = await fs.readFile(inputPath, 'utf-8');
    const report = JSON.parse(jsonContent);

    // Generate HTML
    console.log(`🎨 Generating HTML report...`);
    const html = generateHTMLReport(report);

    // Write HTML file
    console.log(`💾 Writing HTML report: ${outputPath}`);
    await fs.writeFile(outputPath, html, 'utf-8');

    console.log(`✅ HTML report generated successfully!`);
    console.log(`   Input:  ${inputPath}`);
    console.log(`   Output: ${outputPath}`);

    // Print summary
    const { summary } = report;
    console.log(`\n📈 Report Summary:`);
    console.log(`   Total:   ${summary.total}`);
    console.log(`   Passed:  ${summary.passed}`);
    console.log(`   Failed:  ${summary.failed}`);
    console.log(`   Success: ${summary.successRate.toFixed(1)}%`);
  } catch (error) {
    console.error(`❌ Error generating HTML report:`);
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
