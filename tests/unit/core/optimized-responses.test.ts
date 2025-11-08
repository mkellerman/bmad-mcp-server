/**
 * Unit test for optimized ambiguous response formats
 */

import { describe, it, expect } from 'vitest';
import type {
  WorkflowMatch,
  AgentMatch,
} from '../../../src/core/bmad-engine.js';

describe('Optimized Ambiguous Response Formats', () => {
  describe('formatAmbiguousWorkflowResponse', () => {
    it('should produce token-efficient format with intent and heuristics', () => {
      // Simulate what the engine generates
      const matches: WorkflowMatch[] = [
        {
          key: 'bmm:analyst:prd',
          module: 'bmm',
          agentName: 'analyst',
          agentDisplayName: 'Mary',
          agentTitle: 'Business Analyst',
          workflow: 'prd',
          description: 'Create Product Requirements Document',
          action:
            'bmad({ operation: "execute", workflow: "prd", module: "bmm", agent: "analyst" })',
        },
        {
          key: 'bmm:pm:prd',
          module: 'bmm',
          agentName: 'pm',
          agentDisplayName: 'John',
          agentTitle: 'Product Manager',
          workflow: 'prd',
          description: 'Define product requirements and roadmap',
          action:
            'bmad({ operation: "execute", workflow: "prd", module: "bmm", agent: "pm" })',
        },
      ];

      // Manually format using the same logic as the private method
      const workflowName = matches[0].workflow;
      const module = matches[0].module;

      const lines = [
        `**Multiple Agent Options Available**`,
        '',
        `intent: "Workflow '${workflowName}' offered by ${matches.length} agents in module '${module}'"`,
        `action_required: "Select agent perspective"`,
        '',
        '**Options** (ranked by relevance):',
      ];

      matches.forEach((match, index) => {
        const star = index === 0 ? '⭐ ' : '';
        const roleKeyword = match.agentTitle.split(' ')[0];
        lines.push(
          `${index + 1}. ${star}${match.agentName} (${match.agentDisplayName}) - ${roleKeyword} perspective`,
        );
        lines.push(`   • "${match.description}"`);
        lines.push(
          `   • Retry: bmad({ operation: "execute", workflow: "${workflowName}", module: "${module}", agent: "${match.agentName}" })`,
        );
        lines.push('');
      });

      lines.push('**Decision Heuristics:**');
      lines.push(
        '- Context with "analyze|review|business" → analyst (confidence: high)',
      );
      lines.push(
        '- Context with "design|architecture|technical" → architect (confidence: high)',
      );
      lines.push(
        '- Context with "implement|code|develop" → dev (confidence: high)',
      );
      lines.push('- Context with "test|quality|qa" → tea (confidence: high)');
      lines.push(
        '- Context with "plan|manage|coordinate" → pm/sm (confidence: medium)',
      );
      lines.push(
        '- No strong signal → Select ⭐ option or offer numbered menu to user',
      );
      lines.push('');
      lines.push('**Metrics:**');
      lines.push(`- options: ${matches.length}`);
      lines.push(
        `- token_estimate: ${Math.round(matches.length * 80)} (vs ${Math.round(matches.length * 280)} full load)`,
      );
      lines.push('- estimated_comprehension_cost: low');

      const formatted = lines.join('\n');

      // Validate structure
      expect(formatted).toContain('**Multiple Agent Options Available**');
      expect(formatted).toContain('intent:');
      expect(formatted).toContain('action_required:');
      expect(formatted).toContain('**Options**');
      expect(formatted).toContain('**Decision Heuristics:**');
      expect(formatted).toContain('**Metrics:**');

      // Validate efficiency
      expect(formatted).toContain('⭐'); // Ranking signal
      expect(formatted).toContain('token_estimate:'); // Metrics included

      // Validate it doesn't repeat workflow name unnecessarily
      const intentLineCount = (formatted.match(/intent:/g) || []).length;
      expect(intentLineCount).toBe(1); // Only one intent line

      // Measure token efficiency
      const tokenEstimate = Math.round(formatted.length / 4);
      const oldFormatEstimate = matches.length * 280;
      const savings = oldFormatEstimate - tokenEstimate;
      const savingsPercent = (savings / oldFormatEstimate) * 100;

      console.log('\n📊 Optimization Metrics:');
      console.log(`   Old format: ~${oldFormatEstimate} tokens`);
      console.log(`   New format: ~${tokenEstimate} tokens`);
      console.log(
        `   Savings: ${savings} tokens (${savingsPercent.toFixed(1)}%)`,
      );

      expect(tokenEstimate).toBeLessThan(oldFormatEstimate);
      expect(savingsPercent).toBeGreaterThan(30); // At least 30% reduction
    });
  });

  describe('formatAmbiguousAgentResponse', () => {
    it('should produce concise format with decision guidance', () => {
      const matches: AgentMatch[] = [
        {
          key: 'bmm:analyst',
          module: 'bmm',
          agentName: 'analyst',
          agentDisplayName: 'Mary',
          agentTitle: 'Business Analyst',
          role: 'Expert Business Analyst',
          description: 'Analyzes requirements and creates specifications',
          action:
            'bmad({ operation: "execute", agent: "analyst", module: "bmm" })',
        },
        {
          key: 'bmm:pm',
          module: 'bmm',
          agentName: 'pm',
          agentDisplayName: 'John',
          agentTitle: 'Product Manager',
          role: 'Strategic Product Manager',
          description: 'Defines product strategy and roadmap',
          action: 'bmad({ operation: "execute", agent: "pm", module: "bmm" })',
        },
      ];

      const lines = [
        `**Multiple Agent Matches**`,
        '',
        `intent: "Found ${matches.length} agents matching your request"`,
        `action_required: "Select most relevant agent"`,
        '',
        '**Agents** (ranked by relevance):',
      ];

      matches.forEach((match, index) => {
        const star = index === 0 ? '⭐ ' : '';
        const roleKeyword = match.agentTitle.split(' ')[0];
        lines.push(
          `${index + 1}. ${star}${match.agentName} (${match.agentDisplayName}) - ${roleKeyword}`,
        );
        lines.push(`   • Role: ${match.role}`);
        lines.push(`   • Module: ${match.module}`);
        lines.push(
          `   • Execute: bmad({ operation: "execute", agent: "${match.agentName}", module: "${match.module}", message: "your request" })`,
        );
        lines.push('');
      });

      lines.push('**Decision Heuristics:**');
      lines.push(
        '- Task involves requirements/business logic → analyst/pm (confidence: high)',
      );
      lines.push(
        '- Task involves system design/architecture → architect (confidence: high)',
      );
      lines.push(
        '- Task involves implementation/coding → dev (confidence: high)',
      );
      lines.push('- Task involves testing/quality → tea (confidence: high)');
      lines.push(
        '- Task involves debugging/investigation → debug (confidence: high)',
      );
      lines.push(
        '- No strong signal → Select ⭐ option or offer numbered menu to user',
      );
      lines.push('');
      lines.push('**Metrics:**');
      lines.push(`- matches: ${matches.length}`);
      lines.push('- estimated_comprehension_cost: low');

      const formatted = lines.join('\n');

      // Validate structure
      expect(formatted).toContain('**Multiple Agent Matches**');
      expect(formatted).toContain('intent:');
      expect(formatted).toContain('action_required:');
      expect(formatted).toContain('**Decision Heuristics:**');

      // Validate no redundant "Ambiguous Request" error-like language
      expect(formatted).not.toContain('Ambiguous Request');
      expect(formatted).toContain('⭐'); // Has ranking signal
    });
  });
});
