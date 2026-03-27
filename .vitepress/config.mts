import path from 'node:path'
import type { DefaultTheme } from 'vitepress'
import { defineConfig } from 'vitepress'
import { discoverServices, resolveAllowedDirs } from './discovery'
import { buildRewrites } from './rewrites'
import { buildAllSidebars } from './sidebar'
import { formatServiceName } from './utils'

const siteTitle = process.env.FORGEDOCS_TITLE || 'Forgedocs'
const siteDescription = 'Architecture documentation for your services'
const githubUrl = process.env.FORGEDOCS_GITHUB || ''
const basePath = process.env.FORGEDOCS_BASE || '/'

export default defineConfig(() => {
  const contentDir = path.resolve('content')

  // Discover services and build config
  const services = discoverServices(contentDir)
  const rewrites = buildRewrites(services, contentDir)
  const sidebar = buildAllSidebars(services, contentDir)
  const allowedDirs = resolveAllowedDirs(path.resolve('.repos.json'))

  // Multi-stack source exclusions
  const srcExclude = [
    // Build tools & meta
    'node_modules/**',
    'scripts/**',

    // Ruby / Rails
    'content/*/app/**',
    'content/*/config/**',
    'content/*/db/**',
    'content/*/lib/**',
    'content/*/bin/**',
    'content/*/spec/**',
    'content/*/vendor/**',
    'content/*/tmp/**',
    'content/*/log/**',
    'content/*/public/**',
    'content/*/storage/**',

    // Node.js / TypeScript
    'content/*/src/**',
    'content/*/dist/**',
    'content/*/build/**',
    'content/*/coverage/**',
    'content/*/node_modules/**',

    // Python
    'content/*/venv/**',
    'content/*/.venv/**',
    'content/*/__pycache__/**',
    'content/*/*.egg-info/**',
    'content/*/.tox/**',
    'content/*/.mypy_cache/**',

    // Go
    'content/*/cmd/**',
    'content/*/pkg/**',
    'content/*/internal/**',

    // Rust
    'content/*/target/**',

    // Java / Kotlin / Scala
    'content/*/.gradle/**',
    'content/*/.mvn/**',

    // .NET
    'content/*/obj/**',

    // PHP
    'content/*/composer/**',

    // Elixir
    'content/*/_build/**',
    'content/*/deps/**',
    'content/*/.elixir_ls/**',

    // Generic
    'content/*/test/**',
    'content/*/tests/**',
    'content/*/__tests__/**',
    'content/*/.cloud/**',
    'content/*/.github/**',
    'content/*/.claude/**',
    'content/*/compose_stack/**',
    'content/*/swagger/**',
    'content/*/.docker/**',
    'content/*/Dockerfile',

    // User-defined extra exclusions via env
    ...(process.env.FORGEDOCS_EXCLUDES ? process.env.FORGEDOCS_EXCLUDES.split(',') : []),
  ]

  // Social links (only add GitHub if configured)
  const socialLinks: DefaultTheme.SidebarItem[] = []
  if (githubUrl) {
    socialLinks.push({ icon: 'github', link: githubUrl })
  }

  return {
    title: siteTitle,
    description: siteDescription,
    base: basePath,
    srcDir: '.',
    // TODO: switch to 'warn' when VitePress supports it (currently only true/false/'localhostLinks')
    ignoreDeadLinks: true,

    vite: {
      server: {
        fs: {
          allow: ['.', ...allowedDirs],
        },
        watch: {
          followSymlinks: true,
        },
      },
      resolve: {
        preserveSymlinks: true,
      },
    },

    srcExclude,

    rewrites,

    themeConfig: {
      nav: services.map((s) => ({
        text: formatServiceName(s),
        link: `/${s}/`,
      })),

      sidebar,

      search: {
        provider: 'local',
      },

      socialLinks,

      outline: {
        level: [2, 3],
      },
    },
  }
})
