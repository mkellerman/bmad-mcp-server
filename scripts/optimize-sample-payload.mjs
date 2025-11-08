#!/usr/bin/env node
/*
Simple heuristic optimizer demo for MCP response payloads (sidecar-contained).
Usage: node bmad/agents/mcp-sdk-optimizer-sidecar/scripts/optimize-sample-payload.mjs [input.json]
*/
import fs from 'fs';
import path from 'path';

const defaultSample = path.resolve(
  'bmad/agents/mcp-sdk-optimizer-sidecar/examples/payloads/tool-list-before.json',
);
const inputPath = process.argv[2] || defaultSample;
const raw = fs.readFileSync(inputPath, 'utf8');
const payload = JSON.parse(raw);

function estimateTokens(str) {
  if (!str) return 0;
  return Math.ceil(String(str).length / 4);
}

function topNTools(tools, n = 5) {
  return tools
    .slice(0, Math.min(n, tools.length))
    .map((t) => ({ name: t.name, desc: (t.description || '').slice(0, 80) }));
}

function analyzeToolList(p) {
  const tools = Array.isArray(p.tools) ? p.tools : [];
  const sections = Object.keys(p).length;
  const descLen = tools.reduce(
    (sum, t) => sum + (t.description ? t.description.length : 0),
    0,
  );
  const tokenEstimate = estimateTokens(JSON.stringify(p));
  const predictedFollowups = [
    tools.length > 10 ? 1 : 0,
    !p.summary ? 1 : 0,
    !p.intent ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const optimized = {
    intent: 'Tool discovery overview',
    summary: `${tools.length} tools available. Top relevance: ${topNTools(
      tools,
      3,
    )
      .map((t) => t.name)
      .join(', ')}.`,
    affordances: [
      {
        trigger: '*optimize',
        description: 'Semantic analysis of response clarity',
      },
      {
        trigger: '*refine',
        description: 'Rewrite payload parts for structure & brevity',
      },
      { trigger: '*search', description: 'Find resources matching query' },
    ],
    tools: topNTools(tools, 5),
    metrics: {
      token_estimate: tokenEstimate,
      sections,
      potential_followups: predictedFollowups,
      original_desc_chars: descLen,
    },
  };

  return { optimized, metrics: optimized.metrics };
}

let result;
if (payload.type === 'tool_list') {
  result = analyzeToolList(payload);
} else {
  result = { optimized: { intent: 'Unknown payload type' }, metrics: {} };
}

console.warn('--- Optimized Payload Suggestion ---');
console.warn(JSON.stringify(result.optimized, null, 2));
console.warn('\n--- Metrics ---');
console.warn(JSON.stringify(result.metrics, null, 2));
