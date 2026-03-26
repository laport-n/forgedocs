import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '..')
const SETUP_SCRIPT = path.join(ROOT, 'scripts', 'setup.mjs')

function createTempRepo(name) {
  const dir = path.join(os.tmpdir(), `docsite-test-${name}-${Date.now()}`)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'ARCHITECTURE.md'), `# ${name}\n\n## Overview\nTest service.`)
  fs.writeFileSync(path.join(dir, 'README.md'), `# ${name}`)
  return dir
}

function cleanup(...dirs) {
  for (const dir of dirs) {
    try {
      fs.rmSync(dir, { recursive: true })
    } catch {
      /* ignore */
    }
  }
}

function runSetup(...args) {
  return execFileSync('node', [SETUP_SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf-8',
    env: { ...process.env, HOME: os.tmpdir() },
    input: '\n',
  })
}

describe('setup.mjs', () => {
  let tempRepo
  const configPath = path.join(ROOT, '.repos.json')
  const contentDir = path.join(ROOT, 'content')
  let originalConfig

  beforeAll(() => {
    if (fs.existsSync(configPath)) {
      originalConfig = fs.readFileSync(configPath, 'utf-8')
    }
    tempRepo = createTempRepo('test-service')
  })

  afterAll(() => {
    if (originalConfig) {
      fs.writeFileSync(configPath, originalConfig)
      try {
        runSetup('--check')
      } catch {
        /* best effort */
      }
    }
    cleanup(tempRepo)
  })

  it('--help shows usage', () => {
    const output = runSetup('--help')
    expect(output).toMatch(/Usage/)
    expect(output).toMatch(/--add/)
  })

  it('--add adds a repo', () => {
    const output = runSetup('--add', tempRepo)
    expect(output).toMatch(/Added/)

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    const repoName = path.basename(tempRepo)
    expect(config[repoName]).toBe(tempRepo)
  })

  it('--add rejects directory without ARCHITECTURE.md', () => {
    const emptyDir = path.join(os.tmpdir(), `docsite-test-empty-${Date.now()}`)
    fs.mkdirSync(emptyDir, { recursive: true })
    try {
      expect(() => runSetup('--add', emptyDir)).toThrow()
    } finally {
      cleanup(emptyDir)
    }
  })

  it('--check creates symlinks from .repos.json', () => {
    runSetup('--add', tempRepo)

    if (fs.existsSync(contentDir)) {
      fs.rmSync(contentDir, { recursive: true })
    }

    runSetup('--check')

    const repoName = path.basename(tempRepo)
    const linkPath = path.join(contentDir, repoName)
    expect(fs.existsSync(linkPath)).toBe(true)
  })

  it('--check fails without .repos.json', () => {
    const tempConfig = `${configPath}.bak`
    if (fs.existsSync(configPath)) {
      fs.renameSync(configPath, tempConfig)
    }
    try {
      expect(() => runSetup('--check')).toThrow()
    } finally {
      if (fs.existsSync(tempConfig)) {
        fs.renameSync(tempConfig, configPath)
      }
    }
  })
})
