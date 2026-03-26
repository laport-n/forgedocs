import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'

const ROOT = path.resolve(import.meta.dirname, '..')
const INSTALL_SCRIPT = path.join(ROOT, 'scripts', 'install-commands.mjs')

const EXPECTED_COMMANDS = [
  'doc-init.md',
  'doc-feature.md',
  'doc-sync.md',
  'doc-review.md',
]

const EXPECTED_SKILLS = [
  'doc-review',
]

function createTempRepo() {
  const dir = path.join(os.tmpdir(), `docsite-test-install-${Date.now()}`)
  fs.mkdirSync(dir, { recursive: true })
  fs.mkdirSync(path.join(dir, '.git'))
  return dir
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true }) } catch { /* ignore */ }
}

function runInstall(...args) {
  return execFileSync('node', [INSTALL_SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf-8',
  })
}

describe('install-commands.mjs', () => {
  let tempRepo

  beforeAll(() => {
    tempRepo = createTempRepo()
  })

  afterAll(() => {
    cleanup(tempRepo)
  })

  it('shows help with --help', () => {
    const output = runInstall('--help')
    expect(output).toMatch(/Usage/)
    expect(output).toMatch(/doc-init/)
    expect(output).toMatch(/doc-feature/)
  })

  it('exits with error for missing directory', () => {
    expect(() => runInstall('/tmp/nonexistent-docsite-test-dir')).toThrow()
  })

  it('installs all commands to a repo', () => {
    const output = runInstall(tempRepo)
    expect(output).toMatch(/Installed/)

    for (const cmd of EXPECTED_COMMANDS) {
      const cmdPath = path.join(tempRepo, '.claude', 'commands', cmd)
      expect(fs.existsSync(cmdPath)).toBe(true)
    }

    for (const skill of EXPECTED_SKILLS) {
      const skillPath = path.join(tempRepo, '.claude', 'skills', skill, 'SKILL.md')
      expect(fs.existsSync(skillPath)).toBe(true)
    }
  })

  it('skips existing files without --force', () => {
    const output = runInstall(tempRepo)
    expect(output).toMatch(/already exists/)
  })

  it('overwrites with --force', () => {
    const output = runInstall(tempRepo, '--force')
    expect(output).toMatch(/Updated/)
  })

  it('installed commands are valid markdown', () => {
    for (const cmd of EXPECTED_COMMANDS) {
      const content = fs.readFileSync(
        path.join(tempRepo, '.claude', 'commands', cmd),
        'utf-8'
      )
      expect(content).toMatch(/^# \/doc-/)
      expect(content.length).toBeGreaterThan(100)
    }
  })
})
