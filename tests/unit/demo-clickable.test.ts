/**
 * Demo test to show clickable test details in HTML report
 * This test intentionally has passing and failing cases to demonstrate
 * the expandable error details functionality.
 */

import { describe, it, expect } from 'vitest';

describe('Demo Clickable Test Details', () => {
  it('should pass - no details to show', () => {
    expect(1 + 1).toBe(2);
  });

  it('should fail - shows error details when clicked', () => {
    const actual = { foo: 'bar', count: 42 };
    const expected = { foo: 'baz', count: 100 };

    expect(actual).toEqual(expected);
  });

  it('should pass with complex data', () => {
    const data = {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      total: 2,
    };

    expect(data.users).toHaveLength(2);
    expect(data.total).toBe(2);
  });

  it('should fail - array mismatch shows in details', () => {
    const actual = [1, 2, 3, 4];
    const expected = [1, 2, 5, 6];

    expect(actual).toEqual(expected);
  });

  it('should show console output in details', () => {
    console.log('User input: Calculate sum of 5 + 3');
    const result = 5 + 3;
    console.log(`Tool: calculator(5, 3) = ${result}`);
    console.log('Response: The answer is 8');

    expect(result).toBe(8);
  });

  it('should show various console types', () => {
    console.log('This is a log message');
    console.info('This is an info message');
    console.warn('This is a warning message');
    console.error('This is an error message (test still passes!)');

    expect(true).toBe(true);
  });
});
