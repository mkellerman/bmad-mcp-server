# Security Hardening

- Input validation and sanitization for all tool/resource parameters
- Path normalization and allowlisted roots for file access
- Least-privilege for network/file operations
- Secrets via environment variables; never log secrets
- Safe parsing (YAML/JSON/CSV) with size/time limits
- Rate limiting and request size caps
- Incident logging with PII redaction
