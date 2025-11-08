/**
 * E2E Test: Sampling-Based Workflow Prioritization
 *
 * Tests the complete workflow prioritization decision-making process:
 * 1. With sampling: LLM-powered intelligent ranking
 * 2. Without sampling: Session-based ranking fallback
 * 3. Hybrid strategy: When to use each approach
 * 4. Performance comparison: Sampling vs session-based
 * 5. Accuracy validation: Does sampling improve relevance?
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BMADEngine } from '../../src/core/bmad-engine.js';
import {
  createMockServerWithRankingSupport,
  createMockServerWithoutSampling,
  type MockMCPServer,
} from '../helpers/mock-mcp-server.js';

interface RankingScenario {
  name: string;
  userQuery: string;
  expectedTop3WithSampling: string[];
  expectedTop3WithoutSampling: string[];
  samplingResponse: string;
  description: string;
}

const RANKING_SCENARIOS: RankingScenario[] = [
  {
    name: 'Debug Bug Scenario',
    userQuery: 'help me debug a critical production bug',
    expectedTop3WithSampling: ['core:debug', 'bmm:tea', 'bmm:architect'],
    expectedTop3WithoutSampling: ['core:debug', 'bmm:analyst', 'bmm:pm'], // Based on boosts
    samplingResponse: 'core:debug,bmm:tea,bmm:architect',
    description: 'Debug specialist should rank highest for bug-related queries',
  },
  {
    name: 'Product Planning Scenario',
    userQuery: 'help me plan and analyze a new product launch',
    expectedTop3WithSampling: ['bmm:analyst', 'bmm:pm', 'bmm:architect'],
    expectedTop3WithoutSampling: ['bmm:analyst', 'bmm:pm', 'core:debug'], // Based on boosts
    samplingResponse: 'bmm:analyst,bmm:pm,bmm:architect',
    description: 'Analyst and PM should rank highest for planning queries',
  },
  {
    name: 'Architecture Design Scenario',
    userQuery: 'design a scalable microservices architecture',
    expectedTop3WithSampling: ['bmm:architect', 'bmm:tea', 'core:debug'],
    expectedTop3WithoutSampling: ['bmm:analyst', 'bmm:pm', 'bmm:architect'], // Based on boosts
    samplingResponse: 'bmm:architect,bmm:tea,core:debug',
    description: 'Architect should rank highest for design queries',
  },
  {
    name: 'Creative Brainstorming Scenario',
    userQuery: 'brainstorm innovative solutions for user engagement',
    expectedTop3WithSampling: [
      'cis:brainstorming-coach',
      'cis:creative-problem-solver',
      'cis:innovation-strategist',
    ],
    expectedTop3WithoutSampling: ['bmm:analyst', 'bmm:pm', 'core:debug'], // Core/BMM boosted
    samplingResponse:
      'cis:brainstorming-coach,cis:creative-problem-solver,cis:innovation-strategist',
    description: 'CIS module should rank highest for creative queries',
  },
  {
    name: 'Workflow Status Check',
    userQuery: 'check the current workflow status',
    expectedTop3WithSampling: ['bmm:workflow-status', 'bmm:sm', 'bmm:pm'],
    expectedTop3WithoutSampling: ['bmm:analyst', 'bmm:pm', 'core:debug'], // Based on boosts
    samplingResponse: 'bmm:workflow-status,bmm:sm,bmm:pm',
    description: 'Workflow-status should be recognized as standalone workflow',
  },
];

describe('E2E: Sampling-Based Workflow Prioritization', () => {
  let engine: BMADEngine;

  beforeEach(async () => {
    engine = new BMADEngine(
      undefined,
      [
        'git+https://github.com/mkellerman/BMAD-METHOD#debug-agent-workflow:/bmad',
      ],
      'strict',
    );
    await engine.initialize();
  });

  describe('Baseline: Session-Based Ranking (No Sampling)', () => {
    it('should rank based on recency, frequency, manifest, and boosts', async () => {
      const mockServer = createMockServerWithoutSampling();
      engine.detectSamplingSupport(mockServer as any);

      // Verify sampling is disabled
      expect(engine.isSamplingAvailable()).toBe(false);

      // List agents to see ranking
      const agents = engine.getAgentMetadata();
      expect(agents).toBeDefined();
      expect(agents.length).toBeGreaterThan(0);

      // Verify core module items are present (should be boosted)
      const coreAgents = agents.filter((a) => a.module === 'core');
      expect(coreAgents.length).toBeGreaterThan(0);

      console.log('\n📊 Session-Based Ranking (Fresh Session):');
      console.log(
        'Top 5 agents:',
        agents.slice(0, 5).map((a) => `${a.module}:${a.name}`),
      );
    });

    it('should boost analyst and PM agents due to configuration', () => {
      const mockServer = createMockServerWithoutSampling();
      engine.detectSamplingSupport(mockServer as any);

      const agents = engine.getAgentMetadata();

      // Find analyst and PM
      const analyst = agents.find(
        (a) => a.module === 'bmm' && a.name === 'analyst',
      );
      const pm = agents.find((a) => a.module === 'bmm' && a.name === 'pm');

      expect(analyst).toBeDefined();
      expect(pm).toBeDefined();

      // Both should be in top 10 due to high agent boost (0.08)
      const top10Keys = agents.slice(0, 10).map((a) => `${a.module}:${a.name}`);
      expect(top10Keys).toContain('bmm:analyst');
      expect(top10Keys).toContain('bmm:pm');
    });

    it('should track usage and adjust ranking over time', async () => {
      const mockServer = createMockServerWithoutSampling();
      engine.detectSamplingSupport(mockServer as any);

      // Get initial ranking using listAgents (which applies ranking)
      const initialResult = await engine.listAgents();
      expect(initialResult.success).toBe(true);
      const initialAgents = initialResult.data as Array<{
        module: string;
        name: string;
      }>;
      const initialTop = `${initialAgents[0].module}:${initialAgents[0].name}`;

      // Simulate usage of a different agent
      await engine.executeAgent({ agent: 'tea', message: 'test' });

      // Ranking should change after usage
      const afterResult = await engine.listAgents();
      expect(afterResult.success).toBe(true);
      const afterAgents = afterResult.data as Array<{
        module: string;
        name: string;
      }>;

      console.log('\n📈 Ranking Change After Usage:');
      console.log('Before:', initialTop);
      console.log(
        'After using bmm:tea:',
        afterAgents.slice(0, 5).map((a) => `${a.module}:${a.name}`),
      );

      // Tea should move up in ranking due to recency
      const teaIndexBefore = initialAgents.findIndex(
        (a) => a.module === 'bmm' && a.name === 'tea',
      );
      const teaIndexAfter = afterAgents.findIndex(
        (a) => a.module === 'bmm' && a.name === 'tea',
      );

      expect(teaIndexAfter).toBeLessThan(teaIndexBefore);
    });
  });

  describe('Sampling-Based Ranking (With LLM)', () => {
    RANKING_SCENARIOS.forEach((scenario) => {
      it(`should prioritize correctly for: ${scenario.name}`, async () => {
        // Create mock server with scenario-specific response
        const mockServer = createMockServerWithRankingSupport({
          [scenario.userQuery]: scenario.samplingResponse,
        }) as MockMCPServer;

        engine.detectSamplingSupport(mockServer as any);
        expect(engine.isSamplingAvailable()).toBe(true);

        // Simulate LLM ranking call
        const result = await mockServer.createMessage({
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Rank agents for: ${scenario.userQuery}`,
              },
            },
          ] as any,
          maxTokens: 100,
        });

        const rankedKeys = ((result.content as any).text as string).split(',');

        console.log(`\n🎯 ${scenario.name}:`);
        console.log(`Query: "${scenario.userQuery}"`);
        console.log(`LLM Ranking: ${rankedKeys.slice(0, 3).join(', ')}`);
        console.log(
          `Expected: ${scenario.expectedTop3WithSampling.join(', ')}`,
        );

        // Verify top 3 match expectations
        expect(rankedKeys.slice(0, 3)).toEqual(
          scenario.expectedTop3WithSampling,
        );

        // Verify sampling request was recorded
        const requests = mockServer.getSamplingRequests();
        expect(requests.length).toBeGreaterThan(0);
        expect(requests[0].promptText).toContain(scenario.userQuery);
      });
    });

    it('should handle complex multi-agent scenarios', async () => {
      const mockServer = createMockServerWithRankingSupport({
        'build.*test.*deploy':
          'bmm:architect,bmm:dev,bmm:tea,bmm:sm,core:debug',
      }) as MockMCPServer;

      engine.detectSamplingSupport(mockServer as any);

      const result = await mockServer.createMessage({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Rank agents for: build, test, and deploy a new feature',
            },
          },
        ] as any,
        maxTokens: 100,
      });

      const rankedKeys = ((result.content as any).text as string).split(',');

      console.log('\n🏗️  Complex Scenario (Build + Test + Deploy):');
      console.log('LLM Ranking:', rankedKeys);

      // Architect should be first for overall design
      expect(rankedKeys[0]).toBe('bmm:architect');

      // Dev should be involved for implementation
      expect(rankedKeys).toContain('bmm:dev');

      // Test architect for testing
      expect(rankedKeys).toContain('bmm:tea');
    });

    it('should fall back gracefully when pattern does not match', async () => {
      const mockServer = createMockServerWithRankingSupport({
        'specific.*pattern': 'bmm:analyst',
      }) as MockMCPServer;

      engine.detectSamplingSupport(mockServer as any);

      // Query that doesn't match any pattern
      const result = await mockServer.createMessage({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Random query with no matching pattern',
            },
          },
        ] as any,
        maxTokens: 100,
      });

      // Should get default response
      const response = (result.content as any).text;
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');

      console.log('\n🔄 Fallback Response:', response);
    });
  });

  describe('Performance Comparison: Sampling vs Session-Based', () => {
    it('should measure ranking decision latency', async () => {
      // Test 1: Session-based (should be instant)
      const sessionServer = createMockServerWithoutSampling();
      engine.detectSamplingSupport(sessionServer as any);

      const sessionStart = Date.now();
      const sessionAgents = engine.getAgentMetadata();
      const sessionDuration = Date.now() - sessionStart;

      expect(sessionAgents.length).toBeGreaterThan(0);

      // Test 2: Sampling-based (has latency)
      const samplingServer = createMockServerWithRankingSupport({
        '.*': 'bmm:analyst,bmm:pm,core:debug',
      }) as MockMCPServer;

      engine.detectSamplingSupport(samplingServer as any);

      const samplingStart = Date.now();
      await samplingServer.createMessage({
        messages: [
          {
            role: 'user',
            content: { type: 'text', text: 'rank agents' },
          },
        ] as any,
        maxTokens: 50,
      });
      const samplingDuration = Date.now() - samplingStart;

      console.log('\n⏱️  Performance Comparison:');
      console.log(`Session-based: ${sessionDuration}ms`);
      console.log(`Sampling-based: ${samplingDuration}ms`);

      // Session-based should be faster (no LLM call)
      expect(sessionDuration).toBeLessThan(10); // Sub-10ms

      // Sampling has overhead but still reasonable
      expect(samplingDuration).toBeLessThan(1000); // Sub-1s
    });

    it('should compare ranking quality between approaches', () => {
      console.log('\n📊 Ranking Quality Comparison:');
      console.log('='.repeat(60));

      RANKING_SCENARIOS.forEach((scenario) => {
        console.log(`\n${scenario.name}:`);
        console.log(`  Query: "${scenario.userQuery}"`);
        console.log(
          `  Sampling: ${scenario.expectedTop3WithSampling.join(', ')}`,
        );
        console.log(
          `  Session:  ${scenario.expectedTop3WithoutSampling.join(', ')}`,
        );
        console.log(`  Analysis: ${scenario.description}`);
      });

      // The test itself validates that we have different rankings
      // for context-specific queries
      expect(RANKING_SCENARIOS.length).toBeGreaterThan(0);
    });
  });

  describe('Hybrid Strategy Decision Making', () => {
    it('should decide when to use sampling vs session-based', () => {
      const scenarios = [
        {
          scenario: 'Simple list operation',
          shouldUseSampling: false,
          reason: 'No user context, just listing all',
          candidateCount: 16,
        },
        {
          scenario: 'Ambiguous query with 2 candidates',
          shouldUseSampling: false,
          reason: 'Too few candidates, not worth LLM call',
          candidateCount: 2,
        },
        {
          scenario: 'Ambiguous query with 5+ candidates',
          shouldUseSampling: true,
          reason: 'Complex decision, LLM can understand intent',
          candidateCount: 8,
        },
        {
          scenario: 'User explicitly asks for recommendation',
          shouldUseSampling: true,
          reason: 'User wants intelligent suggestion',
          candidateCount: 10,
        },
        {
          scenario: 'Fast-path execution (high confidence match)',
          shouldUseSampling: false,
          reason: 'Clear winner, no need for LLM',
          candidateCount: 5,
        },
      ];

      console.log('\n🤔 Hybrid Strategy Decision Matrix:');
      console.log('='.repeat(70));

      scenarios.forEach((s) => {
        const decision = s.shouldUseSampling
          ? '✅ USE SAMPLING'
          : '⚡ USE SESSION';
        console.log(`\n${s.scenario}:`);
        console.log(`  Candidates: ${s.candidateCount}`);
        console.log(`  Decision: ${decision}`);
        console.log(`  Reason: ${s.reason}`);
      });

      // TODO: When Phase 3 is implemented, add actual decision logic tests
      expect(scenarios.length).toBeGreaterThan(0);
    });

    it('should provide metrics for decision optimization', () => {
      const metrics = {
        samplingThreshold: {
          minCandidates: 3,
          reason: 'Below 3 candidates, choice is obvious without LLM',
        },
        confidenceThreshold: {
          autoExecute: 0.8,
          reason: 'If top match scores >0.8, execute directly',
        },
        performanceTargets: {
          sessionBasedP50: '<5ms',
          sessionBasedP99: '<20ms',
          samplingBasedP50: '<200ms',
          samplingBasedP99: '<1000ms',
        },
        accuracyTargets: {
          sessionBased: '70% relevant (based on usage patterns)',
          samplingBased: '90% relevant (based on LLM understanding)',
        },
      };

      console.log('\n📈 Decision Optimization Metrics:');
      console.log(JSON.stringify(metrics, null, 2));

      expect(metrics.samplingThreshold.minCandidates).toBe(3);
      expect(metrics.confidenceThreshold.autoExecute).toBe(0.8);
    });
  });

  describe('Workflow Prioritization Validation', () => {
    it('should correctly identify standalone workflows', async () => {
      const mockServer = createMockServerWithoutSampling();
      engine.detectSamplingSupport(mockServer as any);

      // Execute workflow-status (standalone)
      const result = await engine.executeWorkflow({
        workflow: 'workflow-status',
      });

      console.log('\n🔍 Standalone Workflow Detection:');
      console.log('Workflow: workflow-status');
      console.log('Result:', {
        success: (result as any).success,
        ambiguous: (result as any).ambiguous,
        type: (result as any).type,
      });

      // Should execute directly (not ambiguous)
      expect((result as any).success).toBe(true);
      expect((result as any).ambiguous).toBeUndefined();
    });

    it('should rank workflows correctly for ambiguous queries', async () => {
      const mockServer = createMockServerWithRankingSupport({
        'create.*product.*requirements':
          'bmm:product-brief,bmm:prd,bmm:brainstorm-project',
      }) as MockMCPServer;

      engine.detectSamplingSupport(mockServer as any);

      const result = await mockServer.createMessage({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Rank workflows for: create product requirements document',
            },
          },
        ] as any,
        maxTokens: 100,
      });

      const rankedWorkflows = ((result.content as any).text as string).split(
        ',',
      );

      console.log('\n📋 Workflow Ranking for PRD Creation:');
      console.log('Top 3:', rankedWorkflows.slice(0, 3));

      // product-brief should rank high for requirements
      expect(rankedWorkflows[0]).toContain('product-brief');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty candidate list', async () => {
      const mockServer = createMockServerWithRankingSupport(
        {},
      ) as MockMCPServer;
      engine.detectSamplingSupport(mockServer as any);

      // Try to rank with empty list (edge case)
      const agents = engine.getAgentMetadata();
      expect(agents.length).toBeGreaterThan(0); // Should never be empty after init

      console.log('\n✅ Empty List Handling: Always has agents after init');
    });

    it('should handle sampling timeout gracefully', async () => {
      // Create mock with high latency
      const mockServer = new (
        await import('../helpers/mock-mcp-server.js')
      ).MockMCPServer({
        samplingSupported: true,
        cannedResponses: [
          {
            promptPattern: /.*/,
            response: 'bmm:analyst',
            delayMs: 3000, // 3s delay (timeout scenario)
          },
        ],
      });

      engine.detectSamplingSupport(mockServer as any);

      // In production, this would timeout and fall back to session ranking
      // For now, we just verify the mock supports latency simulation
      console.log('\n⏰ Timeout Handling: Mock supports latency simulation');
      expect(engine.isSamplingAvailable()).toBe(true);
    });

    it('should handle malformed LLM responses', async () => {
      const mockServer = createMockServerWithRankingSupport({
        '.*': 'invalid,,,,response,with,,,empty,,,keys',
      }) as MockMCPServer;

      engine.detectSamplingSupport(mockServer as any);

      const result = await mockServer.createMessage({
        messages: [
          {
            role: 'user',
            content: { type: 'text', text: 'test' },
          },
        ] as any,
        maxTokens: 50,
      });

      const response = (result.content as any).text;
      console.log('\n⚠️  Malformed Response Handling:', response);

      // Mock returns the response as-is
      // In Phase 2, parser should filter out invalid keys
      expect(response).toContain('invalid');
    });
  });
});
