/**
 * Unit tests for YAML Test Loader
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { YAMLTestLoader } from '../e2e/framework/yaml-loader';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('YAMLTestLoader', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temp directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yaml-loader-test-'));
  });

  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadTestFile', () => {
    it('should load valid YAML test file', () => {
      const yamlContent = `
test_suite: "Sample Tests"
description: "Test description"
config:
  llm_model: "gpt-4"
  temperature: 0.1
  timeout: 30000
tests:
  - id: "test-001"
    name: "Sample test"
    prompt: "Test prompt"
    expectations:
      - type: "contains"
        value: "hello"
`;
      const filePath = path.join(tempDir, 'test.yaml');
      fs.writeFileSync(filePath, yamlContent);

      const suite = YAMLTestLoader.loadTestFile(filePath);

      expect(suite.name).toBe('Sample Tests');
      expect(suite.description).toBe('Test description');
      expect(suite.config.llm_model).toBe('gpt-4');
      expect(suite.config.temperature).toBe(0.1);
      expect(suite.tests).toHaveLength(1);
      expect(suite.tests[0].id).toBe('test-001');
      expect(suite.tests[0].name).toBe('Sample test');
      expect(suite.tests[0].expectations).toHaveLength(1);
    });

    it('should use default config values when not specified', () => {
      const yamlContent = `
test_suite: "Minimal Test"
description: "Minimal config"
tests: []
`;
      const filePath = path.join(tempDir, 'minimal.yaml');
      fs.writeFileSync(filePath, yamlContent);

      const suite = YAMLTestLoader.loadTestFile(filePath);

      expect(suite.config.llm_model).toBe('gpt-4.1');
      expect(suite.config.temperature).toBe(0.1);
      expect(suite.config.timeout).toBe(30000);
      expect(suite.config.judge_model).toBe('gpt-4.1');
      expect(suite.config.judge_threshold).toBe(0.8);
    });

    it('should load multiple expectations', () => {
      const yamlContent = `
test_suite: "Multi Expectation Test"
description: "Multiple validators"
tests:
  - id: "test-001"
    name: "Test"
    prompt: "Prompt"
    expectations:
      - type: "contains"
        value: "text1"
      - type: "response_length"
        min: 100
        max: 1000
      - type: "llm_judge"
        criteria: "Quality check"
        threshold: 0.85
`;
      const filePath = path.join(tempDir, 'multi.yaml');
      fs.writeFileSync(filePath, yamlContent);

      const suite = YAMLTestLoader.loadTestFile(filePath);

      expect(suite.tests[0].expectations).toHaveLength(3);
      expect(suite.tests[0].expectations[0].type).toBe('contains');
      expect(suite.tests[0].expectations[1].type).toBe('response_length');
      expect(suite.tests[0].expectations[2].type).toBe('llm_judge');
    });
  });

  describe('loadTestDirectory', () => {
    it('should load all YAML files from directory', () => {
      // Create multiple YAML files
      const yaml1 = `
test_suite: "Suite 1"
description: "First suite"
tests: []
`;
      const yaml2 = `
test_suite: "Suite 2"
description: "Second suite"
tests: []
`;
      fs.writeFileSync(path.join(tempDir, 'test1.yaml'), yaml1);
      fs.writeFileSync(path.join(tempDir, 'test2.yml'), yaml2);
      fs.writeFileSync(path.join(tempDir, 'not-yaml.txt'), 'ignored');

      const suites = YAMLTestLoader.loadTestDirectory(tempDir);

      expect(suites).toHaveLength(2);
      expect(suites.map((s: any) => s.name)).toContain('Suite 1');
      expect(suites.map((s: any) => s.name)).toContain('Suite 2');
    });

    it('should return empty array for non-existent directory', () => {
      const nonExistentDir = path.join(tempDir, 'does-not-exist');
      const suites = YAMLTestLoader.loadTestDirectory(nonExistentDir);

      expect(suites).toHaveLength(0);
    });

    it('should handle directory with no YAML files', () => {
      fs.writeFileSync(path.join(tempDir, 'file.txt'), 'not yaml');

      const suites = YAMLTestLoader.loadTestDirectory(tempDir);

      expect(suites).toHaveLength(0);
    });

    it('should skip invalid YAML files and continue', () => {
      const validYaml = `
test_suite: "Valid Suite"
description: "Valid"
tests: []
`;
      const invalidYaml = `
invalid: yaml: content: [[[
`;
      fs.writeFileSync(path.join(tempDir, 'valid.yaml'), validYaml);
      fs.writeFileSync(path.join(tempDir, 'invalid.yaml'), invalidYaml);

      const suites = YAMLTestLoader.loadTestDirectory(tempDir);

      // Should load only the valid file
      expect(suites).toHaveLength(1);
      expect(suites[0].name).toBe('Valid Suite');
    });
  });
});
