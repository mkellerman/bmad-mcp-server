#!/usr/bin/env node
/**
 * BMAD Git URL Validation Script
 * 
 * Validates that BMAD MCP server can properly load Git URLs with different branches
 * and handle various manifest.yaml module formats.
 * 
 * Usage:
 *   node validate-bmad-git-url.mjs
 *   node validate-bmad-git-url.mjs --test-branch=v6-alpha
 *   node validate-bmad-git-url.mjs --test-custom-git-url=git+https://github.com/user/repo.git#branch:/path
 */

import fs from 'node:fs';
import path from 'node:path';
import { GitSourceResolver } from '../build/utils/git-source-resolver.js';
import { detectBmadSource } from '../build/utils/bmad-source-detector.js';
import { MasterManifestService } from '../build/services/master-manifest-service.js';

// Test configuration
const DEFAULT_REPO = 'git+https://github.com/bmad-code-org/BMAD-METHOD.git';
const TEST_BRANCHES = ['main', 'v6-alpha'];
const CACHE_DIR = path.join(process.env.HOME || '/tmp', '.bmad', 'cache', 'git');

class GitUrlValidator {
  constructor() {
    this.results = [];
    this.gitResolver = new GitSourceResolver();
  }

  log(type, category, message, details = null) {
    const icons = {
      PASS: '✅',
      WARN: '⚠️', 
      FAIL: '❌',
      INFO: 'ℹ️'
    };
    
    const result = { type, category, message, details, timestamp: new Date().toISOString() };
    this.results.push(result);
    
    const icon = icons[type] || 'ℹ️';
    console.log(`${icon} [${category}] ${message}`);
    if (details) {
      console.log(`   ${details}`);
    }
  }

  async testGitUrlResolution(gitUrl) {
    console.log(`\n🔗 Testing Git URL Resolution: ${gitUrl}\n`);
    
    try {
      // Test Git URL parsing
      this.log('INFO', 'Git', `Testing URL: ${gitUrl}`);
      
      // Resolve the Git URL
      const resolvedPath = await this.gitResolver.resolve(gitUrl);
      
      if (!resolvedPath) {
        this.log('FAIL', 'Git', 'Failed to resolve Git URL');
        return null;
      }
      
      this.log('PASS', 'Git', 'Git URL resolved successfully', `Path: ${resolvedPath}`);
      
      // Test if the resolved path contains BMAD structure
      const bmadRoot = path.join(resolvedPath);
      if (!fs.existsSync(bmadRoot)) {
        this.log('FAIL', 'Structure', 'Resolved path does not exist');
        return null;
      }
      
      // Test BMAD detection
      const detection = detectBmadSource(bmadRoot);
      if (!detection.isValid) {
        this.log('FAIL', 'Detection', 'BMAD structure not detected', detection.error);
        return null;
      }
      
      this.log('PASS', 'Detection', `Detected ${detection.type} BMAD installation`);
      
      return { resolvedPath, detection };
      
    } catch (error) {
      this.log('FAIL', 'Git', 'Git URL resolution failed', error.message);
      return null;
    }
  }

  async testBranchSwitching() {
    console.log(`\n🌲 Testing Branch Switching\n`);
    
    const branchResults = {};
    
    for (const branch of TEST_BRANCHES) {
      const gitUrl = `${DEFAULT_REPO}#${branch}:/bmad`;
      this.log('INFO', 'Branch', `Testing branch: ${branch}`);
      
      const result = await this.testGitUrlResolution(gitUrl);
      if (result) {
        branchResults[branch] = result;
        this.log('PASS', 'Branch', `Branch ${branch} loaded successfully`);
      } else {
        this.log('FAIL', 'Branch', `Branch ${branch} failed to load`);
      }
    }
    
    // Test that different branches use different caches
    if (branchResults.main && branchResults['v6-alpha']) {
      const mainPath = branchResults.main.resolvedPath;
      const alphaPath = branchResults['v6-alpha'].resolvedPath;
      
      if (mainPath !== alphaPath) {
        this.log('PASS', 'Cache', 'Different branches use separate cache directories');
      } else {
        this.log('FAIL', 'Cache', 'Different branches using same cache directory');
      }
    }
    
    return branchResults;
  }

  async testModuleFormatCompatibility(resolvedPath) {
    console.log(`\n📦 Testing Module Format Compatibility\n`);
    
    try {
      // Test module detection with the actual manifest
      const manifestPath = path.join(resolvedPath, '_cfg', 'manifest.yaml');
      
      if (!fs.existsSync(manifestPath)) {
        this.log('WARN', 'Manifest', 'No manifest.yaml found, skipping module format test');
        return;
      }
      
      // Read manifest to verify it exists
      fs.readFileSync(manifestPath, 'utf-8');
      this.log('INFO', 'Manifest', 'Found manifest.yaml');
      
      // Test BMAD detection (this will test our module parsing fixes)
      const detection = detectBmadSource(resolvedPath);
      
      if (detection.modules && detection.modules.length > 0) {
        this.log('PASS', 'Modules', `Detected ${detection.modules.length} modules: ${detection.modules.join(', ')}`);
        
        // Test each module format
        for (const module of detection.modules) {
          if (typeof module === 'string') {
            this.log('PASS', 'Format', `Module "${module}" parsed as string format`);
          } else {
            this.log('INFO', 'Format', `Module "${module}" parsed as object format`);
          }
        }
      } else {
        this.log('WARN', 'Modules', 'No modules detected in manifest');
      }
      
    } catch (error) {
      this.log('FAIL', 'Modules', 'Module format test failed', error.message);
    }
  }

  async testMcpServerIntegration(resolvedPath) {
    console.log(`\n🔧 Testing MCP Server Integration\n`);
    
    try {
      // Test that MCP server components can load the Git-resolved path
      this.log('INFO', 'MCP', 'Testing master manifest service initialization');
      
      const masterService = new MasterManifestService([resolvedPath]);
      
      // Test basic master service functionality
      this.log('INFO', 'MCP', 'Getting master manifest data');
      
      const masterData = masterService.get();
      
      if (masterData && masterData.agents && masterData.workflows) {
        this.log('PASS', 'MCP', 'Master manifest service loaded Git-resolved path');
        this.log('INFO', 'MCP', `Found ${masterData.agents.length} agents and ${masterData.workflows.length} workflows`);
        
        // Basic structural validation
        if (masterData.agents.length > 0) {
          this.log('PASS', 'MCP', 'Agents successfully loaded from Git URL');
        }
        if (masterData.workflows.length > 0) {
          this.log('PASS', 'MCP', 'Workflows successfully loaded from Git URL');
        }
      } else {
        this.log('FAIL', 'MCP', 'Master manifest service failed to load data');
      }
      
    } catch (error) {
      this.log('FAIL', 'MCP', 'MCP integration test failed', error.message);
    }
  }

  async testCacheManagement() {
    console.log(`\n🗂️ Testing Cache Management\n`);
    
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        this.log('INFO', 'Cache', 'No Git cache directory found');
        return;
      }
      
      const cacheEntries = fs.readdirSync(CACHE_DIR)
        .filter(entry => entry.includes('BMAD-METHOD'))
        .map(entry => {
          const parts = entry.split('-');
          const branch = parts[parts.length - 2]; // Extract branch name
          return { entry, branch };
        });
      
      if (cacheEntries.length === 0) {
        this.log('INFO', 'Cache', 'No BMAD-METHOD cache entries found');
        return;
      }
      
      this.log('PASS', 'Cache', `Found ${cacheEntries.length} cache entries`);
      
      // Check for branch-specific caches
      const branches = new Set(cacheEntries.map(e => e.branch));
      for (const branch of branches) {
        this.log('INFO', 'Cache', `Cache exists for branch: ${branch}`);
      }
      
      if (branches.size > 1) {
        this.log('PASS', 'Cache', 'Multiple branch caches detected - branch isolation working');
      }
      
    } catch (error) {
      this.log('FAIL', 'Cache', 'Cache management test failed', error.message);
    }
  }

  async runValidation(customGitUrl = null, testBranch = null) {
    console.log('🚀 BMAD Git URL Validation\n');
    console.log('='.repeat(50));
    
    try {
      // 1. Test basic Git URL resolution
      const gitUrl = customGitUrl || `${DEFAULT_REPO}#${testBranch || 'v6-alpha'}:/bmad`;
      const result = await this.testGitUrlResolution(gitUrl);
      
      if (!result) {
        this.log('FAIL', 'Overall', 'Basic Git URL resolution failed - aborting further tests');
        return;
      }
      
      // 2. Test branch switching (if using default repo)
      if (!customGitUrl) {
        await this.testBranchSwitching();
      }
      
      // 3. Test module format compatibility
      await this.testModuleFormatCompatibility(result.resolvedPath);
      
      // 4. Test MCP server integration
      await this.testMcpServerIntegration(result.resolvedPath);
      
      // 5. Test cache management
      await this.testCacheManagement();
      
    } catch (error) {
      this.log('FAIL', 'Overall', 'Validation failed with error', error.message);
    }
    
    // Print summary
    this.printSummary();
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(50));
    
    const counts = this.results.reduce((acc, result) => {
      acc[result.type] = (acc[result.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`✅ Pass: ${counts.PASS || 0}`);
    console.log(`⚠️  Warn: ${counts.WARN || 0}`);
    console.log(`❌ Fail: ${counts.FAIL || 0}`);
    console.log(`ℹ️  Info: ${counts.INFO || 0}`);
    
    const hasFailures = counts.FAIL > 0;
    const hasWarnings = counts.WARN > 0;
    
    if (hasFailures) {
      console.log('\n❌ VALIDATION FAILED - See failures above');
      process.exit(1);
    } else if (hasWarnings) {
      console.log('\n⚠️  VALIDATION PASSED WITH WARNINGS');
      process.exit(0);
    } else {
      console.log('\n✅ ALL VALIDATIONS PASSED');
      process.exit(0);
    }
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    customGitUrl: null,
    testBranch: null,
  };
  
  for (const arg of args) {
    if (arg.startsWith('--test-custom-git-url=')) {
      options.customGitUrl = arg.split('=')[1];
    } else if (arg.startsWith('--test-branch=')) {
      options.testBranch = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
BMAD Git URL Validation Script

Usage:
  node validate-bmad-git-url.mjs [options]

Options:
  --test-branch=BRANCH         Test specific branch (default: v6-alpha)
  --test-custom-git-url=URL    Test custom Git URL
  --help, -h                   Show this help

Examples:
  node validate-bmad-git-url.mjs
  node validate-bmad-git-url.mjs --test-branch=main
  node validate-bmad-git-url.mjs --test-custom-git-url=git+https://github.com/user/repo.git#branch:/path
`);
      process.exit(0);
    }
  }
  
  return options;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  const validator = new GitUrlValidator();
  
  validator.runValidation(options.customGitUrl, options.testBranch)
    .catch(error => {
      console.error('❌ Validation script error:', error);
      process.exit(1);
    });
}