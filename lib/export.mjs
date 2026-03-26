import fs from 'node:fs'
import path from 'node:path'
import { formatServiceName } from './utils.mjs'

/**
 * Collect all markdown files from a repo for export.
 * Returns array of { relativePath, content }.
 */
function collectDocs(repoPath) {
  const docs = []
  const MD_DIRS = ['', 'docs', 'docs/features', 'docs/adr']

  for (const dir of MD_DIRS) {
    const fullDir = path.join(repoPath, dir)
    if (!fs.existsSync(fullDir)) continue

    try {
      for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.md')) continue
        const fullPath = path.join(fullDir, entry.name)
        const relativePath = dir ? `${dir}/${entry.name}` : entry.name
        docs.push({
          relativePath,
          content: fs.readFileSync(fullPath, 'utf-8'),
        })
      }
    } catch {
      /* skip unreadable */
    }
  }

  return docs
}

/**
 * Export a single repo's docs as JSON.
 * Returns a structured JSON object.
 */
export function exportJson(repoPath) {
  const name = path.basename(repoPath)
  const docs = collectDocs(repoPath)

  const result = {
    name,
    path: repoPath,
    exportedAt: new Date().toISOString(),
    documents: {},
  }

  for (const doc of docs) {
    result.documents[doc.relativePath] = doc.content
  }

  return result
}

/**
 * Export all tracked repos as JSON.
 */
export function exportAllJson(repos) {
  const result = {
    exportedAt: new Date().toISOString(),
    services: {},
  }

  for (const [name, repoPath] of Object.entries(repos)) {
    if (!fs.existsSync(repoPath)) continue
    result.services[name] = exportJson(repoPath)
  }

  return result
}

/**
 * Export a repo's docs as a single self-contained HTML file.
 * Uses basic styling, no external dependencies.
 */
export function exportHtml(repoPath) {
  const name = path.basename(repoPath)
  const displayName = formatServiceName(name)
  const docs = collectDocs(repoPath)

  // Simple markdown-to-HTML converter (handles headings, tables, code blocks, lists, paragraphs)
  function mdToHtml(md) {
    let html = ''
    const lines = md.split('\n')
    let inCode = false
    let inTable = false
    let inList = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Code blocks
      if (line.startsWith('```')) {
        if (inCode) {
          html += '</code></pre>\n'
          inCode = false
        } else {
          inCode = true
          html += '<pre><code>'
        }
        continue
      }
      if (inCode) {
        html += `${escapeHtml(line)}\n`
        continue
      }

      // Tables
      if (line.startsWith('|') && line.endsWith('|')) {
        if (line.includes('---')) continue // separator
        if (!inTable) {
          html += '<table>\n'
          inTable = true
          // First row is header
          const cells = line
            .split('|')
            .filter(Boolean)
            .map((c) => c.trim())
          html += `<tr>${cells.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr>\n`
          continue
        }
        const cells = line
          .split('|')
          .filter(Boolean)
          .map((c) => c.trim())
        html += `<tr>${cells.map((c) => `<td>${inlineFormat(c)}</td>`).join('')}</tr>\n`
        continue
      }
      if (inTable && !line.startsWith('|')) {
        html += '</table>\n'
        inTable = false
      }

      // Lists
      if (/^[-*]\s/.test(line)) {
        if (!inList) {
          html += '<ul>\n'
          inList = true
        }
        html += `<li>${inlineFormat(line.replace(/^[-*]\s/, ''))}</li>\n`
        continue
      }
      if (/^\d+\.\s/.test(line)) {
        if (!inList) {
          html += '<ol>\n'
          inList = true
        }
        html += `<li>${inlineFormat(line.replace(/^\d+\.\s/, ''))}</li>\n`
        continue
      }
      if (inList && line.trim() === '') {
        html += inList ? '</ul>\n' : '</ol>\n'
        inList = false
      }

      // Headings
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
      if (headingMatch) {
        if (inList) {
          html += '</ul>\n'
          inList = false
        }
        const level = headingMatch[1].length
        html += `<h${level}>${inlineFormat(headingMatch[2])}</h${level}>\n`
        continue
      }

      // Empty lines
      if (line.trim() === '') {
        if (inList) {
          html += '</ul>\n'
          inList = false
        }
        continue
      }

      // Paragraph
      html += `<p>${inlineFormat(line)}</p>\n`
    }

    if (inCode) html += '</code></pre>\n'
    if (inTable) html += '</table>\n'
    if (inList) html += '</ul>\n'

    return html
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function inlineFormat(s) {
    return escapeHtml(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
  }

  // Build HTML sections
  const sections = docs.map((doc) => {
    const title = doc.relativePath.replace(/\.md$/, '').replace(/\//g, ' / ')
    return `<section id="${doc.relativePath.replace(/[/.]/g, '-')}">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      ${mdToHtml(doc.content)}
    </section>`
  })

  // Build table of contents
  const toc = docs.map((doc) => {
    const title = doc.relativePath.replace(/\.md$/, '')
    const anchor = doc.relativePath.replace(/[/.]/g, '-')
    return `<li><a href="#${anchor}">${escapeHtml(title)}</a></li>`
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(displayName)} — Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; max-width: 900px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 2rem; margin-bottom: 1rem; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; margin-top: 2rem; margin-bottom: 0.5rem; }
    h3 { font-size: 1.2rem; margin-top: 1.5rem; margin-bottom: 0.5rem; }
    h2.section-title { background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 6px; margin-top: 3rem; border-left: 4px solid #3b82f6; }
    p { margin: 0.5rem 0; }
    code { background: #f1f5f9; padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.9em; }
    pre { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 1rem 0; }
    pre code { background: none; padding: 0; color: inherit; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    ul, ol { padding-left: 1.5rem; margin: 0.5rem 0; }
    li { margin: 0.25rem 0; }
    nav { background: #f8fafc; padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 2rem; }
    nav ul { list-style: none; padding: 0; columns: 2; }
    nav li { margin: 0.25rem 0; }
    nav a { color: #3b82f6; text-decoration: none; }
    nav a:hover { text-decoration: underline; }
    .meta { color: #64748b; font-size: 0.85rem; margin-bottom: 2rem; }
    strong { font-weight: 600; }
    em { font-style: italic; }
    @media print { body { max-width: none; } nav { break-inside: avoid; } section { break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(displayName)} — Documentation</h1>
  <p class="meta">Exported on ${new Date().toISOString().split('T')[0]} by Forgedocs</p>

  <nav>
    <h3>Table of Contents</h3>
    <ul>${toc.join('\n')}</ul>
  </nav>

  ${sections.join('\n\n')}
</body>
</html>`
}
