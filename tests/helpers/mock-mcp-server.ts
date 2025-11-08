/**
 * Mock MCP Server for Testing Sampling Capability
 *
 * Provides a test double of the MCP SDK Server class that:
 * 1. Simulates client capabilities (with/without sampling)
 * 2. Mocks createMessage() for LLM-powered ranking tests
 * 3. Tracks sampling requests for test assertions
 */

import type {
  ClientCapabilities,
  CreateMessageRequest,
  CreateMessageResult,
} from '@modelcontextprotocol/sdk/types.js';

export interface MockSamplingConfig {
  /** Whether this mock client supports sampling */
  samplingSupported: boolean;
  /** Mock client info */
  clientInfo?: {
    name?: string;
    version?: string;
  };
  /** Canned responses for createMessage calls */
  cannedResponses?: Array<{
    /** Regex to match against prompt content */
    promptPattern: RegExp;
    /** Response to return */
    response: string;
    /** Simulated delay in ms */
    delayMs?: number;
  }>;
  /** Default response if no pattern matches */
  defaultResponse?: string;
}

export interface SamplingRequest {
  timestamp: number;
  messages: unknown[];
  model?: string;
  maxTokens?: number;
  promptText?: string;
}

/**
 * Mock MCP Server that simulates sampling capability
 */
export class MockMCPServer {
  private config: MockSamplingConfig;
  private samplingRequests: SamplingRequest[] = [];

  constructor(config: MockSamplingConfig) {
    this.config = config;
  }

  /**
   * Mock getClientCapabilities() - returns capabilities based on config
   */
  getClientCapabilities(): ClientCapabilities | undefined {
    if (!this.config.samplingSupported) {
      return {
        // No sampling capability
      } as ClientCapabilities;
    }

    return {
      sampling: {}, // Presence indicates support
      ...(this.config.clientInfo && {
        clientInfo: this.config.clientInfo,
      }),
    } as ClientCapabilities;
  }

  /**
   * Mock createMessage() - simulates LLM sampling
   */
  async createMessage(
    params?: CreateMessageRequest['params'],
  ): Promise<CreateMessageResult> {
    if (!this.config.samplingSupported) {
      throw new Error('Sampling not supported by this client');
    }

    // Record the request
    const messages = params?.messages || [];

    // Extract prompt text from messages
    let promptText = '';
    try {
      promptText = messages
        .map((m: any) => {
          if (m.content && Array.isArray(m.content)) {
            return m.content
              .map((c: any) => (c.type === 'text' && c.text ? c.text : ''))
              .join(' ');
          } else if (
            m.content &&
            typeof m.content === 'object' &&
            'text' in m.content
          ) {
            return (m.content as any).text || '';
          }
          return '';
        })
        .join(' ');
    } catch {
      // Ignore extraction errors
    }
    this.samplingRequests.push({
      timestamp: Date.now(),
      messages,
      model: (params as any)?.modelPreferences?.hints?.[0]?.name,
      maxTokens: params?.maxTokens,
      promptText,
    });

    // Find matching canned response
    if (this.config.cannedResponses) {
      for (const canned of this.config.cannedResponses) {
        if (canned.promptPattern.test(promptText || '')) {
          // Simulate delay if specified
          if (canned.delayMs) {
            await new Promise((resolve) => setTimeout(resolve, canned.delayMs));
          }

          return {
            role: 'assistant',
            content: {
              type: 'text',
              text: canned.response,
            },
            model: 'mock-llm-model',
            stopReason: 'endTurn',
          } as CreateMessageResult;
        }
      }
    }

    // Default response
    const defaultText =
      this.config.defaultResponse || 'Mock LLM response (no pattern matched)';

    return {
      role: 'assistant',
      content: {
        type: 'text',
        text: defaultText,
      },
      model: 'mock-llm-model',
      stopReason: 'endTurn',
    } as CreateMessageResult;
  }

  /**
   * Get all sampling requests made during test
   */
  getSamplingRequests(): SamplingRequest[] {
    return [...this.samplingRequests];
  }

  /**
   * Clear sampling request history
   */
  clearSamplingRequests(): void {
    this.samplingRequests = [];
  }

  /**
   * Get count of sampling requests
   */
  getSamplingRequestCount(): number {
    return this.samplingRequests.length;
  }
}

/**
 * Helper: Create mock server with sampling support
 */
export function createMockServerWithSampling(
  config?: Partial<MockSamplingConfig>,
): MockMCPServer {
  return new MockMCPServer({
    samplingSupported: true,
    clientInfo: {
      name: 'mock-vscode-copilot',
      version: '1.0.0',
    },
    ...config,
  });
}

/**
 * Helper: Create mock server without sampling support
 */
export function createMockServerWithoutSampling(): MockMCPServer {
  return new MockMCPServer({
    samplingSupported: false,
    clientInfo: {
      name: 'mock-claude-desktop',
      version: '1.0.0',
    },
  });
}

/**
 * Helper: Create mock server with ranking responses
 */
export function createMockServerWithRankingSupport(
  rankingResponses: Record<string, string>,
): MockMCPServer {
  const cannedResponses = Object.entries(rankingResponses).map(
    ([pattern, response]) => ({
      promptPattern: new RegExp(pattern, 'i'),
      response,
    }),
  );

  return new MockMCPServer({
    samplingSupported: true,
    clientInfo: {
      name: 'mock-vscode-copilot',
      version: '1.0.0',
    },
    cannedResponses,
    defaultResponse: 'bmm:analyst,core:debug,bmm:architect', // Default ranking
  });
}
