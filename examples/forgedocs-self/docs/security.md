# Security

Forgedocs is a local-only tool with no network connections, no credentials, and no telemetry.

## Rules

1. No outbound network calls — reads local files, serves on localhost only
2. No credential storage — no API keys, tokens, or passwords
3. No `eval()` — except `docsite.config.mjs` loaded via ESM `import()` (documented risk)
4. Symlinks stay within user control — only paths selected during `forgedocs init`
5. VitePress `server.fs.allow` is scoped to CWD and repo paths from `.repos.json`
6. Templates are static markdown — no executable code
