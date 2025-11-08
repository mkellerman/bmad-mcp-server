# Batch Optimize Payloads Instructions

<workflow>
<step n="1" goal="Load Payloads">
  <action>Resolve glob/list in {{payload_files}}</action>
  <action>If max_items provided, truncate list</action>
  <action>Read each payload fully</action>
</step>
<step n="2" goal="Analyze Each Payload">
  <action>For each payload: apply heuristics (intent summary presence, affordances, redundancy, metrics)</action>
  <action>Compute scores (first_attempt_success, token_efficiency, semantic_relevance, structural_clarity, followup_risk)</action>
  <action>Store raw + scores</action>
</step>
<step n="3" goal="Refine Where Needed">
  <check if="payload score below threshold (e.g., first_attempt_success < 0.7)">
    <action>Generate optimized version using MCP SDK Optimizer templates</action>
    <action>Produce diff (removed lines, modified sections)</action>
  </check>
</step>
<step n="4" goal="Aggregate Report">
  <action>Summarize metrics across all payloads</action>
  <action>List top issues by frequency</action>
  <action>Highlight biggest improvements</action>
  <template-output>optimization_report</template-output>
</step>
<step n="5" goal="Completion">
  <action>Confirm report written to output path</action>
  <action>Provide next recommended actions</action>
</step>
</workflow>
