---
name: bump-version
description: Bump the package version (patch, minor, or major). Use when releasing a new version or when the user says "bump version", "release", or "new version".
disable-model-invocation: true
---

# Bump Version

Bump the forgedocs package version. Argument: `patch` (default), `minor`, or `major`.

## Steps

### 1. Determine bump type

Parse the argument: `$ARGUMENTS`. Default to `patch` if empty.

Valid values: `patch`, `minor`, `major`.

### 2. Read current version

Read `package.json` and extract the current `version` field.

### 3. Calculate new version

Split the current version into `major.minor.patch` and increment the appropriate segment:
- `patch`: X.Y.Z → X.Y.(Z+1)
- `minor`: X.Y.Z → X.(Y+1).0
- `major`: X.Y.Z → (X+1).0.0

### 4. Update version in all locations

Update the version string in:
- `package.json` — the `version` field

Then run `npm install --package-lock-only` to sync `package-lock.json`.

### 4.5. Verify no stale version references

Search the entire codebase for the OLD version string (e.g., `grep -r "X.Y.Z" --include="*.mjs" --include="*.json" --include="*.md"`). If any file still contains the old version as a hardcoded value (not in a changelog or git log), update it or flag it. Ignore `package-lock.json`, `CHANGELOG.md`, and `node_modules/`.

### 5. Run checks

Run `npm test` to ensure nothing is broken.
Run `forgedocs audit .` to verify documentation is still in sync.

### 6. Commit

Create a single commit: `Bump version to X.Y.Z`

Do NOT push or create tags unless explicitly asked.

### 7. Report

```
Version bumped: {old} → {new}

Updated:
  - package.json
  - package-lock.json

Tests: ✅ passing
Audit: ✅ no drift

Next steps:
  - git push
  - git tag vX.Y.Z && git push --tags
  - npm publish
```
