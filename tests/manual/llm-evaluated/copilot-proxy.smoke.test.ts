/**
 * Copilot Proxy Smoke Test (Optional)
 *
 * - Checks GitHub Copilot auth status
 * - Starts @hazeruno/copilot-proxy server on localhost if authenticated
 * - Probes the server root endpoint to verify it's listening
 *
 * This test is skipped gracefully if Copilot is not authenticated.
 * No actual model calls are made.
 */

import { describe, it, expect } from 'vitest';

// Dynamic import to avoid hard failure if package not installed
async function loadProxy() {
  try {
    const mod = await import('@hazeruno/copilot-proxy');
    return mod as unknown as {
      // Use callable constructor signature without named params to avoid lint warnings
      CopilotAPIServer: new () => {
        start: () => Promise<void>;
        stop?: () => Promise<void>;
      };
      GitHubCopilotAuth: {
        isAuthenticated: () => Promise<boolean>;
      };
    };
  } catch {
    return null;
  }
}

// Pick a port; default 8069, override via env if needed
const PORT = Number(process.env.COPILOT_PROXY_PORT || 8069);
const HOST = '127.0.0.1';

// Helper: probe server with fetch
async function probe(url: string): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(url, { method: 'GET' });
    return { ok: true, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

describe('Copilot Proxy (Smoke)', () => {
  it('should start local proxy if authenticated (or skip gracefully)', async () => {
    const lib = await loadProxy();
    if (!lib) {
      console.log(
        '\nℹ️  @hazeruno/copilot-proxy not installed. Skipping smoke test.',
      );
      expect(true).toBe(true);
      return;
    }

    const { CopilotAPIServer, GitHubCopilotAuth } = lib;

    // Check auth status
    let authed = false;
    try {
      authed = await GitHubCopilotAuth.isAuthenticated();
    } catch (e) {
      console.log(
        '\nℹ️  Copilot auth check failed. Skipping. Error:',
        (e as Error).message,
      );
      expect(true).toBe(true);
      return;
    }

    if (!authed) {
      console.log('\n⚠️  GitHub Copilot not authenticated.');
      console.log('   Please sign in via VS Code Copilot or GitHub CLI.');
      console.log('   Then rerun: npm test -- copilot-proxy');
      expect(true).toBe(true);
      return;
    }

    // Start server
    // Create server (constructor expects (port, host))
    const server: any = new (CopilotAPIServer as any)(PORT, HOST);
    await server.start();

    // Probe server root and a likely OpenAI-compatible path
    const root = await probe(`http://${HOST}:${PORT}/`);
    const models = await probe(`http://${HOST}:${PORT}/v1/models`);

    console.log('\n📡 Copilot Proxy listening:', {
      rootStatus: root.status,
      modelsStatus: models.status,
    });

    // We only assert that the port is listening (any non-0 status)
    expect(root.ok || models.ok).toBe(true);

    // Attempt to stop server if supported
    try {
      await server.stop?.();
    } catch {
      // ignore
    }
  }, 20000);
});
