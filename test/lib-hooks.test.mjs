import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runPrePushHook } from '../lib/hooks.mjs'

describe('hooks', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgedocs-hooks-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('runPrePushHook', () => {
    it('returns null for a healthy repo', () => {
      // Create a fully documented repo that scores >= 80%
      fs.writeFileSync(
        path.join(tmpDir, 'ARCHITECTURE.md'),
        '# Arch\n\n## Codemap\n\n| Module | Path | Purpose |\n|---|---|---|\n| src | `src/` | Source |\n\n## Verifiable Invariants\n\n| Rule | Check |\n|---|---|\n| Test | `echo ok` |\n',
      )
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# README')
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# CLAUDE')
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true })
      fs.mkdirSync(path.join(tmpDir, 'docs', 'features'), { recursive: true })
      fs.mkdirSync(path.join(tmpDir, 'docs', 'adr'), { recursive: true })
      fs.writeFileSync(
        path.join(tmpDir, 'docs', 'glossary.md'),
        '# Glossary\n\n| Term | Definition |\n|---|---|\n| Foo | Bar |\n',
      )
      fs.writeFileSync(
        path.join(tmpDir, 'docs', 'service-map.md'),
        `# Service Map\n\nLast verified: ${new Date().toISOString().slice(0, 10)}\n`,
      )
      fs.writeFileSync(path.join(tmpDir, 'docs', 'security.md'), '# Security')
      fs.writeFileSync(path.join(tmpDir, 'docs', 'features', 'auth.md'), '# Auth')
      fs.writeFileSync(path.join(tmpDir, 'docs', 'adr', '001-framework.md'), '# ADR')

      const result = runPrePushHook(tmpDir)
      expect(result).toBeNull()
    })

    it('returns message when lint errors exist', () => {
      // ARCHITECTURE.md with broken codemap reference
      fs.writeFileSync(
        path.join(tmpDir, 'ARCHITECTURE.md'),
        '# Arch\n\n## Codemap\n\n| Module | Path | Purpose |\n|---|---|---|\n| missing | `nonexistent/` | Gone |\n',
      )
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# README')

      const result = runPrePushHook(tmpDir)
      expect(result).not.toBeNull()
      expect(result).toContain('Documentation issues detected')
      expect(result).toContain('/doc-pr')
      expect(result).toContain('Lint errors:')
    })

    it('returns message when drift is detected', () => {
      // ARCHITECTURE.md codemap missing a directory that exists
      fs.writeFileSync(
        path.join(tmpDir, 'ARCHITECTURE.md'),
        '# Arch\n\n## Codemap\n\n| Module | Path | Purpose |\n|---|---|---|\n| src | `src/` | Source |\n',
      )
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# README')
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true })
      // Create a directory not in codemap to trigger drift
      fs.mkdirSync(path.join(tmpDir, 'lib'), { recursive: true })
      fs.writeFileSync(path.join(tmpDir, 'lib', 'index.mjs'), '')

      const result = runPrePushHook(tmpDir)
      expect(result).not.toBeNull()
      expect(result).toContain('Documentation issues detected')
    })

    it('does not throw for repo without ARCHITECTURE.md', () => {
      // No ARCHITECTURE.md — low score but should never throw
      expect(() => runPrePushHook(tmpDir)).not.toThrow()
    })

    it('returns null for non-existent path', () => {
      const result = runPrePushHook('/tmp/nonexistent-forgedocs-test-path')
      expect(result).toBeNull()
    })
  })
})
