/**
 * XML Validator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateXML,
  extractTagContent,
  extractAllTags,
  hasValidXMLStructure,
  stripXMLTags,
  assertValidXML,
} from '../framework/helpers/xml-validator.js';

describe('XML Validator', () => {
  describe('validateXML', () => {
    it('should validate correct XML structure', () => {
      const response =
        '<instructions>Do this task</instructions><content>Here is the result</content>';
      const validation = validateXML(response);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.tags).toHaveLength(2);
      expect(validation.instructionLeakage).toBe(false);
    });

    it('should detect missing tags', () => {
      const response = '<instructions>Only instructions</instructions>';
      const validation = validateXML(response);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('content: Tag <content> not found');
    });

    it('should detect unclosed tags', () => {
      const response = '<instructions>Do this<content>Result</content>';
      const validation = validateXML(response);

      expect(validation.valid).toBe(false);
      expect(
        validation.errors.some((e) => e.includes('not properly closed')),
      ).toBe(true);
    });

    it('should detect empty tags when required', () => {
      const response = '<instructions></instructions><content>Result</content>';
      const validation = validateXML(response, ['instructions', 'content'], {
        requireContent: true,
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('is empty'))).toBe(true);
    });

    it('should handle multiline content', () => {
      const response = `<instructions>
        Step 1: Do this
        Step 2: Do that
      </instructions>
      <content>
        Result line 1
        Result line 2
      </content>`;

      const validation = validateXML(response);

      expect(validation.valid).toBe(true);
      expect(validation.tags[0].content).toContain('Step 1');
      expect(validation.tags[1].content).toContain('Result line 1');
    });
  });

  describe('checkInstructionLeakage', () => {
    it('should detect instruction markers in content', () => {
      const response = `<instructions>Do the task</instructions><content>**INSTRUCTIONS:** Follow these steps</content>`;
      const validation = validateXML(response);

      expect(validation.instructionLeakage).toBe(true);
      expect(validation.errors.some((e) => e.includes('leakage'))).toBe(true);
    });

    it('should not flag normal content', () => {
      const response = `<instructions>Do the task</instructions><content>Here is your answer: 42</content>`;
      const validation = validateXML(response);

      expect(validation.instructionLeakage).toBe(false);
    });
  });

  describe('extractTagContent', () => {
    it('should extract content from a tag', () => {
      const response =
        '<instructions>Test instructions</instructions><content>Test content</content>';

      const instructions = extractTagContent(response, 'instructions');
      const content = extractTagContent(response, 'content');

      expect(instructions).toBe('Test instructions');
      expect(content).toBe('Test content');
    });

    it('should return undefined for missing tags', () => {
      const response = '<instructions>Only this</instructions>';
      const content = extractTagContent(response, 'content');

      expect(content).toBeUndefined();
    });

    it('should handle nested content', () => {
      const response =
        '<instructions>Do this</instructions><content>Some <b>bold</b> text</content>';
      const content = extractTagContent(response, 'content');

      expect(content).toBe('Some <b>bold</b> text');
    });
  });

  describe('extractAllTags', () => {
    it('should extract all specified tags', () => {
      const response =
        '<instructions>Do this</instructions><content>Result</content><context>Context info</context>';

      const tags = extractAllTags(response, [
        'instructions',
        'content',
        'context',
      ]);

      expect(tags.instructions).toBe('Do this');
      expect(tags.content).toBe('Result');
      expect(tags.context).toBe('Context info');
    });

    it('should return undefined for missing tags', () => {
      const response = '<instructions>Only this</instructions>';

      const tags = extractAllTags(response, ['instructions', 'content']);

      expect(tags.instructions).toBe('Only this');
      expect(tags.content).toBeUndefined();
    });
  });

  describe('hasValidXMLStructure', () => {
    it('should return true for valid structure', () => {
      const response =
        '<instructions>Do this</instructions><content>Result</content>';
      expect(hasValidXMLStructure(response)).toBe(true);
    });

    it('should return false for missing tags', () => {
      const response = '<instructions>Only this</instructions>';
      expect(hasValidXMLStructure(response)).toBe(false);
    });

    it('should return false for incorrect tag order', () => {
      const response = '</instructions><instructions>Backwards</instructions>';
      expect(hasValidXMLStructure(response, ['instructions'])).toBe(false);
    });
  });

  describe('stripXMLTags', () => {
    it('should remove all XML tags', () => {
      const response =
        '<instructions>Do this</instructions><content>Result</content>';
      const stripped = stripXMLTags(response);

      expect(stripped).toBe('Do thisResult');
      expect(stripped).not.toContain('<');
      expect(stripped).not.toContain('>');
    });

    it('should handle nested tags', () => {
      const response = '<content>Some <b>bold</b> text</content>';
      const stripped = stripXMLTags(response);

      expect(stripped).toBe('Some bold text');
    });
  });

  describe('assertValidXML', () => {
    it('should not throw for valid XML', () => {
      const response =
        '<instructions>Do this</instructions><content>Result</content>';

      expect(() => assertValidXML(response)).not.toThrow();
    });

    it('should throw for invalid XML', () => {
      const response = '<instructions>Only this</instructions>';

      expect(() => assertValidXML(response)).toThrow('XML validation failed');
    });

    it('should return validation result when valid', () => {
      const response =
        '<instructions>Do this</instructions><content>Result</content>';
      const validation = assertValidXML(response);

      expect(validation.valid).toBe(true);
      expect(validation.tags).toHaveLength(2);
    });
  });
});
