# Security

Forgedocs is a local-only tool. It makes no network connections, stores no credentials, and processes no user input beyond file paths.

## Rules

1. **No outbound network calls.** The tool reads local files and serves on localhost only.
2. **No credential storage.** There are no API keys, tokens, or passwords anywhere in the codebase.
3. **No `eval()` or dynamic code execution** — except `docsite.config.mjs` which is loaded via ESM `import()`. This is a documented risk: the config file can execute arbitrary code. Users should only edit their own config.
4. **File paths are resolved, not sanitized.** The `--add` command uses `path.resolve()` which follows `..` segments. This is acceptable because the tool runs with user permissions on their own filesystem.
5. **Symlinks stay within user control.** The `content/` directory only contains symlinks to paths the user explicitly selected during `forgedocs init`.
6. **VitePress `server.fs.allow` is scoped** to the CWD and the repo paths from `.repos.json`. This prevents VitePress from serving files outside the expected directories.
7. **Templates are static markdown.** They contain no executable code — they are Claude Code prompts (`.md` files) copied into target repos.
