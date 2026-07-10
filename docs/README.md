# BMAD MCP Server

## Product Vision

BMAD MCP Server is a **Pure Delivery Proxy** that serves BMAD Method content through the Model Context Protocol without preprocessing or interpretation.

## Core Principles

### 1. Pure Content Delivery

- Serves BMAD agents, workflows, and configurations from user installations
- No preprocessing, no template rendering, no variable substitution
- LLMs receive content exactly as it exists on disk

### 2. LLM Intelligence

- LLMs handle ALL logic, interpretation, and execution
- BMAD's dynamic prompt engineering drives LLM behavior
- Server provides content; LLM provides intelligence

### 3. Intelligent Discovery

- Multi-source discovery (project, user home, git remotes)
- Session-based ranking guides LLM selection
- LLM sampling integration for hybrid ranking

### 4. Token Efficiency

- Response shaping optimizes payload size
- Ambiguous response optimization (52.3% reduction achieved)
- Future: Lazy-loading tool descriptions (75-80% target)

## What We Do

✅ Discover BMAD installations (project → user → git)  
✅ Serve agent .md files to LLMs  
✅ Serve workflow instructions to LLMs  
✅ Serve configuration files to LLMs  
✅ Rank options based on session intelligence  
✅ Optimize response formats for token efficiency

## What We DON'T Do

❌ Preprocess templates or substitute variables  
❌ Execute workflow steps  
❌ Interpret agent instructions  
❌ Make decisions for the LLM  
❌ Maintain workflow state

## Architecture Boundary

```
┌─────────────────────────────────────┐
│  LLM (Intelligent Runtime)          │
│  - Interprets instructions          │
│  - Executes workflows                │
│  - Resolves variables                │
│  - Makes decisions                   │
└─────────────────────────────────────┘
            ↕ MCP Protocol
┌─────────────────────────────────────┐
│  BMAD MCP Server (Pure Proxy)       │
│  - Discovers BMAD installations     │
│  - Serves content                    │
│  - Ranks options                     │
│  - Optimizes responses               │
└─────────────────────────────────────┘
            ↕ File I/O
┌─────────────────────────────────────┐
│  BMAD Installation (Source)         │
│  - Agent .md files                   │
│  - Workflow instructions             │
│  - Configuration YAML                │
└─────────────────────────────────────┘
```

## Value Proposition

**For LLM Developers:**

- Zero preprocessing overhead - content served fresh from disk
- Dynamic prompt engineering handled by BMAD Method
- Intelligent ranking reduces decision fatigue

**For BMAD Users:**

- One MCP server, multiple BMAD installations
- Automatic discovery and merging
- Session-aware recommendations

**For Performance:**

- 52.3% token reduction on ambiguous responses
- Targeting 75-80% reduction with lazy-loading
- Fast content delivery with git remote support

## Documentation

- **[Architecture](./architecture.md)** - Pure Delivery Proxy architecture
- **[API Reference](./api.md)** - MCP tool interface and contracts
- **[Development Guide](./development.md)** - Setup, testing, contributing
- **[ADRs](./adr/)** - Architecture Decision Records
- **[Research](./research/)** - Knowledge base and reference materials

## Quick Start

```bash
# Install dependencies
npm install

# Run MCP server
npm start

# Run with custom BMAD folder
BMAD_FOLDER=/path/to/bmad npm start

# Run in strict mode (git remotes only)
npm start -- --git git+https://github.com/your/bmad.git --discovery-mode strict
```

## Key Features

### Multi-Source Discovery

Automatically discovers BMAD installations from:

- Project root (`./bmad`)
- User home (`~/.bmad`)
- Git remotes (specified via CLI)

Priority resolution: project → user → git

### Session-Based Ranking

Tracks LLM usage patterns:

- Recency (last used)
- Frequency (how often)
- Manifest priority (declared importance)
- Boost signals (special emphasis)

### LLM Sampling Integration

Hybrid ranking strategy:

- Uses LLM intelligence when available (sampling capability)
- Falls back to session-based ranking
- Token-efficient ranking prompts (~200 tokens)

### Response Optimization

Shapes MCP responses for better LLM comprehension:

- Removes redundancy
- Highlights key information
- Reduces ambiguous payloads by 52.3%

## Architecture Decisions

See [ADRs](./adr/) for detailed architecture decisions:

- [ADR-001: Pure Delivery Proxy](./adr/001-pure-delivery-proxy.md)
- [ADR-002: Session-Based Ranking](./adr/002-session-based-ranking.md)
- [ADR-003: LLM Sampling Integration](./adr/003-llm-sampling.md)
- [ADR-004: Multi-Source Discovery](./adr/004-multi-source-discovery.md)
- [ADR-005: Manifest Merge Strategy](./adr/005-manifest-merge.md)

## Contributing

See [Development Guide](./development.md) for:

- Setup instructions
- Testing strategies
- Code style guidelines
- PR process

## License

MIT
