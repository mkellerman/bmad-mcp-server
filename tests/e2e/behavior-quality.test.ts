/**
 * E2E Tests: Behavior Quality Validation
 *
 * Tests that validate BMAD agent behavior quality beyond functional correctness.
 * Automatically records quality metrics for dashboard tracking.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { CopilotSessionHelper } from '../framework/helpers/copilot-session-helper.js';
import {
  BehaviorQualityChecker,
  assertQualityMeetsStandard,
  type BehaviorCriteria,
} from '../framework/helpers/behavior-quality.js';
import {
  QualityMetricsCollector,
  exportQualityDashboard,
} from '../framework/helpers/quality-metrics-collector.js';
import { join } from 'node:path';

const TEST_TIMEOUT = 120_000;
const metricsCollector = new QualityMetricsCollector();

describe('E2E: Behavior Quality Validation', () => {
  afterAll(async () => {
    // Export dashboard after all tests complete
    const dashboardPath = join(process.cwd(), 'test-results', 'quality-dashboard.json');
    await exportQualityDashboard(metricsCollector, dashboardPath);
    console.log(`\n📊 Quality dashboard exported to: ${dashboardPath}`);
  });

  it(
    'should make high-quality tool calls when loading an agent',
    async () => {
      const testName = 'should make high-quality tool calls when loading an agent';
      const helper = new CopilotSessionHelper();
      const analysis = await helper.execute({
        prompt: 'I need help debugging a complex issue. Please load Diana the debug specialist.',
        allowAllTools: true,
        timeout: TEST_TIMEOUT,
      });

      const criteria: BehaviorCriteria = {
        expectedTarget: 'debug',
        maxToolCalls: 4,
      };

      const qualityChecker = new BehaviorQualityChecker();
      const qualityReport = qualityChecker.calculateOverallQuality(analysis, criteria);

      console.log('\n' + qualityChecker.formatQualityReport(qualityReport));

      // Record metrics for dashboard
      await metricsCollector.recordMetric({
        testName,
        timestamp: new Date().toISOString(),
        qualityReport,
        sessionAnalysis: analysis,
      });

      const assertion = assertQualityMeetsStandard(qualityReport, 70);
      expect(assertion.passed, assertion.message).toBe(true);
      expect(qualityReport.dimensions.toolCallAccuracy).toBeGreaterThanOrEqual(80);
      expect(qualityReport.dimensions.parameterCompleteness).toBeGreaterThanOrEqual(80);
      expect(['Excellent', 'Good', 'Acceptable']).toContain(qualityReport.rating);
    },
    { timeout: TEST_TIMEOUT }
  );

  it(
    'should demonstrate efficient behavior without unnecessary calls',
    async () => {
      const testName = 'should demonstrate efficient behavior without unnecessary calls';
      const helper = new CopilotSessionHelper();
      const analysis = await helper.execute({
        prompt: 'Load the analyst agent',
        allowAllTools: true,
        timeout: TEST_TIMEOUT,
      });

      const criteria: BehaviorCriteria = {
        expectedTarget: 'analyst',
        maxToolCalls: 3,
      };

      const qualityChecker = new BehaviorQualityChecker();
      const qualityReport = qualityChecker.calculateOverallQuality(analysis, criteria);

      console.log('\n' + qualityChecker.formatQualityReport(qualityReport));

      // Record metrics for dashboard
      await metricsCollector.recordMetric({
        testName,
        timestamp: new Date().toISOString(),
        qualityReport,
        sessionAnalysis: analysis,
      });

      const assertion = assertQualityMeetsStandard(qualityReport, 70);
      expect(assertion.passed, assertion.message).toBe(true);
      expect(qualityReport.dimensions.efficiency).toBeGreaterThanOrEqual(70);
      expect(analysis.bmadCalls.length).toBeLessThanOrEqual(3);
    },
    { timeout: TEST_TIMEOUT }
  );
});

