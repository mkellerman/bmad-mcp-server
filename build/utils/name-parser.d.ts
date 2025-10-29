/**
 * Name Parser - Module-Qualified Name Support
 *
 * Parses resource names that may include module qualifiers.
 * Supports both simple names and module-qualified syntax:
 * - "architect" → { name: "architect" }
 * - "bmm/architect" → { module: "bmm", name: "architect" }
 *
 * This enables users to:
 * 1. Use short names for common resources
 * 2. Be explicit when multiple modules have the same resource name
 * 3. Override specific module resources without affecting others
 */
/**
 * Parsed name structure with optional module qualifier.
 *
 * @property module - Optional module name (e.g., "bmm", "core")
 * @property name - Resource name (e.g., "architect", "party-mode")
 * @property original - Original input string for debugging
 */
export interface ParsedName {
    module?: string;
    name: string;
    original: string;
}
/**
 * Parse a potentially module-qualified name into its components.
 *
 * Handles two formats:
 * 1. Simple name: "architect"
 * 2. Module-qualified: "bmm/architect"
 *
 * If the input contains a forward slash, it's treated as module-qualified.
 * Only the first slash is considered (e.g., "a/b/c" → module="a", name="b/c")
 *
 * @param input - Name to parse (e.g., "architect" or "bmm/architect")
 * @returns ParsedName object with optional module and required name
 *
 * @example
 * parseQualifiedName("architect")
 * // Returns: { name: "architect", original: "architect" }
 *
 * @example
 * parseQualifiedName("bmm/architect")
 * // Returns: { module: "bmm", name: "architect", original: "bmm/architect" }
 */
export declare function parseQualifiedName(input: string): ParsedName;
/**
 * Find a record by name with optional module filtering.
 *
 * Generic function that works with any record type that has name and moduleName.
 * Applies module filter if specified in ParsedName, then searches by name.
 *
 * This implements the core selection logic:
 * 1. If module specified, filter candidates to that module only
 * 2. Find first match by name
 *
 * Note: This does NOT handle priority sorting - that's done by the query functions.
 *
 * @param records - Array of records to search
 * @param parsed - ParsedName with optional module filter
 * @returns First matching record, or undefined if not found
 *
 * @example
 * const agents = [
 *   { name: "architect", moduleName: "bmm" },
 *   { name: "architect", moduleName: "core" },
 * ];
 * findRecordByName(agents, { name: "architect", module: "bmm" })
 * // Returns: { name: "architect", moduleName: "bmm" }
 */
export declare function findRecordByName<T extends {
    name?: string;
    moduleName: string;
}>(records: T[], parsed: ParsedName): T | undefined;
/**
 * Check if a parsed name has a module qualifier.
 *
 * Convenience function for checking if user provided explicit module.
 *
 * @param parsed - ParsedName to check
 * @returns true if module is specified, false otherwise
 */
export declare function hasModuleQualifier(parsed: ParsedName): boolean;
/**
 * Format a parsed name back to string (for display/logging).
 *
 * @param parsed - ParsedName to format
 * @returns Formatted string (e.g., "bmm/architect" or "architect")
 */
export declare function formatParsedName(parsed: ParsedName): string;
//# sourceMappingURL=name-parser.d.ts.map