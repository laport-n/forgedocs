# Auto-Discovery

## What it does

`forgedocs init` automatically finds all repositories on your machine that contain an `ARCHITECTURE.md`, presents them as a numbered list, and lets you pick which ones to include in the documentation site.

## How it works

### Scan process

1. **Detect common directories** — checks for `~/working`, `~/projects`, `~/perso`, `~/code`, `~/dev`, `~/repos`, `~/github`, `~/workspace`, `~/work`, `~/personal`, `~/Development`, and more
2. **Recursive scan** — for each detected directory, recursively scans up to depth 3
3. **Nested repo support** — checks subdirectory patterns like `services/`, `packages/`, `apps/`, `modules/` for monorepo structures
4. **Skip non-project dirs** — ignores `node_modules`, `vendor`, `dist`, `build`, `coverage`, `content`, and hidden directories

### Interactive selection

```
Found 5 new repo(s):

  [1] my-api
      /Users/me/projects/my-api
  [2] my-frontend
      /Users/me/projects/my-frontend
  [3] shared-lib
      /Users/me/work/monorepo/packages/shared-lib
  [4] auth-service
      /Users/me/perso/auth-service
  [5] legacy-app
      /Users/me/code/legacy-app

Which repos to add? (a=all, comma-separated numbers, or enter to skip): 1,2,4
```

### What happens after selection

- Selected repos are saved to `.repos.json`
- Symlinks are created in `content/` directory
- VitePress config files are copied to the working directory
- The documentation site is ready: `forgedocs dev`

## Invariants

- A repo must have `ARCHITECTURE.md` at root to be discovered
- Discovery never modifies the source repos — read-only filesystem scan
- Repos are never auto-added — the user always confirms via interactive selection
- The scan skips `content/` directories to avoid detecting symlinked repos as new

## Configuration

Custom scan directories can be added in `docsite.config.mjs`:

```js
export default {
  scanDirs: ['~/custom-projects', '~/another-dir'],
  nestedDirs: ['packages', 'services', 'apps'],
}
```
