#!/usr/bin/env node

/**
 * Generate Session Report (CSV)
 * 
 * Analyzes Copilot CLI session files and generates a CSV report with:
 * - Test name
 * - User prompt
 * - Tool calls count
 * - Tool names used
 * - Total tokens used
 * - Final LLM response
 */

import fs from 'fs/promises';
import path from 'path';
import { homedir } from 'os';

async function findSessionFiles() {
  const sessionDir = path.join(homedir(), '.copilot', 'session-state');
  
  try {
    const files = await fs.readdir(sessionDir);
    const jsonlFiles = files
      .filter(f => f.endsWith('.jsonl'))
      .map(f => path.join(sessionDir, f));
    
    return jsonlFiles;
  } catch (error) {
    console.error('Error reading session directory:', error.message);
    return [];
  }
}

async function parseSessionFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const events = lines.map(line => JSON.parse(line));
    
    return events;
  } catch {
    return [];
  }
}

function analyzeSession(events, filePath) {
  const fileName = path.basename(filePath);
  
  // Extract user messages
  const userMessages = events
    .filter(e => e.type === 'user.message')
    .map(e => e.data?.content || '');
  
  // Extract assistant messages
  const assistantMessages = events
    .filter(e => e.type === 'assistant.message')
    .map(e => e.data?.content || '');
  
  // Extract tool calls (from assistant.message toolRequests)
  const toolCalls = [];
  const toolNames = new Set();
  
  events.forEach(e => {
    if (e.type === 'assistant.message' && e.data?.toolRequests) {
      e.data.toolRequests.forEach(req => {
        toolCalls.push(req);
        if (req.name) {
          toolNames.add(req.name);
        }
      });
    }
  });
  
  // Extract token usage (look in assistant messages for usage data)
  let totalTokens = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  
  events.forEach(e => {
    // Look for usage information
    if (e.data?.usage) {
      const usage = e.data.usage;
      if (usage.input_tokens) inputTokens += usage.input_tokens;
      if (usage.output_tokens) outputTokens += usage.output_tokens;
    }
    
    // Also check session metadata
    if (e.type === 'session.usage' && e.data) {
      if (e.data.input_tokens) inputTokens += e.data.input_tokens;
      if (e.data.output_tokens) outputTokens += e.data.output_tokens;
    }
  });
  
  totalTokens = inputTokens + outputTokens;
  
  // Extract session metadata
  const sessionStart = events.find(e => e.type === 'session.start');
  const sessionId = sessionStart?.data?.sessionId || fileName;
  
  const modelChange = events.find(e => e.type === 'session.model_change');
  const model = modelChange?.data?.newModel || 'unknown';
  
  // Get timestamps
  const startTime = sessionStart?.timestamp ? new Date(sessionStart.timestamp) : null;
  const lastEvent = events[events.length - 1];
  const endTime = lastEvent?.timestamp ? new Date(lastEvent.timestamp) : null;
  const durationMs = startTime && endTime ? endTime - startTime : 0;
  
  return {
    sessionId,
    fileName,
    model,
    startTime: startTime?.toISOString() || '',
    endTime: endTime?.toISOString() || '',
    durationMs,
    userPrompt: userMessages[0] || '',
    userMessageCount: userMessages.length,
    assistantMessageCount: assistantMessages.length,
    finalResponse: assistantMessages[assistantMessages.length - 1] || '',
    toolCallCount: toolCalls.length,
    toolNames: Array.from(toolNames).join('; '),
    totalTokens,
    inputTokens,
    outputTokens,
  };
}

function escapeCSV(str) {
  if (typeof str !== 'string') {
    return str;
  }
  
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  const needsQuoting = str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r');
  
  if (needsQuoting) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

function truncateText(text, maxLength = 200) {
  if (typeof text !== 'string') {
    return '';
  }
  
  // Remove extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

async function generateReport() {
  console.log('🔍 Searching for Copilot CLI session files...\n');
  
  const sessionFiles = await findSessionFiles();
  
  if (sessionFiles.length === 0) {
    console.log('❌ No session files found.');
    console.log('   Run some E2E tests first: npm run test:e2e');
    process.exit(1);
  }
  
  console.log(`Found ${sessionFiles.length} session file(s)\n`);
  
  // Analyze all sessions
  const sessions = [];
  
  for (const file of sessionFiles) {
    const events = await parseSessionFile(file);
    if (events.length > 0) {
      const analysis = analyzeSession(events, file);
      sessions.push(analysis);
    }
  }
  
  if (sessions.length === 0) {
    console.log('❌ No valid sessions found.');
    process.exit(1);
  }
  
  // Sort by start time (newest first)
  sessions.sort((a, b) => {
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return new Date(b.startTime) - new Date(a.startTime);
  });
  
  // Generate CSV
  const csvHeaders = [
    'Session ID',
    'Start Time',
    'Duration (ms)',
    'Model',
    'User Prompt',
    'Tool Calls',
    'Tools Used',
    'Total Tokens',
    'Input Tokens',
    'Output Tokens',
    'Final Response',
    'User Messages',
    'Assistant Messages',
  ];
  
  let csv = csvHeaders.join(',') + '\n';
  
  for (const session of sessions) {
    const row = [
      escapeCSV(session.sessionId),
      escapeCSV(session.startTime),
      session.durationMs,
      escapeCSV(session.model),
      escapeCSV(truncateText(session.userPrompt, 150)),
      session.toolCallCount,
      escapeCSV(session.toolNames),
      session.totalTokens || 'N/A',
      session.inputTokens || 'N/A',
      session.outputTokens || 'N/A',
      escapeCSV(truncateText(session.finalResponse, 200)),
      session.userMessageCount,
      session.assistantMessageCount,
    ];
    
    csv += row.join(',') + '\n';
  }
  
  // Save CSV
  const outputPath = path.join('test-results', 'session-report.csv');
  await fs.mkdir('test-results', { recursive: true });
  await fs.writeFile(outputPath, csv);
  
  console.log('✅ Session report generated!');
  console.log(`   Output: ${outputPath}`);
  console.log(`   Sessions: ${sessions.length}`);
  console.log();
  
  // Print summary
  console.log('📊 Summary Statistics:');
  console.log('═'.repeat(60));
  
  const totalToolCalls = sessions.reduce((sum, s) => sum + s.toolCallCount, 0);
  const totalTokens = sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0);
  const avgDuration = sessions.reduce((sum, s) => sum + s.durationMs, 0) / sessions.length;
  
  console.log(`Total Sessions:     ${sessions.length}`);
  console.log(`Total Tool Calls:   ${totalToolCalls}`);
  console.log(`Avg Tool Calls:     ${(totalToolCalls / sessions.length).toFixed(1)}`);
  console.log(`Total Tokens:       ${totalTokens > 0 ? totalTokens.toLocaleString() : 'N/A'}`);
  console.log(`Avg Tokens/Session: ${totalTokens > 0 ? Math.round(totalTokens / sessions.length).toLocaleString() : 'N/A'}`);
  console.log(`Avg Duration:       ${Math.round(avgDuration)}ms`);
  console.log();
  
  // Print recent sessions
  console.log('📝 Recent Sessions (top 5):');
  console.log('═'.repeat(60));
  
  sessions.slice(0, 5).forEach((session, i) => {
    console.log(`${i + 1}. ${session.sessionId}`);
    console.log(`   Prompt:  ${truncateText(session.userPrompt, 60)}`);
    console.log(`   Tools:   ${session.toolCallCount} calls (${session.toolNames || 'none'})`);
    console.log(`   Tokens:  ${session.totalTokens || 'N/A'}`);
    console.log(`   Response: ${truncateText(session.finalResponse, 60)}`);
    console.log();
  });
  
  console.log(`📄 Full report saved to: ${outputPath}`);
}

generateReport().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
