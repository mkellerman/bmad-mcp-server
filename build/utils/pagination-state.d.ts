/**
 * Pagination State Manager
 *
 * Manages pagination state for list commands to support *more functionality.
 * Items are cached in memory with a simple TTL-based expiration.
 */
declare class PaginationStateManager {
    private cache;
    private readonly ttl;
    private readonly pageSize;
    /**
     * Store items for pagination
     */
    set(key: string, items: unknown[], type: 'agents' | 'modules' | 'remotes', context?: string): void;
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
    } | null;
    /**
     * Get first page and store for pagination
     */
    getFirstPage(key: string, items: unknown[], type: 'agents' | 'modules' | 'remotes', context?: string): {
        items: unknown[];
        hasMore: boolean;
        currentPage: number;
        totalPages: number;
        start: number;
        end: number;
        total: number;
    };
    /**
     * Clear pagination state
     */
    clear(key: string): void;
    /**
     * Clear all expired entries
     */
    cleanup(): void;
}
export declare const paginationState: PaginationStateManager;
export {};
//# sourceMappingURL=pagination-state.d.ts.map