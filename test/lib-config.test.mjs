import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadConfig, loadReposConfig, saveReposConfig } from '../lib/config.mjs'

describe('config', () => {
  let tempDir

  beforeAll(() => {
    tempDir = path.join(os.tmpdir(), `docforge-test-config-${Date.now()}`)
    fs.mkdirSync(tempDir, { recursive: true })
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  describe('loadConfig()', () => {
    it('returns defaults when no config file exists', async () => {
      const config = await loadConfig(tempDir)
      expect(config.scanDirs).toBeDefined()
      expect(config.nestedDirs).toContain('services')
      expect(config.title).toBe('Forgedocs')
    })

    it('merges user config with defaults', async () => {
      const configDir = path.join(tempDir, 'with-config')
      fs.mkdirSync(configDir, { recursive: true })
      fs.writeFileSync(
        path.join(configDir, 'docsite.config.mjs'),
        'export default { title: "My Docs", extraExcludes: ["foo/**"] }\n',
      )
      const config = await loadConfig(configDir)
      expect(config.title).toBe('My Docs')
      expect(config.extraExcludes).toEqual(['foo/**'])
      // Defaults still present
      expect(config.nestedDirs).toContain('services')
    })
  })

  describe('loadReposConfig()', () => {
    it('returns null when file does not exist', () => {
      const result = loadReposConfig(path.join(tempDir, 'nonexistent.json'))
      expect(result).toBeNull()
    })

    it('loads valid .repos.json', () => {
      const configPath = path.join(tempDir, 'valid.json')
      fs.writeFileSync(configPath, JSON.stringify({ 'my-repo': '/tmp/my-repo' }))
      const result = loadReposConfig(configPath)
      expect(result).toEqual({ 'my-repo': '/tmp/my-repo' })
    })

    it('throws on invalid JSON', () => {
      const configPath = path.join(tempDir, 'invalid.json')
      fs.writeFileSync(configPath, 'not json at all')
      expect(() => loadReposConfig(configPath)).toThrow('not valid JSON')
    })

    it('throws on non-object JSON', () => {
      const configPath = path.join(tempDir, 'array.json')
      fs.writeFileSync(configPath, '["a", "b"]')
      expect(() => loadReposConfig(configPath)).toThrow('must be a JSON object')
    })

    it('throws on non-string values', () => {
      const configPath = path.join(tempDir, 'bad-values.json')
      fs.writeFileSync(configPath, '{"repo": 123}')
      expect(() => loadReposConfig(configPath)).toThrow('must be a string path')
    })
  })

  describe('saveReposConfig()', () => {
    it('saves repos to a JSON file', () => {
      const configPath = path.join(tempDir, 'saved.json')
      saveReposConfig(configPath, { test: '/tmp/test' })
      const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      expect(content).toEqual({ test: '/tmp/test' })
    })
  })
})
