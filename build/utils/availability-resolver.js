function defaultPriority() {
    return ['project', 'cli', 'env', 'user', 'package'];
}
function groupKey(rec) {
    // Key by logical identity (kind + name). Fall back to path if name missing
    const name = rec.name ?? rec.moduleRelativePath;
    return `${rec.kind}:${name}`;
}
function selectWinner(candidates, options) {
    if (candidates.length === 0)
        return null;
    const pri = options.originPriority ?? defaultPriority();
    const prefer = options.prefer ?? 'manifest';
    // sort by origin priority then prefer source
    const sorted = [...candidates].sort((a, b) => {
        const ap = pri.indexOf(a.origin.kind);
        const bp = pri.indexOf(b.origin.kind);
        if (ap !== bp)
            return ap - bp;
        if (a.source === b.source)
            return 0;
        return a.source === prefer ? -1 : 1;
    });
    return sorted[0];
}
export function resolveAvailableCatalog(master, options = {}) {
    const scopeFilter = (rec) => {
        if (options.scope === 'active-only') {
            // Support both activeRoots (plural, preferred) and activeRoot (singular, backward compat)
            const roots = options.activeRoots ??
                (options.activeRoot ? [options.activeRoot] : []);
            // If no roots specified, no filtering (show all)
            if (roots.length === 0)
                return true;
            // Filter to only records from the specified active roots
            return roots.includes(rec.origin.root);
        }
        return true; // 'all' scope or no scope - show everything
    };
    const conflicts = [];
    function resolve(records) {
        const filtered = records.filter(scopeFilter);
        const byKey = new Map();
        for (const r of filtered) {
            const key = groupKey(r);
            const list = byKey.get(key) ?? [];
            list.push(r);
            byKey.set(key, list);
        }
        const selected = [];
        for (const [key, list] of byKey) {
            const winner = selectWinner(list, options);
            conflicts.push({ key, selected: winner, candidates: list });
            if (winner)
                selected.push(winner);
        }
        return selected;
    }
    return {
        agents: resolve(master.agents),
        workflows: resolve(master.workflows),
        tasks: resolve(master.tasks),
        conflicts,
    };
}
//# sourceMappingURL=availability-resolver.js.map