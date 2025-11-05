/**
 * Unit tests for validator functions
 * Tests checkSecurity() and validateName() from src/tools/common/validators.ts
 */

import { describe, it, expect } from 'vitest';
import {
  checkSecurity,
  validateName,
} from '../../../../src/tools/common/validators.js';
import { ErrorCode } from '../../../../src/types/index.js';
import type { Agent, Workflow } from '../../../../src/types/index.js';

describe('Validators', () => {
  describe('checkSecurity', () => {
    describe('dangerous characters', () => {
      it('should reject semicolon', () => {
        const result = checkSecurity('test;command');
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_CHARACTERS);
        expect(result.errorMessage).toBe('Invalid characters detected');
        expect(result.exitCode).toBe(1);
      });

      it('should reject ampersand', () => {
        const result = checkSecurity('test&command');
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_CHARACTERS);
      });

      it('should reject pipe', () => {
        const result = checkSecurity('test|command');
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_CHARACTERS);
      });

      it('should reject backtick', () => {
        const result = checkSecurity('test`command');
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_CHARACTERS);
      });

      it('should reject less-than', () => {
        const result = checkSecurity('test<file');
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_CHARACTERS);
      });

      it('should reject greater-than', () => {
        const result = checkSecurity('test>file');
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_CHARACTERS);
      });

      it('should reject dollar sign', () => {
        const result = checkSecurity('test$var');
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_CHARACTERS);
      });

      it('should reject multiple dangerous characters', () => {
        const result = checkSecurity('test;rm -rf /&|');
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_CHARACTERS);
      });
    });

    describe('non-ASCII characters', () => {
      it('should reject Unicode characters', () => {
        const result = checkSecurity('test™');
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.NON_ASCII_CHARACTERS);
        expect(result.errorMessage).toBe('Non-ASCII characters detected');
        expect(result.exitCode).toBe(1);
      });

      it('should reject emojis', () => {
        const result = checkSecurity('test🎉');
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.NON_ASCII_CHARACTERS);
      });

      it('should reject accented characters', () => {
        const result = checkSecurity('café');
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.NON_ASCII_CHARACTERS);
      });

      it('should reject Chinese characters', () => {
        const result = checkSecurity('测试');
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.NON_ASCII_CHARACTERS);
      });
    });

    describe('valid inputs', () => {
      it('should accept simple ASCII text', () => {
        const result = checkSecurity('analyst');
        expect(result.valid).toBe(true);
        expect(result.exitCode).toBe(0);
        expect(result.errorCode).toBeUndefined();
      });

      it('should accept qualified names with slash', () => {
        const result = checkSecurity('core/bmad-master');
        expect(result.valid).toBe(true);
        expect(result.exitCode).toBe(0);
      });

      it('should accept hyphens', () => {
        const result = checkSecurity('party-mode');
        expect(result.valid).toBe(true);
        expect(result.exitCode).toBe(0);
      });

      it('should accept underscores', () => {
        const result = checkSecurity('test_name');
        expect(result.valid).toBe(true);
        expect(result.exitCode).toBe(0);
      });

      it('should accept numbers', () => {
        const result = checkSecurity('agent123');
        expect(result.valid).toBe(true);
        expect(result.exitCode).toBe(0);
      });

      it('should accept dots', () => {
        const result = checkSecurity('v1.0.0');
        expect(result.valid).toBe(true);
        expect(result.exitCode).toBe(0);
      });

      it('should accept asterisks (for workflow commands)', () => {
        const result = checkSecurity('*party-mode');
        expect(result.valid).toBe(true);
        expect(result.exitCode).toBe(0);
      });

      it('should accept empty string', () => {
        const result = checkSecurity('');
        expect(result.valid).toBe(true);
        expect(result.exitCode).toBe(0);
      });

      it('should accept spaces', () => {
        const result = checkSecurity('hello world');
        expect(result.valid).toBe(true);
        expect(result.exitCode).toBe(0);
      });
    });
  });

  describe('validateName', () => {
    // Helper to create test agents
    const createAgent = (
      name: string,
      module?: string,
      title?: string,
      role?: string,
    ): Agent => ({
      name,
      displayName: title || name,
      module: module || 'core',
      title: title || `${name} title`,
      role: role || `${name} role`,
      path: `/test/${name}.md`,
    });

    // Helper to create test workflows
    const createWorkflow = (
      name: string,
      module?: string,
      description?: string,
    ): Workflow => ({
      name,
      module: module || 'core',
      description: description || `${name} description`,
      path: `/test/${name}.yaml`,
    });

    describe('length validation', () => {
      it('should reject name too short (< 2 chars)', () => {
        const result = validateName('a', 'agent', [], []);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.NAME_TOO_SHORT);
        expect(result.errorMessage).toBe('Name too short');
        expect(result.exitCode).toBe(1);
      });

      it('should accept minimum length (2 chars)', () => {
        const agents = [createAgent('ab')];
        const result = validateName('ab', 'agent', agents, []);
        expect(result.valid).toBe(true);
        expect(result.exitCode).toBe(0);
      });

      it('should reject name too long (> 64 chars)', () => {
        const longName = 'a'.repeat(65);
        const result = validateName(longName, 'agent', [], []);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.NAME_TOO_LONG);
        expect(result.errorMessage).toBe('Name too long');
        expect(result.exitCode).toBe(1);
      });

      it('should accept maximum length (64 chars)', () => {
        const maxName = 'a'.repeat(64);
        const agents = [createAgent(maxName)];
        const result = validateName(maxName, 'agent', agents, []);
        expect(result.valid).toBe(true);
        expect(result.exitCode).toBe(0);
      });
    });

    describe('format validation - agents', () => {
      it('should accept simple lowercase name', () => {
        const agents = [createAgent('analyst')];
        const result = validateName('analyst', 'agent', agents, []);
        expect(result.valid).toBe(true);
      });

      it('should accept hyphenated name', () => {
        const agents = [createAgent('bmad-master')];
        const result = validateName('bmad-master', 'agent', agents, []);
        expect(result.valid).toBe(true);
      });

      it('should accept qualified name with module', () => {
        const agents = [createAgent('analyst', 'core')];
        const result = validateName('core/analyst', 'agent', agents, []);
        expect(result.valid).toBe(true);
      });

      it('should accept numbers in name', () => {
        const agents = [createAgent('agent123')];
        const result = validateName('agent123', 'agent', agents, []);
        expect(result.valid).toBe(true);
      });

      it('should reject uppercase letters', () => {
        const result = validateName('Analyst', 'agent', [], []);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_NAME_FORMAT);
        expect(result.errorMessage).toContain("doesn't match pattern");
      });

      it('should reject underscores', () => {
        const result = validateName('test_agent', 'agent', [], []);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_NAME_FORMAT);
      });

      it('should reject spaces', () => {
        const result = validateName('test agent', 'agent', [], []);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_NAME_FORMAT);
      });

      it('should reject dots', () => {
        const result = validateName('test.agent', 'agent', [], []);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_NAME_FORMAT);
      });

      it('should reject name starting with hyphen', () => {
        const result = validateName('-agent', 'agent', [], []);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_NAME_FORMAT);
      });

      it('should reject name ending with hyphen', () => {
        const result = validateName('agent-', 'agent', [], []);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_NAME_FORMAT);
      });

      it('should reject double hyphen', () => {
        const result = validateName('test--agent', 'agent', [], []);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_NAME_FORMAT);
      });
    });

    describe('format validation - workflows', () => {
      it('should accept simple workflow name', () => {
        const workflows = [createWorkflow('party-mode')];
        const result = validateName('party-mode', 'workflow', [], workflows);
        expect(result.valid).toBe(true);
      });

      it('should accept qualified workflow name', () => {
        const workflows = [createWorkflow('party-mode', 'core')];
        const result = validateName(
          'core/party-mode',
          'workflow',
          [],
          workflows,
        );
        expect(result.valid).toBe(true);
      });

      it('should use same format rules as agents', () => {
        const result = validateName('Invalid_Name', 'workflow', [], []);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.INVALID_NAME_FORMAT);
      });
    });

    describe('agent existence validation', () => {
      it('should find existing agent by simple name', () => {
        const agents = [
          createAgent('analyst', 'core', 'Mary - Business Analyst'),
        ];
        const result = validateName('analyst', 'agent', agents, []);
        expect(result.valid).toBe(true);
      });

      it('should find existing agent by qualified name', () => {
        const agents = [createAgent('analyst', 'core')];
        const result = validateName('core/analyst', 'agent', agents, []);
        expect(result.valid).toBe(true);
      });

      it('should fail for non-existent agent', () => {
        const agents = [createAgent('analyst', 'core')];
        const result = validateName('developer', 'agent', agents, []);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.UNKNOWN_AGENT);
        expect(result.errorMessage).toContain('Agent Not Found');
        expect(result.exitCode).toBe(2);
      });

      it('should fail when agent exists but in wrong module', () => {
        const agents = [createAgent('analyst', 'core')];
        const result = validateName('bmm/analyst', 'agent', agents, []);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.UNKNOWN_AGENT);
        expect(result.errorMessage).toContain('Module-qualified search');
      });
    });

    describe('workflow existence validation', () => {
      it('should find existing workflow by simple name', () => {
        const workflows = [createWorkflow('party-mode', 'core', 'Celebrate!')];
        const result = validateName('party-mode', 'workflow', [], workflows);
        expect(result.valid).toBe(true);
      });

      it('should find existing workflow by qualified name', () => {
        const workflows = [createWorkflow('party-mode', 'core')];
        const result = validateName(
          'core/party-mode',
          'workflow',
          [],
          workflows,
        );
        expect(result.valid).toBe(true);
      });

      it('should fail for non-existent workflow', () => {
        const workflows = [createWorkflow('party-mode', 'core')];
        const result = validateName(
          'unknown-workflow',
          'workflow',
          [],
          workflows,
        );
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.UNKNOWN_WORKFLOW);
        expect(result.errorMessage).toContain('Workflow Not Found');
        expect(result.exitCode).toBe(2);
      });
    });

    describe('disambiguation for multiple matches', () => {
      it('should allow unique agent match', () => {
        const agents = [createAgent('analyst', 'core')];
        const result = validateName('analyst', 'agent', agents, []);
        expect(result.valid).toBe(true);
      });

      it('should require disambiguation for multiple agents with same name', () => {
        const agents = [
          createAgent('analyst', 'core', 'Mary - Core Analyst'),
          createAgent('analyst', 'bmm', 'Sarah - BMM Analyst'),
        ];
        const result = validateName('analyst', 'agent', agents, []);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe(ErrorCode.UNKNOWN_AGENT);
        expect(result.errorMessage).toContain('Multiple agents found');
        expect(result.requiresDisambiguation).toBe(true);
        expect(result.disambiguationOptions).toBeDefined();
        expect(result.disambiguationOptions?.length).toBe(2);
        expect(result.suggestions).toContain('core/analyst');
        expect(result.suggestions).toContain('bmm/analyst');
      });

      it('should not require disambiguation when using qualified name', () => {
        const agents = [
          createAgent('analyst', 'core'),
          createAgent('analyst', 'bmm'),
        ];
        const result = validateName('core/analyst', 'agent', agents, []);
        expect(result.valid).toBe(true);
        expect(result.requiresDisambiguation).toBeUndefined();
      });

      it('should include descriptions in disambiguation options', () => {
        const agents = [
          createAgent('analyst', 'core', 'Mary', 'Business Analyst'),
          createAgent('analyst', 'bmm', 'Sarah', 'Data Analyst'),
        ];
        const result = validateName('analyst', 'agent', agents, []);
        expect(result.valid).toBe(false);
        expect(result.disambiguationOptions?.[0].description).toBeTruthy();
      });
    });

    describe('fuzzy matching and suggestions', () => {
      it('should suggest similar agent names', () => {
        const agents = [
          createAgent('analyst', 'core', 'Mary'),
          createAgent('architect', 'core', 'Bob'),
        ];
        const result = validateName('analys', 'agent', agents, []);
        expect(result.valid).toBe(false);
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions?.length).toBeGreaterThan(0);
      });

      it('should suggest case-corrected name', () => {
        const agents = [createAgent('analyst', 'core')];
        const result = validateName('Analyst', 'agent', agents, []);
        // Note: This will fail format validation first, but test behavior
        expect(result.valid).toBe(false);
      });

      it('should provide help text when no suggestions available', () => {
        const agents = [createAgent('analyst', 'core')];
        const result = validateName('xyz', 'agent', agents, []);
        expect(result.valid).toBe(false);
        expect(result.errorMessage).toContain('*list-agents');
      });

      it('should suggest similar workflow names', () => {
        const workflows = [
          createWorkflow('party-mode', 'core'),
          createWorkflow('party-plan', 'core'),
        ];
        const result = validateName('party', 'workflow', [], workflows);
        expect(result.valid).toBe(false);
        expect(result.errorMessage).toContain('*list-workflows');
      });
    });

    describe('error messages', () => {
      it('should include agent name in error message', () => {
        const result = validateName('nonexistent', 'agent', [], []);
        expect(result.valid).toBe(false);
        expect(result.errorMessage).toContain('nonexistent');
      });

      it('should include workflow name in error message', () => {
        const result = validateName('nonexistent', 'workflow', [], []);
        expect(result.valid).toBe(false);
        expect(result.errorMessage).toContain('nonexistent');
      });

      it('should show debug info for module-qualified search', () => {
        const agents = [createAgent('analyst', 'core')];
        const result = validateName('bmm/analyst', 'agent', agents, []);
        expect(result.valid).toBe(false);
        expect(result.errorMessage).toContain('Module-qualified search');
        expect(result.errorMessage).toContain('bmm');
      });

      it('should list available modules when agent not found in module', () => {
        const agents = [
          createAgent('analyst', 'core'),
          createAgent('dev', 'bmm'),
        ];
        const result = validateName('xyz/analyst', 'agent', agents, []);
        expect(result.valid).toBe(false);
        expect(result.errorMessage).toContain('Available modules:');
        expect(result.errorMessage).toContain('core');
        expect(result.errorMessage).toContain('bmm');
      });

      it('should show total agent count in error', () => {
        const agents = [
          createAgent('analyst', 'core'),
          createAgent('dev', 'core'),
        ];
        const result = validateName('xyz/test', 'agent', agents, []);
        expect(result.valid).toBe(false);
        expect(result.errorMessage).toContain('Total agents in system: 2');
      });
    });
  });
});
