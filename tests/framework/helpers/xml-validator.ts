/**
 * XML Validation Helper
 *
 * Validates XML structure in LLM responses to ensure proper separation
 * of instructions and content as per OpenAI/Anthropic best practices.
 *
 * Usage:
 * ```ts
 * import { validateXML, checkInstructionLeakage } from './xml-validator.js';
 *
 * const response = '<instructions>Do this</instructions><content>Output</content>';
 * const validation = validateXML(response, ['instructions', 'content']);
 *
 * if (!validation.valid) {
 *   console.error('XML validation failed:', validation.errors);
 * }
 * ```
 */

import type { XMLValidation, XMLTagValidation } from '../core/types.js';

/**
 * Validate XML structure in a response string
 *
 * @param response - The response text to validate
 * @param expectedTags - Array of expected tag names (e.g., ['instructions', 'content'])
 * @param options - Validation options
 * @returns XMLValidation result
 */
export function validateXML(
  response: string,
  expectedTags: string[] = ['instructions', 'content'],
  options: {
    checkLeakage?: boolean;
    requireContent?: boolean;
  } = {},
): XMLValidation {
  const { checkLeakage = true, requireContent = true } = options;
  const timestamp = new Date().toISOString();
  const tags: XMLTagValidation[] = [];
  const errors: string[] = [];

  // Validate each expected tag
  for (const tagName of expectedTags) {
    const tagValidation = validateTag(response, tagName, requireContent);
    tags.push(tagValidation);

    // Collect errors
    if (tagValidation.errors.length > 0) {
      errors.push(...tagValidation.errors.map((err) => `${tagName}: ${err}`));
    }
  }

  // Check for instruction leakage
  let instructionLeakage = false;
  if (checkLeakage) {
    instructionLeakage = checkInstructionLeakage(response, tags);
    if (instructionLeakage) {
      errors.push(
        'Instruction leakage detected: instructions appear in content',
      );
    }
  }

  // Overall validation status
  const valid = errors.length === 0;

  return {
    valid,
    tags,
    errors,
    instructionLeakage,
    rawResponse: response,
    timestamp,
  };
}

/**
 * Validate a single XML tag
 */
function validateTag(
  response: string,
  tagName: string,
  requireContent: boolean,
): XMLTagValidation {
  const errors: string[] = [];

  // Check if tag exists
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  const found = response.includes(openTag);

  if (!found) {
    errors.push(`Tag <${tagName}> not found`);
    return {
      tag: tagName,
      found: false,
      closed: false,
      hasContent: false,
      errors,
    };
  }

  // Check if tag is properly closed
  const closed = response.includes(closeTag);
  if (!closed) {
    errors.push(`Tag <${tagName}> is not properly closed`);
  }

  // Extract content between tags
  let content: string | undefined;
  let hasContent = false;

  if (found && closed) {
    const regex = new RegExp(
      `<${tagName}>(.*?)</${tagName}>`,
      's', // dotall flag to match newlines
    );
    const match = response.match(regex);

    if (match && match[1] !== undefined) {
      content = match[1].trim();
      hasContent = content.length > 0;

      if (requireContent && !hasContent) {
        errors.push(`Tag <${tagName}> is empty`);
      }
    }
  }

  return {
    tag: tagName,
    found,
    closed,
    hasContent,
    content,
    errors,
  };
}

/**
 * Check if instructions leaked into content
 *
 * This looks for instruction-like text in the content section that should
 * only appear in the instructions section.
 */
export function checkInstructionLeakage(
  response: string,
  tags: XMLTagValidation[],
): boolean {
  // Find content tag
  const contentTag = tags.find(
    (t) => t.tag === 'content' && t.found && t.content,
  );
  const instructionsTag = tags.find(
    (t) => t.tag === 'instructions' && t.found && t.content,
  );

  if (!contentTag?.content || !instructionsTag?.content) {
    return false; // Can't check if tags don't exist
  }

  // Instruction markers that shouldn't appear in content
  const instructionMarkers = [
    '**INSTRUCTIONS:**',
    '**Instructions:**',
    'IMPORTANT:',
    'You must',
    'You should',
    'Do not',
    "Don't",
    'Never',
    'Always',
    'Remember to',
    'Make sure to',
    'Be sure to',
  ];

  const contentLower = contentTag.content.toLowerCase();

  // Check if any instruction markers appear in content
  for (const marker of instructionMarkers) {
    if (contentLower.includes(marker.toLowerCase())) {
      return true;
    }
  }

  // Check if instruction content appears verbatim in content section
  // (This could indicate the LLM copied instructions to output)
  const instructionLines = instructionsTag.content.split('\n');
  for (const line of instructionLines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 20 && contentTag.content.includes(trimmedLine)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract content from a specific XML tag
 *
 * @param response - The response containing XML
 * @param tagName - The tag name to extract
 * @returns The content between the tags, or undefined if not found
 */
export function extractTagContent(
  response: string,
  tagName: string,
): string | undefined {
  const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's');
  const match = response.match(regex);
  return match?.[1]?.trim();
}

/**
 * Extract all tag contents as an object
 *
 * @param response - The response containing XML
 * @param tagNames - Array of tag names to extract
 * @returns Object mapping tag names to their contents
 */
export function extractAllTags(
  response: string,
  tagNames: string[],
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};

  for (const tagName of tagNames) {
    result[tagName] = extractTagContent(response, tagName);
  }

  return result;
}

/**
 * Check if response has valid XML structure without extracting details
 * (Quick validation for assertions)
 */
export function hasValidXMLStructure(
  response: string,
  requiredTags: string[] = ['instructions', 'content'],
): boolean {
  for (const tag of requiredTags) {
    const openTag = `<${tag}>`;
    const closeTag = `</${tag}>`;

    if (!response.includes(openTag) || !response.includes(closeTag)) {
      return false;
    }

    // Check that close tag comes after open tag
    const openIndex = response.indexOf(openTag);
    const closeIndex = response.indexOf(closeTag);

    if (closeIndex <= openIndex) {
      return false;
    }
  }

  return true;
}

/**
 * Strip XML tags and return only content
 * Useful for getting user-facing output without XML markup
 */
export function stripXMLTags(response: string): string {
  // Remove all XML tags
  return response.replace(/<[^>]+>/g, '').trim();
}

/**
 * Assert XML validation (throws error if invalid)
 * Useful for test assertions
 */
export function assertValidXML(
  response: string,
  expectedTags: string[] = ['instructions', 'content'],
): XMLValidation {
  const validation = validateXML(response, expectedTags);

  if (!validation.valid) {
    throw new Error(`XML validation failed:\n${validation.errors.join('\n')}`);
  }

  return validation;
}
