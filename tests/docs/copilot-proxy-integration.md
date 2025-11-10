# GitHub Copilot Proxy Integration

**Date:** November 8, 2025  
**Status:** ✅ Validated and Working  
**Package:** `@hazeruno/copilot-proxy` v1.2.0

## Overview

Successfully integrated GitHub Copilot Proxy as the primary LLM provider for the evaluation framework. This enables multi-model access (OpenAI, Claude, Gemini, Grok) through a single GitHub Copilot Plus subscription without requiring separate API keys.

## Authentication

### Setup Process

1. **Install the package:**

   ```bash
   npm install @hazeruno/copilot-proxy --save-dev
   ```

2. **Authenticate with GitHub Copilot:**

   ```bash
   npx copilot-proxy --auth
   ```

   - Opens browser to `https://github.com/login/device`
   - Displays device code (e.g., `B33A-4B49`)
   - User enters code and authorizes
   - Token cached locally for subsequent use

3. **Verify authentication:**
   ```bash
   npx copilot-proxy --auto-auth
   ```

### Authentication Architecture

- **Separate from `gh` CLI:** GitHub Copilot authentication is independent of `gh auth`
- **Token Storage:** Credentials cached in local system (details handled by package)
- **Token Refresh:** Automatic refresh every ~1500 seconds
- **Subscription:** Requires active GitHub Copilot Plus subscription (`sku: plus_yearly_subscriber_quota`)

### Troubleshooting

If authentication fails:

```bash
npx copilot-proxy --clear-auth
npx copilot-proxy --auth
```

## Available Models

The proxy provides access to **10 models** across multiple providers:

| Model ID               | Provider  | Notes                           |
| ---------------------- | --------- | ------------------------------- |
| `gpt-4o`               | OpenAI    | ✅ Tested and working           |
| `gpt-4.1`              | OpenAI    | Newer GPT-4 variant             |
| `gpt-5-mini`           | OpenAI    | GPT-5 small model               |
| `gpt-5`                | OpenAI    | GPT-5 full model                |
| `o4-mini`              | OpenAI    | O-series reasoning model (mini) |
| `o3-mini`              | OpenAI    | O-series reasoning model        |
| `claude-sonnet-4`      | Anthropic | Claude 4 Sonnet                 |
| `gemini-2.0-flash-001` | Google    | Gemini 2.0 Flash                |
| `gemini-2.5-pro`       | Google    | Gemini 2.5 Pro                  |
| `grok-code-fast-1`     | xAI       | Grok coding-optimized model     |

### Model Features

All models accessed through Copilot subscription include:

- Content safety filtering
- Token usage tracking
- Prompt and completion token details
- Cached token information (for applicable models)

## API Endpoints

### Server Configuration

**Default:** `http://127.0.0.1:8069`

**Available Endpoints:**

- `GET /` - Health check
- `GET /auth/status` - Check authentication status
- `POST /auth/start` - Start authentication flow
- `POST /auth/poll` - Poll for authentication completion
- `POST /auth/clear` - Clear authentication
- `POST /v1/chat/completions` - OpenAI-compatible chat endpoint
- `GET /v1/models` - List available models
- `GET /metrics` - Server metrics

### OpenAI Compatibility

The proxy implements OpenAI's chat completions API specification:

**Request Format:**

```typescript
POST /v1/chat/completions
{
  "model": "gpt-4o",
  "messages": [
    { "role": "user", "content": "Your prompt here" }
  ],
  "temperature": 0.7,
  "max_tokens": 50
}
```

**Response Format:**

```typescript
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1762631826,
  "model": "gpt-4o",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Response text"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 18,
    "total_tokens": 43
  }
}
```

## Integration Testing

### Smoke Test

**File:** `tests/e2e-evaluated/copilot-proxy.smoke.test.ts`

**Purpose:** Validates Copilot Proxy can start and respond to basic requests

**Behavior:**

- ✅ **Authenticated:** Starts server, probes endpoints, validates responses
- ⚠️ **Not Authenticated:** Prints instructions and passes gracefully (no failure)

**Run Command:**

```bash
npm test -- copilot-proxy
```

**Expected Output (Authenticated):**

```
📡 Copilot Proxy listening: { rootStatus: 200, modelsStatus: 200 }
✓ should start local proxy if authenticated (or skip gracefully)
```

### Model Discovery Script

**File:** `scripts/test-copilot-models.mjs`

**Purpose:** Programmatically start server, fetch models, test completion

**Run Command:**

```bash
node scripts/test-copilot-models.mjs
```

**Features:**

- Starts Copilot Proxy server on port 8069
- Fetches and displays all available models
- Tests a simple chat completion with `gpt-4o`
- Validates token usage tracking
- Gracefully stops server after test

## Server Features

### Performance Optimizations

- **HTTP/1.1 Server:** Optimized for streaming and compression
- **Connection Pool:** 10 max connections per origin
- **Streaming Manager:** Up to 100 concurrent streams
- **Response Caching:** Enabled with periodic cleanup
- **Circuit Breaker:** Global metrics and event logging

### Configuration

**Environment Variables:**

- `PORT` - Override server port (default: 8069)

**Command-Line Options:**

- `--port=<number>` - Port to listen on
- `--host=<string>` - Hostname to bind (default: 127.0.0.1)
- `--auth` - Start interactive authentication
- `--auto-auth` - Authenticate and start server
- `--clear-auth` - Clear stored authentication

### Resource Limits

- Max Streams: 100
- Buffer Size: 1024KB (1MB)
- Memory Threshold: 500MB
- Token Refresh: Every 1500 seconds (~25 minutes)

## Integration with LLM Judge

### Current State (Before Migration)

**File:** `tests/helpers/llm-evaluation/llm-judge.ts`

Currently uses `token.js` for multi-provider support:

```typescript
import { TokenJS } from 'token.js';

export class LLMJudge {
  private tokenjs: TokenJS;

  constructor() {
    this.tokenjs = new TokenJS();
  }
}
```

### Proposed Migration

Replace Token.js with direct OpenAI SDK calls to Copilot Proxy endpoint:

```typescript
import OpenAI from 'openai';

export class LLMJudge {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      baseURL: process.env.COPILOT_PROXY_URL || 'http://127.0.0.1:8069/v1',
      apiKey: 'dummy', // Not required by proxy
    });
  }
}
```

### Benefits Over Token.js

1. **Simpler Architecture:** Direct OpenAI SDK (no abstraction layer)
2. **No Provider Logic:** All models accessed through single endpoint
3. **Subscription-Based:** No API key management or billing
4. **Wider Model Access:** 10 models across 4 providers
5. **Better Compatibility:** True OpenAI API compatibility

### Model Cost Tracking

**Important:** Copilot Proxy uses subscription quota, not pay-per-token pricing.

Cost tracking in evaluation framework should:

- Track token usage for analysis
- Estimate equivalent API costs for comparison
- Monitor quota consumption (if exposed by API)

## Environment Configuration

### Recommended `.env` Setup

```bash
# Copilot Proxy Configuration
COPILOT_PROXY_URL=http://127.0.0.1:8069/v1
COPILOT_PROXY_PORT=8069

# Default judge model
DEFAULT_JUDGE_MODEL=gpt-4o

# Fallback models (if primary unavailable)
FALLBACK_JUDGE_MODELS=claude-sonnet-4,gemini-2.0-flash-001
```

### Test Environment Variables

For CI/CD or automated testing:

- Skip Copilot tests if not authenticated
- Provide clear instructions for local authentication
- Use graceful degradation (smoke test pattern)

## Next Steps

### Immediate Tasks

1. ✅ ~~Install `@hazeruno/copilot-proxy`~~
2. ✅ ~~Authenticate with GitHub Copilot~~
3. ✅ ~~Create smoke test~~
4. ✅ ~~Validate model access~~
5. ⏳ Update `llm-judge.ts` to use Copilot Proxy
6. ⏳ Add Copilot models to `judge-models.config.ts`
7. ⏳ Remove Token.js dependency
8. ⏳ Update real LLM evaluation test

### Documentation Updates

- Update `tests/docs/test-strategy-mcp-protocol.md` with Copilot integration
- Add Copilot Proxy to development setup guide
- Document model selection strategy
- Update CI/CD guidelines for authentication

### Testing Strategy

- **Unit Tests:** Mock Copilot Proxy responses
- **Integration Tests:** Conditional execution based on auth status
- **E2E Evaluated Tests:** Use real Copilot models when available
- **CI/CD:** Skip Copilot tests in pipelines (local dev only)

## Troubleshooting

### Common Issues

**1. "GitHub Copilot not authenticated"**

```bash
npx copilot-proxy --auth
```

**2. "Address already in use" (port 8069)**

```bash
lsof -ti:8069 | xargs kill -9
npx copilot-proxy
```

**3. Token refresh failed**

```bash
npx copilot-proxy --clear-auth
npx copilot-proxy --auth
```

**4. Server won't start**

- Check GitHub Copilot subscription is active
- Verify internet connection
- Ensure no firewall blocking localhost:8069

### Logs and Debugging

Enable debug logging:

```bash
# Proxy automatically uses debug level in development
NODE_ENV=development npx copilot-proxy
```

Key log indicators:

- `✅ Authenticated with GitHub Copilot` - Auth successful
- `Token cached, expires in XXXs` - Token valid
- `Server running on http://127.0.0.1:8069` - Ready to accept requests

## Security Considerations

- **Local Only:** Default binding to 127.0.0.1 (not network-accessible)
- **No API Keys in Code:** Authentication handled by proxy package
- **Token Expiration:** Automatic refresh, 25-minute intervals
- **Subscription Required:** Must have active Copilot Plus subscription
- **Content Filtering:** All requests filtered by GitHub's safety systems

## References

- **Package:** [@hazeruno/copilot-proxy](https://www.npmjs.com/package/@hazeruno/copilot-proxy)
- **GitHub Copilot:** [Official Documentation](https://docs.github.com/en/copilot)
- **OpenAI API Spec:** [Chat Completions](https://platform.openai.com/docs/api-reference/chat)

---

**Last Updated:** November 8, 2025  
**Validated By:** Automated smoke test + manual model query  
**Status:** Ready for integration into evaluation framework
