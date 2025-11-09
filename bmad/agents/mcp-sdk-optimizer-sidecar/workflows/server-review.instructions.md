# MCP Server Review — Instructions

<workflow>
<step n="1" goal="Collect context">
  <action>Load package.json and note @modelcontextprotocol/sdk version</action>
  <action>Identify server entrypoint, CLI commands, and exported MCP handlers</action>
  <action>Locate tool, resource, and agent registration points</action>
  <action>Resolve scan_paths; read key TypeScript/JS files fully</action>
</step>

<step n="2" goal="Protocol compliance and structure">
  <action>Verify MCP endpoints: prompts, tools, resources, server info</action>
  <action>Check schema usage, parameter types, error formats, streaming support</action>
  <action>Confirm idempotency and consistent request/response shapes</action>
  <template-output>protocol_findings</template-output>
</step>

<step n="3" goal="Response shaping for LLM actionability">
  <action>Assess payloads against MCP SDK Optimizer heuristics</action>
  <action>Check for: intent+summary, affordance enumeration, deduplication, metrics</action>
  <action>Identify redundancy and verbosity hotspots</action>
  <template-output>response_shaping_gaps</template-output>
</step>

<step n="4" goal="Performance and reliability">
  <action>Review concurrency, timeouts, retries, backpressure, streaming</action>
  <action>Check caching strategies and memoization opportunities</action>
  <action>Analyze large resource handling (chunking, pagination)</action>
  <template-output>perf_reliability_findings</template-output>
</step>

<step n="5" goal="DX, testing, and observability">
  <action>Evaluate test coverage (unit/integration/e2e), fixtures, CI jobs</action>
  <action>Review logging levels, structured logs, correlation IDs</action>
  <action>Check developer ergonomics: scripts, docs, examples</action>
  <template-output>dx_observability_findings</template-output>
</step>

<step n="6" goal="Prioritized recommendations">
  <action>Compile all findings into Impact/Effort matrix</action>
  <action>Produce top 10 recommendations with implementation notes</action>
  <template-output>recommendations</template-output>
</step>

<step n="7" goal="Write report">
  <action>Generate consolidated Markdown report with sections from prior steps</action>
  <action>Save to outputs.report</action>
  <template-output>final_report_path</template-output>
</step>
</workflow>
