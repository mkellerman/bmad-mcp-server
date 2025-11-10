/**
 * Copilot CLI Session Helper
 *
 * Parallel-safe helper for running Copilot CLI tests with session analysis.
 * Uses UUID-based server IDs and temporary MCP configs to enable parallel execution.
 *
 * Features:
 * - Unique MCP server ID per test run
 * - Temporary config file management
 * - JSONL session file discovery and parsing
 * - Rich session analysis (tool calls, timing, metrics)
 * - Automatic cleanup
 */

import { randomUUID } from 'node:crypto';
import { readFile, writeFile, unlink, readdir, stat } from 'node:fs/promises';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import { join } from 'node:path';

const execAsync = promisify(exec);

/**
 * Session event types from Copilot CLI JSONL output
 */
export interface SessionEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Tool call information extracted from session
 */
export interface ToolCall {
  toolCallId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  timestamp: string;
}

/**
 * Tool execution result
 */
export interface ToolExecution {
  toolCallId: string;
  toolName: string;
  success: boolean;
  result: unknown;
  timestamp: string;
}

/**
 * Complete session analysis
 */
export interface SessionAnalysis {
  sessionId: string;
  model: string;
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  userMessages: number;
  assistantMessages: number;
  toolCalls: ToolCall[];
  toolExecutions: ToolExecution[];
  bmadCalls: ToolCall[];
  allToolsSucceeded: boolean;
  validationChecks: {
    toolCallsMade: boolean;
    bmadToolCalled: boolean;
    allToolsExecuted: boolean;
    atLeastOneSuccess: boolean;
  };
}

/**
 * Options for Copilot CLI execution
 */
export interface CopilotExecuteOptions {
  prompt: string;
  allowAllTools?: boolean;
  timeout?: number;
}

/**
 * Helper class for Copilot CLI session testing
 */
export class CopilotSessionHelper {
  private serverID: string;
  private configPath: string | null = null;
  private sessionFilePath: string | null = null;

  constructor() {
    // Generate unique server ID for this test run
    this.serverID = `bmad-test-${randomUUID().substring(0, 8)}`;
  }

  /**
   * Get the unique server ID for this test run
   */
  getServerID(): string {
    return this.serverID;
  }

  /**
   * Execute a Copilot CLI command with BMAD MCP server and capture session
   */
  async execute(options: CopilotExecuteOptions): Promise<SessionAnalysis> {
    const { prompt, allowAllTools = true, timeout = 60000 } = options;

    try {
      // Create temporary MCP config with unique server ID
      this.configPath = await this.createTempMcpConfig();

      // Record time before execution for session file discovery
      const beforeTime = Date.now();

      // Build Copilot CLI command
      const allowToolsFlag = allowAllTools ? '--allow-all-tools' : '';
      const command = `copilot -p "${prompt}" --additional-mcp-config @${this.configPath} ${allowToolsFlag}`;

      // Execute command
      await execAsync(command, {
        timeout,
        env: { ...process.env, COPILOT_DEBUG: '1' },
      });

      // Wait a moment for session file to be written
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Find and parse session file
      this.sessionFilePath = await this.findLatestSessionFile(beforeTime);
      const events = await this.parseSessionFile(this.sessionFilePath);

      // Analyze session and return results
      return this.analyzeSession(events);
    } finally {
      // Always cleanup temp config
      await this.cleanup();
    }
  }

  /**
   * Create temporary MCP config file with unique server ID
   */
  private async createTempMcpConfig(): Promise<string> {
    const configPath = join(
      process.cwd(),
      `.copilot-mcp-${this.serverID}.json`
    );

    // Read template config
    const templatePath = join(process.cwd(), '.copilot-mcp-test.json');
    const templateContent = await readFile(templatePath, 'utf-8');
    const template = JSON.parse(templateContent);

    // Replace server ID in config
    const config = {
      mcpServers: {
        [this.serverID]: template.mcpServers['bmad-test-local'],
      },
    };

    // Write temp config
    await writeFile(configPath, JSON.stringify(config, null, 2));

    return configPath;
  }

  /**
   * Find the latest session file created after the given timestamp
   */
  private async findLatestSessionFile(afterTime: number): Promise<string> {
    const sessionDir = join(homedir(), '.copilot', 'session-state');

    try {
      const files = await readdir(sessionDir);
      const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

      // Find most recent file modified after execution
      let latestFile: string | null = null;
      let latestTime = afterTime;

      for (const file of jsonlFiles) {
        const filePath = join(sessionDir, file);
        const stats = await stat(filePath);

        if (stats.mtime.getTime() >= latestTime) {
          latestFile = filePath;
          latestTime = stats.mtime.getTime();
        }
      }

      if (!latestFile) {
        throw new Error('No session file found after execution');
      }

      return latestFile;
    } catch (error) {
      throw new Error(`Failed to find session file: ${error}`);
    }
  }

  /**
   * Parse JSONL session file into event array
   */
  private async parseSessionFile(filePath: string): Promise<SessionEvent[]> {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    const events: SessionEvent[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const event = JSON.parse(line) as SessionEvent;
        events.push(event);
      } catch (error) {
        console.warn(`Failed to parse JSONL line: ${line.substring(0, 50)}...`);
      }
    }

    return events;
  }

  /**
   * Analyze session events and extract metrics
   */
  private analyzeSession(events: SessionEvent[]): SessionAnalysis {
    // Find session metadata
    const sessionStart = events.find((e) => e.type === 'session.start');
    const sessionId = sessionStart?.data.sessionId as string || 'unknown';

    const modelChange = events.find((e) => e.type === 'session.model_change');
    const model = modelChange?.data.model as string || 'unknown';

    // Extract timestamps
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    const startTime = new Date(firstEvent.timestamp || Date.now());
    const endTime = new Date(lastEvent.timestamp || Date.now());
    const durationSeconds =
      (endTime.getTime() - startTime.getTime()) / 1000;

    // Count messages
    const userMessages = events.filter((e) => e.type === 'user.message').length;
    const assistantMessages = events.filter(
      (e) => e.type === 'assistant.message'
    ).length;

    // Extract tool calls
    const toolCalls: ToolCall[] = [];
    for (const event of events) {
      if (event.type === 'tool.execution_start') {
        const { toolCallId, toolName, arguments: args } = event.data as {
          toolCallId: string;
          toolName: string;
          arguments: Record<string, unknown>;
        };
        toolCalls.push({
          toolCallId,
          toolName,
          arguments: args,
          timestamp: event.timestamp || new Date().toISOString(),
        });
      }
    }

    // Extract tool executions
    const toolExecutions: ToolExecution[] = [];
    for (const event of events) {
      if (event.type === 'tool.execution_complete') {
        const { toolCallId, success, result } = event.data as {
          toolCallId: string;
          success: boolean;
          result: unknown;
        };

        // Find matching tool call
        const toolCall = toolCalls.find((tc) => tc.toolCallId === toolCallId);

        toolExecutions.push({
          toolCallId,
          toolName: toolCall?.toolName || 'unknown',
          success,
          result,
          timestamp: event.timestamp || new Date().toISOString(),
        });
      }
    }

    // Filter BMAD tool calls
    const bmadCalls = toolCalls.filter((tc) =>
      tc.toolName.includes('bmad')
    );

    // Check if all tools succeeded
    const allToolsSucceeded = toolExecutions.every((te) => te.success);

    // Validation checks
    const validationChecks = {
      toolCallsMade: toolCalls.length > 0,
      bmadToolCalled: bmadCalls.length > 0,
      allToolsExecuted: toolCalls.length === toolExecutions.length,
      atLeastOneSuccess: toolExecutions.some((te) => te.success),
    };

    return {
      sessionId,
      model,
      startTime,
      endTime,
      durationSeconds,
      userMessages,
      assistantMessages,
      toolCalls,
      toolExecutions,
      bmadCalls,
      allToolsSucceeded,
      validationChecks,
    };
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    if (this.configPath) {
      try {
        await unlink(this.configPath);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Note: We intentionally leave session files for debugging
    // They can be cleaned up manually if needed
  }

  /**
   * Format session analysis for display
   */
  static formatAnalysis(analysis: SessionAnalysis): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('📊 Session Analysis');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');

    lines.push('📋 Session Info:');
    lines.push(`   Session ID: ${analysis.sessionId}`);
    lines.push(`   Model: ${analysis.model}`);
    lines.push(`   Duration: ${analysis.durationSeconds.toFixed(2)}s`);
    lines.push('');

    lines.push('💬 Messages:');
    lines.push(`   User messages: ${analysis.userMessages}`);
    lines.push(`   Assistant messages: ${analysis.assistantMessages}`);
    lines.push('');

    lines.push('🔧 Tool Activity:');
    lines.push(`   Total tool calls: ${analysis.toolCalls.length}`);
    lines.push(`   BMAD tool calls: ${analysis.bmadCalls.length}`);
    lines.push(`   Completed executions: ${analysis.toolExecutions.length}`);
    lines.push('');

    if (analysis.bmadCalls.length > 0) {
      lines.push('🎯 BMAD Tool Calls:');
      analysis.bmadCalls.forEach((call, idx) => {
        lines.push(`   ${idx + 1}. ${call.toolName}`);
        lines.push(`      Operation: ${call.arguments.operation || 'N/A'}`);
        if (call.arguments.agent) {
          lines.push(`      Agent: ${call.arguments.agent}`);
        }
        if (call.arguments.workflow) {
          lines.push(`      Workflow: ${call.arguments.workflow}`);
        }
      });
      lines.push('');
    }

    // Validation status
    lines.push('✅ Validation:');
    const checks = analysis.validationChecks;
    const passedChecks = Object.values(checks).filter(Boolean).length;
    lines.push(`   ${passedChecks}/4 checks passed`);
    lines.push(`   ${checks.toolCallsMade ? '✅' : '❌'} Tool calls made`);
    lines.push(`   ${checks.bmadToolCalled ? '✅' : '❌'} BMAD tool called`);
    lines.push(`   ${checks.allToolsExecuted ? '✅' : '❌'} All tools executed`);
    lines.push(`   ${checks.atLeastOneSuccess ? '✅' : '❌'} Tool succeeded`);
    lines.push('');

    lines.push('═══════════════════════════════════════════════════════════════');

    return lines.join('\n');
  }
}
