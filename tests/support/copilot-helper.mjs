/**
 * Copilot Proxy Helper
 *
 * Utilities for starting, stopping, and managing the GitHub Copilot Proxy server
 * for automated testing. Similar to litellm-helper.mjs but for Copilot integration.
 */

let copilotServer = null;
let serverStartPromise = null;

const DEFAULT_PORT = 8069;
const DEFAULT_HOST = '127.0.0.1';
const HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds

/**
 * Check if Copilot is authenticated
 * @returns {Promise<boolean>}
 */
export async function isCopilotAuthenticated() {
  try {
    const { GitHubCopilotAuth } = await import('@hazeruno/copilot-proxy');
    return await GitHubCopilotAuth.isAuthenticated();
  } catch (error) {
    console.error('Failed to check Copilot authentication:', error.message);
    return false;
  }
}

/**
 * Start Copilot Proxy server
 * @param {number} port - Server port
 * @param {string} host - Server host
 * @returns {Promise<boolean>} - True if started successfully
 */
export async function startCopilotProxy(
  port = DEFAULT_PORT,
  host = DEFAULT_HOST,
) {
  // Prevent multiple simultaneous starts
  if (serverStartPromise) {
    return serverStartPromise;
  }

  // Already running
  if (copilotServer) {
    console.log('✅ Copilot Proxy already running');
    return true;
  }

  serverStartPromise = (async () => {
    try {
      console.log(`\n🚀 Starting Copilot Proxy on ${host}:${port}...`);

      // Check authentication first
      const authed = await isCopilotAuthenticated();
      if (!authed) {
        console.error('\n❌ COPILOT AUTHENTICATION REQUIRED');
        console.error('   GitHub Copilot is not authenticated.');
        console.error('   Please run: npx copilot-proxy --auth');
        console.error('   Then retry your tests.\n');
        throw new Error(
          'Copilot not authenticated. Run: npx copilot-proxy --auth',
        );
      }

      // Import and create server
      const { CopilotAPIServer } = await import('@hazeruno/copilot-proxy');
      copilotServer = new CopilotAPIServer(port, host);

      // Start server
      await copilotServer.start();

      // Verify server is responding
      const healthy = await waitForHealth(host, port);
      if (!healthy) {
        throw new Error('Copilot Proxy started but health check failed');
      }

      console.log(`✅ Copilot Proxy running on http://${host}:${port}\n`);
      return true;
    } catch (error) {
      console.error('\n❌ Failed to start Copilot Proxy:', error.message);
      copilotServer = null;
      throw error;
    } finally {
      serverStartPromise = null;
    }
  })();

  return serverStartPromise;
}

/**
 * Stop Copilot Proxy server
 * @returns {Promise<void>}
 */
export async function stopCopilotProxy() {
  if (!copilotServer) {
    return;
  }

  try {
    console.log('\n🛑 Stopping Copilot Proxy...');
    if (copilotServer.stop) {
      await copilotServer.stop();
    }
    copilotServer = null;
    console.log('✅ Copilot Proxy stopped\n');
  } catch (error) {
    console.error('⚠️  Error stopping Copilot Proxy:', error.message);
    copilotServer = null;
  }
}

/**
 * Check if Copilot Proxy is running
 * @param {string} host - Server host
 * @param {number} port - Server port
 * @returns {Promise<boolean>}
 */
export async function isCopilotProxyRunning(
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
) {
  try {
    const response = await fetch(`http://${host}:${port}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Wait for Copilot Proxy to become healthy
 * @param {string} host - Server host
 * @param {number} port - Server port
 * @param {number} timeout - Max wait time in ms
 * @returns {Promise<boolean>}
 */
async function waitForHealth(
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  timeout = HEALTH_CHECK_TIMEOUT,
) {
  const startTime = Date.now();
  const checkInterval = 500; // Check every 500ms

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`http://${host}:${port}/`, {
        method: 'GET',
        signal: AbortSignal.timeout(1000),
      });

      if (response.ok) {
        return true;
      }
    } catch {
      // Server not ready yet, continue waiting
    }

    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  return false;
}

/**
 * Get Copilot Proxy port
 * @returns {number}
 */
export function getCopilotProxyPort() {
  return Number(process.env.COPILOT_PROXY_PORT || DEFAULT_PORT);
}

/**
 * Get Copilot Proxy URL
 * @returns {string}
 */
export function getCopilotProxyURL() {
  const port = getCopilotProxyPort();
  return `http://${DEFAULT_HOST}:${port}`;
}

/**
 * Verify Copilot Proxy is running (for tests)
 * Throws if proxy is not available
 * @param {Function} healthCheck - Optional custom health check function
 * @returns {Promise<void>}
 */
export async function verifyCopilotProxyRunning(healthCheck = null) {
  const port = getCopilotProxyPort();
  const isRunning = healthCheck
    ? await healthCheck()
    : await isCopilotProxyRunning(DEFAULT_HOST, port);

  if (!isRunning) {
    throw new Error(
      `Copilot Proxy is not running on port ${port}. ` +
        'Run global setup or start manually: npx copilot-proxy',
    );
  }
}
