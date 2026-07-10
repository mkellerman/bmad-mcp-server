#!/usr/bin/env node
/**
 * Test Copilot Proxy - Fetch Available Models
 *
 * Starts the Copilot proxy and queries available models
 */

async function main() {
  try {
    // Dynamic import to handle missing package gracefully
    const { CopilotAPIServer } = await import('@hazeruno/copilot-proxy');

    const PORT = 8069;
    const HOST = '127.0.0.1';

    console.log('🚀 Starting Copilot Proxy...\n');

    // Start server
    const server = new CopilotAPIServer(PORT, HOST);
    await server.start();

    console.log(`✅ Server running on http://${HOST}:${PORT}\n`);

    // Wait a moment for server to be fully ready
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Fetch models
    console.log('📋 Fetching available models...\n');
    const response = await fetch(`http://${HOST}:${PORT}/v1/models`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Available Models:');
    console.log(JSON.stringify(data, null, 2));

    // Test a simple completion
    console.log('\n🧪 Testing a simple completion...\n');
    const completion = await fetch(
      `http://${HOST}:${PORT}/v1/chat/completions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content:
                'Say "Hello from Copilot Proxy!" in JSON format with a "message" field.',
            },
          ],
          max_tokens: 50,
        }),
      },
    );

    if (completion.ok) {
      const result = await completion.json();
      console.log('Completion result:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(
        `⚠️  Completion failed: ${completion.status} ${completion.statusText}`,
      );
    }

    // Stop server
    if (server.stop) {
      await server.stop();
      console.log('\n✅ Server stopped');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
