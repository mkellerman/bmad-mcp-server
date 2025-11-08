# MCP Security Audit — Instructions

<workflow>
<step n="1" goal="Define scope and assets">
  <action>List all tools, resources, and external integrations with trust boundaries</action>
  <action>Map data flows (inputs, outputs, files, network calls)</action>
</step>

<step n="2" goal="Threat modeling (STRIDE-inspired)">
  <action>Enumerate threats by category: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege</action>
  <action>Note likelihood/impact and current controls</action>
  <template-output>threat_model</template-output>
</step>

<step n="3" goal="Secure coding and parsing">
  <action>Check input validation/sanitization for tool params and resource URIs</action>
  <action>Review parsing of YAML/JSON/CSV; ensure safe libraries and limits</action>
  <action>Verify path handling against traversal; normalize and restrict roots</action>
  <template-output>secure_coding_findings</template-output>
</step>

<step n="4" goal="Secrets and configuration">
  <action>Ensure secrets are not logged; use env vars; no plaintext in repo</action>
  <action>Confirm config schema validation and defaults</action>
  <template-output>secrets_config_findings</template-output>
</step>

<step n="5" goal="Execution safety and sandboxing">
  <action>Identify any shell/exec usage; require allowlists; escape/quote properly</action>
  <action>Assess file/network access controls for tools/resources</action>
  <action>Check rate limiting and request size limits</action>
  <template-output>execution_safety_findings</template-output>
</step>

<step n="6" goal="Dependency and supply chain">
  <action>List critical deps; check for known vuln scanning (npm audit, osv)</action>
  <action>Pin ranges where appropriate; consider lockfile hygiene</action>
  <template-output>dependency_findings</template-output>
</step>

<step n="7" goal="Logging, privacy, and incident readiness">
  <action>Review PII handling; redact sensitive data</action>
  <action>Ensure structured logs and correlation IDs for incidents</action>
  <action>Document incident response basics</action>
  <template-output>logging_privacy_findings</template-output>
</step>

<step n="8" goal="Mitigation plan and checklist">
  <action>Prioritize fixes by risk level and implementation effort</action>
  <action>Produce security hardening checklist</action>
  <template-output>mitigation_plan</template-output>
</step>

<step n="9" goal="Write report">
  <action>Generate consolidated security audit report and save to outputs.report</action>
  <template-output>final_report_path</template-output>
</step>
</workflow>
