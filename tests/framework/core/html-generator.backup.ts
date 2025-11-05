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

import type { TestReport, TestResult } from './types.js';

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
 * Generate summary section with clickable cards
 */
function generateSummary(report: TestReport): string {
  const { summary } = report;
  const successRate = summary.successRate.toFixed(1);
  const duration = (summary.duration / 1000).toFixed(2);

  // Calculate stats by test type
  const byType = summary.byType || {};
  const testTypes = Object.keys(byType);

  return `
    <section class="summary">
      <div class="summary-card clickable" onclick="filterTests('all')">
        <div class="summary-stat">
          <span class="stat-value">${summary.total}</span>
          <span class="stat-label">Total Tests</span>
        </div>
      </div>
      <div class="summary-card passed clickable" onclick="filterTests('passed')">
        <div class="summary-stat">
          <span class="stat-value">${summary.passed}</span>
          <span class="stat-label">Passed</span>
        </div>
      </div>
      <div class="summary-card failed clickable" onclick="filterTests('failed')">
        <div class="summary-stat">
          <span class="stat-value">${summary.failed}</span>
          <span class="stat-label">Failed</span>
        </div>
      </div>
      <div class="summary-card skipped clickable" onclick="filterTests('skipped')">
        <div class="summary-stat">
          <span class="stat-value">${summary.skipped}</span>
          <span class="stat-label">Skipped</span>
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
    
    <section class="test-type-summary">
      ${testTypes
        .map((type) => {
          const stats = byType[type as keyof typeof byType];
          const passed = stats?.passed || 0;
          const total = stats?.total || 0;
          const rate = total > 0 ? ((passed / total) * 100).toFixed(0) : '0';
          return `
          <div class="type-card clickable" onclick="filterTests('type:${type}')">
            <div class="type-header">
              <span class="type-name">${type.toUpperCase()}</span>
              <span class="type-rate">${rate}%</span>
            </div>
            <div class="type-stats">${passed}/${total} passed</div>
          </div>
        `;
        })
        .join('')}
    </section>
    
    <div class="controls">
      <button onclick="filterTests('all')" class="btn btn-primary">View All</button>
      <button onclick="expandAll()" class="btn">Expand All</button>
      <button onclick="collapseAll()" class="btn">Collapse All</button>
    </div>
  `;
}

/**
 * Generate test suites section with collapsible functionality
 */
function generateSuites(report: TestReport): string {
  const suitesHTML = report.suites
    .map((suite, index) => {
      const passed = suite.tests.filter((t) => t.status === 'passed').length;
      const testsHTML = suite.tests
        .map((test, testIndex) => {
          const statusClass = test.status;
          const statusIcon =
            test.status === 'passed'
              ? '✅'
              : test.status === 'failed'
                ? '❌'
                : '⏭️';
          const duration = (test.duration / 1000).toFixed(3);
          const testId = `test-${index}-${testIndex}`;

          return `
            <div class="test-case ${statusClass}" data-type="${test.type}" data-status="${test.status}">
              <div class="test-header" onclick="toggleTest('${testId}')">
                <span class="test-icon">${statusIcon}</span>
                <span class="test-name">${escapeHtml(test.name)}</span>
                <span class="test-type">${test.type}</span>
                <span class="test-duration">${duration}s</span>
                <span class="expand-icon">▶</span>
              </div>
              ${generateTestDetails(test, testId)}
            </div>
          `;
        })
        .join('');

      return `
        <div class="test-suite" data-suite-index="${index}">
          <div class="suite-header" onclick="toggleSuite(${index})">
            <div class="suite-title">
              <span class="collapse-icon">▼</span>
              <h3>${escapeHtml(suite.name)}</h3>
            </div>
            <span class="suite-stats">${passed}/${suite.tests.length} passed</span>
          </div>
          <div class="test-cases" id="suite-${index}">
            ${testsHTML}
          </div>
        </div>
      `;
    })
    .join('');

  return `<section class="suites">${suitesHTML}</section>`;
}

/**
 * Generate detailed test information panel
 */
function generateTestDetails(test: TestResult, testId: string): string {
  const sections: string[] = [];

  // Error details
  if (test.error) {
    sections.push(`
      <div class="detail-section error-section">
        <h4>❌ Error Details</h4>
        <pre class="error-message">${escapeHtml(test.error.message)}</pre>
        ${test.error.stack ? `<pre class="error-stack">${escapeHtml(test.error.stack)}</pre>` : ''}
        ${test.error.diff ? `<pre class="error-diff">${escapeHtml(test.error.diff)}</pre>` : ''}
      </div>
    `);
  }

  // LLM interactions (for LLM tests) - COMMENTED OUT: User prefers "Test Flow" section
  // if ('llmInteractions' in test && test.llmInteractions?.length > 0) {
  //   const interactionsHTML = test.llmInteractions
  //     .map((interaction, idx) => {
  //       const toolCallsHTML = interaction.toolCalls
  //         .map(
  //           (tool) => {
  //             // Format tool result properly - check if it's a string or object
  //             let resultContent = '';
  //             if (tool.result) {
  //               if (typeof tool.result === 'string') {
  //                 resultContent = escapeHtml(tool.result);
  //               } else {
  //                 resultContent = JSON.stringify(tool.result, null, 2);
  //               }
  //             }

  //             // Format arguments nicely
  //             const argsContent = JSON.stringify(tool.arguments, null, 2);

  //             return `
  //         <div class="tool-call">
  //           <div class="tool-header">
  //             <strong>🔧 ${escapeHtml(tool.name)}</strong>
  //             <span class="tool-duration">${(tool.duration / 1000).toFixed(3)}s</span>
  //           </div>
  //           <div class="tool-args">
  //             <strong>📥 Arguments:</strong>
  //             <pre class="tool-args-content">${argsContent}</pre>
  //           </div>
  //           ${resultContent ? `
  //             <div class="tool-result">
  //               <strong>📤 Result:</strong>
  //               <pre class="tool-result-content">${resultContent}</pre>
  //             </div>
  //           ` : ''}
  //           ${tool.error ? `
  //             <div class="tool-error">
  //               <strong>❌ Error:</strong>
  //               <pre>${escapeHtml(tool.error)}</pre>
  //             </div>
  //           ` : ''}
  //         </div>
  //       `;
  //           },
  //         )
  //         .join('');

  //       return `
  //         <div class="llm-interaction">
  //           <div class="interaction-header">
  //             <strong>💬 Interaction ${idx + 1}</strong>
  //             <span>${interaction.provider.model}</span>
  //             <span>${(interaction.duration / 1000).toFixed(2)}s</span>
  //           </div>

  //           ${interaction.systemMessage ? `
  //             <div class="system-message">
  //               <strong>🔷 SYSTEM:</strong>
  //               <pre>${escapeHtml(interaction.systemMessage)}</pre>
  //             </div>
  //           ` : ''}

  //           <div class="user-prompt">
  //             <strong>👤 USER:</strong>
  //             <pre>${escapeHtml(interaction.prompt)}</pre>
  //           </div>

  //           ${toolCallsHTML ? `
  //             <div class="tool-calls">
  //               <strong>🔧 TOOL CALLS:</strong>
  //               ${toolCallsHTML}
  //             </div>
  //           ` : ''}

  //           <div class="llm-response">
  //             <strong>🤖 RESPONSE:</strong>
  //             <pre>${escapeHtml(interaction.response)}</pre>
  //           </div>

  //           ${interaction.tokenUsage ? `
  //             <div class="token-usage">
  //               <strong>📊 Tokens:</strong>
  //               Prompt: ${interaction.tokenUsage.prompt} |
  //               Completion: ${interaction.tokenUsage.completion} |
  //               Total: ${interaction.tokenUsage.total}
  //             </div>
  //           ` : ''}
  //         </div>
  //       `;
  //     })
  //     .join('');

  //   sections.push(`
  //     <div class="detail-section llm-section">
  //       <h4>💬 LLM Interactions</h4>
  //       ${interactionsHTML}
  //     </div>
  //   `);
  // }

  // Agent logs (for agent/LLM tests)
  if ('agentLogs' in test && test.agentLogs && test.agentLogs.length > 0) {
    const logsHTML = test.agentLogs
      .map((log) => {
        const entriesHTML = log.entries
          .map(
            (entry) => `
          <div class="log-entry log-${entry.level}">
            <span class="log-time">${new Date(entry.timestamp).toLocaleTimeString()}</span>
            <span class="log-level">[${entry.level.toUpperCase()}]</span>
            <span class="log-source">${entry.source || ''}</span>
            <span class="log-message">${escapeHtml(entry.message)}</span>
            ${entry.context ? `<pre class="log-context">${JSON.stringify(entry.context, null, 2)}</pre>` : ''}
          </div>
        `,
          )
          .join('');

        return `
          <div class="agent-log">
            <div class="log-header">
              <strong>📋 ${escapeHtml(log.agentName)}</strong>
              <span>${new Date(log.startTime).toLocaleTimeString()}</span>
            </div>
            <div class="log-entries">
              ${entriesHTML}
            </div>
          </div>
        `;
      })
      .join('');

    sections.push(`
      <div class="detail-section logs-section">
        <h4>📋 Agent Logs</h4>
        ${logsHTML}
      </div>
    `);
  }

  // XML validation (for LLM tests)
  if ('xmlValidation' in test && test.xmlValidation) {
    const xml = test.xmlValidation;
    const tagsHTML = xml.tags
      .map(
        (tag) => `
        <div class="xml-tag ${tag.found && tag.closed && tag.hasContent ? 'valid' : 'invalid'}">
          <strong>&lt;${escapeHtml(tag.tag)}&gt;</strong>
          <span>Found: ${tag.found ? '✅' : '❌'}</span>
          <span>Closed: ${tag.closed ? '✅' : '❌'}</span>
          <span>Content: ${tag.hasContent ? '✅' : '❌'}</span>
          ${tag.errors.length > 0 ? `<div class="tag-errors">${tag.errors.map((e) => escapeHtml(e)).join('<br>')}</div>` : ''}
        </div>
      `,
      )
      .join('');

    sections.push(`
      <div class="detail-section xml-section">
        <h4>📝 XML Validation ${xml.valid ? '✅' : '❌'}</h4>
        <div class="xml-tags">${tagsHTML}</div>
        ${xml.instructionLeakage ? '<div class="warning">⚠️ Instruction leakage detected!</div>' : ''}
        ${xml.errors.length > 0 ? `<div class="xml-errors">${xml.errors.map((e) => escapeHtml(e)).join('<br>')}</div>` : ''}
      </div>
    `);
  }

  // Agent metadata (for agent tests)
  if ('agent' in test && test.agent) {
    const agent = test.agent;
    sections.push(`
      <div class="detail-section agent-section">
        <h4>🤖 Agent Details</h4>
        <div class="agent-info">
          <div><strong>Name:</strong> ${escapeHtml(agent.name)}</div>
          <div><strong>Module:</strong> ${escapeHtml(agent.module)}</div>
          <div><strong>File:</strong> ${escapeHtml(agent.filePath)}</div>
          <div><strong>Exists:</strong> ${agent.exists ? '✅' : '❌'}</div>
          <div><strong>Valid Format:</strong> ${agent.validFormat ? '✅' : '❌'}</div>
          ${agent.formatErrors.length > 0 ? `<div class="format-errors"><strong>Errors:</strong><br>${agent.formatErrors.map((e) => escapeHtml(e)).join('<br>')}</div>` : ''}
        </div>
      </div>
    `);
  }

  // Agent validations (for agent tests)
  if ('validations' in test && test.validations?.length > 0) {
    const validationsHTML = test.validations
      .map(
        (v) => `
        <div class="validation ${v.passed ? 'passed' : 'failed'}">
          ${v.passed ? '✅' : '❌'} ${escapeHtml(v.check)}
          ${v.message ? `<div class="validation-message">${escapeHtml(v.message)}</div>` : ''}
        </div>
      `,
      )
      .join('');

    sections.push(`
      <div class="detail-section validations-section">
        <h4>✓ Validations</h4>
        ${validationsHTML}
      </div>
    `);
  }

  // E2E steps (for E2E tests)
  if ('steps' in test && test.steps?.length > 0) {
    const stepsHTML = test.steps
      .map(
        (step) => `
        <div class="e2e-step ${step.status}">
          <span class="step-status">${step.status === 'passed' ? '✅' : step.status === 'failed' ? '❌' : '⏭️'}</span>
          <span class="step-name">${escapeHtml(step.name)}</span>
          <span class="step-duration">${(step.duration / 1000).toFixed(3)}s</span>
          ${step.error ? `<div class="step-error">${escapeHtml(step.error)}</div>` : ''}
        </div>
      `,
      )
      .join('');

    sections.push(`
      <div class="detail-section steps-section">
        <h4>📋 Steps</h4>
        ${stepsHTML}
      </div>
    `);
  }

  // Chat Conversation (for LLM tests) - Renders like VS Code Copilot chat window
  if ('chatConversation' in test && test.chatConversation) {
    const conv = test.chatConversation;
    const messagesHTML = conv.messages
      .map((msg) => {
        const msgClass = `chat-message chat-${msg.role}`;
        const roleIcon =
          {
            user: '👤',
            assistant: '🤖',
            system: '⚙️',
            tool: '🔧',
          }[msg.role] || '💬';
        const roleName = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);

        let contentHTML = '';

        // User/System messages - just show content
        if (msg.role === 'user' || msg.role === 'system') {
          contentHTML = `<pre class="chat-content">${escapeHtml(msg.content || '')}</pre>`;
        }

        // Assistant messages - show content and/or tool calls
        else if (msg.role === 'assistant') {
          if (msg.content) {
            contentHTML += `<pre class="chat-content">${escapeHtml(msg.content)}</pre>`;
          }
          if (msg.toolCalls && msg.toolCalls.length > 0) {
            const toolCallsHTML = msg.toolCalls
              .map((tool) => {
                const argsJSON = JSON.stringify(tool.arguments, null, 2);
                return `
                  <div class="chat-tool-call">
                    <div class="tool-call-header">
                      <strong>🔧 ${escapeHtml(tool.name)}</strong>
                      <span class="tool-duration">${(tool.duration / 1000).toFixed(3)}s</span>
                    </div>
                    <details class="tool-call-details">
                      <summary>Arguments</summary>
                      <pre>${escapeHtml(argsJSON)}</pre>
                    </details>
                  </div>
                `;
              })
              .join('');
            contentHTML += `<div class="chat-tool-calls">${toolCallsHTML}</div>`;
          }
          if (!msg.content && (!msg.toolCalls || msg.toolCalls.length === 0)) {
            contentHTML = `<pre class="chat-content chat-empty">[No text response]</pre>`;
          }
        }

        // Tool result messages
        else if (msg.role === 'tool') {
          const truncatedContent = msg.content
            ? msg.content.length > 1000
              ? msg.content.substring(0, 1000) + '\n\n... (truncated)'
              : msg.content
            : '[Empty result]';
          contentHTML = `<pre class="chat-content chat-tool-result">${escapeHtml(truncatedContent)}</pre>`;
        }

        return `
          <div class="${msgClass}">
            <div class="chat-message-header">
              <span class="chat-role-icon">${roleIcon}</span>
              <span class="chat-role-name">${roleName}</span>
              <span class="chat-timestamp">${new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="chat-message-body">
              ${contentHTML}
            </div>
          </div>
        `;
      })
      .join('');

    const durationSec = (conv.duration / 1000).toFixed(2);
    const tokensInfo = conv.totalTokens
      ? `${conv.totalTokens.total} tokens (${conv.totalTokens.prompt} prompt + ${conv.totalTokens.completion} completion)`
      : 'N/A';

    sections.push(`
      <div class="detail-section chat-conversation-section">
        <h4>💬 Chat Conversation</h4>
        <div class="chat-info">
          <span>🤖 ${escapeHtml(conv.provider.model)}</span>
          <span>⏱️ ${durationSec}s</span>
          <span>📊 ${tokensInfo}</span>
        </div>
        <div class="chat-messages">
          ${messagesHTML}
        </div>
      </div>
    `);
  }

  // Metadata - Format LLM test data specially
  if (Object.keys(test.metadata).length > 0) {
    const metadata = test.metadata as any;

    // Check if this is LLM test metadata with USER/TOOL/SYSTEM structure
    if (
      metadata.userInput ||
      metadata.toolResponse ||
      metadata.systemResponse
    ) {
      sections.push(`
        <div class="detail-section llm-metadata-section">
          <h4>🧪 Test Flow</h4>
          ${
            metadata.userInput
              ? `
            <div class="llm-section">
              <h5>📤 USER INPUT</h5>
              <pre class="user-input">${escapeHtml(metadata.userInput)}</pre>
            </div>
          `
              : ''
          }
          ${
            metadata.toolResponse
              ? `
            <div class="llm-section">
              <h5>� TOOL RESPONSE</h5>
              <pre class="tool-response">${escapeHtml(metadata.toolResponse.substring(0, 2000))}${metadata.toolResponse.length > 2000 ? '\n\n... (truncated)' : ''}</pre>
            </div>
          `
              : ''
          }
          ${
            metadata.systemResponse
              ? `
            <div class="llm-section">
              <h5>🤖 SYSTEM RESPONSE</h5>
              <pre class="system-response">${escapeHtml(metadata.systemResponse)}</pre>
            </div>
          `
              : ''
          }
          ${
            metadata.testResults
              ? `
            <div class="llm-section">
              <h5>✅ TEST RESULTS</h5>
              <pre class="test-results">${JSON.stringify(metadata.testResults, null, 2)}</pre>
            </div>
          `
              : ''
          }
          ${
            metadata.agentName
              ? `
            <div class="llm-section">
              <h5>🏷️ AGENT</h5>
              <pre>${metadata.agentName}</pre>
            </div>
          `
              : ''
          }
        </div>
      `);
    } else {
      // Regular metadata display
      sections.push(`
        <div class="detail-section metadata-section">
          <h4>�📌 Metadata</h4>
          <pre>${JSON.stringify(test.metadata, null, 2)}</pre>
        </div>
      `);
    }
  }

  return `
    <div class="test-details" id="${testId}" style="display: none;">
      ${sections.join('')}
    </div>
  `;
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
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .summary-card.clickable {
      cursor: pointer;
    }
    .summary-card.clickable:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    .summary-card.passed { border-left: 4px solid #22c55e; }
    .summary-card.failed { border-left: 4px solid #ef4444; }
    .summary-card.skipped { border-left: 4px solid #f59e0b; }
    .summary-stat { text-align: center; }
    .stat-value { display: block; font-size: 32px; font-weight: bold; color: #333; }
    .stat-label { display: block; font-size: 14px; color: #666; margin-top: 5px; }
    
    .test-type-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .type-card {
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      border-left: 4px solid #667eea;
    }
    .type-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    }
    .type-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
    }
    .type-name {
      font-weight: 600;
      font-size: 14px;
      color: #333;
    }
    .type-rate {
      font-weight: bold;
      color: #667eea;
    }
    .type-stats {
      font-size: 12px;
      color: #666;
    }
    
    .controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .btn {
      padding: 10px 20px;
      border: 1px solid #d1d5db;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #f9fafb;
      border-color: #9ca3af;
    }
    .btn-primary {
      background: #667eea;
      color: white;
      border-color: #667eea;
    }
    .btn-primary:hover {
      background: #5568d3;
    }
    
    .test-suite {
      background: white;
      border-radius: 8px;
      margin-bottom: 15px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .test-suite.hidden {
      display: none;
    }
    .suite-header {
      padding: 15px 20px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
    }
    .suite-header:hover {
      background: #f9fafb;
    }
    .suite-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .collapse-icon {
      font-size: 12px;
      transition: transform 0.2s;
    }
    .test-suite.collapsed .collapse-icon {
      transform: rotate(-90deg);
    }
    .suite-header h3 { font-size: 18px; color: #333; }
    .suite-stats { font-size: 14px; color: #666; }
    .test-cases { padding: 10px; }
    .test-suite.collapsed .test-cases {
      display: none;
    }
    .test-case {
      padding: 12px;
      margin: 5px 0;
      border-radius: 6px;
      border-left: 3px solid transparent;
    }
    .test-case.hidden {
      display: none;
    }
    .test-case.passed { background: #f0fdf4; border-left-color: #22c55e; }
    .test-case.failed { background: #fef2f2; border-left-color: #ef4444; }
    .test-case.skipped { background: #f9fafb; border-left-color: #9ca3af; }
    .test-header {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
    }
    .test-header:hover {
      opacity: 0.8;
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
      color: #9ca3af;
    }
    .test-case.expanded .expand-icon {
      transform: rotate(90deg);
    }
    
    /* Test Details Sections */
    .test-details {
      margin-top: 10px;
      padding: 15px;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    .detail-section {
      margin-bottom: 20px;
      padding: 15px;
      background: white;
      border-radius: 6px;
      border-left: 3px solid #667eea;
    }
    .detail-section:last-child {
      margin-bottom: 0;
    }
    .detail-section h4 {
      margin-bottom: 10px;
      color: #374151;
      font-size: 16px;
    }
    
    /* Error Section */
    .error-section {
      border-left-color: #ef4444;
    }
    .error-message {
      background: #fee2e2;
      padding: 10px;
      border-radius: 4px;
      color: #991b1b;
      font-size: 13px;
      white-space: pre-wrap;
      word-wrap: break-word;
      margin-bottom: 10px;
    }
    .error-stack {
      background: #fef2f2;
      padding: 10px;
      border-radius: 4px;
      color: #7f1d1d;
      font-size: 11px;
      white-space: pre-wrap;
      word-wrap: break-word;
      max-height: 200px;
      overflow-y: auto;
    }
    .error-diff {
      background: #f9fafb;
      padding: 10px;
      border-radius: 4px;
      font-size: 12px;
      white-space: pre-wrap;
      margin-top: 10px;
    }
    
    /* LLM Interaction Section */
    .llm-section {
      border-left-color: #8b5cf6;
    }
    .llm-interaction {
      margin-bottom: 20px;
      padding: 15px;
      background: #faf5ff;
      border-radius: 6px;
      border: 1px solid #e9d5ff;
    }
    .llm-interaction:last-child {
      margin-bottom: 0;
    }
    .interaction-header {
      display: flex;
      gap: 15px;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e9d5ff;
      font-size: 14px;
      color: #6b21a8;
    }
    .system-message,
    .user-prompt,
    .llm-response {
      margin-bottom: 15px;
    }
    .system-message strong {
      display: block;
      margin-bottom: 5px;
      color: #0369a1;
    }
    .system-message pre {
      background: #e0f2fe;
      padding: 10px;
      border-radius: 4px;
      border-left: 3px solid #0369a1;
      font-size: 12px;
      white-space: pre-wrap;
    }
    .user-prompt strong {
      display: block;
      margin-bottom: 5px;
      color: #059669;
    }
    .user-prompt pre {
      background: #d1fae5;
      padding: 10px;
      border-radius: 4px;
      border-left: 3px solid #059669;
      font-size: 12px;
      white-space: pre-wrap;
    }
    .llm-response strong {
      display: block;
      margin-bottom: 5px;
      color: #7c3aed;
    }
    .llm-response pre {
      background: #f3e8ff;
      padding: 10px;
      border-radius: 4px;
      border-left: 3px solid #7c3aed;
      font-size: 12px;
      white-space: pre-wrap;
    }
    .tool-calls {
      margin: 15px 0;
    }
    .tool-calls > strong {
      display: block;
      margin-bottom: 10px;
      color: #ea580c;
    }
    .tool-call {
      margin-bottom: 10px;
      padding: 10px;
      background: #fff7ed;
      border-radius: 4px;
      border-left: 3px solid #ea580c;
    }
    .tool-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      color: #9a3412;
    }
    .tool-duration {
      font-size: 11px;
      font-family: monospace;
      color: #78350f;
    }
    .tool-args,
    .tool-result,
    .tool-error {
      margin-top: 8px;
      font-size: 12px;
    }
    .tool-args pre,
    .tool-result pre {
      background: #fffbeb;
      padding: 8px;
      border-radius: 4px;
      margin-top: 4px;
      font-size: 11px;
      max-height: 150px;
      overflow-y: auto;
    }
    .tool-args-content {
      font-family: 'Monaco', 'Courier New', monospace;
    }
    .tool-result-content {
      font-family: 'Monaco', 'Courier New', monospace;
      white-space: pre-wrap;
      word-wrap: break-word;
      max-height: 400px !important;
      line-height: 1.5;
    }
    .tool-error pre {
      background: #fee2e2;
      color: #991b1b;
      padding: 8px;
      border-radius: 4px;
      margin-top: 4px;
      font-size: 11px;
    }
    .token-usage {
      margin-top: 10px;
      padding: 8px;
      background: #f0f9ff;
      border-radius: 4px;
      font-size: 12px;
      color: #075985;
    }
    
    /* Agent Logs Section */
    .logs-section {
      border-left-color: #0891b2;
    }
    .agent-log {
      margin-bottom: 15px;
    }
    .log-header {
      display: flex;
      justify-content: space-between;
      padding: 8px 10px;
      background: #ecfeff;
      border-radius: 4px;
      margin-bottom: 10px;
      color: #0e7490;
      font-size: 14px;
    }
    .log-entries {
      font-family: monospace;
      font-size: 11px;
    }
    .log-entry {
      padding: 6px 10px;
      margin: 2px 0;
      border-radius: 3px;
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .log-entry.log-debug { background: #f9fafb; }
    .log-entry.log-info { background: #eff6ff; }
    .log-entry.log-warn { background: #fef3c7; }
    .log-entry.log-error { background: #fee2e2; }
    .log-time { color: #6b7280; min-width: 80px; }
    .log-level { color: #374151; font-weight: 600; min-width: 60px; }
    .log-source { color: #6366f1; min-width: 100px; }
    .log-message { flex: 1; color: #1f2937; }
    .log-context {
      margin-top: 5px;
      margin-left: 250px;
      padding: 5px;
      background: #f3f4f6;
      border-radius: 3px;
      font-size: 10px;
    }
    
    /* XML Validation Section */
    .xml-section {
      border-left-color: #dc2626;
    }
    .xml-tags {
      margin-top: 10px;
    }
    .xml-tag {
      padding: 10px;
      margin: 5px 0;
      border-radius: 4px;
      display: flex;
      gap: 15px;
      align-items: center;
      font-size: 13px;
    }
    .xml-tag.valid {
      background: #f0fdf4;
      border-left: 3px solid #22c55e;
    }
    .xml-tag.invalid {
      background: #fef2f2;
      border-left: 3px solid #ef4444;
    }
    .xml-tag strong {
      font-family: monospace;
      color: #4b5563;
    }
    .tag-errors {
      margin-top: 5px;
      color: #991b1b;
      font-size: 12px;
    }
    .xml-errors {
      margin-top: 10px;
      padding: 10px;
      background: #fee2e2;
      border-radius: 4px;
      color: #991b1b;
      font-size: 12px;
    }
    .warning {
      margin-top: 10px;
      padding: 10px;
      background: #fef3c7;
      border-radius: 4px;
      color: #92400e;
      font-weight: 600;
    }
    
    /* Agent Details Section */
    .agent-section {
      border-left-color: #10b981;
    }
    .agent-info div {
      padding: 5px 0;
      font-size: 13px;
    }
    .format-errors {
      margin-top: 10px;
      padding: 10px;
      background: #fee2e2;
      border-radius: 4px;
      color: #991b1b;
      font-size: 12px;
    }
    
    /* Validations Section */
    .validations-section {
      border-left-color: #f59e0b;
    }
    .validation {
      padding: 8px 12px;
      margin: 5px 0;
      border-radius: 4px;
      font-size: 13px;
    }
    .validation.passed {
      background: #f0fdf4;
      color: #166534;
    }
    .validation.failed {
      background: #fef2f2;
      color: #991b1b;
    }
    .validation-message {
      margin-top: 5px;
      font-size: 12px;
      opacity: 0.8;
    }
    
    /* E2E Steps Section */
    .steps-section {
      border-left-color: #06b6d4;
    }
    .e2e-step {
      padding: 10px;
      margin: 5px 0;
      border-radius: 4px;
      display: flex;
      gap: 10px;
      align-items: center;
      font-size: 13px;
    }
    .e2e-step.passed { background: #f0fdf4; }
    .e2e-step.failed { background: #fef2f2; }
    .e2e-step.skipped { background: #f9fafb; }
    .step-status { font-size: 16px; }
    .step-name { flex: 1; }
    .step-duration {
      font-family: monospace;
      font-size: 11px;
      color: #6b7280;
    }
    .step-error {
      margin-top: 5px;
      padding: 8px;
      background: #fee2e2;
      border-radius: 4px;
      color: #991b1b;
      font-size: 12px;
    }
    
    /* Metadata Section */
    .metadata-section {
      border-left-color: #6b7280;
    }
    .metadata-section pre {
      background: #f9fafb;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
    }
    
    /* LLM Metadata Section */
    .llm-metadata-section {
      border-left-color: #8b5cf6;
    }
    .llm-section {
      margin: 15px 0;
    }
    .llm-section h5 {
      margin: 0 0 8px 0;
      font-size: 13px;
      font-weight: 600;
      color: #4b5563;
      letter-spacing: 0.5px;
    }
    .llm-section pre {
      background: #f9fafb;
      padding: 12px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.5;
      margin: 0;
      border: 1px solid #e5e7eb;
    }
    .llm-section .user-input {
      background: #eff6ff;
      border-color: #3b82f6;
    }
    .llm-section .tool-response {
      background: #fef3c7;
      border-color: #f59e0b;
      max-height: 400px;
      overflow-y: auto;
    }
    .llm-section .system-response {
      background: #f0fdf4;
      border-color: #10b981;
    }
    .llm-section .test-results {
      background: #faf5ff;
      border-color: #8b5cf6;
    }

    /* Chat Conversation Styles (VS Code Copilot-like) */
    .chat-conversation-section {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
    }
    .chat-info {
      display: flex;
      gap: 16px;
      padding: 8px 12px;
      background: #e5e7eb;
      border-radius: 6px;
      margin-bottom: 16px;
      font-size: 13px;
      color: #374151;
    }
    .chat-messages {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .chat-message {
      border-radius: 8px;
      padding: 12px;
      border-left: 4px solid #ccc;
    }
    .chat-user {
      background: #eff6ff;
      border-left-color: #3b82f6;
    }
    .chat-assistant {
      background: #f0fdf4;
      border-left-color: #10b981;
    }
    .chat-system {
      background: #fef3c7;
      border-left-color: #f59e0b;
    }
    .chat-tool {
      background: #faf5ff;
      border-left-color: #8b5cf6;
    }
    .chat-message-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
    }
    .chat-role-icon {
      font-size: 16px;
    }
    .chat-role-name {
      color: #374151;
    }
    .chat-timestamp {
      margin-left: auto;
      font-size: 11px;
      color: #6b7280;
      font-weight: normal;
    }
    .chat-message-body {
      margin-top: 8px;
    }
    .chat-content {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px;
      margin: 0;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 13px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-x: auto;
    }
    .chat-empty {
      color: #9ca3af;
      font-style: italic;
    }
    .chat-tool-result {
      background: #fafafa;
      max-height: 300px;
      overflow-y: auto;
    }
    .chat-tool-calls {
      margin-top: 8px;
    }
    .chat-tool-call {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 8px;
    }
    .tool-call-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .tool-duration {
      font-size: 11px;
      color: #6b7280;
      font-weight: normal;
    }
    .tool-call-details {
      margin-top: 8px;
    }
    .tool-call-details summary {
      cursor: pointer;
      font-size: 12px;
      color: #6b7280;
      user-select: none;
    }
    .tool-call-details summary:hover {
      color: #374151;
    }
    .tool-call-details pre {
      margin-top: 8px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 8px;
      font-size: 12px;
      overflow-x: auto;
    }

      border-radius: 4px;
      font-size: 12px;
      overflow-x: auto;
    }
  `;
}

/**
 * Get JavaScript for interactivity
 */
function getScripts(): string {
  return `
    // Filter tests by status or type
    function filterTests(filter) {
      const testCases = document.querySelectorAll('.test-case');
      const testSuites = document.querySelectorAll('.test-suite');
      
      // Show all if 'all' filter
      if (filter === 'all') {
        testCases.forEach(tc => tc.classList.remove('hidden'));
        testSuites.forEach(ts => ts.classList.remove('hidden'));
        return;
      }
      
      // Filter by status (passed, failed, skipped)
      if (['passed', 'failed', 'skipped'].includes(filter)) {
        testCases.forEach(tc => {
          if (tc.dataset.status === filter) {
            tc.classList.remove('hidden');
          } else {
            tc.classList.add('hidden');
          }
        });
      }
      
      // Filter by test type (type:unit, type:integration, etc.)
      if (filter.startsWith('type:')) {
        const type = filter.replace('type:', '');
        testCases.forEach(tc => {
          if (tc.dataset.type === type) {
            tc.classList.remove('hidden');
          } else {
            tc.classList.add('hidden');
          }
        });
      }
      
      // Hide empty suites
      testSuites.forEach(suite => {
        const visibleTests = suite.querySelectorAll('.test-case:not(.hidden)');
        if (visibleTests.length === 0) {
          suite.classList.add('hidden');
        } else {
          suite.classList.remove('hidden');
        }
      });
    }
    
    // Toggle individual test details
    function toggleTest(testId) {
      const details = document.getElementById(testId);
      const testCase = details.closest('.test-case');
      
      if (details.style.display === 'none' || !details.style.display) {
        details.style.display = 'block';
        testCase.classList.add('expanded');
      } else {
        details.style.display = 'none';
        testCase.classList.remove('expanded');
      }
    }
    
    // Toggle individual suite collapse
    function toggleSuite(index) {
      const suite = document.querySelector('[data-suite-index="' + index + '"]');
      if (suite) {
        suite.classList.toggle('collapsed');
      }
    }
    
    // Expand all suites
    function expandAll() {
      document.querySelectorAll('.test-suite').forEach(suite => {
        suite.classList.remove('collapsed');
      });
    }
    
    // Collapse all suites
    function collapseAll() {
      document.querySelectorAll('.test-suite').forEach(suite => {
        suite.classList.add('collapsed');
      });
    }
    
    console.log('BMAD Test Report loaded - Interactive features enabled');
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
