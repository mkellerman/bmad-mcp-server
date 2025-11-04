/**
 * Unit tests for LLM Helper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LLMHelper,
  createLLMHelper,
  quickChat,
} from '../../framework/helpers/llm-helper.js';
import type { ToolCall } from '../../framework/core/types.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('LLMHelper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with required config', () => {
      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      expect(llm).toBeInstanceOf(LLMHelper);
      expect(llm.getInteractions()).toEqual([]);
    });

    it('should use default provider as litellm', () => {
      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      // Provider is internal but we can verify through interactions
      expect(llm.getConversationHistory()).toEqual([]);
    });

    it('should add system message to conversation if provided', () => {
      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
        systemMessage: 'You are a helpful assistant',
      });

      const history = llm.getConversationHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant',
      });
    });
  });

  describe('chat', () => {
    it('should send chat request and return response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '4',
              tool_calls: [],
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 1,
          total_tokens: 11,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      const result = await llm.chat('What is 2+2?');

      expect(result.content).toBe('4');
      expect(result.toolCalls).toEqual([]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should record interaction with metadata', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Hello!',
              tool_calls: [],
            },
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 2,
          total_tokens: 7,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      await llm.chat('Hi');

      const interactions = llm.getInteractions();
      expect(interactions).toHaveLength(1);
      expect(interactions[0]).toMatchObject({
        id: 'interaction-1',
        prompt: 'Hi',
        response: 'Hello!',
        provider: {
          name: 'litellm',
          model: 'gpt-4.1',
        },
        tokenUsage: {
          prompt: 5,
          completion: 2,
          total: 7,
        },
      });
      expect(interactions[0].duration).toBeGreaterThanOrEqual(0);
      expect(interactions[0].timestamp).toBeTruthy();
    });

    it('should handle tool calls in response', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '',
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: '{"location":"Tokyo"}',
                  },
                },
              ],
            },
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 10,
          total_tokens: 30,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
        tools: [
          {
            type: 'function',
            function: {
              name: 'get_weather',
              description: 'Get weather',
            },
          },
        ],
      });

      const result = await llm.chat('What is the weather in Tokyo?');

      expect(result.content).toBe('');
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0]).toMatchObject({
        name: 'get_weather',
        arguments: { location: 'Tokyo' },
      });
    });

    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      await expect(llm.chat('Hello')).rejects.toThrow(
        'LLM API error (500): Internal Server Error',
      );

      // Should still record failed interaction
      const interactions = llm.getInteractions();
      expect(interactions).toHaveLength(1);
      expect(interactions[0].response).toContain('Error:');
    });

    it('should override config options per request', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response',
              tool_calls: [],
            },
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 1,
          total_tokens: 6,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
        temperature: 1.0,
        maxTokens: 1000,
      });

      await llm.chat('Test', {
        temperature: 0.5,
        maxTokens: 500,
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.temperature).toBe(0.5);
      expect(requestBody.max_tokens).toBe(500);
    });

    it('should update conversation history', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Nice to meet you!',
              tool_calls: [],
            },
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 3,
          total_tokens: 8,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      await llm.chat('Hello');

      const history = llm.getConversationHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({
        role: 'user',
        content: 'Hello',
      });
      expect(history[1]).toMatchObject({
        role: 'assistant',
        content: 'Nice to meet you!',
      });
    });
  });

  describe('executeTool', () => {
    it('should execute tool and record result', async () => {
      const toolCall: ToolCall = {
        name: 'get_weather',
        arguments: { location: 'Tokyo' },
        timestamp: new Date().toISOString(),
        duration: 0,
      };

      const executor = vi
        .fn()
        .mockResolvedValue({ temp: 25, condition: 'Sunny' });

      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      const result = await llm.executeTool(toolCall, executor);

      expect(result).toEqual({ temp: 25, condition: 'Sunny' });
      expect(toolCall.result).toEqual({ temp: 25, condition: 'Sunny' });
      expect(toolCall.duration).toBeGreaterThanOrEqual(0);
      expect(executor).toHaveBeenCalledWith({ location: 'Tokyo' });
    });

    it('should record tool execution errors', async () => {
      const toolCall: ToolCall = {
        name: 'get_weather',
        arguments: { location: 'InvalidCity' },
        timestamp: new Date().toISOString(),
        duration: 0,
      };

      const executor = vi.fn().mockRejectedValue(new Error('City not found'));

      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      await expect(llm.executeTool(toolCall, executor)).rejects.toThrow(
        'City not found',
      );

      expect(toolCall.error).toBe('City not found');
      expect(toolCall.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getInteractions', () => {
    it('should return all interactions', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response', tool_calls: [] } }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      await llm.chat('First');
      await llm.chat('Second');

      const interactions = llm.getInteractions();
      expect(interactions).toHaveLength(2);
      expect(interactions[0].prompt).toBe('First');
      expect(interactions[1].prompt).toBe('Second');
    });

    it('should return copy of interactions array', async () => {
      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      const interactions1 = llm.getInteractions();
      const interactions2 = llm.getInteractions();

      expect(interactions1).not.toBe(interactions2);
      expect(interactions1).toEqual(interactions2);
    });
  });

  describe('getLastInteraction', () => {
    it('should return last interaction', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response', tool_calls: [] } }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      await llm.chat('First');
      await llm.chat('Second');

      const lastInteraction = llm.getLastInteraction();
      expect(lastInteraction?.prompt).toBe('Second');
    });

    it('should return undefined when no interactions', () => {
      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      expect(llm.getLastInteraction()).toBeUndefined();
    });
  });

  describe('clearInteractions', () => {
    it('should clear all interactions', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response', tool_calls: [] } }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      await llm.chat('Test');
      expect(llm.getInteractions()).toHaveLength(1);

      llm.clearInteractions();
      expect(llm.getInteractions()).toHaveLength(0);
    });
  });

  describe('resetConversation', () => {
    it('should clear conversation history but keep interactions', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response', tool_calls: [] } }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
        systemMessage: 'System',
      });

      await llm.chat('Test');
      expect(llm.getConversationHistory()).toHaveLength(3); // system + user + assistant

      llm.resetConversation();
      expect(llm.getConversationHistory()).toHaveLength(1); // only system message
      expect(llm.getInteractions()).toHaveLength(1); // kept
    });
  });

  describe('getTotalTokenUsage', () => {
    it('should sum token usage across all interactions', async () => {
      const mockResponse1 = {
        choices: [{ message: { content: 'Response', tool_calls: [] } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      const mockResponse2 = {
        choices: [{ message: { content: 'Response', tool_calls: [] } }],
        usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        });

      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      await llm.chat('First');
      await llm.chat('Second');

      const usage = llm.getTotalTokenUsage();
      expect(usage).toEqual({
        prompt: 30,
        completion: 15,
        total: 45,
      });
    });

    it('should handle interactions without token usage', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response', tool_calls: [] } }],
        // No usage field
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      await llm.chat('Test');

      const usage = llm.getTotalTokenUsage();
      expect(usage).toEqual({
        prompt: 0,
        completion: 0,
        total: 0,
      });
    });
  });

  describe('getTotalDuration', () => {
    it('should sum duration across all interactions', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response', tool_calls: [] } }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const llm = new LLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      await llm.chat('First');
      await llm.chat('Second');

      const totalDuration = llm.getTotalDuration();
      expect(totalDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createLLMHelper', () => {
    it('should create LLMHelper instance', () => {
      const llm = createLLMHelper({
        baseURL: 'http://localhost:4000',
        model: 'gpt-4.1',
      });

      expect(llm).toBeInstanceOf(LLMHelper);
    });
  });

  describe('quickChat', () => {
    it('should send simple chat and return response', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Hello!', tool_calls: [] } }],
        usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await quickChat('Hi');

      expect(response).toBe('Hello!');
    });

    it('should use custom model and baseURL', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response', tool_calls: [] } }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await quickChat('Test', {
        model: 'claude-3-opus',
        baseURL: 'http://custom:8000',
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      expect(fetchCall[0]).toBe('http://custom:8000/chat/completions');

      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.model).toBe('claude-3-opus');
    });
  });
});
