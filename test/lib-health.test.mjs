import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { calculateHealth, formatHealthReport, generateBadge } from '../lib/health.mjs'

describe('health', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgedocs-health-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('calculateHealth', () => {
    it('returns 0 for empty directory', () => {
      const health = calculateHealth(tmpDir)
      expect(health.score).toBe(0)
      expect(health.maxScore).toBe(100)
      expect(health.checks.length).toBeGreaterThan(0)
    })

    it('scores ARCHITECTURE.md presence', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'ARCHITECTURE.md'),
        '# Arch\n\n## Codemap\n\n| A | B | C |\n|---|---|---|\n| X | Y | Z |\n',
      )
      const health = calculateHealth(tmpDir)
      expect(health.score).toBeGreaterThan(0)
      const archCheck = health.checks.find((c) => c.id === 'architecture')
      expect(archCheck.status).toBe('pass')
      expect(archCheck.earned).toBe(15)
    })

    it('scores full documentation structure', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'ARCHITECTURE.md'),
        '# Arch\n\n## Codemap\n\n| A | B | C |\n|---|---|---|\n| X | `src/` | Z |\n\n## Verifiable Invariants\n\n| Rule | Check |\n|---|---|\n| Test | `echo ok` |\n',
      )
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# README')
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# CLAUDE')
      fs.mkdirSync(path.join(tmpDir, 'docs', 'features'), { recursive: true })
      fs.mkdirSync(path.join(tmpDir, 'docs', 'adr'), { recursive: true })
      fs.writeFileSync(
        path.join(tmpDir, 'docs', 'glossary.md'),
        '# Glossary\n\n| Term | Def |\n|---|---|\n| Foo | Bar |\n',
      )
      fs.writeFileSync(path.join(tmpDir, 'docs', 'security.md'), '# Security')
      fs.writeFileSync(path.join(tmpDir, 'docs', 'service-map.md'), '# Service Map')
      fs.writeFileSync(path.join(tmpDir, 'docs', 'features', 'auth.md'), '# Auth')
      fs.writeFileSync(path.join(tmpDir, 'docs', 'adr', '001-decision.md'), '# ADR')

      const health = calculateHealth(tmpDir)
      expect(health.score).toBe(100)
    })
  })

  describe('generateBadge', () => {
    it('returns valid SVG', () => {
      const svg = generateBadge(75, 100)
      expect(svg).toContain('<svg')
      expect(svg).toContain('75%')
    })

    it('uses green for high scores', () => {
      const svg = generateBadge(85, 100)
      expect(svg).toContain('#4c1')
    })

    it('uses red for low scores', () => {
      const svg = generateBadge(20, 100)
      expect(svg).toContain('#e05d44')
    })
  })

  describe('formatHealthReport', () => {
    it('includes progress bar and score', () => {
      const health = calculateHealth(tmpDir)
      const report = formatHealthReport('test-repo', health)
      expect(report).toContain('test-repo')
      expect(report).toContain('0/100')
    })
  })
})
