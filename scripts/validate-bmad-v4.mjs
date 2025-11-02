#!/usr/bin/env node
/**
 * BMAD Core v4 Validation Script
 * 
 * Validates v4 BMAD installations against official formatting guidelines
 * and tests MCP tool compatibility.
 * 
 * Usage:
 *   node validate-bmad-v4.mjs [path-to-bmad-v4-folder]
 *   node validate-bmad-v4.mjs .bmad-core
 *   node validate-bmad-v4.mjs /path/to/.bmad-custom
 * 
 * If no path provided, looks for .bmad or .bmad-core in current directory.
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { detectBmadSource } from '../build/utils/bmad-source-detector.js';
import { resolveBmadPaths } from '../build/utils/bmad-path-resolver.js';
import { MasterManifestService } from '../build/services/master-manifest-service.js';
import { UnifiedBMADTool } from '../build/tools/index.js';

// Validation result types
const RESULT_TYPES = {
  PASS: '✅',
  WARN: '⚠️',
  FAIL: '❌',
  INFO: 'ℹ️'
};

class V4Validator {
  constructor(sourcePath) {
    this.sourcePath = path.resolve(sourcePath);
    this.results = [];
    this.agentResults = new Map();
    this.sourceInfo = null;
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
    console.log('🔍 BMAD Core v4 Validation Starting...\n');
    console.log(`📁 Validating: ${this.sourcePath}\n`);

    // 1. Structure Detection
    await this.validateStructure();
    
    if (!this.sourceInfo?.isValid) {
      return this.generateReport();
    }

    // 2. Manifest Validation
    await this.validateManifests();

    // 3. Agent File Validation
    await this.validateAgentFiles();

    // 4. MCP Tool Compatibility Test
    await this.testMcpCompatibility();

    return this.generateReport();
  }

  async validateStructure() {
    console.log('📋 1. Structure Validation\n');

    // Detect BMAD source
    this.sourceInfo = detectBmadSource(this.sourcePath);

    if (!this.sourceInfo.isValid) {
      this.log('FAIL', 'Structure', `Invalid BMAD v4 structure: ${this.sourceInfo.error}`);
      return;
    }

    if (this.sourceInfo.type !== 'v4') {
      this.log('FAIL', 'Structure', `Expected v4 structure, found: ${this.sourceInfo.type}`);
      return;
    }

    this.log('PASS', 'Structure', 'Valid v4 BMAD structure detected');
    this.log('INFO', 'Structure', `Path: ${this.sourceInfo.path}`);
    this.log('INFO', 'Structure', `Version: ${this.sourceInfo.version}`);

    // Check directory structure
    const requiredDirs = [
      { path: path.join(this.sourceInfo.path, 'agents'), name: 'agents/' },
      { path: path.join(this.sourceInfo.path, 'workflows'), name: 'workflows/' }
    ];

    for (const dir of requiredDirs) {
      if (fs.existsSync(dir.path)) {
        this.log('PASS', 'Structure', `${dir.name} directory exists`);
      } else {
        this.log('WARN', 'Structure', `${dir.name} directory missing (optional but recommended)`);
      }
    }
  }

  async validateManifests() {
    console.log('\n📄 2. Manifest Validation\n');

    // Check install-manifest.yaml
    if (this.sourceInfo.manifestPath) {
      await this.validateInstallManifest();
    } else {
      this.log('WARN', 'Manifest', 'install-manifest.yaml not found');
    }

    // Check core-config.yaml
    const coreConfigPath = path.join(this.sourceInfo.path, 'core-config.yaml');
    if (fs.existsSync(coreConfigPath)) {
      await this.validateCoreConfig(coreConfigPath);
    } else {
      this.log('INFO', 'Manifest', 'core-config.yaml not present (optional)');
    }
  }

  async validateInstallManifest() {
    try {
      const content = fs.readFileSync(this.sourceInfo.manifestPath, 'utf-8');
      const manifest = yaml.load(content);

      this.log('PASS', 'Manifest', 'install-manifest.yaml is valid YAML');

      // Check required fields
      const requiredFields = ['version', 'installed_at', 'install_type'];
      for (const field of requiredFields) {
        if (manifest[field]) {
          this.log('PASS', 'Manifest', `install-manifest.yaml has required field: ${field}`);
        } else {
          this.log('WARN', 'Manifest', `install-manifest.yaml missing recommended field: ${field}`);
        }
      }

      // Validate version format
      if (manifest.version) {
        const versionPattern = /^\d+\.\d+\.\d+(?:-.*)?$/;
        if (versionPattern.test(manifest.version)) {
          this.log('PASS', 'Manifest', `Version format is valid: ${manifest.version}`);
        } else {
          this.log('FAIL', 'Manifest', `Invalid version format: ${manifest.version}`);
        }
      }

      // Check expansion packs
      if (manifest.expansion_packs && Array.isArray(manifest.expansion_packs)) {
        this.log('INFO', 'Manifest', `Expansion packs: ${manifest.expansion_packs.length}`);
      }

    } catch (error) {
      this.log('FAIL', 'Manifest', `Failed to parse install-manifest.yaml: ${error.message}`);
    }
  }

  async validateCoreConfig(configPath) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const config = yaml.load(content);

      this.log('PASS', 'Manifest', 'core-config.yaml is valid YAML');

      if (config.version) {
        this.log('INFO', 'Manifest', `core-config.yaml version: ${config.version}`);
      }

    } catch (error) {
      this.log('FAIL', 'Manifest', `Failed to parse core-config.yaml: ${error.message}`);
    }
  }

  async validateAgentFiles() {
    console.log('\n🤖 3. Agent File Validation\n');

    if (!this.sourceInfo.agentDir || !fs.existsSync(this.sourceInfo.agentDir)) {
      this.log('WARN', 'Agents', 'No agents directory found');
      return;
    }

    const agentFiles = fs.readdirSync(this.sourceInfo.agentDir)
      .filter(file => file.endsWith('.md'))
      .sort();

    if (agentFiles.length === 0) {
      this.log('WARN', 'Agents', 'No agent files found');
      return;
    }

    this.log('INFO', 'Agents', `Found ${agentFiles.length} agent files`);

    for (const agentFile of agentFiles) {
      await this.validateSingleAgent(agentFile);
    }
  }

  async validateSingleAgent(filename) {
    const agentPath = path.join(this.sourceInfo.agentDir, filename);
    const agentName = path.basename(filename, '.md');
    
    console.log(`\n   🔍 Validating: ${filename}`);

    const results = {
      filename,
      agentName,
      checks: []
    };

    try {
      const content = fs.readFileSync(agentPath, 'utf-8');

      // Check file naming convention
      const kebabCasePattern = /^[a-z]+(-[a-z]+)*\.md$/;
      if (kebabCasePattern.test(filename)) {
        results.checks.push({ type: 'PASS', check: 'Filename follows kebab-case convention' });
      } else {
        results.checks.push({ type: 'WARN', check: 'Filename should follow kebab-case convention' });
      }

      // Check required header
      if (content.includes('<!-- Powered by BMAD-CORE™ -->')) {
        results.checks.push({ type: 'PASS', check: 'BMAD-CORE™ header present' });
      } else {
        results.checks.push({ type: 'FAIL', check: 'Missing BMAD-CORE™ header' });
      }

      // Check title section
      const titlePattern = /^# .+$/m;
      if (titlePattern.test(content)) {
        results.checks.push({ type: 'PASS', check: 'Title section present' });
      } else {
        results.checks.push({ type: 'WARN', check: 'Title section missing or malformed' });
      }

      // Check XML structure
      await this.validateAgentXML(content, results);

      // Check for placeholder content
      const placeholders = ['TODO', 'FILL THIS IN', 'PLACEHOLDER', 'REPLACE THIS'];
      const hasPlaceholders = placeholders.some(p => content.toUpperCase().includes(p));
      if (!hasPlaceholders) {
        results.checks.push({ type: 'PASS', check: 'No placeholder text found' });
      } else {
        results.checks.push({ type: 'WARN', check: 'Contains placeholder text that should be replaced' });
      }

    } catch (error) {
      results.checks.push({ type: 'FAIL', check: `Failed to read agent file: ${error.message}` });
    }

    this.agentResults.set(agentName, results);

    // Log results for this agent
    results.checks.forEach(check => {
      const icon = RESULT_TYPES[check.type];
      console.log(`      ${icon} ${check.check}`);
    });
  }

  async validateAgentXML(content, results) {
    // Check for main agent wrapper
    const agentTagPattern = /<agent\s+[^>]*>/;
    if (agentTagPattern.test(content)) {
      results.checks.push({ type: 'PASS', check: 'Main <agent> wrapper present' });

      // Check required attributes
      const agentMatch = content.match(/<agent\s+([^>]*?)>/);
      if (agentMatch) {
        const attributes = agentMatch[1];
        const requiredAttrs = ['id', 'name', 'title', 'icon'];
        
        for (const attr of requiredAttrs) {
          if (attributes.includes(`${attr}=`)) {
            results.checks.push({ type: 'PASS', check: `Agent has required ${attr} attribute` });
          } else {
            results.checks.push({ type: 'FAIL', check: `Agent missing required ${attr} attribute` });
          }
        }
      }
    } else {
      results.checks.push({ type: 'FAIL', check: 'Main <agent> wrapper missing' });
    }

    // Check persona section
    if (content.includes('<persona>')) {
      results.checks.push({ type: 'PASS', check: '<persona> section present' });

      const personaSections = ['<role>', '<identity>', '<communication_style>', '<principles>'];
      for (const section of personaSections) {
        if (content.includes(section)) {
          results.checks.push({ type: 'PASS', check: `${section} section present` });
        } else {
          results.checks.push({ type: 'FAIL', check: `${section} section missing` });
        }
      }
    } else {
      results.checks.push({ type: 'FAIL', check: '<persona> section missing' });
    }

    // Check commands section
    if (content.includes('<cmds>')) {
      results.checks.push({ type: 'PASS', check: '<cmds> section present' });

      // Check for required commands
      const requiredCommands = ['*help', '*exit'];
      for (const cmd of requiredCommands) {
        if (content.includes(`cmd="${cmd}"`)) {
          results.checks.push({ type: 'PASS', check: `Required command ${cmd} present` });
        } else {
          results.checks.push({ type: 'WARN', check: `Required command ${cmd} missing` });
        }
      }

      // Count total commands
      const commandMatches = content.match(/cmd="\*[^"]+"/g);
      if (commandMatches && commandMatches.length >= 2) {
        results.checks.push({ type: 'PASS', check: `Has ${commandMatches.length} commands (minimum 2)` });
      } else {
        results.checks.push({ type: 'WARN', check: 'Should have at least 2 commands (*help and *exit)' });
      }
    } else {
      results.checks.push({ type: 'FAIL', check: '<cmds> section missing' });
    }

    // Check XML well-formedness (basic)
    const openTags = (content.match(/<[^/][^>]*>/g) || []).length;
    const closeTags = (content.match(/<\/[^>]+>/g) || []).length;
    const selfClosing = (content.match(/<[^>]*\/>/g) || []).length;
    
    if (openTags === closeTags + selfClosing) {
      results.checks.push({ type: 'PASS', check: 'XML tags appear balanced' });
    } else {
      results.checks.push({ type: 'WARN', check: 'XML tags may be unbalanced - verify structure' });
    }
  }

  async testMcpCompatibility() {
    console.log('\n🔧 4. MCP Tool Compatibility Test\n');

    try {
      // Set up MCP tool environment
      const discovery = resolveBmadPaths({
        cwd: this.sourceInfo.path,
        cliArgs: [],
        envVar: this.sourceInfo.path,
        userBmadPath: this.sourceInfo.path,
      });

      const masterService = new MasterManifestService(discovery);
      const tool = new UnifiedBMADTool({
        bmadRoot: this.sourceInfo.path,
        discovery,
        masterManifestService: masterService,
      });

      // Test listing agents
      const listResult = tool.execute('*list-agents');
      if (listResult.success) {
        this.log('PASS', 'MCP', 'Agent listing works');
        
        // Extract agent count from content
        const agentCount = (listResult.content?.match(/\d+\./g) || []).length;
        this.log('INFO', 'MCP', `Found ${agentCount} loadable agents`);
      } else {
        this.log('FAIL', 'MCP', `Agent listing failed: ${listResult.error}`);
      }

      // Test loading individual agents
      for (const [agentName] of this.agentResults) {
        try {
          const result = tool.execute(agentName);
          if (result.success) {
            this.log('PASS', 'MCP', `Agent '${agentName}' loads successfully`);
          } else {
            this.log('FAIL', 'MCP', `Agent '${agentName}' failed to load: ${result.error}`);
          }
        } catch (error) {
          this.log('FAIL', 'MCP', `Agent '${agentName}' load error: ${error.message}`);
        }
      }

    } catch (error) {
      this.log('FAIL', 'MCP', `MCP tool setup failed: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n📊 Validation Report\n');
    console.log('='.repeat(60));

    // Summary statistics
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

    // Agent-specific summary
    if (this.agentResults.size > 0) {
      console.log(`\n🤖 Agent Summary:`);
      for (const [agentName, result] of this.agentResults) {
        const agentStats = {
          pass: result.checks.filter(c => c.type === 'PASS').length,
          warn: result.checks.filter(c => c.type === 'WARN').length,
          fail: result.checks.filter(c => c.type === 'FAIL').length,
        };
        const status = agentStats.fail > 0 ? '❌' : agentStats.warn > 0 ? '⚠️' : '✅';
        console.log(`   ${status} ${agentName}: ${agentStats.pass}✅ ${agentStats.warn}⚠️ ${agentStats.fail}❌`);
      }
    }

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    
    const failCount = stats.fail;
    const warnCount = stats.warn;

    if (failCount === 0 && warnCount === 0) {
      console.log(`   🎉 Excellent! Your v4 installation meets all official guidelines.`);
    } else if (failCount === 0) {
      console.log(`   👍 Good! Address ${warnCount} warnings to improve quality.`);
    } else {
      console.log(`   🔧 Fix ${failCount} critical issues and ${warnCount} warnings.`);
      console.log(`   📖 Review: docs/validate-bmad-core-v4.md for detailed guidelines.`);
    }

    console.log('\n' + '='.repeat(60));

    return {
      valid: failCount === 0,
      stats,
      agentResults: Array.from(this.agentResults.values()),
      recommendations: this.generateRecommendations()
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Analyze patterns in results
    const failedChecks = this.results.filter(r => r.type === 'FAIL');
    const warnChecks = this.results.filter(r => r.type === 'WARN');

    if (failedChecks.some(r => r.message.includes('BMAD-CORE™'))) {
      recommendations.push('Add "<!-- Powered by BMAD-CORE™ -->" header to all agent files');
    }

    if (failedChecks.some(r => r.message.includes('persona'))) {
      recommendations.push('Ensure all agents have complete <persona> sections with role, identity, communication_style, and principles');
    }

    if (warnChecks.some(r => r.message.includes('placeholder'))) {
      recommendations.push('Replace all placeholder text (TODO, FILL THIS IN) with actual content');
    }

    if (warnChecks.some(r => r.message.includes('kebab-case'))) {
      recommendations.push('Use kebab-case naming for agent files (e.g., my-agent.md)');
    }

    return recommendations;
  }
}

// Main execution
async function main() {
  const targetPath = process.argv[2] || findDefaultV4Path();
  
  if (!targetPath) {
    console.error('❌ No v4 BMAD installation found.');
    console.error('Usage: node validate-bmad-v4.mjs [path-to-v4-installation]');
    console.error('Expected: .bmad/, .bmad-core/, or directory with install-manifest.yaml');
    process.exit(1);
  }

  const validator = new V4Validator(targetPath);
  const report = await validator.validate();
  
  process.exit(report.valid ? 0 : 1);
}

function findDefaultV4Path() {
  const candidates = ['.bmad', '.bmad-core'];
  
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }
  
  // Check for install-manifest.yaml in current directory
  if (fs.existsSync('install-manifest.yaml')) {
    return '.';
  }
  
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}