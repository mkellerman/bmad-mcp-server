/**
 * Dependency audit tests
 *
 * Validates that source code only imports from declared dependencies.
 * Prevents runtime errors from missing packages during fresh installation.
 */

import { describe, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe('dependency-audit', () => {
  it('should only import from declared dependencies', () => {
    // Load package.json to get declared dependencies
    const packagePath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    const declaredDeps = new Set([
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.devDependencies || {}),
    ]);

    // Node.js built-in modules (don't need to be in package.json)
    const builtinModules = new Set([
      'node:fs',
      'node:path',
      'node:os',
      'node:crypto',
      'node:process',
      'node:util',
      'node:url',
      'node:child_process',
      'fs',
      'path',
      'os',
      'crypto',
      'process',
      'util',
      'url',
      'child_process',
    ]);

    // Recursively find all TypeScript source files
    const findTsFiles = (dir: string): string[] => {
      const files: string[] = [];
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...findTsFiles(fullPath));
        } else if (
          entry.isFile() &&
          entry.name.endsWith('.ts') &&
          !entry.name.endsWith('.d.ts') &&
          !entry.name.endsWith('.test.ts')
        ) {
          files.push(fullPath);
        }
      }

      return files;
    };

    const sourceFiles = findTsFiles(join(process.cwd(), 'src'));

    const violations: string[] = [];

    // Check each file for imports
    for (const filePath of sourceFiles) {
      const content = readFileSync(filePath, 'utf-8');

      // Match both: import ... from 'package' and import('package')
      const importRegex = /(?:from|import\()\s+['"]([^'"./][^'"]*)['"]/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const importedPackage = match[1];

        // Extract base package name (handle scoped packages)
        const basePackage = importedPackage.startsWith('@')
          ? importedPackage.split('/').slice(0, 2).join('/')
          : importedPackage.split('/')[0];

        // Skip if it's a builtin module or declared dependency
        if (builtinModules.has(basePackage) || declaredDeps.has(basePackage)) {
          continue;
        }

        violations.push(
          `${filePath}: imports '${importedPackage}' which is not in package.json`,
        );
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} undeclared dependency imports:\n  ${violations.join('\n  ')}`,
      );
    }
  });

  it('should use js-yaml consistently (not yaml package)', () => {
    // Recursively find all TypeScript source files
    const findTsFiles = (dir: string): string[] => {
      const files: string[] = [];
      const entries = readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...findTsFiles(fullPath));
        } else if (
          entry.isFile() &&
          entry.name.endsWith('.ts') &&
          !entry.name.endsWith('.d.ts') &&
          !entry.name.endsWith('.test.ts')
        ) {
          files.push(fullPath);
        }
      }

      return files;
    };

    const sourceFiles = findTsFiles(join(process.cwd(), 'src'));

    const violations: string[] = [];

    for (const filePath of sourceFiles) {
      const content = readFileSync(filePath, 'utf-8');

      // Check for imports from 'yaml' package (we use 'js-yaml')
      if (
        /from\s+['"]yaml['"]/.test(content) ||
        /import\(['"]yaml['"]\)/.test(content)
      ) {
        violations.push(
          `${filePath}: imports from 'yaml' instead of 'js-yaml'`,
        );
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `Found ${violations.length} incorrect yaml package imports:\n  ${violations.join('\n  ')}\n\nUse 'js-yaml' instead of 'yaml'`,
      );
    }
  });
});
