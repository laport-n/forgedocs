import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { isValidRepo, scanForRepos } from '../lib/discovery.mjs'

describe('discovery', () => {
  let tempDir

  beforeAll(() => {
    tempDir = path.join(os.tmpdir(), `docforge-test-discovery-${Date.now()}`)
    fs.mkdirSync(tempDir, { recursive: true })

    // Create valid repos
    const validRepo = path.join(tempDir, 'valid-service')
    fs.mkdirSync(validRepo)
    fs.writeFileSync(path.join(validRepo, 'ARCHITECTURE.md'), '# Valid')

    // Create invalid repo (no ARCHITECTURE.md)
    const invalidRepo = path.join(tempDir, 'no-arch')
    fs.mkdirSync(invalidRepo)
    fs.writeFileSync(path.join(invalidRepo, 'README.md'), '# No arch')

    // Create nested repo structure
    const monorepo = path.join(tempDir, 'monorepo', 'services', 'nested-svc')
    fs.mkdirSync(monorepo, { recursive: true })
    fs.writeFileSync(path.join(monorepo, 'ARCHITECTURE.md'), '# Nested')

    // Create hidden directory (should be skipped)
    const hidden = path.join(tempDir, '.hidden-repo')
    fs.mkdirSync(hidden)
    fs.writeFileSync(path.join(hidden, 'ARCHITECTURE.md'), '# Hidden')
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  describe('isValidRepo()', () => {
    it('returns true for directory with ARCHITECTURE.md', () => {
      expect(isValidRepo(path.join(tempDir, 'valid-service'))).toBe(true)
    })

    it('returns false for directory without ARCHITECTURE.md', () => {
      expect(isValidRepo(path.join(tempDir, 'no-arch'))).toBe(false)
    })

    it('returns false for non-existent directory', () => {
      expect(isValidRepo(path.join(tempDir, 'nonexistent'))).toBe(false)
    })
  })

  describe('scanForRepos()', () => {
    it('discovers direct repos', () => {
      const found = scanForRepos(tempDir)
      expect(found['valid-service']).toBe(path.join(tempDir, 'valid-service'))
    })

    it('skips directories without ARCHITECTURE.md', () => {
      const found = scanForRepos(tempDir)
      expect(found['no-arch']).toBeUndefined()
    })

    it('skips hidden directories', () => {
      const found = scanForRepos(tempDir)
      expect(found['.hidden-repo']).toBeUndefined()
    })

    it('discovers nested repos', () => {
      const found = scanForRepos(tempDir, ['services'])
      expect(found['nested-svc']).toBe(path.join(tempDir, 'monorepo', 'services', 'nested-svc'))
    })

    it('returns empty for non-existent directory', () => {
      const found = scanForRepos('/tmp/nonexistent-docforge-test')
      expect(Object.keys(found)).toHaveLength(0)
    })
  })
})
