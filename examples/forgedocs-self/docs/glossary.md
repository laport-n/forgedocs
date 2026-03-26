# Glossary

| Term | Definition |
|------|-----------|
| **Repo** | A local git repository containing `ARCHITECTURE.md` at its root |
| **Service** | A repo as it appears in the site — each symlinked directory in `content/` |
| **Symlink** | Filesystem link from `content/<name>` to the real repo. Falls back to junctions or copies |
| **Invariant** | Architectural rule with a verification shell command, checked by `/doc-review` |
| **ADR** | Architecture Decision Record — what's in place, how it works, rules to follow |
| **Progressive disclosure** | Layered docs: CLAUDE.md → ARCHITECTURE.md → docs/ → features/ → code |
| **PKG_ROOT** | Where forgedocs is installed (npm). Contains templates and VitePress |
| **CWD** | User's working directory. Contains `.repos.json`, `content/`, site config |
