import fs from 'node:fs'
import path from 'node:path'
import type { DefaultTheme } from 'vitepress'
import { debug, formatServiceName } from './utils'

/** Build sidebar config for a single service */
export function buildSidebar(service: string, contentDir: string): DefaultTheme.SidebarItem[] {
  const serviceDir = path.join(contentDir, service)
  const items: DefaultTheme.SidebarItem[] = []

  // Main section
  const hasReadme = fs.existsSync(path.join(serviceDir, 'README.md'))
  const hasArch = fs.existsSync(path.join(serviceDir, 'ARCHITECTURE.md'))
  const mainItems: DefaultTheme.SidebarItem[] = [{ text: 'Home', link: `/${service}/` }]
  if (hasReadme && hasArch) {
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
    } catch (e) {
      debug(`Could not read root files for ${service}: ${e}`)
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
          } catch (e) {
            debug(`Could not read subdirectory ${entry.name} for ${service}: ${e}`)
          }
        }
      }
    } catch (e) {
      debug(`Could not read docs/ for ${service}: ${e}`)
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
    } catch (e) {
      debug(`Could not read features/ for ${service}: ${e}`)
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
    } catch (e) {
      debug(`Could not read adr/ for ${service}: ${e}`)
    }

    if (adrItems.length > 0) {
      items.push({ text: 'Architecture Decision Records', collapsed: false, items: adrItems })
    }
  }

  return items
}

/** Build sidebar config for all services */
export function buildAllSidebars(services: string[], contentDir: string): Record<string, DefaultTheme.SidebarItem[]> {
  const sidebar: Record<string, DefaultTheme.SidebarItem[]> = {}
  for (const service of services) {
    sidebar[`/${service}/`] = buildSidebar(service, contentDir)
  }
  debug(`Built sidebars for ${services.length} services`)
  return sidebar
}
