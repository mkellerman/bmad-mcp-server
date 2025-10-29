export function checkCaseMismatch(name, candidates) {
    const lower = name.toLowerCase();
    const match = candidates.find((c) => c.toLowerCase() === lower && c !== name);
    return match;
}
export function findClosestMatch(name, candidates) {
    let best;
    for (const c of candidates) {
        const d = levenshtein(name, c);
        if (!best || d < best.d)
            best = { s: c, d };
    }
    return best && best.d <= 3 ? best.s : undefined;
}
function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++)
        dp[i][0] = i;
    for (let j = 0; j <= b.length; j++)
        dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[a.length][b.length];
}
//# sourceMappingURL=fuzzy.js.map