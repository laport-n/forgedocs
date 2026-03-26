import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { exportAllJson, exportHtml, exportJson } from '../lib/export.mjs'

describe('export', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgedocs-export-'))
    // Set up a minimal repo
    fs.writeFileSync(path.join(tmpDir, 'ARCHITECTURE.md'), '# Architecture\n\n## Codemap\n\n| A | B |\n|---|---|\n')
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# My Service\n\nHello world')
    fs.mkdirSync(path.join(tmpDir, 'docs'))
    fs.writeFileSync(path.join(tmpDir, 'docs', 'glossary.md'), '# Glossary\n\n| Term | Def |\n|---|---|\n| Foo | Bar |')
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('exportJson', () => {
    it('exports repo docs as JSON', () => {
      const result = exportJson(tmpDir)
      expect(result.name).toBe(path.basename(tmpDir))
      expect(result.exportedAt).toBeDefined()
      expect(result.documents['ARCHITECTURE.md']).toContain('# Architecture')
      expect(result.documents['README.md']).toContain('# My Service')
      expect(result.documents['docs/glossary.md']).toContain('Foo')
    })
  })

  describe('exportAllJson', () => {
    it('exports multiple repos', () => {
      const repos = { 'test-repo': tmpDir }
      const result = exportAllJson(repos)
      expect(result.services['test-repo']).toBeDefined()
      expect(result.services['test-repo'].documents['README.md']).toContain('My Service')
    })
  })

  describe('exportHtml', () => {
    it('generates valid HTML', () => {
      const html = exportHtml(tmpDir)
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('Documentation')
      expect(html).toContain('Architecture')
      expect(html).toContain('Table of Contents')
    })

    it('includes all docs in HTML', () => {
      const html = exportHtml(tmpDir)
      expect(html).toContain('Glossary')
      expect(html).toContain('My Service')
    })

    it('converts markdown tables to HTML', () => {
      const html = exportHtml(tmpDir)
      expect(html).toContain('<table>')
      expect(html).toContain('<th>')
    })
  })
})
