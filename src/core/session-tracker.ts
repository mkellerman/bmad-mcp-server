/**
 * Session-based Usage Tracker
 *
 * Tracks agent, workflow, and module usage within an MCP session to enable
 * intelligent ranking based on:
 * - Recency: Most recently used items rank higher
 * - Frequency: Most frequently used items rank higher
 * - Manifest priority: Author-defined ordering
 * - Module/Agent boosts: Configurable priority for key modules and agents
 *
 * All data is in-memory and session-scoped (no persistence).
 */

import { RANKING_CONFIG } from '../config.js';

/**
 * Usage record for a single item (agent/workflow/module)
 */
export interface UsageRecord {
  /** Composite key (e.g., "core:debug", "bmm:architect", "core:brainstorming") */
  key: string;
  /** First access timestamp */
  firstAccess: number;
  /** Last access timestamp */
  lastAccess: number;
  /** Total number of accesses */
  count: number;
}

/**
 * Ranking signal weights for score calculation
 */
export interface RankingWeights {
  /** Weight for recency score (0-1) */
  recency: number;
  /** Weight for frequency score (0-1) */
  frequency: number;
  /** Weight for manifest priority (0-1) */
  manifestPriority: number;
}

/**
 * Module and agent boost configuration
 */
export interface BoostConfig {
  /** Module-level boosts (e.g., { core: 0.1, bmm: 0.05 }) */
  moduleBoosts: Record<string, number>;
  /** Agent-level boosts (e.g., { 'bmm:analyst': 0.08 }) */
  agentBoosts: Record<string, number>;
}

/**
 * Complete ranking configuration
 */
export interface RankingConfig {
  weights: RankingWeights;
  boosts: BoostConfig;
  recencyHalfLifeMs: number;
  maxAccessCount: number;
}

/**
 * Default ranking weights (tuned for optimal UX)
 * @deprecated Use RANKING_CONFIG from config.ts instead
 */
export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  recency: RANKING_CONFIG.weights.recency,
  frequency: RANKING_CONFIG.weights.frequency,
  manifestPriority: RANKING_CONFIG.weights.manifestPriority,
};

/**
 * Session-based usage tracker for intelligent ranking
 */
export class SessionTracker {
  /** Usage records by composite key */
  private usageMap = new Map<string, UsageRecord>();

  /** Session start time (for recency decay) */
  private sessionStart: number;

  /** Ranking configuration */
  private config: RankingConfig;

  constructor(config?: Partial<RankingConfig>) {
    this.sessionStart = Date.now();

    // Merge with defaults from RANKING_CONFIG
    this.config = {
      weights: config?.weights || RANKING_CONFIG.weights,
      boosts: config?.boosts || {
        moduleBoosts: RANKING_CONFIG.moduleBoosts,
        agentBoosts: RANKING_CONFIG.agentBoosts,
      },
      recencyHalfLifeMs:
        config?.recencyHalfLifeMs || RANKING_CONFIG.recency.halfLifeMs,
      maxAccessCount:
        config?.maxAccessCount || RANKING_CONFIG.frequency.maxAccessCount,
    };
  }

  /**
   * Record usage of an agent, workflow, or module
   * @param key Composite key (e.g., "core:debug", "bmm:architect")
   */
  recordUsage(key: string): void {
    const now = Date.now();
    const existing = this.usageMap.get(key);

    if (existing) {
      // Update existing record
      existing.lastAccess = now;
      existing.count++;
    } else {
      // Create new record
      this.usageMap.set(key, {
        key,
        firstAccess: now,
        lastAccess: now,
        count: 1,
      });
    }

    // Also record module-level usage (if key is agent or workflow)
    const parts = key.split(':');
    if (parts.length > 1) {
      const moduleKey = parts[0]; // e.g., "core", "bmm"
      const moduleRecord = this.usageMap.get(moduleKey);

      if (moduleRecord) {
        moduleRecord.lastAccess = now;
        moduleRecord.count++;
      } else {
        this.usageMap.set(moduleKey, {
          key: moduleKey,
          firstAccess: now,
          lastAccess: now,
          count: 1,
        });
      }
    }
  }

  /**
   * Calculate ranking score for an item
   *
   * Score components:
   * 1. Recency: Exponential decay from last access (0-1)
   * 2. Frequency: Log-scaled usage count (0-1)
   * 3. Manifest priority: Position in manifest (0-1, higher = earlier)
   * 4. Module/Agent boosts: Configurable priority for key items (no usage only)
   *
   * @param key Composite key (e.g., "core:debug", "bmm:analyst")
   * @param manifestIndex Index in manifest (0 = first/highest priority)
   * @param totalManifestItems Total items in manifest
   * @returns Weighted ranking score (higher = better)
   */
  calculateScore(
    key: string,
    manifestIndex: number,
    totalManifestItems: number,
  ): number {
    const usage = this.usageMap.get(key);
    const now = Date.now();

    // 1. Recency score (exponential decay)
    // - Never accessed: 0
    // - Recent access (< 5min): ~1.0
    // - Old access (> 1hr): ~0.1
    let recencyScore = 0;
    if (usage) {
      const timeSinceLastAccess = now - usage.lastAccess;
      recencyScore = Math.exp(
        -timeSinceLastAccess / this.config.recencyHalfLifeMs,
      );
    }

    // 2. Frequency score (log-scaled)
    // - Never accessed: 0
    // - 1 access: ~0.3
    // - 10 accesses: ~0.7
    // - 100+ accesses: ~1.0
    let frequencyScore = 0;
    if (usage) {
      // Log scale: log2(count + 1) / log2(maxAccessCount) ≈ 0-1
      frequencyScore =
        Math.log2(usage.count + 1) / Math.log2(this.config.maxAccessCount);
      frequencyScore = Math.min(frequencyScore, 1.0); // Cap at 1.0
    }

    // 3. Manifest priority score (linear, inverted)
    // - First item (index=0): 1.0
    // - Middle item: 0.5
    // - Last item: 0.0
    const manifestPriorityScore =
      totalManifestItems > 1
        ? 1 - manifestIndex / (totalManifestItems - 1)
        : 1.0;

    // 4. Module/Agent boosts (only if no prior usage)
    let boost = 0;
    if (!usage) {
      // Check agent-level boost first (more specific)
      if (this.config.boosts.agentBoosts[key] !== undefined) {
        boost = this.config.boosts.agentBoosts[key];
      } else {
        // Fall back to module-level boost
        const module = key.split(':')[0];
        if (this.config.boosts.moduleBoosts[module] !== undefined) {
          boost = this.config.boosts.moduleBoosts[module];
        }
      }
    }

    // Weighted sum
    const score =
      this.config.weights.recency * recencyScore +
      this.config.weights.frequency * frequencyScore +
      this.config.weights.manifestPriority * manifestPriorityScore +
      boost;

    return score;
  }

  /**
   * Get usage statistics for debugging/observability
   */
  getStats(): {
    totalItems: number;
    totalAccesses: number;
    sessionDuration: number;
    topItems: Array<{ key: string; count: number; lastAccess: number }>;
  } {
    const totalAccesses = Array.from(this.usageMap.values()).reduce(
      (sum, record) => sum + record.count,
      0,
    );

    const topItems = Array.from(this.usageMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((record) => ({
        key: record.key,
        count: record.count,
        lastAccess: record.lastAccess,
      }));

    return {
      totalItems: this.usageMap.size,
      totalAccesses,
      sessionDuration: Date.now() - this.sessionStart,
      topItems,
    };
  }

  /**
   * Get usage record for a specific key (for LLM ranking context)
   */
  getUsageRecord(key: string): UsageRecord | undefined {
    return this.usageMap.get(key);
  }

  /**
   * Reset all session data (for testing or new session)
   */
  reset(): void {
    this.usageMap.clear();
    this.sessionStart = Date.now();
  }
}
