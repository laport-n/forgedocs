# Security Policy

## Scope

Forgedocs is a local documentation viewer. It runs on your machine, reads local files via symlinks, and serves them on localhost. It does not:
- Accept external network connections (by default)
- Store credentials or secrets
- Make outbound API calls
- Process user input beyond file paths

## Reporting a Vulnerability

If you find a security issue, please report it responsibly:

1. **Do NOT open a public GitHub Issue**
2. Email: [open an issue with the `security` label](https://github.com/laport-n/forgedocs/issues/new?labels=security) with details
3. Include steps to reproduce and potential impact

We will respond within 7 days and provide a fix timeline.

## Threat Model

### In scope
- Path traversal via symlinks or CLI arguments
- XSS via crafted markdown content rendered by VitePress
- Command injection via `docsite.config.mjs` or CLI arguments
- Arbitrary code execution via `docsite.config.mjs` (ESM `import()` — documented risk)

### Out of scope
- Vulnerabilities in VitePress itself (report upstream)
- Security of the documented codebases (Forgedocs only reads `.md` files)
- Local privilege escalation (Forgedocs runs with user permissions)
