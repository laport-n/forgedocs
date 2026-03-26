import fs from 'node:fs'
import path from 'node:path'
import type { DefaultTheme } from 'vitepress'
import { defineConfig } from 'vitepress'

interface DocforgeConfig {
  title?: string
  description?: string
  github?: string
  scanDirs?: string[]
  nestedDirs?: string[]
  extraExcludes?: string[]
}

// Load user config
let userConfig: DocforgeConfig = {}
const userConfigPath = path.resolve('docsite.config.mjs')
if (fs.existsSync(userConfigPath)) {
  try {
    userConfig = (await import(`file://${userConfigPath}`)).default || {}
  } catch {
    /* use defaults */
  }
}

const siteTitle = userConfig.title || 'Docforge'
const siteDescription = userConfig.description || 'Architecture documentation for your services'
const githubUrl = userConfig.github || ''
const extraExcludes: string[] = userConfig.extraExcludes || []

const contentDir = path.resolve('content')

// Discover services from content/ symlinks
const services: string[] = []
if (fs.existsSync(contentDir)) {
  for (const entry of fs.readdirSync(contentDir, { withFileTypes: true })) {
    if (entry.isDirectory() || entry.isSymbolicLink()) {
      services.push(entry.name)
    }
  }
  services.sort()
}

// Build rewrites dynamically for each discovered service
const rewrites: Record<string, string> = {}
for (const s of services) {
  rewrites[`content/${s}/README.md`] = `${s}/index.md`
  rewrites[`content/${s}/ARCHITECTURE.md`] = `${s}/architecture.md`
  rewrites[`content/${s}/docs/:file.md`] = `${s}/docs/:file.md`
  rewrites[`content/${s}/docs/adr/README.md`] = `${s}/docs/adr/index.md`
  rewrites[`content/${s}/docs/adr/:file.md`] = `${s}/docs/adr/:file.md`
  rewrites[`content/${s}/docs/features/:file.md`] = `${s}/docs/features/:file.md`

  // Handle arbitrary subdirectories under docs/
  const docsDir = path.join(contentDir, s, 'docs')
  if (fs.existsSync(docsDir)) {
    try {
      for (const entry of fs.readdirSync(docsDir, { withFileTypes: true })) {
        if ((entry.isDirectory() || entry.isSymbolicLink()) && entry.name !== 'adr' && entry.name !== 'features') {
          rewrites[`content/${s}/docs/${entry.name}/:file.md`] = `${s}/docs/${entry.name}/:file.md`
        }
      }
    } catch {
      /* skip */
    }
  }

  // Extra root markdown files (e.g. README-auth-control.md)
  const serviceDir = path.join(contentDir, s)
  if (fs.existsSync(serviceDir)) {
    try {
      for (const file of fs.readdirSync(serviceDir)) {
        if (file.endsWith('.md') && file !== 'README.md' && file !== 'ARCHITECTURE.md' && file !== 'CLAUDE.md') {
          const slug = file.replace('.md', '').toLowerCase()
          rewrites[`content/${s}/${file}`] = `${s}/${slug}.md`
        }
      }
    } catch {
      /* skip */
    }
  }
}

// Build sidebar dynamically by scanning each service's docs
function buildSidebar(service: string) {
  const serviceDir = path.join(contentDir, service)
  const items: DefaultTheme.SidebarItem[] = []

  // Main section
  const mainItems: DefaultTheme.SidebarItem[] = [{ text: 'Home', link: `/${service}/` }]
  if (fs.existsSync(path.join(serviceDir, 'ARCHITECTURE.md'))) {
    mainItems.push({ text: 'Architecture', link: `/${service}/architecture` })
  }

  // Extra root .md files
  if (fs.existsSync(serviceDir)) {
    try {
      for (const file of fs.readdirSync(serviceDir)) {
        if (file.endsWith('.md') && !['README.md', 'ARCHITECTURE.md', 'CLAUDE.md'].includes(file)) {
          const slug = file.replace('.md', '').toLowerCase()
          const label = file
            .replace('.md', '')
            .replace(/[-_]/g, ' ')
            .replace(/README-?/i, '')
          mainItems.push({ text: label, link: `/${service}/${slug}` })
        }
      }
    } catch {
      /* skip */
    }
  }

  items.push({ text: formatServiceName(service), items: mainItems })

  // Guides (docs/ flat files, excluding adr/ and features/)
  const docsDir = path.join(serviceDir, 'docs')
  if (fs.existsSync(docsDir)) {
    const guideItems: DefaultTheme.SidebarItem[] = []
    try {
      for (const entry of fs.readdirSync(docsDir, { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
          const slug = entry.name.replace('.md', '')
          const label = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          guideItems.push({ text: label, link: `/${service}/docs/${slug}` })
        }
        // Subdirectories (e.g. authorization/) but not adr/ or features/
        if ((entry.isDirectory() || entry.isSymbolicLink()) && entry.name !== 'adr' && entry.name !== 'features') {
          const subDir = path.join(docsDir, entry.name)
          try {
            for (const sub of fs.readdirSync(subDir)) {
              if (sub.endsWith('.md')) {
                const subSlug = sub.replace('.md', '')
                const subLabel = `${entry.name}/${subSlug}`
                  .replace(/[-_]/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase())
                guideItems.push({ text: subLabel, link: `/${service}/docs/${entry.name}/${subSlug}` })
              }
            }
          } catch {
            /* skip */
          }
        }
      }
    } catch {
      /* skip */
    }

    if (guideItems.length > 0) {
      guideItems.sort((a, b) => a.text.localeCompare(b.text))
      items.push({ text: 'Guides', collapsed: false, items: guideItems })
    }
  }

  // Features (docs/features/*.md)
  const featuresDir = path.join(docsDir, 'features')
  if (fs.existsSync(featuresDir)) {
    const featureItems: DefaultTheme.SidebarItem[] = []
    try {
      for (const file of fs.readdirSync(featuresDir).sort()) {
        if (!file.endsWith('.md')) continue
        const slug = file.replace('.md', '')
        const filePath = path.join(featuresDir, file)
        let label = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        try {
          const content = fs.readFileSync(filePath, 'utf-8')
          const match = content.match(/^#\s+(.+)$/m)
          if (match) label = match[1].trim()
        } catch {
          /* keep slug-derived label */
        }
        featureItems.push({ text: label, link: `/${service}/docs/features/${slug}` })
      }
    } catch {
      /* skip */
    }

    if (featureItems.length > 0) {
      items.push({ text: 'Features', collapsed: false, items: featureItems })
    }
  }

  // ADRs
  const adrDir = path.join(docsDir, 'adr')
  if (fs.existsSync(adrDir)) {
    const adrItems: DefaultTheme.SidebarItem[] = []
    try {
      for (const file of fs.readdirSync(adrDir).sort()) {
        if (file.endsWith('.md') && file !== 'README.md') {
          const slug = file.replace('.md', '')
          const label = slug
            .replace(/^(\d+)-/, '$1 - ')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
          adrItems.push({ text: label, link: `/${service}/docs/adr/${slug}` })
        }
      }
    } catch {
      /* skip */
    }

    if (adrItems.length > 0) {
      items.push({ text: 'Architecture Decision Records', collapsed: false, items: adrItems })
    }
  }

  return items
}

function formatServiceName(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Build sidebar config for all services
const sidebar: Record<string, DefaultTheme.SidebarItem[]> = {}
for (const service of services) {
  sidebar[`/${service}/`] = buildSidebar(service)
}

// Resolve symlink targets for Vite filesystem access
const allowedDirs: string[] = []
const repoConfigPath = path.resolve('.repos.json')
if (fs.existsSync(repoConfigPath)) {
  const repos = JSON.parse(fs.readFileSync(repoConfigPath, 'utf-8'))
  for (const dir of Object.values(repos)) {
    if (typeof dir === 'string') allowedDirs.push(dir)
  }
}

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

  // User-defined extra exclusions
  ...extraExcludes,
]

// Social links (only add GitHub if configured)
const socialLinks: DefaultTheme.SidebarItem[] = []
if (githubUrl) {
  socialLinks.push({ icon: 'github', link: githubUrl })
}

export default defineConfig({
  title: siteTitle,
  description: siteDescription,
  srcDir: '.',
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
})
