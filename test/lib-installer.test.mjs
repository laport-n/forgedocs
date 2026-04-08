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

    // Commands should exist
    expect(fs.existsSync(path.join(tempRepo, '.claude', 'commands', 'doc-init.md'))).toBe(true)
    expect(fs.existsSync(path.join(tempRepo, '.claude', 'commands', 'doc-feature.md'))).toBe(true)

    // Skills should exist
    expect(fs.existsSync(path.join(tempRepo, '.claude', 'skills', 'doc-review', 'SKILL.md'))).toBe(true)

    // Workflow should exist
    expect(fs.existsSync(path.join(tempRepo, '.github', 'workflows', 'doc-freshness.yml'))).toBe(true)

    // Post-push hook should exist (not post-commit)
    expect(fs.existsSync(path.join(tempRepo, '.claude', 'hooks', 'post-push-doc-check.sh'))).toBe(true)
    expect(fs.existsSync(path.join(tempRepo, '.claude', 'hooks', 'post-commit-audit.sh'))).toBe(false)

    // Settings should contain post-push hook, not post-commit
    const settings = JSON.parse(fs.readFileSync(path.join(tempRepo, '.claude', 'settings.json'), 'utf-8'))
    const postToolUse = settings.hooks?.PostToolUse || []
    const hasPostPush = postToolUse.some((h) => h.hooks?.some((hook) => hook.command?.includes('post-push-doc-check')))
    const hasPostCommit = postToolUse.some((h) => h.hooks?.some((hook) => hook.command?.includes('post-commit-audit')))
    expect(hasPostPush).toBe(true)
    expect(hasPostCommit).toBe(false)
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

  it('appends documentation maintenance section to CLAUDE.md', () => {
    const claudeMdPath = path.join(tempRepo, 'CLAUDE.md')
    fs.writeFileSync(claudeMdPath, '# My Project\n\n## How to run\n- npm test\n')

    const result = installTemplates(TEMPLATES_DIR, tempRepo, { force: true })
    const content = fs.readFileSync(claudeMdPath, 'utf-8')

    expect(content).toContain('## Documentation maintenance')
    expect(content).toContain('/doc-sync')
    expect(result.updated).toContain('CLAUDE.md (added documentation maintenance section)')
  })

  it('skips CLAUDE.md if documentation maintenance section already present', () => {
    const claudeMdPath = path.join(tempRepo, 'CLAUDE.md')
    const existing = fs.readFileSync(claudeMdPath, 'utf-8')
    expect(existing).toContain('Documentation maintenance')

    const result = installTemplates(TEMPLATES_DIR, tempRepo, { force: true })
    expect(result.skipped).toContain('CLAUDE.md (documentation maintenance section already present)')
  })
})
