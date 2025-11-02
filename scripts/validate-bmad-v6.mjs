#!/usr/bin/env node
/**
 * BMAD Core v6 Validation Script
 * 
 * Validates v6 BMAD installations against official formatting guidelines
 * and tests MCP tool compatibility.
 * 
 * Usage:
 *   node validate-bmad-v6.mjs [path-to-bmad-v6-folder]
 *   node validate-bmad-v6.mjs ./bmad
 *   node validate-bmad-v6.mjs /path/to/project/bmad
 * 
 * If no path provided, looks for ./bmad in current directory.
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { parse } from 'csv-parse/sync';
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

class V6Validator {
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
    console.log('🔍 BMAD Core v6 Validation Starting...\n');
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

    // 4. Agent File Validation
    await this.validateAgentFiles();

    // 5. MCP Tool Compatibility Test
    await this.testMcpCompatibility();

    return this.generateReport();
  }

  async validateStructure() {
    console.log('📋 1. Structure Validation\n');

    // Detect BMAD source
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

    // Check _cfg directory
    const cfgDir = path.join(this.sourcePath, '_cfg');
    if (fs.existsSync(cfgDir)) {
      this.log('PASS', 'Structure', '_cfg directory exists');
    } else {
      this.log('FAIL', 'Structure', '_cfg directory missing (required for v6)');
    }
  }

  async validateManifests() {
    console.log('\n📄 2. Manifest Validation\n');

    // Check manifest.yaml (optional but recommended)
    if (this.sourceInfo.manifestPath) {
      await this.validateManifestYaml();
    } else {
      this.log('INFO', 'Manifest', 'manifest.yaml not present (optional but recommended)');
    }

    // Check agent-manifest.csv (required or alternative)
    if (this.sourceInfo.agentManifestPath) {
      await this.validateAgentManifestCsv();
    } else {
      this.log('WARN', 'Manifest', 'agent-manifest.csv not found');
    }

    // Check workflow-manifest.csv (optional)
    if (this.sourceInfo.workflowManifestPath) {
      await this.validateWorkflowManifestCsv();
    } else {
      this.log('INFO', 'Manifest', 'workflow-manifest.csv not present (optional)');
    }
  }

  async validateManifestYaml() {
    try {
      const content = fs.readFileSync(this.sourceInfo.manifestPath, 'utf-8');
      this.manifestData = yaml.load(content);

      this.log('PASS', 'Manifest', 'manifest.yaml is valid YAML');

      // Check version in installation section
      if (this.manifestData?.installation?.version) {
        const version = this.manifestData.installation.version;
        const versionPattern = /^\d+\.\d+\.\d+(?:-.*)?$/;
        
        if (versionPattern.test(version)) {
          this.log('PASS', 'Manifest', `Version format is valid: ${version}`);
          
          // Check if major version is 6+ for v6
          const major = parseInt(version.split('.')[0]);
          if (major >= 6) {
            this.log('PASS', 'Manifest', `Version is v6 compatible: ${version}`);
          } else {
            this.log('WARN', 'Manifest', `Version ${version} is less than v6`);
          }
        } else {
          this.log('FAIL', 'Manifest', `Invalid version format: ${version}`);
        }
      } else {
        this.log('WARN', 'Manifest', 'manifest.yaml missing installation.version field');
      }

      // Check modules section
      if (this.manifestData?.modules && Array.isArray(this.manifestData.modules)) {
        this.log('PASS', 'Manifest', `Modules defined: ${this.manifestData.modules.length}`);
        
        for (const module of this.manifestData.modules) {
          if (module.name) {
            this.log('INFO', 'Manifest', `Module: ${module.name} (${module.source || 'unknown source'})`);
          }
        }
      } else {
        this.log('INFO', 'Manifest', 'No modules section (will infer from directory structure)');
      }

      // Check IDEs section
      if (this.manifestData?.ides && Array.isArray(this.manifestData.ides)) {
        this.log('INFO', 'Manifest', `Configured IDEs: ${this.manifestData.ides.join(', ')}`);
      }

    } catch (error) {
      this.log('FAIL', 'Manifest', `Failed to parse manifest.yaml: ${error.message}`);
    }
  }

  async validateAgentManifestCsv() {
    try {
      const content = fs.readFileSync(this.sourceInfo.agentManifestPath, 'utf-8');
      this.agentManifest = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      this.log('PASS', 'Manifest', 'agent-manifest.csv is valid CSV');
      this.log('INFO', 'Manifest', `Agent manifest contains ${this.agentManifest.length} entries`);

      // Validate required columns
      const requiredColumns = ['name', 'title', 'path', 'module'];
      const optionalColumns = ['role', 'type', 'tags', 'description'];
      
      if (this.agentManifest.length > 0) {
        const columns = Object.keys(this.agentManifest[0]);
        
        for (const col of requiredColumns) {
          if (columns.includes(col)) {
            this.log('PASS', 'Manifest', `Required column present: ${col}`);
          } else {
            this.log('FAIL', 'Manifest', `Required column missing: ${col}`);
          }
        }

        for (const col of optionalColumns) {
          if (columns.includes(col)) {
            this.log('INFO', 'Manifest', `Optional column present: ${col}`);
          }
        }
      }

      // Validate each entry
      for (const [index, agent] of this.agentManifest.entries()) {
        await this.validateAgentManifestEntry(agent, index + 1);
      }

    } catch (error) {
      this.log('FAIL', 'Manifest', `Failed to parse agent-manifest.csv: ${error.message}`);
    }
  }

  async validateAgentManifestEntry(agent, lineNumber) {
    const prefix = `Row ${lineNumber}`;

    // Check name format (kebab-case)
    if (agent.name) {
      const namePattern = /^[a-z]+(-[a-z]+)*$/;
      if (namePattern.test(agent.name)) {
        this.log('PASS', 'Manifest', `${prefix}: name follows kebab-case: ${agent.name}`);
      } else {
        this.log('WARN', 'Manifest', `${prefix}: name should be kebab-case: ${agent.name}`);
      }
    } else {
      this.log('FAIL', 'Manifest', `${prefix}: missing required name field`);
    }

    // Check module exists
    if (agent.module) {
      const modulePath = path.join(this.sourcePath, agent.module);
      if (fs.existsSync(modulePath)) {
        this.log('PASS', 'Manifest', `${prefix}: module directory exists: ${agent.module}`);
      } else {
        this.log('FAIL', 'Manifest', `${prefix}: module directory missing: ${agent.module}`);
      }
    } else {
      this.log('FAIL', 'Manifest', `${prefix}: missing required module field`);
    }

    // Check agent file exists
    if (agent.path && agent.module) {
      const agentPath = path.join(this.sourcePath, agent.module, agent.path);
      if (fs.existsSync(agentPath)) {
        this.log('PASS', 'Manifest', `${prefix}: agent file exists: ${agent.path}`);
      } else {
        this.log('FAIL', 'Manifest', `${prefix}: agent file missing: ${agentPath}`);
      }
    }

    // Check filename matches name
    if (agent.path && agent.name) {
      const expectedFilename = `${agent.name}.md`;
      const actualFilename = path.basename(agent.path);
      if (actualFilename === expectedFilename) {
        this.log('PASS', 'Manifest', `${prefix}: filename matches name`);
      } else {
        this.log('WARN', 'Manifest', `${prefix}: filename ${actualFilename} doesn't match name ${agent.name}`);
      }
    }
  }

  async validateWorkflowManifestCsv() {
    try {
      const content = fs.readFileSync(this.sourceInfo.workflowManifestPath, 'utf-8');
      const workflows = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      this.log('PASS', 'Manifest', 'workflow-manifest.csv is valid CSV');
      this.log('INFO', 'Manifest', `Workflow manifest contains ${workflows.length} entries`);

    } catch (error) {
      this.log('FAIL', 'Manifest', `Failed to parse workflow-manifest.csv: ${error.message}`);
    }
  }

  async validateModules() {
    console.log('\n📦 3. Module Structure Validation\n');

    // Get modules from manifest or discover from filesystem
    let modules = [];
    
    if (this.manifestData?.modules) {
      modules = this.manifestData.modules.map(m => m.name);
    } else {
      // Discover modules from directories
      const entries = fs.readdirSync(this.sourcePath, { withFileTypes: true });
      modules = entries
        .filter(entry => entry.isDirectory() && entry.name !== '_cfg')
        .map(entry => entry.name);
    }

    if (modules.length === 0) {
      this.log('WARN', 'Modules', 'No modules found');
      return;
    }

    this.log('INFO', 'Modules', `Found ${modules.length} modules: ${modules.join(', ')}`);

    for (const moduleName of modules) {
      await this.validateSingleModule(moduleName);
    }
  }

  async validateSingleModule(moduleName) {
    const modulePath = path.join(this.sourcePath, moduleName);
    
    console.log(`\n   📦 Validating module: ${moduleName}`);

    if (!fs.existsSync(modulePath)) {
      this.log('FAIL', 'Modules', `Module directory missing: ${moduleName}`);
      return;
    }

    // Check expected subdirectories
    const expectedDirs = ['agents', 'workflows', 'tasks'];
    for (const dir of expectedDirs) {
      const dirPath = path.join(modulePath, dir);
      if (fs.existsSync(dirPath)) {
        const fileCount = fs.readdirSync(dirPath).length;
        this.log('PASS', 'Modules', `${moduleName}/${dir}/ exists (${fileCount} files)`);
      } else {
        this.log('INFO', 'Modules', `${moduleName}/${dir}/ not present (optional)`);
      }
    }

    // Check for module config
    const configPath = path.join(modulePath, 'config.yaml');
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, 'utf-8');
        yaml.load(content);
        this.log('PASS', 'Modules', `${moduleName}/config.yaml is valid`);
      } catch (error) {
        this.log('WARN', 'Modules', `${moduleName}/config.yaml has syntax errors: ${error.message}`);
      }
    } else {
      this.log('INFO', 'Modules', `${moduleName}/config.yaml not present (optional)`);
    }

    // Check naming convention
    const namePattern = /^[a-z]+(-[a-z0-9]+)*$/;
    if (namePattern.test(moduleName)) {
      this.log('PASS', 'Modules', `Module name follows convention: ${moduleName}`);
    } else {
      this.log('WARN', 'Modules', `Module name should be lowercase-hyphen: ${moduleName}`);
    }
  }

  async validateAgentFiles() {
    console.log('\n🤖 4. Agent File Validation\n');

    if (this.agentManifest.length === 0) {
      this.log('WARN', 'Agents', 'No agents found in manifest');
      return;
    }

    for (const agentEntry of this.agentManifest) {
      if (agentEntry.name && agentEntry.module && agentEntry.path) {
        await this.validateSingleAgent(agentEntry);
      }
    }
  }

  async validateSingleAgent(agentEntry) {
    const agentPath = path.join(this.sourcePath, agentEntry.module, agentEntry.path);
    
    console.log(`\n   🔍 Validating: ${agentEntry.module}/${agentEntry.path}`);

    const results = {
      name: agentEntry.name,
      module: agentEntry.module,
      path: agentEntry.path,
      checks: []
    };

    if (!fs.existsSync(agentPath)) {
      results.checks.push({ type: 'FAIL', check: 'Agent file does not exist' });
      this.agentResults.set(agentEntry.name, results);
      return;
    }

    try {
      const content = fs.readFileSync(agentPath, 'utf-8');

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
      await this.validateAgentXML(content, results, agentEntry);

      // Check v6-specific features
      await this.validateV6Features(content, results, agentEntry);

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

    this.agentResults.set(agentEntry.name, results);

    // Log results for this agent
    results.checks.forEach(check => {
      const icon = RESULT_TYPES[check.type];
      console.log(`      ${icon} ${check.check}`);
    });
  }

  async validateAgentXML(content, results, agentEntry) {
    // Check for main agent wrapper with v6-style module-qualified id
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

        // Check if id follows v6 module-qualified pattern
        const idMatch = attributes.match(/id="([^"]+)"/);
        if (idMatch) {
          const id = idMatch[1];
          if (id.includes(`${agentEntry.module}/`)) {
            results.checks.push({ type: 'PASS', check: 'Agent id follows v6 module-qualified pattern' });
          } else {
            results.checks.push({ type: 'WARN', check: 'Agent id should include module path for v6' });
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
  }

  async validateV6Features(content, results, agentEntry) {
    // Check for v6-style workflow references with {project-root}
    const workflowRefs = content.match(/run-workflow="[^"]*"/g) || [];
    const projectRootRefs = workflowRefs.filter(ref => ref.includes('{project-root}'));
    
    if (workflowRefs.length > 0) {
      if (projectRootRefs.length === workflowRefs.length) {
        results.checks.push({ type: 'PASS', check: 'All workflow references use {project-root} placeholder' });
      } else {
        results.checks.push({ type: 'WARN', check: 'Some workflow references missing {project-root} placeholder' });
      }
    }

    // Check for v6-style critical actions with module loading
    if (content.includes('<critical-actions>')) {
      if (content.includes(`{project-root}/bmad/${agentEntry.module}/config.yaml`)) {
        results.checks.push({ type: 'PASS', check: 'Critical actions reference module config correctly' });
      } else if (content.includes('{project-root}/bmad/')) {
        results.checks.push({ type: 'WARN', check: 'Critical actions use v6 paths but may not reference correct module' });
      } else {
        results.checks.push({ type: 'INFO', check: 'Critical actions present but not using v6 module patterns' });
      }
    }

    // Check for v6-style activation rules
    if (content.includes('<activation critical="MANDATORY">')) {
      results.checks.push({ type: 'PASS', check: 'v6-style activation rules present' });
    }

    // Check for enhanced variable references
    const v6Variables = ['{project_name}', '{output_folder}', '{user_name}', '{communication_language}'];
    const foundVariables = v6Variables.filter(variable => content.includes(variable));
    
    if (foundVariables.length > 0) {
      results.checks.push({ type: 'PASS', check: `Uses v6 variables: ${foundVariables.join(', ')}` });
    }
  }

  async testMcpCompatibility() {
    console.log('\n🔧 5. MCP Tool Compatibility Test\n');

    try {
      // Set up MCP tool environment
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

      // Test module-qualified names if applicable
      for (const [agentName, agentResult] of this.agentResults) {
        if (agentResult.module !== 'core') {
          try {
            const qualifiedName = `${agentResult.module}/${agentName}`;
            const result = tool.execute(qualifiedName);
            if (result.success) {
              this.log('PASS', 'MCP', `Module-qualified agent '${qualifiedName}' loads`);
            } else {
              this.log('WARN', 'MCP', `Module-qualified agent '${qualifiedName}' failed: ${result.error}`);
            }
          } catch (error) {
            this.log('WARN', 'MCP', `Module-qualified load error for ${agentName}: ${error.message}`);
          }
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
        console.log(`   ${status} ${result.module}/${agentName}: ${agentStats.pass}✅ ${agentStats.warn}⚠️ ${agentStats.fail}❌`);
      }
    }

    // Module summary
    const modules = [...new Set(Array.from(this.agentResults.values()).map(a => a.module))];
    if (modules.length > 0) {
      console.log(`\n📦 Module Summary:`);
      for (const module of modules) {
        const moduleAgents = Array.from(this.agentResults.values()).filter(a => a.module === module);
        const moduleIssues = moduleAgents.reduce((sum, agent) => 
          sum + agent.checks.filter(c => c.type === 'FAIL').length, 0);
        const status = moduleIssues > 0 ? '❌' : '✅';
        console.log(`   ${status} ${module}: ${moduleAgents.length} agents, ${moduleIssues} issues`);
      }
    }

    // Recommendations
    console.log(`\n💡 Recommendations:`);
    
    const failCount = stats.fail;
    const warnCount = stats.warn;

    if (failCount === 0 && warnCount === 0) {
      console.log(`   🎉 Excellent! Your v6 installation meets all official guidelines.`);
    } else if (failCount === 0) {
      console.log(`   👍 Good! Address ${warnCount} warnings to improve quality.`);
    } else {
      console.log(`   🔧 Fix ${failCount} critical issues and ${warnCount} warnings.`);
      console.log(`   📖 Review: docs/validate-bmad-core-v6.md for detailed guidelines.`);
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

    if (warnChecks.some(r => r.message.includes('{project-root}'))) {
      recommendations.push('Use {project-root} placeholders in all workflow references for v6 compatibility');
    }

    if (failedChecks.some(r => r.message.includes('module'))) {
      recommendations.push('Ensure all modules referenced in manifests have corresponding directories');
    }

    if (warnChecks.some(r => r.message.includes('version'))) {
      recommendations.push('Add version information to manifest.yaml for better v6 compliance');
    }

    return recommendations;
  }
}

// Main execution
async function main() {
  const targetPath = process.argv[2] || findDefaultV6Path();
  
  if (!targetPath) {
    console.error('❌ No v6 BMAD installation found.');
    console.error('Usage: node validate-bmad-v6.mjs [path-to-v6-installation]');
    console.error('Expected: directory containing bmad/_cfg/');
    process.exit(1);
  }

  const validator = new V6Validator(targetPath);
  const report = await validator.validate();
  
  process.exit(report.valid ? 0 : 1);
}

function findDefaultV6Path() {
  // Look for bmad directory in current directory
  if (fs.existsSync('bmad') && fs.statSync('bmad').isDirectory()) {
    const cfgPath = path.join('bmad', '_cfg');
    if (fs.existsSync(cfgPath)) {
      return 'bmad';
    }
  }
  
  // Look for _cfg directory directly (if we're already in bmad/)
  if (fs.existsSync('_cfg') && fs.statSync('_cfg').isDirectory()) {
    return '.';
  }
  
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}