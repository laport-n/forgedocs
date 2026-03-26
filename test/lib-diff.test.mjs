import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { detectDrift, formatDriftReport, parseCodemap, parseInvariants } from '../lib/diff.mjs'

describe('diff', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgedocs-diff-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('parseCodemap', () => {
    it('extracts entries from markdown table', () => {
      const content = `# Arch\n\n## Codemap\n\n| Component | Path | Purpose |\n|---|---|---|\n| CLI | \`bin/cli.mjs\` | Entry point |\n| Lib | \`lib/\` | Core modules |\n\n## Other`
      const entries = parseCodemap(content)
      expect(entries).toHaveLength(2)
      expect(entries[0].component).toBe('CLI')
      expect(entries[0].path).toBe('bin/cli.mjs')
      expect(entries[1].component).toBe('Lib')
    })

    it('returns empty for no codemap', () => {
      const entries = parseCodemap('# No codemap here')
      expect(entries).toEqual([])
    })
  })

  describe('parseInvariants', () => {
    it('extracts invariants with commands', () => {
      const content = `## Verifiable Invariants\n\n| Rule | Check |\n|---|---|\n| No deps | \`echo 0\` should be 0 |\n| Tests pass | \`npm test\` exit 0 |`
      const invariants = parseInvariants(content)
      expect(invariants).toHaveLength(2)
      expect(invariants[0].rule).toBe('No deps')
      expect(invariants[0].check).toBe('echo 0')
    })
  })

  describe('detectDrift', () => {
    it('throws without ARCHITECTURE.md', () => {
      expect(() => detectDrift(tmpDir)).toThrow('No ARCHITECTURE.md')
    })

    it('detects new directories not in codemap', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'ARCHITECTURE.md'),
        '## Codemap\n\n| Component | Path | Purpose |\n|---|---|---|\n| Lib | `lib/` | Core |\n',
      )
      fs.mkdirSync(path.join(tmpDir, 'lib'))
      fs.mkdirSync(path.join(tmpDir, 'src'))
      fs.mkdirSync(path.join(tmpDir, 'scripts'))

      const drift = detectDrift(tmpDir)
      const addedPaths = drift.added.map((a) => a.path)
      expect(addedPaths).toContain('src/')
      expect(addedPaths).toContain('scripts/')
    })

    it('detects removed paths', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'ARCHITECTURE.md'),
        '## Codemap\n\n| Component | Path | Purpose |\n|---|---|---|\n| Old | `old-module/` | Deleted |\n',
      )
      const drift = detectDrift(tmpDir)
      expect(drift.removed).toHaveLength(1)
      expect(drift.removed[0].path).toBe('old-module/')
    })

    it('detects stale entries', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'ARCHITECTURE.md'),
        '## Codemap\n\n| Component | Path | Purpose |\n|---|---|---|\n| New | `new/` | [To be documented] |\n',
      )
      fs.mkdirSync(path.join(tmpDir, 'new'))
      const drift = detectDrift(tmpDir)
      expect(drift.stale).toHaveLength(1)
    })
  })

  describe('formatDriftReport', () => {
    it('formats report for terminal', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'ARCHITECTURE.md'),
        '## Codemap\n\n| Component | Path | Purpose |\n|---|---|---|\n| Lib | `lib/` | Core |\n',
      )
      fs.mkdirSync(path.join(tmpDir, 'lib'))
      const drift = detectDrift(tmpDir)
      const report = formatDriftReport(tmpDir, drift)
      expect(report).toContain('Drift Report')
    })
  })
})
