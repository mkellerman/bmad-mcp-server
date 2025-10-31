/**
 * Fuzzy matching and string comparison helpers.
 */
/**
 * Calculate similarity ratio between two strings (Levenshtein-based)
 */
export declare function similarity(s1: string, s2: string): number;
/**
 * Calculate Levenshtein distance between two strings
 */
export declare function levenshteinDistance(s1: string, s2: string): number;
/**
 * Check if a name matches a valid name ignoring case.
 */
export declare function checkCaseMismatch(name: string, validNames: string[]): string | undefined;
/**
 * Find closest matching name using fuzzy matching.
 */
export declare function findClosestMatch(inputName: string, validNames: string[], threshold?: number): string | undefined;
//# sourceMappingURL=fuzzy.d.ts.map