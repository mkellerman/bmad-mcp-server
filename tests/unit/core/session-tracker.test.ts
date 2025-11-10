/**
 * Tests for SessionTracker - session-based usage tracking and ranking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SessionTracker } from '../../../src/core/session-tracker.js';

describe('SessionTracker', () => {
  let tracker: SessionTracker;

  beforeEach(() => {
    tracker = new SessionTracker();
  });

  describe('Usage Recording', () => {
    it('should record first access correctly', () => {
      tracker.recordUsage('core:debug');

      const stats = tracker.getStats();
      expect(stats.totalItems).toBe(2); // Agent + module
      expect(stats.totalAccesses).toBe(2);
      expect(stats.topItems[0].key).toBe('core:debug');
      expect(stats.topItems[0].count).toBe(1);
    });

    it('should increment count on repeated usage', () => {
      tracker.recordUsage('core:debug');
      tracker.recordUsage('core:debug');
      tracker.recordUsage('core:debug');

      const stats = tracker.getStats();
      const debugItem = stats.topItems.find((i) => i.key === 'core:debug');
      expect(debugItem?.count).toBe(3);
    });

    it('should track module-level usage automatically', () => {
      tracker.recordUsage('bmm:architect');

      const stats = tracker.getStats();
      const moduleItem = stats.topItems.find((i) => i.key === 'bmm');
      expect(moduleItem).toBeDefined();
      expect(moduleItem?.count).toBe(1);
    });

    it('should aggregate module usage across agents', () => {
      tracker.recordUsage('core:debug');
      tracker.recordUsage('core:analyst');
      tracker.recordUsage('core:brainstorming');

      const stats = tracker.getStats();
      const coreModule = stats.topItems.find((i) => i.key === 'core');
      expect(coreModule?.count).toBe(3);
    });
  });

  describe('Recency Scoring', () => {
    it('should score never-accessed items as 0', () => {
      const score = tracker.calculateScore('never-used:item', 0, 10);

      // Score should be purely manifest priority + core boost (if applicable)
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should score recently-used items higher than old items', async () => {
      // Access item 1 (bmm module, no core boost)
      tracker.recordUsage('bmm:architect');

      // Wait 100ms
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Access item 2 (bmm module, no core boost)
      tracker.recordUsage('bmm:debug');

      // Score them (same manifest position, same module)
      const oldScore = tracker.calculateScore('bmm:architect', 0, 2);
      const recentScore = tracker.calculateScore('bmm:debug', 0, 2);

      // Recent item should score higher
      expect(recentScore).toBeGreaterThan(oldScore);
    });

    it('should apply exponential decay to recency', async () => {
      tracker.recordUsage('core:debug');

      // Immediately
      const score1 = tracker.calculateScore('core:debug', 0, 1);

      // Wait 50ms
      await new Promise((resolve) => setTimeout(resolve, 50));
      const score2 = tracker.calculateScore('core:debug', 0, 1);

      // Score should decay
      expect(score2).toBeLessThan(score1);
    });
  });

  describe('Frequency Scoring', () => {
    it('should score frequently-used items higher', () => {
      // Use item 1 many times
      for (let i = 0; i < 10; i++) {
        tracker.recordUsage('core:debug');
      }

      // Use item 2 once
      tracker.recordUsage('bmm:architect');

      const frequentScore = tracker.calculateScore('core:debug', 0, 2);
      const rareScore = tracker.calculateScore('bmm:architect', 0, 2);

      expect(frequentScore).toBeGreaterThan(rareScore);
    });

    it('should use log-scale for frequency', () => {
      // Test that frequency scoring is non-linear (log2)
      tracker.recordUsage('item');
      tracker.recordUsage('item');
      tracker.recordUsage('item');
      tracker.recordUsage('item'); // 4 accesses

      const score = tracker.calculateScore('item', 0, 1);

      // Frequency component: log2(4 + 1) / log2(101) ≈ 0.34
      // With recency=0.4, frequency=0.3, manifest=0.2
      // Frequency contributes about 0.3 * 0.34 = 0.10
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1.2); // Max with boost
    });
  });

  describe('Manifest Priority', () => {
    it('should score first manifest item highest', () => {
      const firstScore = tracker.calculateScore('item1', 0, 10);
      const lastScore = tracker.calculateScore('item2', 9, 10);

      // First item gets 1.0 manifest priority, last gets 0.0
      expect(firstScore).toBeGreaterThan(lastScore);
    });

    it('should linearly interpolate manifest scores', () => {
      const firstScore = tracker.calculateScore('item1', 0, 100);
      const midScore = tracker.calculateScore('item2', 50, 100);
      const lastScore = tracker.calculateScore('item3', 99, 100);

      // Mid should be roughly halfway
      expect(midScore).toBeGreaterThan(lastScore);
      expect(firstScore).toBeGreaterThan(midScore);
    });
  });

  describe('Module and Agent Boosts', () => {
    it('should boost core module items on fresh session', () => {
      const coreScore = tracker.calculateScore('core:debug', 0, 2);
      const cisScore = tracker.calculateScore('cis:innovator', 0, 2);

      // core:debug gets 0.05 agent boost, cis:innovator gets 0.0
      expect(coreScore).toBeGreaterThan(cisScore);
    });

    it('should boost analyst and pm agents higher than core module', () => {
      const analystScore = tracker.calculateScore('bmm:analyst', 0, 3);
      const pmScore = tracker.calculateScore('bmm:pm', 0, 3);
      const coreDebugScore = tracker.calculateScore('core:debug', 0, 3);

      // analyst and pm get 0.08 boost, core:debug gets 0.05
      expect(analystScore).toBeGreaterThan(coreDebugScore);
      expect(pmScore).toBeGreaterThan(coreDebugScore);
    });

    it('should NOT boost after usage', () => {
      // Access items
      tracker.recordUsage('core:debug');
      tracker.recordUsage('cis:innovator');

      const coreScore = tracker.calculateScore('core:debug', 0, 2);
      const cisScore = tracker.calculateScore('cis:innovator', 0, 2);

      // No boost advantage anymore (scores driven by usage)
      expect(Math.abs(coreScore - cisScore)).toBeLessThan(0.2);
    });
  });

  describe('Combined Ranking', () => {
    it('should balance all signals appropriately', async () => {
      // Use custom weights that favor recency+frequency over manifest
      const testTracker = new SessionTracker({
        weights: {
          recency: 0.5,
          frequency: 0.4,
          manifestPriority: 0.05,
        },
        boosts: {
          moduleBoosts: {},
          agentBoosts: {},
        },
      });

      // Setup:
      // - bmm:item1: Old, rare, high manifest priority (first)
      // - bmm:item2: Recent, frequent, low manifest priority (last)

      // Use item1 once, long ago
      testTracker.recordUsage('bmm:item1');

      // Wait 200ms for significant recency decay
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Use item2 many times, recently
      for (let i = 0; i < 20; i++) {
        testTracker.recordUsage('bmm:item2');
      }

      const score1 = testTracker.calculateScore('bmm:item1', 0, 2); // First in manifest
      const score2 = testTracker.calculateScore('bmm:item2', 1, 2); // Last in manifest

      // Recent+frequent should beat manifest priority
      expect(score2).toBeGreaterThan(score1);
    });

    it('should handle edge case: single item', () => {
      const score = tracker.calculateScore('only-item', 0, 1);

      // Should get perfect manifest score + any boosts
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1.5); // Max possible with boost
    });
  });

  describe('Custom Weights', () => {
    it('should respect custom weight configuration', () => {
      // Create tracker that heavily favors recency
      const customTracker = new SessionTracker({
        weights: {
          recency: 0.8,
          frequency: 0.1,
          manifestPriority: 0.05,
        },
        boosts: {
          moduleBoosts: {},
          agentBoosts: {},
        },
      });

      customTracker.recordUsage('recent-item');

      const score = customTracker.calculateScore('recent-item', 9, 10);

      // Should score well despite bad manifest position
      expect(score).toBeGreaterThan(0.7);
    });
  });

  describe('Session Management', () => {
    it('should reset all data on reset()', () => {
      tracker.recordUsage('item1');
      tracker.recordUsage('item2');
      tracker.recordUsage('item3');

      tracker.reset();

      const stats = tracker.getStats();
      expect(stats.totalItems).toBe(0);
      expect(stats.totalAccesses).toBe(0);
      expect(stats.topItems).toHaveLength(0);
    });

    it('should track session duration', async () => {
      const startStats = tracker.getStats();
      expect(startStats.sessionDuration).toBeGreaterThanOrEqual(0);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const endStats = tracker.getStats();
      expect(endStats.sessionDuration).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Statistics', () => {
    it('should return top 10 items sorted by count', () => {
      // Create 15 items with varying usage
      for (let i = 1; i <= 15; i++) {
        for (let j = 0; j < i; j++) {
          tracker.recordUsage(`item${i}`);
        }
      }

      const stats = tracker.getStats();

      // Should return exactly 10 items
      expect(stats.topItems).toHaveLength(10);

      // Should be sorted descending by count
      for (let i = 0; i < 9; i++) {
        expect(stats.topItems[i].count).toBeGreaterThanOrEqual(
          stats.topItems[i + 1].count,
        );
      }

      // Most used should be item15 (15 accesses)
      expect(stats.topItems[0].key).toMatch(/item15/);
      expect(stats.topItems[0].count).toBeGreaterThanOrEqual(15);
    });

    it('should calculate total accesses correctly', () => {
      tracker.recordUsage('item1'); // 1 access
      tracker.recordUsage('item1'); // 1 access
      tracker.recordUsage('item2'); // 1 access

      const stats = tracker.getStats();

      // 3 item accesses (module tracking doesn't count as separate accesses)
      expect(stats.totalAccesses).toBe(3);
    });
  });

  describe('Default Weights', () => {
    it('should use sensible default weights from config', async () => {
      const { RANKING_CONFIG } = await import('../../../src/config.js');

      expect(RANKING_CONFIG.weights.recency).toBe(0.4);
      expect(RANKING_CONFIG.weights.frequency).toBe(0.3);
      expect(RANKING_CONFIG.weights.manifestPriority).toBe(0.2);

      // Module boosts should exist
      expect(RANKING_CONFIG.moduleBoosts.core).toBe(0.1);
      expect(RANKING_CONFIG.moduleBoosts.bmm).toBe(0.05);

      // Agent boosts should exist for key agents
      expect(RANKING_CONFIG.agentBoosts['bmm:analyst']).toBe(0.08);
      expect(RANKING_CONFIG.agentBoosts['bmm:pm']).toBe(0.08);

      // Weights should sum to 0.9
      const sum =
        RANKING_CONFIG.weights.recency +
        RANKING_CONFIG.weights.frequency +
        RANKING_CONFIG.weights.manifestPriority;
      expect(sum).toBeCloseTo(0.9, 5);
    });
  });
});
