import type {
  MasterManifests,
  MasterRecord,
  BmadOriginSource,
} from '../types/index.js';

export interface ResolveOptions {
  originPriority?: BmadOriginSource[];
  scope?: 'active-only' | 'all';
  prefer?: 'manifest' | 'filesystem';
  activeRoot?: string; // absolute path to the active origin root if using active-only (deprecated, use activeRoots)
  activeRoots?: string[]; // absolute paths to all active origin roots if using active-only
}

export interface ConflictDetail {
  key: string;
  selected: MasterRecord | null;
  candidates: MasterRecord[];
}

export interface AvailableCatalog {
  agents: MasterRecord[];
  workflows: MasterRecord[];
  tasks: MasterRecord[];
  conflicts: ConflictDetail[];
}

function defaultPriority(): BmadOriginSource[] {
  return ['project', 'cli', 'env', 'user', 'package'];
}

function groupKey(rec: MasterRecord): string {
  // Key by logical identity (kind + name). Fall back to path if name missing
  const name = rec.name ?? rec.moduleRelativePath;
  return `${rec.kind}:${name}`;
}

function selectWinner(
  candidates: MasterRecord[],
  options: ResolveOptions,
): MasterRecord | null {
  if (candidates.length === 0) return null;
  const pri = options.originPriority ?? defaultPriority();
  const prefer = options.prefer ?? 'manifest';

  // sort by origin priority then prefer source
  const sorted = [...candidates].sort((a, b) => {
    const ap = pri.indexOf(a.origin.kind);
    const bp = pri.indexOf(b.origin.kind);
    if (ap !== bp) return ap - bp;
    if (a.source === b.source) return 0;
    return a.source === prefer ? -1 : 1;
  });
  return sorted[0];
}

export function resolveAvailableCatalog(
  master: MasterManifests,
  options: ResolveOptions = {},
): AvailableCatalog {
  const scopeFilter = (rec: MasterRecord) => {
    if (options.scope === 'active-only') {
      // Support both activeRoots (plural, preferred) and activeRoot (singular, backward compat)
      const roots =
        options.activeRoots ?? (options.activeRoot ? [options.activeRoot] : []);

      // If no roots specified, no filtering (show all)
      if (roots.length === 0) return true;

      // Filter to only records from the specified active roots
      return roots.includes(rec.origin.root);
    }
    return true; // 'all' scope or no scope - show everything
  };

  const conflicts: ConflictDetail[] = [];

  function resolve(records: MasterRecord[]): MasterRecord[] {
    const filtered = records.filter(scopeFilter);
    const byKey = new Map<string, MasterRecord[]>();
    for (const r of filtered) {
      const key = groupKey(r);
      const list = byKey.get(key) ?? [];
      list.push(r);
      byKey.set(key, list);
    }
    const selected: MasterRecord[] = [];
    for (const [key, list] of byKey) {
      const winner = selectWinner(list, options);
      conflicts.push({ key, selected: winner, candidates: list });
      if (winner) selected.push(winner);
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
