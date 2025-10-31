/**
 * Fuzzy matching and string comparison helpers.
 */
import { FUZZY_MATCH_THRESHOLD } from './constants.js';
/**
 * Calculate similarity ratio between two strings (Levenshtein-based)
 */
export function similarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0)
        return 1.0;
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}
/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(s1, s2) {
    const matrix = [];
    for (let i = 0; i <= s2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= s1.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= s2.length; i++) {
        for (let j = 1; j <= s1.length; j++) {
            if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            }
            else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
    }
    return matrix[s2.length][s1.length];
}
/**
 * Check if a name matches a valid name ignoring case.
 */
export function checkCaseMismatch(name, validNames) {
    const lowercaseName = name.toLowerCase();
    for (const validName of validNames) {
        if (validName.toLowerCase() === lowercaseName && validName !== name) {
            return validName;
        }
    }
    return undefined;
}
/**
 * Find closest matching name using fuzzy matching.
 */
export function findClosestMatch(inputName, validNames, threshold = FUZZY_MATCH_THRESHOLD) {
    let bestMatch = undefined;
    let bestScore = 0.0;
    for (const validName of validNames) {
        const ratio = similarity(inputName.toLowerCase(), validName.toLowerCase());
        if (ratio >= threshold && ratio > bestScore) {
            bestScore = ratio;
            bestMatch = validName;
        }
    }
    return bestMatch;
}
//# sourceMappingURL=fuzzy.js.map