import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getPluginSidebarItems, loadPlugins, writePluginPages } from '../lib/plugins.mjs'

describe('plugins', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forgedocs-plugins-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('loadPlugins', () => {
    it('returns empty context with no plugins', async () => {
      const ctx = await loadPlugins([])
      expect(ctx.pages).toEqual([])
      expect(ctx.discoverHooks).toEqual([])
      expect(ctx.buildHooks).toEqual([])
    })

    it('loads a local plugin', async () => {
      const pluginPath = path.join(tmpDir, 'my-plugin.mjs')
      fs.writeFileSync(
        pluginPath,
        `export default function(api) { api.addPages([{ path: 'test.md', content: '# Test' }]) }`,
      )
      const ctx = await loadPlugins([pluginPath], tmpDir)
      expect(ctx.pages).toHaveLength(1)
      expect(ctx.pages[0].path).toBe('test.md')
    })

    it('passes options to plugin', async () => {
      const pluginPath = path.join(tmpDir, 'opt-plugin.mjs')
      fs.writeFileSync(
        pluginPath,
        `export default function(api, opts) { api.addPages([{ path: 'opt.md', content: opts.title || 'none' }]) }`,
      )
      const ctx = await loadPlugins([[pluginPath, { title: 'Hello' }]], tmpDir)
      expect(ctx.pages[0].content).toBe('Hello')
    })

    it('handles missing plugin gracefully', async () => {
      const ctx = await loadPlugins(['nonexistent-plugin'], tmpDir)
      expect(ctx.pages).toEqual([])
    })
  })

  describe('writePluginPages', () => {
    it('writes pages to content dir', async () => {
      const ctx = await loadPlugins([])
      ctx.pages.push({ path: 'generated/page.md', content: '# Generated' })
      const contentDir = path.join(tmpDir, 'content')
      fs.mkdirSync(contentDir)
      const written = writePluginPages(ctx, contentDir)
      expect(written).toBe(1)
      expect(fs.existsSync(path.join(contentDir, 'generated', 'page.md'))).toBe(true)
    })
  })

  describe('getPluginSidebarItems', () => {
    it('returns service-specific and global items', async () => {
      const ctx = await loadPlugins([])
      ctx.sidebarItems['my-service'] = [{ text: 'Custom', link: '/custom' }]
      ctx.globalSidebarItems.push({ text: 'Global', link: '/global' })

      const items = getPluginSidebarItems(ctx, 'my-service')
      expect(items).toHaveLength(2)
      expect(items[0].text).toBe('Custom')
      expect(items[1].text).toBe('Global')
    })

    it('returns only global items for unknown service', async () => {
      const ctx = await loadPlugins([])
      ctx.globalSidebarItems.push({ text: 'Global', link: '/global' })

      const items = getPluginSidebarItems(ctx, 'other')
      expect(items).toHaveLength(1)
    })
  })
})
