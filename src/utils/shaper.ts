import { estimateTokens, sizeBytes } from './metrics.js';

export function shapeEnabled(): boolean {
  const flag = process.env.BMAD_SHAPE;
  return flag === '1' || flag === 'true';
}

function maxList(): number {
  const v = process.env.BMAD_SHAPE_MAX_LIST;
  const n = v ? Number(v) : 20;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
}

function maxTextBytes(): number {
  const v = process.env.BMAD_SHAPE_MAX_TEXT_BYTES;
  const n = v ? Number(v) : 32000;
  return Number.isFinite(n) && n > 1024 ? Math.floor(n) : 32000;
}

function maxTokens(): number {
  const v = process.env.BMAD_SHAPE_MAX_TOKENS;
  const n = v ? Number(v) : 8000;
  return Number.isFinite(n) && n > 256 ? Math.floor(n) : 8000;
}

export type MCPResource = {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
};
export type MCPTool = {
  name: string;
  description?: string;
  inputSchema?: unknown;
};

export function shapeResources(resources: MCPResource[]): MCPResource[] {
  const limit = maxList();
  // Deterministic ordering by name
  const sorted = [...resources].sort((a, b) => a.name.localeCompare(b.name));
  return sorted.slice(0, limit).map((r) => ({
    ...r,
    // Keep concise description
    description:
      r.description && r.description.length > 160
        ? r.description.slice(0, 157) + '…'
        : r.description,
  }));
}

export function shapeTools(tools: MCPTool[]): MCPTool[] {
  const limit = maxList();
  const sorted = [...tools].sort((a, b) => a.name.localeCompare(b.name));
  return sorted.slice(0, limit).map((t) => ({
    ...t,
    description:
      t.description && t.description.length > 160
        ? t.description.slice(0, 157) + '…'
        : t.description,
  }));
}

export function shapeTextContent(text: string): {
  text: string;
  truncated: boolean;
  bytes: number;
  tokenEstimate: number;
} {
  const bytes = sizeBytes(text);
  const tokens = estimateTokens(text);
  const maxB = maxTextBytes();
  const maxT = maxTokens();
  if (bytes <= maxB && tokens <= maxT) {
    return { text, truncated: false, bytes, tokenEstimate: tokens };
  }
  // Truncate by bytes primarily to avoid splitting multi-byte chars
  const buf = Buffer.from(text, 'utf8');
  const slice = buf.subarray(0, maxB);
  const truncated = slice.toString('utf8');
  const marker = `\n\n[Truncated output to ${maxB} bytes for LLM efficiency]`;
  const out = truncated + marker;
  return {
    text: out,
    truncated: true,
    bytes: sizeBytes(out),
    tokenEstimate: estimateTokens(out),
  };
}

export function shapeMaxList(): number {
  return maxList();
}
