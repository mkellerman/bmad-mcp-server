import fs from 'fs';
import path from 'path';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  userInput: string;
  toolResponse: string;
  systemResponse: string;
  testResults: {
    // Agent-specific fields
    personaLoaded?: boolean;
    menuProvided?: boolean;
    menuItemCount?: number;
    hasGreeting?: boolean;
    // Workflow-specific fields
    workflowLoaded?: boolean;
    workflowStarted?: boolean;
    hasInstructions?: boolean;
    hasSteps?: boolean;
    stepCount?: number;
    hasDescription?: boolean;
    // Common fields
    success: boolean;
    error?: string;
  };
}

interface SuiteResult {
  name: string;
  tests: TestResult[];
  duration: number;
}

/**
 * BMAD Test Results Reporter
 * Generates JSON and HTML reports from test results
 */
export class BMADTestReporter {
  private outputDir = path.join(process.cwd(), 'test-results');
  private results: SuiteResult[] = [];

  constructor() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  addSuite(suite: SuiteResult) {
    this.results.push(suite);
  }

  addTest(suiteName: string, test: TestResult) {
    let suite = this.results.find((s) => s.name === suiteName);
    if (!suite) {
      suite = { name: suiteName, tests: [], duration: 0 };
      this.results.push(suite);
    }
    suite.tests.push(test);
    suite.duration += test.duration;
  }

  generateReports() {
    this.generateJSONReport();
    this.generateHTMLReport();
  }

  private generateJSONReport() {
    const report = {
      timestamp: new Date().toISOString(),
      suites: this.results,
      summary: this.generateSummary(),
    };

    const jsonPath = path.join(this.outputDir, 'e2e-results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 JSON Report: ${jsonPath}`);
  }

  private generateHTMLReport() {
    const summary = this.generateSummary();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BMAD E2E Test Report</title>
  <style>
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
      border-radius: 10px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 { margin-bottom: 10px; }
    .header .timestamp { opacity: 0.9; font-size: 14px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .stat-card .label { color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .stat-card .value { font-size: 32px; font-weight: bold; }
    .stat-card.passed .value { color: #10b981; }
    .stat-card.failed .value { color: #ef4444; }
    .stat-card.skipped .value { color: #f59e0b; }
    .suite {
      background: white;
      border-radius: 8px;
      margin-bottom: 15px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .suite-header {
      padding: 15px 20px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .suite-header:hover { background: #f3f4f6; }
    .suite-header h3 { font-size: 16px; }
    .suite-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .suite-badge.passed { background: #d1fae5; color: #065f46; }
    .suite-badge.failed { background: #fee2e2; color: #991b1b; }
    .test-list { display: none; }
    .suite.expanded .test-list { display: block; }
    .test-item {
      padding: 15px 20px;
      border-bottom: 1px solid #f3f4f6;
    }
    .test-item:last-child { border-bottom: none; }
    .test-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      cursor: pointer;
    }
    .test-name { flex: 1; font-weight: 500; }
    .test-status {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 10px;
    }
    .test-status.passed { background: #d1fae5; color: #065f46; }
    .test-status.failed { background: #fee2e2; color: #991b1b; }
    .test-status.skipped { background: #fef3c7; color: #92400e; }
    .test-duration { color: #6b7280; font-size: 12px; margin-left: 10px; }
    .test-details {
      display: none;
      margin-top: 10px;
      padding: 15px;
      background: #f9fafb;
      border-radius: 6px;
      font-size: 13px;
    }
    .test-item.expanded .test-details { display: block; }
    .detail-section {
      margin-bottom: 10px;
    }
    .detail-label {
      font-weight: 600;
      color: #374151;
      margin-bottom: 5px;
    }
    .detail-content {
      color: #6b7280;
      white-space: pre-wrap;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 11px;
      background: white;
      padding: 10px;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
    }
    .filter-bar {
      background: white;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      gap: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .filter-btn {
      padding: 8px 16px;
      border: 1px solid #e5e7eb;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .filter-btn:hover { background: #f9fafb; }
    .filter-btn.active { background: #667eea; color: white; border-color: #667eea; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      margin-top: 10px;
    }
    .metric {
      background: white;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    .metric-label { color: #6b7280; }
    .metric-value { font-weight: 600; color: #374151; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 BMAD E2E Test Report</h1>
      <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
    </div>

    <div class="summary">
      <div class="stat-card">
        <div class="label">Total Tests</div>
        <div class="value">${summary.total}</div>
      </div>
      <div class="stat-card passed">
        <div class="label">Passed</div>
        <div class="value">${summary.passed}</div>
      </div>
      <div class="stat-card failed">
        <div class="label">Failed</div>
        <div class="value">${summary.failed}</div>
      </div>
      <div class="stat-card skipped">
        <div class="label">Skipped</div>
        <div class="value">${summary.skipped}</div>
      </div>
    </div>

    <div class="filter-bar">
      <button class="filter-btn active" onclick="filterTests('all')">All Tests</button>
      <button class="filter-btn" onclick="filterTests('passed')">Passed</button>
      <button class="filter-btn" onclick="filterTests('failed')">Failed</button>
      <button class="filter-btn" onclick="filterTests('skipped')">Skipped</button>
    </div>

    ${this.results.map((suite) => this.renderSuite(suite)).join('')}
  </div>

  <script>
    function toggleSuite(element) {
      element.closest('.suite').classList.toggle('expanded');
    }

    function toggleTest(element) {
      element.closest('.test-item').classList.toggle('expanded');
    }

    function filterTests(status) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');

      document.querySelectorAll('.test-item').forEach(item => {
        const testStatus = item.querySelector('.test-status').textContent.toLowerCase();
        if (status === 'all' || testStatus === status) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    }

    // Expand all suites by default
    document.querySelectorAll('.suite').forEach(suite => suite.classList.add('expanded'));
  </script>
</body>
</html>`;

    const htmlPath = path.join(this.outputDir, 'e2e-results.html');
    fs.writeFileSync(htmlPath, html);
    console.log(`📊 HTML Report: ${htmlPath}`);
  }

  private renderSuite(suite: SuiteResult): string {
    const passed = suite.tests.filter((t) => t.status === 'passed').length;
    const failed = suite.tests.filter((t) => t.status === 'failed').length;
    const status = failed > 0 ? 'failed' : 'passed';

    return `
    <div class="suite">
      <div class="suite-header" onclick="toggleSuite(this)">
        <h3>${suite.name}</h3>
        <div>
          <span class="suite-badge ${status}">${passed}/${suite.tests.length} passed</span>
        </div>
      </div>
      <div class="test-list">
        ${suite.tests.map((test) => this.renderTest(test)).join('')}
      </div>
    </div>`;
  }

  private renderTest(test: TestResult): string {
    return `
    <div class="test-item">
      <div class="test-header" onclick="toggleTest(this)">
        <div class="test-name">${test.name}</div>
        <span class="test-duration">${(test.duration / 1000).toFixed(2)}s</span>
        <span class="test-status ${test.status}">${test.status}</span>
      </div>
      <div class="test-details">
        <div class="detail-section">
          <div class="detail-label">USER INPUT:</div>
          <div class="detail-content">${this.escapeHtml(test.userInput)}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">TOOL RESPONSE:</div>
          <div class="detail-content">${this.escapeHtml(test.toolResponse?.substring(0, 500) || 'N/A')}...</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">SYSTEM RESPONSE:</div>
          <div class="detail-content">${this.escapeHtml(test.systemResponse?.substring(0, 500) || 'N/A')}...</div>
        </div>
        <div class="metrics">
          ${
            test.testResults.personaLoaded !== undefined
              ? `
          <div class="metric">
            <div class="metric-label">Persona Loaded</div>
            <div class="metric-value">${test.testResults.personaLoaded ? '✓ Yes' : '✗ No'}</div>
          </div>`
              : ''
          }
          ${
            test.testResults.menuProvided !== undefined
              ? `
          <div class="metric">
            <div class="metric-label">Menu Provided</div>
            <div class="metric-value">${test.testResults.menuProvided ? '✓ Yes' : '✗ No'}</div>
          </div>`
              : ''
          }
          ${
            test.testResults.menuItemCount !== undefined
              ? `
          <div class="metric">
            <div class="metric-label">Menu Items</div>
            <div class="metric-value">${test.testResults.menuItemCount}</div>
          </div>`
              : ''
          }
          ${
            test.testResults.hasGreeting !== undefined
              ? `
          <div class="metric">
            <div class="metric-label">Has Greeting</div>
            <div class="metric-value">${test.testResults.hasGreeting ? '✓ Yes' : '✗ No'}</div>
          </div>`
              : ''
          }
          ${
            test.testResults.workflowLoaded !== undefined
              ? `
          <div class="metric">
            <div class="metric-label">Workflow Loaded</div>
            <div class="metric-value">${test.testResults.workflowLoaded ? '✓ Yes' : '✗ No'}</div>
          </div>`
              : ''
          }
          ${
            test.testResults.hasSteps !== undefined
              ? `
          <div class="metric">
            <div class="metric-label">Has Steps</div>
            <div class="metric-value">${test.testResults.hasSteps ? '✓ Yes' : '✗ No'}</div>
          </div>`
              : ''
          }
          ${
            test.testResults.stepCount !== undefined
              ? `
          <div class="metric">
            <div class="metric-label">Step Count</div>
            <div class="metric-value">${test.testResults.stepCount}</div>
          </div>`
              : ''
          }
          ${
            test.testResults.hasDescription !== undefined
              ? `
          <div class="metric">
            <div class="metric-label">Has Description</div>
            <div class="metric-value">${test.testResults.hasDescription ? '✓ Yes' : '✗ No'}</div>
          </div>`
              : ''
          }
        </div>
        ${
          test.testResults.error
            ? `
        <div class="detail-section">
          <div class="detail-label">ERROR:</div>
          <div class="detail-content" style="color: #ef4444;">${this.escapeHtml(test.testResults.error)}</div>
        </div>`
            : ''
        }
      </div>
    </div>`;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  private generateSummary() {
    let total = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const suite of this.results) {
      for (const test of suite.tests) {
        total++;
        if (test.status === 'passed') passed++;
        else if (test.status === 'failed') failed++;
        else if (test.status === 'skipped') skipped++;
      }
    }

    return { total, passed, failed, skipped };
  }
}

// Global reporter instance
export const reporter = new BMADTestReporter();
