#!/usr/bin/env node
// Guard to prevent committed JS files under src/
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

function listJsFiles(dir) {
  const results = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...listJsFiles(full));
    } else if (full.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

const root = path.resolve(process.cwd(), 'src');
let files = [];
try {
  files = listJsFiles(root);
} catch {
  // If src doesn't exist, nothing to check
  process.exit(0);
}

if (files.length > 0) {
  console.error(
    'Error: JavaScript files found under src/ (TypeScript sources only)',
  );
  for (const f of files) console.error(` - ${path.relative(process.cwd(), f)}`);
  console.error('\nRemove these files or move generated output to build/.');
  process.exit(1);
}
process.exit(0);
