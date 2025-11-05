# E2E Testing Framework

This directory contains the infrastructure for end-to-end testing of the BMAD MCP Server.

## Components

- **docker-compose.yml**: LiteLLM proxy configuration for testing with various AI models

## Usage

### Start the test environment

```bash
npm run test:litellm-start
```

This will start a LiteLLM proxy on port 4000 that can route requests to various AI providers.

### Stop the test environment

```bash
npm run test:litellm-stop
```

### View logs

```bash
npm run test:litellm-logs
```

## Configuration

The LiteLLM proxy is configured to support multiple AI providers:

- OpenAI
- Anthropic
- Groq
- And more...

Set your API keys as environment variables before starting the proxy.
