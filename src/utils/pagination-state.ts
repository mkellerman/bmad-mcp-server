/**
 * Pagination State Manager
 *
 * Manages pagination state for list commands to support *more functionality.
 * Items are cached in memory with a simple TTL-based expiration.
 */

interface PaginationCache {
  items: unknown[];
  currentIndex: number;
  timestamp: number;
  type: 'agents' | 'modules' | 'remotes';
  context?: string; // e.g., "@awesome" for remote lists
}

class PaginationStateManager {
  private cache: Map<string, PaginationCache> = new Map();
  private readonly ttl = 5 * 60 * 1000; // 5 minutes
  private readonly pageSize = 10;

  /**
   * Store items for pagination
   */
  set(
    key: string,
    items: unknown[],
    type: 'agents' | 'modules' | 'remotes',
    context?: string,
  ): void {
    this.cache.set(key, {
      items,
      currentIndex: 0,
      timestamp: Date.now(),
      type,
      context,
    });
  }

  /**
   * Get next page of items
   *
   * @returns Object with items for current page and pagination info
   */
  getNextPage(key: string): {
    items: unknown[];
    hasMore: boolean;
    currentPage: number;
    totalPages: number;
    start: number;
    end: number;
    total: number;
  } | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check TTL
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    const start = cached.currentIndex;
    const end = Math.min(start + this.pageSize, cached.items.length);
    const items = cached.items.slice(start, end);

    // Update index for next call
    cached.currentIndex = end;

    return {
      items,
      hasMore: end < cached.items.length,
      currentPage: Math.floor(start / this.pageSize) + 1,
      totalPages: Math.ceil(cached.items.length / this.pageSize),
      start: start + 1, // 1-indexed for display
      end,
      total: cached.items.length,
    };
  }

  /**
   * Get first page and store for pagination
   */
  getFirstPage(
    key: string,
    items: unknown[],
    type: 'agents' | 'modules' | 'remotes',
    context?: string,
  ): {
    items: unknown[];
    hasMore: boolean;
    currentPage: number;
    totalPages: number;
    start: number;
    end: number;
    total: number;
  } {
    this.set(key, items, type, context);
    return this.getNextPage(key)!;
  }

  /**
   * Clear pagination state
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton instance
export const paginationState = new PaginationStateManager();

// Cleanup expired entries every minute
// Use unref() so this doesn't keep the process alive in CLI scripts
const cleanupInterval = setInterval(() => {
  paginationState.cleanup();
}, 60 * 1000);
cleanupInterval.unref();
