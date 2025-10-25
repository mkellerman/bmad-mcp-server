import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * Test case expectation types
 */
export interface Expectation {
  type: 'contains' | 'not_contains' | 'regex' | 'response_length' | 'response_time' | 'llm_judge';
  value?: string;
  pattern?: string;
  min?: number;
  max?: number;
  criteria?: string;
  threshold?: number;
  description?: string;
  case_sensitive?: boolean;
}

/**
 * Individual test case definition
 */
export interface TestCase {
  id: string;
  name: string;
  prompt: string;
  mcp_tool?: string;
  mcp_args?: Record<string, any>;
  expected_tool_call?: {
    name: string;
    arguments: Record<string, any>;
  };
  expectations: Expectation[];
}

/**
 * Test suite configuration
 */
export interface TestSuiteConfig {
  llm_model: string;
  temperature?: number;
  timeout?: number;
  judge_model?: string;
  judge_threshold?: number;
}

/**
 * Complete test suite loaded from YAML
 */
export interface TestSuite {
  name: string;
  description: string;
  config: TestSuiteConfig;
  tests: TestCase[];
  filePath: string;
}

/**
 * YAML Test Loader
 * Loads and parses test case YAML files
 */
export class YAMLTestLoader {
  /**
   * Load a single YAML test file
   */
  static loadTestFile(filePath: string): TestSuite {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(content) as any;

    return {
      name: data.test_suite,
      description: data.description,
      config: {
        llm_model: data.config?.llm_model || 'gpt-4.1',
        temperature: data.config?.temperature ?? 0.1,
        timeout: data.config?.timeout || 30000,
        judge_model: data.config?.judge_model || 'gpt-4.1',
        judge_threshold: data.config?.judge_threshold ?? 0.8,
      },
      tests: data.tests || [],
      filePath,
    };
  }

  /**
   * Load all YAML test files from a directory
   */
  static loadTestDirectory(dirPath: string): TestSuite[] {
    const testSuites: TestSuite[] = [];
    
    if (!fs.existsSync(dirPath)) {
      return testSuites;
    }

    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const filePath = path.join(dirPath, file);
        try {
          const suite = this.loadTestFile(filePath);
          testSuites.push(suite);
        } catch (error) {
          console.error(`Error loading test file ${file}:`, error);
        }
      }
    }

    return testSuites;
  }
}
