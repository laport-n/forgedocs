import fs from 'node:fs'
import path from 'node:path'
import { debug } from './utils.mjs'

/**
 * Lightweight plugin system for Forgedocs.
 *
 * Plugins are ESM modules that export a function receiving a plugin API object.
 * They can hook into discovery, sidebar generation, and page rendering.
 *
 * Plugin API:
 *   - addPages(pages): Add virtual pages to the doc site
 *   - addSidebarItems(service, items): Add items to a service's sidebar
 *   - addGlobalSidebarItems(items): Add items to all sidebars
 *   - onDiscover(fn): Hook called during service discovery
 *   - onBuild(fn): Hook called during site build
 *
 * Plugin format (ESM module):
 *   export default function myPlugin(api, options) {
 *     api.addPages([{ path: 'my-page.md', content: '# My Page' }])
 *   }
 *
 * Config in docsite.config.mjs:
 *   plugins: [
 *     'forgedocs-plugin-openapi',
 *     ['forgedocs-plugin-mermaid', { theme: 'dark' }],
 *     './my-local-plugin.mjs',
 *   ]
 */

/**
 * Create a plugin context — the API object passed to plugins.
 */
function createPluginContext() {
  return {
    pages: [],
    sidebarItems: {}, // { serviceName: [items] }
    globalSidebarItems: [],
    discoverHooks: [],
    buildHooks: [],

    addPages(pages) {
      for (const page of pages) {
        if (!page.path || !page.content) {
          throw new Error('Plugin page must have "path" and "content" properties')
        }
        this.pages.push(page)
        debug(`Plugin added page: ${page.path}`)
      }
    },

    addSidebarItems(service, items) {
      if (!this.sidebarItems[service]) {
        this.sidebarItems[service] = []
      }
      this.sidebarItems[service].push(...items)
      debug(`Plugin added ${items.length} sidebar items to ${service}`)
    },

    addGlobalSidebarItems(items) {
      this.globalSidebarItems.push(...items)
      debug(`Plugin added ${items.length} global sidebar items`)
    },

    onDiscover(fn) {
      this.discoverHooks.push(fn)
    },

    onBuild(fn) {
      this.buildHooks.push(fn)
    },
  }
}

/**
 * Load and initialize all plugins from config.
 * Returns the unified plugin context with all hooks registered.
 */
export async function loadPlugins(pluginSpecs = [], cwd = process.cwd()) {
  const ctx = createPluginContext()

  for (const spec of pluginSpecs) {
    let modulePath
    let options = {}

    // Support [name, options] tuple format
    if (Array.isArray(spec)) {
      modulePath = spec[0]
      options = spec[1] || {}
    } else {
      modulePath = spec
    }

    try {
      let plugin

      if (modulePath.startsWith('.') || modulePath.startsWith('/')) {
        // Local plugin — resolve relative to CWD
        const resolved = path.resolve(cwd, modulePath)
        plugin = (await import(`file://${resolved}`)).default
      } else {
        // npm package — resolve from CWD's node_modules
        const resolved = path.join(cwd, 'node_modules', modulePath)
        if (fs.existsSync(resolved)) {
          plugin = (await import(`file://${path.join(resolved, 'index.mjs')}`)).default
        } else {
          // Try requiring as a regular module
          plugin = (await import(modulePath)).default
        }
      }

      if (typeof plugin === 'function') {
        await plugin(ctx, options)
        debug(`Loaded plugin: ${modulePath}`)
      } else {
        console.error(`Warning: Plugin "${modulePath}" does not export a default function`)
      }
    } catch (err) {
      console.error(`Warning: Failed to load plugin "${modulePath}": ${err.message}`)
    }
  }

  return ctx
}

/**
 * Write plugin-generated pages to the content directory.
 */
export function writePluginPages(ctx, contentDir) {
  let written = 0
  for (const page of ctx.pages) {
    const fullPath = path.join(contentDir, page.path)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, page.content)
    written++
    debug(`Wrote plugin page: ${fullPath}`)
  }
  return written
}

/**
 * Get extra sidebar items for a service (from plugins).
 */
export function getPluginSidebarItems(ctx, serviceName) {
  const items = [...(ctx.sidebarItems[serviceName] || []), ...ctx.globalSidebarItems]
  return items
}

/**
 * Run discovery hooks.
 */
export async function runDiscoverHooks(ctx, services) {
  for (const hook of ctx.discoverHooks) {
    try {
      await hook(services)
    } catch (err) {
      console.error(`Plugin discover hook error: ${err.message}`)
    }
  }
}

/**
 * Run build hooks.
 */
export async function runBuildHooks(ctx, buildInfo) {
  for (const hook of ctx.buildHooks) {
    try {
      await hook(buildInfo)
    } catch (err) {
      console.error(`Plugin build hook error: ${err.message}`)
    }
  }
}
