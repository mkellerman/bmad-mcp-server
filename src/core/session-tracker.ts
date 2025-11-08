/**
 * Session-based Usage Tracker
 *
 * Tracks agent, workflow, and module usage within an MCP session to enable
 * intelligent ranking based on:
 * - Recency: Most recently used items rank higher
 * - Frequency: Most frequently used items rank higher
 * - Manifest priority: Author-defined ordering
 * - Module boost: Core module gets initial advantage
 *
 * All data is in-memory and session-scoped (no persistence).
 */

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
  /** Boost for core module on new sessions (added to final score) */
  coreModuleBoost: number;
}

/**
 * Default ranking weights (tuned for optimal UX)
 */
export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  recency: 0.4, // Recent usage is strong signal
  frequency: 0.3, // Frequency matters but less than recency
  manifestPriority: 0.2, // Author intent counts
  coreModuleBoost: 0.1, // Modest boost for core on fresh sessions
};

/**
 * Session-based usage tracker for intelligent ranking
 */
export class SessionTracker {
  /** Usage records by composite key */
  private usageMap = new Map<string, UsageRecord>();

  /** Session start time (for recency decay) */
  private sessionStart: number;

  /** Ranking weights configuration */
  private weights: RankingWeights;

  constructor(weights: RankingWeights = DEFAULT_RANKING_WEIGHTS) {
    this.sessionStart = Date.now();
    this.weights = weights;
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
   * 4. Module boost: +boost if module=core and no prior usage
   *
   * @param key Composite key (e.g., "core:debug")
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
      const halfLifeMs = 15 * 60 * 1000; // 15 minutes
      recencyScore = Math.exp(-timeSinceLastAccess / halfLifeMs);
    }

    // 2. Frequency score (log-scaled)
    // - Never accessed: 0
    // - 1 access: ~0.3
    // - 10 accesses: ~0.7
    // - 100+ accesses: ~1.0
    let frequencyScore = 0;
    if (usage) {
      // Log scale: log2(count + 1) / log2(101) ≈ 0-1 for count 0-100
      frequencyScore = Math.log2(usage.count + 1) / Math.log2(101);
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

    // 4. Core module boost (only if module is 'core' and no usage)
    const module = key.split(':')[0];
    const coreBoost =
      module === 'core' && !usage ? this.weights.coreModuleBoost : 0;

    // Weighted sum
    const score =
      this.weights.recency * recencyScore +
      this.weights.frequency * frequencyScore +
      this.weights.manifestPriority * manifestPriorityScore +
      coreBoost;

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
   * Reset all session data (for testing or new session)
   */
  reset(): void {
    this.usageMap.clear();
    this.sessionStart = Date.now();
  }
}
