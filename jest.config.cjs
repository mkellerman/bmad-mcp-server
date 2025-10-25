module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/coverage/',
    '/tests/unit/server.test.ts', // Skipped due to import.meta.url compatibility
    '/tests/integration/bmad-integration.test.ts', // Skipped due to import.meta.url compatibility
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/tests/',
    '/coverage/',
    '/src/server.ts', // Excluded due to import.meta.url compatibility issues with jest
  ],
  testMatch: ['**/tests/**/*.test.ts'],
  verbose: true,
};
