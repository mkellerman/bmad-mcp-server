/**
 * LLM Helper
 *
 * Utilities for interacting with LLMs and capturing metadata for test reporting.
 * Supports LiteLLM proxy and tracks interactions, token usage, and timing.
 *
 * Usage:
 * ```ts
 * import { LLMHelper } from './llm-helper.js';
 *
 * const llm = new LLMHelper({
 *   baseURL: 'http://localhost:4000',
 *   model: 'gpt-4.1',
 * });
 *
 * const response = await llm.chat('What is 2+2?');
 * console.log(response.content);
 *
 * // Get all interactions for test reporter
 * const interactions = llm.getInteractions();
 * reporter.addTest('My Suite', {
 *   // ... test fields
 *   llmInteractions: interactions,
 * });
 * ```
 */

import type { LLMInteraction, ToolCall } from '../core/types.js';

/**
 * LLM configuration
 */
export interface LLMConfig {
  /** Base URL for LLM API (e.g., 'http://localhost:4000' for LiteLLM) */
  baseURL: string;
  /** Model name (e.g., 'gpt-4.1', 'claude-3-opus') */
  model: string;
  /** API key (optional, may not be needed for local LiteLLM) */
  apiKey?: string;
  /** Provider name (defaults to 'litellm') */
  provider?: string;
  /** Temperature (0-2, default 1) */
  temperature?: number;
  /** Max tokens to generate */
  maxTokens?: number;
  /** System message to prepend */
  systemMessage?: string;
  /** Tools available to the LLM */
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }>;
}

/**
 * Chat message
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

/**
 * LLM Helper class
 */
export class LLMHelper {
  private config: Required<LLMConfig>;
  private interactions: LLMInteraction[] = [];
  private conversationHistory: ChatMessage[] = [];

  constructor(config: LLMConfig) {
    this.config = {
      provider: 'litellm',
      temperature: 1,
      maxTokens: 4000,
      systemMessage: '',
      tools: [],
      apiKey: '',
      ...config,
    };

    // Add system message to conversation if provided
    if (this.config.systemMessage) {
      this.conversationHistory.push({
        role: 'system',
        content: this.config.systemMessage,
      });
    }
  }

  /**
   * Send a chat message and get response
   *
   * @param prompt - User message to send
   * @param options - Override config options for this request
   * @returns Response content
   */
  async chat(
    prompt: string,
    options: {
      systemMessage?: string;
      temperature?: number;
      maxTokens?: number;
      tools?: LLMConfig['tools'];
    } = {},
  ): Promise<{ content: string; toolCalls: ToolCall[] }> {
    const startTime = Date.now();
    const interactionId = `interaction-${this.interactions.length + 1}`;

    // Build messages
    const messages: ChatMessage[] = [...this.conversationHistory];

    // Override system message if provided
    if (options.systemMessage) {
      messages[0] = {
        role: 'system',
        content: options.systemMessage,
      };
    }

    // Add user message
    messages.push({
      role: 'user',
      content: prompt,
    });

    // Build request
    const requestBody = {
      model: this.config.model,
      messages,
      temperature: options.temperature ?? this.config.temperature,
      max_tokens: options.maxTokens ?? this.config.maxTokens,
      tools: options.tools ?? this.config.tools,
    };

    // Make API request
    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey
            ? { Authorization: `Bearer ${this.config.apiKey}` }
            : {}),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      // Extract response content and tool calls
      const choice = data.choices?.[0];
      const message = choice?.message;
      const content = message?.content || '';
      const rawToolCalls = message?.tool_calls || [];

      // Parse tool calls
      const toolCalls: ToolCall[] = rawToolCalls.map((tc: any) => ({
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
        timestamp: new Date().toISOString(),
        duration: 0, // Tool duration tracked separately
      }));

      // Record interaction
      const interaction: LLMInteraction = {
        id: interactionId,
        timestamp: new Date(startTime).toISOString(),
        prompt,
        systemMessage: options.systemMessage || this.config.systemMessage,
        provider: {
          name: this.config.provider,
          model: this.config.model,
        },
        toolCalls,
        response: content,
        duration,
        tokenUsage: data.usage
          ? {
              prompt: data.usage.prompt_tokens,
              completion: data.usage.completion_tokens,
              total: data.usage.total_tokens,
            }
          : undefined,
        rawRequest: requestBody,
        rawResponse: data,
      };

      this.interactions.push(interaction);

      // Update conversation history
      this.conversationHistory.push(
        {
          role: 'user',
          content: prompt,
        },
        {
          role: 'assistant',
          content,
          tool_calls: message.tool_calls,
        },
      );

      return { content, toolCalls };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Record failed interaction
      const interaction: LLMInteraction = {
        id: interactionId,
        timestamp: new Date(startTime).toISOString(),
        prompt,
        systemMessage: options.systemMessage || this.config.systemMessage,
        provider: {
          name: this.config.provider,
          model: this.config.model,
        },
        toolCalls: [],
        response: `Error: ${error instanceof Error ? error.message : String(error)}`,
        duration,
        rawRequest: requestBody,
      };

      this.interactions.push(interaction);

      throw error;
    }
  }

  /**
   * Execute a tool call with tracking and validation
   *
   * @param toolCall - Tool call to execute
   * @param executor - Function that executes the tool (receives tool arguments)
   * @returns Tool result
   */
  async executeTool<T = unknown>(
    toolCall: ToolCall,
    // eslint-disable-next-line no-unused-vars
    executor: (_args: Record<string, unknown>) => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await executor(toolCall.arguments);
      const duration = Date.now() - startTime;

      // Update tool call with result
      toolCall.result = result;
      toolCall.duration = duration;

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Update tool call with error
      toolCall.error = error instanceof Error ? error.message : String(error);
      toolCall.duration = duration;

      throw error;
    }
  }

  /**
   * Add a tool result to conversation and continue
   *
   * @param toolCallId - ID of the tool call
   * @param toolName - Name of the tool
   * @param result - Result from tool execution
   * @returns Next LLM response
   */
  async continueWithToolResult(
    toolCallId: string,
    toolName: string,
    result: unknown,
  ): Promise<{ content: string; toolCalls: ToolCall[] }> {
    // Add tool result to conversation
    this.conversationHistory.push({
      role: 'tool',
      content: JSON.stringify(result),
      tool_call_id: toolCallId,
      name: toolName,
    });

    // Get next response
    const messages = [...this.conversationHistory];
    const startTime = Date.now();
    const interactionId = `interaction-${this.interactions.length + 1}`;

    const requestBody = {
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      tools: this.config.tools,
    };

    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey
          ? { Authorization: `Bearer ${this.config.apiKey}` }
          : {}),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.statusText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    const choice = data.choices?.[0];
    const message = choice?.message;
    const content = message?.content || '';
    const rawToolCalls = message?.tool_calls || [];

    const toolCalls: ToolCall[] = rawToolCalls.map((tc: any) => ({
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments),
      timestamp: new Date().toISOString(),
      duration: 0,
    }));

    // Record interaction
    const interaction: LLMInteraction = {
      id: interactionId,
      timestamp: new Date(startTime).toISOString(),
      prompt: `[Tool result: ${toolName}]`,
      provider: {
        name: this.config.provider,
        model: this.config.model,
      },
      toolCalls,
      response: content,
      duration,
      tokenUsage: data.usage
        ? {
            prompt: data.usage.prompt_tokens,
            completion: data.usage.completion_tokens,
            total: data.usage.total_tokens,
          }
        : undefined,
      rawRequest: requestBody,
      rawResponse: data,
    };

    this.interactions.push(interaction);

    // Update conversation
    this.conversationHistory.push({
      role: 'assistant',
      content,
      tool_calls: message.tool_calls,
    });

    return { content, toolCalls };
  }

  /**
   * Get all recorded interactions
   */
  getInteractions(): LLMInteraction[] {
    return [...this.interactions];
  }

  /**
   * Get the last interaction
   */
  getLastInteraction(): LLMInteraction | undefined {
    return this.interactions[this.interactions.length - 1];
  }

  /**
   * Clear interaction history
   */
  clearInteractions(): void {
    this.interactions = [];
  }

  /**
   * Reset conversation (keeps interactions but clears conversation history)
   */
  resetConversation(): void {
    this.conversationHistory = [];
    if (this.config.systemMessage) {
      this.conversationHistory.push({
        role: 'system',
        content: this.config.systemMessage,
      });
    }
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Get total token usage across all interactions
   */
  getTotalTokenUsage(): {
    prompt: number;
    completion: number;
    total: number;
  } {
    return this.interactions.reduce(
      (acc, interaction) => {
        if (interaction.tokenUsage) {
          acc.prompt += interaction.tokenUsage.prompt;
          acc.completion += interaction.tokenUsage.completion;
          acc.total += interaction.tokenUsage.total;
        }
        return acc;
      },
      { prompt: 0, completion: 0, total: 0 },
    );
  }

  /**
   * Get total duration across all interactions
   */
  getTotalDuration(): number {
    return this.interactions.reduce((sum, i) => sum + i.duration, 0);
  }
}

/**
 * Create a simple LLM helper instance for one-off requests
 */
export function createLLMHelper(config: LLMConfig): LLMHelper {
  return new LLMHelper(config);
}

/**
 * Simple chat helper for quick testing
 */
export async function quickChat(
  prompt: string,
  options: {
    model?: string;
    baseURL?: string;
  } = {},
): Promise<string> {
  const llm = new LLMHelper({
    baseURL: options.baseURL || 'http://localhost:4000',
    model: options.model || 'gpt-4.1',
  });

  const response = await llm.chat(prompt);
  return response.content;
}
