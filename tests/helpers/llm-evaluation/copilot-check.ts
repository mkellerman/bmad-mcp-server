/**
 * Copilot Proxy Availability Check
 *
 * Simple utility to check if copilot-proxy is available for LLM evaluation tests.
 * These tests are separate from the main E2E suite and require manual setup.
 *
 * NOTE: This is only used by manual LLM evaluation tests, not by the main E2E test suite.
 */

/**
 * Check if copilot-proxy is available at the configured URL
 */
export async function isCopilotProxyAvailable(): Promise<boolean> {
  const url = process.env.COPILOT_PROXY_URL || 'http://127.0.0.1:8069';

  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok || response.status === 404; // Server responding
  } catch {
    return false;
  }
}

/**
 * Ensure copilot-proxy is available, or skip test with helpful message
 */
export async function ensureCopilotProxy(): Promise<void> {
  const available = await isCopilotProxyAvailable();

  if (!available) {
    console.log('\n⚠️  Copilot Proxy not available');
    console.log('   These are manual LLM evaluation tests');
    console.log('   To enable: npx copilot-proxy --auth');
    console.log('   Skipping...\n');
  }
}
