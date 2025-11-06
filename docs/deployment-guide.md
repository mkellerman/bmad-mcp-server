# Deployment Guide - BMAD MCP Server

**Deployment Methods:** NPM, Docker, Direct Node.js

---

## Overview

The BMAD MCP Server can be deployed in multiple ways depending on your needs. Choose the method that best fits your infrastructure and use case.

**Deployment Options:**

- **NPM Global:** Quick installation for personal use
- **NPM Local:** Per-project installation
- **Docker:** Containerized deployment
- **Direct Node.js:** Manual setup for custom environments

**Requirements:**

- Node.js 18+
- 100MB disk space (including cached Git repositories)
- Network access for Git remote sources

---

## 🚀 Quick Start Deployment

### Option 1: NPM Global Installation (Recommended)

**For personal use across all projects:**

```bash
# Install globally
npm install -g bmad-mcp-server

# Verify installation
bmad-mcp-server --help

# Test basic functionality
bmad-mcp-server --list-tools
```

### Option 2: NPM Local Installation

**For project-specific deployment:**

```bash
# Install in your project
npm install bmad-mcp-server

# Add to package.json scripts
{
  "scripts": {
    "mcp-server": "bmad-mcp-server"
  }
}

# Run locally
npm run mcp-server
```

### Option 3: Direct from Source

**For development or custom builds:**

```bash
# Clone repository
git clone https://github.com/mkellerman/bmad-mcp-server.git
cd bmad-mcp-server

# Install dependencies
npm install

# Build from source
npm run build

# Run built version
node build/index.js
```

---

## ⚙️ Configuration

### Environment Variables

| Variable         | Default         | Description                     |
| ---------------- | --------------- | ------------------------------- |
| `BMAD_ROOT`      | Auto-discover   | Override BMAD installation root |
| `BMAD_DEBUG`     | `false`         | Enable debug logging            |
| `BMAD_CACHE_DIR` | `~/.bmad/cache` | Git repository cache location   |

### Command Line Arguments

```bash
bmad-mcp-server [options]

Options:
  --project-root <path>     Override project root discovery
  --git-remote <url>        Add additional Git remote source
  --help                    Show help information
  --version                 Show version number
```

### Configuration Examples

**Basic Usage:**

```bash
# Use default discovery
bmad-mcp-server
```

**Custom Project Root:**

```bash
# Specify project directory
bmad-mcp-server --project-root /path/to/my/project
```

**Additional Git Sources:**

```bash
# Add custom BMAD repository
bmad-mcp-server --git-remote git+https://github.com/myorg/bmad-custom.git
```

**Multiple Git Sources:**

```bash
# Combine multiple sources
bmad-mcp-server \
  --git-remote git+https://github.com/org1/bmad.git \
  --git-remote git+https://github.com/org2/bmad.git
```

---

## 🐳 Docker Deployment

### Docker Image Build

**Create Dockerfile:**

```dockerfile
FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache git

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY build/ ./build/

# Create cache directory
RUN mkdir -p /app/cache

# Set environment
ENV NODE_ENV=production

# Expose port (if needed for health checks)
EXPOSE 3000

# Run the application
CMD ["node", "build/index.js"]
```

**Build and run:**

```bash
# Build image
docker build -t bmad-mcp-server .

# Run container
docker run -it bmad-mcp-server
```

### Docker Compose Setup

**Create docker-compose.yml:**

```yaml
version: '3.8'

services:
  bmad-mcp-server:
    build: .
    container_name: bmad-mcp-server
    volumes:
      # Mount project directory
      - .:/app/project:ro
      # Mount user BMAD directory
      - ~/.bmad:/app/user-bmad:ro
      # Mount cache directory
      - ~/.bmad/cache:/app/cache
    environment:
      - NODE_ENV=production
    command: ['--project-root', '/app/project']
    restart: unless-stopped
```

**Deploy with Compose:**

```bash
# Start service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop service
docker-compose down
```

---

## 🔗 AI Client Integration

### VS Code + GitHub Copilot

**Add to VS Code settings.json:**

```json
{
  "github.copilot.chat.codeGeneration.instructions": [
    {
      "file": ".*",
      "instruction": "Use BMAD methodology for software development tasks. Access BMAD agents via MCP tools when needed."
    }
  ]
}
```

### Claude Desktop

**Add to Claude Desktop config:**

```json
{
  "mcpServers": {
    "bmad": {
      "command": "bmad-mcp-server",
      "args": ["--project-root", "/path/to/project"]
    }
  }
}
```

### Cursor

**Add to Cursor MCP configuration:**

```json
{
  "mcp": {
    "bmad": {
      "command": "bmad-mcp-server",
      "args": []
    }
  }
}
```

### Other MCP Clients

**Generic MCP configuration:**

```json
{
  "servers": {
    "bmad": {
      "command": "bmad-mcp-server",
      "args": ["--project-root", "/current/project"]
    }
  }
}
```

---

## 🌐 Production Deployment

### System Requirements

**Minimum:**

- CPU: 1 core
- RAM: 256MB
- Disk: 100MB
- Network: Internet access for Git remotes

**Recommended:**

- CPU: 2+ cores
- RAM: 512MB+
- Disk: 1GB+ (for Git cache)
- Network: Stable internet connection

### Process Management

**Using PM2:**

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start "bmad-mcp-server" --name "bmad-mcp"

# Save configuration
pm2 save

# Set up auto-restart
pm2 startup
```

**Using systemd (Linux):**

```bash
# Create service file
sudo tee /etc/systemd/system/bmad-mcp.service > /dev/null <<EOF
[Unit]
Description=BMAD MCP Server
After=network.target

[Service]
Type=simple
User=your-user
ExecStart=/usr/bin/bmad-mcp-server
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable bmad-mcp
sudo systemctl start bmad-mcp
```

### Monitoring

**Health Checks:**

```bash
# Check if server is responding
curl -f http://localhost:3000/health || echo "Server unhealthy"

# Check MCP protocol
# (Use MCP client to test tools/list)
```

**Log Monitoring:**

```bash
# View recent logs
pm2 logs bmad-mcp --lines 50

# Monitor resource usage
pm2 monit
```

### Backup Strategy

**Cache Backup:**

```bash
# Backup Git cache
tar -czf bmad-cache-backup.tar.gz ~/.bmad/cache/

# Restore cache
tar -xzf bmad-cache-backup.tar.gz -C ~/
```

**Configuration Backup:**

```bash
# Backup user BMAD directory
tar -czf bmad-config-backup.tar.gz ~/.bmad/
```

---

## 🔧 Troubleshooting

### Common Issues

#### Server Won't Start

**Symptoms:** Server exits immediately or shows errors

**Solutions:**

```bash
# Check Node.js version
node --version  # Should be 18+

# Check dependencies
npm list --depth=0

# Run with debug logging
BMAD_DEBUG=1 bmad-mcp-server

# Check file permissions
ls -la build/index.js
```

#### Tools Not Appearing

**Symptoms:** AI client doesn't show BMAD tools

**Solutions:**

```bash
# Test server directly
bmad-mcp-server --list-tools

# Check MCP client configuration
# Ensure correct command path and arguments

# Verify BMAD sources
bmad-mcp-server --doctor
```

#### Git Repository Errors

**Symptoms:** Errors about Git clones or remote access

**Solutions:**

```bash
# Clear Git cache
rm -rf ~/.bmad/cache/

# Test Git access
git ls-remote https://github.com/org/repo.git

# Check network connectivity
curl -I https://github.com

# Verify Git URL format
# Should be: git+https://host/org/repo.git[#branch][/subpath]
```

#### Performance Issues

**Symptoms:** Slow response times or high memory usage

**Solutions:**

```bash
# Check system resources
top -p $(pgrep -f bmad-mcp-server)

# Monitor cache size
du -sh ~/.bmad/cache/

# Clear old cache entries
find ~/.bmad/cache/ -type d -mtime +30 -exec rm -rf {} +

# Restart server
pm2 restart bmad-mcp
```

### Debug Commands

**Server Diagnostics:**

```bash
# Show BMAD doctor output
npm run doctor:show

# List available tools
npm run lite:list

# Test BMAD CLI
npm run cli
```

**Network Diagnostics:**

```bash
# Test Git connectivity
curl -s https://api.github.com/repos/bmad-code-org/BMAD-METHOD | head -10

# Check DNS resolution
nslookup github.com

# Test proxy settings (if applicable)
env | grep -i proxy
```

**Log Analysis:**

```bash
# View recent logs
tail -f ~/.bmad/logs/server.log

# Search for errors
grep "ERROR" ~/.bmad/logs/server.log

# Check for warnings
grep "WARN" ~/.bmad/logs/server.log
```

---

## 🔄 Updates and Maintenance

### Updating BMAD MCP Server

**NPM Installation:**

```bash
# Update globally
npm update -g bmad-mcp-server

# Check version
bmad-mcp-server --version
```

**Source Installation:**

```bash
# Pull latest changes
git pull origin main

# Install updated dependencies
npm install

# Rebuild
npm run build

# Restart service
pm2 restart bmad-mcp
```

### Updating BMAD Content

**Automatic Updates:**

- Git remote sources update automatically on server restart
- Cached repositories refresh with latest commits

**Manual Cache Refresh:**

```bash
# Clear cache to force fresh download
rm -rf ~/.bmad/cache/

# Restart server
pm2 restart bmad-mcp
```

### Version Compatibility

| BMAD MCP Server | Node.js | MCP SDK | Status     |
| --------------- | ------- | ------- | ---------- |
| 3.1.x           | 18+     | 1.0.4   | Current    |
| 3.0.x           | 16+     | 1.0.0   | Legacy     |
| 2.x             | 14+     | 0.4.x   | Deprecated |

---

## 📊 Monitoring and Observability

### Metrics to Monitor

- **Response Time:** MCP tool execution time
- **Error Rate:** Failed tool calls percentage
- **Cache Hit Rate:** Git repository cache effectiveness
- **Memory Usage:** Node.js heap usage
- **Active Connections:** Concurrent MCP sessions

### Logging Configuration

**Log Levels:**

- `error`: Critical errors only
- `warn`: Warnings and potential issues
- `info`: General operational information
- `debug`: Detailed debugging information

**Enable Debug Logging:**

```bash
# Environment variable
export BMAD_DEBUG=1

# Or command line
bmad-mcp-server --debug
```

### Alert Conditions

**Critical Alerts:**

- Server process crashes
- All MCP tools fail
- Git repository access completely broken

**Warning Alerts:**

- High error rate (>5%)
- Slow response times (>10 seconds)
- Cache misses increasing

---

## 🔒 Security Considerations

### Network Security

**Git Repository Access:**

- Only HTTPS Git URLs supported
- SSH keys not currently supported
- No authentication for public repositories

**MCP Protocol:**

- Local stdio communication only
- No network exposure of MCP server
- AI client handles external communications

### Data Security

**Cached Data:**

- Git repositories cached locally
- No sensitive data stored
- Cache can be cleared safely

**Access Control:**

- MCP tools available to connected AI clients
- No built-in authentication
- Rely on AI client security model

### Safe Practices

```bash
# Use read-only Git URLs
# Avoid private repositories with sensitive data
# Regularly clear cache of unused repositories
# Monitor server logs for unusual activity
```

---

## 📞 Support and Resources

### Getting Help

**Community Support:**

- [GitHub Issues](https://github.com/mkellerman/bmad-mcp-server/issues)
- [GitHub Discussions](https://github.com/mkellerman/bmad-mcp-server/discussions)

**Documentation:**

- [README.md](../README.md) - Project overview
- [API Contracts](api-contracts.md) - MCP tools and internal APIs
- [Development Guide](development-guide.md) - Development workflow
- [Testing Guide](testing-guide.md) - Testing strategy

### Diagnostic Information

**System Information:**

```bash
# Generate diagnostic report
npm run doctor:show -- --full

# Include in bug reports:
# - OS and version
# - Node.js version
# - NPM version
# - BMAD MCP Server version
# - AI client and version
# - Error messages and logs
```

---

**Deployment Methods:** NPM, Docker, Direct  
**Supported Platforms:** Linux, macOS, Windows  
**Production Ready:** Yes
