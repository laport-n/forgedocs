import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { detectStack, discoverStructure, listPresets, quickstart } from '../lib/quickstart.mjs'

describe('quickstart', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgedocs-quickstart-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('detectStack', () => {
    it('detects Node.js Express project', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ dependencies: { express: '^4.0.0' } }))
      const stacks = detectStack(tmpDir)
      expect(stacks).toContain('express')
    })

    it('detects Go project', () => {
      fs.writeFileSync(path.join(tmpDir, 'go.mod'), 'module github.com/foo/bar\n')
      const stacks = detectStack(tmpDir)
      expect(stacks).toContain('go')
    })

    it('detects Rust project', () => {
      fs.writeFileSync(path.join(tmpDir, 'Cargo.toml'), '[package]\nname = "my-app"\n')
      const stacks = detectStack(tmpDir)
      expect(stacks).toContain('rust')
    })

    it('returns empty for unknown stack', () => {
      const stacks = detectStack(tmpDir)
      expect(stacks).toEqual([])
    })
  })

  describe('discoverStructure', () => {
    it('discovers top-level directories', () => {
      fs.mkdirSync(path.join(tmpDir, 'src'))
      fs.mkdirSync(path.join(tmpDir, 'lib'))
      const structure = discoverStructure(tmpDir)
      const names = structure.map((s) => s.name)
      expect(names).toContain('src')
      expect(names).toContain('lib')
    })

    it('skips node_modules and hidden dirs', () => {
      fs.mkdirSync(path.join(tmpDir, 'node_modules'))
      fs.mkdirSync(path.join(tmpDir, '.git'))
      fs.mkdirSync(path.join(tmpDir, 'src'))
      const structure = discoverStructure(tmpDir)
      const names = structure.map((s) => s.name)
      expect(names).not.toContain('node_modules')
      expect(names).not.toContain('.git')
      expect(names).toContain('src')
    })
  })

  describe('listPresets', () => {
    it('returns available presets', () => {
      const presets = listPresets()
      expect(presets.length).toBeGreaterThan(5)
      const keys = presets.map((p) => p.key)
      expect(keys).toContain('nextjs')
      expect(keys).toContain('go')
      expect(keys).toContain('rust')
    })
  })

  describe('quickstart()', () => {
    it('creates ARCHITECTURE.md and docs/ structure', () => {
      const result = quickstart(tmpDir, null)
      expect(result.created).toContain('ARCHITECTURE.md')
      expect(result.created).toContain('CLAUDE.md')
      expect(result.created).toContain('docs/glossary.md')
      expect(result.created).toContain('docs/security.md')
      expect(result.created).toContain('docs/service-map.md')
      expect(fs.existsSync(path.join(tmpDir, 'ARCHITECTURE.md'))).toBe(true)
      expect(fs.existsSync(path.join(tmpDir, 'docs', 'glossary.md'))).toBe(true)
    })

    it('does not overwrite existing files without --force', () => {
      fs.writeFileSync(path.join(tmpDir, 'ARCHITECTURE.md'), '# Existing')
      const result = quickstart(tmpDir, null)
      expect(result.skipped).toContain('ARCHITECTURE.md (already exists)')
      expect(fs.readFileSync(path.join(tmpDir, 'ARCHITECTURE.md'), 'utf-8')).toBe('# Existing')
    })

    it('overwrites with force option', () => {
      fs.writeFileSync(path.join(tmpDir, 'ARCHITECTURE.md'), '# Existing')
      const result = quickstart(tmpDir, null, { force: true })
      expect(result.created).toContain('ARCHITECTURE.md')
      const content = fs.readFileSync(path.join(tmpDir, 'ARCHITECTURE.md'), 'utf-8')
      expect(content).toContain('## Codemap')
    })

    it('auto-detects preset from package.json', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({ name: 'my-api', dependencies: { express: '^4.0.0' } }),
      )
      const result = quickstart(tmpDir, null)
      expect(result.preset).toBe('Express.js')
    })

    it('uses explicit preset', () => {
      const result = quickstart(tmpDir, null, { preset: 'go' })
      expect(result.preset).toBe('Go')
      const content = fs.readFileSync(path.join(tmpDir, 'ARCHITECTURE.md'), 'utf-8')
      expect(content).toContain('Go')
    })

    it('throws on invalid preset', () => {
      expect(() => quickstart(tmpDir, null, { preset: 'invalid' })).toThrow('Unknown preset')
    })
  })
})
