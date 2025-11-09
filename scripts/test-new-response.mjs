#!/usr/bin/env node
/**
 * Test the new execute response structure
 *
 * Usage: node scripts/test-new-response.mjs [scenario]
 *
 * Scenarios:
 * - new-response-v1 (default): Proposed execute response for debug agent
 */

import { BMADEngine } from '../build/core/bmad-engine.js';
import { handleBMADTool } from '../build/tools/bmad-unified.js';

async function main() {
  const scenario = process.argv[2] || 'new-response-v1';

  console.log('🧪 Testing new execute response structure');
  console.log(`Scenario: ${scenario}`);
  console.log('='.repeat(80));
  console.log();

  // Initialize engine (required for tool handler signature)
  const engine = new BMADEngine();

  // Call test operation
  const result = await handleBMADTool(
    {
      operation: 'test',
      testScenario: scenario,
    },
    engine,
  );

  // Display result
  const text = result.content[0].text;
  console.log(text);
  console.log();
  console.log('='.repeat(80));
  console.log('✅ Test response generated');
  console.log();
  console.log('📋 Next steps:');
  console.log('1. Copy the above response');
  console.log('2. Open a new chat session with the BMAD MCP server');
  console.log(
    '3. Call: bmad({ operation: "test", testScenario: "new-response-v1" })',
  );
  console.log('4. Observe how the LLM responds to this structure');
}

main().catch(console.error);
