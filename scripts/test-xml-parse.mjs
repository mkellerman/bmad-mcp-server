#!/usr/bin/env node
import { readFileSync } from 'fs';
import { XMLParser } from 'fast-xml-parser';

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  trimValues: true,
  ignoreDeclaration: true,
  ignorePiTags: true,
});

const analystPath = `${process.env.HOME}/.bmad/cache/git/github.com-mkellerman-BMAD-METHOD-debug-agent-workflow/bmad/bmm/agents/analyst.md`;
const content = readFileSync(analystPath, 'utf-8');

const xmlMatch = content.match(/<agent[\s\S]*?<\/agent>/i);
if (!xmlMatch) {
  console.log('No XML found');
  process.exit(1);
}

const parsed = xmlParser.parse(xmlMatch[0]);
const agent = parsed.agent;

console.log('=== ALL AGENT KEYS ===');
console.log(Object.keys(agent));

console.log('\n=== MENU-HANDLERS STRUCTURE ===');
console.log(JSON.stringify(agent['menu-handlers'], null, 2));

console.log('\n=== HANDLERS ===');
console.log(JSON.stringify(agent['menu-handlers']?.handlers, null, 2));

console.log('\n=== HANDLER ARRAY CHECK ===');
const handlers = agent['menu-handlers']?.handlers?.handler;
console.log('Is array:', Array.isArray(handlers));
console.log('Type:', typeof handlers);
console.log('Handler:', JSON.stringify(handlers, null, 2));
