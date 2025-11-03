/**
 * Pagination State Manager
 *
 * Manages pagination state for list commands to support *more functionality.
 * Items are cached in memory with a simple TTL-based expiration.
 */
class PaginationStateManager {
    cache = new Map();
    ttl = 5 * 60 * 1000; // 5 minutes
    pageSize = 10;
    /**
     * Store items for pagination
     */
    set(key, items, type, context) {
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
    getNextPage(key) {
        const cached = this.cache.get(key);
        if (!cached)
            return null;
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
    getFirstPage(key, items, type, context) {
        this.set(key, items, type, context);
        return this.getNextPage(key);
    }
    /**
     * Clear pagination state
     */
    clear(key) {
        this.cache.delete(key);
    }
    /**
     * Clear all expired entries
     */
    cleanup() {
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
//# sourceMappingURL=pagination-state.js.map