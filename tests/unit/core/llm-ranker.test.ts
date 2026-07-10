/**
 * Unit Test: LLM Ranker
 *
 * INTENT:
 * Validate the LLM-based ranking utilities that power intelligent workflow/agent
 * ranking when MCP sampling is available. Tests prompt generation, response parsing,
 * and hybrid decision logic.
 *
 * EXPECTED STEPS:
 * 1. Test buildRankingPrompt() generates token-efficient prompts
 * 2. Test parseRankingResponse() handles various LLM response formats
 * 3. Test shouldUseLLMRanking() makes correct hybrid decisions
 *
 * EXPECTED RESULTS:
 * - Prompts are concise (~200 tokens) and well-formatted
 * - Parser handles malformed/partial responses gracefully
 * - Decision logic correctly chooses LLM vs session-based ranking
 * - Edge cases (empty lists, invalid data) handled properly
 *
 * FAILURE CONDITIONS:
 * - Prompt generation exceeds token budget
 * - Parser fails on valid LLM responses
 * - Decision logic makes incorrect choices
 * - Functions throw on valid inputs
 */

import { describe, it, expect } from 'vitest';
import {
  buildRankingPrompt,
  parseRankingResponse,
  shouldUseLLMRanking,
  type RankingContext,
  type UsageInfo,
} from '../../../src/core/llm-ranker.js';

describe('LLM Ranker', () => {
  describe('buildRankingPrompt', () => {
    it('should generate a basic ranking prompt without usage history', () => {
      // Arrange
      const context: RankingContext = {
        userQuery: 'Help me design a mobile app',
        candidates: [
          {
            key: 'bmm:analyst',
            name: 'analyst',
            module: 'bmm',
            description: 'Business analyst agent that helps with requirements',
          },
          {
            key: 'bmm:architect',
            name: 'architect',
            module: 'bmm',
            description: 'Software architect agent for system design',
          },
        ],
      };

      // Act
      const prompt = buildRankingPrompt(context);

      // Assert
      expect(prompt).toContain('Help me design a mobile app');
      expect(prompt).toContain('bmm:analyst');
      expect(prompt).toContain('bmm:architect');
      expect(prompt).toContain('Business analyst');
      expect(prompt).toContain('comma-separated list');
    });

    it('should truncate long descriptions to stay within token budget', () => {
      // Arrange
      const longDescription = 'A'.repeat(200); // 200 character description
      const context: RankingContext = {
        userQuery: 'test query',
        candidates: [
          {
            key: 'test:agent',
            name: 'agent',
            module: 'test',
            description: longDescription,
          },
        ],
      };

      // Act
      const prompt = buildRankingPrompt(context);

      // Assert
      // Should truncate at 80 chars and add ...
      expect(prompt).toContain('A'.repeat(80));
      expect(prompt).toContain('...');
      expect(prompt).not.toContain('A'.repeat(81));
    });

    it('should include usage history when provided', () => {
      // Arrange
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const context: RankingContext = {
        userQuery: 'test query',
        candidates: [
          {
            key: 'bmm:analyst',
            name: 'analyst',
            module: 'bmm',
            description: 'Test',
          },
        ],
        usageHistory: [
          {
            key: 'bmm:analyst',
            lastUsed: twoHoursAgo,
            useCount: 5,
          },
        ],
      };

      // Act
      const prompt = buildRankingPrompt(context);

      // Assert
      expect(prompt).toContain('Recent usage:');
      expect(prompt).toContain('bmm:analyst');
      expect(prompt).toContain('used 5x');
      expect(prompt).toMatch(/last \d+h ago/); // Relative time format
    });

    it('should limit usage history to top 5 items', () => {
      // Arrange
      const now = new Date();
      const usageHistory: UsageInfo[] = Array.from({ length: 10 }, (_, i) => ({
        key: `test:agent${i}`,
        lastUsed: now,
        useCount: i + 1,
      }));

      const context: RankingContext = {
        userQuery: 'test',
        candidates: [
          {
            key: 'test:agent0',
            name: 'agent0',
            module: 'test',
            description: 'Test',
          },
        ],
        usageHistory,
      };

      // Act
      const prompt = buildRankingPrompt(context);

      // Assert
      const usageSection =
        prompt.split('Recent usage:')[1]?.split('\n\n')[0] || '';
      const usageLines = usageSection.split('\n').filter((line) => line.trim());
      expect(usageLines.length).toBeLessThanOrEqual(5);
    });

    it('should format prompt with numbered list of candidates', () => {
      // Arrange
      const context: RankingContext = {
        userQuery: 'test',
        candidates: [
          { key: 'test:a', name: 'a', module: 'test', description: 'First' },
          { key: 'test:b', name: 'b', module: 'test', description: 'Second' },
          { key: 'test:c', name: 'c', module: 'test', description: 'Third' },
        ],
      };

      // Act
      const prompt = buildRankingPrompt(context);

      // Assert
      expect(prompt).toContain('1. test:a');
      expect(prompt).toContain('2. test:b');
      expect(prompt).toContain('3. test:c');
    });

    it('should include example response format', () => {
      // Arrange
      const context: RankingContext = {
        userQuery: 'test',
        candidates: [
          { key: 'test:a', name: 'a', module: 'test', description: 'Test' },
        ],
      };

      // Act
      const prompt = buildRankingPrompt(context);

      // Assert
      expect(prompt).toContain('Example:');
      expect(prompt).toMatch(/bmm:analyst,core:debug,bmm:architect/);
    });
  });

  describe('parseRankingResponse', () => {
    it('should parse comma-separated response correctly', () => {
      // Arrange
      const response = 'bmm:analyst,core:debug,bmm:architect';
      const validKeys = new Set(['bmm:analyst', 'core:debug', 'bmm:architect']);

      // Act
      const result = parseRankingResponse(response, validKeys);

      // Assert
      expect(result).toEqual(['bmm:analyst', 'core:debug', 'bmm:architect']);
    });

    it('should parse newline-separated response correctly', () => {
      // Arrange
      const response = 'bmm:analyst\ncore:debug\nbmm:architect';
      const validKeys = new Set(['bmm:analyst', 'core:debug', 'bmm:architect']);

      // Act
      const result = parseRankingResponse(response, validKeys);

      // Assert
      expect(result).toEqual(['bmm:analyst', 'core:debug', 'bmm:architect']);
    });

    it('should handle whitespace around keys', () => {
      // Arrange
      const response = '  bmm:analyst  ,  core:debug  ,  bmm:architect  ';
      const validKeys = new Set(['bmm:analyst', 'core:debug', 'bmm:architect']);

      // Act
      const result = parseRankingResponse(response, validKeys);

      // Assert
      expect(result).toEqual(['bmm:analyst', 'core:debug', 'bmm:architect']);
    });

    it('should filter out invalid keys', () => {
      // Arrange
      const response = 'bmm:analyst,invalid:key,core:debug,another:bad';
      const validKeys = new Set(['bmm:analyst', 'core:debug', 'bmm:architect']);

      // Act
      const result = parseRankingResponse(response, validKeys);

      // Assert
      expect(result).toEqual(['bmm:analyst', 'core:debug', 'bmm:architect']);
      expect(result).not.toContain('invalid:key');
      expect(result).not.toContain('another:bad');
    });

    it('should append missing keys at the end', () => {
      // Arrange
      const response = 'bmm:analyst,core:debug'; // Missing bmm:architect
      const validKeys = new Set(['bmm:analyst', 'core:debug', 'bmm:architect']);

      // Act
      const result = parseRankingResponse(response, validKeys);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('bmm:analyst');
      expect(result[1]).toBe('core:debug');
      expect(result[2]).toBe('bmm:architect'); // Appended
    });

    it('should handle duplicate keys by keeping first occurrence', () => {
      // Arrange
      const response = 'bmm:analyst,core:debug,bmm:analyst,core:debug';
      const validKeys = new Set(['bmm:analyst', 'core:debug', 'bmm:architect']);

      // Act
      const result = parseRankingResponse(response, validKeys);

      // Assert
      expect(result.filter((k) => k === 'bmm:analyst')).toHaveLength(1);
      expect(result.filter((k) => k === 'core:debug')).toHaveLength(1);
      expect(result[0]).toBe('bmm:analyst'); // First occurrence preserved
    });

    it('should handle empty response by returning all valid keys', () => {
      // Arrange
      const response = '';
      const validKeys = new Set(['bmm:analyst', 'core:debug', 'bmm:architect']);

      // Act
      const result = parseRankingResponse(response, validKeys);

      // Assert
      expect(result).toHaveLength(3);
      expect(new Set(result)).toEqual(validKeys);
    });

    it('should handle response with only invalid keys', () => {
      // Arrange
      const response = 'invalid:key1,invalid:key2';
      const validKeys = new Set(['bmm:analyst', 'core:debug']);

      // Act
      const result = parseRankingResponse(response, validKeys);

      // Assert
      expect(result).toEqual(['bmm:analyst', 'core:debug']); // All missing, all appended
    });

    it('should handle response with extra text and extract keys', () => {
      // Arrange
      const response =
        'Here are the ranked items:\nbmm:analyst,core:debug\nThese are the best matches.';
      const validKeys = new Set(['bmm:analyst', 'core:debug', 'bmm:architect']);

      // Act
      const result = parseRankingResponse(response, validKeys);

      // Assert
      expect(result).toContain('bmm:analyst');
      expect(result).toContain('core:debug');
      expect(result).toContain('bmm:architect'); // Missing, appended
    });
  });

  describe('shouldUseLLMRanking', () => {
    it('should return false when sampling not supported', () => {
      // Arrange
      const samplingSupported = false;
      const candidateCount = 5;
      const hasUserQuery = true;

      // Act
      const result = shouldUseLLMRanking(
        samplingSupported,
        candidateCount,
        hasUserQuery,
      );

      // Assert
      expect(result.useLLM).toBe(false);
      expect(result.reason).toContain('Sampling not supported');
    });

    it('should return false when too few candidates (< 3)', () => {
      // Arrange
      const samplingSupported = true;
      const candidateCount = 2;
      const hasUserQuery = true;

      // Act
      const result = shouldUseLLMRanking(
        samplingSupported,
        candidateCount,
        hasUserQuery,
      );

      // Assert
      expect(result.useLLM).toBe(false);
      expect(result.reason).toContain('Too few candidates');
    });

    it('should return false when no user query', () => {
      // Arrange
      const samplingSupported = true;
      const candidateCount = 5;
      const hasUserQuery = false;

      // Act
      const result = shouldUseLLMRanking(
        samplingSupported,
        candidateCount,
        hasUserQuery,
      );

      // Assert
      expect(result.useLLM).toBe(false);
      expect(result.reason).toContain('No user context');
    });

    it('should return true when all conditions met', () => {
      // Arrange
      const samplingSupported = true;
      const candidateCount = 5;
      const hasUserQuery = true;

      // Act
      const result = shouldUseLLMRanking(
        samplingSupported,
        candidateCount,
        hasUserQuery,
      );

      // Assert
      expect(result.useLLM).toBe(true);
      expect(result.reason).toContain('Complex decision');
    });

    it('should return true with exactly 3 candidates (boundary)', () => {
      // Arrange
      const samplingSupported = true;
      const candidateCount = 3;
      const hasUserQuery = true;

      // Act
      const result = shouldUseLLMRanking(
        samplingSupported,
        candidateCount,
        hasUserQuery,
      );

      // Assert
      expect(result.useLLM).toBe(true);
    });

    it('should return false with exactly 2 candidates (boundary)', () => {
      // Arrange
      const samplingSupported = true;
      const candidateCount = 2;
      const hasUserQuery = true;

      // Act
      const result = shouldUseLLMRanking(
        samplingSupported,
        candidateCount,
        hasUserQuery,
      );

      // Assert
      expect(result.useLLM).toBe(false);
    });

    it('should prioritize sampling support over other conditions', () => {
      // Arrange - Perfect conditions but no sampling
      const samplingSupported = false;
      const candidateCount = 10;
      const hasUserQuery = true;

      // Act
      const result = shouldUseLLMRanking(
        samplingSupported,
        candidateCount,
        hasUserQuery,
      );

      // Assert
      expect(result.useLLM).toBe(false);
      expect(result.reason).toContain('not supported');
    });

    it('should return decision with clear reasoning', () => {
      // Arrange
      const testCases = [
        { supported: false, count: 5, query: true },
        { supported: true, count: 2, query: true },
        { supported: true, count: 5, query: false },
        { supported: true, count: 5, query: true },
      ];

      // Act & Assert
      testCases.forEach(({ supported, count, query }) => {
        const result = shouldUseLLMRanking(supported, count, query);
        expect(result.reason).toBeTruthy();
        expect(typeof result.reason).toBe('string');
        expect(result.reason.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Edge Cases', () => {
    it('buildRankingPrompt should handle empty candidate list', () => {
      // Arrange
      const context: RankingContext = {
        userQuery: 'test',
        candidates: [],
      };

      // Act
      const prompt = buildRankingPrompt(context);

      // Assert
      expect(prompt).toContain('Rank these 0 items');
      expect(prompt).toBeTruthy();
    });

    it('parseRankingResponse should handle all keys missing', () => {
      // Arrange
      const response = '';
      const validKeys = new Set<string>([]);

      // Act
      const result = parseRankingResponse(response, validKeys);

      // Assert
      expect(result).toEqual([]);
    });

    it('shouldUseLLMRanking should handle zero candidates', () => {
      // Arrange
      const samplingSupported = true;
      const candidateCount = 0;
      const hasUserQuery = true;

      // Act
      const result = shouldUseLLMRanking(
        samplingSupported,
        candidateCount,
        hasUserQuery,
      );

      // Assert
      expect(result.useLLM).toBe(false);
      expect(result.reason).toContain('Too few');
    });

    it('buildRankingPrompt should handle very long query', () => {
      // Arrange
      const longQuery = 'A'.repeat(1000);
      const context: RankingContext = {
        userQuery: longQuery,
        candidates: [
          { key: 'test:a', name: 'a', module: 'test', description: 'Test' },
        ],
      };

      // Act
      const prompt = buildRankingPrompt(context);

      // Assert
      expect(prompt).toContain(longQuery); // Should include full query
      expect(prompt).toBeTruthy();
    });

    it('parseRankingResponse should handle mixed separators', () => {
      // Arrange
      const response = 'bmm:analyst,\ncore:debug, bmm:architect\n';
      const validKeys = new Set(['bmm:analyst', 'core:debug', 'bmm:architect']);

      // Act
      const result = parseRankingResponse(response, validKeys);

      // Assert
      expect(result).toHaveLength(3);
      expect(result).toContain('bmm:analyst');
      expect(result).toContain('core:debug');
      expect(result).toContain('bmm:architect');
    });
  });
});
