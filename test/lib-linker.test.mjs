import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { copyMarkdownFiles, linkRepos, symlinkSupported } from '../lib/linker.mjs'

describe('linker', () => {
  let tempDir
  let repoDir

  beforeAll(() => {
    tempDir = path.join(os.tmpdir(), `docforge-test-linker-${Date.now()}`)
    fs.mkdirSync(tempDir, { recursive: true })

    // Create a mock repo
    repoDir = path.join(tempDir, 'mock-repo')
    fs.mkdirSync(repoDir)
    fs.writeFileSync(path.join(repoDir, 'ARCHITECTURE.md'), '# Arch')
    fs.writeFileSync(path.join(repoDir, 'README.md'), '# Readme')
    fs.writeFileSync(path.join(repoDir, 'app.js'), 'console.log("hello")')
    const docsDir = path.join(repoDir, 'docs')
    fs.mkdirSync(docsDir)
    fs.writeFileSync(path.join(docsDir, 'guide.md'), '# Guide')
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  describe('symlinkSupported()', () => {
    it('returns a boolean', () => {
      expect(typeof symlinkSupported(tempDir)).toBe('boolean')
    })
  })

  describe('copyMarkdownFiles()', () => {
    it('copies only markdown files and docs/', () => {
      const dest = path.join(tempDir, 'copy-test')
      copyMarkdownFiles(repoDir, dest)

      expect(fs.existsSync(path.join(dest, 'ARCHITECTURE.md'))).toBe(true)
      expect(fs.existsSync(path.join(dest, 'README.md'))).toBe(true)
      expect(fs.existsSync(path.join(dest, 'docs', 'guide.md'))).toBe(true)
      // Non-md files should NOT be copied
      expect(fs.existsSync(path.join(dest, 'app.js'))).toBe(false)
    })
  })

  describe('linkRepos()', () => {
    it('creates symlinks in the content directory', () => {
      const contentDir = path.join(tempDir, 'content')
      linkRepos({ 'mock-repo': repoDir }, contentDir, tempDir)

      const linkPath = path.join(contentDir, 'mock-repo')
      expect(fs.existsSync(linkPath)).toBe(true)
      // Should be accessible (symlink or copy)
      expect(fs.existsSync(path.join(linkPath, 'ARCHITECTURE.md'))).toBe(true)
    })

    it('cleans up old content directory before re-linking', () => {
      const contentDir = path.join(tempDir, 'content-cleanup')
      fs.mkdirSync(contentDir, { recursive: true })
      fs.writeFileSync(path.join(contentDir, 'stale'), 'old')

      linkRepos({ 'mock-repo': repoDir }, contentDir, tempDir)

      expect(fs.existsSync(path.join(contentDir, 'stale'))).toBe(false)
      expect(fs.existsSync(path.join(contentDir, 'mock-repo'))).toBe(true)
    })
  })
})
