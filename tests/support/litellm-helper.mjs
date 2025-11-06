/**
 * LiteLLM Proxy Helper
 *
 * Utilities for managing LiteLLM proxy in E2E tests
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Start LiteLLM proxy using docker-compose
 * Returns true if successfully started or already running
 */
export async function startLiteLLMProxy() {
  try {
    console.log('🚀 Starting LiteLLM proxy...');

    // Try to start (will fail gracefully if already running)
    try {
      await execAsync('npm run test:litellm-start');
    } catch (error) {
      // Check if it's already running
      const err = error;
      if (err.message.includes('already in use')) {
        console.log('ℹ️  Container already exists, checking health...');
      } else {
        throw error;
      }
    }

    // Wait for proxy to be ready (max 30 seconds)
    const maxAttempts = 30;
    const delayMs = 1000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      try {
        const response = await fetch('http://localhost:4000/health/readiness');
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'healthy') {
            console.log('✅ LiteLLM proxy started successfully\n');
            return true;
          }
        }
      } catch {
        // Keep trying
      }
    }

    console.warn(
      '⚠️  LiteLLM proxy started but not responding to health checks',
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
