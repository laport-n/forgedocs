import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { formatLintReport, lintDocs } from '../lib/lint.mjs'

describe('lint', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgedocs-lint-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('lintDocs', () => {
    it('reports error when ARCHITECTURE.md is missing', () => {
      const results = lintDocs(tmpDir)
      const archError = results.find((r) => r.id === 'no-architecture')
      expect(archError).toBeDefined()
      expect(archError.severity).toBe('error')
    })

    it('reports error for broken codemap references', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'ARCHITECTURE.md'),
        '## Codemap\n\n| Component | Path | Purpose |\n|---|---|---|\n| Ghost | `nonexistent/` | Does not exist |\n\n## Invariants\n\n| Rule | Check |\n|---|---|\n| All tests pass | `npm test` |',
      )
      const results = lintDocs(tmpDir)
      const broken = results.find((r) => r.id === 'broken-ref')
      expect(broken).toBeDefined()
      expect(broken.severity).toBe('error')
      expect(broken.message).toContain('nonexistent/')
    })

    it('reports error for stale placeholders', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'ARCHITECTURE.md'),
        '## Codemap\n\n| Component | Path | Purpose |\n|---|---|---|\n| Main | `.` | [To be documented] |\n\n## Invariants\n\n| Rule | Check |\n|---|---|\n| Tests | `npm test` |',
      )
      const results = lintDocs(tmpDir)
      const placeholder = results.find((r) => r.id === 'stale-placeholder')
      expect(placeholder).toBeDefined()
      expect(placeholder.severity).toBe('error')
    })

    it('reports error for placeholder invariant checks', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'ARCHITECTURE.md'),
        '## Codemap\n\n| Component | Path | Purpose |\n|---|---|---|\n| Main | `.` | Entry |\n\n## Invariants\n\n| Rule | Check |\n|---|---|\n| Bad | `echo "Add verification commands"` |',
      )
      const results = lintDocs(tmpDir)
      const placeholderInv = results.find((r) => r.id === 'placeholder-invariant')
      expect(placeholderInv).toBeDefined()
      expect(placeholderInv.severity).toBe('error')
    })

    it('reports warning when CLAUDE.md is missing', () => {
      const results = lintDocs(tmpDir)
      const claudeWarn = results.find((r) => r.id === 'no-claude')
      expect(claudeWarn).toBeDefined()
      expect(claudeWarn.severity).toBe('warn')
    })

    it('reports warning for CLAUDE.md missing navigation sections', () => {
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# My Project\n\nSome prose about the project.\n')
      const results = lintDocs(tmpDir)
      const missing = results.filter((r) => r.id === 'claude-missing-section')
      expect(missing.length).toBeGreaterThanOrEqual(3)
    })

    it('reports error when README.md is missing', () => {
      const results = lintDocs(tmpDir)
      const readmeError = results.find((r) => r.id === 'no-readme')
      expect(readmeError).toBeDefined()
      expect(readmeError.severity).toBe('error')
    })

    it('reports warning for service-map without date', () => {
      fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true })
      fs.writeFileSync(path.join(tmpDir, 'docs', 'service-map.md'), '# Service Map\n\nSome content.\n')
      const results = lintDocs(tmpDir)
      const noDate = results.find((r) => r.id === 'service-map-no-date')
      expect(noDate).toBeDefined()
    })

    it('reports warning for ADRs missing Rules section', () => {
      fs.mkdirSync(path.join(tmpDir, 'docs', 'adr'), { recursive: true })
      fs.writeFileSync(
        path.join(tmpDir, 'docs', 'adr', '001-decision.md'),
        '# 001 — Decision\n\n## Context\n\nSome context.\n\n## Decision\n\nWe decided X.\n',
      )
      const results = lintDocs(tmpDir)
      const noRules = results.find((r) => r.id === 'adr-no-rules')
      expect(noRules).toBeDefined()
    })

    it('returns no errors for a well-structured repo', () => {
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# My Service\n\nOverview.\n')
      fs.writeFileSync(
        path.join(tmpDir, 'CLAUDE.md'),
        '# My Service\n\n## What to read first\n- `ARCHITECTURE.md`\n\n## Where things live\n- `src/`\n\n## What to never do\n- Never X\n\n## How to run\n- `npm test`\n',
      )
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true })
      fs.writeFileSync(
        path.join(tmpDir, 'ARCHITECTURE.md'),
        '## Codemap\n\n| Component | Path | Purpose |\n|---|---|---|\n| Src | `src/` | Source code |\n\n## Verifiable Invariants\n\n| Rule | Check |\n|---|---|\n| Tests pass | `npm test` |\n',
      )
      const results = lintDocs(tmpDir)
      const errors = results.filter((r) => r.severity === 'error')
      expect(errors).toHaveLength(0)
    })
  })

  describe('formatLintReport', () => {
    it('shows "No issues" for clean results', () => {
      const report = formatLintReport(tmpDir, [])
      expect(report).toContain('No issues found')
    })

    it('formats errors and warnings', () => {
      const results = [
        { id: 'test', severity: 'error', file: 'ARCHITECTURE.md', message: 'Broken ref', fix: 'Fix it' },
        { id: 'test2', severity: 'warn', file: 'CLAUDE.md', message: 'Missing section', fix: null },
      ]
      const report = formatLintReport(tmpDir, results)
      expect(report).toContain('Broken ref')
      expect(report).toContain('Missing section')
      expect(report).toContain('1 error(s)')
      expect(report).toContain('1 warning(s)')
    })
  })
})
