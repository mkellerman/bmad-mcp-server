#!/usr/bin/env node

/**
 * Parallel-Safe Copilot CLI Tool Calling Test
 * 
 * Features:
 * - Unique server ID per test run (prevents parallel conflicts)
 * - Session JSONL parsing for detailed analysis
 * - Tool call tracking and metrics
 * - Automatic cleanup
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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
 * Generate unique server ID for this test run
 */
function generateServerID() {
  const uuid = randomUUID().substring(0, 8);
  return `bmad-test-${uuid}`;
}

/**
 * Get Copilot session state directory
 */
function getSessionStateDir() {
  return path.join(os.homedir(), '.copilot', 'session-state');
}

/**
 * Create temporary MCP config with unique server ID
 */
async function createTempMcpConfig(serverID) {
  const bmadServerPath = path.join(PROJECT_ROOT, 'build', 'index.js');
  
  const config = {
    mcpServers: {
      [serverID]: {
        type: 'local',
        command: 'node',
        tools: ['*'],
        args: [
          bmadServerPath,
          'git+https://github.com/mkellerman/BMAD-METHOD#debug-agent-workflow:/bmad',
          '--mode=strict'
        ]
      }
    }
  };
  
  const tempConfigPath = path.join(PROJECT_ROOT, `.copilot-mcp-${serverID}.json`);
  await fs.writeJson(tempConfigPath, config, { spaces: 2 });
  
  logSuccess(`Created temp config: ${tempConfigPath}`);
  logInfo(`Server ID: ${serverID}`);
  
  return tempConfigPath;
}

/**
 * Remove temporary MCP config
 */
async function removeTempMcpConfig(configPath) {
  if (await fs.pathExists(configPath)) {
    await fs.remove(configPath);
    logSuccess(`Removed temp config: ${configPath}`);
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
 * Find the most recent session file
 */
async function findLatestSessionFile() {
  const sessionDir = getSessionStateDir();
  
  if (!await fs.pathExists(sessionDir)) {
    return null;
  }
  
  const files = await fs.readdir(sessionDir);
  const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
  
  if (jsonlFiles.length === 0) {
    return null;
  }
  
  // Get file stats and sort by modification time
  const filesWithStats = await Promise.all(
    jsonlFiles.map(async (file) => {
      const filePath = path.join(sessionDir, file);
      const stats = await fs.stat(filePath);
      return { file, path: filePath, mtime: stats.mtime };
    })
  );
  
  filesWithStats.sort((a, b) => b.mtime - a.mtime);
  
  return filesWithStats[0]?.path || null;
}

/**
 * Parse JSONL session file
 */
async function parseSessionFile(sessionPath) {
  const content = await fs.readFile(sessionPath, 'utf8');
  const lines = content.trim().split('\n');
  
  const events = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line));
    } catch (error) {
      logWarning(`Failed to parse JSONL line: ${error.message}`);
    }
  }
  
  return events;
}

/**
 * Analyze session events for tool calls
 */
function analyzeSession(events) {
  const analysis = {
    sessionId: null,
    model: null,
    userMessages: [],
    assistantMessages: [],
    toolCalls: [],
    toolExecutions: [],
    bmadCalls: [],
    duration: 0,
  };
  
  // Extract session metadata
  const sessionStart = events.find(e => e.type === 'session.start');
  if (sessionStart) {
    analysis.sessionId = sessionStart.data.sessionId;
  }
  
  const modelChange = events.find(e => e.type === 'session.model_change');
  if (modelChange) {
    analysis.model = modelChange.data.newModel;
  }
  
  // Extract messages and tool calls
  for (const event of events) {
    switch (event.type) {
      case 'user.message':
        analysis.userMessages.push(event.data.content);
        break;
        
      case 'assistant.message':
        analysis.assistantMessages.push({
          content: event.data.content,
          toolRequests: event.data.toolRequests || []
        });
        
        // Track tool calls
        if (event.data.toolRequests) {
          for (const toolRequest of event.data.toolRequests) {
            analysis.toolCalls.push({
              id: toolRequest.toolCallId,
              name: toolRequest.name,
              arguments: toolRequest.arguments,
              timestamp: event.timestamp
            });
            
            // Track BMAD-specific calls
            if (toolRequest.name && toolRequest.name.includes('bmad')) {
              analysis.bmadCalls.push(toolRequest);
            }
          }
        }
        break;
        
      case 'tool.execution_complete':
        analysis.toolExecutions.push({
          id: event.data.toolCallId,
          success: event.data.success,
          result: event.data.result,
          timestamp: event.timestamp
        });
        break;
    }
  }
  
  // Calculate duration
  if (events.length > 0) {
    const startTime = new Date(events[0].timestamp);
    const endTime = new Date(events[events.length - 1].timestamp);
    analysis.duration = (endTime - startTime) / 1000; // seconds
  }
  
  return analysis;
}

/**
 * Display session analysis
 */
function displayAnalysis(analysis) {
  console.log('\n' + '═'.repeat(80));
  log('📊 Session Analysis', 'bright');
  console.log('═'.repeat(80));
  
  console.log(`\n📋 Session Info:`);
  console.log(`   Session ID: ${analysis.sessionId}`);
  console.log(`   Model: ${analysis.model}`);
  console.log(`   Duration: ${analysis.duration.toFixed(2)}s`);
  
  console.log(`\n💬 Messages:`);
  console.log(`   User messages: ${analysis.userMessages.length}`);
  console.log(`   Assistant messages: ${analysis.assistantMessages.length}`);
  
  console.log(`\n🔧 Tool Activity:`);
  console.log(`   Total tool calls: ${analysis.toolCalls.length}`);
  console.log(`   BMAD tool calls: ${analysis.bmadCalls.length}`);
  console.log(`   Completed executions: ${analysis.toolExecutions.length}`);
  
  if (analysis.bmadCalls.length > 0) {
    console.log(`\n🎯 BMAD Tool Calls:`);
    for (let i = 0; i < analysis.bmadCalls.length; i++) {
      const call = analysis.bmadCalls[i];
      console.log(`   ${i + 1}. ${call.name}`);
      console.log(`      Operation: ${call.arguments?.operation || 'N/A'}`);
      console.log(`      Agent: ${call.arguments?.agent || 'N/A'}`);
      console.log(`      Module: ${call.arguments?.module || 'N/A'}`);
    }
  }
  
  if (analysis.toolCalls.length > 0) {
    console.log(`\n📝 All Tool Calls:`);
    const toolCounts = {};
    for (const call of analysis.toolCalls) {
      toolCounts[call.name] = (toolCounts[call.name] || 0) + 1;
    }
    
    for (const [tool, count] of Object.entries(toolCounts)) {
      console.log(`   • ${tool}: ${count}x`);
    }
  }
  
  console.log('\n' + '═'.repeat(80));
}

/**
 * Run Copilot command and capture session
 */
async function runCopilotWithSession(prompt, configPath) {
  logStep('🤖', 'Running Copilot CLI...');
  
  const command = `copilot -p "${prompt}" --additional-mcp-config @${configPath} --allow-all-tools`;
  logInfo(`Command: ${command}`);
  
  // Get timestamp before execution
  const beforeTime = Date.now();
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000, // 60 second timeout
      cwd: PROJECT_ROOT
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
    
    // Wait a bit for session file to be written
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Find the session file created after our command
    const sessionFile = await findLatestSessionFile();
    if (sessionFile) {
      const stats = await fs.stat(sessionFile);
      if (stats.mtime.getTime() >= beforeTime) {
        logSuccess(`Found session file: ${path.basename(sessionFile)}`);
        return sessionFile;
      }
    }
    
    logWarning('Could not find session file for this execution');
    return null;
    
  } catch (error) {
    logError(`Copilot command failed: ${error.message}`);
    
    if (error.stdout) {
      console.log('\n' + '─'.repeat(80));
      log('📝 Partial Output:', 'dim');
      console.log('─'.repeat(80));
      console.log(error.stdout);
    }
    
    throw error;
  }
}

/**
 * Validate results
 */
function validateResults(analysis) {
  const checks = {
    hadToolCalls: analysis.toolCalls.length > 0,
    hadBmadCalls: analysis.bmadCalls.length > 0,
    allExecuted: analysis.toolExecutions.length === analysis.toolCalls.length,
    hadSuccess: analysis.toolExecutions.some(e => e.success),
  };
  
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  
  console.log('\n' + '─'.repeat(80));
  log(`✓ Validation Results: ${passed}/${total} checks passed`, 
      passed === total ? 'green' : 'yellow');
  console.log('─'.repeat(80));
  
  if (checks.hadToolCalls) logSuccess('Tool calls were made');
  else logError('No tool calls made');
  
  if (checks.hadBmadCalls) logSuccess('BMAD tool was called');
  else logWarning('BMAD tool was not called');
  
  if (checks.allExecuted) logSuccess('All tools were executed');
  else logWarning('Some tools were not executed');
  
  if (checks.hadSuccess) logSuccess('At least one tool succeeded');
  else logError('No successful tool executions');
  
  return passed >= 3; // Pass if 3+ checks pass
}

/**
 * Main test execution
 */
async function main() {
  logSection('🧪 Parallel-Safe Copilot CLI Test with Session Analysis');
  
  const serverID = generateServerID();
  let configPath = null;
  let success = false;
  
  try {
    // Step 1: Build project
    logStep('1️⃣', 'Building project...');
    const buildSuccess = await buildProject();
    if (!buildSuccess) {
      process.exit(1);
    }
    
    // Step 2: Create unique temp config
    logStep('2️⃣', 'Creating temporary MCP config...');
    configPath = await createTempMcpConfig(serverID);
    
    // Step 3: Run Copilot and capture session
    logStep('3️⃣', 'Running Copilot CLI...');
    const prompt = 'Use the bmad tool to list all available agents';
    const sessionFile = await runCopilotWithSession(prompt, configPath);
    
    // Step 4: Analyze session
    if (sessionFile) {
      logStep('4️⃣', 'Analyzing session data...');
      const events = await parseSessionFile(sessionFile);
      const analysis = analyzeSession(events);
      displayAnalysis(analysis);
      
      // Step 5: Validate
      logStep('5️⃣', 'Validating results...');
      success = validateResults(analysis);
    } else {
      logWarning('No session file to analyze');
    }
    
    // Final result
    console.log('\n' + '═'.repeat(80));
    if (success) {
      log('✅ TEST PASSED: Tool calling and session capture working!', 'green');
    } else {
      log('⚠️  TEST INCONCLUSIVE: Check analysis above', 'yellow');
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
    if (configPath) {
      logStep('6️⃣', 'Cleaning up...');
      await removeTempMcpConfig(configPath);
    }
  }
  
  process.exit(success ? 0 : 1);
}

// Run the test
main().catch(error => {
  console.error(error);
  process.exit(1);
});
