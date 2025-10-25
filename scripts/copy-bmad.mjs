#!/usr/bin/env node

// Copy BMAD assets from src to build so they ship with the package.
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const sourceDir = path.resolve(projectRoot, 'src', 'bmad');
const targetDir = path.resolve(projectRoot, 'build', 'bmad');

if (!fs.existsSync(sourceDir)) {
  console.warn(
    `[copy-bmad] Source directory not found at ${sourceDir}. Skipping copy.`,
  );
  process.exit(0);
}

try {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  console.log(
    `[copy-bmad] Copied BMAD assets from ${sourceDir} to ${targetDir}.`,
  );
} catch (error) {
  console.error('[copy-bmad] Failed to copy BMAD assets:', error);
  process.exit(1);
}
