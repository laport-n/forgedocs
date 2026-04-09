import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { generateInstructions } from '../lib/instruction-gen.mjs'

describe('instruction-gen', () => {
  let tmpDir

  beforeAll(() => {
    tmpDir = path.join(os.tmpdir(), `forgedocs-test-instrgen-${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })

    // Create a realistic project structure
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'my-api',
        scripts: { test: 'vitest run', lint: 'biome check .', dev: 'node server.js' },
      }),
    )
    fs.writeFileSync(
      path.join(tmpDir, 'ARCHITECTURE.md'),
      '# Architecture\n\n## Codemap\n\n| Module | Path | Purpose |\n',
    )
    fs.mkdirSync(path.join(tmpDir, 'docs'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'docs', 'glossary.md'), '# Glossary\n')
    fs.writeFileSync(path.join(tmpDir, 'docs', 'security.md'), '# Security\n')
    fs.mkdirSync(path.join(tmpDir, 'src'))
    fs.mkdirSync(path.join(tmpDir, 'test'))
    fs.mkdirSync(path.join(tmpDir, 'lib'))

    // Add CLAUDE.md with constraints
    fs.writeFileSync(
      path.join(tmpDir, 'CLAUDE.md'),
      [
        '# My API',
        '',
        '## What to never do',
        '- Never commit secrets',
        '- Never use eval()',
        '',
        '## When to update documentation',
        '- New module added -> update ARCHITECTURE.md',
        '',
      ].join('\n'),
    )
  })

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('generateInstructions', () => {
    it('generates claude instruction file', () => {
      const content = generateInstructions(tmpDir, 'claude')
      expect(content).toContain('My Api')
      expect(content).toContain('## What to read first')
      expect(content).toContain('ARCHITECTURE.md')
      expect(content).toContain('## Where things live')
      expect(content).toContain('## What to never do')
      expect(content).toContain('Never commit secrets')
      expect(content).toContain('## How to run')
      expect(content).toContain('npm test')
      expect(content).toContain('## AI tools available')
    })

    it('generates cursor instruction file with MDC frontmatter', () => {
      const content = generateInstructions(tmpDir, 'cursor')
      expect(content).toContain('---')
      expect(content).toContain('alwaysApply: true')
      expect(content).toContain('## Read first')
      expect(content).toContain('@ARCHITECTURE.md')
      expect(content).toContain('## Rules (never break these)')
      expect(content).toContain('Never commit secrets')
    })

    it('generates windsurf instruction file', () => {
      const content = generateInstructions(tmpDir, 'windsurf')
      expect(content).toContain('## Read first')
      expect(content).toContain('## Rules')
      expect(content).toContain('## Commands')
    })

    it('generates copilot instruction file (concise)', () => {
      const content = generateInstructions(tmpDir, 'copilot')
      expect(content).toContain('## Architecture')
      expect(content).toContain('Read ARCHITECTURE.md')
      expect(content).toContain('## Rules')
      // Copilot should be more concise
      const lines = content.split('\n').filter((l) => l.trim())
      expect(lines.length).toBeLessThan(30)
    })

    it('generates cline instruction file', () => {
      const content = generateInstructions(tmpDir, 'cline')
      expect(content).toContain('## Read first')
      expect(content).toContain('## Rules')
    })

    it('instruction files are short (under 60 lines)', () => {
      for (const agent of ['claude', 'cursor', 'windsurf', 'copilot', 'cline']) {
        const content = generateInstructions(tmpDir, agent)
        const lineCount = content.split('\n').length
        expect(lineCount, `${agent} has ${lineCount} lines`).toBeLessThan(60)
      }
    })

    it('throws for unknown agent', () => {
      expect(() => generateInstructions(tmpDir, 'unknown')).toThrow('Unknown agent')
    })

    it('extracts constraints from CLAUDE.md', () => {
      for (const agent of ['claude', 'cursor', 'windsurf', 'cline']) {
        const content = generateInstructions(tmpDir, agent)
        expect(content, `${agent} should have constraints`).toContain('Never commit secrets')
      }
    })

    it('includes doc maintenance rules', () => {
      const content = generateInstructions(tmpDir, 'claude')
      expect(content).toContain('## When to update documentation')
      expect(content).toContain('ARCHITECTURE.md')
    })

    it('detects run commands from package.json', () => {
      for (const agent of ['claude', 'cursor', 'windsurf', 'copilot', 'cline']) {
        const content = generateInstructions(tmpDir, agent)
        expect(content, `${agent} should have test command`).toContain('npm test')
      }
    })
  })
})
