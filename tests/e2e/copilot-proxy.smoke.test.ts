/**
 * E2E Test: Copilot Proxy Connection
 *
 * INTENT:
 * Verify that GitHub Copilot Proxy server is running and accessible.
 * This is a prerequisite for all E2E LLM evaluation tests.
 *
 * EXPECTED STEPS:
 * 1. Check if @hazeruno/copilot-proxy package is installed
 * 2. Verify GitHub Copilot authentication status
 * 3. Verify the Copilot Proxy server is running on localhost:8069
 * 4. Probe server endpoints to confirm it's listening
 *
 * EXPECTED RESULTS:
 * - Server is running and responds to HTTP requests
 * - Both root (/) and /v1/models endpoints are accessible
 * - GitHub Copilot is authenticated
 *
 * FAILURE CONDITIONS:
 * - Package not installed → FAIL test suite
 * - Not authenticated → FAIL test suite
 * - Server not running → FAIL test suite
 * - Endpoints not accessible → FAIL test suite
 *
 * NOTE: This is an E2E test because it uses copilot-proxy (external LLM service).
 *       The server is started by global setup and stopped by global teardown.
 *       If this test fails, all E2E LLM tests in this suite will fail.
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Dynamic import to avoid hard failure if package not installed
async function loadProxy() {
  try {
    const mod = await import('@hazeruno/copilot-proxy');
    return mod as unknown as {
      GitHubCopilotAuth: {
        isAuthenticated: () => Promise<boolean>;
      };
    };
  } catch {
    return null;
  }
}

const PORT = Number(process.env.COPILOT_PROXY_PORT || 8069);
const HOST = '127.0.0.1';

async function probe(url: string): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(url, { method: 'GET' });
    return { ok: true, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

describe('E2E: Copilot Proxy Connection', () => {
  let shouldSkip = false;
  let skipReason = '';

  beforeAll(async () => {
    // Test connection to copilot-proxy - fail suite if unavailable
    const lib = await loadProxy();
    if (!lib) {
      shouldSkip = true;
      skipReason = '@hazeruno/copilot-proxy package not installed';
      return;
    }

    const { GitHubCopilotAuth } = lib;

    try {
      const authed = await GitHubCopilotAuth.isAuthenticated();
      if (!authed) {
        shouldSkip = true;
        skipReason = 'GitHub Copilot not authenticated';
      }
    } catch (e) {
      shouldSkip = true;
      skipReason = `Copilot auth check failed: ${(e as Error).message}`;
    }
  });

  it('should connect to copilot-proxy server', async () => {
    // FAIL if copilot-proxy is unavailable (per testing rules)
    if (shouldSkip) {
      throw new Error(
        `❌ E2E Test Suite Failed: Copilot Proxy unavailable\n` +
          `   Reason: ${skipReason}\n` +
          `   Action: Authenticate with GitHub Copilot\n` +
          `   Command: npx copilot-proxy --auth\n`,
      );
    }

    // Server should be started by global setup
    // Just verify it's responding

    // Probe endpoints
    const root = await probe(`http://${HOST}:${PORT}/`);
    const models = await probe(`http://${HOST}:${PORT}/v1/models`);

    console.log('📡 Copilot Proxy connected:', {
      root: root.status,
      models: models.status,
    });

    // Assert server is responding
    expect(root.ok).toBe(true);
    expect(models.ok).toBe(true);

    // Note: Server cleanup handled by global teardown
    // Don't stop here - other E2E tests need it running
  });
});
