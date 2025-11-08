/**
 * Structured Error Utility
 * Standardizes error payloads with remediation guidance.
 */
export interface StructuredErrorPayload {
  code: string;
  message: string;
  remediation?: string;
  next?: string;
}

export function buildError(
  code: string,
  message: string,
  remediation?: string,
  next?: string,
): StructuredErrorPayload {
  return { code, message, remediation, next };
}

export function formatErrorMarkdown(err: StructuredErrorPayload): string {
  const parts: string[] = [];
  parts.push(`Error Code: ${err.code}`);
  parts.push(`Message: ${err.message}`);
  if (err.remediation) parts.push(`Remediation: ${err.remediation}`);
  if (err.next) parts.push(`Next: ${err.next}`);
  return parts.join('\n');
}
