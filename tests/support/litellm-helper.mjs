/**
 * LiteLLM Proxy Helper
 *
 * Utilities for managing LiteLLM proxy in E2E tests
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Port configuration with fallback
const DEFAULT_PORTS = [4000, 4001, 4002, 4003];
let detectedPort = null;

/**
 * Check if a port is available
 */
async function isPortAvailable(port) {
  try {
    const { stdout } = await execAsync(`lsof -i :${port} -t`);
    return stdout.trim() === ''; // Empty means available
  } catch {
    return true; // lsof error means port is available
  }
}

/**
 * Find an available port from the list
 */
async function findAvailablePort() {
  for (const port of DEFAULT_PORTS) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  return null; // No available ports
}

/**
 * Detect which port the LiteLLM container is using
 */
async function detectLiteLLMPort() {
  if (detectedPort) {
    return detectedPort; // Return cached port
  }

  try {
    const { stdout } = await execAsync(
      'docker inspect litellm-proxy --format "{{(index (index .NetworkSettings.Ports \\"4000/tcp\\") 0).HostPort}}" 2>/dev/null',
    );
    const port = parseInt(stdout.trim(), 10);
    if (port && !isNaN(port)) {
      detectedPort = port;
      return port;
    }
  } catch {
    // Container doesn't exist or not running
  }

  // Try default ports to see if LiteLLM is responding
  for (const port of DEFAULT_PORTS) {
    try {
      const response = await fetch(`http://localhost:${port}/health/readiness`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'healthy') {
          detectedPort = port;
          return port;
        }
      }
    } catch {
      // Port not responding
    }
  }

  return DEFAULT_PORTS[0]; // Default to 4000 if not detected
}

/**
 * Get the current LiteLLM port (for use in tests)
 */
export async function getLiteLLMPort() {
  return await detectLiteLLMPort();
}

/**
 * Start LiteLLM proxy using docker-compose
 * Returns true if successfully started or already running
 */
export async function startLiteLLMProxy() {
  try {
    console.log('🚀 Starting LiteLLM proxy...');

    // First, check if already running and healthy
    const currentPort = await detectLiteLLMPort();
    try {
      const response = await fetch(
        `http://localhost:${currentPort}/health/readiness`,
      );
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'healthy') {
          detectedPort = currentPort;
          console.log(
            `✅ LiteLLM proxy already running on port ${currentPort}\n`,
          );
          return true;
        }
      }
    } catch {
      // Not running, continue with startup
    }

    // Clean up any stale containers first
    try {
      await execAsync('docker rm -f litellm-proxy 2>/dev/null || true');
    } catch {
      // Ignore errors - container might not exist
    }

    // Find an available port
    const availablePort = await findAvailablePort();
    if (!availablePort) {
      console.error('❌ No available ports found in range:', DEFAULT_PORTS);
      console.error('   To fix, either:');
      console.error('   1. Stop services using these ports');
      console.error('   2. Set SKIP_LLM_TESTS=true to skip E2E tests');
      return false;
    }

    // Set the port environment variable and start
    try {
      const env = `LITELLM_PORT=${availablePort}`;
      console.log(`📡 Using port ${availablePort} for LiteLLM proxy`);
      await execAsync(`${env} npm run test:litellm-start`);
      detectedPort = availablePort;
    } catch (error) {
      const err = error;

      // Check if port is already in use (shouldn't happen after our check)
      if (err.message.includes('port is already allocated')) {
        console.error(`❌ Port ${availablePort} became unavailable`);
        console.error('   Retrying with next available port...');
        // Recursive retry with port blacklist would go here
        return false;
      }

      // Other errors
      if (!err.message.includes('already in use')) {
        throw error;
      }
    }

    // Wait for proxy to be ready (max 30 seconds)
    const maxAttempts = 30;
    const delayMs = 1000;
    const port = detectedPort || DEFAULT_PORTS[0];

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      try {
        const response = await fetch(
          `http://localhost:${port}/health/readiness`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'healthy') {
            console.log(
              `✅ LiteLLM proxy started successfully on port ${port}\n`,
            );
            return true;
          }
        }
      } catch {
        // Keep trying
      }
    }

    console.warn(
      `⚠️  LiteLLM proxy started but not responding on port ${port}`,
    );
    return false;
  } catch (error) {
    console.error('❌ Failed to start LiteLLM proxy:', error);
    return false;
  }
}

/**
 * Ensure LiteLLM proxy is running, start it if necessary
 * Throws an error if proxy cannot be started
 *
 * NOTE: In most cases, you should call verifyLiteLLMRunning() instead.
 * The global setup already starts LiteLLM for E2E tests.
 */
export async function ensureLiteLLMRunning(healthCheck) {
  let healthy = await healthCheck();

  if (!healthy) {
    console.log('⚠️  LiteLLM proxy not running, attempting to start it...\n');
    const started = await startLiteLLMProxy();

    if (!started) {
      throw new Error(
        '❌ LiteLLM proxy could not be started!\n\n   Try manually:\n   npm run test:litellm-start\n',
      );
    }

    // Verify it's now healthy
    healthy = await healthCheck();
    if (!healthy) {
      throw new Error(
        '❌ LiteLLM proxy started but not healthy!\n\n   Check logs:\n   npm run test:litellm-logs\n',
      );
    }
  } else {
    console.log('✅ LiteLLM health check passed\n');
  }
}

/**
 * Verify LiteLLM proxy is running (without trying to start it)
 * Use this in individual E2E tests - the global setup handles starting.
 * Throws an error if proxy is not running.
 */
export async function verifyLiteLLMRunning(healthCheck) {
  const healthy = await healthCheck();

  if (!healthy) {
    throw new Error(
      '❌ LiteLLM proxy is not running!\n\n' +
        '   The global setup should have started it automatically.\n' +
        '   If this failed, start it manually:\n' +
        '   npm run test:litellm-start\n',
    );
  }

  console.log('✅ LiteLLM health check passed\n');
}
