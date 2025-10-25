/**
 * Unit tests for Validators
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ContainsValidator,
  NotContainsValidator,
  RegexValidator,
  ResponseLengthValidator,
} from '../e2e/framework/validators';

describe('Validators', () => {
  describe('ContainsValidator', () => {
    let validator: ContainsValidator;

    beforeEach(() => {
      validator = new ContainsValidator();
    });

    it('should pass when text is found (case insensitive)', async () => {
      const result = await validator.validate('Hello World', {
        type: 'contains',
        value: 'hello',
      });

      expect(result.pass).toBe(true);
      expect(result.message).toContain('contains');
    });

    it('should fail when text is not found', async () => {
      const result = await validator.validate('Hello World', {
        type: 'contains',
        value: 'goodbye',
      });

      expect(result.pass).toBe(false);
      expect(result.message).toContain('does not contain');
    });

    it('should respect case sensitivity when specified', async () => {
      const result = await validator.validate('Hello World', {
        type: 'contains',
        value: 'hello',
        case_sensitive: true,
      });

      expect(result.pass).toBe(false); // 'hello' !== 'Hello'
    });

    it('should handle empty strings', async () => {
      const result = await validator.validate('', {
        type: 'contains',
        value: 'text',
      });

      expect(result.pass).toBe(false);
    });
  });

  describe('NotContainsValidator', () => {
    let validator: NotContainsValidator;

    beforeEach(() => {
      validator = new NotContainsValidator();
    });

    it('should pass when text is NOT found', async () => {
      const result = await validator.validate('Hello World', {
        type: 'not_contains',
        value: 'goodbye',
      });

      expect(result.pass).toBe(true);
      expect(result.message).toContain('does not contain');
    });

    it('should fail when text IS found', async () => {
      const result = await validator.validate('Hello World', {
        type: 'not_contains',
        value: 'Hello',
      });

      expect(result.pass).toBe(false);
      expect(result.message).toContain('should not contain');
    });

    it('should be case insensitive by default', async () => {
      const result = await validator.validate('Error occurred', {
        type: 'not_contains',
        value: 'error',
      });

      expect(result.pass).toBe(false);
    });
  });

  describe('RegexValidator', () => {
    let validator: RegexValidator;

    beforeEach(() => {
      validator = new RegexValidator();
    });

    it('should pass when pattern matches', async () => {
      const result = await validator.validate('Email: test@example.com', {
        type: 'regex',
        pattern: '\\w+@\\w+\\.\\w+',
      });

      expect(result.pass).toBe(true);
      expect(result.message).toContain('matches pattern');
    });

    it('should fail when pattern does not match', async () => {
      const result = await validator.validate('No email here', {
        type: 'regex',
        pattern: '\\w+@\\w+\\.\\w+',
      });

      expect(result.pass).toBe(false);
      expect(result.message).toContain('does not match');
    });

    it('should handle complex patterns', async () => {
      const result = await validator.validate('*framework workflow', {
        type: 'regex',
        pattern: '\\*\\w+',
      });

      expect(result.pass).toBe(true);
    });

    it('should be case insensitive', async () => {
      const result = await validator.validate('HELLO', {
        type: 'regex',
        pattern: 'hello',
      });

      expect(result.pass).toBe(true);
    });
  });

  describe('ResponseLengthValidator', () => {
    let validator: ResponseLengthValidator;

    beforeEach(() => {
      validator = new ResponseLengthValidator();
    });

    it('should pass when length is within range', async () => {
      const response = 'A'.repeat(500);
      const result = await validator.validate(response, {
        type: 'response_length',
        min: 100,
        max: 1000,
      });

      expect(result.pass).toBe(true);
      expect(result.message).toContain('within range');
      expect(result.details?.length).toBe(500);
    });

    it('should fail when length is below minimum', async () => {
      const response = 'Short';
      const result = await validator.validate(response, {
        type: 'response_length',
        min: 100,
        max: 1000,
      });

      expect(result.pass).toBe(false);
      expect(result.message).toContain('outside range');
    });

    it('should fail when length is above maximum', async () => {
      const response = 'A'.repeat(2000);
      const result = await validator.validate(response, {
        type: 'response_length',
        min: 100,
        max: 1000,
      });

      expect(result.pass).toBe(false);
      expect(result.details?.length).toBe(2000);
    });

    it('should use default min of 0', async () => {
      const response = 'Test';
      const result = await validator.validate(response, {
        type: 'response_length',
        max: 1000,
      });

      expect(result.pass).toBe(true);
    });

    it('should use default max of Infinity', async () => {
      const response = 'A'.repeat(10000);
      const result = await validator.validate(response, {
        type: 'response_length',
        min: 100,
      });

      expect(result.pass).toBe(true);
    });

    it('should handle exact boundary values', async () => {
      const response = 'A'.repeat(100);
      const result = await validator.validate(response, {
        type: 'response_length',
        min: 100,
        max: 100,
      });

      expect(result.pass).toBe(true);
    });
  });
});
