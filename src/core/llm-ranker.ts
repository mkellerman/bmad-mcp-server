/**
 * LLM-based ranking using MCP sampling capability
 *
 * Uses createMessage to rank candidates by relevance to user query.
 * Provides hybrid decision logic for when to use LLM vs session-based ranking.
 */

export interface RankingCandidate {
  key: string; // e.g., "bmm:analyst", "core:debug"
  name: string;
  description: string;
  module: string;
}

export interface UsageInfo {
  key: string;
  lastUsed: Date;
  useCount: number;
}

export interface RankingContext {
  userQuery: string;
  candidates: RankingCandidate[];
  usageHistory?: UsageInfo[];
}

/**
 * Build a concise ranking prompt for the LLM
 *
 * Token budget: ~200 tokens
 * Returns a prompt asking LLM to rank candidates by relevance
 */
export function buildRankingPrompt(context: RankingContext): string {
  const { userQuery, candidates, usageHistory } = context;

  let prompt = `Rank these ${candidates.length} items by relevance to: "${userQuery}"\n\n`;
  prompt += 'Available items:\n';

  // List candidates with truncated descriptions to stay within token budget
  candidates.forEach((c, i) => {
    const desc = c.description.slice(0, 80);
    prompt += `${i + 1}. ${c.key} (${c.module}): ${desc}${c.description.length > 80 ? '...' : ''}\n`;
  });

  // Include usage history if available (optional context)
  if (usageHistory && usageHistory.length > 0) {
    prompt += '\nRecent usage:\n';
    usageHistory.slice(0, 5).forEach((h) => {
      const relative = formatRelativeTime(h.lastUsed);
      prompt += `- ${h.key}: used ${h.useCount}x, last ${relative}\n`;
    });
  }

  prompt +=
    '\nReturn ONLY a comma-separated list of keys in ranked order (most relevant first).\n';
  prompt += 'Example: bmm:analyst,core:debug,bmm:architect';

  return prompt;
}

/**
 * Parse LLM ranking response
 *
 * Expected format: "bmm:analyst,core:debug,bmm:architect"
 * Validates keys and handles missing/extra keys gracefully
 */
export function parseRankingResponse(
  response: string,
  validKeys: Set<string>,
): string[] {
  // Extract comma-separated or newline-separated keys
  const ranked = response
    .trim()
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && validKeys.has(k));

  // Remove duplicates (preserve first occurrence)
  const uniqueRanked = Array.from(new Set(ranked));

  // Validation: ensure all candidates present (LLM might skip some)
  const missing = Array.from(validKeys).filter(
    (k) => !uniqueRanked.includes(k),
  );

  // Return ranked items first, append missing at end
  return [...uniqueRanked, ...missing];
}

/**
 * Format relative time for usage history
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

/**
 * Hybrid ranking decision heuristics
 *
 * Determines when to use LLM ranking vs session-based ranking
 */
export interface RankingDecision {
  useLLM: boolean;
  reason: string;
}

export function shouldUseLLMRanking(
  samplingSupported: boolean,
  candidateCount: number,
  hasUserQuery: boolean,
): RankingDecision {
  // Always use session-based if sampling not supported
  if (!samplingSupported) {
    return {
      useLLM: false,
      reason: 'Sampling not supported by client',
    };
  }

  // Fast path: too few candidates, choice is obvious
  if (candidateCount < 3) {
    return {
      useLLM: false,
      reason: 'Too few candidates (< 3), choice is obvious',
    };
  }

  // No user query = simple list operation, use session ranking
  if (!hasUserQuery) {
    return {
      useLLM: false,
      reason: 'No user context, just listing all items',
    };
  }

  // Complex scenario: use LLM for intelligent ranking
  return {
    useLLM: true,
    reason: 'Complex decision with user context, LLM can understand intent',
  };
}
