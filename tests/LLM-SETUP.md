# LLM E2E Test Setup

One-time setup for running LLM-powered E2E tests using GitHub Copilot.

## Prerequisites

- Docker installed and running
- GitHub account with Copilot access

## Setup Steps

### 1. Authenticate with GitHub

Run this interactive container to authenticate:

```bash
docker run -it --rm \
  -v ~/.config/litellm:/root/.config/litellm \
  ghcr.io/berriai/litellm:main-latest \
  --config /app/config.yaml
```

Follow the device code authentication prompt. This saves your credentials to `~/.config/litellm` for future use.

### 2. Start LiteLLM Proxy

```bash
npm run litellm:docker:start
```

This starts a background container that:

- Mounts your `~/.config/litellm` credentials
- Mounts the test config at `tests/support/litellm-config.yaml`
- Exposes the API on `http://localhost:4000`

### 3. Verify Health

```bash
npm run litellm:docker:health
```

Expected output: `{"status":"healthy"}`

### 4. Run LLM Tests

```bash
npm run test:llm
```

## Daily Usage

After initial setup, you only need:

```bash
npm run litellm:docker:start   # Start proxy
npm run test:llm               # Run tests
npm run litellm:docker:stop    # Stop proxy when done
```

## Troubleshooting

**Proxy not healthy:**

```bash
npm run litellm:docker:logs    # Check logs
```

**Port 4000 in use:**

```bash
lsof -i :4000                  # Find process
npm run litellm:docker:stop    # Stop proxy
```

**Authentication expired:**
Repeat step 1 to re-authenticate with GitHub.

## Configuration

Edit `tests/support/litellm-config.yaml` to:

- Change LLM models
- Adjust temperature/settings
- Add additional models

Current setup uses `gpt-4.1` via GitHub Copilot.
