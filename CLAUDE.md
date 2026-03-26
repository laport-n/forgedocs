# Forgedocs

## What to read first
- `ARCHITECTURE.md` — system map, data flows, and verifiable invariants
- `docs/glossary.md` — domain vocabulary
- `docs/security.md` — security considerations

## Where things live
- `bin/forgedocs.mjs` — CLI entry point, all subcommands
- `lib/` — core modules (config, discovery, linker, installer, utils)
- `templates/` — Claude Code commands, skills, CI workflows installed into target repos
- `.vitepress/config.ts` — VitePress configuration with dynamic sidebar generation
- `scripts/` — legacy npm run scripts (thin wrappers around lib/)
- `test/` — Vitest test suite
- `examples/sample-repo/` — complete example of expected repo structure

## What to never do
- Never add runtime dependencies beyond VitePress — the tool must stay lightweight
- Never use `process.exit()` in `lib/` modules — throw errors, let the CLI handle exit
- Never hardcode org names, repo URLs, or service names in templates
- Never write to PKG_ROOT from the CLI — user data goes in CWD
- Never recurse into `content/` during discovery — those are symlinks to real repos

## How to run
- `npm test` — run all tests
- `npm run lint` — check code with Biome
- `npm run lint:fix` — auto-fix lint issues
- `npx forgedocs dev` — start the doc site locally

## When to update documentation
- Adding/removing a lib module → update `ARCHITECTURE.md` codemap
- New CLI subcommand → update `ARCHITECTURE.md` + `README.md` CLI Reference
- New Claude command template → update `README.md` commands table
- Changed discovery logic → update `ARCHITECTURE.md` data flow
