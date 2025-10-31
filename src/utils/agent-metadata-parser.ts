/**
 * Agent Metadata Parser
 *
 * Extracts metadata from BMAD agent .md files by parsing the embedded XML (v6) or YAML (v4).
 * Agents contain structured sections with persona information (role, identity, etc.)
 */

import fs from 'node:fs';
import logger from './logger.js';

export interface AgentMetadata {
  name?: string;
  title?: string;
  icon?: string;
  role?: string;
  identity?: string;
  communicationStyle?: string;
  principles?: string;
}

/**
 * Extract text content from between XML tags.
 * Simple regex-based extraction - good enough for well-formed agent files.
 */
function extractTagContent(xml: string, tagName: string): string | undefined {
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : undefined;
}

/**
 * Extract attribute from opening tag.
 */
function extractAttribute(
  xml: string,
  attributeName: string,
): string | undefined {
  const regex = new RegExp(`${attributeName}="([^"]*)"`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : undefined;
}

/**
 * Extract YAML field value (simple key: value extraction)
 */
function extractYamlField(yaml: string, fieldName: string): string | undefined {
  // Match "fieldName: value" format, handling quoted and unquoted values
  const regex = new RegExp(`^\\s*${fieldName}:\\s*(.+?)$`, 'im');
  const match = yaml.match(regex);
  if (!match) return undefined;

  let value = match[1].trim();
  // Remove quotes if present
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  // Remove 'null' values
  if (value === 'null') return undefined;

  return value || undefined;
}

/**
 * Parse v6 XML format agent metadata
 */
function parseV6XmlFormat(content: string): AgentMetadata {
  const xmlMatch = content.match(/```xml\s*([\s\S]*?)\s*```/);
  if (!xmlMatch) return {};

  const xml = xmlMatch[1];

  // Extract attributes from <agent> tag
  const name = extractAttribute(xml, 'name');
  const title = extractAttribute(xml, 'title');
  const icon = extractAttribute(xml, 'icon');

  // Extract persona fields
  const role = extractTagContent(xml, 'role');
  const identity = extractTagContent(xml, 'identity');
  const communicationStyle = extractTagContent(xml, 'communication_style');
  const principles = extractTagContent(xml, 'principles');

  return {
    name,
    title,
    icon,
    role,
    identity,
    communicationStyle,
    principles,
  };
}

/**
 * Parse v4 YAML format agent metadata
 */
function parseV4YamlFormat(content: string): AgentMetadata {
  const yamlMatch = content.match(/```yaml\s*([\s\S]*?)\s*```/);
  if (!yamlMatch) return {};

  const yaml = yamlMatch[1];

  // Extract agent section fields
  const name = extractYamlField(yaml, 'name');
  const title = extractYamlField(yaml, 'title');
  const icon = extractYamlField(yaml, 'icon');

  // Extract persona section fields
  const role = extractYamlField(yaml, 'role');
  const identity = extractYamlField(yaml, 'identity');
  const style = extractYamlField(yaml, 'style');

  // Try to extract principles (might be multi-line array, so just get first principle)
  let principles: string | undefined;
  const principlesMatch = yaml.match(/core_principles:\s*\n\s*-\s*(.+)/);
  if (principlesMatch) {
    principles = principlesMatch[1].trim();
  }

  return {
    name,
    title,
    icon,
    role,
    identity,
    communicationStyle: style,
    principles,
  };
}

/**
 * Parse agent metadata from an agent .md file.
 *
 * Supports both v6 (XML) and v4 (YAML) formats.
 * Extracts metadata including:
 * - name, title, icon (from agent tag/section)
 * - role (from persona section)
 * - identity (from persona section)
 * - communicationStyle (from persona section)
 * - principles (from persona/core_principles section)
 *
 * @param filePath - Absolute path to the agent .md file
 * @returns AgentMetadata object with extracted fields, or empty object if parsing fails
 */
export function parseAgentMetadata(filePath: string): AgentMetadata {
  try {
    if (!fs.existsSync(filePath)) {
      logger.warn(`Agent file not found: ${filePath}`);
      return {};
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Try v6 XML format first
    if (content.includes('```xml')) {
      return parseV6XmlFormat(content);
    }

    // Fall back to v4 YAML format
    if (content.includes('```yaml')) {
      return parseV4YamlFormat(content);
    }

    logger.warn(`No recognized format (XML or YAML) found in: ${filePath}`);
    return {};
  } catch (error) {
    logger.warn(`Failed to parse agent metadata from ${filePath}:`, error);
    return {};
  }
}

/**
 * Parse metadata from multiple agent files.
 *
 * @param filePaths - Array of absolute paths to agent .md files
 * @returns Map of filePath -> AgentMetadata
 */
export function parseMultipleAgents(
  filePaths: string[],
): Map<string, AgentMetadata> {
  const results = new Map<string, AgentMetadata>();

  for (const filePath of filePaths) {
    const metadata = parseAgentMetadata(filePath);
    results.set(filePath, metadata);
  }

  return results;
}
