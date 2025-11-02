#!/usr/bin/env node
/**
 * Enhanced BMAD v6 Validation Script
 * 
 * Validates v6 BMAD installations against both:
 * 1. Official YAML schema (from BMAD-METHOD repo)
 * 2. MCP-compatible Markdown format
 * 3. MCP tool compatibility testing
 * 
 * Usage:
 *   node validate-bmad-v6-enhanced.mjs [path-to-bmad-v6-folder]
 *   node validate-bmad-v6-enhanced.mjs ./bmad
 *   node validate-bmad-v6-enhanced.mjs /path/to/project/bmad
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { detectBmadSource } from '../build/utils/bmad-source-detector.js';
import { resolveBmadPaths } from '../build/utils/bmad-path-resolver.js';
import { MasterManifestService } from '../build/services/master-manifest-service.js';
import { UnifiedBMADTool } from '../build/tools/index.js';

// Result types
const RESULT_TYPES = {
  PASS: '✅',
  WARN: '⚠️', 
  FAIL: '❌',
  INFO: 'ℹ️'
};

// Official BMAD v6 Schema (from BMAD-METHOD repo)
const TRIGGER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMMAND_TARGET_KEYS = ['workflow', 'validate-workflow', 'exec', 'action', 'tmpl', 'data', 'run-workflow'];

function createNonEmptyString(label) {
  return z.string().refine((value) => value.trim().length > 0, {
    message: `${label} must be a non-empty string`,
  });
}

function buildMetadataSchema(expectedModule) {
  return z.object({
    id: createNonEmptyString('agent.metadata.id'),
    name: createNonEmptyString('agent.metadata.name'),
    title: createNonEmptyString('agent.metadata.title'),
    icon: createNonEmptyString('agent.metadata.icon'),
    module: createNonEmptyString('agent.metadata.module').optional(),
  }).strict().superRefine((value, ctx) => {
    const moduleValue = typeof value.module === 'string' ? value.module.trim() : null;
    
    if (expectedModule && !moduleValue) {
      ctx.addIssue({
        code: 'custom',
        path: ['module'],
        message: 'module-scoped agents must declare agent.metadata.module',
      });
    } else if (!expectedModule && moduleValue) {
      ctx.addIssue({
        code: 'custom', 
        path: ['module'],
        message: 'core agents must not include agent.metadata.module',
      });
    } else if (expectedModule && moduleValue !== expectedModule) {
      ctx.addIssue({
        code: 'custom',
        path: ['module'],
        message: `agent.metadata.module must equal "${expectedModule}"`,
      });
    }
  });
}

function buildPersonaSchema() {
  return z.object({
    role: createNonEmptyString('agent.persona.role'),
    identity: createNonEmptyString('agent.persona.identity'),
    communication_style: createNonEmptyString('agent.persona.communication_style'),
    principles: z.array(createNonEmptyString('agent.persona.principles[]'))
      .min(1, { message: 'agent.persona.principles must include at least one entry' }),
  }).strict();
}

function buildMenuItemSchema() {
  return z.object({
    trigger: createNonEmptyString('agent.menu[].trigger'),
    description: createNonEmptyString('agent.menu[].description'),
    workflow: createNonEmptyString('agent.menu[].workflow').optional(),
    'validate-workflow': createNonEmptyString('agent.menu[].validate-workflow').optional(),
    exec: createNonEmptyString('agent.menu[].exec').optional(),
    action: createNonEmptyString('agent.menu[].action').optional(),
    tmpl: createNonEmptyString('agent.menu[].tmpl').optional(),
    data: createNonEmptyString('agent.menu[].data').optional(),
    'run-workflow': createNonEmptyString('agent.menu[].run-workflow').optional(),
  }).strict().superRefine((value, ctx) => {
    const hasCommandTarget = COMMAND_TARGET_KEYS.some((key) => {
      const commandValue = value[key];
      return typeof commandValue === 'string' && commandValue.trim().length > 0;
    });
    
    if (!hasCommandTarget) {
      ctx.addIssue({
        code: 'custom',
        message: 'agent.menu[] entries must include at least one command target field',
      });
    }
  });
}

function buildAgentSchema(expectedModule) {
  return z.object({
    metadata: buildMetadataSchema(expectedModule),
    persona: buildPersonaSchema(),
    critical_actions: z.array(createNonEmptyString('agent.critical_actions[]')).optional(),
    menu: z.array(buildMenuItemSchema()).min(1, { message: 'agent.menu must include at least one entry' }),
    prompts: z.array(z.object({
      id: createNonEmptyString('agent.prompts[].id'),
      content: z.string().refine((value) => value.trim().length > 0, {
        message: 'agent.prompts[].content must be a non-empty string',
      }),
      description: createNonEmptyString('agent.prompts[].description').optional(),
    }).strict()).optional(),
  }).strict();
}

function agentSchema(options = {}) {
  const expectedModule = typeof options.module === 'string' ? options.module.trim() || null : null;
  
  return z.object({
    agent: buildAgentSchema(expectedModule),
  }).strict().superRefine((value, ctx) => {
    const seenTriggers = new Set();
    let index = 0;
    
    for (const item of value.agent.menu) {
      const triggerValue = item.trigger;
      
      if (!TRIGGER_PATTERN.test(triggerValue)) {
        ctx.addIssue({
          code: 'custom',
          path: ['agent', 'menu', index, 'trigger'],
          message: 'agent.menu[].trigger must be kebab-case (lowercase words separated by hyphen)',
        });
        return;
      }
      
      if (seenTriggers.has(triggerValue)) {
        ctx.addIssue({
          code: 'custom',
          path: ['agent', 'menu', index, 'trigger'], 
          message: `agent.menu[].trigger duplicates "${triggerValue}" within the same agent`,
        });
        return;
      }
      
      seenTriggers.add(triggerValue);
      index += 1;
    }
  });
}

function deriveModuleFromPath(filePath) {
  if (!filePath || !filePath.startsWith('src/')) {
    return null;
  }
  
  const marker = 'src/modules/';
  if (!filePath.startsWith(marker)) {
    return null; // Core agent
  }
  
  const remainder = filePath.slice(marker.length);
  const slashIndex = remainder.indexOf('/');
  return slashIndex === -1 ? null : remainder.slice(0, slashIndex);
}

function validateAgentFile(filePath, agentYaml) {
  const expectedModule = deriveModuleFromPath(filePath);
  const schema = agentSchema({ module: expectedModule });
  return schema.safeParse(agentYaml);
}

class EnhancedV6Validator {
  constructor(sourcePath) {
    this.sourcePath = path.resolve(sourcePath);
    this.results = [];
    this.agentResults = new Map();
    this.sourceInfo = null;
    this.manifestData = null;
    this.agentManifest = [];
  }

  log(type, category, message, details = null) {
    this.results.push({ type, category, message, details });
    const icon = RESULT_TYPES[type] || 'ℹ️';
    console.log(`${icon} [${category}] ${message}`);
    if (details) {
      console.log(`   ${details}`);
    }
  }

  async validate() {
    console.log('🔍 Enhanced BMAD Core v6 Validation Starting...\n');
    console.log(`📁 Validating: ${this.sourcePath}\n`);

    // 1. Structure Detection
    await this.validateStructure();
    
    if (!this.sourceInfo?.isValid) {
      return this.generateReport();
    }

    // 2. Manifest Validation  
    await this.validateManifests();

    // 3. Module Structure Validation
    await this.validateModules();

    // 4. Official YAML Schema Validation
    await this.validateOfficialYamlFormat();

    // 5. MCP-Compatible Markdown Validation
    await this.validateMcpMarkdownFormat();

    // 6. MCP Tool Compatibility Test
    await this.testMcpCompatibility();

    return this.generateReport();
  }

  async validateStructure() {
    console.log('📋 1. Structure Validation\n');

    this.sourceInfo = detectBmadSource(this.sourcePath);

    if (!this.sourceInfo.isValid) {
      this.log('FAIL', 'Structure', `Invalid BMAD v6 structure: ${this.sourceInfo.error}`);
      return;
    }

    if (this.sourceInfo.type !== 'v6') {
      this.log('FAIL', 'Structure', `Expected v6 structure, found: ${this.sourceInfo.type}`);
      return;
    }

    this.log('PASS', 'Structure', 'Valid v6 BMAD structure detected');
    this.log('INFO', 'Structure', `Path: ${this.sourceInfo.path}`);
    this.log('INFO', 'Structure', `Version: ${this.sourceInfo.version || 'Not specified'}`);
  }

  async validateManifests() {
    console.log('\n📄 2. Manifest Validation\n');

    // Load manifests for later use
    if (this.sourceInfo.manifestPath && fs.existsSync(this.sourceInfo.manifestPath)) {
      try {
        const content = fs.readFileSync(this.sourceInfo.manifestPath, 'utf-8');
        this.manifestData = yaml.load(content);
        this.log('PASS', 'Manifest', 'manifest.yaml loaded successfully');
      } catch (error) {
        this.log('FAIL', 'Manifest', `Failed to parse manifest.yaml: ${error.message}`);
      }
    }

    if (this.sourceInfo.agentManifestPath && fs.existsSync(this.sourceInfo.agentManifestPath)) {
      try {
        const content = fs.readFileSync(this.sourceInfo.agentManifestPath, 'utf-8');
        this.agentManifest = parse(content, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });
        this.log('PASS', 'Manifest', `agent-manifest.csv loaded (${this.agentManifest.length} entries)`);
      } catch (error) {
        this.log('FAIL', 'Manifest', `Failed to parse agent-manifest.csv: ${error.message}`);
      }
    }
  }

  async validateModules() {
    console.log('\n📦 3. Module Structure Validation\n');

    let modules = [];
    
    if (this.manifestData?.modules) {
      modules = this.manifestData.modules.map(m => m.name);
    } else {
      const entries = fs.readdirSync(this.sourcePath, { withFileTypes: true });
      modules = entries
        .filter(entry => entry.isDirectory() && entry.name !== '_cfg')
        .map(entry => entry.name);
    }

    this.log('INFO', 'Modules', `Found ${modules.length} modules: ${modules.join(', ')}`);
    this.modules = modules;
  }

  async validateOfficialYamlFormat() {
    console.log('\n📋 4. Official YAML Schema Validation\n');

    const yamlAgents = [];
    
    // Find all .agent.yaml files
    for (const moduleName of this.modules) {
      const agentsDir = path.join(this.sourcePath, moduleName, 'agents');
      if (!fs.existsSync(agentsDir)) continue;
      
      const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.agent.yaml'));
      for (const file of files) {
        yamlAgents.push({
          module: moduleName,
          file,
          path: path.join(agentsDir, file)
        });
      }
    }

    if (yamlAgents.length === 0) {
      this.log('INFO', 'YAML Schema', 'No .agent.yaml files found (using MCP Markdown format)');
      return;
    }

    this.log('INFO', 'YAML Schema', `Found ${yamlAgents.length} official YAML agent files`);

    for (const agentInfo of yamlAgents) {
      await this.validateOfficialYamlAgent(agentInfo);
    }
  }

  async validateOfficialYamlAgent(agentInfo) {
    console.log(`\n   🔍 Validating YAML: ${agentInfo.module}/${agentInfo.file}`);

    const results = {
      name: path.basename(agentInfo.file, '.agent.yaml'),
      module: agentInfo.module,
      path: agentInfo.file,
      format: 'yaml',
      checks: []
    };

    try {
      const content = fs.readFileSync(agentInfo.path, 'utf-8');
      let agentData;

      try {
        agentData = yaml.load(content);
        results.checks.push({ type: 'PASS', check: 'Valid YAML syntax' });
      } catch (parseError) {
        results.checks.push({ type: 'FAIL', check: `YAML parse error: ${parseError.message}` });
        this.agentResults.set(results.name, results);
        return;
      }

      // Simulate file path for schema validation
      const isCore = agentInfo.module === 'core';
      const simulatedPath = isCore 
        ? `src/core/agents/${agentInfo.file}`
        : `src/modules/${agentInfo.module}/agents/${agentInfo.file}`;

      // Validate against official schema
      const validation = validateAgentFile(simulatedPath, agentData);
      
      if (validation.success) {
        results.checks.push({ type: 'PASS', check: 'Passes official BMAD v6 schema validation' });
        
        // Additional quality checks
        const agent = agentData.agent;
        
        // Check metadata quality
        if (agent.metadata) {
          if (agent.metadata.icon && /^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(agent.metadata.icon)) {
            results.checks.push({ type: 'PASS', check: 'Icon is a valid emoji' });
          } else {
            results.checks.push({ type: 'WARN', check: 'Icon should be a single emoji character' });
          }
        }

        // Check persona quality
        if (agent.persona) {
          if (agent.persona.principles && agent.persona.principles.length >= 3) {
            results.checks.push({ type: 'PASS', check: 'Has sufficient principles (3+)' });
          } else {
            results.checks.push({ type: 'WARN', check: 'Should have at least 3 principles for better guidance' });
          }
        }

        // Check menu commands
        if (agent.menu) {
          const hasHelp = agent.menu.some(item => item.trigger === 'help');
          const hasExit = agent.menu.some(item => item.trigger === 'exit');
          
          if (hasHelp) {
            results.checks.push({ type: 'PASS', check: 'Has help command' });
          } else {
            results.checks.push({ type: 'WARN', check: 'Should include help command' });
          }
          
          if (hasExit) {
            results.checks.push({ type: 'PASS', check: 'Has exit command' });
          } else {
            results.checks.push({ type: 'WARN', check: 'Should include exit command' });
          }
        }

      } else {
        results.checks.push({ type: 'FAIL', check: 'Failed official schema validation' });
        
        // Add specific error details
        for (const issue of validation.error.issues) {
          const errorPath = issue.path.join('.');
          results.checks.push({ 
            type: 'FAIL', 
            check: `${errorPath}: ${issue.message}` 
          });
        }
      }

    } catch (error) {
      results.checks.push({ type: 'FAIL', check: `Validation error: ${error.message}` });
    }

    this.agentResults.set(results.name, results);

    // Log results
    results.checks.forEach(check => {
      const icon = RESULT_TYPES[check.type];
      console.log(`      ${icon} ${check.check}`);
    });
  }

  async validateMcpMarkdownFormat() {
    console.log('\n📝 5. MCP-Compatible Markdown Validation\n');

    const markdownAgents = [];
    
    // Find all .md files in agent directories
    for (const moduleName of this.modules) {
      const agentsDir = path.join(this.sourcePath, moduleName, 'agents');
      if (!fs.existsSync(agentsDir)) continue;
      
      const files = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        markdownAgents.push({
          module: moduleName,
          file,
          path: path.join(agentsDir, file)
        });
      }
    }

    if (markdownAgents.length === 0) {
      this.log('INFO', 'Markdown', 'No .md agent files found (using official YAML format)');
      return;
    }

    this.log('INFO', 'Markdown', `Found ${markdownAgents.length} MCP-compatible Markdown agent files`);

    for (const agentInfo of markdownAgents) {
      await this.validateMcpMarkdownAgent(agentInfo);
    }
  }

  async validateMcpMarkdownAgent(agentInfo) {
    console.log(`\n   🔍 Validating Markdown: ${agentInfo.module}/${agentInfo.file}`);

    const results = {
      name: path.basename(agentInfo.file, '.md'),
      module: agentInfo.module,
      path: agentInfo.file,
      format: 'markdown',
      checks: []
    };

    try {
      const content = fs.readFileSync(agentInfo.path, 'utf-8');

      // Check BMAD-CORE header
      if (content.includes('<!-- Powered by BMAD-CORE™ -->')) {
        results.checks.push({ type: 'PASS', check: 'BMAD-CORE™ header present' });
      } else {
        results.checks.push({ type: 'FAIL', check: 'Missing BMAD-CORE™ header' });
      }

      // Check XML structure
      if (content.includes('<agent')) {
        results.checks.push({ type: 'PASS', check: 'Agent XML wrapper present' });
        
        // Check required sections
        const requiredSections = ['<persona>', '<cmds>'];
        for (const section of requiredSections) {
          if (content.includes(section)) {
            results.checks.push({ type: 'PASS', check: `${section} section present` });
          } else {
            results.checks.push({ type: 'FAIL', check: `${section} section missing` });
          }
        }

        // Check persona subsections
        if (content.includes('<persona>')) {
          const personaSubsections = ['<role>', '<identity>', '<communication_style>', '<principles>'];
          for (const subsection of personaSubsections) {
            if (content.includes(subsection)) {
              results.checks.push({ type: 'PASS', check: `${subsection} present` });
            } else {
              results.checks.push({ type: 'FAIL', check: `${subsection} missing` });
            }
          }
        }

        // Check v6 features
        if (content.includes('{project-root}')) {
          results.checks.push({ type: 'PASS', check: 'Uses v6 {project-root} placeholders' });
        } else {
          results.checks.push({ type: 'WARN', check: 'Consider using {project-root} placeholders for v6 compatibility' });
        }

      } else {
        results.checks.push({ type: 'FAIL', check: 'No agent XML structure found' });
      }

      // Check for placeholder content
      const placeholders = ['TODO', 'FILL THIS IN', 'PLACEHOLDER'];
      const hasPlaceholders = placeholders.some(p => content.toUpperCase().includes(p));
      if (!hasPlaceholders) {
        results.checks.push({ type: 'PASS', check: 'No placeholder text found' });
      } else {
        results.checks.push({ type: 'WARN', check: 'Contains placeholder text' });
      }

    } catch (error) {
      results.checks.push({ type: 'FAIL', check: `Read error: ${error.message}` });
    }

    this.agentResults.set(results.name, results);

    // Log results
    results.checks.forEach(check => {
      const icon = RESULT_TYPES[check.type];
      console.log(`      ${icon} ${check.check}`);
    });
  }

  async testMcpCompatibility() {
    console.log('\n🔧 6. MCP Tool Compatibility Test\n');

    try {
      const discovery = resolveBmadPaths({
        cwd: path.dirname(this.sourcePath),
        cliArgs: [],
        envVar: undefined,
        userBmadPath: undefined,
      });

      const masterService = new MasterManifestService(discovery);
      const tool = new UnifiedBMADTool({
        bmadRoot: path.dirname(this.sourcePath),
        discovery,
        masterManifestService: masterService,
      });

      // Test listing
      const listResult = tool.execute('*list-agents');
      if (listResult.success) {
        this.log('PASS', 'MCP', 'Agent listing works');
        const agentCount = (listResult.content?.match(/\d+\./g) || []).length;
        this.log('INFO', 'MCP', `MCP tool can load ${agentCount} agents`);
      } else {
        this.log('FAIL', 'MCP', `Agent listing failed: ${listResult.error}`);
      }

      // Test individual agents
      for (const [agentName] of this.agentResults) {
        try {
          const result = tool.execute(agentName);
          if (result.success) {
            this.log('PASS', 'MCP', `Agent '${agentName}' loads in MCP`);
          } else {
            this.log('FAIL', 'MCP', `Agent '${agentName}' MCP load failed: ${result.error}`);
          }
        } catch (error) {
          this.log('FAIL', 'MCP', `Agent '${agentName}' MCP error: ${error.message}`);
        }
      }

    } catch (error) {
      this.log('FAIL', 'MCP', `MCP tool setup failed: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n📊 Enhanced Validation Report\n');
    console.log('='.repeat(70));

    const stats = {
      total: this.results.length,
      pass: this.results.filter(r => r.type === 'PASS').length,
      warn: this.results.filter(r => r.type === 'WARN').length,
      fail: this.results.filter(r => r.type === 'FAIL').length,
      info: this.results.filter(r => r.type === 'INFO').length,
    };

    console.log(`📈 Overall Statistics:`);
    console.log(`   ${RESULT_TYPES.PASS} Passed: ${stats.pass}`);
    console.log(`   ${RESULT_TYPES.WARN} Warnings: ${stats.warn}`);
    console.log(`   ${RESULT_TYPES.FAIL} Failed: ${stats.fail}`);
    console.log(`   ${RESULT_TYPES.INFO} Info: ${stats.info}`);

    // Format breakdown
    const yamlAgents = Array.from(this.agentResults.values()).filter(a => a.format === 'yaml');
    const markdownAgents = Array.from(this.agentResults.values()).filter(a => a.format === 'markdown');
    
    console.log(`\n📋 Format Breakdown:`);
    console.log(`   📄 Official YAML (.agent.yaml): ${yamlAgents.length} agents`);
    console.log(`   📝 MCP Markdown (.md): ${markdownAgents.length} agents`);

    // Agent summary
    if (this.agentResults.size > 0) {
      console.log(`\n🤖 Agent Summary:`);
      for (const [agentName, result] of this.agentResults) {
        const agentStats = {
          pass: result.checks.filter(c => c.type === 'PASS').length,
          warn: result.checks.filter(c => c.type === 'WARN').length,
          fail: result.checks.filter(c => c.type === 'FAIL').length,
        };
        const status = agentStats.fail > 0 ? '❌' : agentStats.warn > 0 ? '⚠️' : '✅';
        const format = result.format === 'yaml' ? '📄' : '📝';
        console.log(`   ${status} ${format} ${result.module}/${agentName}: ${agentStats.pass}✅ ${agentStats.warn}⚠️ ${agentStats.fail}❌`);
      }
    }

    console.log(`\n💡 Recommendations:`);
    
    if (stats.fail === 0 && stats.warn === 0) {
      console.log(`   🎉 Excellent! Your v6 installation is fully compliant.`);
    } else if (stats.fail === 0) {
      console.log(`   👍 Good! Address ${stats.warn} warnings for best practices.`);
    } else {
      console.log(`   🔧 Fix ${stats.fail} critical issues and ${stats.warn} warnings.`);
    }

    if (yamlAgents.length > 0 && markdownAgents.length > 0) {
      console.log(`   🔄 Mixed formats detected. Consider standardizing on one format.`);
    }

    console.log(`   📖 Review: docs/validate-bmad-core-v6.md for guidelines.`);
    console.log(`   🔗 Official schema: https://github.com/bmad-code-org/BMAD-METHOD/tree/v6-alpha/tools/schema`);

    console.log('\n' + '='.repeat(70));

    return {
      valid: stats.fail === 0,
      stats,
      agentResults: Array.from(this.agentResults.values()),
    };
  }
}

// Main execution
async function main() {
  const targetPath = process.argv[2] || findDefaultV6Path();
  
  if (!targetPath) {
    console.error('❌ No v6 BMAD installation found.');
    console.error('Usage: node validate-bmad-v6-enhanced.mjs [path-to-v6-installation]');
    process.exit(1);
  }

  const validator = new EnhancedV6Validator(targetPath);
  const report = await validator.validate();
  
  process.exit(report.valid ? 0 : 1);
}

function findDefaultV6Path() {
  if (fs.existsSync('bmad') && fs.statSync('bmad').isDirectory()) {
    const cfgPath = path.join('bmad', '_cfg');
    if (fs.existsSync(cfgPath)) {
      return 'bmad';
    }
  }
  
  if (fs.existsSync('_cfg') && fs.statSync('_cfg').isDirectory()) {
    return '.';
  }
  
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}