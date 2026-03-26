import fs from 'node:fs'
import path from 'node:path'
import { debug } from './utils'

/** Build VitePress rewrites for all discovered services */
export function buildRewrites(services: string[], contentDir: string): Record<string, string> {
  const rewrites: Record<string, string> = {}

  for (const s of services) {
    const hasReadme = fs.existsSync(path.join(contentDir, s, 'README.md'))
    const hasArch = fs.existsSync(path.join(contentDir, s, 'ARCHITECTURE.md'))

    if (hasReadme) {
      rewrites[`content/${s}/README.md`] = `${s}/index.md`
    } else if (hasArch) {
      rewrites[`content/${s}/ARCHITECTURE.md`] = `${s}/index.md`
    }

    if (hasReadme && hasArch) {
      rewrites[`content/${s}/ARCHITECTURE.md`] = `${s}/architecture.md`
    }
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
      } catch (e) {
        debug(`Could not read docs/ subdirectories for ${s}: ${e}`)
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
      } catch (e) {
        debug(`Could not read root markdown files for ${s}: ${e}`)
      }
    }
  }

  debug(`Generated ${Object.keys(rewrites).length} rewrites`)
  return rewrites
}
