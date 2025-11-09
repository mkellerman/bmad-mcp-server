/**
 * E2E Test: Sampling Capability Integration
 *
 * Tests the MCP sampling API integration with mock servers:
 * 1. Capability detection (with/without sampling)
 * 2. LLM-powered ranking via createMessage
 * 3. Fallback to session-based ranking
 * 4. Hybrid ranking strategy
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BMADEngine } from '../../src/core/bmad-engine.js';
import {
  createMockServerWithSampling,
  createMockServerWithoutSampling,
  createMockServerWithRankingSupport,
  type MockMCPServer,
} from '../helpers/mock-mcp-server.js';

describe('E2E: Sampling Capability Integration', () => {
  let engine: BMADEngine;

  beforeEach(async () => {
    // Create fresh engine for each test
    engine = new BMADEngine(
      undefined,
      [
        'git+https://github.com/mkellerman/BMAD-METHOD#debug-agent-workflow:/bmad',
      ],
      'strict',
    );
    await engine.initialize();
  });

  describe('Capability Detection', () => {
    it('should detect when client SUPPORTS sampling', () => {
      const mockServer = createMockServerWithSampling();

      // Simulate server initialization
      engine.detectSamplingSupport(mockServer as any);

      // Check capability status
      const capability = engine.getSamplingCapability();

      expect(capability.supported).toBe(true);
      expect(capability.clientInfo?.name).toBe('mock-vscode-copilot');
      expect(capability.clientInfo?.version).toBe('1.0.0');
      expect(engine.isSamplingAvailable()).toBe(true);
    });

    it('should detect when client DOES NOT support sampling', () => {
      const mockServer = createMockServerWithoutSampling();

      // Simulate server initialization
      engine.detectSamplingSupport(mockServer as any);

      // Check capability status
      const capability = engine.getSamplingCapability();

      expect(capability.supported).toBe(false);
      expect(capability.clientInfo?.name).toBe('mock-claude-desktop');
      expect(engine.isSamplingAvailable()).toBe(false);
    });

    it('should handle missing client capabilities gracefully', () => {
      // Mock server with no capabilities
      const mockServer = {
        getClientCapabilities: () => undefined,
      };

      engine.detectSamplingSupport(mockServer as any);

      const capability = engine.getSamplingCapability();
      expect(capability.supported).toBe(false);
      expect(engine.isSamplingAvailable()).toBe(false);
    });
  });

  describe('Sampling Request Tracking', () => {
    it('should track sampling requests made to LLM', async () => {
      const mockServer = createMockServerWithRankingSupport({
        'rank.*agents': 'bmm:analyst,bmm:pm,core:debug',
        'rank.*workflows': 'bmm:workflow-status,core:party-mode',
      });

      engine.detectSamplingSupport(mockServer as any);

      // Initially no requests
      expect(mockServer.getSamplingRequestCount()).toBe(0);

      // TODO: Once Phase 2 is implemented, this will make actual sampling calls
      // For now, we're just testing the infrastructure

      expect(engine.isSamplingAvailable()).toBe(true);
    });

    it('should record prompt text in sampling requests', async () => {
      const mockServer = createMockServerWithRankingSupport({
        'help.*analyze': 'bmm:analyst',
      }) as MockMCPServer;

      engine.detectSamplingSupport(mockServer as any);

      // Make a sampling request
      const result = await mockServer.createMessage({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Rank these agents to help me analyze market data',
            },
          },
        ] as any,
        maxTokens: 100,
      });

      // Check request was recorded
      const requests = mockServer.getSamplingRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].promptText).toContain('help');
      expect(requests[0].promptText).toContain('analyze');
      expect(requests[0].maxTokens).toBe(100);

      // Check response
      expect(result.content).toBeDefined();
      expect((result.content as any).text).toBe('bmm:analyst');
    });
  });

  describe('Canned Responses', () => {
    it('should match prompt patterns and return configured responses', async () => {
      const mockServer = createMockServerWithRankingSupport({
        'debug.*bug': 'core:debug,bmm:tea',
        'plan.*product': 'bmm:analyst,bmm:pm',
        'design.*architecture': 'bmm:architect,bmm:ux-designer',
      }) as MockMCPServer;

      // Test 1: Debug query
      const debugResult = await mockServer.createMessage({
        messages: [
          {
            role: 'user',
            content: { type: 'text', text: 'Help me debug this bug' },
          },
        ] as any,
      });
      expect((debugResult.content as any).text).toBe('core:debug,bmm:tea');

      // Test 2: Product query
      const productResult = await mockServer.createMessage({
        messages: [
          {
            role: 'user',
            content: { type: 'text', text: 'Help me plan a new product' },
          },
        ] as any,
      });
      expect((productResult.content as any).text).toBe('bmm:analyst,bmm:pm');

      // Test 3: Architecture query
      const archResult = await mockServer.createMessage({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'Design the architecture for this system',
            },
          },
        ] as any,
      });
      expect((archResult.content as any).text).toBe(
        'bmm:architect,bmm:ux-designer',
      );
    });

    it('should return default response when no pattern matches', async () => {
      const mockServer = createMockServerWithRankingSupport({
        'specific.*pattern': 'specific:response',
      }) as MockMCPServer;

      const result = await mockServer.createMessage({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: 'This does not match any pattern',
            },
          },
        ] as any,
      });

      // Should get default response
      expect((result.content as any).text).toBe(
        'bmm:analyst,core:debug,bmm:architect',
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error when sampling not supported', async () => {
      const mockServer = createMockServerWithoutSampling() as MockMCPServer;

      await expect(
        mockServer.createMessage({
          messages: [
            {
              role: 'user',
              content: { type: 'text', text: 'Test' },
            },
          ] as any,
        }),
      ).rejects.toThrow('Sampling not supported by this client');
    });
  });

  describe('Performance Simulation', () => {
    it('should simulate latency for sampling requests', async () => {
      const mockServer = new (
        await import('../helpers/mock-mcp-server.js')
      ).MockMCPServer({
        samplingSupported: true,
        cannedResponses: [
          {
            promptPattern: /test/i,
            response: 'test:response',
            delayMs: 100, // 100ms delay
          },
        ],
      });

      const startTime = Date.now();
      await mockServer.createMessage({
        messages: [
          {
            role: 'user',
            content: { type: 'text', text: 'Test query' },
          },
        ] as any,
      });
      const duration = Date.now() - startTime;

      // Should have taken at least 100ms
      expect(duration).toBeGreaterThanOrEqual(95); // Allow small margin
    });
  });

  describe('Integration with BMADEngine', () => {
    it('should maintain sampling state across operations', () => {
      const mockServer = createMockServerWithSampling();

      // Initial state
      expect(engine.isSamplingAvailable()).toBe(false);

      // Detect capability
      engine.detectSamplingSupport(mockServer as any);
      expect(engine.isSamplingAvailable()).toBe(true);

      // Should persist
      expect(engine.isSamplingAvailable()).toBe(true);
      expect(engine.getSamplingCapability().supported).toBe(true);
    });

    it('should provide immutable capability snapshot', () => {
      const mockServer = createMockServerWithSampling();
      engine.detectSamplingSupport(mockServer as any);

      const capability1 = engine.getSamplingCapability();
      const capability2 = engine.getSamplingCapability();

      // Should be different objects (copies)
      expect(capability1).not.toBe(capability2);

      // But same values
      expect(capability1.supported).toBe(capability2.supported);
      expect(capability1.clientInfo?.name).toBe(capability2.clientInfo?.name);
    });
  });
});
