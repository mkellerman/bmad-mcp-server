#!/usr/bin/env node

/**
 * Test script for Copilot CLI tool calling with BMAD MCP Server
 * 
 * This script:
 * 1. Dynamically adds the BMAD MCP server to Copilot's config
 * 2. Runs a copilot command with tool calling enabled
 * 3. Validates that Diana agent is loaded successfully
 * 
 * Usage:
 *   node scripts/test-copilot-cli-tool-calling.mjs
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '═'.repeat(80));
  log(title, 'bright');
  console.log('═'.repeat(80) + '\n');
}

function logStep(step, message) {
  log(`${step} ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Get the Copilot config directory path
 */
function getCopilotConfigDir() {
  return path.join(os.homedir(), '.copilot');
}

/**
 * Get the MCP config file path
 */
function getMcpConfigPath() {
  return path.join(getCopilotConfigDir(), 'mcp-config.json');
}

/**
 * Backup existing MCP config
 */
async function backupMcpConfig() {
  const configPath = getMcpConfigPath();
  
  if (await fs.pathExists(configPath)) {
    const backupPath = `${configPath}.backup.${Date.now()}`;
    await fs.copy(configPath, backupPath);
    logInfo(`Backed up existing config to: ${backupPath}`);
    return backupPath;
  }
  
  return null;
}

/**
 * Add BMAD MCP server to Copilot config
 */
async function addBmadToMcpConfig() {
  const configDir = getCopilotConfigDir();
  const configPath = getMcpConfigPath();
  
  // Ensure config directory exists
  await fs.ensureDir(configDir);
  
  // Read existing config or create new one
  let config = { mcpServers: {} };
  if (await fs.pathExists(configPath)) {
    try {
      const content = await fs.readFile(configPath, 'utf8');
      // Only parse if file has content
      if (content.trim()) {
        config = JSON.parse(content);
      }
    } catch (error) {
      logWarning(`Existing config is invalid, creating new one: ${error.message}`);
    }
  }
  
  // Ensure mcpServers object exists
  if (!config.mcpServers) {
    config.mcpServers = {};
  }
  
  // Add or update BMAD server config
  const bmadServerPath = path.join(PROJECT_ROOT, 'build', 'index.js');
  config.mcpServers['bmad-test-guid'] = {
    type: 'local',
    command: 'node',
    tools: ['*'],
    args: [
      bmadServerPath,
      'git+https://github.com/mkellerman/BMAD-METHOD#debug-agent-workflow:/bmad',
      '--mode=strict'
    ]
  };
  
  // Write config
  await fs.writeJson(configPath, config, { spaces: 2 });
  
  logSuccess(`Added BMAD server to config: ${configPath}`);
  logInfo(`Server ID: bmad-test-guid`);
  logInfo(`Command: node ${bmadServerPath}`);
  
  return config;
}

/**
 * Check if Copilot CLI is installed
 */
async function checkCopilotCli() {
  try {
    const { stdout } = await execAsync('copilot --version');
    logSuccess(`Copilot CLI installed: ${stdout.trim()}`);
    return true;
  } catch {
    logError('Copilot CLI not found');
    logInfo('Install with: npm install -g @githubnext/copilot-cli');
    return false;
  }
}

/**
 * Build the project
 */
async function buildProject() {
  logStep('🔨', 'Building project...');
  
  try {
    const { stderr } = await execAsync('npm run build', {
      cwd: PROJECT_ROOT
    });
    
    if (stderr && !stderr.includes('chmod')) {
      logWarning(`Build warnings:\n${stderr}`);
    }
    
    logSuccess('Project built successfully');
    return true;
  } catch (error) {
    logError(`Build failed: ${error.message}`);
    return false;
  }
}

/**
 * Run Copilot command with tool calling
 */
async function runCopilotWithToolCalling(prompt) {
  logStep('🤖', 'Running Copilot CLI with tool calling...');
  
  const command = `copilot -p "${prompt}" --allow-all-tools`;
  logInfo(`Command: ${command}`);
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000, // 60 second timeout
      env: {
        ...process.env,
        DEBUG: '1' // Enable debug output if supported
      }
    });
    
    console.log('\n' + '─'.repeat(80));
    log('📝 Copilot Output:', 'bright');
    console.log('─'.repeat(80));
    console.log(stdout);
    
    if (stderr) {
      console.log('\n' + '─'.repeat(80));
      log('⚠️  Stderr Output:', 'yellow');
      console.log('─'.repeat(80));
      console.log(stderr);
    }
    
    return { stdout, stderr };
  } catch (error) {
    logError(`Copilot command failed: ${error.message}`);
    
    if (error.stdout) {
      console.log('\n' + '─'.repeat(80));
      log('📝 Partial Output:', 'dim');
      console.log('─'.repeat(80));
      console.log(error.stdout);
    }
    
    if (error.stderr) {
      console.log('\n' + '─'.repeat(80));
      log('⚠️  Error Output:', 'red');
      console.log('─'.repeat(80));
      console.log(error.stderr);
    }
    
    throw error;
  }
}

/**
 * Validate the response contains Diana/debug-related content
 */
function validateResponse(output) {
  logStep('✓', 'Validating response...');
  
  const indicators = [
    { pattern: /diana/i, description: 'Diana agent mentioned' },
    { pattern: /debug/i, description: 'Debug-related content' },
    { pattern: /bmad/i, description: 'BMAD methodology mentioned' },
    { pattern: /tool/i, description: 'Tool calling mentioned' },
    { pattern: /mcp/i, description: 'MCP mentioned' },
  ];
  
  const matches = [];
  const misses = [];
  
  for (const { pattern, description } of indicators) {
    if (pattern.test(output.stdout) || pattern.test(output.stderr || '')) {
      matches.push(description);
      logSuccess(description);
    } else {
      misses.push(description);
      logWarning(`Missing: ${description}`);
    }
  }
  
  console.log('\n' + '─'.repeat(80));
  log(`Validation Results: ${matches.length}/${indicators.length} indicators found`, 
      matches.length >= 2 ? 'green' : 'yellow');
  console.log('─'.repeat(80));
  
  return matches.length >= 2; // At least 2 indicators should match
}

/**
 * Restore original MCP config
 */
async function restoreMcpConfig(backupPath) {
  if (backupPath && await fs.pathExists(backupPath)) {
    const configPath = getMcpConfigPath();
    await fs.copy(backupPath, configPath, { overwrite: true });
    await fs.remove(backupPath);
    logSuccess('Restored original config');
  }
}

/**
 * Main test execution
 */
async function main() {
  logSection('🧪 Copilot CLI Tool Calling Test');
  
  let backupPath = null;
  let success = false;
  
  try {
    // Step 1: Check prerequisites
    logStep('1️⃣', 'Checking prerequisites...');
    
    const hasCopilot = await checkCopilotCli();
    if (!hasCopilot) {
      process.exit(1);
    }
    
    // Step 2: Build project
    logStep('2️⃣', 'Building project...');
    
    const buildSuccess = await buildProject();
    if (!buildSuccess) {
      process.exit(1);
    }
    
    // Step 3: Backup and configure MCP
    logStep('3️⃣', 'Configuring MCP server...');
    
    backupPath = await backupMcpConfig();
    await addBmadToMcpConfig();
    
    // Step 4: Run Copilot with tool calling
    logStep('4️⃣', 'Testing tool calling...');
    
    const prompt = 'Have diana help me with debugging this project';
    
    const output = await runCopilotWithToolCalling(prompt);
    
    // Step 5: Validate response
    logStep('5️⃣', 'Validating response...');
    
    success = validateResponse(output);
    
    // Final result
    console.log('\n' + '═'.repeat(80));
    if (success) {
      log('✅ TEST PASSED: Tool calling appears to be working!', 'green');
    } else {
      log('⚠️  TEST INCONCLUSIVE: Response received but validation failed', 'yellow');
      logInfo('Check the output above to verify tool calling manually');
    }
    console.log('═'.repeat(80) + '\n');
    
  } catch (error) {
    console.log('\n' + '═'.repeat(80));
    logError(`TEST FAILED: ${error.message}`);
    console.log('═'.repeat(80) + '\n');
    
    if (error.stack) {
      logInfo('Stack trace:');
      console.log(colors.dim + error.stack + colors.reset);
    }
  } finally {
    // Step 6: Cleanup
    if (backupPath) {
      logStep('6️⃣', 'Cleaning up...');
      await restoreMcpConfig(backupPath);
    }
  }
  
  process.exit(success ? 0 : 1);
}

// Run the test
main().catch(error => {
  console.error(error);
  process.exit(1);
});
