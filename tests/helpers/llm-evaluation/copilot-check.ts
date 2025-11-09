/**
 * Test Helper: Check Copilot Proxy Availability
 *
 * Provides a utility to check if Copilot Proxy is running and authenticated
 * before running LLM evaluation tests.
 */

/**
 * Check if Copilot Proxy is available and responding
 */
export async function isCopilotProxyAvailable(): Promise<boolean> {
  try {
    const baseURL = process.env.COPILOT_PROXY_URL || 'http://127.0.0.1:8069';
    const response = await fetch(`${baseURL}/v1/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Skip test if Copilot Proxy is not available
 * Use in test files as: beforeAll(skipIfCopilotUnavailable)
 */
export async function skipIfCopilotUnavailable() {
  const available = await isCopilotProxyAvailable();
  if (!available) {
    console.log(
      '\n⚠️  Copilot Proxy not available - skipping LLM evaluation tests',
    );
    console.log('   To enable: npx copilot-proxy --auth');
    console.log('   Or ensure Copilot Proxy is running on port 8069\n');
    // Use test.skip to skip the entire suite
    return true; // Indicates should skip
  }
  return false; // Indicates should not skip
}
