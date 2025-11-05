/**
 * Clean HTML Generator - Minimal View
 *
 * Shows ALL raw test data under collapsible metadata sections.
 * No fancy styling, just the data.
 */

import type { TestReport, TestResult } from './types.js';

/**
 * Generate HTML report from test results
 */
export function generateHTMLReport(report: TestReport): string {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report</title>
  <style>
    ${getMinimalStyles()}
  </style>
</head>
<body>
  ${generateHeader(report)}
  <div class="layout">
    <div class="sidebar">
      ${generateTreeView(report)}
    </div>
    <div class="main-content">
      <div id="detail-panel" class="detail-panel">
        <div class="empty-state">
          <div class="empty-icon">👈</div>
          <p>Select a test from the tree to view details</p>
        </div>
      </div>
    </div>
  </div>
  <script>
    // Store test data globally
    window.testData = ${JSON.stringify(report.tests)};
  </script>
  <script>
    ${getScripts()}
  </script>
</body>
</html>
  `.trim();

  return html;
}

/**
 * Generate report header with summary
 */
function generateHeader(report: TestReport): string {
  const summary = report.summary;
  const passRate = ((summary.passed / summary.total) * 100).toFixed(1);

  return `
    <header class="report-header">
      <h1>Test Report</h1>
      <div class="summary">
        <div class="summary-item">
          <span class="label">Total:</span>
          <span class="value">${summary.total}</span>
        </div>
        <div class="summary-item">
          <span class="label">Passed:</span>
          <span class="value passed">${summary.passed}</span>
        </div>
        <div class="summary-item">
          <span class="label">Failed:</span>
          <span class="value failed">${summary.failed}</span>
        </div>
        <div class="summary-item">
          <span class="label">Skipped:</span>
          <span class="value skipped">${summary.skipped}</span>
        </div>
        <div class="summary-item">
          <span class="label">Pass Rate:</span>
          <span class="value">${passRate}%</span>
        </div>
        <div class="summary-item">
          <span class="label">Duration:</span>
          <span class="value">${(summary.duration / 1000).toFixed(2)}s</span>
        </div>
      </div>
    </header>
  `;
}

/**
 * Generate test list grouped like VS Code Test Explorer
 */
function generateTreeView(report: TestReport): string {
  const grouped = groupTestsLikeVSCode(report.tests);
  let html = '<div class="tree-container">';

  // Sort test types
  const sortedTypes = Object.keys(grouped).sort((a, b) => {
    const order = ['e2e', 'integration', 'llm', 'unit'];
    return order.indexOf(a) - order.indexOf(b);
  });

  for (const testType of sortedTypes) {
    const fileGroups = grouped[testType];
    html += `<div class="tree-type">`;
    html += `<div class="tree-node tree-type-node" onclick="toggleTreeNode(this)">
      <span class="tree-icon">📁</span>
      <span class="tree-label">${testType}</span>
      <span class="tree-count">(${countTestsInRecord(fileGroups)})</span>
    </div>`;
    html += `<div class="tree-children">`;

    const sortedFiles = Object.keys(fileGroups).sort();
    for (const filePath of sortedFiles) {
      const suiteGroups = fileGroups[filePath];
      html += `<div class="tree-file">`;
      html += `<div class="tree-node tree-file-node" onclick="toggleTreeNode(this)">
        <span class="tree-icon">📄</span>
        <span class="tree-label">${getFileName(filePath)}</span>
        <span class="tree-count">(${countTestsInRecord(suiteGroups)})</span>
      </div>`;
      html += `<div class="tree-children">`;

      const sortedSuites = Object.keys(suiteGroups).sort((a, b) => {
        if (a === '__no_suite__') return 1;
        if (b === '__no_suite__') return -1;
        return a.localeCompare(b);
      });

      for (const suiteName of sortedSuites) {
        const tests = suiteGroups[suiteName];
        if (suiteName !== '__no_suite__') {
          // Suite level
          html += `<div class="tree-suite">`;
          html += `<div class="tree-node tree-suite-node" onclick="toggleTreeNode(this)">
            <span class="tree-icon">📋</span>
            <span class="tree-label">${escapeHtml(suiteName)}</span>
            <span class="tree-count">(${tests.length})</span>
          </div>`;
          html += `<div class="tree-children">`;
          for (const test of tests) {
            html += generateTreeTestNode(test, report.tests);
          }
          html += `</div></div>`;
        } else {
          // Tests without suite (direct children of file)
          for (const test of tests) {
            html += generateTreeTestNode(test, report.tests);
          }
        }
      }

      html += `</div></div>`;
    }

    html += `</div></div>`;
  }

  html += '</div>';
  return html;
}

function generateTreeTestNode(
  test: TestResult,
  allTests: TestResult[],
): string {
  const status =
    test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️';
  const testIndex = allTests.findIndex((t) => t === test);
  const testName = test.name.split(' > ').pop() || test.name;

  return `<div class="tree-test" data-test-index="${testIndex}">
    <div class="tree-node tree-test-node" onclick="showTestDetails(${testIndex})">
      <span class="tree-icon">${status}</span>
      <span class="tree-label">${escapeHtml(testName)}</span>
      <span class="tree-duration">${test.duration}ms</span>
    </div>
  </div>`;
}

function countTestsInRecord(record: Record<string, any>): number {
  let count = 0;
  for (const value of Object.values(record)) {
    if (Array.isArray(value)) {
      count += value.length;
    } else if (typeof value === 'object' && value !== null) {
      count += countTestsInRecord(value);
    }
  }
  return count;
}

/**
 * Group tests like VS Code Test Explorer:
 * 1. By test type (e2e, integration, llm, unit)
 * 2. By file path
 * 3. By suite name (describe blocks)
 */
function groupTestsLikeVSCode(
  tests: TestResult[],
): Record<string, Record<string, Record<string, TestResult[]>>> {
  const grouped: Record<
    string,
    Record<string, Record<string, TestResult[]>>
  > = {};

  for (const test of tests) {
    const testType = test.type || 'other';
    const filePath = test.filePath || 'Unknown';
    const suiteName =
      extractSuiteName(test.fullName, test.name) || '__no_suite__';

    if (!grouped[testType]) {
      grouped[testType] = {};
    }
    if (!grouped[testType][filePath]) {
      grouped[testType][filePath] = {};
    }
    if (!grouped[testType][filePath][suiteName]) {
      grouped[testType][filePath][suiteName] = [];
    }

    grouped[testType][filePath][suiteName].push(test);
  }

  return grouped;
}

/**
 * Extract suite name from fullName
 * fullName format: "Suite Name > Nested Suite > Test Name"
 */
function extractSuiteName(fullName: string, testName: string): string | null {
  if (!fullName || fullName === testName) {
    return null;
  }

  // Remove the test name from the end
  const suiteStr = fullName.replace(` > ${testName}`, '');

  if (suiteStr === fullName || !suiteStr) {
    return null;
  }

  return suiteStr;
}

/**
 * Get filename from full path
 */
function getFileName(filePath: string): string {
  const parts = filePath.split('/');
  return parts[parts.length - 1] || filePath;
}

/**
 * Escape HTML special characters
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

/**
 * Minimal CSS styles
 */
function getMinimalStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: #f8fafc;
      overflow: hidden;
    }
    
    /* Layout */
    .layout {
      display: flex;
      height: calc(100vh - 60px);
    }
    
    .sidebar {
      width: 350px;
      background: white;
      border-right: 1px solid #e2e8f0;
      overflow-y: auto;
      flex-shrink: 0;
    }
    
    .main-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-bottom: 3px solid #5a67d8;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .header h1 {
      font-size: 20px;
      font-weight: 600;
    }
    
    .summary {
      display: flex;
      gap: 20px;
      font-size: 13px;
    }
    
    .summary-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .summary-item .value {
      font-weight: 600;
    }
    
    .summary-item .value.passed { color: #10b981; }
    .summary-item .value.failed { color: #ef4444; }
    .summary-item .value.skipped { color: #94a3b8; }
    
    /* Tree View */
    .tree-container {
      padding: 8px 0;
    }
    
    .tree-node {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      cursor: pointer;
      user-select: none;
      font-size: 13px;
    }
    
    .tree-node:hover {
      background: #f1f5f9;
    }
    
    .tree-node.selected {
      background: #e0e7ff;
      color: #4338ca;
      font-weight: 500;
    }
    
    .tree-icon {
      flex-shrink: 0;
    }
    
    .tree-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .tree-count {
      color: #94a3b8;
      font-size: 11px;
    }
    
    .tree-duration {
      color: #94a3b8;
      font-size: 11px;
    }
    
    .tree-children {
      display: none;
    }
    
    .tree-children.expanded {
      display: block;
    }
    
    .tree-type-node {
      font-weight: 600;
      padding-left: 8px;
    }
    
    .tree-file-node {
      font-weight: 500;
      padding-left: 32px;
    }
    
    .tree-suite-node {
      padding-left: 56px;
      color: #64748b;
    }
    
    .tree-test-node {
      padding-left: 80px;
    }
    
    /* Detail Panel */
    .detail-panel {
      background: white;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      max-width: 1200px;
    }
    
    .empty-state {
      text-align: center;
      padding: 80px 20px;
      color: #94a3b8;
    }
    
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .test-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e2e8f0;
    }
    
    .test-header h2 {
      flex: 1;
      font-size: 18px;
      color: #1e293b;
      line-height: 1.4;
    }
    
    .test-status {
      font-size: 28px;
      margin-top: -4px;
    }
    
    .test-meta {
      display: flex;
      gap: 24px;
      margin-bottom: 24px;
      font-size: 13px;
      flex-wrap: wrap;
    }
    
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .meta-label {
      color: #94a3b8;
      font-weight: 500;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    
    .meta-value {
      color: #1e293b;
      font-weight: 500;
    }
    
    /* Collapsible Sections */
    .collapsible-section {
      margin-bottom: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .collapsible-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: #f8fafc;
      cursor: pointer;
      user-select: none;
      font-weight: 500;
      font-size: 14px;
    }
    
    .collapsible-header:hover {
      background: #f1f5f9;
    }
    
    .collapse-icon {
      transition: transform 0.2s;
      color: #94a3b8;
    }
    
    .collapse-icon.expanded {
      transform: rotate(90deg);
    }
    
    .collapsible-content {
      display: none;
      padding: 16px;
      background: white;
      max-height: 400px;
      overflow: auto;
    }
    
    .collapsible-content.expanded {
      display: block;
    }
    
    .json-viewer {
      background: #1e293b;
      color: #e2e8f0;
      padding: 16px;
      border-radius: 4px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 12px;
      overflow-x: auto;
      white-space: pre;
      line-height: 1.5;
    }
  `;
}

/**
 * JavaScript for interactivity
 */
function getScripts(): string {
  return `
    // Tree node expand/collapse
    function toggleTreeNode(node) {
      const parent = node.parentElement;
      const children = parent.querySelector('.tree-children');
      if (children) {
        children.classList.toggle('expanded');
      }
    }
    
    // Show test details in right panel
    function showTestDetails(testIndex) {
      // Remove previous selection
      document.querySelectorAll('.tree-test-node').forEach(n => n.classList.remove('selected'));
      
      // Find and mark current selection
      const treeTest = document.querySelector('[data-test-index="' + testIndex + '"]');
      if (!treeTest) return;
      
      const testNode = treeTest.querySelector('.tree-test-node');
      if (testNode) {
        testNode.classList.add('selected');
      }
      
      // Get test data from global array
      if (!window.testData || !window.testData[testIndex]) return;
      const test = window.testData[testIndex];
      
      // Build detail view
      const detailPanel = document.getElementById('detail-panel');
      const status = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️';
      
      let html = '<div class="test-header">';
      html += '<h2>' + escapeHtml(test.fullName || test.name) + '</h2>';
      html += '<span class="test-status">' + status + '</span>';
      html += '</div>';
      
      html += '<div class="test-meta">';
      html += '<div class="meta-item"><div class="meta-label">Type</div><div class="meta-value">' + (test.type || 'unknown') + '</div></div>';
      html += '<div class="meta-item"><div class="meta-label">Status</div><div class="meta-value">' + test.status + '</div></div>';
      html += '<div class="meta-item"><div class="meta-label">Duration</div><div class="meta-value">' + test.duration + 'ms</div></div>';
      if (test.filePath) {
        html += '<div class="meta-item"><div class="meta-label">File</div><div class="meta-value">' + escapeHtml(test.filePath.split('/').pop()) + '</div></div>';
      }
      html += '</div>';
      
      // Add all data sections
      const sections = [];
      
      if (test.chatConversation) {
        sections.push({
          title: 'Chat Conversation',
          data: test.chatConversation
        });
      }
      
      if (test.error) {
        sections.push({
          title: 'Error',
          data: test.error
        });
      }
      
      if (test.steps && test.steps.length > 0) {
        sections.push({
          title: 'Steps',
          data: test.steps
        });
      }
      
      if (test.consoleOutput && test.consoleOutput.length > 0) {
        sections.push({
          title: 'Console Output',
          data: test.consoleOutput
        });
      }
      
      // Always add full metadata
      sections.push({
        title: 'Full Test Data',
        data: test
      });
      
      for (const section of sections) {
        const sectionId = 'section-' + Math.random().toString(36).substr(2, 9);
        html += '<div class="collapsible-section">';
        html += '<div class="collapsible-header" onclick="toggleSection(\\''+sectionId+'\\')">';
        html += '<span class="collapse-icon" id="'+sectionId+'-icon">▶</span>';
        html += '<span>' + section.title + '</span>';
        html += '</div>';
        html += '<div class="collapsible-content" id="'+sectionId+'">';
        html += '<pre class="json-viewer">' + JSON.stringify(section.data, null, 2) + '</pre>';
        html += '</div>';
        html += '</div>';
      }
      
      detailPanel.innerHTML = html;
    }
    
    // Toggle collapsible section
    function toggleSection(sectionId) {
      const content = document.getElementById(sectionId);
      const icon = document.getElementById(sectionId + '-icon');
      if (content && icon) {
        content.classList.toggle('expanded');
        icon.classList.toggle('expanded');
      }
    }
    
    // HTML escape
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    // Auto-expand all tree nodes on load
    window.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.tree-type-node, .tree-file-node').forEach(node => {
        const parent = node.parentElement;
        const children = parent.querySelector('.tree-children');
        if (children) {
          children.classList.add('expanded');
        }
      });
    });
  `;
}
