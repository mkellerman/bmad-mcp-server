import { request } from '@playwright/test';

/**
 * MCP Server Client for integration testing
 * Handles connection, requests, and cleanup
 */
export class MCPServerClient {
  private baseURL: string;
  private context: any;
  private createdResources: string[] = [];

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async connect() {
    this.context = await request.newContext({
      baseURL: this.baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Call MCP tool by name
   */
  async callTool(toolName: string, args: Record<string, any> = {}) {
    const response = await this.context.post('/tools/call', {
      data: {
        name: toolName,
        arguments: args,
      },
    });
    return response.json();
  }

  /**
   * List available MCP tools
   */
  async listTools() {
    const response = await this.context.get('/tools/list');
    return response.json();
  }

  /**
   * Get server info
   */
  async getServerInfo() {
    const response = await this.context.get('/');
    return response.json();
  }

  /**
   * Track resource for cleanup
   */
  trackResource(resourceId: string) {
    this.createdResources.push(resourceId);
  }

  /**
   * Auto-cleanup tracked resources
   */
  async cleanup() {
    // Clean up any test resources
    for (const resourceId of this.createdResources) {
      try {
        // Implement cleanup logic as needed
        console.log(`Cleaning up resource: ${resourceId}`);
      } catch (error) {
        console.warn(`Failed to cleanup ${resourceId}:`, error);
      }
    }
    this.createdResources = [];
    await this.context?.dispose();
  }
}
