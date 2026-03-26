# Glossary

| Term | Definition |
|------|-----------|
| **Repo** | A local git repository containing an `ARCHITECTURE.md` at its root. The unit of documentation in Forgedocs. |
| **Service** | A repo as it appears in the documentation site — each symlinked directory in `content/` becomes a service with its own sidebar. |
| **Content directory** | The `content/` folder containing symlinks to discovered repos. Gitignored, recreated by `forgedocs init`. |
| **Symlink** | A filesystem link from `content/<name>` to the real repo path. Enables hot-reload and zero-copy docs. Falls back to junctions (Windows) or file copies. |
| **Invariant** | An architectural rule documented in `ARCHITECTURE.md` with a verification shell command. Checked by `/doc-review`. |
| **ADR** | Architecture Decision Record. Documents what is in place, how it works, and the rules to follow. Immutable — new decisions create new ADRs. |
| **Progressive disclosure** | The documentation layering strategy: CLAUDE.md → ARCHITECTURE.md → docs/ → docs/features/ → code. Each layer is more detailed and less stable. |
| **Scan directory** | A directory searched during `forgedocs init` for repos. Auto-detected from common locations (`~/projects`, `~/perso`, etc.) or configured in `docsite.config.mjs`. |
| **Nested directory** | A subdirectory pattern (e.g., `services/`, `packages/`) used to find repos inside monorepos. |
| **PKG_ROOT** | The directory where Forgedocs is installed (npm global or local). Contains templates and VitePress config. |
| **CWD** | The user's working directory where `forgedocs` commands run. Contains `.repos.json`, `content/`, and site config. |
