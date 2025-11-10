import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: [
      'build/**',
      'coverage/**',
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      '**/*.d.ts',
      'tests/support/fixtures/**',
      'tests/fixtures/**',
      '.bmad/**',
      '_deprecated/**',
    ],
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },
  {
    files: ['src/**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['error', 'warn'] }],
    },
  },
  {
    files: ['tests/**/*.ts', 'playwright.config.ts', 'vitest.config.ts'],
    extends: [js.configs.recommended],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',

      // ============================================================================
      // TESTING CODING RULES
      // ============================================================================
      // These rules enforce our testing standards documented in tests/README.md
      //
      // Key Requirements:
      // 1. DO NOT use LiteLLM (use Copilot Proxy instead)
      // 2. Mark tests as E2E if copilot-proxy is used
      // 3. Mark tests as LLM-eval if LLM Judge is used (*.eval.test.ts)
      // 4. Document test intent and expected steps/results in comments
      // ============================================================================

      // Prevent focused tests from being committed
      // Focused tests (it.only, describe.only) will cause CI to only run those tests
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='it'][callee.property.name='only']",
          message:
            'it.only() is not allowed - remove .only() before committing',
        },
        {
          selector:
            "CallExpression[callee.object.name='describe'][callee.property.name='only']",
          message:
            'describe.only() is not allowed - remove .only() before committing',
        },
        {
          selector:
            "CallExpression[callee.object.name='test'][callee.property.name='only']",
          message:
            'test.only() is not allowed - remove .only() before committing',
        },
      ],

      // Warn on skipped tests (allows temporary skip but flags for review)
      'no-restricted-properties': [
        'warn',
        {
          object: 'it',
          property: 'skip',
          message:
            'Skipped test detected - ensure this is intentional and documented',
        },
        {
          object: 'describe',
          property: 'skip',
          message:
            'Skipped test suite detected - ensure this is intentional and documented',
        },
      ],

      // Enforce proper async/await usage in tests
      'no-return-await': 'off', // Allow for clarity in tests
    },
  },
  {
    files: ['scripts/**/*.{js,mjs}', 'test-*.mjs'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Temporarily relax type checking for files with complex any usage
    // TODO: Properly type these files in future refactoring
    files: [
      'src/tools/internal/list.ts',
      'src/tools/common/fuzzy.ts',
      'src/utils/bmad-source-detector.ts',
      'src/utils/logger.ts',
      'src/utils/v6-module-inventory.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
