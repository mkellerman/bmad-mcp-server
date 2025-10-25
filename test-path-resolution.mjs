#!/usr/bin/env node
/**
 * Test script to verify BMAD root path resolution works correctly
 * in different scenarios.
 */

import fs from 'fs';
import os from 'os';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🧪 Testing BMAD Root Path Resolution\n');

function createTempWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bmad-workspace-'));
  return dir;
}

const tests = (() => {
  const envWorkspace = createTempWorkspace();
  const cliWorkspace = createTempWorkspace();

  return [
    {
      name: 'Scenario 1: Using BMAD_ROOT env var',
      env: { BMAD_ROOT: __dirname },
      args: [],
      cwd: envWorkspace,
      expectedPattern: /Active BMAD location \(BMAD_ROOT environment variable\):/,
      cleanup: () => fs.rmSync(envWorkspace, { recursive: true, force: true }),
    },
    {
      name: 'Scenario 2: Using command line argument',
      env: {},
      args: [__dirname],
      cwd: cliWorkspace,
      expectedPattern: /Active BMAD location \(Command argument\):/,
      cleanup: () => fs.rmSync(cliWorkspace, { recursive: true, force: true }),
    },
    {
      name: 'Scenario 3: Using current directory (cwd)',
      env: {},
      args: [],
      cwd: __dirname,
      expectedPattern: /Active BMAD location \(Local project\):/,
    },
  ];
})();

async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`\n📋 ${test.name}`);
    console.log('─'.repeat(60));
    
    const serverPath = path.join(__dirname, 'build', 'index.js');
    const proc = spawn('node', [serverPath, ...test.args], {
      env: { ...process.env, ...test.env },
      cwd: test.cwd || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';
    let stdout = '';
    let hasExpectedMessage = false;
    let hasInitialized = false;

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
      checkOutput(data.toString());
    });

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
      checkOutput(data.toString());
    });

    function checkOutput(output) {
      // Check for expected message
      if (test.expectedPattern.test(output)) {
        hasExpectedMessage = true;
        console.log(`✅ Found expected message: "${output.trim().substring(0, 80)}..."`);
      }
      
      // Check if server initialized
      if (output.includes('BMAD MCP Server initialized successfully') ||
          output.includes('BMAD MCP Server running')) {
        hasInitialized = true;
      }
      
      // Log initialization messages
      if (output.includes('Active BMAD location') ||
          output.includes('BMAD root:') || 
          output.includes('Project root:') ||
          output.includes('Loaded') ||
          output.includes('initialized')) {
        console.log(`   ${output.trim().substring(0, 80)}`);
      }
    }

    // Kill server after 2 seconds
    setTimeout(() => {
      proc.kill();
      
      if (hasExpectedMessage && hasInitialized) {
        console.log(`✅ TEST PASSED: ${test.name}`);
        if (test.cleanup) {
          test.cleanup();
        }
        resolve(true);
      } else {
        console.log(`❌ TEST FAILED: ${test.name}`);
        if (!hasExpectedMessage) {
          console.log(`   Missing expected pattern: ${test.expectedPattern}`);
        }
        if (!hasInitialized) {
          console.log(`   Server did not initialize successfully`);
        }
        console.log(`\n   Full output:\n${stderr}${stdout}`);
        if (test.cleanup) {
          test.cleanup();
        }
        resolve(false);
      }
    }, 2000);
  });
}

async function runAllTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await runTest(test);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
