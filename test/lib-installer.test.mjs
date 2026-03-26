import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { installTemplates } from '../lib/installer.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const TEMPLATES_DIR = path.join(ROOT, 'templates')

describe('installer', () => {
  let tempRepo

  beforeAll(() => {
    tempRepo = path.join(os.tmpdir(), `docforge-test-installer-${Date.now()}`)
    fs.mkdirSync(tempRepo, { recursive: true })
    fs.mkdirSync(path.join(tempRepo, '.git'))
  })

  afterAll(() => {
    fs.rmSync(tempRepo, { recursive: true, force: true })
  })

  it('installs all templates to a fresh repo', () => {
    const result = installTemplates(TEMPLATES_DIR, tempRepo)

    expect(result.installed.length).toBeGreaterThan(0)
    expect(result.skipped).toHaveLength(0)
    expect(result.updated).toHaveLength(0)

    // Commands should exist
    expect(fs.existsSync(path.join(tempRepo, '.claude', 'commands', 'doc-init.md'))).toBe(true)
    expect(fs.existsSync(path.join(tempRepo, '.claude', 'commands', 'doc-feature.md'))).toBe(true)

    // Skills should exist
    expect(fs.existsSync(path.join(tempRepo, '.claude', 'skills', 'doc-review', 'SKILL.md'))).toBe(true)

    // Workflow should exist
    expect(fs.existsSync(path.join(tempRepo, '.github', 'workflows', 'doc-freshness.yml'))).toBe(true)
  })

  it('skips existing files without force', () => {
    const result = installTemplates(TEMPLATES_DIR, tempRepo)
    expect(result.skipped.length).toBeGreaterThan(0)
    expect(result.installed).toHaveLength(0)
  })

  it('updates existing files with force', () => {
    const result = installTemplates(TEMPLATES_DIR, tempRepo, { force: true })
    expect(result.updated.length).toBeGreaterThan(0)
    expect(result.installed).toHaveLength(0)
  })
})
